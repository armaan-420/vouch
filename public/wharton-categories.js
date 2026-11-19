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
