import {whartonChoices} from '../public/wharton-categories.js';
import {verifiedWharton} from './contributor-leaderboard.mjs';
import {collectionStatus} from './experiment-schedule.mjs';
import {publicExperiment} from './experiment-management.mjs';
import {fresh} from './vouch-api.mjs';
import {pilotStore} from './pilot-events.mjs';
import {readJson} from './request-json.mjs';

const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const day=at=>at&&Number.isFinite(Date.parse(at))?dayFormatter.format(new Date(at)):null;
const dayNumber=value=>Date.parse(value+'T00:00:00Z')/86400000;
const validDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(dayNumber(value))&&new Date(value+'T00:00:00Z').toISOString().startsWith(value);
const ratio=(n,d)=>d?Math.round(n/d*10000)/10000:null;
const pct=(n,d)=>d?Math.round(n/d*1000)/10:null;
export const pilotCategories = registry => whartonChoices(Object.values(registry.experiments).filter(e=>publicExperiment(e)&&!e.deleting));

export function calculatePilotMetrics({events,accountsData,categories,since,category='all'}) {
  const {accounts,browserOwners={}}=accountsData;
  const after=at=>!!day(at)&&(!since||day(at)>=since);
  const owners=new Map(Object.entries(browserOwners));
  const inferred=new Map();
  for(const {visitorId,accountKey} of events){
    if(!visitorId||!accountKey)continue;
    if(!inferred.has(visitorId))inferred.set(visitorId,new Set());
    inferred.get(visitorId).add(accountKey);
  }
  for(const [browser,keys] of inferred)if(!owners.has(browser)&&keys.size===1)owners.set(browser,[...keys][0]);
  const person=(browser,key)=>key?'a:'+key:browser?(owners.has(browser)?'a:'+owners.get(browser):'v:'+browser):null;
  const scoped=events.filter(e=>after(e.at));
  const relevant=e=>category==='all'||e.experimentId===category;
  const people=new Map();
  const get=id=>{
    if(!people.has(id))people.set(id,{days:new Set(),types:new Set(),complete:new Set(),board:new Set(),opens:new Set(),votes:new Set(),signup:null});
    return people.get(id);
  };
  for(const [key,account] of Object.entries(accounts)){
    if(!verifiedWharton(account)&&!account.whartonPilotCreatedAt)continue;
    const signup=account.whartonPilotCreatedAt||account.createdAt;
    const entry=get(person(null,key));
    entry.unlocked=verifiedWharton(account)&&after(account.categoriesUnlockedAt);
    if(after(signup)){
      entry.signup=signup;
      entry.days.add(day(signup));
      if(account.whartonPilotCreatedAt)entry.types.add('profile_created');
    }
  }
  const cohortEvents=new Set(['wharton_landing','email_submitted','code_verified','profile_created','category_chosen']);
  for(const e of events){
    const id=person(e.visitorId,e.accountKey);
    if(id&&cohortEvents.has(e.type))get(id);
  }
  for(const e of scoped){
    const id=person(e.visitorId,e.accountKey);
    if(!id||!people.has(id))continue;
    const entry=get(id);
    entry.days.add(day(e.at));
    entry.types.add(e.type);
    if(e.type==='profile_created')entry.signup=e.at;
    if(e.type==='category_chosen'&&e.source==='unlocked'&&e.accountKey)entry.startedUnlocked=true;
  }
  for(const {experiment,data} of categories){
    if(!experiment||!data)continue;
    const id=experiment.id,answered=new Map();
    const participants=new Set(),completionOnRecord=new Set();
    for(const s of Object.values(data.sessions||{})){
      const identity=person(s.visitorId);
      if(!people.has(identity))continue;
      participants.add(identity);
      const entry=get(identity);
      if(s.allCardsAt)completionOnRecord.add(identity);
      if(after(s.allCardsAt))entry.complete.add(id);
      if(after(s.boardAt))entry.board.add(id);
      if((s.peopleViews||s.profileViews)&&after(s.lastAt))entry.opens.add(id);
      // The legacy record holds milestone times and first/last activity for each session.
      for(const at of [s.visitedAt,s.lastAt,s.startedAt,s.allCardsAt,s.boardAt,s.endAt])if(after(at))entry.days.add(day(at));
      if(after(s.lastAt)&&Object.entries(s.answers||{}).some(([pid,answer])=>answer!=='skip'&&!data.baseVoteTimes?.[pid]?.[s.visitorId]))entry.votes.add(id);
    }
    for(const p of experiment.products){
      for(const [browser,verdict] of Object.entries(data.baseVotes?.[p.id]||{})){
        const identity=person(browser),at=data.baseVoteTimes?.[p.id]?.[browser];
        if(!people.has(identity))continue;
        participants.add(identity);
        if(!answered.has(identity))answered.set(identity,new Map());
        const votes=answered.get(identity);
        if(!votes.has(p.id)||at>votes.get(p.id))votes.set(p.id,at||'');
        if(after(at)){
          get(identity).days.add(day(at));
          if(verdict!=='skip')get(identity).votes.add(id);
        }
      }
    }
    for(const [identity,votes] of answered){
      if(!completionOnRecord.has(identity)&&experiment.products.length&&votes.size===experiment.products.length&&after([...votes.values()].sort().at(-1)))get(identity).complete.add(id);
    }
    for(const identity of participants)if(get(identity).board.has(id)&&get(identity).opens.has(id))get(identity).trusted=true;
  }
  const rows=[...people.values()];
  const tally=fn=>rows.filter(fn).length;
  const matches=set=>category==='all'?set.size>0:set.has(category);
  const depthAt=n=>tally(p=>p.complete.size>=n&&(category==='all'||p.complete.has(category)));
  const liveIds=categories.flatMap(({experiment})=>experiment&&collectionStatus(experiment)==='open'?[experiment.id]:[]);
  const unlocked=tally(p=>p.unlocked&&(category==='all'||p.complete.has(category)));
  const eligible=p=>liveIds.some(id=>p.complete.has(id)&&(category==='all'||category===id));
  const percentOfCompleters=pct(tally(p=>p.unlocked&&eligible(p)),tally(eligible));
  const lockedTaps=new Set(scoped.filter(e=>e.type==='locked_category_tap'&&relevant(e)).map(e=>person(e.visitorId,e.accountKey)).filter(Boolean)).size;
  const signupRows=rows.filter(p=>p.signup);
  const boards=tally(p=>matches(p.board));
  const trusted=tally(p=>category==='all'?p.trusted:p.board.has(category)&&p.opens.has(category));
  const returns=signupRows.filter(p=>[...p.days].filter(d=>d>=day(p.signup)).length>=2).length;
  const quickReturns=signupRows.filter(p=>[...p.days].some(d=>{
    const delta=dayNumber(d)-dayNumber(day(p.signup));
    return delta>=1&&delta<=7;
  })).length;
  const countEvents=(type,predicate=()=>true)=>scoped.filter(e=>e.type===type&&predicate(e)).length;
  const pulse=scoped.filter(e=>e.type==='pulse_answer'&&relevant(e));
  const shareTotal=countEvents('share_created'),shareSignups=countEvents('share_signup');
  const introDone=countEvents('intro_done'),introSkip=countEvents('intro_skipped');
  const metric=(key,label,value,definition,unit='count')=>({key,label,value,definition,unit});
  const funnel=[
    metric('landing','Landing',tally(p=>p.types.has('wharton_landing')),'Opened the Wharton signup screen.'),
    metric('email','Email submitted',tally(p=>p.types.has('email_submitted')),'Requested a sign-in code.'),
    metric('verified','Code verified',tally(p=>p.types.has('code_verified')),'Verified a sign-in code.'),
    metric('signup','Profile created',tally(p=>p.types.has('profile_created')),'Created a new Wharton pilot profile.'),
    metric('first-vote','First vote',tally(p=>matches(p.votes)),'Cast an item vote in a selected Edit.'),
    metric('first-complete','First category complete',depthAt(1),'Answered every product in at least one Wharton Edit.'),
    metric('board','Board viewed',boards,'Viewed a selected Board.'),
    metric('second-complete','Second category complete',depthAt(2),'Finished at least two Wharton Edits.'),
    metric('third-complete','All 3 complete',depthAt(3),'Finished all three Wharton Edits.')
  ].map((row,i,array)=>({...row,conversion:i?pct(row.value,array[i-1].value):null}));
  const sections=[
    {title:'Trust signal',metrics:[
      metric('trust','Opened a person or profile',pct(trusted,boards),'Board viewers who opened a person or profile in the same Edit.','percent'),
      ...['yes','maybe','no'].flatMap(answer=>{
        const n=pulse.filter(e=>e.answer===answer).length,label=answer[0].toUpperCase()+answer.slice(1);
        return [metric('pulse-'+answer,'Pulse · '+label,pct(n,pulse.length),n+' of '+pulse.length+' pulse answers.','percent'),metric('pulse-count-'+answer,label+' responses',n,'Responses to the Board pulse question.')];
      })
    ]},
    {title:'Depth',metrics:[
      ...[1,2,3].map(n=>metric('depth-'+n,n+' complete',tally(p=>p.complete.size===n&&(category==='all'||p.complete.has(category))),'People with exactly '+n+' completed Wharton Edits.')),
      {...metric('categories-unlocked','Unlocked all categories',unlocked,'People with a saved category unlock. The percentage uses people who finished at least one live Wharton Edit.'),percentOfCompleters},
      metric('started-after-unlock','Started a category after unlocking',tally(p=>p.startedUnlocked&&(category==='all'||p.complete.has(category))),'Unique people who selected a category from the unlocked list.'),
      metric('locked-category-tap','Tapped a locked category',lockedTaps,'Unique people who tapped a locked category.')
    ]},
    {title:'Return rate',metrics:[
      metric('return','Active on multiple days',pct(returns,signupRows.length),'Signed-up people active on at least two Eastern calendar days.','percent'),
      metric('return-week','Returned within 7 days',pct(quickReturns,signupRows.length),'Signed-up people active on Eastern days 1–7 after signup.','percent')
    ]},
    {title:'Spread',metrics:[
      metric('shares','Shares created',shareTotal,'Successful native shares, image downloads and link copies.'),
      metric('share-opens','Share opens',countEvents('share_opened'),'Visits to share pages.'),
      metric('share-signups','Signups from shares',shareSignups,'New profiles attributed to a share link.'),
      metric('signups-per-share','Signups per share',ratio(shareSignups,shareTotal),'Attributed signups divided by successful share actions.','ratio'),
      metric('vouch-share-opens','Vouch share page opens',countEvents('share_opened',e=>e.kind==='vouch'),'Visits to individual vouch share pages.'),
      ...['picks','winner','leaderboard','vouch'].flatMap(kind=>['native','download','copy_link'].map(method=>
        metric('share-'+kind+'-'+method,kind+' · '+method.replace('_',' '),countEvents('share_created',e=>e.kind===kind&&e.method===method),'Successful share actions for this card and method.')
      ))
    ]},
    {title:'Decision proxy',metrics:[...categories.filter(g=>g.experiment&&(category==='all'||g.experiment.id===category)).map(g=>{
      const id=g.experiment.id,n=countEvents('buy_click',e=>e.experimentId===id&&people.get(person(e.visitorId,e.accountKey))?.board.has(id));
      return metric('buy-'+g.key,g.name,ratio(n,tally(p=>p.board.has(id))),'Retailer clicks by viewers of this Board, divided by those viewers.','ratio');
    }),metric('buy-vouch-share','Buy clicks per vouch share-page open',
      ratio(countEvents('buy_click',e=>e.source==='share'),countEvents('share_opened',e=>e.kind==='vouch')),
      'Retailer clicks from vouch share pages divided by vouch share-page visits.','ratio')]},
    {title:'Intro',metrics:[
      metric('intro-done','Finished',pct(introDone,introDone+introSkip),'Share of finished or skipped intros that finished.','percent'),
      metric('intro-skipped','Skipped',pct(introSkip,introDone+introSkip),'Share of finished or skipped intros that skipped.','percent'),
      ...[1,2,3].map(step=>metric('skip-'+step,'Skipped on step '+step,countEvents('intro_skipped',e=>e.step===step),'People who skipped the intro on this step.'))
    ]}
  ];
  return {funnel,sections,followUps:pulse.filter(e=>e.followUp).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,20).map(({at,answer,followUp})=>({at,answer,followUp}))};
}

export function createPilotMetrics({store,authorizeAdmin,accountStore,registryStore}) {
  return async request=>{
    const url=new URL(request.url);
    if(url.pathname!=='/api/admin/pilot-metrics')return null;
    const headers={'Cache-Control':'private, no-store'};
    const json=(data,status=200)=>Response.json(data,{status,headers});
    if(!await authorizeAdmin(request))return json({error:'Organizer access required.'},401);
    try {
      const db=await pilotStore(store);
      if(request.method==='POST'){
        if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Request origin not allowed.'},403);
        if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({error:'Use a JSON request.'},415);
        const {since,target}=await readJson(request,2048);
        if(since!==undefined&&since!==null&&!validDay(since))return json({error:'Choose a valid start date.'},400);
        if(target!==undefined&&(!target||typeof target.key!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(target.key)||target.value!==null&&(!Number.isFinite(target.value)||target.value<0)))return json({error:'Enter a valid target.'},400);
        const settings=await db.transaction(data=>{
          if(since!==undefined)data.settings.since=since;
          if(target){
            if(target.value===null)delete data.settings.targets[target.key];
            else data.settings.targets[target.key]=target.value;
          }
          return data.settings;
        });
        return json(settings);
      }
      if(request.method!=='GET')return json({error:'Method not allowed.'},405);
      const [pilot,accountsData,registry]=await Promise.all([db.read(),accountStore().then(s=>s.read()),registryStore().then(s=>s.read())]);
      const categories=await Promise.all(pilotCategories(registry).map(async group=>{
        const id=group.experiment?.id;
        return {...group,data:id?await (id==='sunscreen'?store:await store.scope('experiment:'+id,fresh)).read():null};
      }));
      const available=categories.filter(g=>g.experiment).map(g=>({id:g.experiment.id,name:g.name}));
      const defaultSince=Object.values(accountsData.accounts).filter(verifiedWharton).map(a=>day(a.whartonPilotCreatedAt||a.createdAt)).filter(Boolean).sort()[0]||null;
      const since=pilot.settings.since||defaultSince;
      const input={events:pilot.events,accountsData,categories,since};
      const reports=Object.fromEntries(['all',...available.map(g=>g.id)].map(category=>[category,calculatePilotMetrics({...input,category})]));
      return json({categories:available,settings:pilot.settings,defaultSince,since,reports});
    }catch(error){
      return json({error:error.status?error.message:'Could not load pilot metrics.'},error.status||503);
    }
  };
}
