// Local-only end-to-end check. No real email delivery or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createVouchServer} from '../server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const directory=path.resolve('.data/tester-browser-'+crypto.randomUUID());
let authTime=Date.now();
const server=await createVouchServer({directory,productSearch:{search:async()=>({products:[]}),find:async()=>null},authOptions:{previewDelivery:true,now:()=>authTime}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),errors=[];
await fs.mkdir('outputs/tester-attribution',{recursive:true});
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
async function codeSignIn(page,email,{refresh=false,wrong=false}={}){
 await page.locator('#account-email').fill(email);
 assert.equal(await page.locator('#account-email').getAttribute('autocomplete'),'email');
 await page.locator('#email-form [type=submit]').click();await page.locator('#account-code').waitFor();
 assert.equal(await page.locator('[data-resend]').isDisabled(),true);
 const code=await page.locator('#verify-form code').textContent();
 if(wrong){await page.locator('#account-code').fill(code==='000000'?'111111':'000000');await page.getByRole('alert').filter({hasText:'does not match'}).waitFor();}
 if(refresh){await page.reload();await page.locator('#account-code').waitFor();}
 // Pasting six digits automatically submits once.
 await page.locator('#account-code').fill(code);
}
async function finish(page){
 await page.goto(origin+'/sunscreen');await page.locator('.hero .primary').click();
 const products=(await (await page.request.get(origin+'/api/experiment')).json()).experiment.products;
 for(let i=0;i<products.length;i++){
  await page.locator('[data-vote="yes"]').click();
  if(i<products.length-1)await page.locator('.game-position').filter({hasText:(i+2)+' of '+products.length}).waitFor();
 }
 await page.locator('#nomination-continue').click();await page.locator('[data-skip-attribution]').waitFor();
}
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await finish(page);
  assert.equal(await page.locator('#tester-email').count(),0,'pre-rankings entry uses the shared email flow');
  await page.getByRole('link',{name:'Continue with email',exact:true}).click();await page.locator('#account-email').waitFor();
  assert.equal(await page.locator('#signup-name').count(),0,'no name requested before verification');
  assert.equal(await noOverflow(page),true);
  await page.screenshot({path:`outputs/tester-attribution/email-${width}.png`,fullPage:true});
  await codeSignIn(page,`browser${width}@wharton.upenn.edu`,{refresh:true,wrong:true});
  await page.locator('#signup-name').waitFor();
  assert.equal(await page.locator('#signup-email').getAttribute('readonly'),'');
  assert.equal(await page.locator('.signup-preview [data-opinion]').count(),(await (await page.request.get(origin+'/api/experiment')).json()).experiment.products.length);
  await page.locator('#signup-name').fill('Browser Tester');
  await page.route('**/api/account/signup**',route=>route.fulfill({status:503,json:{error:'Temporary test failure'}}),{times:1});
  await page.locator('#signup-form [type=submit]').click();await page.locator('.account-error').waitFor();assert.equal(await page.locator('#signup-name').inputValue(),'Browser Tester');
  await page.locator('#signup-form [type=submit]').click();await page.locator('.profile-details h1').waitFor();
  assert.equal(await page.locator('.tester-badge').first().textContent(),'Wharton early tester');
  const me=await (await page.request.get(origin+'/api/account/me')).json();assert.equal(me.profile.emailVerified,true);assert.equal(me.profile.whartonEmailVerified,true);
  assert.equal(await noOverflow(page),true);
  await page.screenshot({path:`outputs/tester-attribution/profile-${width}.png`,fullPage:true});
  await page.locator('[data-name-visibility]').click();await page.locator('[name=showName]').uncheck();
  await page.locator('#profile-edit-form [type=submit]').click();await page.getByText('✓ Profile saved',{exact:true}).waitFor();
  await page.locator('.profile-editor [data-cancel]:visible').first().click();
  const observer=await browser.newContext(),product=await (await observer.request.get(origin+'/api/products/boj')).json();
  assert.ok(!product.contributors.some(c=>c.handle===me.profile.handle));assert.equal((await observer.request.get(origin+'/api/profiles/'+me.profile.handle)).status(),404);await observer.close();
  authTime+=61000;
  const returning=await browser.newContext(),returnPage=await returning.newPage();await returnPage.goto(origin+'/account?signin=1');
  await codeSignIn(returnPage,`browser${width}@wharton.upenn.edu`);await returnPage.locator('.profile-details h1').waitFor();
  assert.equal(await returnPage.locator('.profile-details h1').textContent(),'Browser Tester');assert.equal(await returnPage.locator('#signup-form').count(),0);
  assert.equal((await (await returnPage.request.get(origin+'/api/account/me')).json()).profile.handle,me.profile.handle);
  await returning.close();await context.close();
 }
 const skipContext=await browser.newContext({viewport:{width:320,height:760}}),skipPage=await skipContext.newPage();await finish(skipPage);await skipPage.locator('[data-skip-attribution]').click();await skipPage.locator('.board h1').waitFor();assert.equal((await (await skipPage.request.get(origin+'/api/account/me')).json()).authenticated,false);assert.equal(await noOverflow(skipPage),true);await skipContext.close();
 const emptyContext=await browser.newContext({viewport:{width:320,height:760}}),emptyPage=await emptyContext.newPage();await emptyPage.goto(origin+'/account');await emptyPage.locator('#account-email').waitFor();assert.equal(await noOverflow(emptyPage),true);await emptyPage.locator('.signup-skip').click();await emptyPage.waitForURL(origin+'/');assert.equal((await (await emptyPage.request.get(origin+'/api/account/me')).json()).profile,null);await emptyContext.close();
 assert.deepEqual(errors,[]);console.log('Browser checks passed: shared pre-rankings entry, email-first signup, code paste/auto-submit, wrong-code recovery, refresh, save retry, verified cohort, privacy, returning sign-in, optional signup and phone/desktop layouts.');
}finally{await browser.close();await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true})}
