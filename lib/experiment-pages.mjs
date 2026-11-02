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
 if(!isExperimentId(id))return new Response('Experiment not found.',{status:404});
 const check=new URL('/api/experiment',url);check.searchParams.set('experiment',id);
 const response=await api(new Request(check));
 if(!response.ok)return new Response(response.status===404?'Experiment not found.':'Could not load the experiment. Please try again.',{status:response.status});
 if(url.pathname!==experimentPath(id)||url.searchParams.has('experiment')){url.pathname=experimentPath(id);url.searchParams.delete('experiment');return Response.redirect(url,308)}
 return htmlResponse(experiment);
}
