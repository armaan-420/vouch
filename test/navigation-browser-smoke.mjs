// Synthetic local browser responses; never sends search requests to live providers.
import assert from 'node:assert/strict';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4196';
try{
 for(const width of [320,390,760,768,900,1100,1440]){
  const context=await browser.newContext({viewport:{width,height:852}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  // Older Safari supports AbortController without these static helpers.
  if(width===390)await page.addInitScript(()=>{delete AbortSignal.any;delete AbortSignal.timeout;});
  await page.route('**/api/search?**',async route=>{const url=new URL(route.request().url()),q=url.searchParams.get('q');if(q==='timeout')return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.fulfill({contentType:'application/json',body:JSON.stringify({products:q==='nomatch'?[]:url.searchParams.get('source')==='catalog'?[]:[{id:'sku-owala-freesip-24oz',brand:'Owala',name:'FreeSip Stainless Steel 24 oz',image:'/assets/water-bottles/owala.png',discoveryHref:'/products/sku-owala-freesip-24oz',vouchStatus:'listed'}]})});});
  for(const route of ['/waterbottle?start=1','/waterbottle?board=1','/products/sku-owala-freesip-24oz?experiment=waterbottle','/categories','/account']){
   await page.goto(origin+route);await page.locator('.site-header.has-product-search').waitFor();await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' '+width);
   const brand=await page.locator('.site-brand-group').boundingBox();assert.ok(brand.width>=36);
   if(width<=760){assert.equal(await page.locator('.site-search').isVisible(),false);assert.equal(await page.locator('.site-search-toggle').isVisible(),true);assert.equal(await page.locator('.leaderboard-link').isVisible(),true);assert.equal(await page.locator('.site-menu-toggle').isVisible(),true);
    const icon=await page.locator('.site-search-toggle').boundingBox();assert.ok(brand.x+brand.width<icon.x);const menu=await page.locator('.site-menu-toggle').boundingBox();const profile=await page.locator('.leaderboard-link').boundingBox();assert.ok(icon.x+icon.width<=profile.x&&profile.x+profile.width<=menu.x,'profile between search and menu');assert.equal(await page.locator('.vouch-pill').count(),0);assert.equal(Math.round((await page.locator('.site-header').boundingBox()).height),64);
   }else{assert.equal(await page.locator('#site-search-input').isVisible(),true);const field=await page.locator('.site-search').boundingBox();assert.ok(field.x>=brand.x+brand.width);assert.equal(await page.locator('.site-search-emblem').count(),0);}
  }
  await page.goto(origin+'/waterbottle?start=1');await page.locator('[data-vote=yes]').waitFor();
  if(width<=760){await page.locator('.site-menu-toggle').click();assert.equal(await page.locator('.site-menu-toggle').getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.site-menu a[href="/categories"]').isVisible(),true);assert.equal(await page.locator('.site-menu-account').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('.site-menu-toggle').getAttribute('aria-expanded'),'false');assert.ok(await page.locator('.site-menu-toggle').evaluate(e=>e===document.activeElement));}
  if(width===390||width===1440)await page.screenshot({path:`/tmp/vouch-navigation-rest-${width}.png`});
  if(width<=760){await page.locator('.site-search-toggle').click();assert.equal(await page.locator('.site-search').getAttribute('aria-modal'),'true');assert.ok(await page.locator('main').evaluate(e=>e.inert));assert.equal(await page.locator('.site-search-close').isVisible(),false);assert.equal(await page.locator('.site-search-shortcuts').isVisible(),true);}
  else{await page.locator('#site-search-input').click();}
  assert.ok(await page.locator('#site-search-input').evaluate(e=>e===document.activeElement));
  if(width===390)await page.screenshot({path:'/tmp/vouch-navigation-empty-390.png'});
  await page.locator('#site-search-input').fill('Owala');await page.locator('#site-search-results .product-result').first().waitFor();assert.equal(await page.locator('.site-search-shortcuts').isVisible(),false);
  if(width===390||width===1440)await page.screenshot({path:`/tmp/vouch-navigation-results-${width}.png`});
  if(width<=760){await page.locator('.site-search-dismiss').focus();await page.keyboard.press('Shift+Tab');assert.ok(await page.locator('.site-search').evaluate(e=>e.contains(document.activeElement)));}
  await page.keyboard.press('Escape');assert.equal(await page.locator('.site-search').getAttribute('aria-modal'),null);assert.equal(await page.locator('main').evaluate(e=>e.inert),false);
  if(width<=760)assert.ok(await page.locator('.site-search-toggle').evaluate(e=>e===document.activeElement));
  await page.keyboard.press('/');await page.locator('#site-search-input').fill('nomatch');await page.locator('#site-search-status').filter({hasText:'No matches'}).waitFor();
  await page.locator('#site-search-input').fill('timeout');await page.locator('#site-search-status').filter({hasText:'unavailable'}).waitFor();
  await page.locator('#site-search-input').fill('Owala');await page.locator('#site-search-results .product-result').first().waitFor();await page.locator('#site-search-results .product-result').first().click();await page.waitForURL('**/products/sku-owala-freesip-24oz');
  if(width>760&&width<=1100){await page.locator('.site-menu-toggle').click();await page.locator('.site-menu a[href="/categories"]').click();await page.waitForURL('**/categories');}
  if(width===390){await page.locator('.site-search-toggle').click();await page.setViewportSize({width:900,height:852});await page.waitForFunction(()=>!document.querySelector('main').inert);await page.keyboard.press('Escape');assert.ok(await page.locator('#site-search-input').evaluate(e=>e===document.activeElement));await page.locator('#site-search-input').click();await page.setViewportSize({width:390,height:852});await page.waitForFunction(()=>document.querySelector('main').inert);await page.keyboard.press('Escape');assert.ok(await page.locator('.site-search-toggle').evaluate(e=>e===document.activeElement));}
  assert.deepEqual(errors,[]);console.log('PASS navigation',width,'rating/Board/product/categories/account; results, failure, Escape, focus and routing');await context.close();
 }
}finally{await browser.close()}
