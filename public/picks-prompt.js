(() => {
 'use strict';
 let getContext=()=>null,checking=false,frame=0,dialog=null,priorFocus=null,priorOverflow='',step='email',challenge=null,testCode=null,status=null,email='';
 const shown=new Set(),key=id=>'vouch-picks-prompt-shown:'+id;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const seen=id=>{try{return shown.has(id)||sessionStorage.getItem(key(id))==='1'}catch{return shown.has(id)}};
 function mark(id){shown.add(id);try{sessionStorage.setItem(key(id),'1')}catch{}}
 async function request(path,body){const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not connect. Please try again.');return data}
 function close(){if(dialog?.open)dialog.close()}
 function render(context){
  const picks=context.opinions.slice(0,3),labels={yes:'Vouched',no:'Passed',brand:'Trusts the brand'};
  dialog.innerHTML=`<button class="picks-prompt-close" type="button" aria-label="Close signup invitation">×</button><p class="eyebrow">YOUR PICKS, TOGETHER</p><h2 id="picks-prompt-title" tabindex="-1">Good taste deserves<br>good company.</h2><p class="picks-prompt-intro" id="picks-prompt-description">See what people whose taste you trust recommend.</p><p class="picks-prompt-benefit"><strong>Your product history, in one place.</strong><br>Keep your vouches, passes, and brand trust across collections and devices.</p>${picks.length?`<div class="picks-prompt-products" aria-label="A preview of your picks">${picks.map(p=>`<div>${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy">`:'<span aria-hidden="true">✳</span>'}<p>${esc(p.name)}<small>${labels[p.myVote]}</small></p></div>`).join('')}</div>`:'<p class="picks-prompt-empty">Start your collection with the next product you know.</p>'}<details class="picks-prompt-roadmap"><summary>More reasons to join Vouch</summary><p><strong>Coming to Vouch</strong></p><ul><li>Suggestions that fit your taste</li><li>Recognition as a trusted voice in categories you know</li><li>Member discounts for honest participation</li></ul><p>These features aren’t available yet.</p></details>${status.available?step==='email'?`<form id="picks-email-form"><label for="picks-email">Email address</label><input id="picks-email" name="email" type="email" autocomplete="email" maxlength="254" value="${esc(email)}" placeholder="you@example.com" required><button class="primary" type="submit">Save my picks</button></form>`:`<form id="picks-code-form"><label for="picks-code">Enter your six-digit code</label><p class="picks-prompt-help">${status.previewDelivery?'Use the local test code below. No email was sent.':'We sent a code to '+esc(email)+'.'}</p>${testCode?`<p class="picks-test-inbox">Preview test inbox: <code>${esc(testCode)}</code></p>`:''}<input id="picks-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required><button class="primary" type="submit">Verify and continue</button><button type="button" class="text-button" data-picks-resend>Change email or request another code</button></form>`:`<p class="picks-prompt-help">Email signup is not configured on this version. Your responses are already saved.</p>`}<p class="picks-prompt-error" role="alert" hidden></p><button class="picks-keep-exploring text-button" type="button">Keep exploring</button><p class="picks-prompt-help">Your picks start private. You choose what to share.</p>${status.previewDelivery&&step==='email'?'<p class="picks-prompt-help">Local preview: a test code will appear here; no email is sent.</p>':''}`;
  dialog.querySelector('.picks-prompt-close').onclick=close;dialog.querySelector('.picks-keep-exploring').onclick=close;
  const error=err=>{const el=dialog.querySelector('.picks-prompt-error');el.hidden=false;el.textContent=err.message};
  dialog.querySelector('#picks-email-form')?.addEventListener('submit',async event=>{event.preventDefault();email=new FormData(event.target).get('email').trim();const button=event.target.querySelector('[type="submit"]');button.disabled=true;try{const result=await request('/api/auth/start',{email});challenge=result.challengeId;testCode=result.previewCode||null;step='code';if(dialog.open){render(context);dialog.querySelector('#picks-code').focus({preventScroll:true})}}catch(err){if(dialog.open){button.disabled=false;error(err)}}});
  dialog.querySelector('#picks-code-form')?.addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('[type="submit"]');button.disabled=true;try{await request('/api/auth/verify',{challengeId:challenge,code:new FormData(event.target).get('code')});location.assign('/account?experiment='+encodeURIComponent(context.experimentId)+'&review=1')}catch(err){button.disabled=false;error(err)}});
  dialog.querySelector('[data-picks-resend]')?.addEventListener('click',()=>{step='email';testCode=null;render(context);dialog.querySelector('#picks-email').focus({preventScroll:true})});
 }
 async function check(){
  const c=getContext();if(!c||c.screen!=='board'||c.authenticated!==false){close();return}
  if(!c.completed||seen(c.experimentId)||checking)return;
  const rows=document.querySelectorAll('.board > .rank-row');if(!rows.length)return;
  const target=rows[Math.min(2,rows.length-1)],rect=target.getBoundingClientRect();
  if(window.scrollY<24||(rows.length>=3?rect.bottom>0:rect.bottom>window.innerHeight*.75))return;
  checking=true;
  try{
   status=await request('/api/auth/status');const latest=getContext();
   if(!latest||latest.screen!=='board'||latest.authenticated!==false||seen(c.experimentId)||status.identity)return;
   if(!dialog){dialog=document.createElement('dialog');dialog.className='picks-prompt';dialog.setAttribute('aria-labelledby','picks-prompt-title');dialog.setAttribute('aria-describedby','picks-prompt-description');document.body.append(dialog);dialog.addEventListener('close',()=>{document.body.style.overflow=priorOverflow;priorFocus?.focus?.({preventScroll:true})});dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close()})}
   mark(c.experimentId);step='email';challenge=null;testCode=null;email='';priorFocus=document.activeElement;priorOverflow=document.body.style.overflow;
   render(latest);dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('h2').focus({preventScroll:true});
  }catch{/* A signup prompt must never interrupt access to standings on failure. */}finally{checking=false}
 }
 const refresh=()=>{if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=0;check()})};
 window.addEventListener('scroll',refresh,{passive:true});
 window.VouchPicksPrompt={bind(fn){getContext=fn},refresh};
})();
