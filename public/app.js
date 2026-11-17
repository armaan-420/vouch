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
function apiUrl(path){const u=new URL(path,location.origin);u.searchParams.set('experiment',experimentId);if(new URLSearchParams(location.search).get('preview')==='1')u.searchParams.set('preview','1');return u.pathname+u.search}
async function api(url,payload){if(experiment?.status==='draft'&&payload)throw Error('This is a private draft. Approve it before voting.');const response=await fetch(apiUrl(url),{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined,credentials:'same-origin'});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Could not save. Please try again.'),{experimentSaved:result.experimentSaved});if(result.profileSync){profileSyncState=result.profileSync;accountSignedIn=result.profileSync!=='signed-out';accountStatusKnown=true;}return result}
function report(error){let notice=document.getElementById('save-error');if(!notice){notice=document.createElement('p');notice.id='save-error';notice.className='save-error';notice.setAttribute('role','alert');app.prepend(notice)}notice.textContent=error.message+(error.experimentSaved?'':' Your response has not been saved.')}
function track(type,extra={}){const job=trackingQueue.then(()=>api('/api/events',{type,...extra}));trackingQueue=job.catch(error=>report(error));return job}
function watchEnd(){const section=document.getElementById('nominate');if(!section)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){track('end_seen').catch(()=>{});observer.disconnect()}},{threshold:0.25});observer.observe(section)}

function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function refreshCommunity(){try{await trackingQueue;const [community,boardData,me]=await Promise.all([api('/api/community'),api('/api/board'),api('/api/me')]);state.nominations=me.nominations||[];state.nomination=me.nomination;communityProducts=community.products;baseBoard=Object.fromEntries(boardData.products.map(p=>[p.id,p]));state.votes=Object.fromEntries(boardData.products.filter(p=>p.myVote).map(p=>[p.id,p.myVote]));save();if(screen==='board')board()}catch(error){report(error)}}
function verdictLabel(value){return {yes:'vouched for the item 👍',brand:'trust the brand 🤝',no:'don’t recommend 👎',skip:'Skip this one'}[value]||''}
const compactVotes=value=>new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(value);
const voucherCache=new Map();
function scoreSummary(p){
 const counts=p.voteCounts,value=p.score??null,path=standingsProductPath(p,!!p.communityNominated),id=standingsProductId(p,!!p.communityNominated);
 const scoreText=`<span class="score ${scoreColor(value)}">${value??'Unrated'}</span>`;
 if(!counts||value===null)return `<div class="score-summary">${scoreText}</div>`;
 return `<div class="score-summary"><details class="vote-details"${id?` data-voucher-product="${esc(id)}" data-voucher-path="${esc(path)}"`:''}><summary class="vouch-count-chip" aria-label="Vouch score ${esc(value)}. ${counts.total} ${counts.total===1?'vote':'votes'} for ${esc(p.name)}. Show vote breakdown." title="View vote breakdown">${scoreText}<span class="vouch-chip-count">${compactVotes(counts.total)} ${counts.total===1?'vote':'votes'}</span></summary><div class="vote-breakdown"><div class="vote-breakdown-heading"><p class="vote-breakdown-title">The community says</p><span class="vote-total-chip">${counts.total} ${counts.total===1?'vote':'votes'}</span></div><dl class="vote-split"><div class="verdict-chip verdict-yes"><dt>Vouch</dt><dd>${counts.yes}</dd></div><div class="verdict-chip verdict-maybe"><dt>Brand vouch</dt><dd>${counts.maybe}</dd></div><div class="verdict-chip verdict-pass"><dt>Nope</dt><dd>${counts.pass}</dd></div></dl><div data-voucher-slot></div></div></details></div>`;
}
async function loadPopupVouchers(details){
 const id=details.dataset.voucherProduct,slot=details.querySelector('[data-voucher-slot]');if(!id||!slot)return;
 slot.innerHTML=window.VouchPeople.placeholder();
 let pending=voucherCache.get(id);
 if(!pending){pending=api('/api/products/'+encodeURIComponent(id)).then(data=>data.contributors||[]);voucherCache.set(id,pending)}
 try{
  const contributors=await pending;
  if(!details.isConnected)return;
  if(voucherCache.get(id)!==pending){if(details.open)loadPopupVouchers(details);return}
  slot.innerHTML=window.VouchPeople.popupRow(contributors,accountProfile?.handle,details.dataset.voucherPath);
 }catch{if(voucherCache.get(id)===pending)voucherCache.delete(id);if(details.isConnected)slot.innerHTML=''}
}
function invalidateProductVouchers(product){const id=product&&standingsProductId(product,!!product.communityNominated);if(id)voucherCache.delete(id)}
document.addEventListener('toggle',event=>{
 const details=event.target;if(!details.matches?.('.vote-details')||!details.open)return;
 document.querySelectorAll('.vote-details[open]').forEach(other=>{if(other!==details)other.open=false});
 loadPopupVouchers(details);
},true);
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
function communityCard(p,i){return rankedRow(p,i,true)}
function score(p){return baseBoard[p.id]?.score??null}
function go(s){if(s==='board'&&hasAnsweredAll()&&!accountProfile&&!state.attributionDismissed&&experiment?.status!=='draft'&&experimentStatus()==='open')s='attribution';history.replaceState(null,'',experimentPath+(experiment?.status==='draft'?'?preview=1':''));screen=s;if(s!=='game'){const announcement=document.getElementById('voting-announcement');if(announcement)announcement.textContent=''}render();window.scrollTo({top:0,behavior:'instant'});if(s==='board'){if(experimentStatus()==='open')track('leaderboard').catch(()=>{});return refreshCommunity()}}
function focusScreenHeading(){if(screen==='game'&&index<products.length){app.querySelector('[data-vote="yes"]')?.focus({preventScroll:true});return}const heading=app.querySelector('h1,h2');if(!heading)return;heading.tabIndex=-1;heading.focus({preventScroll:true})}
let screenHasRendered=false;
function render(){updateHeader();if(screen==='home')home();else if(screen==='game')game();else if(screen==='edit')personalEdit();else if(screen==='attribution')attribution();else board();if(screenHasRendered||screen!=='home')focusScreenHeading();screenHasRendered=true}

function experimentStatus(){
 if(experiment.closed)return 'closed';
 if(experiment.startsAt&&Date.now()<Date.parse(experiment.startsAt))return 'upcoming';
 if(experiment.endsAt&&Date.now()>=Date.parse(experiment.endsAt))return 'ended';
 return 'open';
}

function updateHeader(){
 if(!experiment)return;
 document.querySelectorAll('[data-suggest-edit]').forEach(trigger=>trigger.hidden=experiment.status==='draft');
 document.body.dataset.screen=screen==='game'&&index<products.length?'rating':screen;
 const button=document.querySelector('header .leaderboard-link'),voting=screen==='game';
 document.querySelector('header').classList.toggle('voting-header',voting);
 button.classList.toggle('profile-link',!voting&&accountSignedIn);
 button.dataset.action=voting?'board':'account';
 button.href=voting?experimentPath+'?board=1':'/account?experiment='+encodeURIComponent(experimentId)+(accountSignedIn?'':'&signin=1');
 const profileName=accountProfile?.displayName||'Vouch member';
 const photo=accountProfile?.photo;
 const safePhoto=typeof photo==='string'&&photo.startsWith('/api/account/photos/');
 const headerContent=voting?'The Board':accountProfile?.verificationRequired?'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg>':accountSignedIn?(safePhoto?'<img src="'+esc(photo)+'" alt="">':'<span aria-hidden="true">'+esc(profileName.trim().charAt(0).toUpperCase()||'V')+'</span>'):'Sign in';
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
 window.VouchSiteNav?.configure({experimentId,experimentPath,category:experiment.category,draft:experiment.status==='draft',voting,searchUrl:q=>apiUrl('/api/products/search?q='+encodeURIComponent(q)),productPath:standingsProductPath,canNominate:experimentStatus()==='open'&&experiment.status!=='draft',nominate:nominateFromNav});
}
async function refreshAccountStatus(){try{const me=await api('/api/account/me');accountSignedIn=!!me.authenticated;accountProfile=me.profile;accountStatusKnown=true}catch{}updateHeader();}
function updateTimers(){
 if(!experiment)return;
 const status=experimentStatus();updateHeader();
 app.querySelectorAll('[data-action="start"]').forEach(b=>b.disabled=status!=='open');
 if(screen==='game'&&status!=='open'){screen='board';board()}
 else if(screen==='board'&&app.dataset.collectionStatus!==status)board();
 else if(screen==='home'&&app.dataset.collectionStatus!==status)home();
}

function hasAnsweredAll(){return products.length>0&&products.every(p=>['yes','no','brand','skip'].includes(state.votes[p.id]))}
function home(){const status=experimentStatus(),finished=hasAnsweredAll(),closed=status==='closed'||status==='ended';app.dataset.collectionStatus=status;app.innerHTML=`<section class="hero"><div class="hero-copy"><h1>${finished&&!closed?'<span>Welcome</span><span>back.</span>':experimentId==='sunscreen'?'Big SPF.<br><em>Bigger opinions.</em>':experimentId==='waterbottle'?'Big sips.<br><em>Bigger opinions.</em>':esc(experiment.title)}</h1><p class="intro">${closed?'Voting has ended. See the community’s final picks.':finished?'Your takes are in.':'Tell us which products you vouch for, then see how your picks stack up.'}</p>${finished&&!closed?'<button class="text-button revisit-takes" data-action="start">Revisit your takes</button>':''}<button class="primary" data-action="${closed||finished?'board':'start'}">${closed?'See the final board':finished?'See the board':'Start vouching'}</button></div><div class="hero-art" aria-label="Featured products"><span class="art-label">${experimentId==='waterbottle'?'The hydration edit':esc(experiment.title)}</span>${products[0].image?`<img src="${esc(products[0].image)}" alt="${esc(products[0].name)}">`:'<span class="product-placeholder" aria-hidden="true">'+brandV()+'</span>'}${products[1]?.image?`<img class="second" src="${esc(products[1].image)}" alt="${esc(products[1].name)}">`:''}<div class="sticker">Worth the<br>hype?</div></div></section><div class="steps"><div>01 <span>Vouch for your favs</span></div><div>02 <span>Add your essentials</span></div><div>03 <span>Reveal the board</span></div></div>`;updateTimers()}
function game(){if(index===products.length){nominationCard();return}const p=products[index],savedVote=state.votes[p.id],savedLabel={yes:'Vouch 👍',brand:'Brand vouch 🤝',no:'Nope 👎',skip:'Skip this one'}[savedVote];app.innerHTML=`<section class="game">${flowProgress()}<article class="product-card">${window.VouchGallery.markup(p,"product-photo")}<div class="product-content"><p class="brand"><strong>${esc(p.brand)}</strong></p><h2 id="voting-product-title"${savedLabel?' aria-describedby="saved-verdict"':''}>${esc(p.name)}</h2><div class="experiment-tags" role="group" aria-label="Your product tags" aria-busy="true">${['Design','Quality','Staple','Value'].map(label=>`<button type="button" data-product-tag="${label.toLowerCase()}" aria-pressed="false" disabled>${label}</button>`).join('')}</div><span class="experiment-tag-status sr-only" role="status" aria-live="polite"></span></div></article>${savedLabel?`<p class="saved-verdict" id="saved-verdict">Your saved answer: <strong>${savedLabel}</strong>. Choose another answer to replace it.</p>`:'<p class="vote-hint">Have you used it, or do you just know the brand?</p>'}<div class="vote-actions"><button class="pass" aria-label="Don’t recommend this item" data-vote="no" aria-pressed="${savedVote==='no'}"><span>Nope 👎</span><small>Wouldn’t recommend</small></button><button class="brand-vouch" aria-label="Trust the brand, haven’t tried this item" data-vote="brand" aria-pressed="${savedVote==='brand'}"><span>Brand vouch 🤝</span><small>Trust the brand only</small></button><button class="vouch" aria-label="Tried it and recommend it" aria-describedby="voting-product-title" data-vote="yes" aria-pressed="${savedVote==='yes'}"><span>Vouch 👍</span><small>Would recommend</small></button></div><button class="skip skip-choice" data-vote="skip" aria-pressed="${savedVote==='skip'}">Skip this one</button></section>`;const announcement=document.getElementById('voting-announcement');if(announcement)announcement.textContent=`Product ${index+1} of ${products.length}`;mountExperimentTags(p);}
function mountExperimentTags(product,host=app,lockCard=true){
 const group=host.querySelector('.experiment-tags'),status=host.querySelector('.experiment-tag-status');
 const id=product.onBoardId||product.skuId||product.id;
 let current=null;
 const paint=()=>{const selected=new Set(current?.selectedTagIds||[]);const count=host.querySelector('[data-tag-count]');if(count){count.textContent=selected.size;count.hidden=!selected.size}group.querySelectorAll('[data-product-tag]').forEach(b=>{b.setAttribute('aria-pressed',String(selected.has(b.dataset.productTag)));b.disabled=experiment.status==='draft'});group.setAttribute('aria-busy','false')};
 const load=async()=>{try{current=await api('/api/products/'+encodeURIComponent(id));if(!group.isConnected)return;paint()}catch{if(!group.isConnected)return;group.setAttribute('aria-busy','false');status.classList.remove('sr-only');status.textContent='Tags could not load. ';const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.onclick=()=>{status.textContent='';status.classList.add('sr-only');load()};status.append(retry)}};
 group.addEventListener('click',async event=>{
  const button=event.target.closest('[data-product-tag]');if(!button||button.disabled||!current)return;
  const selected=new Set(current.selectedTagIds||[]),idToToggle=button.dataset.productTag;
  selected.has(idToToggle)?selected.delete(idToToggle):selected.add(idToToggle);
  group.querySelectorAll('button').forEach(b=>b.disabled=true);group.setAttribute('aria-busy','true');
  // Keep the card in place until its tags finish saving.
  if(lockCard)app.querySelectorAll('[data-vote],[data-action="back"]').forEach(b=>b.disabled=true);
  try{current=await api('/api/products/'+encodeURIComponent(id),{tagIds:[...selected]});status.textContent='Tags saved.';status.classList.add('sr-only')}
  catch(error){status.textContent=error.message+' Tap the tag to retry.';status.classList.remove('sr-only')}
  finally{if(group.isConnected){paint();if(lockCard)app.querySelectorAll('[data-vote],[data-action="back"]').forEach(b=>b.disabled=false)}}
 });
 load();
}
function boardTags(product){
 const id=product.communityNominated?product.skuId:(product.skuId||product.onBoardId||product.id);
 if(!id)return '';
 return `<div class="board-product-tags" data-board-tags="${esc(id)}"><ul class="board-tag-strip" aria-label="Tags" aria-busy="true"></ul><span class="board-tag-status sr-only" role="status" aria-live="polite">Loading tags…</span></div>`;
}
function mountBoardTags(){app.querySelectorAll('[data-board-tags]').forEach(host=>{
 const strip=host.querySelector('.board-tag-strip'),status=host.querySelector('.board-tag-status');
 let current=null,saving=false;
 const paint=()=>{
  const focused=document.activeElement?.dataset.boardTag,plusFocused=document.activeElement?.hasAttribute('data-add-board-tag');
  const selected=new Set(current?.selectedTagIds||[]);
  strip.innerHTML=(current?.tags||[]).map(tag=>`<li><button type="button" class="board-tag-chip${tag.count?' has-votes':''}" data-board-tag="${esc(tag.id)}" aria-pressed="${selected.has(tag.id)}" aria-disabled="${saving}"><span>${esc(tag.label)}</span>${tag.count?`<span class="board-tag-votes">${Number(tag.count)}</span>`:''}</button></li>`).join('')+`<li><button type="button" class="board-tag-add" data-add-board-tag aria-label="Add a tag"><svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 1v10M1 6h10"/></svg></button></li>`;
  strip.setAttribute('aria-busy',String(saving));
  if(focused)Array.from(strip.querySelectorAll('[data-board-tag]')).find(button=>button.dataset.boardTag===focused)?.focus({preventScroll:true});
  else if(plusFocused)strip.querySelector('[data-add-board-tag]').focus({preventScroll:true});
 };
 const load=async()=>{try{current=await api('/api/products/'+encodeURIComponent(host.dataset.boardTags));if(!host.isConnected)return;paint();status.textContent=''}catch{if(!host.isConnected)return;strip.setAttribute('aria-busy','false');status.classList.remove('sr-only');status.textContent='Tags could not load. ';const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.onclick=()=>{status.classList.add('sr-only');status.textContent='Loading tags…';load()};status.append(retry)}};
 host.addEventListener('click',async event=>{
  if(event.target.closest('[data-add-board-tag]')){
   // TODO: Connect a public add-tag flow when one exists. Organizer tools require admin access.
   status.classList.remove('sr-only');status.textContent='Adding custom tags is not available yet.';return;
  }
  const button=event.target.closest('[data-board-tag]');if(!button||!current||saving)return;
  if(experiment.status==='draft'){status.classList.remove('sr-only');status.textContent='Tags can be saved after this collection is approved.';return}
  const previous=current,selected=new Set(current.selectedTagIds||[]),id=button.dataset.boardTag,removing=selected.has(id);
  removing?selected.delete(id):selected.add(id);
  current={...current,selectedTagIds:[...selected],tags:current.tags.map(tag=>tag.id===id?{...tag,count:Math.max(0,Number(tag.count||0)+(removing?-1:1))}:tag)};
  saving=true;paint();status.classList.add('sr-only');status.textContent='Saving tags…';
  try{current=await api('/api/products/'+encodeURIComponent(host.dataset.boardTags),{tagIds:[...selected]});status.textContent='Tags saved.'}
  catch(error){current=previous;status.classList.remove('sr-only');status.textContent=error.message+' Your tag change was undone. Tap to retry.'}
  finally{saving=false;if(host.isConnected)paint()}
 });
 load();
})}
function rankedRow(p,i,isCommunity=false){
 const saved=isCommunity?p.myVote:state.votes[p.id];
 return `<div class="rank-row${isCommunity?' community-row':''}"${!isCommunity?` id="product-${esc(p.id)}"`:''}><div class="rank-topline"><div class="rank-product"><span class="rank">${String(i+1).padStart(2,'0')}</span>${standingsImage(p,isCommunity)}<div class="rank-info">${standingsName(p,isCommunity)}${saved&&saved!=='skip'?`<span class="your-vote">You ${verdictLabel(saved)}</span>`:''}</div></div>${scoreSummary(p)}</div>${boardPeople(p,isCommunity)}${isCommunity&&(!p.myVote||p.myVote==='skip')?`<div class="community-actions">${[['no','Nope 👎','👎'],['brand','Brand vouch 🤝','🤝'],['yes','Vouch 👍','👍'],['skip','Skip this one','🤷']].map(([value,label,emoji])=>`<button data-community="${esc(p.id)}" data-choice="${value}" aria-label="${label}" aria-pressed="${p.myVote===value}"><span class="community-action-label" aria-hidden="true">${label}</span><span class="community-action-emoji" aria-hidden="true">${emoji}</span></button>`).join('')}</div>`:''}</div>`;
}
function board(){updateHeader();const restoreHeadingFocus=document.activeElement===app.querySelector('h1');app.dataset.collectionStatus=experimentStatus();const sorted=[...products.map(p=>({...p,...baseBoard[p.id]})),...communityProducts].sort((a,b)=>Number(b.score??-1)-Number(a.score??-1));const n=state.nomination;app.innerHTML=`<section class="board"><div class="board-head"><p class="eyebrow">VOUCH / ${esc(experiment.title)}</p><h1>The Board</h1><p>Rankings reflect the collective pool of item vouches, brand trust and don’t-recommend responses from everyone who voted.</p></div><div class="board-topline"><span>PRODUCT</span><span>VOUCH SCORE</span></div>${sorted.map((p,i)=>p.communityNominated?communityCard(p,i):rankedRow(p,i)).join('')}${experimentStatus()==='open'&&experiment.status!=='draft'?'<button type="button" class="board-vouch-card" data-vouch-search>'+window.VouchSiteNav.emblemMarkup+'<span>Missing your favorite? Vouch for it</span></button>':''}${experiment.status==='draft'?'':window.VouchCategories?.section()||''}${experiment.status==='draft'?'':window.VouchSuggestions?.card()||''}${experiment.status==='draft'?'<p>Organizer preview · Voting opens after approval.</p>':experimentStatus()!=='open'?'<p>'+ (experimentStatus()==='upcoming'?'Voting has not started yet.':'Voting has ended. Results remain available.')+' Nominations and voting are paused.</p>':nominationView()}${accountSignedIn?`<p class="collection-sync-notice" role="status">${profileSyncState==='saved'||accountProfile?.browserProfile?'Your picks are saved to your collection.':'Review these products to save any picks missing from your collection.'} <a href="/account?experiment=${encodeURIComponent(experimentId)}${profileSyncState==='saved'||accountProfile?.browserProfile?'':'&review=1'}">${profileSyncState==='saved'||accountProfile?.browserProfile?'View my collection':'Review and save picks'} →</a></p>`:''}<div class="board-bottom"><button class="text-button" data-action="start">${Object.keys(state.votes).length?'Revisit your takes':'Start vouching'}</button></div></section>`;if(experimentStatus()!=='open'){app.querySelectorAll('[data-community],[data-action="start"]').forEach(b=>b.disabled=true)}else{mountNomination();watchEnd()}window.VouchSuggestions?.mount(app);if(experiment.status!=='draft')window.VouchCategories?.mount(app,{exclude:experimentId,limit:3});mountBoardPeople();updateTimers();if(restoreHeadingFocus)focusScreenHeading()}
document.addEventListener('click',async e=>{const communityButton=e.target.closest('[data-community]');if(communityButton){const group=communityButton.closest('.community-actions');group.querySelectorAll('button').forEach(b=>b.disabled=true);try{const data=await api('/api/community/vote',{productId:communityButton.dataset.community,value:communityButton.dataset.choice});invalidateProductVouchers(communityProducts.find(p=>p.id===communityButton.dataset.community));communityProducts=data.products;board()}catch(error){report(error);group.querySelectorAll('button').forEach(b=>b.disabled=false)}return}const vote=e.target.closest('[data-vote]');if(vote){const productId=products[index].id;const value=vote.dataset.vote;const buttons=[...app.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await track('answer',{productId,value})}catch{buttons.forEach(b=>b.disabled=false);return}invalidateProductVouchers(products[index]);state.votes[productId]=value;save();index++;render();window.scrollTo({top:0,behavior:'instant'});return}const action=e.target.closest('[data-action]')?.dataset.action;if(!experiment||experimentStatus()!=='open'&&action==='start')return;if(action&&e.target.closest('a'))e.preventDefault();if(action==='account'){location.assign('/account?experiment='+encodeURIComponent(experimentId)+(accountSignedIn?'':'&signin=1'));return}if(action==='home')go('home');if(action==='board'){if(screen==='game'&&index===products.length){document.getElementById('nomination-form')?.requestSubmit();return}go('board')};if(action==='edit')go('edit');if(action==='start'){try{await track('start')}catch{return}index=0;go('game')}if(action==='back'){index=Math.max(0,index-1);render()}});
document.getElementById('prototype').onclick=()=>document.getElementById('info').showModal();document.getElementById('reset').onclick=()=>{document.getElementById('info').close();go('home')};
async function overall(){
  screen='overall';updateHeader();app.innerHTML='<section class="board"><h1>The overall board.</h1><p>Loading results…</p></section>';
  try{const data=await api('/api/overall');app.innerHTML='<section class="board"><h1>The overall board.</h1><p>Rankings reflect the collective pool of item vouches, brand trust and don’t-recommend responses across included collections. Each browser contributes one latest verdict per product across those collections.</p>'+data.products.map((p,i)=>rankedRow(p,i,!!p.communityNominated)).join('')+(data.products.length?'':'<p>No collections have been included yet.</p>')+(window.VouchSuggestions?.card()||'')+'</section>';mountBoardPeople();window.VouchSuggestions?.mount(app)}catch(error){report(error)}
}
document.getElementById('overall').onclick=()=>{history.replaceState(null,'',experimentPath+'?overall=1');overall()};
async function boot(){
  app.innerHTML='<section class="board"><p role="status">Loading products…</p></section>';
  try{
    experiment=(await api('/api/experiment')).experiment;products=experiment.products;
    document.title='Vouch — '+experiment.title;
    if(experiment.status==='draft'){screen='board';await refreshCommunity();render();app.querySelectorAll('button').forEach(b=>b.disabled=true);return;}
    await refreshAccountStatus();
    document.getElementById('experiment-info').textContent='This collection contains '+products.length+' products. Responses and nominations stay within this collection. Only collections explicitly included by the organizer contribute to the overall board.';
    if(new URLSearchParams(location.search).has('overall')){await overall();return}
    if(new URLSearchParams(location.search).has('board')){screen='board';await refreshCommunity();render();return}
    if(experimentStatus()!=='open'){screen='home';await refreshCommunity();render();return}
    await track('visit');await refreshCommunity();
    if(new URLSearchParams(location.search).get('start')==='1'){await track('start');index=0;go('game');return}
    render();
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

function attribution(){
 app.innerHTML=`<section class="attribution-step"><p class="eyebrow">YOUR PICKS, YOUR NAME</p><h1>Make these<br>vouches yours.</h1><p class="attribution-intro">Save your picks with your email, then see the rankings. You can verify your account later to open your profile and history.</p><form id="attribution-email-form" autocomplete="on"><label for="attribution-email">Email address</label><input id="attribution-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="254" required aria-describedby="attribution-email-help"><p id="attribution-email-help" class="attribution-help">At Wharton? Use your @wharton.upenn.edu email. Your email stays private.</p><button class="primary" type="submit">Save and see rankings</button><p class="attribution-error" role="alert" data-email-error hidden></p></form><button class="attribution-rankings" type="button" data-skip-attribution>See the rankings</button><p class="attribution-privacy">Your responses are already saved. Creating an account is optional.</p></section>`;
 app.querySelector('#attribution-email-form').onsubmit=async event=>{
  event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]'),errorMessage=form.querySelector('[data-email-error]');
  if(button.disabled)return;
  button.disabled=true;button.textContent='Saving…';errorMessage.hidden=true;
  try{
   await api('/api/account/save-email',{email:form.elements.email.value.trim()});
   try{sessionStorage.removeItem('vouch-email-attempt')}catch{}
   await refreshAccountStatus();state.attributionDismissed=true;save();await go('board');
  }catch(error){button.disabled=false;button.textContent='Save and see rankings';errorMessage.textContent=error.message;errorMessage.hidden=false;}
 };
 app.querySelector('[data-skip-attribution]').onclick=()=>{state.attributionDismissed=true;save();go('board')};
}

function personalOpinions(){return [...products.map(p=>({...p,myVote:state.votes[p.id]})),...communityProducts].filter(p=>['yes','no','brand'].includes(p.myVote))}
function personalEdit(){const opinions=personalOpinions(),counts={yes:0,no:0,brand:0};for(const p of opinions)counts[p.myVote]++;app.innerHTML=`<section class="personal-edit"><p class="eyebrow">YOUR TASTE, TOGETHER</p><h1>${opinions.length?'Your picks are ready.':'Your collection starts here.'}</h1><p class="personal-edit-intro">${opinions.length?'You’ve started a collection of products you vouch for, ones you pass on, and brands you trust. Save it to your Vouch account and build on it with your next collection.':'No product opinions this time? You can still create a Vouch account and start building your collection in a future collection.'}</p><div class="edit-counts"><span><strong>${counts.yes}</strong> item vouch${counts.yes===1?'':'es'}</span><span><strong>${counts.no}</strong> ${counts.no===1?'pass':'passes'}</span><span><strong>${counts.brand}</strong> brand endorsement${counts.brand===1?'':'s'}</span></div>${opinions.length?'<div class="personal-edit-products">'+opinions.map(p=>`<article class="personal-edit-product">${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy">`:'<span class="community-icon" aria-hidden="true">'+brandV()+'</span>'}<div><p class="brand">${esc(p.brand||'')}</p><h2>${esc(p.name)}</h2><p class="your-vote">${esc(verdictLabel(p.myVote))}</p></div></article>`).join('')+'</div>':''}<div class="personal-edit-claim"><h2>Make these picks yours.</h2><p>Save your collection across devices. You’ll choose what to keep and what becomes public after signing in.</p><a class="primary" href="/account?experiment=${encodeURIComponent(experimentId)}&review=1">${opinions.length?'Save my picks':'Create my account'}</a><button class="text-button" data-action="board">Continue to community results →</button><p class="caption">Your experiment responses are already saved. Creating an account is optional.</p></div></section>`;}


function scoreColor(value){if(value===null||value===undefined||value==='')return 'unrated';const n=Number(value);if(!Number.isFinite(n))return 'unrated';return n>=8?'score-green':n>=6.5?'score-black':n>=5?'score-yellow':'score-red'}
function standingsProductId(p,isCommunity=false){return isCommunity?p.skuId:(p.skuId||p.onBoardId||p.id)}
function standingsProductPath(p,isCommunity=false){const id=standingsProductId(p,isCommunity);return id?'/products/'+encodeURIComponent(id)+'?experiment='+encodeURIComponent(experimentId):null}
function standingsImage(p,isCommunity=false){const href=standingsProductPath(p,isCommunity),image=p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`:'<span class="community-icon" aria-hidden="true">'+brandV()+'</span>';return href?`<a class="rank-image-link" href="${href}" aria-label="See who vouched for ${esc(p.name)}">${image}</a>`:image}
function standingsName(p,isCommunity=false){const href=standingsProductPath(p,isCommunity),brand=esc(p.brand||''),name=esc(p.name);return `<p class="brand">${href?`<a href="${href}">${brand}</a>`:brand}${p.communityNominated?'<span class="community-tag">Community Nominated</span>':''}</p><h3>${href?`<a href="${href}">${name}</a>`:name}</h3>`}


async function nominateFromNav(product,query=''){
 if(experimentStatus()!=='open'||experiment.status==='draft')return;
 nominationDraft=query||[product?.brand,product?.name].filter(Boolean).join(' ');
 if(product){selectedNominations??=(state.nominations||[]).map(n=>({name:n.name,product:n.product}));if(!selectedNominations.some(n=>n.product?.id===product.id)&&selectedNominations.length<50)selectedNominations.push({name:[product.brand,product.name].filter(Boolean).join(' '),product});}
 await go('board');document.getElementById('nominate')?.scrollIntoView({block:'start',behavior:'instant'});document.getElementById('nomination-name')?.focus({preventScroll:true});
}

function boardPeople(product,isCommunity){const id=standingsProductId(product,isCommunity);return id?`<div class="board-people" data-board-people="${esc(id)}" data-path="${esc(standingsProductPath(product,isCommunity))}" aria-busy="true"><span class="account-help">Finding people who vouch…</span></div>`:'';}
async function mountBoardPeople(){
 const hosts=[...app.querySelectorAll('[data-board-people]')];if(!hosts.length)return;
 const ids=[...new Set(hosts.map(h=>h.dataset.boardPeople))];
 const load=async batch=>{
  try{const query=new URLSearchParams();batch.forEach(id=>query.append('id',id));const data=await api('/api/people-summary?'+query);
   for(const host of hosts.filter(h=>batch.includes(h.dataset.boardPeople))){if(!host.isConnected)continue;const summary=data.summaries[host.dataset.boardPeople];
    host.innerHTML=summary?.total?`<div class="board-people-avatars">${summary.people.map((p,i)=>window.VouchPeople.avatar(p,i,{className:'board-person'})).join('')}</div><a class="board-people-link" href="${esc(host.dataset.path.split('#')[0]+'#item-people')}">${summary.people[0]?.isYou?'You':esc(window.VouchPeople.shortName(summary.people[0].displayName))}${summary.total>1?' + '+(summary.total-1)+' others':''} vouch${summary.total===1&&!summary.people[0]?.isYou?'es':''} <span aria-hidden="true">→</span></a>`:'<span class="account-help">No named vouches yet</span>';
    host.setAttribute('aria-busy','false');
   }
  }catch{for(const host of hosts.filter(h=>batch.includes(h.dataset.boardPeople))){if(!host.isConnected)continue;host.setAttribute('aria-busy','false');host.innerHTML='<button class="text-button" type="button">People could not load. Retry</button>';host.querySelector('button').onclick=()=>load(batch);}}
 };
 for(let i=0;i<ids.length;i+=100)await load(ids.slice(i,i+100));
}
