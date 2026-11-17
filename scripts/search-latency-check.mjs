import {performance} from 'node:perf_hooks';
import {globalSearch} from '../lib/global-search.mjs';
import {memoryCache} from '../lib/catalog/cache.mjs';
import {createProductResolver} from '../lib/catalog/resolver.mjs';
import {fresh} from '../lib/vouch-api.mjs';
import {DEFAULT_PRODUCTS} from '../lib/products.mjs';
import {initialTags} from '../lib/product-tags.mjs';
const count=Math.max(1000,DEFAULT_PRODUCTS.length*10),products=Array.from({length:count},(_,i)=>({id:'sku-'+i,brand:'Brand '+(i%20),name:'Bottle '+i,category:'Water Bottles'}));
const records={'experiment-registry':{experiments:{fixture:{id:'fixture',category:'Water Bottles',products}}},'product-tags':initialTags(),'experiment:fixture':fresh()};
const store={scope:async key=>({read:async()=>structuredClone(records[key])})};
const accounts=async()=>Response.json({profile:null});
const cache=memoryCache();for(let i=0;i<100;i++)await cache.set('query:v3:global:bottle '+i,[{id:'c3-'+i,provider:'channel3',providerId:String(i),brand:'Outside',name:'Bottle '+i,category:'Water Bottles'}],600);
const search=createProductResolver({local:{find:async()=>null},cache,enabled:true,providers:[{name:'channel3',search:async()=>{throw Error('Unexpected provider request in cached benchmark')}}]});
for(const source of ['vouch','catalog']){const times=[];for(let i=0;i<201;i++){const start=performance.now();await globalSearch({store,accounts,search,request:new Request('https://fixture.example/api/search?q=Bottle%20'+(i%100)+'&source='+source)});if(i)times.push(performance.now()-start)}times.sort((a,b)=>a-b);console.log(JSON.stringify({inventory:count,queries:times.length,source,p50_ms:+times[99].toFixed(2),p95_ms:+times[189].toFixed(2),catalog:'memory-cache hit fixture, not network or D1'}))}
