// Local fixture only: checks navigation, keyboard/focus, and the existing nomination handoff.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createVouchServer} from '../server.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {initialRegistry,DEFAULT_EXPERIMENT} from '../lib/experiment-api.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const directory=path.resolve('.data/vouch-pill-smoke-'+crypto.randomUUID());
const store=await createFileStore(directory),registry=await store.scope('experiment-registry',initialRegistry);
await registry.transaction(data=>{
 data.experiments.headphones={...DEFAULT_EXPERIMENT,id:'headphones',category:'Headphones',products:[{id:'sku-global-headphones',brand:'Audio fixture',name:'Quiet headphones',formula:'',image:null}]};
 data.experiments.closed={...DEFAULT_EXPERIMENT,id:'closed',closed:true};
 data.experiments.draft={...DEFAULT_EXPERIMENT,id:'draft',status:'draft'};
});
const product={id:'catalog-pill-fixture',brand:'Fixture',name:'Daily SPF',source:'fixture'};
const server=await createVouchServer({directory,productSearch:{search:async query=>({products:query.includes('nomatch')?[]:[product]}),find:async id=>id===product.id?product:null}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),errors=[];
const page=await browser.newPage({viewport:{width:375,height:812}});
page.setDefaultTimeout(7000);
page.on('pageerror',error=>errors.push(error.message));
const output=path.resolve('output');await fs.mkdir(output,{recursive:true});
const visible=selector=>page.locator(selector).isVisible();
const emblemFits=()=>page.locator('.site-search-field').evaluate(field=>{
 const emblem=field.querySelector('.site-search-emblem').getBoundingClientRect(),input=field.querySelector('input').getBoundingClientRect(),bounds=field.getBoundingClientRect();
 return emblem.left>=bounds.left&&emblem.right<input.left&&input.right<=bounds.right&&emblem.top>=bounds.top&&emblem.bottom<=bounds.bottom;
});
const active=selector=>page.locator(selector).evaluate(node=>node===document.activeElement);
async function board(){await page.goto(origin+'/sunscreen?board=1');await page.locator('.board-vouch-card').waitFor();}
async function closeTo(selector,key='Escape'){await page.keyboard.press(key);assert.ok(await active(selector),'focus returns to '+selector);}
try{
 for(const width of [375,360,320]){
  console.log('Checking phone width',width);await page.setViewportSize({width,height:812});await board();
  assert.ok(await visible('.vouch-pill'));assert.ok(await visible('.vouch-pill-label'));
  assert.equal(await visible('.site-brand-group'),false,'mobile wordmark leaves room for search');
  assert.ok(await visible('.leaderboard-link'));
  assert.ok(await page.locator('.leaderboard-link').evaluate(node=>node.getBoundingClientRect().left>=document.querySelector('.site-search').getBoundingClientRect().right),'profile sits to the right of search');
  assert.equal(await page.locator('#site-search-input').getAttribute('placeholder'),'Search vouch');
  assert.ok(await page.locator('.site-search').evaluate(node=>{const header=node.closest('header').getBoundingClientRect(),search=node.getBoundingClientRect();return header.height<=80&&search.top>=header.top&&search.bottom<=header.bottom;}),'search stays in the single top row');assert.ok(await emblemFits(),'emblem fits in search without overlapping text');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  if(width===375)await page.screenshot({path:path.join(output,'vouch-pill-mobile-rest.png')});
  await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,700);});
  await page.waitForFunction(()=>document.querySelector('.vouch-pill').classList.contains('is-collapsed'));
  await page.waitForFunction(()=>Math.abs(document.querySelector('.vouch-pill').getBoundingClientRect().width-44)<1);
  if(width===375)await page.screenshot({path:path.join(output,'vouch-pill-mobile-collapsed.png')});
  await page.evaluate(()=>window.scrollBy(0,-40));
  await page.waitForFunction(()=>!document.querySelector('.vouch-pill').classList.contains('is-collapsed'));
  await page.locator('.vouch-pill').click();
  assert.ok(await active('#site-search-input'));assert.equal(await visible('.vouch-pill'),false);assert.ok(await emblemFits(),'expanded search emblem does not overlap text');
  if(width===375)await page.screenshot({path:path.join(output,'vouch-pill-mobile-search.png')});
  await closeTo('.vouch-pill');
  await page.locator('.vouch-pill').click();await page.locator('.site-search-close').click();assert.ok(await active('.vouch-pill'));
  await page.locator('.board-vouch-card').click();assert.ok(await active('#site-search-input'));assert.equal(await page.locator('#site-search-input').inputValue(),'');await closeTo('.board-vouch-card');
  await page.locator('.site-menu-toggle').click();assert.ok(await visible('.leaderboard-link'),'profile stays visible on the right');assert.ok(await visible('.site-search'),'search stays in top nav with menu open');if(width===375)await page.screenshot({path:path.join(output,'vouch-nav-mobile-menu.png')});assert.equal(await visible('.vouch-pill'),false);await page.keyboard.press('Escape');assert.ok(await visible('.vouch-pill'));
  await page.locator('#info').evaluate(node=>node.showModal());assert.equal(await visible('.vouch-pill'),false);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.vouch-pill').hidden);
  await page.locator('#nomination-name').focus();assert.equal(await visible('.vouch-pill'),false);
  await page.keyboard.press('Escape');await page.evaluate(()=>document.activeElement.blur());
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  assert.ok(await page.locator('.flow-footer').evaluate(node=>node.getBoundingClientRect().bottom<=innerHeight-60),'footer clears pill');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await board();
 assert.equal(await page.locator('.vouch-pill-label').evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
 await page.evaluate(()=>window.scrollTo(0,700));await page.waitForFunction(()=>document.querySelector('.vouch-pill').classList.contains('is-collapsed'));await page.emulateMedia({reducedMotion:'no-preference'});
 // A real result must still select a product in the existing nomination form.
 await page.locator('.vouch-pill').click();await page.locator('#site-search-input').fill('fixture');
 await page.locator('#site-search-results .product-result').filter({hasText:'Daily SPF'}).waitFor();
 assert.match(await page.locator('#site-search-results').innerText(),/Not on board · Vouch for it/);
 await page.locator('#site-search-results .product-result').filter({hasText:'Daily SPF'}).click();
 await page.waitForFunction(()=>document.querySelector('#selected-product')?.textContent.includes('Daily SPF'));
 await page.waitForFunction(()=>document.querySelector('#nomination-name')===document.activeElement);assert.equal(await visible('.vouch-pill'),false,'nomination keyboard/dialog hides pill');
 await board();await page.locator('.vouch-pill').click();
 const query='nomatch '+ 'a'.repeat(50);await page.locator('#site-search-input').fill(query);
 await page.locator('.site-search-nominate').waitFor();
 assert.match(await page.locator('#site-search-status').innerText(),/No match. Vouch for it by name/);
 assert.equal(await page.locator('.site-search-nominate').innerText(),'Vouch for “'+query.slice(0,40)+'…”');
 await page.locator('.site-search-nominate').click();
 await page.waitForFunction(query=>document.querySelector('#nomination-name')?.value===query,query);
 for(const width of [768,1280]){
  await page.setViewportSize({width,height:850});await board();
  assert.equal(await visible('.vouch-pill'),false);assert.ok(await emblemFits());assert.ok(await visible('.site-search-emblem'));assert.ok(await visible('.site-search-shortcut'));
  assert.equal(await page.locator('#site-search-input').getAttribute('aria-label'),'Search vouch');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('/');assert.ok(await active('#site-search-input'));await page.keyboard.press('Escape');
  await page.locator('#nomination-name').focus();await page.keyboard.press('/');assert.ok(await active('#nomination-name'),'shortcut does not steal typing');
  await page.locator('.board-vouch-card').click();assert.ok(await active('#site-search-input'));await closeTo('.board-vouch-card');
  await page.evaluate(()=>window.scrollTo(0,0));
  if(width===1280)await page.screenshot({path:path.join(output,'vouch-pill-desktop.png')});
 }
 // Medium-width layouts must have a reachable menu whenever links are hidden.
 for(const width of [768,900,1100]){
  await page.setViewportSize({width,height:850});await board();
  assert.ok(await visible('.site-menu-toggle'),'medium-width menu is visible');
  await page.locator('.site-menu-toggle').click();assert.ok(await visible('.site-menu'));
  if(width===900)await page.screenshot({path:path.join(output,'vouch-nav-medium-menu.png')});
  await page.locator('.site-menu a[href="/categories"]').click();await page.waitForURL(origin+'/categories');
 }
 await page.setViewportSize({width:900,height:850});await board();
 assert.equal(await page.locator('#site-search-input').getAttribute('placeholder'),'Search vouch');
 await page.waitForTimeout(4200);assert.equal(await page.locator('#site-search-input').getAttribute('placeholder'),'Search vouch','idle prompt stays static');
 await page.locator('#site-search-input').focus();
 await page.locator('#site-search-input').fill('Quiet');
 const globalResult=page.locator('#site-search-results .product-result').filter({hasText:'Quiet headphones'});
 await globalResult.waitFor();assert.match(await globalResult.innerText(),/Headphones · View product/);
 await globalResult.click();await page.waitForURL(origin+'/products/sku-global-headphones');
 assert.equal(await page.locator('#nomination-form').count(),0,'global result is never nominated to sunscreen');
 await page.setViewportSize({width:375,height:812});
 for(const route of ['/','/account','/categories','/closed?board=1','/draft?preview=1&board=1']){
  await page.goto(origin+route);await page.waitForLoadState('networkidle');if(route==='/account')assert.equal(await visible('.site-menu-toggle'),false,'signed-out account stays navigation locked');assert.equal(await visible('.vouch-pill'),false,route);assert.equal(await visible('.board-vouch-card'),false,route);
 }
 await page.goto(origin+'/sunscreen?start=1');await page.locator('[data-vote]').first().waitFor();assert.equal(await visible('.vouch-pill'),false);assert.equal(await visible('.board-vouch-card'),false);
 assert.deepEqual(errors,[]);
 console.log('Vouch pill smoke passed: 320/360/375/768/1280px, scroll, focus, overlays, nomination handoff, shortcuts, reduced motion, route gating.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}
