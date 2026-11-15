import {readJson} from '../request-json.mjs';
import {categoryInventory,createDailySuggestions,dailyBatchStatus} from './daily-batches.mjs';

const tools=[
 {name:'vouch_research_status',description:'Read aggregate Vouch category-research queue health. Organizer only; no visitor records or source details are returned.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'vouch_process_research',description:'Advance saved automatic or organizer-started private category research and its notification outbox. Never creates a suggestion, approves a draft or publishes a category. Source gaps remain advisory. Organizer only.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'vouch_category_inventory',description:'List existing live categories and historical suggestions before choosing genuinely new product categories. Organizer only. Omits visitor data and private notes.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'vouch_create_daily_suggestions',description:'Create up to three private category suggestions total for the current America/New_York day. Supply new category candidates in preference order; duplicates are skipped and retries fill only unused daily slots. Starts the existing research queue, never approves or publishes. Organizer only.',inputSchema:{type:'object',properties:{categories:{type:'array',minItems:1,maxItems:12,items:{type:'string',minLength:2,maxLength:60}}},required:['categories'],additionalProperties:false}},
 {name:'vouch_daily_batch_status',description:'Read one daily batch: created suggestions, completed drafts, failures, pauses and admin review links. Date defaults to today in America/New_York. Organizer only; no visitor data.',inputSchema:{type:'object',properties:{date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}},additionalProperties:false}}
];
export function maintenanceAuthorized(request,adminEmails=''){
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 return !!request.headers.get('oai-authenticated-user-id')&&!!email&&String(adminEmails).split(/[,;\s]+/).map(e=>e.trim().toLowerCase()).filter(Boolean).includes(email);
}
export async function handleResearchMcp(request,{adminEmails,store,run,now=Date.now,env={},waitUntil}={}){
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
 const allowed=name==='vouch_create_daily_suggestions'?['categories']:name==='vouch_daily_batch_status'?['date']:[];
 if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!allowed.includes(k))||!tools.some(t=>t.name===name))return reply({isError:true,content:[{type:'text',text:'Unknown tool or unsupported arguments.'}]});
 const result=value=>reply({content:[{type:'text',text:JSON.stringify(value)}]});
 try{
  if(name==='vouch_process_research')return result(await run());
  if(name==='vouch_category_inventory')return result(await categoryInventory({store}));
  if(name==='vouch_daily_batch_status')return result(await dailyBatchStatus({store,now,...args}));
  if(name==='vouch_create_daily_suggestions'){
   const batch=await createDailySuggestions({store,now,env,...args});
   if(waitUntil&&batch.suggestions.some(s=>['queued','researching','matching'].includes(s.state)&&!s.paused))waitUntil(run().catch(()=>{}));
   return result(batch);
  }
  const data=await(await store.scope('suggestion-jobs',()=>({jobs:{}}))).read(),jobs=Object.values(data.jobs),health=await(await store.scope('suggestion-runner',()=>({}))).read();
  const active=jobs.filter(j=>['queued','researching','matching'].includes(j.state)&&!j.paused);
  return reply({content:[{type:'text',text:JSON.stringify({active:active.length,paused:jobs.filter(j=>j.paused).length,failed:jobs.filter(j=>j.state==='failed').length,stalled:active.filter(j=>now()-Date.parse(j.updatedAt)>15*60000).length,lastCompletedAt:health.lastCompletedAt||null})}]});
 }catch(error){return reply({isError:true,content:[{type:'text',text:error.publicMessage||'Research maintenance could not complete. Saved jobs remain recoverable; try again.'}]});}
}
