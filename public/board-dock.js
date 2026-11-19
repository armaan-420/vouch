import {nextStep,sharePicks,suggestionDialog} from './pilot-next.js';
import {showPilotDialog} from './pilot-dialog.js';
import {progressMarkup} from './pilot-progress.js';
import {categoryHref} from './wharton-categories.js';

const icons={
  invite:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
  share_picks:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4M12 2v13"/></svg>',
  suggest:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4"/><path d="M15.1 14c.2-1 .7-1.7 1.4-2.5A4.7 4.7 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.4 2.5"/></svg>',
  leaderboard:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/></svg>',
  profile:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  more:'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>'
};

const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const suggestionThanks='Thanks for suggesting a category.';

function primaryAction(data,model,{experiment,products,canStart,invite}) {
  if(!model)return canStart
    ?{title:'Add your take',label:'Start vouching',action:'start'}
    :{title:'Share the love',...invite};
  const current=data.items.find(item=>item.experiment?.id===experiment.id);
  const participation=data.states[experiment.id];
  const answered=participation?.answeredProductIds;
  if(participation?.status==='partial'){
    const remaining=Array.isArray(answered)?products.filter(product=>!answered.includes(product.id)).length:0;
    return {title:current?.name||experiment.title,subtitle:remaining?remaining+' left to rate':'Pick up where you left off',
      label:'Finish',arrow:true,action:'next_category',href:categoryHref(experiment.id,'partial',true)};
  }
  if(model.next){
    return {title:model.state+' of 3 vouched',progress:model.state,
      label:(model.partial?'Finish ':'Rate ')+model.next.shortLabel,arrow:true,action:'next_category',
      href:categoryHref(model.next.experiment.id,model.partial?'partial':'new',true)};
  }
  if(model.showUnlock)return {title:'All 3 done',label:'Unlock all categories',action:'unlock',href:'/wharton'};
  return {title:'Share the love',...invite};
}

function moreActions({pilot,demo,invite,profile,experimentId}) {
  const account=profile?.handle
    ?{action:'profile',label:'View your profile',subtitle:'All your vouches in one place',href:'/profiles/'+encodeURIComponent(profile.handle)}
    :{action:'profile',label:'Save your picks',subtitle:'Sign in to keep them on your profile',href:'/account?signin=1&experiment='+encodeURIComponent(experimentId)};
  return [
    ...(!demo?[{...invite,subtitle:pilot?'Send your Wharton link':'Send them this Board'}]:[]),
    ...(pilot?(demo?[]:[{action:'share_picks',label:'Share your picks',subtitle:'Your top pick in each category'}]):[account]),
    {action:'suggest',label:pilot?'Suggest the next category':'Suggest a category',
      subtitle:pilot?'What should Wharton vouch for next?':'What should we vouch for next?'},
    {action:'leaderboard',label:'See the leaderboard',subtitle:pilot?"Who's vouching most at Wharton":'Top vouchers this month',
      href:'/community-leaderboard'}
  ];
}

function actionMarkup({action,href},attributes,content) {
  return href
    ?`<a href="${esc(href)}" ${attributes} data-dock-action="${action}">${content}</a>`
    :`<button type="button" ${attributes} data-dock-action="${action}"${action==='start'?' data-action="start"':''}>${content}</button>`;
}

export function mountBoardDock(host,data,{experiment,products,profile,demo,canStart,onShown}) {
  const model=data&&nextStep({...data,profile,demo});
  const pilot=!!model;
  const invite={action:'invite',label:pilot?'Invite a classmate':'Invite a friend'};
  const primary=primaryAction(data,model,{experiment,products,canStart,invite});
  const menu=moreActions({pilot,demo,invite,profile,experimentId:experiment.id}).filter(item=>item.action!==primary.action);
  const key='vouch-board-suggested:'+(profile?.handle||'visitor');
  let suggested=!!model?.suggested;
  try{suggested||=!!sessionStorage.getItem(key);}catch{}

  host.innerHTML=`<section class="board-dock" aria-label="Next step" aria-hidden="true" inert>
    <div class="board-dock-status">
      <strong>${esc(primary.title)}</strong>
      ${primary.subtitle?`<small>${esc(primary.subtitle)}</small>`:''}
      ${primary.progress!==undefined?progressMarkup(primary.progress,primary.progress+' of 3 categories vouched',{role:'img'}):''}
    </div>
    ${actionMarkup(primary,'class="pilot-button is-lime board-dock-main"',esc(primary.label)+(primary.arrow?' <span aria-hidden="true">→</span>':''))}
    <button type="button" class="board-dock-more" aria-label="More actions" aria-haspopup="dialog" aria-expanded="false" data-dock-action="more">${icons.more}</button>
  </section>
  <div class="board-dock-toast" role="status" aria-live="polite"></div>
  <p class="board-dock-share-status" role="status" hidden data-board-share-status></p>`;

  const dock=host.querySelector('.board-dock'),more=host.querySelector('.board-dock-more');
  const toast=host.querySelector('.board-dock-toast'),shareStatus=host.querySelector('[data-board-share-status]');
  const header=document.querySelector('.site-header');
  const phone=matchMedia('(max-width: 760px)');
  const listeners=new AbortController();
  const {signal}=listeners;
  let revealed=!phone.matches||scrollY>8||document.documentElement.scrollHeight<=innerHeight+8;
  let shown=false,frame=0,toastTimer,panel;
  const reserveSpace=()=>document.body.style.setProperty('--board-dock-height',dock.offsetHeight+'px');
  reserveSpace();
  document.body.classList.add('has-board-dock');
  const sizeObserver=new ResizeObserver(reserveSpace);
  sizeObserver.observe(dock);

  const track=action=>{
    if(pilot&&!demo)window.VouchPilot.track('next_step_click',{state:model.state,action,experimentId:experiment.id});
  };
  function update(){
    const typing=document.activeElement?.matches('textarea,input:not([type]),input:is([type="text"],[type="search"],[type="email"],[type="url"],[type="tel"],[type="password"],[type="number"]),[contenteditable]:not([contenteditable="false"])');
    const overlay=header?.matches('.is-search-open,.is-menu-open')||document.querySelector('dialog[open]');
    const visible=revealed&&!typing&&!overlay;
    dock.classList.toggle('is-visible',visible);
    dock.inert=!visible;
    dock.setAttribute('aria-hidden',String(!visible));
    host.classList.toggle('is-obscured',!!overlay);
    if(visible&&!shown){
      shown=true;
      if(pilot&&!demo)onShown(model.state);
    }
  }
  function scheduleUpdate(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      update();
    });
  }
  function reveal(){
    revealed||=!phone.matches||scrollY>8;
    scheduleUpdate();
  }
  function closePanel(restoreFocus=true){
    if(!panel)return;
    const closing=panel;
    panel=null;
    if(closing.open)closing.close();
    closing.remove();
    more.setAttribute('aria-expanded','false');
    if(!signal.aborted)update();
    if(restoreFocus&&!dock.inert)more.focus({preventScroll:true});
  }
  function openPanel(url){
    const sheet=phone.matches;
    const opened=document.createElement(sheet?'dialog':'div');
    panel=opened;
    opened.className=sheet?'pilot-dialog board-dock-sheet':'board-dock-popover';
    if(!sheet)opened.setAttribute('role','dialog');
    opened.setAttribute('aria-labelledby','board-dock-menu-title');
    opened.innerHTML=`<h2 id="board-dock-menu-title">More you can do</h2>`+(url
      ?`<label class="board-dock-copy">Copy the selected link to send it<input type="text" value="${esc(url)}" readonly></label>`
      :menu.map(item=>item.action==='suggest'&&suggested
        ?`<p class="board-dock-row" role="status"><span class="board-dock-icon" aria-hidden="true">${icons.suggest}</span><span>${suggestionThanks}</span></p>`
        :actionMarkup(item,'class="board-dock-row"',`<span class="board-dock-icon" aria-hidden="true">${icons[item.action]}</span><span><strong>${esc(item.label)}</strong><small>${esc(item.subtitle)}</small></span><span aria-hidden="true">${icons.chev}</span>`)).join(''));
    more.setAttribute('aria-expanded','true');
    if(sheet){
      showPilotDialog(opened,more,()=>{if(panel===opened)closePanel();});
      opened.addEventListener('click',event=>{if(event.target===opened){
        const box=opened.getBoundingClientRect();
        if(event.clientY<box.top)closePanel();
      }});
    }else host.append(opened);
    opened.addEventListener('click',activate);
    opened.querySelector('input, button, a')?.focus();
    opened.querySelector('input')?.select();
    update();
  }
  async function inviteSomeone(){
    const url=new URL(pilot?'https://v4ch.app/wharton':'/'+encodeURIComponent(experiment.id)+'?board=1',location.origin);
    if(pilot&&/^v-[a-f0-9]{16}$/.test(profile?.handle))url.searchParams.set('ref',profile.handle);
    const text=pilot?'See what Wharton classmates actually recommend on Vouch.':`See the ${experiment.title} rankings on Vouch.`;
    if(navigator.share){
      try{await navigator.share({title:'Vouch',text,url:url.href});return;}
      catch(error){if(error.name==='AbortError')return;}
    }
    if(signal.aborted)return;
    try{
      await navigator.clipboard.writeText(url.href);
      if(signal.aborted)return;
      toast.textContent='Invite link copied';
      clearTimeout(toastTimer);
      toastTimer=setTimeout(()=>{toast.textContent='';},2600);
    }catch{
      if(!signal.aborted){
        closePanel(false);
        openPanel(url.href);
      }
    }
  }
  function activate(event){
    const trigger=event.target.closest('[data-dock-action]');
    if(!trigger)return;
    const action=trigger.dataset.dockAction;
    if(action==='more'){
      if(panel)closePanel();
      else{track('more');openPanel();}
      return;
    }
    track(action);
    if(panel)closePanel();
    if(action==='invite')void inviteSomeone();
    if(action==='share_picks')void sharePicks(more,{experimentId:experiment.id,profile,canShare:model.canShare,status:shareStatus});
    if(action==='suggest')suggestionDialog(more,()=>{
      suggested=true;
      try{sessionStorage.setItem(key,'1');}catch{}
      if(!signal.aborted)openPanel();
    },pilot);
  }

  dock.addEventListener('click',activate,{signal});
  window.addEventListener('scroll',reveal,{passive:true,signal});
  window.addEventListener('resize',reveal,{signal});
  phone.addEventListener('change',()=>{closePanel();reveal();},{signal});
  document.addEventListener('focusin',scheduleUpdate,{signal});
  document.addEventListener('focusout',scheduleUpdate,{signal});
  document.addEventListener('click',event=>{
    if(panel&&!phone.matches&&!panel.contains(event.target)&&!more.contains(event.target))closePanel();
  },{signal});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&panel&&!phone.matches){event.preventDefault();closePanel();}
  },{signal});
  const observer=new MutationObserver(scheduleUpdate);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  if(header)observer.observe(header,{attributes:true,attributeFilter:['class']});
  update();

  return ()=>{
    listeners.abort();
    observer.disconnect();
    sizeObserver.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(toastTimer);
    closePanel(false);
    document.body.classList.remove('has-board-dock');
    document.body.style.removeProperty('--board-dock-height');
    host.replaceChildren();
  };
}
