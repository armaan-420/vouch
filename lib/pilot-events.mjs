import {readJson} from './request-json.mjs';
import {isExperimentId} from './experiment-paths.mjs';
import {verifiedWharton} from './contributor-leaderboard.mjs';

export const pilotState = () => ({events:[], rates:{}, settings:{since:null,targets:{}}});
export const pilotStore = store => store.scope('pilot-events',pilotState);
const hour=3600000;
const visitorPattern=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export const validRef = value => typeof value==='string' && /^v-[a-f0-9]{16}$/.test(value) ? value : null;
export function pilotCookie(request,name) {
  const values=(request.headers.get('cookie')||'').split(';').map(part=>part.trim()).filter(part=>part.startsWith(name+'='));
  return values.length===1?values[0].slice(name.length+1):null;
}
export function setPilotCookie(request,name,value,age) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export function pilotVisitor(request) {
  const existing=pilotCookie(request,'vouch_visitor');
  return visitorPattern.test(existing||'')?existing:null;
}
export function pilotLandingPage(request,response) {
  if(!pilotVisitor(request))response.headers.append('Set-Cookie',setPilotCookie(request,'vouch_visitor',crypto.randomUUID(),31536000));
  return response;
}
// Server milestones (profile_created, share_opened and share_signup) are not client inputs.
const types=new Set(['wharton_landing','email_submitted','code_verified','intro_step','intro_done','intro_skipped','category_chosen','next_step_shown','next_step_click','pulse_shown','pulse_answer','pulse_dismissed','share_created','buy_click']);
const steps=new Set([1,2,3]);
const states=new Set([0,1,2,3]);
const actions=new Set(['next_category','share_picks','suggest','leaderboard']);
const answers=new Set(['yes','maybe','no']);
const kinds=new Set(['picks','winner','leaderboard']);
const methods=new Set(['native','download','copy_link']);
const fail=(message,status=400)=>Object.assign(Error(message),{status});
function requireField(valid) {
  if(!valid)throw fail('Invalid pilot event fields.');
}
export function cleanPilotEvent(input) {
  const {type}=input;
  if(!types.has(type))throw fail('Unknown pilot event.');
  const event={type};
  if(input.experimentId!==undefined){
    requireField(isExperimentId(input.experimentId));
    event.experimentId=input.experimentId;
  }
  if(type==='wharton_landing'&&validRef(input.ref))event.ref=input.ref;
  if(type.startsWith('intro_')){
    requireField(steps.has(input.step));
    event.step=input.step;
  }
  if(type.startsWith('next_step_')){
    requireField(states.has(input.state));
    event.state=input.state;
    if(type==='next_step_click'){
      requireField(actions.has(input.action));
      event.action=input.action;
    }
  }
  if(type==='pulse_answer'){
    requireField(answers.has(input.answer));
    event.answer=input.answer;
    if(typeof input.followUp==='string')event.followUp=input.followUp.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,240).trim();
  }
  if(type==='share_created'){
    requireField(kinds.has(input.kind)&&methods.has(input.method));
    Object.assign(event,{kind:input.kind,method:input.method});
  }
  if(type==='buy_click'){
    requireField(typeof input.productId==='string'&&/^[a-z0-9:_./%-]{1,512}$/i.test(input.productId)&&!/%40/i.test(input.productId));
    event.productId=input.productId;
  }
  if(type==='category_chosen'||type.startsWith('pulse_'))requireField(event.experimentId);
  return event;
}
export async function recordPilotSignup(store,request,accountKey,at) {
  const visitorId=pilotVisitor(request),ref=validRef(pilotCookie(request,'vouch_ref'));
  const db=await pilotStore(store);
  await db.transaction(data=>{
    if(data.events.some(event=>event.type==='profile_created'&&event.accountKey===accountKey))return;
    data.events.push({type:'profile_created',at,visitorId,accountKey});
    if(ref)data.events.push({type:'share_signup',at,visitorId,accountKey,ref});
  });
}
export function createPilotEvents({store,getAccount,accountStore,now=Date.now}) {
  return async request=>{
    const url=new URL(request.url);
    if(url.pathname!=='/api/pilot-events')return null;
    const headers=new Headers({'Cache-Control':'private, no-store'});
    try{
      if(request.method!=='POST')throw fail('Method not allowed.',405);
      if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw fail('Request origin not allowed.',403);
      if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw fail('Use a JSON request.',415);
      const event=cleanPilotEvent(await readJson(request,2048));
      const pulse=event.type.startsWith('pulse_'),terminal=event.type==='pulse_answer'||event.type==='pulse_dismissed';
      const {key,account}=await getAccount(request);
      if(pulse&&(!account||!verifiedWharton(account)))throw fail('Wharton sign-in required.',403);
      const existing=pilotVisitor(request),visitorId=existing||crypto.randomUUID();
      const time=now(),at=new Date(time).toISOString();
      const db=await pilotStore(store);
      const recorded=await db.transaction(data=>{
        const rateKey=key?'a:'+key:'v:'+visitorId;
        for(const [id,rate] of Object.entries(data.rates))if(rate.until<=time)delete data.rates[id];
        const rate=data.rates[rateKey]??={count:0,until:time+hour};
        const prior=pulse&&data.events.find(e=>e.accountKey===key&&['pulse_answer','pulse_dismissed'].includes(e.type));
        if(prior){
          if(terminal&&event.type==='pulse_answer'&&prior.type===event.type&&prior.answer===event.answer&&prior.experimentId===event.experimentId&&!prior.followUp&&event.followUp)prior.followUp=event.followUp;
          return terminal;
        }
        // A participant can always answer or dismiss even if telemetry has filled the window.
        if(rate.count>=120&&!terminal)return false;
        rate.count++;
        data.events.push({...event,at,visitorId,...(key?{accountKey:key}:{})});
        return true;
      });
      if(recorded&&terminal&&accountStore)await (await accountStore()).transaction(data=>{
        if(data.accounts[key])data.accounts[key].pilotPulseSeenAt??=at;
      });
      if(!existing)headers.set('Set-Cookie',setPilotCookie(request,'vouch_visitor',visitorId,31536000));
      return new Response(null,{status:204,headers});
    }catch(error){
      return Response.json({error:error.status?error.message:'Pilot events are unavailable.'},{status:error.status||503,headers});
    }
  };
}
