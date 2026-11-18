import {tokens} from './catalog/normalize.mjs';

export const CATEGORY_SCOPE='category-registry-v1';
const slug=/^[a-z0-9-]{1,64}$/;
const labelKey=label=>tokens(label).join('-');
const createCategory=(id,label,parentId=null,aliases=[],providerSlugs=[],cover=null)=>({id,label,parentId,aliases,providerSlugs,cover});

export function initialCategoryRegistry(){
 const categories=[
  createCategory('beauty','Beauty'),
  createCategory('sunscreen','Sunscreen','beauty',['sunscreens','spf'],['sunscreen'],'sunscreen'),
  createCategory('blush','Blush','beauty',[],[],'blush'),
  createCategory('lip-balm','Lip balm','beauty',[],[],'lip-balm'),
  createCategory('hand-cream','Hand cream','beauty',[],[],'hand-cream'),
  createCategory('shampoo','Shampoo','beauty',['shampoos'],['shampoo']),
  createCategory('electronics','Electronics'),
  createCategory('televisions','Televisions','electronics',['tv','tvs','television'],['televisions']),
  createCategory('headphones','Headphones','electronics',[],[],'headphones'),
  createCategory('power-banks','Power banks','electronics'),
  createCategory('air-purifiers','Air purifiers','electronics',[],[],'air-purifiers'),
  createCategory('travel-outdoors','Travel & Outdoors'),
  createCategory('water-bottles','Water bottles','travel-outdoors',['water bottle'],['water-bottles','sports-water-bottles'],'water-bottles'),
  createCategory('carry-on-luggage','Carry-on luggage','travel-outdoors'),
  createCategory('running-shoes','Running shoes','travel-outdoors'),
 ];
 return {version:1,categories:Object.fromEntries(categories.map(category=>[category.id,category]))};
}

const getCategory=(registry,id)=>typeof id==='string'&&Object.hasOwn(registry.categories,id)?registry.categories[id]:null;
export function resolveCategory(registry,{categoryId,category,categorySlug}){
 const key=labelKey(category),categories=Object.values(registry.categories);
 const match=getCategory(registry,categoryId)
  ||(categorySlug&&categories.find(c=>c.providerSlugs.includes(categorySlug)))
  ||(key&&categories.find(c=>[c.label,...c.aliases].some(label=>labelKey(label)===key)));
 if(!match)return {id:key||'uncategorized',label:category||'Uncategorized',parentId:null,parentLabel:null,matched:false};
 return {id:match.id,label:match.label,parentId:match.parentId,parentLabel:getCategory(registry,match.parentId)?.label??null,matched:true};
}

export const childrenOf=(registry,parentId)=>Object.values(registry.categories).filter(c=>parentId!=null&&c.parentId===parentId);
export const parents=registry=>Object.values(registry.categories).filter(c=>c.parentId===null);
export const descendantIds=(registry,id)=>[id,...childrenOf(registry,id).map(c=>c.id)];

const fail=(message,status=400)=>Object.assign(Error(message),{status});
export function categoryIdForLabel(label,registry){
 if(typeof label!=='string')return '';
 const readable=labelKey(label).replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
 if(!readable)return 'category-'+crypto.randomUUID();
 const base=readable.slice(0,64).replace(/-$/,'');
 let id=base;
 for(let i=2;getCategory(registry,id);i++){
  const suffix='-'+i;
  id=base.slice(0,64-suffix.length).replace(/-$/,'')+suffix;
 }
 return id;
}

export function validateCategory(data,registry){
 if(!data||typeof data!=='object')throw fail('Enter a category.');
 const {id,label,parentId=null,aliases=[]}=data;
 if(typeof id!=='string'||!slug.test(id))throw fail('Use 1–64 lowercase letters, numbers, or hyphens for the category ID.');
 if(typeof label!=='string'||label.trim().length<2||label.trim().length>60||!labelKey(label))throw fail('Enter a category label of 2–60 characters.');
 if(!Array.isArray(aliases)||aliases.length>40||aliases.some(alias=>typeof alias!=='string'||alias.trim().length>80||!labelKey(alias)))throw fail('Enter up to 40 aliases, each 1–80 characters.');
 if(parentId!==null){
  if(parentId===id)throw fail('A category cannot be its own parent.');
  const parent=getCategory(registry,parentId);
  if(!parent)throw fail('Choose an existing parent category.');
  if(parent.parentId!==null||childrenOf(registry,id).length)throw fail('Categories can only have two levels.');
 }
 const keys=[label,...aliases].map(labelKey);
 const used=new Set(Object.values(registry.categories).filter(c=>c.id!==id).flatMap(c=>[c.label,...c.aliases].map(labelKey)));
 if(new Set(keys).size!==keys.length||keys.some(key=>used.has(key)))throw fail('Category labels and aliases must be unique.',409);
 const previous=getCategory(registry,id);
 return createCategory(id,label.trim(),parentId,aliases.map(alias=>alias.trim()),previous?.providerSlugs||[],previous?.cover||null);
}

export function categoryFields(resolved){
 return {categoryId:resolved.id,parentCategoryId:resolved.parentId,parentCategory:resolved.parentLabel};
}

// Edits own the category of their lineups. Provider metadata on the underlying
// SKU can still be used when the same product is reviewed outside an Edit.
export function editCategoryFields(registry,edit){
 return {category:edit.category,...categoryFields(resolveCategory(registry,{category:edit.category,categoryId:edit.categoryId}))};
}

export function assignEditCategory(edit,registry){
 const resolved=resolveCategory(registry,edit);
 if(resolved.matched){
  edit.category=resolved.label;
  edit.categoryId=resolved.id;
  return {};
 }
 delete edit.categoryId;
 return {warning:'This category is not in the registry yet. You can add it under Categories.'};
}

export function categoryBackfillReport(registry,experiments){
 const matched=[],unmatched=[];
 for(const edit of Object.values(experiments)){
  if(edit.categoryId)continue;
  const resolved=resolveCategory(registry,edit);
  const row={editId:edit.id,category:edit.category??null};
  if(resolved.matched)matched.push({...row,categoryId:resolved.id});
  else unmatched.push(row);
 }
 return {matched,unmatched};
}

export async function backfillCategoryIds(registry,experimentStore,{dryRun=false}={}){
 const inspect=data=>categoryBackfillReport(registry,data.experiments);
 const report=inspect(await experimentStore.read());
 if(dryRun||!report.matched.length)return report;
 return experimentStore.transaction(data=>{
  const current=inspect(data);
  for(const row of current.matched)data.experiments[row.editId].categoryId=row.categoryId;
  return current;
 });
}

export async function loadCategoryRegistry(store,experimentStore){
 // An absent row reads as uninitialized. Backfill first so a failed write can
 // be retried on the next request. Both operations tolerate concurrent starts.
 const scoped=await store.scope(CATEGORY_SCOPE,()=>({version:1,categories:null}));
 const saved=await scoped.read();
 if(saved.categories)return saved;
 const seed=initialCategoryRegistry();
 const {unmatched}=await backfillCategoryIds(seed,experimentStore);
 const {registry,initialized}=await scoped.transaction(data=>{
  if(data.categories)return {registry:data,initialized:false};
  data.categories=seed.categories;
  return {registry:data,initialized:true};
 });
 if(initialized)for(const {editId,category} of unmatched)console.info('Unmatched Edit category',JSON.stringify({editId,category}));
 return registry;
}
