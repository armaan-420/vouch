// Run only against a loopback Vinext preview; writes isolated local test records.
import assert from 'node:assert/strict';
const origin=process.env.VOUCH_TEST_ORIGIN||'http://127.0.0.1:4175';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Local preview only');
function browser(){const jar=new Map();return async(route,body)=>{const response=await fetch(origin+route,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual'});for(const c of response.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');jar.set(k,v)}const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data=raw}return {status:response.status,data}}}
const admin=browser(),a=browser(),observer=browser(),stamp=Date.now(),id='accounts-check-'+stamp;
await admin('/signin-with-chatgpt?return_to=/admin');
let response=await admin('/api/admin/experiments',{id,title:'Local account verification',category:'Sunscreen',productIds:['boj','eltamd','skin1004']});assert.equal(response.status,201,JSON.stringify(response.data));
for(const [productId,value]of [['boj','yes'],['eltamd','no'],['skin1004','brand']])assert.equal((await a('/api/events?experiment='+id,{type:'answer',productId,value})).status,200);
let edit=await a('/api/account/edit?experiment='+id);assert.equal(edit.status,200);assert.equal(edit.data.opinions.length,3);
const start=await a('/api/auth/start',{email:`local-${stamp}@example.test`});assert.equal(start.status,200,JSON.stringify(start.data));assert.ok(start.data.previewCode,'Requires explicit local test inbox');
assert.equal((await a('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode})).status,200);
edit=await a('/api/account/edit?experiment='+id);
response=await a('/api/account/claim',{claimToken:edit.data.claimToken,displayName:'Local test member',opinions:edit.data.opinions.map(x=>({productId:x.productId,visibility:'private'}))});assert.equal(response.status,200,JSON.stringify(response.data));const profile=response.data.profile;
assert.equal(profile.opinions.length,3);assert.equal(profile.visibility,'private');assert.ok(profile.milestones.includes('first-edit'));
assert.equal((await observer('/api/profiles/'+profile.handle)).status,404);
await a('/api/account/profile',{visibility:'public',opinions:[{productId:'boj',visibility:'public'}]});
response=await observer('/api/profiles/'+profile.handle);assert.equal(response.status,200);assert.equal(response.data.profile.opinions.length,1);
response=await observer('/api/products/boj');assert.ok(response.data.contributors.some(x=>x.handle===profile.handle));assert.ok(!JSON.stringify(response.data).includes('@example.test'));
assert.equal((await a('/api/events?experiment='+id,{type:'answer',productId:'boj',value:'no'})).status,200);
response=await a('/api/account/me');assert.equal(response.data.profile.opinions.find(x=>x.productId==='boj').verdict,'no');
const exported=await admin('/api/admin/export?experiment='+id);assert.equal(exported.status,200);assert.equal(Object.keys(exported.data.data.baseVotes.boj).length,1);
const {WATER_BOTTLES}=await import('../lib/water-bottles.mjs');const bottleId='bottles-check-'+stamp;
assert.equal((await admin('/api/admin/experiments',{id:bottleId,title:'Local water bottle account verification',category:'Water bottles',productIds:WATER_BOTTLES.map(p=>p.id)})).status,201);
for(const p of WATER_BOTTLES){const result=await a('/api/events?experiment='+bottleId,{type:'answer',productId:p.id,value:'yes'});assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.profileSync,'saved')}
response=await a('/api/account/me');const bottles=response.data.profile.opinions.filter(o=>o.experimentId===bottleId);assert.equal(bottles.length,9);assert.ok(bottles.every(o=>o.product.category==='Water bottles'&&o.visibility==='private'&&o.product.image));
const bottleBoard=(await observer('/api/board?experiment='+bottleId)).data.products;for(const opinion of bottles)assert.equal(opinion.score,bottleBoard.find(p=>p.id===opinion.productId).score);
await admin('/api/admin/experiment-settings',{id:bottleId,closed:true,includeInOverall:false});
await a('/api/auth/logout',{});assert.equal((await a('/api/account/me')).data.authenticated,false);
assert.equal((await a('/api/account/edit?experiment='+id)).data.opinions.length,0);
await admin('/api/admin/experiment-settings',{id,closed:true,includeInOverall:false});
console.log('Local Cloudflare/D1 account flow passed: anonymous votes, email code, private claim, selective publication, targeted opinion sync, all nine water bottle vouches saved to the account, historical response preservation and logout isolation.');
