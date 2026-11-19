(()=>{
 'use strict';
 const matchers=[{name:'Water bottles',match:/water bottle/i},{name:'Lip balm',match:/lip balm/i},{name:'Carry-on luggage',match:/carry[ -]?on/i}];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function markup(experiment){return matchers.some(g=>g.match.test(experiment.category))?'<div class="board-category-switcher" aria-busy="true"><p class="board-category-status" role="status">Finding Wharton experiments…</p></div>':'';}
 async function mount(root,experiment,{whartonFlow=false,profile,demoParticipation,onLoaded,onError}={}){
  const host=root.querySelector('.board-category-switcher');if(!host)return;
  try{
   const {categoriesUnlocked,whartonChoices}=await import('/wharton-categories.js');
   const available=await window.VouchCategories.load();
   const items=whartonChoices(available);
   const query=new URLSearchParams();items.filter(i=>i.experiment).forEach(i=>query.append('id',i.experiment.id));
   let states=null,pilot=null;
   if(demoParticipation)states=Object.fromEntries(items.filter(item=>item.experiment).map(({experiment:e})=>[e.id,demoParticipation(e)]));
   else if(query.size){if(whartonFlow)query.set('wharton','1');const response=await fetch('/api/category-participation?'+query,{credentials:'same-origin'});if(!response.ok)throw Error('Participation could not load.');({categories:states,pilot}=await response.json());}
   if(!host.isConnected)return;
   const suffix=whartonFlow?'&wharton=1':'';
   if(profile){
    host.innerHTML=categoriesUnlocked(profile)?'<nav class="board-category-chips" aria-label="Categories"><a class="pilot-button is-outline" href="/wharton">See more categories</a></nav>':'';
   }else host.innerHTML='<nav class="board-category-chips" aria-label="Wharton experiments">'+items.map(item=>{const e=item.experiment,status=e&&states?.[e.id]?.status;return e?`<a class="board-category-chip" href="/${encodeURIComponent(e.id)}?board=1${suffix}" ${e.id===experiment.id?'aria-current="page"':''}>${esc(item.name)}${status==='done'?'<span aria-label="Completed">✓</span>':'<span class="category-needs-take" aria-label="Share your take"></span>'}</a>`:`<span class="board-category-chip is-upcoming" aria-disabled="true">${esc(item.name)} <small>Soon</small></span>`;}).join('')+'</nav>';
   const current=items.find(i=>i.experiment?.id===experiment.id),status=states?.[experiment.id]?.status;
   if(current&&status!=='done')host.insertAdjacentHTML('beforeend',`<section class="board-category-invite"><div><strong>${status==='partial'?'Your takes are waiting.':'Tried any of these?'}</strong><p>${status==='partial'?'Pick up where you left off in '+esc(current.name.toLowerCase())+'.':'Add your take to the '+esc(current.name)+' Board.'}</p></div><a href="/${encodeURIComponent(experiment.id)}?start=1${status==='partial'?'&resume=1':''}${suffix}">${status==='partial'?'Continue vouching':'Vouch for '+esc(current.name.toLowerCase())} →</a></section>`);
   if(states)await onLoaded?.({items,states,pilot,available});
   else onError?.();
  }catch{if(host.isConnected){onError?.();host.innerHTML='<p class="board-category-status">Categories could not load. <button class="text-button" type="button">Try again</button></p>';host.querySelector('button').onclick=()=>mount(root,experiment,{whartonFlow,profile,demoParticipation,onLoaded,onError});}}
  finally{if(host.isConnected)host.setAttribute('aria-busy','false');}
 }
 window.VouchBoardCategories={markup,mount};
})();
