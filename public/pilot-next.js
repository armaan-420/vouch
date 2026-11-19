import {categoriesUnlocked,categoryHref,extraCategories} from './wharton-categories.js';
import {showPilotDialog} from './pilot-dialog.js';
import {progressMarkup} from './pilot-progress.js';

export function mountBoardContinuation(host,{items,states,experimentId}) {
  if(states[experimentId]?.status!=='done')return;
  const live=items.filter(item=>item.experiment);
  const done=live.filter(item=>states[item.experiment.id]?.status==='done').length;
  const next=live.find(item=>states[item.experiment.id]?.status!=='done');
  const nextStatus=next&&states[next.experiment.id]?.status;
  const progress=`${done} of ${live.length} categories vouched`;
  const rows=host.closest('.board').querySelectorAll('.rank-row');
  const revealAfter=rows[Math.min(3,rows.length)-1];
  const inviteUrl='https://v4ch.app/wharton';
  host.innerHTML=`<section class="pilot-board-card pilot-continuation-card" aria-labelledby="pilot-continuation-title">
    <div class="pilot-continuation-progress">
      <p><span aria-hidden="true">✓</span> ${progress}</p>
      ${progressMarkup(done,progress,{segments:live.length,role:'img'})}
    </div>
    <div class="pilot-continuation-main">
      <h2 id="pilot-continuation-title">${next?'Up next: '+next.name:'You’re all caught up'}</h2>
      <div class="pilot-continuation-actions">
        ${next?`<a class="pilot-button is-lime" href="${categoryHref(next.experiment.id,nextStatus==='partial'?'partial':'new',true)}">${nextStatus==='partial'?'Continue':'Rate'} ${next.name.toLowerCase()} <span aria-hidden="true">→</span></a>`:''}
        <button type="button" class="pilot-button is-outline" aria-controls="pilot-invite-link" aria-expanded="false" data-pilot-invite>Invite a classmate</button>
      </div>
    </div>
    <div class="pilot-invite-link" id="pilot-invite-link" hidden>
      <label for="pilot-wharton-url">Share the Wharton invite link</label>
      <div class="pilot-invite-controls"><input id="pilot-wharton-url" type="text" value="${inviteUrl}" readonly>
      <button type="button" class="pilot-button is-outline" data-copy-invite>Copy link</button></div>
      <p role="status"></p>
    </div>
  </section>`;

  const invite=host.querySelector('[data-pilot-invite]');
  const share=host.querySelector('.pilot-invite-link');
  const status=share.querySelector('[role="status"]');
  const input=share.querySelector('input');
  invite.addEventListener('click',()=>{
    share.hidden=!share.hidden;
    invite.setAttribute('aria-expanded',String(!share.hidden));
    status.textContent='';
  });
  share.querySelector('[data-copy-invite]').addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(inviteUrl);
      status.textContent='Wharton link copied.';
    }catch{
      input.focus();
      input.select();
      status.textContent='Copy the selected link to send it to a classmate.';
    }
  });

  const update=()=>host.classList.toggle('has-passed-rankings',!revealAfter||revealAfter.getBoundingClientRect().bottom<=0);
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update);
  update();
  return ()=>{
    window.removeEventListener('scroll',update);
    window.removeEventListener('resize',update);
  };
}
export function nextStep({items,states,pilot,profile,available=[]}) {
  if(!pilot||!profile?.whartonEmailVerified)return null;
  const state=items.filter(group=>states[group.experiment?.id]?.status==='done').length;
  const next=items.find(group=>group.experiment&&states[group.experiment.id]?.status!=='done');
  const showUnlock=state>0&&!next&&!categoriesUnlocked(profile)&&extraCategories(available).length>0;
  return {state,next,showUnlock,partial:states[next?.experiment.id]?.status==='partial',suggested:pilot.suggested,canShare:pilot.canShare};
}

export function suggestionDialog(trigger,onSaved,whartonPilot) {
  const dialog=document.createElement('dialog');
  dialog.className='pilot-dialog';
  dialog.setAttribute('aria-labelledby','pilot-suggestion-title');
  dialog.innerHTML=`<h2 id="pilot-suggestion-title">Suggest a category</h2>
    <form><label for="pilot-suggestion">${whartonPilot?'What should Wharton vouch for next?':'What should we vouch for next?'}</label>
    <input required minlength="2" maxlength="60" id="pilot-suggestion" name="category" autofocus>
    <p role="status"></p>
    <div class="pilot-dialog-actions"><button type="button" class="pilot-button is-outline" data-cancel>Cancel</button>
    <button type="submit" class="pilot-button">Send suggestion</button></div></form>`;
  dialog.querySelector('[data-cancel]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('form').addEventListener('submit',async event=>{
    event.preventDefault();
    const button=dialog.querySelector('[type="submit"]'),status=dialog.querySelector('[role="status"]');
    button.disabled=true;
    try{
      const category=new FormData(event.target).get('category').trim();
      const response=await fetch('/api/suggestions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,whartonPilot})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Could not save your suggestion.');
      dialog.close();
      onSaved();
    }catch(error){
      status.textContent=error.message;
      button.disabled=false;
    }
  });
  showPilotDialog(dialog,trigger);
}

export function showUnlockAction(host) {
  const primary=host.querySelector('.pilot-next-primary');
  const share=primary.querySelector('[data-next-action="share_picks"]');
  share.classList.add('is-outline');
  host.querySelector('.pilot-next-secondary').prepend(share);
  primary.innerHTML='<a class="pilot-button is-lime" href="/wharton" data-next-action="unlock">Unlock all categories →</a>';
}

export function mountNext(host,{experimentId,profile}) {
  const key='vouch-board-suggested:'+(profile?.handle||'visitor');
  const thanks='<p class="pilot-suggestion-thanks" role="status" tabindex="-1">Thanks for suggesting a category.</p>';
  let suggested=false;
  try{suggested=!!sessionStorage.getItem(key);}catch{}
  host.innerHTML=`<section class="pilot-board-card" aria-label="More from Vouch">
    <div class="pilot-next-primary"><button type="button" class="pilot-button" data-next-action="share_picks">Share your picks</button></div>
    <div class="pilot-next-secondary">
      ${suggested?thanks:'<button type="button" class="pilot-button is-outline" data-next-action="suggest">Suggest the next category</button>'}
      <a class="pilot-button is-outline" href="/community-leaderboard" data-next-action="leaderboard">See the leaderboard</a>
    </div><p role="status" data-board-share-status hidden></p>
  </section>`;
  host.addEventListener('click',async event=>{
    const trigger=event.target.closest('[data-next-action]');
    if(!trigger)return;
    const action=trigger.dataset.nextAction;
    const state=host.dataset.pilotState;
    if(state!==undefined)window.VouchPilot.track('next_step_click',{state:Number(state),action,experimentId});
    if(action==='suggest')suggestionDialog(trigger,()=>{
      try{sessionStorage.setItem(key,'1');}catch{}
      trigger.outerHTML=thanks;
      host.querySelector('.pilot-suggestion-thanks')?.focus();
    },state!==undefined);
    if(action!=='share_picks')return;
    if(host.dataset.pilotShare==='true'&&window.VouchShare){
      window.VouchShare.open(trigger,{kind:'picks',experimentId});
      return;
    }
    if(!profile||profile.browserProfile){
      location.href='/account?signin=1'+(experimentId?'&experiment='+encodeURIComponent(experimentId):'');
      return;
    }
    const status=host.querySelector('[data-board-share-status]');
    status.hidden=false;
    let current;
    try{
      const response=await fetch('/api/account/me');
      if(!response.ok)throw Error();
      current=(await response.json()).profile;
    }catch{
      status.textContent='Could not load your picks. Try again.';
      return;
    }
    if(current?.visibility!=='public'||current.showName===false||!current.opinions?.some(item=>item.verdict==='yes'&&item.visibility==='public')){
      location.href='/account?visibility=1';
      return;
    }
    const url=new URL('/profiles/'+encodeURIComponent(current.handle),location.origin).href;
    try{
      await navigator.clipboard.writeText(url);
      status.textContent='Link to your public picks copied.';
    }catch{
      const link=document.createElement('a');
      link.href=url;
      link.textContent='Open your public picks';
      status.replaceChildren(link);
      link.focus();
    }
  });
}
