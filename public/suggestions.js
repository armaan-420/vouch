(()=>{
 let dialog=null,priorFocus=null,modalPending=false;
 const successText="Thanks — your suggestion is in. If it fits, it'll show up as a new Edit.";
 function card({modal=false}={}){return '<section class="suggestion-card'+(modal?' suggestion-card-modal':'')+'"><h2'+(modal?' id="suggestion-dialog-title"':'')+'>What should Vouch rank next?</h2><form class="suggestion-form"><label>Category<input name="category" required minlength="2" maxlength="60" placeholder="Running shoes, backpacks…" autocomplete="off"></label><button type="submit" class="primary">Suggest a category</button><p role="status" aria-live="polite" aria-atomic="true"></p></form></section>';}
 function message(target,data){target.textContent=data.existingEdit?'This Edit is already live. ':successText;if(data.existingEdit){const link=document.createElement('a');link.href=data.existingEdit.url;link.textContent=data.existingEdit.title;target.append(link);}}
 function banner(data,{error=false}={}){
  let notice=document.getElementById('suggestion-banner');if(!notice){notice=document.createElement('aside');notice.id='suggestion-banner';notice.className='suggestion-banner';notice.innerHTML='<div role="status" aria-live="polite" aria-atomic="true"></div><button type="button" aria-label="Dismiss suggestion confirmation">×</button>';notice.querySelector('button').onclick=()=>notice.remove();document.body.append(notice);}
  notice.classList.toggle('suggestion-banner-error',error);const text=notice.querySelector('[role=status]');if(error)text.textContent=data;else message(text,data);
 }
 function mount(root){root.querySelectorAll('.suggestion-form').forEach(form=>{
  const input=form.elements.category,button=form.querySelector('[type=submit]'),status=form.querySelector('[role=status]');let pending=false;
  input.addEventListener('input',()=>{if(pending)return;button.disabled=false;button.textContent='Suggest a category';button.classList.remove('is-suggested');status.textContent='';});
  form.onsubmit=async event=>{event.preventDefault();if(pending)return;pending=true;if(form.closest('#suggestion-dialog'))modalPending=true;form.setAttribute('aria-busy','true');input.readOnly=true;button.disabled=true;button.textContent='Sending…';status.textContent='';
   try{const response=await fetch('/api/suggestions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:input.value.trim()})}),data=await response.json();if(!response.ok)throw Error(data.error||'Could not save your suggestion. Please try again.');
    button.textContent=data.existingEdit?'Already live ✓':'Suggested ✓';button.classList.add('is-suggested');message(status,data);form.reset();
    if(form.closest('#suggestion-dialog')){dialog.close();banner(data);}
   }catch(error){button.disabled=false;button.textContent='Suggest a category';status.textContent=error.message;if(form.closest('#suggestion-dialog')&&!dialog.open)banner(error.message,{error:true});}
   finally{pending=false;if(form.closest('#suggestion-dialog'))modalPending=false;form.setAttribute('aria-busy','false');input.readOnly=false;}
  };
 });}
 function open(trigger){
  if(!dialog){dialog=document.createElement('dialog');dialog.id='suggestion-dialog';dialog.className='suggestion-dialog';dialog.setAttribute('aria-labelledby','suggestion-dialog-title');document.body.append(dialog);dialog.addEventListener('close',()=>{if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});});}
  if(dialog.open)return;priorFocus=trigger||document.activeElement;document.getElementById('suggestion-banner')?.remove();if(modalPending){dialog.showModal();return;}
  dialog.innerHTML='<button class="suggestion-dialog-close" type="button" aria-label="Close suggestion form">×</button>'+card({modal:true});dialog.querySelector('.suggestion-dialog-close').onclick=()=>dialog.close();mount(dialog);dialog.showModal();dialog.querySelector('input').focus();
 }
 window.VouchSuggestions={card,mount,open};
 document.querySelectorAll('[data-suggest-edit]').forEach(button=>button.onclick=()=>open(button));
 const home=document.getElementById('home-suggestion');if(home){home.innerHTML=card();mount(home);}
})();
