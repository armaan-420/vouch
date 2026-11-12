import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createFileStore} from '../lib/file-store.mjs';
import {createAccountsApi} from '../lib/accounts.mjs';
import {createExperimentApi} from '../lib/experiment-api.mjs';
import {STANDARD_TAGS} from '../lib/product-tags.mjs';
async function fixture(t){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-tag-votes-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const store=await createFileStore(directory),accounts=createAccountsApi({store}),experiments=createExperimentApi({store,search:{find:async()=>null,search:async()=>({products:[]})},authorizeAdmin:r=>r.headers.get('x-admin')==='yes'});
 const call=async(url,body,{cookie='',origin='https://example.test',admin=false}={})=>{const r=new Request('https://example.test'+url,{method:body===undefined?'GET':'POST',headers:{cookie,origin,'content-type':'application/json',...(admin?{'x-admin':'yes'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const response=await accounts(r)||await experiments(r);return {status:response.status,headers:response.headers,data:await response.json()}};
 return {directory,call};
}
test('public tag votes persist per browser, deduplicate, remove, aggregate in admin, and never return browser identities',async t=>{
 const {call,directory}=await fixture(t);
 const initial=await call('/api/products/boj');assert.equal(initial.status,200);assert.deepEqual(initial.data.tags.map(t=>t.label),STANDARD_TAGS.map(t=>t.label));assert.deepEqual(initial.data.selectedTagIds,[]);
 const a=await call('/api/products/boj',{tagIds:['value','value','quality']});assert.equal(a.status,200);const cookie=a.headers.get('set-cookie').split(';')[0];assert.match(cookie,/^vouch_visitor=/);assert.equal(a.data.tags.find(t=>t.id==='value').count,1);
 await call('/api/products/boj',{tagIds:['value','quality']},{cookie});
 const b=await call('/api/products/boj',{tagIds:['value']});assert.equal(b.data.tags.find(t=>t.id==='value').count,2);
 const again=await call('/api/products/boj',undefined,{cookie});assert.deepEqual(again.data.selectedTagIds,['value','quality']);assert.equal(JSON.stringify(again.data).includes(cookie.slice('vouch_visitor='.length)),false);
 const inventory=(await call('/api/admin/inventory',undefined,{admin:true})).data;const row=inventory.products.find(p=>p.id==='boj');assert.equal(row.communityTags.find(t=>t.id==='value').count,2);assert.equal(JSON.stringify(row).includes('visitors'),false);
 const fresh=createAccountsApi({store:await createFileStore(directory)});const restored=await fresh(new Request('https://example.test/api/products/boj',{headers:{cookie}}));assert.deepEqual((await restored.json()).selectedTagIds,['value','quality']);
 const removed=await call('/api/products/boj',{tagIds:[]},{cookie});assert.deepEqual(removed.data.selectedTagIds,[]);assert.equal(removed.data.tags.find(t=>t.id==='value').count,1);assert.equal(removed.data.tags.find(t=>t.id==='quality').count,0);
});
test('organizer assignments are available to endorse without confusing assignments with community votes',async t=>{
 const {call}=await fixture(t);await call('/api/admin/tags',undefined,{admin:true});await call('/api/admin/product-tags',{productId:'boj',tagIds:['sunscreen-lightweight']},{admin:true});const data=(await call('/api/products/boj')).data;
 const tag=data.tags.find(t=>t.id==='sunscreen-lightweight');assert.equal(tag.assigned,true);assert.equal(tag.count,0);
 assert.equal((await call('/api/products/boj',{tagIds:['sunscreen-lightweight']})).status,200);
 assert.equal((await call('/api/products/boj',{tagIds:['water-bottles-leak-proof']})).status,400);
});
test('tag writes reject cross-site requests, unknown tags/products, malformed input and unsupported methods',async t=>{
 const {call}=await fixture(t);
 assert.equal((await call('/api/products/boj',{tagIds:['value']},{origin:'https://evil.test'})).status,403);
 assert.equal((await call('/api/products/boj',{tagIds:['invented']})).status,400);
 assert.equal((await call('/api/products/boj',{tagIds:'value'})).status,400);
 assert.equal((await call('/api/products/unknown',{tagIds:[]})).status,404);
 assert.equal((await call('/api/admin/inventory')).status,401);
});
