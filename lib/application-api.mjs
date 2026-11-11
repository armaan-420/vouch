import {testerIdentity} from './tester-identity.mjs';
import {createFeedbackApi} from './feedback-api.mjs';
import {createSuggestions} from './auto-experiments/api.mjs';
import {hydrateResponse} from './catalog/hydrate.mjs';
import {createExperimentApi} from './experiment-api.mjs';
import {createAccountsApi} from './accounts.mjs';
import {createEmailAuth} from './account-auth.mjs';
import {readJson} from './request-json.mjs';

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
    const profiles=await (await store.scope('accounts-v1',()=>({accounts:{}}))).read();
    return profiles.accounts[key]?.displayName||'Vouch member';
  },...autoOptions});
  const getIdentity=async request=>await auth.getIdentity(request)||testerIdentity(request);
  const accounts=createAccountsApi({store,getIdentity,photoStorage});
  const experiments=createExperimentApi({store,search,authorizeAdmin,storageLabel});
  const handle=async original=>{
    const url=new URL(original.url);
    let request=original,replacementVisitor=null;
    await accounts.acceptVerifiedIdentity(original,await auth.getIdentity(original));
    // An expired or switched account must not inherit another person's browser
    // identity. Rotate before reads as well as writes, while retaining old data.
    if(await accounts.needsFreshVisitor(original)){
      replacementVisitor=crypto.randomUUID();
      const headers=new Headers(original.headers);
      const cookies=(headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x&&!/^vouch_(visitor|session)=/.test(x));
      cookies.push('vouch_visitor='+replacementVisitor);headers.set('cookie',cookies.join('; '));
      request=new Request(original,{headers});
    }
    const finalize=response=>{
      if(replacementVisitor&&response){
        const secure=url.protocol==='https:'?'; Secure':'';
        response.headers.append('Set-Cookie',`vouch_visitor=${replacementVisitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
        // Experiment APIs may already have supplied a new matching visit session.
        if(!response.headers.getSetCookie().some(c=>c.startsWith('vouch_session=')))response.headers.append('Set-Cookie',`vouch_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
      }
      return response;
    };
    const suggestion=await suggestions.handle(request);
    if(suggestion)return finalize(suggestion);
    const feedbackResponse=await feedback(request);
    if(feedbackResponse)return finalize(feedbackResponse);
    const authenticated=await auth.handle(request);
    if(authenticated)return finalize(authenticated);
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
  const api=async request=>hydrateResponse(await handle(request),search);
  api.advanceSuggestions=suggestions.advance;
  return api;
}
