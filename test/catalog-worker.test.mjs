import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Miniflare} from 'miniflare';

test('provider requests work in the Cloudflare runtime and refuse redirects without forwarding credentials',async t=>{
 const source=await fs.readFile(new URL('../lib/catalog/providers/request.mjs',import.meta.url),'utf8');
 let calls=0,redirect=false;
 const worker=new Miniflare({modules:true,compatibilityDate:'2026-05-15',
  script:source+`\nexport default {async fetch(){return Response.json(await providerRequest(fetch,'https://provider.example/search',{headers:{'x-api-key':'fixture-only'}}));}};`,
  outboundService:async request=>{calls++;assert.equal(request.url,'https://provider.example/search');assert.equal(request.headers.get('x-api-key'),'fixture-only');return redirect?new Response(null,{status:302,headers:{location:'https://other.example/'}}):Response.json({products:[]});},
 });
 t.after(()=>worker.dispose());
 assert.equal((await(await worker.dispatchFetch('https://worker.example/')).json()).status,'ok');
 redirect=true;
 const rejected=await(await worker.dispatchFetch('https://worker.example/')).json();
 assert.equal(rejected.status,'error');assert.equal(rejected.httpStatus,302);assert.equal(calls,2);
});
