import fs from 'node:fs/promises';
import path from 'node:path';
import {fresh} from './vouch-api.mjs';

// Only the loopback preview uses files. Hosted requests use D1 instead.
export async function createFileStore(directory, key='experiment', initial=fresh, stores=new Map()) {
  if(stores.has(key))return stores.get(key);
  const opening=(async()=>{
    await fs.mkdir(directory,{recursive:true});
    const file=path.join(directory,key==='experiment'?'vouch.json':encodeURIComponent(key)+'.json');
    let data;
    try{data=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;data=initial()}
    let pending=Promise.resolve();
    return {
      scope(name,factory=fresh){return createFileStore(directory,name,factory,stores)},
      destroy(){const job=pending.then(async()=>{await fs.rm(file,{force:true});data=initial();});pending=job.catch(()=>{});return job;},
      async read(){await pending;return structuredClone(data)},
      transaction(fn){
        const job=pending.then(async()=>{
          const next=structuredClone(data),result=fn(next);
          await fs.writeFile(file+'.tmp',JSON.stringify(next),{mode:0o600});
          await fs.rename(file+'.tmp',file);data=next;return result;
        });
        pending=job.catch(()=>{});return job;
      },
    };
  })();
  stores.set(key,opening);return opening;
}
