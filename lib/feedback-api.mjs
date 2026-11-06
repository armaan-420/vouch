import {readJson} from './request-json.mjs';
import {isExperimentId} from './experiment-paths.mjs';
const initial=()=>({entries:[]});
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
function text(value,label,min,max){if(typeof value!=='string')throw fail('Enter '+label+'.');const result=value.trim();if(result.length<min||result.length>max)throw fail('Keep '+label+' between '+min+' and '+max+' characters.');return result;}
export function createFeedbackApi({store,authorizeAdmin=()=>false,now=Date.now}){
 return async request=>{const url=new URL(request.url),path=url.pathname;if(!['/api/feedback','/api/admin/feedback','/api/admin/feedback/status'].includes(path))return null;let cookie;
  const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
  try{
   const admin=path.startsWith('/api/admin/');if(admin&&!await authorizeAdmin(request))throw fail('Organizer access required.',401);
   if(request.method==='POST'){
    if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw fail('Request origin not allowed.',403);
    if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw fail('Use a JSON request.',415);
   }
   const db=await store.scope('feedback',initial);
   if(path==='/api/feedback'&&request.method==='POST'){
    const data=await readJson(request,4096),message=text(data.message,'a feedback message',5,1000),email=data.email==null||typeof data.email==='string'&&!data.email.trim()?null:text(data.email,'an email address',3,254);
    if(email&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw fail('Enter a valid email address.');
    const page=text(data.path,'a page path',1,512);if(!page.startsWith('/')||page.startsWith('//')||/[\r\n\x00\\]/.test(page))throw fail('Enter a relative page path.');
    const experimentId=data.experimentId==null?null:text(data.experimentId,'an Edit ID',1,64);if(experimentId&&!isExperimentId(experimentId))throw fail('Invalid Edit ID.');
    const cookies=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('vouch_visitor='));const candidate=cookies.length===1?cookies[0].slice(14):null,visitorKey=uuid(candidate)?candidate:crypto.randomUUID();
    const time=now();await db.transaction(d=>{if(d.entries.filter(e=>e.visitorKey===visitorKey&&Date.parse(e.createdAt)>time-86400000).length>=5)throw fail('You can send five notes per day. Please try again tomorrow.',429);d.entries.push({id:crypto.randomUUID(),message,email,path:page,experimentId,visitorKey,createdAt:new Date(time).toISOString(),status:'new'});});
    cookie=`vouch_visitor=${visitorKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`;return json({ok:true},201);
   }
   if(path==='/api/admin/feedback'&&request.method==='GET')return json({entries:(await db.read()).entries.toSorted((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(e=>({id:e.id,message:e.message,email:e.email,path:e.path,experimentId:e.experimentId,createdAt:e.createdAt,status:e.status}))});
   if(path==='/api/admin/feedback/status'&&request.method==='POST'){
    const data=await readJson(request,4096);if(!uuid(data.id)||data.status!=='read')throw fail('Choose a feedback note to mark read.');
    await db.transaction(d=>{const entry=d.entries.find(e=>e.id===data.id);if(!entry)throw fail('Feedback not found.',404);entry.status='read';});return json({ok:true});
   }
   return json({error:'Method not allowed.'},405);
  }catch(error){return json({error:error.status?error.message:'Could not save feedback. Please try again.'},error.status||500);}
 };
}
