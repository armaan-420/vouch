export function progressMarkup(value,label) {
  return `<div class="pilot-progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${value}">${'<span></span>'.repeat(3)}</div>`;
}

export function showProgress(bar,value,label,min=0) {
  bar.setAttribute('aria-label',label);
  bar.setAttribute('aria-valuemin',min);
  bar.setAttribute('aria-valuenow',value);
  [...bar.children].forEach((segment,index)=>segment.classList.toggle('is-filled',index<value));
}
