import {progressMarkup,showProgress} from './pilot-progress.js';

const owala='/assets/water-bottles/owala.png';
const hydro='/assets/water-bottles/hydroflask.png';
const balm='/assets/wharton-lip-balm/c3-ajcgnrn.jpg';
const photo=src=>`<img src="${src}" alt="">`;
const fan=[['left',hydro],['center',owala],['right',balm]].map(([place,src])=>
  `<div class="signin-polaroid is-${place}"><div class="signin-polaroid-photo">${photo(src)}</div><i class="pilot-avatar"></i></div>`).join('');
const mockRows=[owala,hydro].map((src,i)=>`<div class="pilot-demo-row"><span>${i+1}</span>${photo(src)}<div class="pilot-demo-avatars"><i class="pilot-avatar"></i><i class="pilot-avatar"></i><i class="pilot-avatar"></i></div><i class="pilot-demo-score"></i></div>`).join('');
const steps=[
  {heading:'Reviews from people, not strangers.',body:'See what your classmates actually use, with their names on it.',art:`<div class="pilot-fan">${fan}</div>`},
  {heading:'One tap per product.',body:"<mark>Vouch</mark> means you've used it and recommend it. Otherwise, pass or skip.",art:`<div class="pilot-demo-rating">${photo(balm)}<div><span>Pass</span><span class="is-selected">Vouch</span><span>Haven’t tried</span></div></div>`},
  {heading:'Your vouch helps someone decide.',body:'It shapes the Board, fills your profile and earns your spot on the leaderboard.',art:`<div class="pilot-demo-board">${mockRows}<span class="pilot-demo-pill">Your spot on the leaderboard</span></div>`}
];

export function mountIntro(root,onDone) {
  let step=0,touch;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  document.body.classList.add('wharton-onboarding');
  root.setAttribute('aria-live','off');
  root.innerHTML=`<section class="pilot-intro">${progressMarkup(0,'Intro')}<div class="pilot-intro-skip"></div><div class="pilot-intro-screen"></div></section>`;
  const intro=root.querySelector('.pilot-intro'),bar=intro.querySelector('.pilot-progress');
  const skip=intro.querySelector('.pilot-intro-skip'),screen=intro.querySelector('.pilot-intro-screen');
  function finish(type) {
    document.removeEventListener('keydown',keys);
    root.setAttribute('aria-live','polite');
    document.body.classList.remove('wharton-onboarding');
    onDone(type,step);
  }
  function render(next) {
    const direction=next>=step?1:-1;
    step=next;
    const current=steps[step-1];
    showProgress(bar,step,`Intro, step ${step} of 3`,1);
    skip.innerHTML=step<3?'<button class="text-button" type="button">Skip</button>':'';
    screen.innerHTML=`<div class="pilot-intro-art" aria-hidden="true">${current.art}</div>
      <h1 tabindex="-1">${current.heading}</h1><p>${current.body}</p>
      <button class="pilot-button" type="button">${step===3?'Pick a category':'Next'}</button>`;
    skip.querySelector('button')?.addEventListener('click',()=>finish('intro_skipped'));
    screen.querySelector('button').addEventListener('click',forward);
    if(!motion.matches)screen.animate([{opacity:0,transform:`translateX(${24*direction}px)`},{opacity:1,transform:'translateX(0)'}],{duration:220,easing:'ease-out'});
    screen.querySelector('h1').focus({preventScroll:true});
    window.VouchPilot.track('intro_step',{step});
  }
  function forward(){if(step===3)finish('intro_done');else render(step+1);}
  function keys(event){
    if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();
      if(event.key==='ArrowRight')forward();
      else if(step>1)render(step-1);
    }
  }
  document.addEventListener('keydown',keys);
  intro.addEventListener('touchstart',event=>{touch=event.touches.length===1?event.touches[0]:null;},{passive:true});
  intro.addEventListener('touchcancel',()=>{touch=null;});
  intro.addEventListener('touchend',event=>{
    if(!touch)return;
    const end=event.changedTouches[0],dx=end.clientX-touch.clientX,dy=end.clientY-touch.clientY;
    touch=null;
    if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.4)return;
    if(dx<0)forward();
    else if(step>1)render(step-1);
  },{passive:true});
  // Let the empty segments paint before filling the first one.
  render(1);
  if(!motion.matches)bar.firstElementChild.animate([{backgroundSize:'0% 100%'},{backgroundSize:'100% 100%'}],{duration:220,easing:'ease-out'});
}
