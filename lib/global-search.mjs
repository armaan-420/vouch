import {discoverySearch} from './discovery-search.mjs';
import {tokens,productName} from './catalog/normalize.mjs';
const key=p=>JSON.stringify([tokens(p.brand).join(' '),tokens(productName(p.name,p.brand)).join(' '),tokens(p.variantLabel).join(' ')]);
const relevance=(p,q)=>{const terms=tokens(q),name=tokens(p.brand+' '+p.name).join(' ');return name===terms.join(' ')?100:terms.length?Math.round(80*terms.filter(t=>name.includes(t)).length/terms.length):0;};
export function mergeSearchResults(internal,external,q){
 const rows=new Map(),identities=new Map();
 for(const p of internal){const row={...p,identity:{id:p.id,provider:p.provider||null,providerId:p.providerId||null},relevance:relevance(p,q),vouchStatus:p.voteCounts.total?'rated':'listed',evidence:{communityScore:p.score,ratingCount:p.voteCounts.total,tags:p.tags,personalFit:p.fit},action:{type:'view',href:p.href},discoveryHref:p.href};rows.set(key(p),row);if(p.providerId)identities.set(p.provider+':'+p.providerId,row);}
 for(const p of external){if(rows.has(key(p))||identities.has(p.provider+':'+p.providerId))continue;rows.set(key(p),{...p,identity:{id:p.id,provider:p.provider||null,providerId:p.providerId||null},relevance:relevance(p,q),vouchStatus:'external',evidence:{communityScore:null,ratingCount:0,tags:[],personalFit:null},action:{type:'nominate',category:p.category||null}});}
 return [...rows.values()].sort((a,b)=>b.relevance-a.relevance||Number(b.vouchStatus!=='external')-Number(a.vouchStatus!=='external')||a.name.localeCompare(b.name));
}
export async function globalSearch({store,accounts,request,search}){
 const url=new URL(request.url),q=(url.searchParams.get('q')||'').trim();
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(q.length>100)return json({error:'Keep your search under 100 characters.'},400);
 if(q.length<2)return json({products:[],partial:false});
 // Load public inventory without query constraints so identity resolution spans all categories.
 const inventoryResponse=await discoverySearch({store,accounts,request:new Request(new URL('/api/discover',url),{headers:request.headers}),all:true});
 if(!inventoryResponse.ok)return inventoryResponse;
 const internal=(await inventoryResponse.json()).products;
 let remote={products:[]},partial=false;
 try{remote=await search.search(q,{category:'Products',global:true,visitorKey:request.headers.get('cookie')?.match(/vouch_visitor=([a-f0-9-]{36})/)?.[1]});partial=!!(remote.partial||remote.live?.limited||search.config?.live===false);}catch{partial=true;}
 const merged=mergeSearchResults(internal,remote.products||[],q).filter(p=>p.vouchStatus==='external'||tokens(q).every(t=>tokens([p.brand,p.name,p.category,...(p.tags||[]).map(t=>t.label)].join(' ')).some(w=>w.includes(t))));
 return json({products:merged.slice(0,40),total:merged.length,partial});
}
