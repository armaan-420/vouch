import test from 'node:test';
import assert from 'node:assert/strict';
import {mapConcurrent} from '../lib/map-concurrent.mjs';
import {publicInventory} from '../lib/discovery-search.mjs';
import {createProductResolver} from '../lib/catalog/resolver.mjs';
import {fresh} from '../lib/vouch-api.mjs';

test('concurrent work retains input order and limits outstanding calls',async()=>{
 const gates=[],started=[];
 const job=mapConcurrent([0,1,2,3,4,5,6],async i=>{started.push(i);await new Promise(resolve=>{gates[i]=resolve;});return i;});
 assert.deepEqual(started,[0,1,2,3,4,5]);
 gates[5]();await Promise.resolve();await Promise.resolve();assert.equal(started.at(-1),6);
 for(const release of gates)release();assert.deepEqual(await job,[0,1,2,3,4,5,6]);
});

test('inventory reads public categories concurrently and merges votes in registry order',async()=>{
 const experiments=Object.fromEntries(Array.from({length:8},(_,i)=>['e'+i,{id:'e'+i,category:'Products',products:[{id:'shared',name:'First '+i}]}]));
 experiments.secret={id:'secret',status:'draft',products:[]};
 const gates=[],started=[];
 const store={scope(key){return {async read(){
  if(key==='experiment-registry')return {experiments};if(key==='product-tags')return {products:{}};
  const i=Number(key.slice('experiment:e'.length));started.push(i);
  await new Promise(resolve=>{gates[i]=resolve;});
  return {...fresh(),baseVotes:{shared:{visitor:i===7?'no':'yes'}},baseVoteTimes:{shared:{visitor:'2026-11-'+String(i+1).padStart(2,'0')}}};
 }}}};
 const job=publicInventory(store);
 // Advance the promise chains for the registry and scoped records.
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.deepEqual(started,[0,1,2,3,4,5]);
 for(const release of gates)release();for(let i=0;i<12;i++)await Promise.resolve();
 assert.deepEqual(started,[0,1,2,3,4,5,6,7]);
 for(const release of gates)release();
 const products=await job;assert.equal(products.length,1);assert.equal(products[0].name,'First 0');assert.equal(products[0].score,'2.5');assert.equal(products[0].voteCounts.total,1);
});

test('hydration overlaps unique provider lookups and coalesces repeated products',async()=>{
 const calls=[],gates=new Map();
 const resolver=createProductResolver({enabled:true,providers:[{name:'channel3',async get(id){calls.push(id);await new Promise(resolve=>gates.set(id,resolve));return {status:'ok',products:[{id:'c3-'+id,provider:'channel3',providerId:id,name:id,image:'https://example.com/'+id+'.jpg'}]};}}]});
 const products=['a','b','a'].map((id,i)=>({id:'row-'+i,provider:'channel3',providerId:id,name:id}));
 const job=resolver.hydrate(products);for(let i=0;i<20;i++)await Promise.resolve();
 assert.deepEqual(calls,['a','b']);gates.get('b')();gates.get('a')();
 const rows=await job;assert.deepEqual(rows.map(p=>p.id),['row-0','row-1','row-2']);assert.deepEqual(rows.map(p=>p.image),['a','b','a'].map(id=>'https://example.com/'+id+'.jpg'));
});

test('Shopify batch hydration includes each missing identity only once',async()=>{
 let batch;
 const resolver=createProductResolver({enabled:true,providers:[{name:'shopify',async lookupBatch(ids){batch=ids;return {status:'ok',products:ids.map(id=>({id:'shop-'+id,provider:'shopify',providerId:id,name:id,image:'https://example.com/'+id+'.jpg'}))};}}]});
 const rows=await resolver.hydrate(['a','a','b'].map(id=>({provider:'shopify',providerId:id,name:id})));
 assert.deepEqual(batch,['a','b']);assert.equal(rows.length,3);assert.ok(rows.every(p=>p.image));
});
