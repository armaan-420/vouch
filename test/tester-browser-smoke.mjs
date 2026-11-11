// Local-only end-to-end check. No real email delivery or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createVouchServer} from '../server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const directory=path.resolve('.data/tester-browser-'+crypto.randomUUID());
const server=await createVouchServer({directory,productSearch:{search:async()=>({products:[]}),find:async()=>null}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const errors=[];
await fs.mkdir('outputs/tester-attribution',{recursive:true});
async function finish(page){
 await page.goto(origin+'/sunscreen');
 await page.locator('.hero .primary').click();
 const products=(await (await page.request.get(origin+'/api/experiment')).json()).experiment.products;
 for(let i=0;i<products.length;i++){
  const button=page.locator('[data-vote="yes"]');await button.waitFor();await button.click();
  // Wait for the completed save to advance to the next card (or nominations).
  if(i<products.length-1)await page.locator('.game-position').filter({hasText:(i+2)+' of '+products.length}).waitFor();
 }
 await page.locator('#nomination-continue').click();
 await page.locator('#attribution-form').waitFor();
}
function noOverflow(page){return page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)}
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await finish(page);
  assert.equal(await page.locator('#attribution-form [type=checkbox]').count(),0);
  assert.equal(await page.locator('#tester-name').getAttribute('autocomplete'),'name');
  assert.equal(await page.locator('#tester-email').getAttribute('autocomplete'),'email');
  assert.equal(await page.locator('#attribution-form').getAttribute('autocomplete'),'on');
  assert.equal(await noOverflow(page),true);
  assert.equal(await page.locator('#tester-name').getAttribute('required'),'');
  assert.equal(await page.locator('#tester-email').getAttribute('required'),'');
  assert.doesNotMatch(await page.locator('#attribution-form').innerText(),/wharton|isn’t saved/i);
  await page.locator('#attribution-form [type=submit]').click();assert.equal(await page.locator('#attribution-form').isVisible(),true);
  await page.screenshot({path:`outputs/tester-attribution/form-${width}.png`,fullPage:true});
  // DOM replacement from timers must never reset browser-filled values.
  await page.locator('#tester-name').fill('Browser Tester');await page.locator('#tester-email').fill(`browser${width}@wharton.upenn.edu`);
  await page.waitForTimeout(1100);assert.equal(await page.locator('#tester-email').inputValue(),`browser${width}@wharton.upenn.edu`);
  // Failed saves preserve the form and entered values; retry succeeds.
  await page.route('**/api/account/participate**',route=>route.fulfill({status:503,json:{error:'Temporary test failure'}}),{times:1});
  await page.locator('#attribution-form [type=submit]').click();await page.locator('.attribution-error').waitFor();
  assert.equal(await page.locator('#tester-name').inputValue(),'Browser Tester');
  await page.locator('#attribution-form [type=submit]').click();
  await page.locator('.board h1').waitFor();assert.equal(await page.locator('.tester-banner').isVisible(),true);
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(250);assert.equal(await page.locator('.picks-prompt[open]').count(),0);
  await page.locator('header .leaderboard-link').click();await page.locator('.profile-details h1').waitFor();
  assert.equal(await page.locator('.tester-badge').first().textContent(),'Wharton early tester');
  await page.screenshot({path:`outputs/tester-attribution/profile-${width}.png`,fullPage:true});
  await page.locator('[data-name-visibility]').click();
  const toggle=page.locator('[name=showName]');assert.equal(await toggle.isChecked(),true);await toggle.uncheck();
  await page.locator('#profile-edit-form [type=submit]').click();await page.getByText('✓ Profile saved',{exact:true}).waitFor();
  await page.locator('.profile-editor [data-cancel]:visible').first().click();
  await page.reload();await page.locator('[data-name-visibility]').waitFor();await page.locator('[data-name-visibility]').click();assert.equal(await page.locator('[name=showName]').isChecked(),false);
  const me=await (await page.request.get(origin+'/api/account/me')).json();
  const observer=await browser.newContext();const product=await (await observer.request.get(origin+'/api/products/boj')).json();
  assert.ok(!product.contributors.some(c=>c.handle===me.profile.handle));
  assert.equal((await observer.request.get(origin+'/api/profiles/'+me.profile.handle)).status(),404);
  await observer.close();
  const returning=await browser.newContext(),returnPage=await returning.newPage();
  await returnPage.goto(origin+'/account');await returnPage.locator('#account-email').fill(`browser${width}@wharton.upenn.edu`);await returnPage.locator('#email-form [type=submit]').click();
  await returnPage.locator('#account-code').waitFor();const code=await returnPage.locator('#verify-form code').textContent();await returnPage.locator('#account-code').fill(code);await returnPage.locator('#verify-form [type=submit]').click();await returnPage.locator('.profile-details h1').waitFor();
  assert.equal(await returnPage.locator('.profile-details h1').textContent(),'Browser Tester');assert.equal(await returnPage.locator('.profile-private-email').isVisible(),true);
  const recovered=await (await returnPage.request.get(origin+'/api/account/me')).json();assert.equal(recovered.profile.handle,me.profile.handle);assert.equal(recovered.profile.emailVerified,true);
  await returning.close();await context.close();
 }
 // Skipping and a non-Wharton address keep the same open results flow.
 for(const skip of [true,false]){
  const context=await browser.newContext({viewport:{width:320,height:760}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await finish(page);
  assert.equal(await noOverflow(page),true);
  if(skip)await page.locator('[data-skip-attribution]').click();else{await page.locator('#tester-name').fill('Other Tester');await page.locator('#tester-email').fill('tester@example.test');await page.locator('#attribution-form [type=submit]').click()}
  await page.locator('.board h1').waitFor();assert.equal(await page.locator('.tester-banner').count(),0);
  if(skip)assert.equal((await (await page.request.get(origin+'/api/account/me')).json()).authenticated,false);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Browser checks passed: phone/desktop form, autofill attributes and stable values, retry, skip, badges, persistent name privacy, public API filtering, no signup popup, 320px layout.');
}finally{await browser.close();await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true})}
