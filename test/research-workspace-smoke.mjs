// Local synthetic browser verification. No production writes or paid research.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createVouchServer} from '../server.mjs';
import {createResearch,fakeResearch} from '../lib/auto-experiments/research.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=path.resolve('.data/research-workspace-smoke-'+Date.now()),env={EXPERIMENT_AUTO_BUILD:'on',EXPERIMENT_RESEARCH_PROVIDER:'fake',EXPERIMENT_RESEARCH_WORKSPACE:'on'};
const research=createResearch({env,development:true}),start=research.startSource;
research.startSource=async(category,task,w,key)=>{if(task.id==='tiktok')return {result:{allowed:true,status:'inaccessible',queries:['LOCAL FIXTURE TikTok'],notes:'LOCAL FIXTURE: direct content inaccessible.',candidates:[],evidence:[]}};const r=await start(category,task,w,key);r.result.candidates=r.result.candidates.slice(0,6);r.result.evidence=r.result.evidence.slice(0,6);return r;};
const products=fakeResearch('backpacks').picks.slice(0,6).map((p,i)=>({id:'c3-workspace-'+i,provider:'channel3',providerId:'workspace-'+i,brand:p.brand,name:p.productName,image:'https://example.com/photo.jpg'})),find=async id=>products.find(p=>p.id===id);
const server=await createVouchServer({directory,productSearch:{search:async()=>({products}),find,findCached:find,refresh:async()=>{}},autoOptions:{env,research}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const post=async(route,body)=>{const r=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.ok,true,await r.clone().text());return r.json();};
let browser;
try{
 await post('/api/suggestions',{category:'backpacks'});for(let i=0;i<40;i++)await post('/api/admin/suggestions/run',{});
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
 await page.route('https://example.com/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" rx="20" fill="#d8c7ae"/></svg>'}));
 await page.goto(origin+'/admin#suggestions-panel/backpack');await page.getByRole('heading',{name:'Research workspace',exact:true}).waitFor();
 assert.equal(await page.locator('[data-source-task]').count(),5);assert.match(await page.locator('[data-source-task=tiktok]').innerText(),/Inaccessible/);
 assert.equal(await page.getByRole('button',{name:'Approve Edit',exact:true}).isEnabled(),true);
 await fs.mkdir('outputs',{recursive:true});await page.screenshot({path:'outputs/research-workspace-desktop.png',fullPage:true});
 await page.getByRole('tab',{name:'Research & sources',exact:true}).click();await page.getByRole('heading',{name:'Evidence & candidate comparison',exact:true}).waitFor();
 const candidate=page.locator('.research-candidate').first();await candidate.getByRole('button',{name:'Pin candidate',exact:true}).click();await page.getByRole('button',{name:'Unpin',exact:true}).waitFor();
 await page.locator('[data-source-task=tiktok]').getByRole('button',{name:'Retry this source',exact:true}).click();
 for(let i=0;i<10;i++)await post('/api/admin/suggestions/run',{});
 await page.reload();await page.getByRole('heading',{name:'Research workspace',exact:true}).waitFor();
 await page.getByRole('tab',{name:'Research & sources',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Unpin',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Approve Edit',exact:true}).isEnabled(),true);
 const before=(await(await fetch(origin+'/api/admin/suggestions')).json()).jobs[0];assert.equal(before.draft.products.length,6);assert.equal(before.workspace.tasks.find(t=>t.id==='tiktok').attempts,2);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'outputs/research-workspace-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('Research workspace browser smoke passed: five source tasks, inaccessible-source warning, source-gap approval, pin persistence, targeted retry, desktop/mobile and no browser errors.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});}
