import test from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationApi} from '../lib/application-api.mjs';

test('streamed oversized voting bodies are rejected before profile inspection or experiment writes',async()=>{
 let writes=0;const rows=new Map();
 const store={scope(key,initial){if(!rows.has(key))rows.set(key,initial());return {read:async()=>structuredClone(rows.get(key)),transaction:async fn=>{writes++;return fn(rows.get(key))}}}};
 const api=createApplicationApi({store,search:{},authorizeAdmin:()=>false});
 for(const path of ['/api/events','/api/community/vote']){
  let cancelled=false;
  const body=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('x'.repeat(9000)))},cancel(){cancelled=true}});
  const request=new Request('http://127.0.0.1'+path,{method:'POST',body,duplex:'half'});
  const response=await api(request);assert.equal(response.status,413);assert.equal(cancelled,true);assert.equal(writes,0);
 }
});

test('bounded JSON is parsed once and reuse still enforces a tighter byte limit',async()=>{
 const {readJson}=await import('../lib/request-json.mjs');
 const request=new Request('http://127.0.0.1/api/events',{method:'POST',body:JSON.stringify({type:'answer',productId:'boj',value:'yes'})});
 const [first,second]=await Promise.all([readJson(request),readJson(request)]);
 assert.deepEqual(first,second);assert.equal(request.bodyUsed,true);
 await assert.rejects(readJson(request,8),error=>error.status===413);
});

test('profile sync failure is visible and retrying the same vote recovers without a duplicate vote',async t=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');const {createFileStore}=await import('../lib/file-store.mjs');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-sync-failure-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));const base=await createFileStore(directory);let failAccounts=false;
 const store={...base,scope:async(key,initial)=>{const scoped=await base.scope(key,initial);return key==='accounts-v1'?{...scoped,transaction:fn=>{if(failAccounts)throw Error('Temporary profile storage outage');return scoped.transaction(fn)}}:scoped}};
 const api=createApplicationApi({store,search:{find:async()=>null,search:async()=>({products:[]})},authorizeAdmin:()=>false,authOptions:{previewDelivery:true}}),cookies=new Map();
 async function call(path,payload){const r=await api(new Request('http://127.0.0.1'+path,{method:payload?'POST':'GET',headers:{origin:'http://127.0.0.1',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined}));for(const c of r.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');cookies.set(k,v)}return {status:r.status,data:await r.json()};}
 const start=await call('/api/auth/start',{email:'sync-test@example.test'});await call('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode});
 failAccounts=true;const failed=await call('/api/events',{type:'answer',productId:'boj',value:'yes'});assert.equal(failed.status,503);assert.equal(failed.data.experimentSaved,true);assert.match(failed.data.error,/collection could not be updated/);
 failAccounts=false;const retried=await call('/api/events',{type:'answer',productId:'boj',value:'yes'});assert.equal(retried.status,200);assert.equal(retried.data.profileSync,'saved');
 const profile=(await call('/api/account/me')).data.profile;assert.equal(profile.opinions.length,1);assert.equal(profile.opinions[0].verdict,'yes');const saved=await base.read();assert.equal(Object.keys(saved.baseVotes.boj).length,1);
});
