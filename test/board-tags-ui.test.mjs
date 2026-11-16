import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the board's actual handler with deferred saves: render immediately,
// preserve other selections, and restore both count and pressed state on failure.
test('board chips optimistically toggle counts and roll back a rejected save',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const controller=source.slice(source.indexOf('function mountBoardTags(){'),source.indexOf('function rankedRow('));
 const initial={tags:[{id:'design',label:'Design',count:1},{id:'quality',label:'Quality',count:2}],selectedTagIds:['quality']};
 const strip={innerHTML:'',setAttribute(){}},status={textContent:'',classList:{add(){},remove(){}}};
 let click,resolveSave,rejectSave,payload;
 const host={isConnected:true,dataset:{boardTags:'example'},querySelector:selector=>selector==='.board-tag-strip'?strip:status,addEventListener:(type,handler)=>{click=handler}};
 const api=async(path,body)=>{if(!body)return structuredClone(initial);payload=body;return new Promise((resolve,reject)=>{resolveSave=resolve;rejectSave=reject})};
 vm.runInNewContext(controller+';mountBoardTags();',{app:{querySelectorAll:()=>[host]},api,document:{activeElement:null},experiment:{status:'open'},esc:String,Set,Array,Number,Math});
 await new Promise(setImmediate);
 const press=id=>click({target:{closest:selector=>selector==='[data-board-tag]'?{dataset:{boardTag:id}}:null}});
 const added=press('design');
 assert.match(strip.innerHTML,/data-board-tag="design" aria-pressed="true"/);
 assert.match(strip.innerHTML,/Design<\/span><span class="board-tag-votes">2<\/span>/);
 assert.deepEqual(Array.from(payload.tagIds),['quality','design']);
 rejectSave(Error('Save unavailable'));await added;
 assert.match(strip.innerHTML,/data-board-tag="design" aria-pressed="false"/);
 assert.match(strip.innerHTML,/Design<\/span><span class="board-tag-votes">1<\/span>/);
 assert.match(status.textContent,/undone/);
 const retry=press('design');resolveSave({tags:[{id:'design',label:'Design',count:2},{id:'quality',label:'Quality',count:2}],selectedTagIds:['quality','design']});await retry;
 const removed=press('design');
 assert.match(strip.innerHTML,/data-board-tag="design" aria-pressed="false"/);
 assert.match(strip.innerHTML,/Design<\/span><span class="board-tag-votes">1<\/span>/);
 assert.deepEqual(Array.from(payload.tagIds),['quality']);
 resolveSave(initial);await removed;
 assert.equal(status.textContent,'Tags saved.');
});
