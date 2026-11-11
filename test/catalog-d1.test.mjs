import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {d1Cache,createBudget} from '../lib/catalog/cache.mjs';
function database(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE catalog_cache(key TEXT PRIMARY KEY,json TEXT NOT NULL,expires_at INTEGER NOT NULL); CREATE TABLE catalog_daily_usage(date TEXT PRIMARY KEY,count INTEGER NOT NULL)');return {close:()=>db.close(),prepare(sql){return {bind(...values){return {async first(){return db.prepare(sql).get(...values)||null},async run(){return db.prepare(sql).run(...values)}}}}}};}
test('D1 cache persists across front-cache instances, honors expiry and purges stale rows',async t=>{const db=database();t.after(()=>db.close());let now=100000;const first=d1Cache(db,{now:()=>now});await first.set('snapshot',{image:'https://images.example.com/p'},2);const second=d1Cache(db,{now:()=>now});assert.deepEqual(await second.get('snapshot'),{image:'https://images.example.com/p'});now+=2001;assert.equal(await second.get('snapshot'),null);now+=60001;await second.set('new',{name:'Example'},1);assert.equal(await db.prepare('SELECT key FROM catalog_cache WHERE key = ?').bind('snapshot').first(),null);await second.delete('new');assert.equal(await second.get('new'),null);});
test('D1 daily allowance is atomic across resolver instances and refuses zero allowance',async t=>{const db=database();t.after(()=>db.close());let now=Date.parse('2026-11-06T04:59:59Z');const a=createBudget({db,limit:3,now:()=>now}),b=createBudget({db,limit:3,now:()=>now});const results=await Promise.all([a.take(),b.take(),a.take(),b.take(),a.take()]);assert.equal(results.filter(Boolean).length,3);now+=1000;assert.equal(await a.take(),true);const zero=createBudget({db,limit:0,now:()=>now});assert.equal(await zero.take(),false);});

test('D1 writes a full result page in one batch and avoids unchanged front-cache writes',async t=>{
 const db=database();t.after(()=>db.close());let batches=0;
 db.batch=async statements=>{batches++;return Promise.all(statements.map(s=>s.run()));};
 const cache=d1Cache(db,{now:()=>100000});const entries=Array.from({length:20},(_,i)=>['product:'+i,{name:'Product '+i},600]);
 await cache.setMany(entries);assert.equal(batches,1);
 await cache.setMany(entries);assert.equal(batches,1);
 const cold=d1Cache(db,{now:()=>100000});assert.deepEqual(await cold.get('product:19'),{name:'Product 19'});
 await cache.setMany([['product:19',{name:'Changed'},600]]);assert.equal(batches,2);assert.deepEqual(await cache.get('product:19'),{name:'Changed'});
});
