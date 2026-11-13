import {publicHttps} from '../catalog/normalize.mjs';
import {createWorkspace,recordActivity,candidateKey,proposeLineup} from './workspace.mjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export const WORKSPACE_ACTIONS=['research-plan','retry-source','check-sources','candidate-pin','candidate-exclude','add-source','apply-proposal','continue-research'];
export async function workspaceAction({action,data,job,jobs,currentExperiment,now=Date.now}){
 if(currentExperiment&&currentExperiment.status!=='draft'||['approved','deleted','dismissed','rejected'].includes(job.state))throw fail('Research changes are available for private suggestions only.',409);
 if(action==='continue-research'){
  await jobs.transaction(d=>{const j=d.jobs[job.key];j.paused=false;j.pauseRequested=false;j.nextAttemptAt=0;j.updatedAt=new Date(now()).toISOString();if(j.workspace)recordActivity(j.workspace,'Research resumed.',now());});return {ok:true};
 }
 if(['research-plan','retry-source','check-sources','add-source','apply-proposal'].includes(action)&&['researching','matching'].includes(job.state)&&job.workspace?.tasks.some(t=>t.responseId)&&action==='research-plan')throw fail('Pause research and let the current source finish before changing the brief.',409);
 const w=structuredClone(job.workspace||createWorkspace(job.category,now(),job.brief));
 if(!job.workspace&&job.research?.picks?.length){w.tasks.forEach(t=>{t.status='no_coverage';t.notes='Earlier research has no source-task history.';});w.tasks[0].candidates=job.research.picks;w.candidates=job.research.picks.map(p=>({...p,key:candidateKey(p),channels:['editorial']}));}
 let run=false;
 if(action==='research-plan'){
  if(!data.brief||!['scope','audience','exclusions'].every(k=>typeof data.brief[k]==='string'&&data.brief[k].length<=(k==='exclusions'?400:160))||data.brief.scope.trim().length<2)throw fail('Enter a scope and keep the brief within the field limits.');
  const next=createWorkspace(job.category,now(),data.brief);next.revision=w.revision+1;next.pinned=w.pinned;next.excluded=w.excluded;next.addedSources=w.addedSources||[];next.activity=w.activity;Object.assign(w,next);recordActivity(w,'Brief updated. New research will preserve the current draft until you apply a new proposal.',now());run=true;
 }
 if(action==='retry-source'||action==='add-source'){
  const task=w.tasks.find(t=>t.id===data.source);if(!task)throw fail('Choose a research source.');
  if(action==='add-source'){
   const url=publicHttps(data.url);if(!url||typeof data.note!=='string'||data.note.length>400)throw fail('Use a public HTTPS source URL and a short note.');
   w.addedSources??=[];if(w.addedSources.length>=12)throw fail('This research plan already has twelve added sources.');
   w.addedSources.push({url,source:task.id,note:data.note,addedAt:new Date(now()).toISOString()});
  }
  if(task.responseId&&!['failed','limited'].includes(task.status))throw fail('This source is still running. Its progress is saved.',409);
  task.history??=[];task.history.push({at:task.finishedAt,status:task.status,notes:task.notes,evidence:w.evidence.filter(e=>e.task===task.id),candidates:task.candidates||[],captures:task.captures||[],responseId:task.responseId||null});task.history=task.history.slice(-3);
  Object.assign(task,{status:'queued',requestKey:null,responseId:null,errors:0,notes:null,startedAt:null,finishedAt:null});w.phase='sources';w.verification=null;recordActivity(w,(action==='add-source'?'Added a source for ':'Retry requested for ')+task.label+'. Saved evidence and lineup retained.',now());run=true;
 }
 if(action==='check-sources'){
  if(w.tasks.some(t=>t.responseId))throw fail('Let the current source finish before rechecking evidence.',409);
  for(const e of w.evidence)if(e.verifiedBy!=='organizer'&&e.check?.status!=='supported')delete e.check;
  w.phase='checking';w.verification=null;recordActivity(w,'Rechecking missing content support. Existing checked evidence is preserved.',now());run=true;
 }
 if(action==='candidate-pin'||action==='candidate-exclude'){
  if(typeof data.enabled!=='boolean'||!w.candidates.some(p=>p.key===data.candidate))throw fail('Choose a saved candidate.');
  const field=action==='candidate-pin'?'pinned':'excluded';w[field]=w[field].filter(k=>k!==data.candidate);
  if(data.enabled){if(field==='pinned'&&w[field].length>=10)throw fail('Pin up to ten candidates.');w[field].push(data.candidate);w[field==='pinned'?'excluded':'pinned']=w[field==='pinned'?'excluded':'pinned'].filter(k=>k!==data.candidate);}
  recordActivity(w,(field==='pinned'?'Pin':'Exclusion')+' updated for '+w.candidates.find(p=>p.key===data.candidate).productName+'.',now());
 }
 if(action==='apply-proposal'){
  if(!currentExperiment||!['complete','proposal'].includes(w.phase)||['researching','matching'].includes(job.state))throw fail('Wait for completed research and a private draft.',409);
  const result=proposeLineup(w,job.category,now());delete result.workspace;
  if(!result.picks.length)throw fail('Keep at least one candidate before applying the proposal.');
  await jobs.transaction(d=>{const j=d.jobs[job.key];j.workspace=w;j.research=result;j.matches=[];j.preserveProducts=currentExperiment.products;j.state='matching';j.manual=true;j.paused=false;j.nextAttemptAt=0;j.updatedAt=new Date(now()).toISOString();});return {ok:true,matching:true};
 }
 if(run){w.budgetStartedAt=new Date(now()).toISOString();w.limits.maxRequests=w.requests+7;w.limits.maxOutputTokens=w.outputTokens+42000;delete w.completedAt;}
 await jobs.transaction(d=>{const j=d.jobs[job.key];if(action==='research-plan'&&j.workspace){j.researchHistory??=[];j.researchHistory.push({research:j.research,workspace:j.workspace,at:new Date(now()).toISOString()});j.researchHistory=j.researchHistory.slice(-5);}j.workspace=w;if(run){j.state=j.researchStarted?'researching':'queued';j.manual=true;j.paused=false;j.nextAttemptAt=0;j.lastError=null;j.failureCode=null;j.notificationCycle=(j.notificationCycle||0)+1;}j.updatedAt=new Date(now()).toISOString();});
 return {ok:true,researchQueued:run};
}
