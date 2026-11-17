import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequestStore} from '../lib/request-store.mjs';

function fixture(){
 const values=new Map([['accounts',{name:'First'}]]),counts=new Map();
 const scope=key=>({
  scope,
  async read(){counts.set(key,(counts.get(key)||0)+1);return structuredClone(values.get(key));},
  async transaction(fn){return fn(values.get(key));},
  async destroy(){values.delete(key);},
 });
 return {store:scope('root'),values,counts};
}

test('request reads coalesce across scopes and return independent data',async()=>{
 const {store,counts}=fixture(),request=createRequestStore(store);
 const a=await request.scope('accounts'),b=await request.scope('accounts');
 const [first,second]=await Promise.all([a.read(),b.read()]);
 assert.equal(counts.get('accounts'),1);first.name='Modified';
 assert.equal(second.name,'First');assert.equal((await a.read()).name,'First');
});

test('each request rechecks private data and writes invalidate prior reads',async()=>{
 const {store,values,counts}=fixture(),request=createRequestStore(store),a=await request.scope('accounts');
 await a.read();await a.transaction(data=>{data.name='Changed';});
 assert.equal((await a.read()).name,'Changed');assert.equal(counts.get('accounts'),2);
 values.set('accounts',{name:'Disabled externally'});
 assert.equal((await (await createRequestStore(store).scope('accounts')).read()).name,'Disabled externally');
 await a.destroy();assert.equal(await a.read(),undefined);
});

test('failed reads and writes do not poison later reads',async()=>{
 let reads=0,value=1;
 const request=await createRequestStore({async read(){if(++reads===1)throw Error('offline');return value;},async transaction(){value=2;throw Error('write failed');},scope(){return this;}}).scope('accounts');
 await assert.rejects(request.read(),/offline/);assert.equal(await request.read(),1);
 await assert.rejects(request.transaction(()=>{}),/write failed/);assert.equal(await request.read(),2);
});

test('a read started before a write cannot repopulate the request cache afterward',async()=>{
 let release,reads=0;
 const request=await createRequestStore({read(){return ++reads===1?new Promise(resolve=>{release=resolve;}):Promise.resolve(2);},async transaction(){},scope(){return this;}}).scope('accounts');
 const old=request.read();await Promise.resolve();await request.transaction(()=>{});release(1);
 assert.equal(await old,1);assert.equal(await request.read(),2);assert.equal(reads,2);
});

test('hosted-style request scopes preserve sign-in, vote sync and immediate session revocation',async t=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');
 const {createFileStore}=await import('../lib/file-store.mjs');
 const {createApplicationApi}=await import('../lib/application-api.mjs');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-request-cache-'));
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const base=await createFileStore(directory),cookies=new Map();
 async function call(path,payload,override){
  const api=createApplicationApi({store:createRequestStore(base),search:{find:async()=>null,search:async()=>({products:[]})},authorizeAdmin:()=>false,authOptions:{previewDelivery:true}});
  const response=await api(new Request('http://127.0.0.1'+path,{method:payload?'POST':'GET',headers:{origin:'http://127.0.0.1',cookie:override??[...cookies].map(([k,v])=>k+'='+v).join('; '),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined}));
  for(const cookie of response.headers.getSetCookie()){const [key,value]=cookie.split(';')[0].split('=');cookies.set(key,value);}
  return {status:response.status,data:await response.json()};
 }
 const start=await call('/api/auth/start',{email:'cache-fixture@example.test'});
 assert.equal(start.status,200);
 assert.equal((await call('/api/auth/verify',{challengeId:start.data.challengeId,code:start.data.previewCode})).status,200);
 const vote=await call('/api/events',{type:'answer',productId:'boj',value:'yes'});
 assert.equal(vote.status,200);assert.equal(vote.data.profileSync,'saved');
 const me=await call('/api/account/me');assert.equal(me.data.authenticated,true);assert.equal(me.data.profile.opinions[0].verdict,'yes');
 const revoked=[...cookies].map(([k,v])=>k+'='+v).join('; ');
 assert.equal((await call('/api/auth/logout',{})).status,200);
 assert.equal((await call('/api/account/me',undefined,revoked)).data.authenticated,false);
});
