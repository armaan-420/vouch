export async function runnerAuthorized(request,secret){
 if(!secret||request.headers.get('origin'))return false;
 const value=request.headers.get('authorization')||'';
 const digest=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
 const [a,b]=await Promise.all([digest(value),digest('Bearer '+secret)]);
 let different=0;for(let i=0;i<a.length;i++)different|=a[i]^b[i];return different===0;
}
export async function runSuggestions({store,auto,now=Date.now,maxSteps=20,maxMs=20000}){
 const health=await store.scope('suggestion-runner',()=>({}));
 await health.transaction(d=>{d.lastStartedAt=new Date(now()).toISOString();});
 const started=now();let steps=0;
 while(steps<maxSteps&&now()-started<maxMs){const r=await auto.advance();if(!r.advanced)break;steps++;}
 const jobs=Object.values((await(await store.scope('suggestion-jobs',()=>({jobs:{}}))).read()).jobs);
 const counts={active:jobs.filter(j=>['queued','researching','matching'].includes(j.state)).length,failed:jobs.filter(j=>j.state==='failed').length,notificationFailures:jobs.filter(j=>j.notification?.status==='failed').length};
 await health.transaction(d=>{d.lastCompletedAt=new Date(now()).toISOString();d.steps=steps;d.counts=counts;});
 return {ok:true,steps,...counts};
}
