import test from 'node:test';
import assert from 'node:assert/strict';
import {voteScore,voteCounts} from '../lib/vouch-api.mjs';
const votes=(yes,no,skip=0)=>Object.fromEntries([...Array(yes).fill('yes'),...Array(no).fill('no'),...Array(skip).fill('skip')].map((v,i)=>[i,v]));
test('approved examples, no-verdict behavior and sparse negative votes',()=>{
  for(const [yes,no,expected] of [[1,0,'8.3'],[2,0,'9.0'],[5,0,'9.5'],[10,0,'9.8'],[20,0,'9.9'],[12,3,'7.9'],[2,1,'6.4'],[10,2,'8.2'],[90,10,'9.0'],[100,1,'9.9'],[0,1,'1.7'],[0,2,'1.0']])assert.equal(voteScore(votes(yes,no)),expected);
  assert.equal(voteScore(),null);assert.equal(voteScore({}),null);assert.equal(voteScore(votes(0,0,200)),null);
  assert.equal(voteScore(votes(12,3,200)), '7.9');
});
test('10.0 needs 100 valid verdicts and sufficiently strong support',()=>{
  assert.equal(voteScore(votes(99,0,200)),'9.9');
  assert.equal(voteScore(votes(100,0)),'10.0');
  assert.equal(voteScore(votes(99,1)),'9.9');
  assert.equal(voteScore(votes(248,1)),'9.9');
  assert.equal(voteScore(votes(249,1)),'10.0');
  const changed=votes(100,0);changed[0]='skip';assert.equal(voteScore(changed),'9.9');
  changed[0]='no';assert.equal(voteScore(changed),'9.9');
});
test('additional support never lowers scores, additional passes never raise them, and balance stays neutral',()=>{
  for(let yes=0;yes<=100;yes++)for(let no=0;no<=20;no++){
    if(!yes&&!no)continue;
    const score=Number(voteScore(votes(yes,no)));
    assert.ok(score>=0&&score<=10);
    assert.ok(Number(voteScore(votes(yes+1,no)))>=score);
    assert.ok(Number(voteScore(votes(yes,no+1)))<=score);
    if(yes===no)assert.equal(score,5);
  }
});
test('brand trust carries half the evidence of an item vouch, including the perfect-score threshold',()=>{
  assert.equal(voteScore({a:'brand'}),'7.5');
  assert.equal(voteScore({a:'brand',b:'brand'}),voteScore({a:'yes'}));
  assert.equal(voteScore({a:'brand',b:'no'}),'3.8');
  assert.equal(voteScore({a:'yes',b:'brand',c:'no',d:'skip'}),'5.8');
  assert.equal(voteScore(Object.fromEntries(Array.from({length:199},(_,i)=>[i,'brand']))),'9.9');
  assert.equal(voteScore(Object.fromEntries(Array.from({length:200},(_,i)=>[i,'brand']))),'10.0');
  assert.equal(voteScore({a:'unknown',b:'skip'}),null);
});

test('counts exclude skips and unknown values and follow replaced votes',()=>{
 assert.deepEqual(voteCounts(),{yes:0,maybe:0,pass:0,total:0});
 const active={a:'yes',b:'yes',c:'brand',d:'no',e:'skip',f:'unknown'};
 assert.deepEqual(voteCounts(active),{yes:2,maybe:1,pass:1,total:4});
 active.a='brand';active.b='skip';
 assert.deepEqual(voteCounts(active),{yes:0,maybe:2,pass:1,total:3});
});
