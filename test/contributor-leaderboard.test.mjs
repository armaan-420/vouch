import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {publicVouches,whartonLeaderboard,contributorBadges} from '../lib/contributor-leaderboard.mjs';
import {createAccountsApi,initialAccounts} from '../lib/accounts.mjs';
import {createFileStore} from '../lib/file-store.mjs';
const opinion=(id,extra={})=>({productId:id,product:{id,name:id},verdict:'yes',visibility:'public',updatedAt:'2026-11-16T00:00:00Z',...extra});
const member=(handle='alice',count=1,extra={})=>({handle,displayName:handle,email:handle+'@wharton.upenn.edu',emailVerified:true,visibility:'public',showName:true,leaderboardOptIn:true,createdAt:'2026-11-01',opinions:Object.fromEntries(Array.from({length:count},(_,i)=>['p:sku-'+i,opinion('sku-'+i)])),history:[],milestones:[],...extra});
test('counts unique current public recommendations, not repeated vote events or other verdicts',()=>{
 const a=member();a.opinions.duplicate=opinion('alias',{product:{skuId:'sku-0'}});a.opinions.private=opinion('private',{visibility:'private'});a.opinions.no=opinion('no',{verdict:'no'});a.opinions.brand=opinion('brand',{verdict:'brand'});a.opinions.skip=opinion('skip',{verdict:'skip'});a.history=Array(30).fill(opinion('sku-0'));
 assert.equal(publicVouches(a).length,1);
 a.opinions.duplicate=opinion('alias',{product:{skuId:'sku-0'},verdict:'no',updatedAt:'2026-11-17T00:00:00Z'});
 assert.equal(publicVouches(a).length,0);
});
test('excludes explicit opt-outs, hidden, deleted, disabled and unverified accounts, including early testers',()=>{
 const excluded=[{leaderboardOptIn:false},{visibility:'private'},{showName:false},{deletedAt:'now'},{disabledAt:'now'},{emailVerified:false},{email:'x@upenn.edu'},{email:'x@fakewharton.upenn.edu'},{browserProfile:true},{verificationRequired:true}];
 const accounts={valid:member(),...Object.fromEntries(excluded.map((extra,i)=>['bad'+i,member('bad'+i,1,{whartonEarlyTester:true,...extra})]))};
 assert.deepEqual(whartonLeaderboard(accounts).entries.map(r=>r.handle),['alice']);
});
test('uses competition ranks and stable tie order across pagination, retaining viewer position',()=>{
 const accounts={a:member('a',5),b:member('b',3),c:member('c',3),d:member('d',1)};
 const data=whartonLeaderboard(accounts,{key:'d',offset:1,limit:2});
 assert.deepEqual(data.entries.map(r=>[r.handle,r.rank]),[['b',2],['c',2]]);assert.equal(data.viewer.entry.rank,4);assert.equal(data.viewer.entry.isYou,true);assert.equal(data.hasMore,true);
});
test('badges reflect public thresholds and keep historical recognition distinct from affiliation',()=>{
 const a=member('alice',25,{whartonEarlyTester:true});assert.deepEqual(contributorBadges(a).map(b=>b.id),['wharton-verified','early-tester','public-vouches-25']);
 a.opinions['p:sku-0'].visibility='private';assert.equal(contributorBadges(a).at(-1).id,'public-vouches-10');
 a.emailVerified=false;assert.equal(contributorBadges(a).some(b=>b.id==='wharton-verified'),false);
 a.visibility='private';assert.deepEqual(contributorBadges(a),[]);
});
async function fixture(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-contributors-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const store=await createFileStore(dir),scope=await store.scope('accounts-v1',initialAccounts);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('alice'));const key=Buffer.from(digest).toString('hex');
 await scope.transaction(d=>{d.accounts[key]=member('alice',2,{leaderboardOptIn:false});});
 const api=createAccountsApi({store,getIdentity:async r=>r.headers.has('x-owner')?{subject:'alice'}:null});
 const call=async(route,body,owner=false,origin='https://vouch.test')=>{const r=await api(new Request('https://vouch.test'+route,{method:body===undefined?'GET':'POST',headers:{...(owner?{'x-owner':'yes'}:{}),...(body===undefined?{}:{origin,'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:r.status,data:await r.json(),headers:r.headers};};
 return {call,scope,key};
}
test('opt-in is authenticated, origin protected, validated and never changes opinion privacy',async t=>{
 const f=await fixture(t);assert.equal((await f.call('/api/account/profile',{leaderboardOptIn:true})).status,401);
 assert.equal((await f.call('/api/account/profile',{leaderboardOptIn:true},true,'https://other.test')).status,403);
 assert.equal((await f.call('/api/account/profile',{leaderboardOptIn:'yes'},true)).status,400);
 assert.equal((await f.call('/api/community-leaderboard')).data.total,0);
 assert.equal((await f.call('/api/account/profile',{leaderboardOptIn:true},true)).status,200);
 const data=await f.call('/api/community-leaderboard');assert.equal(data.data.total,1);assert.equal(data.headers.get('Cache-Control'),'no-store');
 const text=JSON.stringify(data.data);assert.equal(text.includes('@wharton'),false);assert.equal(text.includes('emailVerified'),false);assert.equal(text.includes('history'),false);
 await f.call('/api/account/profile',{leaderboardOptIn:false},true);assert.equal((await f.call('/api/community-leaderboard')).data.total,0);
 assert.equal(Object.values((await f.scope.read()).accounts[f.key].opinions).every(o=>o.visibility==='public'),true);
});
test('profile counts match leaderboard and hiding a recommendation or profile takes effect immediately',async t=>{
 const f=await fixture(t);await f.call('/api/account/profile',{leaderboardOptIn:true},true);
 let board=(await f.call('/api/community-leaderboard')).data;let profile=(await f.call('/api/profiles/alice')).data.profile;assert.equal(board.entries[0].count,profile.counts.yes);
 await f.call('/api/account/profile',{opinions:[{productId:'sku-0',visibility:'private'}]},true);
 board=(await f.call('/api/community-leaderboard')).data;profile=(await f.call('/api/profiles/alice')).data.profile;assert.equal(board.entries[0].count,1);assert.equal(profile.counts.yes,1);
 await f.call('/api/account/profile',{showName:false},true);assert.equal((await f.call('/api/community-leaderboard')).data.total,0);assert.equal((await f.call('/api/profiles/alice')).status,404);
});
test('joining rejects ineligible accounts and validates community pagination',async t=>{
 const f=await fixture(t);await f.scope.transaction(d=>{d.accounts[f.key].emailVerified=false;});
 assert.equal((await f.call('/api/account/profile',{leaderboardOptIn:true},true)).status,400);
 for(const query of ['offset=-1','offset=1.5','limit=101','limit=NaN'])assert.equal((await f.call('/api/community-leaderboard?'+query)).status,400);
 assert.equal((await f.call('/api/community-leaderboard?community=other')).status,404);
 assert.equal((await f.call('/api/community-leaderboard',{},true)).status,405);
});
test('verified account merges retain destination consent and deduplicate recommendations',async t=>{
 const f=await fixture(t),token='a'.repeat(64),guestKey=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('tester:'+token))).toString('hex');
 await f.scope.transaction(d=>{d.accounts[guestKey]=member('guest',2,{browserProfile:true,email:'alice@wharton.upenn.edu',emailVerified:false,leaderboardOptIn:true});});
 const store={scope:async()=>f.scope};const api=createAccountsApi({store});
 await api.acceptVerifiedIdentity(new Request('https://vouch.test/api/account/me',{headers:{cookie:'vouch_tester_session='+token}}),{subject:'alice',email:'alice@wharton.upenn.edu'});
 const record=await f.scope.read();assert.equal(record.accounts[guestKey],undefined);assert.equal(record.accounts[f.key].leaderboardOptIn,false);assert.equal(publicVouches(record.accounts[f.key]).length,2);
 assert.equal(whartonLeaderboard(record.accounts).total,0);
});

test('existing verified Wharton members appear by default, including zero public recommendations',()=>{
 const accounts={old:member('existing',2,{leaderboardOptIn:undefined}),zero:member('zero',0,{leaderboardOptIn:undefined}),left:member('left',20,{leaderboardOptIn:false})};
 const board=whartonLeaderboard(accounts,{key:'old'});assert.deepEqual(board.entries.map(r=>[r.handle,r.count]),[['existing',2],['zero',0]]);assert.equal(board.viewer.optedIn,true);assert.equal(board.entries[0].badges[0].id,'wharton-verified');
});
test('saved-email browser participants get a signup gate without exposing their email to other viewers',()=>{
 const accounts={pending:member('pending',2,{browserProfile:true,emailVerified:false,verificationRequired:true})};
 assert.equal(whartonLeaderboard(accounts,{key:'pending'}).viewer.requiresSignup,true);
 assert.equal(whartonLeaderboard(accounts).viewer.requiresSignup,false);assert.equal(whartonLeaderboard(accounts).total,0);assert.equal(JSON.stringify(whartonLeaderboard(accounts)).includes('pending@'),false);
 accounts.pending.emailVerified=true;accounts.pending.browserProfile=false;accounts.pending.verificationRequired=false;assert.equal(whartonLeaderboard(accounts,{key:'pending'}).viewer.requiresSignup,false);assert.equal(whartonLeaderboard(accounts).total,1);
});
