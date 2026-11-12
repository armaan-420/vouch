import {validEmail} from './tester-identity.mjs';
import {initialAccounts} from './accounts.mjs';
import {readJson} from './request-json.mjs';
export const accountKey=async subject=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subject)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'}});
export function createAdminAccounts({store,auth,authorizeAdmin,photoStorage}){
 const profiles=()=>store.scope('accounts-v1',initialAccounts);
 async function list(){
  const data=await (await profiles()).read(),emailAccounts=await auth.adminSnapshot(),rows=[],used=new Set();
  for(const a of emailAccounts){
   const key=a.id?await accountKey(a.id):null;
   const matches=Object.entries(data.accounts).filter(([id,p])=>!p.deletedAt&&(id===key||!a.verified&&!p.emailVerified&&p.email===a.email));
   if(!matches.length)matches.push([null,null]);
   for(const [id,p]of matches){if(id)used.add(id);rows.push(row(id,p,a));}
  }
  for(const [id,p]of Object.entries(data.accounts))if(!used.has(id)&&!p.deletedAt){const a=p.email&&!emailAccounts.some(a=>a.email===p.email)?{email:p.email,emailHash:await accountKey(p.email.trim().toLowerCase()),verified:!!p.emailVerified}:null;rows.push(row(id,p,a));}
  return rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 }
 function row(key,p,a){return {id:key||'auth:'+a.emailHash,profileKey:key,emailHash:a?.emailHash,displayName:p?.displayName||'No profile yet',handle:p?.handle||null,email:a?.email||p?.email||null,verified:!!a?.verified||!!p?.emailVerified,status:a?.disabledAt||p?.disabledAt?'disabled':a?.verified||p?.emailVerified?'active':'unverified',type:p?.browserProfile?'Browser profile':'Email account',createdAt:p?.createdAt||(a?.createdAt?new Date(a.createdAt).toISOString():null),lastSignInAt:a?.lastSignInAt?new Date(a.lastSignInAt).toISOString():null,visibility:p?.visibility||null,vouches:Object.values(p?.opinions||{}).filter(o=>o.verdict==='yes').length,sessions:a?.sessions||0,canResend:!!a?.canResend};}
 return async request=>{
  if(new URL(request.url).pathname!=='/api/admin/accounts')return null;
  try{
   if(!await authorizeAdmin?.(request))throw fail('Enter the admin PIN to continue.',401);
   if(request.method==='GET'){const accounts=await list();return json({accounts:accounts.map(({emailHash,profileKey,...a})=>a)});}
   if(request.method!=='POST')throw fail('Method not allowed.',405);
   if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw fail('Request origin not allowed.',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail('Send JSON data.',415);
   const input=await readJson(request,2048);
   if(!['resend','disable','enable','delete','revoke','send-verification','change-email','add-email'].includes(input.action))throw fail('Choose a valid account action.');
   const target=(await list()).find(a=>a.id===input.id);if(!target)throw fail('Account not found. Refresh the table.',404);
   if((input.action==='delete'||input.action==='change-email'&&target.email)&&input.confirm!==(target.email||target.handle||target.id))throw fail('Enter the current account email or handle to confirm this action.');
   if(input.action==='send-verification'&&!target.email)throw fail('Add an email address first.',409);
   let newEmail;
   if(['change-email','add-email'].includes(input.action)){
    if(input.action==='add-email'&&target.email)throw fail('This account already has an email. Refresh the table and use Change email.',409);
    newEmail=String(input.email||'').trim().toLowerCase();if(!validEmail(newEmail))throw fail('Enter a valid email address.');
    if(!target.email&&String(input.confirm||'').trim().toLowerCase()!==newEmail)throw fail('The email addresses do not match. Enter the new email in both fields.');
    if(newEmail===target.email)throw fail('Enter a different email address.');
    if((await list()).some(a=>a.id!==target.id&&a.email?.toLowerCase()===newEmail))throw fail('That email is already associated with another account.',409);
   }
   if(['resend','revoke'].includes(input.action)&&!target.emailHash)throw fail('This browser profile has no email sign-in session.',409);
   if(input.action==='resend'&&!target.canResend)throw fail('Ask the user to start sign-in in their browser first.',409);
   // Revoke access first. Profile failures can be retried without restoring sessions.
   if(target.emailHash||input.action==='send-verification')await auth.adminAction(target.emailHash||await accountKey(target.email.trim().toLowerCase()),input.action==='add-email'?'change-email':input.action,request,target.email,newEmail);
   if(target.profileKey&&['disable','enable','delete','change-email','add-email'].includes(input.action)){
    const db=await profiles();let photo;
    await db.transaction(data=>{
     const p=data.accounts[target.profileKey];if(!p||p.deletedAt)return;
     if(['change-email','add-email'].includes(input.action)){
    if(input.action==='add-email'&&target.email)throw fail('This account already has an email. Refresh the table and use Change email.',409);p.email=newEmail;p.emailVerified=false;p.whartonEarlyTester=false;}
     if(input.action==='disable')p.disabledAt=Date.now();
     if(input.action==='enable')delete p.disabledAt;
     if(input.action==='delete'){
      photo=p.photo;
      // Retain an opaque tombstone and ownership bindings to prevent old browser
      // credentials from reclaiming deleted profile history. Experiment votes remain.
      data.accounts[target.profileKey]={deletedAt:Date.now()};
      for(const [id,t]of Object.entries(data.tickets||{}))if(t.usedBy===target.profileKey)delete data.tickets[id];
     }
    });
    if(photo)await photoStorage?.delete(photo);
   }
   return json({ok:true,message:input.action==='resend'?'Code resent to the existing sign-in attempt.':input.action==='send-verification'?'Verification email sent.':['change-email','add-email'].includes(input.action)?'Email saved. Send a verification email to verify the new address.':'Account updated.'});
  }catch(error){return json({error:error.status?error.message:'Could not update accounts. Refresh and try again.'},error.status||503);}
 };
}
