(() => {
  const icon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M7 11H5v10h14V11h-2"/></svg>';

  function button() {
    const control=document.createElement('button');
    control.type='button';
    control.className='pilot-button is-outline pilot-share-button';
    control.innerHTML=icon+'Share';
    return control;
  }

  async function open(trigger,{kind,experimentId}) {
    const {showPilotDialog}=await import('/pilot-dialog.js');
    if(document.querySelector('.pilot-share-dialog[open]'))return;
    const path=kind==='winner'?'board/'+encodeURIComponent(experimentId):kind;
    const title={picks:'Share your picks',winner:'Share the Board',leaderboard:'Share the leaderboard'}[kind];
    const dialog=document.createElement('dialog');
    dialog.className='pilot-dialog pilot-share-dialog';
    dialog.setAttribute('aria-labelledby','pilot-share-heading');
    dialog.innerHTML=`<div class="pilot-share-top"><h2 id="pilot-share-heading">${title}</h2>
      <button type="button" class="pilot-dismiss text-button" aria-label="Close share sheet" autofocus>×</button></div>
      <p role="status">Making your card…</p><div class="pilot-share-body" hidden>
      <img class="pilot-share-preview" width="1080" height="1920" alt="">
      <button type="button" class="pilot-button" data-native-share hidden>Share</button>
      <div class="pilot-share-actions"><a class="pilot-button is-outline" data-download>Download image</a>
      <button type="button" class="pilot-button is-outline" data-copy>Copy link</button></div></div>`;
    const status=dialog.querySelector('[role="status"]'),dismiss=dialog.querySelector('[autofocus]');
    let object;
    dismiss.addEventListener('click',()=>dialog.close());
    showPilotDialog(dialog,trigger,()=>{if(object)URL.revokeObjectURL(object);});
    const track=method=>window.VouchPilot.track('share_created',{kind,method,experimentId});
    try{
      const [cards,response]=await Promise.all([import('/share-cards.js'),fetch('/api/pilot-share/'+path)]);
      const card=await response.json();
      if(!response.ok)throw Error(card.error||'Could not make this card.');
      const blob=await cards.makeCard(card);
      if(!dialog.open)return;
      const name='vouch-wharton-'+kind+'.png',file=new File([blob],name,{type:'image/png'});
      const link=new URL(card.link,location.origin).href;
      object=URL.createObjectURL(blob);
      const preview=dialog.querySelector('img');
      preview.src=object;
      preview.alt=cards.cardAlt(card);
      const download=dialog.querySelector('[data-download]');
      download.href=object;
      download.download=name;
      download.addEventListener('click',()=>track('download'));
      const copy=dialog.querySelector('[data-copy]');
      copy.addEventListener('click',async()=>{
        try{
          await navigator.clipboard.writeText(link);
          status.textContent='Link copied';
          track('copy_link');
        }catch{
          status.textContent='Could not copy the link. Select it to copy.';
          let field=dialog.querySelector('[data-share-url]');
          if(!field){
            field=document.createElement('input');
            field.readOnly=true;
            field.value=link;
            field.dataset.shareUrl='';
            field.setAttribute('aria-label','Share link');
            dialog.append(field);
          }
          field.focus();
          field.select();
        }
      });
      const native=dialog.querySelector('[data-native-share]');
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        native.hidden=false;
        native.addEventListener('click',async()=>{
          try{
            await navigator.share({files:[file],title:card.title,url:link});
            track('native');
          }catch(error){
            if(error.name!=='AbortError')status.textContent='Could not share this card. Try downloading it or copying the link.';
          }
        });
      }
      dialog.querySelector('.pilot-share-body').hidden=false;
      status.textContent='Your card is ready.';
    }catch(error){
      status.textContent=error.message||'Could not make your card.';
    }
  }

  async function mountWinner(host,{top,runnerUp,publicCount,experiment}) {
    if(!host||host.querySelector('button'))return;
    const [{canShareWinner},{whartonCategories}]=await Promise.all([import('/pilot-share-rules.js'),import('/wharton-categories.js')]);
    if(!host.isConnected||!whartonCategories.some(g=>g.match.test(experiment.category))||!canShareWinner(top,runnerUp,publicCount)||host.querySelector('button'))return;
    const trigger=button();
    trigger.addEventListener('click',()=>open(trigger,{kind:'winner',experimentId:experiment.id}));
    host.append(trigger);
  }
  window.VouchShare={open,mountWinner,button};
})();
