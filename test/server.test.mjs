import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createVouchServer} from '../server.mjs';
async function fixture(t,options={}){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-test-'));let server=await createVouchServer({directory,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));let origin=`http://127.0.0.1:${server.address().port}`;t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true})});return {get origin(){return origin},async restart(){await new Promise(r=>server.close(r));server=await createVouchServer({directory,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`}}}
function browser(f){let cookies={};return async(route,payload)=>{const response=await fetch(f.origin+route,{method:payload?'POST':'GET',headers:{Cookie:Object.entries(cookies).map(([k,v])=>`${k}=${v}`).join('; '),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});for(const c of response.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');cookies[k]=v}return {status:response.status,data:await response.json()}}}
const products=['boj','eltamd','skin1004','supergoop','roundlab','medicube','mixsoon','innisfree'];
test('visitors deduplicate; leaderboard shortcuts do not finish; eight answers plus board complete once; restart persists',async t=>{const f=await fixture(t);const a=browser(f),admin=browser(f);await a('/api/events',{type:'visit'});await a('/api/events',{type:'visit'});await a('/api/events',{type:'leaderboard'});let s=(await admin('/api/admin/summary')).data;assert.equal(s.visitors,1);assert.equal(s.completed,0);await a('/api/events',{type:'start'});for(const productId of products)await a('/api/events',{type:'answer',productId,value:'skip'});await a('/api/events',{type:'leaderboard'});await a('/api/events',{type:'leaderboard'});s=(await admin('/api/admin/summary')).data;assert.equal(s.started,1);assert.equal(s.completed,1);assert.equal(s.completionRate,100);await f.restart();s=(await admin('/api/admin/summary')).data;assert.equal(s.completed,1);assert.equal(s.visitors,1)});
test('two distinct nominators add a confirmed sunscreen to the board; repeats do not count and new products start unrated',async t=>{const f=await fixture(t);const admin=browser(f),a=browser(f),b=browser(f);await a('/api/events',{type:'visit'});await a('/api/nominations',{name:'Isntree Watery Sun Gel'});await a('/api/nominations',{name:'Isntree Watery Sun Gel'});let groups=(await admin('/api/admin/summary')).data.nominations;assert.equal(groups[0].nominators,1);await admin('/api/admin/review',{name:'Isntree Hyaluronic Acid Watery Sun Gel',keys:groups[0].sourceKeys});assert.equal((await a('/api/community')).data.products.length,0);await b('/api/events',{type:'visit'});await b('/api/nominations',{name:'Isntree watery gel'});groups=(await admin('/api/admin/summary')).data.nominations;const reviewed=await admin('/api/admin/review',{name:'Isntree Hyaluronic Acid Watery Sun Gel',keys:groups.flatMap(g=>g.sourceKeys)});assert.equal(reviewed.data.nominators,2);assert.equal(reviewed.data.status,'on-board');let p=(await a('/api/community')).data.products[0];assert.equal(p.communityNominated,true);assert.equal(p.score,null);assert.equal((await a('/api/me')).data.nomination.qualified,true);await a('/api/community/vote',{productId:p.id,value:'yes'});p=(await a('/api/community')).data.products[0];assert.equal(p.score,'8.3');await a('/api/community/vote',{productId:p.id,value:'no'});assert.equal((await b('/api/community')).data.products[0].score,'1.7');await b('/api/community/vote',{productId:p.id,value:'yes'});assert.equal((await b('/api/community')).data.products[0].score,'5.0');await f.restart();assert.equal((await admin('/api/admin/summary')).data.nominations[0].status,'on-board');assert.equal((await a('/api/community')).data.products[0].score,'5.0')});
test('invalid verdicts are rejected and do not inflate visits',async t=>{const f=await fixture(t),a=browser(f);assert.equal((await a('/api/events',{type:'answer',productId:'made-up',value:'yes'})).status,400);assert.equal((await a('/api/admin/summary')).data.visitors,0)});

test('second distinct nomination of an already-confirmed name adds it immediately',async t=>{const f=await fixture(t),a=browser(f),b=browser(f),admin=browser(f);await a('/api/nominations',{name:'Example sunscreen'});let g=(await admin('/api/admin/summary')).data.nominations[0];await admin('/api/admin/review',{name:'Example sunscreen',keys:g.sourceKeys});assert.equal((await a('/api/community')).data.products.length,0);assert.equal((await b('/api/nominations',{name:'Example sunscreen'})).data.qualified,true);assert.equal((await b('/api/community')).data.products.length,1)});

test('selected live products retain identity/photo and automatically join after two nominations; forged IDs are rejected',async t=>{const p={id:'catalog-isntree-123',brand:'Isntree',name:'Daily Sun Gel SPF30',image:'https://cdn.shopify.com/s/files/product.png',url:'https://isntree-global.com/products/daily-sun-gel',onBoardId:null};const productSearch={search:async()=>({products:[p]}),find:async id=>id===p.id?p:id==='original'?{...p,onBoardId:'eltamd'}:null,refresh:async()=>{}};const f=await fixture(t,{productSearch}),a=browser(f),b=browser(f),admin=browser(f);const result=await a('/api/products/search?q=isntree');assert.equal(result.data.products[0].id,p.id);assert.equal((await a('/api/nominations',{productId:'forged',name:'Made up',image:'https://evil.test/x'})).status,400);assert.equal((await a('/api/nominations',{productId:'original'})).status,409);const first=await a('/api/nominations',{productId:p.id});assert.equal(first.data.qualified,false);assert.equal((await admin('/api/admin/summary')).data.nominations[0].reviewed,true);const second=await b('/api/nominations',{productId:p.id});assert.equal(second.data.qualified,true);const board=(await a('/api/community')).data.products;assert.equal(board.length,1);assert.equal(board[0].image,p.image);assert.equal(board[0].communityNominated,true);assert.equal(board[0].score,null);await f.restart();assert.equal((await a('/api/community')).data.products[0].image,p.image)});

test('changing a nomination replaces the active entry, preserves history, and does not add nominators',async t=>{const f=await fixture(t),a=browser(f),b=browser(f),admin=browser(f);await a('/api/nominations',{name:'First sunscreen'});await a('/api/nominations',{name:'Second sunscreen'});await b('/api/nominations',{name:'Second sunscreen'});const summary=(await admin('/api/admin/summary')).data;assert.equal(summary.nominationSubmitters,2);assert.equal(summary.nominations.length,1);assert.equal(summary.nominations[0].nominators,2);assert.equal((await a('/api/me')).data.nomination.name,'Second sunscreen')});

test('base leaderboard uses shared real votes and replaces repeat verdicts',async t=>{const f=await fixture(t),a=browser(f),b=browser(f);assert.equal((await a('/api/board')).data.products[0].score,null);await a('/api/events',{type:'answer',productId:'boj',value:'yes'});assert.equal((await b('/api/board')).data.products[0].score,'8.3');await b('/api/events',{type:'answer',productId:'boj',value:'no'});assert.equal((await a('/api/board')).data.products[0].score,'5.0');await a('/api/events',{type:'answer',productId:'boj',value:'no'});assert.equal((await a('/api/board')).data.products[0].score,'1.0');await a('/api/events',{type:'answer',productId:'boj',value:'skip'});assert.equal((await a('/api/board')).data.products[0].score,'1.7')});

test('multiple nominations save atomically, deduplicate per product, persist, and support removals',async t=>{
  const catalog=['first','second'].map(id=>({id,brand:'Example '+id,name:id+' SPF',image:'https://example.com/'+id+'.png',url:'https://example.com/'+id,onBoardId:null}));
  const productSearch={find:async id=>catalog.find(p=>p.id===id)||null,search:async()=>({products:catalog})};
  const f=await fixture(t,{productSearch}),a=browser(f),b=browser(f),admin=browser(f);
  await a('/api/nominations',{name:'Existing name'});
  assert.equal((await a('/api/me')).data.nominations.length,1);
  const nominations=[{productId:'first'},{productId:'second'},{name:'Manual SPF'},{productId:'first'}];
  let saved=await a('/api/nominations',{nominations});assert.equal(saved.data.nominations.length,3);
  await a('/api/nominations',{nominations});
  let groups=(await admin('/api/admin/summary')).data.nominations;
  assert.ok(groups.every(g=>g.nominators===1));
  assert.equal((await a('/api/nominations',{nominations:[{productId:'first'},{productId:'invalid'}]})).status,400);
  assert.equal((await a('/api/me')).data.nominations.length,3);
  await b('/api/nominations',{nominations:[{productId:'first'},{productId:'second'}]});
  assert.equal((await a('/api/community')).data.products.length,2);
  await f.restart();assert.equal((await a('/api/me')).data.nominations.length,3);
  await a('/api/nominations',{nominations:[{productId:'second'}]});
  assert.equal((await a('/api/me')).data.nominations.length,1);
  assert.equal((await a('/api/community')).data.products.length,1);
  const exported=(await admin('/api/admin/export')).data.data;
  assert.ok(exported.nominationHistory.some(n=>n.name==='Existing name'));
  assert.ok(exported.nominationHistory.some(n=>n.product?.id==='first'));
  await a('/api/nominations',{nominations:[]});assert.deepEqual((await a('/api/me')).data.nominations,[]);
  assert.equal((await a('/api/me')).data.nomination,null);
});
test('brand verdicts persist, replace item votes, and can be removed on base and community products',async t=>{
  const f=await fixture(t),a=browser(f),b=browser(f),admin=browser(f);
  const answer=value=>a('/api/events',{type:'answer',productId:'boj',value});
  assert.equal((await answer('brand')).status,200);
  let p=(await a('/api/board')).data.products.find(p=>p.id==='boj');
  assert.equal(p.myVote,'brand');assert.equal(p.score,'7.5');
  await answer('yes');assert.equal((await a('/api/board')).data.products.find(p=>p.id==='boj').score,'8.3');
  await answer('brand');await f.restart();
  p=(await a('/api/board')).data.products.find(p=>p.id==='boj');assert.equal(p.myVote,'brand');assert.equal(p.score,'7.5');
  await answer('skip');assert.equal((await a('/api/board')).data.products.find(p=>p.id==='boj').score,null);
  await a('/api/nominations',{name:'Brand test sunscreen'});await b('/api/nominations',{name:'Brand test sunscreen'});
  const g=(await admin('/api/admin/summary')).data.nominations[0];
  await admin('/api/admin/review',{name:g.name,keys:g.sourceKeys});
  const id=(await a('/api/community')).data.products[0].id;
  let r=await a('/api/community/vote',{productId:id,value:'brand'});
  assert.equal(r.status,200);assert.equal(r.data.products[0].score,'7.5');assert.equal(r.data.products[0].myVote,'brand');assert.deepEqual(r.data.products[0].voteCounts,{yes:0,maybe:1,pass:0,total:1});
  r=await a('/api/community/vote',{productId:id,value:'yes'});assert.equal(r.data.products[0].score,'8.3');assert.deepEqual(r.data.products[0].voteCounts,{yes:1,maybe:0,pass:0,total:1});
  r=await a('/api/community/vote',{productId:id,value:'skip'});assert.equal(r.data.products[0].score,null);assert.deepEqual(r.data.products[0].voteCounts,{yes:0,maybe:0,pass:0,total:0});
});
