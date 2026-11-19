import {categoryHref,categoriesUnlocked,earnedUnlock,extraCategories,gateCategory,participation,pilotLockIcon,unlockableCategories,unlockKey,whartonChoices} from './wharton-categories.js';
import {progressMarkup} from './pilot-progress.js';
import {suggestionDialog} from './pilot-next.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusOrder={partial:0,new:1,done:2};
const lockIcon=pilotLockIcon();

export function whartonProgress(groups,states) {
  const gate=gateCategory(groups);
  const done=groups.filter(group=>states[group.experiment?.id]?.status==='done');
  const progress=states[gate?.experiment.id];
  const state=earnedUnlock(groups,states)?'done':progress?.status==='partial'?'returning':'new';
  return {state,gate,done,progress};
}

function card(group,{progress,kicker,highlight=!!kicker,wharton=true,source=wharton?'wharton':'unlocked'}={}) {
  const {experiment:category,name,subtitle,key}=group;
  const tag=category?'a':'article';
  const fallback=category?.fallbackImage||(wharton?'/category-covers/'+key+'.svg':'/category-covers/essentials.svg');
  const status=progress?.status||'new';
  const answered=progress?.answeredProductIds?.length;
  const pill={new:'Start',partial:'Continue · '+answered+' of '+category?.productCount,done:'✓ Vouched · See the Board'}[status];
  const spoken={new:'Start',partial:'Continue, '+answered+' of '+category?.productCount+' answered',done:'Vouched, see the Board'}[status];
  const attrs=category?`data-pilot-category="${esc(category.id)}" data-source="${source}" href="${categoryHref(category.id,status,wharton)}"`:'';
  return `<${tag} class="wharton-category ${category?'':'is-upcoming'} ${highlight?'is-highlighted':''}" ${attrs} ${category?`aria-label="${esc(name+', '+spoken)}"`:''}>
    <img src="${esc(category?.image||fallback)}" data-fallback="${esc(fallback)}" alt="">
    <div>${kicker?`<span class="wharton-category-kicker">${kicker}</span>`:''}<h2>${esc(name)}</h2><p>${esc(subtitle)}</p>
    ${progress?`<span class="wharton-category-status is-${status}">${pill}</span>`:!category?'<small>Coming soon</small>':''}</div>
    <span aria-hidden="true">${category?'→':''}</span></${tag}>`;
}

const moreCard='<section class="wharton-more"><h2>More categories are on the way.</h2><p>You’ve vouched every open category. Tell us what Wharton should vouch for next.</p><button type="button" class="pilot-button is-outline" data-suggest-category>Suggest a category</button></section>';

function compactRows(groups) {
  return `<ul class="wharton-completed">${groups.map(({name,experiment})=>`<li><span><span aria-hidden="true">✓</span> ${esc(name)}</span><a href="${categoryHref(experiment.id,'done',true)}" aria-label="${esc('See the '+name+' Board')}">See the Board</a></li>`).join('')}</ul>`;
}

function cover(category) {
  const fallback=category.fallbackImage||'/category-covers/essentials.svg';
  return `<img src="${esc(category.image||fallback)}" data-fallback="${esc(fallback)}" alt="">`;
}

function sectionTitle(title,detail,icon='') {
  return `<header class="wharton-section-title"><h2 class="eyebrow">${icon}${title}</h2><span>${detail}</span></header>`;
}

function categoryTile(category,{pick,gate,progress}={}) {
  const name=pick?.name||category.category;
  const image=`<span class="wharton-tile-image">${cover(category)}${gate?`<span class="wharton-tile-lock">${pilotLockIcon({size:12})}</span>`:''}</span>`;
  const label=`<span class="wharton-tile-name">${esc(name)}</span>`;
  if(gate)return `<button type="button" class="wharton-tile is-locked" data-locked-category="${esc(category.id)}" data-name="${esc(name)}" aria-label="${esc(name+', locked. Unlocks after '+gate.shortLabel+'.')}">${image}${label}${pick?'<span class="wharton-pick-label">Wharton pick</span>':''}</button>`;
  const {status}=progress;
  const pill={new:'Start',partial:'Continue · '+progress.answeredProductIds.length+' of '+category.productCount,done:'✓ Vouched'}[status];
  return `<a class="wharton-tile" href="${categoryHref(category.id,status)}" data-pilot-category="${esc(category.id)}" data-source="unlocked">${image}${label}<span class="wharton-category-status is-${status}">${pill}</span></a>`;
}

function unlockMeter(answered,total,remaining) {
  const label=answered+' of '+total+' rated, '+remaining+' to unlock every category';
  const bar=total<=12?progressMarkup(answered,label,{segments:total,role:'img'}):`<div class="wharton-meter-continuous" role="img" aria-label="${label}"><span style="width:${answered/total*100}%"></span></div>`;
  return `<div class="wharton-meter"><div class="wharton-meter-track">${bar}<span>${pilotLockIcon({size:12})}</span></div><p aria-hidden="true"><strong>${answered} of ${total} rated</strong> · ${remaining} to unlock</p></div>`;
}

function unlockCard(categories,picks) {
  const count=categories.length;
  const names=picks.map(pick=>pick.key==='carry-on'?'carry-on':pick.shortLabel).join(' and ');
  const including=names?`, including Wharton's ${esc(names)} ${picks.length===1?'pick':'picks'}`:'';
  return `<section class="wharton-unlock">
    <p class="eyebrow">YOU EARNED IT</p>
    <h2>Unlock every category</h2>
    <p>${count===1?'1 more category is open':count+' more categories are open'}${including}.</p>
    <div class="wharton-cover-fan" aria-hidden="true">${categories.slice(0,4).map(cover).join('')}<span>${lockIcon}</span></div>
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
  await Promise.allSettled(card.getAnimations({subtree:true}).map(animation=>animation.finished));
  await card.animate([
    {height:card.offsetHeight+'px',opacity:1},
    {height:'0px',opacity:0,paddingBlock:'0px',marginBlock:'0px'}
  ],{duration:180,easing:'ease-out',fill:'forwards'}).finished;
}

export async function mountWhartonHome(root,profile,{member,frame,error,demo=false}) {
  const first=esc(profile.displayName.trim().split(/\s+/)[0]);
  const welcome=`<p class="eyebrow">YOUR TASTE BELONGS HERE</p><h1 tabindex="-1">What do you<br><em>know and love?</em></h1><p class="wharton-intro">Welcome, ${first}. Start with one category. Explore the rest whenever you like.</p>`;
  const container='<div data-categories aria-busy="true"></div>';
  const tapped=new Set();
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
    const gate=gateCategory(groups);
    const picks=groups.filter(group=>group.experiment&&group!==gate);
    const unlockable=unlockableCategories(available);
    const orderedUnlockable=[...picks.map(pick=>pick.experiment),...unlockable.filter(category=>!picks.some(pick=>pick.experiment.id===category.id))];

    function bindShelf(categories,remaining,partial) {
      const tiles=[...host.querySelectorAll('[data-locked-category]')];
      const more=host.querySelector('[data-more-locked]');
      const hint=host.querySelector('[data-locked-hint]');
      const desktop=matchMedia('(min-width: 768px)');
      let expanded=false;
      function update() {
        const limit=desktop.matches?10:6;
        const visible=!expanded&&categories.length>limit?limit-1:categories.length;
        tiles.forEach((tile,index)=>{tile.hidden=index>=visible;});
        more.hidden=visible===categories.length;
        more.textContent='+'+(categories.length-visible)+' more';
        return visible;
      }
      update();
      desktop.addEventListener('change',update);
      more.onclick=()=>{
        const next=tiles.find(tile=>tile.hidden);
        expanded=true;
        update();
        desktop.removeEventListener('change',update);
        more.remove();
        next?.focus();
      };
      tiles.forEach(tile=>{tile.onclick=()=>{
        tiles.forEach(item=>item.classList.toggle('is-selected',item===tile));
        const suffix=partial?` ${remaining} to go.`:'';
        hint.querySelector('span').textContent=tile.dataset.name+' unlocks after '+gate.shortLabel+'.'+suffix;
        hint.classList.add('is-visible');
        if(member&&!demo&&!tapped.has(tile.dataset.lockedCategory)){
          tapped.add(tile.dataset.lockedCategory);
          window.VouchPilot.track('locked_category_tap',{experimentId:tile.dataset.lockedCategory});
        }
      };});
    }

    async function showUnlocked(animate,statesPromise=participation(available)) {
      const heading='<p class="wharton-unlocked-badge">✓ EVERY CATEGORY UNLOCKED</p><h1 tabindex="-1">What else do you <em>know and love?</em></h1>';
      try{
        const states=await statesPromise;
        const next=picks.find(pick=>states[pick.experiment.id].status!=='done');
        const pickCards=picks.map(pick=>card(pick,{progress:states[pick.experiment.id],kicker:pick===next?'Up next':null,source:'unlocked'}));
        const ordered=extras.slice().sort((a,b)=>statusOrder[states[a.id].status]-statusOrder[states[b.id].status]);
        const more=ordered.map(category=>categoryTile(category,{progress:states[category.id]}));
        const completed=gate&&states[gate.experiment.id]?.status==='done'?compactRows([gate]):'';
        show(heading,
          (pickCards.length?`<section>${sectionTitle('WHARTON IS VOUCHING',"Classmates’ picks")}<div class="wharton-category-list has-progress">${pickCards.join('')}</div></section>`:'')+
          (more.length?`<section>${sectionTitle('MORE TO VOUCH FOR',more.length+' open')}<div class="wharton-tile-grid is-open">${more.join('')}</div></section>`:'')+
          completed);
        if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
          const fade=[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}];
          host.querySelectorAll('.wharton-category,.wharton-tile,.wharton-completed').forEach((item,index)=>item.animate(fade,{duration:220,delay:40*Math.min(index,8),easing:'ease-out',fill:'backwards'}));
        }
      }catch(e){
        show(heading,'');
        failed(()=>showUnlocked(false),e);
      }
      if(animate)announce.textContent='Every category unlocked.';
    }

    if(member&&!demo&&categoriesUnlocked(profile)){
      if(!profile.categoriesUnlockedAt){
        const result=await saveUnlock().catch(()=>null);
        if(result?.conflict||result?.categoriesUnlockedAt){
          try{localStorage.removeItem(unlockKey(profile.handle));}catch{}
          profile.categoriesUnlockedAt=result.categoriesUnlockedAt;
        }
      }
      if(categoriesUnlocked(profile)){await showUnlocked(false);return;}
    }

    if(!member&&!demo){
      show(welcome,'<div class="wharton-category-list">'+groups.map((group,index)=>card(group,{kicker:index===0&&group.experiment?'Start here':null})).join('')+'</div>');
      return;
    }

    let states={};
    if(member&&!demo){
      try{states=await participation(available);}catch{
        try{states=await participation(groups.flatMap(group=>group.experiment?[group.experiment]:[]));}catch{}
      }
    }
    const {state,done,progress}=whartonProgress(groups,states);
    if(!gate){show(welcome,moreCard);return;}
    const partial=state==='returning';
    if(state!=='done'){
      const answered=progress?.answeredProductIds?.length||0,total=gate.experiment.productCount;
      const remaining=Math.max(0,total-answered);
      const label=esc(remaining===1?gate.singular:gate.shortLabel);
      const heading=partial
        ?`<p class="eyebrow">ALMOST THERE</p><h1 tabindex="-1">Welcome back, <em>${first}.</em></h1><p class="wharton-intro">${remaining} more ${label} and every category is yours.</p>${unlockMeter(answered,total,remaining)}`
        :`<p class="eyebrow">YOUR TASTE BELONGS HERE</p><h1 tabindex="-1">What do you<br><em>know and love?</em></h1><p class="wharton-intro">Welcome, ${first}. Start with ${esc(gate.shortLabel)}. <strong>Finish it to unlock every category.</strong></p>`;
      const inProgress=picks.filter(pick=>states[pick.experiment.id]?.status==='partial');
      const locked=orderedUnlockable.filter(category=>!inProgress.some(pick=>pick.experiment.id===category.id));
      const cards=card(gate,{progress:partial?progress:null,kicker:partial?null:'Start here',highlight:true})+inProgress.map(pick=>card(pick,{progress:states[pick.experiment.id]})).join('');
      const shelf=locked.length?`<section>${sectionTitle('UNLOCKS NEXT',locked.length+(locked.length===1?' category':' categories'),pilotLockIcon({size:12}))}
        <div class="wharton-tile-grid">${locked.map(category=>categoryTile(category,{gate,pick:picks.find(pick=>pick.experiment.id===category.id)})).join('')}<button type="button" class="wharton-tile wharton-more-tiles" aria-expanded="false" data-more-locked hidden></button></div>
        <div class="wharton-locked-hint" data-locked-hint><span role="status"></span><a href="${categoryHref(gate.experiment.id,partial?'partial':'new',true)}">${partial?'Continue':'Start'} →</a></div></section>`:'';
      show(heading,'<div class="wharton-category-list has-progress">'+cards+'</div>'+shelf);
      if(locked.length)bindShelf(locked,remaining,partial);
      return;
    }

    const heading=`<p class="eyebrow">${esc(done[0].name.toUpperCase())} VOUCHED</p><h1 tabindex="-1">Nice taste, <em>${first}.</em></h1>`;
    const remaining=orderedUnlockable.filter(category=>states[category.id]?.status!=='done');
    show(heading,(remaining.length?unlockCard(remaining,picks.filter(pick=>states[pick.experiment.id]?.status!=='done')):moreCard)+compactRows(done));
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
        const list=participation(available);
        await Promise.allSettled([list,collapse(button.closest('.wharton-unlock'))]);
        await showUnlocked(true,list);
      }catch(e){
        error(e);
        button.removeAttribute('aria-disabled');
      }
    };
  }catch(e){
    failed(()=>mountWhartonHome(root,profile,{member,frame,error,demo}),e);
  }
}
