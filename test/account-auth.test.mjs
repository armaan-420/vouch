import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmailAuth} from '../lib/account-auth.mjs';
import {createResendDelivery} from '../lib/email-delivery.mjs';
function fixture(options={}){
 let state,time=1000000;
 const storage={scope(name,initial){assert.equal(name,'account-auth-v1');state=initial();return this},async read(){return structuredClone(state)},async transaction(fn){const next=structuredClone(state);const result=fn(next);state=next;return result}};
 const auth=createEmailAuth({store:storage,previewDelivery:true,now:()=>time,...options});
 return {auth,get state(){return state},advance(ms){time+=ms}};
}
function browser(f,origin='http://127.0.0.1:4173'){
 const jar={};
 const request=(path,body,headers={})=>new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; '),...(body===undefined?{}:{origin,'content-type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 return {jar,request,async call(path,body,headers){const res=await f.auth.handle(request(path,body,headers));for(const c of res.headers.getSetCookie()){const [key,value]=c.split(';')[0].split('=');jar[key]=value}return {status:res.status,data:await res.json(),headers:res.headers}}};
}
async function signIn(b,email='member@example.com'){
 const start=await b.call('/api/auth/start',{email});assert.equal(start.status,200);
 const result=await b.call('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode});assert.equal(result.status,200);return result.data.identity;
}
test('local email-code flow binds browser, hashes secrets and preserves stable returning identity',async()=>{
 const f=fixture(),a=browser(f),b=browser(f);
 const start=await a.call('/api/auth/start',{email:' Member@Example.com '});assert.match(start.data.previewCode,/^\d{6}$/);
 assert.equal((await b.call('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode})).status,400);
 const verified=await a.call('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode});assert.equal(verified.status,200);
 const id=verified.data.identity.id;assert.equal((await f.auth.getIdentity(a.request('/'))).id,id);
 assert.equal((await a.call('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode})).status,400);
 assert.equal(Object.values(f.state.accounts)[0].email,'member@example.com');
 assert.equal(verified.data.identity.email,'member@example.com');
 assert.equal(Object.keys(f.state.challenges).length,0);
 assert.ok(!JSON.stringify(f.state).includes(a.jar.vouch_account_session));
 const logout=await a.call('/api/auth/logout',{});assert.equal(logout.status,200);assert.equal(await f.auth.getIdentity(a.request('/')),null);
 f.advance(60001);assert.equal((await signIn(a)).id,id);
});
test('wrong codes exhaust attempts and expiry and resend are enforced',async()=>{
 const f=fixture(),a=browser(f);
 const start=await a.call('/api/auth/start',{email:'member@example.com'});
 assert.equal((await a.call('/api/auth/start',{email:'member@example.com'})).status,429);
 const wrong=start.data.previewCode==='000000'?'111111':'000000';
 for(let i=0;i<5;i++)assert.equal((await a.call('/api/auth/verify',{challengeId:start.data.challengeId,code:wrong})).status,i===4?429:400);
 assert.equal((await a.call('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode})).status,429);
 f.advance(60001);const next=await a.call('/api/auth/start',{email:'member@example.com'});f.advance(600001);
 assert.equal((await a.call('/api/auth/verify',{challengeId:next.data.challengeId,code:next.data.previewCode})).status,400);
});
test('sessions expire after idle or absolute lifetime and logout revokes stolen cookie',async()=>{
 const f=fixture({idleMs:1000,absoluteMs:3000}),a=browser(f);await signIn(a);
 const stolen=a.request('/');await a.call('/api/auth/logout',{});assert.equal(await f.auth.getIdentity(stolen),null);
 f.advance(60001);await signIn(a);f.advance(1001);assert.equal(await f.auth.getIdentity(a.request('/')),null);
 f.advance(60001);await signIn(a);for(let i=0;i<3;i++){f.advance(900);assert.ok(await f.auth.getIdentity(a.request('/')))}
 f.advance(301);assert.equal(await f.auth.getIdentity(a.request('/')),null);
});
test('preview delivery cannot authenticate public hosts and cross-origin mutations fail closed',async()=>{
 const f=fixture(),a=browser(f),remote=browser(f,'https://vouch.example');
 assert.equal((await remote.call('/api/auth/status')).data.available,false);
 assert.equal((await remote.call('/api/auth/start',{email:'member@example.com'})).status,503);
 assert.equal((await a.call('/api/auth/start',{email:'member@example.com'},{origin:'https://evil.example'})).status,403);
 assert.equal((await a.call('/api/auth/start',{email:'member@example.com'},{'sec-fetch-site':'cross-site'})).status,403);
 const missingOrigin=await f.auth.handle(new Request('http://127.0.0.1:4173/api/auth/start',{method:'POST',body:'{}'}));assert.equal(missingOrigin.status,403);
 assert.equal(await f.auth.handle(a.request('/api/unrelated')),null);
});
test('configured delivery sends code without exposing it and sets secure cookie',async()=>{
 let delivery;const f=fixture({previewDelivery:false,secret:'test-secret-with-more-than-thirty-two-characters',sendCode:async input=>{delivery=input}}),a=browser(f,'https://vouch.example');
 const start=await a.call('/api/auth/start',{email:'member@example.com'});assert.equal(start.status,200);assert.equal(start.data.previewCode,undefined);assert.equal(delivery.email,'member@example.com');
 const result=await a.call('/api/auth/verify',{challengeId:start.data.challengeId,code:delivery.code});assert.equal(result.status,200);
 assert.match(result.headers.get('set-cookie'),/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure/);
});
test('delivery failures do not leave usable challenge or leak provider responses',async()=>{
 const f=fixture({previewDelivery:false,secret:'test-secret-with-more-than-thirty-two-characters',sendCode:async()=>{throw Error('private provider response')}}),a=browser(f,'https://vouch.example');
 const result=await a.call('/api/auth/start',{email:'member@example.com'});assert.equal(result.status,503);assert.equal(Object.keys(f.state.challenges).length,0);assert.ok(!result.data.error.includes('private'));
});
test('Resend adapter uses server-side HTTPS delivery and fails on provider rejection',async()=>{
 let sent;const send=createResendDelivery({apiKey:'private-test-key',from:'Vouch <signin@example.com>',fetcher:async(url,options)=>{sent={url,options};return new Response('{}')}});
 await send({email:'member@example.com',code:'123456',expiresIn:600});assert.equal(sent.url,'https://api.resend.com/emails');assert.equal(sent.options.headers.Authorization,'Bearer private-test-key');assert.ok(JSON.parse(sent.options.body).text.includes('123456'));
 assert.equal(createResendDelivery({}),undefined);
 const failure=createResendDelivery({apiKey:'key',from:'sender@example.com',fetcher:async()=>new Response('private rejection',{status:403})});await assert.rejects(failure({email:'x@example.com',code:'123456',expiresIn:600}),/Email delivery failed/);
});
test('participant identity ignores injected headers and duplicate cookies; reauthentication rotates device session',async()=>{
 const f=fixture(),a=browser(f);
 assert.equal(await f.auth.getIdentity(a.request('/',undefined,{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'forged@example.com'})),null);
 await signIn(a);const old=a.request('/'),token=a.jar.vouch_account_session;
 assert.equal(await f.auth.getIdentity(a.request('/',undefined,{cookie:`vouch_account_session=${token}; vouch_account_session=${token}`})),null);
 f.advance(60001);await signIn(a);assert.notEqual(a.jar.vouch_account_session,token);assert.equal(await f.auth.getIdentity(old),null);
 const logout=await a.call('/api/auth/logout',{});const cookies=logout.headers.getSetCookie();
 assert.ok(cookies.some(x=>x.startsWith('vouch_visitor=;')&&x.includes('Max-Age=0')));
 assert.ok(cookies.some(x=>x.startsWith('vouch_session=;')&&x.includes('Max-Age=0')));
});
test('switching accounts clears previous browser votes but first signup preserves anonymous edit',async()=>{
 const f=fixture(),a=browser(f);a.jar.vouch_visitor=crypto.randomUUID();
 const first=await a.call('/api/auth/start',{email:'first@example.com'});
 const firstVerified=await a.call('/api/auth/verify',{challengeId:first.data.challengeId,code:first.data.previewCode});
 assert.ok(!firstVerified.headers.getSetCookie().some(x=>x.startsWith('vouch_visitor=')));
 assert.ok(a.jar.vouch_visitor);
 const second=await a.call('/api/auth/start',{email:'second@example.com'});
 const switched=await a.call('/api/auth/verify',{challengeId:second.data.challengeId,code:second.data.previewCode});
 assert.notEqual(switched.data.identity.id,firstVerified.data.identity.id);
 assert.equal(a.jar.vouch_visitor,'');assert.equal(a.jar.vouch_session,'');
});

test('session reads coalesce activity writes, still check revocation and enforce expiry',async()=>{
 const f=fixture(),a=browser(f);await signIn(a);
 const session=()=>Object.values(f.state.sessions)[0];const initial=session().lastAt;
 f.advance(30000);const request=a.request('/');
 const [one,two]=await Promise.all([f.auth.getIdentity(request),f.auth.getIdentity(request)]);
 assert.equal(one.id,two.id);assert.equal(session().lastAt,initial,'recent requests do not rewrite shared auth state');
 f.advance(30000);assert.ok(await f.auth.getIdentity(a.request('/')));assert.equal(session().lastAt,initial+60000);
 const stolen=a.request('/');await a.call('/api/auth/logout',{});assert.equal(await f.auth.getIdentity(stolen),null);
});
test('Resend verification email contains the confirmation link and no undefined code',async()=>{
 let payload;const send=createResendDelivery({apiKey:'test',from:'test@example.test',fetcher:async(url,options)=>{payload=JSON.parse(options.body);return new Response('{}');}});
 await send({email:'member@example.test',verificationUrl:'https://v4ch.app/account#verify-email=test-token',expiresIn:600});
 assert.equal(payload.subject,'Verify your Vouch email');assert.ok(payload.text.includes('https://v4ch.app/account#verify-email=test-token'));assert.ok(!payload.text.includes('undefined'));
});
