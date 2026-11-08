import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createFileStore} from '../lib/file-store.mjs';
import {createAdminAuth,ADMIN_SESSION_MS} from '../lib/admin-auth.mjs';
import {createVouchServer} from '../server.mjs';
const PIN='2468';
async function fixture(t){
 const directory=path.resolve('.data/admin-auth-tests',crypto.randomUUID());
 const store=await createFileStore(directory);let time=1000000;
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const options={store,pin:PIN,now:()=>time};
 return {store,options,get time(){return time},set time(value){time=value},auth:createAdminAuth(options)};
}
function request(path='/api/admin/auth/login',{cookie,pin=PIN,origin='https://vouch.test',method='POST',headers={}}={}){
 return new Request('https://vouch.test'+path,{method,headers:{origin,...(cookie?{cookie}:{}),...headers},...(!['GET','HEAD'].includes(method)?{body:JSON.stringify({pin})}:{})});
}
async function unlock(auth){const response=await auth.handle(request());assert.equal(response.status,200);return response.headers.getSetCookie()[0].split(';')[0];}
test('admin session survives service recreation, expires at exactly 24 hours and activity never extends it',async t=>{
 const f=await fixture(t),cookie=await unlock(f.auth),get=()=>request('/api/admin/inventory',{method:'GET',cookie});
 assert.equal(await f.auth.authorize(get()),true);
 f.time+=ADMIN_SESSION_MS-1;assert.equal(await createAdminAuth(f.options).authorize(get()),true);
 f.time++;assert.equal(await f.auth.authorize(get()),false);
});
test('admin cookie is HttpOnly, secure, fixed duration; tokens cannot be forged, old email header cannot bypass PIN',async t=>{
 const f=await fixture(t),response=await f.auth.handle(request()),cookie=response.headers.getSetCookie()[0];
 for(const attribute of ['HttpOnly','Secure','SameSite=Strict','Max-Age=86400','Path=/'])assert.ok(cookie.includes(attribute));
 assert.equal(await f.auth.authorize(request('/api/admin/inventory',{method:'GET',cookie:'vouch_admin_session='+'a'.repeat(64)})),false);
 assert.equal(await f.auth.authorize(request('/admin',{method:'GET',headers:{'oai-authenticated-user-email':'seedy@sites.test'}})),false);
 const rawToken=cookie.split(';')[0].split('=')[1];assert.ok(!JSON.stringify(await(await f.store.scope('admin-auth-v1')).read()).includes(rawToken));
 assert.equal(await f.auth.authorize(request('/admin',{method:'GET',cookie:cookie.split(';')[0]+'; '+cookie.split(';')[0]})),false);
});
test('incorrect attempts are persistently rate limited and recover after 15 minutes',async t=>{
 const f=await fixture(t);
 for(let i=0;i<5;i++)assert.equal((await f.auth.handle(request(undefined,{pin:'0000'}))).status,401);
 assert.equal((await createAdminAuth(f.options).handle(request())).status,429);
 f.time+=15*60*1000;assert.equal((await f.auth.handle(request())).status,200);
});
test('logout, PIN rotation, missing configuration and cross-origin requests enforce server authorization',async t=>{
 const f=await fixture(t),cookie=await unlock(f.auth);
 assert.equal((await f.auth.handle(request(undefined,{origin:'https://other.test'}))).status,403);
 assert.equal(await f.auth.authorize(request('/api/admin/settings',{cookie,origin:'https://other.test'})),false);
 assert.equal(await f.auth.authorize(request('/api/admin/settings',{cookie,headers:{'sec-fetch-site':'cross-site'}})),false);
 assert.equal(await createAdminAuth({...f.options,pin:'9999'}).authorize(request('/admin',{method:'GET',cookie})),false);
 assert.equal(await createAdminAuth({...f.options,pin:undefined}).authorize(request('/admin',{method:'GET',cookie})),false);
 assert.equal((await createAdminAuth({...f.options,pin:undefined}).handle(request())).status,503);
 assert.equal((await f.auth.handle(request('/api/admin/auth/logout',{cookie}))).status,200);
 assert.equal(await f.auth.authorize(request('/admin',{method:'GET',cookie})),false);
});
test('PIN gate protects admin HTML, exports, feedback, suggestions, reads and writes end to end',async t=>{
 const f=await fixture(t),directory=path.resolve('.data/admin-auth-tests',crypto.randomUUID());
 const server=await createVouchServer({directory,productSearch:{find:async()=>null,search:async()=>({products:[]})},adminAuthOptions:{pin:PIN,now:()=>f.time}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port;
 for(const route of ['/admin','/admin/','/admin.html']){const page=await fetch(origin+route);assert.match(await page.text(),/Enter your PIN/);assert.match(page.headers.get('cache-control'),/no-store/);}
 for(const route of ['/api/admin/summary','/api/admin/export','/api/admin/inventory','/api/admin/feedback','/api/admin/suggestions'])assert.equal((await fetch(origin+route)).status,401);
 const write=()=>({method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({id:"sunscreen",includeInOverall:false,closed:false})});
 assert.equal((await fetch(origin+'/api/admin/experiment-settings',write())).status,401);
 const login=await fetch(origin+'/api/admin/auth/login',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({pin:PIN})});assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie()[0].split(';')[0],headers={cookie};
 assert.match(await(await fetch(origin+'/admin',{headers})).text(),/admin-content/);
 for(const route of ['/api/admin/summary','/api/admin/export','/api/admin/inventory','/api/admin/feedback','/api/admin/suggestions'])assert.equal((await fetch(origin+route,{headers})).status,200);
 const save=write();save.headers.cookie=cookie;assert.equal((await fetch(origin+'/api/admin/experiment-settings',save)).status,200);
 assert.equal((await fetch(origin+'/api/admin/experiment-settings',{...save,headers:{...save.headers,origin:'https://other.test'}})).status,403);
 f.time+=ADMIN_SESSION_MS;
 assert.match(await(await fetch(origin+'/admin',{headers})).text(),/Enter your PIN/);
 assert.equal((await fetch(origin+'/api/admin/inventory',{headers})).status,401);
 assert.equal((await fetch(origin+'/')).status,200);
});
