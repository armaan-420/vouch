import {accountKey} from './admin-accounts.mjs';
import {initialAccounts} from './accounts.mjs';
import {verifiedWharton} from './contributor-leaderboard.mjs';
import {testerIdentity} from './tester-identity.mjs';
import {whartonDemoId} from './wharton-demo.mjs';
import {withInvitePreview} from './account-pages.mjs';

const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function readPageAccount(request,{store,auth}){
 if(whartonDemoId(request))return {state:'demo'};
 const session=await auth.peekIdentity(request);
 const identity=session||testerIdentity(request);
 if(!identity)return {state:'signed-out'};
 const key=await accountKey(identity.subject||identity.id);
 const data=await (await store.scope('accounts-v1',initialAccounts)).read();
 const account=data.accounts[key];
 if(account?.disabledAt||account?.deletedAt)return {state:'signed-out'};
 const verificationRequired=!!account?.verificationRequired;
 return {
  state:verificationRequired?'verification':'signed-in',
  initial:Array.from(account?.displayName?.trim()||'V')[0].toUpperCase(),
  photo:account?.photo&&!verificationRequired?'/api/account/photos/'+account.photo:'',
  home:account&&verifiedWharton(account)&&!account.browserProfile&&!verificationRequired?'/wharton':'/',
  verified:!!session,
 };
}

export async function resolvePageAccount(request,readAccount){
 try{return await readAccount?.(request)||{state:'pending'};}catch{return {state:'pending'};}
}

function accountLink(account,experimentId){
 const {state,initial,photo,home}=account;
 const member=state==='signed-in'||state==='verification';
 const query=new URLSearchParams();
 if(experimentId)query.set('experiment',experimentId);
 if(state==='signed-out')query.set('signin','1');
 const href=state==='demo'?'/wharton':'/account'+(query.size?'?'+query:'');
 const label=state==='demo'?'Wharton demo home':member?'My profile':state==='signed-out'?'Sign in':'Your account';
 const content=state==='demo'?'Demo':member?'<span aria-hidden="true">'+escapeHtml(initial||'V')+'</span>':state==='signed-out'?'Sign in':'';
 return '<a class="leaderboard-link'+(member?' profile-link':'')+'" href="'+escapeHtml(href)+'" aria-label="'+label+'" data-account-state="'+state+'"'+
  (photo?' data-account-photo="'+escapeHtml(photo)+'"':'')+
  (home==='/wharton'?' data-account-home="/wharton"':'')+'>'+content+'</a>';
}

function pageLoading(label,path){
 if(path.startsWith('/products/')){
  return '<section class="account-shell"><div class="product-loading" role="status" aria-label="'+escapeHtml(label)+'"><span></span><span></span><span></span><div><i></i><i></i></div></div></section>';
 }
 return '<div class="page-loading"><p role="status"><span class="page-loading-ring" aria-hidden="true"></span>'+escapeHtml(label)+'</p></div>';
}

export async function publicPage(html,request,readAccount,{account,experimentId,loading}={}){
 const identity=account||await resolvePageAccount(request,readAccount);
 const path=new URL(request.url).pathname;
 const lockAccountNav=/^\/account\/?$/.test(path)&&(!identity.verified||identity.state==='verification');
 const page=lockAccountNav?html.replace('data-site-nav>','data-site-nav data-account-nav-locked>'):html;
 const markup=page.replace(/<a class="leaderboard-link"[^>]*>[^<]*<\/a>/,()=>accountLink(identity,experimentId))
  .replace('<!-- page-loading -->',()=>loading?pageLoading(loading,path):'');
 return new Response(withInvitePreview(markup,path),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
}

export function accountLoading(path){
 if(path.startsWith('/products/'))return 'Opening product…';
 if(path.startsWith('/profiles/'))return 'Opening profile…';
 if(path.startsWith('/community-leaderboard'))return 'Opening the leaderboard…';
 return 'Opening your account…';
}
