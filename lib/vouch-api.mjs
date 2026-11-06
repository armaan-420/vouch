import {identity} from './catalog/normalize.mjs';
import {oneProductPerBrand} from './brand-products.mjs';
import {readJson} from './request-json.mjs';
export const PRODUCT_IDS=new Set(['boj','eltamd','skin1004','supergoop','roundlab','medicube','mixsoon','innisfree']);
export const normalize=value=>String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
export const fresh=()=>({version:2,visitors:{},sessions:{},nominations:[],reviews:{},communityVotes:{},baseVotes:{}});
export function grouped(d){const groups=new Map();for(const n of d.nominations){const r=d.reviews[n.key];const key=r?.canonicalKey||n.key;if(!groups.has(key))groups.set(key,{key,name:r?.canonicalName||n.name,product:r?.product||n.product||null,variants:new Set(),visitors:new Set(),sourceKeys:new Set(),firstAt:n.createdAt,reviewed:!!r});const g=groups.get(key);g.visitors.add(n.visitorId);g.variants.add(n.name);g.sourceKeys.add(n.key);if(r)g.reviewed=true;if(!g.product)g.product=r?.product||n.product||null}return [...groups.values()].map(g=>({key:g.key,name:g.name,product:g.product,variants:[...g.variants],sourceKeys:[...g.sourceKeys],nominators:g.visitors.size,firstAt:g.firstAt,reviewed:g.reviewed,status:g.visitors.size>=2?(g.reviewed?'on-board':'needs-lookup'):'gathering-nominations'})).sort((a,b)=>b.nominators-a.nominators)}
// Shared by experiment, community and overall boards. A light neutral prior
// tempers sparse votes; 10.0 requires at least 100 valid verdicts.
export function voteCounts(votes){
  const counts={yes:0,maybe:0,pass:0,total:0};
  for(const value of Object.values(votes||{})){
    const key=value==='yes'?'yes':value==='brand'?'maybe':value==='no'?'pass':null;
    if(key){counts[key]++;counts.total++;}
  }
  return counts;
}
export function voteScore(votes){
  const values=Object.values(votes||{});
  const yes=values.filter(v=>v==='yes').length,no=values.filter(v=>v==='no').length;
  const brand=values.filter(v=>v==='brand').length;
  const support=yes+0.5*brand,total=support+no;
  if(!total)return null;
  const adjusted=10*(support+0.25)/(total+0.5);
  return (total<100?Math.min(9.9,adjusted):adjusted).toFixed(1);
}
export function community(d,visitorId,products=[]){return oneProductPerBrand(grouped(d).filter(g=>g.status==='on-board').map(g=>{const id='community-'+g.key,votes=d.communityVotes?.[id]||{};return {...(g.product?.provider?identity(g.product):{}),id,name:g.product?.name||g.name,image:g.product?.image||null,brand:g.product?.brand||null,url:g.product?.url||null,communityNominated:true,skuId:g.product?.skuId||g.product?.onBoardId||g.product?.id||null,score:voteScore(votes),voteCounts:voteCounts(votes),myVote:votes[visitorId]||null}}),products)}
export function summary(data){const sessions=Object.values(data.sessions),visitors=Object.keys(data.visitors).length;const unique=k=>new Set(sessions.filter(s=>s[k]).map(s=>s.visitorId)).size;const started=unique('startedAt'),completed=unique('completedAt');return {visitors,visits:sessions.length,started,allCardsAnswered:unique('allCardsAt'),leaderboardViewed:unique('boardAt'),completed,endSeen:unique('endAt'),completionRate:visitors?Math.round(completed/visitors*100):0,startToFinishRate:started?Math.round(completed/started*100):0,nominationSubmitters:new Set(data.nominations.map(n=>n.visitorId)).size,nominations:grouped(data),updatedAt:new Date().toISOString()}}
function ownNominations(d,visitorId){
  const groups=grouped(d);
  return d.nominations.filter(n=>n.visitorId===visitorId).map(n=>{
    const g=groups.find(g=>g.sourceKeys.includes(n.key));
    return {name:g.name,product:g.product,key:n.key,qualified:g.status==='on-board',status:g.status};
  });
}
export function createVouchApi({store,search,authorizeAdmin=()=>false,productIds=PRODUCT_IDS,products=[]}){
 return async function handle(request){const url=new URL(request.url),p=url.pathname;if(!p.startsWith('/api/'))return null;let cookies=[];
 const json=(value,status=200,headers={})=>{const h=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});for(const c of cookies)h.append('Set-Cookie',c);return new Response(JSON.stringify(value),{status,headers:h})};
 const error=(message,status=400)=>Object.assign(Error(message),{status});
 const body=()=>readJson(request);
 function identify(data){const c=Object.fromEntries((request.headers.get('cookie')||'').split(';').map(x=>x.trim().split('='))),valid=x=>/^[a-f0-9-]{36}$/.test(x||'');const visitorId=valid(c.vouch_visitor)?c.vouch_visitor:crypto.randomUUID();const previous=valid(c.vouch_session)?data.sessions[c.vouch_session]:null;const sessionId=previous&&previous.visitorId===visitorId&&Date.now()-Date.parse(previous.lastAt)<1800000?c.vouch_session:crypto.randomUUID();const secure=url.protocol==='https:'?'; Secure':'';cookies=[`vouch_visitor=${visitorId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`,`vouch_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800${secure}`];return {visitorId,sessionId}}
 function touch(d,who){const now=new Date().toISOString();d.visitors[who.visitorId]??={firstAt:now};d.sessions[who.sessionId]??={visitorId:who.visitorId,visitedAt:now,lastAt:now,answers:{}};const session=d.sessions[who.sessionId];session.lastAt=now;return session}
 try{
  if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Request origin not allowed'},403);
  if(p.startsWith('/api/admin/')&&!await authorizeAdmin(request))return json({error:'Organizer access required.'},request.headers.get('oai-authenticated-user-email')?403:401);
  if(p==='/api/products/search'&&request.method==='GET'){const q=(url.searchParams.get('q')||'').trim();if(q.length<2)return json({products:[]});if(q.length>100)return json({error:'Keep your search under 100 characters.'},400);try{return json(await search.search(q))}catch(e){return json({error:e.message},503)}}
  if(p==='/api/admin/summary'&&request.method==='GET')return json(summary(await store.read()));
  if(p==='/api/admin/export'&&request.method==='GET')return json({formatVersion:1,exportedAt:new Date().toISOString(),data:await store.read()},200,{'Content-Disposition':'attachment; filename="vouch-results.json"'});
  if(p==='/api/admin/review'&&request.method==='POST'){const input=await body(),name=String(input.name||'').trim().slice(0,120),keys=input.keys;if(name.length<2||!Array.isArray(keys)||!keys.length||keys.some(k=>typeof k!=='string'))throw error('Choose nominations and enter the exact product name.');const result=await store.transaction(d=>{const product=keys.map(k=>d.reviews[k]?.product||d.nominations.find(n=>n.key===k)?.product).find(Boolean),canonicalKey=product?'catalog:'+product.id:normalize(name);for(const key of keys){if(!d.nominations.some(n=>n.key===key))throw error('Nomination not found',404);d.reviews[key]={canonicalKey,canonicalName:name,...(product?{product}:{}),reviewedAt:new Date().toISOString()}}return grouped(d).find(g=>g.key===canonicalKey)});return json(result)}
  if(p==='/api/events'&&request.method==='POST'){const input=await body(),type=input.type;if(!['visit','start','answer','leaderboard','end_seen'].includes(type))throw error('Unknown event');if(type==='answer'&&(!productIds.has(input.productId)||!['yes','brand','no','skip'].includes(input.value)))throw error('Invalid verdict');const who=identify(await store.read());return json(await store.transaction(d=>{const s=touch(d,who),now=new Date().toISOString();if(type==='start')s.startedAt??=now;if(type==='answer'){s.startedAt??=now;s.answers[input.productId]=input.value;d.baseVotes??={};d.baseVotes[input.productId]??={};d.baseVotes[input.productId][who.visitorId]=input.value;d.baseVoteTimes??={};d.baseVoteTimes[input.productId]??={};d.baseVoteTimes[input.productId][who.visitorId]=now;if([...productIds].every(id=>Object.hasOwn(s.answers,id)))s.allCardsAt??=now}if(type==='leaderboard')s.boardAt??=now;if(type==='end_seen')s.endAt??=now;if(s.startedAt&&s.allCardsAt&&s.boardAt)s.completedAt??=now;return {ok:true,answered:Object.keys(s.answers).length,completed:!!s.completedAt}}))}
  if((p==='/api/community'||p==='/api/board'||p==='/api/me')&&request.method==='GET'){const d=await store.read(),who=identify(d);if(p==='/api/community')return json({products:community(d,who.visitorId,products)});if(p==='/api/board')return json({products:[...productIds].map(id=>({id,score:voteScore(d.baseVotes?.[id]),voteCounts:voteCounts(d.baseVotes?.[id]),myVote:d.baseVotes?.[id]?.[who.visitorId]||null}))});const nominations=ownNominations(d,who.visitorId);return json({nominations,nomination:nominations[0]||null})}
  if(p==='/api/community/vote'&&request.method==='POST'){const input=await body();if(!['yes','brand','no','skip'].includes(input.value))throw error('Invalid verdict');const who=identify(await store.read());return json(await store.transaction(d=>{const product=community(d,who.visitorId,products).find(p=>p.id===input.productId);if(!product)throw error('Product not found',404);touch(d,who);d.communityVotes??={};d.communityVotes[product.id]??={};d.communityVotes[product.id][who.visitorId]=input.value;d.communityVoteTimes??={};d.communityVoteTimes[product.id]??={};d.communityVoteTimes[product.id][who.visitorId]=new Date().toISOString();return {products:community(d,who.visitorId,products)}}))}
  if(p==='/api/nominations'&&request.method==='POST'){
    const input=await body(),batch=Object.hasOwn(input,'nominations');
    const entries=batch?input.nominations:[input];
    if(!Array.isArray(entries)||entries.length>50)throw error('Choose up to 50 nominations.');
    // Validate the complete selection before changing any saved nominations.
    const validated=new Map();
    for(const entry of entries){
      if(!entry||typeof entry!=='object')throw error('Choose a product or enter its name.');
      let product=null;
      if(entry.productId){product=await search.find(String(entry.productId));if(!product)throw error('That search result has expired. Please search and select it again.');if(product.onBoardId)throw error('That product is already on the board. Give it a verdict instead.',409)}
      if(product?.provider)product=identity(product);
      const name=product?[product.brand,product.name].filter(Boolean).join(' '):String(entry.name||'').trim().replace(/\s+/g,' ');
      if(name.length<2||name.length>(product?260:120)||normalize(name).length<2)throw error('Enter a product name, up to 120 characters.');
      const key=product?'catalog:'+product.id:normalize(name);
      validated.set(key,{key,name,...(product?{product}:{})});
    }
    const who=identify(await store.read());
    return json(await store.transaction(d=>{
      touch(d,who);const now=new Date().toISOString();
      const previous=d.nominations.filter(n=>n.visitorId===who.visitorId);
      const removed=previous.filter(n=>!validated.has(n.key));
      if(removed.length){d.nominationHistory??=[];d.nominationHistory.push(...removed.map(n=>({...n,archivedAt:now})))}
      d.nominations=d.nominations.filter(n=>n.visitorId!==who.visitorId);
      for(const [key,entry] of validated){
        const old=previous.find(n=>n.key===key);
        d.nominations.push(old||{id:crypto.randomUUID(),visitorId:who.visitorId,...entry,createdAt:now});
        if(entry.product)d.reviews[key]={canonicalKey:key,canonicalName:entry.name,product:entry.product,reviewedAt:now,method:'brand-catalog-selection'};
      }
      const nominations=ownNominations(d,who.visitorId);
      return batch?{nominations}:nominations[0];
    }));
  }
  return json({error:'Not found'},404);
 }catch(e){return json({error:e.status?e.message:'Could not save right now. Please try again.'},e.status||500)}
 };
}
