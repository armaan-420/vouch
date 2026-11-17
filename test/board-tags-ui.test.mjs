import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

test('Board people load in one batch and errors remain distinct from zero endorsers',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const start=source.indexOf('async function mountBoardPeople()'),end=source.indexOf("\ndocument.addEventListener('click'",start);
 const controller=source.slice(start,end);
 let fail=false,calls=0,retry;
 const hosts=['one','two'].map(id=>({dataset:{boardPeople:id,path:'/products/'+id},isConnected:true,innerHTML:'',setAttribute(){},querySelector(){return {set onclick(fn){retry=fn}}}}));
 const api=async()=>{calls++;if(fail)throw Error('Offline');return {summaries:{one:{total:1,people:[{displayName:'Alice',handle:'alice',isYou:true}]},two:{total:0,people:[]}}}};
 const context={app:{querySelectorAll:()=>hosts},api,URLSearchParams,Set,window:{VouchPeople:{avatar:()=>'<a>AL</a>',shortName:String}},esc:String};
 vm.createContext(context);vm.runInContext(controller,context);await vm.runInContext('mountBoardPeople()',context);
 assert.equal(calls,1);assert.match(hosts[0].innerHTML,/You vouch/);assert.equal(hosts[1].innerHTML,'');assert.equal(hosts[1].hidden,true);
 fail=true;await vm.runInContext('mountBoardPeople()',context);assert.match(hosts[0].innerHTML,/Retry/);assert.doesNotMatch(hosts[0].innerHTML,/No named/);
 fail=false;await retry();assert.match(hosts[0].innerHTML,/You vouch/);
});
