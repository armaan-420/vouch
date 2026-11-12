const make=(id,label,category=null)=>({id,label,category});
export const STANDARD_TAGS=['Value','Quality','Ease of use','Design','Reliability'].map(label=>make(label.toLowerCase().replace(/ /g,'-'),label));
export const DEFAULT_TAGS=[
 ...STANDARD_TAGS,
 ...['Sturdy','Viral','Beautiful','Durable'].map(label=>make(label.toLowerCase(),label)),
 ...[['leak-proof','Leak-proof'],['heat-retention','Heat retention'],['cold-retention','Cold retention'],['easy-to-clean','Easy to clean'],['lightweight','Lightweight'],['cup-holder-friendly','Cup-holder friendly'],['easy-to-carry','Easy to carry'],['straw-lid','Straw lid'],['dishwasher-safe','Dishwasher safe']].map(([id,label])=>make('water-bottles-'+id,label,'Water bottles')),
 ...['Lightweight','Non-greasy','Hydrating','No white cast','Matte finish','Dewy finish','Wears well under makeup','No pilling','No eye sting','Fragrance-free','Mineral','Chemical','Hybrid','Water-resistant'].map(label=>make('sunscreen-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-'),label,'Sunscreen'))
];
export const initialTags=()=>({definitions:Object.fromEntries(DEFAULT_TAGS.map(t=>[t.id,t])),products:{}});
export const categoryKey=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
export const canonicalProductId=p=>p.onBoardId||p.skuId||p.id;
export function validateTagDefinition(data){
 const label=typeof data.label==='string'?data.label.trim():'';
 const category=data.category==null||data.category===''?null:typeof data.category==='string'?data.category.trim():'';
 if(!label||label.length>60||category!==null&&(!category||category.length>60))throw Object.assign(Error('Enter a tag name (up to 60 characters) and an optional category.'),{status:400});
 return {id:crypto.randomUUID(),label,category};
}
export function validateAssignment(data,definitions,category){
 if(!Array.isArray(data.tagIds)||data.tagIds.length>30||data.tagIds.some(id=>typeof id!=='string'||!Object.hasOwn(definitions,id)))throw Object.assign(Error('Choose up to 30 existing tags.'),{status:400});
 const ids=[...new Set(data.tagIds)];
 if(ids.some(id=>definitions[id].category&&categoryKey(definitions[id].category)!==categoryKey(category)))throw Object.assign(Error('Category tags must match the product category.'),{status:400});
 return ids;
}

// Add new release definitions without replacing organizer-created tags or assignments.
export const TAG_SEED_VERSION=3;
export function seedDefaultTags(data){
 for(const tag of DEFAULT_TAGS){
  if(!Object.hasOwn(data.definitions,tag.id)&&!Object.values(data.definitions).some(t=>categoryKey(t.label)===categoryKey(tag.label)&&categoryKey(t.category)===categoryKey(tag.category)))data.definitions[tag.id]={...tag};
 }
 data.seedVersion=TAG_SEED_VERSION;
}
