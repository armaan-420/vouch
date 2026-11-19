globalThis.Admin = (() => {
 const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const plural = (n, one, many = one + 's') => n + ' ' + (n === 1 ? one : many);
 const statuses = {open:'Live', upcoming:'Scheduled', ended:'Closed', closed:'Closed', draft:'Draft', disabled:'Disabled'};
 const status = value => statuses[value] || 'Draft';
 const pill = value => '<span class="table-badge status-' + escape(value === 'ended' ? 'closed' : value) + '">' + status(value) + '</span>';
 const editState = (edit, now = Date.now()) => edit.status === 'draft' ? 'draft' : edit.disabled ? 'disabled' :
  edit.closed || edit.endsAt && Date.parse(edit.endsAt) <= now ? 'closed' :
  edit.startsAt && Date.parse(edit.startsAt) > now ? 'upcoming' : 'open';
 const eastern = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'});
 const easternDate = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'America/New_York'});
 const easternYear = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'});
 function scheduleText(edit, state = editState(edit), now = Date.now()) {
  if (state === 'upcoming') return 'Opens ' + eastern.format(new Date(edit.startsAt)) + ' ET';
  if (state === 'open' && edit.endsAt) {
   const hours=Math.max(1,Math.ceil((Date.parse(edit.endsAt)-now)/3600000));
   return 'Closes in ' + (hours<24 ? plural(hours,'hour') : plural(Math.ceil(hours/24),'day'));
  }
  if (state === 'closed' && edit.endsAt && Date.parse(edit.endsAt)<=now) {
   const end=easternYear.format(new Date(edit.endsAt));
   return edit.startsAt ? 'Ran ' + easternDate.format(new Date(edit.startsAt)) + ' – ' + end : 'Ended ' + end;
  }
  return '';
 }
 const tabs = ['overview','products','missing','community','settings'];
 function parseHash(hash) {
  const [path, query] = hash.replace(/^#/, '').split('?');
  const [base, ...parts] = path.split('/');
  const edit = ['experiments','experiments-panel'].includes(base);
  const explicitTab = edit && parts.length > 1 && tabs.includes(parts.at(-1));
  const tab = explicitTab ? parts.pop() : 'overview';
  let item = null;
  try { if (parts.length) item = decodeURIComponent(parts.join('/')); } catch {}
  return {base,item,tab,explicitTab,query:new URLSearchParams(query)};
 }
 const editLink = (id, tab = 'overview') => '#experiments/' + encodeURIComponent(id) + '/' + tab;
 const percent = (count, total) => total ? Math.round(count / total * 100) : 0;
 function funnel(steps, conversions = false, biggestDrop = -1) {
  const baseline = steps[0][1];
  return '<ol class="admin-funnel">' + steps.map(([label,count,extra=''],index) => {
   const share = percent(count,baseline), previous = steps[index-1]?.[1];
   return '<li'+(index===biggestDrop?' class="funnel-drop"':'')+'><span>'+escape(label)+'</span><strong>'+
    (baseline?count:'—')+'</strong><small>'+(baseline?share+'%':'No data yet')+
    (conversions&&previous?' <span aria-label="'+percent(count,previous)+'% of previous step">↓ '+percent(count,previous)+'%</span>':'')+
    '</small><span class="funnel-track" aria-hidden="true"><span style="width:'+Math.min(100,share)+'%"></span></span>'+extra+'</li>';
  }).join('') + '</ol>';
 }
 const libraryColumns = [
  ['name','Product',p=>p.name],
  ['votes','Votes',p=>p.voteCounts.total],
  ['yes','Vouch',p=>p.voteCounts.yes],
  ['maybe','Soft-Vouch',p=>p.voteCounts.maybe],
  ['pass','Pass',p=>p.voteCounts.pass],
  ['score','Score',p=>p.score==null?null:Number(p.score)],
  ['edits','Edits',p=>p.experiments.length],
  ['reviews','Product reviews',p=>p.reviewCounts?.total||0]
 ];
 function libraryRows(products,{query='',category='',includeUnvoted=false,sort='votes',direction=-1,tags={}}={}) {
  const col=libraryColumns.find(([key])=>key===sort)||libraryColumns[1], get=col[2];
  return products.filter(p=>
   (includeUnvoted||p.voteCounts.total||p.reviewCounts?.total)&&
   (!category||(p.categoryId||p.category)===category)&&
   [p.brand,p.name,p.category,...p.tagIds.map(id=>tags[id]?.label),...(p.communityTags||[]).map(t=>t.label)].join(' ').toLowerCase().includes(query.trim().toLowerCase())
  ).sort((a,b)=>{
   const x=get(a),y=get(b);
   if(x==null||y==null)return (x==null)-(y==null)||a.name.localeCompare(b.name);
   return direction*(typeof x==='string'?x.localeCompare(y):x-y)||a.name.localeCompare(b.name);
  });
 }
 const lookupCount = groups => groups.filter(group => !group.reviewed && !group.dismissed).length;
 const metric = (label, value, {sub = '', filter, active = false, extra = '', description = ''} = {}) => {
  const content = '<span>' + escape(label) + '</span><strong>' + escape(value) + '</strong>' + (sub ? '<small>' + escape(sub) + '</small>' : '') + extra;
  return filter === undefined ? '<div class="metric"'+(description?' title="'+escape(description)+'"':'')+'>' + content + '</div>' : '<button class="metric" type="button" data-metric-filter="' + escape(filter) + '" aria-pressed="' + active + '">' + content + '</button>';
 };
 const counts = {};
 function setCount(type, count) {
  if (counts[type] === count) return;
  counts[type] = count;
  document.querySelectorAll('[data-action-count="' + type + '"]').forEach(badge => {
   badge.innerHTML = '<span aria-hidden="true">' + count + '</span><span class="sr-only">' + count + ' need action</span>';
   badge.hidden = !count;
  });
  document.dispatchEvent(new Event('vouch-admin-counts'));
 }
 function refresh(id, loading, succeeded = false) {
  const button = document.getElementById(id);
  button.setAttribute('aria-busy', String(loading));
  button.setAttribute('aria-disabled', String(loading));
  if (succeeded) button.nextElementSibling.textContent = 'Updated ' + new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
 }
 let menuId = 0;
 function menu(label, items, destructive = '') {
  const id = 'admin-menu-' + ++menuId;
  return '<button class="people-menu-trigger" type="button" popovertarget="' + id + '" aria-label="' + escape(label) + '" aria-haspopup="menu" aria-expanded="false">⋯</button><div id="' + id + '" class="people-menu" popover role="menu" aria-label="' + escape(label) + '">' + items + (destructive ? (items ? '<hr role="separator">' : '') + '<div class="menu-danger" role="group">' + destructive + '</div>' : '') + '</div>';
 }
 const triggerFor = menu => document.querySelector('[popovertarget="' + menu.id + '"]');
 const menuItems = menu => [...menu.querySelectorAll('button:not(:disabled)')];
 document.addEventListener('beforetoggle', event => {
  const menu = event.target;
  if (!menu.matches?.('.people-menu') || event.newState !== 'open') return;
  const box = triggerFor(menu).getBoundingClientRect();
  menu.style.left = Math.max(8, Math.min(box.right - 240, window.innerWidth - 248)) + 'px';
  menu.style.top = box.bottom + 6 + 'px';
  requestAnimationFrame(() => {
   if (!menu.matches(':popover-open')) return;
   if (menu.getBoundingClientRect().bottom > window.innerHeight - 8) menu.style.top = Math.max(8, box.top - 6 - menu.offsetHeight) + 'px';
   menuItems(menu).at(menu.dataset.edge==='last'?-1:0)?.focus();
   delete menu.dataset.edge;
  });
 }, true);
 document.addEventListener('toggle', event => {
  if (event.target.matches?.('.people-menu,#system-status-panel')) triggerFor(event.target)?.setAttribute('aria-expanded', String(event.newState === 'open'));
 }, true);
 document.addEventListener('keydown', event => {
  const trigger = event.target.closest('.people-menu-trigger');
  if (trigger && ['ArrowDown','ArrowUp'].includes(event.key)) {
   event.preventDefault();
   const menu=document.getElementById(trigger.getAttribute('popovertarget'));
   menu.dataset.edge=event.key==='ArrowUp'?'last':'first';
   menu.showPopover();
   return;
  }
  const menu = event.target.closest('.people-menu');
  if (!menu) return;
  const buttons = menuItems(menu), index = buttons.indexOf(event.target);
  if (event.key === 'Escape') {
   event.preventDefault();
   menu.hidePopover();
   triggerFor(menu)?.focus();
  } else if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
   event.preventDefault();
   buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  } else if (event.key === 'Tab') {
   menu.hidePopover();
   triggerFor(menu)?.focus();
  }
 });
 document.addEventListener('click', event => {
  const menu = event.target.closest('.people-menu');
  if (menu && event.target.closest('button') && menu.matches(':popover-open')) {
   menu.hidePopover();
   if (!document.querySelector('dialog[open]')) triggerFor(menu)?.focus();
  }
 });
 const problems = new Map();
 function system(key, detail, problem = '', warning = false) {
  document.getElementById('system-' + key).textContent = detail;
  problems.set(key, Boolean(problem)||warning);
  document.getElementById('system-status').classList.toggle('has-problem', [...problems.values()].some(Boolean));
  const banner = document.getElementById(key + '-banner');
  banner.textContent = problem;
  banner.hidden = !problem;
 }
 return {escape, plural, status, pill, editState, scheduleText, parseHash, editLink, funnel, percent, libraryColumns, libraryRows, lookupCount, metric, counts, setCount, refresh, menu, system};
})();
