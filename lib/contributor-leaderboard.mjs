import {isWhartonEmail} from './tester-identity.mjs';

const WHO_TO_ASK_MAX_CATEGORIES=4;

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

const compareHandles=(a,b)=>a.handle<b.handle?-1:a.handle>b.handle?1:0;
const updatedAt=opinion=>String(opinion.updatedAt||'');
const newestFirst=(a,b)=>b.latest.localeCompare(a.latest);
const countFirst=(a,b)=>b.count-a.count;
const safeImage=value=>typeof value==='string'&&(/^\/(?!\/)/.test(value)||/^https:\/\//.test(value))?value:null;

function personCategories(vouches){
  const categories=new Map();
  for(const opinion of vouches){
    const storedLabel=opinion.product?.category;
    const label=typeof storedLabel==='string'?storedLabel.trim():'';
    const key=label?.toLowerCase();
    if(!key||key==='other'||key==='products')continue;
    const latest=updatedAt(opinion);
    const category=categories.get(key)||{label,latest,count:0,noted:null};
    if(latest>category.latest)Object.assign(category,{label,latest});
    category.count++;
    const note=typeof opinion.comment==='string'?opinion.comment.trim():'';
    if(note&&(!category.noted||latest>category.noted.latest)){
      const {skuId,onBoardId,id,name,brand,image,provider,providerId,photoOverride,photoOverrides}=opinion.product;
      category.noted={
        latest,note,
        product:{id:skuId||onBoardId||id||opinion.productId,name:name||'Product',brand:brand||'',image:safeImage(photoOverride)||safeImage(image),
          ...(provider&&providerId?{provider,providerId,photoOverride,photoOverrides}:{})}
      };
    }
    categories.set(key,category);
  }
  return categories;
}

function askCategories(categories){
  return [...categories.values()]
    .filter(category=>category.people.length>=2&&category.people.some(person=>person.noted))
    .sort(newestFirst).slice(0,WHO_TO_ASK_MAX_CATEGORIES)
    .map(({label,people})=>{
      const ranked=people.sort((a,b)=>countFirst(a,b)||compareHandles(a,b));
      const featured=ranked.filter(person=>person.noted).sort((a,b)=>
        countFirst(a,b)||newestFirst(a.noted,b.noted)||compareHandles(a,b))[0];
      const personView=({handle,displayName,photo,count})=>({handle,displayName,photo,count});
      return {
        label,people:people.length,
        featured:{...personView(featured),note:featured.noted.note,product:featured.noted.product},
        others:ranked.filter(person=>person!==featured).slice(0,3).map(personView)
      };
    });
}

function rankedContributors(accounts){
  const categories=new Map(),boardBadges=new Map();
  const rows=Object.entries(accounts).filter(([,a])=>a.leaderboardOptIn!==false&&!eligibility(a)).map(([id,a])=>{
    const person={handle:a.handle,displayName:a.displayName,photo:a.photo?'/api/account/photos/'+a.photo:null};
    const vouches=publicVouches(a), grouped=personCategories(vouches);
    for(const [categoryKey,{label,latest,count,noted}] of grouped){
      const category=categories.get(categoryKey)||{label,latest,people:[]};
      if(latest>category.latest)Object.assign(category,{label,latest});
      category.people.push({id,...person,count,noted});
      categories.set(categoryKey,category);
    }
    const top=[...grouped.values()].sort((a,b)=>countFirst(a,b)||newestFirst(a,b))[0];
    const topCategory=top?.count>=2?{label:top.label,count:top.count}:null;
    const badges=contributorBadges(a)
      .filter(badge=>badge.id!=='early-tester'&&badge.id!=='public-vouches-10')
      .map(badge=>({...badge,label:badge.id==='wharton-verified'?'Wharton ✅':badge.label.replace(' vouches shared',' vouches')}));
    boardBadges.set(id,badges);
    return {id,...person,count:vouches.length,badges,topCategory};
  }).sort((a,b)=>countFirst(a,b)||compareHandles(a,b));
  for(const [categoryKey,{label,people}] of categories){
    const leaders=people.filter(person=>person.count>5)
      .sort((a,b)=>countFirst(a,b)||compareHandles(a,b)).slice(0,3);
    for(const {id,count} of leaders){
      boardBadges.get(id).push({id:'category-expert-'+categoryKey,label:label+' expert',description:`Among the top three contributors for ${label}, with ${count} public vouches.`});
    }
  }
  let rank=0,previous=null;
  const ranked=rows.map((row,index)=>{if(row.count!==previous)rank=index+1;previous=row.count;return {...row,rank}});
  return {ranked,categories};
}

export function profileAchievements(accounts,key){
  const account=accounts[key];
  if(!account||account.leaderboardOptIn===false||eligibility(account))return [];
  const {ranked}=rankedContributors(accounts);
  const entry=ranked.find(row=>row.id===key);
  const achievements=entry.badges.filter(badge=>badge.id.startsWith('category-expert-'));
  if(entry.rank<=5&&entry.count>0)achievements.push({
    id:'wharton-top-five',label:'Top 5',description:`Currently ranked #${entry.rank} on the Wharton leaderboard.`
  });
  return achievements;
}

export function whartonLeaderboard(accounts,{key=null,offset=0,limit=25}={}){
  const {ranked:contributors,categories}=rankedContributors(accounts);
  const ranked=contributors.map(({id,...entry})=>({...entry,isYou:id===key}));
  const account=key?accounts[key]:null,reason=eligibility(account);
  return {community:'wharton',metric:'Unique public item vouches',total:ranked.length,offset,limit,entries:ranked.slice(offset,offset+limit),top:ranked.slice(0,3),hasMore:offset+limit<ranked.length,whoToAsk:{categories:askCategories(categories)},viewer:{authenticated:!!key,optedIn:!!account&&account.leaderboardOptIn!==false&&!reason,requiresSignup:!!account?.email&&!account.emailVerified&&!!(account.verificationRequired||account.browserProfile),eligible:!reason,reason,entry:ranked.find(r=>r.isYou)||null}};
}
