import {namedPublic} from './contributor-leaderboard.mjs';
import {productKey} from './account-records.mjs';

export function publicItemSummaries(accounts,ids,viewerKey) {
  const summaries=Object.fromEntries(ids.map(id=>[id,{total:0,people:[]}]));
  for(const [key,account] of Object.entries(accounts)){
    if(!namedPublic(account)||!account.displayName?.trim())continue;
    for(const id of ids){
      const opinion=account.opinions?.[productKey(id)];
      if(opinion?.verdict!=='yes'||opinion.visibility!=='public')continue;
      const summary=summaries[id];
      summary.total++;
      const person={handle:account.handle,displayName:account.displayName,verdict:'yes',updatedAt:opinion.updatedAt,photo:account.photo?'/api/account/photos/'+account.photo:null,whartonEarlyTester:!!account.whartonEarlyTester};
      if(key===viewerKey){
        summary.people.unshift({...person,isYou:true});
        summary.people.length=Math.min(4,summary.people.length);
      }else if(summary.people.length<4)summary.people.push(person);
    }
  }
  return summaries;
}
