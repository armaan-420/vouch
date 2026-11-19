import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
import {createVouchServer} from '../server.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {DEFAULT_EXPERIMENT,initialRegistry} from '../lib/experiment-api.mjs';
import {initialAccounts} from '../lib/accounts.mjs';
import {accountKey} from '../lib/admin-accounts.mjs';

const dataRoot=path.resolve('.data');
await fs.mkdir(dataRoot,{recursive:true});
const directory=await fs.mkdtemp(path.join(dataRoot,'page-loading-test-'));
const store=await createFileStore(directory);
const product={id:'c3-YyouZX0',brand:'OXO',name:'Brew Compact Conical Burr Coffee Grinder',image:'/brand/vouch-emblem.svg'};
await (await store.scope('experiment-registry',initialRegistry)).transaction(data=>{
 data.experiments['coffee-grinder']={...DEFAULT_EXPERIMENT,id:'coffee-grinder',title:'The Coffee Grinder Edit',category:'Coffee grinders',products:[product]};
});
const token='a'.repeat(64);
const member=await accountKey('tester:'+token);
await (await store.scope('accounts-v1',initialAccounts)).transaction(data=>{
 data.accounts[member]={handle:'v-test-reader',displayName:'Test Reader',photo:'test-avatar',browserProfile:true,opinions:{},history:[],milestones:[]};
});

const productPath='/products/'+product.id+'?experiment=coffee-grinder';
const boardPath='/coffee-grinder?board=1';
const server=await createVouchServer({directory,productSearch:{search:async()=>({products:[]}),find:async()=>null},autoOptions:{env:{EXPERIMENT_AUTO_BUILD:'off'}}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();
try{
 for(const [width,reducedMotion] of [[375,'no-preference'],[1280,'reduce']]){
  const context=await browser.newContext({viewport:{width,height:812},reducedMotion,serviceWorkers:'block'});
  await context.addCookies([{name:'vouch_tester_session',value:token,url:origin,httpOnly:true}]);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https:\/\//,route=>route.abort());
  await page.addInitScript(()=>{
   window.sawWrongScreen=false;
   new MutationObserver(()=>{
    if(location.search.includes('board=1')&&document.querySelector('main .hero'))window.sawWrongScreen=true;
   }).observe(document,{subtree:true,childList:true});
  });
  let finishPhoto=()=>{};
  const photoReady=new Promise(resolve=>{finishPhoto=resolve;});
  await page.route('**/api/account/photos/test-avatar',async route=>{
   await photoReady;
   if(width===1280){await route.abort();return;}
   await route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="olive"/></svg>'});
  });
  let finishProduct;
  let productReady=new Promise(resolve=>{finishProduct=resolve;});
  let failProduct=true;
  await page.route('**/api/products/'+product.id,async route=>{
   await productReady;
   if(failProduct){failProduct=false;await route.fulfill({status:503,json:{error:'Temporary failure.'}});}
   else await route.continue();
  });
  await page.goto(origin+productPath,{waitUntil:'domcontentloaded'});
  const skeleton=page.getByRole('status',{name:'Opening product…',exact:true});
  await skeleton.waitFor();
  assert.equal(await page.locator('.page-loading-ring').count(),0);
  assert.equal(await skeleton.locator('span').first().evaluate(el=>getComputedStyle(el).animationName),reducedMotion==='reduce'?'none':'product-loading-pulse');
  const avatar=page.getByRole('link',{name:'My profile',exact:true});
  assert.equal(await avatar.innerText(),'T');
  assert.equal(await avatar.locator('img').count(),0);
  const initialBounds=await avatar.boundingBox();
  finishProduct();
  const retry=page.getByRole('button',{name:'Try again',exact:true});
  await retry.waitFor();
  productReady=new Promise(resolve=>{finishProduct=resolve;});
  await retry.click();
  await skeleton.waitFor();
  finishProduct();
  const back=page.getByRole('link',{name:'The Board',exact:true});
  await back.waitFor();
  assert.equal(await back.getAttribute('href'),boardPath);
  await page.route('**/api/account/me?experiment=coffee-grinder',async route=>{
   await delay(1400);
   await route.continue();
  });
  let failBoard=true;
  await page.route('**/api/board?experiment=coffee-grinder',async route=>{
   await delay(1400);
   if(failBoard){failBoard=false;await route.fulfill({status:503,json:{error:'Temporary failure.'}});}
   else await route.continue();
  });
  await back.click({noWaitAfter:true});
  await page.waitForURL(origin+boardPath,{waitUntil:'domcontentloaded'});
  const loader=page.getByText('Opening the Board…',{exact:true});
  await loader.waitFor();
  assert.equal(await skeleton.count(),0);
  assert.equal(await avatar.innerText(),'T');
  assert.equal((await avatar.boundingBox()).width,initialBounds.width);
  assert.equal(await page.locator('.page-loading-ring').evaluate(el=>getComputedStyle(el).animationName),reducedMotion==='reduce'?'none':'page-loading-sweep');
  await page.getByRole('heading',{name:'Could not open the Board.',exact:true}).waitFor();
  assert.equal(page.url(),origin+boardPath);
  assert.equal(await page.evaluate(()=>window.sawWrongScreen),false);
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await loader.waitFor();
  assert.equal(await page.locator('.rank-row').count(),0);
  await page.getByRole('heading',{name:'The Board',exact:true}).waitFor();
  assert.equal(await page.locator('.rank-row').count(),1);
  assert.equal(await page.evaluate(()=>window.sawWrongScreen),false);
  const photoFailed=width===1280?page.waitForEvent('requestfailed',request=>request.url().endsWith('/test-avatar')):null;
  finishPhoto();
  if(width===375)await avatar.locator('img').waitFor();
  else{
   await photoFailed;
   assert.equal(await avatar.innerText(),'T');
  }
  assert.equal((await avatar.boundingBox()).width,44);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS',width,'product to Board with delayed identity and rankings, retry, stable avatar and motion preference');
 }
 const anonymous=await browser.newContext();
 const response=await anonymous.request.get(origin+boardPath);
 assert.equal(response.headers()['cache-control'],'private, no-store');
 assert.match(response.headers().vary,/Cookie/i);
 assert.match(await response.text(),/data-account-state="signed-out"/);
 const home=await anonymous.newPage();
 for(const width of [375,900,1280]){
  await home.setViewportSize({width,height:812});
  await home.goto(origin+'/');
  const rightInset=await home.getByRole('link',{name:'Sign in',exact:true}).evaluate(link=>{
   const header=link.closest('header');
   return header.getBoundingClientRect().right-link.getBoundingClientRect().right-parseFloat(getComputedStyle(header).paddingRight);
  });
  assert.ok(Math.abs(rightInset)<1,'Home Sign in aligns with the right header gutter at '+width+'px');
 }
 await anonymous.close();
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
 await fs.rm(directory,{recursive:true,force:true});
}
