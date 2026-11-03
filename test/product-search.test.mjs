import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createProductSearch,CATALOG_SOURCES} from '../product-search.mjs';
const source={id:'example',brand:'Example Beauty',origin:'https://example.test'};
const product=(id,title,handle)=>({id,title,handle,images:[{src:'https://cdn.shopify.com/s/files/example.png'}]});
test('Lion Pose sunscreen matches joined brand, current name and former name after a feed refresh',async t=>{
 const directory=await temp(t);const lion=CATALOG_SOURCES.find(s=>s.id==='lionpose');
 const service=await createProductSearch({directory,sources:[lion],fetcher:async()=>({ok:true,json:async()=>({products:[product(9010128486715,'UNGHOSTED™ Sheer Tinted 100% Mineral SPF 42 with Squalane','unghosted-mineral-sunscreen-spf-42'),product(2,'Barrier + Block Sun SPF 42 Bundle','bundle')]})})});
 for(const query of ['lionpose','Lion Pose sunscreen','Unghosted','Ghost-Buster','ghostbuster'])assert.equal((await service.search(query)).products[0].id,'catalog-lionpose-9010128486715');
 assert.equal((await service.search('lionpose')).catalogCount,1);
 await service.refresh();assert.equal((await service.search('ghostbuster')).products.length,1);
});
async function temp(t){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-search-test-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));return directory}
test('live catalog searches filter non-sunscreen and bundles; brand/name queries work; cached searches share one fetch',async t=>{const directory=await temp(t);let requests=0;const service=await createProductSearch({directory,sources:[source],fetcher:async()=>{requests++;return {ok:true,json:async()=>({products:[product(1,'Airy Sunscreen SPF 50','airy-sunscreen'),product(2,'Sunflower Cleansing Balm','cleansing-balm'),product(3,'Sunscreen Duo SPF 50','sunscreen-duo'),product(4,'Daily Sun Gel SPF30','daily-sun-gel')]})}}});const [a,b]=await Promise.all([service.search('example airy'),service.search('daily gel')]);assert.equal(requests,1);assert.equal(a.products.length,1);assert.equal(a.products[0].id,'catalog-example-1');assert.equal(a.products[0].url,'https://example.test/products/airy-sunscreen');assert.equal(b.products[0].name,'Daily Sun Gel SPF30');assert.equal((await service.search('cleansing')).products.length,0);assert.equal((await service.find('catalog-example-1')).image,'https://cdn.shopify.com/s/files/example.png');assert.equal(await service.find('forged-product'),null)});
test('cold failures are reported; saved results remain usable and explicitly stale during an outage',async t=>{const directory=await temp(t);const fail=async()=>{throw Error('offline')};const cold=await createProductSearch({directory,sources:[source],fetcher:fail});await assert.rejects(cold.search('sunscreen'),/temporarily unavailable/);const warm=await createProductSearch({directory,sources:[source],fetcher:async()=>({ok:true,json:async()=>({products:[product(1,'Sunscreen SPF 50','sunscreen')]})})});await warm.search('sunscreen');const stale=await createProductSearch({directory,sources:[source],fetcher:fail,ttl:-1});const result=await stale.search('sunscreen');assert.equal(result.products.length,1);assert.equal(result.stale,true)});

test('expired catalog returns suggestions immediately during a blocked refresh and selections remain resolvable',async t=>{
 const directory=await temp(t);let release,requests=0;const gate=new Promise(r=>release=r);const tasks=[];
 const initialCatalog={products:[{id:'catalog-example-1',brand:'Example',name:'Sunscreen SPF50',sourceId:'example'}],updatedAt:'2000-01-01T00:00:00Z',sources:['Example'],failedSources:[]};
 const service=await createProductSearch({directory,initialCatalog,fetcher:async()=>{requests++;await gate;return {ok:true,json:async()=>({products:[product(1,'Sunscreen SPF50','sunscreen')]})}},sources:[source]});
 try{const result=await service.search('example',{waitUntil:p=>tasks.push(p)});assert.equal(result.products.length,1);assert.equal(result.stale,true);assert.equal(requests,1);assert.equal((await service.find('catalog-example-1')).id,'catalog-example-1');await service.search('spf',{waitUntil:p=>tasks.push(p)});assert.equal(requests,1)}finally{release();await Promise.all(tasks)}
});
test('international sunscreen source follows all pages and tolerates accents, punctuation and joined brand names',async t=>{
 const directory=await temp(t);const pages=[];
 const service=await createProductSearch({directory,sources:[{id:'obf',brand:'Open Beauty Facts',origin:'https://example.test',kind:'openbeautyfacts'}],fetcher:async url=>{const page=Number(new URL(url).searchParams.get('page'));pages.push(page);return {ok:true,json:async()=>({count:101,products:page===1?[{code:'3337875917872',product_name:'Anthelios SPF 50',brands:'La Roche-Posay'}]:[{code:'4901301303256',product_name:'UV Aqua Rich',brands:'Bioré'}]})}}});
 assert.equal((await service.search('La RochePosay')).products.length,1);assert.equal((await service.search('biore')).products[0].id,'catalog-obf-4901301303256');assert.deepEqual(pages,[1,2]);
});
test('Shopify catalogs continue beyond three pages',async t=>{
 const directory=await temp(t);let calls=0;
 const service=await createProductSearch({directory,sources:[source],fetcher:async()=>{calls++;return {ok:true,json:async()=>({products:calls<=3?Array.from({length:250},(_,i)=>product(calls*1000+i,'Sunscreen SPF 50','sun-'+i)):[product(9999,'Last Sunscreen SPF 50','last-sunscreen')]})}}});
 assert.equal((await service.search('last')).products[0].id,'catalog-example-9999');assert.equal(calls,4);
});
test('new imported listings persist into a fresh saved catalog and survive feed refreshes',async()=>{
 const existing={id:'old',brand:'Example',name:'Existing Sunscreen',sourceId:'example',source:'Example Beauty'};
 const imported={id:'catalog-retailer-1',brand:'New Brand',name:'New Sunscreen SPF50',sourceId:'retailer',source:'Retailer'};
 let saved={products:[existing],updatedAt:new Date().toISOString(),sources:['Example Beauty'],failedSources:[]},writes=0;
 const storage={read:async()=>saved,write:async data=>{writes++;saved=structuredClone(data)}};
 const initialCatalog={products:[imported],sources:['Retailer'],retailerImportedAt:'2026-11-03T00:00:00Z'};
 const service=await createProductSearch({storage,initialCatalog,sources:[source],fetcher:async()=>({ok:true,json:async()=>({products:[product(1,'Sunscreen SPF50','sun')]})})});
 assert.equal(writes,1);assert.equal(saved.products.length,2);assert.equal((await service.search('new brand')).products[0].id,imported.id);
 await service.refresh();assert.ok(saved.products.some(p=>p.id===imported.id));assert.ok(saved.sources.includes('Retailer'));
 await createProductSearch({storage,initialCatalog,sources:[source]});assert.equal(writes,2,'same import checkpoint does not cause another write');
});

test('search and product lookup rebuild their index after a catalog refresh',async t=>{
 const directory=await temp(t);let generation=0;
 const service=await createProductSearch({directory,sources:[source],fetcher:async()=>({ok:true,json:async()=>({products:[product(++generation,generation===1?'Old Sunscreen SPF50':'New Sunscreen SPF50','sun')]})})});
 const old=(await service.search('old')).products[0];assert.ok(old);
 await service.refresh();assert.equal((await service.search('old')).products.length,0);
 const next=(await service.search('new')).products[0];assert.ok(next);assert.notEqual(next.id,old.id);
 assert.equal((await service.find(next.id)).name,next.name);assert.equal(await service.find(old.id),null);
});
