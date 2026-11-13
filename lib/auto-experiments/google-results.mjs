import {publicHttps} from '../catalog/normalize.mjs';
// Optional Google SERP capture. General web search is never relabeled as a
// Google result position when this server-only integration is unavailable.
export async function captureGoogleResults({category,scope,apiKey,fetcher=fetch,now=Date.now}){
 if(!apiKey)return {status:'not_configured',captures:[],note:'Google result positions were not captured: the Google search integration is not configured. General web discovery still runs.'};
 const captures=[];
 try{
  for(const query of [...new Set(['best '+scope,category+' independent reviews'])]){
   const url=new URL('https://serpapi.com/search.json');url.search=new URLSearchParams({engine:'google',q:query,gl:'us',hl:'en',num:'10',api_key:apiKey}).toString();
   const response=await fetcher(url.href,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Search unavailable');
   const data=await response.json();if(data.error)throw Error('Search unavailable');
   const results=(data.organic_results||[]).slice(0,10).filter(r=>publicHttps(r.link)&&Number.isInteger(r.position)&&r.position>0).map(r=>({position:r.position,url:publicHttps(r.link),title:String(r.title||'').slice(0,200)}));
   captures.push({query,region:'US',language:'en',capturedAt:new Date(now()).toISOString(),provider:'SerpApi Google',results});
  }
  return {status:captures.some(c=>c.results.length)?'captured':'no_results',captures,note:'Google positions are observed US organic results at the captured time; they are not product-quality rankings.'};
 }catch{return {status:'unavailable',captures,note:'Google result capture was unavailable. General web discovery continues without claiming Google positions.'};}
}
