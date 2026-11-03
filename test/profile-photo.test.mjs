import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {cleanProfilePhoto} from '../lib/profile-photo.mjs';
import {createAccountsApi} from '../lib/accounts.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {filePhotoStorage} from '../lib/file-photos.mjs';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function chunk(type,data){const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,-4)),b.length-4);return b}
function png({size=400,metadata=true}={}){const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),...(metadata?[chunk('eXIf',Buffer.from('GPS secret')),chunk('tEXt',Buffer.from('Location secret'))]:[]),chunk('IDAT',deflateSync(Buffer.alloc((400*4+1)*400))),chunk('IEND',Buffer.alloc(0))])}
const url=bytes=>'data:image/png;base64,'+bytes.toString('base64');
test('photo validation enforces normalized format and dimensions, strips EXIF/text and rejects corruption',()=>{
 const clean=cleanProfilePhoto(url(png()));assert.deepEqual(Buffer.from(clean),png({metadata:false}));assert.doesNotMatch(Buffer.from(clean).toString(),/GPS|Location/);
 for(const value of ['data:image/jpeg;base64,YQ==',url(png({size:800})),url(Buffer.from('not a PNG')),null,'data:image/png;base64,'+'a'.repeat(1000001)])assert.throws(()=>cleanProfilePhoto(value));
 const broken=png();broken[broken.length-1]^=1;assert.throws(()=>cleanProfilePhoto(url(broken)));
});
test('photo ownership, private reads, atomic validation, replacement and removal use object references only',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-photo-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const store=await createFileStore(dir),scope=await store.scope('accounts-v1',()=>({accounts:{}}));
 const key=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('alice'))).toString('hex');
 await scope.transaction(data=>{data.accounts[key]={handle:'v-alice',displayName:'Alice',visibility:'private',createdAt:new Date().toISOString(),opinions:{},history:[],milestones:[]}});
 const api=createAccountsApi({store,photoStorage:filePhotoStorage(dir),getIdentity:async r=>r.headers.get('x-owner')?{subject:r.headers.get('x-owner')}:null});
 const call=(route,body,owner='alice',origin='https://test.example')=>api(new Request('https://test.example'+route,{method:body===undefined?'GET':'POST',headers:{...(owner?{'x-owner':owner}:{}),origin,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}));
 assert.equal((await call('/api/account/photo',{image:url(png())},null)).status,401);
 assert.equal((await call('/api/account/photo',{image:url(png())},'bob')).status,404);
 assert.equal((await call('/api/account/photo',{image:url(png())},'alice','https://evil.example')).status,403);
 assert.equal((await call('/api/account/photo',{image:url(png()),bio:'x'.repeat(161)})).status,400);
 const response=await call('/api/account/photo',{image:url(png()),bio:' hello '});assert.equal(response.status,200);const profile=(await response.json()).profile;assert.equal(profile.bio,'hello');
 assert.equal((await call(profile.photo,undefined,null)).status,404);assert.equal((await call(profile.photo,undefined,'bob')).status,404);
 const image=await call(profile.photo);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.match(image.headers.get('cache-control'),/no-store/);assert.deepEqual(Buffer.from(await image.arrayBuffer()),png({metadata:false}));
 const record=await scope.read();assert.match(record.accounts[key].photo,/^[a-f0-9-]+\.png$/);assert.doesNotMatch(JSON.stringify(record),/base64|GPS secret/);
 assert.equal((await call('/api/account/photo',{image:'bad'})).status,400);assert.equal((await call(profile.photo)).status,200);
 await call('/api/account/profile',{visibility:'public'});assert.equal((await call(profile.photo,undefined,null)).status,200);
 const second=(await (await call('/api/account/photo',{image:url(png())})).json()).profile;assert.notEqual(profile.photo,second.photo);assert.equal((await call(profile.photo)).status,404);
 await call('/api/account/profile',{visibility:'private'});assert.equal((await call(second.photo,undefined,null)).status,404);
 await call('/api/account/photo',{image:null});assert.equal((await call(second.photo)).status,404);assert.equal((await fs.readdir(path.join(dir,'profile-photos'))).length,0);
});
