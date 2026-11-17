import {cleanComment} from './opinion-comments.mjs';
import {publicInventory} from './discovery-search.mjs';
import {experimentPath} from './experiment-paths.mjs';
import {matchEdits} from './match-edits.mjs';
import {saveNominations,grouped,NOMINATION_THRESHOLD} from './vouch-api.mjs';
import {publicVouches,contributorBadges,eligibility,whartonLeaderboard} from './contributor-leaderboard.mjs';
import {initialTags,validateAssignment} from './product-tags.mjs';
import {initialTagVotes,productTagView} from './product-tag-votes.mjs';
import {testerIdentity,testerCookie,isWhartonEmail,validEmail} from './tester-identity.mjs';
import {publicExperiment} from './experiment-management.mjs';
import {identity} from './catalog/normalize.mjs';
import {cleanProfilePhoto} from './profile-photo.mjs';
import {readJson} from './request-json.mjs';
import {DEFAULT_PRODUCTS,DEFAULT_PRODUCT_BUY_URLS} from './products.mjs';
import {community,fresh,voteScore} from './vouch-api.mjs';

// Collapse this account's browser selections into one stable voter across devices.
function accountTagVotes(votes,productId,key,browser,accounts){
 if(!key||!accounts.accounts[key]||accounts.accounts[key].disabledAt||accounts.accounts[key].deletedAt)return {votes,voter:browser};
 const account=accounts.accounts[key],voter='account:'+account.handle,visitors={...votes.products[productId]?.visitors};
 const aliases=new Set((account.tagVoterAliases||[]).map(handle=>'account:'+handle));
 const owned=Object.keys(visitors).filter(id=>aliases.has(id)||accounts.browserOwners[id]===key||id===browser&&!accounts.browserOwners[id]);
 const selected=Object.hasOwn(visitors,voter)?visitors[voter]:[...new Set(owned.flatMap(id=>visitors[id]||[]))];
 for(const id of owned)delete visitors[id];
 visitors[voter]=selected;
 return {voter,votes:{...votes,products:{...votes.products,[productId]:{visitors}}}};
}

export const initialAccounts=()=>({version:1,accounts:{},claims:{},browserOwners:{},tickets:{},products:{}});
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
const safeProduct=product=>product.provider?{...identity(product),id:canonicalId(product)}:({id:canonicalId(product),name:product.name,brand:product.brand||'',image:product.photoOverride||product.image||null,images:product.photoOverrides||product.images||[],url:product.url||DEFAULT_PRODUCT_BUY_URLS[canonicalId(product)]||null,category:product.category||'Products'});
const counts=opinions=>({yes:opinions.filter(x=>x.verdict==='yes').length,no:opinions.filter(x=>x.verdict==='no').length,brand:opinions.filter(x=>x.verdict==='brand').length});
function displayName(value){if(typeof value!=='string'||value.trim().length<1||value.trim().length>60)throw fail('Enter a display name of 1–60 characters.');return value.trim()}
function visibility(value){if(!visibilityValues.has(value))throw fail('Choose private or public visibility.');return value}
async function subjectKey(identity){const subject=identity?.subject||identity?.id;if(typeof subject!=='string'||!subject)return null;const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subject));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function bio(value){if(typeof value!=='string'||value.trim().length>160)throw fail('Keep your bio to 160 characters.');return value.trim()}
function profileName(value){const name=displayName(value);if(name.length<2)throw fail('Enter a display name of 2–60 characters.');return name}
function publicPerson(account,opinion){return {handle:account.handle,displayName:account.displayName,verdict:opinion.verdict,updatedAt:opinion.updatedAt,...(opinion.verdict==='yes'&&opinion.comment?{comment:opinion.comment}:{}),photo:account.photo?'/api/account/photos/'+account.photo:null,whartonEarlyTester:!!account.whartonEarlyTester};}
function view(account,publicOnly=false){
  if(account.verificationRequired&&!publicOnly)return {handle:account.handle,displayName:account.displayName,email:account.email,emailVerified:false,browserProfile:true,verificationRequired:true};
  const firstVouch=new Map();
  for(const row of account.history||[])if(row.verdict==='yes'){
    const at=row.updatedAt||row.recordedAt;
    if(at&&(!firstVouch.has(row.productId)||at<firstVouch.get(row.productId)))firstVouch.set(row.productId,at);
  }
  const opinions=(publicOnly?publicVouches(account):Object.values(account.opinions).filter(x=>x.verdict!=='skip')).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  return {handle:account.handle,displayName:account.displayName,visibility:account.visibility,showName:account.showName!==false,whartonEarlyTester:!!account.whartonEarlyTester,badges:contributorBadges(account),...(!publicOnly?{leaderboardOptIn:account.leaderboardOptIn===true}:{}),...(!publicOnly?{browserProfile:!!account.browserProfile,email:account.email||null,emailVerified:!!account.emailVerified,whartonEmailVerified:!!account.emailVerified&&isWhartonEmail(account.email)}:{}),createdAt:account.createdAt,bio:account.bio||'',photo:account.photo?'/api/account/photos/'+account.photo:null,
    opinions:opinions.map(x=>publicOnly?{productId:x.productId,product:x.product,verdict:x.verdict,...(x.verdict==='yes'&&x.comment?{comment:x.comment}:{}),visibility:x.visibility,updatedAt:x.updatedAt,vouchedAt:firstVouch.get(x.productId)||x.updatedAt,experimentTitle:x.experimentTitle}:({...structuredClone(x),vouchedAt:firstVouch.get(x.productId)||x.updatedAt})),counts:counts(opinions),...(!publicOnly?{milestones:[...account.milestones]}:{})};
}
function ensureAccount(data,key,identity,name){
  if(data.accounts[key]?.disabledAt||data.accounts[key]?.deletedAt)throw fail('This account is unavailable.',403);
  if(!own(data.accounts,key)){const now=new Date().toISOString();data.accounts[key]={handle:'v-'+crypto.randomUUID().replaceAll('-','').slice(0,16),displayName:name?displayName(name):identity.displayName?displayName(identity.displayName):'Vouch member',visibility:'private',createdAt:now,opinions:{},history:[],milestones:[]}}
  if(identity?.email){data.accounts[key].email=identity.email;data.accounts[key].emailVerified=true;}
  if(identity?.email)data.accounts[key].whartonEarlyTester=!!identity.whartonEarlyTester;
  return data.accounts[key];
}
function upsert(account,item,selectedVisibility,{force=false}={}){
  const key=productKey(item.productId),previous=account.opinions[key];
  if(!force&&previous&&previous.updatedAt>item.updatedAt)return false;
  const note=!force&&previous?.commentEditedAt&&(!item.commentEditedAt||previous.commentEditedAt>item.commentEditedAt)?{comment:previous.verdict===item.verdict?previous.comment||'':'',commentEditedAt:previous.commentEditedAt}:{};
  const next={...item,...note,...(previous?.visibilityCustomized?{visibilityCustomized:true}:{}),visibility:selectedVisibility??previous?.visibility??'private'};
  if(previous&&fingerprint(previous)===fingerprint(next))return false;
  account.opinions[key]=next;
  account.history.push({...next,recordedAt:new Date().toISOString()});
  if(next.verdict!=='skip'&&!account.milestones.includes('first-edit'))account.milestones.push('first-edit');
  return true;
}

/** Account records are isolated from the historical experiment documents. This pilot uses
 * one optimistic transaction record; normalize/index before broad public scaling. */
export function createAccountsApi({store,getIdentity=async()=>null,getExperiment,photoStorage,search,authorizeAdmin=()=>false}={}){
  let scoped;
  const records=async()=>scoped??=await store.scope('accounts-v1',initialAccounts);
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
      const note=(p.communityNominated?data.communityComments:data.baseComments)?.[p.id]?.[browser];
      items.push({comment:note?.text||'',commentEditedAt:note?.updatedAt||at,productId:id,product:safeProduct({...p,id,category:e.category}),verdict:value,updatedAt:at,experimentId:e.id,experimentTitle:e.title,sourceProductId:p.id});
    }
    return {browser,experiment:{id:e.id,title:e.title,category:e.category},items};
  };
  const handle=async request=>{
    const url=new URL(request.url),path=url.pathname;
    const accountRoute=['/api/admin/comment-remove','/api/account/vouch','/api/account/save-email','/api/account/prepare-verification','/api/account/signup','/api/account/participate','/api/account/me','/api/account/edit','/api/account/claim','/api/account/profile','/api/account/photo'].includes(path);
    const photoRoute=path.startsWith('/api/account/photos/');
    const leaderboardRoute=path==='/api/community-leaderboard',peopleRoute=path==='/api/people-summary';
    const publicProfile=path.startsWith('/api/profiles/'),productRoute=path.startsWith('/api/products/')&&path!=='/api/products/search';
    if(!peopleRoute&&!leaderboardRoute&&!accountRoute&&!publicProfile&&!productRoute&&!photoRoute)return null;
    try{
      if(!['GET','POST'].includes(request.method))throw fail('Method not allowed.',405);
      if(request.method==='POST'){
        if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw fail('Request origin not allowed.',403);
        if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw fail('Send JSON data.',415);
      }
      const accountStore=await records(),identity=await getIdentity(request),key=await subjectKey(identity);
      const pendingAccount=key&&(await accountStore.read()).accounts[key];
      if(pendingAccount?.verificationRequired&&request.method==='POST'&&!['/api/account/save-email','/api/account/prepare-verification'].includes(path))throw fail('Verify your email to open your profile.',403);
      if(path==='/api/admin/comment-remove'){
        if(request.method!=='POST'||!await authorizeAdmin(request))throw fail('Organizer access required.',403);
        const input=await readJson(request);return json(await accountStore.transaction(data=>{
          const account=Object.values(data.accounts).find(a=>a.handle===input.handle),opinion=account?.opinions?.[productKey(input.productId)];
          if(!opinion)throw fail('Opinion not found.',404);
          upsert(account,{...opinion,comment:'',commentEditedAt:new Date().toISOString()},undefined,{force:true});return {removed:true};
        }));
      }
      if(peopleRoute){
        if(request.method!=='GET')throw fail('Method not allowed.',405);
        const ids=[...new Set(url.searchParams.getAll('id'))];
        if(!ids.length||ids.length>100||ids.some(id=>!id||id.length>512))throw fail('Choose up to 100 products.');
        const data=await accountStore.read(),summaries=Object.fromEntries(ids.map(id=>[id,{total:0,people:[]}]));
        // Read accounts once for the entire Board; retain only four people per product.
        for(const [owner,account] of Object.entries(data.accounts)){
          if(account.disabledAt||account.deletedAt||account.visibility!=='public'||account.showName===false||account.verificationRequired)continue;
          for(const id of ids){const opinion=account.opinions?.[productKey(id)];
            if(opinion?.verdict!=='yes'||opinion.visibility!=='public')continue;
            const summary=summaries[id],{comment:ignored,...person}=publicPerson(account,opinion);summary.total++;
            if(owner===key){summary.people.unshift({...person,isYou:true});summary.people.length=Math.min(4,summary.people.length);}
            else if(summary.people.length<4)summary.people.push(person);
          }
        }
        return json({summaries});
      }
      if(leaderboardRoute){
        if(request.method!=='GET')throw fail('Method not allowed.',405);
        if(url.searchParams.has('community')&&url.searchParams.get('community')!=='wharton')throw fail('Community not found.',404);
        const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||25);
        if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>100)throw fail('Choose a valid page.');
        const data=await accountStore.read();
        return json(whartonLeaderboard(data.accounts,{key,offset,limit}));
      }
      if(path==='/api/account/vouch'&&request.method==='POST'){
        if(!key||identity?.guest||pendingAccount?.browserProfile)throw fail('Sign in to vouch.',401);
        const input=await readJson(request,2048);
        if(typeof input.productId!=='string'||input.productId.length>512)throw fail('Choose a product.');
        const registry=await(await store.scope('experiment-registry',initialExperiments)).read();
        const candidates=Object.values(registry.experiments).filter(publicExperiment).flatMap(e=>e.products.map(p=>({...p,category:e.category})));
        const direct=candidates.find(p=>matchesIdentity(p,input.productId));
        const snapshot=direct||await search?.find(input.productId)||(await accountStore.read()).products[productKey(input.productId)];
        const product=candidates.find(p=>snapshot&&matchesIdentity(p,snapshot.id))||snapshot;
        if(!product)throw fail('Product unavailable.',404);
        const saved=await accountStore.transaction(data=>{
          const account=ensureAccount(data,key,identity),id=canonicalId(product),previous=account.opinions[productKey(id)],now=Date.now();
          if(previous?.verdict!=='yes'){
            account.searchVouchTimes=(account.searchVouchTimes||[]).filter(t=>t>now-3600000);
            if(account.searchVouchTimes.length>=30)throw fail('You have reached the hourly limit. Try again later.',429);
            account.searchVouchTimes.push(now);
            const stored=Object.fromEntries(['id','provider','providerId','brand','name','variantLabel','category','gtin','alternateRefs'].filter(k=>product[k]!==undefined).map(k=>[k,product[k]]));stored.id=id;data.products[productKey(id)]=stored;
            upsert(account,{productId:id,product:stored,verdict:'yes',updatedAt:new Date(now).toISOString(),source:'search'},previous?.visibility??(account.namedAttribution?'public':undefined));
          }
          account.searchVisitor??=Object.keys(data.browserOwners||{}).find(v=>data.browserOwners[v]===key)||(visitor(request)&&!data.browserOwners[visitor(request)]?visitor(request):null)||crypto.randomUUID();
          data.browserOwners[account.searchVisitor]=key;
          return {saved:true,profileHref:'/account',visitorId:account.searchVisitor};
        });
        let nomination;
        try{
          const currentRegistry=await(await store.scope('experiment-registry',initialExperiments)).read();
          const edits=matchEdits(product,Object.values(currentRegistry.experiments));
          if(!edits.length)nomination={status:'no_eligible_edit'};
          else if(edits.length>1&&!input.editId)nomination={status:'choose_edit',edits:edits.map(e=>({id:e.id,title:e.title,href:experimentPath(e.id)}))};
          else {
            const e=input.editId?edits.find(e=>e.id===input.editId):edits[0];
            if(!e)nomination={status:'retryable',message:'Choose an available Edit.'};
            else {
              const state= e.id==='sunscreen'?store:await store.scope('experiment:'+e.id,fresh);
              nomination=await state.transaction(d=>{
                const base={editId:e.id,title:e.title,href:experimentPath(e.id),threshold:NOMINATION_THRESHOLD};
                const id=canonicalId(product);
                if([...e.products,...community(d,'',e.products)].some(p=>matchesIdentity(p,id)))return {...base,status:'already_on_edit',remaining:0};
                const nominationKey='catalog:'+id,previous=d.nominations.some(n=>n.visitorId===saved.visitorId&&n.key===nominationKey);
                const entry={key:nominationKey,name:[product.brand,product.name].filter(Boolean).join(' '),product:safeProduct(product)};
                saveNominations(d,saved.visitorId,new Map([[nominationKey,entry]]),{replace:false});
                const group=grouped(d).find(g=>g.key===nominationKey);
                return {...base,status:previous?'already_nominated':'nominated',remaining:Math.max(0,NOMINATION_THRESHOLD-group.nominators)};
              });
            }
          }
        }catch{nomination={status:'retryable'};}
        const response=json({saved:true,profileHref:saved.profileHref,nomination});
        if(visitor(request)!==saved.visitorId)response.headers.append('Set-Cookie','vouch_visitor='+saved.visitorId+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000'+(url.protocol==='https:'?'; Secure':''));
        return response;
      }
      if(path==='/api/account/prepare-verification'&&request.method==='POST'){
        if(!identity?.guest||!pendingAccount?.email||pendingAccount.emailVerified||!(pendingAccount.verificationRequired||pendingAccount.browserProfile))throw fail('Open your saved account in this browser first.',409);
        const input=await readJson(request,2048),name=profileName(input.displayName);
        return json(await accountStore.transaction(data=>{const account=data.accounts[key];account.displayName=name;return {email:account.email};}));
      }
      if(photoRoute&&request.method==='GET'){
        const photo=path.slice('/api/account/photos/'.length);
        if(!/^[a-f0-9-]{36}\.png$/.test(photo))throw fail('Photo not found.',404);
        const data=await accountStore.read();
        if(!Object.entries(data.accounts).some(([id,a])=>!a.disabledAt&&!a.deletedAt&&a.photo===photo&&(id===key||a.visibility==='public'&&a.showName!==false)))throw fail('Photo not found.',404);
        const bytes=await photoStorage?.get(photo);if(!bytes)throw fail('Photo not found.',404);
        return new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'}});
      }
      if(path==='/api/account/photo'&&request.method==='POST'){
        if(!key)throw fail('Sign in to edit your photo.',401);
        const before=(await accountStore.read()).accounts[key];if(!before)throw fail('Profile not found.',404);
        const input=await readJson(request,1010000);
        const name=input.displayName===undefined?undefined:profileName(input.displayName),about=input.bio===undefined?undefined:bio(input.bio);
        if(input.visibility!==undefined)visibility(input.visibility);
        if(input.showName!==undefined&&typeof input.showName!=='boolean')throw fail('Choose whether to show your name.');
        if(input.image!==null&&!photoStorage)throw fail('Photo uploads are unavailable. Try again later.',503);
        const bytes=input.image===null?null:cleanProfilePhoto(input.image),photo=bytes?crypto.randomUUID()+'.png':null;
        if(photo)await photoStorage.put(photo,bytes);
        let previous;
        try{
          const result=await accountStore.transaction(data=>{
            if(!own(data.accounts,key))throw fail('Profile not found.',404);
            const account=data.accounts[key];previous=account.photo;account.photo=photo;
            if(input.showName!==undefined)account.showName=input.showName;
            if(name!==undefined)account.displayName=name;if(about!==undefined)account.bio=about;if(input.visibility!==undefined)account.visibility=input.visibility;
            return {profile:view(account)};
          });
          if(previous)try{await photoStorage?.delete(previous)}catch{}
          return json(result);
        }catch(error){if(photo)try{await photoStorage.delete(photo)}catch{}throw error}
      }
      if(['/api/account/save-email','/api/account/participate','/api/account/signup'].includes(path)&&request.method==='POST'){
        const signup=path==='/api/account/signup',emailOnly=path==='/api/account/save-email';
        const input=await readJson(request,2048),name=emailOnly?'Vouch member':profileName(input.displayName);
        if(emailOnly&&identity&&!identity.guest)throw fail('Your account is already saved.',409);
        if(!validEmail(input.email))throw fail('Enter a valid email address.');
        const s=await snapshot(request,url.searchParams.get('experiment')||'sunscreen');
        if(!s.browser)throw fail(signup?'Open your account preview in this browser first.':'Complete your answers in this browser first.',409);
        const {experiment:e,data:answers}=await experiment(s.experiment.id);
        if(!signup&&(!e.products.length||!e.products.every(p=>opinionsValues.has(answers.baseVotes?.[p.id]?.[s.browser]))))throw fail('Finish answering the products first.',409);
        if(signup){
          const ticket=(await accountStore.read()).tickets[input.claimToken];
          if(!ticket||ticket.visitorId!==s.browser||ticket.experimentId!==s.experiment.id||ticket.expiresAt<Date.now()||fingerprint(ticket.items)!==fingerprint(s.items))throw fail('Your picks changed or this preview expired. Refresh this page before creating your account.',409);
        }
        const token=key?null:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
        const participant=identity||{subject:'tester:'+token,guest:true},participantKey=key||await subjectKey(participant);
        const result=await accountStore.transaction(data=>{
          if(signup){const ticket=data.tickets[input.claimToken];if(!ticket||ticket.visitorId!==s.browser||ticket.expiresAt<Date.now()||ticket.usedBy&&ticket.usedBy!==participantKey)throw fail('Refresh your picks before creating your account.',409);ticket.usedBy=participantKey;}
          if(data.browserOwners[s.browser]&&data.browserOwners[s.browser]!==participantKey)throw fail('This browser’s picks belong to another profile.',409);
          for(const item of s.items){const owner=data.claims[sourceKey(s.experiment.id,s.browser,item.sourceProductId)];if(owner&&owner!==participantKey)throw fail('These picks belong to another profile.',409)}
          const existed=own(data.accounts,participantKey),account=ensureAccount(data,participantKey,participant,name);
          if(!emailOnly||!existed)account.displayName=name;
          if(!identity?.email){account.email=input.email.trim().toLowerCase();account.emailVerified=false;}
          if(!existed){account.visibility='public';account.showName=true;account.namedAttribution=true;account.browserProfile=!!participant.guest;}
          if(emailOnly){account.verificationRequired=true;account.visibility='private';account.showName=false;account.namedAttribution=false;}
          if(!emailOnly&&isWhartonEmail(input.email))account.whartonEarlyTester=true;
          for(const item of s.items){
            const {sourceProductId,...opinion}=item,previous=account.opinions[productKey(item.productId)];
            upsert(account,opinion,previous?.visibility??(!emailOnly&&item.verdict==='yes'?'public':'private'));
            data.claims[sourceKey(s.experiment.id,s.browser,sourceProductId)]=participantKey;
            data.products[productKey(item.productId)]=item.product;
          }
          data.browserOwners[s.browser]=participantKey;
          return {profile:view(account)};
        });
        const response=json(result);if(token)response.headers.append('Set-Cookie',testerCookie(request,token));return response;
      }
      if(path==='/api/account/me'&&request.method==='GET'){
        if(key&&identity.whartonEarlyTester){const before=await accountStore.read();if(before.accounts[key]&&!before.accounts[key].whartonEarlyTester)await accountStore.transaction(data=>{data.accounts[key].whartonEarlyTester=true})}
        const data=await accountStore.read();return json({authenticated:!!key,browserProfile:!!identity?.guest,profile:key&&own(data.accounts,key)?view(data.accounts[key]):null});
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
        if(input.showName!==undefined&&typeof input.showName!=='boolean')throw fail('Choose whether to show your name.');
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
        if(input.leaderboardOptIn!==undefined&&typeof input.leaderboardOptIn!=='boolean')throw fail('Choose whether to join the leaderboard.');
        if(input.showName!==undefined&&typeof input.showName!=='boolean')throw fail('Choose whether to show your name.');
        if(input.opinions!==undefined&&(!Array.isArray(input.opinions)||input.opinions.length>200))throw fail('Choose valid product opinions.');
        return json(await accountStore.transaction(data=>{
          if(!own(data.accounts,key))throw fail('Save your first edit before updating your profile.',404);
          const account=data.accounts[key];
          if(input.showName!==undefined)account.showName=input.showName;
          if(input.bio!==undefined)account.bio=bio(input.bio);
          if(input.displayName!==undefined)account.displayName=displayName(input.displayName);
          if(input.visibility!==undefined)account.visibility=input.visibility;
          const seen=new Set();for(const row of input.opinions||[]){
            if(!row||typeof row.productId!=='string'||seen.has(row.productId))throw fail('Choose each saved product only once.');seen.add(row.productId);
            const previous=account.opinions[productKey(row.productId)];if(!previous)throw fail('Product not in your collection.',404);
            if(row.verdict!==undefined&&!opinionsValues.has(row.verdict))throw fail('Choose a valid opinion.');
            const comment=row.comment===undefined?previous.comment||'':cleanComment(row.comment);
            const updated={...previous,comment:row.verdict&&row.verdict!==previous.verdict?'':comment,commentEditedAt:row.comment!==undefined||row.verdict&&row.verdict!==previous.verdict?new Date().toISOString():previous.commentEditedAt,...(row.visibility!==undefined?{visibilityCustomized:true}:{}),verdict:row.verdict??previous.verdict,updatedAt:row.verdict!==undefined&&row.verdict!==previous.verdict?new Date().toISOString():previous.updatedAt};
            upsert(account,updated,row.visibility===undefined?previous.visibility:visibility(row.visibility),{force:true});
          }
          if(input.leaderboardOptIn===true){const reason=eligibility(account);if(reason)throw fail(reason);}
          if(input.leaderboardOptIn!==undefined)account.leaderboardOptIn=input.leaderboardOptIn;
          return {profile:view(account)};
        }));
      }
      if(publicProfile&&request.method==='GET'){
        const handle=decodeURIComponent(path.slice('/api/profiles/'.length));
        const data=await accountStore.read(),account=Object.values(data.accounts).find(x=>!x.disabledAt&&!x.deletedAt&&x.handle===handle&&x.visibility==='public'&&x.showName!==false);
        if(!account)throw fail('Profile not found.',404);
        return json({profile:view(account,true)});
      }
      if(productRoute){
        let id=decodeURIComponent(path.slice('/api/products/'.length));if(!id||id.length>512)throw fail('Product not found.',404);
        const data=await accountStore.read();let product=data.products[productKey(id)];
        {
          const registry=await (await store.scope('experiment-registry',initialExperiments)).read();
          for(const e of Object.values(registry.experiments).filter(publicExperiment)){
            const found=e.products.find(p=>matchesIdentity(p,id));
            if(found){product=safeProduct({...found,category:e.category});break}
          }
          // Qualified community products are public experiment metadata as well.
          if(!product)for(const e of Object.values(registry.experiments).filter(publicExperiment)){
            const state=await (e.id==='sunscreen'?store:await store.scope('experiment:'+e.id,fresh)).read();
            const found=community(state,'',e.products).find(p=>p.skuId===id);
            if(found){product=safeProduct({...found,category:e.category});break}
          }
        }
        if(!product&&request.method==='GET'&&id.startsWith('c3-'))product=await search?.find(id);
        if(!product)throw fail('Product not found.',404);
        id=canonicalId(product);
        const tagStore=await store.scope('product-tags',initialTags),tagVotes=await store.scope('product-tag-votes',initialTagVotes);
        const taxonomy=await tagStore.read();let browser=visitor(request);
        const tagView=votes=>{const resolved=accountTagVotes(votes,id,key,browser,data);return productTagView({productId:id,category:product.category,taxonomy,votes:resolved.votes,visitor:resolved.voter})};
        if(request.method==='POST'){
          const body=await readJson(request),view=tagView(await tagVotes.read());
          const definitions=Object.fromEntries(view.tags.map(t=>[t.id,t]));
          const tagIds=validateAssignment(body,definitions,taxonomy.products[id]?.category||product.category);
          browser??=crypto.randomUUID();
          const votes=await tagVotes.transaction(d=>{const resolved=accountTagVotes(d,id,key,browser,data);d.products[id]=resolved.votes.products[id]||{visitors:{}};if(resolved.voter?.startsWith('account:')||tagIds.length)d.products[id].visitors[resolved.voter]=tagIds;else delete d.products[id].visitors[resolved.voter];return d});
          const response=json(tagView(votes));
          if(!visitor(request))response.headers.append('Set-Cookie','vouch_visitor='+browser+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000'+(url.protocol==='https:'?'; Secure':''));
          return response;
        }
        const productTags=tagView(await tagVotes.read());
        const contributors=[];
        for(const account of Object.values(data.accounts)){const opinion=account.opinions?.[productKey(id)];if(!account.disabledAt&&!account.deletedAt&&account.visibility==='public'&&opinion?.visibility==='public'&&opinion.verdict!=='skip')contributors.push({...(account.showName===false?{displayName:'Anonymous'}:{...publicPerson(account,opinion)}),verdict:opinion.verdict,updatedAt:opinion.updatedAt})}
        contributors.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
        const inventory=await publicInventory(store),listed=inventory.find(p=>matchesIdentity(p,id));
        if(listed)product={...product,id:listed.id};
        const registry=await(await store.scope('experiment-registry',initialExperiments)).read();
        const eligibleEdits=matchEdits(product,Object.values(registry.experiments)).map(e=>({id:e.id,title:e.title,href:experimentPath(e.id)}));
        return json({product,community:listed?{score:listed.score,voteCounts:listed.voteCounts}:null,eligibleEdits,nominationThreshold:NOMINATION_THRESHOLD,myVouch:!!key&&data.accounts[key]?.opinions?.[productKey(id)]?.verdict==='yes',newToVouch:!listed&&!data.products[productKey(id)],...productTags,contributors,counts:counts(contributors),evidenceNote:'Only public, consenting account opinions appear here. Item vouches, passes and brand trust are distinct. A pass does not establish firsthand use. Account sign-in does not verify product experience. These counts are separate from anonymous experiment scores.'});
      }
      throw fail('Method not allowed.',405);
    }catch(error){return json({error:error.status?error.message:'Could not load or save your profile. Please try again.'},error.status||500)}
  };
  handle.acceptVerifiedIdentity=async(request,identity)=>{
    if(!identity)return;
    const guest=testerIdentity(request),from=guest?await subjectKey(guest):null,to=await subjectKey(identity),db=await records();
    // A matching inbox may recover one new browser profile. Never sweep
    // unverified submissions into an established account just because email matches.
    const candidates=data=>{
      const current=from&&data.accounts[from];
      if(current&&!current.disabledAt&&!current.deletedAt&&(!current.email||!identity.email||current.email===identity.email))return [[from,current]];
      if(data.accounts[to]||!identity.email)return [];
      const pending=Object.entries(data.accounts).filter(([id,a])=>id!==to&&!a.disabledAt&&!a.deletedAt&&a.browserProfile&&a.email===identity.email&&!a.emailVerified);
      return pending.length===1?pending:[];
    };
    const before=await db.read();
    if(!candidates(before).length&&(!before.accounts[to]||before.accounts[to].email===identity.email&&before.accounts[to].emailVerified))return;
    await db.transaction(data=>{
      for(const [from,source]of candidates(data)){
        let target=data.accounts[to];
        const verificationName=source.verificationRequired?source.displayName:null;
        if(!target){
          target=data.accounts[to]=source;target.browserProfile=false;
          // Apply the existing new-member attribution defaults only after inbox proof.
          if(source.verificationRequired){target.visibility='public';target.showName=true;target.namedAttribution=true;for(const opinion of Object.values(target.opinions))if(opinion.verdict==='yes')opinion.visibility='public';}
        }
        else{
          for(const opinion of Object.values(source.opinions))upsert(target,opinion,target.opinions[productKey(opinion.productId)]?.visibility??opinion.visibility);
          if(source.whartonEarlyTester)target.whartonEarlyTester=true;
        }
        target.tagVoterAliases=[...new Set([...(target.tagVoterAliases||[]),...(source.tagVoterAliases||[]),source.handle])].filter(handle=>handle!==target.handle);
        if(verificationName)target.displayName=verificationName;
        target.verificationRequired=false;
        for(const [id,owner]of Object.entries(data.claims))if(owner===from)data.claims[id]=to;
        for(const [id,owner]of Object.entries(data.browserOwners))if(owner===from)data.browserOwners[id]=to;
        for(const ticket of Object.values(data.tickets))if(ticket.usedBy===from)ticket.usedBy=to;
        delete data.accounts[from];
      }
      const target=data.accounts[to];
      if(target){if(identity.email){target.email=identity.email;target.emailVerified=true;}if(identity.email)target.whartonEarlyTester=!!identity.whartonEarlyTester;}
    });
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
        if(upsert(account,opinion,account.namedAttribution&&item.verdict==='yes'&&account.opinions[productKey(item.productId)]?.verdict!=='yes'&&!account.opinions[productKey(item.productId)]?.visibilityCustomized?'public':undefined))synced++;
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
    const accountData=await (await records()).read(),identityKey=await subjectKey(await getIdentity(request));
    const ownerKey=Object.keys(accountData.accounts).find(key=>key===identityKey&&accountData.accounts[key].handle===profile.handle);
    const taxonomy=await (await store.scope('product-tags',initialTags)).read(),tagVotes=await (await store.scope('product-tag-votes',initialTagVotes)).read();
    for(const opinion of profile.opinions){
      const resolved=accountTagVotes(tagVotes,opinion.productId,ownerKey,ownerKey?visitor(request):null,accountData);
      const tagView=productTagView({productId:opinion.productId,category:opinion.product?.category,taxonomy,votes:resolved.votes,visitor:resolved.voter});
      opinion.tags=tagView.tags.filter(t=>ownerKey?tagView.selectedTagIds.includes(t.id):t.count||t.assigned);
    }
    let originals;
    if(profile.opinions.some(o=>!o.experimentId)){
      const data=await (await records()).read();
      originals=Object.values(data.accounts).find(a=>a.handle===profile.handle)?.opinions;
    }
    const snapshots=new Map();
    profile.opinions=await Promise.all(profile.opinions.map(async opinion=>{
      const sourceId=opinion.experimentId||originals?.[productKey(opinion.productId)]?.experimentId;
      try{
        if(!sourceId){if(!snapshots.has('global'))snapshots.set('global',publicInventory(store));const product=(await snapshots.get('global')).find(p=>p.id===opinion.productId);return {...opinion,score:product?.score??null,scoreStatus:product?.score==null?'unrated':'rated'};}
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
  withScores.acceptVerifiedIdentity=handle.acceptVerifiedIdentity;
  withScores.needsFreshVisitor=handle.needsFreshVisitor;
  withScores.syncAccountOpinions=handle.syncAccountOpinions;
  return withScores;
}

function matchesIdentity(p,id){return canonicalId(p)===id||[p,...(p.alternateRefs||[])].some(ref=>ref.providerId&&(ref.provider==='channel3'?'c3-'+ref.providerId:'shop-'+encodeURIComponent(ref.providerId))===id)}
