import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createVouchServer} from '../server.mjs';

test('every HTML entry uses the emblem lockup and browser icons',async()=>{
 for(const name of await fs.readdir('lib')){
  if(!name.endsWith('.html'))continue;
  const html=await fs.readFile(path.join('lib',name),'utf8');
  assert.match(html,/<(?:a|button)[^>]*class="(?:wordmark[^"\n]*|logo)"[^>]*aria-label="Vouch home"[^>]*><img class="wordmark-emblem" src="\/brand\/vouch-emblem.svg"[^>]*>vouch/);
  assert.match(html,/href="\/brand\/favicon.svg"/);
  assert.match(html,/href="\/brand\/apple-touch-icon.png"/);
  assert.match(html,/href="\/site.webmanifest"/);
  assert.match(html,/src="\/brand.js"/);
  assert.doesNotMatch(html,/\u2733|M24 3v42/);
 }
});

test('retired mark is absent from application UI and helper uses approved vector',async()=>{
 for(const dir of ['lib','public','worker','app']){
  async function walk(base){for(const item of await fs.readdir(base,{withFileTypes:true})){
   const file=path.join(base,item.name);if(item.isDirectory())await walk(file);
   else if(/\.(html|js|mjs|ts|tsx|css)$/.test(file))assert.doesNotMatch(await fs.readFile(file,'utf8'),/\u2733|M24 3v42/,file);
  }}await walk(dir);
 }
 const context=vm.createContext({});vm.runInContext(await fs.readFile('public/brand.js','utf8'),context);
 const glyph=vm.runInContext('brandV()',context);
 const approved=await fs.readFile('public/brand/vouch-v-glyph.svg','utf8');
 assert.equal(glyph.match(/d="([^"]+)"/)[1],approved.match(/d="([^"]+)"/)[1]);
 assert.match(glyph,/fill="currentColor"/);assert.match(glyph,/aria-hidden="true"/);
});

test('local server serves brand files with browser-compatible content types',async t=>{
 const directory=path.resolve('.data/brand-test-'+crypto.randomUUID());
 const server=await createVouchServer({directory});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(directory,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port;
 for(const [file,type] of [['/brand/vouch-emblem.svg','image/svg+xml'],['/brand/favicon.svg','image/svg+xml'],['/favicon.ico','image/x-icon'],['/site.webmanifest','application/manifest+json']]){
  const response=await fetch(origin+file);assert.equal(response.status,200,file);assert.equal(response.headers.get('content-type'),type);assert.ok((await response.arrayBuffer()).byteLength);
 }
 const manifest=await(await fetch(origin+'/site.webmanifest')).json();assert.deepEqual(manifest.icons.map(i=>i.sizes),['192x192','512x512']);
});
