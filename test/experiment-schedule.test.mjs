import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionStatus} from '../lib/experiment-schedule.mjs';
test('collection opens exactly at start, closes exactly at end, and manual closure overrides the schedule',()=>{
 const e={startsAt:'2026-11-02T12:00:00.000Z',endsAt:'2026-11-03T12:00:00.000Z'};
 const start=Date.parse(e.startsAt),end=Date.parse(e.endsAt);
 assert.equal(collectionStatus(e,start-1),'upcoming');
 assert.equal(collectionStatus(e,start),'open');
 assert.equal(collectionStatus(e,end-1),'open');
 assert.equal(collectionStatus(e,end),'ended');
 assert.equal(collectionStatus({...e,closed:true},start),'closed');
 assert.equal(collectionStatus({}),'open');
});
