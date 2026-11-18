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

test('email-first signup verifies Wharton cohort, preserves picks and keeps email evidence private',async t=>{
 const {browser,advanceAuth}=await fixture(t),a=browser(),observer=browser(),admin=browser();
 await a('/api/events',{type:'answer',productId:'boj',value:'yes'});
 const before=(await admin('/api/admin/export')).data.data;
 await signin(a,'cohort@wharton.upenn.edu');
 const edit=(await a('/api/account/edit')).data;
 const signup=await a('/api/account/signup',{displayName:'Verified Member',email:'cohort@wharton.upenn.edu',claimToken:edit.claimToken});
 assert.equal(signup.status,200);const p=signup.data.profile;
 assert.equal(p.emailVerified,true);assert.equal(p.whartonEmailVerified,true);assert.equal(p.counts.yes,1);
 const people=(await admin('/api/admin/accounts')).data.accounts;
 assert.equal(people.find(row=>row.email==='cohort@wharton.upenn.edu').whartonEmailVerified,true);
 const publicProfile=(await observer('/api/profiles/'+p.handle)).data.profile;
 assert.equal(publicProfile.email,undefined);assert.equal(publicProfile.emailVerified,undefined);assert.equal(publicProfile.whartonEmailVerified,undefined);
 assert.deepEqual((await admin('/api/admin/export')).data.data,before,'signup does not recast votes');
 advanceAuth();const returning=browser();await signin(returning,'cohort@wharton.upenn.edu');
 assert.equal((await returning('/api/account/me')).data.profile.handle,p.handle);
 await signin(observer,'outsider@wharton.upenn.edu.example.test');
 const rows=(await admin('/api/admin/accounts')).data.accounts;
 assert.equal(rows.find(row=>row.email==='outsider@wharton.upenn.edu.example.test').whartonEmailVerified,false);
});


test('email-only save keeps a provisional account private until name and inbox verification, preserving picks',async t=>{
 const {browser,advanceAuth}=await fixture(t),a=browser(),observer=browser();
 const products=(await a('/api/experiment')).data.experiment.products;
 assert.equal((await a('/api/account/save-email',{email:'pending@example.test'})).status,409,'completion required');
 for(const p of products)await a('/api/events',{type:'answer',productId:p.id,value:'yes'});
 const saved=await a('/api/account/save-email',{email:'pending@example.test'});assert.equal(saved.status,200,JSON.stringify(saved.data));
 const pending=(await a('/api/account/me')).data;
 assert.equal(pending.authenticated,true);assert.equal(pending.profile.emailVerified,false);assert.equal(pending.profile.verificationRequired,true);assert.equal(pending.profile.opinions,undefined);
 assert.equal((await a('/api/auth/status')).data.identity,null,'saving an email does not authenticate the inbox');
 assert.equal((await observer('/api/profiles/'+pending.profile.handle)).status,404);
 assert.equal((await a('/api/account/profile',{visibility:'public'})).status,403,'cannot bypass verification by publishing');
 assert.equal((await a('/api/account/signup',{displayName:'Bypass',email:'pending@example.test'})).status,403);
 assert.equal((await a('/api/account/prepare-verification',{displayName:'P'})).status,400);
 const prepared=await a('/api/account/prepare-verification',{displayName:'Pending Member',email:'different@example.test'});
 assert.equal(prepared.data.email,'pending@example.test','uses email on file');
 await signin(a,prepared.data.email);
 const verified=(await a('/api/account/me')).data.profile;
 assert.equal(verified.handle,pending.profile.handle);assert.equal(verified.displayName,'Pending Member');assert.equal(verified.emailVerified,true);assert.equal(verified.verificationRequired,undefined);assert.equal(verified.opinions.length,products.length);assert.equal(verified.visibility,'public');
 assert.equal((await observer('/api/profiles/'+verified.handle)).status,200,'named attribution starts after verification');
 advanceAuth();const fresh=browser();await signin(fresh,'pending@example.test');assert.equal((await fresh('/api/account/me')).data.profile.handle,verified.handle);
 // A matching email alone grants no access to this account or its history.
 const impostor=browser();for(const p of products)await impostor('/api/events',{type:'answer',productId:p.id,value:'skip'});
 const other=await impostor('/api/account/save-email',{email:'pending@example.test'});
 assert.notEqual(other.data.profile.handle,verified.handle);assert.equal(other.data.profile.opinions,undefined);
 assert.equal((await a('/api/account/me')).data.profile.displayName,'Pending Member');
});


test('home omits navigation until verified sign-in and removes it after sign-out',async t=>{
 const {browser}=await fixture(t),a=browser();
 const anonymous=await a('/');assert.equal(anonymous.status,200);assert.ok(!anonymous.data.includes('site-menu-toggle'));assert.ok(!anonymous.data.includes('/site-nav.js'));assert.ok(anonymous.data.includes('/account?signin=1'));
 const products=(await a('/api/experiment')).data.experiment.products;
 for(const p of products)await a('/api/events',{type:'answer',productId:p.id,value:'skip'});
 await a('/api/account/save-email',{email:'nav@example.test'});
 assert.ok(!(await a('/')).data.includes('site-menu-toggle'),'email-only save does not unlock home navigation');
 await signin(a,'nav@example.test');assert.ok((await a('/')).data.includes('site-menu-toggle'));assert.ok((await a('/index.html')).data.includes('site-menu-toggle'));
 await a('/api/auth/logout',{});assert.ok(!(await a('/')).data.includes('site-menu-toggle'));
});

test('saved-email Wharton participant verifies their name and appears automatically on the leaderboard',async t=>{
 const {browser}=await fixture(t),participant=browser(),observer=browser();
 const products=(await participant('/api/experiment')).data.experiment.products;
 for(const p of products)await participant('/api/events',{type:'answer',productId:p.id,value:'yes'});
 const saved=await participant('/api/account/save-email',{email:'leaderboard-preview@wharton.upenn.edu'});assert.equal(saved.status,200);
 const pendingBoard=(await participant('/api/community-leaderboard')).data;assert.equal(pendingBoard.viewer.requiresSignup,true);assert.equal(pendingBoard.total,0);
 assert.equal((await observer('/api/community-leaderboard')).data.viewer.requiresSignup,false);
 const prepared=await participant('/api/account/prepare-verification',{displayName:'Wharton Preview'});assert.equal(prepared.status,200);
 const start=await participant('/api/auth/start',{email:prepared.data.email});assert.equal(start.status,200);
 const wrongCode=start.data.previewCode==='000000'?'111111':'000000';
 assert.equal((await participant('/api/auth/verify',{challengeId:start.data.challengeId,code:wrongCode})).status,400);
 assert.equal((await participant('/api/community-leaderboard')).data.viewer.requiresSignup,true);
 const verified=await participant('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode});assert.equal(verified.status,200);
 const board=(await participant('/api/community-leaderboard')).data;assert.equal(board.viewer.requiresSignup,false);assert.equal(board.total,1);assert.equal(board.viewer.entry.displayName,'Wharton Preview');assert.equal(board.viewer.entry.count,products.length);
 assert.equal((await observer('/api/profiles/'+board.viewer.entry.handle)).status,200);
});

test('Wharton intro is offered only to a new profile and either exit persists across browsers',async t=>{
 const {browser,advanceAuth}=await fixture(t);
 for(const exit of ['intro_done','intro_skipped']){
  const email=exit+'@wharton.upenn.edu',first=browser();
  await signin(first,email);
  const signup=async client=>{
   const {data: {claimToken}}=await client('/api/account/edit');
   return client('/api/account/signup',{displayName:'Pilot Member',email,claimToken,whartonPilot:true});
  };
  const created=await signup(first);
  assert.equal(created.status,200,JSON.stringify(created.data));
  assert.equal(created.data.pilotIntro,true);
  assert.equal(created.data.profile.introSeenAt,null);
  const saved=await first('/api/account/pilot-intro',{});
  assert.equal(saved.status,200);
  assert.ok(saved.data.introSeenAt);
  assert.equal((await first('/api/pilot-events',{type:exit,step:exit==='intro_done'?3:1})).status,204);
  const other=browser();advanceAuth();await signin(other,email);
  assert.equal((await other('/api/account/me')).data.profile.introSeenAt,saved.data.introSeenAt);
  assert.equal((await signup(other)).data.pilotIntro,false);
  const publicProfile=await other('/api/profiles/'+created.data.profile.handle);
  assert.equal(publicProfile.data.profile.introSeenAt,undefined);
 }
});

test('public share pages recheck picks privacy and attribute signup through the referral cookie',async t=>{
 const {WATER_BOTTLES}=await import('../lib/water-bottles.mjs');
 const {browser}=await fixture(t),admin=browser(),sharer=browser(),recipient=browser();
 await admin('/api/admin/experiments',{id:'bottles-pilot',title:'Wharton bottles',category:'Water bottles',productIds:WATER_BOTTLES.map(p=>p.id)});
 async function sign(client,email,name){
  await signin(client,email);
  const {data:{claimToken}}=await client('/api/account/edit?experiment=bottles-pilot');
  const response=await client('/api/account/signup?experiment=bottles-pilot',{displayName:name,email,whartonPilot:true,claimToken});
  assert.equal(response.status,200);
  return response.data.profile;
 }
 const owner=await sign(sharer,'pilot-owner@wharton.upenn.edu','Pilot Sharer');
 const link='/share/picks/'+owner.handle+'?ref='+owner.handle;
 assert.equal((await recipient(link)).status,404);
 assert.equal((await sharer('/api/events?experiment=bottles-pilot',{type:'answer',productId:WATER_BOTTLES[0].id,value:'yes',comment:'Omit comments from share pages'})).status,200);
 const {data:card}=await sharer('/api/pilot-share/picks');
 assert.equal(card.link,link);
 const opened=await recipient(link);
 assert.equal(opened.status,200);
 assert.match(opened.data,/property="og:title"/);
 assert.match(opened.data,/Join the Wharton experiments/);
 assert.doesNotMatch(opened.data,/Omit comments|@wharton.upenn.edu/);
 await sign(recipient,'pilot-recipient@wharton.upenn.edu','Pilot Recipient');
 const {data:report}=await admin('/api/admin/pilot-metrics');
 const metrics=Object.fromEntries(report.reports.all.sections.flatMap(s=>s.metrics).map(m=>[m.key,m.value]));
 assert.equal(metrics['share-opens'],1);
 assert.equal(metrics['share-signups'],1);
 await sharer('/api/account/profile',{visibility:'private'});
 assert.equal((await recipient(link)).status,404);
});
