import { fresh } from './vouch-api.mjs';
export function createD1Store(db: D1Database) {
  const readRow = (key: string) => db.prepare('SELECT json, version FROM app_records WHERE key = ?').bind(key).first<{json:string;version:number}>();
  return {
    async read() { const row=await readRow('experiment');return row?JSON.parse(row.json):fresh(); },
    async transaction<T>(fn:(data:any)=>T):Promise<T> {
      for(let attempt=0;attempt<12;attempt++) {
        const row=await readRow('experiment');const data=row?JSON.parse(row.json):fresh();const result=fn(data);
        const write=row
          ? await db.prepare('UPDATE app_records SET json = ?, version = version + 1 WHERE key = ? AND version = ?').bind(JSON.stringify(data),'experiment',row.version).run()
          : await db.prepare('INSERT INTO app_records (key,json,version) VALUES (?,?,1) ON CONFLICT(key) DO NOTHING').bind('experiment',JSON.stringify(data)).run();
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
