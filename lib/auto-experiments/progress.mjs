export function suggestionProgress(job){
 const active=['queued','researching','matching'].includes(job.state);
 const labels={queued:job.researchStarted?'Starting research':'Queued',researching:job.providerStatusText==='queued'?'Research queued with provider':'Research running',matching:'Matching products and photos',ready:'Ready for review',needs_attention:'Ready for review',failed:'Research stopped',rejected:'Research rejected'};
 return {active,label:labels[job.state]||job.state,startedAt:job.researchStartedAt||job.createdAt,finishedAt:active?null:job.updatedAt,updatedAt:job.updatedAt,matched:job.matches?.length||0,total:job.research?.picks?.length||0,photos:(job.matches||[]).filter(m=>m.hasPhoto).length,retryAt:active&&job.errors>0?job.nextAttemptAt:null};
}
