import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
const origin='http://127.0.0.1:4196',id='sku-owala-freesip-24oz',browser=await chromium.launch({headless:true});
const names=['Maya Rivera','Jon Kim','Priya Shah','Alex Morgan','Nora Ellis','Sam Patel','Ava Chen','Leo Davis','Zoe Martin','Omar Ali','Lily Brown','Evan Jones'];
try{
 const reference=await browser.newPage();await reference.goto(new URL('../../VOUCH_ITEM_PAGE_MOCKUP.html',import.meta.url).href);await reference.screenshot({path:'/tmp/vouch-item-reference.png',fullPage:true});await reference.close();
 for(const width of [393,1440]){
  const context=await browser.newContext({viewport:{width,height:width===393?852:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=await (await page.request.get(origin+'/api/products/'+id)).json();
  const people=names.map((displayName,i)=>({handle:'fixture-'+i,displayName,verdict:'yes',updatedAt:new Date(Date.now()-(i+1)*86400000).toISOString(),...(i<2?{photo:'/api/account/photos/11111111-1111-4111-a111-111111111111.png'}:{}),...(i<7?{comment:i===0?'Easy to carry between classes.':i===1?'A long note: '+('Comfortable lid and useful everyday size. '.repeat(4)):'Useful for my daily routine.'}:{})}));
  const image=await fs.readFile(new URL('../public/brand/vouch-emblem.svg',import.meta.url));await page.route('**/api/account/photos/*.png',r=>r.fulfill({contentType:'image/svg+xml',body:image}));
  let population=people,unrated=false;
  await page.route('**/api/products/'+id,async route=>{if(route.request().method()!=='GET')return route.continue();return route.fulfill({contentType:'application/json',body:JSON.stringify({...base,contributors:population,...(unrated?{community:null,newToVouch:false}:{})})});});
  await page.goto(origin+'/products/'+id+'?experiment=waterbottle#item-people');await page.locator('.item-people').waitFor();await page.waitForTimeout(300);await page.evaluate(()=>scrollTo(0,0));
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
}finally{await browser.close()}
