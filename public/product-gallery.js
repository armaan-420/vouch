(()=>{
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=value=>typeof value==='string'&&(/^https:\/\//.test(value)||/^\/assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(value));
 function markup(product,className=''){
  const images=[...new Set([product.image,...(Array.isArray(product.images)?product.images:[])].filter(safe))].slice(0,4),label=[product.brand,product.name].filter(Boolean).join(' ');
  return `<div class="product-gallery ${className}" role="group" aria-roledescription="carousel" aria-label="${esc(label)} photos" data-gallery data-images="${esc(JSON.stringify(images))}" data-label="${esc(label)}" data-index="0" tabindex="0">${images.length?`<img class="gallery-image" src="${esc(images[0])}" alt="${esc(label)} — photo 1 of ${images.length}" decoding="async">`:'<span class="product-placeholder" role="img" aria-label="Photo unavailable">✳</span>'}${images.length>1?`<div class="gallery-controls"><button type="button" data-gallery-step="-1" aria-label="Previous photo">‹</button><span class="gallery-count" role="status" aria-live="polite" aria-atomic="true">1 / ${images.length}</span><button type="button" data-gallery-step="1" aria-label="Next photo">›</button></div>`:''}</div>`;
 }
 function move(g,step){
  const images=JSON.parse(g.dataset.images);if(images.length<2)return;
  const i=(Number(g.dataset.index)+step+images.length)%images.length;g.dataset.index=String(i);
  const img=g.querySelector('img');img.hidden=false;g.querySelector('.gallery-unavailable')?.remove();img.src=images[i];img.alt=g.dataset.label+' — photo '+(i+1)+' of '+images.length;g.querySelector('.gallery-count').textContent=(i+1)+' / '+images.length;
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-gallery-step]');if(b){e.preventDefault();move(b.closest('[data-gallery]'),Number(b.dataset.galleryStep));}});
 document.addEventListener('keydown',e=>{const g=e.target.closest('[data-gallery]');if(g&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();move(g,e.key==='ArrowRight'?1:-1);}});
 let start=null;
 document.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-gallery]');start=g?{g,x:e.clientX,y:e.clientY,id:e.pointerId}:null;});
 document.addEventListener('pointerup',e=>{if(start&&e.pointerId===start.id&&e.target.closest('[data-gallery]')===start.g){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)move(start.g,dx<0?1:-1);}start=null;});
 document.addEventListener('pointercancel',()=>{start=null;});
 document.addEventListener('error',e=>{const img=e.target;if(!img.matches?.('.gallery-image'))return;img.hidden=true;const g=img.closest('[data-gallery]');if(!g.querySelector('.gallery-unavailable'))g.insertAdjacentHTML('afterbegin','<span class="gallery-unavailable" role="status">Photo unavailable</span>');},true);
 window.VouchGallery={markup};
})();
