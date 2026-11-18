import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createAccountsApi,initialAccounts} from '../lib/accounts.mjs';
import {cleanPilotEvent} from '../lib/pilot-events.mjs';
import {calculatePilotMetrics} from '../lib/pilot-metrics.mjs';
import {whartonChoices,categoryHref,extraCategories} from '../public/wharton-categories.js';
import {whartonProgress} from '../public/wharton-home.js';
import {nextStep} from '../public/pilot-next.js';
import {progressMarkup} from '../public/pilot-progress.js';

const options=['Water bottles','Lip balm','Carry-on luggage','Headphones'].map((category,i)=>({
  category,id:'edit-'+i,title:category,products:[{id:'sku-'+i,brand:'A'}]
}));
const states=(...statuses)=>Object.fromEntries(statuses.map((status,i)=>[options[i].id,{status}]));
const profile={whartonEmailVerified:true,handle:'v-example'};
const at='2026-11-18T20:00:00.000Z';
const email='member@wharton.upenn.edu';

test('only a verified member has Wharton as their logo destination',async()=>{
  const source=await readFile(new URL('../public/brand.js',import.meta.url),'utf8');
  const {homePathFor}=runInNewContext(source+'\n;({homePathFor});');
  assert.equal(homePathFor(profile),'/wharton');
  for(const other of [null,undefined,{}, {whartonEmailVerified:false},{...profile,browserProfile:true},{...profile,verificationRequired:true}]){
    assert.equal(homePathFor(other),null);
  }
});

test('Wharton home uses live categories in fixed order and links to the right screen',()=>{
  const groups=whartonChoices([options[2],options[1],options[0],options[3]]);
  for(const [fixture,state,done,next] of [
    [[], 'new',0,0],
    [['new','partial','new'],'returning',0,0],
    [['partial','done','new'],'returning',1,0],
    [['done','done','partial'],'returning',2,2],
    [['done','done','done'],'done',3,null]
  ]){
    const model=whartonProgress(groups,states(...fixture));
    assert.equal(model.state,state);
    assert.equal(model.done,done);
    assert.equal(model.next?.experiment.id,next===null?undefined:options[next].id);
  }
  assert.equal(whartonProgress(whartonChoices(options.slice(0,2)),states('done','done')).live.length,2);
  assert.equal(categoryHref('lip-balm','partial',true),'/lip-balm?start=1&resume=1&wharton=1');
  assert.equal(categoryHref('headphones','done'),'/headphones?board=1');
  assert.equal(categoryHref('headphones','new'),'/headphones?start=1');
  assert.deepEqual(extraCategories(options),options.slice(3));
  assert.match(progressMarkup(1,'1 of 2 vouched',{role:'img',segments:2}),/role="img" aria-label="1 of 2 vouched"/);
});

test('Board promotes unlock only for a verified member who completed every live category and has more to open',()=>{
  const setup={items:whartonChoices(options),states:states('done','done','done'),pilot:{canShare:true},profile,available:options};
  assert.equal(nextStep(setup).showUnlock,true);
  assert.equal(nextStep({...setup,profile:{...profile,categoriesUnlockedAt:at}}).showUnlock,false);
  assert.equal(nextStep({...setup,available:options.slice(0,3)}).showUnlock,false);
  assert.equal(nextStep({...setup,states:states('done','done','partial')}).showUnlock,false);
  assert.equal(nextStep({...setup,profile:{}}),null);
});

test('account unlock requires verified identity and completed live Edits, then keeps the first timestamp',async()=>{
  const {accounts,browserOwners}=initialAccounts();
  const account={email,emailVerified:true,createdAt:at,opinions:{},history:[],milestones:[]};
  const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('member'))),b=>b.toString(16).padStart(2,'0')).join('');
  accounts[key]=account;
  const sameBrand={id:'alternate',brand:'A'};
  const published=[options[0],options[1],{...options[2],startsAt:'2099-01-01'},options[3]];
  const otherEdits=Array.from({length:20},(_,i)=>({id:'more-'+i,products:[],category:'Other',title:'Other'}));
  const registry={experiments:Object.fromEntries([...published,...otherEdits].map(e=>[e.id,e]))};
  const snapshot=id=>{
    const e=registry.experiments[id];
    return {experiment:id===options[0].id?{...e,products:[...e.products,sameBrand]}:e,data:{}};
  };
  const data={accounts,browserOwners};
  const store={scope:async name=>name==='experiment-registry'?{read:()=>registry}:{read:()=>data,transaction:fn=>fn(data)}};
  const api=createAccountsApi({store,getIdentity:r=>r.headers.has('x-member')?{subject:'member'}:null,getExperiment:snapshot});
  const request=(pathname,init)=>api(new Request('https://vouch.test'+pathname,init));
  const post=(headers={},signedIn=true)=>request('/api/account/pilot-unlock',{
    method:'POST',body:'{}',headers:{'Content-Type':'application/json',Origin:'https://vouch.test',...(signedIn?{'x-member':'1'}:{}),...headers}
  });
  assert.equal((await post({},false)).status,403);
  assert.equal((await post({Origin:'https://elsewhere.test'})).status,403);
  account.browserProfile=true;
  assert.equal((await post()).status,403);
  account.browserProfile=false;
  assert.equal((await post()).status,409);
  for(const e of published.slice(0,2))account.opinions['p:'+e.products[0].id]={experimentId:e.id,verdict:'skip'};
  const result=await (await post()).json();
  assert.ok(result.categoriesUnlockedAt);
  assert.deepEqual(await (await post()).json(),result);
  const me=await (await request('/api/account/me',{headers:{'x-member':'1'}})).json();
  assert.equal(me.profile.whartonEmailVerified,true);
  assert.equal(me.profile.categoriesUnlockedAt,result.categoriesUnlockedAt);
  const query=new URLSearchParams(Object.keys(registry.experiments).map(id=>['id',id]));
  const response=await request('/api/category-participation?'+query);
  assert.equal(response.status,200);
  assert.equal(Object.keys((await response.json()).categories).length,24);
  assert.equal((await request('/api/category-participation?'+query+'&id=too-many')).status,400);
  assert.equal((await request('/api/category-participation?id=INVALID_ID')).status,400);
});

test('pilot telemetry accepts unlock fields and Depth reports unique starts and completion percentage',()=>{
  const chosen={type:'category_chosen',experimentId:'headphones'};
  assert.deepEqual(cleanPilotEvent(chosen),chosen);
  for(const source of ['wharton','unlocked'])assert.deepEqual(cleanPilotEvent({...chosen,source}),{...chosen,source});
  assert.throws(()=>cleanPilotEvent({...chosen,source:'other'}));
  assert.deepEqual(cleanPilotEvent({type:'categories_unlocked',experimentId:'headphones',extra:1}),{type:'categories_unlocked'});
  assert.equal(cleanPilotEvent({type:'next_step_click',state:3,action:'unlock'}).action,'unlock');
  const member={email,emailVerified:true,createdAt:at};
  const accountsData={accounts:{a:{...member,categoriesUnlockedAt:at},b:member},browserOwners:{browserA:'a',browserB:'b'}};
  const categories=options.slice(0,3).map(experiment=>({experiment,data:{sessions:{
    a:{visitorId:'browserA',allCardsAt:at},
    b:{visitorId:'browserB',allCardsAt:at}
  }}}));
  const click={...chosen,source:'unlocked',at,accountKey:'a'};
  const report=calculatePilotMetrics({events:[click,click,{...click,accountKey:'b',source:'wharton'}],accountsData,categories});
  const metrics=Object.fromEntries(report.sections.find(s=>s.title==='Depth').metrics.map(m=>[m.key,m]));
  assert.equal(metrics['categories-unlocked'].value,1);
  assert.equal(metrics['categories-unlocked'].percentOfCompleters,50);
  assert.equal(metrics['started-after-unlock'].value,1);
});
