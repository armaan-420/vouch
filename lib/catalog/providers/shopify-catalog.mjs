import {isBundle,publicHttps,variantLabel,productName,brandKey} from '../normalize.mjs';
import {providerRequest} from './request.mjs';
export const DEVELOPMENT_PROFILE='https://shopify.dev/ucp/agent-profiles/examples/2026-08-25/valid-with-capabilities.json';
export function mapShopify(p,now=Date.now()){
 if(!p?.id||!p.title||isBundle(p))return null;
 const sellers=[...new Set((p.variants||[]).map(v=>v.seller?.name).filter(Boolean))],attrs=p.metadata?.attributes||[],explicit=Array.isArray(attrs)?attrs.find(a=>/^brand$/i.test(a.name))?.values?.[0]:attrs.brand;
 const seller=sellers.length===1?sellers[0]:null,brand=typeof explicit==='string'?explicit:seller&&brandKey(p.title).startsWith(brandKey(seller))?seller:null;
 const images=(p.media||[]).filter(m=>m.type==='image').map(m=>publicHttps(m.url)).filter(Boolean).slice(0,4);
 return {id:'shop-'+encodeURIComponent(p.id),provider:'shopify',providerId:p.id,brand,name:productName(p.title,brand),variantLabel:variantLabel(p.title),category:p.categories?.find(c=>c.taxonomy==='merchant')?.value?.split(' > ').at(-1)||null,image:images[0]||null,images,sourceLabel:sellers.length?'Sold by '+sellers[0]+(sellers.length>1?' + '+(sellers.length-1)+' more':''):'Shopify Catalog',retailerCount:sellers.length,url:publicHttps(p.url),fetchedAt:now,barcodes:[...new Set((p.variants||[]).flatMap(v=>[v.barcode,...(v.barcodes||[])]).filter(v=>typeof v==='string'))]};
}
export function createShopifyCatalog({clientId,clientSecret,mcpUrl='https://catalog.shopify.com/api/ucp/mcp',catalogId,profileUrl=DEVELOPMENT_PROFILE,fetcher=fetch,now=Date.now,timeouts={}}={}){
 let token=null,expiresAt=0,tokenPromise;
 async function auth(){if(!clientId&&!clientSecret)return null;if(!clientId||!clientSecret)throw Object.assign(Error('Incomplete catalog credentials'),{providerStatus:'auth_error'});if(token&&expiresAt>now()+60000)return token;
 tokenPromise??=(async()=>{const r=await providerRequest(fetcher,'https://api.shopify.com/auth/access_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:clientId,client_secret:clientSecret,grant_type:'client_credentials'})},4000);if(r.status!=='ok'||!r.data?.access_token)throw Object.assign(Error('Authentication unavailable'),{providerStatus:r.status==='ok'?'auth_error':r.status});token=r.data.access_token;try{const encoded=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');expiresAt=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)))).exp*1000;}catch{expiresAt=now()+3600000;}return token;})().finally(()=>{tokenPromise=null;});return tokenPromise;
 }
 async function call(name,catalog,kind='search',detail=false){let bearer;try{bearer=await auth();}catch(e){return {status:e.providerStatus||'auth_error',products:[]};}
 const r=await providerRequest(fetcher,mcpUrl,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{meta:{'ucp-agent':{profile:profileUrl}},catalog}}})},timeouts[kind]??({search:2500,lookup:4000,detail:4000,image:8000}[kind]));
 const content=r.data?.result?.structuredContent,raw=content?.products||[content?.product].filter(Boolean);const offers=detail?raw.flatMap(p=>(p.variants||[]).map(v=>({retailer:v.seller?.name,url:publicHttps(v.url||p.url),price:Number(v.price?.amount)/100,currency:v.price?.currency||'USD'}))).filter(o=>o.url&&Number.isFinite(o.price)):undefined;
 return {status:r.status==='ok'&&(r.data?.error||r.data?.result?.isError||!content)?'error':r.status,httpStatus:r.httpStatus,latency:r.latency,products:raw.map(p=>mapShopify(p,now())).filter(Boolean),...(detail?{offers}: {})};}
 const lookup=ids=>call('lookup_catalog',{ids:ids.slice(0,50)},'lookup');
 return {name:'shopify',search:(query,{limit=20}={})=>call('search_catalog',{query,...(catalogId?{catalog_id:catalogId}:{}),context:{address_country:'US'},pagination:{limit}}),get:id=>lookup([id]),lookupBatch:lookup,lookupUrl:url=>call('lookup_catalog',{ids:[url]},'lookup'),detail:id=>call('get_product',{id},'detail',true),imageSearch:image=>call('search_catalog',{...(catalogId?{catalog_id:catalogId}:{}),like:[{image:{content_type:image.content_type,data:image.data}}],context:{address_country:'US'},pagination:{limit:20}},'image')};
}
