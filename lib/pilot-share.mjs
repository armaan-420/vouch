import {canShareWinner} from '../public/pilot-share-rules.js';
import {community,fresh,voteScore} from './vouch-api.mjs';
import {verifiedWharton} from './contributor-leaderboard.mjs';
import {pilotCategories} from './pilot-metrics.mjs';
import {pilotPicks} from './pilot-picks.mjs';
import {publicItemSummaries} from './public-item-vouchers.mjs';
import {pilotStore,pilotVisitor,setPilotCookie,validRef} from './pilot-events.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canonicalId=p=>p.skuId||p.onBoardId||p.id;
const productName=p=>[p.brand,p.name].filter(Boolean).join(' ');
const publicPhoto=p=>p?.photoOverride||p?.image||null;
const safePhoto=value=>typeof value==='string'&&(/^\/(?![\/\\])/.test(value)||/^https:\/\//i.test(value))?value:null;
const shareLink=(path,ref)=>path+(validRef(ref)?'?ref='+encodeURIComponent(ref):'');
const boardLink=(id,wharton)=>id?'/'+encodeURIComponent(id)+'?board=1'+(wharton?'&wharton=1':''):'/wharton';

export function picksShare(profile,groups,accounts) {
  const picks=pilotPicks(profile,groups);
  if(!picks.length)return null;
  const keys=[...new Set(picks.map(({item})=>item.productId))],summaries=publicItemSummaries(accounts,keys);
  const firstName=profile.displayName.trim().split(/\s+/)[0];
  return {
    kind:'picks',title:firstName+"'s Wharton picks",headline:firstName+' vouches for these.',
    description:'See what '+firstName+' recommends from the Wharton experiments.',
    eyebrow:'MY WHARTON PICKS',
    link:'/share/picks/'+encodeURIComponent(profile.handle),
    defaultRef:profile.handle,boardId:picks[0].experiment.id,
    rows:picks.map(({experiment,group,item})=>{
      const product=experiment.products.find(p=>canonicalId(p)===item.productId)||item.product;
      return {name:productName(product||{}),category:group.name,image:safePhoto(publicPhoto(product)),
        others:Math.max(0,summaries[item.productId].total-1)};
    })
  };
}

export function winnerShare(group,data,accounts) {
  const {experiment}=group;
  const ranked=[...experiment.products.map(p=>({...p,score:voteScore(data.baseVotes?.[p.id])})),...community(data,'',experiment.products)]
    .sort((a,b)=>Number(b.score??-1)-Number(a.score??-1));
  const [winner,runnerUp]=ranked,id=winner&&(winner.communityNominated?winner.skuId:canonicalId(winner));
  if(!id)return null;
  const summary=publicItemSummaries(accounts,[id])[id];
  if(!canShareWinner(winner,runnerUp,summary.total))return null;
  const name=productName(winner),title="Wharton's #1 "+group.singular;
  return {
    kind:'winner',title,headline:title,description:name+' leads the Wharton '+group.name+' Board.',
    eyebrow:'THE WHARTON BOARD · '+group.name.toUpperCase(),
    link:'/share/board/'+encodeURIComponent(experiment.id),boardId:experiment.id,
    winner:{name,image:safePhoto(publicPhoto(winner)),count:summary.total,people:summary.people.slice(0,3).map(({displayName,photo})=>({displayName,photo}))}
  };
}

function photo(src,name) {
  return safePhoto(src)?`<img src="${esc(src)}" alt="">`:`<span class="pilot-share-placeholder" aria-hidden="true">${esc([...name][0]||'')}</span>`;
}
function shareContent(card) {
  if(card.kind==='picks')return `<ul class="pilot-share-list">${card.rows.map(row=>`<li>${photo(row.image,row.name)}<div><strong>${esc(row.name)}</strong><p>${esc(row.category)} · ${row.others?'+ '+row.others+' classmates':'First to vouch'}</p></div></li>`).join('')}</ul><p>Whose taste do <mark>you</mark> trust?</p>`;
  const {winner}=card;
  return `<figure class="pilot-share-winner">${photo(winner.image,winner.name)}<figcaption>${esc(winner.name)}</figcaption></figure>
    <ul class="pilot-share-vouchers" aria-label="Classmates who vouched">${winner.people.map(p=>`<li aria-label="${esc(p.displayName)}">${photo(p.photo,p.displayName)}</li>`).join('')}</ul>
    <p>Vouched by ${winner.count} classmates</p>`;
}
function shareHtml(card,{origin,account}) {
  const signedIn=!!account&&!account.browserProfile&&!account.verificationRequired;
  const canonical=new URL(card.link,origin).href;
  const title=esc(card.title),description=esc(card.description);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${description}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}">
<link rel="icon" href="/brand/favicon.svg"><link rel="apple-touch-icon" href="/brand/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/pilot.css"></head>
<body><main class="pilot-share-page"><a class="wordmark" href="/wharton"><img class="wordmark-emblem" width="42" height="42" src="/brand/vouch-emblem.svg" alt="">vouch</a>
<article><p class="eyebrow">${esc(card.eyebrow)}</p><h1>${esc(card.headline)}</h1>${shareContent(card)}</article>
<a class="pilot-button" href="${esc(signedIn?boardLink(card.boardId,verifiedWharton(account)):'/wharton')}">${signedIn?'See the Board':'Join the Wharton experiments'}</a>
</main></body></html>`;
}

export function createPilotShare({store,accountStore,registryStore,getAccount}) {
  return async request=>{
    const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean);
    const isPage=parts[0]==='share',isApi=parts[0]==='api'&&parts[1]==='pilot-share';
    if(!isPage&&!isApi)return null;
    const path=parts.slice(isPage?1:2);
    const headers=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
    const missing=()=>isPage?new Response('Share page not found.',{status:404,headers}):Response.json({error:'This share card is unavailable.'},{status:404,headers});
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405,headers});
    try{
      const [registry,records,viewer]=await Promise.all([registryStore().then(s=>s.read()),accountStore().then(s=>s.read()),getAccount(request)]);
      const groups=pilotCategories(registry);
      let card;
      if(path[0]==='picks'&&(isPage?path.length===2:path.length===1)){
        const profile=isPage?Object.values(records.accounts).find(a=>a.handle===path[1]):viewer.account;
        card=picksShare(profile,groups,records.accounts);
      }
      if(path[0]==='board'&&path.length===2){
        const group=groups.find(g=>g.experiment?.id===path[1]);
        if(group){
          const state=await (path[1]==='sunscreen'?store:await store.scope('experiment:'+path[1],fresh)).read();
          card=winnerShare(group,state,records.accounts);
        }
      }
      if(!card)return missing();
      if(isApi)return Response.json({...card,link:shareLink(card.link,card.defaultRef||viewer.account?.handle)},{headers});
      headers.set('Content-Type','text/html; charset=utf-8');
      if(request.method==='HEAD')return new Response(null,{headers});
      const ref=validRef(url.searchParams.get('ref'));
      const existing=pilotVisitor(request),visitorId=existing||crypto.randomUUID();
      if(ref)headers.append('Set-Cookie',setPilotCookie(request,'vouch_ref',ref,604800));
      if(!existing)headers.append('Set-Cookie',setPilotCookie(request,'vouch_visitor',visitorId,31536000));
      try{
        const db=await pilotStore(store);
        const event={type:'share_opened',kind:card.kind,at:new Date().toISOString(),visitorId,...(viewer.key?{accountKey:viewer.key}:{}),...(ref?{ref}:{}),...(card.kind==='winner'?{experimentId:card.boardId}:{})};
        await db.transaction(data=>{data.events.push(event);});
      }catch{}
      return new Response(shareHtml(card,{origin:url.origin,account:viewer.account}),{headers});
    }catch{
      return isPage?new Response('Could not open this share page.',{status:503,headers}):Response.json({error:'Could not make this share card.'},{status:503,headers});
    }
  };
}
