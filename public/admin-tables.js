(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let inventory={experiments:[],products:[]},page=0,version=0,sort="votes",direction=-1;
 const badge=Admin.pill;
 const date=s=>s?new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
 const table=(caption,heads,rows)=>'<div class="admin-table-wrap" tabindex="0" role="region" aria-label="'+caption+'"><table class="admin-table"><caption class="sr-only">'+caption+'</caption><thead><tr>'+heads.map(h=>typeof h==='string'?'<th scope="col">'+h+'</th>':h.html).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div><p class="table-scroll-hint">Scroll across to see all columns →</p>';
 const productTags=p=>{const assigned=(p.tagIds||[]).map(id=>tagDefinitions[id]?.label||id);return '<div class="admin-product-tag-summary"><h3>Product tags</h3><p><strong>Organizer:</strong> '+(assigned.length?assigned.map(esc).join(' · '):'None assigned')+'</p><p><strong>Community:</strong> '+((p.communityTags||[]).length?p.communityTags.map(t=>esc(t.label)+' ('+Number(t.count)+')').join(' · '):'No community tags yet')+'</p><p class="table-note">Community counts reflect each browser’s current tag selections. Manage organizer tags below.</p></div>'};
 const tagSummary=p=>[...(p.tagIds||[]).map(id=>tagDefinitions[id]?.label||id),...(p.communityTags||[]).map(t=>t.label+' ('+t.count+')')].filter((x,i,all)=>all.indexOf(x)===i).map(esc).join(' · ')||'—';
 const sourceLink=e=>'#experiments/'+encodeURIComponent(e.id);
 function lifecycleButton(e,action,label,menu=true){
  return '<button type="button" '+(menu?'role="menuitem"':'class="admin-secondary danger-action"')+' data-lifecycle="'+action+'" data-experiment-id="'+esc(e.id)+'">'+label+'</button>';
 }
 function lifecycleMenu(e){
  const disabled=e.status==='disabled';
  return Admin.menu('Actions for '+e.title,disabled?lifecycleButton(e,'reactivate','Reactivate'):'',(!disabled?lifecycleButton(e,'disable','Disable'):'')+lifecycleButton(e,'delete','Delete'));
 }
 function renderExperiments(){const q=document.getElementById('experiment-table-query').value.toLowerCase(),rows=inventory.experiments.filter(e=>(e.title+' '+e.category+' '+e.id).toLowerCase().includes(q));document.getElementById('experiment-table-count').textContent=Admin.plural(rows.length,'Edit');
  document.getElementById('experiment-table').innerHTML=table('Edits',['Edit','Category','Status','Products','Votes','Schedule','Actions'],rows.map(e=>{const href=e.status==='draft'&&e.origin?.suggestionKey?'#suggestions-panel/'+encodeURIComponent(e.origin.suggestionKey):sourceLink(e);return '<tr data-row-href="'+href+'"><td><a class="table-primary" href="'+href+'">'+esc(e.title)+'</a><small>/'+esc(e.id)+'</small></td><td>'+esc(e.category)+'</td><td>'+badge(e.status)+'</td><td>'+e.productCount+'</td><td>'+e.votes+'</td><td>'+date(e.startsAt)+(e.endsAt?' – '+date(e.endsAt):'')+'</td><td>'+(e.status!=='draft'?lifecycleMenu(e):'<a href="'+href+'">Review draft</a>')+'</td></tr>';}).join('')||'<tr><td colspan="7" class="table-empty">No Edits match your search.</td></tr>');
 }
 const links=p=>'#product-library/'+encodeURIComponent(p.id);
 const thumb=p=>p.image?'<img class="library-thumb" src="'+esc(p.image)+'" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer">':'<span class="library-thumb library-thumb-empty" aria-hidden="true"></span>';
 const productName=p=>'<div class="library-product-name">'+thumb(p)+'<span><a class="table-primary" href="'+links(p)+'">'+esc(p.name)+'</a><small>'+esc(p.brand||'Brand unconfirmed')+'</small></span></div>';
 const category=document.getElementById('library-category');
 const cardSort=document.getElementById('library-card-sort');
 const sortDirection=document.getElementById('library-sort-direction');
 cardSort.replaceChildren(...Admin.libraryColumns.map(([key,label])=>new Option(label,key)));
 function updateLibraryCategories(){
  const current=category.value,options=new Map(inventory.products.map(p=>[p.categoryId||p.category,p.category]));
  category.replaceChildren(new Option('All categories',''),...[...options].sort((a,b)=>a[1].localeCompare(b[1])).map(([id,label])=>new Option(label,id)));
  if(options.has(current))category.value=current;
 }
 function renderProducts(){
  const query=document.getElementById('library-query').value,includeUnvoted=document.getElementById('library-include-unvoted').checked;
  const rows=Admin.libraryRows(inventory.products,{query,includeUnvoted,category:category.value,sort,direction,tags:tagDefinitions});
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/25)-1));
  cardSort.value=sort;
  sortDirection.textContent=direction<0?'Descending ↓':'Ascending ↑';
  sortDirection.setAttribute('aria-label',direction<0?'Sort ascending':'Sort descending');
  const header=key=>{
   const label=Admin.libraryColumns.find(([column])=>column===key)[1];
   return {html:'<th scope="col"'+(sort===key?' aria-sort="'+(direction<0?'descending':'ascending')+'"':'')+'><button type="button" data-library-sort="'+key+'">'+label+(sort===key?' <span aria-hidden="true">'+(direction<0?'↓':'↑')+'</span>':'')+'</button></th>'};
  };
  const visible=rows.slice(page*25,page*25+25);
  const empty=query||category.value?'No matching products.':'No products have voting or review activity yet. Turn on “Include unvoted products” to browse stored products.';
  const headers=[header('name'),'Category','Tags',...Admin.libraryColumns.slice(1).map(([key])=>header(key))];
  document.getElementById('library-results').innerHTML=table('Product voting activity',headers,visible.map(p=>
   '<tr data-row-href="'+links(p)+'"><td>'+productName(p)+'</td><td>'+esc(p.category)+'</td><td class="admin-tag-cell">'+tagSummary(p)+'</td><td><strong>'+p.voteCounts.total+'</strong></td><td>'+p.voteCounts.yes+'</td><td>'+p.voteCounts.maybe+'</td><td>'+p.voteCounts.pass+'</td><td>'+(p.score||'Unrated')+'</td><td>'+p.experiments.length+'</td><td>'+(p.reviewCounts?.total||0)+'</td></tr>'
  ).join('')||'<tr><td colspan="10" class="table-empty">'+empty+'</td></tr>')+
   '<div class="library-cards">'+(visible.map(p=>'<article data-row-href="'+links(p)+'">'+productName(p)+'<p>'+esc(p.category)+'</p><p>'+Admin.plural(p.voteCounts.total,'vote')+' · Score '+(p.score||'—')+'</p></article>').join('')||'<p>'+empty+'</p>')+'</div>';
  document.getElementById('library-pagination').innerHTML='<span>'+Admin.plural(rows.length,'product')+' · '+(rows.length?page*25+1:0)+'–'+Math.min((page+1)*25,rows.length)+'</span><div><button type="button" data-page="-1" '+(!page?'disabled':'')+'>Previous</button><button type="button" data-page="1" '+((page+1)*25>=rows.length?'disabled':'')+'>Next</button></div>';
 }
 function route(){
  const {base:section,item:id,tab,explicitTab}=Admin.parseHash(location.hash);
  const experimentSection=['experiments','experiments-panel'].includes(section);
  const detail=experimentSection&&id&&id!=='new';
  document.getElementById('experiment-list-view').hidden=experimentSection&&!!id;
  document.getElementById('experiment-detail-view').hidden=!detail;
  document.getElementById('experiment-create-view').hidden=!experimentSection||id!=='new';
  document.querySelector('#experiments-panel > .page-heading').hidden=experimentSection&&!!id;
  document.querySelector('#library-panel > .page-heading').hidden=['product-library','library-panel'].includes(section)&&!!id;
  if(experimentSection&&id==='new')document.getElementById('create-experiment-details').open=true;
  if(detail){
   const e=inventory.experiments.find(e=>e.id===id);
   const config=allEdits.find(e=>e.id===id);
   const draft=e?.status==='draft';
   const reviewLink=e?.origin?.suggestionKey?'#suggestions-panel/'+encodeURIComponent(e.origin.suggestionKey):null;
   if(draft&&reviewLink&&(!explicitTab||tab!=='overview')){location.replace(reviewLink);return;}
   const draftOverview=document.getElementById('experiment-draft-overview');
   const draftReview=document.getElementById('experiment-draft-review');
   draftOverview.hidden=!draft;
   draftReview.hidden=!reviewLink;
   if(reviewLink)draftReview.href=reviewLink;
   document.getElementById('experiment-link').hidden=!e||draft;
   document.getElementById('experiment-detail-title').textContent=e?.title||config?.title||'Edit not found';
   document.getElementById('admin-detail-breadcrumb').textContent=' / '+(e?.title||config?.title||id);
   document.getElementById('experiment-detail-state').innerHTML=e?Admin.pill(e.status)+(config?' '+esc(Admin.scheduleText(config)):''):'';
   document.getElementById('counted-vote-browsers').textContent=e?Admin.plural(e.participants,'browser with a counted vote','browsers with counted votes'):'';
   document.getElementById('experiment-detail-meta').textContent=e?e.category+' · '+Admin.plural(e.productCount,'product')+' · '+Admin.plural(e.votes,'vote'):'';
   const manageable=e&&e.status!=='draft';
   const actions=document.getElementById('experiment-detail-actions');
   const actionState=manageable?id+':'+e.status:'';
   if(actions.dataset.state!==actionState){
    actions.dataset.state=actionState;
    actions.innerHTML=manageable?lifecycleMenu(e):'';
    document.getElementById('experiment-danger-actions').innerHTML=manageable?
     lifecycleButton(e,e.status==='disabled'?'reactivate':'disable',e.status==='disabled'?'Reactivate':'Disable',false)+lifecycleButton(e,'delete','Delete',false):'';
   }
   document.querySelector('#experiment-detail-view .experiment-tabs').hidden=!manageable;
   if(!manageable)document.querySelectorAll('#experiment-detail-view [role=tabpanel]').forEach(p=>p.hidden=true);
   if(manageable){
    if(selectedExperiment!==id){selectedExperiment=id;updateExperimentUrl();selectExperiment();}
    window.VouchExperimentProducts?.open(id,tab);
   }
  }
  const productSection=['product-library','library-panel'].includes(section);document.getElementById('library-list-view').hidden=productSection&&!!id;document.getElementById('library-detail-view').hidden=!productSection||!id;
  if(productSection&&id){taggedProduct=inventory.products.find(p=>p.id===id)||null;document.getElementById('product-tag-form').hidden=!taggedProduct;
   if(!taggedProduct){document.getElementById('product-vote-detail').innerHTML='<h2>Product not found</h2>';return;}
   const p=taggedProduct;document.getElementById('admin-detail-breadcrumb').textContent=' / '+p.name;document.getElementById('product-vote-detail').innerHTML='<p class="eyebrow">'+esc(p.category)+'</p><h1 tabindex="-1">'+esc(p.brand||'')+' — '+esc(p.name)+'</h1><div class="product-summary-grid">'+[['Votes',p.voteCounts.total],['Vouch',p.voteCounts.yes],['Soft-Vouch',p.voteCounts.maybe],['Pass',p.voteCounts.pass],['Score',p.score||'Unrated']].map(([k,v])=>'<div><small>'+k+'</small><strong>'+v+'</strong></div>').join('')+'</div>'+productTags(p)+(p.reviewCounts?.total?'<h3>Product-page reviews</h3><div class="product-summary-grid">'+[['Reviews',p.reviewCounts.total],['Vouch',p.reviewCounts.yes],['Soft-Vouch',p.reviewCounts.maybe],['Pass',p.reviewCounts.pass],['Review score',p.reviewScore||'Unrated']].map(([label,value])=>'<div><small>'+label+'</small><strong>'+value+'</strong></div>').join('')+'</div>':'')+'<h3>Edit activity</h3>'+table('Votes by Edit',['Edit','Votes','Vouch / Soft-Vouch / Pass','Score'],p.experiments.map(e=>'<tr data-row-href="'+sourceLink(e)+'"><td><a class="table-primary" href="'+sourceLink(e)+'">'+esc(e.title)+'</a></td><td>'+e.counts.total+'</td><td>'+e.counts.yes+' / '+e.counts.maybe+' / '+e.counts.pass+'</td><td>'+(e.score||'Unrated')+'</td></tr>').join('')||'<tr><td colspan="4">No votes yet.</td></tr>')+'<p class="table-note">Counts include each Edit’s active votes. The combined total deduplicates browsers across Edits.</p>';
   document.getElementById('tag-product-name').textContent=p.brand+' — '+p.name;document.getElementById('tag-product-category').value=p.category;renderTagOptions();
  }
 }
 async function refresh(){const current=++version;try{const [data,tags]=await Promise.all([request('/api/admin/inventory'),request('/api/admin/tags')]);if(current!==version)return;inventory=data;tagDefinitions=tags.definitions;updateLibraryCategories();document.dispatchEvent(new CustomEvent('vouch-admin-inventory',{detail:data}));renderExperiments();renderProducts();route();}catch(e){document.getElementById('experiment-table').innerHTML='<p role="alert">'+esc(e.message)+'</p>';document.getElementById('library-results').innerHTML='<p role="alert">'+esc(e.message)+'</p>';}}
 document.getElementById('experiments-panel').addEventListener('click',async event=>{const button=event.target.closest('[data-lifecycle]');if(!button)return;const id=button.dataset.experimentId,action=button.dataset.lifecycle,e=inventory.experiments.find(e=>e.id===id);if(!e)return;
  const confirmed=await window.VouchExperimentProducts.confirmLifecycle(e,action);if(!confirmed)return;button.disabled=true;const status=document.getElementById(document.getElementById('experiment-detail-view').hidden?'experiment-actions-status':'status');try{await request('/api/admin/experiment-lifecycle',{id,action,...(action==='delete'?{confirmation:id}:{})});if(action==='delete'&&!document.getElementById('experiment-detail-view').hidden)location.hash='experiments';await loadExperiments();await refresh();document.getElementById(action==='delete'?'experiment-actions-status':status.id).textContent=action==='delete'?'Edit permanently deleted.':action==='disable'?'Edit disabled. Its page is offline and its data is kept.':'Edit reactivated.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
 document.getElementById('experiment-table-query').oninput=renderExperiments;
 function sortLibrary(key){
  direction=sort===key?-direction:key==='name'?1:-1;
  sort=key;page=0;renderProducts();
 }
 document.getElementById('library-results').onclick=event=>{
  const button=event.target.closest('[data-library-sort]');if(!button)return;
  const left=button.closest('.admin-table-wrap').scrollLeft,key=button.dataset.librarySort;
  sortLibrary(key);
  const next=document.querySelector('[data-library-sort="'+key+'"]');
  next.closest('.admin-table-wrap').scrollLeft=left;next.focus({preventScroll:true});
 };
 cardSort.onchange=()=>sortLibrary(cardSort.value);
 sortDirection.onclick=()=>sortLibrary(sort);
 category.onchange=()=>{page=0;renderProducts();};
 const toggle=document.getElementById('library-tag-toggle'),tagPanel=document.getElementById('new-tag-panel');
 toggle.onclick=()=>{
  tagPanel.hidden=!tagPanel.hidden;
  toggle.setAttribute('aria-expanded',String(!tagPanel.hidden));
  if(!tagPanel.hidden)document.getElementById('new-tag-label').focus();
 };
 tagPanel.onkeydown=event=>{if(event.key==='Escape'){toggle.click();toggle.focus();}};
 document.getElementById('library-query').oninput=()=>{page=0;renderProducts();};document.getElementById('library-include-unvoted').onchange=()=>{page=0;renderProducts();};document.getElementById('library-search').onsubmit=e=>{e.preventDefault();page=0;renderProducts();};
 document.getElementById('library-pagination').onclick=e=>{const b=e.target.closest('[data-page]');if(b&&!b.disabled){page+=Number(b.dataset.page);renderProducts();}};
 document.addEventListener('click',e=>{const row=e.target.closest('[data-row-href]');if(row&&!e.target.closest('a,button,input,select,label'))location.hash=row.dataset.rowHref;});
 document.addEventListener('vouch-admin-section',()=>route());document.addEventListener('vouch-experiments-loaded',refresh);document.addEventListener('vouch-suggestion-changed',()=>{loadExperiments().catch(()=>{});});window.VouchAdminTables={refresh};refresh();
})();
