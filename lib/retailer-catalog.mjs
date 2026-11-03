// Parse public listing data only. Never evaluate retailer JavaScript.
export function jsonAt(text,start){
  if(!['{','['].includes(text[start]))throw Error('Missing JSON container');
  let depth=0,string=false,escape=false;
  for(let i=start;i<text.length;i++){
    const c=text[i];
    if(string){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')string=false;}
    else if(c==='"')string=true;
    else if(c==='{'||c==='[')depth++;
    else if((c==='}'||c===']')&&--depth===0)return JSON.parse(text.slice(start,i+1));
  }
  throw Error('Incomplete listing JSON');
}
function assigned(html,key){const i=html.indexOf(key);if(i<0)throw Error('Listing format changed: '+key);return jsonAt(html,html.indexOf('{',i+key.length));}
function visit(value,fn){if(!value||typeof value!=='object')return;fn(value);for(const child of Object.values(value))visit(child,fn);}
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const attr=(text,name)=>decode(text.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1]||'');
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function listingKey(p){const b=norm(p.brand),n=norm(p.name);return b+'|'+(n.startsWith(b+' ')?n.slice(b.length+1):n)+'|'+(p.catalogMarket||'unspecified');}
export function cleanListing(p,source){
  const name=decode(p.name).trim(),brand=decode(p.brand).trim();
  if(!name||!brand||!p.id||name.length>300||!/(?:sun|\bspf\s*\d|\buv\b)/i.test(name))return null;
  if(/\b(bundle|duo|trio|set|gift|kit|subscription|pack|multipack|after.?sun|self.?tan\w*|supplement|patch)\b|\d\s*\+\s*\d|\d\s*(?:pcs|pieces|count)\b|\d+\s*(?:ml|g|oz)\s*[x×]\s*[2-9]\b|\b[2-9]\s*[x×]\s*\d+\s*(?:ml|g|oz)/i.test(name))return null;
  let url;try{url=new URL(p.url,source.origin);if(url.protocol!=='https:'||url.origin!==source.origin)return null;}catch{return null;}
  let image=null;try{const u=new URL(p.image);if(u.protocol==='https:'&&source.imageHosts.includes(u.hostname))image=u.href;}catch{}
  return {id:`catalog-${source.id}-${p.id}`,brand,name:name.slice(0,200),image,url:url.href,source:source.brand,sourceId:source.id,spf:name.match(/\bSPF\s*\d+\+?(?:\s*PA\+{1,4})?/i)?.[0]||'',onBoardId:null,catalogMarket:source.market,importedAt:source.importedAt,...(p.listingType?{listingType:p.listingType}:{})};
}
export function parseRetailer(html,source,brands=[]){
  const rows=[];let pages=1;
  if(source.kind==='ulta'){
    const state=assigned(html,'window.__APOLLO_STATE__ = ');
    visit(state,o=>{if(o.productId&&o.productName&&o.brandName)rows.push({id:o.productId,name:o.productName,brand:o.brandName,url:o.action?.url,image:o.image?.imageUrl});if(o.resultCount&&o.pageSize)pages=Math.max(pages,Math.ceil(o.resultCount/o.pageSize));});
  }else if(source.kind==='yesstyle'){
    const flight=[...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)].map(m=>{try{return JSON.parse(m[1])[1]||''}catch{return ''}}).join('');
    const i=flight.indexOf('"products":[');if(i<0)throw Error('Missing YesStyle listings');
    const products=jsonAt(flight,flight.indexOf('[',i));
    for(const {product:p} of products)if(p)rows.push({id:p.productId,name:p.name,brand:p.brandName,url:p.url,image:p.images?.m});
    const count=Number(flight.match(/"totalCount":(\d+)/)?.[1]);if(!count||!products.length)throw Error('Missing YesStyle count');pages=Math.ceil(count/products.length);
  }else if(source.kind==='care'){
    const {collection}=assigned(html,'window.category_data = ');if(!Array.isArray(collection?.products))throw Error('Missing Care to Beauty listings');
    // Configurable parent cards mix SPF, tint and formula options; omit these
    // rather than assigning a shared parent photo to distinct formulations.
    for(const p of collection.products)if(p.product_type!=='configurable')rows.push({id:p.id,name:p.name,brand:p.manufacturer_name,url:p.url,image:p.image});
    pages=Number(collection.pages)||1;
  }else if(source.kind==='dermstore'){
    const sorted=[...brands].sort((a,b)=>b.length-a.length);
    for(const m of html.matchAll(/<product-card-wrapper\b[\s\S]*?<\/product-card-wrapper>/g)){
      const card=m[0],name=attr(card.match(/<a\b[^>]*data-title="[^"]*"[^>]*>/)?.[0]||'','data-title');
      const brand=sorted.find(b=>norm(name).startsWith(norm(b)+' '));if(!brand)continue;
      rows.push({id:attr(card,'data-quicklook'),name,brand,url:attr(card,'data-quicklook-url'),image:attr(card.match(/<img\b[^>]+>/)?.[0]||'','src')});
    }
    pages=Number(html.match(/aria-label="Page \d+ of (\d+)"/)?.[1])||1;
  }else throw Error('Unknown retailer format');
  return {products:[...new Map(rows.map(p=>cleanListing(p,source)).filter(Boolean).map(p=>[p.id,p])).values()],pages};
}
