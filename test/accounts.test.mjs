import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createFileStore} from '../lib/file-store.mjs';
import {createAccountsApi} from '../lib/accounts.mjs';
import {fresh} from '../lib/vouch-api.mjs';

const browser='11111111-1111-4111-a111-111111111111';
const otherBrowser='22222222-2222-4222-a222-222222222222';
const when='2026-11-02T10:00:00.000Z';
const products=[{id:'sku-one',brand:'Example',name:'First item'},{id:'sku-two',brand:'Other',name:'Second item'},{id:'sku-three',brand:'Third',name:'Third item'}];
async function setup(t){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-accounts-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const store=await createFileStore(dir);
  const states={first:fresh(),second:fresh()};
  const accountApi=createAccountsApi({store,getIdentity:async request=>{const subject=request.headers.get('x-test-identity');return subject?{subject}:null},getExperiment:async id=>{
    if(!Object.hasOwn(states,id))throw Object.assign(Error('Experiment not found.'),{status:404});
    return {experiment:{id,title:id+' edit',category:'Products',products},data:structuredClone(states[id])};
  }});
  const answer=(productId,verdict,{experiment='first',visitor=browser,at=when}={})=>{states[experiment].baseVotes[productId]??={};states[experiment].baseVoteTimes??={};states[experiment].baseVoteTimes[productId]??={};states[experiment].baseVotes[productId][visitor]=verdict;states[experiment].baseVoteTimes[productId][visitor]=at};
  function request(endpoint,{body,identity,browserId=browser,headers={}}={}){
    return new Request('https://vouch.example'+endpoint,{method:body===undefined?'GET':'POST',headers:{...(browserId?{cookie:'vouch_visitor='+browserId}:{}),...(identity?{'x-test-identity':identity}:{}),...(body===undefined?{}:{'content-type':'application/json',origin:'https://vouch.example'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  }
  async function call(endpoint,options){const response=await accountApi(request(endpoint,options));return response?{status:response.status,data:await response.json()}:null}
  const preview=async(options)=>{const result=await call('/api/account/edit?experiment=first',options);assert.equal(result.status,200);return result.data};
  const claim=async(ticket,identity='alice',rows=ticket.opinions.map(x=>({productId:x.productId})),extra={})=>call('/api/account/claim',{identity,body:{claimToken:ticket.claimToken,opinions:rows,...extra}});
  return {store,states,answer,request,call,preview,claim,api:accountApi};
}

test('interrupted anonymous signup safely claims reviewed opinions once without modifying experiment history',async t=>{
  const f=await setup(t);f.answer('sku-one','yes');f.answer('sku-two','no');f.answer('sku-three','brand');
  const historical=JSON.stringify(f.states),preview=await f.preview();
  assert.deepEqual(preview.counts,{yes:1,no:1,brand:1});
  assert.equal((await f.claim(preview,null)).status,401);
  const claimed=await f.claim(preview,'alice',undefined,{displayName:'Alice'});
  assert.equal(claimed.status,200);assert.equal(claimed.data.claimedCount,3);
  assert.equal(claimed.data.profile.visibility,'private');assert.equal(claimed.data.profile.opinions.length,3);
  assert.deepEqual(claimed.data.profile.milestones,['first-edit']);
  const retry=await f.claim(preview,'alice',undefined,{displayName:'Alice'});
  assert.equal(retry.status,200);assert.equal(retry.data.profile.opinions.length,3);
  const record=await (await f.store.scope('accounts-v1')).read();
  assert.equal(Object.values(record.accounts)[0].history.length,3);
  assert.equal(JSON.stringify(f.states),historical);
});

test('public products and profiles disclose only explicitly public opinions and no account identity',async t=>{
  const f=await setup(t);f.answer('sku-one','yes');f.answer('sku-two','no');
  const ticket=await f.preview(),claim=await f.claim(ticket,'alice',[{productId:'sku-one',visibility:'public'},{productId:'sku-two',visibility:'private'}]);
  const handle=claim.data.profile.handle;
  assert.equal((await f.call('/api/profiles/'+handle)).status,404);
  assert.deepEqual((await f.call('/api/products/sku-one')).data.contributors,[]);
  await f.call('/api/account/profile',{identity:'alice',body:{visibility:'public',displayName:'Public Alice'}});
  const pub=await f.call('/api/profiles/'+handle);
  assert.equal(pub.data.profile.opinions.length,1);assert.equal(pub.data.profile.opinions[0].verdict,'yes');
  assert.equal(pub.data.profile.opinions[0].experimentId,undefined);
  const product=await f.call('/api/products/sku-one');assert.deepEqual(product.data.counts,{yes:1,no:0,brand:0});
  assert.equal(product.data.contributors[0].displayName,'Public Alice');
  assert.doesNotMatch(JSON.stringify(product.data),/subject|visitor|email|x-test-identity|first edit/);
  assert.equal((await f.call('/api/products/sku-two')).data.contributors.length,0);
  await f.call('/api/account/profile',{identity:'alice',body:{visibility:'private'}});
  assert.equal((await f.call('/api/products/sku-one')).data.contributors.length,0);
});

test('claim tokens bind the browser, exact review, selected rows and ownership across account switching',async t=>{
  const f=await setup(t);f.answer('sku-one','yes');const ticket=await f.preview();
  const body={claimToken:ticket.claimToken,opinions:[{productId:'sku-one'}]};
  assert.equal((await f.call('/api/account/claim',{identity:'alice',browserId:otherBrowser,body})).status,409);
  assert.equal((await f.call('/api/account/claim',{identity:'alice',browserId:null,body})).status,400);
  assert.equal((await f.claim(ticket,'alice',[{productId:'sku-two'}])).status,400);
  assert.equal((await f.claim(ticket)).status,200);
  assert.equal((await f.claim(ticket,'bob')).status,409);
  const second=await f.preview({identity:'bob'});assert.equal(second.opinions[0].claimable,false);
  assert.equal((await f.claim(second,'bob')).status,409);
  const row=(await f.call('/api/account/me',{identity:'bob'})).data;assert.equal(row.profile,null);
});

test('changed review snapshots and expired tickets require review instead of silently saving stale opinions',async t=>{
  const f=await setup(t);f.answer('sku-one','yes');const ticket=await f.preview();
  f.answer('sku-one','no',{at:'2026-11-02T11:00:00.000Z'});
  assert.equal((await f.claim(ticket)).status,409);
  const newer=await f.preview();const scoped=await f.store.scope('accounts-v1');
  await scoped.transaction(data=>{data.tickets[newer.claimToken].expiresAt=Date.now()-1});
  assert.equal((await f.claim(newer)).status,409);
});

test('signed-in answers connect a new browser while leaving unrelated anonymous responses unclaimed',async t=>{
  const f=await setup(t);f.answer('sku-one','yes');f.answer('sku-two','no');
  assert.equal((await f.api.syncAccountOpinions(f.request('/',{identity:'alice'}),'first','sku-one')).synced,1);
  assert.deepEqual((await f.call('/api/account/me',{identity:'alice'})).data.profile.opinions.map(o=>o.productId),['sku-one']);
  await f.claim(await f.preview(),'alice',[{productId:'sku-one',visibility:'public'}],{visibility:'public'});
  f.answer('sku-three','brand',{at:'2026-11-02T11:00:00.000Z'});
  assert.equal((await f.api.syncAccountOpinions(f.request('/',{identity:'alice'}),'first','sku-three')).synced,1);
  const profile=(await f.call('/api/account/me',{identity:'alice'})).data.profile;
  assert.deepEqual(profile.counts,{yes:1,no:0,brand:1});
  assert.equal(profile.opinions.find(x=>x.productId==='sku-three').visibility,'private');
  assert.equal((await f.api.syncAccountOpinions(f.request('/',{identity:'bob'}),'first','sku-two')).synced,0);
  f.answer('sku-one','no',{at:'2026-11-02T12:00:00.000Z'});
  await f.api.syncAccountOpinions(f.request('/',{identity:'alice'}),'first','sku-one');
  assert.equal((await f.call('/api/products/sku-one')).data.contributors[0].verdict,'no');
});

test('current opinions keep one latest canonical product across experiments while historical edits and visibility persist',async t=>{
  const f=await setup(t);f.answer('sku-one','yes');await f.claim(await f.preview(),'alice',[{productId:'sku-one',visibility:'public'}],{visibility:'public'});
  f.answer('sku-one','brand',{experiment:'second',at:'2026-11-02T11:00:00.000Z'});
  await f.api.syncAccountOpinions(f.request('/',{identity:'alice'}),'second','sku-one');
  let profile=(await f.call('/api/account/me',{identity:'alice'})).data.profile;
  assert.equal(profile.opinions.length,1);assert.equal(profile.opinions[0].verdict,'brand');assert.equal(profile.opinions[0].visibility,'public');
  const historical=JSON.stringify(f.states);
  await f.call('/api/account/profile',{identity:'alice',body:{opinions:[{productId:'sku-one',verdict:'no'}]}});
  profile=(await f.call('/api/account/me',{identity:'alice'})).data.profile;assert.equal(profile.opinions[0].verdict,'no');
  await f.call('/api/account/profile',{identity:'alice',body:{opinions:[{productId:'sku-one',verdict:'skip'}]}});
  assert.equal((await f.call('/api/account/me',{identity:'alice'})).data.profile.opinions.length,0);
  assert.equal((await f.call('/api/products/sku-one')).data.contributors.length,0);
  assert.equal(JSON.stringify(f.states),historical);
  const record=await (await f.store.scope('accounts-v1')).read();assert.equal(Object.values(record.accounts)[0].history.length,4);
});

test('concurrent competing claims have one owner and hostile mutation origins cannot change profiles',async t=>{
  const f=await setup(t);f.answer('sku-one','no');const ticket=await f.preview();
  const outcomes=await Promise.all([f.claim(ticket,'alice'),f.claim(ticket,'bob')]);
  assert.deepEqual(outcomes.map(x=>x.status).sort(),[200,409]);
  const identity=outcomes[0].status===200?'alice':'bob';
  assert.equal((await f.call('/api/account/profile',{identity,body:{displayName:'Changed'},headers:{origin:'https://evil.example'}})).status,403);
  assert.equal((await f.call('/api/account/profile',{identity,body:{displayName:'Changed'},headers:{'sec-fetch-site':'cross-site'}})).status,403);
  assert.equal((await f.call('/api/account/profile',{identity,body:{displayName:'Changed'},headers:{'content-type':'text/plain'}})).status,415);
});

test('skip-only completion gives no misleading milestone; unknown endpoints fall through',async t=>{
  const f=await setup(t);f.answer('sku-one','skip');const ticket=await f.preview();assert.equal(ticket.opinions.length,0);
  const account=await f.claim(ticket);assert.equal(account.status,200);assert.deepEqual(account.data.profile.milestones,[]);
  assert.equal(await f.call('/api/products/search?q=hello'),null);
  assert.equal(await f.call('/api/board'),null);
});

test('known unclaimed experiment products have useful pages with zero public evidence',async t=>{
  const f=await setup(t);
  const defaultPage=await f.call('/api/products/boj');
  assert.equal(defaultPage.status,200);assert.equal(defaultPage.data.product.id,'boj');assert.deepEqual(defaultPage.data.contributors,[]);
  assert.deepEqual(defaultPage.data.counts,{yes:0,no:0,brand:0});
  const registry=await f.store.scope('experiment-registry');
  await registry.transaction(data=>{data.experiments={custom:{id:'custom',title:'Custom',category:'Gear',products:[{id:'sku-bag',name:'Bag',brand:'Example'}]}}});
  const customPage=await f.call('/api/products/sku-bag');assert.equal(customPage.status,200);assert.equal(customPage.data.product.category,'Gear');
  assert.equal((await f.call('/api/products/unknown')).status,404);
  const accountRecords=await (await f.store.scope('accounts-v1')).read();assert.equal(Object.keys(accountRecords.accounts).length,0);
});

test('expired or switched identities require a fresh visitor before anonymous reads and writes',async t=>{
  const f=await setup(t);f.answer('sku-one','yes');await f.claim(await f.preview());
  assert.equal(await f.api.needsFreshVisitor(f.request('/',{identity:'alice'})),false);
  assert.equal(await f.api.needsFreshVisitor(f.request('/')),true);
  assert.equal(await f.api.needsFreshVisitor(f.request('/',{identity:'bob'})),true);
  assert.equal(await f.api.needsFreshVisitor(f.request('/',{identity:'alice',browserId:otherBrowser})),false);
  assert.equal(await f.api.needsFreshVisitor(f.request('/',{browserId:null})),false);
  const missingOrigin=f.request('/api/account/profile',{identity:'alice',body:{visibility:'public'}});
  const headers=new Headers(missingOrigin.headers);headers.delete('origin');
  const response=await f.api(new Request(missingOrigin,{headers}));assert.equal(response.status,403);
});

test('direct account onboarding creates a browser-bound ticket even before voting',async t=>{
  const f=await setup(t),response=await f.api(f.request('/api/account/edit?experiment=first',{browserId:null}));
  assert.equal(response.status,200);const ticket=await response.json();assert.equal(ticket.opinions.length,0);assert.ok(ticket.claimToken);
  const cookie=response.headers.getSetCookie()[0];assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);
  const browserId=cookie.split(';')[0].split('=')[1];
  const claimed=await f.call('/api/account/claim',{identity:'alice',browserId,body:{claimToken:ticket.claimToken,opinions:[]}});
  assert.equal(claimed.status,200);assert.deepEqual(claimed.data.profile.milestones,[]);
  assert.equal(await f.api.needsFreshVisitor(f.request('/',{browserId})),true);
});

test('refreshing a review replaces unused snapshots while consumed claims remain retryable',async t=>{
  const f=await setup(t);f.answer('sku-one','no');
  const first=await f.preview();let latest;
  for(let i=0;i<8;i++)latest=await f.preview();
  const records=await (await f.store.scope('accounts-v1')).read();assert.equal(Object.keys(records.tickets).length,1);
  assert.equal((await f.claim(first)).status,409);
  assert.equal((await f.claim(latest)).status,200);
  await f.preview({identity:'alice'});
  assert.equal((await f.claim(latest)).status,200);
  const after=await (await f.store.scope('accounts-v1')).read();assert.equal(after.tickets[latest.claimToken].items,undefined);
});

test('profile bio validates, trims and persists without leaking non-vouches or private history',async t=>{
  const f=await setup(t);f.answer('sku-one','yes');f.answer('sku-two','no');f.answer('sku-three','brand');
  const claimed=await f.claim(await f.preview(),'alice',undefined,{visibility:'public'});
  const handle=claimed.data.profile.handle;
  assert.equal((await f.call('/api/account/profile',{identity:'alice',body:{bio:'x'.repeat(161)}})).status,400);
  assert.equal((await f.call('/api/account/profile',{identity:'alice',body:{bio:{text:'bad'}}})).status,400);
  assert.equal((await f.call('/api/account/profile',{identity:'alice',body:{displayName:'A'}})).status,400);
  const result=await f.call('/api/account/profile',{identity:'alice',body:{bio:'  <script>sample</script>  ',opinions:products.map(p=>({productId:p.id,visibility:'public'}))}});
  assert.equal(result.data.profile.bio,'<script>sample</script>');assert.equal(result.data.profile.opinions.length,3);
  const pub=(await f.call('/api/profiles/'+handle)).data.profile;
  assert.equal(pub.opinions.length,1);assert.equal(pub.opinions[0].productId,'sku-one');assert.equal(pub.opinions[0].vouchedAt,when);assert.equal(pub.createdAt,result.data.profile.createdAt);
  assert.equal(pub.history,undefined);assert.equal(pub.milestones,undefined);assert.equal(pub.opinions[0].sourceProductId,undefined);assert.equal(pub.opinions[0].experimentId,undefined);
  await f.call('/api/account/profile',{identity:'alice',body:{bio:'',opinions:[{productId:'sku-one',visibility:'private'}]}});
  assert.equal((await f.call('/api/profiles/'+handle)).data.profile.opinions.length,0);
  await f.call('/api/account/profile',{identity:'alice',body:{visibility:'private'}});
  assert.equal((await f.call('/api/profiles/'+handle)).status,404);
});

test('history retains first item-vouch date across subsequent verdict and visibility changes',async t=>{
 const f=await setup(t);f.answer('sku-one','yes');await f.claim(await f.preview());
 await f.call('/api/account/profile',{identity:'alice',body:{opinions:[{productId:'sku-one',verdict:'no'}]}});
 const result=await f.call('/api/account/profile',{identity:'alice',body:{opinions:[{productId:'sku-one',verdict:'yes',visibility:'public'}]}});
 assert.equal(result.data.profile.opinions[0].vouchedAt,when);
});

test('history scores use the canonical item in its own experiment and refresh with current votes',async t=>{
 const f=await setup(t);f.answer('sku-one','yes');await f.claim(await f.preview(),'alice',[{productId:'sku-one',visibility:'public'}],{visibility:'public'});
 f.answer('sku-one','no',{visitor:otherBrowser});let profile=(await f.call('/api/account/me',{identity:'alice'})).data.profile;assert.equal(profile.opinions[0].score,'5.0');assert.equal(profile.opinions[0].scoreStatus,'rated');
 const pub=(await f.call('/api/profiles/'+profile.handle)).data.profile;assert.equal(pub.opinions[0].score,'5.0');assert.equal(pub.opinions[0].experimentId,undefined);assert.ok(!JSON.stringify(pub).includes(browser));
 f.answer('sku-one','yes',{experiment:'second',at:'2026-11-03T12:00:00.000Z'});await f.api.syncAccountOpinions(f.request('/',{identity:'alice'}),'second','sku-one');profile=(await f.call('/api/account/me',{identity:'alice'})).data.profile;assert.equal(profile.opinions[0].score,'7.5');assert.equal(profile.opinions[0].experimentTitle,'second edit');
 delete f.states.second.baseVotes['sku-one'];profile=(await f.call('/api/account/me',{identity:'alice'})).data.profile;assert.equal(profile.opinions[0].score,null);assert.equal(profile.opinions[0].scoreStatus,'unrated');
});

test('history scores resolve community additions by stable SKU instead of a base item ID',async t=>{
 const f=await setup(t),key='catalog:sku-community',product={id:'sku-community',brand:'Community brand',name:'Community item'},communityId='community-'+key;
 f.states.first.nominations=[browser,otherBrowser].map(visitorId=>({key,name:'Community item',visitorId,createdAt:when,product}));f.states.first.reviews[key]={canonicalKey:key,canonicalName:'Community item',product};f.states.first.communityVotes[communityId]={[browser]:'yes',[otherBrowser]:'yes'};
 const preview=await f.preview();assert.ok(preview.opinions.some(o=>o.productId==='sku-community'));const result=await f.claim(preview,'alice',[{productId:'sku-community'}]);assert.equal(result.status,200);assert.equal(result.data.profile.opinions[0].score,'8.3');
});
