import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createVouchServer} from '../server.mjs';
import {isWhartonEmail} from '../lib/tester-identity.mjs';

async function fixture(t,{authOptions={previewDelivery:true}}={}){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-tester-'));
 let authTime=Date.now();
 const server=await createVouchServer({directory,productSearch:{search:async()=>({products:[]}),find:async()=>null},authOptions:{now:()=>authTime,...authOptions}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true})});
 const origin='http://127.0.0.1:'+server.address().port;
 function browser(){const cookies=new Map();const call=async(route,body,headers={})=>{
  const response=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),Origin:origin,...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  for(const c of response.headers.getSetCookie()){const [key,value]=c.split(';')[0].split('=');if(value)cookies.set(key,value);else cookies.delete(key)}
  return {status:response.status,data:await response.json(),headers:response.headers};
 };call.cookies=cookies;return call}
 async function finish(client){const products=(await client('/api/experiment')).data.experiment.products;for(let i=0;i<products.length;i++){const r=await client('/api/events',{type:'answer',productId:products[i].id,value:i===1?'no':i===2?'brand':i===3?'skip':'yes'});assert.equal(r.status,200)}return products}
 async function signin(client,email){const start=await client('/api/auth/start',{email});assert.equal(start.status,200);const result=await client('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode});assert.equal(result.status,200);}
 return {browser,finish,signin,directory,advanceAuth:()=>{authTime+=61000}};
}

test('Wharton badge accepts only the exact email domain, regardless of case',()=>{
 assert.equal(isWhartonEmail(' Tester@WHARTON.UPENN.EDU '),true);
 for(const email of ['x@wharton.upenn.edu.evil.test','x@sub.wharton.upenn.edu','x@upenn.edu','x@y@wharton.upenn.edu','@wharton.upenn.edu'])assert.equal(isWhartonEmail(email),false,email);
});

test('completed attribution publishes item vouches, retains email privately and creates an isolated browser profile',async t=>{
 const f=await fixture(t),a=f.browser(),observer=f.browser(),products=await f.finish(a);
 const historical=(await a('/api/admin/export')).data.data;
 const r=await a('/api/account/participate',{displayName:'Early Tester',email:'tester@wharton.upenn.edu'});
 assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.profile.visibility,'public');assert.equal(r.data.profile.showName,true);assert.equal(r.data.profile.whartonEarlyTester,true);
 assert.ok(r.headers.getSetCookie().some(c=>c.includes('HttpOnly')&&c.includes('SameSite=Lax')));
 const me=(await a('/api/account/me')).data;assert.equal(me.authenticated,true);assert.equal(me.browserProfile,true);
 assert.equal((await observer('/api/account/me')).data.authenticated,false);
 const contributors=(await observer('/api/products/'+products[0].id)).data.contributors;
 assert.equal(contributors[0].displayName,'Early Tester');assert.equal(contributors[0].whartonEarlyTester,true);
 assert.equal((await observer('/api/products/'+products[1].id)).data.contributors.length,0,'passes stay private');
 const publicProfile=(await observer('/api/profiles/'+r.data.profile.handle)).data.profile;
 assert.ok(publicProfile.opinions.every(o=>o.verdict==='yes'&&o.visibility==='public'));
 assert.deepEqual((await a('/api/admin/export')).data.data,historical,'identity attachment never rewrites votes');
 const all=(await Promise.all((await fs.readdir(f.directory)).filter(n=>n.endsWith('.json')).map(n=>fs.readFile(path.join(f.directory,n),'utf8')))).join('\n');
 assert.match(all,/tester@wharton.upenn.edu/,'email is retained for later sign-in');
 assert.equal(me.profile.email,'tester@wharton.upenn.edu');assert.equal(me.profile.emailVerified,false);
 assert.equal(publicProfile.email,undefined);assert.doesNotMatch(JSON.stringify(contributors),/tester@wharton|emailVerified/);
 const retry=await a('/api/account/participate',{displayName:'Early Tester',email:'tester@wharton.upenn.edu'});assert.equal(retry.status,200);assert.equal(retry.data.profile.handle,r.data.profile.handle);
 assert.equal((await observer('/api/products/'+products[0].id)).data.contributors.length,1);
});

test('profile name control removes identity, badge, public profile and photo access while preserving anonymous vouches',async t=>{
 const f=await fixture(t),a=f.browser(),observer=f.browser(),products=await f.finish(a);
 const r=await a('/api/account/participate',{displayName:'Hidden Tester',email:'hidden@wharton.upenn.edu'}),handle=r.data.profile.handle;
 assert.equal((await a('/api/account/profile',{showName:'false'})).status,400);
 assert.equal((await a('/api/account/profile',{showName:false})).status,200);
 let product=(await observer('/api/products/'+products[0].id)).data;
 assert.equal(product.counts.yes,1);assert.equal(product.contributors[0].displayName,'Anonymous');
 assert.doesNotMatch(JSON.stringify(product),/Hidden Tester|whartonEarlyTester|"handle"/);
 assert.equal((await observer('/api/profiles/'+handle)).status,404);
 assert.equal((await a('/api/account/me')).data.profile.displayName,'Hidden Tester');
 const again=await a('/api/account/participate',{displayName:'Hidden Tester',email:'hidden@wharton.upenn.edu'});assert.equal(again.data.profile.showName,false,'repeat submissions preserve visibility');
 await a('/api/account/profile',{showName:true});
 assert.equal((await observer('/api/profiles/'+handle)).status,200);
 assert.equal((await observer('/api/products/'+products[0].id)).data.contributors[0].displayName,'Hidden Tester');
});

test('onboarding rejects incomplete answers, hostile origins and malformed fields without creating profiles',async t=>{
 const f=await fixture(t),a=f.browser();
 const body={displayName:'Tester',email:'tester@wharton.upenn.edu'};
 assert.equal((await a('/api/account/participate',body)).status,409);
 await a('/api/events',{type:'answer',productId:'boj',value:'yes'});
 assert.equal((await a('/api/account/participate',body)).status,409);
 await f.finish(a);
 assert.equal((await a('/api/account/participate',body,{Origin:'https://evil.example'})).status,403);
 assert.equal((await a('/api/account/participate',{...body,email:'no email'})).status,400);
 assert.equal((await a('/api/account/participate',{...body,displayName:' '})).status,400);
 assert.equal((await a('/api/account/me')).data.profile,null);
});

test('ordinary email gets no badge, future answers sync and logout cannot expose the browser profile',async t=>{
 const f=await fixture(t),a=f.browser();await f.finish(a);
 const r=await a('/api/account/participate',{displayName:'Other Tester',email:'tester@wharton.upenn.edu.evil.test'});
 assert.equal(r.status,200);assert.equal(r.data.profile.whartonEarlyTester,false);
 await a('/api/events',{type:'answer',productId:'eltamd',value:'yes'});
 assert.equal((await a('/api/account/me')).data.profile.opinions.find(o=>o.productId==='eltamd').verdict,'yes');
 assert.equal((await a('/api/account/me')).data.profile.opinions.find(o=>o.productId==='eltamd').visibility,'public');
 await a('/api/account/profile',{opinions:[{productId:'eltamd',visibility:'private'}]});
 await a('/api/events',{type:'answer',productId:'eltamd',value:'no'});
 await a('/api/events',{type:'answer',productId:'eltamd',value:'yes'});
 assert.equal((await a('/api/account/me')).data.profile.opinions.find(o=>o.productId==='eltamd').visibility,'private','explicit product privacy survives verdict changes');
 const logout=await a('/api/auth/logout',{});assert.equal(logout.status,200);
 assert.equal((await a('/api/account/me')).data.authenticated,false);
 assert.equal((await a('/api/account/edit')).data.opinions.length,0);
});

test('email signup grants the badge and safely upgrades the same browser profile without duplicate contributors',async t=>{
 const f=await fixture(t),a=f.browser(),observer=f.browser();await f.finish(a);
 const first=await a('/api/account/participate',{displayName:'Tester',email:'tester@wharton.upenn.edu'});
 await f.signin(a,'tester@wharton.upenn.edu');
 const me=(await a('/api/account/me')).data;
 assert.equal(me.browserProfile,false);assert.equal(me.profile.browserProfile,false);assert.equal(me.profile.handle,first.data.profile.handle);assert.equal(me.profile.whartonEarlyTester,true);
 assert.equal((await observer('/api/products/boj')).data.contributors.length,1);
 await a('/api/auth/logout',{});
 f.advanceAuth();const b=f.browser();await f.signin(b,'tester@wharton.upenn.edu');assert.equal((await b('/api/account/me')).data.profile.handle,first.data.profile.handle);
});


test('a saved email recovers the same profile from a fresh browser only after code verification',async t=>{
 const f=await fixture(t),a=f.browser(),b=f.browser(),observer=f.browser();await f.finish(a);
 const first=await a('/api/account/participate',{displayName:'Returning Tester',email:' Returning@Example.Test '});
 assert.equal(first.data.profile.email,'returning@example.test');
 const start=await b('/api/auth/start',{email:'returning@example.test'});assert.equal(start.status,200);
 assert.equal((await b('/api/account/me')).data.profile,null,'requesting a code never grants access');
 assert.equal((await b('/api/auth/verify',{challengeId:start.data.challengeId,code:'wrong'})).status,400);
 await b('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode});
 const me=(await b('/api/account/me')).data;
 assert.equal(me.profile.handle,first.data.profile.handle);assert.equal(me.profile.email,'returning@example.test');assert.equal(me.profile.emailVerified,true);assert.equal(me.browserProfile,false);
 assert.equal((await observer('/api/profiles/'+me.profile.handle)).data.profile.email,undefined);
 assert.equal((await observer('/api/products/boj')).data.contributors.length,1);
});

test('matching unverified submissions cannot overwrite or attach themselves to an established account',async t=>{
 const f=await fixture(t),owner=f.browser(),other=f.browser(),returning=f.browser();await f.finish(owner);
 const first=await owner('/api/account/participate',{displayName:'Original',email:'owner@example.test'});await f.signin(owner,'owner@example.test');await owner('/api/account/me');
 await f.finish(other);await other('/api/account/participate',{displayName:'Unverified submission',email:'owner@example.test'});
 f.advanceAuth();await f.signin(returning,'owner@example.test');
 const profile=(await returning('/api/account/me')).data.profile;
 assert.equal(profile.handle,first.data.profile.handle);assert.equal(profile.displayName,'Original');
 assert.equal((await other('/api/account/me')).data.profile.displayName,'Unverified submission');
});


test('ambiguous pending email matches and a different verified inbox do not claim another browser profile',async t=>{
 const f=await fixture(t),a=f.browser(),b=f.browser(),c=f.browser();
 for(const client of [a,b]){await f.finish(client);await client('/api/account/participate',{displayName:'Pending',email:'duplicate@example.test'})}
 await f.signin(c,'duplicate@example.test');assert.equal((await c('/api/account/me')).data.profile,null);
 await f.signin(a,'different@example.test');assert.equal((await a('/api/account/me')).data.profile,null);
 assert.equal((await b('/api/account/me')).data.profile.displayName,'Pending');
});
