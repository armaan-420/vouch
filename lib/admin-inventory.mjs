import {initialTagVotes,productTagView} from './product-tag-votes.mjs';
import {fresh,grouped,voteCounts,voteScore} from './vouch-api.mjs';
import {canonicalProductId} from './product-tags.mjs';
import {identity} from './catalog/normalize.mjs';
import {collectionStatus} from './experiment-schedule.mjs';

// Organizer-only aggregate. Browser keys are used for deduplication in memory,
// and are never included in the returned inventory or experiment summaries.
export async function adminInventory({store,registry,tags}){
 const tagVotes=await (await store.scope('product-tag-votes',initialTagVotes)).read();
 const products=new Map(),experiments=[],catalog=new Map([...Object.values(registry.skus),...Object.values(registry.experiments).flatMap(e=>e.products)].map(p=>[p.id,p]));
 const add=(product,category)=>{const id=canonicalProductId(product);if(!products.has(id))products.set(id,{...identity(product),id,category:tags.products[id]?.category||category||product.category||'Products',tagIds:tags.products[id]?.tagIds||[],sources:new Map(),latest:new Map()});const row=products.get(id);if(row.category==='Products'&&category&&!tags.products[id]?.category)row.category=category;return row;};
 for(const p of Object.values(registry.skus))add(p,p.category);
 const snapshots=await Promise.all(Object.values(registry.experiments).map(async e=>({e,d:e.id==='sunscreen'?await store.read():await(await store.scope('experiment:'+e.id,fresh)).read()})));
 for(const {e,d} of snapshots){
  const draft=e.status==='draft',participants=new Set();let total=0;
  const historical={...d,nominations:[...(d.nominations||[]),...(d.nominationHistory||[])]};
  const communityProducts=grouped(historical).filter(g=>g.reviewed).map(g=>({...g.product,id:'community-'+g.key,skuId:g.product?.skuId||g.product?.onBoardId||g.product?.id||e.id+':community-'+g.key,name:g.product?.name||g.name,brand:g.product?.brand||null}));
  const metadata=new Map([...Object.values(e.archivedProducts||{}),...e.products,...communityProducts].map(p=>[p.id,p]));
  if(!draft)for(const p of e.products)add(p,e.category);
  if(!draft)for(const [votesKey,timeKey]of [['baseVotes','baseVoteTimes'],['communityVotes','communityVoteTimes']])for(const [sourceId,votes]of Object.entries(d[votesKey]||{})){
   const raw=metadata.get(sourceId)||catalog.get(sourceId)||{id:sourceId.startsWith('community-')?e.id+':'+sourceId:sourceId,name:'Archived product ('+sourceId+')',brand:null};
   const p=add({...raw,id:raw.skuId||raw.id,onBoardId:undefined,skuId:undefined},e.category);
   const source={id:e.id,title:e.title,category:e.category,counts:voteCounts(votes),score:voteScore(votes),sourceProductId:sourceId};
   const previousSource=p.sources.get(e.id);if(previousSource){for(const k of ['yes','maybe','pass','total'])source.counts[k]+=previousSource.counts[k];}p.sources.set(e.id,source);
   for(const [browser,value]of Object.entries(votes)){if(!['yes','brand','no','skip'].includes(value))continue;const at=d[timeKey]?.[sourceId]?.[browser]||'1970-01-01T00:00:00.000Z',prior=p.latest.get(browser);if(!prior||at>=prior.at)p.latest.set(browser,{value,at});if(value!=='skip'){participants.add(browser);total++;}}
  }
  experiments.push({id:e.id,title:e.title,category:e.category,status:draft?'draft':collectionStatus(e),productCount:e.products.length,votes:total,participants:participants.size,startsAt:e.startsAt||null,endsAt:e.endsAt||null,createdAt:e.createdAt||null,includeInOverall:!!e.includeInOverall,origin:e.origin||null});
 }
 return {experiments,products:[...products.values()].map(p=>{const {latest,sources,...product}=p,votes=Object.fromEntries([...latest].map(([k,v])=>[k,v.value]));return {...product,communityTags:productTagView({productId:product.id,category:product.category,taxonomy:tags,votes:tagVotes}).tags.filter(t=>t.count>0),voteCounts:voteCounts(votes),score:voteScore(votes),experiments:[...sources.values()].filter(e=>e.counts.total),lastVoteAt:[...latest.values()].filter(v=>v.value!=='skip').map(v=>v.at).sort().at(-1)||null};}).sort((a,b)=>b.voteCounts.total-a.voteCounts.total||a.name.localeCompare(b.name))};
}
