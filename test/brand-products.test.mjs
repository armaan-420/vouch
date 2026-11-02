import test from 'node:test';
import assert from 'node:assert/strict';
import {oneProductPerBrand} from '../lib/brand-products.mjs';
import {community} from '../lib/vouch-api.mjs';
import {createVouchServer} from '../server.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('one representative per normalized brand, with fixed lineup priority',()=>{
 const a={id:'a',brand:'Élta MD'},b={id:'b',brand:'elta-md'},c={id:'c',brand:'Other'};
 assert.deepEqual(oneProductPerBrand([a,b,c]),[a,c]);
 assert.deepEqual(oneProductPerBrand([b,c],[a]),[c]);
});
test('community variants of lineup brands stay off the board and cannot receive votes',async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-brands-'));
 const product={id:'tinted',brand:'EltaMD',name:'Tinted sunscreen'};
 const server=await createVouchServer({directory,productSearch:{find:async()=>product,search:async()=>({products:[product]})}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true})});
 const origin='http://127.0.0.1:'+server.address().port;
 const post=(p,data)=>fetch(origin+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 for(let i=0;i<2;i++)assert.equal((await post('/api/nominations',{productId:product.id})).status,200);
 assert.deepEqual((await (await fetch(origin+'/api/community')).json()).products,[]);
 assert.equal((await post('/api/community/vote',{productId:'community-catalog:tinted',value:'yes'})).status,404);
 const customProducts=[{id:'sku-first',brand:'Brand A',name:'First'},{id:'sku-second',brand:'BRAND-A',name:'Second'},{id:'sku-other',brand:'Brand B',name:'Other'}];
 const response=await post('/api/admin/experiments',{id:'brands',title:'Brand experiment',category:'Shampoo',productIds:[],customProducts});
 assert.equal(response.status,201);
 assert.deepEqual((await response.json()).experiment.products.map(p=>p.id),['sku-first','sku-other']);
 const exported=await (await fetch(origin+'/api/admin/export')).json();
 assert.equal(exported.data.nominations.length,2);
});
test('community deduplication is stable and keeps unrelated brands',()=>{
 const products=[{id:'one',brand:'New Brand'},{id:'two',brand:'New-Brand'},{id:'three',brand:'Different'}];
 const d={nominations:products.flatMap((product,i)=>[0,1].map(v=>({key:product.id,name:product.id,product,visitorId:String(v),createdAt:String(i)}))),reviews:Object.fromEntries(products.map(p=>[p.id,{product:p}])),communityVotes:{}};
 assert.deepEqual(community(d,'').map(p=>p.skuId),['one','three']);
});
