import {readJson} from '../request-json.mjs';
import {inCategory} from './resolver.mjs';
import {validGtin} from './normalize.mjs';
const fail=(message,status)=>Object.assign(Error(message),{status});
export async function catalogApi(request,search,options={}){
 const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/api/catalog/'))return null;const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const config=search.config||{live:false,linkPaste:false,whereToBuy:false,barcode:false,photo:false};
 try{
 if(path==='/api/catalog/config'&&request.method==='GET')return json(config);
 const feature=path==='/api/catalog/lookup'?'linkPaste':path.startsWith('/api/catalog/items/')?'whereToBuy':path.startsWith('/api/catalog/barcode/')?'barcode':path==='/api/catalog/image-search'?'photo':null;
 if(!feature||!config[feature])return json({error:'This lookup option is unavailable.'},404);
 if(request.method==='POST'){if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw fail('Request origin not allowed.',403);if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw fail('Send JSON data.',415);}
 if(feature==='linkPaste'&&request.method==='POST'){const body=await readJson(request);const product=await search.lookupUrl(body.url,options);return product?json({product}):json({error:"We couldn't read that link. Try the product name."},404);}
 if(feature==='whereToBuy'&&request.method==='GET'){const id=decodeURIComponent(path.slice('/api/catalog/items/'.length)),detail=await search.detail(id,options);return detail&&inCategory(detail.product,options.category)?json(detail):json({error:'Product unavailable.'},404);}
 if(feature==='barcode'&&request.method==='GET'){const code=path.slice('/api/catalog/barcode/'.length);if(!validGtin(code))throw fail('Enter a valid barcode number.',422);const result=await search.lookupBarcode(code,options);return result?json(result):json({error:"We couldn't find that barcode. Try the product name."},404);}
 if(feature==='photo'&&request.method==='POST'){const body=await readJson(request,2100000),image=body.image;if(!image||image.content_type!=='image/jpeg'||typeof image.data!=='string'||image.data.length>2000000||! /^[A-Za-z0-9+/]+={0,2}$/.test(image.data)||!image.data.startsWith('/9j/'))throw fail('Choose a JPEG product photo under 2 MB.',422);return json(await search.imageSearch(image,options));}
 return json({error:'Method not allowed.'},405);
 }catch(e){return json({error:e.status?e.message:'Product lookup is unavailable. Try the product name.'},e.status||503);}
}
