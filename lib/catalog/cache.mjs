export const TTL={query:600,shopify:86400,channel3:21600,shopifyOffers:900,gtinHit:604800,gtinMiss:86400};
export function memoryCache({now=Date.now,capacity=500}={}){const entries=new Map();return {async get(key){const row=entries.get(key);if(!row)return null;entries.delete(key);if(row.expires<=now())return null;entries.set(key,row);return structuredClone(row.value);},async set(key,value,ttl){entries.delete(key);if(ttl<=0)return;entries.set(key,{value:structuredClone(value),expires:now()+ttl*1000});while(entries.size>capacity)entries.delete(entries.keys().next().value);},async delete(key){entries.delete(key);}};}
export function d1Cache(db,{now=Date.now}={}){
 const front=memoryCache({now});let lastPurge=0;
 const statement=(key,value,ttl)=>db.prepare('INSERT INTO catalog_cache (key, json, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET json=excluded.json, expires_at=excluded.expires_at').bind(key,JSON.stringify(value),now()+ttl*1000);
 async function setMany(entries){
  const rows=(await Promise.all(entries.filter(([, ,ttl])=>ttl>0).map(async row=>JSON.stringify(await front.get(row[0]))===JSON.stringify(row[1])?null:row))).filter(Boolean);if(!rows.length)return;
  // One database round trip for a result page instead of one per product.
  if(db.batch)for(let i=0;i<rows.length;i+=50)await db.batch(rows.slice(i,i+50).map(row=>statement(...row)));
  else await Promise.all(rows.map(row=>statement(...row).run()));
  await Promise.all(rows.map(row=>front.set(...row)));
  if(now()-lastPurge>60000){lastPurge=now();await db.prepare('DELETE FROM catalog_cache WHERE expires_at <= ?').bind(now()).run();}
 }
 return {async get(key){const hit=await front.get(key);if(hit!==null)return hit;const row=await db.prepare('SELECT json, expires_at FROM catalog_cache WHERE key = ? AND expires_at > ?').bind(key,now()).first();if(!row)return null;const value=JSON.parse(row.json);await front.set(key,value,(row.expires_at-now())/1000);return value;},set:(key,value,ttl)=>setMany([[key,value,ttl]]),setMany,async delete(key){await front.delete(key);await db.prepare('DELETE FROM catalog_cache WHERE key = ?').bind(key).run();}};
}
export const easternDate=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
export function createBudget({db,store,limit=300,now=Date.now}={}){let memory={date:null,count:0};return {async take(){if(limit<=0)return false;const date=easternDate(now());if(db){const row=await db.prepare('INSERT INTO catalog_daily_usage (date, count) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count').bind(date,limit).first();return !!row&&limit>0;}if(store){const scoped=await store.scope('catalog-daily-usage',()=>({date,count:0}));return scoped.transaction(d=>{if(d.date!==date){d.date=date;d.count=0;}if(d.count>=limit)return false;d.count++;return true;});}if(memory.date!==date)memory={date,count:0};if(memory.count>=limit)return false;memory.count++;return true;}};}
