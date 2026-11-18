import {showPilotDialog} from './pilot-dialog.js';
export function nextStep({items,states,pilot,profile}) {
  if(!pilot||!profile?.whartonEmailVerified)return null;
  const state=items.filter(group=>states[group.experiment?.id]?.status==='done').length;
  const next=items.find(group=>group.experiment&&states[group.experiment.id]?.status!=='done');
  return {state,next,partial:states[next?.experiment.id]?.status==='partial',suggested:pilot.suggested,canShare:pilot.canShare};
}

function suggestionDialog(trigger,onSaved,whartonPilot) {
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
