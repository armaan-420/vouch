(()=>{
 'use strict';
 const root=document.getElementById('wharton-app'),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key='vouch-wharton-attempt';let attempt={},timer;
 try{attempt=JSON.parse(sessionStorage.getItem(key)||'{}')}catch{}
 const remember=()=>sessionStorage.setItem(key,JSON.stringify(attempt));
 async function api(path,body){const response=await fetch(path,{credentials:'same-origin',method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again.');return data;}
 function error(e){root.querySelector('[role=alert]').textContent=e.message;}
 function frame(content){clearInterval(timer);root.innerHTML=content+'<p class="wharton-error" role="alert"></p>';root.querySelector('h1,h2')?.focus();}
 async function ready(){
  const status=await api('/api/auth/status');
  if(!status.available){frame('<h1>We’ll be right back.</h1><p>Email sign-in is temporarily unavailable.</p><button class="primary" data-retry>Try again</button>');root.querySelector('[data-retry]').onclick=()=>ready().catch(error);return;}
  if(!status.identity){join();return;}
  if(!/@wharton\.upenn\.edu$/i.test(status.identity.email||'')){frame('<h1>This one’s for Wharton.</h1><p>Use your Wharton email to join this experiment.</p><button class="primary" data-switch>Use another email</button>');root.querySelector('[data-switch]').onclick=async()=>{try{await api('/api/auth/logout',{});attempt={};remember();join()}catch(e){error(e)}};return;}
  const me=await api('/api/account/me');
  if(!me.profile||me.profile.verificationRequired){nameForm(status.identity.email);return;}
  attempt={};sessionStorage.removeItem(key);categories(me.profile.displayName);
 }
 function join(){
  if(attempt.challengeId&&attempt.expiresAt>Date.now()){verify();return;}
  frame(`<p class="eyebrow">THE WHARTON EXPERIMENTS</p><h1 tabindex="-1">Good picks.<br><em>Familiar faces.</em></h1><p class="wharton-intro">The everyday products Wharton swears by. Share your favorites, then meet the people behind the picks.</p><form id="wharton-join"><label for="wharton-name">Full name</label><input id="wharton-name" name="name" autocomplete="name" minlength="2" maxlength="60" value="${esc(attempt.name||'')}" required><label for="wharton-email">Wharton email</label><input id="wharton-email" name="email" type="email" autocomplete="email" placeholder="you@wharton.upenn.edu" value="${esc(attempt.email||'')}" required maxlength="254"><button class="primary" type="submit">Find your people’s picks →</button><p class="wharton-help">One email code. No password.</p></form><ol class="wharton-steps"><li>Pick a category</li><li>Share your take</li><li>See who vouches</li></ol>`);
  root.querySelector('form').onsubmit=async e=>{e.preventDefault();const data=new FormData(e.target);attempt.name=String(data.get('name')).trim();attempt.email=String(data.get('email')).trim().toLowerCase();if(!/^[^\s@]+@wharton\.upenn\.edu$/.test(attempt.email)){error(Error('Use your @wharton.upenn.edu email.'));return;}const button=e.target.querySelector('button');button.disabled=true;try{await send()}catch(e){error(e);button.disabled=false}};
 }
 async function send(){const data=await api('/api/auth/start',{email:attempt.email});attempt={...attempt,...data,expiresAt:Date.now()+data.expiresIn*1000,resendAt:Date.now()+(data.resendAfter||30)*1000};remember();verify();}
 function verify(){
  frame(`<p class="eyebrow">YOU’RE ALMOST IN</p><h1 tabindex="-1">Check your<br><em>Wharton inbox.</em></h1><p>Enter the six-digit code sent to ${esc(attempt.email)}.</p><form id="wharton-verify"><label for="wharton-code">Email code</label><input id="wharton-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>${attempt.previewCode?`<p class="wharton-help">Local test inbox · No email sent. Code: <code>${esc(attempt.previewCode)}</code></p>`:''}<button class="primary" type="submit">See what Wharton recommends →</button></form><div class="wharton-recovery"><button class="text-button" data-resend>Send a new code</button><button class="text-button" data-change>Change email</button></div>`);
  const resend=root.querySelector('[data-resend]');const tick=()=>{const seconds=Math.max(0,Math.ceil((attempt.resendAt-Date.now())/1000));resend.disabled=seconds>0;resend.textContent=seconds?'Resend in '+seconds+'s':'Send a new code';if(Date.now()>attempt.expiresAt){root.querySelector('form button').disabled=true;root.querySelector('[role=alert]').textContent='This code expired. Request a new code.';}};tick();timer=setInterval(tick,1000);
  resend.onclick=async()=>{resend.disabled=true;try{await send()}catch(e){error(e);tick()}};
  root.querySelector('[data-change]').onclick=()=>{delete attempt.challengeId;remember();join()};
  root.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{await api('/api/auth/verify',{challengeId:attempt.challengeId,code:new FormData(e.target).get('code')});delete attempt.challengeId;remember();await ready()}catch(e){error(e);button.disabled=false;root.querySelector('input').setAttribute('aria-invalid','true')}};
 }
 function nameForm(email){
  frame(`<p class="eyebrow">PUT YOUR NAME TO GOOD TASTE</p><h1 tabindex="-1">Who’s behind<br><em>your picks?</em></h1><form><label for="wharton-name">Full name</label><input id="wharton-name" name="name" autocomplete="name" minlength="2" maxlength="60" value="${esc(attempt.name||'')}" required><button class="primary" type="submit">Choose my first category →</button></form>`);
  root.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const categories=(await api('/api/categories')).categories;if(!categories.length)throw Error('No experiments are open yet. Please check back soon.');const preview=await api('/api/account/edit?experiment='+encodeURIComponent(categories[0].id));await api('/api/account/signup?experiment='+encodeURIComponent(categories[0].id),{displayName:new FormData(e.target).get('name'),email,claimToken:preview.claimToken});await ready()}catch(e){error(e);button.disabled=false}};
 }
 async function categories(name){
  frame(`<p class="eyebrow">YOUR TASTE BELONGS HERE</p><h1 tabindex="-1">What do you<br><em>know and love?</em></h1><p class="wharton-intro">Welcome, ${esc(name.split(' ')[0])}. Start with one category. Explore the rest whenever you like.</p><div data-categories aria-busy="true"></div><p class="wharton-help">Only recommend what you’ve actually tried.</p><a class="text-button" href="/account">Your collection →</a>`);
  await window.VouchCategories.mount(root);
  root.querySelectorAll('.category-card a').forEach(a=>{const url=new URL(a.href);url.searchParams.set('wharton','1');a.href=url.pathname+url.search});
 }
 ready().catch(e=>{frame('<h1>Could not connect.</h1><button class="primary" data-retry>Try again</button>');error(e);root.querySelector('[data-retry]').onclick=()=>ready().catch(error)});
})();
