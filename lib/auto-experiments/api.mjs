import {categoryKey,comparable,blocked,createResearch,validateResearch,validateEvidence,researchCoverage} from './research.mjs';
import {photoUrl} from '../experiment-management.mjs';
import {identity,publicHttps} from '../catalog/normalize.mjs';
import {matchPick,matchState,findProductPhoto} from './matching.mjs';
import {initialRegistry,validateExperiment,insertExperiment} from '../experiment-api.mjs';
import {isExperimentId} from '../experiment-paths.mjs';
import {readJson} from '../request-json.mjs';
const initialJobs=()=>({jobs:{},budget:{}}),initialSuggestions=()=>({suggestions:{}});
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const findCategory=(registry,text)=>Object.values(registry.experiments).find(e=>[e.category,e.id].some(v=>comparable(v)===comparable(text)));
const day=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
export function createSuggestions({store,search,authorizeAdmin=()=>false,env={},development=false,waitUntil,research=createResearch({env,development}),now=Date.now,notify}={}){
 const automatic=env.EXPERIMENT_AUTO_BUILD?env.EXPERIMENT_AUTO_BUILD==='on':development&&research.fake;
 const scopes=async()=>({jobs:await store.scope('suggestion-jobs',initialJobs),suggestions:await store.scope('category-suggestions',initialSuggestions),registry:await store.scope('experiment-registry',initialRegistry)});
 async function readiness(job,draft){
  const products=draft?.products||[],coverage=researchCoverage(job.research,products);
  const visible=await Promise.all(products.map(async p=>{if(p.photoOverride)return {...p,image:p.photoOverride};if(!p.provider)return p;try{return {...p,image:(await search.find(p.id))?.image||null};}catch{return {...p,image:null};}}));
  const missingPhotos=visible.filter(p=>!photoUrl(p.image)).map(p=>p.id);
  return {coverage,photos:Object.fromEntries(visible.map(p=>[p.id,photoUrl(p.image)||null])),photoCount:visible.length-missingPhotos.length,missingPhotos,canApprove:!!products.length&&!missingPhotos.length&&coverage.complete};
 }
 async function advance(){
  if(research.configured===false)return {advanced:false,reason:'research_not_configured'};
  const {jobs,registry,suggestions}=await scopes(),token=crypto.randomUUID(),time=now();
  const job=await jobs.transaction(d=>{const date=day(time),rawLimit=Number(env.EXPERIMENT_RESEARCH_DAILY_BUDGET??20),limit=Math.max(0,Number.isFinite(rawLimit)?rawLimit:20);const j=Object.values(d.jobs).find(j=>(j.state!=='queued'||j.researchStarted||(d.budget[date]||0)<limit)&&['queued','researching','matching'].includes(j.state)&&(automatic||j.manual)&&(!j.lockedUntil||j.lockedUntil<=time)&&(!j.nextAttemptAt||j.nextAttemptAt<=time));if(!j)return null;
   if(j.state==='queued'&&!j.researchStarted){d.budget[date]=(d.budget[date]||0)+1;j.researchStarted=true;j.researchDeadlineAt=time+600000;j.attempts=(j.attempts||0)+1;}
   j.lease=token;j.lockedUntil=time+60000;j.updatedAt=new Date(time).toISOString();return structuredClone(j);});
  if(!job)return {advanced:false};
  const update=fn=>jobs.transaction(d=>{const j=d.jobs[job.key];if(j?.lease!==token)return false;fn(j);j.lockedUntil=0;j.lease=null;j.updatedAt=new Date(now()).toISOString();return true;});
  try{
   if(['queued','researching'].includes(job.state)){
    if(blocked(job.category)){await update(j=>{j.state='rejected';j.lastError='This category does not fit Vouch.';});return {advanced:true};}
    if(job.researchDeadlineAt&&job.researchDeadlineAt<now())throw Error('Research deadline exceeded.');
    const response=job.responseId?await research.poll(job.responseId):await research.start(categoryKey(job.category),job.id+':'+job.attempts);
    if(response.pending){await update(j=>{j.state='researching';j.responseId=response.responseId;j.nextAttemptAt=now()+5000;});return {advanced:true};}
    const result=validateResearch(response.result),reg=await registry.read(),existing=findCategory({experiments:Object.fromEntries(Object.entries(reg.experiments).filter(([,e])=>e.origin?.suggestionKey!==job.key))},result.canonicalCategory),canonicalKey=categoryKey(result.canonicalCategory);
    const other=await jobs.transaction(d=>{const current=d.jobs[job.key];if(current.lease!==token)return null;const duplicate=Object.values(d.jobs).find(j=>j.key!==job.key&&[j.category,j.canonicalKey].filter(Boolean).some(c=>comparable(c)===comparable(result.canonicalCategory))&&!['dismissed','rejected','failed','deleted'].includes(j.state));if(!duplicate)current.canonicalKey=canonicalKey;return duplicate||null;});
    if(existing||other){const target=other?.key||existing?.origin?.suggestionKey;if(target&&target!==job.key)await suggestions.transaction(d=>{const source=d.suggestions[job.key],dest=d.suggestions[target];if(source&&dest){Object.assign(dest.entries,source.entries);dest.count=Object.keys(dest.entries).length;source.mergedInto=target;}});
     await update(j=>{j.state='dismissed';j.mergedInto=existing?.id||other.key;j.lastError='Merged with an existing Edit or suggestion.';});return {advanced:true};}
    await update(j=>{j.research=result;j.canonicalKey=canonicalKey;j.usage=response.usage;j.state=result.allowed?'matching':'rejected';j.lastError=result.allowed?null:result.rejectReason;j.errors=0;j.matches=[];j.nextAttemptAt=0;});
   }else{
    const index=job.matches.length;
    if(index<job.research.picks.length){const matched=await matchPick(job.research.picks[index],index,{search,category:job.research.canonicalCategory,jobId:job.id});await update(j=>{j.matches.push(matched);j.errors=0;});}
    else{
     let state=matchState(job.matches);if(state==='ready'&&!researchCoverage(job.research,job.matches.map(m=>m.product)).complete)state='needs_attention';
     if(state==='rejected'){await update(j=>{j.state=state;j.lastError='Fewer than four usable products.';});return {advanced:true};}
     const products=job.matches.map(m=>m.product),base=job.research.slug;
     // A repeated final step recovers its existing draft after a crash between records.
     const experiment=await validateExperiment({id:isExperimentId(base)&&base!=='sunscreen'?base:'edit-'+base,title:'The Wharton '+job.research.canonicalCategory+' Edit',category:job.research.canonicalCategory,productIds:products.filter(p=>!p.id.startsWith('sku-auto-')).map(p=>p.id),customProducts:products.filter(p=>p.id.startsWith('sku-auto-'))},async id=>products.find(p=>p.id===id));
     const draft=await registry.transaction(d=>{const prior=Object.values(d.experiments).find(e=>e.origin?.suggestionKey===job.key);if(prior){if(prior.status!=='draft')throw Error('Edit already approved.');d.experiments[prior.id]={...experiment,id:prior.id,status:'draft',origin:prior.origin};return d.experiments[prior.id];}let id=experiment.id,n=2;while(!isExperimentId(id)||Object.hasOwn(d.experiments,id)||Object.hasOwn(d.deletedExperimentIds||{},id))id=experiment.id.slice(0,58)+'-'+n++;const e={...experiment,id,status:'draft',origin:{type:'suggestion',suggestionKey:job.key}};insertExperiment(d,e);return e;});
     await update(j=>{j.state=state;j.draftId=draft.id;j.lastError=null;});
     if(notify&&env.SUGGESTION_NOTIFY_EMAIL){const claimed=await jobs.transaction(d=>{const j=d.jobs[job.key];if(j.notifiedAt)return false;j.notifiedAt=new Date(now()).toISOString();return true;});if(claimed)try{await notify({email:env.SUGGESTION_NOTIFY_EMAIL,category:job.research.canonicalCategory,state});}catch{await jobs.transaction(d=>{d.jobs[job.key].notificationError='Notification delivery failed; draft remains available.';});}}
    }
   }
  }catch(error){await update(j=>{j.failureCode=['provider_http','provider_incomplete','provider_failed','provider_cancelled','research_validation'].includes(error.code)?error.code:'build_step';j.diagnostic=error.diagnostic||null;j.providerStatus=Number.isInteger(error.providerStatus)?error.providerStatus:null;j.errors=(j.errors||0)+1;j.lastError=j.failureCode==='research_validation'?'Research completed, but its result did not pass validation.':j.failureCode==='provider_incomplete'?'Research stopped before finishing.':j.failureCode==='provider_http'?'Research provider request failed ('+j.providerStatus+').':'Could not complete this build step. Check provider configuration or retry.';j.nextAttemptAt=now()+Math.min(60000,1000*2**j.errors);if(j.errors>=3)j.state='failed';});}
  return {advanced:true};
 }
 async function handle(request){const url=new URL(request.url),path=url.pathname;if(path!=='/api/suggestions'&&!path.startsWith('/api/admin/suggestions'))return null;
  let cookie,actionClaim;const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
  try{
   if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)throw fail('Request origin not allowed',403);
   if(request.method==='POST'&&!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw fail('Use a JSON request.',415);
   const admin=path.startsWith('/api/admin/');if(admin&&!await authorizeAdmin(request))throw fail('Organizer access required.',401);
   const {jobs,suggestions,registry}=await scopes();
   if(path==='/api/suggestions'&&request.method==='POST'){
    const data=await readJson(request,4096),category=typeof data.category==='string'?data.category.trim().replace(/\s+/g,' '):'',note=data.note===undefined?'':data.note;
    if(category.length<2||category.length>60||categoryKey(category).length<2)throw fail('Enter a category (2–60 characters).');if(typeof note!=='string'||note.length>280)throw fail('Keep your note under 280 characters.');
    const key=categoryKey(category),visitor=request.headers.get('cookie')?.match(/(?:^|;\s*)vouch_visitor=([a-f0-9-]{36})(?:;|$)/)?.[1]||crypto.randomUUID();cookie=`vouch_visitor=${visitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`;
    const time=now(),at=new Date(time).toISOString(),reg=await registry.read();let existing=findCategory(reg,category);
    const allJobs=(await jobs.read()).jobs;let existingJob=Object.values(allJobs).find(j=>comparable(j.category)===comparable(category)||j.canonicalKey&&comparable(j.canonicalKey)===comparable(category));for(let i=0;i<10&&existingJob?.mergedInto&&Object.hasOwn(allJobs,existingJob.mergedInto);i++)existingJob=allJobs[existingJob.mergedInto];if(!existing&&existingJob?.canonicalKey)existing=findCategory(reg,existingJob.canonicalKey);if(!existing&&existingJob?.mergedInto&&Object.hasOwn(reg.experiments,existingJob.mergedInto))existing=reg.experiments[existingJob.mergedInto];const target=existingJob?.key||existing?.origin?.suggestionKey||key;
    await suggestions.transaction(d=>{let s=Object.hasOwn(d.suggestions,target)?d.suggestions[target]:null;const repeated=!!s?.entries[visitor];const recent=Object.values(d.suggestions).filter(v=>v.entries[visitor]&&Date.parse(v.entries[visitor].firstAt)>time-86400000).length;if(!repeated&&recent>=5)throw fail('You can suggest five categories per day. Try again tomorrow.',429);s??={key:target,displayText:category,count:0,firstAt:at,lastAt:at,entries:{}};s.entries[visitor]={visitorKey:visitor,note:note.trim(),firstAt:s.entries[visitor]?.firstAt||at,time:at};s.count=Object.keys(s.entries).length;s.lastAt=at;d.suggestions[target]=s;});
    if(existing)return json({ok:true,...(existing.status!=='draft'&&!existing.disabled?{existingEdit:{title:existing.title,url:'/'+existing.id}}:{})});
    await jobs.transaction(d=>{if(!Object.hasOwn(d.jobs,target))d.jobs[target]={id:crypto.randomUUID(),key:target,category,state:blocked(category)?'rejected':'queued',lastError:blocked(category)?'This category does not fit Vouch.':null,createdAt:at,updatedAt:at,attempts:0,matches:[]};});
    if(waitUntil&&automatic)waitUntil(advance());return json({ok:true},202);
   }
   if(admin&&path==='/api/admin/suggestions'&&request.method==='GET'){const reg=await registry.read(),support=await suggestions.read();return json({...(development?{testInbox:await(await store.scope('suggestion-notifications',()=>({messages:[]}))).read()}:{}),automatic,researchConfigured:research.configured!==false,provider:research.fake?'local fixtures':'OpenAI',jobs:await Promise.all(Object.values((await jobs.read()).jobs).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(async j=>({...j,deletedDraft:undefined,support:support.suggestions[j.key]||null,draft:reg.experiments[j.draftId]||null,readiness:reg.experiments[j.draftId]?.status==='draft'?await readiness(j,reg.experiments[j.draftId]):null})))});}
   if(admin&&path==='/api/admin/suggestions/diagnostics'&&request.method==='GET'){
    const all=(await jobs.read()).jobs,key=url.searchParams.get('key'),j=Object.hasOwn(all,key)?all[key]:null;if(!j)throw fail('Suggestion not found.',404);
    const diagnostic=j.responseId&&research.inspect?await research.inspect(j.responseId):j.diagnostic||null;
    return json({state:j.state,attempts:j.attempts||0,errors:j.errors||0,diagnostic});
   }
   if(admin&&path==='/api/admin/suggestions/run'&&request.method==='POST'){await readJson(request);return json(await advance());}
   if(admin&&request.method==='POST'){
    const action=path.split('/').at(-1),data=await readJson(request,32768),allJobs=(await jobs.read()).jobs,job=Object.hasOwn(allJobs,data.key)?allJobs[data.key]:null;if(!job)throw fail('Suggestion not found.',404);if(job.lockedUntil>now())throw fail('This draft is being built. Try again in a moment.',409);
    if(['approve','dismiss','reject','edit','photos','evidence','resume','retry','build','delete','restore'].includes(action)){const lease=crypto.randomUUID();await jobs.transaction(d=>{const current=d.jobs[job.key];if(current.lockedUntil>now())throw fail('This draft is being built. Try again in a moment.',409);current.lease=lease;current.lockedUntil=now()+60000;});actionClaim={jobs,key:job.key,lease};}
    if(action==='approve'&&['queued','researching','matching'].includes(job.state))throw fail('Wait for research to finish before approving.',409);
    const currentExperiment=job.draftId&&(await registry.read()).experiments[job.draftId];
    if(['reject','retry','build','resume'].includes(action)&&currentExperiment?.status!=='draft'&&currentExperiment)throw fail('This Edit is live. Manage it from Experiments.',409);
    if(action==='delete'){
     const removed=await registry.transaction(d=>{const e=d.experiments[job.draftId];if(e?.status==='draft'){delete d.experiments[e.id];return e;}return null;});
     await jobs.transaction(d=>{const j=d.jobs[job.key];if(j.state==='deleted')return;j.previousState=j.state;j.deletedAt=new Date(now()).toISOString();j.deletedDraft=removed;j.state='deleted';j.updatedAt=j.deletedAt;});return json({ok:true,recoverable:true});
    }
    if(action==='restore'){
     if(job.state!=='deleted')throw fail('This suggestion is not deleted.',409);
     if(job.deletedDraft)await registry.transaction(d=>{const old=d.experiments[job.deletedDraft.id];if(Object.hasOwn(d.deletedExperimentIds||{},job.deletedDraft.id))throw fail('This experiment was permanently deleted.',409);if(old&&old.origin?.suggestionKey!==job.key)throw fail('That draft path is now in use.',409);d.experiments[job.deletedDraft.id]??=job.deletedDraft;});
     await jobs.transaction(d=>{const j=d.jobs[job.key];j.state=j.previousState||'queued';j.deletedAt=null;j.deletedDraft=null;j.updatedAt=new Date(now()).toISOString();});return json({ok:true});
    }
    if(job.state==='deleted')throw fail('Restore this suggestion before changing it.',409);
    if(action==='resume'){
     if(job.state!=='failed'||!job.responseId||job.research)throw fail('No failed saved response is available to recover.',409);
     await jobs.transaction(d=>{const j=d.jobs[job.key];j.state='researching';j.manual=true;j.errors=0;j.nextAttemptAt=0;j.researchDeadlineAt=now()+600000;j.lastError=null;j.failureCode=null;j.diagnostic=null;j.updatedAt=new Date(now()).toISOString();});return json({ok:true,reusedResponse:true});
    }
    if(action==='photos'){
     if(!currentExperiment||currentExperiment.status!=='draft'||['queued','researching','matching'].includes(job.state))throw fail('Wait for a completed private draft.',409);
     const before=await readiness(job,currentExperiment),prior=job.photoLookup?.results||[],targets=currentExperiment.products.filter(p=>before.missingPhotos.includes(p.id)).sort((a,b)=>{const time=id=>Date.parse(prior.find(r=>r.productId===id)?.checkedAt||'')||0;return time(a.id)-time(b.id);}).slice(0,10),results=[],at=new Date(now()).toISOString();
     const run=async p=>{const found=await findProductPhoto(p,{search,category:currentExperiment.category,visitorKey:'suggestion-photos:'+job.id});return {id:p.id,product:found.product?{...identity(found.product),brand:p.brand,name:p.name}:null,method:found.method,reason:found.reason,brand:p.brand,name:p.name};};
     const searched=[];for(let i=0;i<targets.length;i+=3)searched.push(...await Promise.all(targets.slice(i,i+3).map(run)));
     await registry.transaction(d=>{const e=d.experiments[job.draftId];if(!e||e.status!=='draft')throw fail('Draft no longer available.',409);
      for(const found of searched){const i=e.products.findIndex(p=>p.id===found.id),duplicate=found.product&&e.products.some((p,j)=>j!==i&&p.id===found.product.id);
       if(i>=0&&found.product&&!duplicate)e.products[i]=found.product;
       results.push({productId:i>=0&&found.product&&!duplicate?found.product.id:found.id,brand:found.brand,name:found.name,outcome:i>=0&&found.product&&!duplicate?'attached':duplicate?'duplicate_product':found.reason||'no_matching_photo',method:found.method||null,checkedAt:at});
      }
     });
     const draft=(await registry.read()).experiments[job.draftId],ready=await readiness(job,draft);
     for(const result of results)if(result.outcome==='attached'&&ready.missingPhotos.includes(result.productId))result.outcome='saved_photo_unavailable';
     const added=results.filter(r=>r.outcome==='attached').length;
     const report={checkedAt:at,added,checked:results.length,photoCount:ready.photoCount,missing:ready.missingPhotos.length,results};
     await jobs.transaction(d=>{const j=d.jobs[job.key];j.photoLookup={...report,results:[...results,...prior.filter(p=>!results.some(r=>r.productId===p.productId))].slice(0,32)};j.updatedAt=at;});
     return json({ok:true,...report});
    }
    if(action==='evidence'){
     if(!currentExperiment||currentExperiment.status!=='draft'||['queued','researching','matching'].includes(job.state))throw fail('Wait for a completed private draft.',409);
     let evidence;try{evidence=validateEvidence(data.evidence);}catch(e){throw fail(e.message);}
     if(!currentExperiment.products.some(p=>p.brand===evidence.brand&&p.name===evidence.productName))throw fail('Choose a product in this draft.');
     await jobs.transaction(d=>{const j=d.jobs[job.key];j.research.evidence??=[];if(j.research.evidence.length>=60)throw fail('Refresh research before adding more evidence.');j.research.evidence.push({...evidence,verified:true,verifiedBy:'organizer',verifiedAt:new Date(now()).toISOString()});j.updatedAt=new Date(now()).toISOString();});return json({ok:true});
    }
    let approvalReady;if(action==='approve'&&currentExperiment?.status==='draft'){approvalReady=await readiness(job,currentExperiment);if(!approvalReady.canApprove)throw fail('Before publishing, attach a photo to every product and complete TikTok, Wirecutter, Google and AI research. Missing: '+[...approvalReady.coverage.missing,...(approvalReady.missingPhotos.length?[approvalReady.missingPhotos.length+' photos']:[])].join(', '),409);}
    if(['approve','edit'].includes(action)||['dismiss','reject'].includes(action)&&job.draftId){
     let edited;if(action==='edit'){const products=job.draftId&&(await registry.read()).experiments[job.draftId]?.products||[];edited=await validateExperiment({...data,id:data.id||job.draftId},async id=>products.find(p=>p.id===id)||await search.find(id));const photos=data.photoOverrides||{};if(!photos||typeof photos!=='object'||Array.isArray(photos))throw fail('Invalid photo overrides.');for(const p of edited.products){if(Object.hasOwn(photos,p.id)){if(photos[p.id]&&!publicHttps(photos[p.id]))throw fail('Use a public HTTPS photo URL.');if(photos[p.id])p.photoOverride=publicHttps(photos[p.id]);else delete p.photoOverride;if(!p.provider)p.image=p.photoOverride||null;}}}
     const e=await registry.transaction(d=>{const draft=d.experiments[job.draftId];if(action==='approve'&&draft?.status==='live'&&draft.origin?.suggestionKey===job.key)return draft;if(!draft||draft.status!=='draft')throw fail('Draft not found.',404);
      if(['dismiss','reject'].includes(action)){delete d.experiments[draft.id];return draft;}
      if(action==='approve'){if(Object.values(d.experiments).filter(e=>e.status!=='draft').length>=50)throw fail('This prototype supports 50 live experiments.');draft.status='live';draft.includeInOverall=false;for(const p of draft.products)if(p.id.startsWith('sku-'))d.skus[p.id]??=p;return draft;}
      if(edited.id!==draft.id&&Object.hasOwn(d.experiments,edited.id))throw fail('That path is already in use.',409);delete d.experiments[draft.id];const next={...draft,...edited,status:'draft',origin:draft.origin};d.experiments[next.id]=next;return next;
     });
     await jobs.transaction(d=>{const j=d.jobs[job.key];j.draftId=['dismiss','reject'].includes(action)?null:e.id;j.updatedAt=new Date(now()).toISOString();if(action==='edit')j.state='needs_attention';if(action!=='edit')j.state=action==='approve'?'approved':action==='reject'?'rejected':'dismissed';});return json({ok:true,url:'/'+e.id});
    }
    if(['build','retry','dismiss','reject'].includes(action)){if(job.state==='approved')throw fail('This Edit is already approved.',409);await jobs.transaction(d=>{const j=d.jobs[job.key];if(['dismiss','reject'].includes(action)){j.state=action==='reject'?'rejected':'dismissed';j.lastError=action==='reject'?'Rejected by organizer.':j.lastError;}else {if(j.research){j.researchHistory??=[];j.researchHistory.push({research:j.research,matches:j.matches,at:j.updatedAt});}j.state='queued';j.manual=true;j.researchStarted=false;j.responseId=null;j.research=null;j.matches=[];j.errors=0;j.nextAttemptAt=0;}j.updatedAt=new Date(now()).toISOString();});return json({ok:true});}
    throw fail('Unknown action.',404);
   }
   throw fail('Not found.',404);
  }catch(e){return json({error:e.status?e.message:'Could not save right now. Please try again.'},e.status||500);}finally{if(actionClaim)await actionClaim.jobs.transaction(d=>{const j=d.jobs[actionClaim.key];if(j?.lease===actionClaim.lease){j.lease=null;j.lockedUntil=0;}});}
 }
 return {handle,advance};
}
