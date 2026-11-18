import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanPilotEvent,createPilotEvents} from '../lib/pilot-events.mjs';
import {calculatePilotMetrics} from '../lib/pilot-metrics.mjs';

const post=(value,headers={})=>new Request('https://vouch.test/api/pilot-events',{
  method:'POST',
  headers:{origin:'https://vouch.test','content-type':'application/json',cookie:'vouch_visitor=12345678-abcd-abcd-abcd-123456789abc',...headers},
  body:JSON.stringify(value)
});

test('pilot event allowlist, field projection, JSON, origin, byte cap and silent rate limit',async()=>{
  const state={events:[],rates:{}};
  const store={scope:async()=>({transaction:fn=>fn(state)})};
  const handle=createPilotEvents({store,getAccount:async()=>({}),now:()=>Date.parse('2026-11-18T17:00Z')});
  assert.equal((await handle(post({type:'other'}))).status,400);
  assert.equal((await handle(post({type:'wharton_landing'},{origin:'https://other.test'}))).status,403);
  assert.equal((await handle(post({type:'wharton_landing'},{'content-type':'text/plain'}))).status,415);
  assert.equal((await handle(post({type:'wharton_landing',text:'a'.repeat(2048)}))).status,413);
  const event={type:'wharton_landing',email:'a@example.com',text:'sample',name:'Sample',ref:'a@example.com'};
  for(let i=0;i<122;i++)assert.equal((await handle(post(event))).status,204);
  assert.equal(state.events.length,120);
  assert.deepEqual(Object.keys(state.events[0]).sort(),['at','type','visitorId']);
  assert.deepEqual(cleanPilotEvent({type:'pulse_answer',answer:'yes',experimentId:'waterbottle',followUp:' '+ 'x'.repeat(300)+' ',email:'a@example.com'}),{
    type:'pulse_answer',answer:'yes',experimentId:'waterbottle',followUp:'x'.repeat(240)
  });
});

test('funnel merges pre-signup visitor history and return rate uses Eastern midnight',()=>{
  const accountsData={accounts:{a:{whartonPilotCreatedAt:'2026-11-19T04:55:00Z'},b:{whartonPilotCreatedAt:'2026-11-19T04:50:00Z'}},browserOwners:{old:'a'}};
  const events=[
    {type:'wharton_landing',visitorId:'old',at:'2026-11-19T04:53:00Z'},
    {type:'wharton_landing',visitorId:'new',accountKey:'a',at:'2026-11-19T04:55:00Z'},
    {type:'email_submitted',visitorId:'old',at:'2026-11-19T04:54:00Z'},
    {type:'profile_created',visitorId:'new',accountKey:'a',at:'2026-11-19T04:55:00Z'},
    {type:'profile_created',visitorId:'other',accountKey:'b',at:'2026-11-19T04:50:00Z'},
    {type:'intro_step',visitorId:'other',accountKey:'b',at:'2026-11-19T04:59:59Z'},
    {type:'buy_click',visitorId:'new',accountKey:'a',experimentId:'bottles',at:'2026-11-19T05:00:00Z'}
  ];
  const categories=[{key:'water-bottles',name:'Water bottles',experiment:{id:'bottles',products:[{id:'bottle'}]},data:{
    sessions:{session:{visitorId:'old',allCardsAt:'2026-11-19T04:59:00Z',boardAt:'2026-11-19T04:59:01Z',lastAt:'2026-11-19T05:01:00Z',peopleViews:1}},
    baseVotes:{bottle:{old:'yes'}},baseVoteTimes:{bottle:{old:'2026-11-19T04:59:00Z'}}
  }}];
  const report=calculatePilotMetrics({events,accountsData,categories,since:'2026-11-18'});
  assert.deepEqual(report.funnel.map(row=>row.value),[1,1,0,2,1,1,1,0,0]);
  const result=Object.fromEntries(report.sections.flatMap(s=>s.metrics).map(row=>[row.key,row.value]));
  assert.equal(result.return,50);
  assert.equal(result['return-week'],50);
  assert.equal(result['buy-water-bottles'],1);
  assert.equal(result.trust,100);
});

test('a Wharton pulse answer is counted once across categories and only organizer metrics expose follow-up',async()=>{
  const {createPilotMetrics}=await import('../lib/pilot-metrics.mjs');
  const pulse={events:[],rates:{},settings:{targets:{}}};
  const account={email:'test@wharton.upenn.edu',emailVerified:true,createdAt:'2026-11-18T16:00Z'};
  const accounts={accounts:{member:account},browserOwners:{}};
  const store={scope:async()=>({read:()=>pulse,transaction:fn=>fn(pulse)})};
  const accountStore=async()=>({read:()=>accounts,transaction:fn=>fn(accounts)});
  const handle=createPilotEvents({store,accountStore,getAccount:async()=>({key:'member',account}),now:()=>Date.parse('2026-11-18T17:00Z')});
  const answer={type:'pulse_answer',experimentId:'waterbottle',answer:'yes'};
  assert.equal((await handle(post(answer))).status,204);
  const followUp='<b>'+ 'x'.repeat(240)+'</b>';
  assert.equal((await handle(post({...answer,followUp}))).status,204);
  assert.ok(account.pilotPulseSeenAt);
  assert.equal((await handle(post({type:'pulse_answer',experimentId:'lip-balm',answer:'no'}))).status,204);
  assert.equal((await handle(post({type:'pulse_shown',experimentId:'lip-balm'}))).status,204);
  assert.equal(pulse.events.length,1);
  assert.equal(pulse.events[0].followUp.length,240);

  const url='https://vouch.test/api/admin/pilot-metrics';
  const metrics=createPilotMetrics({store,accountStore,registryStore:async()=>({read:()=>({experiments:{}})}),authorizeAdmin:r=>r.headers.get('x-test-admin')==='yes'});
  assert.equal((await metrics(new Request(url))).status,401);
  const result=await (await metrics(new Request(url,{headers:{'x-test-admin':'yes'}}))).json();
  assert.deepEqual(result.reports.all.followUps,[{at:'2026-11-18T17:00:00.000Z',answer:'yes',followUp:followUp.slice(0,240)}]);
  const other={...account,pilotPulseSeenAt:null};
  accounts.accounts.other=other;
  const dismiss=createPilotEvents({store,accountStore,getAccount:async()=>({key:'other',account:other})});
  assert.equal((await dismiss(post({type:'pulse_dismissed',experimentId:'waterbottle'}))).status,204);
  assert.ok(other.pilotPulseSeenAt);
  await dismiss(post({...answer,experimentId:'lip-balm'}));
  assert.equal(pulse.events.filter(e=>e.accountKey==='other').length,1);
  assert.equal(pulse.events.at(-1).type,'pulse_dismissed');
});
