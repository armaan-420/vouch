import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createFileStore} from '../lib/file-store.mjs';
import {createSuggestions} from '../lib/auto-experiments/api.mjs';
import {categoryKey,blocked,fakeResearch,validateResearch,createResearch,researchCoverage,validateEvidence} from '../lib/auto-experiments/research.mjs';
import {chooseMatch,matchState,choosePhotoMatch,findProductPhoto} from '../lib/auto-experiments/matching.mjs';
import {createApplicationApi} from '../lib/application-api.mjs';
import {initialRegistry} from '../lib/experiment-api.mjs';
import {experimentPage} from '../lib/experiment-pages.mjs';
const req=(route,payload,admin=true,cookie='')=>new Request('http://localhost'+route,{method:payload?'POST':'GET',headers:{...(payload?{'Content-Type':'application/json'}:{}),...(admin?{'x-admin':'yes'}:{}),cookie},...(payload?{body:JSON.stringify(payload)}:{})});
async function setup(t,options={}){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vouch-auto-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const store=await createFileStore(dir),search={search:async()=>({products:[]}),find:async()=>null,...options.search},authorizeAdmin=r=>r.headers.get('x-admin')==='yes';const auto=createSuggestions({store,search,authorizeAdmin,development:true,...options}),api=createApplicationApi({store,search,authorizeAdmin,autoOptions:{development:true,...options}});const submit=(category,cookie='',note)=>auto.handle(req('/api/suggestions',{category,...(note?{note}:{})},false,cookie));const listing=async()=> (await(await auto.handle(req('/api/admin/suggestions'))).json()).jobs;const build=async()=>{for(let i=0;i<12;i++)await auto.advance();return (await listing())[0];};return {store,auto,api,submit,listing,build};}
async function attachPhotos(s,j){return s.auto.handle(req('/api/admin/suggestions/edit',{key:j.key,id:j.draft.id,title:j.draft.title,category:j.draft.category,productIds:[],customProducts:j.draft.products.map(p=>({...p,image:'https://example.com/photo.jpg'}))}));}
test('category normalization folds accents punctuation plurals and spacing',()=>{assert.equal(categoryKey(' Wáter bottles!! '),categoryKey('water bottle'));assert.equal(categoryKey('Running SHOES'),categoryKey('running shoe'));assert.equal(blocked('vapes'),true);});
test('schema rejects short lineups duplicate brands and unsafe source URLs',()=>{const good=fakeResearch('running shoes');assert.equal(good.picks.length,10);for(const change of [r=>r.picks.pop(),r=>r.picks[1].brand=r.picks[0].brand,r=>r.picks[0].sourceUrls=['javascript:alert(1)']]){const r=structuredClone(good);change(r);assert.throws(()=>validateResearch(r));}assert.throws(()=>validateResearch({}));});
test('matching requires exact normalized brand and meaningful model overlap and prefers photos',()=>{const pick={brand:'Nike',productName:'Pegasus 41'};const a={brand:'NIKE',name:'Pegasus 41',id:'a'},b={...a,id:'b',image:'https://example.com/p.png'};assert.equal(chooseMatch(pick,[{...b,brand:'Other'},a,b]).id,'b');assert.equal(chooseMatch(pick,[{brand:'Nike',name:'Air Max'}]),null);assert.equal(matchState(Array.from({length:10},(_,i)=>({product:{brand:'brand'+i},hasPhoto:i<10}))), 'ready');assert.equal(matchState(Array.from({length:10},(_,i)=>({product:{brand:'brand'+i},hasPhoto:i<7}))), 'needs_attention');assert.equal(matchState([{product:{brand:'a'}}]),'rejected');});
test('repeat browser updates note and distinct browsers add support without another job',async t=>{const s=await setup(t),r=await s.submit('running shoes'),cookie=r.headers.get('set-cookie').split(';')[0];await s.submit('Running shoe',cookie,'A second note');await s.submit('running shoes','vouch_visitor='+crypto.randomUUID());const [j]=await s.listing();assert.equal((await s.listing()).length,1);assert.equal(j.support.count,2);assert.equal(j.support.entries[cookie.split('=')[1]].note,'A second note');});
test('rolling rate limit allows five new categories and repeat updates',async t=>{const s=await setup(t);const first=await s.submit('category zero'),cookie=first.headers.get('set-cookie').split(';')[0];for(let i=1;i<5;i++)assert.equal((await s.submit('category '+i,cookie)).status,202);assert.equal((await s.submit('category six',cookie)).status,429);assert.equal((await s.submit('category zero',cookie,'updated')).status,202);});
test('existing compact experiment ID and plural category merge without jobs',async t=>{const s=await setup(t),reg=await s.store.scope('experiment-registry',initialRegistry);await reg.transaction(d=>{d.experiments.waterbottle={id:'waterbottle',category:'Water bottles',title:'Bottles',products:[]};});const r=await(await s.submit('water bottles')).json();assert.equal(r.existingEdit.url,'/waterbottle');assert.equal((await s.listing()).length,0);});
test('obvious abuse is rejected before research costs anything',async t=>{let calls=0;const s=await setup(t,{research:{fake:true,start:async()=>{calls++;}}});await s.submit('guns');await s.auto.advance();assert.equal((await s.listing())[0].state,'rejected');assert.equal(calls,0);});
test('fake build creates full private draft and blocks anonymous page read votes nominations profiles',async t=>{const s=await setup(t);await s.submit('running shoes');const j=await s.build();assert.equal(j.state,'needs_attention');assert.equal(j.draft.products.length,10);assert.equal(j.draft.id,'running-shoes');assert.equal(j.draft.status,'draft');assert.equal(j.draft.includeInOverall,false);
 for(const route of ['/api/experiment','/api/board','/api/community','/api/products/search?q=Nike'])assert.equal((await s.api(req(route+(route.includes('?')?'&':'?')+'experiment=running-shoes',null,false))).status,404);
 for(const [route,body]of [['/api/events',{type:'answer',productId:j.draft.products[0].id,value:'yes'}],['/api/nominations',{name:'Nike'}],['/api/community/vote',{productId:'unknown',value:'yes'}]])assert.equal((await s.api(req(route+'?experiment=running-shoes&preview=1',body,true))).status,404);
 assert.equal((await s.api(req('/api/products/'+j.draft.products[0].id,null,false))).status,404);
 assert.equal((await s.api(req('/api/account/claim-preview?experiment=running-shoes',null,false))).status,404);
 const page=await experimentPage(req('/running-shoes',null,false),{home:'home',experiment:'<main id="app">',api:s.api});assert.equal(page.status,404);
 const preview=await experimentPage(req('/running-shoes?preview=1'),{home:'home',experiment:'<main id="app">',api:s.api});assert.equal(preview.status,200);assert.match(await preview.text(),/Organizer preview/);
 assert.equal((await s.api(req('/api/experiment?experiment=running-shoes&preview=1',null,false))).status,404);
 const reg=await s.store.scope('experiment-registry',initialRegistry);await reg.transaction(d=>d.experiments['running-shoes'].includeInOverall=true);assert.equal((await(await s.api(req('/api/overall',null,false))).json()).includedExperiments,0);
});
test('organizer edits title path and lineup then approves and anonymous vote succeeds',async t=>{const s=await setup(t);await s.submit('running shoes');const j=await s.build(),products=j.draft.products.slice(0,9);products[8]={...products[8],name:'Local test replacement'};for(const p of products)p.image='https://example.com/photo.jpg';const edited=await s.auto.handle(req('/api/admin/suggestions/edit',{key:j.key,id:'shoe-edit',title:'My shoe Edit',category:'Running Shoes',productIds:[],customProducts:products}));assert.equal(edited.status,200);assert.equal((await s.api(req('/api/experiment?experiment=running-shoes',null,false))).status,404);assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,200);const e=await(await s.api(req('/api/experiment?experiment=shoe-edit',null,false))).json();assert.equal(e.experiment.products.length,9);assert.equal(e.experiment.products[8].name,'Local test replacement');assert.equal((await s.api(req('/api/events?experiment=shoe-edit',{type:'answer',productId:products[0].id,value:'yes'},false))).status,200);});
test('dismiss removes draft but retains organizer research history',async t=>{const s=await setup(t);await s.submit('backpacks');const j=await s.build();assert.equal((await s.auto.handle(req('/api/admin/suggestions/dismiss',{key:j.key}))).status,200);const [done]=await s.listing();assert.equal(done.draft,null);assert.equal(done.state,'dismissed');assert.equal(done.research.picks.length,10);});
test('rejected jobs can be dismissed without a draft',async t=>{const s=await setup(t);await s.submit('guns');const [j]=await s.listing();assert.equal((await s.auto.handle(req('/api/admin/suggestions/dismiss',{key:j.key}))).status,200);});
test('automatic off saves suggestions and manual build advances',async t=>{const s=await setup(t,{env:{EXPERIMENT_AUTO_BUILD:'off'}});await s.submit('backpacks');assert.equal((await s.auto.advance()).advanced,false);const [j]=await s.listing();await s.auto.handle(req('/api/admin/suggestions/build',{key:j.key}));assert.equal((await s.build()).state,'needs_attention');});
test('runner lease prevents concurrent research calls and releases after a step',async t=>{let release,calls=0;const research={fake:true,start:async()=>{calls++;await new Promise(r=>release=r);return {result:fakeResearch('backpacks')};}};const s=await setup(t,{research});await s.submit('backpacks');const first=s.auto.advance();while(!release)await new Promise(r=>setTimeout(r,1));assert.equal((await s.auto.advance()).advanced,false);release();await first;assert.equal(calls,1);assert.equal((await s.listing())[0].lockedUntil,0);});
test('retry backoff fails after three provider errors without exposing error contents',async t=>{let time=Date.now();const s=await setup(t,{now:()=>time,research:{fake:true,start:async()=>{throw Error('sk-secret-private-detail');}}});await s.submit('backpacks');for(let i=0;i<3;i++){await s.auto.advance();time+=120000;}const [j]=await s.listing();assert.equal(j.state,'failed');assert.doesNotMatch(JSON.stringify(j),/sk-secret/);});
test('daily budget holds queue and resets at Eastern midnight',async t=>{let time=Date.parse('2026-11-06T04:59:00Z');const s=await setup(t,{now:()=>time,env:{EXPERIMENT_RESEARCH_DAILY_BUDGET:'1'}});await s.submit('running shoes');await s.submit('backpacks');await s.auto.advance();for(let i=0;i<11;i++)await s.auto.advance();assert.equal((await s.auto.advance()).advanced,false);time=Date.parse('2026-11-06T05:01:00Z');assert.equal((await s.auto.advance()).advanced,true);});
test('canonical AI category merges aliases into a single draft',async t=>{const research={fake:true,start:async()=>({result:fakeResearch('running shoes')})};const s=await setup(t,{research});await s.submit('jogging shoes');await s.submit('trainers');await Promise.all([s.auto.advance(),s.auto.advance()]);for(let i=0;i<24;i++)await s.auto.advance();const rows=await s.listing();assert.equal(rows.filter(j=>j.draft).length,1);assert.equal(rows.filter(j=>j.state==='dismissed').length,1);});
test('slug collisions append suffix and draft does not consume live experiment limit',async t=>{const s=await setup(t),reg=await s.store.scope('experiment-registry',initialRegistry);await reg.transaction(d=>{d.experiments['shoe-edit']={id:'shoe-edit',category:'Other',title:'Other',products:[]};});await s.submit('jogging shoes');const research={fake:true,start:async()=>({result:{...fakeResearch('running shoes'),slug:'shoe-edit'}})};const auto=createSuggestions({store:s.store,search:{search:async()=>({products:[]})},research,development:true});for(let i=0;i<12;i++)await auto.advance();const [j]=await s.listing();assert.equal(j.draft.id,'shoe-edit-2');});
test('notification is claimed once per job and contains no visitor note',async t=>{const messages=[];const s=await setup(t,{env:{SUGGESTION_NOTIFY_EMAIL:'test@example.com'},notify:async m=>messages.push(m)});await s.submit('backpacks','','private visitor note');await s.build();for(let i=0;i<3;i++)await s.auto.advance();assert.equal(messages.length,1);assert.doesNotMatch(JSON.stringify(messages),/private visitor/);});
test('public mutation checks JSON origin and organizer authorization',async t=>{const s=await setup(t);assert.equal((await s.auto.handle(new Request('http://localhost/api/suggestions',{method:'POST',headers:{origin:'https://evil.example','Content-Type':'application/json'},body:'{"category":"backpacks"}'}))).status,403);assert.equal((await s.auto.handle(new Request('http://localhost/api/suggestions',{method:'POST',body:'{"category":"backpacks"}'}))).status,415);for(const action of ['run','build','retry','approve','edit','dismiss'])assert.equal((await s.auto.handle(req('/api/admin/suggestions/'+action,{},false))).status,401);assert.equal((await s.auto.handle(req('/api/admin/suggestions',null,false))).status,401);});
test('OpenAI adapter starts background research, polls, validates and sends category alone',async()=>{const requests=[];const provider=createResearch({env:{OPENAI_API_KEY:'test-key'},fetcher:async(url,options)=>{requests.push({url,options});return Response.json(requests.length===1?{id:'resp_123',status:'queued'}:{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(fakeResearch('backpacks'))}]}],usage:{total_tokens:123}});}});assert.equal((await provider.start('Backpacks','job-key')).pending,true);const result=await provider.poll('resp_123');assert.equal(result.usage.total_tokens,123);const body=JSON.parse(requests[0].options.body);assert.equal(body.input,'backpack');assert.equal(body.background,true);assert.equal(body.tools[0].type,'web_search');assert.equal(body.text.format.strict,true);});
test('prototype property category names are stored safely as ordinary suggestions',async t=>{const s=await setup(t);assert.equal((await s.submit('constructor')).status,202);assert.equal((await s.listing()).length,1);assert.equal((await s.listing())[0].support.count,1);});
test('research retry replaces the existing draft without duplicate or self-merge',async t=>{const s=await setup(t);await s.submit('backpacks');const j=await s.build();await s.auto.handle(req('/api/admin/suggestions/retry',{key:j.key}));const next=await s.build();assert.equal(next.state,'needs_attention');assert.equal(next.draftId,j.draftId);assert.equal(next.attempts,2);const registry=await(await s.store.scope('experiment-registry',initialRegistry)).read();assert.equal(Object.values(registry.experiments).filter(e=>e.status==='draft').length,1);});
test('draft creation does not consume live capacity and approval enforces fifty live edits',async t=>{const s=await setup(t),reg=await s.store.scope('experiment-registry',initialRegistry);await reg.transaction(d=>{for(let i=1;i<50;i++)d.experiments['edit-'+i]={id:'edit-'+i,category:'Category '+i,title:'Edit '+i,products:[]};});await s.submit('backpacks');const j=await s.build();assert.equal(j.draft.status,'draft');await attachPhotos(s,j);assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,400);});
test('expired lease resumes a job safely and keeps a single draft',async t=>{let time=Date.now();const s=await setup(t,{now:()=>time});await s.submit('backpacks');const [j]=await s.listing();const jobs=await s.store.scope('suggestion-jobs',()=>({jobs:{},budget:{}}));await jobs.transaction(d=>{d.jobs[j.key].lockedUntil=time+60000;d.jobs[j.key].lease='expired-runner';});assert.equal((await s.auto.advance()).advanced,false);time+=61000;assert.equal((await s.build()).state,'needs_attention');});
test('exhausted budget does not stall an in-progress job behind another queued job',async t=>{const s=await setup(t,{env:{EXPERIMENT_RESEARCH_DAILY_BUDGET:'1'}});await s.submit('running shoes');await s.submit('backpacks');const jobs=await s.store.scope('suggestion-jobs',()=>({jobs:{},budget:{}}));await jobs.transaction(d=>{const keys=Object.keys(d.jobs);d.jobs=Object.fromEntries(keys.reverse().map(k=>[k,d.jobs[k]]));});await s.auto.advance();const [j]=await s.listing();for(let i=0;i<11;i++)await s.auto.advance();assert.equal((await s.listing()).filter(j=>j.draft).length,1);});
test('reject action removes a draft and retains its research',async t=>{const s=await setup(t);await s.submit('backpacks');const j=await s.build();assert.equal((await s.auto.handle(req('/api/admin/suggestions/reject',{key:j.key}))).status,200);const [next]=await s.listing();assert.equal(next.state,'rejected');assert.equal(next.draft,null);assert.equal(next.research.picks.length,10);});
test('delete is recoverable and restores the exact draft without exposing recovery data',async t=>{const s=await setup(t);await s.submit('backpacks');const j=await s.build();assert.equal((await s.auto.handle(req('/api/admin/suggestions/delete',{key:j.key}))).status,200);const [deleted]=await s.listing();assert.equal(deleted.state,'deleted');assert.equal(deleted.draft,null);assert.equal(deleted.deletedDraft,undefined);assert.equal((await s.auto.advance()).advanced,false);assert.equal((await s.auto.handle(req('/api/admin/suggestions/restore',{key:j.key}))).status,200);const [restored]=await s.listing();assert.equal(restored.draft.id,j.draft.id);assert.equal(restored.state,j.state);assert.deepEqual(restored.draft.products,j.draft.products);});
test('deleting a live suggestion preserves its live Edit and votes; reject and refresh cannot overwrite it',async t=>{const s=await setup(t);await s.submit('backpacks');const j=await s.build();await attachPhotos(s,j);await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}));for(const action of ['reject','retry'])assert.equal((await s.auto.handle(req('/api/admin/suggestions/'+action,{key:j.key}))).status,409);assert.equal((await s.auto.handle(req('/api/admin/suggestions/delete',{key:j.key}))).status,200);assert.equal((await s.api(req('/api/experiment?experiment='+j.draftId,null,false))).status,200);await s.auto.handle(req('/api/admin/suggestions/restore',{key:j.key}));assert.equal((await s.listing())[0].state,'approved');});
test('new suggestion table actions enforce organizer authorization and origin checks',async t=>{const s=await setup(t);for(const action of ['reject','delete','restore'])assert.equal((await s.auto.handle(req('/api/admin/suggestions/'+action,{key:'unknown'},false))).status,401);});
test('refresh retains previous research for history and queues a new attempt',async t=>{const s=await setup(t);await s.submit('backpacks');const j=await s.build();await s.auto.handle(req('/api/admin/suggestions/retry',{key:j.key}));const [next]=await s.listing();assert.equal(next.state,'queued');assert.equal(next.researchHistory.length,1);assert.equal(next.researchHistory[0].research.picks.length,10);});
test('a previous draft cannot be approved while its refreshed research is queued',async t=>{const s=await setup(t);await s.submit('backpacks');const j=await s.build();await s.auto.handle(req('/api/admin/suggestions/retry',{key:j.key}));assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,409);assert.equal((await s.listing())[0].draft.status,'draft');});

test('production without a research key preserves queued suggestions and does not consume budget',async t=>{
 const s=await setup(t,{development:false,env:{EXPERIMENT_AUTO_BUILD:'on'}});
 await s.submit('running shoes');
 assert.deepEqual(await s.auto.advance(),{advanced:false,reason:'research_not_configured'});
 const [job]=await s.listing();assert.equal(job.state,'queued');assert.equal(job.attempts,0);
 const scope=await s.store.scope('suggestion-jobs',()=>({jobs:{},budget:{}}));assert.deepEqual((await scope.read()).budget,{});
 const listing=await(await s.auto.handle(req('/api/admin/suggestions'))).json();assert.equal(listing.researchConfigured,false);
});

test('every product needs a photo; research and photos remain private',async t=>{
 const s=await setup(t);await s.submit('backpacks');const j=await s.build();
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,409);
 const products=j.draft.products.map((p,i)=>({...p,image:i<9?'https://example.com/photo.jpg':null}));
 await s.auto.handle(req('/api/admin/suggestions/edit',{key:j.key,id:j.draft.id,title:j.draft.title,category:j.draft.category,productIds:[],customProducts:products}));
 assert.equal((await s.listing())[0].readiness.photoCount,9);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,409);
 await attachPhotos(s,j);assert.equal((await s.listing())[0].readiness.canApprove,true);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,200);
 const publicData=await(await s.api(req('/api/experiment?experiment='+j.draft.id,null,false))).json();
 assert.equal(publicData.experiment.products.every(p=>p.image),true);assert.doesNotMatch(JSON.stringify(publicData),/sourceUrls|researchNotes|verifiedBy|consultedUrls/);
});
test('legacy research and unverified channels cannot pass the research gate',async t=>{
 const s=await setup(t);await s.submit('backpacks');const j=await s.build();await attachPhotos(s,j);
 const jobs=await s.store.scope('suggestion-jobs',()=>({jobs:{}}));await jobs.transaction(d=>{delete d.jobs[j.key].research.evidence;});
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,409);
 for(const evidence of fakeResearch('backpacks').evidence){assert.equal((await s.auto.handle(req('/api/admin/suggestions/evidence',{key:j.key,evidence}))).status,200);}
 assert.equal((await s.listing())[0].readiness.canApprove,true);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/evidence',{key:j.key,evidence:{...fakeResearch('backpacks').evidence[0],productName:'Another product'}}))).status,400);
 const r=fakeResearch('backpacks');r.evidence[0].verified=false;assert.equal(researchCoverage(r).complete,false);
});
test('source host spoofing and unsupported Google ranks are rejected',()=>{
 const r=fakeResearch('backpacks');for(const patch of [{...r.evidence[0],url:'https://tiktok.com.evil.example/video'},{...r.evidence[1],url:'https://www.nytimes.com/other/'},{...r.evidence[2],rank:2},{...r.evidence[2],searchUrl:null}])assert.throws(()=>validateEvidence(patch));
 const products=r.picks.filter(p=>p.brand!==r.evidence[1].brand);assert.equal(researchCoverage(r,products).counts.wirecutter,0);
});
test('provider source metadata grounds evidence and never fabricates Google verification',async()=>{
 const r=fakeResearch('backpacks');const provider=createResearch({env:{OPENAI_API_KEY:'test-key'},fetcher:async()=>Response.json({status:'completed',output:[{type:'web_search_call',action:{sources:[{url:r.evidence[0].url},{url:r.evidence[1].url},{url:r.evidence[2].url}]}},{content:[{type:'output_text',text:JSON.stringify(r)}]}]})});
 const {result}=await provider.start('backpacks','test');assert.equal(result.evidence[0].verified,true);assert.equal(result.evidence[1].verified,true);assert.equal(result.evidence[2].verified,false);assert.equal(researchCoverage(result).complete,false);
});
test('catalog photos are rechecked and organizer photo overrides survive draft save',async t=>{
 const fixture=fakeResearch('backpacks'),catalog=fixture.picks.map((p,i)=>({id:'c3-'+i,provider:'channel3',providerId:String(i),brand:p.brand,name:p.productName,image:'https://example.com/provider.jpg'}));
 const s=await setup(t,{search:{search:async()=>({products:catalog}),find:async id=>catalog.find(p=>p.id===id)}});await s.submit('backpacks');const j=await s.build();assert.equal((await s.listing())[0].readiness.canApprove,true);
 catalog[0].image=null;assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,409);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/edit',{key:j.key,id:j.draft.id,title:j.draft.title,category:j.draft.category,productIds:j.draft.products.map(p=>p.id),customProducts:[],photoOverrides:{'c3-0':'https://example.com/attached.jpg'}}))).status,200);
 assert.equal((await s.listing())[0].readiness.canApprove,true);assert.equal((await s.listing())[0].draft.products[0].photoOverride,'https://example.com/attached.jpg');
});

test('missing photo lookup attaches catalog identities while keeping draft private',async t=>{
 let photos=false;const picks=fakeResearch('backpacks').picks,catalog=picks.map((p,i)=>({id:'c3-photo-'+i,provider:'channel3',providerId:'photo-'+i,brand:p.brand,name:p.productName,image:'https://example.com/photo-'+i+'.jpg'}));
 const s=await setup(t,{search:{search:async()=>({products:photos?catalog:[]}),find:async id=>catalog.find(p=>p.id===id)}});await s.submit('backpacks');const j=await s.build();assert.equal(j.readiness.photoCount,0);photos=true;
 const response=await s.auto.handle(req('/api/admin/suggestions/photos',{key:j.key}));assert.equal(response.status,200);assert.equal((await response.json()).missing,0);const [next]=await s.listing();assert.equal(next.draft.status,'draft');assert.equal(next.readiness.canApprove,true);assert.equal(next.draft.products[0].image,undefined);assert.equal(next.draft.products[0].provider,'channel3');assert.equal((await s.api(req('/api/experiment?experiment='+next.draft.id,null,false))).status,404);
});
test('manual draft additions remain visible and need their own photos before approval',async t=>{
 const s=await setup(t);await s.submit('backpacks');const j=await s.build(),manual={id:'sku-manual-fixture',brand:'Manual brand',name:'Manual product',url:'https://example.com/product'};
 const save=products=>s.auto.handle(req('/api/admin/suggestions/edit',{key:j.key,id:j.draft.id,title:j.draft.title,category:j.draft.category,productIds:[],customProducts:products}));
 const original=j.draft.products.map(p=>({...p,image:'https://example.com/photo.jpg'}));assert.equal((await save([...original,manual])).status,200);assert.equal((await s.listing())[0].draft.products.length,11);assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,409);
 assert.equal((await save([...original,{...manual,image:'https://example.com/manual.jpg'}])).status,200);assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,200);
});

test('research diagnostics identify incomplete and invalid output without leaking provider error payloads',async()=>{
 const incomplete=createResearch({env:{OPENAI_API_KEY:'test-key'},fetcher:async()=>Response.json({status:'incomplete',max_output_tokens:16000,incomplete_details:{reason:'max_output_tokens'},usage:{output_tokens:16000},error:{message:'sk-private-do-not-report'}})});
 assert.deepEqual(await incomplete.inspect('resp-test'),{responseStatus:'incomplete',incompleteReason:'max_output_tokens',outputTokens:16000,maxOutputTokens:16000,validationError:null});
 await assert.rejects(incomplete.poll('resp-test'),e=>e.code==='provider_incomplete'&&e.diagnostic.incompleteReason==='max_output_tokens'&&!JSON.stringify(e).includes('sk-private'));
 const invalid=createResearch({env:{OPENAI_API_KEY:'test-key'},fetcher:async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:'sk-private-invalid-json'}]}]})});
 assert.equal((await invalid.inspect('resp-test')).validationError,'Research output was not valid JSON.');await assert.rejects(invalid.poll('resp-test'),e=>e.code==='research_validation'&&!e.message.includes('sk-private'));
});
test('diagnostics are organizer-only, read-only, and tied to a saved research response',async t=>{
 let calls=0;const research={fake:true,start:async()=>({responseId:'resp-fixture',pending:true}),inspect:async id=>{calls++;assert.equal(id,'resp-fixture');return {responseStatus:'completed',validationError:'Invalid research format.'};}};
 const s=await setup(t,{research});await s.submit('backpacks');await s.auto.advance();assert.equal((await s.auto.handle(req('/api/admin/suggestions/diagnostics?key=backpack',null,false))).status,401);
 const r=await s.auto.handle(req('/api/admin/suggestions/diagnostics?key=backpack'));assert.equal(r.status,200);assert.equal((await r.json()).diagnostic.validationError,'Invalid research format.');assert.equal(calls,1);assert.equal((await s.listing())[0].state,'researching');
});

test('invalid channel evidence preserves valid picks but cannot count toward publication',()=>{
 const r=fakeResearch('backpacks');r.evidence[0].url='https://editorial.example.com/tiktok-trend';const result=validateResearch(r);assert.equal(result.picks.length,10);assert.equal(result.evidence.length,3);assert.equal(result.sourceIssues[0].channel,'tiktok');assert.equal(result.sourceIssues[0].reason,'TikTok evidence needs a TikTok URL.');assert.equal(researchCoverage(result).counts.tiktok,0);assert.equal(researchCoverage(result).complete,false);assert.equal(validateResearch(result).sourceIssues.length,1);
});
test('failed research recovers its saved response without a new request or budget start',async t=>{
 let starts=0,polls=0,time=Date.now(),recover=false;const result=fakeResearch('backpacks');result.evidence[0].url='https://editorial.example.com/tiktok-trend';
 const research={fake:true,start:async()=>{starts++;return {responseId:'resp-saved',pending:true};},poll:async()=>{polls++;if(!recover)throw Error('Prior validation failure');return {result:validateResearch(structuredClone(result))};}};
 const s=await setup(t,{research,now:()=>time});await s.submit('backpacks');await s.auto.advance();for(let i=0;i<3;i++){time+=10000;await s.auto.advance();}let [job]=await s.listing();assert.equal(job.state,'failed');const jobs=await s.store.scope('suggestion-jobs',()=>({jobs:{},budget:{}})),budget=structuredClone((await jobs.read()).budget);
 recover=true;assert.equal((await s.auto.handle(req('/api/admin/suggestions/resume',{key:job.key}))).status,200);for(let i=0;i<12;i++)await s.auto.advance();[job]=await s.listing();assert.equal(job.draft.status,'draft');assert.equal(job.research.picks.length,10);assert.equal(job.research.sourceIssues[0].channel,'tiktok');assert.equal(job.readiness.canApprove,false);assert.equal(job.readiness.coverage.counts.tiktok,0);assert.equal(starts,1);assert.deepEqual((await jobs.read()).budget,budget);assert.equal((await s.auto.handle(req('/api/admin/suggestions/resume',{key:job.key}))).status,409);
});

test('photo repair falls back across categories while requiring the same brand and complete model',async()=>{
 const pick={brand:'LANEIGE',name:'Lip Sleeping Mask'},match={id:'c3-mask',provider:'channel3',providerId:'mask',brand:'LA NEIGE',name:'Lip Sleeping Mask (20g)',category:'Lip Masks',image:'https://example.com/mask.jpg'},calls=[];
 const result=await findProductPhoto(pick,{category:'Lip Balm',visitorKey:'test',search:{search:async(q,options)=>{calls.push(options.category);return {products:options.category==='Products'?[{...match,brand:'Different'},match]:[]};}}});assert.deepEqual(calls,['Lip Balm','Products']);assert.equal(result.product.id,'c3-mask');assert.equal(result.method,'broader_catalog');
 assert.equal(choosePhotoMatch(pick,[{...match,brand:'Other'}, {...match,name:'Lip Glowy Balm'}]),null);assert.equal(choosePhotoMatch(pick,[{...match,name:'Lip Mask'}]),null);
});
test('photo repair can use a saved product URL and reports unavailable catalogs',async()=>{
 const p={brand:'Violette_FR',name:'Bisou Balm',url:'https://violettefr.com/products/bisou-balm'},found={id:'c3-balm',brand:p.brand,name:p.name,image:'https://example.com/balm.jpg'};
 const result=await findProductPhoto(p,{category:'Lip balm',visitorKey:'test',search:{search:async()=>({products:[]}),lookupUrl:async(url,options)=>{assert.equal(url,p.url);assert.equal(options.category,'Products');return found;}}});assert.equal(result.method,'product_url');assert.equal(result.product.id,found.id);
 const unavailable=await findProductPhoto(p,{category:'Lip balm',visitorKey:'test',search:{search:async()=>({products:[],partial:true,live:{providers:{channel3:'timeout'}}})}});assert.equal(unavailable.reason,'catalog_unavailable');
});
test('photo repair records new photos and per-item outcomes without replacing another brand or changing order',async t=>{
 const s=await setup(t);await s.submit('backpacks');const j=await s.build();const matched=j.draft.products.map((p,i)=>({...p,id:'c3-fallback-'+i,provider:'channel3',providerId:'fallback-'+i,image:'https://example.com/photo.jpg'}));
 const auto=createSuggestions({store:s.store,authorizeAdmin:r=>r.headers.get('x-admin')==='yes',development:true,search:{search:async(q,options)=>({products:options.category==='Products'?matched.filter(p=>q.includes(p.brand)):[]}),find:async id=>matched.find(p=>p.id===id)}});
 const r=await auto.handle(req('/api/admin/suggestions/photos',{key:j.key})),report=await r.json();assert.equal(r.status,200);assert.equal(report.added,10);assert.equal(report.missing,0);const [after]=await s.listing();assert.deepEqual(after.draft.products.map(p=>p.brand),j.draft.products.map(p=>p.brand));assert.equal(after.photoLookup.results.length,10);assert.equal(after.draft.products.every(p=>p.image===undefined),true);assert.equal(after.draft.status,'draft');
});
test('failed photo searches report zero new photos and keep a manual repair path',async t=>{
 const s=await setup(t);await s.submit('backpacks');const j=await s.build(),report=await(await s.auto.handle(req('/api/admin/suggestions/photos',{key:j.key}))).json();assert.equal(report.added,0);assert.equal(report.missing,10);assert.equal(report.results.every(r=>r.outcome==='no_results'),true);assert.equal((await s.listing())[0].photoLookup.checked,10);assert.equal((await s.auto.handle(req('/api/admin/suggestions/photos',{key:j.key},false))).status,401);
});

test('photo repair counts only photos that resolve after the identity is saved',async t=>{
 const s=await setup(t);await s.submit('backpacks');const j=await s.build();
 const matched=j.draft.products.map((p,i)=>({...p,id:'c3-lost-'+i,provider:'channel3',providerId:'lost-'+i,image:'https://example.com/photo.jpg'}));
 const auto=createSuggestions({store:s.store,authorizeAdmin:()=>true,development:true,search:{search:async q=>({products:matched.filter(p=>q.includes(p.brand))}),find:async()=>null}});
 const report=await(await auto.handle(req('/api/admin/suggestions/photos',{key:j.key}))).json();
 assert.equal(report.added,0);assert.equal(report.missing,10);assert.equal(report.results.every(r=>r.outcome==='saved_photo_unavailable'),true);assert.equal(report.results.every(r=>r.productId.startsWith('c3-lost-')),true);
});

test('late completed provider response is recovered before deadline rejection',async t=>{
 let time=Date.now(),starts=0;const s=await setup(t,{now:()=>time,research:{fake:true,start:async()=>{starts++;return {pending:true,responseId:'saved'};},poll:async()=>({result:fakeResearch('backpacks')})}});
 await s.submit('backpacks');await s.auto.advance();time+=3600000;await s.auto.advance();assert.equal((await s.listing())[0].state,'matching');assert.equal(starts,1);
});
test('temporary provider errors retry and preserve response without another research start',async t=>{
 let time=Date.now(),polls=0,starts=0;const s=await setup(t,{now:()=>time,research:{fake:true,start:async()=>{starts++;return {pending:true,responseId:'saved'};},poll:async()=>{if(++polls<5)throw Object.assign(Error('private'),{code:'provider_http',providerStatus:503});return {result:fakeResearch('backpacks')};}}});
 await s.submit('backpacks');await s.auto.advance();for(let i=0;i<5;i++){time+=900000;await s.auto.advance();}assert.equal((await s.listing())[0].state,'matching');assert.equal(starts,1);
});
test('notification failure survives a new process and retries with the same idempotency key',async t=>{
 let time=Date.now(),calls=[];const notify=async m=>{calls.push(m);if(calls.length===1)throw Error('email outage');return {id:'delivery'};};
 const s=await setup(t,{now:()=>time,env:{SUGGESTION_NOTIFY_EMAIL:'test@example.com'},notify});await s.submit('backpacks');await s.build();let [j]=await s.listing();assert.equal(j.notification.status,'pending');assert.equal(j.notifiedAt,undefined);
 time+=60000;const restarted=createSuggestions({store:s.store,search:{},development:true,now:()=>time,env:{SUGGESTION_NOTIFY_EMAIL:'test@example.com'},notify});await Promise.all([restarted.advance(),restarted.advance()]);[j]=await s.listing();assert.equal(j.notification.status,'sent');assert.equal(calls.length,2);assert.equal(calls[0].idempotencyKey,calls[1].idempotencyKey);assert.equal(j.notification.deliveryId,'delivery');
});
test('refresh sends a new completion notification and failed research sends an action alert',async t=>{
 const messages=[];const s=await setup(t,{env:{SUGGESTION_NOTIFY_EMAIL:'test@example.com'},notify:async m=>messages.push(m)});await s.submit('backpacks');const j=await s.build();await s.auto.handle(req('/api/admin/suggestions/retry',{key:j.key}));await s.build();assert.equal(messages.length,2);assert.notEqual(messages[0].idempotencyKey,messages[1].idempotencyKey);
 const failed=await setup(t,{env:{SUGGESTION_NOTIFY_EMAIL:'test@example.com'},notify:async m=>messages.push(m),research:{fake:true,start:async()=>{throw Object.assign(Error('private'),{code:'research_validation'});}}});await failed.submit('backpacks');await failed.auto.advance();assert.equal(messages.at(-1).state,'failed');
});
test('background runner completes a private draft without admin polling',async t=>{
 const {runSuggestions,runnerAuthorized}=await import('../lib/auto-experiments/runner.mjs');const s=await setup(t);await s.submit('backpacks');const r=await runSuggestions({store:s.store,auto:s.auto});assert.equal(r.active,0);assert.equal((await s.listing())[0].draft.status,'draft');assert.equal((await s.api(req('/api/experiment?experiment=backpacks',null,false))).status,404);
 assert.equal(await runnerAuthorized(new Request('https://example.com',{headers:{authorization:'Bearer secret'}}),'secret'),true);
 assert.equal(await runnerAuthorized(new Request('https://example.com',{headers:{authorization:'Bearer wrong'}}),'secret'),false);
 assert.equal(await runnerAuthorized(new Request('https://example.com',{headers:{authorization:'Bearer secret',origin:'https://evil.example'}}),'secret'),false);
});
test('an interrupted job lease expires and processing resumes without duplicate draft',async t=>{
 let time=Date.now();const s=await setup(t,{now:()=>time});await s.submit('backpacks');const jobs=await s.store.scope('suggestion-jobs',()=>({jobs:{}}));await jobs.transaction(d=>{const j=Object.values(d.jobs)[0];j.lease='crashed';j.lockedUntil=time+120000;});assert.equal((await s.auto.advance()).advanced,false);time+=120001;await s.build();assert.equal((await s.listing())[0].draft.status,'draft');
});
test('notification retry stops before provider idempotency expires after an outage',async t=>{
 let time=Date.now(),calls=0;const s=await setup(t,{now:()=>time,env:{SUGGESTION_NOTIFY_EMAIL:'test@example.com'},notify:async()=>{calls++;throw Error('outage');}});await s.submit('backpacks');await s.build();time+=25*3600000;await s.auto.advance();assert.equal(calls,1);assert.equal((await s.listing())[0].notification.status,'failed');
});
test('card actions remove and replace in place while preserving private draft and approval checks',async t=>{
 const s=await setup(t);await s.submit('backpacks');const j=await s.build(),ids=j.draft.products.map(p=>p.id),replacement={id:'sku-manual-replacement',brand:'New brand',name:'Replacement pack',image:'https://example.com/new.jpg'};
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/replace-product',{key:j.key,productId:ids[2],product:replacement},false))).status,401);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/replace-product',{key:j.key,productId:ids[2],product:replacement}))).status,200);
 let [next]=await s.listing();assert.deepEqual(next.draft.products.map(p=>p.id),ids.map((id,i)=>i===2?replacement.id:id));assert.equal(next.draft.status,'draft');assert.equal(next.readiness.canApprove,false);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/remove-product',{key:j.key,productId:ids[4]}))).status,200);
 [next]=await s.listing();assert.equal(next.draft.products.length,9);assert.equal(next.draft.products.some(p=>p.id===ids[4]),false);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/remove-product',{key:j.key,productId:ids[4]}))).status,409);
 assert.equal((await s.api(req('/api/experiment?experiment='+j.draft.id,null,false))).status,404);
});
test('failed validation diagnostics explain returned counts without exposing provider text',async()=>{
 const r=fakeResearch('cutting boards');r.picks[9].brand=r.picks[0].brand;
 const {responseDiagnostics}=await import('../lib/auto-experiments/research.mjs');const d=responseDiagnostics({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(r)}]}],usage:{output_tokens:2902},max_output_tokens:16000});
 assert.equal(d.pickCount,10);assert.equal(d.distinctBrandCount,9);assert.equal(d.duplicateBrandCount,1);assert.match(d.validationError,/ten distinct brands/);assert.equal(d.outputTokens,2902);assert.equal(JSON.stringify(d).includes('Demo Brand'),false);
});
test('manual suggestion draft needs no research and stays private with editable ordered products',async t=>{
 const s=await setup(t);await s.submit('cutting boards');const [job]=await s.listing();const products=[{id:'sku-manual-board-a',brand:'Brand A',name:'Board A'},{id:'sku-manual-board-b',brand:'Brand B',name:'Board B'}],payload={key:job.key,id:'manual-cutting-boards',title:'Cutting boards',category:'Cutting boards',productIds:[],customProducts:products,productOrder:products.map(p=>p.id).reverse()};
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/create-manual',payload,false))).status,401);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/create-manual',payload))).status,200);
 let [j]=await s.listing();assert.equal(j.creationMode,'manual');assert.equal(j.draft.status,'draft');assert.deepEqual(j.draft.products.map(p=>p.id),payload.productOrder);assert.equal(j.readiness.canApprove,false);
 for(let i=0;i<3;i++)await s.auto.advance();[j]=await s.listing();assert.equal(j.attempts,0);assert.equal(j.draft.products.length,2);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/create-manual',payload))).status,409);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/approve',{key:j.key}))).status,409);
 assert.equal((await s.api(req('/api/experiment?experiment='+j.draft.id,null,false))).status,404);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/evidence',{key:j.key,evidence:{channel:'ai',brand:'Brand A',productName:'Board A',url:null,searchUrl:null,query:'Manual research',note:'Checked manufacturer source',rank:null}}))).status,200);
});
test('manual creation respects active research leases and malformed order never creates a draft',async t=>{
 const s=await setup(t);await s.submit('cutting boards');const [j]=await s.listing(),scope=await s.store.scope('suggestion-jobs',()=>({jobs:{}}));const payload={key:j.key,id:'manual-boards',title:'Boards',category:'Boards',productIds:[],customProducts:[{id:'sku-manual-board',brand:'Brand',name:'Board'}],productOrder:['wrong']};assert.equal((await s.auto.handle(req('/api/admin/suggestions/create-manual',payload))).status,400);
 await scope.transaction(d=>{d.jobs[j.key].lockedUntil=Date.now()+60000;});assert.equal((await s.auto.handle(req('/api/admin/suggestions/create-manual',{...payload,productOrder:['sku-manual-board']}))).status,409);
 assert.equal((await s.listing())[0].draft,null);
});
test('manual save reuses an automatic draft completed while the editor was open',async t=>{
 const s=await setup(t);await s.submit('serving trays');const j=await s.build();const r=await s.auto.handle(req('/api/admin/suggestions/create-manual',{key:j.key,id:'manual-trays',title:'Manual trays',category:'Serving trays',productIds:[],customProducts:[{id:'sku-manual-tray',brand:'Manual brand',name:'Serving tray'}]}));assert.equal(r.status,200);const [next]=await s.listing();assert.equal(next.draft.id,j.draft.id);assert.equal(next.draft.products.length,1);assert.equal(next.creationMode,'manual');
});
test('refresh clears stale failures and starts the selected suggestion on demand',async t=>{
 const s=await setup(t);await s.submit('golf bags');const j=await s.build();await s.submit('serving trays');const scope=await s.store.scope('suggestion-jobs',()=>({jobs:{}}));await scope.transaction(d=>{Object.assign(d.jobs[j.key],{failureCode:'research_validation',lastError:'Old error',diagnostic:{validationError:'Old error'},photoLookup:{added:1}});});
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/retry',{key:j.key}))).status,200);let all=await s.listing(),queued=all.find(x=>x.key===j.key);assert.equal(queued.state,'queued');assert.equal(queued.lastError,null);assert.equal(queued.diagnostic,null);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/run',{key:j.key}))).status,200);all=await s.listing();assert.equal(all.find(x=>x.key===j.key).state,'matching');assert.equal(all.find(x=>x.key!==j.key).state,'queued');assert.equal(all.find(x=>x.key===j.key).attempts,2);
 const data=await(await s.auto.handle(req('/api/admin/suggestions'))).json();assert.equal(data.previewResearch,true);
});

test('organizer adds a dated suggestion with attribution and duplicates preserve its original submitter',async t=>{
 const at='2026-11-11T15:00:00.000Z',s=await setup(t,{now:()=>Date.parse(at)});
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/add',{category:'Backpacks',addedBy:'Armaan'},false))).status,401);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/add',{category:'Backpacks',addedBy:'Armaan',note:'For campus'}))).status,202);
 const [j]=await s.listing();assert.equal(j.submittedBy,'Armaan');assert.equal(j.createdAt,at);assert.equal(j.submissionSource,'organizer');assert.equal(j.support.count,1);
 const duplicate=await(await s.auto.handle(req('/api/admin/suggestions/add',{category:'Backpack',addedBy:'Someone else'}))).json();assert.equal(duplicate.duplicate,true);assert.equal(duplicate.key,j.key);
 const [unchanged]=await s.listing();assert.equal(unchanged.submittedBy,'Armaan');assert.equal(unchanged.support.count,1);
});
test('anonymous and legacy suggestions remain unknown; trusted account attribution ignores public spoofing',async t=>{
 const s=await setup(t,{getSubmitter:async r=>r.headers.get('cookie')==='known=yes'?'Known member':null});
 await s.submit('Backpacks');await s.auto.handle(req('/api/suggestions',{category:'Trays',addedBy:'Spoofed'},false,'known=yes'));
 const rows=await s.listing();assert.equal(rows.find(j=>j.category==='Backpacks').submittedBy,null);assert.equal(rows.find(j=>j.category==='Trays').submittedBy,'Known member');
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/add',{category:'A'}))).status,400);
 assert.equal((await s.auto.handle(req('/api/admin/suggestions/add',{category:'New category',addedBy:{}}))).status,400);
 const jobs=await s.store.scope('suggestion-jobs',()=>({jobs:{},budget:{}}));await jobs.transaction(d=>{for(const j of Object.values(d.jobs))delete j.submittedBy;});assert.ok((await s.listing()).every(j=>!j.submittedBy));
});
