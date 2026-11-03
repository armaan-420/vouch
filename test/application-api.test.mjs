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
