import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createFileStore} from '../lib/file-store.mjs';
import {createExperimentApi} from '../lib/experiment-api.mjs';
import {WATER_BOTTLES} from '../lib/water-bottles.mjs';
async function fixture(t){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-tags-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));const store=await createFileStore(directory);const search={find:async id=>id==='catalog-new'?{id,brand:'New brand',name:'New sunscreen'}:null,search:async()=>({products:[],catalogCount:0})};const api=createExperimentApi({store,search,authorizeAdmin:r=>r.headers.get('x-test-admin')==='yes'});return {store,call:async(p,data,admin=true)=>{const r=await api(new Request('https://example.test'+p,{method:data===undefined?'GET':'POST',headers:{...(admin?{'x-test-admin':'yes'}:{}),...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)}));return {status:r.status,data:await r.json()}}}}
test('water bottle seed persists once, is selectable, and nomination lookup stays in category',async t=>{const {call,store}=await fixture(t);const list=await call('/api/admin/experiments');assert.equal(list.data.customProducts.length,8);await call('/api/health');assert.equal((await (await store.scope('experiment-registry')).read()).skus[WATER_BOTTLES[0].id].url,WATER_BOTTLES[0].url);assert.equal(list.data.experiments.length,1);
const created=await call('/api/admin/experiments',{id:'bottles',title:'Water bottle edit',category:'Water bottles',productIds:WATER_BOTTLES.map(p=>p.id)});assert.equal(created.status,201);assert.equal(created.data.experiment.products.length,8);
const results=await call('/api/products/search?experiment=bottles&q=water%20bottle',undefined,false);assert.equal(results.data.products.length,8);assert.equal((await call('/api/products/search?experiment=bottles&q=sunscreen',undefined,false)).data.products.length,0);
assert.equal((await call('/api/nominations?experiment=sunscreen',{productId:WATER_BOTTLES[0].id},false)).status,400);
});
test('global and category tags persist across experiments and support any catalog SKU',async t=>{const {call}=await fixture(t);const tags=(await call('/api/admin/tags')).data;assert.equal(Object.keys(tags.definitions).length,28);const id=WATER_BOTTLES[0].id;
assert.equal((await call('/api/admin/product-tags',{productId:id,category:'Water bottles',tagIds:['value','water-bottles-leak-proof']})).status,200);
assert.equal((await call('/api/admin/product-tags',{productId:'boj',category:'Sunscreen',tagIds:['water-bottles-leak-proof']})).status,400);
assert.equal((await call('/api/admin/product-tags',{productId:id,tagIds:['fake']})).status,400);
assert.equal((await call('/api/admin/product-tags',{productId:'not-real',tagIds:[]})).status,404);
let saved=(await call('/api/admin/tags')).data.products[id];assert.deepEqual(saved.tagIds,['value','water-bottles-leak-proof']);assert.equal(saved.source,'organizer');
const custom=await call('/api/admin/tags',{label:'Gentle',category:'Sunscreen'});assert.equal(custom.status,201);assert.equal((await call('/api/admin/tags',{label:' gentle ',category:'sunscreen'})).status,409);
assert.equal((await call('/api/admin/product-tags',{productId:'catalog-new',tagIds:['durable',custom.data.tag.id]})).status,200);
assert.equal((await call('/api/admin/product-tags',{productId:id,tagIds:[]})).status,200);assert.deepEqual((await call('/api/admin/tags')).data.products[id].tagIds,[]);
});
test('taxonomy and assignments require organizer access and same-origin writes',async t=>{const {call}=await fixture(t);for(const p of ['/api/admin/products','/api/admin/tags'])assert.equal((await call(p,undefined,false)).status,401);for(const p of ['/api/admin/tags','/api/admin/product-tags'])assert.equal((await call(p,{},false)).status,401)});

test('new sunscreen definitions merge into an existing taxonomy without replacing assignments or duplicating organizer labels',async t=>{
 const {store,call}=await fixture(t);const tagStore=await store.scope('product-tags');
 await tagStore.transaction(d=>{d.definitions={value:{id:'value',label:'Value',category:null},existing:{id:'existing',label:'Lightweight',category:'Sunscreen'}};d.products={boj:{category:'Sunscreen',tagIds:['value','existing'],source:'organizer'}}});
 const first=(await call('/api/admin/tags')).data;
 assert.equal(first.seedVersion,2);assert.equal(Object.values(first.definitions).filter(t=>t.category==='Sunscreen').length,14);assert.ok(first.definitions.existing);assert.equal(first.definitions['sunscreen-lightweight'],undefined);
 assert.deepEqual(first.products.boj.tagIds,['value','existing']);
 assert.deepEqual((await call('/api/admin/tags')).data,first);
});
