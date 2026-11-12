import {identity,publicHttps} from './catalog/normalize.mjs';
import {brandKey} from './brand-products.mjs';
import {fresh,community,voteCounts,voteScore} from './vouch-api.mjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export const publicExperiment=e=>e.status!=='draft'&&!e.disabled;
export const photoUrl=value=>publicHttps(value)||(typeof value==='string'&&/^\/assets\/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp)$/.test(value)?value:null);
export async function productsWithPhotos(products,search){return Promise.all(products.map(async p=>{if(p.photoOverride)return {...p,image:photoUrl(p.photoOverride),images:p.photoOverrides||[p.photoOverride]};if(!p.provider)return p;try{const found=await search.find(p.id);return {...p,image:found?.image||null,images:found?.images||[]};}catch{return {...p,image:null};}}));}
export async function experimentProducts(store,e,search){
 const data=await(e.id==='sunscreen'?store:await store.scope('experiment:'+e.id,fresh)).read();
 const hydrate=async products=>search.hydrate?search.hydrate(products):productsWithPhotos(products,search);
 const products=await hydrate(e.products);
 return {id:e.id,revision:e.productRevision||0,disabled:!!e.disabled,products:products.map(p=>({...p,voteCounts:voteCounts(data.baseVotes?.[p.id]),score:voteScore(data.baseVotes?.[p.id])})),community:await hydrate(community(data,'',e.products).map(({myVote,...p})=>p))};
}
export function changeProducts(e,data,product){
 if(e.deleting)throw fail('Deletion is pending. Retry Delete to finish cleanup.',409);
 if(e.status==='draft')throw fail('Edit this lineup from Suggestions.',409);
 if(data.revision!==(e.productRevision||0))throw fail('This lineup changed. Reload it before saving.',409);
 if(data.action==='add'){
  if(!product||!product.id||typeof product.brand!=='string'||!product.brand.trim()||typeof product.name!=='string'||!product.name.trim())throw fail('Choose a product with a confirmed brand and name.');
  if(e.products.length>=32)throw fail('This experiment supports up to 32 products.');
  if(e.products.some(p=>p.id===product.id||brandKey(p.brand)===brandKey(product.brand)))throw fail('This product or brand is already in the lineup.');
  e.products.push(identity(product));
 }else if(data.action==='remove'){
  const p=e.products.find(p=>p.id===data.productId);if(!p)throw fail('Product not found.',404);
  if(e.products.length===1)throw fail('Keep at least one product, or disable the experiment.');
  e.archivedProducts??={};e.archivedProducts[p.id]=p;e.products=e.products.filter(item=>item.id!==p.id);
 }else if(data.action==='reorder'){
  if(!Array.isArray(data.productIds)||data.productIds.length!==e.products.length||new Set(data.productIds).size!==e.products.length||data.productIds.some(id=>!e.products.some(p=>p.id===id)))throw fail('Include each current product exactly once.');
  e.products=data.productIds.map(id=>e.products.find(p=>p.id===id));
 }else if(data.action==='photo'){
  const p=e.products.find(p=>p.id===data.productId);if(!p)throw fail('Product not found.',404);
  const urls=data.urls===undefined?[data.url]:data.urls;
  if(!Array.isArray(urls)||urls.length<1||urls.length>4||urls.some(url=>!publicHttps(url)))throw fail('Add one to four public HTTPS photo URLs.');
  const photos=[...new Set(urls.map(publicHttps))];
  p.photoOverride=photos[0];p.photoOverrides=photos;if(!p.provider){p.image=photos[0];p.images=photos;}
 }else throw fail('Unknown product action.');
 e.productRevision=(e.productRevision||0)+1;
 return e;
}
