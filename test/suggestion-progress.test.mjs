import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestionProgress} from '../lib/auto-experiments/progress.mjs';
test('research progress uses provider queue status and exact matching counts',()=>{
 const base={createdAt:'2026-11-10T12:00:00Z',researchStartedAt:'2026-11-10T12:01:00Z',updatedAt:'2026-11-10T12:02:00Z'};
 assert.equal(suggestionProgress({...base,state:'researching',providerStatusText:'queued'}).label,'Research queued with provider');
 const p=suggestionProgress({...base,state:'matching',research:{picks:Array(10)},matches:[{hasPhoto:true},{hasPhoto:false}]});assert.equal(p.matched,2);assert.equal(p.photos,1);assert.equal(p.total,10);assert.equal(p.finishedAt,null);assert.equal(p.startedAt,base.researchStartedAt);
 assert.equal(suggestionProgress({...base,state:'failed'}).finishedAt,base.updatedAt);
});
