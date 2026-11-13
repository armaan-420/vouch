(()=>{
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let pending=null,loadedAt=0;
 function load(){
  if(!pending||Date.now()-loadedAt>30000){loadedAt=Date.now();pending=fetch('/api/categories',{credentials:'same-origin'}).then(async response=>{if(!response.ok)throw Error('Categories are unavailable.');return (await response.json()).categories;}).catch(error=>{pending=null;throw error;});}
  return pending;
 }
 function card(category){
  const path='/'+encodeURIComponent(category.id),name=esc(category.category);
  return `<article class="category-card"><a class="category-photo" href="${path}?start=1" aria-label="Start vouching in ${name}">${category.image?`<img src="${esc(category.image)}" alt="" loading="lazy">`:'<span class="category-photo-fallback" aria-hidden="true">✳</span>'}</a><div class="category-card-content"><p class="category-count">${category.productCount} product${category.productCount===1?'':'s'}</p><h3><a href="${path}?start=1">${name}</a></h3><p class="category-edit-title">${esc(category.title)}</p><div class="category-actions"><a class="category-start" href="${path}?start=1">Start vouching <span aria-hidden="true">→</span></a><a class="category-board" href="${path}?board=1">View board</a></div></div></article>`;
 }
 function section(){return '<section class="next-categories" aria-labelledby="next-categories-title"><div class="category-section-heading"><div><p class="eyebrow">KEEP THE GOOD TASTE GOING</p><h2 id="next-categories-title">What else have you tried?</h2><p>Vouch for your favorites in another category.</p></div><a class="category-browse" href="/categories">View all categories <span aria-hidden="true">→</span></a></div><div data-categories aria-live="polite" aria-busy="true"><p class="category-status" role="status">Finding more categories…</p></div></section>';}
 async function mount(root,{exclude=null,limit=Infinity}={}){
  const target=root.querySelector('[data-categories]');if(!target)return;
  try{
   const categories=(await load()).filter(c=>c.id!==exclude).slice(0,limit);if(!target.isConnected)return;
   target.innerHTML=categories.length?'<div class="category-grid">'+categories.map(card).join('')+'</div>':`<p class="category-status">${exclude?'You’ve reached the only category open right now.':'More categories are on the way.'} Have one in mind? <button type="button" class="text-button" data-category-suggest>Suggest a category →</button></p>`;
   target.querySelector('[data-category-suggest]')?.addEventListener('click',event=>window.VouchSuggestions?.open(event.currentTarget));
   target.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;const fallback=document.createElement('span');fallback.className='category-photo-fallback';fallback.setAttribute('aria-hidden','true');fallback.textContent='✳';img.after(fallback);},{once:true}));
  }catch{
   if(!target.isConnected)return;
   target.innerHTML='<p class="category-status" role="status">Couldn’t load categories. <button type="button" class="text-button" data-category-retry>Try again</button></p>';
   target.querySelector('[data-category-retry]').onclick=()=>mount(root,{exclude,limit});
  }finally{target.setAttribute('aria-busy','false');}
 }
 window.VouchCategories={section,mount};
 if(document.body.classList.contains('categories-page'))mount(document);
})();
