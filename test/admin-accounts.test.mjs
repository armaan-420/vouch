import test from 'node:test';
import assert from 'node:assert/strict';
import {createApplicationApi} from '../lib/application-api.mjs';
import {accountKey} from '../lib/admin-accounts.mjs';
import {initialAccounts} from '../lib/accounts.mjs';
function fixture(options={}){
 const states=new Map();let time=1000000,delivery;
 const store={scope(name,initial){if(!states.has(name))states.set(name,initial());return {read:async()=>structuredClone(states.get(name)),transaction:async fn=>{const next=structuredClone(states.get(name)),result=fn(next);states.set(name,next);return result;}}}};
 const api=createApplicationApi({store,authorizeAdmin:async r=>r.headers.get('x-test-admin')==='yes',search:{},authOptions:{secret:'test-only-secret-over-thirty-two-characters',now:()=>time,sendCode:async data=>{delivery=data;if(options.failVerification&&data.verificationUrl)throw Error("private provider response");}}});
 function client(admin=false){const jar=new Map();return async(path,body,extra={})=>{
  const r=await api(new Request('http://127.0.0.1:4173'+path,{method:body?'POST':'GET',headers:{cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(admin?{'x-test-admin':'yes'}:{}),...(body?{origin:'http://127.0.0.1:4173','content-type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined}));
  for(const c of r.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');jar.set(k,v);}return {status:r.status,data:await r.json()};
 };}
 return {client,store,states,advance:(ms=61000)=>{time+=ms;},get delivery(){return delivery;}};
}
async function signin(f,c){const start=await c('/api/auth/start',{email:'member@example.test'});assert.equal(start.status,200);const verified=await c('/api/auth/verify',{challengeId:start.data.challengeId,code:f.delivery.code});assert.equal(verified.status,200);return verified.data.identity;}
async function profile(f,id){const key=await accountKey(id);const db=await f.store.scope('accounts-v1',initialAccounts);await db.transaction(d=>{d.accounts[key]={displayName:'Member',handle:'v-member',email:'member@example.test',emailVerified:true,visibility:'public',createdAt:new Date().toISOString(),opinions:{},history:[],milestones:[]};});return key;}
test('people API requires admin authorization and same-origin mutations and never exposes auth secrets',async()=>{
 const f=fixture(),person=f.client(),admin=f.client(true);await signin(f,person);
 assert.equal((await person('/api/admin/accounts')).status,401);
 const list=await admin('/api/admin/accounts');assert.equal(list.data.accounts.length,1);
 assert.equal((await admin('/api/admin/accounts',{id:list.data.accounts[0].id,action:'disable'},{origin:'https://evil.example'})).status,403);
 assert.equal((await admin('/api/admin/accounts',{id:list.data.accounts[0].id,action:'unknown'})).status,400);
 assert.ok(!/emailHash|otpHash|challengeId|sessionHash/.test(JSON.stringify(list.data)));
});
test('resend rotates code while preserving original challenge and browser; enforces cooldown',async()=>{
 const f=fixture(),person=f.client(),other=f.client(),admin=f.client(true);
 const start=await person('/api/auth/start',{email:'member@example.test'}),old=f.delivery.code;
 const id=(await admin('/api/admin/accounts')).data.accounts[0].id;
 assert.equal((await admin('/api/admin/accounts',{id,action:'resend'})).status,429);
 f.advance();assert.equal((await admin('/api/admin/accounts',{id,action:'resend'})).status,200);
 const code=f.delivery.code;
 assert.equal((await other('/api/auth/verify',{challengeId:start.data.challengeId,code})).status,400);
 if(old!==code)assert.equal((await person('/api/auth/verify',{challengeId:start.data.challengeId,code:old})).status,400);
 assert.equal((await person('/api/auth/verify',{challengeId:start.data.challengeId,code})).status,200);
 assert.equal((await admin('/api/admin/accounts',{id:(await admin('/api/admin/accounts')).data.accounts[0].id,action:'resend'})).status,409);
});
test('disable revokes sessions, hides public profile and blocks verification; enable requires fresh sign-in',async()=>{
 const f=fixture(),person=f.client(),admin=f.client(true),identity=await signin(f,person),id=await profile(f,identity.id);
 assert.equal((await person('/api/profiles/v-member')).status,200);
 assert.equal((await admin('/api/admin/accounts',{id,action:'disable'})).status,200);
 assert.equal((await person('/api/auth/status')).data.identity,null);
 assert.equal((await person('/api/account/me')).data.authenticated,false);
 assert.equal((await person('/api/profiles/v-member')).status,404);
 assert.equal((await person('/api/auth/start',{email:'member@example.test'})).status,403);
 assert.equal((await admin('/api/admin/accounts',{id,action:'enable'})).status,200);
 assert.equal((await person('/api/auth/status')).data.identity,null);
 f.advance();assert.equal((await signin(f,person)).id,identity.id);
 assert.equal((await person('/api/profiles/v-member')).status,200);
});
test('delete requires exact confirmation, removes account data and keeps an opaque tombstone against stale credentials',async()=>{
 const f=fixture(),person=f.client(),admin=f.client(true),identity=await signin(f,person),id=await profile(f,identity.id);
 assert.equal((await admin('/api/admin/accounts',{id,action:'delete',confirm:'wrong'})).status,400);
 assert.equal((await admin('/api/admin/accounts',{id,action:'delete',confirm:'member@example.test'})).status,200);
 assert.equal((await admin('/api/admin/accounts')).data.accounts.length,0);
 assert.equal((await person('/api/auth/status')).data.identity,null);
 assert.equal((await person('/api/profiles/v-member')).status,404);
 const p=f.states.get('accounts-v1').accounts[id];assert.deepEqual(Object.keys(p),['deletedAt']);
 assert.equal(Object.keys(f.states.get('account-auth-v1').sessions).length,0);
 f.advance();assert.notEqual((await signin(f,person)).id,identity.id);
});
test('browser-only disabled/deleted credentials cannot recreate or expose their collection',async()=>{
 const f=fixture(),admin=f.client(true),token='a'.repeat(64),id=await accountKey('tester:'+token),db=await f.store.scope('accounts-v1',initialAccounts);
 await db.transaction(d=>{d.accounts[id]={displayName:'Browser member',handle:'v-browser',browserProfile:true,visibility:'public',opinions:{},history:[],milestones:[]};});
 const person=f.client();const headers={cookie:'vouch_tester_session='+token};
 assert.equal((await person('/api/account/me',undefined,headers)).data.authenticated,true);
 await admin('/api/admin/accounts',{id,action:'disable'});
 assert.equal((await person('/api/account/me',undefined,headers)).data.authenticated,false);
 await admin('/api/admin/accounts',{id,action:'enable'});
 assert.equal((await person('/api/account/me',undefined,headers)).data.authenticated,true);
 await admin('/api/admin/accounts',{id,action:'delete',confirm:'v-browser'});
 assert.equal((await person('/api/account/me',undefined,headers)).data.authenticated,false);
});
test('sign out all devices invalidates active sessions and pending codes without disabling account',async()=>{
 const f=fixture(),person=f.client(),second=f.client(),admin=f.client(true);await signin(f,person);
 f.advance();const pending=await second('/api/auth/start',{email:'member@example.test'}),code=f.delivery.code;
 const id=(await admin('/api/admin/accounts')).data.accounts[0].id;
 assert.equal((await admin('/api/admin/accounts',{id,action:'revoke'})).status,200);
 assert.equal((await person('/api/auth/status')).data.identity,null);
 assert.equal((await second('/api/auth/verify',{challengeId:pending.data.challengeId,code})).status,400);
 assert.equal((await admin('/api/admin/accounts')).data.accounts[0].status,'active');
});
test('disabling an unverified browser email also blocks email sign-in and verification cannot escape the block',async()=>{
 const f=fixture(),admin=f.client(true),person=f.client(),db=await f.store.scope('accounts-v1',initialAccounts),id=await accountKey('tester:'+'b'.repeat(64));
 await db.transaction(d=>{d.accounts[id]={displayName:'Pending member',handle:'v-pending',email:'member@example.test',browserProfile:true,visibility:'public',opinions:{},history:[],milestones:[]};});
 await admin('/api/admin/accounts',{id,action:'disable'});
 assert.equal((await person('/api/auth/start',{email:'member@example.test'})).status,403);
 assert.equal((await admin('/api/admin/accounts')).data.accounts.length,1);
 await admin('/api/admin/accounts',{id,action:'enable'});
 assert.equal((await person('/api/auth/start',{email:'member@example.test'})).status,200);
});
test('an unverified duplicate email profile cannot cause actions on the verified account',async()=>{
 const f=fixture(),admin=f.client(true),person=f.client(),identity=await signin(f,person),verifiedKey=await profile(f,identity.id),db=await f.store.scope('accounts-v1',initialAccounts),duplicate=await accountKey('tester:duplicate');
 await db.transaction(d=>{d.accounts[duplicate]={displayName:'Unverified duplicate',handle:'v-duplicate',email:'member@example.test',browserProfile:true,visibility:'public',opinions:{},history:[],milestones:[]};});
 assert.equal((await admin('/api/admin/accounts')).data.accounts.length,2);
 await admin('/api/admin/accounts',{id:duplicate,action:'delete',confirm:'member@example.test'});
 assert.equal((await person('/api/auth/status')).data.identity.id,identity.id);
 assert.equal((await admin('/api/admin/accounts')).data.accounts[0].id,verifiedKey);
});
function verificationToken(f){return new URLSearchParams(new URL(f.delivery.verificationUrl).hash.slice(1)).get('verify-email');}
test('admin sends standalone verification link; GET cannot consume it, POST signs in once and marks profile verified',async()=>{
 const f=fixture(),admin=f.client(true),person=f.client(),id=await accountKey('tester:email-link'),db=await f.store.scope('accounts-v1',initialAccounts);
 await db.transaction(d=>{d.accounts[id]={displayName:'Link member',handle:'v-link',email:'member@example.test',browserProfile:true,visibility:'public',opinions:{},history:[],milestones:[]};});
 const sent=await admin('/api/admin/accounts',{id,action:'send-verification'});assert.equal(sent.status,200);assert.equal(sent.data.verificationUrl,undefined);assert.equal(f.delivery.email,'member@example.test');
 const token=verificationToken(f);assert.equal(token.length,64);assert.ok(!JSON.stringify(f.states.get('account-auth-v1')).includes(token));
 assert.equal((await person('/api/auth/verify-email')).status,405);
 assert.equal((await person('/api/auth/verify-email',{token},{origin:'https://evil.example'})).status,403);
 assert.equal((await person('/api/auth/verify-email',{token})).status,200);
 const me=await person('/api/account/me');assert.equal(me.data.profile.handle,'v-link');assert.equal(me.data.profile.emailVerified,true);
 assert.equal((await person('/api/auth/verify-email',{token})).status,400);
});
test('changing verified email preserves identity and collection, revokes old sessions and links, and requires new verification',async()=>{
 const f=fixture(),admin=f.client(true),person=f.client(),identity=await signin(f,person),id=await profile(f,identity.id);
 f.advance();await admin('/api/admin/accounts',{id,action:'send-verification'});const oldToken=verificationToken(f);
 assert.equal((await admin('/api/admin/accounts',{id,action:'change-email',email:'new@example.test',confirm:'wrong'})).status,400);
 assert.equal((await admin('/api/admin/accounts',{id,action:'change-email',email:'bad',confirm:'member@example.test'})).status,400);
 assert.equal((await admin('/api/admin/accounts',{id,action:'change-email',email:' New@Example.test ',confirm:'member@example.test'})).status,200);
 assert.equal((await person('/api/auth/status')).data.identity,null);
 assert.equal((await person('/api/auth/verify-email',{token:oldToken})).status,400);
 let row=(await admin('/api/admin/accounts')).data.accounts[0];assert.equal(row.email,'new@example.test');assert.equal(row.verified,false);assert.equal(row.id,id);
 assert.equal((await admin('/api/admin/accounts',{id,action:'send-verification'})).status,200);
 assert.equal(f.delivery.email,'new@example.test');const verified=await person('/api/auth/verify-email',{token:verificationToken(f)});assert.equal(verified.data.identity.id,identity.id);
 const me=(await person('/api/account/me')).data;assert.equal(me.profile.handle,'v-member');assert.equal(me.profile.email,'new@example.test');assert.equal(me.profile.emailVerified,true);
});
test('verification email limits, expiry, disable and email collisions are enforced',async()=>{
 const f=fixture(),admin=f.client(true),person=f.client(),identity=await signin(f,person),id=await profile(f,identity.id);
 assert.equal((await admin('/api/admin/accounts',{id,action:'send-verification'})).status,429);
 f.advance();await admin('/api/admin/accounts',{id,action:'send-verification'});const expired=verificationToken(f);f.advance(600001);
 assert.equal((await person('/api/auth/verify-email',{token:expired})).status,400);
 await admin('/api/admin/accounts',{id,action:'send-verification'});const disabled=verificationToken(f);await admin('/api/admin/accounts',{id,action:'disable'});
 assert.equal((await person('/api/auth/verify-email',{token:disabled})).status,400);
 assert.equal((await admin('/api/admin/accounts',{id,action:'send-verification'})).status,409);
 const other=f.client();await other('/api/auth/start',{email:'other@example.test'});
 assert.equal((await admin('/api/admin/accounts',{id,action:'change-email',email:'other@example.test',confirm:'member@example.test'})).status,409);
});
test('verification delivery failure cleans up the token without exposing provider errors',async()=>{
 const f=fixture({failVerification:true}),admin=f.client(true),person=f.client(),identity=await signin(f,person),id=await profile(f,identity.id);f.advance();
 const result=await admin('/api/admin/accounts',{id,action:'send-verification'});assert.equal(result.status,503);assert.ok(!JSON.stringify(result.data).includes('private provider response'));
 assert.equal(Object.keys(f.states.get('account-auth-v1').verifications).length,0);
 assert.equal((await person('/api/auth/verify-email',{token:verificationToken(f)})).status,400);
});
