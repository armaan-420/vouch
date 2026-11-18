import {namedPublic} from './contributor-leaderboard.mjs';
import {productKey} from './account-records.mjs';

export function shareableVouch(account,id){
  if(!account||account.browserProfile||!namedPublic(account)||!account.displayName?.trim())return null;
  const opinion=account.opinions?.[productKey(id)];
  return opinion?.verdict==='yes'&&opinion.visibility==='public'?opinion:null;
}

export function vouchDescription({review,score,ratings},name){
  return [review&&'“'+review+'”',score!=null&&'Vouch score '+score.toFixed(1)+' · '+ratings+(ratings===1?' rating':' ratings')].filter(Boolean).join(' · ')||name+' on Vouch';
}
