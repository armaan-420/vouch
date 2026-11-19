export const whartonCategories = [
  { key:'water-bottles', shortLabel:'water bottles', name:'Water bottles', singular:'water bottle', match:/water bottle/i, subtitle:'Your everyday carry' },
  { key:'lip-balm', shortLabel:'lip balm', name:'Lip balm', singular:'lip balm', match:/lip balm/i, subtitle:'Your everyday lip care' },
  { key:'carry-on', shortLabel:'carry-ons', name:'Carry-on luggage', singular:'carry-on', match:/carry[ -]?on/i, subtitle:'Your go-to travel companion' }
];

export const extraCategories=experiments=>experiments.filter(e=>!whartonCategories.some(group=>group.match.test(e.category)));

export const unlockKey=handle=>'vouch-categories-unlocked:'+handle;
export function categoriesUnlocked(profile) {
  if(profile?.categoriesUnlockedAt)return true;
  try{return !!profile?.handle&&!!localStorage.getItem(unlockKey(profile.handle));}
  catch{return false;}
}

export function categoryHref(id,status,wharton=false) {
  const query={new:'start=1',partial:'start=1&resume=1',done:'board=1'}[status];
  return '/'+encodeURIComponent(id)+'?'+query+(wharton?'&wharton=1':'');
}

export function whartonChoices(experiments) {
  return whartonCategories.map(group=>({...group,experiment:experiments.find(e=>group.match.test(e.category))}));
}

export const gateCategory=groups=>groups.find(group=>group.experiment);

export function unlockableCategories(available) {
  const gate=gateCategory(whartonChoices(available));
  return available.filter(category=>category.id!==gate?.experiment.id);
}

export const earnedUnlock=(groups,states)=>groups.some(group=>group.experiment&&states[group.experiment.id]?.status==='done');

export function pilotLockIcon({open=false,size=18}={}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="${open?'M8 11V7a4 4 0 0 1 7.5-2':'M8 11V7a4 4 0 0 1 8 0v4'}"/></svg>`;
}

export async function participation(categories) {
  const chunks=[];
  for(let i=0;i<categories.length;i+=24)chunks.push(categories.slice(i,i+24));
  const results=await Promise.all(chunks.map(async chunk=>{
    const params=new URLSearchParams(chunk.map(category=>['id',category.id]));
    const response=await fetch('/api/category-participation?'+params,{credentials:'same-origin'});
    if(!response.ok)throw Error('Couldn’t load your progress.');
    const data=(await response.json()).categories;
    if(!chunk.every(category=>['new','partial','done'].includes(data?.[category.id]?.status)))throw Error('Couldn’t load your progress.');
    return data;
  }));
  return Object.assign({},...results);
}
