import {isExperimentId,experimentPath} from './experiment-paths.mjs';
const htmlResponse=html=>new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
export async function experimentPage(request,{home,experiment,api}){
 const url=new URL(request.url);
 if(url.pathname==='/'||url.pathname==='/index.html'){
  const legacy=url.searchParams.get('experiment');
  if(legacy&&isExperimentId(legacy)){url.pathname=experimentPath(legacy);url.searchParams.delete('experiment');return Response.redirect(url,308)}
  return htmlResponse(home);
 }
 const id=url.pathname.replace(/^\/|\/$/g,'');
 if(!isExperimentId(id))return new Response('Collection not found.',{status:404});
 const check=new URL('/api/experiment',url);check.searchParams.set('experiment',id);if(url.searchParams.get('preview')==='1')check.searchParams.set('preview','1');
 const response=await api(new Request(check,{headers:request.headers}));
 if(!response.ok)return new Response(response.status===404?'Collection not found.':'Could not load this collection. Please try again.',{status:response.status});
 if(url.pathname!==experimentPath(id)||url.searchParams.has('experiment')){url.pathname=experimentPath(id);url.searchParams.delete('experiment');return Response.redirect(url,308)}
 const data=await response.json();const page=htmlResponse(data.experiment.status==='draft'?experiment.replace('<main id="app">','<aside class="draft-banner">Organizer preview · This draft is private. Voting is disabled.</aside><main id="app">'):experiment);if(data.experiment.status==='draft')page.headers.set('Cache-Control','no-store');return page;
}
