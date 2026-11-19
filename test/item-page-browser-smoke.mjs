import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
const origin='http://127.0.0.1:4196',id='boj',browser=await chromium.launch({headless:true});
const names=['Maya Rivera','Jon Kim','Priya Shah','Alex Morgan','Nora Ellis','Sam Patel','Ava Chen','Leo Davis','Zoe Martin','Omar Ali','Lily Brown','Evan Jones'];
try{
 const reference=await browser.newPage();await reference.goto(new URL('../../VOUCH_ITEM_PAGE_MOCKUP.html',import.meta.url).href);await reference.screenshot({path:'/tmp/vouch-item-reference.png',fullPage:true});await reference.close();
 for(const width of [393,1440]){
  const context=await browser.newContext({viewport:{width,height:width===393?852:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.request.get(origin+'/api/products/'+id);
  assert.equal(response.status(),200);
  const base=await response.json();
  const people=names.map((displayName,i)=>({handle:'fixture-'+i,displayName,verdict:'yes',updatedAt:new Date(Date.now()-(i+1)*86400000).toISOString(),...(i<2?{photo:'/api/account/photos/11111111-1111-4111-a111-111111111111.png'}:{}),...(i<7?{comment:i===0?'Easy to carry between classes.':i===1?'A long note: '+('Comfortable lid and useful everyday size. '.repeat(4)):'Useful for my daily routine.'}:{})}));
  const image=await fs.readFile(new URL('../public/brand/vouch-emblem.svg',import.meta.url));await page.route('**/api/account/photos/*.png',r=>r.fulfill({contentType:'image/svg+xml',body:image}));
  let population=people,unrated=false;
  await page.route('**/api/products/'+id,async route=>{if(route.request().method()!=='GET')return route.continue();return route.fulfill({contentType:'application/json',body:JSON.stringify({...base,contributors:population,...(unrated?{community:null,newToVouch:false}:{})})});});
  await page.goto(origin+'/products/'+id+'?experiment=sunscreen#item-people');await page.locator('.item-people').waitFor();await page.waitForTimeout(300);await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`/tmp/vouch-item-${process.env.CAPTURE_BEFORE?'before':'after'}-${width}.png`,fullPage:true});
  if(process.env.CAPTURE_BEFORE){await context.close();continue;}
  if(width===393){const section=await page.locator('.item-people').boundingBox();assert.ok(section.y<852*1.3);}const chip=await page.locator('[data-more-people]').first().boundingBox();assert.equal(Math.round(chip.height),30);
  assert.equal(await page.locator('.item-avatar-strip .item-person').count(),7);assert.equal(await page.locator('[data-more-people]').first().textContent(),'+6');
  assert.match(await page.locator('.item-people-summary').textContent(),/Maya R\., Jon K\. and 10 others/);
  assert.equal(await page.locator('.item-comments .item-comment:visible').count(),width<950?2:4);
  await page.locator('[data-more-people]').last().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-more-people]').last().getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.item-more-people .item-person').count(),12);assert.equal(await page.locator('.item-more-people .item-comment').count(),0);
  await page.locator('[data-more-comments]').click();assert.equal(await page.locator('.item-comments .item-comment:visible').count(),7);
  const tag=page.locator('[data-item-tag]').first();const was=await tag.getAttribute('aria-pressed');await tag.click();await page.waitForFunction(()=>document.querySelector('[data-tag-status]').textContent.startsWith('Saved'));assert.notEqual(await tag.getAttribute('aria-pressed'),was);await tag.click();await page.waitForFunction(()=>document.querySelector('[data-tag-status]').textContent.startsWith('Saved'));
  for(const testCase of [[],people.slice(0,1),people.slice(0,2),people.slice(0,2).map(p=>({...p,displayName:'Anonymous',handle:undefined,comment:undefined})),people.slice(0,2).map(p=>({...p,comment:undefined}))]){
   population=testCase;await page.reload();await page.locator('.item-people').waitFor();
   assert.equal(await page.locator('.item-comments').count(),testCase.some(p=>p.comment)?1:0);
   if(!testCase.length)assert.match(await page.locator('.item-people').textContent(),/No public vouches yet/);
   if(testCase[0]?.displayName==='Anonymous')assert.match(await page.locator('.item-people-summary').textContent(),/2 people vouched publicly/);
  }
  unrated=true;await page.goto(origin+'/products/'+id);await page.locator('.item-unrated').waitFor();assert.equal(await page.locator('.item-unrated').textContent(),'Unrated');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS item page',width,'12 endorsers, comment limits/expansion, tags, empty/1/2/anonymous/no-comment cases');await context.close();
 }
 if(!process.env.CAPTURE_BEFORE)for(const width of [360,390,430,768,1440]){
  const mobile=width<=700;
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.request.get(origin+'/api/products/'+id);
  assert.equal(response.status(),200);
  const base=await response.json();
  const author={handle:'me',displayName:'Jamie Tester',updatedAt:new Date().toISOString()};
  const other={handle:'other',displayName:'Other Tester',updatedAt:author.updatedAt,verdict:'yes',comment:'Another public note'};
  let verdict=null,shown=true,signedIn=false,comment='',others=[],savedTags=base.tags,failNext=false;
  await page.route('**/api/products/'+id,route=>route.fulfill({json:{
    ...base,tags:savedTags,myVerdict:verdict,
    ...(signedIn?{myNote:{text:comment,isPublic:shown&&verdict==='yes'},myNoteAuthor:author}:{}),
    contributors:[...others,...(shown&&verdict==='yes'?[{...author,comment,verdict}]:[])]
  }}));
  await page.route('**/api/account/me',route=>route.fulfill({json:{authenticated:true,profile:author}}));
  await page.route('**/api/account/vouch',route=>{
    const next=route.request().postDataJSON().verdict;
    if(next!==verdict)comment='';
    verdict=next==='skip'?null:next;
    if(verdict==='yes')savedTags=base.tags.map((tag,index)=>index===0?{...tag,count:7}:tag);
    return route.fulfill({json:{saved:true}});
  });
  await page.route('**/api/account/profile',route=>{
    assert.equal(route.request().postDataJSON().opinions[0].productId,id);
    if(failNext){failNext=false;return route.fulfill({status:400,json:{error:'Try again'}});}
    comment=route.request().postDataJSON().opinions[0].comment;
    return route.fulfill({json:{profile:{...author,visibility:'public',opinions:[{productId:id,verdict,comment,visibility:shown?'public':'private'}]}}});
  });
  const productUrl=origin+'/products/'+id;
  const comments=page.locator('#item-comments'),rest=page.locator('[data-note-start]'),pill=page.getByRole('button',{name:'Add a note',exact:true});
  const field=page.getByRole('textbox',{name:'Your note about this product'}),post=page.getByRole('button',{name:'Post',exact:true});
  const change=page.getByRole('button',{name:'Change',exact:true}),own=page.locator('.item-own-note');
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(productUrl);await page.locator('.photo-vote-option').first().waitFor();
  assert.equal(await comments.count(),0);
  others=[other];
  await page.reload();
  await page.getByRole('button',{name:'Go to vote'}).click();
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.verdict),'no');
  signedIn=true;others=[];
  await page.getByRole('button',{name:'Vouch, would recommend'}).click();
  await rest.waitFor();
  assert.match(await rest.textContent(),/Be the first/);
  assert.equal(await comments.locator('h2 small').count(),0);
  assert.match(await page.locator('.item-people').textContent(),/Jamie/);
  const tagCount=page.locator('[data-item-tag] .item-tag-count').first();
  await tagCount.waitFor();
  assert.equal(await tagCount.textContent(),'7');
  await pill.waitFor();
  await noOverflow();
  if(width<=400)assert.match(await pill.innerText(),/^Note$/);
  await pill.click();
  await field.waitFor();
  assert.equal(await page.locator('.note-sheet:modal').count(),mobile?1:0);
  assert.equal(await post.isDisabled(),true);
  if(mobile)assert.ok((await page.locator('.note-sheet').boundingBox()).y>0);
  await field.fill('Draft from the product page');
  await page.keyboard.press('Escape');
  await field.waitFor({state:'hidden'});
  if(mobile)assert.equal(await pill.evaluate(el=>el===document.activeElement),true);
  else assert.equal(await rest.evaluate(el=>el===document.activeElement),true);
  await rest.click();await field.waitFor();
  assert.equal(await field.inputValue(),'Draft from the product page');
  await field.fill('x'.repeat(225));
  assert.equal(await page.locator('.item-note-counter').getAttribute('aria-live'),'polite');
  await field.fill('Draft from the product page');
  failNext=true;await post.click();
  await page.getByRole('alert').filter({hasText:'Try again'}).waitFor();
  assert.equal(await field.inputValue(),'Draft from the product page');
  await post.click();await own.waitFor();
  assert.equal(await comments.locator('h2 small').textContent(),'1');
  assert.equal(await comments.locator('.item-comment').count(),0);
  assert.match(await page.locator('.item-vote-feedback').textContent(),/Note posted to your profile/);
  await field.waitFor({state:'hidden'});
  assert.equal(await pill.count(),0);
  await change.click();
  await page.getByText('Changing your vote removes your note.').waitFor();
  await noOverflow();
  await page.getByRole('button',{name:'Keep vote'}).click();
  await change.click();
  await page.getByRole('button',{name:'Vouch, would recommend'}).click();
  await change.waitFor();
  assert.match(await own.textContent(),/Draft from the product page/);
  await own.getByRole('button',{name:'Edit',exact:true}).click();
  assert.equal(await field.inputValue(),'Draft from the product page');
  assert.equal(await post.isDisabled(),true);
  await field.fill('Edited note');
  await post.click();
  await own.getByText('Edited note').waitFor();
  await field.waitFor({state:'hidden'});
  shown=false;others=[other];await page.reload();
  await own.getByText('Only you can see this. Your vouch is private.').waitFor();
  assert.equal(await comments.locator('h2 small').textContent(),'1');
  await own.getByRole('button',{name:'Remove',exact:true}).click();
  const keep=own.getByRole('button',{name:'Keep',exact:true});
  assert.equal(await keep.evaluate(el=>el===document.activeElement),true);
  await own.locator('[data-note-confirm]').click();
  await rest.waitFor();
  assert.equal(verdict,'yes');
  assert.equal(comment,'');
  await rest.click();await field.fill('Private note cleared by vote');await post.click();
  await own.getByText('Private note cleared by vote').waitFor();
  await field.waitFor({state:'hidden'});
  await change.click();
  await page.getByRole('button',{name:'Brand vouch, trust the brand only'}).click();
  await page.locator('.photo-vote-summary').getByText('You trust the brand').waitFor();
  assert.equal(await comments.locator('[data-note-vote],[data-note-start],.item-own-note').count(),0);
  await noOverflow();
  assert.deepEqual(errors,[]);
  console.log('PASS product notes', width, mobile?'sheet':'inline');
  await context.close();
 }
}finally{await browser.close()}
