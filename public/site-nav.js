(()=>{
 'use strict';
 const header=document.querySelector('[data-site-nav]');if(!header)return;
 const isAccountPage=/^\/account\/?$/.test(location.pathname);
 const navigationLocked=()=>header.hasAttribute('data-account-nav-locked');
 const menu=header.querySelector('.site-menu'),menuToggle=header.querySelector('.site-menu-toggle'),search=header.querySelector('.site-search'),input=header.querySelector('#site-search-input'),searchToggle=header.querySelector('.site-search-toggle'),searchClose=header.querySelector('.site-search-close'),popover=header.querySelector('.site-search-popover'),results=header.querySelector('#site-search-results'),status=header.querySelector('#site-search-status'),nominate=header.querySelector('.site-search-nominate');
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Navigation destinations are shared by desktop links and the mobile menu.
 header.querySelectorAll('.site-desktop-links a,.site-menu a').forEach(link=>{if(link.pathname===location.pathname)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 const menuIcon=menuToggle.innerHTML,closeIcon=searchClose.innerHTML;
 const menuAccount=document.createElement('a');menuAccount.className='site-menu-account';menu.append(menuAccount);
 let searchFocus=null,restoringSearchFocus=false,lastQuery=null;
 const normalizeQuery=value=>value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 let context={},picker=null,menuOpen=false,searchOpen=false,scrollBefore=null,scrim=null,controller=null,timer=null,version=0,feedbackDialog=null,feedbackFocus=null;
 const accountLink=header.querySelector('.leaderboard-link');
 let accountHome=accountLink.dataset.accountHome||null,accountRequest=0,requestedPhoto=undefined,photoRequest=0;
 function updateHome(root=document) {
  root.querySelectorAll('[data-site-nav] a.wordmark,.profile-mobile-bar a.wordmark').forEach(logo=>{logo.href=accountHome||'/';});
 }
 const emblem=header.querySelector('.wordmark-emblem');
 const emblemMarkup=emblem?.outerHTML.replace('wordmark-emblem','vouch-action-emblem')||'';
 const overlayHeading=document.createElement('div');overlayHeading.className='site-search-heading';
 overlayHeading.innerHTML=emblemMarkup+'<h2 id="site-search-title">Search Vouch</h2><button type="button" class="site-icon-button site-search-dismiss" aria-label="Close search">'+closeIcon+'</button>';
 search.prepend(overlayHeading);
 overlayHeading.querySelector('button').onclick=()=>closeSearch();
 const shortcutLabel=document.createElement('p');shortcutLabel.className='site-search-shortcut-label';shortcutLabel.textContent='Explore Vouch';
 const shortcuts=document.createElement('div');shortcuts.className='site-search-shortcuts';shortcuts.innerHTML='<a href="/categories">Explore categories <span aria-hidden="true">→</span></a><a href="/search">All products <span aria-hidden="true">→</span></a><a href="/community-leaderboard">Wharton leaderboard <span aria-hidden="true">→</span></a><a class="site-search-account" href="/account">Your account <span aria-hidden="true">→</span></a>';
 const boardShortcut=document.createElement('a');boardShortcut.hidden=true;boardShortcut.textContent='The Board →';shortcuts.prepend(boardShortcut);
 search.append(shortcutLabel,shortcuts);
 const hint=document.createElement('kbd');hint.className='site-search-shortcut';hint.textContent='/';hint.setAttribute('aria-hidden','true');input.after(hint);
 const inertBefore=new Map();
 function modalSearch(active){
  const modal=active&&matchMedia('(max-width:760px)').matches;
  if(modal){search.setAttribute('role','dialog');search.setAttribute('aria-modal','true');search.setAttribute('aria-labelledby','site-search-title');
   for(const node of document.body.children)if(node!==header&&!['SCRIPT','STYLE','LINK'].includes(node.tagName)&&!inertBefore.has(node)){inertBefore.set(node,node.inert);node.inert=true;}
  }else{search.removeAttribute('role');search.removeAttribute('aria-modal');search.removeAttribute('aria-labelledby');for(const [node,inert] of inertBefore)node.inert=inert;inertBefore.clear();}
 }
 function syncSearchShortcuts(){const empty=input.value.trim().length<2;shortcuts.hidden=!empty;shortcutLabel.hidden=!empty;const account=header.querySelector('.leaderboard-link');const profile=shortcuts.querySelector('.site-search-account');profile.href=context.voting?'/account':account.href;profile.firstChild.textContent=context.voting?'Your account ':account.getAttribute('aria-label')==='My profile'?'Your profile ':'Sign in ';boardShortcut.hidden=!context.experimentId;boardShortcut.href=context.experimentPath+'?board=1';}
 shortcuts.addEventListener('click',event=>{if(event.target.closest('a'))closePanels(false);});

 const allResults=document.createElement('a');allResults.className='site-search-all';allResults.hidden=true;allResults.innerHTML='<span>See all results</span><span class="site-search-all-arrow" aria-hidden="true">↗</span>';popover.append(allResults);
 const textField=node=>!!node?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
 document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-vouch-search]');
  if(trigger)openSearch(trigger,true);
 });
 function lock(){if(scrollBefore===null){scrollBefore=document.body.style.overflow;document.body.style.overflow='hidden';}}
 function unlock(){if(!menuOpen&&!searchOpen&&scrollBefore!==null){document.body.style.overflow=scrollBefore;scrollBefore=null;}}
 function syncScrim(){scrim?.remove();scrim=null;if(menuOpen||searchOpen){scrim=document.createElement('div');scrim.className='site-nav-scrim';scrim.style.top=Math.max(0,header.getBoundingClientRect().bottom)+'px';scrim.setAttribute('aria-hidden','true');scrim.onclick=()=>closePanels();document.body.append(scrim);}}
 function closeMenu(focus=true){if(!menuOpen)return;menuOpen=false;menu.hidden=true;header.classList.remove('is-menu-open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Menu');menuToggle.innerHTML=menuIcon;syncScrim();unlock();if(focus)menuToggle.focus({preventScroll:true});}
 function hideResults(){allResults.hidden=true;popover.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function closeSearch(focus=true){modalSearch(false);const wasOpen=searchOpen;searchOpen=false;header.classList.remove('is-search-open');searchToggle.setAttribute('aria-expanded','false');version++;clearTimeout(timer);controller?.abort();hideResults();syncScrim();unlock();if(wasOpen&&focus){const target=searchFocus?.isConnected&&searchFocus.getClientRects().length?searchFocus:window.innerWidth>760?input:searchToggle;restoringSearchFocus=true;target.focus({preventScroll:true});restoringSearchFocus=false;}}
 function closePanels(focus=true){closeMenu(focus);closeSearch(focus);}
 function toggleMenu(){if(navigationLocked())return;const account=header.querySelector('.leaderboard-link');menuAccount.href=account.href;menuAccount.textContent=account.getAttribute('aria-label')||'Your account';if(menuOpen){closeMenu();return;}closeSearch(false);menuOpen=true;menu.hidden=false;header.classList.add('is-menu-open');menuToggle.setAttribute('aria-expanded','true');menuToggle.setAttribute('aria-label','Close menu');menuToggle.innerHTML=closeIcon;lock();syncScrim();}
 function openSearch(trigger=searchToggle,clear=false){if(navigationLocked())return;if(!searchOpen)searchFocus=trigger instanceof HTMLElement?trigger:searchToggle;if(clear){input.value='';lastQuery=null;picker?.clear();hideResults();}closeMenu(false);showHeader();searchOpen=true;header.classList.add('is-search-open');searchToggle.setAttribute('aria-expanded','true');lock();syncScrim();modalSearch(true);syncSearchShortcuts();input.focus();if(input.value.trim().length>=2)runSearch();}
 menuToggle.onclick=toggleMenu;searchToggle.onclick=()=>openSearch(searchToggle);searchClose.onclick=()=>closeSearch();
 header.querySelectorAll('[data-suggest-edit]').forEach(trigger=>trigger.hidden=true);
 header.querySelectorAll('[data-site-feedback]').forEach(button=>button.onclick=()=>{const fromMenu=menu.contains(button);closeMenu();openFeedback(fromMenu?menuToggle:button);});
 menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu()));
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!navigationLocked()&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&!textField(event.target)&&!document.querySelector('dialog[open]')){event.preventDefault();openSearch(window.innerWidth>760?input:searchToggle);return;}if(event.key!=='Escape')return;if(menuOpen||searchOpen){event.preventDefault();closePanels();}else if(!popover.hidden)hideResults();});
 document.addEventListener('click',event=>{if(!event.composedPath().includes(header)&&!event.target.closest('[data-vouch-search]')){if(menuOpen||searchOpen)closePanels();else hideResults();}});
 // Keep keyboard focus within the expanded navigation until it closes.
 header.addEventListener('keydown',event=>{if(event.key!=='Tab'||!menuOpen&&!searchOpen)return;const nodes=[...(searchOpen&&matchMedia('(max-width:760px)').matches?search:header).querySelectorAll('a[href],button,input')].filter(n=>!n.disabled&&n.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 document.addEventListener('focusin',event=>{if(!header.contains(event.target)&&!searchOpen)hideResults();});
 window.addEventListener('resize',()=>{if(window.innerWidth>1100&&menuOpen)closeMenu(false);if(menuOpen||searchOpen){syncScrim();modalSearch(searchOpen);}});
 // Keep the header reachable while reading without covering the page on descent.
 let lastScroll=Math.max(0,window.scrollY),scrollTravel=0,scrollFrame=false;
 const showHeader=()=>{header.classList.remove('is-scroll-hidden');scrollTravel=0;};
 function updateScrollHeader(){
  scrollFrame=false;const y=Math.max(0,Math.min(window.scrollY,Math.max(0,document.documentElement.scrollHeight-window.innerHeight))),delta=y-lastScroll;lastScroll=y;
  if(y<=header.offsetHeight||menuOpen||searchOpen||header.contains(document.activeElement)||document.querySelector('dialog[open]')){showHeader();return;}
  if(!delta)return;
  scrollTravel=Math.sign(delta)===Math.sign(scrollTravel)?scrollTravel+delta:delta;
  if(scrollTravel>18){header.classList.add('is-scroll-hidden');}else if(scrollTravel< -8)showHeader();
 }
 window.addEventListener('scroll',()=>{if(!scrollFrame){scrollFrame=true;requestAnimationFrame(updateScrollHeader);}},{passive:true});
 header.addEventListener('focusin',showHeader);
 function choose(product){
  if(product.discoveryHref&&/^\/products\/[^/?#]+$/.test(product.discoveryHref)){closePanels(false);location.href=product.discoveryHref;return;}

  if(product.onBoardId){const href=context?.productPath(product);if(href){closePanels(false);location.href=href;}return;}
  if(product.vouchStatus==='new'&&String(product.category||'').toLowerCase()!==String(context?.category||'').toLowerCase()){status.textContent='This product is outside the current Edit. Open its category to nominate it.';return;}
  if(!context?.canNominate){status.textContent='Nominations are paused for this Edit.';return;}
  const query=input.value.trim();closePanels();context.nominate(product,query);
 }
 function initializePicker(){if(picker)return;picker=window.VouchProductPicker({input,results,more:header.querySelector('.site-search-more'),clear:header.querySelector('.site-search-clear'),another:header.querySelector('.site-search-another'),esc,isSelected:()=>false,onChoose:choose,onClear:()=>{version++;controller?.abort();clearTimeout(timer);hideResults();},resultLabel:product=>product.vouchStatus==='rated'?'On Vouch · '+product.evidence.communityScore+' / 10 · '+product.evidence.ratingCount+' ratings'+(product.fit?.verdict==='yes'?' · Vouched by you':''):product.vouchStatus==='listed'?'On Vouch · No ratings yet · View product':'New to Vouch · '+(product.category||'Uncategorized')+' · No Vouch opinions',boardLabel:'On the board · View product',unselectedLabel:'Not on board · Vouch for it',enhance:false,focusAfterChoose:false,maxVisible:8});}
 async function runSearch(){
  allResults.hidden=true;const query=input.value.trim();allResults.href='/find?q='+encodeURIComponent(query);if(!picker){await pickerReady;}if(!context||query.length<2){picker?.clear();hideResults();return;}
  const label=Array.from(query);nominate.textContent='Vouch for “'+label.slice(0,40).join('')+(label.length>40?'…':'')+'”';
  const current=++version;controller?.abort();controller=new AbortController();picker.clear();popover.hidden=false;input.setAttribute('aria-expanded','true');window.VouchSearchStatus?.(status,{loading:true});nominate.hidden=true;
  try{
   if(/^https:\/\//i.test(query)){const config=await window.VouchCatalog.config();if(!config.linkPaste)throw Error('Link lookup unavailable');const response=await fetch('/api/catalog/lookup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:query}),signal:controller.signal});const data=await response.json();if(current!==version)return;if(!response.ok)throw Error(data.error);choose({discoveryHref:'/products/'+encodeURIComponent(data.product.id)});return;}
   const options={signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])};
   const groups={vouch:[],catalog:[]};let catalogPending=query.length>=3,localPending=true,partial=false;
   const paint=()=>{if(current!==version||localPending)return;const known=new Set(groups.vouch.map(p=>p.id));const products=[...groups.vouch,...groups.catalog.filter(p=>!known.has(p.id))];picker.setProducts(products.slice(0,8));popover.hidden=false;input.setAttribute('aria-expanded','true');window.VouchSearchStatus(status,{loading:catalogPending,count:products.length,partial});allResults.hidden=catalogPending;nominate.hidden=products.length>0||!context.canNominate;};
   await Promise.all(['vouch',...(query.length>=3?['catalog']:[])].map(async source=>{try{const response=await fetch('/api/search?q='+encodeURIComponent(query)+'&source='+source,options);if(!response.ok)throw Error();const data=await response.json();groups[source]=data.products||[];partial=partial||data.partial;}catch{partial=true;}finally{if(source==='catalog')catalogPending=false;else localPending=false;paint();}}));
   if(current!==version)return;
   const products=[...groups.vouch,...groups.catalog];
   nominate.hidden=products.length>0||!context.canNominate;
  }catch(error){if(current!==version||error.name==='AbortError')return;picker.clear();popover.hidden=false;input.setAttribute('aria-expanded','true');window.VouchSearchStatus(status,{partial:true});allResults.hidden=false;nominate.hidden=!context?.canNominate;}

 }
 input.addEventListener('input',()=>{syncSearchShortcuts();const normalized=normalizeQuery(input.value);if(normalized===lastQuery)return;lastQuery=normalized;version++;controller?.abort();clearTimeout(timer);picker?.clear();hideResults();if(input.value.trim().length>=2){popover.hidden=false;input.setAttribute('aria-expanded','true');window.VouchSearchStatus?.(status,{loading:true});nominate.hidden=true;timer=setTimeout(runSearch,250);}});
 input.addEventListener('click',()=>{if(!searchOpen)openSearch(window.innerWidth<=760?searchToggle:input);});
 input.addEventListener('focus',()=>{if(!searchOpen&&!restoringSearchFocus)openSearch(window.innerWidth<=760?searchToggle:input);if(input.value.trim().length>=2&&results.children.length){popover.hidden=false;input.setAttribute('aria-expanded','true');}});
 nominate.onclick=()=>{const query=input.value.trim();closePanels();context?.nominate(null,query);};
 input.maxLength=2048;input.placeholder='Search vouch';input.setAttribute('aria-label','Search vouch');
 function configure(value){context=value;const enabled=!navigationLocked();search.hidden=!enabled;searchToggle.hidden=!enabled;header.classList.toggle('has-product-search',enabled);if(enabled&&window.VouchProductPicker)initializePicker();if(!enabled&&(searchOpen||menuOpen))closePanels(false);}

 function showAccountPhoto(photo){
  if(photo===requestedPhoto)return;
  const sequence=++photoRequest;
  requestedPhoto=photo;
  accountLink.querySelector('img')?.remove();
  if(!photo)return;
  const image=new Image();
  image.alt='';
  image.src=photo;
  image.decode().then(()=>{
   if(sequence!==photoRequest)return;
   accountLink.append(image);
  }).catch(()=>{
   // Keep the initial visible. A later account refresh can retry the photo.
   if(sequence===photoRequest)requestedPhoto=undefined;
  });
 }
 function updateAccountNavigation(signedIn){
  const locked=!signedIn;
  if(!isAccountPage||navigationLocked()===locked)return;
  header.toggleAttribute('data-account-nav-locked',locked);
  configure(context);
 }
 function presentAccount({authenticated,browserProfile,profile,demo},{experimentId}={}){
  updateAccountNavigation(authenticated&&browserProfile===false&&!profile?.verificationRequired&&!demo);
  const state=demo?'demo':authenticated?(profile?.verificationRequired?'verification':'signed-in'):'signed-out';
  const isMember=!!authenticated&&!demo;
  const label=demo?'Wharton demo home':isMember?'My profile':'Sign in';
  const query=new URLSearchParams();
  if(experimentId)query.set('experiment',experimentId);
  if(state==='signed-out')query.set('signin','1');
  const initial=Array.from(profile?.displayName?.trim()||'V')[0].toUpperCase();
  if(accountLink.dataset.accountState!==state){
   accountLink.textContent=isMember?'':demo?'Demo':'Sign in';
   accountLink.dataset.accountState=state;
  }
  if(isMember){
   let fallback=accountLink.querySelector('span');
   if(!fallback){fallback=document.createElement('span');fallback.setAttribute('aria-hidden','true');accountLink.prepend(fallback);}
   fallback.textContent=initial;
  }
  accountLink.classList.toggle('profile-link',isMember);
  accountLink.href=demo?'/wharton':'/account'+(query.size?'?'+query:'');
  accountLink.setAttribute('aria-label',label);
  accountHome=homePathFor(isMember?profile:null);
  updateHome();
  const photo=profile?.photo;
  showAccountPhoto(state==='signed-in'&&typeof photo==='string'&&photo.startsWith('/api/account/photos/')?photo:'');
  menuAccount.href=accountLink.href;
  menuAccount.textContent=label;
  if(searchOpen)syncSearchShortcuts();
 }
 async function refreshAccount(){
  if(document.body.classList.contains('collection-flow'))return;
  const sequence=++accountRequest;
  try{
   const response=await fetch('/api/account/me');
   if(!response.ok)return;
   const account=await response.json();
   if(sequence===accountRequest)presentAccount(account);
  }catch{/* A temporary failure leaves the current identity visible. */}
 }
 function openFeedback(trigger){
  if(!feedbackDialog){feedbackDialog=document.createElement('dialog');feedbackDialog.className='suggestion-dialog feedback-dialog';feedbackDialog.id='feedback-dialog';feedbackDialog.setAttribute('aria-labelledby','feedback-title');document.body.append(feedbackDialog);feedbackDialog.addEventListener('close',()=>{if(feedbackFocus?.isConnected)feedbackFocus.focus({preventScroll:true});});}
  if(feedbackDialog.open)return;feedbackFocus=trigger;feedbackDialog.innerHTML=`<button class="suggestion-dialog-close" type="button" aria-label="Close feedback form">×</button><h2 id="feedback-title">A note for Vouch.</h2><form class="suggestion-form feedback-form"><label>What's working, what isn't?<textarea name="message" required minlength="5" maxlength="1000" rows="5"></textarea></label><label>Email (if you'd like a reply)<input name="email" type="email" maxlength="254" autocomplete="email"></label><button class="primary" type="submit">Send feedback</button><p role="status" aria-live="polite"></p></form>`;
  feedbackDialog.querySelector('.suggestion-dialog-close').onclick=()=>feedbackDialog.close();const form=feedbackDialog.querySelector('form'),button=form.querySelector('[type=submit]'),message=form.querySelector('[role=status]');let pending=false;
  form.addEventListener('input',()=>{if(!pending){button.disabled=false;button.textContent='Send feedback';message.textContent='';}});
  form.onsubmit=async event=>{event.preventDefault();if(pending)return;pending=true;button.disabled=true;button.textContent='Sending…';message.textContent='';try{const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:form.elements.message.value,email:form.elements.email.value,path:location.pathname,experimentId:context?.experimentId||null})}),data=await response.json();if(!response.ok)throw Error(data.error||'Could not send feedback. Please try again.');form.reset();button.textContent='Feedback sent ✓';message.textContent='Thanks — we read every note.';}catch(error){button.disabled=false;button.textContent='Send feedback';message.textContent=error.message;}finally{pending=false;}};
  feedbackDialog.showModal();form.elements.message.focus();
 }
 const pickerReady=window.VouchProductPicker?Promise.resolve():new Promise(resolve=>{const script=document.createElement('script');script.src='/product-picker.js';script.onload=resolve;document.head.append(script);});
 pickerReady.then(()=>configure(context));
 window.VouchSiteNav={configure,refreshAccount,presentAccount,updateHome,openSearch,emblemMarkup};
 if(document.querySelector('.draft-banner'))header.querySelectorAll('[data-suggest-edit]').forEach(trigger=>trigger.hidden=true);
 updateHome();
 const initialPhoto=accountLink.dataset.accountPhoto;
 if(initialPhoto?.startsWith('/api/account/photos/'))showAccountPhoto(initialPhoto);
 if(!accountLink.dataset.accountState||accountLink.dataset.accountState==='pending')refreshAccount();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAccount();});
 window.addEventListener('pageshow',event=>{if(event.persisted)refreshAccount();});
})();
