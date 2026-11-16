import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const avatarSource=await fs.readFile(new URL('../public/person-avatars.js',import.meta.url),'utf8');
const context={window:{}};vm.runInNewContext(avatarSource,context);const people=context.window.VouchPeople;
const person=(name,handle=name,verdict='yes')=>({displayName:name,handle,verdict});
const path='/products/eltamd?experiment=sunscreen';
test('popup uses public item vouchers only, independently of board totals',()=>{
 const rows=[person('Riya Shah'),person('Brand Person','brand','brand'),person('Nope Person','no','no'),person('Jamie Mills')];
 const html=people.popupRow(rows,null,path);
 assert.match(html,/Riya S\.<\/strong> and 1 other vouched/);assert.doesNotMatch(html,/Brand Person|Nope Person/);
 assert.equal(people.voucherSummary(rows,null).people.length,2);
 assert.equal(people.popupRow(rows.slice(1,3),null,path),'');
});
test('popup copy covers zero, one, two, several, viewer first and all anonymous',()=>{
 assert.equal(people.popupRow([],null,path),'');
 assert.match(people.popupRow([person('Riya Shah')],null,path),/Riya S\.<\/strong> vouched/);
 assert.match(people.popupRow([person('Riya Shah'),person('Jamie')],null,path),/and 1 other vouched/);
 const rows=[person('Riya Shah','riya'),person('Jamie','jamie'),person('Armaan Nathani','you')];
 const html=people.popupRow(rows,'you',path);assert.match(html,/<strong>You<\/strong> and 2 others vouched/);assert.ok(html.indexOf('/profiles/you?')<html.indexOf('/profiles/riya?'));
 assert.match(people.popupRow([person('Anonymous',null),person('Anonymous',null)],null,path),/2 people vouched publicly/);
 assert.equal(people.shortName('Prince'),'Prince');assert.equal(people.shortName(' Riya  Shah '),'Riya S.');
});
test('anonymous vouchers count but are neutral nonlinks and never lead the sentence',()=>{
 const html=people.popupRow([person('Anonymous','never-link'),person('Riya Shah','riya')],null,path);
 assert.match(html,/person-anonymous/);assert.match(html,/<span [^>]*aria-label="Anonymous voucher"[^>]*>\?<\/span>/);
 assert.doesNotMatch(html,/profiles\/never-link|<strong>Anonymous/);assert.match(html,/Riya S\.<\/strong> and 1 other vouched/);
});
test('at most four avatars, full public count, safe names and correct See all destination',()=>{
 const html=people.popupRow(Array.from({length:7},(_,i)=>person('Person '+i,'p'+i)),null,path);
 assert.equal((html.match(/class="vote-voucher-avatar /g)||[]).length,4);assert.match(html,/and 6 others vouched/);
 assert.match(html,/href="\/products\/eltamd\?experiment=sunscreen#item-people">See all/);
 assert.match(people.popupRow([person('<img onerror=x>','safe')],null,path),/&lt;img/);
 assert.match(people.avatar(person('Riya Shah'),0),/>RS<\/a>/);
});
test('people fetch lazily, share one pending cache request, invalidate after voting and hide failures',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const controller=source.slice(source.indexOf('async function loadPopupVouchers('),source.indexOf('// Native disclosure supports'));
 const idHelper=source.slice(source.indexOf('function standingsProductId('),source.indexOf('function standingsProductPath('));
 let requests=0,resolve,reject;const cache=new Map(),slot={innerHTML:''};
 const details={dataset:{voucherProduct:'eltamd',voucherPath:path},querySelector:()=>slot,isConnected:true,open:true};
 const runtime={voucherCache:cache,window:{VouchPeople:people},accountProfile:{handle:'riya'},api:()=>{requests++;return new Promise((ok,fail)=>{resolve=ok;reject=fail})},document:{addEventListener(){}}};
 vm.createContext(runtime);vm.runInContext(idHelper+controller,runtime);assert.equal(requests,0);
 const first=runtime.loadPopupVouchers(details),second=runtime.loadPopupVouchers(details);assert.equal(requests,1);assert.match(slot.innerHTML,/Loading public vouchers/);
 resolve({contributors:[person('Riya Shah','riya')]});await Promise.all([first,second]);assert.match(slot.innerHTML,/<strong>You/);
 await runtime.loadPopupVouchers(details);assert.equal(requests,1);
 runtime.invalidateProductVouchers({id:'community-internal',skuId:'eltamd',communityNominated:true});assert.equal(cache.size,0);
 const failed=runtime.loadPopupVouchers(details);reject(Error('Unavailable'));await failed;assert.equal(slot.innerHTML,'');assert.equal(cache.size,0);
});
