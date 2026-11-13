import test from 'node:test';
import assert from 'node:assert/strict';
import {handleResearchMcp} from '../lib/auto-experiments/maintenance-mcp.mjs';
import {captureGoogleResults} from '../lib/auto-experiments/google-results.mjs';
const request=(method,identity={})=>new Request('https://example.com/mcp',{method:'POST',headers:{'Content-Type':'application/json',...identity},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:{name:'vouch_process_research',arguments:{}}})});
test('maintenance discovery is public but queue execution requires a verified allowlisted organizer',async()=>{
 let calls=0;const options={adminEmails:'owner@example.com',run:async()=>{calls++;return {ok:true,active:0};}};
 assert.equal((await handleResearchMcp(request('tools/list'),options)).status,200);
 assert.equal((await handleResearchMcp(request('tools/call'),options)).status,403);
 assert.equal((await handleResearchMcp(request('tools/call',{'oai-authenticated-user-email':'owner@example.com'}),options)).status,403);
 assert.equal((await handleResearchMcp(request('tools/call',{'oai-authenticated-user-id':'user','oai-authenticated-user-email':'other@example.com'}),options)).status,403);
 assert.equal((await handleResearchMcp(request('tools/call',{'oai-authenticated-user-id':'user','oai-authenticated-user-email':'OWNER@example.com'}),options)).status,200);assert.equal(calls,1);
});
test('missing Google credentials is an explicit gap and performs no external request',async()=>{
 let calls=0;const r=await captureGoogleResults({category:'Backpacks',scope:'everyday backpacks',fetcher:async()=>{calls++;}});assert.equal(r.status,'not_configured');assert.equal(calls,0);assert.deepEqual(r.captures,[]);
});
test('Google positions come only from returned organic results with region/query/time provenance',async()=>{
 const r=await captureGoogleResults({category:'Backpacks',scope:'everyday backpacks',apiKey:'test-key',now:()=>0,fetcher:async url=>{assert.match(url,/serpapi.com/);return Response.json({organic_results:[{position:2,link:'https://review.example/best',title:'Best picks'},{position:1,link:'http://localhost/private',title:'Invalid'}]});}});
 assert.equal(r.status,'captured');assert.equal(r.captures.length,2);assert.deepEqual(r.captures[0].results,[{position:2,url:'https://review.example/best',title:'Best picks'}]);assert.equal(r.captures[0].region,'US');assert.equal(r.captures[0].capturedAt,'1970-01-01T00:00:00.000Z');
});
