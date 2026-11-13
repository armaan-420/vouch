import {readJson} from '../request-json.mjs';

const tools=[
 {name:'vouch_research_status',description:'Read aggregate Vouch category-research queue health. Organizer only; no visitor records or source details are returned.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'vouch_process_research',description:'Advance saved automatic or organizer-started private category research and its notification outbox. Never creates a suggestion, approves a draft or publishes a category. Source gaps remain advisory. Organizer only.',inputSchema:{type:'object',properties:{},additionalProperties:false}}
];
export function maintenanceAuthorized(request,adminEmails=''){
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 return !!request.headers.get('oai-authenticated-user-id')&&!!email&&String(adminEmails).split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(Boolean).includes(email);
}
export async function handleResearchMcp(request,{adminEmails,store,run,now=Date.now}={}){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 let input;try{input=await readJson(request,8192);}catch{return Response.json({error:'Invalid request'},{status:400,headers});}
 const reply=result=>Response.json({jsonrpc:'2.0',id:input.id??null,result},{headers});
 if(input.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
 if(input.method==='initialize')return reply({protocolVersion:'2026-07-28',capabilities:{tools:{}},serverInfo:{name:'vouch-research',version:'1.0.0'}});
 if(input.method==='notifications/initialized')return new Response(null,{status:204,headers});
 if(input.method==='tools/list')return reply({tools});
 if(input.method!=='tools/call')return Response.json({jsonrpc:'2.0',id:input.id??null,error:{code:-32601,message:'Method not found'}},{headers});
 if(!maintenanceAuthorized(request,adminEmails))return Response.json({error:'Organizer access required'},{status:403,headers});
 const name=input.params?.name,args=input.params?.arguments||{};
 if(Object.keys(args).length||!tools.some(t=>t.name===name))return reply({isError:true,content:[{type:'text',text:'Unknown tool or unsupported arguments.'}]});
 try{
  if(name==='vouch_process_research')return reply({content:[{type:'text',text:JSON.stringify(await run())}]});
  const data=await(await store.scope('suggestion-jobs',()=>({jobs:{}}))).read(),jobs=Object.values(data.jobs),health=await(await store.scope('suggestion-runner',()=>({}))).read();
  const active=jobs.filter(j=>['queued','researching','matching'].includes(j.state)&&!j.paused);
  return reply({content:[{type:'text',text:JSON.stringify({active:active.length,paused:jobs.filter(j=>j.paused).length,failed:jobs.filter(j=>j.state==='failed').length,stalled:active.filter(j=>now()-Date.parse(j.updatedAt)>15*60000).length,lastCompletedAt:health.lastCompletedAt||null})}]});
 }catch{return reply({isError:true,content:[{type:'text',text:'Research maintenance could not complete. Saved jobs remain recoverable; try again.'}]});}
}
