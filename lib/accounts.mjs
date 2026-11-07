import {publicExperiment} from './experiment-management.mjs';
import {identity} from './catalog/normalize.mjs';
import {cleanProfilePhoto} from './profile-photo.mjs';
import {readJson} from './request-json.mjs';
import {DEFAULT_PRODUCTS} from './products.mjs';
import {community,fresh,voteScore} from './vouch-api.mjs';

const initial=()=>({version:1,accounts:{},claims:{},browserOwners:{},tickets:{},products:{}});
const initialExperiments=()=>({experiments:{sunscreen:{id:'sunscreen',title:'The Wharton Sunscreen Edit',category:'Sunscreen',products:DEFAULT_PRODUCTS}},skus:{}});
const own=(object,key)=>Object.hasOwn(object||{},key);
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'}});
const opinionsValues=new Set(['yes','no','brand','skip']);
const visibilityValues=new Set(['private','public']);
const sourceKey=(experimentId,visitorId,productId)=>JSON.stringify([experimentId,visitorId,productId]);
const productKey=id=>'p:'+id;
const visitor=request=>{const cookies=Object.fromEntries((request.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')));return /^[a-f0-9-]{36}$/.test(cookies.vouch_visitor||'')?cookies.vouch_visitor:null};
const fingerprint=value=>JSON.stringify(value);
const canonicalId=product=>product.skuId||product.onBoardId||product.id;
const safeProduct=product=>product.provider?{...identity(product),id:canonicalId(product)}:({id:canonicalId(product),name:product.name,brand:product.brand||'',image:product.image||null,url:product.url||null,category:product.category||'Products'});
const counts=opinions=>({yes:opinions.filter(x=>x.verdict==='yes').length,no:opinions.filter(x=>x.verdict==='no').length,brand:opinions.filter(x=>x.verdict==='brand').length});
function displayName(value){if(typeof value!=='string'||value.trim().length<1||value.trim().length>60)throw fail('Enter a display name of 1–60 characters.');return value.trim()}
function visibility(value){if(!visibilityValues.has(value))throw fail('Choose private or public visibility.');return value}
async function subjectKey(identity){const subject=identity?.subject||identity?.id;if(typeof subject!=='string'||!subject)return null;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subject));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function bio(value){if(typeof value!=='string'||value.trim().length>160)throw fail('Keep your bio to 160 characters.');return value.trim()}
function profileName(value){const name=displayName(value);if(name.length<2)throw fail('Enter a display name of 2–60 characters.');return name}
function view(account,publicOnly=false){
  const firstVouch=new Map();
  for(const row of account.history||[])if(row.verdict==='yes'){
    const at=row.updatedAt||row.recordedAt;
    if(at&&(!firstVouch.has(row.productId)||at<firstVouch.get(row.productId)))firstVouch.set(row.productId,at);
  }
  const opinions=Object.values(account.opinions).filter(x=>x.verdict!=='skip'&&(!publicOnly||(x.visibility==='public'&&x.verdict==='yes'))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  return {handle:account.handle,displayName:account.displayName,visibility:account.visibility,createdAt:account.createdAt,bio:account.bio||'',photo:account.photo?'/api/account/photos/'+account.photo:null,
    opinions:opinions.map(x=>publicOnly?{productId:x.productId,product:x.product,verdict:x.verdict,visibility:x.visibility,updatedAt:x.updatedAt,vouchedAt:firstVouch.get(x.productId)||x.updatedAt,experimentTitle:x.experimentTitle}:({...structuredClone(x),vouchedAt:firstVouch.get(x.productId)||x.updatedAt})),counts:counts(opinions),...(!publicOnly?{milestones:[...account.milestones]}:{})};
}
function ensureAccount(data,key,identity,name){
  if(!own(data.accounts,key)){const now=new Date().toISOString();data.accounts[key]={handle:'v-'+crypto.randomUUID().replaceAll('-','').slice(0,16),displayName:name?displayName(name):identity.displayName?displayName(identity.displayName):'Vouch member',visibility:'private',createdAt:now,opinions:{},history:[],milestones:[]}}
  return data.accounts[key];
}
function upsert(account,item,selectedVisibility,{force=false}={}){
  const key=productKey(item.productId),previous=account.opinions[key];
  if(!force&&previous&&previous.updatedAt>item.updatedAt)return false;
  const next={...item,visibility:selectedVisibility??previous?.visibility??'private'};
  if(previous&&fingerprint(previous)===fingerprint(next))return false;
  account.opinions[key]=next;
  account.history.push({...next,recordedAt:new Date().toISOString()});
  if(next.verdict!=='skip'&&!account.milestones.includes('first-edit'))account.milestones.push('first-edit');
  return true;
}

/** Account records are isolated from the historical experiment documents. This pilot uses
 * one optimistic transaction record; normalize/index before broad public scaling. */
export function createAccountsApi({store,getIdentity=async()=>null,getExperiment,photoStorage}={}){
  let scoped;
  const records=async()=>scoped??=await store.scope('accounts-v1',initial);
  const experiment=async id=>{
    if(getExperiment)return getExperiment(id);
    const registry=await (await store.scope('experiment-registry',initialExperiments)).read();
    if(!own(registry.experiments,id)||!publicExperiment(registry.experiments[id]))throw fail('Experiment not found.',404);
    return {experiment:registry.experiments[id],data:await (id==='sunscreen'?store:await store.scope('experiment:'+id,fresh)).read()};
  };
  const snapshot=async(request,id,browserOverride)=>{
    const browser=browserOverride||visitor(request),{experiment:e,data}=await experiment(id);
    const products=[...e.products,...community(data,browser||'',e.products)];
    const items=[];
    if(browser)for(const p of products){
      const value=(p.communityNominated?data.communityVotes:data.baseVotes)?.[p.id]?.[browser];
      if(!opinionsValues.has(value))continue;
      // A name-only community nomination has no stable identity outside its experiment.
      const id=p.communityNominated?p.skuId:canonicalId(p);if(!id)continue;
      const at=(p.communityNominated?data.communityVoteTimes:data.baseVoteTimes)?.[p.id]?.[browser]||'1970-01-01T00:00:00.000Z';
      items.push({productId:id,product:safeProduct({...p,id,category:e.category}),verdict:value,updatedAt:at,experimentId:e.id,experimentTitle:e.title,sourceProductId:p.id});
    }
    return {browser,experiment:{id:e.id,title:e.title,category:e.category},items};
  };
  const handle=async request=>{
    const url=new URL(request.url),path=url.pathname;
    const accountRoute=['/api/account/me','/api/account/edit','/api/account/claim','/api/account/profile','/api/account/photo'].includes(path);
    const photoRoute=path.startsWith('/api/account/photos/');
    const publicProfile=path.startsWith('/api/profiles/'),productRoute=path.startsWith('/api/products/')&&path!=='/api/products/search';
    if(!accountRoute&&!publicProfile&&!productRoute&&!photoRoute)return null;
    try{
      if(!['GET','POST'].includes(request.method))throw fail('Method not allowed.',405);
      if(request.method==='POST'){
        if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw fail('Request origin not allowed.',403);
        if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw fail('Send JSON data.',415);
      }
      const accountStore=await records(),identity=await getIdentity(request),key=await subjectKey(identity);
      if(photoRoute&&request.method==='GET'){
        const photo=path.slice('/api/account/photos/'.length);
        if(!/^[a-f0-9-]{36}\.png$/.test(photo))throw fail('Photo not found.',404);
        const data=await accountStore.read();
        if(!Object.entries(data.accounts).some(([id,a])=>a.photo===photo&&(id===key||a.visibility==='public')))throw fail('Photo not found.',404);
        const bytes=await photoStorage?.get(photo);if(!bytes)throw fail('Photo not found.',404);
        return new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'}});
      }
      if(path==='/api/account/photo'&&request.method==='POST'){
        if(!key)throw fail('Sign in to edit your photo.',401);
        const before=(await accountStore.read()).accounts[key];if(!before)throw fail('Profile not found.',404);
        const input=await readJson(request,1010000);
        const name=input.displayName===undefined?undefined:profileName(input.displayName),about=input.bio===undefined?undefined:bio(input.bio);
        if(input.visibility!==undefined)visibility(input.visibility);
        if(input.image!==null&&!photoStorage)throw fail('Photo uploads are unavailable. Try again later.',503);
        const bytes=input.image===null?null:cleanProfilePhoto(input.image),photo=bytes?crypto.randomUUID()+'.png':null;
        if(photo)await photoStorage.put(photo,bytes);
        let previous;
        try{
          const result=await accountStore.transaction(data=>{
            if(!own(data.accounts,key))throw fail('Profile not found.',404);
            const account=data.accounts[key];previous=account.photo;account.photo=photo;
            if(name!==undefined)account.displayName=name;if(about!==undefined)account.bio=about;if(input.visibility!==undefined)account.visibility=input.visibility;
            return {profile:view(account)};
          });
          if(previous)try{await photoStorage?.delete(previous)}catch{}
          return json(result);
        }catch(error){if(photo)try{await photoStorage.delete(photo)}catch{}throw error}
      }
      if(path==='/api/account/me'&&request.method==='GET'){
        const data=await accountStore.read();return json({authenticated:!!key,profile:key&&own(data.accounts,key)?view(data.accounts[key]):null});
      }
      if(path==='/api/account/edit'&&request.method==='GET'){
        const id=url.searchParams.get('experiment')||'sunscreen',newBrowser=visitor(request)?null:crypto.randomUUID(),s=await snapshot(request,id,newBrowser),token=crypto.randomUUID()+crypto.randomUUID();
        const response=json(await accountStore.transaction(data=>{
          const now=Date.now();for(const [ticketId,ticket]of Object.entries(data.tickets))if(ticket.expiresAt<now)delete data.tickets[ticketId];
          // Refreshing a preview must not accumulate large duplicate snapshots.
          for(const [ticketId,ticket]of Object.entries(data.tickets))if(!ticket.usedBy&&ticket.visitorId===s.browser&&ticket.experimentId===id)delete data.tickets[ticketId];
          const unused=Object.entries(data.tickets).filter(([,ticket])=>!ticket.usedBy&&ticket.visitorId===s.browser).sort((a,b)=>a[1].expiresAt-b[1].expiresAt);
          for(const [ticketId]of unused.slice(0,Math.max(0,unused.length-4)))delete data.tickets[ticketId];
          const current=key&&own(data.accounts,key)?data.accounts[key]:null;
          const items=s.items.filter(item=>item.verdict!=='skip').map(item=>{
            const owner=data.claims[sourceKey(id,s.browser,item.sourceProductId)];
            const existing=current?.opinions[productKey(item.productId)];
            return {...item,visibility:existing?.visibility||'private',claimable:!owner||owner===key,claimed:!!owner};
          });
          if(s.browser)data.tickets[token]={visitorId:s.browser,experimentId:id,items:s.items,expiresAt:now+30*60*1000};
          return {experiment:s.experiment,opinions:items,counts:counts(items),claimToken:s.browser?token:null,profile:current?view(current):null};
        }));
        if(newBrowser)response.headers.append('Set-Cookie',`vouch_visitor=${newBrowser}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`);
        return response;
      }
      if(path==='/api/account/claim'&&request.method==='POST'){
        if(!key)throw fail('Sign in to save your edit.',401);
        const input=await readJson(request,32768),browser=visitor(request);
        if(typeof input.claimToken!=='string'||!browser||!Array.isArray(input.opinions)||input.opinions.length>100)throw fail('Review your edit again before saving.');
        const selected=input.opinions.map(item=>{if(!item||typeof item.productId!=='string')throw fail('Choose products from your edit.');return {productId:item.productId,...(item.visibility===undefined?{}:{visibility:visibility(item.visibility)})}}).sort((a,b)=>a.productId.localeCompare(b.productId));
        if(new Set(selected.map(x=>x.productId)).size!==selected.length)throw fail('Choose each product only once.');
        if(input.displayName!==undefined)displayName(input.displayName);if(input.visibility!==undefined)visibility(input.visibility);
        const payload=fingerprint({selected,displayName:input.displayName,visibility:input.visibility});
        const old=await accountStore.read(),ticket=old.tickets[input.claimToken];
        if(!ticket||ticket.visitorId!==browser||ticket.expiresAt<Date.now())throw fail('Your edit preview expired. Review it again.',409);
        const live=await snapshot(request,ticket.experimentId);
        // Review covers an exact snapshot. A vote changed in another tab requires a new review.
        if(!ticket.usedBy&&fingerprint(live.items)!==fingerprint(ticket.items))throw fail('Your answers changed. Review your edit again.',409);
        return json(await accountStore.transaction(data=>{
          const t=data.tickets[input.claimToken];
          if(!t||t.visitorId!==browser||t.expiresAt<Date.now())throw fail('Your edit preview expired. Review it again.',409);
          if(t.usedBy){if(t.usedBy!==key||t.payload!==payload)throw fail('This edit was already saved. Review it again.',409);return {profile:view(data.accounts[key]),claimedCount:t.claimedCount}}
          if(own(data.browserOwners,browser)&&data.browserOwners[browser]!==key)throw fail('This browser’s saved edit belongs to another account. Sign out and start a new edit.',409);
          const candidates=new Map(t.items.filter(x=>x.verdict!=='skip').map(x=>[x.productId,x]));
          for(const row of selected){const item=candidates.get(row.productId);if(!item)throw fail('Choose products from your reviewed edit.');const owner=data.claims[sourceKey(item.experimentId,browser,item.sourceProductId)];if(owner&&owner!==key)throw fail('That contribution belongs to another account.',409)}
          const account=ensureAccount(data,key,identity,input.displayName);
          if(input.displayName!==undefined)account.displayName=displayName(input.displayName);
          if(input.visibility!==undefined)account.visibility=input.visibility;
          for(const row of selected){const item=candidates.get(row.productId),{sourceProductId,...opinion}=item;upsert(account,opinion,row.visibility);data.claims[sourceKey(item.experimentId,browser,sourceProductId)]=key;data.products[productKey(item.productId)]=item.product}
          data.browserOwners[browser]=key;
          t.usedBy=key;t.payload=payload;t.claimedCount=selected.length;
          delete t.items;
          return {profile:view(account),claimedCount:selected.length};
        }));
      }
      if(path==='/api/account/profile'&&request.method==='POST'){
        if(!key)throw fail('Sign in to edit your profile.',401);
        const input=await readJson(request,32768);
        if(input.displayName!==undefined)profileName(input.displayName);if(input.bio!==undefined)bio(input.bio);if(input.visibility!==undefined)visibility(input.visibility);
        if(input.opinions!==undefined&&(!Array.isArray(input.opinions)||input.opinions.length>200))throw fail('Choose valid product opinions.');
        return json(await accountStore.transaction(data=>{
          if(!own(data.accounts,key))throw fail('Save your first edit before updating your profile.',404);
          const account=data.accounts[key];
          if(input.bio!==undefined)account.bio=bio(input.bio);
          if(input.displayName!==undefined)account.displayName=displayName(input.displayName);
          if(input.visibility!==undefined)account.visibility=input.visibility;
          const seen=new Set();for(const row of input.opinions||[]){
            if(!row||typeof row.productId!=='string'||seen.has(row.productId))throw fail('Choose each saved product only once.');seen.add(row.productId);
            const previous=account.opinions[productKey(row.productId)];if(!previous)throw fail('Product not in your collection.',404);
            if(row.verdict!==undefined&&!opinionsValues.has(row.verdict))throw fail('Choose a valid opinion.');
            const updated={...previous,verdict:row.verdict??previous.verdict,updatedAt:row.verdict!==undefined&&row.verdict!==previous.verdict?new Date().toISOString():previous.updatedAt};
            upsert(account,updated,row.visibility===undefined?previous.visibility:visibility(row.visibility),{force:true});
          }
          return {profile:view(account)};
        }));
      }
      if(publicProfile&&request.method==='GET'){
        const handle=decodeURIComponent(path.slice('/api/profiles/'.length));
        const data=await accountStore.read(),account=Object.values(data.accounts).find(x=>x.handle===handle&&x.visibility==='public');
        if(!account)throw fail('Profile not found.',404);
        return json({profile:view(account,true)});
      }
      if(productRoute&&request.method==='GET'){
        const id=decodeURIComponent(path.slice('/api/products/'.length));if(!id||id.length>512)throw fail('Product not found.',404);
        const data=await accountStore.read();let product=data.products[productKey(id)];
        if(!product){
          const registry=await (await store.scope('experiment-registry',initialExperiments)).read();
          for(const e of Object.values(registry.experiments).filter(publicExperiment)){
            const found=e.products.find(p=>canonicalId(p)===id);
            if(found){product=safeProduct({...found,category:e.category});break}
          }
          // Qualified community products are public experiment metadata as well.
          if(!product)for(const e of Object.values(registry.experiments).filter(publicExperiment)){
            const state=await (e.id==='sunscreen'?store:await store.scope('experiment:'+e.id,fresh)).read();
            const found=community(state,'',e.products).find(p=>p.skuId===id);
            if(found){product=safeProduct({...found,category:e.category});break}
          }
        }
        if(!product)throw fail('Product not found.',404);
        const contributors=[];
        for(const account of Object.values(data.accounts)){const opinion=account.opinions[productKey(id)];if(account.visibility==='public'&&opinion?.visibility==='public'&&opinion.verdict!=='skip')contributors.push({handle:account.handle,displayName:account.displayName,verdict:opinion.verdict,updatedAt:opinion.updatedAt})}
        contributors.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
        return json({product,contributors,counts:counts(contributors),evidenceNote:'Only public, consenting account opinions appear here. Item vouches, passes and brand trust are distinct. A pass does not establish firsthand use. Account sign-in does not verify product experience. These counts are separate from anonymous experiment scores.'});
      }
      throw fail('Method not allowed.',405);
    }catch(error){return json({error:error.status?error.message:'Could not load or save your profile. Please try again.'},error.status||500)}
  };
  handle.needsFreshVisitor=async request=>{
    const browser=visitor(request);if(!browser)return false;
    const data=await (await records()).read(),owner=data.browserOwners[browser];if(!owner)return false;
    return owner!==await subjectKey(await getIdentity(request));
  };
  handle.syncAccountOpinions=async(request,experimentId,sourceProductId)=>{
    const identity=await getIdentity(request),key=await subjectKey(identity),browser=visitor(request);if(!key||!browser)return {synced:0};
    const accountStore=await records(),before=await accountStore.read();
    if(before.browserOwners[browser]&&before.browserOwners[browser]!==key)return {synced:0,connected:false};
    if(!sourceProductId&&!own(before.accounts,key))return {synced:0,connected:false};
    const s=await snapshot(request,experimentId);
    return accountStore.transaction(data=>{
      if(data.browserOwners[browser]&&data.browserOwners[browser]!==key)return {synced:0,connected:false};
      const eligible=s.items.filter(item=>sourceProductId?item.sourceProductId===sourceProductId:data.claims[sourceKey(experimentId,browser,item.sourceProductId)]===key).filter(item=>!data.claims[sourceKey(experimentId,browser,item.sourceProductId)]||data.claims[sourceKey(experimentId,browser,item.sourceProductId)]===key);
      if(!eligible.length)return {synced:0,connected:false};
      const account=ensureAccount(data,key,identity);let synced=0;
      for(const item of eligible){
        const source=sourceKey(experimentId,browser,item.sourceProductId),owner=data.claims[source];
        // Never sweep unrelated anonymous history into an account on a later vote.
        if(sourceProductId?item.sourceProductId!==sourceProductId:owner!==key)continue;
        if(owner&&owner!==key)continue;
        const {sourceProductId:ignored,...opinion}=item;
        if(upsert(account,opinion,undefined))synced++;
        data.claims[source]=key;data.products[productKey(item.productId)]=item.product;
      }
      data.browserOwners[browser]=key;
      return {synced,connected:true};
    });
  };
  // Scores are current aggregates from the opinion's own experiment, never a
  // profile-wide score or an unrelated experiment with the same product.
  const withScores=async request=>{
    const response=await handle(request);
    if(!response?.ok||!response.headers.get('content-type')?.includes('application/json'))return response;
    const payload=await response.clone().json();
    if(!payload.profile?.opinions)return response;
    const profile=payload.profile;
    let originals;
    if(profile.opinions.some(o=>!o.experimentId)){
      const data=await (await records()).read();
      originals=Object.values(data.accounts).find(a=>a.handle===profile.handle)?.opinions;
    }
    const snapshots=new Map();
    profile.opinions=await Promise.all(profile.opinions.map(async opinion=>{
      const sourceId=opinion.experimentId||originals?.[productKey(opinion.productId)]?.experimentId;
      try{
        if(!sourceId)throw Error('No source experiment');
        if(!snapshots.has(sourceId))snapshots.set(sourceId,experiment(sourceId));
        const {experiment:e,data}=await snapshots.get(sourceId);
        const base=e.products.find(p=>canonicalId(p)===opinion.productId);
        const nominated=base?null:community(data,'',e.products).find(p=>p.skuId===opinion.productId);
        if(!base&&!nominated)throw Error('Product not on source board');
        const score=base?voteScore(data.baseVotes?.[base.id]):nominated.score;
        return {...opinion,score,scoreStatus:score===null?'unrated':'rated'};
      }catch{return {...opinion,score:null,scoreStatus:'unavailable'}}
    }));
    return Response.json(payload,{status:response.status,headers:response.headers});
  };
  withScores.needsFreshVisitor=handle.needsFreshVisitor;
  withScores.syncAccountOpinions=handle.syncAccountOpinions;
  return withScores;
}
