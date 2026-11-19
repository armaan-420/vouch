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

test('starter product purchase URLs backfill older metadata and preserve explicit merchant links',async t=>{
 const f=await setup(t);
 const ids=['boj','eltamd','skin1004','supergoop','roundlab','medicube','mixsoon','innisfree'];
 const registry=await f.store.scope('experiment-registry',()=>({experiments:{},skus:{}}));
 await registry.transaction(d=>{d.experiments={sunscreen:{id:'sunscreen',category:'Sunscreen',products:ids.map(id=>({id,name:id,brand:id}))}}});
 for(const id of ids){const result=await f.call('/api/products/'+id);assert.equal(result.status,200);assert.match(result.data.product.url,/^https:\/\//);assert.notEqual(new URL(result.data.product.url).pathname,'/');}
 await registry.transaction(d=>{d.experiments.sunscreen.products[0].url='https://shop.example.com/alternate-relief-sun'});
 assert.equal((await f.call('/api/products/boj')).data.product.url,'https://shop.example.com/alternate-relief-sun');
 assert.equal((await f.call('/api/products/not-a-product')).status,404);
});

test('product tags follow the account across devices and appear in its library without duplicate votes',async t=>{
 const f=await setup(t);f.answer('sku-one','yes');
 const preview=await f.preview();
 await f.claim(preview,'alice',undefined,{displayName:'Alice'});
 const selected=await f.call('/api/products/sku-one',{identity:'alice',body:{tagIds:['design','staple']}});
 assert.equal(selected.status,200);assert.deepEqual(selected.data.selectedTagIds,['design','staple']);
 const otherDevice={identity:'alice',browserId:otherBrowser};
 const restored=await f.call('/api/products/sku-one',otherDevice);
 assert.deepEqual(restored.data.selectedTagIds,['design','staple']);
 assert.equal(restored.data.tags.find(t=>t.id==='staple').count,1);
 const profile=await f.call('/api/account/me',otherDevice);
 assert.deepEqual(profile.data.profile.opinions[0].tags.map(t=>t.label),['Design','Staple']);
 await f.call('/api/products/sku-one',{...otherDevice,body:{tagIds:['value']}});
 const original=await f.call('/api/products/sku-one',{identity:'alice'});
 assert.deepEqual(original.data.selectedTagIds,['value']);assert.equal(original.data.tags.find(t=>t.id==='staple').count,0);
 await f.call('/api/products/sku-one',{...otherDevice,body:{tagIds:[]}});
 assert.deepEqual((await f.call('/api/products/sku-one',{identity:'alice'})).data.selectedTagIds,[]);
 assert.deepEqual((await f.call('/api/account/me',{identity:'alice'})).data.profile.opinions[0].tags,[]);
 assert.deepEqual((await f.call('/api/products/sku-one',{identity:'bob',browserId:otherBrowser})).data.selectedTagIds,[]);
});

test('tags selected before claiming a collection are retained and collapsed into the account on edit',async t=>{
 const f=await setup(t);f.answer('sku-one','yes');
 const votes=await f.store.scope('product-tag-votes',()=>({products:{}}));
 await votes.transaction(d=>{d.products['sku-one']={visitors:{[browser]:['quality','value']}}});
 await f.claim(await f.preview(),'alice',undefined,{displayName:'Alice'});
 const otherDevice={identity:'alice',browserId:otherBrowser};
 const restored=await f.call('/api/products/sku-one',otherDevice);assert.deepEqual(restored.data.selectedTagIds,['quality','value']);
 await f.call('/api/products/sku-one',{...otherDevice,body:{tagIds:['quality']}});
 const updated=await f.call('/api/products/sku-one',{identity:'alice'});assert.equal(updated.data.tags.find(t=>t.id==='quality').count,1);assert.deepEqual(updated.data.selectedTagIds,['quality']);
});

test('verifying and merging a browser profile preserves tags under the recovered account',async t=>{
 const f=await setup(t),token='a'.repeat(64),guest='tester:'+token;
 f.answer('sku-one','yes',{visitor:otherBrowser});
 const targetPreview=await f.preview({browserId:otherBrowser});
 await f.call('/api/account/claim',{browserId:otherBrowser,identity:'verified',body:{claimToken:targetPreview.claimToken,opinions:[{productId:'sku-one'}],displayName:'Alice'}});
 f.answer('sku-one','yes');await f.claim(await f.preview(),guest,undefined,{displayName:'Alice'});
 await f.call('/api/products/sku-one',{identity:guest,body:{tagIds:['design','staple']}});
 await f.api.acceptVerifiedIdentity(new Request('https://vouch.example/api/auth/verify',{headers:{cookie:'vouch_tester_session='+token+'; vouch_visitor='+browser}}),{subject:'verified',email:'alice@example.test'});
 const recovered=await f.call('/api/products/sku-one',{identity:'verified',browserId:otherBrowser});
 assert.deepEqual(recovered.data.selectedTagIds,['design','staple']);
 assert.deepEqual((await f.call('/api/account/me',{identity:'verified',browserId:otherBrowser})).data.profile.opinions[0].tags.map(t=>t.id),['design','staple']);
 await f.call('/api/products/sku-one',{identity:'verified',browserId:otherBrowser,body:{tagIds:['value']}});
 const edited=await f.call('/api/products/sku-one',{identity:'verified',browserId:otherBrowser});assert.deepEqual(edited.data.selectedTagIds,['value']);assert.equal(edited.data.tags.find(t=>t.id==='design').count,0);assert.equal(edited.data.tags.find(t=>t.id==='value').count,1);
});

test('sign-in people panel uses labeled static catalog examples without sunscreen',async()=>{
 const {runInNewContext}=await import('node:vm');
 const {WATER_BOTTLES}=await import('../lib/water-bottles.mjs');
 const source=await fs.readFile(new URL('../public/accounts.js',import.meta.url),'utf8');
 const helper=source.slice(source.indexOf('  function signinPeople()'),source.indexOf('  function renderSignup()'));
 const markup=runInNewContext(helper+'; signinPeople()');
 assert.match(markup,/Sample activity/);
 assert.match(markup,/<aside[^>]*aria-label=/);
 assert.doesNotMatch(source,/boj\.png|signin-product-card/);
 assert.equal((markup.match(/<li /g)||[]).length,3);
 assert.equal((markup.match(/class="signin-polaroid-score"/g)||[]).length,2);
 for(const brand of ['Owala','Stanley','Hydro Flask']){
  const product=WATER_BOTTLES.find(item=>item.brand===brand);
  assert.ok(markup.includes({'Owala':'Owala FreeSip','Stanley':'Stanley IceFlow','Hydro Flask':'Hydro Flask Wide Mouth'}[brand]));
  assert.ok(markup.includes(`src="${product.image}" alt=""`));
 }
 assert.match(markup,/Jon<\/strong> passed/);
 assert.match(markup,/signin-polaroid-pass/);
 assert.ok(markup.indexOf('is-left')<markup.indexOf('is-center'));
 assert.ok(markup.indexOf('is-center')<markup.indexOf('is-right'));
 for(const initials of ['MK','JL','PR'])assert.ok(markup.includes('>'+initials+'</span>'));
 assert.doesNotMatch(markup,/24 oz|32 oz|signin-vouch/);
});

test('Board summaries count only named public item vouches and bound previews',async t=>{
 const f=await setup(t);f.answer('sku-one','yes');f.answer('sku-two','brand');
 await f.claim(await f.preview(),'alice',undefined,{displayName:'Alice'});
 await f.call('/api/account/profile',{identity:'alice',body:{visibility:'public',opinions:[{productId:'sku-one',visibility:'public'},{productId:'sku-two',visibility:'public'}]}});
 const result=await f.call('/api/people-summary?id=sku-one&id=sku-two',{identity:'alice'});
 assert.equal(result.status,200);assert.equal(result.data.summaries['sku-one'].total,1);assert.equal(result.data.summaries['sku-one'].people[0].isYou,true);assert.equal(result.data.summaries['sku-two'].total,0);
 assert.doesNotMatch(JSON.stringify(result.data),/email|subject|visitor/);
 await f.call('/api/account/profile',{identity:'alice',body:{showName:false}});
 assert.equal((await f.call('/api/people-summary?id=sku-one')).data.summaries['sku-one'].total,0);
 assert.equal((await f.call('/api/people-summary?'+new URLSearchParams(Array.from({length:101},(_,i)=>['id',String(i)])))).status,400);
});

test('comments survive claims, private notes stay private, and account edits resist stale snapshots',async t=>{
 const f=await setup(t);f.answer('sku-one','yes');f.answer('sku-two','no');
 f.states.first.baseComments={'sku-one':{[browser]:{text:'Keeps my water cold',updatedAt:when}},'sku-two':{[browser]:{text:'Private negative note',updatedAt:when}}};
 const claimed=await f.claim(await f.preview(),'alice',undefined,{displayName:'Alice'});
 await f.call('/api/account/profile',{identity:'alice',body:{visibility:'public',opinions:[{productId:'sku-one',visibility:'public'},{productId:'sku-two',visibility:'public'}]}});
 assert.equal((await f.call('/api/products/sku-one')).data.contributors[0].comment,'Keeps my water cold');
 assert.equal((await f.call('/api/products/sku-two')).data.contributors[0].comment,undefined);
 const edited=await f.call('/api/account/profile',{identity:'alice',body:{opinions:[{productId:'sku-one',comment:'Better after a month'}]}});
 assert.equal(edited.data.profile.opinions.find(o=>o.productId==='sku-one').updatedAt,when);
 await f.api.syncAccountOpinions(f.request('/api/events',{identity:'alice'}),'first','sku-one');
 assert.equal((await f.call('/api/products/sku-one')).data.contributors[0].comment,'Better after a month');
 const removed=await f.call('/api/account/profile',{identity:'alice',body:{opinions:[{productId:'sku-one',comment:''}]}});
 assert.equal(removed.status,200);assert.equal((await f.call('/api/products/sku-one')).data.contributors[0].comment,undefined);
 assert.equal((await f.call('/api/account/profile',{identity:'alice',body:{opinions:[{productId:'sku-one',comment:'x'.repeat(241)}]}})).status,400);
 assert.equal((await f.call('/api/admin/comment-remove',{body:{handle:claimed.data.profile.handle,productId:'sku-one'}})).status,403);
});

test('organizers can remove comments without changing votes and stale claims cannot restore them',async t=>{
 const f=await setup(t);f.answer('sku-one','yes');f.states.first.baseComments={'sku-one':{[browser]:{text:'Remove this note',updatedAt:when}}};
 const result=await f.claim(await f.preview(),'alice',undefined,{displayName:'Alice'});
 const admin=createAccountsApi({store:f.store,authorizeAdmin:async r=>r.headers.get('x-organizer')==='yes'});
 const request=(endpoint,body)=>f.request(endpoint,{body,headers:{'x-organizer':'yes'}});
 const listing=await admin(request('/api/admin/comments?handle='+result.data.profile.handle));assert.equal((await listing.json()).comments.length,1);
 const response=await admin(request('/api/admin/comment-remove',{handle:result.data.profile.handle,productId:'sku-one'}));assert.equal(response.status,200);
 await f.api.syncAccountOpinions(f.request('/api/events',{identity:'alice'}),'first','sku-one');
 const profile=(await f.call('/api/account/me',{identity:'alice'})).data.profile;
 assert.equal(profile.opinions[0].comment,'');assert.equal(profile.opinions[0].verdict,'yes');
 assert.equal((await f.call('/api/products/sku-one',{identity:'alice'})).data.myNote.text,'');
});

test('category participation distinguishes new, partial and completed including skips across devices',async t=>{
 const f=await setup(t);
 assert.equal((await f.call('/api/category-participation?id=first')).data.categories.first.status,'new');
 f.answer('sku-one','yes');
 let state=(await f.call('/api/category-participation?id=first&id=second')).data.categories;
 assert.equal(state.first.status,'partial');assert.equal(state.first.nextProductId,'sku-two');assert.equal(state.second.status,'new');
 f.answer('sku-two','skip');f.answer('sku-three','brand');
 assert.equal((await f.call('/api/category-participation?id=first')).data.categories.first.status,'done');
 await f.claim(await f.preview(),'alice',undefined,{displayName:'Alice'});
 assert.equal((await f.call('/api/category-participation?id=first',{identity:'alice',browserId:otherBrowser})).data.categories.first.status,'done');
 assert.equal((await f.call('/api/category-participation?id=first',{browserId:otherBrowser})).data.categories.first.status,'new');
 assert.equal((await f.call('/api/category-participation?id=first&id=second&id=third&id=fourth')).status,404);
});

test('product note writes require a vouch and preserve profile fields and scores',async t=>{
 const f=await setup(t),identity='alice';
 f.answer('sku-one','yes');f.answer('sku-two','brand');f.answer('sku-three','no');
 await f.claim(await f.preview(),identity);
 const product=(id,viewer=identity)=>f.call('/api/products/'+id,{identity:viewer});
 const settings=body=>f.call('/api/account/profile',{identity,body});
 const note=(productId,comment)=>settings({opinions:[{productId,comment}]});
 const vote=verdict=>f.call('/api/account/vouch',{identity,body:{productId:'sku-one',verdict}});
 const before=(await settings({visibility:'public',displayName:'Alice Example',bio:'My bio',leaderboardOptIn:false})).data.profile;
 assert.equal(Object.hasOwn((await product('sku-one',null)).data,'myNote'),false);
 const first=(await product('sku-one')).data;
 assert.equal(first.myNote.text,'');
 const privateNote=await note('sku-one','  My first note  ');
 assert.equal(privateNote.status,200);
 for(const field of ['displayName','bio','visibility','leaderboardOptIn','showName'])assert.deepEqual(privateNote.data.profile[field],before[field]);
 await settings({opinions:[{productId:'sku-one',visibility:'private'}]});
 assert.deepEqual((await product('sku-one')).data.myNote,{text:'My first note',isPublic:false});
 assert.equal((await product('sku-one',null)).data.contributors.some(person=>person.comment),false);
 await settings({opinions:[{productId:'sku-one',visibility:'public'}]});
 assert.deepEqual((await product('sku-one')).data.myNote,{text:'My first note',isPublic:true});
 await settings({showName:false});
 assert.deepEqual((await product('sku-one')).data.myNote,{text:'My first note',isPublic:false});
 await settings({showName:true});
 assert.equal((await note('sku-one','x'.repeat(241))).status,400);
 assert.equal((await note('sku-one','x'.repeat(240))).status,200);
 const edited=(await product('sku-one')).data;
 assert.equal(edited.myNote.text.length,240);
 assert.deepEqual(edited.community,first.community);
 assert.equal((await vote('yes')).status,200);
 assert.equal((await product('sku-one')).data.myNote.text.length,240);
 assert.equal((await note('sku-one','')).status,200);
 assert.equal((await product('sku-one')).data.myNote.text,'');
 assert.equal((await note('sku-one','Cleared by vote change')).status,200);
 assert.equal((await vote('skip')).status,200);
 assert.deepEqual((await product('sku-one')).data.myNote,{text:'',isPublic:false});
 for(const id of ['sku-one','sku-two','sku-three']){
   const rejection=await note(id,'No vouch');
   assert.equal(rejection.status,400);
   assert.equal(rejection.data.error,'Vouch for this product to add a note.');
 }
});
