import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
import {createVouchServer} from '../server.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {DEFAULT_EXPERIMENT,initialRegistry} from '../lib/experiment-api.mjs';
import {WATER_BOTTLES} from '../lib/water-bottles.mjs';

const dataRoot=fileURLToPath(new URL('../.data/',import.meta.url));
await fs.mkdir(dataRoot,{recursive:true});
const directory=await fs.mkdtemp(path.join(dataRoot,'wharton-pilot-browser-'));
const output=path.resolve(process.env.WHARTON_PILOT_OUTPUT||fileURLToPath(new URL('../../output/wharton-first-unlock/',import.meta.url)));
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
const store=await createFileStore(directory);
await (await store.scope('experiment-registry',initialRegistry)).transaction(data=>{
  for(const e of lineup)data.experiments[e.id]={...DEFAULT_EXPERIMENT,...e};
  for(let index=0;index<10;index++){
    const id='fixture-edit-'+index;
    data.experiments[id]={...DEFAULT_EXPERIMENT,id,title:'Test Edit '+index,category:'Test category '+index,products:WATER_BOTTLES};
  }
});
const server=await createVouchServer({directory,productSearch:{search:async()=>({products:[]}),find:async()=>null},autoOptions:{env:{EXPERIMENT_AUTO_BUILD:'off'}}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const widths=[320,360,375,390,430,700,768,1024,1050,1280,1440];
try{
  for(const width of widths){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:width===375?'reduce':'no-preference'});
    try{
      const page=await context.newPage(),errors=[];
      page.setDefaultTimeout(8000);
      page.on('pageerror',error=>errors.push(error.message));
      await page.route(url=>url.origin!==origin,route=>route.abort());
      async function check(label){
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+' '+label+' overflow');
        if([360,390,430,700,768,1050,1280].includes(width))await page.screenshot({path:path.join(output,label+'-'+width+'.png'),fullPage:!label.startsWith('dock'),animations:'disabled'});
      }
      async function board(category,action){
        await page.goto(origin+'/'+category.id+'?board=1&wharton=1');
        await page.locator('.board-dock-main[data-dock-action="'+action+'"]').waitFor({state:'attached'});
        await page.evaluate(()=>scrollTo(0,120));
        await page.locator('.board-dock.is-visible').waitFor();
        assert.ok(await page.locator('.board-dock-main').evaluate(el=>el.offsetHeight>=44&&el.scrollWidth<=el.clientWidth));
        assert.ok(await page.locator('.board-dock-status small').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth)));
      }
      await page.goto(origin+'/wharton');
      await page.locator('#wharton-name').fill('Casey Pilot');
      await page.locator('#wharton-email').fill('pilot-'+width+'@wharton.upenn.edu');
      await page.locator('#wharton-join button').click();
      await page.locator('#wharton-code').fill(await page.locator('.wharton-help code').textContent());
      await page.locator('#wharton-verify button').click();
      await page.getByRole('button',{name:'Skip',exact:true}).click();
      const gate=page.locator('.wharton-category');
      await gate.waitFor();
      assert.equal(await gate.count(),1);
      const locked=page.locator('[data-locked-category]');
      assert.deepEqual(await locked.evaluateAll(els=>els.slice(0,2).map(el=>el.dataset.name)),['Lip balm','Carry-on luggage']);
      assert.doesNotMatch(await locked.first().innerText(),/Wharton pick/);
      const visible=width<768?5:9;
      assert.equal(await page.locator('[data-locked-category]:visible').count(),visible);
      assert.ok(await page.locator('[data-locked-category]:visible .wharton-tile-image').evaluateAll(els=>els.every(el=>Math.abs(el.clientWidth/el.clientHeight-1.5)<0.04)));
      await check('A');
      const more=page.locator('[data-more-locked]');
      assert.equal(await more.textContent(),'+'+((await locked.count())-visible)+' more');
      await more.press('Enter');
      assert.ok(await locked.nth(visible).evaluate(el=>document.activeElement===el));
      await locked.first().press('Enter');
      await page.getByRole('status').filter({hasText:'Lip balm unlocks after water bottles.'}).waitFor();
      await page.keyboard.press('Tab');
      await page.locator('[data-locked-hint] a').focus();
      assert.ok(await page.locator('[data-locked-hint] a').evaluate(el=>el.offsetHeight>=44));
      await board(lineup[0],'next_category');
      assert.match(await page.locator('.board-dock-status').innerText(),/Start with Water bottles/);
      await check('dock-start');
      await page.goto(origin+'/wharton');
      await gate.click();
      const countdown=page.locator('.rating-unlock-count');
      const skip=page.locator('[data-vote=skip]');
      const total=WATER_BOTTLES.length;
      await countdown.waitFor();
      assert.equal(await countdown.innerText(),total+' to unlock');
      await check('rating-first');
      await skip.click();
      await page.goto(origin+'/wharton');
      const hint=page.locator('[data-locked-hint]');
      await page.getByRole('button',{name:/Lip balm, locked/}).press('Enter');
      assert.match(await hint.innerText(),new RegExp((total-1)+' to go'));
      await check('B');
      await board(lineup[0],'next_category');
      assert.match(await page.locator('.board-dock-main').innerText(),/^Finish/);
      await check('dock-partial');
      await page.goto(origin+'/wharton');
      await gate.click();
      for(let remaining=total-1;remaining>=1;remaining--){
        await page.getByRole('progressbar').and(page.locator('[aria-valuetext$=", '+remaining+' to unlock every category"]')).waitFor();
        if(remaining<=2)await check('rating-'+(total-remaining+1));
        await skip.click();
      }
      await page.locator('.nomination-step').waitFor();
      assert.equal(await countdown.count(),0);
      await board(lineup[0],'unlock');
      assert.match(await page.locator('.board-dock-status').innerText(),/Water bottles ✓\s+You go girl!/);
      await check('dock-unlock');
      await page.goto(origin+'/wharton');
      const unlock=page.getByRole('button',{name:'Unlock all categories'});
      await unlock.waitFor();
      await check('E');
      if(width===360){
        await page.route('**/api/account/pilot-unlock',async route=>{
          await new Promise(resolve=>setTimeout(resolve,500));
          await route.continue();
        });
      }
      await unlock.press('Enter');
      const unlocked=page.getByRole('heading',{name:'What else do you know and love?'});
      await unlocked.waitFor();
      assert.ok(await unlocked.evaluate(el=>document.activeElement===el));
      await page.getByText('Every category unlocked.',{exact:true}).waitFor({state:'attached'});
      await check('F');
      assert.equal(await page.locator('.wharton-category[href$="wharton=1"]').count(),2);
      assert.equal(await page.locator('.wharton-category .wharton-category-kicker').allTextContents().then(names=>names.join()),'Up next');
      assert.equal(await page.locator('.wharton-tile').count(),0);
      assert.equal(await page.locator('.wharton-category[href$="wharton=1"] p').count(),0);
      const moreCards=page.locator('.wharton-category[data-source="unlocked"]:not([href*="wharton=1"])');
      assert.ok(await moreCards.count()>0);
      const pickWidth=await page.locator('.wharton-category[href$="wharton=1"]').first().evaluate(el=>el.offsetWidth);
      assert.ok(await moreCards.evaluateAll((cards,expected)=>cards.every(card=>card.offsetWidth===expected&&card.offsetHeight>=44),pickWidth));
      assert.equal(await moreCards.first().locator('.wharton-category-status').textContent(),'Start');
      assert.equal(await page.locator('.wharton-boards').count(),0);
      await page.reload();
      await unlocked.waitFor();
      await board(lineup[0],'next_category');
      assert.match(await page.locator('.board-dock-status').innerText(),/1 of 3 vouched/);
      await check('dock-unlocked');
      assert.deepEqual(errors,[]);
      console.log('PASS',width,'A → B → E → F, countdown, dock and keyboard focus');
    }finally{await context.close();}
  }
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  await fs.rm(directory,{recursive:true,force:true});
}
