function localDateInput(value){if(!value)return '';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
document.getElementById('schedule-timezone').textContent='Dates use your local time zone: '+Intl.DateTimeFormat().resolvedOptions().timeZone+'.';
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let loadVersion=0;
let latest,experiments=[],selectedExperiment=new URLSearchParams(location.search).get('experiment')||'sunscreen',customDraft=[];
function updateExperimentUrl(){const url=new URL(location.href);url.searchParams.set('experiment',selectedExperiment);history.replaceState(null,'',url.pathname+url.search+url.hash);}
function endpoint(path){const u=new URL(path,location.origin);u.searchParams.set('experiment',selectedExperiment);return u.pathname+u.search}
async function request(path,payload){const response=await fetch(endpoint(path),{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load results. Sign in again if your session expired.');return data}

function setTabCount(tab,count){
 const badge=document.querySelector('#experiment-tab-'+tab+' [data-tab-count]');
 badge.textContent=count;
 badge.hidden=!count;
}
async function load(){
 const version=++loadVersion,id=selectedExperiment;
 Admin.refresh('refresh',true);
 try{
  const result=await request('/api/admin/summary');
  if(version!==loadVersion||id!==selectedExperiment)return;
  latest=result;
  Admin.refresh('refresh',false,true);
  document.getElementById('participation-metrics').innerHTML=[
   ['Visitors',result.visitors],['Started',result.started],
   ['Finished voting and viewed leaderboard',result.completed],['Finish rate',result.completionRate+'%']
  ].map(([label,value])=>Admin.metric(label,value)).join('');
  document.getElementById('participation-funnel').innerHTML=Admin.funnel([
   ['Visitors',result.visitors],['Started',result.started],['Answered every card',result.allCardsAnswered],
   ['Viewed leaderboard',result.leaderboardViewed],['Reached nominations',result.endSeen],['Nominated',result.nominationSubmitters]
  ]);
  document.getElementById('participation-details').textContent=Admin.plural(result.visits,'page visit');
  setTabCount('missing',Admin.lookupCount(result.nominations));
  updateActionSummary(id,result);
  renderNominations();
 }catch(error){
  if(version===loadVersion)document.getElementById('status').textContent=error.message;
 }finally{if(version===loadVersion)Admin.refresh('refresh',false);}
}
document.getElementById('refresh').onclick=()=>{if(document.getElementById('refresh').getAttribute('aria-busy')!=='true'){load();window.VouchExperimentProducts?.refresh(selectedExperiment);}};
const inbox=document.getElementById('inbox');
const reviewForm=document.getElementById('review');
const nominationFilter=document.getElementById('nomination-filter');
let nominationView='active';
const nominationStatus=document.getElementById('nomination-status');
const nominationSelected=()=>[...inbox.querySelectorAll('input:checked')].map(input=>input.value);
const nominationRank=group=>group.status==='on-board'?2:group.reviewed?1:0;
let writingNominations=false;
function renderNominations(){
 const selected=nominationSelected(), dismissed=nominationView==='dismissed';
 const groups=(latest?.nominations||[]).filter(g=>!!g.dismissed===dismissed)
  .sort((a,b)=>nominationRank(a)-nominationRank(b)||b.nominators-a.nominators);
 inbox.innerHTML=groups.map((g,index)=>{
  const rank=nominationRank(g);
  const label=dismissed?'Dismissed':rank===2?'On community board':rank===1?'Confirmed · '+g.nominators+' of 2 nominators':'Needs lookup';
  const selection='<input type="checkbox" name="group" value="'+safe(g.key)+'" id="nomination-'+index+'" '+(selected.includes(g.key)?'checked':'')+'>';
  return '<div class="nomination-row">'+(dismissed?'':selection)+'<div><label for="nomination-'+index+'"><strong>'+safe(g.name)+'</strong></label>'+
   '<small>'+Admin.plural(g.nominators,'distinct browser')+'<br>Submitted as: '+g.variants.map(safe).join(' / ')+
   (g.product?.url?'<br><a href="'+safe(g.product.url)+'" target="_blank" rel="noopener noreferrer">View catalog product</a>':'')+'</small></div>'+
   '<span class="table-badge nomination-state-'+rank+'">'+label+'</span>'+
   (dismissed?'<button class="admin-secondary" type="button" data-restore="'+safe(g.key)+'">Restore</button>':'')+'</div>';
 }).join('')||'<p class="empty-inbox">'+(dismissed?'No dismissed nominations.':'No nominations yet. New submissions will appear here.')+'</p>';
 syncNominationSelection();
}
function syncNominationSelection(){
 const count=nominationSelected().length;
 reviewForm.hidden=!count;
 document.getElementById('nomination-selected').textContent=count+' selected';
}
inbox.onchange=syncNominationSelection;
function setNominationView(view){
 nominationView=view;
 nominationFilter.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.nominationFilter===view)));
}
nominationFilter.onclick=event=>{
 const button=event.target.closest('[data-nomination-filter]');if(!button||writingNominations)return;
 setNominationView(button.dataset.nominationFilter);
 inbox.querySelectorAll('input:checked').forEach(input=>input.checked=false);
 reviewForm.reset();renderNominations();
};
document.getElementById('nomination-clear').onclick=()=>{
 inbox.querySelector('input:checked')?.focus();
 inbox.querySelectorAll('input:checked').forEach(input=>input.checked=false);
 reviewForm.reset();syncNominationSelection();
};
async function saveNominations(action,groups){
 if(writingNominations||!groups.length)return;
 const id=selectedExperiment;
 writingNominations=true;
 const control=document.activeElement;
 const keys=[...new Set(groups.flatMap(group=>group.sourceKeys))];
 if(control instanceof HTMLButtonElement)control.disabled=true;
 try{
  const result=action==='confirm'?
   await request('/api/admin/review',{keys,name:document.getElementById('canonical').value}):
   await request('/api/admin/nomination-status',{keys,dismissed:action==='dismiss'});
  if(id!==selectedExperiment)return;
  reviewForm.reset();
  inbox.querySelectorAll('input:checked').forEach(input=>input.checked=false);
  nominationStatus.textContent=action==='confirm'?
   (result.status==='on-board'?'Product confirmed and added to the community board.':'Product confirmed. It needs two nominators to appear on the board.'):
   action==='dismiss'?'Nominations dismissed. You can restore them from Dismissed.':'Nomination restored.';
  await load();
  if(action==='confirm')await window.VouchExperimentProducts?.refresh(id);
  if(id===selectedExperiment&&!document.getElementById('experiment-pane-missing').hidden)nominationFilter.querySelector('[aria-pressed=true]').focus();
 }catch(error){if(id===selectedExperiment)nominationStatus.textContent=error.message;}
 finally{writingNominations=false;if(control instanceof HTMLButtonElement)control.disabled=false;}
}
const chosenNominations=()=>latest?.nominations.filter(g=>!g.dismissed&&nominationSelected().includes(g.key))||[];
reviewForm.onsubmit=event=>{event.preventDefault();saveNominations('confirm',chosenNominations());};
document.getElementById('nomination-dismiss').onclick=()=>saveNominations('dismiss',chosenNominations());
inbox.onclick=event=>{
 const button=event.target.closest('[data-restore]');
 if(button)saveNominations('restore',latest.nominations.filter(g=>g.dismissed&&g.key===button.dataset.restore));
};

function productChoice(p){return '<label class="product-choice"><input type="checkbox" name="experiment-product" value="'+safe(p.id)+'" data-label="'+safe(p.brand+' — '+p.name)+'">'+safe(p.brand)+' — '+safe(p.name)+'</label>'}
let displayedEdit,copyTimer,settingsTimer;
const formatEasternDate=value=>new Intl.DateTimeFormat('en-US',{
 dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'
}).format(new Date(value))+' ET';
function updateResponseState(){
 const e=experiments.find(edit=>edit.id===selectedExperiment);
 if(!e)return;
 const closed=document.getElementById('close-experiment').checked;
 document.getElementById('schedule-fields').disabled=closed;
 document.getElementById('schedule-paused').hidden=!closed;
 const state=Admin.editState(e);
 document.getElementById('response-state').textContent='Currently '+Admin.status(state)+
  (e.endsAt&&Date.parse(e.endsAt)<=Date.now()?' · ended '+formatEasternDate(e.endsAt):'');
}
document.querySelectorAll('[name=responses]').forEach(radio=>radio.onchange=updateResponseState);
function selectExperiment(){
 const e=experiments.find(e=>e.id===selectedExperiment);if(!e)return;
 document.getElementById('settings-title').value=e.title;document.getElementById('settings-category').value=e.category;document.getElementById('settings-cover').value=e.coverImage||'';document.getElementById('settings-cover').dispatchEvent(new Event('input'));
 document.getElementById('experiment-start').value=localDateInput(e.startsAt);document.getElementById('experiment-end').value=localDateInput(e.endsAt);
 document.getElementById('settings-aliases').value=(e.searchAliases||[]).join(', ');document.getElementById('include-overall').checked=e.includeInOverall;document.getElementById('close-experiment').checked=e.closed;document.getElementById('follow-schedule').checked=!e.closed;
 updateResponseState();
 const url='/'+encodeURIComponent(e.id);
 document.getElementById('experiment-link').innerHTML='<a href="'+url+'" target="_blank" rel="noopener">Open ↗ <span class="edit-public-path">'+url+'</span></a> <button type="button" class="text-button" id="copy-experiment">Copy link</button> <span id="copy-message" role="status"></span>';
 document.getElementById('copy-experiment').onclick=async()=>{
  const message=document.getElementById('copy-message');
  try{await navigator.clipboard.writeText(location.origin+url);message.textContent='Copied';clearTimeout(copyTimer);copyTimer=setTimeout(()=>message.textContent='',2000);}
  catch{message.textContent='Open the Edit and copy its address.';}
 };
 document.getElementById('change-schedule').href=Admin.editLink(e.id,'settings');
 document.getElementById('schedule-summary').textContent=Admin.status(Admin.editState(e))+' · '+
  (e.startsAt&&e.endsAt?formatEasternDate(e.startsAt)+' to '+formatEasternDate(e.endsAt):'No dates set');
 document.getElementById('export-results').href=endpoint('/api/admin/export');
 document.getElementById('status').textContent='';
 if(displayedEdit!==e.id){
  latest=null;displayedEdit=e.id;
  document.getElementById('participation-metrics').replaceChildren();
  document.getElementById('participation-funnel').replaceChildren();
  document.getElementById('participation-details').textContent='';
  setTabCount('missing',0);setTabCount('community',0);
  setNominationView('active');nominationStatus.textContent='';inbox.replaceChildren();reviewForm.reset();syncNominationSelection();
 }
 load();
 document.dispatchEvent(new CustomEvent('vouch-experiment-selected',{detail:{id:selectedExperiment}}));
}
let allEdits=[];
async function loadExperiments(){
 const data=await request('/api/admin/experiments');
 allEdits=data.experiments;
 const route=Admin.parseHash(location.hash);
 if(['experiments','experiments-panel'].includes(route.base)&&data.experiments.some(e=>e.id===route.item&&e.status!=='draft'))selectedExperiment=route.item;
 experiments=allEdits.filter(e=>e.status!=='draft');
 renderExperimentOverview();
 loadActionSummaries(allEdits);
 if(!experiments.some(e=>e.id===selectedExperiment))selectedExperiment=experiments[0]?.id||'';
 document.getElementById('product-choices').innerHTML=[...data.defaultProducts,...data.customProducts].map(productChoice).join('');
 renderCatalogSelection();
 if(selectedExperiment)selectExperiment();
 document.dispatchEvent(new CustomEvent('vouch-experiments-loaded'));
}
document.getElementById('settings-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;const errorLine=document.getElementById('settings-error'),saved=document.getElementById('settings-saved');clearTimeout(settingsTimer);saved.textContent='';errorLine.textContent='';try{const data=await request('/api/admin/experiment-settings',{id:selectedExperiment,title:document.getElementById('settings-title').value,category:document.getElementById('settings-category').value,searchAliases:document.getElementById('settings-aliases').value.split(',').map(s=>s.trim()).filter(Boolean),coverImage:document.getElementById('settings-cover').value,includeInOverall:document.getElementById('include-overall').checked,closed:document.getElementById('close-experiment').checked,startsAt:document.getElementById('experiment-start').value?new Date(document.getElementById('experiment-start').value).toISOString():null,endsAt:document.getElementById('experiment-end').value?new Date(document.getElementById('experiment-end').value).toISOString():null});await loadExperiments();saved.textContent=data.warning?'Saved. '+data.warning:'Saved';settingsTimer=setTimeout(()=>saved.textContent='',3000)}catch(error){errorLine.textContent=error.message}finally{button.disabled=false}};
const catalogInput=document.getElementById('catalog-search'),catalogChoices=document.getElementById('catalog-choices'),catalogStatus=document.getElementById('catalog-status');
let catalogTimer,catalogController,catalogVersion=0,catalogMatches=[];
function chosenProducts(){return [...document.querySelectorAll('input[name="experiment-product"]:checked')]}
function renderCatalogSelection(){
 const selected=document.getElementById('catalog-selected');if(!selected)return;document.getElementById('catalog-count').textContent='· '+chosenProducts().length;document.getElementById('catalog-empty').hidden=!!chosenProducts().length;document.getElementById('catalog-clear-all').hidden=!chosenProducts().length;
 selected.innerHTML=chosenProducts().map(input=>'<span class="selection-chip" title="'+safe(input.dataset.label||input.value)+'"><span>'+safe(input.dataset.label||input.value)+'</span><button type="button" data-unselect="'+safe(input.value)+'" aria-label="Remove '+safe(input.dataset.label||input.value)+'">×</button></span>').join('');
 selected.querySelectorAll('[data-unselect]').forEach(button=>button.onclick=()=>{const input=[...document.querySelectorAll('input[name="experiment-product"]')].find(i=>i.value===button.dataset.unselect);if(input)input.checked=false;renderCatalogSelection();highlightCatalog();catalogStatus.textContent=chosenProducts().length+' selected. Keep searching to add more.';catalogInput.focus()});
}
function highlightCatalog(){catalogPicker.refresh();}
function chooseCatalog(p){
 const id=p.onBoardId||p.id;let input=[...document.querySelectorAll('input[name="experiment-product"]')].find(i=>i.value===id);
 if(!input){document.getElementById('product-choices').insertAdjacentHTML('beforeend',productChoice({...p,id}));input=[...document.querySelectorAll('input[name="experiment-product"]')].find(i=>i.value===id)}
 input.checked=!input.checked;renderCatalogSelection();highlightCatalog();catalogStatus.textContent=chosenProducts().length+' selected. Keep searching to add more.';catalogInput.focus();
}
function collapseCatalog(){catalogMatches=[];catalogPicker.clear();}
const catalogPicker=window.VouchProductPicker({input:catalogInput,results:catalogChoices,more:document.getElementById('catalog-more'),clear:document.getElementById('catalog-clear'),another:document.getElementById('catalog-another'),esc:safe,boardLabel:'Available board product',isSelected:p=>chosenProducts().some(i=>i.value===(p.onBoardId||p.id)),onChoose:chooseCatalog,onClear:()=>{catalogVersion++;catalogController?.abort();clearTimeout(catalogTimer);collapseCatalog();catalogStatus.textContent='Type at least two characters. Selections stay here as you search.';}});
document.getElementById('catalog-clear-all').onclick=()=>{chosenProducts().forEach(i=>i.checked=false);renderCatalogSelection();highlightCatalog();catalogInput.focus();};
async function searchCatalog(){
 const q=catalogInput.value.trim();if(q.length<2){collapseCatalog();catalogStatus.textContent='Type at least two characters. Selections stay here as you search.';return}
 const version=++catalogVersion;catalogController?.abort();catalogController=new AbortController();collapseCatalog();catalogStatus.textContent='Looking up products…';
 try{const response=await window.VouchCatalog.fetch(q,endpoint('/api/products/search?q='+encodeURIComponent(q)+'&category='+encodeURIComponent(document.getElementById('experiment-category').value)),{signal:AbortSignal.any([catalogController.signal,AbortSignal.timeout(12000)])});const data=await response.json();if(version!==catalogVersion)return;if(!response.ok)throw Error(data.error||'Search unavailable.');catalogMatches=data.products;
 catalogPicker.setProducts(catalogMatches);catalogStatus.textContent=data.live?.limited?'Showing saved results; live search is busy':catalogMatches.length?data.products.length+' matches in '+data.catalogCount+' products · Select multiple products'+(data.stale?' · Saved catalogue · Refresh pending':'')+(data.partial?' · Some catalogs unavailable':''):'No matching products. Try another name or add a SKU below.';
 }catch(error){if(error.name==='AbortError'||version!==catalogVersion)return;collapseCatalog();catalogStatus.textContent=/^https?:\/\//i.test(q)?"We couldn't read that link. Try the product name.":'Search is unavailable right now. Try again or add a SKU below.'}
}
catalogInput.oninput=()=>{catalogVersion++;catalogController?.abort();clearTimeout(catalogTimer);collapseCatalog();catalogStatus.textContent=catalogInput.value.trim().length<2?'Type at least two characters.':'Looking up products…';catalogTimer=setTimeout(searchCatalog,catalogInput.value.trim().length>=3?450:300)};
document.getElementById('product-choices').onchange=()=>{renderCatalogSelection();highlightCatalog()};
document.getElementById('add-custom').onclick=()=>{const p=Object.fromEntries(['id','brand','name','formula','image','url'].map(key=>[key,document.getElementById('custom-'+key).value.trim()]));const status=document.getElementById('create-status');if(!/^sku-[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)||p.name.length<2||p.brand.length<2){status.textContent='Enter a stable ID beginning sku-, a brand, and a product name.';return}if(customDraft.some(x=>x.id===p.id)){status.textContent='That SKU is already in this draft.';return}customDraft.push(p);document.getElementById('custom-draft').innerHTML=customDraft.map((x,i)=>'<li>'+safe(x.brand)+' — '+safe(x.name)+' <button type="button" class="text-button" data-remove="'+i+'">Remove</button></li>').join('');for(const key of ['id','brand','name','formula','image','url'])document.getElementById('custom-'+key).value='';status.textContent='SKU added to this draft.'};
document.getElementById('custom-draft').onclick=e=>{const button=e.target.closest('[data-remove]');if(!button)return;customDraft.splice(Number(button.dataset.remove),1);button.closest('li').remove();[...document.querySelectorAll('[data-remove]')].forEach((b,i)=>b.dataset.remove=i)};
document.getElementById('create-experiment').onsubmit=async e=>{e.preventDefault();const status=document.getElementById('create-status'),button=e.target.querySelector('button[type="submit"]');button.disabled=true;try{const data=await request('/api/admin/experiments',{id:document.getElementById('experiment-slug').value,title:document.getElementById('experiment-title').value,coverImage:document.getElementById('experiment-cover').value,category:document.getElementById('experiment-category').value,productIds:[...document.querySelectorAll('input[name="experiment-product"]:checked')].map(x=>x.value),customProducts:customDraft});selectedExperiment=data.experiment.id;customDraft=[];e.target.reset();document.getElementById('custom-draft').innerHTML='';catalogVersion++;catalogController?.abort();clearTimeout(catalogTimer);collapseCatalog();catalogStatus.textContent='Type at least two characters. Selections stay here as you search.';await loadExperiments();updateExperimentUrl();location.hash='experiments/'+encodeURIComponent(selectedExperiment);status.textContent='Edit created. Use Open Edit or Copy link above.';if(data.warning)document.getElementById('status').textContent=data.warning}catch(error){status.textContent=error.message}finally{button.disabled=false}};
loadExperiments().catch(error=>{document.getElementById('status').textContent=error.message;});
 request('/api/health').then(h=>{
  if(!h.ok)throw Error();
  Admin.system('database','Database connected · '+Admin.plural(h.experimentCount,'Edit'));
 }).catch(()=>Admin.system('database','Database unreachable','The database is unreachable. Organizer data and changes may be unavailable.'));

let tagDefinitions={},taggedProduct=null;
const tagStatus=document.getElementById('tag-status');
function renderTagOptions(){if(!taggedProduct)return;const category=document.getElementById('tag-product-category').value.trim().toLowerCase();document.getElementById('tag-options').innerHTML=Object.values(tagDefinitions).filter(t=>!t.category||t.category.toLowerCase()===category).map(t=>'<label><input type="checkbox" name="product-tag" value="'+safe(t.id)+'" '+(taggedProduct.tagIds.includes(t.id)?'checked':'')+'>'+safe(t.label)+' <small>'+safe(t.category||'All products')+'</small></label>').join('')}
document.getElementById('tag-product-category').oninput=renderTagOptions;
document.getElementById('product-tag-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const result=await request('/api/admin/product-tags',{productId:taggedProduct.id,category:document.getElementById('tag-product-category').value,tagIds:[...document.querySelectorAll('input[name="product-tag"]:checked')].map(x=>x.value)});taggedProduct.tagIds=result.tagIds;await window.VouchAdminTables.refresh();tagStatus.textContent='Product tags saved.'}catch(error){tagStatus.textContent=error.message}finally{button.disabled=false}};
document.getElementById('new-tag-form').onsubmit=async e=>{e.preventDefault();try{await request('/api/admin/tags',{label:document.getElementById('new-tag-label').value,category:document.getElementById('new-tag-category').value});await window.VouchAdminTables.refresh();renderTagOptions();e.target.reset();tagStatus.textContent='Reusable tag created.'}catch(error){tagStatus.textContent=error.message}};


function renderExperimentOverview(){
 const order=['open','upcoming','draft','closed','disabled'];
 const edits=allEdits.toSorted((a,b)=>order.indexOf(Admin.editState(a))-order.indexOf(Admin.editState(b))||String(b.endsAt||'').localeCompare(String(a.endsAt||'')));
 const closed=edits.filter(e=>Admin.editState(e)==='closed').slice(3);
 const row=e=>{
  const status=Admin.editState(e), result=actionSummaries.get(e.id);
  const href=Admin.editLink(e.id);
  return '<a class="home-edit-row" href="'+href+'">'+
   '<img src="'+safe(e.coverImage||'/brand/vouch-emblem.svg')+'" alt="" width="40" height="40">'+
   '<span class="home-edit-name"><strong>'+safe(e.title)+'</strong><small>/'+safe(e.id)+'</small></span>'+
   '<span class="home-edit-state">'+Admin.pill(status)+'<small>'+safe(Admin.scheduleText(e,status))+'</small></span>'+
   '<span class="home-edit-metrics">'+(result?Admin.plural(result.visitors,'visitor')+' · '+result.completionRate+'% finish rate':'—')+'</span>'+
   '<span aria-hidden="true">→</span></a>';
 };
 const host=document.getElementById('home-experiments'), expanded=host.querySelector('details')?.open;
 host.innerHTML=edits.length?edits.filter(e=>!closed.includes(e)).map(row).join('')+
  (closed.length?'<details '+(expanded?'open':'')+'><summary>Show '+Admin.plural(closed.length,'closed Edit')+'</summary>'+closed.map(row).join('')+'</details>':''):'<p>No Edits yet.</p>';
}
function renderHomeActions(){
 const actions=[];
 for(const e of experiments){
  const count=Admin.lookupCount(actionSummaries.get(e.id)?.nominations||[]);
  if(count)actions.push([count,(count===1?'product needs':'products need')+' lookup in '+e.title,Admin.editLink(e.id,'missing')]);
 }
 for(const [key,one,many,href] of [
  ['suggestions','suggestion ready to review','suggestions ready to review','#suggestions-panel?status=draft'],
  ['feedback','new feedback note','new feedback notes','#feedback'],
  ['unverified','account unverified','accounts unverified','#accounts?status=unverified']
 ]){
  const count=Admin.counts[key];
  if(count)actions.push([count,count===1?one:many,href]);
 }
 const ready=summariesLoaded&&['feedback','suggestions','unverified'].every(key=>Object.hasOwn(Admin.counts,key));
 const note=ready&&summaryFailures?'<p>Some Edit activity couldn’t load.</p>':'';
 document.getElementById('home-actions').innerHTML=actions.length?note+actions.map(([count,label,href])=>
  '<a class="home-action-row" href="'+href+'"><strong>'+count+'</strong><span>'+safe(label)+'</span><span aria-hidden="true">→</span></a>'
 ).join(''):ready?(note||'<p class="home-clear"><span aria-hidden="true">✓</span> You’re all caught up.</p>'):'<p>Checking for work…</p>';
}
document.addEventListener('vouch-admin-counts',renderHomeActions);

for(const [inputId,previewId,statusId] of [['settings-cover','settings-cover-preview','settings-cover-status'],['experiment-cover','create-cover-preview','create-cover-status']]){const input=document.getElementById(inputId),preview=document.getElementById(previewId),status=document.getElementById(statusId);input.addEventListener('input',()=>{preview.hidden=true;status.textContent='';if(!input.value)return;if(!/^https:\/\//i.test(input.value)){status.textContent='Use a public HTTPS image URL.';return;}preview.src=input.value;preview.hidden=false;});preview.onerror=()=>{preview.hidden=true;status.textContent='Could not load this image. Check the URL before saving.';};preview.onload=()=>status.textContent='Cover preview loaded.';}

const categoryForm=document.getElementById('category-form');
const categoryStatus=document.getElementById('admin-categories-status');
const categoryList=document.getElementById('admin-category-list');
let registryCategories=[],editingCategoryId=null,categoryInventory,unmatchedEdits=[];
const categoryFormSurface=document.getElementById('category-form-surface');

async function loadCategories(){
 const {categories,unmatched}=await request('/api/admin/categories');
 registryCategories=categories.sort((a,b)=>a.label.localeCompare(b.label));
 unmatchedEdits=unmatched;
 document.getElementById('registry-category-labels').replaceChildren(...registryCategories.map(c=>new Option(c.label,c.label)));
 renderCategories();
 if(categoryFormSurface.hidden)routeCategory();
}
function renderCategories(){
 const link=c=>'<a href="#categories/'+encodeURIComponent(c.id)+'">'+safe(c.label)+'</a>';
 const counts=(rows,id)=>rows?.filter(row=>row.categoryId===id).length??'—';
 const row=c=>'<tr data-row-href="#categories/'+encodeURIComponent(c.id)+'"><td>'+link(c)+'</td>'+
  '<td>'+counts(categoryInventory?.experiments,c.id)+'</td><td>'+counts(categoryInventory?.products,c.id)+'</td>'+
  '<td>'+(c.aliases.slice(0,2).map(safe).join(', ')||'—')+(c.aliases.length>2?' <span class="table-badge">+'+(c.aliases.length-2)+'</span>':'')+'</td></tr>';
 const groups=registryCategories.filter(c=>!c.parentId).map(parent=>({parent,children:registryCategories.filter(c=>c.parentId===parent.id)}));
 const table=rows=>'<div class="admin-table-wrap" tabindex="0" role="region" aria-label="Category counts"><table class="admin-table category-table"><thead><tr><th scope="col">Category</th><th scope="col">Edits</th><th scope="col">Products</th><th scope="col">Aliases</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
 const unassigned=groups.filter(group=>!group.children.length).map(({parent})=>row(parent)).join('')+
  unmatchedEdits.map(edit=>{
   const match=categoryInventory?.experiments.find(row=>row.id===edit.editId);
   const label=edit.category||'Uncategorized';
   return '<tr data-row-href="'+Admin.editLink(edit.editId)+'"><td><a href="'+Admin.editLink(edit.editId)+'">'+safe(label)+'</a><small>/'+safe(edit.editId)+'</small></td><td>1</td><td>'+(match?.productCount??'—')+'</td><td>—</td></tr>';
  }).join('');
 categoryList.innerHTML=groups.filter(group=>group.children.length).map(({parent,children})=>
  '<section class="admin-surface"><h2>'+link(parent)+'</h2>'+table(children.map(row).join(''))+'</section>'
 ).join('')+(unassigned?'<section class="admin-surface"><h2>Unassigned</h2>'+table(unassigned)+'</section>':'');
}
document.addEventListener('vouch-admin-inventory',event=>{categoryInventory=event.detail;renderCategories();});
function routeCategory(){
 const {base,item}=Admin.parseHash(location.hash);
 if(base!=='categories')return;
 const category=registryCategories.find(c=>c.id===item);
 if(category)openCategoryForm(category);
 else categoryFormSurface.hidden=true;
}

function openCategoryForm(category){
 editingCategoryId=category?.id||null;
 categoryForm.reset();
 document.getElementById('category-form-heading').textContent=category?'Manage '+category.label:'New category';
 categoryForm.elements.label.value=category?.label||'';
 categoryForm.elements.aliases.value=category?.aliases.join(', ')||'';
 const parent=categoryForm.elements.parentId;
 const hasChildren=editingCategoryId&&registryCategories.some(c=>c.parentId===editingCategoryId);
 parent.replaceChildren(new Option('No parent',''));
 if(!hasChildren)for(const c of registryCategories.filter(c=>!c.parentId&&c.id!==editingCategoryId))parent.add(new Option(c.label,c.id));
 parent.value=category?.parentId||'';
 categoryStatus.textContent='';
 categoryFormSurface.hidden=false;
 categoryForm.elements.label.focus();
}

document.getElementById('new-category').onclick=()=>{
 if(location.hash!=='#categories')history.pushState(null,'','#categories');
 openCategoryForm();
};
document.getElementById('cancel-category').onclick=()=>{
 categoryFormSurface.hidden=true;
 if(location.hash!=='#categories')location.hash='categories';
 document.getElementById('new-category').focus();
};
categoryForm.onsubmit=async event=>{
 event.preventDefault();
 const button=categoryForm.querySelector('[type=submit]');
 button.disabled=true;
 try{
  const values=new FormData(categoryForm);
  const label=values.get('label').trim();
  await request('/api/admin/categories',{action:editingCategoryId?'update':'create',...(editingCategoryId?{id:editingCategoryId}:{}),label,parentId:values.get('parentId')||null,aliases:values.get('aliases').split(',').map(a=>a.trim()).filter(Boolean)});
  categoryFormSurface.hidden=true;
  history.replaceState(null,'','#categories');
  categoryStatus.textContent='Category saved.';
  await loadCategories();
  await window.VouchAdminTables.refresh();
  document.getElementById('new-category').focus();
 }catch(error){categoryStatus.textContent=error.message;}
 finally{button.disabled=false;}
};
const refreshCategories=()=>loadCategories().catch(error=>{categoryStatus.textContent=error.message;});
document.addEventListener('vouch-admin-section',event=>{if(event.detail.section==='categories'){routeCategory();if(!registryCategories.length)refreshCategories();}});
refreshCategories();

let actionSummaryVersion=0;
let summariesLoaded=false,summaryFailures=false;
let actionSummaries=new Map();
async function loadActionSummaries(edits){
 const version=++actionSummaryVersion;
 const ids=edits.filter(e=>e.status!=='draft').map(e=>e.id);
 const loaded=new Map();
 let next=0;
 async function loadNext(){
  while(version===actionSummaryVersion&&next<ids.length){
   const id=ids[next++];
   try{
    const response=await fetch('/api/admin/summary?experiment='+encodeURIComponent(id));
    if(!response.ok)continue;
    loaded.set(id,await response.json());
   }catch{}
  }
 }
 await Promise.all(Array.from({length:Math.min(ids.length,6)},loadNext));
 if(version!==actionSummaryVersion)return;
 summaryFailures=loaded.size!==ids.length;
 summariesLoaded=true;
 actionSummaries=new Map(ids.flatMap(id=>{
  const old=actionSummaries.get(id), fresh=loaded.get(id);
  const result=old?.updatedAt>fresh?.updatedAt?old:fresh||old;
  return result?[[id,result]]:[];
 }));
 publishSummaryCounts();
}
function updateActionSummary(id,result){
 actionSummaries.set(id,result);
 publishSummaryCounts();
}
function publishSummaryCounts(){
 Admin.setCount('edits',[...actionSummaries.values()].reduce((total,s)=>total+Admin.lookupCount(s.nominations),0));
 renderHomeActions();
 renderExperimentOverview();
}
