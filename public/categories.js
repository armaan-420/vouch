(()=>{
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let pending=null,loadedAt=0;
 function fallback(category){const c=category.toLowerCase();return '/category-covers/'+(c.includes('air purifier')?'air-purifiers':c.includes('headphone')?'headphones':c.includes('blush')?'blush':c.includes('hand cream')?'hand-cream':c.includes('lip balm')?'lip-balm':c.includes('sunscreen')?'sunscreen':c.includes('bottle')?'water-bottles':'essentials')+'.svg';}
 function load(){
  if(!pending||Date.now()-loadedAt>30000){loadedAt=Date.now();pending=fetch('/api/categories',{credentials:'same-origin'}).then(async response=>{if(!response.ok)throw Error('Categories are unavailable.');return (await response.json()).categories;}).catch(error=>{pending=null;throw error;});}
  return pending;
 }
 function card(category){
  const path='/'+encodeURIComponent(category.id),name=esc(category.category),flow=location.pathname.startsWith('/wharton')||new URLSearchParams(location.search).get('wharton')==='1'?'&wharton=1':'';
  return `<article class="category-card"><a class="category-photo" href="${path}?start=1${flow}" aria-label="Start vouching in ${name}"><img src="${esc(category.image||fallback(category.category))}" data-fallback="${fallback(category.category)}" alt="" loading="lazy"></a><div class="category-card-content"><p class="category-count">${category.productCount} product${category.productCount===1?'':'s'}</p><h3><a href="${path}?start=1${flow}">${name}</a></h3><p class="category-edit-title">${esc(category.title)}</p><div class="category-actions"><a class="category-start" href="${path}?start=1${flow}">Start vouching <span aria-hidden="true">→</span></a><a class="category-board" href="${path}?board=1${flow}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7"/></svg>View board <span aria-hidden="true">→</span></a></div></div></article>`;
 }
 function section(){return '<section class="next-categories" aria-labelledby="next-categories-title"><div class="category-section-heading"><div><p class="eyebrow">KEEP THE GOOD TASTE GOING</p><h2 id="next-categories-title">What else have you tried?</h2><p>Vouch for your favorites in another category.</p></div><a class="category-browse" href="/categories">View all categories <span aria-hidden="true">→</span></a></div><div data-categories aria-live="polite" aria-busy="true"><p class="category-status" role="status">Finding more categories…</p></div></section>';}
 async function mount(root,{exclude=null,limit=Infinity}={}){
  const target=root.querySelector('[data-categories]');if(!target)return;
  try{
   const categories=(await load()).filter(c=>c.id!==exclude).sort((a,b)=>a.category.localeCompare(b.category,'en',{sensitivity:'base',numeric:true})||a.title.localeCompare(b.title,'en',{sensitivity:'base'})||a.id.localeCompare(b.id)).slice(0,limit);if(!target.isConnected)return;
   target.innerHTML=categories.length?'<div class="category-grid">'+categories.map(card).join('')+'</div>':`<p class="category-status">${exclude?'You’ve reached the only category open right now.':'More categories are on the way.'} Have one in mind? <button type="button" class="text-button" data-category-suggest>Suggest a category →</button></p>`;
   target.querySelector('[data-category-suggest]')?.addEventListener('click',event=>window.VouchSuggestions?.open(event.currentTarget));
   target.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.src=img.dataset.fallback;},{once:true}));
  }catch{
   if(!target.isConnected)return;
   target.innerHTML='<p class="category-status" role="status">Couldn’t load categories. <button type="button" class="text-button" data-category-retry>Try again</button></p>';
   target.querySelector('[data-category-retry]').onclick=()=>mount(root,{exclude,limit});
  }finally{target.setAttribute('aria-busy','false');}
 }
 window.VouchCategories={section,mount,load};
 if(document.body.classList.contains('categories-page'))mount(document);
})();
