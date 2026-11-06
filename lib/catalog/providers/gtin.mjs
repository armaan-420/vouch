import {validGtin} from '../normalize.mjs';
import {providerRequest} from './request.mjs';
import {memoryCache,TTL} from '../cache.mjs';
export function createGtinLookup({goUpcKey,upcitemdbKey,cache=memoryCache(),fetcher=fetch,allow=async()=>true}={}){
 return {async lookup(code){if(!validGtin(code))return null;const key='gtin:'+code,hit=await cache.get(key);if(hit)return hit.identity;const candidates=[
 {url:'https://world.openbeautyfacts.org/api/v2/product/'+code+'.json',open:true},
 {url:'https://world.openfoodfacts.org/api/v2/product/'+code+'.json',open:true},
 ...(goUpcKey?[{url:'https://go-upc.com/api/v1/code/'+code,headers:{Authorization:'Bearer '+goUpcKey},go:true}]:[{url:upcitemdbKey?'https://api.upcitemdb.com/prod/v1/lookup?upc='+code:'https://api.upcitemdb.com/prod/trial/lookup?upc='+code,headers:upcitemdbKey?{user_key:upcitemdbKey,key_type:'3scale'}:{}}])];
 for(const c of candidates){if(!await allow())return null;const r=await providerRequest(fetcher,c.url,{headers:{Accept:'application/json',...(c.open?{'User-Agent':'VouchSunscreenCatalog/2.0 (v4ch.app)'}:{}),...c.headers}},4000);if(r.status!=='ok')continue;const p=c.open?r.data?.status===1?r.data.product:null:c.go?r.data?.product:r.data?.items?.[0];const name=p?.product_name||p?.product_name_en||p?.name||p?.title;const brand=p?.brands||p?.brand||null;if(typeof name!=='string'||!name.trim())continue;const identity={gtin:code,brand:typeof brand==='string'?brand.trim().slice(0,120):null,name:name.trim().slice(0,200)};await cache.set(key,{identity},TTL.gtinHit);return identity;}
 await cache.set(key,{identity:null},TTL.gtinMiss);return null;}};
}
