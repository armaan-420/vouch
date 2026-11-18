import test from 'node:test';
import assert from 'node:assert/strict';
import {nextStep} from '../public/pilot-next.js';

const items=['water','balm','carry'].map(id=>({experiment:{id}}));
const profile={handle:'v-example',whartonEmailVerified:true};
const pilot={canShare:true,suggested:false};

test('next step keeps chip order and uses the first incomplete entry through all four states',()=>{
  for(let complete=0;complete<=3;complete++){
    const states=Object.fromEntries(items.map(({experiment},i)=>[experiment.id,{status:i<complete?'done':i===complete&&i===1?'partial':'new'}]));
    const step=nextStep({items,states,pilot,profile});
    assert.equal(step.state,complete);
    assert.equal(step.next,items[complete]);
    assert.equal(step.partial,complete===1);
    assert.equal(step.suggested,false);
    assert.equal(step.canShare,true);
    assert.equal(nextStep({items,states,pilot:{suggested:true,canShare:false},profile}).suggested,true);
  }
  assert.equal(nextStep({items,states:{},pilot:null,profile}),null);
  assert.equal(nextStep({items,states:{},pilot,profile:null}),null);
  assert.equal(nextStep({items,states:{},pilot,profile:{whartonEmailVerified:false}}),null);
});
