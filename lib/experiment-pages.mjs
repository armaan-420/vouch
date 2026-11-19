import {isExperimentId,experimentPath} from './experiment-paths.mjs';
import {publicPage,resolvePageAccount} from './page-shell.mjs';
export async function experimentPage(request,{home,experiment,api,readAccount}){
 const url=new URL(request.url);
 if(url.pathname==='/'||url.pathname==='/index.html'){
  const legacy=url.searchParams.get('experiment');
  if(legacy&&isExperimentId(legacy)){url.pathname=experimentPath(legacy);url.searchParams.delete('experiment');return Response.redirect(url,308)}
  // Home navigation is rendered only for a verified email session. A provisional
  // browser account is enough to save picks, but does not unlock this menu.
  const account=await resolvePageAccount(request,readAccount);
  const signedOut=home.replace(/<nav class="site-navigation"[\s\S]*?<\/nav>/,'<nav class="site-navigation" aria-label="Account"><a class="leaderboard-link" href="/account?signin=1">Sign in</a></nav>').replace('<script src="/suggestions.js"></script>','').replace('<script src="/site-nav.js"></script>','');
  return publicPage(account.verified?home:signedOut,request,readAccount,{
   account:account.verified||account.state==='pending'?account:{state:'signed-out'},
  });
 }
 const id=url.pathname.replace(/^\/|\/$/g,'');
 if(!isExperimentId(id))return new Response('Collection not found.',{status:404});
 const check=new URL('/api/experiment',url);check.searchParams.set('experiment',id);if(url.searchParams.get('preview')==='1')check.searchParams.set('preview','1');
 const response=await api(new Request(check,{headers:request.headers}));
 if(!response.ok)return new Response(response.status===404?'Collection not found.':'Could not load this collection. Please try again.',{status:response.status});
 if(url.pathname!==experimentPath(id)||url.searchParams.has('experiment')){url.pathname=experimentPath(id);url.searchParams.delete('experiment');return Response.redirect(url,308)}
 const {experiment:collection}=await response.json();
 const draft=collection.status==='draft';
 const loading=draft?'Opening the Board…':url.searchParams.has('overall')?'Opening the overall board…':url.searchParams.has('board')?'Opening the Board…':url.searchParams.get('start')==='1'?'Opening voting…':'Opening the Edit…';
 const html=draft?experiment.replace('<main id="app">','<aside class="draft-banner">Organizer preview · This draft is private. Voting is disabled.</aside><main id="app">'):experiment;
 return publicPage(html,request,readAccount,{experimentId:id,loading});
}
