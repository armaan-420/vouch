import {parseArgs} from 'node:util';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {CATEGORY_SCOPE,backfillCategoryIds,categoryBackfillReport,initialCategoryRegistry} from '../lib/category-registry.mjs';
import {initialRegistry} from '../lib/experiment-api.mjs';
import {createFileStore} from '../lib/file-store.mjs';

const {values}=parseArgs({options:{'dry-run':{type:'boolean'},'data-dir':{type:'string',default:'.data'}}});
const directory=values['data-dir'];
async function readRecord(key,initial){
 try{return JSON.parse(await readFile(join(directory,key+'.json'),'utf8'));}
 catch(error){if(error.code!=='ENOENT')throw error;return initial();}
}

const registry=await readRecord(CATEGORY_SCOPE,initialCategoryRegistry);
let report;
if(values['dry-run']){
 const edits=await readRecord('experiment-registry',initialRegistry);
 report=categoryBackfillReport(registry,edits.experiments);
}else{
 const store=await createFileStore(directory);
 report=await backfillCategoryIds(registry,await store.scope('experiment-registry',initialRegistry));
}

console.log(`${values['dry-run']?'Dry run': 'Backfill'} | Matched: ${report.matched.length} | Unmatched: ${report.unmatched.length}`);
for(const {editId,category,categoryId} of report.matched)console.log(`Matched /${editId} ${JSON.stringify(category)} → ${categoryId}`);
for(const {editId,category} of report.unmatched)console.log(`Unmatched /${editId} ${JSON.stringify(category)}`);
