import {showPilotDialog} from './pilot-dialog.js';
import {progressMarkup,showProgress} from './pilot-progress.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function nextStep({items,states,pilot,profile}) {
  if(!pilot||!profile?.whartonEmailVerified)return null;
  const state=items.filter(group=>states[group.experiment?.id]?.status==='done').length;
  const next=items.find(group=>group.experiment&&states[group.experiment.id]?.status!=='done');
  return {state,next,partial:states[next?.experiment.id]?.status==='partial',suggested:pilot.suggested,canShare:pilot.canShare};
}

function suggestionDialog(trigger,onSaved) {
  const dialog=document.createElement('dialog');
  dialog.className='pilot-dialog';
  dialog.setAttribute('aria-labelledby','pilot-suggestion-title');
  dialog.innerHTML=`<h2 id="pilot-suggestion-title">Suggest a category</h2>
    <form><label for="pilot-suggestion">What should Wharton vouch for next?</label>
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
      const response=await fetch('/api/suggestions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,whartonPilot:true})});
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

export function mountNext(host,{items,states,pilot,experimentId,profile,onShow}) {
  const model=nextStep({items,states,pilot,profile});
  if(!model)return;
  const {state,next,partial,canShare}=model,complete=state===3;
  const key='vouch-pilot-suggested:'+profile.handle;
  let suggested=model.suggested;
  try{suggested ||= !!sessionStorage.getItem(key);}catch{}
  const track=action=>window.VouchPilot.track('next_step_click',{state,action,experimentId});
  const button=(label,action,primary=false)=>`<button type="button" class="pilot-button${primary?'':' is-outline'}" data-next-action="${action}">${label}</button>`;
  const share=canShare?(window.VouchShare?button('Share your picks','share_picks',complete):''):'<a class="pilot-button is-outline" href="/account?visibility=1">Make a vouch public to share it</a>';
  const nextLink=next?`<a class="pilot-button" data-next-action="next_category" href="/${encodeURIComponent(next.experiment.id)}?start=1${partial?'&resume=1':''}&amp;wharton=1">${partial?'Continue '+esc(next.name):'Vouch for '+esc(next.name.toLowerCase())} →</a>`:'';
  const thanks='<p class="pilot-suggestion-thanks" role="status" tabindex="-1">Thanks. The most requested category opens next.</p>';
  host.innerHTML=`<section class="pilot-board-card" aria-labelledby="pilot-next-heading">
    <h2 id="pilot-next-heading">${complete?'You’ve vouched all 3.':`You’ve vouched ${state} of 3.`}</h2>
    ${progressMarkup(state,'Wharton categories completed')}
    <div class="pilot-next-primary">${complete?share:nextLink}</div>
    <div class="pilot-next-secondary">
      ${complete?'':share}
      ${suggested?thanks:button(complete?'Suggest the next category':'Suggest a category','suggest')}
      ${complete?'<a class="pilot-button is-outline" href="/community-leaderboard" data-next-action="leaderboard">See the leaderboard</a>':''}
    </div>
  </section>`;
  showProgress(host.querySelector('.pilot-progress'),state,'Wharton categories completed');
  onShow(state);
  host.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-next-action]');
    if(!trigger)return;
    const action=trigger.dataset.nextAction;
    track(action);
    if(action==='suggest')suggestionDialog(trigger,()=>{
      try{sessionStorage.setItem(key,'1');}catch{}
      trigger.outerHTML=thanks;
      host.querySelector('.pilot-suggestion-thanks')?.focus();
    });
    if(action==='share_picks')window.VouchShare?.open(trigger,{kind:'picks',experimentId});
  });
}
