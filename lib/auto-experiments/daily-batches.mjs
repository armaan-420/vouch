import {initialRegistry} from '../experiment-api.mjs';
import {blocked,categoryKey,comparable} from './research.mjs';
import {photoUrl} from '../experiment-management.mjs';

export const easternDay=time=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
const initialJobs=()=>({jobs:{},budget:{}});
const error=message=>{throw Object.assign(Error(message),{publicMessage:message});};
const reviewUrl=key=>'https://v4ch.app/admin#suggestions-panel/'+encodeURIComponent(key);
const names=job=>[job.category,job.key,job.canonicalKey,job.research?.canonicalCategory].filter(Boolean);

// Only category metadata is exposed to scheduled agents, never supporter data or notes.
export async function categoryInventory({store}){
 const [data,registry]=await Promise.all([(await store.scope('suggestion-jobs',initialJobs)).read(),(await store.scope('experiment-registry',initialRegistry)).read()]);
 return {categories:[...Object.values(registry.experiments).map(e=>({category:e.category,id:e.id,status:e.status||'live'})),...Object.values(data.jobs).map(j=>({category:j.category,canonicalCategory:j.research?.canonicalCategory||null,key:j.key,status:j.state}))]};
}

export async function dailyBatchStatus({store,now=Date.now,date=easternDay(now())}){
 const parsed=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T12:00:00Z'):null;
 if(!parsed||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)error('Use a valid YYYY-MM-DD batch date.');
 const [data,registry]=await Promise.all([(await store.scope('suggestion-jobs',initialJobs)).read(),(await store.scope('experiment-registry',initialRegistry)).read()]);
 const batch=data.dailyBatches?.[date];
 const suggestions=(batch?.keys||[]).map(key=>{
  const original=data.jobs[key];let job=original;const visited=new Set();
  while(job?.mergedInto&&data.jobs[job.mergedInto]&&!visited.has(job.key)){visited.add(job.key);job=data.jobs[job.mergedInto];}
  const draft=job&&registry.experiments[job.draftId];
  const products=draft?.products||[];
  return {key,category:original?.category||key,state:job?.state||'missing',paused:!!job?.paused,merged:!!original?.mergedInto,reviewUrl:reviewUrl(job?.key||key),hasDraft:!!draft,privateDraft:draft?.status==='draft',productCount:products.length,photoCount:products.filter(p=>photoUrl(p.photoOverride||p.image)).length,failureCode:job?.failureCode||null};
 });
 return {date,timezone:'America/New_York',target:3,created:suggestions.length,remaining:Math.max(0,3-suggestions.length),completedDrafts:suggestions.filter(s=>s.hasDraft&&['ready','needs_attention','approved'].includes(s.state)).length,suggestions};
}

export async function createDailySuggestions({store,categories,now=Date.now,env={}}){
 if(!Array.isArray(categories)||!categories.length||categories.length>12)error('Supply one to twelve category candidates; the daily batch is capped at three.');
 const candidates=categories.map(value=>{
  if(typeof value!=='string')error('Categories must be text.');
  const category=value.trim().replace(/\s+/g,' ');
  if(category.length<2||category.length>60||categoryKey(category).length<2||blocked(category))error('Supply allowed product categories of 2–60 characters.');
  return category;
 });
 if(env.EXPERIMENT_AUTO_BUILD!=='on'||!env.OPENAI_API_KEY)error('Automatic research must be enabled and configured before creating a daily batch.');
 const time=now(),date=easternDay(time),at=new Date(time).toISOString();
 const registry=await(await store.scope('experiment-registry',initialRegistry)).read();
 const jobs=await store.scope('suggestion-jobs',initialJobs);
 // Batch slots and jobs commit in the same record. Concurrent calls, retries, and
 // a crash after commit cannot create a second batch or reserve a slot without a job.
 const result=await jobs.transaction(data=>{
  data.dailyBatches??={};
  const batch=data.dailyBatches[date]??={date,createdAt:at,keys:[]};
  const existing=new Set([...Object.values(registry.experiments).flatMap(e=>[e.category,e.id]),...Object.values(data.jobs).flatMap(names)].filter(Boolean).map(comparable));
  const createdKeys=[],skipped=[];
  for(const category of candidates){
   if(batch.keys.length>=3)break;
   const key=categoryKey(category);
   if(existing.has(comparable(category))||Object.hasOwn(data.jobs,key)){skipped.push({category,reason:'Already exists or was previously suggested.'});continue;}
   data.jobs[key]={id:crypto.randomUUID(),key,category,state:'queued',lastError:null,createdAt:at,submittedBy:'Vouch daily automation',submissionSource:'automation',dailyBatchDate:date,updatedAt:at,attempts:0,matches:[]};
   batch.keys.push(key);createdKeys.push(key);existing.add(comparable(category));
  }
  return {createdKeys,skipped};
 });
 return {...await dailyBatchStatus({store,now,date}),...result};
}
