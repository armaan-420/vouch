import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeSearchResults} from '../lib/global-search.mjs';
const saved={id:'sku-a',name:'Model A',brand:'Brand',provider:'channel3',providerId:'a',href:'/products/sku-a',voteCounts:{total:3},score:'8.0',tags:[],fit:null};
test('provider identity preserves Vouch evidence despite changed external titles',()=>{const rows=mergeSearchResults([saved],[{id:'c3-a',provider:'channel3',providerId:'a',brand:'Brand',name:'Model A revised title'}],'Model A');assert.equal(rows.length,1);assert.equal(rows[0].identity.id,'sku-a');assert.equal(rows[0].evidence.ratingCount,3);assert.equal(rows[0].action.href,'/products/sku-a');});
test('external results append without inventing evidence',()=>{const rows=mergeSearchResults([saved],[{id:'c3-b',brand:'Other',name:'Headphones'}],'Other Headphones');assert.equal(rows[1].id,'c3-b');assert.equal(rows[1].evidence.communityScore,null);assert.equal(rows[1].vouchStatus,'new');});
