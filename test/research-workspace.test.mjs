import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createSuggestions} from '../lib/auto-experiments/api.mjs';
import {createResearch,researchCoverage} from '../lib/auto-experiments/research.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {createWorkspace,proposeLineup,workspaceQuality,candidateKey} from '../lib/auto-experiments/workspace.mjs';
import {normalizeSourceResult,applyEvidenceChecks} from '../lib/auto-experiments/source-research.mjs';

const req=(action,body,admin=true)=>new Request('http://localhost/api/admin/suggestions'+action,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(admin?{'x-admin':'yes'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const candidates=Array.from({length:6},(_,i)=>({brand:'Brand '+i,productName:'Model '+i,variantHint:null,reason:'Suitable candidate '+i,sourceUrls:['https://maker.example/product-'+i]}));
const result=(id='editorial')=>({allowed:true,rejectReason:null,status:id==='tiktok'?'inaccessible':'complete',queries:['best practical products'],notes:id==='tiktok'?'Original content could not be retrieved.':'Checked source task.',candidates:id==='tiktok'?[]:candidates,evidence:[]});
async function setup(t,overrides={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-workspace-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const store=await createFileStore(dir);let time=Date.now();const calls=[];
 const research={staged:true,fake:false,configured:true,startSource:async(category,task,w,key)=>{calls.push({id:task.id,key});return {result:result(task.id)};},pollSource:async()=>{throw Error('No pending response');},startCheck:async()=>({result:{checks:[]}}),...overrides};
 const auto=createSuggestions({store,search:{search:async()=>({products:[]}),find:async()=>null},research,env:{EXPERIMENT_AUTO_BUILD:'on'},authorizeAdmin:r=>r.headers.get('x-admin')==='yes',now:()=>time});
 await auto.handle(new Request('http://localhost/api/suggestions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:'Backpacks'})}));
 const list=async()=> (await(await auto.handle(req(''))).json()).jobs[0];
 const run=async(count=25)=>{for(let i=0;i<count;i++){time+=60000;await auto.advance();}return list();};
 return {store,auto,list,run,calls,advanceTime:()=>{time+=60000;}};
}

test('every requested source is attempted; inaccessible coverage never fails a private draft',async t=>{
 const s=await setup(t),j=await s.run();assert.deepEqual(s.calls.map(c=>c.id),['editorial','wirecutter','google','tiktok','manufacturer']);
 assert.equal(j.draft.status,'draft');assert.equal(j.draft.products.length,6);assert.equal(j.workspace.tasks[3].status,'inaccessible');assert.equal(j.state,'needs_attention');assert.equal(j.readiness.quality.advisory,true);assert.equal(j.readiness.quality.recommendationCount,0);
});
test('source-only gaps allow approval once product count and photos are ready',async t=>{
 const s=await setup(t),j=await s.run();
 const products=j.draft.products.map(p=>({...p,image:'https://images.example/photo.jpg'}));
 assert.equal((await s.auto.handle(req('/edit',{key:j.key,id:j.draft.id,title:'My draft',category:j.draft.category,customProducts:products,productIds:[]}))).status,200);
 assert.equal((await s.list()).readiness.canApprove,true);assert.equal((await s.list()).readiness.coverage.complete,false);
 assert.equal((await s.auto.handle(req('/approve',{key:j.key}))).status,200);
});
test('a source retry preserves draft identity, title, photos, order and unrelated successful evidence',async t=>{
 const s=await setup(t),j=await s.run();
 const products=[...j.draft.products].reverse().map(p=>({...p,image:'https://images.example/custom.jpg'}));
 await s.auto.handle(req('/edit',{key:j.key,id:j.draft.id,title:'Organizer title',category:j.draft.category,customProducts:products,productIds:[]}));
 const count=s.calls.length;assert.equal((await s.auto.handle(req('/retry-source',{key:j.key,source:'tiktok'}))).status,200);
 const after=await s.run(8);assert.deepEqual(s.calls.slice(count).map(c=>c.id),['tiktok']);assert.deepEqual(after.draft.products,products);assert.equal(after.draft.title,'Organizer title');
 assert.equal(after.workspace.tasks[0].attempts,1);assert.equal(after.workspace.tasks[3].attempts,2);
});
test('pausing stops processing and resume continues the same saved tasks',async t=>{
 const s=await setup(t);await s.run(1);const j=await s.list();await s.auto.handle(req('/pause-research',{key:j.key}));const count=s.calls.length;await s.run(3);assert.equal(s.calls.length,count);assert.equal((await s.list()).progress.label,'Research paused');
 await s.auto.handle(req('/continue-research',{key:j.key}));assert.equal((await s.run()).draft.status,'draft');
});
test('failed source requests reuse an idempotency key and other tasks still complete',async t=>{
 const seen=[];const s=await setup(t,{startSource:async(category,task,w,key)=>{if(task.id==='wirecutter'){seen.push(key);throw new TypeError('Transient failure');}return {result:result(task.id)};}});
 const j=await s.run(30);assert.equal(new Set(seen).size,1);assert.equal(seen.length,3);assert.equal(j.workspace.tasks[1].status,'failed');assert.equal(j.draft.status,'draft');
});
test('partial lineups below five remain drafts for review instead of failing source criteria',async t=>{
 const s=await setup(t,{startSource:async()=>({result:{...result(),candidates:candidates.slice(0,3)}})}),j=await s.run();assert.equal(j.draft.status,'draft');assert.equal(j.draft.products.length,3);assert.equal(j.readiness.canApprove,false);
});
test('no retrieved candidates stays actionable without inventing a lineup',async t=>{
 const s=await setup(t,{startSource:async()=>({result:{...result(),status:'inaccessible',candidates:[]}})}),j=await s.run();assert.equal(j.state,'needs_attention');assert.equal(j.draft,null);assert.match(j.lastError,/No suitable products/);
});
test('pin and exclusion affect the proposal only until the organizer applies it',async t=>{
 const s=await setup(t),j=await s.run();const chosen=j.workspace.candidates[1];
 await s.auto.handle(req('/candidate-exclude',{key:j.key,candidate:chosen.key,enabled:true}));assert.equal((await s.list()).draft.products.length,6);
 const pinned=j.workspace.candidates[4];await s.auto.handle(req('/candidate-pin',{key:j.key,candidate:pinned.key,enabled:true}));
 await s.auto.handle(req('/apply-proposal',{key:j.key}));const after=await s.run(10);assert.equal(after.draft.products.length,5);assert.equal(after.draft.products[0].brand,pinned.brand);assert.equal(after.draft.products.some(p=>p.brand===chosen.brand),false);
});
test('workspace actions and metrics require organizer access',async t=>{
 const s=await setup(t),j=await s.run();for(const action of ['retry-source','candidate-exclude','research-plan','pause-research','add-source'])assert.equal((await s.auto.handle(req('/'+action,{key:j.key},false))).status,401);
 assert.equal((await s.auto.handle(req('/metrics',null,false))).status,401);const metrics=await(await s.auto.handle(req('/metrics'))).json();assert.equal(metrics.jobs[0].metrics.sourceTasks,5);assert.doesNotMatch(JSON.stringify(metrics),/submittedBy|entries|visitor/);
});
test('a discovered link alone never becomes an AI content check',()=>{
 const w=createWorkspace('Backpacks'),task=w.tasks[0],e={brand:'A Brand',productName:'Exact Model',url:'https://review.example/model',role:'recommendation',claim:'Recommended for everyday use',passage:'A short supporting passage',query:'best backpack',publishedAt:null};
 const r=normalizeSourceResult({result:{...result(),candidates:[{...candidates[0],brand:e.brand,productName:e.productName}],evidence:[e]},consultedUrls:[e.url],openedUrls:[]},task);assert.equal(r.evidence[0].discovered,true);assert.equal(r.evidence[0].opened,false);
 w.evidence=[{...r.evidence[0],id:'source-1'}];applyEvidenceChecks(w,{result:{checks:[{id:'source-1',status:'supported',passage:e.passage,explanation:'Supports exact model.'}]},consultedUrls:[e.url],openedUrls:[]});assert.equal(w.evidence[0].check.status,'needs_review');
});
test('exact-model failures and TikTok-only links do not satisfy the new evidence quality indicator',()=>{
 const w=createWorkspace('Backpacks');w.candidates=candidates.map(p=>({...p,key:candidateKey(p),channels:['tiktok']}));w.evidence=candidates.map((p,i)=>({...p,id:String(i),url:'https://www.tiktok.com/@demo/video/'+i,channel:'tiktok',role:'social',check:{status:'supported'},query:'best backpacks',note:'A social mention',verified:true}));
 const r=proposeLineup(w,'Backpacks');assert.equal(workspaceQuality(r).recommendationCount,0);assert.equal(researchCoverage(r).supportedCount,0);
});
test('source adapter uses dedicated domain filtering and independent verification requests',async()=>{
 const bodies=[];const provider=createResearch({env:{OPENAI_API_KEY:'test'},fetcher:async(url,options)=>{bodies.push(JSON.parse(options.body));return Response.json({id:'response-1',status:'in_progress'});}}),w=createWorkspace('Backpacks');
 await provider.startSource('Backpacks',w.tasks[1],w,'key');assert.deepEqual(bodies[0].tools[0].filters.allowed_domains,['nytimes.com','thewirecutter.com']);assert.match(bodies[0].instructions,/Explicitly search Wirecutter/);
 await provider.startSource('Backpacks',w.tasks[3],w,'key2');assert.deepEqual(bodies[1].tools[0].filters.allowed_domains,['tiktok.com']);
});
