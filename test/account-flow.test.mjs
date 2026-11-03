import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createVouchServer} from '../server.mjs';

async function fixture(t){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-accounts-flow-'));
 let authTime=Date.now();
 const server=await createVouchServer({directory,productSearch:{search:async()=>({products:[]}),find:async()=>null},authOptions:{previewDelivery:true,now:()=>authTime,secret:'preview-integration-secret-32-characters-long'}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true})});
 const origin=`http://127.0.0.1:${server.address().port}`;
 function browser(){const cookies=new Map();return async(route,body)=>{
  const response=await fetch(origin+route,{method:body?'POST':'GET',headers:{Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),Origin:origin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  for(const c of response.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');cookies.set(k,v)}
  const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:response.status,data};
 }}
 return {browser,advanceAuth:(ms=61000)=>{authTime+=ms}};
}
async function signin(client,email){const start=await client('/api/auth/start',{email});assert.equal(start.status,200,JSON.stringify(start.data));assert.ok(start.data.previewCode);const verified=await client('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode});assert.equal(verified.status,200,JSON.stringify(verified.data));}

test('account flow claims private opinions, publishes consenting contributors, survives logout and merges another browser',async t=>{
 const {browser,advanceAuth}=await fixture(t),a=browser(),observer=browser();
 await a('/api/events',{type:'answer',productId:'boj',value:'yes'});
 await a('/api/events',{type:'answer',productId:'eltamd',value:'no'});
 await a('/api/events',{type:'answer',productId:'skin1004',value:'brand'});
 await a('/api/events',{type:'answer',productId:'supergoop',value:'skip'});
 await signin(a,'first@example.test');
 const edit=await a('/api/account/edit?experiment=sunscreen');assert.equal(edit.status,200,JSON.stringify(edit.data));
 assert.equal(edit.data.opinions.length,3);
 const claimBody={claimToken:edit.data.claimToken,displayName:'First member',opinions:edit.data.opinions.map(p=>({productId:p.productId,visibility:'private'}))};
 const claim=await a('/api/account/claim',claimBody);assert.equal(claim.status,200,JSON.stringify(claim.data));assert.equal(claim.data.profile.opinions.length,3);
 const profile=claim.data.profile,productId=profile.opinions.find(p=>p.verdict==='yes').productId;
 let product=await observer('/api/products/'+encodeURIComponent(productId));assert.equal(product.status,200);assert.equal(product.data.contributors.length,0);
 const published=await a('/api/account/profile',{visibility:'public',opinions:[{productId,visibility:'public'}]});assert.equal(published.status,200,JSON.stringify(published.data));
 product=await observer('/api/products/'+encodeURIComponent(productId));assert.equal(product.data.contributors.length,1);assert.equal(product.data.contributors[0].displayName,'First member');assert.ok(!JSON.stringify(product.data).includes('first@example.test'));
 const publicProfile=await observer('/api/profiles/'+profile.handle);assert.equal(publicProfile.status,200);assert.equal(publicProfile.data.profile.opinions.length,1);
 const before=(await a('/api/admin/export')).data.data;
 assert.equal(before.baseVotes.boj[Object.keys(before.baseVotes.boj)[0]],'yes');
 await a('/api/auth/logout',{});assert.equal((await a('/api/account/me')).data.authenticated,false);
 await signin(a,'second@example.test');
 const switched=await a('/api/account/edit?experiment=sunscreen');assert.equal(switched.data.opinions.length,0,'logout rotates browser ownership');
 advanceAuth();const b=browser();await b('/api/events',{type:'answer',productId:'boj',value:'no'});await signin(b,'first@example.test');
 const review=await b('/api/account/edit?experiment=sunscreen');const merged=await b('/api/account/claim',{claimToken:review.data.claimToken,opinions:review.data.opinions.map(p=>({productId:p.productId,visibility:'public'}))});assert.equal(merged.status,200,JSON.stringify(merged.data));
 assert.equal(merged.data.profile.opinions.length,3,'account gets one current opinion per product');
 product=await observer('/api/products/'+encodeURIComponent(productId));assert.equal(product.data.contributors.length,1);assert.equal(product.data.contributors[0].verdict,'no');
 advanceAuth(8*86400000);
 const expired=await b('/api/account/edit?experiment=sunscreen');assert.equal(expired.data.opinions.length,0,'expired account rotates claimed browser before private edit reads');
 assert.equal((await b('/api/events',{type:'answer',productId:'boj',value:'brand'})).status,200);
 const historical=(await observer('/api/admin/export')).data.data;assert.equal(Object.keys(historical.baseVotes.boj).length,3,'expired browser adds a fresh response rather than overwriting a prior participant');
 assert.equal((await observer('/sunscreen')).status,200);assert.equal((await observer('/account')).status,200);assert.equal((await observer('/products/'+encodeURIComponent(productId))).status,200);
});

test('water bottle answers from signed-in accounts save across all nine products and a fresh browser, without sweeping anonymous history',async t=>{
 const {WATER_BOTTLES}=await import('../lib/water-bottles.mjs');
 const {browser,advanceAuth}=await fixture(t),admin=browser(),a=browser(),observer=browser();
 assert.equal((await admin('/api/admin/experiments',{id:'waterbottle',title:'The Wharton Water Bottle Edit',category:'Water bottles',productIds:WATER_BOTTLES.map(p=>p.id)})).status,201);
 await signin(a,'bottle-member@example.test');
 // First signed-in answer creates both a visitor and a private collection.
 let r=await a('/api/events',{type:'answer',productId:'boj',value:'yes'});assert.equal(r.data.profileSync,'saved');
 await a('/api/account/profile',{visibility:'public',opinions:[{productId:'boj',visibility:'public'}]});
 const choices=['yes','yes','brand','no','skip','yes','no','brand','yes'];
 for(let i=0;i<WATER_BOTTLES.length;i++){r=await a('/api/events?experiment=waterbottle',{type:'answer',productId:WATER_BOTTLES[i].id,value:choices[i]});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.profileSync,'saved')}
 let profile=(await a('/api/account/me')).data.profile;
 assert.equal(profile.opinions.length,9);const bottles=profile.opinions.filter(o=>o.experimentId==='waterbottle');assert.equal(bottles.length,8);assert.equal(bottles.filter(o=>o.verdict==='yes').length,4);assert.ok(bottles.every(o=>o.visibility==='private'&&o.product.category==='Water bottles'&&o.product.image));
 assert.equal((await observer('/api/profiles/'+profile.handle)).data.profile.opinions.length,1,'new bottle vouches stay private on a public profile');
 advanceAuth();const b=browser();await b('/api/events',{type:'answer',productId:'eltamd',value:'no'});await signin(b,'bottle-member@example.test');
 r=await b('/api/events?experiment=waterbottle',{type:'answer',productId:WATER_BOTTLES[0].id,value:'no'});assert.equal(r.data.profileSync,'saved');
 profile=(await b('/api/account/me')).data.profile;assert.equal(profile.opinions.find(o=>o.productId===WATER_BOTTLES[0].id).verdict,'no');assert.ok(!profile.opinions.some(o=>o.productId==='eltamd'),'anonymous history requires explicit review');
 await b('/api/events?experiment=waterbottle',{type:'answer',productId:WATER_BOTTLES[1].id,value:'skip'});profile=(await b('/api/account/me')).data.profile;assert.ok(!profile.opinions.some(o=>o.productId===WATER_BOTTLES[1].id));
 // A returning account on a browser with no visitor cookie must save its first answer too.
 advanceAuth();const c=browser();await signin(c,'bottle-member@example.test');r=await c('/api/events?experiment=waterbottle',{type:'answer',productId:WATER_BOTTLES[8].id,value:'brand'});assert.equal(r.status,200);assert.equal(r.data.profileSync,'saved');assert.equal((await c('/api/account/me')).data.profile.opinions.find(o=>o.productId===WATER_BOTTLES[8].id).verdict,'brand');
});

test('previously missed water bottle picks can be reviewed and recovered without recasting experiment votes',async t=>{
 const {WATER_BOTTLES}=await import('../lib/water-bottles.mjs');const {browser}=await fixture(t),admin=browser(),a=browser();
 await admin('/api/admin/experiments',{id:'waterbottle',title:'Water Bottle Edit',category:'Water bottles',productIds:WATER_BOTTLES.map(p=>p.id)});
 for(const p of WATER_BOTTLES)await a('/api/events?experiment=waterbottle',{type:'answer',productId:p.id,value:'yes'});
 const before=(await admin('/api/admin/export?experiment=waterbottle')).data.data;
 await signin(a,'recover-bottles@example.test');const edit=(await a('/api/account/edit?experiment=waterbottle')).data;assert.equal(edit.opinions.length,9);
 const claimed=await a('/api/account/claim',{claimToken:edit.claimToken,opinions:edit.opinions.map(p=>({productId:p.productId,visibility:'private'}))});assert.equal(claimed.status,200);assert.equal(claimed.data.profile.opinions.length,9);
 const after=(await admin('/api/admin/export?experiment=waterbottle')).data.data;assert.deepEqual(after,before);
 assert.equal((await a('/api/account/me')).data.profile.counts.yes,9);
});
