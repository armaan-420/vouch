import {childrenOf,descendantIds,editCategoryFields,initialCategoryRegistry,loadCategoryRegistry,parents,resolveCategory} from './category-registry.mjs';
import {withLibraryReviews} from './library-reviews.mjs';
import {mapConcurrent} from './map-concurrent.mjs';
import {initialRegistry} from './experiment-api.mjs';
import {publicExperiment,photoUrl} from './experiment-management.mjs';
import {initialTags,canonicalProductId} from './product-tags.mjs';
import {fresh,community,voteScore,voteCounts} from './vouch-api.mjs';

const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>normalize(s).split(' ').filter(Boolean);
const aliases=[[/\b(sunblock|sun protection|sun cream)\b/g,'sunscreen'],[/\b(water bottle|bottle|bottles)\b/g,'water bottles'],[/\b(not greasy|isn t greasy|non greasy|oil free)\b/g,'non-greasy'],[/\b(no fragrance|without fragrance|unscented)\b/g,'fragrance-free'],[/\b(doesn t leak|won t leak|leakproof)\b/g,'leak-proof'],[/\b(for dry skin|moisturizing)\b/g,'hydrating'],[/\b(under make up|under makeup)\b/g,'wears well under makeup'],[/\b(no white residue|without a white cast)\b/g,'no white cast']];
const filler=new Set(words('i me my a an the want need looking look find show recommend something products product that which is are to for with and of please best good great everyday daily can you it works work would like some'));
export function interpretQuery(query,definitions){
 let text=normalize(query);for(const [pattern,replacement]of aliases)text=text.replace(pattern,replacement);text=normalize(text);
 const required=[],excluded=[];
 // Longest phrases first prevents "water" or "finish" from becoming accidental evidence.
 for(const tag of [...definitions].sort((a,b)=>b.label.length-a.label.length)){
  const label=normalize(tag.label),needle=new RegExp('\\b'+label.replaceAll(' ','\\s+')+'\\b','g');
  const negation=new RegExp('\\b(?:without|not|no|avoid)\\s+'+label.replaceAll(' ','\\s+')+'\\b','g');
  if(negation.test(text)){excluded.push(tag);text=text.replace(negation,' ')}
  else if(needle.test(text)){required.push(tag);text=text.replace(needle,' ')}
 }
 return {required,excluded,terms:[...new Set(words(text).filter(w=>!filler.has(w))) ]};
}
export function personalFit(product,opinions,products){
 const direct=opinions.find(o=>o.productId===product.id&&['yes','brand','no'].includes(o.verdict));
 if(direct)return {score:null,verdict:direct.verdict,label:direct.verdict==='yes'?'You vouched':direct.verdict==='no'?'You passed':'You trust this brand',basis:0};
 const peers=opinions.filter(o=>['yes','no'].includes(o.verdict)).map(o=>({opinion:o,product:products.find(p=>p.id===o.productId)})).filter(x=>x.product&&x.product.category===product.category&&x.product.tags.some(t=>product.tags.some(p=>p.id===t.id)));
 if(peers.length<2)return null;
 let sum=0,weight=0;for(const x of peers){const shared=x.product.tags.filter(t=>product.tags.some(p=>p.id===t.id)).length;const w=shared/new Set([...x.product.tags,...product.tags].map(t=>t.id)).size;sum+=(x.opinion.verdict==='yes'?10:0)*w;weight+=w;}
 return {score:Number(((10+sum)/(2+weight)).toFixed(1)),verdict:null,label:'Estimated fit',basis:peers.length};
}
const scoreFor=p=>p.score??p.reviewScore;
const ratingCount=p=>p.voteCounts.total||p.reviewCounts?.total||0;
export function rankProducts(products,opinions,{query='',category='',sort='best',reviewed=false,offset=0,limit=24,registry=initialCategoryRegistry()}={}){
 const definitions=[...new Map(products.flatMap(p=>p.tags).map(t=>[t.id,t])).values()];
 const intent=interpretQuery(query,definitions);
 const selected=resolveCategory(registry,{category,categoryId:category});
 const categoryIds=new Set(descendantIds(registry,selected.matched?selected.id:category));
 const rows=products.filter(p=>!category||categoryIds.has(p.categoryId)||p.category===category).filter(p=>!reviewed||ratingCount(p)>0).flatMap(p=>{
  const text=words([p.brand,p.name,p.category,p.formula,...p.tags.map(t=>t.label)].join(' '));
  const has=term=>text.some(w=>w===term||w===term+'s'||w+'s'===term);
  if(intent.terms.some(t=>!has(t))||intent.required.some(t=>!p.tags.some(x=>x.id===t.id))||intent.excluded.some(t=>p.tags.some(x=>x.id===t.id)))return [];
  // An absent tag cannot establish a negative property.
  if(intent.excluded.length)return [];
  const fit=personalFit(p,opinions,products);
  const relevance=intent.terms.reduce((n,t)=>n+(words(p.name+' '+p.brand).includes(t)?2:1),0);
  const personal=fit?.verdict==='yes'?10:fit?.verdict==='no'?0:fit?.score;
  const rank=relevance*20+(personal==null?Number(scoreFor(p)??5):personal*.65+Number(scoreFor(p)??5)*.35)+(ratingCount(p)?1:0);
  return [{...p,fit,reasons:intent.required.map(t=>t.label),rank}];
 });
 rows.sort((a,b)=>sort==='community'?Number(scoreFor(b)??-1)-Number(scoreFor(a)??-1)||ratingCount(b)-ratingCount(a):sort==='personal'?(b.fit?.score??(b.fit?.verdict==='yes'?10:b.fit?.verdict==='no'?0:-1))-(a.fit?.score??(a.fit?.verdict==='yes'?10:a.fit?.verdict==='no'?0:-1))||b.rank-a.rank:b.rank-a.rank);
 return {products:rows.slice(offset,offset+limit).map(({rank,...p})=>p),total:rows.length,hasMore:offset+limit<rows.length,understood:[...intent.required.map(t=>t.label),...intent.terms],note:intent.excluded.length?'We cannot verify exclusions from missing product tags. Try a confirmed property such as fragrance-free.':null};
}
export async function discoverySearch({store,accounts,request,all=false}){
 const url=new URL(request.url),query=(url.searchParams.get('q')||'').trim();
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
 if(request.method!=='GET')return json({error:'Method not allowed.'},405);
 if(query.length>240)return json({error:'Keep your search under 240 characters.'},400);
 const registry=await loadCategoryRegistry(store,await store.scope('experiment-registry',initialRegistry));
 const [products,me]=await Promise.all([publicInventory(store,undefined,registry),accounts(new Request(new URL('/api/account/me',request.url),{headers:request.headers}))]);
 if(!me.ok)return json({error:'Could not load your preferences. Please retry.'},503);
 const profile=(await me.json()).profile,opinions=profile?.opinions||[];
 const offset=Math.max(0,Math.min(100000,Number.parseInt(url.searchParams.get('offset')||'0',10)||0));
 const categoryOptions=[...new Map(products.map(p=>[p.categoryId,{id:p.categoryId,label:(Object.hasOwn(registry.categories,p.categoryId)?registry.categories[p.categoryId].label:p.category),parentId:p.parentCategoryId}])).values()].sort((a,b)=>a.label.localeCompare(b.label));
 const activeParents=new Set(categoryOptions.map(c=>c.parentId??(childrenOf(registry,c.id).length?c.id:null)));
 const categoryParents=parents(registry).filter(c=>activeParents.has(c.id)).map(({id,label})=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label));
 return json({...rankProducts(products,opinions,{query,registry,category:url.searchParams.get('category')||'',sort:url.searchParams.get('sort')||'best',reviewed:url.searchParams.get('reviewed')==='1',offset,limit:all?Number.MAX_SAFE_INTEGER:24}),categories:[...new Set(products.map(p=>p.category))].sort(),categoryOptions,parents:categoryParents,catalogueCount:products.length,ratingsCount:opinions.filter(o=>['yes','no','brand'].includes(o.verdict)).length,personalized:!!profile});
}

export async function publicInventory(store,accountRecords,categoriesRegistry){
 const registry=categoriesRegistry??await loadCategoryRegistry(store,await store.scope('experiment-registry',initialRegistry));
 return withLibraryReviews(store,await editInventory(store,registry),accountRecords,registry);
}

export async function editInventory(store,categoriesRegistry){
 const experimentStore=await store.scope('experiment-registry',initialRegistry);
 const taxonomy=categoriesRegistry??await loadCategoryRegistry(store,experimentStore);
 const [registry,tags]=await Promise.all([experimentStore.read(),Promise.resolve(store.scope('product-tags',initialTags)).then(s=>s.read())]),totals=new Map();
 const experiments=Object.values(registry.experiments).filter(publicExperiment);
 // Release raw vote/visitor records after each batch instead of retaining every category.
 for(let start=0;start<experiments.length;start+=6){
 const batch=experiments.slice(start,start+6);
 const states=await mapConcurrent(batch,async e=>(e.id==='sunscreen'?store:await store.scope('experiment:'+e.id,fresh)).read());
 for(const [index,e] of batch.entries()){
  const data=states[index],fields=editCategoryFields(taxonomy,e);
  for(const p of [...e.products,...community(data,'',e.products)]){
   const id=p.communityNominated?p.skuId:canonicalProductId(p);if(!id)continue;
   if(!totals.has(id))totals.set(id,{product:{id,variantLabel:p.variantLabel||null,alternateRefs:p.alternateRefs||[],searchAliases:p.searchAliases||[],name:p.name,brand:p.brand||'',...fields,formula:p.formula||'',image:photoUrl(p.photoOverride||p.image),...(p.provider?{provider:p.provider,providerId:p.providerId}:{}),href:'/products/'+encodeURIComponent(id),tags:(tags.products[id]?.tagIds||[]).map(k=>tags.definitions[k]).filter(Boolean).map(t=>({id:t.id,label:t.label}))},votes:new Map()});
   const row=totals.get(id),votes=(p.communityNominated?data.communityVotes:data.baseVotes)?.[p.id]||{},times=(p.communityNominated?data.communityVoteTimes:data.baseVoteTimes)?.[p.id]||{};
   for(const [visitor,value]of Object.entries(votes)){const at=times[visitor]||'';if(!row.votes.has(visitor)||at>row.votes.get(visitor).at)row.votes.set(visitor,{value,at})}
  }
 }
 }
 const products=[...totals.values()].map(({product,votes})=>{const values=Object.fromEntries([...votes].map(([key,x])=>[key,x.value]));return {...product,score:voteScore(values),voteCounts:voteCounts(values)}});
 return products;
}
