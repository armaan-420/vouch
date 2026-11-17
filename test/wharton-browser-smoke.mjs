import assert from 'node:assert/strict';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4196/wharton');await page.locator('#wharton-email').waitFor();
  await page.screenshot({path:`/tmp/wharton-landing-${width}.png`,fullPage:true});
  await page.locator('#wharton-name').fill('Local Tester');await page.locator('#wharton-email').fill(`test-${width}-${Date.now()}@wharton.upenn.edu`);
  await page.locator('#wharton-join button').click();await page.locator('#wharton-code').waitFor();
  await page.locator('#wharton-code').fill('000000');await page.locator('#wharton-verify button').click();
  // A synthetic wrong attempt must be recoverable (unless the random code is 000000).
  if(await page.locator('code').count()){
   const code=await page.locator('code').textContent();await page.locator('#wharton-code').fill(code);await page.locator('#wharton-verify button').click();
  }
  await page.getByRole('button',{name:'Choose my first category'}).waitFor();await page.getByRole('button',{name:'Choose my first category'}).click();
  await page.locator('.category-start').first().waitFor();
  await page.screenshot({path:`/tmp/wharton-categories-${width}.png`,fullPage:true});
  const bottle=page.locator('.category-card').filter({hasText:/water bottle/i});
  await (await bottle.count()?bottle:page.locator('.category-card').first()).locator('.category-start').click();
  await page.locator('[data-vote=yes]').waitFor();await page.locator('.experiment-tags[aria-busy=false]').waitFor();
  await page.locator('.rating-comment summary').click();await page.locator('#rating-comment').fill('Reliable for my commute.');
  await page.screenshot({path:`/tmp/wharton-rating-${width}.png`,fullPage:true});
  await page.locator('[data-vote=yes]').click();await page.waitForTimeout(200);
  await page.goto(new URL(page.url()).origin+new URL(page.url()).pathname+'?start=1&wharton=1');await page.locator('[data-vote=yes]').waitFor();await page.locator('.experiment-tags[aria-busy=false]').waitFor();
  assert.equal(await page.locator('#rating-comment').inputValue(),'Reliable for my commute.');
  const url=new URL(page.url());url.search='?board=1&wharton=1';await page.goto(url.href);
  await page.locator('.board-people-link').first().waitFor();assert.equal(await page.locator('.board-product-tags').count(),0);
  await page.screenshot({path:`/tmp/wharton-board-${width}.png`,fullPage:true});
  await page.locator('.board-people-link').first().click();await page.locator('.endorser-comment').first().waitFor();assert.match(await page.locator('.endorser-comment').first().textContent(),/Reliable/);
  await page.screenshot({path:`/tmp/wharton-people-${width}.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.locator('.endorser-row a').last().click();await page.locator('.profile-layout').waitFor();
  console.log('PASS',width,'signup → verification → categories → tags/comment/vote → reload → Board → people → profile');await context.close();
 }
}finally{await browser.close()}
