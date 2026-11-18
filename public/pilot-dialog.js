export function showPilotDialog(dialog,trigger,onClose) {
  document.body.append(dialog);
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(node=>!node.disabled&&node.getClientRects().length);
    const first=focusable[0],last=focusable.at(-1);
    if(!first)return;
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();
      last.focus();
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener('close',()=>{
    onClose?.();
    dialog.remove();
    if(trigger.isConnected)trigger.focus();
  },{once:true});
  dialog.showModal();
}
