import {brandKey,tokens,identity,publicHttps} from '../catalog/normalize.mjs';
import {oneProductPerBrand} from '../brand-products.mjs';
export function chooseMatch(pick,products){
 const words=tokens(pick.productName).filter(w=>!tokens(pick.brand).includes(w));
 return products.filter(p=>brandKey(p.brand)===brandKey(pick.brand)&&words.length&&words.filter(w=>tokens(p.name).includes(w)).length/words.length>=.6).sort((a,b)=>Number(!!b.image)-Number(!!a.image))[0]||null;
}
export function matchState(matches){const products=oneProductPerBrand(matches.map(m=>m.product));return products.length<4?'rejected':matches.filter(m=>m.hasPhoto).length>=8?'ready':'needs_attention';}
export async function matchPick(pick,index,{search,category,jobId}){
 const results=await search.search(pick.brand+' '+pick.productName,{category,visitorKey:'suggestion:'+jobId});
 const p=chooseMatch(pick,results.products||[]);
 const manufacturer=pick.sourceUrls.find(url=>{try{const host=new URL(url).hostname.replace(/^www\./,'').split('.')[0];return publicHttps(url)&&host.length>=3&&brandKey(pick.brand).includes(brandKey(host));}catch{return false;}})||null;
 return {product:p?identity(p):{id:'sku-auto-'+jobId.slice(0,8)+'-'+index,brand:pick.brand,name:pick.productName,formula:pick.variantHint||'',image:null,url:manufacturer},hasPhoto:!!p?.image,needsPhoto:!p?.image,matched:!!p};
}
