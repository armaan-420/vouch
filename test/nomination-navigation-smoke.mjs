// Local regression: existing board results must never navigate out of nominations.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.PREVIEW_ORIGIN||'http://127.0.0.1:4174';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const browser=await chromium.launch({headless:true});
try{
 for(const width of [1000,390]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let submissions=0,payload;
  await page.route('**/api/products/search**',route=>route.fulfill({json:{products:[
   {id:'existing',brand:'Example',name:'Existing sunscreen',onBoardId:'eltamd'},
   {id:'first',brand:'Example',name:'First missing sunscreen'},
   {id:'second',brand:'Example',name:'Second missing sunscreen'},
  ]}}));
  await page.route('**/api/nominations**',route=>{submissions++;payload=route.request().postDataJSON();return route.fulfill({json:{nominations:payload.nominations.map(n=>({product:{id:n.productId},name:n.productId}))}});});
  await page.goto(origin+'/sunscreen?board=1');
  await page.locator('#nomination-name').waitFor();
  await page.evaluate(()=>{state.nominations=[];selectedNominations=[];screen='game';index=products.length;render();});
  await page.locator('#nomination-name').fill('example');
  const rows=page.locator('#product-results .product-result');await rows.first().waitFor();
  assert.equal(await rows.first().isDisabled(),true);
  assert.match(await rows.first().textContent(),/Already on the board · No nomination needed/);
  assert.equal(await rows.first().locator('.result-check').isVisible(),false);
  // Even scripted clicks and keyboard activation cannot trigger the old shortcut.
  await rows.first().dispatchEvent('click');
  await page.locator('#nomination-name').press('ArrowDown');
  await page.locator('#nomination-name').press('Enter');
  assert.equal(await page.locator('#nomination-continue').count(),1);
  assert.equal(submissions,0);
  await rows.nth(1).click();await rows.nth(2).click();
  assert.equal(await page.locator('#nomination-count').textContent(),'· 2');
  assert.equal(await rows.nth(1).getAttribute('aria-selected'),'true');
  assert.equal(await rows.nth(2).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#nomination-name').inputValue(),'example');
  assert.equal(submissions,0);
  await rows.nth(1).click();assert.equal(await page.locator('#nomination-count').textContent(),'· 1');
  await rows.nth(1).click();
  if(width<600)await page.locator('[data-search-done]').click();
  else await page.locator('#nomination-continue').click();
  await page.locator('.board h1').waitFor();
  assert.equal(submissions,1);assert.deepEqual(payload.nominations,[{productId:'second'},{productId:'first'}]);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: desktop/mobile final step retains multiple selections, existing board results cannot navigate by pointer or keyboard, and explicit finish saves once.');
}finally{await browser.close();}
