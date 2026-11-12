import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {interpretQuery,personalFit,rankProducts,discoverySearch} from '../lib/discovery-search.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {initialRegistry} from '../lib/experiment-api.mjs';
import {initialTags} from '../lib/product-tags.mjs';
const tags=[{id:'light',label:'Lightweight'},{id:'grease',label:'Non-greasy'},{id:'fragrance',label:'Fragrance-free'},{id:'leak',label:'Leak-proof'}];
const p=(id,extra={})=>({id,name:id,brand:'Brand',category:'Sunscreen',formula:'',tags:tags.slice(0,2),score:'7.5',voteCounts:{total:1},...extra});
test('natural phrases map to explicit properties and every requested property is required',()=>{
 const products=[p('a'),p('b',{tags:[]}),p('c',{category:'Water bottles'})];
 assert.deepEqual(rankProducts(products,[],{query:'I want a lightweight sunscreen that isn’t greasy'}).products.map(p=>p.id),['a']);
 assert.deepEqual(interpretQuery('a water bottle that doesn’t leak',tags).required.map(t=>t.id),['leak']);
 assert.equal(rankProducts(products,[],{query:'a sunscreen under $20'}).total,0);
 assert.equal(rankProducts(products,[],{query:'not lightweight sunscreen'}).total,0);
 assert.equal(rankProducts(products,[],{query:'a sunscreen for unicorns'}).total,0);
});
test('personal fit needs two related item verdicts and never propagates brand trust',()=>{
 const products=[p('a'),p('b'),p('c'),p('d',{category:'Water bottles'})];
 const opinions=[{productId:'a',verdict:'yes'},{productId:'b',verdict:'yes'}];
 assert.equal(personalFit(products[2],opinions.slice(0,1),products),null);
 assert.equal(personalFit(products[2],opinions,products).score,7.5);
 assert.equal(personalFit(products[3],opinions,products),null);
 assert.equal(personalFit(products[2],opinions.map(o=>({...o,verdict:'brand'})),products),null);
 assert.equal(personalFit(products[0],opinions,products).label,'You vouched');
 assert.equal(personalFit(products[2],opinions.map(o=>({...o,verdict:'no'})),products).score,2.5);
});
test('filters, rating count, paging, and zero scores are retained',()=>{
 const products=Array.from({length:30},(_,i)=>p('p'+i,{score:i?'7.5':'0.0',voteCounts:{total:i?1:0}}));
 assert.equal(rankProducts(products,[],{}).products.length,24);
 assert.equal(rankProducts(products,[],{offset:24}).products.length,6);
 assert.equal(rankProducts(products,[],{reviewed:true}).total,29);
 assert.equal(rankProducts(products,[],{category:'Unknown'}).total,0);
});
test('API excludes drafts/disabled collections, deduplicates latest votes, and never exposes visitors or opinions',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'vouch-search-'));
 try{
  const store=await createFileStore(directory),registry=await store.scope('experiment-registry',initialRegistry);
  await registry.transaction(d=>{d.experiments={one:{id:'one',category:'Sunscreen',products:[p('a')]},two:{id:'two',category:'Sunscreen',products:[p('a')]},draft:{id:'draft',status:'draft',products:[p('secret')]},disabled:{id:'disabled',disabled:true,products:[p('hidden')]}}});
  await (await store.scope('experiment:one')).transaction(d=>{d.baseVotes={a:{'private-browser':'yes'}};d.baseVoteTimes={a:{'private-browser':'2026-01-01'}}});
  await (await store.scope('experiment:two')).transaction(d=>{d.baseVotes={a:{'private-browser':'no'}};d.baseVoteTimes={a:{'private-browser':'2026-02-01'}}});
  await (await store.scope('product-tags',initialTags)).transaction(d=>{d.definitions.light=tags[0];d.products.a={tagIds:['light']}});
  const accounts=async()=>Response.json({profile:{opinions:[],email:'secret@example.com'}});
  const response=await discoverySearch({store,accounts,request:new Request('https://vouch.test/api/discover')});
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const data=await response.json();assert.equal(data.catalogueCount,1);assert.equal(data.products[0].score,'2.5');assert.equal(data.products[0].voteCounts.total,1);assert.ok(!JSON.stringify(data).includes('private-browser'));assert.ok(!JSON.stringify(data).includes('secret'));
  assert.equal((await discoverySearch({store,accounts,request:new Request('https://vouch.test/api/discover?q='+ 'x'.repeat(241))})).status,400);
 }finally{await rm(directory,{recursive:true,force:true})}
});
