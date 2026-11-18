import test from 'node:test';
import assert from 'node:assert/strict';
import {picksShare,winnerShare} from '../lib/pilot-share.mjs';
import {fresh} from '../lib/vouch-api.mjs';
import {whartonCategories} from '../public/wharton-categories.js';

const [bottles,balm,carry]=whartonCategories;
const product=(id,name)=>({id,name,image:'/assets/'+id+'.png'});
const groups=[
  {...bottles,experiment:{id:'bottles',products:[product('a','Bottle A'),product('b','Bottle B')]}},
  {...balm,experiment:{id:'balm',products:[product('c','Balm C')]}},
  {...carry,experiment:{id:'carry',products:[product('d','Carry-On D')]}}
];
const opinion=(id,verdict='yes',visibility='public',updatedAt='2026-11-18T18:00Z')=>({productId:id,product:product(id,id),verdict,visibility,updatedAt});
const member=(name,items,changes={})=>({displayName:name,handle:'v-0123456789012345',visibility:'public',showName:true,opinions:Object.fromEntries(items.map(item=>['p:'+item.productId,item])),...changes});

test('picks select the latest named public item vouch per Wharton Edit and exclude the owner from counts',()=>{
  const sharer=member('Priya Example',[opinion('a','yes','public','2026-11-17T17:00Z'),opinion('b'),opinion('c','yes','private'),opinion('d','brand'),opinion('unrelated')]);
  const accounts={
    sharer,other:member('Other Named',[opinion('b')]),
    privateVouch:member('Private Vouch',[opinion('b','yes','private')]),
    no:member('Passed',[opinion('b','no')]),brand:member('Trusts Brand',[opinion('b','brand')]),
    skip:member('Skipped',[opinion('b','skip')]),anonymous:member('Anonymous',[opinion('b')],{showName:false}),
    locked:member('Private Account',[opinion('b')],{visibility:'private'}),disabled:member('Disabled Account',[opinion('b')],{disabledAt:'now'})
  };
  assert.deepEqual(picksShare(sharer,groups,accounts).rows,[{name:'Bottle B',category:'Water bottles',image:'/assets/b.png',others:1}]);
  for(const hidden of [accounts.locked,accounts.anonymous,accounts.privateVouch,accounts.skip])assert.equal(picksShare(hidden,groups,accounts),null);
});
test('winner needs five public named vouchers and an untied Board lead',()=>{
  const accounts=Object.fromEntries(Array.from({length:4},(_,i)=>[i,member('Member '+i,[opinion('a')])]));
  accounts.private=member('Private',[opinion('a','yes','private')]);
  const state={...fresh(),baseVotes:{a:Object.fromEntries(Array.from({length:7},(_,i)=>[i,'yes'])),b:{one:'no'}}};
  assert.equal(winnerShare(groups[0],state,accounts),null);
  accounts.last=member('Fifth Member',[opinion('a')]);
  const {winner}=winnerShare(groups[0],state,accounts);
  assert.equal(winner.count,5);
  assert.equal(winner.people.length,3);
  state.baseVotes.b=state.baseVotes.a;
  assert.equal(winnerShare(groups[0],state,accounts),null);
});

test('leaderboard share uses the canonical ranked public entries and pins an eligible viewer at their real rank',async()=>{
  const {whartonLeaderboard}=await import('../lib/contributor-leaderboard.mjs');
  const {leaderboardShare}=await import('../lib/pilot-share.mjs');
  const accounts=Object.fromEntries(Array.from({length:8},(_,i)=>['member'+i,member('Member '+i,
    Array.from({length:8-i},(_,j)=>opinion('product-'+j)),{
      handle:'v-'+String(i).padStart(16,'0'),email:'student'+i+'@wharton.upenn.edu',emailVerified:true
    })]));
  accounts.member1.leaderboardOptIn=false;
  accounts.member2.showName=false;
  accounts.member3.emailVerified=false;
  const expected=whartonLeaderboard(accounts).entries;
  const top=leaderboardShare(accounts,groups);
  assert.deepEqual(top.rows.map(r=>r.name),expected.slice(0,5).map(r=>r.displayName));
  assert.ok(top.rows.every(r=>!r.isYou));
  accounts.member1.leaderboardOptIn=true;
  const pinned=leaderboardShare(accounts,groups,'member7').rows;
  assert.equal(pinned.length,6);
  assert.deepEqual(pinned.at(-1),{rank:6,name:'Member 7',photo:null,count:1,isYou:true,separate:true});
  assert.equal(leaderboardShare(accounts,groups,'member0').rows[0].isYou,true);
  assert.ok(leaderboardShare(accounts,groups,'member2').rows.every(r=>!r.isYou));
});
