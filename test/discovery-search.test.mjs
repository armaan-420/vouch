import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {interpretQuery,personalFit,rankProducts,discoverySearch} from '../lib/discovery-search.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {initialRegistry} from '../lib/experiment-api.mjs';
import {initialAccounts,productKey} from '../lib/account-records.mjs';
import {globalSearch,invalidateSearchIndex} from '../lib/global-search.mjs';
import {withLibraryReviews} from '../lib/library-reviews.mjs';
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

test('standalone public Vouches are discoverable by category and stay separate from Edit votes',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'vouch-library-'));
 try{
  const store=await createFileStore(directory);
  const registry=await store.scope('experiment-registry',initialRegistry);
  await registry.transaction(d=>{d.experiments={tv:{id:'tv',category:'Televisions',products:[]}}});
  const records=await store.scope('accounts-v1',initialAccounts);
  const sony={id:'c3-sony',provider:'channel3',providerId:'sony',name:'Bravia 7',brand:'Sony',category:'Televisions'};
  const mug={id:'c3-mug',provider:'channel3',providerId:'mug',name:'Studio mug',category:'Mugs & Cups',categorySlug:'coffee-mugs'};
  const mystery={id:'unknown',name:'Mystery product'};
  const privateProduct={id:'private',name:'Private product'};
  const opinion=(product,visibility='public',verdict='yes')=>({productId:product.id,product,visibility,verdict,source:'search',comment:'private test payload'});
  await records.transaction(d=>{
   for(const product of [sony,mug,mystery,privateProduct])d.products[productKey(product.id)]=product;
   d.accounts.public={visibility:'public',opinions:{sony:opinion(sony),mug:opinion(mug),mystery:opinion(mystery),private:opinion(privateProduct,'private')}};
   d.accounts.private={visibility:'private',opinions:{private:opinion(privateProduct)}};
   d.accounts.other={visibility:'public',opinions:{sony:opinion(sony,'public','no'),private:opinion(privateProduct,'public','brand')}};
   d.accounts.removed={visibility:'public',deletedAt:'2026-11-17',opinions:{private:opinion(privateProduct)}};
  });
  const accounts=async()=>Response.json({profile:null});
  const req=path=>new Request('https://vouch.test'+path);
  const discover=async query=>(await discoverySearch({store,accounts,request:req('/api/discover?'+query)})).json();
  const data=await discover('reviewed=1');
  assert.equal(data.total,3);
  assert.deepEqual(data.categoryOptions,[{id:'coffee-mugs',label:'Mugs & Cups',parentId:null},{id:'televisions',label:'Televisions',parentId:'electronics'},{id:'uncategorized',label:'Uncategorized',parentId:null}]);
  assert.ok(!JSON.stringify(data).includes('private test payload'));
  const [product]=(await discover('category=televisions&reviewed=1')).products;
  assert.equal(product.id,sony.id);
  assert.equal(product.reviewCounts.total,2);
  assert.equal(product.reviewScore,'5.0');
  assert.equal(product.voteCounts.total,0);
  assert.equal(product.score,null);
  assert.equal((await discover('category=Televisions')).total,1);
  assert.equal((await discover('category=coffee-mugs')).total,1);
  assert.equal(product.parentCategory,'Electronics');
  const search=async()=>(await globalSearch({store,accounts,request:req('/api/search?q=Sony+Bravia&source=vouch')})).json();
  assert.equal((await search()).products[0].vouchStatus,'rated');
  await records.transaction(d=>{d.accounts.public.opinions.sony.visibility='private'});
  assert.equal((await search()).total,0);
  await records.transaction(d=>{d.accounts.public.opinions.sony.visibility='public'});
  await registry.transaction(d=>{d.experiments.tv.products=[{...sony,id:'edit-sony'}]});
  await (await store.scope('experiment:tv')).transaction(d=>{d.baseVotes={'edit-sony':{visitor:'yes'}}});
  invalidateSearchIndex(store);
  const joined=(await discover('category=televisions')).products;
  assert.equal(joined.length,1);
  assert.equal(joined[0].id,'edit-sony');
  assert.equal(joined[0].voteCounts.total,1);
  assert.equal(joined[0].reviewCounts.total,2);
  assert.equal(joined[0].score,'7.5');
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('legacy Edit labels and category IDs stay stable in the review library',async()=>{
 const legacy=[
  ['Beauty','beauty'],['Electronics','electronics'],['Travel & Outdoors','travel-outdoors'],
  ['Sunscreen','sunscreen'],['sunscreens','sunscreen'],['sunscreen','sunscreen'],
  ['Blush','blush'],['Lip balm','lip-balm'],['Lip Balm','lip-balm'],['Hand cream','hand-cream'],
  ['Shampoo','shampoo'],['shampoos','shampoo'],['Televisions','televisions'],
  ['TV','televisions'],['TVs','televisions'],['Television','televisions'],
  ['Headphones','headphones'],['headphone','headphone'],['Power banks','power-banks'],['Air purifiers','air-purifiers'],
  ['Water bottles','water-bottles'],['Water bottle','water-bottles'],['Water Bottles','water-bottles'],
  ['Carry-on luggage','carry-on-luggage'],['Running shoes','running-shoes'],['Running Shoes','running-shoes'],
  ['Bags and totes','bags-and-totes'],['Golf bags','golf-bags'],['Boards','boards'],['Products','products'],
  ['Mugs & Cups','mugs-cups'],['Athletic Shoes','athletic-shoes'],['Open','open'],
 ];
 const edits=legacy.map(([category],i)=>p('legacy-'+i,{category}));
 const products=await withLibraryReviews(null,edits,initialAccounts());
 assert.deepEqual(products.map(p=>[p.category,p.categoryId]),legacy);
});

test('Discover filters by parent, child ID and legacy category labels',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'vouch-discover-parent-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const store=await createFileStore(directory);
 const registry=await store.scope('experiment-registry',initialRegistry);
 const labels={headset:'Headphones',tv:'TVs',battery:'Power banks',spf:'Sunscreen',audio:'Electronics'};
 await registry.transaction(d=>{
  d.experiments=Object.fromEntries(Object.entries(labels).map(([id,category])=>[id,{id,category,products:[p(id,{categorySlug:'sunscreen'})]}]));
 });
 const accounts=async()=>Response.json({profile:null});
 const discover=async category=>(await discoverySearch({store,accounts,request:new Request('https://vouch.test/api/discover?category='+category)})).json();
 const parent=await discover('electronics');
 assert.deepEqual(parent.products.map(p=>p.id).sort(),['audio','battery','headset','tv']);
 assert.deepEqual(parent.parents,[{id:'beauty',label:'Beauty'},{id:'electronics',label:'Electronics'}]);
 assert.deepEqual(parent.categoryOptions.find(c=>c.id==='headphones'),{id:'headphones',label:'Headphones',parentId:'electronics'});
 for(const category of ['headphones','Headphones'])assert.deepEqual((await discover(category)).products.map(p=>p.id),['headset']);
 assert.deepEqual((await discover('TVs')).products.map(p=>p.id),['tv']);
});
