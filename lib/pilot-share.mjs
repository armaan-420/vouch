import {shareableVouch,vouchDescription} from './vouch-share-data.mjs';
import {vouchShareTags} from './accounts.mjs';
import {retailerOffers,retailerUrl} from '../public/retailer-offers.js';
import {canShareWinner} from '../public/pilot-share-rules.js';
import {community,fresh,voteScore} from './vouch-api.mjs';
import {verifiedWharton,whartonLeaderboard} from './contributor-leaderboard.mjs';
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

export function leaderboardShare(accounts,groups,key=null) {
  const {entries,viewer,total}=whartonLeaderboard(accounts,{key,limit:5});
  const rows=entries.map(({rank,displayName,photo,count,isYou})=>({rank,name:displayName,photo,count,isYou}));
  if(viewer.eligible&&viewer.entry&&!rows.some(row=>row.isYou)){
    const {rank,displayName,photo,count}=viewer.entry;
    rows.push({rank,name:displayName,photo,count,isYou:true,separate:true});
  }
  return {
    kind:'leaderboard',title:'The Wharton leaderboard',headline:'The people behind the picks',
    description:'Meet the Wharton classmates sharing the most public item vouches.',
    eyebrow:'WHARTON LEADERBOARD',link:'/share/leaderboard',boardId:groups.find(g=>g.experiment)?.experiment.id,
    rows,total
  };
}

function photo(src,name) {
  return safePhoto(src)?`<img src="${esc(src)}" alt="">`:`<span class="pilot-share-placeholder" aria-hidden="true">${esc([...name][0]||'')}</span>`;
}
function vouchBody(card){
  const {product,author,review,tags,score,ratings,offers}=card,name=productName(product);
  const arc=score==null?'':`<div class="vouch-share-score"><span class="item-score-dial"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="item-score-track" cx="40" cy="40" r="35"/><circle class="item-score-progress" cx="40" cy="40" r="35" pathLength="100" stroke-dasharray="${score*10} 100"/></svg><strong>${score.toFixed(1)}</strong></span><span><b>Vouch score</b> · ${ratings} ${ratings===1?'rating':'ratings'}</span></div>`;
  return `<article class="vouch-share-card"><div class="vouch-share-byline"><a href="/profiles/${encodeURIComponent(author.handle)}">${photo(author.photo,author.name)}<strong>${esc(author.name)}</strong></a><span>public vouch</span></div>
    <h1>${esc(card.headline)}</h1>
    <figure class="pilot-share-winner">${product.image?`<img src="${esc(product.image)}" alt="${esc(name)}">`:photo(null,name)}
    <figcaption><small>${esc(product.brand)}</small><br>${esc(product.name)}</figcaption></figure>
    ${review?`<blockquote>“${esc(review)}”</blockquote>`:''}
    ${tags.length?`<ul class="vouch-share-tags" aria-label="What stands out">${tags.map(tag=>`<li>${esc(tag)}</li>`).join('')}</ul>`:''}
    ${arc}
    ${offers.length?`<section aria-labelledby="vouch-where-to-buy"><h2 id="vouch-where-to-buy">Where to buy</h2><ul class="pilot-share-list">${offers.map(offer=>`<li><a class="pilot-button is-outline" data-vouch-retailer href="${esc(offer.url)}" rel="sponsored noopener noreferrer" target="_blank" aria-label="${esc([offer.retailer,offer.formattedPrice,'opens in a new tab'].filter(Boolean).join(', '))}">${esc(offer.retailer)}${offer.formattedPrice?' · '+esc(offer.formattedPrice):''} ↗</a></li>`).join('')}</ul><p>Vouch may earn a commission.</p></section>`:''}
    </article>`;
}

function shareContent(card) {
  if(card.kind==='picks')return `<ul class="pilot-share-list">${card.rows.map(row=>`<li>${photo(row.image,row.name)}<div><strong>${esc(row.name)}</strong><p>${esc(row.category)} · ${row.others?'+ '+row.others+' classmates':'First to vouch'}</p></div></li>`).join('')}</ul><p>Whose taste do <mark>you</mark> trust?</p>`;
  if(card.kind==='leaderboard')return `<ol class="pilot-share-list pilot-share-ranks">${card.rows.map(row=>`<li value="${row.rank}"><span aria-hidden="true">${row.rank}</span>${photo(row.photo,row.name)}<strong>${esc(row.name)}</strong><span class="pilot-share-count">${row.count}</span></li>`).join('')}</ol><p>Public vouches</p>`;
  const {winner}=card;
  return `<figure class="pilot-share-winner">${photo(winner.image,winner.name)}<figcaption>${esc(winner.name)}</figcaption></figure>
    <ul class="pilot-share-vouchers" aria-label="Classmates who vouched">${winner.people.map(p=>`<li aria-label="${esc(p.displayName)}">${photo(p.photo,p.displayName)}</li>`).join('')}</ul>
    <p>Vouched by ${winner.count} classmates</p>`;
}
export function shareHtml(card,{origin,account,ref}) {
  const signedIn=!!account&&!account.browserProfile&&!account.verificationRequired;
  const canonical=new URL(card.link,origin).href;
  const title=esc(card.title),description=esc(card.description);
  const vouch=card.kind==='vouch';
  const image=vouch&&card.product.image?new URL(card.product.image,origin).href:null;
  const imageMeta=image?`<meta property="og:image" content="${esc(image)}"><meta property="og:image:alt" content="${esc(productName(card.product))}"><meta name="twitter:image" content="${esc(image)}">`:'';
  const voted=vouch&&['yes','no','brand'].includes(account?.opinions?.['p:'+card.productId]?.verdict);
  const action=signedIn?(vouch?(voted?'See it on Vouch':'Vouch for it too'):'See the Board'):'Join the Wharton experiments';
  const target=signedIn?(vouch?card.productPath+(voted?'':'#item-product-vote'):boardLink(card.boardId,verifiedWharton(account))):'/wharton';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${description}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="${image?'summary_large_image':'summary'}"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}">
${imageMeta}${vouch?'<link rel="stylesheet" href="/accounts.css"><script defer src="/pilot-events.js"></script><script defer src="/vouch-share-retail.js"></script>':''}
<link rel="icon" href="/brand/favicon.svg"><link rel="apple-touch-icon" href="/brand/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/pilot.css"></head>
<body><main class="pilot-share-page"${vouch?` data-vouch-product="${esc(card.productId)}" data-vouch-ref="${esc(ref)}"`:''}><a class="wordmark" href="/wharton"><img class="wordmark-emblem" width="42" height="42" src="/brand/vouch-emblem.svg" alt="">vouch</a>
${vouch?vouchBody(card):`<article><p class="eyebrow">${esc(card.eyebrow)}</p><h1>${esc(card.headline)}</h1>${shareContent(card)}</article>`}
<a class="pilot-button" href="${esc(target)}">${action}</a>
${vouch?`<p><a href="${esc(card.productPath+'#item-people')}">See every vouch for this on Vouch</a></p>`:''}
</main></body></html>`;
}

export function createPilotShare({store,accountStore,registryStore,getAccount,productData,offers}) {
  return async request=>{
    const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean);
    const isPage=parts[0]==='share',isApi=parts[0]==='api'&&parts[1]==='pilot-share';
    if(!isPage&&!isApi)return null;
    const path=parts.slice(isPage?1:2);
    const headers=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
    const missing=()=>isPage?new Response('Share page not found.',{status:404,headers}):Response.json({error:'This share card is unavailable.'},{status:404,headers});
    const creating=isApi&&path[0]==='vouch'&&path.length===2&&request.method==='POST';
    if(creating&&(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'))return new Response(null,{status:403,headers});
    if(!creating&&(request.method!=='GET'&&request.method!=='HEAD'||isApi&&path[0]==='vouch'))return new Response(null,{status:405,headers});
    try{
      const [registry,records,viewer]=await Promise.all([registryStore().then(s=>s.read()),accountStore().then(s=>s.read()),getAccount(request)]);
      const groups=pilotCategories(registry);
      let card;
      if(creating||isPage&&path[0]==='vouch'&&path.length===3){
        let id;
        try{id=decodeURIComponent(path.at(-1));}catch{return missing();}
        if(!id||id.length>512)return missing();
        const key=creating?viewer.key:Object.keys(records.accounts).find(key=>records.accounts[key].handle===path[1]);
        const author=records.accounts[key],opinion=shareableVouch(author,id);
        if(!opinion||!creating&&!Object.hasOwn(author.sharedVouches||{},id))return missing();
        if(creating&&author.vouchShareRate?.until>Date.now()&&author.vouchShareRate.count>=120){
          return Response.json({error:'Too many share requests. Try again later.'},{status:429,headers});
        }
        const response=await productData(request,id);
        if(!response?.ok)return missing();
        const data=await response.json(),p=data.product;
        if(creating){
          const created=await (await accountStore()).transaction(state=>{
            const owner=state.accounts[key];
            if(!shareableVouch(owner,id))return 404;
            const now=Date.now(),limit=owner.vouchShareRate;
            if(limit?.until>now&&limit.count>=120)return 429;
            if(!limit||limit.until<=now)owner.vouchShareRate={until:now+3600000,count:0};
            owner.vouchShareRate.count++;
            owner.sharedVouches??={};
            if(!Object.hasOwn(owner.sharedVouches,id))Object.defineProperty(owner.sharedVouches,id,{value:{at:new Date(now).toISOString()},enumerable:true,configurable:true,writable:true});
            return 200;
          });
          if(created===404)return missing();
          if(created===429)return Response.json({error:'Too many share requests. Try again later.'},{status:429,headers});
        }
        const tags=await vouchShareTags(store,records,key,id,p.category);
        const result=data.community?.source==='edits'?data.community:null;
        const score=result?.score!=null&&Number.isFinite(Number(result.score))?Number(result.score):null;
        const firstName=author.displayName.trim().split(/\s+/)[0],name=productName(p);
        let retailers=[];
        if(isPage&&request.method==='GET'){
          const response=await offers(request,id).catch(()=>null);
          if(response?.ok)retailers=retailerOffers((await response.json()).offers);
          if(!retailers.length&&retailerUrl(p.url))retailers=[{url:retailerUrl(p.url),retailer:'Buy now'}];
        }
        card={kind:'vouch',eyebrow:'MY VOUCH',headline:firstName+' vouches for this.',firstName,
          title:firstName+' vouches for the '+name,product:{brand:p.brand||'',name:p.name,image:safePhoto(publicPhoto(p))},
          review:data.contributors.find(person=>person.handle===author.handle&&person.verdict==='yes')?.comment?.trim()||null,tags,score,ratings:score===null?null:result.voteCounts.total,
          productId:id,productPath:'/products/'+encodeURIComponent(id),link:'/share/vouch/'+encodeURIComponent(author.handle)+'/'+encodeURIComponent(id),
          defaultRef:author.handle,author:{name:author.displayName,handle:author.handle,photo:author.photo?'/api/account/photos/'+author.photo:null},offers:retailers};
        card.description=vouchDescription(card,name);
      }
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
      if(path[0]==='leaderboard'&&path.length===1){
        const leaderboard=leaderboardShare(records.accounts,groups,isPage?null:viewer.key);
        if(isPage||leaderboard.total>=3)card=leaderboard;
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
        const event={type:'share_opened',kind:card.kind,at:new Date().toISOString(),visitorId,...(viewer.key?{accountKey:viewer.key}:{}),...(ref?{ref}:{}),...(card.kind==='winner'?{experimentId:card.boardId}:{}),...(card.kind==='vouch'?{productId:card.productId}:{})};
        await db.transaction(data=>{data.events.push(event);});
      }catch{}
      return new Response(shareHtml(card,{origin:url.origin,account:viewer.account,ref}),{headers});
    }catch{
      return isPage?new Response('Could not open this share page.',{status:503,headers}):Response.json({error:'Could not make this share card.'},{status:503,headers});
    }
  };
}
