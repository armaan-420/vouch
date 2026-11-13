import {createWorkspace,terminalTask,mergeTaskResult,proposeLineup,recordActivity} from './workspace.mjs';
import {normalizeSourceResult,applyEvidenceChecks} from './source-research.mjs';

// Each bounded step is checkpointed under the caller's job lease. Provider starts
// use a saved idempotency key, so an interrupted start can be repeated safely.
export async function advanceWorkspace(job,{research,now=Date.now,persist=async()=>{}}){
 const w=job.workspace||createWorkspace(job.category,now(),job.brief),time=now();
 job.workspace=w;
 const budgetEnded=w.requests>=w.limits.maxRequests||w.outputTokens>=w.limits.maxOutputTokens||time-Date.parse(w.budgetStartedAt||w.startedAt)>w.limits.maxMinutes*60000;
 const usage=r=>{w.inputTokens+=(r.usage?.input_tokens||0);w.outputTokens+=(r.usage?.output_tokens||0);};
 if(w.phase==='sources'){
  const task=w.tasks.find(t=>!terminalTask(t));
  if(!task){w.phase='checking';recordActivity(w,'Source collection saved. Checking exact models and supporting passages.',time);return {workspace:w,pending:true,delay:0};}
  if(budgetEnded&&!task.responseId){for(const t of w.tasks.filter(t=>!terminalTask(t))){t.status='limited';t.notes='Research time/request limit reached. Saved candidates remain available.';}w.phase='checking';return {workspace:w,pending:true,delay:0};}
  try{
   if(!task.requestKey){task.attempts++;task.requestKey=job.id+':sources:'+w.revision+':'+task.id+':'+task.attempts;task.startedAt=new Date(time).toISOString();task.status='searching';w.requests++;recordActivity(w,'Searching '+task.label+'.',time);await persist(w);}
   const r=task.responseId?await research.pollSource(task.responseId):await research.startSource(job.category,task,w,task.requestKey);
   if(r.googleCapture)task.googleCapture=r.googleCapture;
   if(r.pending){task.responseId=r.responseId;task.providerStatus=r.responseStatus;if(time-Date.parse(w.budgetStartedAt||w.startedAt)>w.limits.maxMinutes*60000){task.status='limited';task.notes='Source exceeded this research cycle time limit. Saved candidates are retained.';return {workspace:w,pending:true,delay:0};}return {workspace:w,pending:true,delay:5000};}
   usage(r);
   if(r.result?.allowed===false)return {workspace:w,rejected:true,reason:'This category does not fit Vouch.'};
   mergeTaskResult(w,task,normalizeSourceResult(r,task,time,{fake:research.fake}),time);
  }catch{
   task.errors=(task.errors||0)+1;
   if(task.errors<3&&time-Date.parse(w.budgetStartedAt||w.startedAt)<w.limits.maxMinutes*60000)return {workspace:w,pending:true,delay:30000*task.errors};
   task.status='failed';task.notes='This source could not be completed. Retry this source without restarting the category.';task.finishedAt=new Date(time).toISOString();recordActivity(w,task.label+' needs review. Other research is preserved.',time);
  }
  return {workspace:w,pending:true,delay:0};
 }
 if(w.phase==='checking'){
  w.verification??={status:'queued',attempts:0};const v=w.verification;
  if(!w.evidence.some(e=>!e.check)||budgetEnded&&!v.responseId){for(const e of w.evidence)if(!e.check)e.check={status:'needs_review',explanation:'Content check not completed within this research budget.'};v.status='needs_review';w.phase='proposal';return {workspace:w,pending:true,delay:0};}
  try{
   if(!v.requestKey){v.attempts++;v.requestKey=job.id+':checks:'+w.revision+':'+v.attempts;v.status='checking';v.entryIds=w.evidence.filter(e=>!e.check).sort((a,b)=>Number(a.id.split(':').at(-1))-Number(b.id.split(':').at(-1))).slice(0,6).map(e=>e.id);w.requests++;await persist(w);}
   const r=v.responseId?await research.pollCheck(v.responseId):await research.startCheck(w,v.requestKey);
   if(r.pending){v.responseId=r.responseId;if(time-Date.parse(w.budgetStartedAt||w.startedAt)>w.limits.maxMinutes*60000){for(const e of w.evidence)if(!e.check)e.check={status:'needs_review',explanation:'Content check exceeded the cycle time limit.'};v.status='limited';w.phase='proposal';return {workspace:w,pending:true,delay:0};}return {workspace:w,pending:true,delay:5000};}
   usage(r);applyEvidenceChecks(w,r,time,v.entryIds);v.status='complete';v.responseId=null;v.requestKey=null;v.errors=0;w.phase=w.evidence.some(e=>!e.check)?'checking':'proposal';recordActivity(w,'Evidence batch saved. Unsupported or inaccessible claims are flagged for review.',time);
  }catch{
   v.errors=(v.errors||0)+1;if(v.errors<3)return {workspace:w,pending:true,delay:30000*v.errors};
   for(const e of w.evidence)if(!e.check)e.check={status:'needs_review',explanation:'Automatic content check unavailable.'};v.status='failed';w.phase='proposal';recordActivity(w,'Automatic content check unavailable. The draft can still be reviewed.',time);
  }
  return {workspace:w,pending:true,delay:0};
 }
 return {workspace:w,result:proposeLineup(w,job.category,time)};
}
