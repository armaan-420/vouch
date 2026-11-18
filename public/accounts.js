(() => {
  'use strict';
  const root=document.getElementById('account-app');
  if(!location.pathname.startsWith('/community-leaderboard'))document.body.classList.add('account-page');
  else document.querySelector('[data-site-nav]')?.removeAttribute('data-account-nav-locked');
  const params=new URLSearchParams(location.search),experimentId=params.get('experiment');
  const experimentQuery=experimentId?'?experiment='+encodeURIComponent(experimentId):'';
  const backPath=experimentId?'/'+encodeURIComponent(experimentId)+'?board=1':'/';
  const labels={yes:'Vouched for this item',no:'Passed',brand:'Trusts the brand'};
  let verificationToken=new URLSearchParams(location.hash.slice(1)).get('verify-email');
  if(verificationToken)history.replaceState(null,'',location.pathname+location.search);
  let me=null,edit=null,auth=null,challenge=null,previewCode=null,profileObserver=null,categoryObserver=null;
  let authEmail='',resendAt=0,expiresAt=0,authTimer=null;
  try{const saved=JSON.parse(sessionStorage.getItem('vouch-email-attempt')||'null');if(saved?.expiresAt>Date.now()){challenge=saved.id;authEmail=saved.email;resendAt=saved.resendAt;expiresAt=saved.expiresAt;}}catch{}
  function saveAttempt(){try{sessionStorage.removeItem('vouch-email-challenge');if(challenge)sessionStorage.setItem('vouch-email-attempt',JSON.stringify({id:challenge,email:authEmail,resendAt,expiresAt}));else sessionStorage.removeItem('vouch-email-attempt')}catch{}}
  function clearAttempt(){challenge=null;previewCode=null;expiresAt=0;resendAt=0;clearInterval(authTimer);saveAttempt()}

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const productPath=id=>'/products/'+encodeURIComponent(id)+experimentQuery;
  const profilePath=handle=>'/profiles/'+encodeURIComponent(handle)+experimentQuery;
  const safeImage=value=>typeof value==='string'&&(/^\/(?!\/)/.test(value)||/^https:\/\//.test(value))?value:null;
  const productImage=p=>`<span class="account-product-image" aria-hidden="true">${safeImage(p?.image)?`<img src="${esc(p.image)}" alt="" loading="lazy">`:brandV()}</span>`;
  const stats=counts=>`<div class="account-stats" aria-label="Opinion summary"><span class="account-stat"><strong>${Number(counts?.yes)||0}</strong> item vouch${Number(counts?.yes)===1?'':'es'}</span><span class="account-stat"><strong>${Number(counts?.no)||0}</strong> ${Number(counts?.no)===1?'pass':'passes'}</span><span class="account-stat"><strong>${Number(counts?.brand)||0}</strong> brand endorsement${Number(counts?.brand)===1?'':'s'}</span></div>`;
  const countOpinions=opinions=>opinions.reduce((a,o)=>{if(Object.hasOwn(a,o.verdict))a[o.verdict]++;return a},{yes:0,no:0,brand:0});
  const date=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{dateStyle:'medium'}):''};
  async function request(path,payload){const response=await fetch(path,{method:payload===undefined?'GET':'POST',credentials:'same-origin',headers:payload===undefined?{}:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});let data;try{data=await response.json()}catch{throw Error('Could not connect. Please try again.')}if(!response.ok)throw Error(data.error||'Could not save. Please try again.');return data}
  function focusHeading(){if(document.querySelector('dialog[open]'))return;const heading=root.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}}
  function shell(html){document.body.classList.toggle('signin-page',html.includes('signin-layout'));profileObserver?.disconnect();categoryObserver?.disconnect();if(!html.includes('profile-layout'))document.body.classList.remove('collection-page');root.innerHTML='<section class="account-shell">'+html+'</section>';focusHeading()}
  function failure(error,target){const el=target||root.querySelector('[data-status]');if(el){el.className='account-status account-error';el.setAttribute('role','alert');el.textContent=error.message;el.focus?.()}else shell(`<h1>Could not open this page.</h1><p class="account-error" role="alert">${esc(error.message)}</p><button class="primary" data-retry>Try again</button>`);root.querySelector('[data-retry]')?.addEventListener('click',load)}
  function statusMarkup(){return '<p class="account-status" data-status role="status" aria-live="polite"></p>'}
  const libraryTags=o=>(o.tags||[]).length?`<span class="library-tags" aria-label="Product tags">${o.tags.map(t=>`<span>${esc(t.label)}</span>`).join('')}</span>`:'';
  function opinionCard(o,controls=''){const p=o.product||{};return `<article class="account-product" data-opinion="${esc(o.productId)}">${productImage(p)}<div class="account-product-main"><p class="brand">${esc(p.brand)}</p><h3><a href="${productPath(o.productId)}">${esc(p.name||'Product')}</a></h3>${libraryTags(o)}<span class="account-verdict" data-verdict="${esc(o.verdict)}">${esc(labels[o.verdict]||'No current opinion')}</span>${o.experimentTitle||o.experimentId?`<p class="account-product-meta">From ${esc(o.experimentTitle||o.experimentId)}${date(o.updatedAt)?' · '+esc(date(o.updatedAt)):''}</p>`:''}${controls}</div></article>`}
  function topLine(owner=false){return `<div class="account-topline"><a class="text-button" href="${esc(backPath)}">${experimentId?'← The Board':'← Vouch home'}</a>${owner?'<button class="text-button" data-logout>Sign out</button>':''}</div>`}
  function wireLogout(){root.querySelector('[data-logout]')?.addEventListener('click',async event=>{event.target.disabled=true;try{await request('/api/auth/logout',{});me=null;edit=null;clearAttempt();shell('<p role="status">Signing out…</p>');await load()}catch(error){event.target.disabled=false;failure(error)}})}
  function authForm(){if(!(auth?.available??auth?.enabled))return `<section class="account-auth"><p class="account-help">Email sign-in is temporarily unavailable. Your picks are saved in this browser. Please try again later.</p><button class="primary" data-retry-auth>Try again</button>${statusMarkup()}</section>`;
    return `<section class="account-auth">${auth.previewDelivery?'<p class="account-preview-inbox"><strong>Local test inbox</strong><br>No email is sent in this preview.</p>':''}${challenge?`<form id="verify-form"><label for="account-code">Email code</label><input id="account-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required aria-describedby="code-help" aria-label="Six-digit email code"><p id="code-help" class="account-help">We sent a 6-digit code to <strong>${esc(authEmail)}</strong>. It expires in 10 minutes.</p>${previewCode?`<p class="account-help account-preview-code">Preview test code: <code>${esc(previewCode)}</code></p>`:''}<button class="primary" type="submit">Verify and continue</button></form><div class="auth-recovery"><button type="button" class="text-button" data-resend>Send a new code</button><button type="button" class="text-button" data-change-email>Change email</button></div>`:`<form id="email-form"><label for="account-email">Email address</label><input id="account-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="254" value="${esc(authEmail)}" placeholder="Enter your email address" required><button class="primary" type="submit">Send me a code</button><p class="account-help signin-code-help">We’ll email you a 6-digit code.</p></form>`}${statusMarkup()}</section>`;
  }

  function signinPeople(){
    const examples=[
      {position:'left',person:'Jon',initials:'JL',name:'Stanley IceFlow',image:'stanley.png'},
      {position:'center',person:'Maya',initials:'MK',name:'Owala FreeSip',image:'owala.png',score:'9.1'},
      {position:'right',person:'Priya',initials:'PR',name:'Hydro Flask Wide Mouth',image:'hydroflask.png',score:'8.7'}
    ];
    return `<aside class="signin-people" aria-label="Example of friends’ vouches on Vouch"><ul class="signin-fan">${examples.map(item=>`<li class="signin-polaroid is-${item.position}"><div class="signin-polaroid-photo"><img src="/assets/water-bottles/${item.image}" alt=""></div>${item.score?`<span class="signin-polaroid-score" aria-label="Illustrative score ${item.score} out of 10">${item.score}</span>`:'<span class="signin-polaroid-pass">Pass</span>'}<p class="signin-polaroid-who"><span class="signin-avatar" aria-hidden="true">${item.initials}</span><span><strong>${item.person}</strong> ${item.score?'vouched':'passed'}</span></p><p class="signin-polaroid-product">${item.name}</p></li>`).join('')}</ul><p class="signin-people-note">Sample activity</p></aside>`;
  }
  function renderSignup(){
    if(!auth?.identity?.email){renderAnonymous();return}
    const hasPicks=(edit?.opinions||[]).some(o=>o.verdict==='yes'&&o.claimable!==false),email=auth?.identity?.email||'';
    shell(`<div class="simple-signup signin-layout"><section class="signup-main"><p class="eyebrow">${hasPicks?'YOUR PICKS, YOUR NAME':'WELCOME TO VOUCH'}</p><h1>${hasPicks?'Who’s behind<br>these vouches?':'Create your<br>account.'}</h1><p class="account-intro">${hasPicks?'Add your name to get credit for the products you recommend.':'A home for the products you recommend.'}</p><form id="signup-form" autocomplete="on"><label for="signup-name">Name</label><input id="signup-name" name="name" type="text" autocomplete="name" autocapitalize="words" minlength="2" maxlength="60" required><label for="signup-email">Verified email</label><input id="signup-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" value="${esc(email)}" ${email?'readonly':''} required>${statusMarkup()}<button class="primary" type="submit">Create my account</button><a class="text-button signup-skip" href="${esc(backPath)}">Skip for now</a></form></section>${signinPeople()}</div>`);

    root.querySelector('#signup-form').onsubmit=async event=>{
      event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Saving…';
      try{
        const fields=new FormData(form),result=await request('/api/account/signup'+experimentQuery,{displayName:String(fields.get('name')).trim(),email:String(fields.get('email')).trim(),claimToken:edit?.claimToken});
        me=await request('/api/account/me');me.profile=result.profile;edit=null;challenge=null;previewCode=null;
        params.delete('review');params.delete('signin');history.replaceState(null,'','/account'+experimentQuery);window.VouchSiteNav?.refreshAccount();renderProfile(result.profile,true,true);
      }catch(error){button.disabled=false;button.textContent='Create my account';failure(error)}
    };
  }
  function renderPendingVerification(){
    document.body.classList.add('signin-page');
    shell(`<div class="simple-signup signin-layout"><section class="signup-main"><p class="eyebrow">YOUR VOUCH ACCOUNT</p><h1>Verify your<br>account.</h1><p class="account-intro">Add your full name and verify your email to see your profile and history.</p><div class="signin-form-slot"><form id="pending-verification-form" autocomplete="on"><label for="verification-name">Full name</label><input id="verification-name" name="name" type="text" autocomplete="name" autocapitalize="words" minlength="2" maxlength="60" value="${esc(me.profile.displayName==='Vouch member'?'':me.profile.displayName)}" required><label for="verification-email">Email address</label><input id="verification-email" type="email" value="${esc(me.profile.email)}" readonly><button class="primary" type="submit">Send verification code</button>${statusMarkup()}</form></div></section>${signinPeople()}</div>`);
    root.querySelector('#pending-verification-form').onsubmit=async event=>{
      event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;button.textContent='Sending…';button.setAttribute('aria-busy','true');
      try{const saved=await request('/api/account/prepare-verification',{displayName:event.target.elements.name.value});await sendEmailCode(saved.email)}catch(error){button.disabled=false;button.textContent='Send verification code';button.removeAttribute('aria-busy');failure(error)}
    };
  }
  async function sendEmailCode(email){
    const result=await request('/api/auth/start',{email});
    authEmail=email.trim().toLowerCase();challenge=result.challengeId;previewCode=result.previewCode||null;
    resendAt=Date.now()+(result.resendAfter||30)*1000;expiresAt=Date.now()+result.expiresIn*1000;saveAttempt();
    renderAnonymous();
  }
  function renderAnonymous(){
    clearInterval(authTimer);
    document.body.classList.add('signin-page');
    shell(`<div class="simple-signup signin-layout"><section class="signup-main"><p class="eyebrow">WELCOME TO VOUCH</p><h1>${challenge?'Check your<br>email.':'Your taste.<br><em>Your people.</em>'}</h1>${challenge?'':'<p class="account-intro">Sign in or join with your email. No password.</p>'}<div class="signin-form-slot">${authForm()}</div></section>${signinPeople()}</div>`);
    root.querySelector('#account-email')?.addEventListener('focus',event=>{
      const form=event.target.form;
      setTimeout(()=>form.isConnected&&form.scrollIntoView({block:'center',behavior:'instant'}),250);
    });
    root.querySelector('[data-retry-auth]')?.addEventListener('click',load);
    root.querySelector('#email-form')?.addEventListener('submit',async event=>{
      event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;button.textContent='Sending…';button.setAttribute('aria-busy','true');
      try{await sendEmailCode(String(new FormData(event.target).get('email')))}catch(error){button.disabled=false;button.textContent='Send me a code';button.removeAttribute('aria-busy');failure(error)}
    });
    const verifyForm=root.querySelector('#verify-form');
    verifyForm?.addEventListener('submit',async event=>{
      event.preventDefault();const button=event.target.querySelector('button');if(button.disabled)return;button.disabled=true;button.textContent='Verifying…';
      try{await request('/api/auth/verify',{challengeId:challenge,code:event.target.elements.code.value});clearAttempt();await load()}catch(error){button.disabled=false;button.textContent='Verify and continue';failure(error);const input=event.target.elements.code;input.setAttribute('aria-invalid','true');input.focus();input.select()}
    });
    root.querySelector('#account-code')?.addEventListener('input',event=>{
      event.target.value=event.target.value.replace(/[^0-9]/g,'').slice(0,6);event.target.removeAttribute('aria-invalid');
      if(event.target.value.length===6)verifyForm.requestSubmit();
    });
    const resend=root.querySelector('[data-resend]');
    if(resend){const tick=()=>{const wait=Math.max(0,Math.ceil((resendAt-Date.now())/1000));resend.disabled=wait>0;resend.textContent=wait?`Resend in ${Math.floor(wait/60)}:${String(wait%60).padStart(2,'0')}`:'Send a new code';if(Date.now()>=expiresAt){const help=root.querySelector('#code-help');if(help)help.textContent='This code has expired. Request a new code below.';const button=verifyForm?.querySelector('[type=submit]');if(button)button.disabled=true;}};tick();authTimer=setInterval(tick,1000);
      resend.addEventListener('click',async()=>{resend.disabled=true;clearInterval(authTimer);try{await sendEmailCode(authEmail)}catch(error){failure(error);resendAt=Date.now()+30000;saveAttempt();resend.disabled=true;authTimer=setInterval(tick,1000);tick()}});
    }
    if(me?.profile?.verificationRequired)root.querySelector('[data-change-email]')?.remove();
    root.querySelector('[data-change-email]')?.addEventListener('click',()=>{clearAttempt();renderAnonymous()});
  }
  function renderReview(){const profile=me.profile,opinions=(edit?.opinions||[]).filter(o=>labels[o.verdict]);const profilePublic=profile?.visibility==='public';shell(`${topLine(true)}<p class="eyebrow">SAVE YOUR PICKS</p><h1>A collection that’s<br>already you.</h1><p class="account-intro">Choose the opinions to save to your account. On a shared browser, include only your own responses.</p>${stats(countOpinions(opinions))}<form id="claim-form"><label class="account-field" for="display-name">Your display name</label><input class="account-text-input" id="display-name" name="displayName" minlength="2" maxlength="60" required value="${esc(profile?.displayName||'')}" placeholder="What should we call you?" autocomplete="name"><div class="account-review-controls"><label class="account-choice"><input type="checkbox" name="profilePublic" ${profilePublic?'checked':''}>Make my profile public</label><p class="account-help">Private by default. A product opinion appears on your public profile and its product page only when your profile and that opinion are both public.</p><button class="text-button" type="button" data-publish-selected>Make selected opinions public</button></div>${opinions.length?'<div class="account-product-list">'+opinions.map(o=>opinionCard(o,`<label class="account-choice"><input type="checkbox" data-include="${esc(o.productId)}" ${o.claimable===false?'disabled':'checked'}>${o.claimable===false?'This response belongs to another account':'Save this opinion to my account'}</label><label class="account-choice public-choice"><input type="checkbox" data-public="${esc(o.productId)}" ${o.claimable===false?'disabled':''} ${o.visibility==='public'?'checked':''}>Show this opinion publicly</label>`)).join('')+'</div>':'<p class="account-empty">No product opinions to claim from this browser. “Haven’t tried” and nominations don’t become endorsements. You can still create your private profile.</p>'}<p class="account-selection-note">Your original responses stay in this collection. Saving your picks does not cast another vote. Existing opinions keep their visibility unless you change it here.</p>${statusMarkup()}<div class="account-actions"><button class="primary" type="submit">Save my picks</button><a class="text-button" href="${esc(backPath)}">Continue to the board</a></div></form>`);
    root.querySelector('[data-publish-selected]')?.addEventListener('click',()=>{const form=root.querySelector('#claim-form');form.elements.profilePublic.checked=true;root.querySelectorAll('[data-include]:checked').forEach(input=>{root.querySelectorAll('[data-public]').forEach(pub=>{if(pub.dataset.public===input.dataset.include)pub.checked=true})})});
    root.querySelector('#claim-form')?.addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('[type="submit"]');button.disabled=true;const selected=[...root.querySelectorAll('[data-include]:checked')].map(input=>({productId:input.dataset.include,visibility:[...root.querySelectorAll('[data-public]')].find(p=>p.dataset.public===input.dataset.include)?.checked?'public':'private'}));try{const result=await request('/api/account/claim',{claimToken:edit.claimToken,opinions:selected,displayName:event.target.elements.displayName.value,visibility:event.target.elements.profilePublic.checked?'public':'private'});me.profile=result.profile;edit=null;if(!me.profile)me=await request('/api/account/me');params.delete('review');history.replaceState(null,'','/account'+experimentQuery);renderProfile(me.profile,true,true)}catch(error){button.disabled=false;failure(error)}});wireLogout();
  }
  function sectionOpinions(profile,verdict,owner){const rows=(profile.opinions||[]).filter(o=>o.verdict===verdict),titles={yes:'Vouched',no:'Passed',brand:'Brands I trust'},descriptions={yes:'Specific items endorsed by this person. Experience is self-reported.',no:'A pass records a preference. It does not establish whether the person tried the item.',brand:'Trust in the brand, associated with the item shown. This is not a firsthand item endorsement.'};return `<section class="account-section"><h2>${titles[verdict]} <span class="account-help">${rows.length}</span></h2><p class="account-section-intro">${descriptions[verdict]}</p>${rows.length?'<div class="account-product-list">'+rows.map(o=>opinionCard(o,owner?`<div class="account-product-controls"><label>Current opinion<select data-verdict="${esc(o.productId)}"><option value="yes" ${o.verdict==='yes'?'selected':''}>Vouch for item</option><option value="no" ${o.verdict==='no'?'selected':''}>Pass</option><option value="brand" ${o.verdict==='brand'?'selected':''}>Trust the brand</option><option value="skip">Remove current opinion</option></select></label><label>Visibility<select data-visibility="${esc(o.productId)}"><option value="private" ${o.visibility!=='public'?'selected':''}>Private</option><option value="public" ${o.visibility==='public'?'selected':''}>Public (if profile is public)</option></select></label><label>Comment (optional)<textarea data-comment="${esc(o.productId)}" maxlength="240" rows="2">${esc(o.comment||'')}</textarea></label></div>`:'')).join('')+'</div>':'<p class="account-empty">No '+(verdict==='yes'?'item vouches':verdict==='no'?'passes':'brand endorsements')+' '+(owner?'saved':'shared')+' yet.</p>'}</section>`}
  const icons={back:'<path d="m14 5-7 7 7 7M7 12h14"/>',share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>',camera:'<path d="M8 5 10 2h4l2 3h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',person:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5 19c1-6 13-6 14 0"/>',review:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="2"/><path d="m8 13 3 3 5-6"/>',logout:'<path d="M10 3H4v18h6M8 12h14m-5-5 5 5-5 5"/>',chevron:'<path d="m9 5 7 7-7 7"/>'};
  const icon=name=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||''}</svg>`;
  const plural=(n,one,many=one+'s')=>`${n} ${n===1?one:many}`;
  const category=o=>o.product?.category||'Other';
  const shortDate=value=>{const d=new Date(value);return Number.isFinite(+d)?d.toLocaleDateString('en-US',{month:'short',day:'numeric'}):''};
  const monthDate=value=>{const d=new Date(value);return Number.isFinite(+d)?d.toLocaleDateString('en-US',{month:'long',year:'numeric'}):'Date unavailable'};
  function photoMarkup(profile,prompt=false){return safeImage(profile.photo)?`<img src="${esc(profile.photo)}" alt="${esc(profile.displayName)}’s profile photo">`:prompt?`${icon('camera')}<span>Add photo</span>`:esc((profile.displayName||'V').trim().charAt(0).toUpperCase())}
  function historyScore(o){const rated=o.score!==null&&o.score!==undefined&&Number.isFinite(Number(o.score)),n=rated?Number(o.score):null;const label=rated?n.toFixed(1):o.scoreStatus==='unavailable'?'—':'Unrated';const color=n===null?'unrated':n>=8?'green':n>=6.5?'black':n>=5?'yellow':'red';return `<span class="profile-history-score score-${color}" aria-label="Vouch score: ${rated?label:o.scoreStatus==='unavailable'?'unavailable':'unrated'}" title="Current community score in ${esc(o.experimentTitle||'the source collection')}"><small>Vouch score</small><strong>${label}</strong></span>`;}
  function historyRows(rows){return `<div class="profile-history-rows">${rows.map(o=>`<a class="profile-history-row" href="${'/products/'+encodeURIComponent(o.productId)+(o.experimentId?'?experiment='+encodeURIComponent(o.experimentId):experimentQuery)}">${productImage(o.product)}<span class="profile-product-title"><span class="brand">${esc(o.product?.brand)}</span><span>${esc(o.product?.name||'Product')}</span>${libraryTags(o)}</span><span class="profile-category-chip">${esc(category(o))}</span><span class="profile-history-meta">${historyScore(o)}<time datetime="${esc(o.vouchedAt||o.updatedAt)}">${esc(shortDate(o.vouchedAt||o.updatedAt))}</time></span></a>`).join('')}</div>`}
  const badgeMarkup=badges=>`<span class="contributor-badges">${(badges||[]).map(b=>`<span class="contributor-badge" title="${esc(b.description)}"><span>${esc(b.label)}</span><span class="sr-only">: ${esc(b.description)}</span></span>`).join('')}</span>`;
  function contributorAvatar(person){
    return `<span class="contributor-avatar" aria-hidden="true">${safeImage(person.photo)?`<img src="${esc(person.photo)}" alt="" loading="lazy">`:esc((person.displayName||'V').charAt(0).toUpperCase())}</span>`;
  }
  function contributorRow(row){
    const topCategory=row.topCategory?`<span class="contributor-badge contributor-badge--category">${esc(row.topCategory.label)} ${row.topCategory.count}</span>`:'';
    return `<li class="contributor-row ${row.isYou?'is-you':''}"><a href="/profiles/${encodeURIComponent(row.handle)}"><span class="contributor-rank" aria-label="Rank ${row.rank}">${row.rank}</span>${contributorAvatar(row)}<span class="contributor-person"><strong>${esc(row.displayName)}${row.isYou?' <small>You</small>':''}</strong>${badgeMarkup(row.badges)}${topCategory}</span><span class="contributor-count"><strong>${row.count.toLocaleString()}</strong><span>${row.count===1?'vouch':'vouches'}</span></span></a></li>`;
  }
  function topContributorsLabel(top){
    const people=top.map(({displayName,count})=>`${displayName}, ${plural(count,'vouch','vouches')}`);
    return `Top contributors: ${people.join('; ')}. Jump to rankings.`;
  }
  function topContributorsStrip(top){
    const names=top.map(person=>person.displayName.trim().split(/\s+/));
    const firstNames=names.map(([first])=>first.toLowerCase());
    return `<a class="contributor-top-strip" href="#leaderboard-rankings" aria-label="${esc(topContributorsLabel(top))}">
      <span class="contributor-top-label" aria-hidden="true">Top</span>
      ${top.map((person,index)=>{
        const [first,...rest]=names[index];
        const duplicate=firstNames.filter(name=>name===firstNames[index]).length>1;
        const name=person.isYou?'You':duplicate&&rest.length?`${first} ${Array.from(rest.at(-1))[0]}.`:first;
        return `<span class="contributor-top-person" aria-hidden="true">${contributorAvatar(person)}<span class="contributor-top-name">${esc(name)}</span><strong>${person.count}</strong></span>`;
      }).join('')}
      <span class="contributor-top-arrow" aria-hidden="true">↓</span>
    </a>`;
  }
  function wireTopContributors(strip,rankings,top){
    strip.addEventListener('click',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.button!==0)return;
      // Let the fragment link set the URL and scroll before moving focus.
      requestAnimationFrame(()=>{
        if(document.activeElement===strip||document.activeElement===document.body){
          rankings.focus({preventScroll:true});
        }
      });
    });
    if(top.length<3)return;
    const third=strip.querySelectorAll('.contributor-top-person')[2];
    const fit=()=>{
      if(!strip.isConnected)return;
      third.hidden=false;
      const clipped=[...strip.querySelectorAll('.contributor-top-name')].some(name=>name.scrollWidth>name.clientWidth);
      third.hidden=matchMedia('(width < 380px)').matches&&clipped;
      strip.setAttribute('aria-label',topContributorsLabel(third.hidden?top.slice(0,2):top));
    };
    const observer=new ResizeObserver(fit);
    observer.observe(strip);
    document.fonts.ready.then(fit);
    fit();
    return ()=>observer.disconnect();
  }
  function whoToAskContent({label,featured,others,people}){
    const {handle,displayName,count,note,product}=featured;
    const vouchesInCategory=n=>`${plural(n,'vouch','vouches')} in ${label}`;
    const more=people-1-others.length;
    const productName=[product.brand,product.name].filter(Boolean).join(' ');
    return `
      <div class="who-to-ask-person">
        ${contributorAvatar(featured)}
        <div><a href="/profiles/${encodeURIComponent(handle)}">${esc(displayName)}</a>
          <p class="who-to-ask-meta">${esc(vouchesInCategory(count))}</p></div>
      </div>
      <blockquote class="who-to-ask-note"><p>“${esc(note)}”</p></blockquote>
      <a class="who-to-ask-pick" href="/products/${encodeURIComponent(product.id)}" aria-label="${esc(`${productName}, ${displayName}’s pick`)}">
        ${productImage(product)}
        <span class="who-to-ask-product">
          ${product.brand?`<span class="who-to-ask-brand">${esc(product.brand)}</span>`:''}
          <strong>${esc(product.name)}</strong>
          <span class="who-to-ask-pick-label">Their pick →</span>
        </span>
      </a>
      <div class="who-to-ask-footer">
        <div class="who-to-ask-others">${others.map(person=>`<a href="/profiles/${encodeURIComponent(person.handle)}" aria-label="${esc(`${person.displayName}, ${vouchesInCategory(person.count)}`)}">${contributorAvatar(person)}</a>`).join('')}</div>
        ${more>0?`<span>+ ${more} more</span>`:''}
      </div>`;
  }
  function whoToAskCard(categories){
    if(!categories.length)return '';
    return `<aside class="who-to-ask" aria-labelledby="who-to-ask-title">
      <h2 id="who-to-ask-title">${categories.length===1?'Who to ask about '+esc(categories[0].label):'Who to ask'}</h2>
      <p class="who-to-ask-meta">From classmates' public vouches</p>
      ${categories.length>1?`<div class="who-to-ask-chips" role="group" aria-label="Choose a category">
        ${categories.map(({label},index)=>`<button type="button" data-ask-category="${index}" aria-pressed="${index===0}"><span>${esc(label)}</span></button>`).join('')}
      </div>`:''}
      <div class="who-to-ask-content" aria-live="polite" aria-atomic="true">${whoToAskContent(categories[0])}</div>
    </aside>`;
  }
  let leaderboardDialog=null,leaderboardSignupTimer=null;
  async function openLeaderboardSignup(){
    if(leaderboardDialog?.open)return;
    const dialog=document.createElement('dialog');leaderboardDialog=dialog;
    dialog.className='leaderboard-signup';dialog.setAttribute('aria-labelledby','leaderboard-signup-title');dialog.setAttribute('aria-describedby','leaderboard-signup-intro');
    dialog.innerHTML='<h2 id="leaderboard-signup-title">Your taste belongs here.</h2><p id="leaderboard-signup-intro">Finish signing up to explore Wharton’s recommendations and find your place on the board.</p><p role="status">Opening your saved account…</p>';
    document.body.append(dialog);const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();
    dialog.addEventListener('cancel',event=>event.preventDefault());
    const close=()=>{clearInterval(leaderboardSignupTimer);dialog.close();dialog.remove();document.body.style.overflow=previousOverflow;leaderboardDialog=null;};
    try{
      const [account,status]=await Promise.all([request('/api/account/me'),request('/api/auth/status')]);me=account;auth=status;
      const profile=account.profile;
      if(!profile?.email||profile.emailVerified){close();await renderLeaderboard();return;}
      if(challenge&&authEmail!==profile.email)clearAttempt();
      const frame=()=>`<p class="eyebrow">THE PEOPLE BEHIND THE PICKS</p><h2 id="leaderboard-signup-title">Your taste<br>belongs here.</h2><p id="leaderboard-signup-intro">Finish signing up to explore Wharton’s recommendations and find your place on the board.</p>`;
      const showError=error=>{const el=dialog.querySelector('[data-signup-status]');if(el){el.textContent=error.message;el.setAttribute('role','alert');}};
      const updateTimer=()=>{
        const resend=dialog.querySelector('[data-signup-resend]'),verify=dialog.querySelector('[data-signup-verify]');if(!resend)return;
        const remaining=Math.max(0,Math.ceil((resendAt-Date.now())/1000));resend.disabled=remaining>0;resend.textContent=remaining?'Send a new code in '+remaining+'s':'Send a new code';
        if(expiresAt&&Date.now()>=expiresAt){if(verify)verify.disabled=true;dialog.querySelector('[data-signup-status]').textContent='This code has expired. Request a new code below.';}
      };
      const send=async()=>{
        const result=await request('/api/auth/start',{email:profile.email});
        authEmail=profile.email;challenge=result.challengeId;previewCode=result.previewCode||null;resendAt=Date.now()+(result.resendAfter||30)*1000;expiresAt=Date.now()+result.expiresIn*1000;saveAttempt();renderCode();
      };
      const renderCode=()=>{
        clearInterval(leaderboardSignupTimer);
        dialog.innerHTML=frame()+`<form data-signup-code><label for="leaderboard-code">Verification code</label><p class="account-help">Enter the six-digit code sent to <strong>${esc(profile.email)}</strong>.</p><input id="leaderboard-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required aria-describedby="leaderboard-code-help"><p id="leaderboard-code-help" class="account-help">Codes expire in 10 minutes.</p>${previewCode?`<p class="account-help">Local test code: <code>${esc(previewCode)}</code> · No email was sent.</p>`:''}<p data-signup-status role="status" aria-live="polite"></p><button class="primary" data-signup-verify type="submit">Verify and see the board</button></form><button class="text-button" data-signup-resend type="button">Send a new code</button><a class="leaderboard-signup-back" href="/">Back to Vouch</a>`;
        const form=dialog.querySelector('form'),input=form.elements.code,button=form.querySelector('[type=submit]');
        form.onsubmit=async event=>{event.preventDefault();if(button.disabled)return;button.disabled=true;button.textContent='Verifying…';try{await request('/api/auth/verify',{challengeId:challenge,code:input.value});clearAttempt();close();window.VouchSiteNav?.refreshAccount();await renderLeaderboard();}catch(error){button.disabled=false;button.textContent='Verify and see the board';showError(error);input.setAttribute('aria-invalid','true');input.focus();input.select();}};
        input.oninput=()=>{input.value=input.value.replace(/[^0-9]/g,'').slice(0,6);input.removeAttribute('aria-invalid');if(input.value.length===6)form.requestSubmit();};
        dialog.querySelector('[data-signup-resend]').onclick=async event=>{const resend=event.target;resend.disabled=true;button.disabled=true;try{await send();}catch(error){button.disabled=false;showError(error);updateTimer();}};
        updateTimer();leaderboardSignupTimer=setInterval(updateTimer,1000);input.focus();
      };
      const renderName=()=>{
        dialog.innerHTML=frame()+`<form data-signup-name><label for="leaderboard-name">Full name</label><input id="leaderboard-name" name="displayName" type="text" autocomplete="name" minlength="2" maxlength="60" required value="${esc(profile.displayName==='Vouch member'?'':profile.displayName)}"><label for="leaderboard-email">Your email</label><input id="leaderboard-email" type="email" value="${esc(profile.email)}" readonly><p class="account-help">Your email stays private. We’ll send a six-digit code to verify it.</p><p data-signup-status role="status" aria-live="polite"></p><button type="submit" class="primary">Send verification code</button></form><a class="leaderboard-signup-back" href="/">Back to Vouch</a>`;
        dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('[type=submit]'),name=event.target.elements.displayName.value.trim();if(name.length<2){showError(Error('Enter your full name using at least two characters.'));return;}button.disabled=true;button.textContent='Sending code…';try{await request('/api/account/prepare-verification',{displayName:name});profile.displayName=name;await send();}catch(error){button.disabled=false;button.textContent='Send verification code';showError(error);}};
        dialog.querySelector('input').focus();
      };
      if(!(auth.available??auth.enabled)){dialog.innerHTML=frame()+'<p role="alert">Email verification is temporarily unavailable. Your picks are saved. Please try again shortly.</p><button class="primary" data-signup-retry>Try again</button><a class="leaderboard-signup-back" href="/">Back to Vouch</a>';dialog.querySelector('[data-signup-retry]').onclick=()=>{close();openLeaderboardSignup();};}
      else if(challenge)renderCode();else renderName();
    }catch(error){dialog.innerHTML='<h2 id="leaderboard-signup-title">Finish signing up</h2><p id="leaderboard-signup-intro" role="alert">'+esc(error.message)+'</p><button class="primary" data-signup-retry>Try again</button><a class="leaderboard-signup-back" href="/">Back to Vouch</a>';dialog.querySelector('[data-signup-retry]').onclick=()=>{close();openLeaderboardSignup();};}
  }
  let stopMeasuringLeaderboardCard,stopMeasuringTopStrip;
  function measureLeaderboardCard(card){
    const header=document.querySelector('[data-site-nav]');
    const fit=()=>{
      const stickyHeader=header&&['sticky','fixed'].includes(getComputedStyle(header).position);
      const top=(stickyHeader?header.offsetHeight:0)+24;
      card.style.setProperty('--ask-top',top+'px');
      card.toggleAttribute('data-sticky',card.offsetHeight+top<=window.innerHeight);
    };
    const observer=new ResizeObserver(fit);
    observer.observe(card);
    if(header)observer.observe(header);
    window.addEventListener('resize',fit);
    fit();
    return ()=>{observer.disconnect();window.removeEventListener('resize',fit)};
  }
  async function renderLeaderboard(offset=0,{restoreFragment=false}={}){
    stopMeasuringLeaderboardCard?.();
    stopMeasuringLeaderboardCard=null;
    stopMeasuringTopStrip?.();
    stopMeasuringTopStrip=null;
    document.title='Wharton leaderboard — Vouch';
    shell(`<p class="eyebrow">THE PEOPLE BEHIND THE PICKS</p><h1>Wharton leaderboard</h1><p role="status">Loading recommendations shared…</p>`);
    try{
      const data=await request('/api/community-leaderboard?community=wharton&offset='+offset),viewer=data.viewer;
      const categories=data.whoToAsk?.categories||[], top=data.top||[];
      shell(`<div class="contributor-layout">
        <div class="contributor-overview">
          <div class="contributor-heading">
            <p class="eyebrow">THE PEOPLE BEHIND THE PICKS</p>
            <h1>Wharton leaderboard</h1>
            <p class="account-intro">See who's vouching for what, and who to ask before you buy.</p>
            ${categories.length&&top.length?topContributorsStrip(top):''}
          </div>
          ${whoToAskCard(categories)}
        </div>
        <div class="contributor-main">${viewer.entry&&!data.entries.some(r=>r.isYou)?`<aside class="contributor-your-place" aria-label="Your position"><p class="eyebrow">YOUR PLACE</p><ol class="contributor-list">${contributorRow(viewer.entry)}</ol></aside>`:''}<div class="contributor-table-heading" id="leaderboard-rankings" tabindex="-1" role="group" aria-label="Leaderboard rankings"><span>Contributor</span><span>Public vouches</span></div><ol class="contributor-list" aria-label="Wharton contributors ranked by public vouches">${data.entries.map(contributorRow).join('')}</ol>${!data.entries.length?`<div class="contributor-empty"><span aria-hidden="true"><img src="/brand/vouch-emblem.svg" alt="" class="brand-emblem"></span><h2>${data.total?'No contributors on this page':'Be one of the first'}</h2><p>${data.total?'Return to the previous page to see contributors.':'The first shared recommendations start here. Join to help others discover your picks.'}</p></div>`:''}<nav class="contributor-pagination" aria-label="Leaderboard pages">${offset?'<button class="profile-outline" data-previous>← Previous</button>':''}${data.hasMore?'<button class="profile-outline" data-next>Next →</button>':''}</nav></div></div>`);
      const rankings=root.querySelector('#leaderboard-rankings');
      const strip=root.querySelector('.contributor-top-strip');
      if(strip)stopMeasuringTopStrip=wireTopContributors(strip,rankings,top);
      const card=root.querySelector('.who-to-ask');
      if(card)stopMeasuringLeaderboardCard=measureLeaderboardCard(card);
      const chips=root.querySelector('.who-to-ask-chips');
      const content=root.querySelector('.who-to-ask-content');
      let fade;
      chips?.addEventListener('click',event=>{
        const chip=event.target.closest('button[data-ask-category]');
        if(!chip||chip.getAttribute('aria-pressed')==='true')return;
        chips.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed','false');
        chip.setAttribute('aria-pressed','true');
        content.innerHTML=whoToAskContent(categories[Number(chip.dataset.askCategory)]);
        fade?.cancel();
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
          fade=content.animate([{opacity:0},{opacity:1}],{duration:160,easing:'ease-out'});
        }
      });
      root.querySelector('[data-previous]')?.addEventListener('click',()=>renderLeaderboard(Math.max(0,offset-data.limit)));
      root.querySelector('[data-next]')?.addEventListener('click',()=>renderLeaderboard(offset+data.limit));
      if(restoreFragment&&location.hash==='#leaderboard-rankings'){
        rankings.scrollIntoView();
        rankings.focus({preventScroll:true});
      }
      if(viewer.requiresSignup)await openLeaderboardSignup();
    }catch(error){shell(`<a href="/">← Vouch home</a><h1>Wharton leaderboard</h1><p class="account-error" role="alert">${esc(error.message)}</p><button class="profile-outline" data-retry-leaderboard>Try again</button>`);root.querySelector('[data-retry-leaderboard]').onclick=()=>renderLeaderboard(offset,{restoreFragment});}
  }
  function renderProfile(profile,owner=false,saved=false,showMoreCategories=false){
    window.VouchSiteNav?.refreshAccount();
    if(!profile){renderReview();return}
    document.body.classList.add('collection-page');
    const opinions=(profile.opinions||[]).filter(o=>o.verdict==='yes'&&(owner||o.visibility==='public'));
    const categories=[...new Set(opinions.map(category))].map(name=>({name,rows:opinions.filter(o=>category(o)===name)})).sort((a,b)=>b.rows.length-a.rows.length||a.name.localeCompare(b.name));
    const collections=[{name:'My Recs',rows:opinions},...categories];
    const categoryCard=(c,i)=>`<button class="profile-category ${i===0?'profile-my-recs':''}" data-category="${i}"><span class="profile-collage">${Array.from({length:4},(_,j)=>`<span>${c.rows[j]?safeImage(c.rows[j].product?.image)?`<img src="${esc(c.rows[j].product.image)}" alt="" loading="lazy">`:`<span class="profile-image-fallback">${(c.rows[j].product?.brand?esc(c.rows[j].product.brand):brandV())}</span>`:''}</span>`).join('')}</span><strong>${esc(c.name)}</strong><span>${plural(c.rows.length,'vouch','vouches')}</span></button>`;
    const groups=new Map();
    for(const o of [...opinions].sort((a,b)=>(b.vouchedAt||b.updatedAt).localeCompare(a.vouchedAt||a.updatedAt))){const month=monthDate(o.vouchedAt||o.updatedAt),key=month+'\0'+(o.experimentTitle||o.experimentId||'Your collection');if(!groups.has(key))groups.set(key,{month,title:o.experimentTitle||'Your collection',rows:[]});groups.get(key).rows.push(o)}
    const historyGroups=[...groups.values()],experiments=new Set(opinions.map(o=>o.experimentId||o.experimentTitle||'collection')).size;
    const groupMarkup=g=>`<section class="profile-history-group"><h3 class="eyebrow">${esc(g.month)}</h3><p>${esc(g.title)} · ${plural(g.rows.length,'vouch','vouches')}</p>${historyRows(g.rows)}</section>`;
    document.title=(owner?'Your collection':profile.displayName+'’s collection')+' — Vouch';
    shell(`<div class="profile-mobile-bar"><a href="${esc(backPath)}" aria-label="${experimentId?'The Board':'Vouch home'}">${icon('back')}</a><a class="wordmark" href="/" aria-label="Vouch home"><img class="wordmark-emblem" src="/brand/vouch-emblem.svg" alt="" width="46" height="46">vouch</a>${profile.visibility==='public'&&profile.showName!==false?`<button class="profile-icon-button" data-share aria-label="Share profile">${icon('share')}</button>`:'<span></span>'}</div><a class="profile-back" href="${esc(backPath)}">${experimentId?'← The Board':'← Vouch home'}</a><div class="profile-layout ${owner?'is-owner':''}"><section class="profile-identity" aria-label="Profile"><div class="profile-person"><${owner?'button type="button" data-edit-photo':'div'} class="profile-photo ${!profile.photo&&owner?'is-empty':''}" ${owner?'aria-label="'+(profile.photo?'Change photo':'Add photo')+'"':''}>${photoMarkup(profile,owner&&!profile.photo)}</${owner?'button':'div'}><div class="profile-details"><h1>${esc(profile.displayName)}</h1>${badgeMarkup(profile.badges)}<p class="profile-joined">Member since ${esc(new Date(profile.createdAt).toLocaleDateString('en-US',{month:'short',year:'numeric'}))}</p>${profile.bio?`<p class="profile-bio">${esc(profile.bio)}</p>`:owner?'<button class="profile-bio-prompt" data-edit-bio><span aria-hidden="true">＋</span> Add a bio so people know whose taste this is</button>':''}<div class="profile-actions">${owner?'<button class="profile-outline" data-edit-profile>Edit profile</button>':''}${profile.visibility==='public'&&profile.showName!==false?`<button class="profile-outline profile-share" data-share>${icon('share')} Share</button>`:''}${owner?`<span class="profile-visibility">${icon(profile.visibility==='public'?'globe':'lock')}${profile.visibility==='public'&&profile.showName!==false?'Public':'Private'}</span>`:''}</div></div></div><div class="profile-stats" aria-label="Collection summary"><div><strong>${opinions.length}</strong><span>Vouches</span></div><div><strong>${categories.length}</strong><span>${categories.length===1?'Category':'Categories'}</span></div></div>${owner&&profile.email?`<p class="account-help profile-private-email"><strong>Email</strong><br>${esc(profile.email)}<br><small>Only you can see this. Use it to sign in with a verification code.</small></p>`:owner&&me?.browserProfile?'<p class="account-help browser-profile-note">Your profile is saved in this browser. Signing out or clearing cookies removes your access.</p>':''}${owner&&!profile.emailVerified?'<p class="account-notice">Keep your collection across devices. <button type="button" class="text-button" data-verify-profile-email>Verify your email</button></p>':''}${saved?'<p class="profile-saved" role="status">✓ Your picks are saved</p>':''}${statusMarkup()}${owner&&pendingPicks().length?`<p class="account-notice" role="status">${pendingPicks().length} ${pendingPicks().length===1?'pick from this collection is':'picks from this collection are'} waiting to be saved. <a href="/account${experimentQuery}&review=1">Review and save your picks →</a></p>`:''}</section><section class="profile-categories"><div class="profile-section-heading"><h2>By category</h2><span data-category-count>${plural(collections.length,'category','categories')}</span><button type="button" class="profile-category-toggle" aria-expanded="false" aria-controls="profile-category-grid" hidden><span></span>${icon('chevron')}</button></div><div class="profile-category-window"><div id="profile-category-grid" class="profile-category-grid">${collections.map(categoryCard).join('')}</div></div></section><section class="profile-history"><div class="profile-section-heading"><h2>History</h2><span>${plural(opinions.length,'vouch','vouches')} across ${plural(experiments,'collection')}</span></div>${historyGroups.slice(0,2).map(groupMarkup).join('')}${historyGroups.length>2?`<details class="profile-earlier"><summary>Show ${historyGroups.slice(2).reduce((n,g)=>n+g.rows.length,0)} earlier vouches</summary>${historyGroups.slice(2).map(groupMarkup).join('')}</details>`:''}${!opinions.length?'<p class="account-help">Your item vouches will appear here.</p>':''}</section>${owner?`<section class="profile-account"><h2 class="eyebrow">Account</h2><div class="profile-account-links"><a href="/community-leaderboard"><span>Wharton leaderboard</span>${icon('chevron')}</a><button data-name-visibility>${icon('person')}<span>Who sees your name</span>${icon('chevron')}</button><button data-manage>${icon('eye')}<span>Who sees each vouch</span>${icon('chevron')}</button><button data-all-answers>${icon('review')}<span>All your answers</span>${icon('chevron')}</button>${profile.visibility==='public'&&profile.showName!==false?`<a href="${profilePath(profile.handle)}">${icon('person')}<span>View public profile</span>${icon('chevron')}</a>`:''}${experimentId?`<a href="/account${experimentQuery}&review=1">${icon('review')}<span>Review these products</span>${icon('chevron')}</a>`:''}<button data-logout>${icon('logout')}<span>Sign out</span></button></div></section>`:''}</div>`);
    const categoryToggle=root.querySelector('.profile-category-toggle');
    const categoryCount=root.querySelector('[data-category-count]');
    const categoryWindow=root.querySelector('.profile-category-window');
    const grid=root.querySelector('#profile-category-grid');
    const cards=[...grid.children];
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    let expanded=showMoreCategories;
    let heightAnimation;
    const layoutCategories=(animate=false)=>{
      const limit=Number(getComputedStyle(grid).getPropertyValue('--category-preview-count'));
      const hasMore=cards.length>limit;
      const isOpen=hasMore&&expanded;
      const nextHeight=hasMore&&!isOpen
        ?Math.max(...cards.slice(0,limit).map(card=>card.getBoundingClientRect().bottom))-grid.getBoundingClientRect().top
        :grid.getBoundingClientRect().height;
      categoryToggle.hidden=!hasMore;
      categoryCount.hidden=hasMore;
      categoryToggle.setAttribute('aria-expanded',String(isOpen));
      categoryToggle.querySelector('span').textContent=isOpen?'Show less':'See all '+cards.length;
      cards.forEach((card,i)=>{
        const concealed=!isOpen&&i>=limit;
        if(concealed&&card===document.activeElement)categoryToggle.focus({preventScroll:true});
        card.inert=concealed;
        card.classList.toggle('is-concealed',concealed);
      });
      const height=nextHeight+'px';
      if(categoryWindow.style.height===height)return;
      const from=categoryWindow.getBoundingClientRect().height;
      heightAnimation?.cancel();
      categoryWindow.style.height=height;
      if(animate&&!reducedMotion.matches){
        heightAnimation=categoryWindow.animate([{height:from+'px'},{height}],{
          duration:Number.parseFloat(getComputedStyle(grid).getPropertyValue('--category-motion')),
          easing:'ease-out'
        });
      }
    };
    layoutCategories();
    categoryToggle.onclick=()=>{
      expanded=!expanded;
      const heading=categoryToggle.parentElement;
      const scrollToHeading=!expanded&&heading.getBoundingClientRect().top<0;
      layoutCategories(true);
      if(scrollToHeading)heading.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'nearest'});
    };
    root.querySelectorAll('[data-category]').forEach(el=>el.addEventListener('click',()=>{const c=collections[Number(el.dataset.category)];shell(`<button class="text-button" data-back-profile>← ${owner?'Your collection':esc(profile.displayName)+'’s collection'}</button><h1>${esc(c.name)}</h1><p class="account-help">${plural(c.rows.length,'vouch','vouches')}</p>${c.rows.length?historyRows(c.rows):'<p class="account-empty">No item vouches yet.</p>'}`);root.querySelector('[data-back-profile]').onclick=()=>renderProfile(profile,owner,false,expanded)}));
    root.querySelectorAll('[data-share]').forEach(el=>el.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(new URL(profilePath(profile.handle),location.origin).href);const status=root.querySelector('[data-status]');status.textContent='Profile link copied'}catch{failure(Error('Could not copy the link. Try again.'))}}));
    root.querySelector('[data-verify-profile-email]')?.addEventListener('click',()=>{authEmail=profile.email||'';renderAnonymous();root.querySelector('#account-email')?.focus()});
    if(owner){root.querySelector('[data-name-visibility]').onclick=()=>openProfileEditor(profile,'visibility');root.querySelector('[data-edit-profile]').onclick=()=>openProfileEditor(profile);root.querySelector('[data-edit-photo]').onclick=()=>openProfileEditor(profile,'photo');root.querySelector('[data-edit-bio]')?.addEventListener('click',()=>openProfileEditor(profile,'bio'));root.querySelector('[data-manage]').onclick=()=>renderOpinionSettings(profile,false);root.querySelector('[data-all-answers]').onclick=()=>renderOpinionSettings(profile,true);wireLogout()}
    const identity=root.querySelector('.profile-identity');if(identity){const resize=()=>root.querySelector('.profile-layout')?.style.setProperty('--identity-height',identity.getBoundingClientRect().height+'px');profileObserver=new ResizeObserver(resize);profileObserver.observe(identity);resize()}
    categoryObserver=new ResizeObserver(()=>layoutCategories());
    categoryObserver.observe(grid);
    cards.forEach(card=>categoryObserver.observe(card));
  }
  function renderOpinionSettings(profile,all=false){
    document.body.classList.remove('collection-page');
    shell(`<button class="text-button" data-back-profile>← Your collection</button><h1>${all?'All your answers':'Who sees each vouch'}</h1><p class="account-help">Each vouch has its own setting. Public vouches are visible only while your profile is public. Changes here do not change voting results.</p><form id="opinion-settings">${(all?['yes','no','brand']:['yes']).map(v=>sectionOpinions(profile,v,true)).join('')}${statusMarkup()}<button class="primary" type="submit">Save changes</button></form>`);
    root.querySelector('[data-back-profile]').onclick=()=>renderProfile(profile,true);
    root.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('[type=submit]');button.disabled=true;button.textContent='Saving…';const opinions=[...e.target.querySelectorAll('select[data-verdict]')].map(el=>({productId:el.dataset.verdict,verdict:el.value,comment:[...e.target.querySelectorAll('textarea[data-comment]')].find(c=>c.dataset.comment===el.dataset.verdict)?.value||'',visibility:[...e.target.querySelectorAll('select[data-visibility]')].find(v=>v.dataset.visibility===el.dataset.verdict).value}));try{const result=await request('/api/account/profile',{opinions});me.profile=result.profile;renderOpinionSettings(result.profile,all);root.querySelector('[data-status]').textContent='✓ Changes saved'}catch(error){button.disabled=false;button.textContent='Save changes';failure(error)}};
  }
  function openProfileEditor(profile,focus){
    const opener=document.activeElement,dialog=document.createElement('dialog');dialog.className='profile-editor';dialog.setAttribute('aria-labelledby','profile-edit-title');
    let photo=profile.photo,photoChanged=false,visibility=profile.visibility;
    dialog.innerHTML=`<form id="profile-edit-form" novalidate><div class="profile-edit-header"><button type="button" class="text-button mobile-cancel" data-cancel>Cancel</button><h2 id="profile-edit-title">Edit profile</h2><button type="button" class="profile-icon-button desktop-close" data-cancel aria-label="Cancel editing">×</button></div><div class="profile-edit-body"><div class="profile-edit-photo"><div class="profile-photo ${!photo?'is-empty':''}" data-photo-preview>${photoMarkup(profile,false)}</div><div><input type="file" accept="image/jpeg,image/png,image/webp" id="profile-photo-file" hidden><button type="button" class="profile-outline" data-upload>${photo?'Change photo':'Upload photo'}</button><button type="button" class="text-button" data-remove ${photo?'':'hidden'}>Remove</button><p class="account-help">Square photos work best</p><p data-photo-status role="status"></p></div></div><div class="profile-edit-fields"><label for="profile-name">Display name</label><input id="profile-name" name="displayName" minlength="2" maxlength="60" required autocomplete="name" value="${esc(profile.displayName)}" aria-describedby="profile-name-error"><p id="profile-name-error" class="profile-field-error" role="status"></p>${profile.email?`<label for="profile-email">Email</label><input id="profile-email" type="email" value="${esc(profile.email)}" readonly aria-describedby="profile-email-help"><p id="profile-email-help" class="account-help">Private · Use this email to sign in with a verification code.</p>`:''}<label for="profile-bio">Bio</label><textarea id="profile-bio" name="bio" maxlength="160" rows="4" placeholder="Skin type, sport, where you live: what makes your vouch useful?" aria-describedby="bio-help">${esc(profile.bio||'')}</textarea><div class="profile-bio-help" id="bio-help"><span>Shown on your public profile</span><span data-bio-count>${(profile.bio||'').length}/160</span></div><fieldset class="profile-name-visibility"><legend>Who sees your name</legend><label class="account-choice"><input type="checkbox" name="showName" ${profile.showName!==false?'checked':''}>Show my name alongside products I’ve vouched for</label><p class="account-help">Turn this off to appear as Anonymous on product pages and hide your public profile. You’ll still see your own name here.</p></fieldset><fieldset><legend>Profile visibility</legend><div class="profile-segment">${['private','public'].map(v=>`<button type="button" data-profile-visibility="${v}" aria-pressed="${v===visibility}">${v==='public'?'Public':'Private'}</button>`).join('')}</div><p class="account-help">Each vouch also has its own setting. Only public item vouches appear on your public profile.</p></fieldset></div></div><div class="profile-edit-footer"><p data-edit-status role="status"></p><button type="button" class="text-button footer-cancel" data-cancel>Cancel</button><button class="primary" type="submit">Save profile</button></div></form>`;
    document.body.append(dialog);const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const close=()=>{dialog.close();dialog.remove();document.body.style.overflow=previousOverflow;(root.querySelector('[data-edit-profile]')||opener)?.focus()};
    dialog.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=close);dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
    const file=dialog.querySelector('[type=file]'),preview=dialog.querySelector('[data-photo-preview]'),upload=dialog.querySelector('[data-upload]'),remove=dialog.querySelector('[data-remove]'),save=dialog.querySelector('[type=submit]');
    const updatePhoto=()=>{preview.innerHTML=photo?`<img src="${esc(photo)}" alt="Profile photo preview">`:icon('camera');preview.classList.toggle('is-empty',!photo);remove.hidden=!photo;upload.textContent=photo?'Change photo':'Upload photo'};updatePhoto();
    upload.onclick=()=>file.click();remove.onclick=()=>{photo=null;photoChanged=true;updatePhoto()};
    file.onchange=async()=>{const picked=file.files[0];if(!picked)return;const status=dialog.querySelector('[data-photo-status]');save.disabled=true;upload.disabled=true;remove.disabled=true;status.textContent='Preparing photo…';try{if(!['image/jpeg','image/png','image/webp'].includes(picked.type)||picked.size>5*1024*1024)throw Error('Try a JPG, PNG or WebP under 5 MB.');const bitmap=await createImageBitmap(picked);if(!bitmap.width||!bitmap.height)throw Error('Could not read that photo.');const canvas=document.createElement('canvas');canvas.width=canvas.height=400;const size=Math.min(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,400,400);bitmap.close();photo=canvas.toDataURL('image/png');photoChanged=true;updatePhoto();status.textContent='Photo ready. Save profile to apply.'}catch(error){status.textContent=error.message||'That photo did not upload. Try again.'}finally{save.disabled=false;upload.disabled=false;remove.disabled=false;file.value=''}};
    const name=dialog.querySelector('#profile-name'),bio=dialog.querySelector('#profile-bio');bio.oninput=()=>{dialog.querySelector('[data-bio-count]').textContent=bio.value.length+'/160'};
    const validateName=()=>{const invalid=name.value.trim().length<2||name.value.trim().length>60;name.setAttribute('aria-invalid',String(invalid));dialog.querySelector('#profile-name-error').textContent=invalid?'Enter a display name of 2–60 characters.':'';return !invalid};name.onblur=validateName;name.oninput=()=>{if(name.getAttribute('aria-invalid')==='true')validateName()};
    dialog.querySelectorAll('[data-profile-visibility]').forEach(el=>el.onclick=()=>{visibility=el.dataset.profileVisibility;dialog.querySelectorAll('[data-profile-visibility]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)))});
    dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(!validateName()){name.focus();return}save.disabled=true;save.textContent='Saving…';const status=dialog.querySelector('[data-edit-status]');status.textContent='';const payload={displayName:name.value.trim(),bio:bio.value.trim(),visibility,showName:dialog.querySelector('[name=showName]').checked,...(photoChanged?{image:photo}: {})};try{const result=await request(photoChanged?'/api/account/photo':'/api/account/profile',payload);me.profile=result.profile;profile=result.profile;photoChanged=false;renderProfile(result.profile,true);save.textContent='Save profile';status.textContent='✓ Profile saved';save.focus()}catch(error){save.textContent='Retry save';status.textContent=error.message}finally{save.disabled=false;save.focus()}};
    // Native modal dialogs make the rest of the page inert and contain Tab focus.
    dialog.showModal();(focus==='visibility'?dialog.querySelector('[name=showName]'):focus==='bio'?bio:focus==='photo'?upload:name).focus();
  }
  const itemScoreColor=n=>n>=8?'#367332':n>=6.5?'#111':n>=5?'#967000':'#ba352e';
  function itemBuyUrl(value){
    try{const url=new URL(value);return url.protocol==='https:'?url.href:null}catch{return null}
  }
  function itemOffers(offers){
    return (offers||[]).filter(o=>itemBuyUrl(o.url)&&Number.isFinite(o.price)&&o.price>=0)
      .map(o=>{
        try{return {...o,formattedPrice:new Intl.NumberFormat('en-US',{style:'currency',currency:o.currency||'USD'}).format(o.price)}}
        catch{return null}
      }).filter(Boolean).sort((a,b)=>a.price-b.price).slice(0,5);
  }
  const itemBuyArrow='<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15 15 5M8 5h7v7"/></svg>';
  function itemBuyMarkup(p,offers,{canCompare=false}={}){
    const offer=offers[0],url=itemBuyUrl(offer?.url||p.url);
    if(!url&&!canCompare)return '';
    const label=offer?'Buy at '+offer.retailer:'Buy now';
    const accessibleLabel=label+'. Opens in a new tab. Price and availability set by the retailer.';
    const compare=offers.length>1?'Compare '+plural(offers.length,'retailer'):offer?'See retailer price':canCompare?'Compare retailers':'';
    const toggle=compare?`<button class="item-buy-toggle" type="button" aria-expanded="false" aria-controls="item-buy-offers">${compare} <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 5 5 5-5"/></svg></button>`:'';
    const list=compare?`<ul id="item-buy-offers" hidden>${offers.map((o,index)=>`<li><a rel="sponsored noopener noreferrer" target="_blank" href="${esc(o.url)}" aria-label="${esc(o.retailer+', '+o.formattedPrice+', opens in a new tab'+(offers.length>1&&index===0?', lowest price':''))}"><span class="item-offer-retailer"><span>${esc(o.retailer)}</span>${offers.length>1&&index===0?'<span class="item-offer-lowest">Lowest</span>':''}</span><span>${esc(o.formattedPrice)}</span>${itemBuyArrow}</a></li>`).join('')}</ul>`:'';
    if(!url)return '<div class="item-buy-lookup">'+toggle+list+'</div>';
    return `<section class="item-buy-card" aria-label="Buy">
      <a class="item-buy" href="${esc(url)}" target="_blank" rel="${offer?'sponsored ':''}noopener noreferrer" aria-label="${esc(accessibleLabel)}"><span>${esc(label)}</span>${itemBuyArrow}</a>
      <div class="item-buy-compare-row"><div class="item-buy-compare-heading">${toggle}<span class="item-buy-disclosure">Vouch may earn a commission</span></div>${list}</div>
    </section>`;
  }
  function toggleItemOffers(button,list,open){
    list.getAnimations().forEach(animation=>animation.cancel());
    button.setAttribute('aria-expanded',String(open));
    list.hidden=false;
    list.inert=!open;
    const finish=()=>{list.hidden=!open};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return}
    const closed={height:'0px',opacity:0},expanded={height:list.scrollHeight+'px',opacity:1};
    list.animate(open?[closed,expanded]:[expanded,closed],{duration:180,easing:'ease-out'}).finished.then(finish,()=>{});
  }
  async function loadWhereToBuy(id,p,host){
    let offers=[],canCompare=false;
    function paint({open=false,focus}={}){
      if(!host.isConnected)return;
      host.innerHTML=itemBuyMarkup(p,offers,{canCompare});
      const button=host.querySelector('.item-buy-toggle');
      const list=host.querySelector('#item-buy-offers');
      if(focus)(focus==='compare'&&button?button:host.querySelector('.item-buy'))?.focus({preventScroll:true});
      if(open&&button)toggleItemOffers(button,list,true);
      if(!button)return;
      button.onclick=async()=>{
        if(button.getAttribute('aria-busy')==='true')return;
        if(offers.length){
          toggleItemOffers(button,list,button.getAttribute('aria-expanded')!=='true');
          return;
        }
        button.setAttribute('aria-busy','true');
        try{offers=itemOffers((await request('/api/catalog/items/'+encodeURIComponent(id)+experimentQuery)).offers)}
        catch{/* Keep the direct retailer link if catalog offers are unavailable. */}
        canCompare=false;
        paint({open:offers.length>0,focus:document.activeElement===button?'compare':null});
      };
    }
    paint();
    try{
      canCompare=!!(await request('/api/catalog/config')).whereToBuy;
      if(canCompare)paint({focus:host.contains(document.activeElement)?'buy':null});
    }catch{}
  }
  function itemProductRefs(p){
    const refId=ref=>ref.provider==='channel3'?'c3-'+ref.providerId:ref.provider==='shopify'?'shop-'+encodeURIComponent(ref.providerId):null;
    return [p.id,p.skuId,p.onBoardId,...(p.alternateRefs||[]).map(ref=>typeof ref==='string'?ref:ref?.id||(ref?.providerId?refId(ref):null))].filter(Boolean);
  }
  function itemCategoryPicks(products,p,requestedId){
    const current=new Set([requestedId,...itemProductRefs(p)]);
    const picks=(products||[]).filter(row=>{
      const score=row.score??row.reviewScore;
      return score!=null&&Number.isFinite(Number(score))&&!itemProductRefs(row).some(ref=>current.has(ref))&&/^\/products\/(?!\/)/.test(row.href||'');
    }).slice(0,3);
    return picks.length>=2?picks:[];
  }
  const itemCategoryHeading=(isNew,label)=>isNew?'While it’s new: top-vouched '+label:'Also vouched in '+label;
  function itemPickMarkup(p,index,isNew){
    const score=Number(p.score??p.reviewScore),image=safeImage(p.image);
    const thumb=`<span class="item-pick-image"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/></svg>${image?`<img src="${esc(image)}" alt="" loading="lazy">`:''}${isNew?'':`<span class="item-pick-chip">${score.toFixed(1)}</span>`}</span>`;
    const name=`<span class="item-pick-copy"><span class="item-pick-brand">${esc(p.brand)}</span><span class="item-pick-name">${esc(p.name)}</span></span>`;
    return `<li><a href="${esc(p.href)}" aria-label="${esc([p.brand,p.name].filter(Boolean).join(' ')+', Vouch score '+score.toFixed(1))}" style="--item-pick-score:${itemScoreColor(score)}">${isNew?`<span class="item-pick-rank">${index+1}</span>`:''}${thumb}${name}${isNew?`<span class="item-pick-score">${score.toFixed(1)}</span>`:''}</a></li>`;
  }
  async function loadItemCategoryPicks(host,p,requestedId,isNew){
    const category=p.categoryId||p.category;
    if(!category)return;
    const query=new URLSearchParams({category,sort:'community',reviewed:'1'});
    const controller=new AbortController();
    const abort=()=>controller.abort();
    window.addEventListener('pagehide',abort,{once:true});
    const section=document.createElement('section');
    section.className='item-category-picks';
    section.setAttribute('aria-labelledby','item-picks-heading');
    host.replaceChildren(section);
    const listClass=isNew?'item-picks-ranked':'item-picks-tiles';
    section.innerHTML=`<div class="item-picks-heading"><h2 id="item-picks-heading">${esc(itemCategoryHeading(isNew,p.category||category))}</h2><a href="${esc(experimentId?backPath:'/search?'+query)}">${experimentId?'See the board':'See all'}</a></div>
      <ol class="${listClass} item-picks-loading" aria-hidden="true">${'<li></li>'.repeat(3)}</ol>`;
    try{
      const response=await fetch('/api/discover?'+query,{signal:controller.signal});
      if(!response.ok)throw Error('Category picks unavailable');
      const picks=itemCategoryPicks((await response.json()).products,p,requestedId);
      if(!picks.length){section.remove();return}
      const list=section.querySelector('ol');
      list.classList.replace('item-picks-loading','item-picks-loaded');
      list.removeAttribute('aria-hidden');
      list.innerHTML=picks.map((pick,index)=>itemPickMarkup(pick,index,isNew)).join('');
      for(const image of list.querySelectorAll('img')){
        image.addEventListener('error',()=>image.remove(),{once:true});
        if(image.complete&&!image.naturalWidth)image.remove();
      }
    }catch{section.remove()}
    finally{window.removeEventListener('pagehide',abort)}
  }
  const itemTagDescriptions={value:'Worth what you pay.',quality:'Well made, with thoughtful materials or ingredients.',staple:'An everyday essential you keep coming back to.',design:'Looks good and feels thoughtfully designed.'};
  function productTagSection(data){
    const tags=data.tags||[],selected=new Set(data.selectedTagIds||[]);
    return `<section class="item-tags" aria-labelledby="item-tags-heading"><div class="item-tag-heading"><h2 id="item-tags-heading">What stands out</h2><span>Tap to add yours</span></div><div class="item-tag-options" role="group" aria-label="Your product tags">${tags.map(t=>`<button type="button" class="item-tag" data-item-tag="${esc(t.id)}" aria-pressed="${selected.has(t.id)}" title="${esc(itemTagDescriptions[t.id]||t.label)}"><span class="item-tag-mark" aria-hidden="true">${selected.has(t.id)?'✓':'+'}</span>${esc(t.label)}${t.count?`<small class="item-tag-count">${Number(t.count)}</small>`:''}</button>`).join('')}</div><p class="item-tag-status" data-tag-status role="status" aria-live="polite"></p></section>`;
  }
  function wireProductTags(id,initial){
    let current=initial;
    root.querySelector('.item-tags').addEventListener('click',async event=>{
      const button=event.target.closest('[data-item-tag]');if(!button||button.disabled)return;
      const selected=new Set(current.selectedTagIds||[]),tagId=button.dataset.itemTag;
      selected.has(tagId)?selected.delete(tagId):selected.add(tagId);
      root.querySelectorAll('[data-item-tag]').forEach(b=>b.disabled=true);
      const status=root.querySelector('[data-tag-status]');status.textContent='Saving…';
      try{
        current=await request('/api/products/'+encodeURIComponent(id),{tagIds:[...selected]});
        const active=new Set(current.selectedTagIds),byId=new Map(current.tags.map(t=>[t.id,t]));
        root.querySelectorAll('[data-item-tag]').forEach(b=>{const tag=byId.get(b.dataset.itemTag);b.setAttribute('aria-pressed',String(active.has(b.dataset.itemTag)));b.querySelector('.item-tag-mark').textContent=active.has(b.dataset.itemTag)?'✓':'+';b.querySelector('.item-tag-count')?.remove();if(tag?.count){const count=document.createElement('small');count.className='item-tag-count';count.textContent=tag.count;b.append(count)}});

        status.textContent='Saved. Your tags help others understand this product.';
      }catch(error){status.textContent=error.message+' Tap again to retry.'}finally{root.querySelectorAll('[data-item-tag]').forEach(b=>b.disabled=false)}
    });
  }
  // Keep API order here; a future follow system can change this one policy.
  const orderedItemPeople=people=>people;
  function itemPeopleSummary(people){
    const names=people.filter(p=>p.displayName&&p.displayName!=='Anonymous').slice(0,2).map(p=>window.VouchPeople.shortName(p.displayName));
    if(!names.length)return people.length+' '+(people.length===1?'person':'people')+' vouched publicly';
    if(people.length===1)return names[0]+' vouched';
    const others=people.length-names.length;
    return names.join(', ')+(others?' and '+others+' '+(others===1?'other':'others'):'');
  }
  function itemPeopleSection(input){
    const people=orderedItemPeople(input),avatar=(p,i)=>window.VouchPeople.avatar(p,i,{profilePath});
    const summary=people.length===2&&people.every(p=>p.displayName&&p.displayName!=='Anonymous')?people.map(p=>window.VouchPeople.shortName(p.displayName)).join(' and '):itemPeopleSummary(people);
    return `<section class="item-people" id="item-people"><h2>Vouched by</h2>${people.length?`<div class="item-avatar-strip">${people.slice(0,6).map(avatar).join('')}${people.length>6?`<button type="button" class="item-person" data-more-people aria-label="Show all people who vouched" aria-controls="item-people-list" aria-expanded="false">+${people.length-6}</button>`:''}</div><div class="item-people-caption"><span class="item-people-summary">${esc(summary)}</span><button type="button" class="item-see-all" data-more-people aria-controls="item-people-list" aria-expanded="false">See all</button></div><ul class="item-more-people" id="item-people-list" hidden>${people.map((p,i)=>`<li>${avatar(p,i)}${p.handle?`<a href="${esc(profilePath(p.handle))}">${esc(p.displayName)}</a>`:`<span>${esc(p.displayName||'Anonymous')}</span>`}</li>`).join('')}</ul>`:'<p class="account-help">No public vouches yet.</p>'}</section>`;
  }
  function itemRelativeDate(value){
    const when=new Date(value);if(!Number.isFinite(when.getTime()))return '';
    const days=Math.max(0,Math.floor((Date.now()-when.getTime())/86400000));
    if(days===0)return 'Today';if(days===1)return 'Yesterday';if(days<7)return days+' days ago';if(days<28)return Math.floor(days/7)+' '+(days<14?'week':'weeks')+' ago';
    return when.toLocaleDateString(undefined,{month:'short',day:'numeric'});
  }
  function itemCommentsSection(people){
    const comments=people.filter(p=>typeof p.comment==='string'&&p.comment.trim());if(!comments.length)return '';
    return `<section class="item-comments" id="item-comments" data-count="${comments.length}"><h2>What people say <small>${comments.length}</small></h2><div class="item-comment-grid" id="item-comment-list">${comments.map((p,i)=>`<article class="item-comment"><p>${esc(p.comment)}</p><div class="item-comment-by">${window.VouchPeople.avatar(p,i,{className:'item-person',profilePath})}<strong>${p.handle?`<a href="${esc(profilePath(p.handle))}">${esc(window.VouchPeople.shortName(p.displayName))}</a>`:esc(p.displayName||'Anonymous')}</strong><time datetime="${esc(p.updatedAt||'')}">${esc(itemRelativeDate(p.updatedAt))}</time></div></article>`).join('')}</div>${comments.length>2?`<button type="button" class="item-see-all" data-more-comments aria-expanded="false" aria-controls="item-comment-list">See all ${comments.length} comments</button>`:''}</section>`;
  }
  let pendingProductVouch=null;
  try{pendingProductVouch=JSON.parse(sessionStorage.getItem('vouch-pending-product')||'null')}catch{}
  function setPendingProduct(value){pendingProductVouch=value;try{if(value)sessionStorage.setItem('vouch-pending-product',JSON.stringify(value));else sessionStorage.removeItem('vouch-pending-product')}catch{}}
  const photoVoteText={yes:'You vouched',brand:'You trust the brand',no:'You said nope',skip:'Not tried'};
  async function renderProduct(id){
    document.body.classList.remove('signin-page');
    let data;try{data=await request('/api/products/'+encodeURIComponent(id));}catch{shell('<h1>This product isn’t available anymore.</h1><p>Try searching for it again.</p><a href="/find">Search products</a>');return}const p=data.product||{},contributors=data.contributors||[];
    const requestedId=id;
    if(p.id&&p.id!==id){id=p.id;history.replaceState(null,'','/products/'+encodeURIComponent(id)+location.search)}
    if(data.newToVouch){const robots=document.createElement('meta');robots.name='robots';robots.content='noindex';document.head.append(robots)}
    let result=data.community||null,resultsUnavailable=false;
    if(experimentId){
      const responses=await Promise.allSettled([request('/api/board'+experimentQuery),request('/api/community'+experimentQuery)]);
      const matches=row=>[row.id,row.skuId,row.onBoardId].includes(id);
      result=responses.flatMap(r=>r.status==='fulfilled'?r.value.products||[]:[]).find(matches)||null;
      resultsUnavailable=!result;
    }
    const ratingMarkup=(result,resultsUnavailable=false)=>{
      const n=result?.score==null?null:Number(result.score),rated=n!==null&&Number.isFinite(n),color=!rated?'#6c7165':itemScoreColor(n);
      const counts=result?.voteCounts,total=Number(counts?.total)||0;
      return {score:`<a class="item-score" href="#item-community" style="--item-score-color:${color}" aria-label="Vouch score ${rated?n.toFixed(1)+' out of 10':resultsUnavailable?'unavailable':'unrated'}. See community results."><span>Vouch score</span>${rated?`<span class="item-score-dial"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="item-score-track" cx="40" cy="40" r="35"/><circle class="item-score-progress" cx="40" cy="40" r="35" pathLength="100" stroke-dasharray="${Math.max(0,Math.min(100,n*10))} 100"/></svg><strong>${n.toFixed(1)}</strong></span>`:`<strong class="item-unrated">${resultsUnavailable?'Unavailable':'Unrated'}</strong>`}</a>`,panel:`<section class="item-community" id="item-community"><div class="item-community-heading"><h2>The community says</h2>${counts?`<span>${total} ${total===1?'vote':'votes'}</span>`:''}</div>${counts?`<div class="item-vote-bar" aria-hidden="true">${[['pass','#b96b45'],['maybe','#d8c7ae'],['yes','#6c7d40']].map(([key,c])=>Number(counts[key])>0?`<span style="flex:${Number(counts[key])};background:${c}"></span>`:'').join('')}</div><dl class="item-vote-numbers">${[['pass','👎 Nope'],['maybe','🤝 Brand vouch'],['yes','👍 Vouch']].map(([key,label])=>`<div><dt>${label}</dt><dd>${Number(counts[key])||0}<small>${total?Math.round((Number(counts[key])||0)/total*100):0}%</small></dd></div>`).join('')}</dl>`:`<p class="account-help">${resultsUnavailable?'Community results could not be loaded. Refresh to try again.':'Community ratings will appear here.'}</p>`}</section>`};
    };
    const rating=ratingMarkup(result,resultsUnavailable),people=contributors.filter(c=>c.verdict==='yes');

    document.title=(p.name||'Product')+' — Vouch';
    shell(`<nav class="item-navigation" aria-label="Product navigation"><a class="item-back" href="${esc(backPath)}"><span class="item-back-icon" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5-5 5 5 5M4 10h12"/></svg></span><span>${experimentId?'The Board':'Vouch home'}</span></a>${p.category?`<span class="item-nav-category">${esc(p.category)}</span>`:''}</nav><article class="item-detail"><div class="item-photo">${window.VouchGallery.markup(p,'product-page-gallery')}</div><div class="item-story"><p class="brand">${esc(p.brand)}${p.category?' / '+esc(p.category):''}</p><div class="item-title-row"><h1>${esc(p.name||'Product')}</h1>${rating.score}</div>${itemPeopleSection(people)}${productTagSection(data)}${itemCommentsSection(people)}${rating.panel}<div class="item-purchase-area">${data.newToVouch?`<div class="item-first-vote"><span class="item-first-vote-badge">New to Vouch</span><span>Tried it? Be the first to weigh in.</span><button type="button"><span aria-hidden="true">←</span> Vote</button></div>`:''}<div data-item-buy></div></div><div data-item-picks></div><div class="item-vote-feedback"><p class="account-status" role="status" aria-live="polite"></p><div data-item-vote-controls></div></div></div></article>`);
    root.querySelectorAll('[data-more-people]').forEach(button=>button.addEventListener('click',()=>{const panel=root.querySelector('.item-more-people');panel.hidden=!panel.hidden;root.querySelectorAll('[data-more-people]').forEach(b=>b.setAttribute('aria-expanded',String(!panel.hidden)));}));
    root.querySelector('[data-more-comments]')?.addEventListener('click',event=>{const section=root.querySelector('.item-comments'),expanded=section.classList.toggle('is-expanded');event.currentTarget.setAttribute('aria-expanded',String(expanded));event.currentTarget.textContent=expanded?'Show fewer comments':'See all '+section.dataset.count+' comments';});
    const message=root.querySelector('.item-vote-feedback p'),controls=root.querySelector('[data-item-vote-controls]');
    const firstVote=root.querySelector('.item-first-vote');
    const picksHost=root.querySelector('[data-item-picks]');
    if(data.newToVouch){root.querySelector('.item-score').hidden=true;root.querySelector('.item-community').hidden=true;}
    const bar=document.createElement('div');bar.className='photo-vote-bar';bar.setAttribute('role','group');bar.setAttribute('aria-label','Your take on this product');root.querySelector('.item-photo').append(bar);
    let selected=data.myVerdict||null,collapsed=!!selected,saving=false;
    function paintVoteBar(focus=false){
      bar.classList.toggle('is-collapsed',collapsed);bar.setAttribute('aria-busy',String(saving));
      bar.innerHTML=collapsed?`<span class="photo-vote-summary" tabindex="-1"><span class="photo-vote-icon" data-verdict="${selected}">${window.VouchPhotoVote.icon(selected)}</span><span>${photoVoteText[selected]}</span></span><button type="button" class="photo-vote-change">${selected==='skip'?'Undo':'Change'}</button>`:window.VouchPhotoVote.options(selected);
      bar.querySelectorAll('button').forEach(button=>button.disabled=saving);
      bar.querySelector('.photo-vote-change')?.addEventListener('click',()=>{collapsed=false;paintVoteBar(true)});
      bar.querySelectorAll('.photo-vote-option').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.verdict)));
      if(focus)(collapsed?bar.querySelector('.photo-vote-summary'):bar.querySelector('[aria-pressed="true"]')||bar.querySelector('button'))?.focus({preventScroll:true});
    }
    firstVote?.querySelector('button').addEventListener('click',()=>{
      if(collapsed){collapsed=false;paintVoteBar()}
      bar.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      bar.querySelector('.photo-vote-option')?.focus({preventScroll:true});
    });
    async function refreshPeople(){
      // A product-page verdict can change public review evidence immediately.
      try{const fresh=await request('/api/products/'+encodeURIComponent(id)),people=(fresh.contributors||[]).filter(c=>c.verdict==='yes');
        if(!experimentId){
          const rating=ratingMarkup(fresh.community);
          root.querySelector('.item-score').outerHTML=rating.score;
          root.querySelector('.item-community').outerHTML=rating.panel;
          root.querySelector('.item-score').hidden=!!fresh.newToVouch;
          root.querySelector('.item-community').hidden=!!fresh.newToVouch;
          if(data.newToVouch&&!fresh.newToVouch){
            firstVote?.remove();
            loadItemCategoryPicks(picksHost,p,requestedId,false);
          }
          data.newToVouch=fresh.newToVouch;
          if(!fresh.newToVouch)document.head.querySelector('meta[name="robots"][content="noindex"]')?.remove();
        }
        const section=root.querySelector('.item-people');if(section)section.outerHTML=itemPeopleSection(people);
        root.querySelector('.item-comments')?.remove();root.querySelector('.item-tags')?.insertAdjacentHTML('afterend',itemCommentsSection(people));
        root.querySelectorAll('[data-more-people]').forEach(button=>button.addEventListener('click',()=>{const panel=root.querySelector('.item-more-people');panel.hidden=!panel.hidden;root.querySelectorAll('[data-more-people]').forEach(b=>b.setAttribute('aria-expanded',String(!panel.hidden)))}));
        root.querySelector('[data-more-comments]')?.addEventListener('click',event=>{const section=root.querySelector('.item-comments'),expanded=section.classList.toggle('is-expanded');event.currentTarget.setAttribute('aria-expanded',String(expanded));event.currentTarget.textContent=expanded?'Show fewer comments':'See all '+section.dataset.count+' comments';});
      }catch{/* A successful opinion save must not be reported as failed if attribution is unavailable. */}
    }
    const save=async(verdict,editId)=>{
      if(saving)return;saving=true;paintVoteBar();message.textContent='Saving…';
      controls.querySelectorAll('[data-nomination-action]').forEach(node=>node.remove());
      try{
        const result=await request('/api/account/vouch',{productId:id,verdict,...(editId?{editId}:{})});
        if(!result.saved)throw Error('Could not save. Please try again.');
        setPendingProduct(null);selected=verdict;data.myVerdict=verdict==='skip'?null:verdict;collapsed=true;message.textContent=verdict==='skip'?'Your previous take was cleared.':'Saved to your profile.';
        const n=result.nomination;
        if(verdict==='yes'&&n){
          if(n.status==='choose_edit'){message.textContent+=' Choose an Edit to nominate it to.';for(const e of n.edits){const button=document.createElement('button');button.type='button';button.textContent=e.title;button.dataset.nominationAction='';button.onclick=()=>save('yes',e.id);controls.append(button)}}
          else if(n.status==='retryable'){message.textContent+=' The Edit nomination could not be saved.';const retry=document.createElement('button');retry.type='button';retry.textContent='Retry nomination';retry.dataset.nominationAction='';retry.onclick=()=>save('yes',editId);controls.append(retry)}
          else if(n.status!=='no_eligible_edit') {message.textContent+=n.status==='already_on_edit'?' Already in the '+n.title+'.':n.remaining?' '+n.remaining+' more nomination'+(n.remaining===1?'':'s')+' needed for '+n.title+'.':' Nominated to '+n.title+'.';if(n.href){const link=document.createElement('a');link.href=n.href;link.textContent='Open '+n.title;link.dataset.nominationAction='';controls.append(link)}}
        }
        await refreshPeople();
      }catch(error){message.textContent=error.message;}
      finally{saving=false;paintVoteBar(true)}
    };
    async function choose(verdict){
      if(saving)return;
      if(verdict==='skip'&&!data.myVerdict){selected='skip';collapsed=true;paintVoteBar(true);return;}
      saving=true;paintVoteBar();message.textContent='Checking your account…';
      try{me=await request('/api/account/me');
        if(!me.authenticated||me.browserProfile||me.profile?.browserProfile){setPendingProduct({id,verdict});auth=await request('/api/auth/status');renderAnonymous();return;}
        saving=false;await save(verdict);
      }catch(error){saving=false;message.textContent=error.message;paintVoteBar(true)}
    }
    paintVoteBar();
    loadWhereToBuy(id,p,root.querySelector('[data-item-buy]'));
    loadItemCategoryPicks(picksHost,p,requestedId,!!data.newToVouch);
    if(pendingProductVouch?.id===id){me=await request('/api/account/me');if(me.authenticated&&!me.browserProfile&&!me.profile?.browserProfile)await save(pendingProductVouch.verdict);else{auth=await request('/api/auth/status');renderAnonymous();return;}}
    wireProductTags(id,data);
    if(location.hash==='#item-people')root.querySelector('#item-people')?.scrollIntoView({block:'start'});
  }
  function pendingPicks(){const current=new Map((me?.profile?.opinions||[]).map(o=>[o.productId,o]));return (edit?.opinions||[]).filter(o=>o.claimable!==false&&(!current.has(o.productId)||current.get(o.productId).updatedAt<o.updatedAt));}
  async function load(){if(location.pathname.startsWith('/community-leaderboard')){await renderLeaderboard(0,{restoreFragment:true});return}if(verificationToken){shell(`${topLine()}<h1>Verify your email.</h1><p>Confirm this email address and sign in to your Vouch account.</p><button type="button" class="primary" id="confirm-email-link">Verify email and sign in</button>${statusMarkup()}`);root.querySelector('#confirm-email-link').onclick=async event=>{event.target.disabled=true;try{await request('/api/auth/verify-email',{token:verificationToken});verificationToken=null;clearAttempt();await load();}catch(error){event.target.disabled=false;failure(error);}};return;}window.VouchSiteNav?.refreshAccount();try{const parts=location.pathname.split('/').filter(Boolean);if(parts[0]==='profiles'){const data=await request('/api/profiles/'+encodeURIComponent(decodeURIComponent(parts.slice(1).join('/'))));renderProfile(data.profile,false);return}if(parts[0]==='products'){await renderProduct(decodeURIComponent(parts.slice(1).join('/')));return}me=await request('/api/account/me');auth=await request('/api/auth/status');edit=null;if(experimentId||!me.authenticated||params.get('review')==='1'||!me.profile)edit=await request('/api/account/edit'+experimentQuery);if(me.profile?.verificationRequired){if(challenge&&authEmail!==me.profile.email)clearAttempt();if(challenge)renderAnonymous();else renderPendingVerification();return}if(!me.authenticated){renderAnonymous();return}if(edit&&!me.profile){if(!auth?.identity?.email){renderAnonymous();return}renderSignup();return}if(edit&&params.get('review')==='1'){renderReview();return}if(!me.profile){edit={opinions:[],counts:{yes:0,no:0,brand:0},claimToken:null};renderReview();return}renderProfile(me.profile,true)}catch(error){failure(error)}}
  load();
})();
