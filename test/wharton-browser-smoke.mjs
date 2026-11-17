import assert from 'node:assert/strict';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true});
try{
 const reference=await browser.newPage();await reference.goto(new URL('../../VOUCH_INLINE_NOTE_MOCKUP.html',import.meta.url).href);await reference.screenshot({path:'/tmp/wharton-inline-note-reference.png',fullPage:true});await reference.close();
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4196/wharton');await page.locator('#wharton-email').waitFor();
  await page.screenshot({path:`/tmp/wharton-landing-${width}.png`,fullPage:true});
  await page.locator('#wharton-name').fill('Local Tester');await page.locator('#wharton-email').fill(`test-${width}-${Date.now()}@wharton.upenn.edu`);
  const hero=await page.locator('#wharton-app h1').textContent();await page.locator('#wharton-join button').click();await page.locator('#wharton-code').waitFor();assert.equal(await page.locator('#wharton-app h1').textContent(),hero);assert.equal(await page.locator('.wharton-story').isVisible(),true);
  await page.locator('#wharton-code').fill('000000');await page.locator('#wharton-verify button').click();
  // A synthetic wrong attempt must be recoverable (unless the random code is 000000).
  if(await page.locator('code').count()){
   const code=await page.locator('code').textContent();await page.locator('#wharton-code').fill(code);await page.locator('#wharton-verify button').click();
  }
  await page.locator('.wharton-category[href]').first().waitFor();
  assert.equal(await page.locator('.wharton-category').count(),3);
  assert.equal(await page.locator('.wharton-story').isVisible(),false);
  await page.screenshot({path:`/tmp/wharton-categories-${width}.png`,fullPage:true});
  await page.locator('.wharton-category[href]').filter({hasText:'Water bottles'}).click();
  await page.locator('[data-vote=yes]').waitFor();await page.locator('.experiment-tags[aria-busy=false]').waitFor();
  await page.screenshot({path:`/tmp/wharton-note-resting-${width}.png`,fullPage:true});await page.locator('#rating-comment').focus();await page.locator('#rating-comment').fill('Reliable for my commute.');
  if(width===390){assert.ok((await page.locator('.product-photo').boundingBox()).height<=64);await page.locator('#rating-comment').fill('line\n'.repeat(48));assert.ok(await page.locator('#rating-comment').evaluate(el=>el.getBoundingClientRect().height<=88));await page.locator('#rating-comment').fill('Reliable for my commute.');}
  assert.equal(await page.locator('.product-card').evaluate(el=>el.classList.contains('is-noting')),width<=760);
  await page.waitForTimeout(250);await page.screenshot({path:`/tmp/wharton-rating-${width}.png`,fullPage:true});
  if(width===390){await page.setViewportSize({width,height:500});await page.locator('#rating-comment').focus();await page.screenshot({path:'/tmp/wharton-note-keyboard.png',fullPage:true});const box=await page.locator('[data-vote=yes]').boundingBox();assert.ok(box.y+box.height<=500,'vote above simulated keyboard');await page.setViewportSize({width,height:844});}

  await page.locator('[data-vote=yes]').click();await page.waitForTimeout(200);
  await page.goto(new URL(page.url()).origin+new URL(page.url()).pathname+'?start=1&wharton=1');await page.locator('[data-vote=yes]').waitFor();await page.locator('.experiment-tags[aria-busy=false]').waitFor();
  assert.equal(await page.locator('#rating-comment').inputValue(),'Reliable for my commute.');
  assert.ok(await page.locator('#saved-verdict').count());
  await page.locator('#rating-comment').focus();await page.keyboard.press('Tab');assert.equal(await page.locator('[data-vote=no]').evaluate(el=>el===document.activeElement),true);
  const firstId=(await (await page.request.get('http://127.0.0.1:4196/api/experiment?experiment=waterbottle')).json()).experiment.products[0].id;
  await page.locator('[data-vote=skip]').click();await page.waitForTimeout(100);assert.equal((await (await page.request.get('http://127.0.0.1:4196/api/me?experiment=waterbottle')).json()).comments[firstId],'');
  await page.goto(new URL(page.url()).origin+'/waterbottle?start=1&wharton=1');await page.locator('.experiment-tags[aria-busy=false]').waitFor();await page.locator('#rating-comment').fill('Reliable for my commute.');await page.locator('[data-vote=yes]').click();await page.waitForTimeout(100);

  const url=new URL(page.url());url.search='?board=1&wharton=1';await page.goto(url.href);
  await page.locator('.board-people-link').first().waitFor();const row=page.locator('.rank-row').filter({has:page.locator('.board-people-link')}).first();const face=await row.locator('.board-person').first().boundingBox(),photo=await row.locator('.rank-image-link').boundingBox();assert.ok(Math.abs(face.x-photo.x)<2,'people aligned to product image');assert.equal(await page.getByText('No named vouches yet',{exact:true}).count(),0);assert.equal(await page.locator('.board-product-tags').count(),0);
  await page.screenshot({path:`/tmp/wharton-board-${width}.png`,fullPage:true});
  await page.locator('.board-people-link').first().click();await page.locator('.endorser-comment').first().waitFor();assert.match(await page.locator('.endorser-comment').first().textContent(),/Reliable/);
  await page.screenshot({path:`/tmp/wharton-people-${width}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.locator('.endorser-row a:visible').first().click();await page.locator('.profile-layout').waitFor();
  console.log('PASS',width,'signup → verification → categories → tags/comment/vote → reload → Board → people → profile');await context.close();
 }
}finally{await browser.close()}
