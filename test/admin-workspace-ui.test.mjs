import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/admin-shared.js', import.meta.url), 'utf8');
const badges = [{}, {}];
const events = [];
const admin = vm.runInNewContext(source + '\nAdmin', {
 document: {
  addEventListener() {},
  querySelectorAll() { return badges; },
  dispatchEvent(event) { events.push(event.type); }
 },
 Event, URLSearchParams
});

test('Organizer counts use singular and explicit irregular plurals', () => {
 assert.equal(admin.plural(1, 'participating browser'), '1 participating browser');
 assert.equal(admin.plural(0, 'Edit'), '0 Edits');
 assert.equal(admin.plural(2, 'person', 'people'), '2 people');
});

test('Edit state labels use the same vocabulary throughout the Organizer', () => {
 assert.deepEqual(['draft','upcoming','open','ended','closed','disabled'].map(admin.status),
  ['Draft','Scheduled','Live','Closed','Closed','Disabled']);
});

test('Only visible, unconfirmed nomination groups need lookup and zero badges are hidden', () => {
 const count = admin.lookupCount([{}, {reviewed:true}, {dismissed:true}]);
 assert.equal(count, 1);
 admin.setCount('edits', count);
 assert.ok(badges.every(badge => !badge.hidden && badge.innerHTML.includes('1 need action')));
 admin.setCount('edits', 0);
 assert.ok(badges.every(badge => badge.hidden));
 assert.deepEqual(events, ['vouch-admin-counts','vouch-admin-counts']);
});

test('Edit hashes preserve old deep links and recognize each tab', () => {
 assert.equal(admin.parseHash('#experiments/sunscreen').tab,'overview');
 for (const tab of ['overview','products','missing','community','settings']) {
  const route=admin.parseHash(admin.editLink('sun screen',tab));
  assert.equal(route.item,'sun screen');
  assert.equal(route.tab,tab);
 }
 assert.equal(admin.parseHash('#experiments-panel/sunscreen/products').base,'experiments-panel');
 assert.equal(admin.parseHash('#product-library/provider%3Aid').item,'provider:id');
 assert.equal(admin.parseHash('#suggestions-panel?status=draft').query.get('status'),'draft');
});

test('Library sorts the whole match set by votes, with name and score sorts available', () => {
 const products=[
  {name:'Zinc',categoryId:'sun',category:'Sunscreen',tagIds:['mineral'],voteCounts:{total:4},score:'8.4',experiments:[]},
  {name:'Tinted',categoryId:'sun',category:'Sunscreen',tagIds:[],voteCounts:{total:12},score:'7.5',experiments:[{}]},
  {name:'Balm',categoryId:'lip',category:'Lip balm',tagIds:[],voteCounts:{total:6},score:'9.0',experiments:[]},
  {name:'Unrated',categoryId:'sun',category:'Sunscreen',tagIds:[],voteCounts:{total:0},score:null,experiments:[]},
  {name:'Reviewed',categoryId:'sun',category:'Sunscreen',tagIds:[],voteCounts:{total:0},reviewCounts:{total:2},experiments:[]}
 ];
 const names=options=>Array.from(admin.libraryRows(products,options),row=>row.name);
 assert.deepEqual(names(),['Tinted','Balm','Zinc','Reviewed']);
 assert.deepEqual(names({category:'sun',sort:'name',direction:1}),['Reviewed','Tinted','Zinc']);
 assert.deepEqual(names({category:'sun',sort:'score',direction:-1}),['Zinc','Tinted','Reviewed']);
 assert.deepEqual(names({category:'sun',query:'mineral',tags:{mineral:{label:'Mineral'}}}),['Zinc']);
 assert.deepEqual(names({category:'lip',query:'mineral',includeUnvoted:true}),[]);
 assert.equal(names({includeUnvoted:true}).length,5);
});

test('Edit state precedence is consistent for private, disabled, scheduled and closed Edits', () => {
 const now=Date.parse('2026-11-18T17:00:00Z');
 const started='2026-11-15T17:00:00Z',future='2026-11-20T17:00:00Z';
 assert.equal(admin.editState({status:'draft',disabled:true},now),'draft');
 assert.equal(admin.editState({closed:true,disabled:true},now),'disabled');
 assert.equal(admin.editState({closed:true,startsAt:future},now),'closed');
 assert.equal(admin.editState({startsAt:future,endsAt:future},now),'upcoming');
 assert.equal(admin.editState({startsAt:started,endsAt:started},now),'closed');
 assert.equal(admin.editState({startsAt:started,endsAt:future},now),'open');
});
