(() => {
  const host=document.querySelector('[data-vouch-product]');
  function track(event){
    if(event.type==='auxclick'&&event.button!==1)return;
    if(event.target.closest('[data-vouch-retailer]'))window.VouchPilot.track('buy_click',{
      productId:host.dataset.vouchProduct,source:'share',ref:host.dataset.vouchRef
    });
  }
  host?.addEventListener('click',track);
  host?.addEventListener('auxclick',track);
})();
