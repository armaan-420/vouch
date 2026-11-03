import path from 'node:path';

export const CATALOG_SOURCES = [
  {id:'boj',brand:'Beauty of Joseon',origin:'https://beautyofjoseon.com'},
  {id:'skin1004',brand:'SKIN1004',origin:'https://skin1004.com'},
  {id:'roundlab',brand:'Round Lab',origin:'https://roundlab.com'},
  {id:'mixsoon',brand:'Mixsoon',origin:'https://mixsoon.us'},
  {id:'innisfree',brand:'Innisfree',origin:'https://us.innisfree.com'},
  {id:'supergoop',brand:'Supergoop!',origin:'https://supergoop.com'},
  {id:'eltamd',brand:'EltaMD',origin:'https://eltamd.com'},
  {id:'medicube',brand:'Medicube',origin:'https://medicube.us'},
  {id:'isntree',brand:'Isntree',origin:'https://isntree-global.com'},
  {id:'haruharu',brand:'Haruharu Wonder',origin:'https://haruharuwonder.com'},
  {id:'krave',brand:'KraveBeauty',origin:'https://kravebeauty.com'},
  {id:'naturium',brand:'Naturium',origin:'https://naturium.com'},
  {id:'bondisands',brand:'Bondi Sands',origin:'https://bondisands.com.au'},
  {id:'ultraviolette',brand:'Ultra Violette',origin:'https://ultraviolette.com.au'},
  {id:'kokoro',brand:'Kokoro Japan',origin:'https://kokorojapanstore.com',path:'/collections/sunscreen/products.json',retailer:true,sunscreenCollection:true},
  {id:'obf',brand:'Open Beauty Facts',origin:'https://world.openbeautyfacts.org',kind:'openbeautyfacts'},
];
const baseHandles = {
  'boj:relief-sun-rice-probiotics':'boj',
  'eltamd:uv-clear-broad-spectrum-spf-46':'eltamd',
  'skin1004:hyalu-cica-water-fit-sun-serum-uv':'skin1004',
  'supergoop:unseen-sunscreen-spf-50':'supergoop',
  'roundlab:birch-moisturizing-uv-sunscreen':'roundlab',
  'medicube:no-cast-just-glow-collagen-sunscreen':'medicube',
  'mixsoon:mixsoon-bean-sunscreen-50ml':'mixsoon',
  'innisfree:daily-uv-defense-sunscreen-spf-50':'innisfree',
};
const tokens = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
const isSunscreen = p => /sunscreen|sun screen|sun serum|sun cream|suncream|sun stick|sunstick|sun lotion|sun fluid|sun gel|sun milk|sun cushion|uv clear|uv defense|\bspf\s*\d/i.test(p.title);
const isBundle = p => /\b(bundle|duo|trio|set|gift|kit|subscription|pack)\b|\d\s*\+\s*\d/i.test(p.title);
export function cleanProduct(p,source){
  if(!p||!p.id||typeof p.title!=='string'||(!isSunscreen(p)&&!source.sunscreenCollection)||isBundle(p)||!/^[-a-z0-9]+$/i.test(p.handle||''))return null;
  const image=p.images?.map(i=>i.src).find(url=>typeof url==='string'&&url.startsWith('https://cdn.shopify.com/'))||null;
  const spf=p.title.match(/\bSPF\s*\d+\+?(?:\s*PA\+{1,4})?/i)?.[0]||'';
  return {id:`catalog-${source.id}-${p.id}`,brand:source.retailer?(p.vendor||source.brand):source.brand,name:p.title.trim().slice(0,200),image,url:`${source.origin}/products/${p.handle}`,source:source.brand,sourceId:source.id,spf,onBoardId:baseHandles[`${source.id}:${p.handle}`]||null};
}
export function cleanBeautyProduct(p){
  const name=String(p.product_name||p.product_name_en||'').trim();
  if(!/^\d{8,14}$/.test(p.code||'')||name.length<2||isBundle({title:name}))return null;
  const brand=String(p.brands||'').trim()||'Brand not listed';
  const image=typeof p.image_front_url==='string'&&p.image_front_url.startsWith('https://images.openbeautyfacts.org/')?p.image_front_url:null;
  return {id:'catalog-obf-'+p.code,brand,name:name.slice(0,200),image,url:'https://world.openbeautyfacts.org/product/'+p.code,source:'Open Beauty Facts',sourceId:'obf',spf:name.match(/\bSPF\s*\d+\+?/i)?.[0]||'',countries:p.countries||'',onBoardId:null};
}
async function fetchSource(source,fetcher,timeout){
  const items=[];
  // Follow every page in the source, rather than stopping after 750 products.
  for(let page=1;;page++){
    const beauty=source.kind==='openbeautyfacts';
    const url=beauty?source.origin+'/api/v2/search?categories_tags=en:sunscreens&page_size=100&page='+page+'&fields=code,product_name,product_name_en,brands,image_front_url,countries':source.origin+(source.path||'/products.json')+'?limit=250&page='+page;
    const response=await fetcher(url,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json','User-Agent':'VouchSunscreenCatalog/2.0 (v4ch.app)'}});
    if(!response.ok)throw Error(source.brand+' catalog unavailable (HTTP '+response.status+')');
    const data=await response.json();if(!Array.isArray(data.products))throw Error('Invalid product catalog');
    items.push(...data.products.map(p=>beauty?cleanBeautyProduct(p):cleanProduct(p,source)).filter(Boolean));
    if(beauty){const total=Number(data.count);if(!Number.isFinite(total))throw Error('Invalid catalog count');if(page*100>=total)break;if(!data.products.length)throw Error('Incomplete catalog');}
    else if(data.products.length<250)break;
  }
  if(!items.length)throw Error('Catalog returned no sunscreens');
  return {source,items};
}
async function settledMap(values,fn){let cursor=0;const results=new Array(values.length);await Promise.all(Array.from({length:Math.min(4,values.length)},async()=>{while(cursor<values.length){const i=cursor++;try{results[i]={status:'fulfilled',value:await fn(values[i])}}catch(reason){results[i]={status:'rejected',reason}}}}));return results}
/** @param {{directory?:string, storage?:{read:()=>Promise<any>,write:(data:any)=>Promise<void>}, initialCatalog?:any, fetcher?:typeof fetch, sources?:typeof CATALOG_SOURCES, ttl?:number, timeout?:number}} [options] */
export async function createProductSearch({directory='.',storage,initialCatalog,fetcher=fetch,sources=CATALOG_SOURCES,ttl=15*60*1000,timeout=5000}={}){
  const file=path.join(directory,'sunscreen-catalog.json');const repository=storage||{async read(){const fs=await import('node:fs/promises');return JSON.parse(await fs.readFile(file,'utf8'))},async write(data){const fs=await import('node:fs/promises');await fs.mkdir(directory,{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(data),{mode:0o600});await fs.rename(file+'.tmp',file)}};let cache=initialCatalog||{products:[],updatedAt:null,sources:[],failedSources:[]},refreshing,lastFailedAt=0;
  let needsSeed=false;
  try{
    const saved=await repository.read();
    if(Array.isArray(saved.products)){
      const products=new Map((initialCatalog?.products||[]).map(p=>[p.id,p]));
      for(const p of saved.products){const seed=products.get(p.id);products.set(p.id,{...seed,...p,...(seed?.alternateSources?{alternateSources:[...new Map([...(seed.alternateSources||[]),...(p.alternateSources||[])].map(s=>[s.url,s])).values()]}:{})});}
      cache={...saved,sources:[...new Set([...(initialCatalog?.sources||[]),...(saved.sources||[])])],products:[...products.values()],retailerImportedAt:initialCatalog?.retailerImportedAt||saved.retailerImportedAt};
      needsSeed=cache.products.length!==saved.products.length||cache.retailerImportedAt!==saved.retailerImportedAt;
    }
  }catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;needsSeed=!!initialCatalog?.products?.length;}
  // Persist new release catalog records into the dedicated catalog row even
  // when the previous live cache is still fresh. Never touch experiment rows.
  if(needsSeed)await repository.write(cache);
  async function refresh(){if(refreshing)return refreshing;refreshing=(async()=>{
    const results=await settledMap(sources,source=>fetchSource(source,fetcher,timeout));
    for(let i=0;i<results.length;i++)if(results[i].status==='rejected')console.warn('Catalog source unavailable:',sources[i].brand,results[i].reason?.message);
    const successes=results.filter(r=>r.status==='fulfilled').map(r=>r.value);if(!successes.length){lastFailedAt=Date.now();if(cache.products.length)return {...cache,stale:true};throw Error('Product search is temporarily unavailable. You can still submit a name.')}
    const failedSources=sources.filter((_,i)=>results[i].status==='rejected').map(s=>s.brand);
    const successfulIds=new Set(successes.map(s=>s.source.id));const retained=cache.products.filter(p=>!successfulIds.has(p.sourceId));
    cache={products:[...new Map([...successes.flatMap(s=>s.items),...retained].map(p=>[p.id,p])).values()],updatedAt:new Date().toISOString(),sources:[...new Set([...successes.map(s=>s.source.brand),...retained.map(p=>p.source).filter(Boolean)])],failedSources,...(cache.retailerImportedAt?{retailerImportedAt:cache.retailerImportedAt}:{})};
    await repository.write(cache);return cache;
  })().finally(()=>{refreshing=null});return refreshing}
  async function ready({waitUntil}={}){
    if(cache.products.length&&Date.now()-lastFailedAt<60000)return {...cache,stale:true};
    const expired=!cache.updatedAt||Date.now()-Date.parse(cache.updatedAt)>ttl;
    if(!cache.products.length)return refresh();
    if(expired){
      // Keep refresh alive with the request context after suggestions are returned.
      if(waitUntil){waitUntil(refresh().catch(error=>{lastFailedAt=Date.now();console.warn('Catalog refresh failed:',error.message)}));return {...cache,stale:true}}
      return refresh();
    }
    return cache;
  }
  return {
    refresh,
    async search(query,options){const data=await ready(options);const words=tokens(query);if(words.length===0)return {products:[],updatedAt:data.updatedAt};
      const matches=data.products.map(p=>{const haystack=tokens(p.brand+' '+p.name).join(' ');const compact=haystack.replaceAll(' ','');if(!words.every(w=>haystack.includes(w)||compact.includes(w)))return null;const brand=tokens(p.brand).join(' ');const exactBrand=words.join(' ')===brand;return {p,rank:(p.onBoardId?5:0)+(/sunscreen|sun cream|sun gel|sun milk|sun serum/i.test(p.name)?6:0)-(/lip balm|makeup|foundation/i.test(p.name)?10:0)-(/mini|deluxe|travel/i.test(p.name)?8:0)+(exactBrand?20:0)+(p.spf?3:0)+(tokens(p.name).join(' ').startsWith(words.join(' '))?10:0)}}).filter(Boolean).sort((a,b)=>b.rank-a.rank||a.p.name.localeCompare(b.p.name));
      return {products:matches.slice(0,20).map(m=>m.p),updatedAt:data.updatedAt,sourceCount:data.sources.length,catalogCount:data.products.length,partial:!!data.failedSources?.length,stale:!!data.stale};
    },
    async find(id){const existing=cache.products.find(p=>p.id===id);if(existing)return existing;await ready();return cache.products.find(p=>p.id===id)||null},
  };
}
