const experimentId=decodeURIComponent(location.pathname.split('/').filter(Boolean)[0]||'');
const experimentPath='/'+encodeURIComponent(experimentId);
const initialRoute=new URLSearchParams(location.search);
const whartonFlow=initialRoute.get('wharton')==='1';
document.querySelector('footer a[href="/account"]')?.setAttribute('href','/account?experiment='+encodeURIComponent(experimentId));
let demoId=null,demoStorageLoaded=false;
let experiment=null,products=[],accountSignedIn=false,accountStatusKnown=false,accountProfile=null;
const KEY='vouch-experiment-'+experimentId;
const initial=()=>({votes:{},nomination:null});
let state;try{state=JSON.parse(localStorage.getItem(KEY))||initial()}catch{state=initial()}
let communityProducts=[],baseBoard={};
let ratingUnlock=null;
let screen=null,index=0;const app=document.getElementById('app');
let trackingQueue=Promise.resolve(),profileSyncState=null,resumeAnswers=null;
function apiUrl(path){const u=new URL(path,location.origin);u.searchParams.set('experiment',experimentId);if(new URLSearchParams(location.search).get('preview')==='1')u.searchParams.set('preview','1');return u.pathname+u.search}
async function api(url,payload){if(experiment?.status==='draft'&&payload)throw Error('This is a private draft. Approve it before voting.');const response=await fetch(apiUrl(url),{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined,credentials:'same-origin'});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Could not save. Please try again.'),{experimentSaved:result.experimentSaved});if(result.profileSync){profileSyncState=result.profileSync;accountSignedIn=result.profileSync!=='signed-out';accountStatusKnown=true;}return result}
function report(error){let notice=document.getElementById('save-error');if(!notice){notice=document.createElement('p');notice.id='save-error';notice.className='save-error';notice.setAttribute('role','alert');app.prepend(notice)}notice.textContent=error.message+(error.experimentSaved?'':' Your response has not been saved.')}
function track(type,extra={}){if(demoId)return Promise.resolve();const job=trackingQueue.then(()=>api('/api/events',{type,...extra}));trackingQueue=job.catch(error=>{if(type!=='leaderboard')report(error)});return job}
function watchEnd(){const section=document.getElementById('nominate');if(!section)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){track('end_seen').catch(()=>{});observer.disconnect()}},{threshold:0.25});observer.observe(section)}

function readDemoState(id){
 try{const saved=JSON.parse(sessionStorage.getItem('demo:vouch-experiment-'+id));if(saved?.id===demoId)return saved.state}catch{}
 return initial();
}
function demoParticipation(category){
 const votes=(category.id===experimentId?state:readDemoState(category.id)).votes;
 const answeredProductIds=Object.keys(votes);
 const done=category.id===experimentId?hasAnsweredAll():answeredProductIds.length>=category.productCount;
 return {answeredProductIds,status:done?'done':answeredProductIds.length?'partial':'new'};
}
function save(){try{
 if(demoId)sessionStorage.setItem('demo:'+KEY,JSON.stringify({id:demoId,state}));
 else localStorage.setItem(KEY,JSON.stringify(state));
}catch{}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function loadCommunity(){await trackingQueue;const [community,boardData,me]=await Promise.all([api('/api/community'),api('/api/board'),api('/api/me')]);if(!demoId){state.comments=me.comments||{};for(const product of products){const opinion=accountProfile?.opinions?.find(o=>o.productId===(product.skuId||product.onBoardId||product.id));if(opinion)state.comments[product.id]=opinion.comment||'';}state.nominations=me.nominations||[];state.nomination=me.nomination;}communityProducts=community.products.map(p=>demoId?{...p,myVote:state.communityVotes?.[p.id]||null}:p);baseBoard=Object.fromEntries(boardData.products.map(p=>[p.id,p]));if(!demoId)state.votes=Object.fromEntries(boardData.products.filter(p=>p.myVote).map(p=>[p.id,p.myVote]));save();}
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
function go(s){
 if(s==='board'&&hasAnsweredAll()&&!demoId&&!accountProfile&&!state.attributionDismissed&&experiment?.status!=='draft'&&experimentStatus()==='open')s='attribution';
 const query=new URLSearchParams();
 if(experiment?.status==='draft')query.set('preview','1');
 if(whartonFlow)query.set('wharton','1');
 if(s==='board')query.set('board','1');
 history.replaceState(null,'',experimentPath+(query.size?'?'+query:''));
 if(s!=='game')document.getElementById('voting-announcement').textContent='';
 window.scrollTo({top:0,behavior:'instant'});
 if(s==='board')return openBoard({record:experimentStatus()==='open'});
 showScreen(s);
}
function showScreen(target,{reveal=false}={}){
 screen=target;
 render();
 if(reveal)window.VouchPageLoading.reveal(app);
}
function showLoading(label){
 disconnectBoardDock?.();
 screen=null;
 delete document.body.dataset.screen;
 document.querySelector('header').classList.remove('voting-header');
 document.querySelector('.header-label').hidden=true;
 document.getElementById('landing-standings').hidden=true;
 window.VouchPageLoading.show(app,label);
}
function loadError(title,error,retry){
 screen=null;
 app.innerHTML='<section class="board"><h1>'+esc(title)+'</h1><p role="alert">'+esc(error.message)+'</p><button class="primary" id="retry-load">Try again</button></section>';
 document.getElementById('retry-load').onclick=retry;
 focusScreenHeading();
}
async function openBoard({record=false}={}){
 showLoading('Opening the Board…');
 try{
  await loadCommunity();
  showScreen('board',{reveal:true});
  if(experiment.status==='draft')app.querySelectorAll('button').forEach(button=>button.disabled=true);
  if(record)track('leaderboard').catch(()=>{});
 }catch(error){loadError('Could not open the Board.',error,()=>openBoard({record}));}
}
function focusScreenHeading(){if(screen==='game'&&index<products.length){app.querySelector('[data-vote="yes"]')?.focus({preventScroll:true});return}const heading=app.querySelector('h1,h2');if(!heading)return;heading.tabIndex=-1;heading.focus({preventScroll:true})}
let screenHasRendered=false;
function render(){if(screen!=='board')disconnectBoardDock?.();updateHeader();if(screen==='home')home();else if(screen==='game')game();else if(screen==='edit')personalEdit();else if(screen==='attribution')attribution();else board();if(screenHasRendered||screen!=='home')focusScreenHeading();screenHasRendered=true}

function experimentStatus(){
 if(experiment.closed)return 'closed';
 if(experiment.startsAt&&Date.now()<Date.parse(experiment.startsAt))return 'upcoming';
 if(experiment.endsAt&&Date.now()>=Date.parse(experiment.endsAt))return 'ended';
 return 'open';
}

function updateHeader(){
 if(!experiment)return;
 document.querySelectorAll('[data-suggest-edit]').forEach(trigger=>trigger.hidden=!!demoId||experiment.status==='draft');
 document.body.dataset.screen=screen==='game'&&index<products.length?'rating':screen;
 const voting=screen==='game';
 document.querySelector('header').classList.toggle('voting-header',voting);
 const footerLink=document.getElementById('landing-standings');
 footerLink.hidden=screen!=='home'||hasAnsweredAll()||experimentStatus()!=='open';
 footerLink.href=experimentPath+'?board=1';
 document.querySelector('.header-label').hidden=voting||!experiment.endsAt||experimentStatus()!=='open';
 const active=!voting&&experimentStatus()==='open'&&experiment.endsAt;
 let timing='';
 if(active){const seconds=Math.max(0,Math.ceil((Date.parse(experiment.endsAt)-Date.now())/1000)),days=Math.floor(seconds/86400);const remaining=(days?days+'d ':'')+[Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');timing=`<span class="header-countdown" role="timer" aria-live="off" aria-label="Time remaining"><span aria-hidden="true"> | </span>${remaining} left</span>`}
 document.querySelector('.header-label').innerHTML=`${timing}`;
 window.VouchSiteNav?.configure({experimentId,experimentPath,category:experiment.category,draft:experiment.status==='draft',voting,searchUrl:q=>apiUrl('/api/products/search?q='+encodeURIComponent(q)),productPath:standingsProductPath,canNominate:!demoId&&experimentStatus()==='open'&&experiment.status!=='draft',nominate:nominateFromNav});
}
let accountRefresh=0;
async function refreshAccountStatus(){
 const sequence=++accountRefresh;
 let me;
 try{me=await api('/api/account/me')}catch{return;}
 if(sequence!==accountRefresh)return;
 if(me.demo&&!demoStorageLoaded){demoId=me.demoId;demoStorageLoaded=true;state=readDemoState(experimentId);}
 accountSignedIn=!!me.authenticated;
 accountProfile=me.profile;
 accountStatusKnown=true;
 window.VouchSiteNav?.presentAccount(me,{experimentId});
}
function updateTimers(){
 if(!experiment||!screen)return;
 const status=experimentStatus();updateHeader();
 app.querySelectorAll('[data-action="start"]').forEach(b=>b.disabled=status!=='open');
 if(screen==='game'&&status!=='open'){screen='board';board()}
 else if(screen==='board'&&app.dataset.collectionStatus!==status)board();
 else if(screen==='home'&&app.dataset.collectionStatus!==status)home();
}

function hasAnsweredAll(){return products.length>0&&products.every(p=>['yes','no','brand','skip'].includes(state.votes[p.id]))}
function home(){const status=experimentStatus(),finished=hasAnsweredAll(),closed=status==='closed'||status==='ended';app.dataset.collectionStatus=status;app.innerHTML=`<section class="hero"><div class="hero-copy"><h1>${finished&&!closed?'<span>Welcome</span><span>back.</span>':experimentId==='sunscreen'?'Big SPF.<br><em>Bigger opinions.</em>':experimentId==='waterbottle'?'Big sips.<br><em>Bigger opinions.</em>':esc(experiment.title)}</h1><p class="intro">${closed?'Voting has ended. See the community’s final picks.':finished?'Your takes are in.':'Tell us which products you vouch for, then see how your picks stack up.'}</p>${finished&&!closed?'<button class="text-button revisit-takes" data-action="start">Revisit your takes</button>':''}<button class="primary" data-action="${closed||finished?'board':'start'}">${closed?'See the final board':finished?'See the board':'Start vouching'}</button></div><div class="hero-art" aria-label="Featured products"><span class="art-label">${experimentId==='waterbottle'?'The hydration edit':esc(experiment.title)}</span>${products[0].image?`<img src="${esc(products[0].image)}" alt="${esc(products[0].name)}">`:'<span class="product-placeholder" aria-hidden="true">'+brandV()+'</span>'}${products[1]?.image?`<img class="second" src="${esc(products[1].image)}" alt="${esc(products[1].name)}">`:''}<div class="sticker">Worth the<br>hype?</div></div></section><div class="steps"><div>01 <span>Vouch for your favs</span></div><div>02 <span>Add your essentials</span></div><div>03 <span>Reveal the board</span></div></div>`;updateTimers()}
function game(){if(index===products.length){if(demoId){go('board');return}nominationCard();return}const p=products[index],savedVote=state.votes[p.id],savedLabel={yes:'Vouch 👍',brand:'Brand vouch 🤝',no:'Nope 👎',skip:'Skip this one'}[savedVote];app.innerHTML=`<section class="game">${flowProgress()}<article class="product-card">${window.VouchGallery.markup(p,"product-photo")}<div class="product-content"><p class="brand"><strong>${esc(p.brand)}</strong></p><h2 id="voting-product-title"${savedLabel?' aria-describedby="saved-verdict"':''}>${esc(p.name)}</h2><div class="experiment-tags" role="group" aria-label="Your product tags" aria-busy="true">${['Design','Quality','Staple','Value'].map(label=>`<button type="button" data-product-tag="${label.toLowerCase()}" aria-pressed="false" disabled>${label}</button>`).join('')}</div><span class="experiment-tag-status sr-only" role="status" aria-live="polite"></span></div><div class="rating-note"><label for="rating-comment" class="sr-only">Note about this product (optional)</label><div class="rating-note-field"><svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor"><path d="m4 13 9-9 3 3-9 9-4 1zM11 6l3 3"/></svg><textarea id="rating-comment" maxlength="240" rows="1" placeholder="Add a note for others…" aria-describedby="rating-comment-count">${esc(state.comments?.[p.id]||'')}</textarea><span class="rating-note-optional">optional</span></div><div class="rating-note-help" hidden><span id="rating-comment-count" data-note-count></span></div></div></article>${savedLabel?`<p class="saved-verdict" id="saved-verdict">Your saved answer: <strong>${savedLabel}</strong>. Choose another answer to replace it.</p>`:'<p class="vote-hint">Have you used it, or do you just know the brand?</p>'}<div class="vote-actions"><button class="pass" aria-label="Don’t recommend this item" data-vote="no" aria-pressed="${savedVote==='no'}"><span>Nope 👎</span><small>Wouldn’t recommend</small></button><button class="brand-vouch" aria-label="Trust the brand, haven’t tried this item" data-vote="brand" aria-pressed="${savedVote==='brand'}"><span>Brand vouch 🤝</span><small>Trust the brand only</small></button><button class="vouch" aria-label="Tried it and recommend it" aria-describedby="voting-product-title" data-vote="yes" aria-pressed="${savedVote==='yes'}"><span>Vouch 👍</span><small>Would recommend</small></button></div><button class="skip skip-choice" data-vote="skip" aria-pressed="${savedVote==='skip'}">Skip this one</button></section>`;const announcement=document.getElementById('voting-announcement');if(announcement)announcement.textContent=`Product ${index+1} of ${products.length}`;mountExperimentTags(p);mountInlineNote();}
function mountExperimentTags(product,host=app,lockCard=true){
 if(demoId){host.querySelector('.experiment-tags')?.remove();return;}
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
function rankedRow(p,i,isCommunity=false){
 const saved=isCommunity?p.myVote:state.votes[p.id];
 return `<div class="rank-row${isCommunity?' community-row':''}"${!isCommunity?` id="product-${esc(p.id)}"`:''}><div class="rank-topline"><div class="rank-product"><span class="rank">${String(i+1).padStart(2,'0')}</span>${standingsImage(p,isCommunity)}<div class="rank-info">${standingsName(p,isCommunity)}${saved&&saved!=='skip'?`<span class="your-vote" data-board-own-vote="${esc(saved)}">You ${verdictLabel(saved)}</span>`:''}</div></div>${scoreSummary(p)}</div>${boardPeople(p,isCommunity)}${isCommunity&&(!p.myVote||p.myVote==='skip')?`<div class="community-actions">${[['no','Nope 👎','👎'],['brand','Brand vouch 🤝','🤝'],['yes','Vouch 👍','👍'],['skip','Skip this one','🤷']].map(([value,label,emoji])=>`<button data-community="${esc(p.id)}" data-choice="${value}" aria-label="${label}" aria-pressed="${p.myVote===value}"><span class="community-action-label" aria-hidden="true">${label}</span><span class="community-action-emoji" aria-hidden="true">${emoji}</span></button>`).join('')}</div>`:''}</div>`;
}
let pilotPulse=null,disconnectBoardDock;
function board(){disconnectBoardDock?.();pilotPulse?.disconnect();updateHeader();const restoreHeadingFocus=document.activeElement===app.querySelector('h1');app.dataset.collectionStatus=experimentStatus();const sorted=[...products.map(p=>({...p,...baseBoard[p.id]})),...communityProducts].sort((a,b)=>Number(b.score??-1)-Number(a.score??-1));const chips=experiment.status!=='draft'&&window.VouchBoardCategories?.markup(experiment)||'';
const pilotBoard=whartonFlow&&accountSignedIn&&accountProfile?.whartonEmailVerified&&!!chips;app.innerHTML=`<section class="board"><div class="board-head"><p class="eyebrow">VOUCH / ${esc(experiment.title)}</p>${chips?'<div class="pilot-board-title"><h1>The Board</h1><span data-winner-share></span></div>':'<h1>The Board</h1>'}<p>Rankings reflect the collective pool of item vouches, brand trust and don’t-recommend responses from everyone who voted.</p></div>${chips}<div class="board-topline"><span>PRODUCT</span><span>VOUCH SCORE</span></div>${sorted.map((p,i)=>p.communityNominated?communityCard(p,i):rankedRow(p,i)).join('')}${experimentStatus()==='open'&&experiment.status!=='draft'&&!demoId?'<button type="button" class="board-vouch-card" data-vouch-search>'+window.VouchSiteNav.emblemMarkup+'<span>Missing your favorite? Vouch for it</span></button>':''}${experiment.status==='draft'?'':window.VouchCategories?.section()||''}${experiment.status==='draft'?'<p>Organizer preview · Voting opens after approval.</p>':experimentStatus()!=='open'?'<p>'+ (experimentStatus()==='upcoming'?'Voting has not started yet.':'Voting has ended. Results remain available.')+' Nominations and voting are paused.</p>':demoId?'<p>Demo mode · Your vouches are only visible to you during this session.</p>':nominationView()}${accountSignedIn?`<p class="collection-sync-notice" role="status">${profileSyncState==='saved'||accountProfile?.browserProfile?'Your picks are saved to your collection.':'Review these products to save any picks missing from your collection.'} <a href="/account?experiment=${encodeURIComponent(experimentId)}${profileSyncState==='saved'||accountProfile?.browserProfile?'':'&review=1'}">${profileSyncState==='saved'||accountProfile?.browserProfile?'View my collection':'Review and save picks'} →</a></p>`:''}<div class="board-bottom"><button class="text-button" data-action="start">${Object.keys(state.votes).length?'Revisit your takes':'Start vouching'}</button></div>${experiment.status!=='draft'?'<div data-board-dock></div>':''}</section>`;if(experimentStatus()!=='open'){app.querySelectorAll('[data-community],[data-action="start"]').forEach(b=>b.disabled=true)}else if(!demoId){mountNomination();watchEnd()}if(!demoId)window.VouchSuggestions?.mount(app);if(experiment.status!=='draft')window.VouchCategories?.mount(app,{exclude:experimentId,limit:3});
const dockHost=app.querySelector('[data-board-dock]');
const demoPilot=!!demoId&&whartonFlow&&!!chips;
let dockTracked=false;
const showDock=async(data)=>{
  const {mountBoardDock}=await import('/board-dock.js');
  if(!dockHost?.isConnected)return;
  disconnectBoardDock?.();
  const boardProductIds=new Set([...products.map(product=>standingsProductId(product)),
    ...communityProducts.map(product=>standingsProductId(product,true))].filter(Boolean));
  const hasTake=personalOpinions().length>0||(!demoId&&accountSignedIn&&accountProfile?.opinions?.some(opinion=>
    ['yes','no','brand'].includes(opinion.verdict)&&(opinion.experimentId===experimentId||boardProductIds.has(opinion.productId))));
  disconnectBoardDock=mountBoardDock(dockHost,data,{
    experiment,products,profile:accountSignedIn?accountProfile:null,demo:demoPilot,hasTake,
    canStart:experimentStatus()==='open'&&!demoId&&!Object.keys(state.votes).length,
    onShown:state=>{
      if(dockTracked)return;
      dockTracked=true;
      window.VouchPilot.track('next_step_shown',{state,experimentId});
    }
  });
};
const showEveryday=()=>showDock().catch(console.error);
if(dockHost&&!pilotBoard&&!demoPilot)showEveryday();
window.VouchBoardCategories?.mount(app,experiment,{whartonFlow,demoParticipation:demoPilot?demoParticipation:null,
  onError:pilotBoard||demoPilot?showEveryday:undefined,
  onLoaded:demoPilot||pilotBoard?async({items,states,pilot,available})=>{
    if(!demoPilot&&!pilot){showEveryday();return}
    let dockStates=states;
    if(!demoPilot&&Object.values(states).some(state=>state.status==='done')){
      const {categoriesUnlocked,participation,unlockableCategories}=await import('/wharton-categories.js');
      if(!categoriesUnlocked(accountProfile)){
        const others=unlockableCategories(available).filter(category=>!states[category.id]);
        dockStates={...states,...await participation(others)};
      }
    }
    await showDock({items,states:dockStates,pilot,available});
    if(demoPilot||!Object.values(states).some(state=>state.status==='done'))return;
    const {mountPulse}=await import('/pilot-pulse.js');
    if(dockHost.isConnected)pilotPulse=mountPulse(app,{pilot,experimentId,handle:accountProfile.handle,existing:pilotPulse});
  }:undefined
});
const [top,runnerUp]=sorted,winnerHost=app.querySelector('[data-winner-share]');
const winnerId=top&&standingsProductId(top,!!top.communityNominated);
mountBoardPeople(experiment.status!=='draft'&&winnerId?summaries=>{
  if(Object.hasOwn(summaries,winnerId))window.VouchShare?.mountWinner(winnerHost,{top,runnerUp,publicCount:summaries[winnerId].total,experiment}).catch(()=>{});
}:undefined);updateTimers();if(restoreHeadingFocus)focusScreenHeading()}
document.addEventListener('click',async e=>{const communityButton=e.target.closest('[data-community]');if(communityButton){if(demoId){const {community:id,choice}=communityButton.dataset;const product=communityProducts.find(p=>p.id===id);if(product){(state.communityVotes??={})[id]=choice;product.myVote=choice;save();board()}return;}const group=communityButton.closest('.community-actions');group.querySelectorAll('button').forEach(b=>b.disabled=true);try{const data=await api('/api/community/vote',{productId:communityButton.dataset.community,value:communityButton.dataset.choice});invalidateProductVouchers(communityProducts.find(p=>p.id===communityButton.dataset.community));communityProducts=data.products;board()}catch(error){report(error);group.querySelectorAll('button').forEach(b=>b.disabled=false)}return}const vote=e.target.closest('[data-vote]');if(vote){const productId=products[index].id;const value=vote.dataset.vote;const buttons=[...app.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await track('answer',{productId,value,comment:app.querySelector('#rating-comment')?.value||''})}catch{buttons.forEach(b=>b.disabled=false);return}invalidateProductVouchers(products[index]);state.votes[productId]=value;state.comments??={};state.comments[productId]=value==='skip'?'':app.querySelector('#rating-comment')?.value||'';save();index++;while(resumeAnswers&&index<products.length&&resumeAnswers.has(products[index].id))index++;render();window.scrollTo({top:0,behavior:'instant'});return}const action=e.target.closest('[data-action]')?.dataset.action;if(action==='home'){
 const path=demoId?'/wharton':homePathFor(accountSignedIn?accountProfile:null);
 if(path){
  e.target.closest('.wordmark').disabled=true;
  await trackingQueue;
  location.assign(path);
  return;
 }
}
if(!experiment||!screen||experimentStatus()!=='open'&&action==='start')return;if(action&&e.target.closest('a'))e.preventDefault();if(action==='home')go('home');if(action==='board'){if(screen==='game'&&index===products.length){document.getElementById('nomination-form')?.requestSubmit();return}go('board')};if(action==='edit')go('edit');if(action==='start'){try{await track('start')}catch{return}index=0;go('game')}if(action==='back'){index=Math.max(0,index-1);render()}});
document.getElementById('prototype').onclick=()=>document.getElementById('info').showModal();document.getElementById('reset').onclick=()=>{document.getElementById('info').close();go('home')};
async function overall(){
 showLoading('Opening the overall board…');
 try{
  const data=await api('/api/overall');
  screen='overall';updateHeader();
  app.innerHTML='<section class="board"><h1>The overall board.</h1><p>Rankings reflect the collective pool of item vouches, brand trust and don’t-recommend responses across included collections. Each browser contributes one latest verdict per product across those collections.</p>'+data.products.map((p,i)=>rankedRow(p,i,!!p.communityNominated)).join('')+(data.products.length?'':'<p>No collections have been included yet.</p>')+'<div data-pilot-next></div></section>';
  window.VouchPageLoading.reveal(app);focusScreenHeading();mountBoardPeople();
  const host=app.querySelector('[data-pilot-next]');
  import('/pilot-next.js').then(({mountNext})=>{if(host.isConnected)mountNext(host,{profile:accountProfile})}).catch(()=>{});
 }catch(error){loadError('Could not open the overall board.',error,overall);}
}
document.getElementById('overall').onclick=()=>{
 if(!screen)return;
 history.replaceState(null,'',experimentPath+'?overall=1'+(whartonFlow?'&wharton=1':''));
 overall();
};
async function loadRatingUnlock() {
 if(!whartonFlow||demoId||!accountSignedIn||!accountProfile?.whartonEmailVerified)return;
 const {categoriesUnlocked,earnedUnlock,gateCategory,participation,pilotLockIcon,whartonChoices}=await import('/wharton-categories.js');
 if(categoriesUnlocked(accountProfile))return;
 const groups=whartonChoices(await window.VouchCategories.load());
 if(gateCategory(groups)?.experiment.id!==experimentId)return;
 const states=await participation(groups.flatMap(group=>group.experiment?[group.experiment]:[]));
 if(!earnedUnlock(groups,states))ratingUnlock={answered:new Set(states[experimentId].answeredProductIds),categoriesUnlocked,pilotLockIcon};
}
async function boot(){
 const route=new URLSearchParams(location.search);
 const destination=route.has('overall')?'overall':route.has('board')?'board':route.get('start')==='1'?'game':'home';
 showLoading(app.querySelector('.page-loading p')?.textContent||{
  overall:'Opening the overall board…',board:'Opening the Board…',game:'Opening voting…',home:'Opening the Edit…',
 }[destination]);
 try{
  experiment=(await api('/api/experiment')).experiment;products=experiment.products;
  document.title='Vouch — '+experiment.title;
  if(experiment.status==='draft'){await openBoard();return;}
  await refreshAccountStatus();
  if(whartonFlow&&!demoId&&!accountStatusKnown)throw Error('Could not check your account. Please try again.');
  if(whartonFlow&&!demoId&&(!accountSignedIn||!accountProfile?.whartonEmailVerified)){location.replace('/wharton');return;}
  document.getElementById('experiment-info').textContent='This collection contains '+products.length+' products. Responses and nominations stay within this collection. Only collections explicitly included by the organizer contribute to the overall board.';
  if(destination==='overall'){await overall();return;}
  if(destination==='board'){await openBoard({record:whartonFlow&&experimentStatus()==='open'});return;}
  if(experimentStatus()!=='open'){await loadCommunity();showScreen('home',{reveal:true});return;}
  await track('visit');await loadCommunity();
  ratingUnlock=null;
  await loadRatingUnlock().catch(()=>{});
  if(destination==='game'){
   await track('start');index=0;
   if(route.has('resume')){
    if(demoId){
     resumeAnswers=new Set(Object.keys(state.votes));
     const next=products.findIndex(p=>!resumeAnswers.has(p.id));index=next===-1?products.length:next;
    }else{
     const result=await api('/api/category-participation?id='+encodeURIComponent(experimentId)),progress=result.categories[experimentId];
     resumeAnswers=new Set(progress.answeredProductIds);
     index=progress.nextProductId?products.findIndex(p=>p.id===progress.nextProductId):products.length;
    }
   }
   history.replaceState(null,'',experimentPath+(whartonFlow?'?wharton=1':''));
   showScreen('game',{reveal:true});return;
  }
  showScreen('home',{reveal:true});
 }catch(error){loadError('Could not open this collection.',error,boot);}
}
setInterval(updateTimers,1000);
let scheduleRefreshing=false;
async function refreshSchedule(){if(!experiment||!screen||scheduleRefreshing)return;scheduleRefreshing=true;try{const next=(await api('/api/experiment')).experiment;const previous=experimentStatus();experiment=next;const current=experimentStatus();if(previous!==current&&screen&&screen!=='overall')render();updateTimers()}catch{}finally{scheduleRefreshing=false}}
setInterval(refreshSchedule,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&experiment?.status!=='draft'&&screen){refreshSchedule();refreshAccountStatus()}});
boot();
function flowProgress(){
 const total=products.length,current=Math.min(index+1,total),optional=index===total;
 const remaining=!optional&&accountSignedIn&&accountProfile?.whartonEmailVerified&&ratingUnlock&&!ratingUnlock.categoriesUnlocked(accountProfile)
   ?products.filter(product=>!ratingUnlock.answered.has(product.id)&&!state.votes[product.id]).length:0;
 const countdown=remaining?`<span class="rating-unlock-count" aria-hidden="true">${ratingUnlock.pilotLockIcon({size:12})} ${remaining} to unlock</span>`:'';
 const description=optional?'All products answered. Nominations are optional.':'Product '+current+' of '+total+(remaining?', '+remaining+' to unlock every category':'');
 return `${countdown?'<div class="game-progress-header">':''}<div class="game-top"><span>${optional?'Nominations · Optional':'Your take'}${!optional?` <a class="rating-board-link" href="${experimentPath}?board=1" data-action="board">The Board →</a>`:''}</span><div class="game-position">${index>0?'<button class="previous-arrow" data-action="back" aria-label="Previous product" title="Previous product">←</button>':''}<span>${current} of ${total}</span></div></div>${countdown}<div class="progress" role="progressbar" aria-label="Product progress" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${current}" aria-valuetext="${description}">${Array.from({length:total},(_,i)=>`<i class="${i<current?'done':''}"></i>`).join('')}</div>${countdown?'</div>':''}`;
}
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
async function mountBoardPeople(onSummary){
 const hosts=[...app.querySelectorAll('[data-board-people]')];if(!hosts.length)return;
 const ids=[...new Set(hosts.map(h=>h.dataset.boardPeople))];
 const load=async batch=>{
  try{const query=new URLSearchParams();batch.forEach(id=>query.append('id',id));const data=await api('/api/people-summary?'+query);onSummary?.(data.summaries);
   for(const host of hosts.filter(h=>batch.includes(h.dataset.boardPeople))){if(!host.isConnected)continue;const summary=data.summaries[host.dataset.boardPeople];
    const lead=summary?.people[0];
    const others=(summary?.total||0)-1;
    const ownVote=host.parentElement?.querySelector('[data-board-own-vote="yes"]');
    if(ownVote)ownVote.hidden=!!lead?.isYou;
    host.innerHTML=summary?.total?`<div class="board-people-avatars">${summary.people.map((p,i)=>window.VouchPeople.avatar(p,i,{className:'board-person'})).join('')}</div><a class="board-people-link" href="${esc(host.dataset.path.split('#')[0]+'#item-people')}">${lead.isYou?'You':esc(window.VouchPeople.shortName(lead.displayName))}${others?' + '+others+(others===1?' other':' others'):''} vouch${!others&&!lead.isYou?'es':''} <span aria-hidden="true">→</span></a>`:'';
    host.hidden=!summary?.total;host.setAttribute('aria-busy','false');
   }
  }catch{for(const host of hosts.filter(h=>batch.includes(h.dataset.boardPeople))){if(!host.isConnected)continue;const ownVote=host.parentElement?.querySelector('[data-board-own-vote="yes"]');if(ownVote)ownVote.hidden=false;host.hidden=false;host.setAttribute('aria-busy','false');host.innerHTML='<button class="text-button" type="button">People could not load. Retry</button>';host.querySelector('button').onclick=()=>load(batch);}}
 };
 for(let i=0;i<ids.length;i+=100)await load(ids.slice(i,i+100));
}

document.addEventListener('click',event=>{const anchor=event.target.closest('.board-people a');if(demoId||!anchor)return;fetch(apiUrl('/api/events'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:anchor.classList.contains('board-person')?'profile_open':'people_open'}),credentials:'same-origin',keepalive:true}).catch(()=>{});});

function mountInlineNote(){
 const field=app.querySelector('#rating-comment'),card=field.closest('.product-card'),help=card.querySelector('.rating-note-help'),counter=card.querySelector('[data-note-count]');
 const update=()=>{field.style.height='auto';field.style.height=Math.min(field.scrollHeight,88)+'px';help.hidden=!field.value&&document.activeElement!==field;counter.textContent=field.value.length+'/240';counter.setAttribute('aria-live',field.value.length>=220?'polite':'off');};
 field.addEventListener('input',update);
 field.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();field.blur();}});
 field.addEventListener('focus',()=>{if(matchMedia('(max-width:760px)').matches){card.classList.add('is-noting');card.scrollIntoView({block:'start'});}update();});
 field.addEventListener('blur',()=>{card.classList.remove('is-noting');update();});
 // Keep note focus and the compact layout stable when tapping tags or verdicts.
 app.querySelectorAll('.vote-actions button,[data-product-tag]').forEach(button=>button.addEventListener('pointerdown',event=>{if(document.activeElement===field)event.preventDefault();}));
 update();
}
