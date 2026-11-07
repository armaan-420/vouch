import { fresh } from './vouch-api.mjs';
export function createD1Store(db: D1Database, recordKey='experiment', initial:()=>any=fresh) {
  const readRow = (key: string) => db.prepare('SELECT json, version FROM app_records WHERE key = ?').bind(key).first<{json:string;version:number}>();
  return {
    scope(key:string, factory:()=>any=fresh){return createD1Store(db,key,factory)},
    async destroy(){await db.prepare('DELETE FROM app_records WHERE key = ?').bind(recordKey).run();},
    async read() { const row=await readRow(recordKey);return row?JSON.parse(row.json):initial(); },
    async transaction<T>(fn:(data:any)=>T):Promise<T> {
      for(let attempt=0;attempt<12;attempt++) {
        const row=await readRow(recordKey);const data=row?JSON.parse(row.json):initial();const result=fn(data);
        const write=row
          ? await db.prepare('UPDATE app_records SET json = ?, version = version + 1 WHERE key = ? AND version = ?').bind(JSON.stringify(data),recordKey,row.version).run()
          : await db.prepare('INSERT INTO app_records (key,json,version) VALUES (?,?,1) ON CONFLICT(key) DO NOTHING').bind(recordKey,JSON.stringify(data)).run();
        if(write.meta.changes===1)return result;
        await new Promise(resolve=>setTimeout(resolve,10+Math.random()*30));
      }
      throw new Error('Write contention. Please retry.');
    },
    catalog: {
      async read(){const row=await readRow('catalog');if(!row)throw Object.assign(Error('No catalog yet'),{code:'ENOENT'});return JSON.parse(row.json)},
      async write(value:any){await db.prepare('INSERT INTO app_records (key,json,version) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET json=excluded.json, version=app_records.version+1').bind('catalog',JSON.stringify(value)).run()},
    },
  };
}
