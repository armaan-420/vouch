import {categoryHref,categoriesUnlocked,extraCategories,unlockKey,whartonChoices} from './wharton-categories.js';
import {progressMarkup} from './pilot-progress.js';
import {suggestionDialog} from './pilot-next.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusOrder={partial:0,new:1,done:2};
const lockIcon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>';

async function participation(categories) {
  const chunks=[];
  for(let i=0;i<categories.length;i+=24)chunks.push(categories.slice(i,i+24));
  const results=await Promise.all(chunks.map(async chunk=>{
    const params=new URLSearchParams(chunk.map(category=>['id',category.id]));
    const response=await fetch('/api/category-participation?'+params,{credentials:'same-origin'});
    if(!response.ok)throw Error('Couldn’t load your progress.');
    const data=(await response.json()).categories;
    if(!chunk.every(c=>Object.hasOwn(statusOrder,data?.[c.id]?.status)))throw Error('Couldn’t load your progress.');
    return data;
  }));
  return Object.assign({},...results);
}

export function whartonProgress(groups,states) {
  const live=groups.filter(group=>group.experiment);
  const done=live.filter(group=>states[group.experiment.id]?.status==='done').length;
  const next=live.find(group=>states[group.experiment.id]?.status!=='done');
  const state=done>0&&!next?'done':done||live.some(group=>states[group.experiment.id]?.status==='partial')?'returning':'new';
  return {state,live,done,next};
}

function card(group,{progress,kicker,wharton=true}={}) {
  const {experiment:category,name,subtitle,key}=group;
  const source=wharton?'wharton':'unlocked';
  const tag=category?'a':'article';
  const fallback=wharton?'/category-covers/'+key+'.svg':category.fallbackImage||'/category-covers/essentials.svg';
  const status=progress?.status||'new';
  const answered=progress?.answeredProductIds.length;
  const pill={new:'Start',partial:'Continue · '+answered+' of '+category?.productCount,done:'✓ Vouched · See the Board'}[status];
  const spoken={new:'Start',partial:'Continue, '+answered+' of '+category?.productCount+' answered',done:'Vouched, see the Board'}[status];
  const attrs=category?`data-pilot-category="${esc(category.id)}" data-source="${source}" href="${categoryHref(category.id,status,wharton)}"`:'';
  return `<${tag} class="wharton-category ${category?'':'is-upcoming'} ${kicker?'is-highlighted':''}" ${attrs} ${progress?`aria-label="${esc(name+', '+spoken)}"`:''}>
    <img src="${esc(category?.image||fallback)}" ${wharton?'':`data-fallback="${esc(fallback)}"`} alt="">
    <div>${kicker?`<span class="wharton-category-kicker">${kicker}</span>`:''}<h2>${esc(name)}</h2><p>${esc(subtitle)}</p>
    ${progress?`<span class="wharton-category-status is-${status}">${pill}</span>`:!category?'<small>Coming soon</small>':''}</div>
    <span aria-hidden="true">${category?'→':''}</span></${tag}>`;
}

const moreCard='<section class="wharton-more"><h2>More categories are on the way.</h2><p>You’ve vouched every open category. Tell us what Wharton should vouch for next.</p><button type="button" class="pilot-button is-outline" data-suggest-category>Suggest a category</button></section>';

function compactRows(groups) {
  return `<ul class="wharton-completed">${groups.map(({name,experiment})=>`<li><span><span aria-hidden="true">✓</span> ${esc(name)}</span><a href="${categoryHref(experiment.id,'done',true)}" aria-label="${esc('See the '+name+' Board')}">See the Board</a></li>`).join('')}</ul>`;
}

function unlockCard(live,count) {
  return `<section class="wharton-unlock">
    <p class="eyebrow">YOU EARNED IT</p>
    <h2>Unlock all categories</h2>
    <p>${count===1?'1 more category is open':count+' more categories are open'} on Vouch. Vouch for anything else you’ve tried.</p>
    <ul class="wharton-stamps">${live.map(({name})=>`<li>✓ ${esc(name)}</li>`).join('')}</ul>
    <button type="button" class="pilot-button is-lime" data-unlock>${lockIcon} Unlock all categories</button>
  </section>`;
}

async function saveUnlock() {
  let response;
  try{
    response=await fetch('/api/account/pilot-unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  }catch{
    return {offline:true};
  }
  if(response.status===409)return {conflict:true};
  if(!response.ok)throw Error('Couldn’t save the unlock. Try again.');
  return response.json();
}

async function collapse(card) {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  card.classList.add('is-unlocking');
  await card.animate([
    {height:card.offsetHeight+'px',opacity:1},
    {height:'0px',opacity:0,paddingBlock:'0px',marginBlock:'0px'}
  ],{duration:180,easing:'ease-out',fill:'forwards'}).finished;
}

export async function mountWhartonHome(root,profile,{member,frame,error}) {
  const first=esc(profile.displayName.trim().split(/\s+/)[0]);
  const welcome=`<p class="eyebrow">YOUR TASTE BELONGS HERE</p><h1 tabindex="-1">What do you<br><em>know and love?</em></h1><p class="wharton-intro">Welcome, ${first}. Start with one category. Explore the rest whenever you like.</p>`;
  const container='<div data-categories aria-busy="true"></div>';
  const announce=document.getElementById('wharton-unlock-status');
  frame(categoriesUnlocked(profile)&&member?container:welcome+container);
  let host=root.querySelector('[data-categories]');

  function bindCards() {
    host.querySelectorAll('[data-pilot-category]').forEach(link=>link.addEventListener('click',()=>{
      window.VouchPilot.track('category_chosen',{experimentId:link.dataset.pilotCategory,source:link.dataset.source});
    }));
    for(const img of host.querySelectorAll('img[data-fallback]')){
      const fallback=()=>{img.src=img.dataset.fallback;};
      img.addEventListener('error',fallback,{once:true});
      if(img.complete&&!img.naturalWidth)fallback();
    }
    const suggest=host.querySelector('[data-suggest-category]');
    if(suggest)suggest.onclick=()=>suggestionDialog(suggest,()=>{suggest.textContent='Suggest another category';announce.textContent='Thanks for suggesting a category.';},true);
  }

  function show(markup,content) {
    frame(markup+container);
    host=root.querySelector('[data-categories]');
    host.innerHTML=content;
    host.setAttribute('aria-busy','false');
    bindCards();
  }

  function failed(retry,message) {
    host.innerHTML='<button type="button" class="text-button">Couldn’t load categories. Try again</button>';
    host.querySelector('button').onclick=retry;
    host.setAttribute('aria-busy','false');
    error(message);
  }

  try{
    const response=await fetch('/api/categories');
    if(!response.ok)throw Error('Couldn’t load categories.');
    const available=(await response.json()).categories;
    const groups=whartonChoices(available);
    const extras=extraCategories(available);
    const openGroups=groups.filter(group=>group.experiment);

    async function showUnlocked(animate,statesPromise=participation(extras)) {
      document.body.classList.add('wharton-unlocked');
      const heading='<p class="wharton-unlocked-badge">✓ EVERY CATEGORY UNLOCKED</p><h1 tabindex="-1">What else do you <em>know and love?</em></h1><p class="wharton-intro">Pick any category. Your Wharton three are always here.</p>';
      const chips=`<nav class="wharton-boards" aria-label="Your Wharton Boards"><h2 class="eyebrow">YOUR WHARTON THREE</h2><div>${openGroups.map(({name,experiment})=>`<a href="${categoryHref(experiment.id,'done',true)}"><span aria-hidden="true">✓</span> ${esc(name)}</a>`).join('')}</div></nav>`;
      try{
        const states=await statesPromise;
        const ordered=extras.slice().sort((a,b)=>statusOrder[states[a.id].status]-statusOrder[states[b.id].status]);
        const cards=ordered.map((category,index)=>{
          const progress=states[category.id];
          const kicker=index===0?{new:'New for you',partial:'Up next'}[progress.status]:null;
          return card({experiment:category,name:category.category,subtitle:category.title},{progress,kicker,wharton:false});
        });
        show(heading,(cards.length?`<div class="wharton-category-list has-progress">${cards.join('')}</div>`:moreCard)+chips);
        if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
          const fade=[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}];
          host.querySelectorAll('.wharton-category,.wharton-more').forEach((item,index)=>item.animate(fade,{duration:220,delay:40*index,easing:'ease-out',fill:'backwards'}));
        }
      }catch(e){
        show(heading,chips);
        const retry=document.createElement('button');
        retry.className='text-button';
        retry.textContent='Couldn’t load categories. Try again';
        retry.onclick=()=>showUnlocked(false);
        host.prepend(retry);
        error(e);
      }
      if(animate)announce.textContent='Every category unlocked.';
    }

    if(member&&categoriesUnlocked(profile)){
      if(!profile.categoriesUnlockedAt){
        const result=await saveUnlock().catch(()=>null);
        if(result?.conflict||result?.categoriesUnlockedAt){
          try{localStorage.removeItem(unlockKey(profile.handle));}catch{}
          profile.categoriesUnlockedAt=result.categoriesUnlockedAt;
        }
      }
      if(categoriesUnlocked(profile)){await showUnlocked(false);return;}
    }

    let states={};
    if(member){
      try{states=await participation(openGroups.map(group=>group.experiment));}catch{}
    }
    const {state,live,done,next}=whartonProgress(groups,states);
    if(state==='new'){
      show(welcome,'<div class="wharton-category-list">'+groups.map((group,index)=>card(group,{kicker:index===0&&group.experiment?'Start here':null})).join('')+'</div>');
      return;
    }
    const nextIsPartial=next&&states[next.experiment.id].status==='partial';
    const nextSentence=nextIsPartial?`Your ${esc(next.name.toLowerCase())} takes are waiting where you left off.`:next?`Next up: ${esc(next.name)}.`:'';
    const total=live.length;
    const progress=progressMarkup(done,`${done} of ${total} vouched`,{segments:total,role:'img'});
    const eyebrow=state==='done'?(total===3?'ALL THREE VOUCHED':'ALL WHARTON CATEGORIES VOUCHED'):'YOUR WHARTON THREE';
    const title=state==='done'?'Nice taste,':'Welcome back,';
    const body=state==='done'?'You’ve vouched every Wharton category.':(done?`You’ve vouched ${done} of ${total}. `:'')+nextSentence;
    const heading=`<p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title} <em>${first}.</em></h1><p class="wharton-intro">${body}</p>${progress}`;
    if(state==='returning'){
      show(heading,'<div class="wharton-category-list has-progress">'+live.map(group=>card(group,{progress:states[group.experiment.id],kicker:next===group?'Up next':null})).join('')+'</div>');
      return;
    }

    show(heading,(extras.length?unlockCard(live,extras.length):moreCard)+compactRows(live));
    const button=host.querySelector('[data-unlock]');
    if(!button)return;
    button.onclick=async()=>{
      if(button.getAttribute('aria-disabled')==='true')return;
      button.setAttribute('aria-disabled','true');
      try{
        const result=await saveUnlock();
        if(result.conflict){
          await mountWhartonHome(root,profile,{member,frame,error});
          error(Error('Your category progress changed. Check your latest progress.'));
          return;
        }
        if(result.offline){
          try{localStorage.setItem(unlockKey(profile.handle),new Date().toISOString());}catch{}
        }else{
          profile.categoriesUnlockedAt=result.categoriesUnlockedAt;
        }
        window.VouchPilot.track('categories_unlocked');
        const list=participation(extras);
        await Promise.allSettled([list,collapse(button.closest('.wharton-unlock'))]);
        await showUnlocked(true,list);
      }catch(e){
        error(e);
        button.removeAttribute('aria-disabled');
      }
    };
  }catch(e){
    failed(()=>mountWhartonHome(root,profile,{member,frame,error}),e);
  }
}
