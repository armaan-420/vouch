const question="Would seeing who vouched change what you'd buy?";
const choices=[
  ['yes','Yes, definitely','What changed it?'],
  ['maybe','Maybe','What would make it a yes?'],
  ['no','No, I go by ratings','What would you trust instead?']
];

export function mountPulse(root,{pilot,experimentId,handle,existing}) {
  if(existing){
    if(existing.card.isConnected||existing.finished)return existing;
    place(root,existing.card);
    existing.observe();
    return existing;
  }
  const key='vouch-pulse-seen:'+handle;
  let seen=pilot.pulseSeen;
  try{seen ||= !!localStorage.getItem(key);}catch{}
  if(seen)return null;

  const card=document.createElement('section');
  card.className='pilot-board-card pilot-pulse';
  card.setAttribute('aria-labelledby','pilot-pulse-title');
  card.innerHTML=`<button class="pilot-dismiss text-button" type="button" aria-label="Dismiss question">×</button>
    <p class="eyebrow">ONE QUICK QUESTION</p>
    <h2 id="pilot-pulse-title">${question}</h2>
    <div class="pilot-pulse-choices" role="group" aria-labelledby="pilot-pulse-title">${choices.map(([value,label])=>
      `<button type="button" class="pilot-button is-outline" value="${value}">${label}</button>`).join('')}</div>`;
  let shown=false,observer,persisted=Promise.resolve();
  const view={
    card,finished:false,
    observe(){
      if(shown)return;
      observer=new IntersectionObserver(entries=>{
        if(!entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.5))return;
        shown=true;
        window.VouchPilot.track('pulse_shown',{experimentId});
        observer.disconnect();
      },{threshold:.5});
      observer.observe(card);
    },
    disconnect(){observer?.disconnect();}
  };
  function remember(){
    try{localStorage.setItem(key,'1');}catch{}
  }
  function save(type,fields={}){
    return fetch('/api/pilot-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,experimentId,...fields}),keepalive:true}).catch(()=>{});
  }
  function remove(){
    view.finished=true;
    view.disconnect();
    if(card.contains(document.activeElement)){
      const next=root.querySelector('#pilot-next-heading')||root.querySelector('.board h1');
      if(next){next.tabIndex=-1;next.focus({preventScroll:true});}
    }
    card.remove();
  }
  function thank(){
    card.innerHTML='<p role="status" tabindex="-1">Thanks. That helps.</p>';
    card.removeAttribute('aria-labelledby');
    card.querySelector('[role="status"]').focus({preventScroll:true});
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)remove();
    else setTimeout(remove,2000);
  }
  card.querySelector('.pilot-dismiss').addEventListener('click',()=>{
    remember();
    save('pulse_dismissed');
    remove();
  });
  card.querySelector('.pilot-pulse-choices').addEventListener('click',event=>{
    const choice=choices.find(([value])=>value===event.target.closest('button')?.value);
    if(!choice)return;
    remember();
    const [answer,,label]=choice;
    persisted=save('pulse_answer',{answer});
    card.querySelector('.pilot-dismiss').remove();
    card.querySelector('.pilot-pulse-choices').outerHTML=`<form class="pilot-followup">
      <label for="pilot-followup" tabindex="-1">${label}</label>
      <textarea id="pilot-followup" maxlength="240" aria-describedby="pilot-followup-count" rows="3"></textarea>
      <span id="pilot-followup-count">0 / 240</span>
      <div class="pilot-dialog-actions"><button type="button" class="pilot-button is-outline">Skip</button>
      <button type="submit" class="pilot-button">Send</button></div></form>`;
    const form=card.querySelector('form'),text=form.querySelector('textarea');
    text.addEventListener('input',()=>{form.querySelector('#pilot-followup-count').textContent=text.value.length+' / 240';});
    form.querySelector('label').focus();
    form.querySelector('[type="button"]').addEventListener('click',thank);
    form.addEventListener('submit',submit=>{
      submit.preventDefault();
      const followUp=text.value.trim();
      if(followUp)persisted.then(()=>save('pulse_answer',{answer,followUp}));
      thank();
    });
  });
  place(root,card);
  view.observe();
  return view;
}

function place(root,card) {
  const rows=root.querySelectorAll('.board > .rank-row');
  (rows[Math.min(rows.length,3)-1]||root.querySelector('.board-topline')).after(card);
}
