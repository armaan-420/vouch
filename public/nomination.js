function nominationLabel(product){
 const brand=(product.brand||'').trim(),name=(product.name||'').trim();
 const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 return brand&&normalize(name).startsWith(normalize(brand))?name:[brand,name].filter(Boolean).join(' — ');
}
let nominationDraft='',selectedNominations=null;
let searchTimer,searchController,searchVersion=0;
function nominationView({inFlow=false}={}){return `<section class="nominate" id="nominate"><p class="eyebrow">MAKE ROOM FOR YOUR FAVORITES</p><div class="nomination-heading"><h2>${inFlow?'Did we miss your holy grail?<br><em>Nominate a product.</em>':'Your favorites missing?'}</h2></div><p>Nominate what we didn't include. When two people nominate the same one, it joins the board.</p><form id="nomination-form"><div class="selection-box"><div id="selected-product" class="selection-chips" aria-label="Selected nominations"></div><input id="nomination-name" class="product-search-input" name="name" aria-label="Search a brand or product name" role="combobox" aria-autocomplete="list" aria-controls="product-results" aria-describedby="search-status" aria-expanded="false" placeholder="Search a brand or product name" autocomplete="off" maxlength="100" value="${esc(nominationDraft)}"><span id="nomination-saved" class="nomination-saved-check" role="status" hidden><span aria-hidden="true">✓</span><span class="sr-only">Nominations saved</span></span></div><div class="search-status" id="search-status" aria-live="polite">Search, select, and keep adding favorites.</div><div id="product-results" role="listbox" aria-multiselectable="true" aria-label="Matching products"></div><button class="text-button manual-fallback" id="manual-nomination" type="button" hidden>Add this name for review</button><button class="primary nominate-submit" id="nominate-submit" type="submit" hidden>Save nominations</button><p id="nomination-error" role="alert"></p></form></section>`}
function mountNomination(){
  clearTimeout(searchTimer);searchController?.abort();searchVersion++;
  const form=document.getElementById('nomination-form');if(!form)return;
  if(selectedNominations===null)selectedNominations=(state.nominations||[]).map(n=>({name:n.name,product:n.product}));
  const input=document.getElementById('nomination-name'),results=document.getElementById('product-results'),status=document.getElementById('search-status'),selected=document.getElementById('selected-product'),submit=document.getElementById('nominate-submit'),fallback=document.getElementById('manual-nomination'),error=document.getElementById('nomination-error'),saved=document.getElementById('nomination-saved');
  const continueButton=document.getElementById('nomination-continue');
  let matches=[],active=-1,saving=false;
  const key=n=>n.product?'catalog:'+n.product.id:'name:'+n.name.trim().toLowerCase();
  const has=p=>selectedNominations.some(n=>n.product?.id===p.id);
  function collapse(){results.innerHTML='';input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1}
  function selection(){
    selected.innerHTML=selectedNominations.map((n,i)=>{const p=n.product,label=p?nominationLabel(p):n.name;return `<span class="selection-chip" title="${esc(label)}"><span>${esc(label)}</span><button type="button" data-remove="${i}" aria-label="Remove ${esc(label)}">×</button></span>`}).join('');
    selected.querySelectorAll('[data-remove]').forEach(b=>{b.disabled=saving;b.onclick=()=>{selectedNominations.splice(Number(b.dataset.remove),1);changed();selection();highlight();status.textContent=selectedNominations.length+' selected. Keep searching to add more.';input.focus()}});
    const canSave=!!selectedNominations.length||!!(state.nominations||[]).length;
    submit.hidden=!!continueButton||!canSave;
    if(continueButton){continueButton.disabled=saving;continueButton.textContent=saving?'Saving nominations…':selectedNominations.length?`Save ${selectedNominations.length} nomination${selectedNominations.length===1?'':'s'} and see the board →`:'See the board →'}
    submit.textContent=saving?'Saving nominations…':selectedNominations.length?`Save ${selectedNominations.length} nomination${selectedNominations.length===1?'':'s'}`:'Clear saved nominations';
  }
  function changed(){error.textContent='';saved.hidden=true}
  function choose(i){
    const p=matches[i];if(saving)return;
    if(p.onBoardId){if(screen==='game')go('board');document.getElementById('product-'+p.onBoardId)?.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(has(p))selectedNominations=selectedNominations.filter(n=>n.product?.id!==p.id);
    else {if(selectedNominations.length>=50){error.textContent='Choose up to 50 nominations.';return}selectedNominations.push({name:p.brand+' '+p.name,product:p})}
    changed();selection();searchVersion++;searchController?.abort();clearTimeout(searchTimer);collapse();input.value='';nominationDraft='';fallback.hidden=true;status.textContent=`${selectedNominations.length} selected. Add another favorite.`;input.focus();
  }
  function highlight(){[...results.children].forEach((b,i)=>{const chosen=has(matches[i]);b.setAttribute('aria-selected',String(chosen));b.classList.toggle('search-active',i===active);b.querySelector('.result-arrow').textContent=matches[i].onBoardId?'':chosen?'✓':'+'});if(active>=0){input.setAttribute('aria-activedescendant','search-result-'+active);results.children[active]?.scrollIntoView({block:'nearest'})}else input.removeAttribute('aria-activedescendant')}
  async function runSearch(){
    const q=input.value.trim();nominationDraft=input.value;
    if(q.length<2){collapse();fallback.hidden=true;status.textContent='Type at least two characters to search.';return}
    const version=++searchVersion;searchController?.abort();searchController=new AbortController();collapse();fallback.hidden=false;status.textContent='Looking up products…';
    try{const response=await fetch(apiUrl('/api/products/search?q='+encodeURIComponent(q)),{signal:AbortSignal.any([searchController.signal,AbortSignal.timeout(12000)])});const data=await response.json();if(!response.ok)throw Error(data.error);if(version!==searchVersion||!form.isConnected)return;matches=data.products;active=-1;fallback.textContent=`Add “${q}” for review`;
      results.innerHTML=matches.map((p,i)=>`<button class="product-result" id="search-result-${i}" type="button" role="option" aria-selected="false" tabindex="-1">${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy">`:'<span class="search-photo-placeholder" aria-hidden="true">✳</span>'}<span><span class="search-brand">${esc(p.brand)}</span><strong>${esc(p.name)}</strong>${p.onBoardId?'<small>Already on the board · View product</small>':`<small>${esc(p.source||'')}${p.countries?' · '+esc(p.countries):''}</small>`}</span><span class="result-arrow" aria-hidden="true">+</span></button>`).join('');
      [...results.children].forEach((b,i)=>b.onclick=()=>choose(i));input.setAttribute('aria-expanded',String(matches.length>0));highlight();
      status.textContent=matches.length?`${matches.length} ${matches.length===1?'match':'matches'}. You can pick more than one.${data.stale?' Saved catalogue. Refresh pending.':''}${data.partial?' Some catalogs unavailable.':''}`:'No matches. Add this name and we’ll check the product details.';
    }catch(err){if(err.name==='AbortError'||version!==searchVersion||!form.isConnected)return;collapse();status.textContent='Live search is unavailable right now. You can still add the name below.';fallback.hidden=false}
  }
  input.oninput=()=>{fallback.textContent='Add this name for review';nominationDraft=input.value;searchVersion++;searchController?.abort();clearTimeout(searchTimer);collapse();changed();fallback.hidden=input.value.trim().length<2;status.textContent=input.value.trim().length<2?'Type at least two characters to search.':'Looking up products…';searchTimer=setTimeout(runSearch,300)};
  input.onkeydown=e=>{if(e.key==='Escape'){collapse();return}if(e.key==='Enter'){e.preventDefault();if(active>=0&&results.children.length)choose(active);else if(!fallback.hidden&&!results.children.length)fallback.click();return}if(!results.children.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();active=e.key==='ArrowDown'?(active+1)%matches.length:(active-1+matches.length)%matches.length;highlight()}};
  fallback.onclick=()=>{const name=input.value.trim();if(name.length<2)return;const n={name,product:null};if(selectedNominations.some(x=>key(x)===key(n))){status.textContent='That name is already selected.';return}if(selectedNominations.length>=50){error.textContent='Choose up to 50 nominations.';return}selectedNominations.push(n);changed();selection();searchVersion++;searchController?.abort();clearTimeout(searchTimer);collapse();input.value='';nominationDraft='';fallback.hidden=true;status.textContent='Name added for review. Add another favorite.';input.focus()};
  form.onsubmit=async e=>{
    e.preventDefault();if(saving)return;if(continueButton&&!selectedNominations.length&&!(state.nominations||[]).length){go('board');return}changed();saving=true;searchVersion++;searchController?.abort();clearTimeout(searchTimer);collapse();input.disabled=true;fallback.disabled=true;submit.disabled=true;selection();
    try{const data=await api('/api/nominations',{nominations:selectedNominations.map(n=>n.product?{productId:n.product.id}:{name:n.name})});state.nominations=data.nominations;state.nomination=data.nominations[0]||null;save();nominationDraft='';selectedNominations=null;await refreshCommunity();if(continueButton){go('board');return}if(screen==='board'||screen==='game'&&index===products.length){if(screen==='board')board();else{nominationCard();focusScreenHeading()}document.getElementById('nomination-saved').hidden=false}}
    catch(err){error.textContent=err.message}
    finally{saving=false;if(form.isConnected){input.disabled=false;fallback.disabled=false;submit.disabled=false;selection()}}
  };
  selection();if(nominationDraft.trim().length>=2)runSearch();
}
