export function progressMarkup(value,label,{segments=3,role='progressbar'}={}) {
  if(role==='img'){
    return `<div class="pilot-progress" role="img" aria-label="${label}" style="grid-template-columns:repeat(${segments},minmax(0,1fr))">${'<span class="is-filled"></span>'.repeat(value)}${'<span></span>'.repeat(segments-value)}</div>`;
  }
  return `<div class="pilot-progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${value}">${'<span></span>'.repeat(3)}</div>`;
}

export function showProgress(bar,value,label,min=0) {
  bar.setAttribute('aria-label',label);
  bar.setAttribute('aria-valuemin',min);
  bar.setAttribute('aria-valuenow',value);
  [...bar.children].forEach((segment,index)=>segment.classList.toggle('is-filled',index<value));
}
