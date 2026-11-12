import test from 'node:test';
import assert from 'node:assert/strict';
import {voteScore,voteCounts} from '../lib/vouch-api.mjs';
const votes=(yes,brand=0,no=0,skip=0)=>Object.fromEntries([
  ...Array(yes).fill('yes'),...Array(brand).fill('brand'),...Array(no).fill('no'),...Array(skip).fill('skip'),
].map((v,i)=>[i,v]));

test('approved point values and neutral response temper sparse votes',()=>{
  for(const [yes,brand,no,expected] of [
    [1,0,0,'7.5'],[0,1,0,'6.0'],[0,0,1,'2.5'],[2,0,0,'8.3'],[0,2,0,'6.3'],
    [0,0,2,'1.7'],[1,0,1,'5.0'],[0,1,1,'4.0'],[1,1,1,'5.5'],[10,0,0,'9.5'],
  ])assert.equal(voteScore(votes(yes,brand,no)),expected);
  assert.equal(voteScore(),null);assert.equal(voteScore({}),null);
  assert.equal(voteScore(votes(0,0,0,200)),null);
  assert.equal(voteScore({a:'unknown',b:'skip'}),null);
  assert.equal(voteScore(votes(1,1,1,200)),'5.5');
});

test('approved 100 and 1000 response combinations',()=>{
  for(const [yes,brand,no,expected] of [
    [100,0,0,'10.0'],[80,20,0,'9.4'],[50,50,0,'8.5'],[70,20,10,'8.4'],
    [60,30,10,'8.1'],[50,30,20,'7.1'],[0,100,0,'7.0'],
    [1000,0,0,'10.0'],[900,100,0,'9.7'],[800,200,0,'9.4'],[700,300,0,'9.1'],
    [500,500,0,'8.5'],[200,800,0,'7.6'],[0,1000,0,'7.0'],[800,100,100,'8.7'],
    [700,200,100,'8.4'],[600,300,100,'8.1'],[500,300,200,'7.1'],[300,500,200,'6.5'],[500,0,500,'5.0'],
  ])assert.equal(voteScore(votes(yes,brand,no)),expected);
});

test('ordinary rounding replaces the old 100 weighted verdict cap',()=>{
  assert.equal(voteScore(votes(98)),'9.9');
  assert.equal(voteScore(votes(99)),'9.9'); // exactly 9.95 follows JavaScript toFixed rounding
  assert.equal(voteScore(votes(100)),'10.0');
  assert.equal(voteScore(votes(99,1)),'9.9');
  assert.equal(voteScore(votes(0,200)),'7.0');
});

test('vouches never lower scores, passes never raise them, and soft-vouches move toward 7',()=>{
  for(let yes=0;yes<=50;yes++)for(let no=0;no<=20;no++)for(const brand of [0,1,10]){
    if(!yes&&!no&&!brand)continue;
    const score=Number(voteScore(votes(yes,brand,no)));
    assert.ok(score>=0&&score<=10);
    assert.ok(Number(voteScore(votes(yes+1,brand,no)))>=score);
    assert.ok(Number(voteScore(votes(yes,brand,no+1)))<=score);
    const withSoft=Number(voteScore(votes(yes,brand+1,no)));
    assert.ok(score<=7?withSoft>=score&&withSoft<=7:withSoft<=score&&withSoft>=7);
    if(!brand&&yes===no)assert.equal(score,5);
  }
  assert.equal(voteScore(votes(10)),'9.5');
  assert.equal(voteScore(votes(10,1)),'9.3');
});

test('replacement and skips immediately recalculate existing raw votes without mutating them',()=>{
 const active={a:'yes',b:'brand',c:'no',d:'skip',e:'unknown'},before=structuredClone(active);
 assert.equal(voteScore(active),'5.5');assert.deepEqual(active,before);
 active.a='brand';assert.equal(voteScore(active),'4.8');
 active.c='skip';assert.equal(voteScore(active),'6.3');
 active.a='skip';assert.equal(voteScore(active),'6.0');
 active.b='skip';assert.equal(voteScore(active),null);
});

test('counts exclude skips and unknown values and follow replaced votes',()=>{
 assert.deepEqual(voteCounts(),{yes:0,maybe:0,pass:0,total:0});
 const active={a:'yes',b:'yes',c:'brand',d:'no',e:'skip',f:'unknown'};
 assert.deepEqual(voteCounts(active),{yes:2,maybe:1,pass:1,total:4});
 active.a='brand';active.b='skip';
 assert.deepEqual(voteCounts(active),{yes:0,maybe:2,pass:1,total:3});
});
