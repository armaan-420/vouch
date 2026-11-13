export function suggestionProgress(job){
 const active=['queued','researching','matching'].includes(job.state);
 const labels={queued:job.researchStarted?'Starting research':'Queued',researching:job.providerStatusText==='queued'?'Research queued with provider':'Research running',matching:'Matching products and photos',ready:'Ready for review',needs_attention:'Ready for review',failed:'Research stopped',rejected:'Research rejected'};
 const w=job.workspace,stage=w?.phase==='checking'?'Checking models and source passages':w?.phase==='proposal'?'Preparing the proposed lineup':w?.phase==='sources'?'Collecting sources':null;
 return {active:active&&!job.paused,label:job.paused?'Research paused':job.pauseRequested?'Pausing after the current step':active&&stage?stage:labels[job.state]||job.state,startedAt:job.researchStartedAt||job.createdAt,finishedAt:active?null:job.updatedAt,updatedAt:job.updatedAt,matched:job.matches?.length||0,total:job.research?.picks?.length||0,photos:(job.matches||[]).filter(m=>m.hasPhoto).length,retryAt:active&&job.errors>0?job.nextAttemptAt:null,sourceTasks:w?.tasks.map(t=>({id:t.id,status:t.status}))||[]};
}
