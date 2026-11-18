import {initialCategoryRegistry,resolveCategory} from '../../category-registry.mjs';
import {isBundle,publicHttps,variantLabel,productName,tokens} from '../normalize.mjs';
import {globalBundle} from '../../search-matching.mjs';
import {providerRequest} from './request.mjs';
// Verified with /v1/categories/search, November 6, 2026. Slugs avoid a
// taxonomy request on every keystroke and distinguish human from pet shampoo.
const seed=initialCategoryRegistry();
export const channel3CategorySlugs=new Map(Object.values(seed.categories)
 .filter(c=>c.providerSlugs.length)
 .flatMap(c=>[c.label,...c.aliases].map(label=>[tokens(label).join(' '),c.providerSlugs])));
function searchScope(query,{category,categoryId,categoryRegistry=seed}){
 const label=tokens(category).join(' '),resolved=resolveCategory(categoryRegistry,{category,categoryId});
 const ids=resolved.matched?categoryRegistry.categories[resolved.id].providerSlugs:[];
 if(ids.length)return {...(query?{query}:{}),filters:{category_ids:ids}};
 // Custom prototype categories still carry context; never guess a taxonomy ID.
 const scoped=label&&label!=='products'&&!tokens(label).every(word=>tokens(query).includes(word));
 return {query:scoped?[query,category.trim()].filter(Boolean).join(' '):query};
}
export function mapChannel3(p,now=Date.now(),global=false){
 if(!p?.id||!p.title||(global?globalBundle(p):isBundle(p)))return null;
 const brand=p.brands?.[0]?.name||null,images=(p.images||[]).map(i=>publicHttps(i.url)).filter(Boolean).slice(0,4),sellers=[...new Set((p.offers||[]).map(o=>o.domain).filter(Boolean))];
 return {id:'c3-'+p.id,provider:'channel3',providerId:String(p.id),brand,name:productName(p.title,brand),variantLabel:[variantLabel(p.title),...(p.variants?.selected||[]).filter(v=>!/color/i.test(v.name)).map(v=>v.label)].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')||null,category:p.category?.title||null,categorySlug:p.category?.slug||null,image:images[0]||null,images,sourceLabel:sellers.length?sellers[0]+(sellers.length>1?' + '+(sellers.length-1)+' more':''):'Channel3',retailerCount:sellers.length,url:null,fetchedAt:now};
}
export function createChannel3({apiKey,fetcher=fetch,now=Date.now,timeouts={}}={}){
 let nextDetailAt=0;
 async function call(path,body,kind='search',detail=false,global=false){if(kind==='detail'){const delay=Math.max(0,nextDetailAt-Date.now());nextDetailAt=Math.max(nextDetailAt,Date.now())+210;if(delay)await new Promise(resolve=>setTimeout(resolve,delay));}if(!apiKey)return {status:'auth_error',products:[]};const r=await providerRequest(fetcher,'https://api.trychannel3.com'+path,{method:body?'POST':'GET',headers:{'x-api-key':apiKey,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})},timeouts[kind]??({search:2500,lookup:12000,detail:4000,image:8000}[kind]));
 const raw=r.data?.products||[r.data?.product||r.data].filter(p=>p?.id),products=raw.map(p=>mapChannel3(p,now(),global)).filter(Boolean);
 if(kind==='lookup'&&!products.length)console.warn('Product URL lookup returned no usable product',JSON.stringify({status:r.status,httpStatus:r.httpStatus,received:raw.length,missingIdentity:raw.some(p=>!p.id||!p.title),excludedBundle:raw.some(p=>isBundle(p))}));
 const offers=detail?(raw[0]?.offers||[]).map(o=>({retailer:o.domain,url:publicHttps(o.url),price:Number(o.price?.price??o.price?.amount),currency:o.price?.currency||'USD'})).filter(o=>o.url&&Number.isFinite(o.price)):undefined;
 return {status:r.status,httpStatus:r.httpStatus,latency:r.latency,products,...(detail?{offers}: {})};}
 return {name:'channel3',search:(query,{limit=20,global=false,...scope}={})=>call('/v1/search',{...(global?{query}:searchScope(query,scope)),limit,config:{country:'US'}},'search',false,global),get:id=>call('/v1/products/'+encodeURIComponent(id),null,'detail',false,true),detail:id=>call('/v1/products/'+encodeURIComponent(id),null,'detail',true,true),lookupUrl:(url,{global=false}={})=>call('/v1/lookup',{url},'lookup',false,global),imageSearch:(image,scope={})=>call('/v1/search',{...searchScope('',scope),base64_image:image.data,limit:20,config:{country:'US'}},'image')};
}
