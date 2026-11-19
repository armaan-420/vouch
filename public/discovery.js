(()=>{'use strict';
const $=id=>document.getElementById(id),query={value:''},category=$('discovery-category'),sort=$('discovery-sort'),reviewed=$('discovery-reviewed'),results=$('discovery-results'),status=$('discovery-status'),more=$('discovery-more');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let controller,version=0,loaded=0;
function restore(){const p=new URLSearchParams(location.search);query.value='';sort.value=['best','community'].includes(p.get('sort'))?p.get('sort'):'best';reviewed.checked=p.get('reviewed')==='1';const value=p.get('category')||'';category.replaceChildren(new Option('All categories',''));if(value)category.add(new Option(value,value));category.value=value;}
function card(p){const fit=p.fit,reviewCount=p.reviewCounts?.total||0;return `<article class="discovery-card" data-product-id="${esc(p.id)}"><div class="discovery-media"><a class="discovery-photo" href="${esc(p.href)}" tabindex="-1" aria-hidden="true">${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy">`:brandV()}</a><div class="photo-vote-bar" role="group" aria-label="Quick rate: ${esc(p.name)}">${window.VouchPhotoVote.options(fit?.verdict)}</div></div><div class="discovery-card-body"><div class="discovery-card-details"><p class="brand">${esc(p.brand)}</p><h3><a href="${esc(p.href)}">${esc(p.name)}</a></h3><div class="discovery-card-category"><p class="discovery-category">${esc(p.category)}</p><div class="discovery-tags">${(p.reasons.length?p.reasons:p.tags.map(t=>t.label)).slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div></div></div><div class="discovery-people"></div><div><div class="discovery-scores"><div><small>${p.score!=null?'Edit score':p.reviewScore!=null?'Public review score':'Community'}</small><strong>${esc(p.score??p.reviewScore??'Unrated')}</strong>${p.voteCounts.total?`<p>${p.voteCounts.total} Edit rating${p.voteCounts.total===1?'':'s'}</p>`: ''}${reviewCount?`<p>${reviewCount} public review${reviewCount===1?'':'s'}</p>`:''}</div><div data-discovery-fit><small>${fit?.verdict?'Your verdict':'Personal fit'}</small><strong class="${fit?.score!=null?'':'verdict'}">${fit?.score!=null?esc(fit.score.toFixed(1)):esc(fit?.label||'Still learning')}</strong><p>${fit?.score!=null?`Estimate · ${fit.basis} related ratings`:fit?.verdict?'From your collection':'Vouch for more products to discover your fit'}</p></div></div><p class="discovery-vote-status" role="status"></p><div class="discovery-vote-actions"></div></div></div></article>`;}
const peopleRequests=new WeakMap();
async function loadPeople(cards){
 if(!cards.length)return;
 const request=Symbol(),params=new URLSearchParams();
 for(const card of cards){
  peopleRequests.set(card,request);
  params.append('id',card.dataset.productId);
 }
 try{
  const response=await fetch('/api/people-summary?'+params);
  if(!response.ok)return;
  const {summaries}=await response.json();
  for(const card of cards){
   if(!card.isConnected||peopleRequests.get(card)!==request)continue;
   const summary=summaries[card.dataset.productId],host=card.querySelector('.discovery-people');
   host.replaceChildren();
   if(!summary?.total)continue;
   const lead=summary.people[0];
   const name=lead.isYou?'You':window.VouchPeople.shortName(lead.displayName);
   const text=summary.total>1?name+' + '+(summary.total-1)+' vouch':name+(lead.isYou?' vouch':' vouches');
   const href=card.querySelector('.discovery-photo').getAttribute('href');
   const avatars=summary.people.slice(0,3).map((person,index)=>window.VouchPeople.avatar(person,index,{className:'board-person'})).join('');
   host.innerHTML=`<div class="board-people-avatars">${avatars}</div><a class="board-people-link" href="${esc(href+'#item-people')}">${esc(text)}</a>`;
  }
 }catch{/* Product browsing remains available if attribution cannot load. */}
}

const verdictLabels={no:'You passed',brand:'You trust this brand',yes:'You vouched'};
async function saveRating(card,verdict,editId){
 const bar=card.querySelector('.photo-vote-bar');
 if(bar.getAttribute('aria-busy')==='true')return;
 const status=card.querySelector('.discovery-vote-status');
 const actions=card.querySelector('.discovery-vote-actions');
 const productId=card.dataset.productId;
 const href=card.querySelector('.discovery-photo').href;
 const previous=bar.querySelector('[aria-pressed="true"]')?.dataset.verdict;
 if(verdict==='skip'&&(!previous||previous==='skip')){
  bar.querySelector('[data-verdict="skip"]').setAttribute('aria-pressed','true');
  status.textContent='Marked as not tried.';
  return;
 }
 bar.setAttribute('aria-busy','true');
 status.textContent='Saving…';
 try{
  const response=await fetch('/api/account/vouch',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({productId,verdict,...(editId?{editId}:{})})
  });
  if(response.status===401){
   sessionStorage.setItem('vouch-pending-product',JSON.stringify({id:productId,verdict}));
   location.assign(href);
   return;
  }
  const data=await response.json();
  if(!response.ok||!data.saved)throw Error(data.error||'Could not save. Please try again.');
  for(const option of bar.querySelectorAll('.photo-vote-option')){
   option.setAttribute('aria-pressed',String(option.dataset.verdict===verdict));
  }
  const fit=card.querySelector('[data-discovery-fit]');
  fit.querySelector('small').textContent='Your verdict';
  fit.querySelector('strong').className='verdict';
  fit.querySelector('strong').textContent=verdictLabels[verdict]||'Not tried';
  fit.querySelector('p').textContent=verdict==='skip'?'':'From your collection';
  status.textContent=verdict==='skip'?'Your previous take was cleared.':'Saved to your profile.';
  actions.replaceChildren();
  const nomination=data.nomination;
  if(nomination?.status==='choose_edit'||nomination?.status==='retryable'){
   const choose=nomination.status==='choose_edit';
   status.textContent+=choose?' Choose an Edit to nominate it to.':' The Edit nomination could not be saved.';
   for(const edit of choose?nomination.edits:[{id:editId,title:'Retry nomination'}]){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=edit.title;
    button.onclick=()=>saveRating(card,'yes',edit.id);
    actions.append(button);
   }
  }
  if(nomination?.status==='nominated'||nomination?.status==='already_nominated'){
   status.textContent+=' Nominated to '+nomination.title+'.';
  }
  void loadPeople([card]);
 }catch(error){
  status.textContent=error.message;
 }finally{
  bar.setAttribute('aria-busy','false');
 }
}
results.addEventListener('click',event=>{
 const button=event.target.closest('.photo-vote-option');
 if(button)void saveRating(button.closest('.discovery-card'),button.dataset.verdict);
});

async function run({append=false,push=true}={}){controller?.abort();controller=new AbortController();const current=++version;const params=new URLSearchParams();if(query.value.trim())params.set('q',query.value.trim());if(category.value)params.set('category',category.value);if(sort.value!=='best')params.set('sort',sort.value);if(reviewed.checked)params.set('reviewed','1');if(push)history.pushState({},'', '/search'+(params.size?'?'+params:''));$('discovery-reset').hidden=!params.size;if(append)params.set('offset',loaded);else{loaded=0;results.replaceChildren();}more.hidden=true;status.textContent='Finding products…';results.setAttribute('aria-busy','true');$('discovery-note').hidden=true;
try{const response=await fetch('/api/discover?'+params,{signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Search is unavailable.');if(current!==version)return;const selected=category.value;category.replaceChildren(new Option('All categories',''));for(const {id,label} of data.categoryOptions)category.add(new Option(label,id));const option=data.categoryOptions.find(x=>x.id===selected||x.label===selected);if(selected&&!option)category.add(new Option(selected,selected));category.value=option?.id||selected;const first=results.children.length;loaded+=data.products.length;results.insertAdjacentHTML('beforeend',data.products.map(card).join(''));void loadPeople(Array.from(results.children).slice(first));results.querySelectorAll('.discovery-photo img').forEach(img=>img.onerror=()=>{img.replaceWith(Object.assign(document.createElement('span'),{innerHTML:brandV()}));});$('results-title').textContent=category.selectedOptions[0]?.textContent==='All categories'?'All products':category.selectedOptions[0]?.textContent;status.textContent=`${data.total} product${data.total===1?'':'s'}${query.value.trim()?' matching “'+query.value.trim()+'”':''} · ${data.catalogueCount} in the Vouch collection`;if(!data.total)results.innerHTML='<div class="discovery-empty"><h3>No matches just yet.</h3><p>Try another category or clear the community ratings filter.</p><button type="button" id="browse-all">Explore all products</button></div>';if($('browse-all'))$('browse-all').onclick=reset;more.hidden=!data.hasMore;if(data.note){$('discovery-note').textContent=data.note;$('discovery-note').hidden=false;}}
catch(error){if(error.name==='AbortError'||current!==version)return;status.textContent='The product library couldn’t load. Please try again.';if(!append)results.innerHTML='<div class="discovery-empty"><h3>A little hiccup.</h3><p>Your filters are still here. Try again in a moment.</p><button type="button" id="search-retry">Try again</button></div>';else more.hidden=false;if($('search-retry'))$('search-retry').onclick=()=>run({push:false});}
finally{if(current===version)results.setAttribute('aria-busy','false');}}
function reset(){query.value='';category.value='';sort.value='best';reviewed.checked=false;run();}
for(const input of [category,sort,reviewed])input.onchange=()=>run();document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{query.value=b.dataset.query;category.value='';run();});$('discovery-reset').onclick=reset;more.onclick=()=>run({append:true,push:false});window.addEventListener('popstate',()=>{restore();run({push:false});});restore();run({push:false});
})();
