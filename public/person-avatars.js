(function(){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function shortName(value){const parts=String(value||'').trim().split(/\s+/);return parts.length>1?parts[0]+' '+parts.at(-1)[0]+'.':parts[0]}
 function avatar(person,index=0,{className='item-person',profilePath=handle=>'/profiles/'+encodeURIComponent(handle),popup=false}={}){
  const name=person.displayName||'Anonymous',anonymous=name==='Anonymous',initials=anonymous?'?':name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const classes=className+' person-avatar person-tone-'+index%3+(popup&&anonymous?' person-anonymous':''),label=popup?(anonymous?'Anonymous voucher':name+', vouched for this item'):name+' — vouched for this item';
  const attrs=`class="${classes}" aria-label="${esc(label)}" title="${esc(name)}"`;
  return person.handle&&!anonymous?`<a ${attrs} href="${esc(profilePath(person.handle))}">${esc(initials)}</a>`:`<span ${attrs} role="img">${esc(initials)}</span>`;
 }
 function voucherSummary(contributors,viewerHandle){
  const people=(contributors||[]).filter(person=>person.verdict==='yes').map((person,index)=>({...person,avatarIndex:index}));
  const viewer=viewerHandle&&people.find(person=>person.handle===viewerHandle);
  if(viewer)people.splice(0,people.length,viewer,...people.filter(person=>person!==viewer));
  const lead=viewer||people.find(person=>person.displayName&&person.displayName!=='Anonymous');
  return {people,lead:lead?(viewer?'You':shortName(lead.displayName)):null,others:people.length-1};
 }
 function popupRow(contributors,viewerHandle,productPath){
  const {people,lead,others}=voucherSummary(contributors,viewerHandle);if(!people.length)return '';
  const query=productPath.includes('?')?'?'+productPath.split('?')[1].split('#')[0]:'';
  const text=lead?`<strong>${esc(lead)}</strong>${others?' and '+others+' '+(others===1?'other':'others'):''} vouched`:`${people.length} ${people.length===1?'person':'people'} vouched publicly`;
  return `<div class="vote-vouchers" aria-label="Public item vouchers"><div class="vote-voucher-avatars">${people.slice(0,4).map(person=>avatar(person,person.avatarIndex,{className:'vote-voucher-avatar',popup:true,profilePath:handle=>'/profiles/'+encodeURIComponent(handle)+query})).join('')}</div><p>${text}</p><a class="vote-vouchers-all" href="${esc(productPath.split('#')[0]+'#item-people')}">See all</a></div>`;
 }
 const placeholder=()=>'<div class="vote-vouchers vote-vouchers-loading" role="status" aria-label="Loading public vouchers"><div class="vote-voucher-avatars" aria-hidden="true"><i></i><i></i><i></i></div><i class="vote-voucher-loading-bar" aria-hidden="true"></i></div>';
 window.VouchPeople={avatar,shortName,voucherSummary,popupRow,placeholder};
})();
