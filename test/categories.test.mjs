import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createVouchServer} from '../server.mjs';
import {execFileSync} from 'node:child_process';
import {createFileStore} from '../lib/file-store.mjs';
import {initialCategoryRegistry,loadCategoryRegistry,resolveCategory,validateCategory} from '../lib/category-registry.mjs';
import {DEFAULT_EXPERIMENT,initialRegistry} from '../lib/experiment-api.mjs';

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
 assert.deepEqual(data.categories[0],{id:'open',title:'open edit',category:'open',categoryId:'open',parentCategoryId:null,parentCategory:null,fallbackImage:'/category-covers/essentials.svg',path:'/open',productCount:1,image:'https://example.com/photo.jpg'});
 assert.deepEqual(data.parents,[{id:'beauty',label:'Beauty'}]);
 const sunscreen=data.categories[1];
 assert.equal(sunscreen.categoryId,'sunscreen');
 assert.equal(sunscreen.parentCategoryId,'beauty');
 assert.equal(sunscreen.parentCategory,'Beauty');
 for(const category of data.categories)assert.deepEqual(Object.keys(category).sort(),['category','categoryId','fallbackImage','id','image','parentCategory','parentCategoryId','path','productCount','title']);
 for(const route of ['/categories','/categories/']){const page=await fetch(origin+route);assert.equal(page.status,200);assert.match(await page.text(),/What have you <em>tried/);}
 const page=await fetch(origin+'/sunscreen?board=1');assert.match(await page.text(),/src="\/categories.js"/);
 const reserved=await fetch(origin+'/api/admin/experiments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'categories',title:'Test category',category:'Test',productIds:['boj'],customProducts:[]})});
 assert.equal(reserved.status,400);
});

test('category directory sorts mixed case names and supplies bundled images when product photos are missing',async t=>{
 const directory=await fs.mkdtemp(path.resolve('.data/category-covers-test-'));const product={id:'sku-test',brand:'Sample',name:'Item',image:null};
 const experiments=Object.fromEntries([['zebra','zebra'],['alpha','Alpha'],['beta','beta'],['air','Air purifiers']].map(([id,category])=>[id,{...DEFAULT_EXPERIMENT,id,category,products:[product]}]));
 await fs.writeFile(path.join(directory,'experiment-registry.json'),JSON.stringify({experiments,skus:{}}));const server=await createVouchServer({directory,productSearch:{find:async()=>null,search:async()=>({products:[]})}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port,categories=(await(await fetch(origin+'/api/categories')).json()).categories;
 assert.deepEqual(categories.map(c=>c.id),['air','alpha','beta','zebra']);for(const c of categories){assert.match(c.image,/^\/category-covers\/.+\.svg$/);const image=await fetch(origin+c.image);assert.equal(image.status,200);assert.match(await image.text(),/<svg/);}
});


test('registry rejects self-parenting, cycles, third levels, missing parents and normalized collisions',()=>{
 const registry=initialCategoryRegistry();
 const validate=(extra)=>validateCategory({id:'sample',label:'Sample',...extra},registry);
 assert.throws(()=>validate({parentId:'sample'}),/own parent/);
 assert.throws(()=>validate({...registry.categories.beauty,parentId:'sunscreen'}),/two levels/);
 assert.throws(()=>validate({...registry.categories.beauty,parentId:'electronics'}),/two levels/);
 assert.throws(()=>validate({parentId:'headphones'}),/two levels/);
 assert.throws(()=>validate({parentId:'missing'}),/existing parent/);
 assert.throws(()=>validate({id:'Invalid ID'}),/category ID/);
 assert.throws(()=>validate({label:'Sún-screen',aliases:['Sún screen']}),/unique/);
 assert.throws(()=>validate({label:'  WATER–BOTTLES '}),/unique/);
 assert.throws(()=>validate({aliases:['T.V.s','SPF']}),/unique/);
 assert.equal(validate({parentId:'beauty'}).id,'sample');
});

test('registry resolves explicit IDs, provider slugs, legacy labels, aliases and unknown labels in order',()=>{
 const registry=initialCategoryRegistry();
 const resolve=input=>resolveCategory(registry,input);
 const sunscreen={id:'sunscreen',label:'Sunscreen',parentId:'beauty',parentLabel:'Beauty',matched:true};
 const television={id:'televisions',label:'Televisions',parentId:'electronics',parentLabel:'Electronics',matched:true};
 assert.deepEqual(resolve({categoryId:'sunscreen',category:'TVs',categorySlug:'televisions'}),sunscreen);
 assert.deepEqual(resolve({categoryId:'missing',category:'SPF',categorySlug:'televisions'}),television);
 assert.deepEqual(resolve({category:' SÚNSCREEN '}),sunscreen);
 assert.deepEqual(resolve({category:'SPF'}),sunscreen);
 assert.deepEqual(resolve({category:'TVs'}),television);
 assert.deepEqual(resolve({category:'Mugs & Cups',categorySlug:'coffee-mugs'}),{id:'mugs-cups',label:'Mugs & Cups',parentId:null,parentLabel:null,matched:false});
 assert.deepEqual(resolve({}),{id:'uncategorized',label:'Uncategorized',parentId:null,parentLabel:null,matched:false});
});

test('backfill dry run leaves files untouched and initialization only writes IDs once',async t=>{
 const dir=await fs.mkdtemp(path.resolve('.data/category-backfill-test-'));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const edit={...DEFAULT_EXPERIMENT,id:'tv-edit',category:'TVs',customField:{keep:true}};
 const unknown={...DEFAULT_EXPERIMENT,id:'mug-edit',category:'Mugs'};
 const original={experiments:{[edit.id]:edit,[unknown.id]:unknown},skus:{},extra:{preserved:true}};
 const file=path.join(dir,'experiment-registry.json');
 await fs.writeFile(file,JSON.stringify(original));
 const run=(...args)=>execFileSync(process.execPath,['scripts/backfill-category-ids.mjs','--data-dir',dir,...args],{encoding:'utf8'});
 assert.deepEqual(run('--dry-run').trim().split('\n'),[
  'Dry run | Matched: 1 | Unmatched: 1',
  'Matched /tv-edit "TVs" → televisions',
  'Unmatched /mug-edit "Mugs"',
 ]);
 assert.equal(await fs.readFile(file,'utf8'),JSON.stringify(original));
 assert.deepEqual(await fs.readdir(dir),['experiment-registry.json']);
 const store=await createFileStore(dir),edits=await store.scope('experiment-registry',initialRegistry);
 await loadCategoryRegistry(store,edits);
 const after=await edits.read();
 assert.deepEqual(after,{...original,experiments:{...original.experiments,[edit.id]:{...edit,categoryId:'televisions'}}});
 const bytes=await fs.readFile(file,'utf8');
 assert.match(run(),/Backfill \| Matched: 0 \| Unmatched: 1/);
 assert.equal(await fs.readFile(file,'utf8'),bytes);
 await loadCategoryRegistry(store,edits);
 assert.equal(await fs.readFile(file,'utf8'),bytes);
 const separate=await fs.mkdtemp(path.resolve('.data/category-backfill-cli-test-'));
 t.after(()=>fs.rm(separate,{recursive:true,force:true}));
 const cliFile=path.join(separate,'experiment-registry.json');
 await fs.writeFile(cliFile,JSON.stringify(original));
 const write=()=>execFileSync(process.execPath,['scripts/backfill-category-ids.mjs','--data-dir',separate],{encoding:'utf8'});
 assert.match(write(),/Backfill \| Matched: 1 \| Unmatched: 1/);
 assert.deepEqual(JSON.parse(await fs.readFile(cliFile,'utf8')),after);
 assert.match(write(),/Backfill \| Matched: 0 \| Unmatched: 1/);
});

test('directory uses the registry cover for a legacy label after a rename',async t=>{
 const directory=await fs.mkdtemp(path.resolve('.data/category-rename-test-'));
 const e={...DEFAULT_EXPERIMENT,id:'spf-edit',category:'SPF',products:[{id:'sku-fixture',name:'Fixture',brand:'Sample'}]};
 await fs.writeFile(path.join(directory,'experiment-registry.json'),JSON.stringify({experiments:{[e.id]:e},skus:{}}));
 const server=await createVouchServer({directory,productSearch:{find:async()=>null,search:async()=>({products:[]})}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await fs.rm(directory,{recursive:true,force:true});});
 const origin='http://127.0.0.1:'+server.address().port;
 const update=await fetch(origin+'/api/admin/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id:'sunscreen',label:'Sun protection',parentId:'beauty',aliases:[]})});
 assert.equal(update.status,200);
 const {categories}=await (await fetch(origin+'/api/categories')).json();
 assert.equal(categories[0].id,'spf-edit');
 assert.equal(categories[0].categoryId,'sunscreen');
 assert.equal(categories[0].parentCategory,'Beauty');
 assert.equal(categories[0].image,'/category-covers/sunscreen.svg');
});
