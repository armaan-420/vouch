import {createPilotShare} from './pilot-share.mjs';
import {createPilotEvents} from './pilot-events.mjs';
import {createPilotMetrics} from './pilot-metrics.mjs';
import {loadCategoryRegistry} from './category-registry.mjs';
import {catalogApi} from './catalog/api.mjs';
import {globalSearch,invalidateSearchIndex} from './global-search.mjs';
import {discoverySearch} from './discovery-search.mjs';
import {testerIdentity} from './tester-identity.mjs';
import {createFeedbackApi} from './feedback-api.mjs';
import {createSuggestions} from './auto-experiments/api.mjs';
import {hydrateResponse} from './catalog/hydrate.mjs';
import {createExperimentApi,initialRegistry} from './experiment-api.mjs';
import {createAccountsApi,initialAccounts} from './accounts.mjs';
import {createEmailAuth} from './account-auth.mjs';
import {accountKey,createAdminAccounts} from './admin-accounts.mjs';
import {verifiedWharton} from './contributor-leaderboard.mjs';
import {readJson} from './request-json.mjs';
import {handleWhartonDemo} from './wharton-demo.mjs';

// Account data is isolated from historical experiment records. Account endpoints
// remain available after an experiment closes.
export function createApplicationApi({store,search,authorizeAdmin,storageLabel='d1',authOptions={},photoStorage,autoOptions={}}){
  const feedback=createFeedbackApi({store,authorizeAdmin});
  const auth=createEmailAuth({store,...authOptions});
  const suggestions=createSuggestions({store,search,authorizeAdmin,getSubmitter:async request=>{
    const identity=await auth.getIdentity(request),subject=identity?.subject||identity?.id;
    if(!subject)return null;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subject));
    const key=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
    const profiles=await (await store.scope('accounts-v1',initialAccounts)).read();
    return profiles.accounts[key]?.displayName||'Vouch member';
  },...autoOptions});
  const allowed=async identity=>{
    if(!identity)return null;
    const key=await accountKey(identity.subject||identity.id),data=await (await store.scope('accounts-v1',initialAccounts)).read();
    return data.accounts[key]?.disabledAt||data.accounts[key]?.deletedAt?null:identity;
  };
  const getIdentity=async request=>allowed(await auth.getIdentity(request)||testerIdentity(request));
  const accountStore=async()=>store.scope('accounts-v1',initialAccounts);
  const registryStore=async()=>store.scope('experiment-registry',initialRegistry);
  const getAccount=async request=>{
    const identity=await getIdentity(request);
    const key=identity&&!identity.guest?await accountKey(identity.subject||identity.id):null;
    return {key,account:key?(await (await accountStore()).read()).accounts[key]:null};
  };

  const pilotEvents=createPilotEvents({store,getAccount,accountStore});
  const pilotMetrics=createPilotMetrics({store,authorizeAdmin,accountStore,registryStore});
  const adminAccounts=createAdminAccounts({store,auth,authorizeAdmin,photoStorage});
  const accounts=createAccountsApi({store,getIdentity,photoStorage,search,authorizeAdmin});
  const experiments=createExperimentApi({store,search,authorizeAdmin,storageLabel});
  const pilotShare=createPilotShare({store,getAccount,accountStore,registryStore,
    productData:async(request,id)=>hydrateResponse(await accounts(new Request(new URL('/api/products/'+encodeURIComponent(id),request.url),{headers:request.headers})),search),
    offers:async(request,id)=>catalogApi(new Request(new URL('/api/catalog/items/'+encodeURIComponent(id),request.url)),search,{global:true})
  });
  const handle=async original=>{
    const demo=await handleWhartonDemo(original,handle);
    if(demo)return demo;
    const url=new URL(original.url);
    let request=original,replacementVisitor=null;
    if(url.pathname.startsWith('/share/')||url.pathname.startsWith('/api/pilot-share/'))return pilotShare(original);
    if(url.pathname==='/api/admin/pilot-metrics')return pilotMetrics(original);
    const people=await adminAccounts(original);if(people)return people;
    // Organizer review must not wait for participant identity migration.
    if(url.pathname.startsWith('/api/admin/suggestions'))return suggestions.handle(original);
    await accounts.acceptVerifiedIdentity(original,await allowed(await auth.getIdentity(original)));
    // An expired or switched account must not inherit another person's browser
    // identity. Rotate before reads as well as writes, while retaining old data.
    if(await accounts.needsFreshVisitor(original)){
      replacementVisitor=crypto.randomUUID();
      const headers=new Headers(original.headers);
      const cookies=(headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x&&!/^vouch_(visitor|session)=/.test(x));
      cookies.push('vouch_visitor='+replacementVisitor);headers.set('cookie',cookies.join('; '));
      // Vinext may supply a Request wrapper that Cloudflare cannot clone directly.
      // Auth start uses the original request's cached JSON and does not read the visitor.
      if(url.pathname!=='/api/auth/start')request=new Request(original.url,{method:original.method,headers,...(['GET','HEAD'].includes(original.method)?{}:{body:original.body,duplex:'half'})});
    }
    const finalize=response=>{
      if(request.method==='POST'&&response?.ok)invalidateSearchIndex(store);
      if(replacementVisitor&&response){
        const secure=url.protocol==='https:'?'; Secure':'';
        response.headers.append('Set-Cookie',`vouch_visitor=${replacementVisitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
        // Experiment APIs may already have supplied a new matching visit session.
        if(!response.headers.getSetCookie().some(c=>c.startsWith('vouch_session=')))response.headers.append('Set-Cookie',`vouch_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
      }
      return response;
    };
    if(url.pathname==='/api/pilot-events'){
      const response=await pilotEvents(request);
      // Telemetry writes do not change the public search index.
      if(replacementVisitor&&!response.headers.has('Set-Cookie'))response.headers.append('Set-Cookie',`vouch_visitor=${replacementVisitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`);
      return response;
    }
    const suggestion=await suggestions.handle(request);
    if(suggestion){
      if(suggestion.ok&&url.pathname==='/api/suggestions'&&request.method==='POST'){
        try{
          const input=await readJson(request,4096);
          if(input.whartonPilot===true){
            const {key,account}=await getAccount(request);
            if(account&&verifiedWharton(account))await (await accountStore()).transaction(data=>{
              if(data.accounts[key])data.accounts[key].pilotSuggestedAt??=new Date().toISOString();
            });
          }
        }catch{}
      }
      return finalize(suggestion);
    }
    const feedbackResponse=await feedback(request);
    if(feedbackResponse)return finalize(feedbackResponse);
    const authenticated=await auth.handle(request);
    if(authenticated)return finalize(authenticated);
    if(!url.searchParams.has('experiment')&&(url.pathname==='/api/catalog/config'||url.pathname==='/api/catalog/lookup'||url.pathname.startsWith('/api/catalog/items/')))return finalize(await catalogApi(request,search,{global:true,category:'Products',...(url.pathname==='/api/catalog/config'?{}:{categoryRegistry:await loadCategoryRegistry(store,await store.scope('experiment-registry',initialRegistry))})}));
    if(url.pathname==='/api/search')return finalize(await globalSearch({store,accounts,request,search}));
    if(url.pathname==='/api/discover')return finalize(await discoverySearch({store,accounts,request}));
    const account=await accounts(request);
    if(account)return finalize(account);
    let answer;
    if(request.method==='POST'&&(url.pathname==='/api/events'||url.pathname==='/api/community/vote')){
      try{const body=await readJson(request);if(url.pathname==='/api/community/vote'||body.type==='answer')answer=body.productId}
      catch(error){return finalize(Response.json({error:error.status?error.message:'Invalid request.'},{status:error.status||400,headers:{'Cache-Control':'no-store'}}))}
    }
    const response=await experiments(request);
    if(response?.ok&&answer){
      // The first answer can create the visitor cookie; use that same identity
      // for account sync before the browser receives the response.
      let syncRequest=request;
      const visitorCookie=response.headers.getSetCookie().find(c=>c.startsWith('vouch_visitor=')&&!c.startsWith('vouch_visitor=;'))?.split(';')[0];
      if(visitorCookie){const headers=new Headers(request.headers);headers.set('cookie',(headers.get('cookie')||'').split(';').map(c=>c.trim()).filter(c=>c&&!c.startsWith('vouch_visitor=')).concat(visitorCookie).join('; '));syncRequest=new Request(request.url,{headers})}
      try{
        const result=await accounts.syncAccountOpinions(syncRequest,url.searchParams.get('experiment')||'sunscreen',answer);
        const identity=await getIdentity(syncRequest);
        const profileSync=result.connected?'saved':identity?'review-required':'signed-out';
        return finalize(Response.json({...await response.json(),profileSync},{status:response.status,headers:response.headers}));
      }catch{
        return finalize(Response.json({error:'Your experiment answer was recorded, but your collection could not be updated. Please try that answer again.',experimentSaved:true},{status:503,headers:response.headers}));
      }
    }
    return finalize(response);
  };
  const api=async request=>hydrateResponse(await handle(request),search,{cachedOnly:request.method==='GET'&&['/api/admin/suggestions','/api/search'].includes(new URL(request.url).pathname)});
  api.advanceSuggestions=suggestions.advance;
  return api;
}
