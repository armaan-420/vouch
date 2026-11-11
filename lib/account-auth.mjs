import {testerCookie,isWhartonEmail} from './tester-identity.mjs';
import {readJson} from './request-json.mjs';

const SESSION_COOKIE='vouch_account_session';
const BROWSER_COOKIE='vouch_auth_browser';
const TEN_MINUTES=600000;
const DAY=86400000;
const freshAuth=()=>({version:1,accounts:{},challenges:{},sessions:{},rates:{}});
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const bytes=value=>new TextEncoder().encode(value);
const hex=value=>Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',bytes(value)));
const cookieValue=(request,name)=>{
 const matches=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));
 return matches.length===1?matches[0].slice(name.length+1):null;
};
const validToken=value=>/^[a-f0-9]{64}$/.test(value||'');
const local=request=>{
 const url=new URL(request.url);
 return url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname);
};
function sameOrigin(request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw fail('Open Vouch in this browser and try again.',403);
}
function setCookie(request,name,value,maxAge){
 return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
function code(){let number;do{number=crypto.getRandomValues(new Uint32Array(1))[0]}while(number>=4294000000);return String(number%1000000).padStart(6,'0')}

/** Email participant auth is independent of Sites organizer identity. No email is public. */
export function createEmailAuth({store,sendCode,previewDelivery=false,secret,now=Date.now,idleMs=7*DAY,absoluteMs=30*DAY}={}){
 const storage=Promise.resolve(store.scope('account-auth-v1',freshAuth));
 const configured=typeof secret==='string'&&secret.length>=32&&typeof sendCode==='function';
 let keyPromise;
 const signingKey=()=>keyPromise??=crypto.subtle.importKey('raw',bytes(typeof secret==='string'&&secret.length>=32?secret:'local-preview-only-not-a-production-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signed=async value=>hex(await crypto.subtle.sign('HMAC',await signingKey(),bytes(value)));
 const enabled=request=>configured||previewDelivery&&local(request);
 const identity=account=>account?{id:account.id,subject:account.id,...(account.whartonEarlyTester?{whartonEarlyTester:true}:{})}:null;
 const response=(value,status=200,cookies=[])=>{const headers=new Headers({'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});for(const item of cookies)headers.append('Set-Cookie',item);return new Response(JSON.stringify(value),{status,headers})};
 const identities=new WeakMap();
 async function readIdentity(request){
  if(!enabled(request))return null;
  const token=cookieValue(request,SESSION_COOKIE);if(!validToken(token))return null;
  const hash=await digest(token),time=now(),db=await storage;
  const lookup=data=>{
   const session=data.sessions[hash];
   if(!session||time-session.lastAt>=idleMs||time-session.createdAt>=absoluteMs)return null;
   const account=data.accounts[session.emailHash];return account?{session,account}:null;
  };
  const current=lookup(await db.read());if(!current)return null;
  // Authenticate against storage on every request, but coalesce activity writes.
  // The idle cutoff is conservative by at most one minute; absolute expiry is exact.
  if(time-current.session.lastAt<Math.min(60000,idleMs/4))return identity(current.account);
  return db.transaction(data=>{
   const current=lookup(data);if(!current)return null;
   current.session.lastAt=time;return identity(current.account);
  });
 }
 function getIdentity(request){
  if(!identities.has(request))identities.set(request,readIdentity(request));
  return identities.get(request);
 }
 async function handle(request){
  const path=new URL(request.url).pathname;
  if(!['/api/auth/status','/api/auth/start','/api/auth/verify','/api/auth/logout'].includes(path))return null;
  try{
   if(path==='/api/auth/status'){
    if(request.method!=='GET')throw fail('Method not allowed.',405);
    return response({available:enabled(request),method:'email-code',previewDelivery:previewDelivery&&local(request),identity:await getIdentity(request)});
   }
   if(request.method!=='POST')throw fail('Method not allowed.',405);
   sameOrigin(request);
   if(path!=='/api/auth/logout'&&!enabled(request))throw fail('Email sign-in is not configured yet. Your experiment answers are still saved.',503);
   const db=await storage,time=now();
   if(path==='/api/auth/start'){
    const input=await readJson(request,2048),email=String(input.email||'').trim().toLowerCase();
    if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('Enter a valid email address.');
    const emailHash=await digest(email),challengeId=random(),otp=code(),otpHash=await signed(challengeId+':'+otp);
    const existing=cookieValue(request,BROWSER_COOKIE),browser=validToken(existing)?existing:random(),browserHash=await digest(browser);
    const ipHash=await signed('ip:'+(request.headers.get('cf-connecting-ip')||new URL(request.url).hostname));
    await db.transaction(data=>{
     for(const [id,item]of Object.entries(data.challenges))if(item.expiresAt<=time)delete data.challenges[id];
     for(const [id,item]of Object.entries(data.rates))if(time-item.startedAt>=3600000)delete data.rates[id];
     for(const [id,item]of Object.entries(data.sessions))if(time-item.lastAt>=idleMs||time-item.createdAt>=absoluteMs)delete data.sessions[id];
     const emailRate=data.rates['email:'+emailHash],ipRate=data.rates['ip:'+ipHash];
     if(emailRate&&(time-emailRate.lastAt<60000||emailRate.count>=5)||ipRate&&ipRate.count>=20)throw fail('Please wait before requesting another code.',429);
     for(const key of ['email:'+emailHash,'ip:'+ipHash]){const rate=data.rates[key]||{startedAt:time,count:0};rate.count++;rate.lastAt=time;data.rates[key]=rate}
     for(const [id,item]of Object.entries(data.challenges))if(item.emailHash===emailHash&&item.browserHash===browserHash)delete data.challenges[id];
     data.challenges[challengeId]={emailHash,browserHash,otpHash,whartonEarlyTester:isWhartonEmail(email),attempts:0,expiresAt:time+TEN_MINUTES};
    });
    const preview=previewDelivery&&local(request);
    if(!preview){
     try{await sendCode({email,code:otp,expiresIn:600})}catch{await db.transaction(data=>{delete data.challenges[challengeId]});throw fail('We could not send your code. Your answers are saved; try again later.',503)}
    }
    return response({challengeId,expiresIn:600,...(preview?{previewCode:otp,delivery:'Local test inbox — no email was sent.'}:{})},200,[setCookie(request,BROWSER_COOKIE,browser,86400)]);
   }
   if(path==='/api/auth/verify'){
    const input=await readJson(request,2048),challengeId=String(input.challengeId||''),otp=String(input.code||'');
    const browser=cookieValue(request,BROWSER_COOKIE);
    if(!validToken(challengeId)||!/^\d{6}$/.test(otp)||!validToken(browser))throw fail('Enter the six-digit code from this sign-in attempt.');
    const previousToken=cookieValue(request,SESSION_COOKIE),previousSession=validToken(previousToken)?await digest(previousToken):null;
    const suppliedHash=await signed(challengeId+':'+otp),browserHash=await digest(browser),token=random(),sessionHash=await digest(token),newId=crypto.randomUUID();
    const result=await db.transaction(data=>{
     const challenge=data.challenges[challengeId];
     if(!challenge||challenge.browserHash!==browserHash||challenge.expiresAt<=time)return {error:'This code has expired. Request another code.'};
     if(challenge.attempts>=5)return {error:'Too many attempts. Request another code.',status:429};
     challenge.attempts++;
     if(challenge.otpHash!==suppliedHash)return {error:'That code does not match. Try again.',status:challenge.attempts>=5?429:400};
     let account=data.accounts[challenge.emailHash];
     if(!account)account=data.accounts[challenge.emailHash]={id:newId,createdAt:time};
     if(challenge.whartonEarlyTester)account.whartonEarlyTester=true;
     const previous=previousSession?data.sessions[previousSession]:null;
     const resetBrowser=!!previousSession&&(!previous||previous.emailHash!==challenge.emailHash);
     if(previousSession)delete data.sessions[previousSession];
     data.sessions[sessionHash]={emailHash:challenge.emailHash,createdAt:time,lastAt:time};
     delete data.challenges[challengeId];
     return {identity:identity(account),resetBrowser};
    });
    if(result.error)throw fail(result.error,result.status||400);
    return response({ok:true,identity:result.identity},200,[setCookie(request,SESSION_COOKIE,token,Math.ceil(absoluteMs/1000)),...(result.resetBrowser?[setCookie(request,'vouch_visitor','',0),setCookie(request,'vouch_session','',0)]:[])]);
   }
   const token=cookieValue(request,SESSION_COOKIE);
   if(validToken(token)){const hash=await digest(token);await db.transaction(data=>{delete data.sessions[hash]})}
   return response({ok:true},200,[testerCookie(request,''),setCookie(request,SESSION_COOKIE,'',0),setCookie(request,BROWSER_COOKIE,'',0),setCookie(request,'vouch_visitor','',0),setCookie(request,'vouch_session','',0)]);
  }catch(error){return response({error:error.status?error.message:'Sign-in is temporarily unavailable. Your experiment answers are saved.'},error.status||503)}
 }
 return {handle,getIdentity};
}
