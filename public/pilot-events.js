(() => {
  function track(type,fields={}) {
    try {
      const body=JSON.stringify({type,...fields});
      if(navigator.sendBeacon?.('/api/pilot-events',new Blob([body],{type:'application/json'})))return;
      fetch('/api/pilot-events',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
    }catch{}
  }
  window.VouchPilot={track};
})();
