import {brandKey,tokens,identity,publicHttps} from '../catalog/normalize.mjs';
import {oneProductPerBrand} from '../brand-products.mjs';
export function chooseMatch(pick,products){
 const words=tokens(pick.productName).filter(w=>!tokens(pick.brand).includes(w));
 return products.filter(p=>brandKey(p.brand)===brandKey(pick.brand)&&words.length&&words.filter(w=>tokens(p.name).includes(w)).length/words.length>=.6).sort((a,b)=>Number(!!b.image)-Number(!!a.image))[0]||null;
}
export function matchState(matches){const products=oneProductPerBrand(matches.map(m=>m.product));return products.length<4?'rejected':matches.length>=4&&matches.every(m=>m.hasPhoto)?'ready':'needs_attention';}
export async function matchPick(pick,index,{search,category,jobId}){
 const results=await search.search(pick.brand+' '+pick.productName,{category,visitorKey:'suggestion:'+jobId});
 let p=chooseMatch(pick,results.products||[]);
 const manufacturer=pick.sourceUrls.find(url=>{try{const host=new URL(url).hostname.replace(/^www\./,'').split('.')[0];return publicHttps(url)&&host.length>=3&&brandKey(pick.brand).includes(brandKey(host));}catch{return false;}})||null;
 if(!p?.image){const found=await findProductPhoto({brand:pick.brand,name:pick.productName,url:manufacturer},{search,category,visitorKey:'suggestion:'+jobId});if(found.product)p=found.product;}
 return {product:p?identity(p):{id:'sku-auto-'+jobId.slice(0,8)+'-'+index,brand:pick.brand,name:pick.productName,formula:pick.variantHint||'',image:null,url:manufacturer},hasPhoto:!!p?.image,needsPhoto:!p?.image,matched:!!p};
}
// Photo repair can cross catalog categories, but never relax brand/model identity.
export function choosePhotoMatch(product,candidates){
 const words=tokens(product.name||product.productName).filter(w=>!tokens(product.brand).includes(w));
 return candidates.filter(p=>publicHttps(p.image)&&brandKey(p.brand)===brandKey(product.brand)&&words.length&&words.every(w=>tokens(p.name).includes(w)))
  .sort((a,b)=>tokens(a.name).length-tokens(b.name).length)[0]||null;
}
export async function findProductPhoto(product,{search,category,visitorKey}){
 const pick={brand:product.brand,name:product.name},issues=[];let count=0;
 for(const scope of [...new Set([category,'Products'])]){
  try{const found=await search.search(product.brand+' '+product.name,{category:scope,visitorKey});count+=(found.products||[]).length;
   const match=choosePhotoMatch(pick,found.products||[]);if(match)return {product:match,method:scope==='Products'?'broader_catalog':'category_catalog'};
   if(found.live?.limited||found.partial||found.live?.providers&&Object.values(found.live.providers).some(s=>!['ok','not_attempted'].includes(s)))issues.push('unavailable');
  }catch{issues.push('unavailable');}
 }
 if(product.url&&publicHttps(product.url)&&search.lookupUrl){
  try{const match=choosePhotoMatch(pick,[await search.lookupUrl(product.url,{category:'Products',visitorKey})].filter(Boolean));if(match)return {product:match,method:'product_url'};}catch{issues.push('unavailable');}
 }
 return {product:null,reason:issues.length?'catalog_unavailable':count?'no_matching_photo':'no_results'};
}
