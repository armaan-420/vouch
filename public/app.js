const experimentId=decodeURIComponent(location.pathname.split('/').filter(Boolean)[0]||'');
const experimentPath='/'+encodeURIComponent(experimentId);
document.querySelector('footer a[href="/account"]')?.setAttribute('href','/account?experiment='+encodeURIComponent(experimentId));
let experiment=null,products=[],accountSignedIn=false,accountStatusKnown=false,accountProfile=null;
const KEY='vouch-experiment-'+experimentId;
const initial=()=>({votes:{},nomination:null});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||initial()}catch{state=initial()}
let communityProducts=[],baseBoard={};
let screen='home',index=0;const app=document.getElementById('app');
let trackingQueue=Promise.resolve(),profileSyncState=null;
function apiUrl(path){const u=new URL(path,location.origin);u.searchParams.set('experiment',experimentId);return u.pathname+u.search}
async function api(url,payload){const response=await fetch(apiUrl(url),{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined,credentials:'same-origin'});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Could not save. Please try again.'),{experimentSaved:result.experimentSaved});if(result.profileSync){profileSyncState=result.profileSync;accountSignedIn=result.profileSync!=='signed-out';accountStatusKnown=true;}return result}
function report(error){let notice=document.getElementById('save-error');if(!notice){notice=document.createElement('p');notice.id='save-error';notice.className='save-error';notice.setAttribute('role','alert');app.prepend(notice)}notice.textContent=error.message+(error.experimentSaved?'':' Your response has not been saved.')}
function track(type,extra={}){const job=trackingQueue.then(()=>api('/api/events',{type,...extra}));trackingQueue=job.catch(error=>report(error));return job}
function watchEnd(){const section=document.getElementById('nominate');if(!section)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){track('end_seen').catch(()=>{});observer.disconnect()}},{threshold:0.25});observer.observe(section)}

function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function refreshCommunity(){try{await trackingQueue;const [community,boardData,me]=await Promise.all([api('/api/community'),api('/api/board'),api('/api/me')]);state.nominations=me.nominations||[];state.nomination=me.nomination;communityProducts=community.products;baseBoard=Object.fromEntries(boardData.products.map(p=>[p.id,p]));state.votes=Object.fromEntries(boardData.products.filter(p=>p.myVote).map(p=>[p.id,p.myVote]));save();if(screen==='board')board()}catch(error){report(error)}}
function verdictLabel(value){return {yes:'Vouched for the item 👍',brand:'Vouched for the brand',no:'Passed 👎',skip:'Haven’t tried this'}[value]||''}
const voteArrow=direction=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 3 12h6v9h6v-9h6L12 3Z"${direction==='down'?' transform="rotate(180 12 12)"':''}/></svg>`;
const compactVotes=value=>new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(value);
function scoreSummary(p){
 const counts=p.voteCounts,value=p.score??null;
 const scoreText=`<span class="score ${scoreColor(value)}">${value??'Unrated'}</span>`;
 if(!counts||value===null)return `<div class="score-summary">${scoreText}</div>`;
 return `<div class="score-summary">${scoreText}<details class="vote-details"><summary class="vouch-count-chip" aria-label="${counts.total} ${counts.total===1?'vote':'votes'} for ${esc(p.name)}. Show vote breakdown." title="View vote breakdown"><span class="vouch-chip-count">${compactVotes(counts.total)} ${counts.total===1?'vote':'votes'}</span></summary><div class="vote-breakdown"><div class="vote-breakdown-heading"><p class="vote-breakdown-title">The community says</p><span class="vote-total-chip">${counts.total} ${counts.total===1?'vote':'votes'}</span></div><dl class="vote-split"><div class="verdict-chip verdict-yes"><dt>${voteArrow('up')}Yes</dt><dd>${counts.yes}</dd></div><div class="verdict-chip verdict-maybe"><dt><span aria-hidden="true">≈</span>Maybe</dt><dd>${counts.maybe}</dd></div><div class="verdict-chip verdict-pass"><dt>${voteArrow('down')}Pass</dt><dd>${counts.pass}</dd></div></dl></div></details></div>`;
}
// Native disclosure supports touch, Enter and Space; keep one open at a time.
document.addEventListener('click',event=>{
 const current=event.target.closest('.vote-details');
 document.querySelectorAll('.vote-details[open]').forEach(details=>{if(details!==current)details.open=false});
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 const open=document.querySelector('.vote-details[open]');
 if(open){open.open=false;open.querySelector('summary').focus();event.preventDefault();}
});
function communityCard(p,i){
 const actions=[['no','Pass 👎','👎'],['brand','Soft-Vouch 🤏','🤏'],['yes','Vouch 👍','👍'],['skip','I haven’t tried this','🤷']];
 return `<div class="rank-row community-row"><span class="rank">${String(i+1).padStart(2,'0')}</span>${standingsImage(p,true)}<div class="rank-info">${standingsName(p,true)}${p.myVote?`<span class="your-vote">You ${verdictLabel(p.myVote)}</span>`:''}</div>${scoreSummary(p)}<div class="community-actions">${actions.map(([value,label,emoji])=>`<button data-community="${esc(p.id)}" data-choice="${value}" aria-label="${label}" aria-pressed="${p.myVote===value}"><span class="community-action-label" aria-hidden="true">${label}</span><span class="community-action-emoji" aria-hidden="true">${emoji}</span></button>`).join('')}</div></div>`;
}
function score(p){return baseBoard[p.id]?.score??null}
function go(s){history.replaceState(null,'',experimentPath);screen=s;if(s!=='game'){const announcement=document.getElementById('voting-announcement');if(announcement)announcement.textContent=''}render();window.scrollTo({top:0,behavior:'instant'});if(s==='board'){if(experimentStatus()==='open')track('leaderboard').catch(()=>{});refreshCommunity()}}
function focusScreenHeading(){if(screen==='game'&&index<products.length){app.querySelector('[data-vote="yes"]')?.focus({preventScroll:true});return}const heading=app.querySelector('h1,h2');if(!heading)return;heading.tabIndex=-1;heading.focus({preventScroll:true})}
let screenHasRendered=false;
function render(){window.VouchPicksPrompt?.refresh();updateHeader();if(screen==='home')home();else if(screen==='game')game();else if(screen==='edit')personalEdit();else board();if(screenHasRendered||screen!=='home')focusScreenHeading();screenHasRendered=true}

function experimentStatus(){
 if(experiment.closed)return 'closed';
 if(experiment.startsAt&&Date.now()<Date.parse(experiment.startsAt))return 'upcoming';
 if(experiment.endsAt&&Date.now()>=Date.parse(experiment.endsAt))return 'ended';
 return 'open';
}

function updateHeader(){
 if(!experiment)return;
 document.body.dataset.screen=screen==='game'&&index<products.length?'rating':screen;
 const button=document.querySelector('header .leaderboard-link'),voting=screen==='game';
 document.querySelector('header').classList.toggle('voting-header',voting);
 button.classList.toggle('profile-link',!voting&&accountSignedIn);
 button.dataset.action=voting?'board':'account';
 button.href=voting?experimentPath+'?board=1':'/account?experiment='+encodeURIComponent(experimentId);
 const profileName=accountProfile?.displayName||'Vouch member';
 const photo=accountProfile?.photo;
 const safePhoto=typeof photo==='string'&&photo.startsWith('/api/account/photos/');
 const headerContent=voting?'The Board':accountSignedIn?(safePhoto?'<img src="'+esc(photo)+'" alt="">':'<span aria-hidden="true">'+esc(profileName.trim().charAt(0).toUpperCase()||'V')+'</span>'):'Sign in';
 if(button.innerHTML!==headerContent)button.innerHTML=headerContent;
 button.setAttribute('aria-label',voting?'The Board':accountSignedIn?'My profile':'Sign in');
 const footerLink=document.getElementById('landing-standings');
 footerLink.hidden=screen!=='home'||hasAnsweredAll()||experimentStatus()!=='open';
 footerLink.href=experimentPath+'?board=1';
 document.querySelector('.header-label').hidden=voting||!experiment.endsAt||experimentStatus()!=='open';
 const active=!voting&&experimentStatus()==='open'&&experiment.endsAt;
 let timing='';
 if(active){const seconds=Math.max(0,Math.ceil((Date.parse(experiment.endsAt)-Date.now())/1000)),days=Math.floor(seconds/86400);const remaining=(days?days+'d ':'')+[Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');timing=`<span class="header-countdown" role="timer" aria-live="off" aria-label="Time remaining"><span aria-hidden="true"> | </span>${remaining} left</span>`}
 document.querySelector('.header-label').innerHTML=`${timing}`;
}
async function refreshAccountStatus(){try{const me=await api('/api/account/me');accountSignedIn=!!me.authenticated;accountProfile=me.profile;accountStatusKnown=true}catch{}updateHeader();window.VouchPicksPrompt?.refresh()}
function updateTimers(){
 if(!experiment)return;
 const status=experimentStatus();updateHeader();
 app.querySelectorAll('[data-action="start"]').forEach(b=>b.disabled=status!=='open');
 if(screen==='game'&&status!=='open'){screen='board';board()}
 else if(screen==='board'&&app.dataset.collectionStatus!==status)board();
 else if(screen==='home'&&app.dataset.collectionStatus!==status)home();
}

function hasAnsweredAll(){return products.length>0&&products.every(p=>['yes','no','brand','skip'].includes(state.votes[p.id]))}
function home(){const status=experimentStatus(),finished=hasAnsweredAll(),closed=status==='closed'||status==='ended';app.dataset.collectionStatus=status;app.innerHTML=`<section class="hero"><div class="hero-copy"><h1>${finished&&!closed?'<span>Welcome</span><span>back.</span>':experimentId==='sunscreen'?'Big SPF.<br><em>Bigger opinions.</em>':experimentId==='waterbottle'?'Big sips.<br><em>Bigger opinions.</em>':esc(experiment.title)}</h1><p class="intro">${closed?'Voting has ended. See the community’s final picks.':finished?'Your takes are in.':'Tell us which products you vouch for, then see how your picks stack up.'}</p>${finished&&!closed?'<button class="text-button revisit-takes" data-action="start">Revisit your takes</button>':''}<button class="primary" data-action="${closed||finished?'board':'start'}">${closed?'See the final board':finished?'See the board':'Start vouching'}</button></div><div class="hero-art" aria-label="Featured products"><span class="art-label">${experimentId==='waterbottle'?'The hydration edit':esc(experiment.title)}</span>${products[0].image?`<img src="${esc(products[0].image)}" alt="${esc(products[0].name)}">`:'<span class="product-placeholder" aria-hidden="true">✳</span>'}${products[1]?.image?`<img class="second" src="${esc(products[1].image)}" alt="${esc(products[1].name)}">`:''}<div class="sticker">Worth the<br>hype?</div></div></section><div class="steps"><div>01 <span>Vouch for your favs</span></div><div>02 <span>Add your essentials</span></div><div>03 <span>Reveal the board</span></div></div>`;updateTimers()}
function game(){if(index===products.length){nominationCard();return}const p=products[index],savedVote=state.votes[p.id],savedLabel={yes:'Vouch for the item',brand:'Vouch for the brand',no:'Pass',skip:'Haven’t tried this'}[savedVote];app.innerHTML=`<section class="game">${flowProgress()}<article class="product-card"><div class="product-photo">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.brand)} ${esc(p.name)}">`:'<span class="product-placeholder" aria-hidden="true">✳</span>'}</div><div class="product-content"><p class="brand"><strong>${esc(p.brand)}</strong></p><h2 id="voting-product-title"${savedLabel?' aria-describedby="saved-verdict"':''}>${esc(p.name)}</h2><p class="formula">${esc(p.formula||'')}</p></div></article>${savedLabel?`<p class="saved-verdict" id="saved-verdict">Your saved answer: <strong>${savedLabel}</strong>. Choose another answer to replace it.</p>`:'<p class="vote-hint">Tried this item, or just trust the brand?</p>'}<div class="vote-actions"><button class="pass" data-vote="no" aria-pressed="${savedVote==='no'}">Pass 👎</button><button class="brand-vouch" data-vote="brand" aria-pressed="${savedVote==='brand'}"><span>Soft-Vouch 🤏</span><small><em>I trust this brand</em></small></button><button class="vouch" aria-describedby="voting-product-title" data-vote="yes" aria-pressed="${savedVote==='yes'}"><span>Vouch 👍</span><small><em>I tried this item</em></small></button></div><button class="skip skip-choice" data-vote="skip" aria-pressed="${savedVote==='skip'}">I haven’t tried this</button></section>`;const announcement=document.getElementById('voting-announcement');if(announcement)announcement.textContent=`Product ${index+1} of ${products.length}`;}
function board(){updateHeader();const restoreHeadingFocus=document.activeElement===app.querySelector('h1');app.dataset.collectionStatus=experimentStatus();const sorted=[...products.map(p=>({...p,...baseBoard[p.id]})),...communityProducts].sort((a,b)=>Number(b.score??-1)-Number(a.score??-1));const n=state.nomination;app.innerHTML=`<section class="board"><div class="board-head"><p class="eyebrow">VOUCH / ${esc(experiment.title)}</p><h1>The Board</h1><p>Rankings reflect the collective pool of item vouches, brand vouches and passes from everyone who voted.</p></div><div class="board-topline"><span>PRODUCT</span><span>VOUCH SCORE</span></div>${sorted.map((p,i)=>p.communityNominated?communityCard(p,i):`<div class="rank-row" id="product-${p.id}"><span class="rank">${String(i+1).padStart(2,'0')}</span>${standingsImage(p)}<div class="rank-info">${standingsName(p)}${state.votes[p.id]&&state.votes[p.id]!=='skip'?`<span class="your-vote">You ${verdictLabel(state.votes[p.id])}</span>`:''}</div>${scoreSummary({...p,...baseBoard[p.id]})}</div>`).join('')}${experimentStatus()!=='open'?'<p>'+ (experimentStatus()==='upcoming'?'Voting has not started yet.':'Voting has ended. Results remain available.')+' Nominations and voting are paused.</p>':nominationView()}${accountSignedIn?`<p class="collection-sync-notice" role="status">${profileSyncState==='saved'?'Your signed-in answers are saved to your collection.':'Review these products to save any picks missing from your collection.'} <a href="/account?experiment=${encodeURIComponent(experimentId)}${profileSyncState==='saved'?'':'&review=1'}">${profileSyncState==='saved'?'View my collection':'Review and save picks'} →</a></p>`:''}<div class="board-bottom"><button class="text-button" data-action="start">${Object.keys(state.votes).length?'Revisit your takes':'Start vouching'}</button></div></section>`;if(experimentStatus()!=='open'){app.querySelectorAll('[data-community],[data-action="start"]').forEach(b=>b.disabled=true)}else{mountNomination();watchEnd()}updateTimers();window.VouchPicksPrompt?.refresh();if(restoreHeadingFocus)focusScreenHeading()}
document.addEventListener('click',async e=>{const communityButton=e.target.closest('[data-community]');if(communityButton){const group=communityButton.closest('.community-actions');group.querySelectorAll('button').forEach(b=>b.disabled=true);try{const data=await api('/api/community/vote',{productId:communityButton.dataset.community,value:communityButton.dataset.choice});communityProducts=data.products;board()}catch(error){report(error);group.querySelectorAll('button').forEach(b=>b.disabled=false)}return}const vote=e.target.closest('[data-vote]');if(vote){const productId=products[index].id;const value=vote.dataset.vote;const buttons=[...app.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await track('answer',{productId,value})}catch{buttons.forEach(b=>b.disabled=false);return}state.votes[productId]=value;save();index++;render();window.scrollTo({top:0,behavior:'instant'});return}const action=e.target.closest('[data-action]')?.dataset.action;if(!experiment||experimentStatus()!=='open'&&action==='start')return;if(action&&e.target.closest('a'))e.preventDefault();if(action==='account'){location.assign('/account?experiment='+encodeURIComponent(experimentId));return}if(action==='home')go('home');if(action==='board'){if(screen==='game'&&index===products.length){document.getElementById('nomination-form')?.requestSubmit();return}go('board')};if(action==='edit')go('edit');if(action==='start'){try{await track('start')}catch{return}index=0;go('game')}if(action==='back'){index=Math.max(0,index-1);render()}});
document.getElementById('prototype').onclick=()=>document.getElementById('info').showModal();document.getElementById('reset').onclick=()=>{document.getElementById('info').close();go('home')};
async function overall(){
  screen='overall';updateHeader();app.innerHTML='<section class="board"><h1>The overall board.</h1><p>Loading results…</p></section>';
  try{const data=await api('/api/overall');app.innerHTML='<section class="board"><h1>The overall board.</h1><p>Rankings reflect the collective pool of item vouches, brand vouches and passes across included collections. Each browser contributes one latest verdict per product across those collections.</p>'+data.products.map((p,i)=>'<div class="rank-row"><span class="rank">'+String(i+1).padStart(2,'0')+'</span>'+standingsImage(p,p.communityNominated)+'<div class="rank-info">'+standingsName(p,p.communityNominated)+'</div>'+scoreSummary(p)+'</div>').join('')+(data.products.length?'':'<p>No collections have been included yet.</p>')+'</section>'}catch(error){report(error)}
}
document.getElementById('overall').onclick=()=>{history.replaceState(null,'',experimentPath+'?overall=1');overall()};
async function boot(){
  app.innerHTML='<section class="board"><p role="status">Loading products…</p></section>';
  try{
    experiment=(await api('/api/experiment')).experiment;products=experiment.products;
    document.title='Vouch — '+experiment.title;await refreshAccountStatus();
    document.getElementById('experiment-info').textContent='This collection contains '+products.length+' products. Responses and nominations stay within this collection. Only collections explicitly included by the organizer contribute to the overall board.';
    if(new URLSearchParams(location.search).has('overall')){await overall();return}
    if(new URLSearchParams(location.search).has('board')){screen='board';await refreshCommunity();render();return}
    if(experimentStatus()!=='open'){screen='home';await refreshCommunity();render();return}
    await track('visit');await refreshCommunity();render();
  }catch(error){app.innerHTML='<section class="board"><h1>Could not open this collection.</h1><p role="alert">'+esc(error.message)+'</p><button class="primary" id="retry-load">Try again</button></section>';document.getElementById('retry-load').onclick=boot}
}
setInterval(updateTimers,1000);
let scheduleRefreshing=false;
async function refreshSchedule(){if(!experiment||scheduleRefreshing)return;scheduleRefreshing=true;try{const next=(await api('/api/experiment')).experiment;const previous=experimentStatus();experiment=next;const current=experimentStatus();if(previous!==current&&screen!=='overall')render();updateTimers()}catch{}finally{scheduleRefreshing=false}}
setInterval(refreshSchedule,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshSchedule();refreshAccountStatus()}});
boot();
function flowProgress(){const total=products.length,current=Math.min(index+1,total),optional=index===total;return `<div class="game-top"><span>${optional?'Nominations · Optional':'Your take'}</span><div class="game-position">${index>0?'<button class="previous-arrow" data-action="back" aria-label="Previous product" title="Previous product">←</button>':''}<span>${current} of ${total}</span></div></div><div class="progress" role="progressbar" aria-label="Product progress" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${current}" aria-valuetext="${optional?'All products answered. Nominations are optional.':'Product '+current+' of '+total}">${Array.from({length:total},(_,i)=>`<i class="${i<current?'done':''}"></i>`).join('')}</div>`}
function nominationCard(){app.innerHTML=`<section class="game nomination-step">${flowProgress()}${nominationView({inFlow:true})}<div class="nomination-actions"><button class="primary nomination-continue" id="nomination-continue" type="submit" form="nomination-form">See the board →</button></div></section>`;mountNomination();watchEnd();const announcement=document.getElementById('voting-announcement');if(announcement)announcement.textContent=`All ${products.length} products answered. Nominations are optional.`;}

function personalOpinions(){return [...products.map(p=>({...p,myVote:state.votes[p.id]})),...communityProducts].filter(p=>['yes','no','brand'].includes(p.myVote))}
function personalEdit(){const opinions=personalOpinions(),counts={yes:0,no:0,brand:0};for(const p of opinions)counts[p.myVote]++;app.innerHTML=`<section class="personal-edit"><p class="eyebrow">YOUR TASTE, TOGETHER</p><h1>${opinions.length?'Your picks are ready.':'Your collection starts here.'}</h1><p class="personal-edit-intro">${opinions.length?'You’ve started a collection of products you vouch for, ones you pass on, and brands you trust. Save it to your Vouch account and build on it with your next collection.':'No product opinions this time? You can still create a Vouch account and start building your collection in a future collection.'}</p><div class="edit-counts"><span><strong>${counts.yes}</strong> item vouch${counts.yes===1?'':'es'}</span><span><strong>${counts.no}</strong> ${counts.no===1?'pass':'passes'}</span><span><strong>${counts.brand}</strong> brand endorsement${counts.brand===1?'':'s'}</span></div>${opinions.length?'<div class="personal-edit-products">'+opinions.map(p=>`<article class="personal-edit-product">${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy">`:'<span class="community-icon" aria-hidden="true">✳</span>'}<div><p class="brand">${esc(p.brand||'')}</p><h2>${esc(p.name)}</h2><p class="your-vote">${esc(verdictLabel(p.myVote))}</p></div></article>`).join('')+'</div>':''}<div class="personal-edit-claim"><h2>Make these picks yours.</h2><p>Save your collection across devices. You’ll choose what to keep and what becomes public after signing in.</p><a class="primary" href="/account?experiment=${encodeURIComponent(experimentId)}&review=1">${opinions.length?'Save my picks':'Create my account'}</a><button class="text-button" data-action="board">Continue to community results →</button><p class="caption">Your experiment responses are already saved. Creating an account is optional.</p></div></section>`;}


function scoreColor(value){if(value===null||value===undefined||value==='')return 'unrated';const n=Number(value);if(!Number.isFinite(n))return 'unrated';return n>=8?'score-green':n>=6.5?'score-black':n>=5?'score-yellow':'score-red'}
function standingsProductPath(p,isCommunity=false){const id=isCommunity?p.skuId:(p.skuId||p.onBoardId||p.id);return id?'/products/'+encodeURIComponent(id)+'?experiment='+encodeURIComponent(experimentId):null}
function standingsImage(p,isCommunity=false){const href=standingsProductPath(p,isCommunity),image=p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`:'<span class="community-icon" aria-hidden="true">✳</span>';return href?`<a class="rank-image-link" href="${href}" aria-label="See who vouched for ${esc(p.name)}">${image}</a>`:image}
function standingsName(p,isCommunity=false){const href=standingsProductPath(p,isCommunity),brand=esc(p.brand||''),name=esc(p.name);return `<p class="brand">${href?`<a href="${href}">${brand}</a>`:brand}${p.communityNominated?'<span class="community-tag">Community Nominated</span>':''}</p><h3>${href?`<a href="${href}">${name}</a>`:name}</h3>`}

window.VouchPicksPrompt?.bind(()=>({screen,experimentId,authenticated:accountStatusKnown?accountSignedIn:null,completed:products.length>0&&products.every(p=>Object.hasOwn(state.votes,p.id)),opinions:personalOpinions()}));
