import {isBundle,publicHttps,variantLabel,productName} from '../normalize.mjs';
import {providerRequest} from './request.mjs';
export function mapChannel3(p,now=Date.now()){
 if(!p?.id||!p.title||isBundle(p))return null;
 const brand=p.brands?.[0]?.name||null,images=(p.images||[]).map(i=>publicHttps(i.url)).filter(Boolean).slice(0,4),sellers=[...new Set((p.offers||[]).map(o=>o.domain).filter(Boolean))];
 return {id:'c3-'+p.id,provider:'channel3',providerId:String(p.id),brand,name:productName(p.title,brand),variantLabel:variantLabel(p.title),category:p.category?.title||null,image:images[0]||null,images,sourceLabel:sellers.length?sellers[0]+(sellers.length>1?' + '+(sellers.length-1)+' more':''):'Channel3',retailerCount:sellers.length,url:null,fetchedAt:now};
}
export function createChannel3({apiKey,fetcher=fetch,now=Date.now,timeouts={}}={}){
 async function call(path,body,kind='search',detail=false){if(!apiKey)return {status:'auth_error',products:[]};const r=await providerRequest(fetcher,'https://api.trychannel3.com'+path,{method:body?'POST':'GET',headers:{'x-api-key':apiKey,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})},timeouts[kind]??({search:2500,lookup:4000,detail:4000,image:8000}[kind]));
 const raw=r.data?.products||[r.data?.product||r.data].filter(p=>p?.id),products=raw.map(p=>mapChannel3(p,now())).filter(Boolean);
 const offers=detail?(raw[0]?.offers||[]).map(o=>({retailer:o.domain,url:publicHttps(o.url),price:Number(o.price?.price??o.price?.amount),currency:o.price?.currency||'USD'})).filter(o=>o.url&&Number.isFinite(o.price)):undefined;
 return {status:r.status,httpStatus:r.httpStatus,latency:r.latency,products,...(detail?{offers}: {})};}
 return {name:'channel3',search:(query,{limit=20}={})=>call('/v1/search',{query,limit,config:{country:'US'}}),get:id=>call('/v1/products/'+encodeURIComponent(id),null,'detail'),detail:id=>call('/v1/products/'+encodeURIComponent(id),null,'detail',true),lookupUrl:url=>call('/v1/lookup',{url},'lookup'),imageSearch:image=>call('/v1/search',{base64_image:image.data,limit:20,config:{country:'US'}},'image')};
}
