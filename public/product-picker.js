// Shared selection interaction for nominations and the organizer product picker.
window.VouchProductPicker=function({input,results,more,clear,another,esc,isSelected,onChoose,onClear,boardLabel="Already on the board · View product"}){
 const media=matchMedia('(max-width:600px)'),pageSize=()=>media.matches?3:5;
 let products=[],limit=pageSize(),active=-1,disabled=false;
 const rows=()=>[...results.querySelectorAll('.product-result')];
 function highlight(){
  rows().forEach((row,i)=>{const chosen=isSelected(products[i]);row.setAttribute('aria-selected',String(chosen));row.classList.toggle('search-active',i===active);row.querySelector('.result-check').textContent=chosen?'✓':'';});
  if(active>=0){input.setAttribute('aria-activedescendant',input.id+'-result-'+active);rows()[active]?.scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');
 }
 function render(){
  results.innerHTML=products.slice(0,limit).map((p,i)=>`<button class="product-result" id="${input.id}-result-${i}" type="button" role="option" aria-selected="false" tabindex="-1" ${disabled?'disabled':''}><span class="result-check" aria-hidden="true"></span>${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy">`:'<span class="search-photo-placeholder" aria-hidden="true">✳</span>'}<span class="result-info"><span class="search-brand">${esc(p.brand||'')}</span><strong>${esc(p.name)}</strong><small>${p.onBoardId?esc(boardLabel):esc(p.spf||p.source||'')}${!p.onBoardId&&p.countries?' · '+esc(p.countries):''}</small></span></button>`).join('');
  rows().forEach((row,i)=>row.onclick=()=>{if(!disabled){onChoose(products[i]);highlight();input.focus();}});
  input.setAttribute('aria-expanded',String(products.length>0));more.hidden=products.length<=limit;more.disabled=disabled;more.textContent=`See more results (${Math.max(0,products.length-limit)} more)`;highlight();
 }
 function collapse(){results.innerHTML='';more.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
 function updateClear(){clear.hidden=another.hidden=!input.value;}
 more.onclick=()=>{limit+=pageSize();render();input.focus();};
 clear.onclick=another.onclick=()=>{if(disabled)return;input.value='';onClear();updateClear();input.focus();};
 input.addEventListener('input',updateClear);input.addEventListener('focus',()=>{if(products.length&&!rows().length)render();});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();collapse();return;}
  if(e.key==='Enter'){e.preventDefault();if(active>=0&&!disabled)onChoose(products[active]);highlight();return;}
  if(!products.length||!['ArrowDown','ArrowUp'].includes(e.key))return;
  e.preventDefault();if(!rows().length)render();const count=Math.min(limit,products.length);active=e.key==='ArrowDown'?(active+1)%count:(active-1+count)%count;highlight();
 });
 const resize=()=>{limit=pageSize();active=-1;if(rows().length)render();};media.addEventListener('change',resize);updateClear();
 return {setProducts(items){products=items;limit=pageSize();active=-1;render();},clear(){products=[];collapse();updateClear();},refresh:highlight,setDisabled(value){disabled=value;clear.disabled=another.disabled=more.disabled=value;rows().forEach(row=>row.disabled=value);},destroy(){media.removeEventListener('change',resize);}};
};
