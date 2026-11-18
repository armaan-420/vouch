import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
import {createVouchServer} from '../server.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {DEFAULT_EXPERIMENT,initialRegistry} from '../lib/experiment-api.mjs';
import {initialAccounts,productKey} from '../lib/account-records.mjs';
import {WATER_BOTTLES} from '../lib/water-bottles.mjs';
import {fresh} from '../lib/vouch-api.mjs';

const dataRoot=fileURLToPath(new URL('../.data/',import.meta.url));
await fs.mkdir(dataRoot,{recursive:true});
const directory=await fs.mkdtemp(path.join(dataRoot,'wharton-pilot-browser-'));
const output=path.resolve(process.env.WHARTON_PILOT_OUTPUT||fileURLToPath(new URL('../../output/wharton-pilot-share/',import.meta.url)));
await fs.mkdir(output,{recursive:true});
const balm=JSON.parse(await fs.readFile(new URL('../data/wharton-lip-balm.json',import.meta.url),'utf8'));
const lineup=[
  {id:'pilot-bottles',title:'Wharton Water Bottle Edit',category:'Water bottles',products:WATER_BOTTLES},
  {...balm,id:'pilot-balm'},
  {id:'pilot-carry',title:'Wharton Carry-On Edit',category:'Carry-On luggage',products:[
    {id:'pilot-away',brand:'Away',name:'The Carry-On Suitcase',category:'Carry-on luggage',image:'https://example.test/away.png'},
    {id:'pilot-monos',brand:'Monos',name:'Carry-On',category:'Carry-on luggage',image:'https://example.test/monos.png'}
  ]}
];
const winner=WATER_BOTTLES[0],store=await createFileStore(directory);
await (await store.scope('experiment-registry',initialRegistry)).transaction(data=>{
  for(const e of lineup)data.experiments[e.id]={...DEFAULT_EXPERIMENT,...e};
});
const syntheticAccounts=await(await store.scope('accounts-v1',initialAccounts)).transaction(data=>{
  const at=new Date().toISOString();
  const names=['Ana Quinn','Riya Morgan','Maya Lee','Jordan Kim','Sam Taylor','Morgan Reed'];
  for(const [i,displayName] of names.entries()){
    const account={displayName,handle:'v-'+i.toString(16).padStart(16,'0'),email:'fixture-'+i+'@wharton.upenn.edu',emailVerified:true,visibility:'public',showName:true,createdAt:at,opinions:{},history:[],milestones:[]};
    const products=[winner,...WATER_BOTTLES.slice(1,8-i)];
    for(const p of products)account.opinions[productKey(p.id)]={productId:p.id,product:p,verdict:'yes',visibility:'public',updatedAt:at,experimentId:lineup[0].id};
    data.accounts['fixture-'+i]=account;
  }
  return names.length;
});
await (await store.scope('experiment:'+lineup[0].id,fresh)).transaction(data=>{
  data.baseVotes[winner.id]=Object.fromEntries(Array.from({length:syntheticAccounts},(_,i)=>['fixture-'+i,'yes']));
  for(const p of WATER_BOTTLES.slice(1))data.baseVotes[p.id]={fixture:'no'};
});
const server=await createVouchServer({directory,productSearch:{search:async()=>({products:[]}),find:async()=>null},autoOptions:{env:{EXPERIMENT_AUTO_BUILD:'off'}}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const widths=[320,360,375,430,768,1024,1280,1440];
try{
 for(const width of widths){
  const capture=width===360||width===1440;
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true,permissions:['clipboard-read','clipboard-write'],reducedMotion:width===375?'reduce':'no-preference',hasTouch:width===430});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://example.test/**',route=>route.abort());
  const check=async label=>{
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,width+'px '+label+' overflow');
  };
  const shot=async label=>{if(capture)await page.screenshot({path:path.join(output,label+'-'+width+'.png')});};
  const post=async (endpoint,body)=>{
    const response=await page.request.post(origin+endpoint,{headers:{Origin:origin},data:body});
    assert.ok(response.ok(),endpoint+' '+response.status()+': '+await response.text());
    return response;
  };
  const signup=async ()=>{
    await page.goto(origin+'/wharton');
    await page.locator('#wharton-name').fill('Casey Pilot');
    await page.locator('#wharton-email').fill('pilot-'+width+'@wharton.upenn.edu');
    await page.locator('#wharton-join button').click();
    const localCode=await page.locator('.wharton-help code').textContent();
    await page.locator('#wharton-code').fill(localCode);
    await page.locator('#wharton-verify button').click();
  };
  const board=async (edit,flow=true)=>{
    await page.goto(origin+'/'+edit.id+'?board=1'+(flow?'&wharton=1':''));
    await page.locator('.board-category-chips').waitFor();
    if(flow)await page.locator('#pilot-next-heading').waitFor();
  };
  const complete=async (edit,first='yes')=>{
    for(const [index,p] of edit.products.entries())await post('/api/events?experiment='+edit.id,{type:'answer',productId:p.id,value:index===0?first:'skip'});
  };
  async function checkDialogFocus(dialog){
    for(let i=0;i<6;i++){
      await page.keyboard.press(i<4?'Tab':'Shift+Tab');
      assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),'dialog keeps keyboard focus inside');
    }
  }
  async function share(trigger,kind){
    assert.equal(await page.evaluate(()=>performance.getEntriesByName(location.origin+'/share-cards.js').length),0);
    await trigger.click();
    const dialog=page.getByRole('dialog');
    const img=dialog.getByRole('img',{name:/Share card:/});
    await img.waitFor();
    await img.evaluate(el=>el.decode());
    assert.deepEqual(await img.evaluate(el=>[el.naturalWidth,el.naturalHeight]),[1080,1920]);
    assert.ok((await img.boundingBox()).height<=540.5);
    const bounds=await dialog.boundingBox();
    if(width<768)assert.ok(Math.abs(bounds.y+bounds.height-900)<1,'sheet at bottom');
    else assert.equal(Math.round(bounds.width),480);
    await check('share '+kind);
    await shot('sheet-'+kind);
    await checkDialogFocus(dialog);
    const downloadPromise=page.waitForEvent('download');
    await dialog.getByRole('link',{name:'Download image'}).click();
    const file=await downloadPromise;
    assert.equal(file.suggestedFilename(),'vouch-wharton-'+kind+'.png');
    if(width===360)await file.saveAs(path.join(output,file.suggestedFilename()));
    await dialog.getByRole('button',{name:'Copy link'}).click();
    await dialog.getByText('Link copied',{exact:true}).waitFor();
    const link=await page.evaluate(()=>navigator.clipboard.readText());
    const shared=await context.request.get(link);
    assert.equal(shared.status(),200);
    assert.match(await shared.text(),/property="og:title"/);
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'hidden'});
    assert.ok(await trigger.evaluate(el=>el===document.activeElement),'share trigger regains focus');
  }
  await signup();
  for(let i=1;i<=3;i++){
    const intro=page.locator('.pilot-intro'),bar=page.getByRole('progressbar',{name:'Intro, step '+i+' of 3'});
    await bar.waitFor();
    assert.equal(await bar.getAttribute('aria-valuenow'),String(i));
    assert.equal(await bar.locator('.is-filled').count(),i);
    assert.equal(await intro.getByRole('button',{name:'Skip'}).count(),i<3?1:0);
    assert.ok(await intro.locator('h1').evaluate(el=>el===document.activeElement));
    assert.equal(await intro.locator('.pilot-intro-art').getAttribute('aria-hidden'),'true');
    assert.equal(await bar.locator('span').first().evaluate(el=>getComputedStyle(el).transitionDuration),width===375?'0s':'0.22s');
    if(width>=768)assert.equal((await intro.boundingBox()).width,420);
    await check('intro '+i);
    if(capture)await page.locator('.pilot-intro-screen').evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
    await shot('intro-'+i);
    if(i<3)await page.keyboard.press('ArrowRight');
  }
  if(width===430){
    await page.keyboard.press('ArrowLeft');
    await page.getByRole('progressbar',{name:'Intro, step 2 of 3'}).waitFor();
    await page.locator('.pilot-intro').evaluate(el=>{
      const start=new Touch({identifier:1,target:el,clientX:250,clientY:90});
      const end=new Touch({identifier:1,target:el,clientX:160,clientY:93});
      el.dispatchEvent(new TouchEvent('touchstart',{touches:[start],bubbles:true}));
      el.dispatchEvent(new TouchEvent('touchend',{changedTouches:[end],bubbles:true}));
    });
    await page.getByRole('progressbar',{name:'Intro, step 3 of 3'}).waitFor();
  }
  await page.getByRole('button',{name:'Pick a category'}).click();
  const pick=page.getByRole('link',{name:/Water bottles/});
  await pick.waitFor();
  await pick.click();
  await page.locator('[data-vote="yes"]').waitFor();
  await check('rating');
  await board(lineup[0]);
  assert.match(await page.locator('#pilot-next-heading').textContent(),/0 of 3/);
  assert.equal(await page.locator('.pilot-pulse').count(),0);
  await page.locator('#pilot-next-heading').scrollIntoViewIfNeeded();
  await check('next 0');
  await shot('next-0');
  await complete(lineup[0]);
  await post('/api/events?experiment='+lineup[1].id,{type:'answer',productId:lineup[1].products[0].id,value:'skip'});
  await board(lineup[0]);
  assert.match(await page.locator('#pilot-next-heading').textContent(),/1 of 3/);
  assert.match(await page.getByRole('link',{name:/Continue Lip balm/}).getAttribute('href'),/resume=1/);
  const question=page.locator('.pilot-pulse');
  await question.waitFor();
  assert.equal(await question.evaluate(el=>Array.from(el.parentElement.children).slice(0,[...el.parentElement.children].indexOf(el)).filter(s=>s.matches('.rank-row')).length),3);
  assert.equal(await page.getByText('Save my picks',{exact:true}).count(),0);
  await question.scrollIntoViewIfNeeded();
  await check('pulse before');
  await shot('pulse-before');
  await question.getByRole('group',{name:/Would seeing/}).getByRole('button',{name:'Maybe'}).press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'What would make it a yes?');
  await question.getByRole('textbox',{name:'What would make it a yes?'}).fill('More context <b>here</b>.');
  await check('pulse during');
  await shot('pulse-during');
  await question.getByRole('button',{name:'Send'}).click();
  if(width!==375){
    await question.getByRole('status').getByText('Thanks. That helps.').waitFor();
    await check('pulse thanks');
    await shot('pulse-thanks');
  }
  await question.waitFor({state:'detached'});
  const suggest=page.locator('[data-pilot-next]').getByRole('button',{name:'Suggest a category'});
  await suggest.scrollIntoViewIfNeeded();
  await check('next 1');
  await shot('next-1');
  await suggest.press('Enter');
  let dialog=page.getByRole('dialog',{name:'Suggest a category'});
  await dialog.waitFor();
  assert.ok(await dialog.getByRole('textbox').evaluate(el=>el===document.activeElement));
  await check('suggestion dialog');
  await shot('suggest');
  await checkDialogFocus(dialog);
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});
  assert.ok(await suggest.evaluate(el=>el===document.activeElement));
  await suggest.click();
  await dialog.getByRole('textbox').fill('Travel umbrellas');
  await dialog.getByRole('button',{name:'Send suggestion'}).click();
  await page.getByText('Thanks. The most requested category opens next.').waitFor();
  await check('suggested');
  await shot('suggested');
  await complete(lineup[1]);
  await board(lineup[1]);
  assert.match(await page.locator('#pilot-next-heading').textContent(),/2 of 3/);
  assert.equal(await page.locator('.pilot-pulse').count(),0);
  assert.ok(await page.getByText('Thanks. The most requested category opens next.').isVisible());
  await page.locator('#pilot-next-heading').scrollIntoViewIfNeeded();
  await check('next 2');
  await shot('next-2');
  await complete(lineup[2]);
  await board(lineup[0]);
  assert.match(await page.locator('#pilot-next-heading').textContent(),/all 3/);
  await page.locator('#pilot-next-heading').scrollIntoViewIfNeeded();
  await check('next 3');
  await shot('next-3');
  await share(page.getByRole('button',{name:'Share your picks'}),'picks');
  await board(lineup[0]);
  await share(page.locator('[data-winner-share]').getByRole('button',{name:'Share'}),'winner');
  await page.goto(origin+'/community-leaderboard');
  await share(page.locator('[data-leaderboard-share]').getByRole('button',{name:'Share'}),'leaderboard');
  await page.goto(origin+'/wharton');
  await page.locator('.wharton-category[href]').first().waitFor();
  assert.equal(await page.locator('.pilot-intro').count(),0);
  await board(lineup[0],false);
  assert.equal(await page.locator('[data-pilot-next],.pilot-pulse').count(),0);
  await page.goto(origin+'/admin#wharton-pilot');
  await page.getByRole('heading',{name:'Signup funnel'}).waitFor();
  await page.locator('#pilot-category').selectOption(lineup[0].id);
  assert.ok(await page.getByText('More context <b>here</b>.',{exact:true}).count());
  assert.equal(await page.locator('.pilot-followups b').count(),0);
  assert.equal(await page.locator('.pilot-metric-grid').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),width<768?1:width<1200?2:3);
  assert.equal(await page.locator('.pilot-funnel').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),width<1024?1:9);
  await check('admin');
  await shot('admin');
  if(width===360){
    const target=page.getByRole('spinbutton',{name:'Landing target',exact:true});
    await target.fill('0');
    await target.press('Tab');
    await page.getByText('On track',{exact:true}).waitFor();
    const request=page.waitForResponse(response=>response.url().endsWith('/api/admin/pilot-metrics')&&response.request().method()==='POST');
    await page.locator('#pilot-since').fill('2020-01-01');
    await page.locator('#pilot-since').press('Tab');
    await request;
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'Download CSV'}).click();
    const csv=await fs.readFile(await (await download).path(),'utf8');
    for(const label of ['"All"','"Water bottles"','"Lip balm"','"Carry-on luggage"'])assert.ok(csv.includes(label));
    assert.ok(!csv.includes('More context'));
    const settings=(await (await context.request.get(origin+'/api/admin/pilot-metrics')).json()).settings;
    assert.equal(settings.targets.landing,0);
    assert.equal(settings.since,'2020-01-01');
  }
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS',width,'intro 1–3, progress, next 0–3, suggestion, pulse, three story cards, sheet, admin');
 }
 const signedOut=await browser.newPage();
 await signedOut.goto(origin+'/'+lineup[0].id+'?board=1');
 await signedOut.locator('.board-category-chips').waitFor();
 assert.equal(await signedOut.locator('[data-pilot-next],.pilot-pulse').count(),0);
 await signedOut.locator('[data-winner-share] button').waitFor();
 await signedOut.close();
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
 await fs.rm(directory,{recursive:true,force:true});
}
