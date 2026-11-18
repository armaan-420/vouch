import {categoryFields,loadCategoryRegistry,resolveCategory} from './category-registry.mjs';
import {initialRegistry} from './experiment-api.mjs';
import {matchRelevance} from './search-matching.mjs';
import {editInventory,personalFit} from './discovery-search.mjs';
import {withLibraryReviews} from './library-reviews.mjs';
import {tokens,productName} from './catalog/normalize.mjs';
const indexes=new WeakMap();
export const invalidateSearchIndex=store=>indexes.delete(store.cacheIdentity||store);
async function inventory(store){const key=store.cacheIdentity||store,hit=indexes.get(key);if(hit&&hit.until>Date.now())return hit.promise;const promise=editInventory(store);indexes.set(key,{until:Date.now()+60000,promise});try{return await promise}catch(error){indexes.delete(key);throw error}}
const key=p=>p.brand?JSON.stringify([tokens(p.brand).join(' '),tokens(productName(p.name,p.brand)).join(' '),tokens(p.variantLabel).join(' ')]):p.id;
const refs=p=>[p,...(p.alternateRefs||[])].filter(p=>p.provider&&p.providerId).map(p=>p.provider+':'+p.providerId);
export function mergeSearchResults(internal,external,q){
 const rows=new Map(),identities=new Map(),outside=[];
 for(const p of internal){const href=p.href||'/products/'+encodeURIComponent(p.id),row={...p,identity:{id:p.id,provider:p.provider||null,providerId:p.providerId||null},relevance:matchRelevance(p,q),vouchStatus:(p.voteCounts.total||p.reviewCounts?.total)?'rated':'listed',evidence:{communityScore:p.score??p.reviewScore??null,ratingCount:p.voteCounts.total||p.reviewCounts?.total||0,tags:p.tags,personalFit:p.fit},action:{type:'view',href},discoveryHref:href};rows.set(key(p),row);for(const ref of refs(p))identities.set(ref,row)}
 for(const p of external){const existing=refs(p).map(ref=>identities.get(ref)).find(Boolean)||rows.get(key(p));if(existing){existing.catalogMatch=true;existing.relevance=Math.max(existing.relevance,matchRelevance(p,q));continue}const href='/products/'+encodeURIComponent(p.id),row={...p,identity:{id:p.id,provider:p.provider||null,providerId:p.providerId||null},relevance:matchRelevance(p,q),vouchStatus:'new',vouchCategory:p.category||null,evidence:{communityScore:null,ratingCount:0,tags:[],personalFit:null},action:{type:'view',href},discoveryHref:href};outside.push(row);rows.set(key(p),row);for(const ref of refs(p))identities.set(ref,row)}
 return [...[...rows.values()].filter(p=>p.vouchStatus!=='new').sort((a,b)=>b.relevance-a.relevance||Number(b.evidence.communityScore||0)-Number(a.evidence.communityScore||0)),...outside];
}
export async function globalSearch({store,accounts,request,search}){
 const url=new URL(request.url),q=(url.searchParams.get('q')||'').trim(),source=url.searchParams.get('source');
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(q.length>100)return json({error:'Keep your search under 100 characters.'},400);
 if(source&&!['vouch','catalog'].includes(source))return json({error:'Unknown search source'},400);
 const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||20);
 if(!Number.isSafeInteger(offset)||offset<0||offset>100000||!Number.isInteger(limit)||limit<1||limit>40)return json({error:'Invalid page'},400);
 if(tokens(q).join('').length<2)return json({products:[],partial:false,total:0,hasMore:false});
 const taxonomy=loadCategoryRegistry(store,await store.scope('experiment-registry',initialRegistry));
 const [local,catalog]=await Promise.allSettled([taxonomy.then(async registry=>withLibraryReviews(store,await inventory(store),undefined,registry)),source==='vouch'||tokens(q).join('').length<3?Promise.resolve({products:[]}):search.search(q,{category:'Products',global:true,visitorKey:request.headers.get('cookie')?.match(/vouch_visitor=([a-f0-9-]{36})/)?.[1]})]);
 const internal=local.status==='fulfilled'?local.value:[],remote=catalog.status==='fulfilled'?catalog.value:{products:[],partial:true};
 const registry=await taxonomy.catch(()=>null);
 const external=(remote.products||[]).map(p=>registry?{...p,...categoryFields(resolveCategory(registry,p))}:p);
 const rows=mergeSearchResults(internal,external,q).filter(p=>p.relevance>=40&&(source!=='catalog'||p.vouchStatus==='new'||p.catalogMatch));
 const products=rows.slice(offset,offset+limit);let personalPartial=false;
 try{const me=await accounts(new Request(new URL('/api/account/me',url),{headers:request.headers}));if(!me.ok)throw Error();const opinions=(await me.json()).profile?.opinions||[];for(const p of products){p.evidence.personalFit=personalFit({...p,tags:p.tags||[]},opinions,internal);p.fit=p.evidence.personalFit}}catch{personalPartial=true}
 return json({products,total:rows.length,hasMore:offset+limit<rows.length,partial:personalPartial||local.status==='rejected'||!!remote.partial||!!remote.live?.limited||(source!=='vouch'&&q.length>=3&&search.config?.live===false)});
}
