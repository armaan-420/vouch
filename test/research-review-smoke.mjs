// Synthetic browser check: no production writes, external research, or email.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createVouchServer} from '../server.mjs';
import {fakeResearch} from '../lib/auto-experiments/research.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=path.resolve('.data/research-review-smoke-'+Date.now());
const research=fakeResearch('backpacks');research.picks=research.picks.slice(0,5);research.evidence=[];delete research.picks[4].verifiedSourceUrls;
const products=research.picks.map((p,i)=>({id:'c3-review-'+i,provider:'channel3',providerId:'review-'+i,brand:p.brand,name:p.productName,image:'https://example.com/photo.jpg'}));
const server=await createVouchServer({directory,productSearch:{search:async()=>({products}),find:async id=>products.find(p=>p.id===id),refresh:async()=>{}},autoOptions:{env:{EXPERIMENT_AUTO_BUILD:'on'},research:{fake:true,start:async()=>({result:research})}}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const post=async(route,body)=>{const response=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.ok,true);return response.json();};
let browser;
try{
 await post('/api/suggestions',{category:'backpacks'});for(let i=0;i<7;i++)await post('/api/admin/suggestions/run',{});
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://example.com/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#ddd"/></svg>'}));
 await page.goto(origin+'/admin#suggestions-panel/backpack');await page.getByRole('heading',{name:'Backpacks',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Approve Edit',exact:true}).isDisabled(),false);
 assert.match(await page.locator('.review-progress').innerText(),/4\s*\/ 5 products sourced/);
 await page.getByRole('tab',{name:'Research & sources',exact:true}).click();
 assert.match(await page.locator('#review-pane-research').innerText(),/Source gaps are advisory/);
 await page.getByText('Record a source you have checked',{exact:true}).click();
 const form=page.locator('[data-evidence]');await form.locator('[name=channel]').selectOption('editorial');await form.locator('[name=productId]').selectOption(products[4].id);
 await form.locator('[name=url]').fill('https://example.com/review');await form.locator('[name=query]').fill('best backpacks');await form.locator('[name=note]').fill('Synthetic fixture: exact model checked.');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'Save checked research'}).click();
 await page.getByRole('button',{name:'Approve Edit',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('[data-action=approve]').disabled);
 assert.match(await page.locator('.review-progress').innerText(),/5\s*\/ 5 products sourced/);
 await fs.mkdir('outputs',{recursive:true});await page.screenshot({path:'outputs/research-review-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/research-review-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('Browser review passed: five products, advisory product-source gap, checked editorial source, source-gap approval, desktop and mobile.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}
