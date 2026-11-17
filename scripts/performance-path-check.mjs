// Controlled before/after comparison, not production latency or a live provider test.
// Usage: node scripts/performance-path-check.mjs [baseline-git-ref]
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {publicInventory} from '../lib/discovery-search.mjs';
import {createProductResolver} from '../lib/catalog/resolver.mjs';
import {createRequestStore} from '../lib/request-store.mjs';
import {fresh} from '../lib/vouch-api.mjs';

const baseline=process.argv[2]||'9f17e86';
const delay=()=>new Promise(resolve=>setTimeout(resolve,10));
async function original(file){
 const base=new URL('../'+file,import.meta.url);
 const source=execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',cwd:new URL('..',import.meta.url)})
  .replace(/from (['"])(\.[^'"]+)\1/g,(_,quote,path)=>'from '+JSON.stringify(new URL(path,base).href));
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const beforeInventory=(await original('lib/discovery-search.mjs')).publicInventory;
const beforeResolver=(await original('lib/catalog/resolver.mjs')).createProductResolver;
const experiments=Object.fromEntries(Array.from({length:18},(_,i)=>['e'+i,{id:'e'+i,category:'Products',products:[{id:'sku-'+i,name:'Product '+i}]}]));
const store={scope:key=>({async read(){await delay();return key==='experiment-registry'?{experiments}:key==='product-tags'?{products:{}}:fresh();}})};
async function compare(label,before,after){
 const timings={};let beforeValue,afterValue;
 for(const [name,fn] of [['before',before],['after',after]]){
  const times=[];for(let i=0;i<5;i++){const start=performance.now(),value=await fn();times.push(performance.now()-start);if(name==='before')beforeValue=value;else afterValue=value;}
  timings[name+'_median_ms']=Math.round(times.sort((a,b)=>a-b)[2]);
 }
 assert.deepEqual(afterValue,beforeValue);
 console.log(JSON.stringify({label,...timings,identicalOutput:true}));
}
console.log(JSON.stringify({baseline,trials:5,simulatedIO_ms:10,productionMeasurement:false}));
await compare('Inventory: 18 public categories',()=>beforeInventory(store),()=>publicInventory(store));
const products=Array.from({length:18},(_,i)=>({provider:'channel3',providerId:String(i),name:'Product '+i}));
const config={enabled:true,providers:[{name:'channel3',async get(id){await delay();return {status:'ok',products:[{id:'c3-'+id,provider:'channel3',providerId:id,name:id,image:'https://example.com/'+id}]};}}]};
await compare('Images: 18 unique products',()=>beforeResolver(config).hydrate(products),()=>createProductResolver(config).hydrate(products));
let reads=0;
const base={scope:()=>base,async read(){reads++;await delay();return {accounts:{}};}};
await compare('Five account reads within one request',async()=>{let value;for(let i=0;i<5;i++)value=await base.read();return value;},async()=>{const request=createRequestStore(base);let value;for(let i=0;i<5;i++)value=await (await request.scope('accounts')).read();return value;});
reads=0;const request=createRequestStore(base);for(let i=0;i<5;i++)await (await request.scope('accounts')).read();
assert.equal(reads,1);console.log(JSON.stringify({repeatedAccountReads:{before:5,after:reads}}));
