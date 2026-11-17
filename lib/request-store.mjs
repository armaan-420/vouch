// Instantiate once per hosted API request. Never retain this wrapper in a
// shared resolver: authentication and private records must be reread next request.
export function createRequestStore(store) {
  const reads=new Map();
  const wrap=(base,key)=>({
    ...base,
    cacheIdentity:store.cacheIdentity||store,
    async scope(name,initial){return wrap(await base.scope(name,initial),name);},
    async read(){
      // Large experiment records are consumed once by inventory; do not retain
      // their private visitor history for the rest of the request.
      if(typeof key!=='string'||key.startsWith('experiment:'))return base.read();
      let pending=reads.get(key);
      if(!pending){
        pending=Promise.resolve().then(()=>base.read());
        reads.set(key,pending);
      }
      try{return structuredClone(await pending);}
      catch(error){if(reads.get(key)===pending)reads.delete(key);throw error;}
    },
    async transaction(fn){
      reads.clear();
      try{return await base.transaction(fn);}finally{reads.clear();}
    },
    async destroy(){
      reads.clear();
      try{return await base.destroy();}finally{reads.clear();}
    },
  });
  return wrap(store,Symbol('root'));
}
