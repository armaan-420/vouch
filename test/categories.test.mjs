import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createVouchServer} from '../server.mjs';
import {DEFAULT_EXPERIMENT} from '../lib/experiment-api.mjs';

test('category directory exposes only open public lineups and no participant or draft data',async t=>{
 const directory=await fs.mkdtemp(path.resolve('.data/category-test-'));
 const make=(id,extra={})=>({...DEFAULT_EXPERIMENT,id,title:id+' edit',category:id,products:[{id:'sample',brand:'Example',name:'Sample',image:'https://example.com/photo.jpg'}],...extra});
 const experiments={sunscreen:DEFAULT_EXPERIMENT,open:make('open'),draft:make('draft',{status:'draft'}),disabled:make('disabled',{disabled:true}),closed:make('closed',{closed:true}),deleting:make('deleting',{deleting:true}),upcoming:make('upcoming',{startsAt:'2099-01-01T00:00:00Z'}),ended:make('ended',{endsAt:'2000-01-01T00:00:00Z'})};
 await fs.writeFile(path.join(directory,'experiment-registry.json'),JSON.stringify({experiments,skus:{}}));
 const server=await createVouchServer({directory,productSearch:{find:async()=>null,search:async()=>({products:[]})}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port;
 const response=await fetch(origin+'/api/categories'),data=await response.json();
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(data.categories.map(c=>c.id),['open','sunscreen']);
 assert.deepEqual(data.categories[0],{id:'open',title:'open edit',category:'open',path:'/open',productCount:1,image:'https://example.com/photo.jpg'});
 for(const category of data.categories)assert.deepEqual(Object.keys(category).sort(),['category','id','image','path','productCount','title']);
 for(const route of ['/categories','/categories/']){const page=await fetch(origin+route);assert.equal(page.status,200);assert.match(await page.text(),/What have you <em>tried/);}
 const page=await fetch(origin+'/sunscreen?board=1');assert.match(await page.text(),/src="\/categories.js"/);
 const reserved=await fetch(origin+'/api/admin/experiments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'categories',title:'Test category',category:'Test',productIds:['boj'],customProducts:[]})});
 assert.equal(reserved.status,400);
});
