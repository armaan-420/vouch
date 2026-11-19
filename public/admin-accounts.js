(()=>{
 const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=value=>value?new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'—';
 let accounts=[],page=0,loaded=false,loading=false,target=null,action=null,busy=false;
 const labels={comments:'Review comments','send-verification':'Send verification email','add-email':'Add email','change-email':'Change email',resend:'Resend verification code',disable:'Disable account',enable:'Re-enable account',delete:'Delete account',revoke:'Sign out all devices'};
 async function load(){if(loading)return;loading=true;Admin.refresh('people-refresh',true);$('people-status').textContent='Loading accounts…';try{const r=await fetch('/api/admin/accounts',{cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error);accounts=data.accounts;loaded=true;Admin.setCount('unverified',accounts.filter(a=>a.status==='unverified').length);render();Admin.refresh('people-refresh',false,true);$('people-status').textContent='';}catch(e){$('people-status').textContent=e.message||'Could not load accounts.';}finally{loading=false;Admin.refresh('people-refresh',false);}}
 function render(){
  const q=$('people-query').value.trim().toLowerCase(),filter=$('people-filter').value,sort=$('people-sort').value;
  $('people-metrics').innerHTML=[
   ['Total accounts','all',accounts.length],
   ['Active','active',accounts.filter(a=>a.status==='active').length],
   ['Verified Wharton email','wharton',accounts.filter(a=>a.whartonEmailVerified).length],
   ['Unverified','unverified',accounts.filter(a=>a.status==='unverified').length],
   ['Disabled','disabled',accounts.filter(a=>a.status==='disabled').length]
  ].map(([label,key,count])=>Admin.metric(label,count,{filter:key,active:filter===key})).join('');
  const rows=accounts.filter(a=>(filter==='all'||filter==='wharton'&&a.whartonEmailVerified||a.status===filter)&&[a.displayName,a.email,a.handle].join(' ').toLowerCase().includes(q)).sort((a,b)=>sort==='name'?a.displayName.localeCompare(b.displayName):String(sort==='last'?b.lastSignInAt||'':b.createdAt||'').localeCompare(String(sort==='last'?a.lastSignInAt||'':a.createdAt||'')));
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/25)-1));
  $('people-table').innerHTML='<div class="admin-table-wrap" tabindex="0" role="region" aria-label="User accounts"><table class="admin-table"><caption class="sr-only">User accounts</caption><thead><tr>'+['Person','Email / verification','Status','Joined','Last sign-in','Vouches','Sessions','Actions'].map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+ (rows.slice(page*25,page*25+25).map(a=>'<tr><td><strong>'+esc(a.displayName)+'</strong><small>'+esc(a.handle||a.type)+'</small><small>'+esc(a.visibility||'No profile')+'</small></td><td>'+esc(a.email||'No email')+'<small>'+(a.whartonEmailVerified?'Verified · Wharton email':a.verified?'Verified':'Unverified')+'</small></td><td><span class="table-badge">'+({active:'Active',unverified:'Unverified',disabled:'Disabled'})[a.status]+'</span></td><td>'+esc(date(a.createdAt))+'</td><td>'+esc(date(a.lastSignInAt))+'</td><td>'+a.vouches+'</td><td>'+a.sessions+'</td><td>'+menu(a)+'</td></tr>').join('')||'<tr><td colspan="8" class="table-empty">'+(accounts.length?'No accounts match your search.':'No accounts yet.')+'</td></tr>')+'</tbody></table></div><p class="table-scroll-hint">Scroll across to see all columns →</p>';
  $('people-pagination').innerHTML='<span>'+rows.length+' accounts · Page '+(page+1)+' of '+Math.max(1,Math.ceil(rows.length/25))+'</span><div><button type="button" data-page="-1" '+(!page?'disabled':'')+'>Previous</button> <button type="button" data-page="1" '+((page+1)*25>=rows.length?'disabled':'')+'>Next</button></div>';
 }
 async function reviewComments(person){
  const dialog=document.createElement('dialog');dialog.className='comment-review';dialog.innerHTML='<h2>Recommendation comments</h2><p>'+esc(person.displayName)+'</p><div data-comments></div><p role="alert"></p><button type="button" data-close>Close</button>';document.body.append(dialog);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.showModal();
  const load=async offset=>{try{const response=await fetch('/api/admin/comments?handle='+encodeURIComponent(person.handle)+'&offset='+offset),data=await response.json();if(!response.ok)throw Error(data.error);const host=dialog.querySelector('[data-comments]');host.innerHTML=data.comments.map(c=>'<article><strong>'+esc(c.name)+'</strong><p>'+esc(c.comment)+'</p><button type="button" data-remove="'+esc(c.productId)+'">Remove comment</button></article>').join('')||'<p>No recommendation comments.</p>';if(data.nextOffset!==null){const more=document.createElement('button');more.textContent='Next comments';more.onclick=()=>load(data.nextOffset);host.append(more);}host.querySelectorAll('[data-remove]').forEach(button=>{button.onclick=async()=>{button.disabled=true;try{const r=await fetch('/api/admin/comment-remove',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:person.handle,productId:button.dataset.remove})});if(!r.ok)throw Error('Could not remove comment.');await load(offset)}catch(e){dialog.querySelector('[role=alert]').textContent=e.message;button.disabled=false;}}});}catch(e){dialog.querySelector('[role=alert]').textContent=e.message;}};await load(0);
 }
 function menu(a){
  const actions=[
   a.email&&a.status!=='disabled'&&'send-verification',
   a.canResend&&a.status!=='disabled'&&'resend',
   a.email?'change-email':'add-email',
   a.status==='disabled'&&'enable',
   a.handle&&'comments'
  ];
  const danger=[a.sessions&&'revoke',a.status!=='disabled'&&'disable','delete'];
  return Admin.menu('Actions for '+a.displayName,actions.filter(Boolean).map(action=>button(a,action)).join(''),danger.filter(Boolean).map(action=>button(a,action)).join(''));
 }
 function button(a,action){return '<button type="button" role="menuitem" data-person="'+esc(a.id)+'" data-person-action="'+action+'">'+labels[action]+'</button>';}
 $('people-metrics').onclick=event=>{
  const card=event.target.closest('[data-metric-filter]');if(!card)return;
  const key=card.dataset.metricFilter,select=$('people-filter');
  select.value=select.value===key?'all':key;
  page=0;render();
  $('people-metrics').querySelector('[aria-pressed="true"]')?.focus();
 };
 $('people-refresh').onclick=load;
 for(const id of ['people-query','people-filter','people-sort'])$(id).addEventListener(id==='people-query'?'input':'change',()=>{page=0;render();});
 $('people-pagination').onclick=e=>{const b=e.target.closest('[data-page]');if(b){page+=Number(b.dataset.page);render();}};
 $('people-table').onclick=e=>{const b=e.target.closest('[data-person-action]');if(!b)return;b.closest('[popover]')?.hidePopover();target=accounts.find(a=>a.id===b.dataset.person);action=b.dataset.personAction;if(action==='comments'){reviewComments(target);return;}
  $('people-dialog-title').textContent=labels[action];$('people-dialog-person').textContent=target.displayName+' · '+(target.email||target.handle||target.id);
  $('people-dialog-copy').textContent=({'send-verification':'Send a verification link to this email. The link expires in ten minutes and lets the owner verify their email and sign in.','add-email':'Add an email address to this account and keep its collection. Enter the new email in both fields. You can send a verification email after saving.','change-email':'Change the email for this account and keep its collection. Existing email sessions and verification links will stop working. The new email must be verified. Type the current email or handle to confirm.',resend:'Send a fresh code for the user’s existing browser sign-in attempt. Previous codes will stop working.',disable:'Sign out all devices, block account access and hide the public profile. You can re-enable this account later.',enable:'Restore account access and the profile’s existing visibility. Email users will need to sign in again.',revoke:'End all email sessions and pending sign-in attempts. The user can sign in again.',delete:'Permanently remove this account, profile photo and saved collection. This cannot be undone. Historical Edit votes remain. The email can create a new account later.'})[action];
  $('people-confirm-label').hidden=!['delete','change-email','add-email'].includes(action);$('people-confirm').required=['delete','change-email','add-email'].includes(action);$('people-email-label').hidden=!['change-email','add-email'].includes(action);$('people-new-email').required=['change-email','add-email'].includes(action);$('people-new-email').value='';$('people-confirm').value='';$('people-confirm').type=action==='add-email'?'email':'text';$('people-confirm-text').textContent=action==='add-email'?'Confirm email address':'Type '+(target.email||target.handle||target.id)+' to confirm';$('people-email-text').textContent=action==='add-email'?'Email address':'New email address';$('people-dialog-error').textContent='';$('people-submit').textContent=labels[action];$('people-dialog').showModal();
 };
 $('people-cancel').onclick=()=>{if(!busy)$('people-dialog').close();};$('people-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 $('people-action-form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$('people-submit').disabled=true;$('people-cancel').disabled=true;$('people-dialog-error').textContent='';try{const r=await fetch('/api/admin/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:target.id,action,confirm:$('people-confirm').value,email:$('people-new-email').value})}),data=await r.json();if(!r.ok)throw Error(data.error);$('people-dialog').close();await load();$('people-status').textContent=data.message;}catch(e){$('people-dialog-error').textContent=e.message||'Could not update this account.';}finally{busy=false;$('people-submit').disabled=false;$('people-cancel').disabled=false;}};
 function applyLinkedFilter(){if(new URLSearchParams(location.hash.split('?')[1]).get('status')==='unverified'){ $('people-filter').value='unverified';page=0;if(loaded)render();}}
 document.addEventListener('vouch-admin-section',e=>{if(e.detail.section==='accounts'){applyLinkedFilter();if(!loaded)load();}});
 applyLinkedFilter();load();
})();
