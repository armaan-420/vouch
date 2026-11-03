import fs from 'node:fs/promises';
import path from 'node:path';
export function filePhotoStorage(directory){
  const file=key=>{if(!/^[a-f0-9-]{36}\.png$/.test(key))throw Error('Invalid photo key');return path.join(directory,'profile-photos',key)};
  return {put:async(key,bytes)=>{await fs.mkdir(path.join(directory,'profile-photos'),{recursive:true});await fs.writeFile(file(key),bytes,{flag:'wx'})},get:async key=>{try{return await fs.readFile(file(key))}catch(e){if(e.code==='ENOENT')return null;throw e}},delete:key=>fs.rm(file(key),{force:true})};
}
