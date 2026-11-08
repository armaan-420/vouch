import {readJson} from './request-json.mjs';

export const ADMIN_SESSION_MS=24*60*60*1000;
const COOKIE='vouch_admin_session';
const WINDOW=15*60*1000;
const bytes=value=>new TextEncoder().encode(value);
const hex=value=>Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',bytes(value)));
const fail=(message,status)=>Object.assign(Error(message),{status});
const sameOrigin=request=>request.headers.get('origin')===new URL(request.url).origin&&request.headers.get('sec-fetch-site')!=='cross-site';
const json=(data,status=200,cookies=[])=>{const headers=new Headers({'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});for(const cookie of cookies)headers.append('Set-Cookie',cookie);return new Response(JSON.stringify(data),{status,headers});};

// Only hashes of random bearer tokens are stored. Sessions have a fixed expiry,
// independent of browser cookie expiry, and changing the PIN invalidates them.
export function createAdminAuth({store,pin,now=Date.now}){
 const configured=typeof pin==='string'&&/^\d{4}$/.test(pin);
 const storage=Promise.resolve(store.scope('admin-auth-v1',()=>({sessions:{},rates:{}})));
 const cookie=(request,value,maxAge)=>`${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
 async function tokenHash(request){
  const values=(request.headers.get('cookie')||'').split(';').map(c=>c.trim()).filter(c=>c.startsWith(COOKIE+'='));
  const token=values.length===1?values[0].slice(COOKIE.length+1):'';
  return /^[a-f0-9]{64}$/.test(token)?digest(token):null;
 }
 async function authorize(request){
  if(!configured||!['GET','HEAD'].includes(request.method)&&!sameOrigin(request))return false;
  const hash=await tokenHash(request);if(!hash)return false;
  const session=(await(await storage).read()).sessions[hash];
  return !!session&&session.expiresAt>now()&&session.pinHash===await digest(pin);
 }
 async function handle(request){
  const path=new URL(request.url).pathname;
  if(!['/api/admin/auth/login','/api/admin/auth/logout','/api/admin/auth/status'].includes(path))return null;
  try{
   if(path.endsWith('/status')){if(request.method!=='GET')throw fail('Method not allowed.',405);return json({authenticated:await authorize(request)});}
   if(request.method!=='POST')throw fail('Method not allowed.',405);
   if(!sameOrigin(request))throw fail('Open Vouch in this browser and try again.',403);
   if(!configured)throw fail('Admin access is unavailable. Please try again later.',503);
   const db=await storage;
   if(path.endsWith('/logout')){const hash=await tokenHash(request);if(hash)await db.transaction(d=>{delete d.sessions[hash];});return json({ok:true},200,[cookie(request,'',0)]);}
   const input=await readJson(request,1024),time=now(),pinHash=await digest(pin);
   const correct=typeof input.pin==='string'&&await digest(input.pin)===pinHash;
   const ipHash=await digest('admin-login:'+ (request.headers.get('cf-connecting-ip')||new URL(request.url).hostname));
   const token=hex(crypto.getRandomValues(new Uint8Array(32))),hash=await digest(token);
   const result=await db.transaction(d=>{
    for(const [key,s]of Object.entries(d.sessions))if(s.expiresAt<=time||s.pinHash!==pinHash)delete d.sessions[key];
    for(const [key,r]of Object.entries(d.rates))if(r.expiresAt<=time)delete d.rates[key];
    const rate=d.rates[ipHash]||{count:0,expiresAt:time+WINDOW};
    if(rate.count>=5)return 429;
    rate.count++;d.rates[ipHash]=rate;
    if(!correct)return 401;
    delete d.rates[ipHash];d.sessions[hash]={expiresAt:time+ADMIN_SESSION_MS,pinHash};return 200;
   });
   if(result===429)throw fail('Too many attempts. Please try again in 15 minutes.',429);
   if(result!==200)throw fail('Incorrect PIN. Please try again.',401);
   return json({ok:true,expiresAt:time+ADMIN_SESSION_MS},200,[cookie(request,token,86400)]);
  }catch(error){return json({error:error.status?error.message:'Admin access is unavailable. Please try again.'},error.status||503);}
 }
 return {authorize,handle};
}
