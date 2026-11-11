function nominationLabel(product){
 const brand=(product.brand||'').trim(),name=(product.name||'').trim();
 const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 return brand&&normalize(name).startsWith(normalize(brand))?name:[brand,name].filter(Boolean).join(' — ');
}
let nominationDraft='',selectedNominations=null;
let searchTimer,searchController,searchVersion=0,nominationPicker;
function nominationView({inFlow=false}={}){return `<section class="nominate" id="nominate"><p class="eyebrow">MAKE ROOM FOR YOUR FAVORITES</p><div class="nomination-heading"><h2>${inFlow?'Did we miss your holy grail?<br><em>Nominate a product.</em>':'Your favorites missing?'}</h2></div><p>Nominate what we didn't include. When two people nominate the same one, it joins the board.</p><form id="nomination-form"><div id="nomination-search-content"><label class="picker-label" for="nomination-name">Find a product</label><div class="selection-box picker-search"><input id="nomination-name" class="product-search-input" name="name" aria-label="Search a brand or product name" role="combobox" aria-autocomplete="list" aria-controls="product-results" aria-describedby="search-status" aria-expanded="false" placeholder="Search a brand or product name" autocomplete="off" maxlength="100" value="${esc(nominationDraft)}"><button type="button" class="picker-clear" id="nomination-clear" aria-label="Clear search" hidden>×</button></div><div class="search-status" id="search-status" aria-live="polite">Search, select, and keep adding favorites.</div><p id="nomination-error" role="alert"></p><div id="product-results" class="picker-results" role="listbox" aria-multiselectable="true" aria-label="Matching products"></div><button type="button" class="picker-more" id="nomination-more" hidden>See more results</button><div class="picker-tools"><button class="text-button manual-fallback" id="manual-nomination" type="button" hidden>Add this name for review</button><button type="button" class="text-button" id="nomination-another" hidden>Search another brand →</button></div></div><dialog class="nomination-search-dialog" aria-label="Find products to nominate"><div class="nomination-search-header"><span id="nomination-search-count" role="status" aria-live="polite">Find a product</span><button type="button" class="text-button" data-search-done>Done</button></div><div class="nomination-search-body"></div></dialog><details class="picker-selection nomination-selection"><summary><span>Your nominations <span id="nomination-count">· 0</span></span><span class="nomination-disclosure"><span class="nomination-expand">View</span><span class="nomination-collapse">Hide</span><span class="nomination-chevron" aria-hidden="true">⌄</span></span></summary><div class="picker-selection-heading"><button type="button" class="text-button" id="nomination-clear-all" hidden>Clear all</button></div><div id="selected-product" class="selection-chips" aria-label="Selected nominations"></div><p id="nomination-empty" class="picker-empty">Products you select will appear here.</p></details><p id="nomination-saved" class="picker-saved" role="status" hidden>Nominations saved.</p><button class="primary nominate-submit" id="nominate-submit" type="submit" hidden>Save nominations</button></form></section>`}
function mountNomination(){
  clearTimeout(searchTimer);searchController?.abort();searchVersion++;nominationPicker?.destroy();
  const form=document.getElementById('nomination-form');if(!form)return;
  if(selectedNominations===null)selectedNominations=(state.nominations||[]).map(n=>({name:n.name,product:n.product}));
  const input=document.getElementById('nomination-name'),results=document.getElementById('product-results'),status=document.getElementById('search-status'),selected=document.getElementById('selected-product'),submit=document.getElementById('nominate-submit'),fallback=document.getElementById('manual-nomination'),error=document.getElementById('nomination-error'),saved=document.getElementById('nomination-saved');
  const continueButton=document.getElementById('nomination-continue');
  const mobileSearch=mountNominationSearch(form,input,()=>{if(saving)return;if(!selectedNominations.length&&!(state.nominations||[]).length){mobileSearch.close();return;}form.requestSubmit();});
  let matches=[],saving=false;
  const key=n=>n.product?'catalog:'+n.product.id:'name:'+n.name.trim().toLowerCase();
  const has=p=>selectedNominations.some(n=>n.product?.id===p.id);
  function collapse(){matches=[];nominationPicker.clear();}
  function selection(){
    selected.innerHTML=selectedNominations.map((n,i)=>{const p=n.product,label=p?nominationLabel(p):n.name;return `<span class="selection-chip" title="${esc(label)}"><span>${esc(label)}${p?'':'<small>For review</small>'}</span><button type="button" data-remove="${i}" aria-label="Remove ${esc(label)}">×</button></span>`}).join('');
    selected.querySelectorAll('[data-remove]').forEach(b=>{b.disabled=saving;b.onclick=()=>{selectedNominations.splice(Number(b.dataset.remove),1);changed();selection();highlight();status.textContent=selectedNominations.length+' selected. Keep searching to add more.';input.focus()}});
    mobileSearch.updateCount(selectedNominations.length,saving,!!(state.nominations||[]).length);
    document.getElementById('nomination-count').textContent='· '+selectedNominations.length;document.getElementById('nomination-empty').hidden=!!selectedNominations.length;const clearAll=document.getElementById('nomination-clear-all');clearAll.hidden=!selectedNominations.length;clearAll.disabled=saving;
    const previous=state.nominations||[];
    const canSave=selectedNominations.length!==previous.length||selectedNominations.some(n=>!previous.some(saved=>key(saved)===key(n)));
    submit.hidden=!!continueButton||!canSave;
    if(continueButton){continueButton.disabled=saving;continueButton.textContent=saving?'Saving nominations…':selectedNominations.length?`Save ${selectedNominations.length} nomination${selectedNominations.length===1?'':'s'} and see the board →`:'See the board →'}
    submit.textContent=saving?'Saving nominations…':selectedNominations.length?`Save ${selectedNominations.length} nomination${selectedNominations.length===1?'':'s'}`:'Clear saved nominations';
  }
  function changed(){error.textContent='';saved.hidden=true}
  function choose(p){
    if(saving)return;
    if(p.onBoardId){if(screen==='game')go('board');document.getElementById('product-'+p.onBoardId)?.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(has(p))selectedNominations=selectedNominations.filter(n=>n.product?.id!==p.id);
    else {if(selectedNominations.length>=50){error.textContent='Choose up to 50 nominations.';return}selectedNominations.push({name:[p.brand,p.name].filter(Boolean).join(' '),product:p})}
    changed();selection();highlight();status.textContent=`${selectedNominations.length} selected. Keep selecting or search another brand.`;
  }
  function highlight(){nominationPicker.refresh();}
  function clearSearch(){nominationDraft='';searchVersion++;searchController?.abort();clearTimeout(searchTimer);collapse();fallback.hidden=true;status.textContent='Type at least two characters to search.';}
  nominationPicker=window.VouchProductPicker({input,results,more:document.getElementById('nomination-more'),clear:document.getElementById('nomination-clear'),another:document.getElementById('nomination-another'),esc,isSelected:has,onChoose:choose,onClear:clearSearch});
  const destroyPicker=nominationPicker.destroy;nominationPicker.destroy=()=>{mobileSearch.destroy();destroyPicker();};
  document.getElementById('nomination-clear-all').onclick=()=>{if(saving)return;selectedNominations=[];changed();selection();highlight();status.textContent='All selections removed. Save to clear previously saved nominations.';input.focus();};
  async function runSearch(){
    const q=input.value.trim();nominationDraft=input.value;
    if(q.length<2){collapse();fallback.hidden=true;status.textContent='Type at least two characters to search.';return}
    const version=++searchVersion;searchController?.abort();searchController=new AbortController();collapse();fallback.hidden=true;status.textContent='Looking up products…';
    try{const response=await window.VouchCatalog.fetch(q,apiUrl('/api/products/search?q='+encodeURIComponent(q)),{signal:AbortSignal.any([searchController.signal,AbortSignal.timeout(12000)])});const data=await response.json();if(!response.ok)throw Error(data.error);if(version!==searchVersion||!form.isConnected)return;matches=data.products;fallback.hidden=false;fallback.textContent=`Can’t find it? Add “${q}” for review`;
      nominationPicker.setProducts(matches);
      status.textContent=matches.length?`${matches.length} ${matches.length===1?'match':'matches'}. You can pick more than one.${data.stale?' Saved catalogue. Refresh pending.':''}${data.partial?' Some catalogs unavailable.':''}`:'No matches. Add this name and we’ll check the product details.';if(data.live?.limited)status.textContent='Showing saved results; live search is busy';
    }catch(err){if(err.name==='AbortError'||version!==searchVersion||!form.isConnected)return;collapse();status.textContent=/^https?:\/\//i.test(q)?"We couldn't read that link. Try the product name.":'Live search is unavailable right now. You can still add the name below.';fallback.textContent='Add “'+q+'” for review';fallback.hidden=false}
  }
  input.oninput=()=>{fallback.textContent='Add this name for review';nominationDraft=input.value;searchVersion++;searchController?.abort();clearTimeout(searchTimer);collapse();changed();fallback.hidden=true;status.textContent=input.value.trim().length<2?'Type at least two characters to search.':'Looking up products…';searchTimer=setTimeout(runSearch,input.value.trim().length>=3?450:300)};
  fallback.onclick=()=>{if(saving)return;const name=input.value.trim();if(name.length<2)return;const n={name,product:null};if(selectedNominations.some(x=>key(x)===key(n))){status.textContent='That name is already selected.';return}if(selectedNominations.length>=50){error.textContent='Choose up to 50 nominations.';return}selectedNominations.push(n);changed();selection();searchVersion++;searchController?.abort();clearTimeout(searchTimer);input.value='';nominationDraft='';collapse();fallback.hidden=true;status.textContent='Name added for review. Add another favorite.';input.focus()};
  form.onsubmit=async e=>{
    e.preventDefault();if(saving)return;if(continueButton&&!selectedNominations.length&&!(state.nominations||[]).length){go('board');return}changed();saving=true;searchVersion++;searchController?.abort();clearTimeout(searchTimer);collapse();input.disabled=true;fallback.disabled=true;submit.disabled=true;nominationPicker.setDisabled(true);selection();
    try{const data=await api('/api/nominations',{nominations:selectedNominations.map(n=>n.product?{productId:n.product.id}:{name:n.name})});state.nominations=data.nominations;state.nomination=data.nominations[0]||null;save();nominationDraft='';await refreshCommunity();mobileSearch.close();selectedNominations=null;if(continueButton){go('board');return}if(screen==='board'||screen==='game'&&index===products.length){if(screen==='board')board();else{nominationCard();focusScreenHeading()}document.getElementById('nomination-saved').hidden=false}}
    catch(err){error.textContent=err.message}
    finally{saving=false;if(form.isConnected){input.disabled=false;fallback.disabled=false;submit.disabled=false;nominationPicker.setDisabled(false);selection()}}
  };
  selection();if(nominationDraft.trim().length>=2)runSearch();
}


// Keep the existing input/results alive when switching into mobile search.
// VisualViewport follows the usable area as the keyboard and browser chrome move.
function mountNominationSearch(form,input,onFinish){
 const media=matchMedia('(max-width:600px)'),dialog=form.querySelector('.nomination-search-dialog'),content=form.querySelector('#nomination-search-content'),body=dialog.querySelector('.nomination-search-body'),done=dialog.querySelector('[data-search-done]'),count=dialog.querySelector('#nomination-search-count');
 const marker=document.createComment('nomination search home');content.before(marker);
 let opened=false,restoring=false,frame=0,scrollY=0;
 const viewport=window.visualViewport;
 function fit(){
  cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   if(!opened)return;
   dialog.style.top=(viewport?.offsetTop||0)+'px';
   dialog.style.left=(viewport?.offsetLeft||0)+'px';
   dialog.style.width=(viewport?.width||window.innerWidth)+'px';
   dialog.style.height=(viewport?.height||window.innerHeight)+'px';
  });
 }
 const observer=new MutationObserver(()=>{if(!form.isConnected)destroy();});
 function stop(){
  viewport?.removeEventListener('resize',fit);viewport?.removeEventListener('scroll',fit);window.removeEventListener('resize',fit);observer.disconnect();cancelAnimationFrame(frame);
  document.documentElement.classList.remove('nomination-search-open');
 }
 function restore({focus=true}={}){
  if(!opened)return;opened=false;restoring=true;
  stop();marker.after(content);dialog.removeAttribute('style');
  if(form.isConnected){window.scrollTo({top:scrollY,behavior:'instant'});if(focus){const heading=form.closest('.nominate').querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  restoring=false;
 }
 function close(){if(dialog.open)dialog.close();restore();}
 function open(){
  if(opened||restoring||!media.matches||input.disabled)return;
  opened=true;scrollY=window.scrollY;body.append(content);
  document.documentElement.classList.add('nomination-search-open');
  dialog.showModal();input.focus({preventScroll:true});body.scrollTop=0;fit();
  viewport?.addEventListener('resize',fit);viewport?.addEventListener('scroll',fit);window.addEventListener('resize',fit);observer.observe(document.getElementById('app'),{childList:true,subtree:true});
 }
 function resize(){if(!media.matches)close();}
 function keydown(e){
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();input.blur();close();}
 }
 function keepTyping(e){if(document.activeElement===input&&e.target.closest('.product-result,.picker-more,.picker-clear'))e.preventDefault();}
 function destroy(){
  if(dialog.open)dialog.close();restore({focus:false});stop();input.removeEventListener('focus',open);input.removeEventListener('click',open);dialog.removeEventListener('keydown',keydown,true);dialog.removeEventListener('pointerdown',keepTyping);media.removeEventListener('change',resize);
 }
 input.addEventListener('focus',open);input.addEventListener('click',open);
 done.onclick=()=>{input.blur();onFinish();};
 dialog.addEventListener('close',()=>restore());
 dialog.addEventListener('cancel',e=>{e.preventDefault();input.blur();close();});
 dialog.addEventListener('pointerdown',keepTyping);dialog.addEventListener('keydown',keydown,true);media.addEventListener('change',resize);
 return {updateCount(n,saving=false,hasSaved=false){count.textContent=n?`${n} selected`:'Find a product';done.textContent=saving?'Saving…':n?'Save & finish':hasSaved?'Save changes':'Done';done.disabled=saving;done.classList.toggle('has-selections',!!n||hasSaved);},close,destroy};
}
