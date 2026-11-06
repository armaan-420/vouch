(()=>{
 const panel=document.getElementById('feedback-panel'),list=document.getElementById('feedback-list'),detail=document.getElementById('feedback-detail'),status=document.getElementById('admin-feedback-status');let entries=[];
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=value=>new Date(value).toLocaleString();
 async function api(path,data){const response=await fetch('/api/admin/feedback'+path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{})}),result=await response.json();if(!response.ok)throw Error(result.error||'Could not load feedback.');return result;}
 const action=entry=>'<button class="admin-action" type="button" data-feedback-read="'+esc(entry.id)+'" '+(entry.status==='read'?'disabled':'')+'>'+(entry.status==='read'?'Read':'Mark read')+'</button>';
 function render(){
  const count=entries.filter(e=>e.status==='new').length,badge=document.getElementById('admin-feedback-count');badge.textContent=count;badge.hidden=!count;
  list.innerHTML='<div class="admin-table-wrap" tabindex="0" role="region" aria-label="Private feedback"><table class="admin-table"><thead><tr>'+['Feedback','Page / Edit','Contact','Status','Received','Action'].map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+entries.map(e=>'<tr data-row-href="#feedback/'+encodeURIComponent(e.id)+'"><td><a class="table-primary" href="#feedback/'+encodeURIComponent(e.id)+'">'+esc(e.message.slice(0,100))+(e.message.length>100?'…':'')+'</a></td><td>'+esc(e.path)+'<small>'+esc(e.experimentId||'General')+'</small></td><td>'+esc(e.email||'No email')+'</td><td><span class="table-badge">'+esc(e.status)+'</span></td><td>'+date(e.createdAt)+'</td><td>'+action(e)+'</td></tr>').join('')+(entries.length?'':'<tr><td colspan="6" class="table-empty">No feedback yet.</td></tr>')+'</tbody></table></div>';
  let id;try{const parts=location.hash.slice(1).split('/');if(parts[0]==='feedback'&&parts[1])id=decodeURIComponent(parts.slice(1).join('/'));}catch{}
  list.hidden=!!id;detail.hidden=!id;if(id){const entry=entries.find(e=>e.id===id);detail.innerHTML='<a class="detail-back" href="#feedback">← All feedback</a>'+(entry?'<h2>Feedback</h2><p class="feedback-note">'+esc(entry.message)+'</p><p>'+esc(entry.email||'No reply email')+' · '+esc(entry.path)+' · '+date(entry.createdAt)+'</p>'+action(entry):'<p>Feedback not found.</p>');}
 }
 async function load(){try{entries=(await api('')).entries;render();}catch(error){status.textContent=error.message;}}
 panel.onclick=async event=>{const button=event.target.closest('[data-feedback-read]');if(!button)return;button.disabled=true;try{await api('/status',{id:button.dataset.feedbackRead,status:'read'});status.textContent='Feedback marked read.';await load();}catch(error){button.disabled=false;status.textContent=error.message;}};
 document.getElementById('feedback-refresh').onclick=load;document.addEventListener('vouch-admin-section',event=>{if(event.detail.section==='feedback')load();});load();
})();
