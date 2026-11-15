import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createFileStore} from '../lib/file-store.mjs';
import {initialRegistry} from '../lib/experiment-api.mjs';
import {categoryInventory,createDailySuggestions,dailyBatchStatus,easternDay} from '../lib/auto-experiments/daily-batches.mjs';
import {handleResearchMcp} from '../lib/auto-experiments/maintenance-mcp.mjs';
import {createSuggestions} from '../lib/auto-experiments/api.mjs';
import {createApplicationApi} from '../lib/application-api.mjs';
const env={EXPERIMENT_AUTO_BUILD:'on',OPENAI_API_KEY:'fixture-not-a-real-key'};
async function setup(t){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-batch-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));const store=await createFileStore(directory);return {store,directory,env,now:()=>Date.parse('2026-11-15T04:00:00Z')};}
const identity={'oai-authenticated-user-id':'organizer','oai-authenticated-user-email':'owner@example.com'};
const call=(name,args={},headers=identity)=>new Request('https://example.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
test('daily batch and jobs commit together, concurrent retries cannot exceed three',async t=>{
 const s=await setup(t);
 await Promise.all(Array.from({length:6},(_,i)=>createDailySuggestions({...s,categories:['Backpacks','Desk lamps','Electric kettles','Test category '+i]})));
 const batch=await dailyBatchStatus(s);assert.equal(batch.created,3);assert.equal(batch.remaining,0);assert.equal(batch.completedDrafts,0);assert.equal(batch.date,'2026-11-14');
 const data=await(await s.store.scope('suggestion-jobs')).read();assert.equal(Object.keys(data.jobs).length,3);
 for(const j of Object.values(data.jobs)){assert.equal(j.dailyBatchDate,batch.date);assert.equal(j.state,'queued');assert.equal(j.submissionSource,'automation');}
 const restarted=await createFileStore(s.directory);assert.equal((await dailyBatchStatus({...s,store:restarted})).created,3);
 const retry=await createDailySuggestions({...s,categories:['Other category']});assert.deepEqual(retry.createdKeys,[]);
 assert.deepEqual((await(await s.store.scope('category-suggestions',()=>({suggestions:{}}))).read()).suggestions,{});
});
test('partial batches fill only unused slots and skip historical, canonical and live duplicates',async t=>{
 const s=await setup(t),jobs=await s.store.scope('suggestion-jobs',()=>({jobs:{},budget:{}}));
 await jobs.transaction(d=>{d.jobs.old={key:'old',category:'Travel packs',canonicalKey:'backpacks',state:'deleted',research:{canonicalCategory:'Backpacks'},note:'private note',submittedBy:'private person'};});
 const first=await createDailySuggestions({...s,categories:['Sunscreens','Backpacks','Desk lamps']});assert.equal(first.created,1);assert.equal(first.skipped.length,2);
 const second=await createDailySuggestions({...s,categories:['Desk lamp','Electric kettles','Coffee grinders','Air purifiers']});assert.equal(second.created,3);assert.equal(second.createdKeys.length,2);
 const inventory=JSON.stringify(await categoryInventory(s));assert.ok(!inventory.includes('private note'));assert.ok(!inventory.includes('private person'));
 const list=await categoryInventory(s);assert.ok(list.categories.some(c=>c.status==='deleted'));
});
test('Eastern midnight and DST control batch dates independently of UTC',async t=>{
 assert.equal(easternDay(Date.parse('2026-03-08T06:30:00Z')),'2026-03-08');assert.equal(easternDay(Date.parse('2026-11-01T06:30:00Z')),'2026-11-01');
 const s=await setup(t);await createDailySuggestions({...s,categories:['Backpacks','Desk lamps','Coffee grinders']});
 const next={...s,now:()=>Date.parse('2026-11-15T05:00:00Z')};assert.equal((await dailyBatchStatus(next)).created,0);
 const batch=await createDailySuggestions({...next,categories:['Electric kettles','Air purifiers','Blenders']});assert.equal(batch.date,'2026-11-15');assert.equal(batch.created,3);
 assert.equal((await dailyBatchStatus({...next,date:'2026-11-14'})).created,3);
});
test('bad candidates, missing configuration and invalid dates do not create jobs',async t=>{
 const s=await setup(t);
 for(const categories of [[],['Backpacks','guns'],[123],['a'],Array(13).fill('Backpacks')])await assert.rejects(createDailySuggestions({...s,categories}));
 await assert.rejects(createDailySuggestions({...s,env:{},categories:['Backpacks']}),/configured/);
 for(const date of ['yesterday','2026-02-30','9999-99-99'])await assert.rejects(dailyBatchStatus({...s,date}));
 assert.equal((await dailyBatchStatus(s)).created,0);
});
test('all new MCP tools require organizer identity and reject unexpected arguments',async t=>{
 const s=await setup(t),options={...s,adminEmails:'owner@example.com',run:async()=>({ok:true})};
 for(const name of ['vouch_create_daily_suggestions','vouch_category_inventory','vouch_daily_batch_status']){
  assert.equal((await handleResearchMcp(call(name,{},{}),options)).status,403);
  assert.equal((await handleResearchMcp(call(name,{}, {'oai-authenticated-user-email':'owner@example.com'}),options)).status,403);
  const bad=await(await handleResearchMcp(call(name,{approve:true}),options)).json();assert.equal(bad.result.isError,true);
 }
 let kicked=0;const pending=[];
 const result=await(await handleResearchMcp(call('vouch_create_daily_suggestions',{categories:['Backpacks','Desk lamps','Electric kettles']}),{...options,run:async()=>{kicked++;},waitUntil:p=>pending.push(p)})).json();
 assert.equal(JSON.parse(result.result.content[0].text).created,3);await Promise.all(pending);assert.equal(kicked,1);
 const status=await(await handleResearchMcp(call('vouch_daily_batch_status'),options)).json();assert.equal(JSON.parse(status.result.content[0].text).created,3);
});
test('daily jobs use existing research, remain private, and report paused and failed work',async t=>{
 const s=await setup(t);await createDailySuggestions({...s,categories:['Backpacks','Desk lamps','Electric kettles']});
 const search={search:async()=>({products:[]}),find:async()=>null};
 const auto=createSuggestions({store:s.store,search,development:true,now:s.now});
 for(let i=0;i<40;i++)await auto.advance();
 const batch=await dailyBatchStatus(s);assert.equal(batch.completedDrafts,3);assert.ok(batch.suggestions.every(j=>j.privateDraft&&j.productCount===10));
 const api=createApplicationApi({store:s.store,search,autoOptions:{development:true}});
 const registry=await(await s.store.scope('experiment-registry',initialRegistry)).read();
 for(const draft of Object.values(registry.experiments).filter(e=>e.status==='draft'))assert.equal((await api(new Request('http://localhost/api/experiment?experiment='+draft.id))).status,404);
 const jobs=await s.store.scope('suggestion-jobs');await jobs.transaction(d=>{d.jobs.backpack.paused=true;d.jobs['desk lamp'].state='failed';d.jobs['desk lamp'].failureCode='provider_http';});
 const status=await dailyBatchStatus(s);assert.equal(status.suggestions.find(j=>j.key==='backpack').paused,true);assert.equal(status.suggestions.find(j=>j.key==='desk lamp').failureCode,'provider_http');
 assert.equal((await createDailySuggestions({...s,categories:['Blenders']})).createdKeys.length,0);
});
