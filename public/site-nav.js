(()=>{
 'use strict';
 const header=document.querySelector('[data-site-nav]');if(!header)return;
 const menu=header.querySelector('.site-menu'),menuToggle=header.querySelector('.site-menu-toggle'),search=header.querySelector('.site-search'),input=header.querySelector('#site-search-input'),searchToggle=header.querySelector('.site-search-toggle'),searchClose=header.querySelector('.site-search-close'),popover=header.querySelector('.site-search-popover'),results=header.querySelector('#site-search-results'),status=header.querySelector('#site-search-status'),nominate=header.querySelector('.site-search-nominate');
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Navigation destinations are shared by desktop links and the mobile menu.
 header.querySelectorAll('.site-desktop-links a,.site-menu a').forEach(link=>{if(link.pathname===location.pathname)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 const menuIcon=menuToggle.innerHTML,closeIcon=searchClose.innerHTML;
 // Keep the mobile menu before the brand in both visual and keyboard order.
 header.prepend(menuToggle);
 let searchFocus=null,restoringSearchFocus=false,lastQuery=null;
 const normalizeQuery=value=>value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 let context={},picker=null,menuOpen=false,searchOpen=false,scrollBefore=null,scrim=null,controller=null,timer=null,version=0,feedbackDialog=null,feedbackFocus=null;
 const emblem=header.querySelector('.wordmark-emblem');
 const emblemMarkup=emblem?.outerHTML.replace('wordmark-emblem','vouch-action-emblem')||'';
 const pill=document.createElement('button');
 pill.type='button';pill.className='vouch-pill';pill.hidden=true;
 pill.setAttribute('aria-label','Vouch for a product');pill.setAttribute('data-vouch-search','');
 pill.innerHTML=emblemMarkup+'<span class="vouch-pill-label">Vouch</span>';
 document.body.append(pill);
 const searchEmblem=emblem?.cloneNode(true);
 if(searchEmblem){searchEmblem.className='site-search-emblem';searchEmblem.width=26;searchEmblem.height=26;search.querySelector('.site-search-field>svg')?.replaceWith(searchEmblem);}
 const hint=document.createElement('kbd');hint.className='site-search-shortcut';hint.textContent='/';hint.setAttribute('aria-hidden','true');
 input.after(hint);
 const searchAction=document.createElement('button');searchAction.type='button';searchAction.className='site-search-action';searchAction.setAttribute('aria-label','Search products');searchAction.innerHTML=searchToggle.innerHTML;
 hint.after(searchAction);searchAction.onclick=()=>openSearch(searchAction);

 const allResults=document.createElement('a');allResults.textContent='See all results';popover.append(allResults);
 const textField=node=>!!node?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
 function syncPill(){
  const eligible=!!(context?.experimentId&&!context.draft&&context.canNominate&&!context.voting);
  const visible=eligible&&!menuOpen&&!searchOpen&&!document.querySelector('dialog[open]')&&!(textField(document.activeElement)&&!header.contains(document.activeElement));
  if(pill.hidden===visible)pill.hidden=!visible;
  // Keep the reserved space stable while overlays or the keyboard temporarily hide the button.
  document.body.classList.toggle('has-vouch-pill',eligible);
 }
 new MutationObserver(syncPill).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('focusin',syncPill);
 document.addEventListener('focusout',()=>queueMicrotask(syncPill));
 document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-vouch-search]');
  if(trigger)openSearch(trigger,true);
 });
 function lock(){if(scrollBefore===null){scrollBefore=document.body.style.overflow;document.body.style.overflow='hidden';}}
 function unlock(){if(!menuOpen&&!searchOpen&&scrollBefore!==null){document.body.style.overflow=scrollBefore;scrollBefore=null;}}
 function syncScrim(){syncPill();scrim?.remove();scrim=null;if(menuOpen||searchOpen){scrim=document.createElement('div');scrim.className='site-nav-scrim';scrim.style.top=Math.max(0,header.getBoundingClientRect().bottom)+'px';scrim.setAttribute('aria-hidden','true');scrim.onclick=()=>closePanels();document.body.append(scrim);}}
 function closeMenu(focus=true){if(!menuOpen)return;menuOpen=false;menu.hidden=true;header.classList.remove('is-menu-open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Menu');menuToggle.innerHTML=menuIcon;syncScrim();unlock();if(focus)menuToggle.focus({preventScroll:true});}
 function hideResults(){popover.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function closeSearch(focus=true){const wasOpen=searchOpen;searchOpen=false;header.classList.remove('is-search-open');searchToggle.setAttribute('aria-expanded','false');version++;clearTimeout(timer);controller?.abort();hideResults();syncScrim();unlock();if(wasOpen&&focus){syncPill();const target=searchFocus?.isConnected?searchFocus:searchToggle;restoringSearchFocus=true;target.focus({preventScroll:true});restoringSearchFocus=false;}}
 function closePanels(focus=true){closeMenu(focus);closeSearch(focus);}
 function toggleMenu(){if(menuOpen){closeMenu();return;}closeSearch(false);menuOpen=true;menu.hidden=false;header.classList.add('is-menu-open');menuToggle.setAttribute('aria-expanded','true');menuToggle.setAttribute('aria-label','Close menu');menuToggle.innerHTML=closeIcon;lock();syncScrim();}
 function openSearch(trigger=searchToggle,clear=false){if(!searchOpen)searchFocus=trigger instanceof HTMLElement?trigger:searchToggle;if(clear){input.value='';picker?.clear();hideResults();}closeMenu(false);showHeader();searchOpen=true;header.classList.add('is-search-open');searchToggle.setAttribute('aria-expanded','true');lock();syncScrim();input.focus();if(input.value.trim().length>=2)runSearch();}
 menuToggle.onclick=toggleMenu;searchToggle.onclick=()=>openSearch(searchToggle);searchClose.onclick=()=>closeSearch();
 header.querySelectorAll('[data-suggest-edit]').forEach(trigger=>trigger.hidden=true);
 header.querySelectorAll('[data-site-feedback]').forEach(button=>button.onclick=()=>{const fromMenu=menu.contains(button);closeMenu();openFeedback(fromMenu?menuToggle:button);});
 menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu()));
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&!textField(event.target)&&!document.querySelector('dialog[open]')){event.preventDefault();openSearch(window.innerWidth>760?input:searchToggle);return;}if(event.key!=='Escape')return;if(menuOpen||searchOpen){event.preventDefault();closePanels();}else if(!popover.hidden)hideResults();});
 document.addEventListener('click',event=>{if(!event.composedPath().includes(header)&&!event.target.closest('[data-vouch-search]')){if(menuOpen||searchOpen)closePanels();else hideResults();}});
 // Keep keyboard focus within the expanded navigation until it closes.
 header.addEventListener('keydown',event=>{if(event.key!=='Tab'||!menuOpen&&!searchOpen)return;const nodes=[...header.querySelectorAll('a[href],button,input')].filter(n=>!n.disabled&&n.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 document.addEventListener('focusin',event=>{if(!header.contains(event.target)&&!searchOpen)hideResults();});
 window.addEventListener('resize',()=>{if(window.innerWidth>1100&&menuOpen)closeMenu(false);if(menuOpen||searchOpen)syncScrim();});
 // Keep the header reachable while reading without covering the page on descent.
 let lastScroll=Math.max(0,window.scrollY),scrollTravel=0,scrollFrame=false;
 const showHeader=()=>{header.classList.remove('is-scroll-hidden');pill.classList.remove('is-collapsed');scrollTravel=0;};
 function updateScrollHeader(){
  scrollFrame=false;const y=Math.max(0,Math.min(window.scrollY,Math.max(0,document.documentElement.scrollHeight-window.innerHeight))),delta=y-lastScroll;lastScroll=y;
  if(y<=header.offsetHeight||menuOpen||searchOpen||header.contains(document.activeElement)||document.querySelector('dialog[open]')){showHeader();return;}
  if(!delta)return;
  scrollTravel=Math.sign(delta)===Math.sign(scrollTravel)?scrollTravel+delta:delta;
  if(scrollTravel>18){header.classList.add('is-scroll-hidden');pill.classList.add('is-collapsed');}else if(scrollTravel< -8)showHeader();
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
  const query=input.value.trim();allResults.href='/find?q='+encodeURIComponent(query);if(!picker){await pickerReady;}if(!context||query.length<2){picker?.clear();hideResults();return;}
  const label=Array.from(query);nominate.textContent='Vouch for “'+label.slice(0,40).join('')+(label.length>40?'…':'')+'”';
  const current=++version;controller?.abort();controller=new AbortController();picker.clear();popover.hidden=false;input.setAttribute('aria-expanded','true');status.textContent='Looking up products…';nominate.hidden=true;
  try{
   if(/^https:\/\//i.test(query)){const config=await window.VouchCatalog.config();if(!config.linkPaste)throw Error('Link lookup unavailable');const response=await fetch('/api/catalog/lookup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:query}),signal:controller.signal});const data=await response.json();if(current!==version)return;if(!response.ok)throw Error(data.error);choose({discoveryHref:'/products/'+encodeURIComponent(data.product.id)});return;}
   const options={signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])};
   const groups={vouch:[],catalog:[]};let catalogPending=query.length>=3,localPending=true,partial=false;
   const paint=()=>{if(current!==version||localPending)return;const known=new Set(groups.vouch.map(p=>p.id));const products=[...groups.vouch,...groups.catalog.filter(p=>!known.has(p.id))];picker.setProducts(products.slice(0,8));popover.hidden=false;input.setAttribute('aria-expanded','true');status.textContent=(products.length?products.length+' matches.':'No matches. Try the brand and product name.')+(catalogPending?' Finding more products…':'')+(partial?' Some results are unavailable.':'');nominate.hidden=products.length>0||!context.canNominate;};
   await Promise.all(['vouch',...(query.length>=3?['catalog']:[])].map(async source=>{try{const response=await fetch('/api/search?q='+encodeURIComponent(query)+'&source='+source,options);if(!response.ok)throw Error();const data=await response.json();groups[source]=data.products||[];partial=partial||data.partial;}catch{partial=true;}finally{if(source==='catalog')catalogPending=false;else localPending=false;paint();}}));
   if(current!==version)return;
   const products=[...groups.vouch,...groups.catalog];
   nominate.hidden=products.length>0||!context.canNominate;
  }catch(error){if(current!==version||error.name==='AbortError')return;picker.clear();popover.hidden=false;input.setAttribute('aria-expanded','true');status.textContent='Search is unavailable. Please try again.';nominate.hidden=!context?.canNominate;}

 }
 input.addEventListener('input',()=>{const normalized=normalizeQuery(input.value);if(normalized===lastQuery)return;lastQuery=normalized;version++;controller?.abort();clearTimeout(timer);picker?.clear();hideResults();if(input.value.trim().length>=2){popover.hidden=false;input.setAttribute('aria-expanded','true');status.textContent='Looking up products…';nominate.hidden=true;timer=setTimeout(runSearch,250);}});
 input.addEventListener('focus',()=>{if(window.innerWidth<=760&&!searchOpen&&!restoringSearchFocus)openSearch(input);if(input.value.trim().length>=2&&results.children.length){popover.hidden=false;input.setAttribute('aria-expanded','true');}});
 nominate.onclick=()=>{const query=input.value.trim();closePanels();context?.nominate(null,query);};
 input.maxLength=2048;input.placeholder='Search vouch';input.setAttribute('aria-label','Search vouch');
 function configure(value){context=value;const enabled=true;search.hidden=!enabled;searchToggle.hidden=!enabled;header.classList.toggle('has-product-search',enabled);if(enabled&&window.VouchProductPicker)initializePicker();if((!enabled||context.voting)&&(searchOpen||menuOpen))closePanels(false);syncPill();}

 async function refreshAccount(){if(document.body.classList.contains('collection-flow'))return;try{const response=await fetch('/api/account/me');if(!response.ok)return;const me=await response.json(),link=header.querySelector('.leaderboard-link');if(document.body.classList.contains('account-page'))header.removeAttribute('data-account-nav-locked');if(header.hasAttribute('data-home-nav')){const verified=!!me.authenticated&&!me.browserProfile;header.toggleAttribute('data-home-nav-locked',!verified);menuToggle.disabled=!verified;if(!verified)closePanels(false);}link.classList.toggle('profile-link',!!me.authenticated);link.href=me.authenticated?'/account':'/account?signin=1';link.setAttribute('aria-label',me.authenticated?'My profile':'Sign in');link.textContent=me.authenticated?(me.profile?.displayName||'V').trim().charAt(0).toUpperCase():'Sign in';if(me.profile?.verificationRequired)link.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg>';const photo=me.profile?.photo;if(me.authenticated&&typeof photo==='string'&&photo.startsWith('/api/account/photos/')){const image=document.createElement('img');image.src=photo;image.alt='';link.replaceChildren(image);}}catch{/* Keep the account link available during a transient failure. */}}
 function openFeedback(trigger){
  if(!feedbackDialog){feedbackDialog=document.createElement('dialog');feedbackDialog.className='suggestion-dialog feedback-dialog';feedbackDialog.id='feedback-dialog';feedbackDialog.setAttribute('aria-labelledby','feedback-title');document.body.append(feedbackDialog);feedbackDialog.addEventListener('close',()=>{if(feedbackFocus?.isConnected)feedbackFocus.focus({preventScroll:true});});}
  if(feedbackDialog.open)return;feedbackFocus=trigger;feedbackDialog.innerHTML=`<button class="suggestion-dialog-close" type="button" aria-label="Close feedback form">×</button><h2 id="feedback-title">A note for Vouch.</h2><form class="suggestion-form feedback-form"><label>What's working, what isn't?<textarea name="message" required minlength="5" maxlength="1000" rows="5"></textarea></label><label>Email (if you'd like a reply)<input name="email" type="email" maxlength="254" autocomplete="email"></label><button class="primary" type="submit">Send feedback</button><p role="status" aria-live="polite"></p></form>`;
  feedbackDialog.querySelector('.suggestion-dialog-close').onclick=()=>feedbackDialog.close();const form=feedbackDialog.querySelector('form'),button=form.querySelector('[type=submit]'),message=form.querySelector('[role=status]');let pending=false;
  form.addEventListener('input',()=>{if(!pending){button.disabled=false;button.textContent='Send feedback';message.textContent='';}});
  form.onsubmit=async event=>{event.preventDefault();if(pending)return;pending=true;button.disabled=true;button.textContent='Sending…';message.textContent='';try{const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:form.elements.message.value,email:form.elements.email.value,path:location.pathname,experimentId:context?.experimentId||null})}),data=await response.json();if(!response.ok)throw Error(data.error||'Could not send feedback. Please try again.');form.reset();button.textContent='Feedback sent ✓';message.textContent='Thanks — we read every note.';}catch(error){button.disabled=false;button.textContent='Send feedback';message.textContent=error.message;}finally{pending=false;}};
  feedbackDialog.showModal();form.elements.message.focus();
 }
 const pickerReady=window.VouchProductPicker?Promise.resolve():new Promise(resolve=>{const script=document.createElement('script');script.src='/product-picker.js';script.onload=resolve;document.head.append(script);});
 pickerReady.then(()=>{configure(context);window.VouchCatalog.config().then(config=>{if(config.linkPaste)input.placeholder='Search or paste a product link';}).catch(()=>{});});
 window.VouchSiteNav={configure,refreshAccount,openSearch,emblemMarkup};
 if(document.querySelector('.draft-banner'))header.querySelectorAll('[data-suggest-edit]').forEach(trigger=>trigger.hidden=true);
 if(!document.body.classList.contains('collection-flow'))refreshAccount();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAccount();});
})();
