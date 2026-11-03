import {createExperimentApi} from './experiment-api.mjs';
import {createAccountsApi} from './accounts.mjs';
import {createEmailAuth} from './account-auth.mjs';
import {readJson} from './request-json.mjs';

// Account data is isolated from historical experiment records. Account endpoints
// remain available after an experiment closes.
export function createApplicationApi({store,search,authorizeAdmin,storageLabel='d1',authOptions={},photoStorage}){
  const auth=createEmailAuth({store,...authOptions});
  const accounts=createAccountsApi({store,getIdentity:auth.getIdentity,photoStorage});
  const experiments=createExperimentApi({store,search,authorizeAdmin,storageLabel});
  return async original=>{
    const url=new URL(original.url);
    let request=original,replacementVisitor=null;
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
      // A profile sync can be retried from review without losing the saved vote.
      try{await accounts.syncAccountOpinions(request,url.searchParams.get('experiment')||'sunscreen',answer)}
      catch{response.headers.set('X-Vouch-Profile-Sync','retry')}
    }
    return finalize(response);
  };
}
