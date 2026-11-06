import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createVouchServer} from '../server.mjs';

async function fixture(t){
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-experiments-'));
  const server=await createVouchServer({directory,productSearch:{find:async()=>null,search:async()=>({products:[]})}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true})});
  function browser(){let cookies={};return async(p,data,extra={})=>{
    const r=await fetch(origin+p,{method:data===undefined?'GET':'POST',headers:{Cookie:Object.entries(cookies).map(([k,v])=>k+'='+v).join('; '),...(data===undefined?{}:{'Content-Type':'application/json'}),...extra},body:data===undefined?undefined:JSON.stringify(data)});
    for(const cookie of r.headers.getSetCookie()){const [key,value]=cookie.split(';')[0].split('=');cookies[key]=value}
    return {status:r.status,data:await r.json()};
  }}
  return {browser,directory,origin};
}
const experiment=(id,productIds=['boj'])=>({id,title:'Experiment '+id,productIds,category:'Sunscreen'});
test('home is a placeholder; experiment paths are canonical and unknown paths never show sunscreen',async t=>{
 const f=await fixture(t),admin=f.browser();
 const get=p=>fetch(f.origin+p,{redirect:'manual'});
 for(const path of ['/','/index.html']){const r=await get(path);assert.equal(r.status,200);const html=await r.text();assert.match(html,/Good taste deserves/);assert.match(html,/Coming soon/);assert.doesNotMatch(html,/app.js|Sunscreen/)}
 assert.equal((await get('/golf')).status,404);
 const created=await admin('/api/admin/experiments',{id:'golf',title:'Golf bag edit',category:'Golf bags',productIds:[],customProducts:[{id:'sku-golf-bag',brand:'Example',name:'Golf bag'}]});
 assert.equal(created.status,201);assert.equal(created.data.url,'/golf');
 for(const path of ['/sunscreen','/golf']){const r=await get(path);assert.equal(r.status,200);const html=await r.text();assert.match(html,/src="\/app.js"/);assert.match(html,/href="\/style.css"/)}
 for(const [from,to]of [['/?experiment=sunscreen','/sunscreen'],['/?experiment=golf&overall=1','/golf?overall=1'],['/golf/','/golf'],['/golf?experiment=sunscreen','/golf']]){const r=await get(from);assert.equal(r.status,308);assert.equal(r.headers.get('location'),f.origin+to)}
 for(const path of ['/unknown','/golf/unknown','/constructor','/experiment-page.html'])assert.equal((await get(path)).status,404);
 for(const id of ['admin','api','assets','signin-with-chatgpt'])assert.equal((await admin('/api/admin/experiments',experiment(id))).status,400);
 assert.equal((await admin('/api/admin/summary?experiment=golf')).data.visitors,0);
});
test('experiments isolate votes, completion, nominations and exports; overall excludes prototypes and uses latest browser verdict',async t=>{
  const f=await fixture(t),admin=f.browser(),a=f.browser(),b=f.browser();
  for(const id of ['test-a','test-b'])assert.equal((await admin('/api/admin/experiments',experiment(id))).status,201);
  await a('/api/events?experiment=test-a',{type:'answer',productId:'boj',value:'yes'});
  await b('/api/events?experiment=test-a',{type:'answer',productId:'boj',value:'no'});
  await a('/api/events?experiment=test-a',{type:'leaderboard'});
  assert.equal((await admin('/api/admin/summary?experiment=test-a')).data.completed,1);
  assert.equal((await admin('/api/admin/summary?experiment=test-b')).data.visitors,0);
  assert.equal((await a('/api/board?experiment=test-a')).data.products[0].score,'5.0');
  assert.equal((await a('/api/board?experiment=test-b')).data.products[0].score,null);
  assert.equal((await a('/api/board')).data.products[0].score,null);
  await a('/api/nominations?experiment=test-a',{name:'Example sunscreen'});
  assert.equal((await a('/api/me?experiment=test-b')).data.nomination,null);
  await a('/api/events?experiment=test-b',{type:'answer',productId:'boj',value:'no'});
  assert.equal((await a('/api/overall')).data.products.length,0);
  for(const id of ['test-a','test-b'])await admin('/api/admin/experiment-settings',{id,closed:false,includeInOverall:true});
  assert.equal((await a('/api/overall')).data.products[0].score,'1.0');
  await a('/api/events?experiment=test-b',{type:'answer',productId:'boj',value:'skip'});
  assert.equal((await a('/api/overall')).data.products[0].score,'1.7');
  await admin('/api/admin/experiment-settings',{id:'test-b',closed:true,includeInOverall:false});
  assert.equal((await a('/api/events?experiment=test-b',{type:'answer',productId:'boj',value:'yes'})).status,409);
  assert.equal((await a('/api/overall')).data.products[0].score,'5.0');
  const exported=(await admin('/api/admin/export?experiment=test-a')).data;
  assert.equal(exported.experiment.id,'test-a');assert.equal(exported.data.nominations.length,1);assert.equal(Object.keys(exported.data.baseVotes.boj).length,2);
  assert.equal((await a('/api/events?experiment=test-b',{type:'answer',productId:'eltamd',value:'yes'})).status,409);
  assert.equal((await a('/api/events?experiment=test-a',{type:'answer',productId:'eltamd',value:'yes'})).status,400);
  assert.equal((await a('/api/experiment?experiment=unknown')).status,404);
  assert.equal((await a('/api/experiment?experiment=constructor')).status,404);
  assert.equal((await a('/api/admin/experiments',experiment('test-a'))).status,409);
  assert.equal((await a('/api/admin/experiments',experiment('evil'),{origin:'https://other.example'})).status,403);
  assert.equal((await a('/api/health')).data.ok,true);
});
test('SKU identity stays stable across experiments, invalid photo links are rejected, and custom product details persist',async t=>{
  const f=await fixture(t),admin=f.browser();
  const sku={id:'sku-shampoo-250ml',brand:'Example',name:'Shampoo 250ml',formula:'Unscented'};
  assert.equal((await admin('/api/admin/experiments',{...experiment('hair-a',[]),customProducts:[{...sku,image:'javascript:alert(1)'}]})).status,400);
  assert.equal((await admin('/api/admin/experiments',{...experiment('hair-a',[]),customProducts:[sku]})).status,201);
  const b=await admin('/api/admin/experiments',experiment('hair-b',[sku.id]));
  assert.equal(b.status,201);assert.equal(b.data.experiment.products[0].name,sku.name);
  assert.equal((await admin('/api/admin/experiments',{...experiment('hair-c',[]),customProducts:[{...sku,name:'Different product'}]})).status,409);
  await admin('/api/events?experiment=hair-a',{type:'answer',productId:sku.id,value:'yes'});
  await admin('/api/admin/experiment-settings',{id:'hair-a',closed:false,includeInOverall:true});
  assert.equal((await admin('/api/overall')).data.products[0].id,sku.id);
});

test('schedules persist per experiment, validate atomically, and gate collection while keeping results readable',async t=>{
 const f=await fixture(t),admin=f.browser(),visitor=f.browser();
 for(const id of ['timed-a','timed-b'])await admin('/api/admin/experiments',experiment(id));
 const settings={id:'timed-a',closed:false,includeInOverall:false};
 const startsAt=new Date(Date.now()+3600000).toISOString(),endsAt=new Date(Date.now()+7200000).toISOString();
 assert.equal((await admin('/api/admin/experiment-settings',{...settings,startsAt,endsAt})).status,200);
 assert.equal((await visitor('/api/experiment?experiment=timed-a')).data.experiment.startsAt,startsAt);
 assert.equal((await visitor('/api/experiment?experiment=timed-b')).data.experiment.startsAt,null);
 for(const pair of [{startsAt,endsAt:null},{startsAt:null,endsAt},{startsAt:endsAt,endsAt:startsAt},{startsAt:'invalid',endsAt},{startsAt:123,endsAt}])assert.equal((await admin('/api/admin/experiment-settings',{...settings,...pair})).status,400);
 assert.equal((await visitor('/api/experiment?experiment=timed-a')).data.experiment.endsAt,endsAt);
 assert.equal((await visitor('/api/events?experiment=timed-a',{type:'start'})).status,409);
 assert.equal((await visitor('/api/nominations?experiment=timed-a',{name:'Example sunscreen'})).status,409);
 assert.equal((await visitor('/api/board?experiment=timed-a')).status,200);
 const past=new Date(Date.now()-7200000).toISOString();
 await admin('/api/admin/experiment-settings',{...settings,startsAt:past,endsAt:new Date(Date.now()-3600000).toISOString()});
 assert.equal((await visitor('/api/events?experiment=timed-a',{type:'answer',productId:'boj',value:'yes'})).status,409);
 assert.equal((await visitor('/api/board?experiment=timed-a')).status,200);
 await admin('/api/admin/experiment-settings',{...settings,startsAt:past,endsAt});
 assert.equal((await visitor('/api/events?experiment=timed-a',{type:'answer',productId:'boj',value:'yes'})).status,200);
 await admin('/api/admin/experiment-settings',{...settings,closed:true});
 assert.equal((await visitor('/api/events?experiment=timed-a',{type:'start'})).status,409);
 assert.equal((await visitor('/api/experiment?experiment=timed-a')).data.experiment.endsAt,endsAt);
 await admin('/api/admin/experiment-settings',{...settings,startsAt:null,endsAt:null});
 assert.equal((await visitor('/api/events?experiment=timed-a',{type:'start'})).status,200);
});

test('board counts follow replacement and overall uses the latest verdict per browser',async t=>{
 const f=await fixture(t),a=f.browser(),b=f.browser(),c=f.browser(),admin=f.browser();
 for(const id of ['counts-a','counts-b']){
   await admin('/api/admin/experiments',experiment(id));
   await admin('/api/admin/experiment-settings',{id,closed:false,includeInOverall:true});
 }
 const answer=(browser,id,value)=>browser('/api/events?experiment='+id,{type:'answer',productId:'boj',value});
 await answer(a,'counts-a','yes');await answer(b,'counts-a','brand');await answer(c,'counts-a','no');
 const board=(await a('/api/board?experiment=counts-a')).data.products[0];
 assert.deepEqual(board.voteCounts,{yes:1,maybe:1,pass:1,total:3});
 assert.deepEqual(Object.keys(board).sort(),['id','myVote','score','voteCounts']);
 await new Promise(resolve=>setTimeout(resolve,5));
 await answer(a,'counts-b','brand');
 assert.deepEqual((await a('/api/overall')).data.products[0].voteCounts,{yes:0,maybe:2,pass:1,total:3});
 await answer(a,'counts-b','skip');
 assert.deepEqual((await a('/api/overall')).data.products[0].voteCounts,{yes:0,maybe:1,pass:1,total:2});
 await answer(b,'counts-a','yes');
 assert.deepEqual((await a('/api/board?experiment=counts-a')).data.products[0].voteCounts,{yes:2,maybe:0,pass:1,total:3});
});
