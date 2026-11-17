import assert from 'node:assert/strict';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:4196';
try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/waterbottle?board=1');await page.locator('.board-category-invite a').waitFor();assert.equal(await page.locator('.board-category-chip').count(),3);assert.match(await page.locator('.board-category-invite').textContent(),/Tried any/);assert.equal(await page.locator('.board-category-chip.is-upcoming').getAttribute('aria-disabled'),'true');
 const products=(await (await page.request.get(origin+'/api/experiment?experiment=waterbottle')).json()).experiment.products;
 const answer=async(productId,value)=>{const r=await page.request.post(origin+'/api/events?experiment=waterbottle',{headers:{origin},data:{type:'answer',productId,value}});assert.equal(r.status(),200)};
 await answer(products[0].id,'yes');await answer(products[1].id,'skip');await page.reload();await page.getByRole('link',{name:'Continue vouching'}).waitFor();await page.getByRole('link',{name:'Continue vouching'}).click();await page.locator('#voting-product-title').waitFor();assert.equal(await page.locator('#voting-product-title').textContent(),products[2].name);
 for(const p of products.slice(2))await answer(p.id,'skip');
 await page.goto(origin+'/waterbottle?board=1');await page.locator('.board-category-switcher[aria-busy=false]').waitFor();assert.equal(await page.locator('.board-category-invite').count(),0);assert.match(await page.locator('.board-category-chip[aria-current]').textContent(),/✓/);
 const row=page.locator('.rank-row').first();for(const selector of ['.rank','.score-summary']){const bounds=await row.locator(selector).boundingBox(),r=await row.boundingBox();assert.ok(Math.abs(bounds.y+bounds.height/2-r.y-r.height/2)<2,'centered '+selector);}
 await page.waitForTimeout(300);await page.screenshot({path:`/tmp/board-categories-complete-${width}.png`,fullPage:true});
 await page.locator('.board-category-chip').filter({hasText:'Lip balm'}).click();await page.locator('.board-category-invite').waitFor();assert.match(await page.locator('.board-category-invite').textContent(),/Vouch for lip balm/);assert.equal(await page.locator('.board-category-chip[aria-current]').textContent(),'Lip balm');await page.screenshot({path:`/tmp/board-categories-new-${width}.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS Board categories',width,'new/partial/complete, skip, first-unanswered resume, switching and row centering');await context.close();
}}finally{await browser.close()}
