(function(){
  'use strict';
  const photoVoteChoices=[['no','Nope',"Nope, wouldn't recommend"],['brand','Brand','Brand vouch, trust the brand only'],['yes','Vouch','Vouch, would recommend'],['skip','Not tried','Not tried']];
  function photoVoteIcon(verdict){
    const thumb='<path d="M7 10v11H3V10h4Zm0 0 5-7c1-1 3 0 2 3l-1 4h6c2 0 2 2 1 4l-2 6H7"/>';
    const paths=verdict==='skip'?'<path d="M5 12h14"/>':verdict==='brand'?'<path d="m3 7 4-3 4 2 3-2 7 4-4 8-4 4-6-4-4-9Zm5 0 4-1 4 4-3 3-3-2-2 2M3 7l-2 2 4 9 2-2M21 8l2 2-4 9-2-2m-6-2 4 3m-6-1 3 3"/>':`<g${verdict==='no'?' transform="rotate(180 12 12)"':''}>${thumb}</g>`;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }
  const options=selected=>photoVoteChoices.map(([verdict,label,name])=>`<button type="button" class="photo-vote-option" data-verdict="${verdict}" aria-label="${name}" aria-pressed="${selected===verdict}"><span class="photo-vote-icon" data-verdict="${verdict}">${photoVoteIcon(verdict)}</span><span>${label}</span></button>`).join('');
  window.VouchPhotoVote={icon:photoVoteIcon,options};
})();
