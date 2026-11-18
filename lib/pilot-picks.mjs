import {namedPublic,publicVouches} from './contributor-leaderboard.mjs';

export function pilotPicks(account,groups) {
  if(!account||!namedPublic(account)||!account.displayName?.trim())return [];
  const opinions=publicVouches(account).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  return groups.flatMap(group=>{
    const e=group.experiment;
    if(!e)return [];
    const item=opinions.find(opinion=>opinion.experimentId===e.id||e.products.some(p=>opinion.productId===(p.skuId||p.onBoardId||p.id)));
    return item?[{experiment:e,group,item}]:[];
  });
}
