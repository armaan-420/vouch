(()=>{
 const form=document.getElementById('admin-login-form'),input=document.getElementById('admin-pin'),status=document.getElementById('admin-login-status'),button=form.querySelector('button');
 form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;button.disabled=true;status.textContent='Unlocking…';try{const response=await fetch('/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:input.value})}),data=await response.json();input.value='';if(!response.ok)throw Error(data.error||'Could not unlock the workspace.');location.reload();}catch(error){status.textContent=error.message;input.focus();}finally{button.disabled=false;}});
})();
