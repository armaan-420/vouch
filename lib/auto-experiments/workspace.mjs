import {brandKey,publicHttps} from '../catalog/normalize.mjs';
import {categoryKey,comparable,blocked} from './research.mjs';

export const SOURCE_TASKS=[
 {id:'editorial',label:'Independent editorial',purpose:'Compare original recommendations across at least three independent publishers.'},
 {id:'wirecutter',label:'Wirecutter',purpose:'Search Wirecutter explicitly and check the exact recommended model.'},
 {id:'google',label:'Google discovery',purpose:'Discover leading review sources. Record Google positions only from a captured Google results response.'},
 {id:'tiktok',label:'TikTok & trends',purpose:'Find original dated videos; distinguish isolated mentions, sponsorship and actual trend observations.'},
 {id:'manufacturer',label:'Manufacturer checks',purpose:'Check exact models, current availability and variants on official product pages.'}
];
export const terminalTask=t=>['complete','no_coverage','inaccessible','needs_review','failed','limited'].includes(t.status);
const text=(value,max=500)=>typeof value==='string'?value.trim().slice(0,max):'';
export const candidateKey=p=>brandKey(p.brand)+':'+comparable(p.productName||p.name);
export function recordActivity(w,message,now=Date.now()){
 w.activity??=[];w.activity.push({at:new Date(now).toISOString(),message:text(message)});w.activity=w.activity.slice(-60);
}
export function createWorkspace(category,now=Date.now(),brief={}){
 return {version:1,revision:1,phase:'sources',brief:{scope:text(brief.scope||category,160),audience:text(brief.audience||'US shoppers; practical choices for the Wharton community',160),exclusions:text(brief.exclusions,400)},tasks:SOURCE_TASKS.map(t=>({...t,status:'queued',attempts:0})),candidates:[],evidence:[],pinned:[],excluded:[],activity:[{at:new Date(now).toISOString(),message:'Research plan saved. Every source gets its own attempt; coverage gaps do not fail the draft.'}],requests:0,inputTokens:0,outputTokens:0,limits:{maxRequests:16,maxOutputTokens:60000,maxMinutes:30},startedAt:new Date(now).toISOString(),paused:false};
}
export function mergeTaskResult(w,task,result,now=Date.now()){
 const previous=new Set((task.evidence||[]).map(e=>e.id));
 w.evidence=(w.evidence||[]).filter(e=>!previous.has(e.id));
 task.evidence=(result.evidence||[]).slice(0,12).map((e,i)=>({...e,id:task.id+':'+task.attempts+':'+i,task:task.id}));
 w.evidence.push(...task.evidence);w.evidence=w.evidence.slice(-80);
 task.candidates=(result.candidates||[]).slice(0,20).filter(p=>p&&text(p.brand)&&text(p.productName)).map(p=>({brand:text(p.brand,100),productName:text(p.productName,160),variantHint:text(p.variantHint,160)||null,reason:text(p.reason),sourceUrls:(p.sourceUrls||[]).filter(publicHttps).slice(0,3)}));
 task.status=['complete','no_coverage','inaccessible','needs_review'].includes(result.status)?result.status:'needs_review';
 task.notes=text(result.notes,1200);task.queries=(result.queries||[]).map(q=>text(q,200)).slice(0,5);task.captures=result.captures||[];task.finishedAt=new Date(now).toISOString();task.responseId=null;task.errors=0;
 const map=new Map();
 for(const t of w.tasks)for(const p of t.candidates||[]){const key=candidateKey(p),old=map.get(key);map.set(key,old?{...old,sourceUrls:[...new Set([...old.sourceUrls,...p.sourceUrls])].slice(0,6),channels:[...new Set([...old.channels,t.id])]}:{...p,key,channels:[t.id]});}
 w.candidates=[...map.values()].slice(0,60);
 recordActivity(w,task.label+': '+task.status.replaceAll('_',' ')+'. '+task.candidates.length+' candidates saved.',now);
}
export function workspaceQuality(research,products=research?.picks||[]){
 const w=research?.workspace;if(!w)return null;
 const evidence=w.evidence||[],matching=p=>evidence.filter(e=>candidateKey(e)===candidateKey(p));
 const checked=e=>e.check?.status==='supported'||e.verifiedBy==='organizer';
 const publishers=[...new Set(evidence.filter(e=>e.role==='recommendation'&&checked(e)).map(e=>e.publisherKey||host(e.url)).filter(Boolean))];
 const gaps=products.filter(p=>!matching(p).some(e=>e.role==='recommendation'&&checked(e))).map(p=>({brand:p.brand,name:p.productName||p.name}));
 const identityGaps=products.filter(p=>!matching(p).some(e=>e.role==='identity'&&checked(e))).length;
 return {advisory:true,publishers:publishers.length,publisherTarget:3,recommendationCount:products.length-gaps.length,identityCount:products.length-identityGaps,total:products.length,missingRecommendations:gaps,sourceGaps:w.tasks.filter(t=>t.status!=='complete').map(t=>({id:t.id,label:t.label,status:t.status})),warnings:[...(publishers.length<3?['Fewer than three independently checked editorial publishers.']:[]),...(gaps.length?[gaps.length+' products need independent recommendation checks.']:[]),...(identityGaps?[identityGaps+' products need official model/availability checks.']:[])]};
}
export function host(url){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}}
export function proposeLineup(w,category,now=Date.now()){
 const eligible=w.candidates.filter(p=>!w.excluded.includes(p.key)&&!blocked(p.brand+' '+p.productName));
 const score=p=>{const e=w.evidence.filter(e=>candidateKey(e)===p.key);return (w.pinned.includes(p.key)?1000:0)+new Set(e.filter(x=>x.role==='recommendation'&&x.check?.status==='supported').map(x=>x.publisherKey||host(x.url))).size*20+e.filter(x=>x.check?.status==='supported').length*3+p.channels.length;};
 const brands=new Set(),picks=eligible.sort((a,b)=>score(b)-score(a)||a.key.localeCompare(b.key)).filter(p=>{const b=brandKey(p.brand);if(brands.has(b))return false;brands.add(b);return true;}).slice(0,10).map(p=>({...p,sourceUrls:p.sourceUrls.slice(0,3),verifiedSourceUrls:w.evidence.filter(e=>candidateKey(e)===p.key&&e.check?.status==='supported').map(e=>e.url)}));
 w.phase='complete';w.completedAt=new Date(now).toISOString();recordActivity(w,'Proposed '+picks.length+' products from '+w.candidates.length+' candidates. Source gaps remain advisory.',now);
 const name=text(category,60),slug=categoryKey(name).replaceAll(' ','-').slice(0,60)||'new-category';
 return {policyVersion:2,allowed:true,rejectReason:null,canonicalCategory:name,slug,picks,evidence:w.evidence.map(e=>({...e,channel:e.channel||e.task,rank:null,searchUrl:null,query:e.query||w.brief.scope,note:e.note||e.claim||'Source requires review.',verified:e.check?.status==='supported',verifiedBy:e.verifiedBy||'research_check'})),workspace:w,researchedAt:new Date(now).toISOString(),researchNotes:'Source breadth and recommendation checks are advisory. Product selection is a research proposal, not a Vouch community ranking.'};
}
export function researchMetrics(job){
 const w=job.workspace||job.research?.workspace;if(!w)return null;
 const q=workspaceQuality({...job.research,workspace:w},job.research?.picks||[]);
 return {revision:w.revision,phase:w.phase,paused:!!job.paused,sourceTasks:w.tasks.length,sourceTasksFinished:w.tasks.filter(terminalTask).length,candidates:w.candidates.length,requests:w.requests,inputTokens:w.inputTokens,outputTokens:w.outputTokens,elapsedSeconds:Math.max(0,Math.round(((w.completedAt?Date.parse(w.completedAt):Date.now())-Date.parse(w.startedAt))/1000)),...q};
}
