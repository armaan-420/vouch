import {isExperimentId,experimentPath} from './experiment-paths.mjs';
const htmlResponse=html=>new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
export async function experimentPage(request,{home,experiment,api}){
 const url=new URL(request.url);
 if(url.pathname==='/'||url.pathname==='/index.html'){
  const legacy=url.searchParams.get('experiment');
  if(legacy&&isExperimentId(legacy)){url.pathname=experimentPath(legacy);url.searchParams.delete('experiment');return Response.redirect(url,308)}
  // Home navigation is rendered only for a verified email session. A provisional
  // browser account is enough to save picks, but does not unlock this menu.
  let verified=false;
  try{const status=await api(new Request(new URL('/api/auth/status',url),{headers:request.headers}));verified=status.ok&&!!(await status.json()).identity;}catch{/* Fail closed when session lookup is unavailable. */}
  const signedOut=home.replace(/<nav class="site-navigation"[\s\S]*?<\/nav>/,'<nav class="site-navigation" aria-label="Account"><a class="leaderboard-link" href="/account?signin=1">Sign in</a></nav>').replace('<script src="/suggestions.js"></script>','').replace('<script src="/site-nav.js"></script>','');
  const page=htmlResponse(verified?home:signedOut);page.headers.set('Cache-Control','private, no-store');page.headers.set('Vary','Cookie');return page;
 }
 const id=url.pathname.replace(/^\/|\/$/g,'');
 if(!isExperimentId(id))return new Response('Collection not found.',{status:404});
 const check=new URL('/api/experiment',url);check.searchParams.set('experiment',id);if(url.searchParams.get('preview')==='1')check.searchParams.set('preview','1');
 const response=await api(new Request(check,{headers:request.headers}));
 if(!response.ok)return new Response(response.status===404?'Collection not found.':'Could not load this collection. Please try again.',{status:response.status});
 if(url.pathname!==experimentPath(id)||url.searchParams.has('experiment')){url.pathname=experimentPath(id);url.searchParams.delete('experiment');return Response.redirect(url,308)}
 const data=await response.json();const page=htmlResponse(data.experiment.status==='draft'?experiment.replace('<main id="app">','<aside class="draft-banner">Organizer preview · This draft is private. Voting is disabled.</aside><main id="app">'):experiment);if(data.experiment.status==='draft')page.headers.set('Cache-Control','no-store');return page;
}
