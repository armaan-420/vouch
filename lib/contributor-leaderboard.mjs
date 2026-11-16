import {isWhartonEmail} from './tester-identity.mjs';

// Use current recommendations, never vote events or the historical vote ledger.
export function publicVouches(account){
  const products=new Map();
  for(const opinion of Object.values(account.opinions||{})){
    const id=opinion.product?.skuId||opinion.product?.onBoardId||opinion.productId;
    if(!id)continue;
    const previous=products.get(id);
    if(!previous||String(opinion.updatedAt||'')>String(previous.updatedAt||''))products.set(id,opinion);
  }
  return [...products.values()].filter(o=>o.verdict==='yes'&&o.visibility==='public');
}
export const verifiedWharton=account=>!!account.emailVerified&&isWhartonEmail(account.email)&&!account.browserProfile&&!account.verificationRequired;
export const namedPublic=account=>account.visibility==='public'&&account.showName!==false&&!account.disabledAt&&!account.deletedAt&&!account.verificationRequired;
export function contributorBadges(account){
  if(!namedPublic(account))return [];
  const count=publicVouches(account).length,badges=[];
  if(verifiedWharton(account))badges.push({id:'wharton-verified',label:'Wharton verified',description:'Verified a wharton.upenn.edu email. Product experience is self-reported.'});
  if(account.whartonEarlyTester)badges.push({id:'early-tester',label:'Wharton early tester',description:'Historical early-tester recognition; does not verify affiliation or expertise.'});
  const milestone=[50,25,10].find(n=>count>=n);
  if(milestone)badges.push({id:'public-vouches-'+milestone,label:milestone+' vouches shared',description:'Currently shares at least '+milestone+' unique public item recommendations.'});
  return badges;
}
export function eligibility(account){
  if(!account)return 'Create an account to join the leaderboard.';
  if(account.disabledAt||account.deletedAt)return 'This account is unavailable.';
  if(!verifiedWharton(account))return 'Verify a wharton.upenn.edu email to join the Wharton leaderboard.';
  if(!namedPublic(account))return 'Make your profile public and show your name to join.';
  return null;
}
export function whartonLeaderboard(accounts,{key=null,offset=0,limit=25}={}){
  const rows=Object.entries(accounts).filter(([,a])=>a.leaderboardOptIn!==false&&!eligibility(a)).map(([id,a])=>({id,handle:a.handle,displayName:a.displayName,photo:a.photo?'/api/account/photos/'+a.photo:null,count:publicVouches(a).length,badges:contributorBadges(a)})).sort((a,b)=>b.count-a.count||(a.handle<b.handle?-1:a.handle>b.handle?1:0));
  let rank=0,previous=null;
  const ranked=rows.map((row,index)=>{if(row.count!==previous)rank=index+1;previous=row.count;const {id,...entry}=row;return {...entry,rank,isYou:id===key}});
  const account=key?accounts[key]:null,reason=eligibility(account);
  return {community:'wharton',metric:'Unique public item vouches',total:ranked.length,offset,limit,entries:ranked.slice(offset,offset+limit),hasMore:offset+limit<ranked.length,viewer:{authenticated:!!key,optedIn:!!account&&account.leaderboardOptIn!==false&&!reason,requiresSignup:!!account?.email&&!account.emailVerified&&!!(account.verificationRequired||account.browserProfile),eligible:!reason,reason,entry:ranked.find(r=>r.isYou)||null}};
}
