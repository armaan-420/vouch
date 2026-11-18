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
