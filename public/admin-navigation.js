(()=>{
 const phone = document.getElementById('admin-phone-menu');
 const trigger = document.getElementById('admin-phone-menu-trigger');
 const phoneWidth = matchMedia('(max-width: 580px)');
 phone.querySelector('nav').append(...[...document.querySelectorAll('.admin-sidebar [data-admin-nav]')].map(link=>link.cloneNode(true)));
 document.getElementById('admin-phone-lock').onclick=()=>document.getElementById('admin-lock').click();
 trigger.onclick=()=>{phone.showModal();trigger.setAttribute('aria-expanded','true');phone.querySelector('[aria-current="page"]')?.focus();};
 document.getElementById('admin-menu-close').onclick=()=>phone.close();
 phone.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');if(phoneWidth.matches)trigger.focus();});
 phone.addEventListener('click',event=>{if(event.target===phone||event.target.closest('a'))phone.close();});
 phone.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...phone.querySelectorAll('a[href],button:not(:disabled)')];
  const boundary=event.shiftKey?controls[0]:controls.at(-1);
  if(document.activeElement===boundary){event.preventDefault();(event.shiftKey?controls.at(-1):controls[0]).focus();}
 });
 phoneWidth.addEventListener('change',()=>{if(!phoneWidth.matches&&phone.open)phone.close();});
 const panels=[...document.querySelectorAll('[data-admin-panel]')],links=[...document.querySelectorAll('[data-admin-nav]')];
 const sections={pilot:{name:'Wharton pilot',hash:'wharton-pilot'},categories:{name:'Categories',hash:'categories'},accounts:{name:'People',hash:'accounts'},home:{name:'Home',hash:'home'},experiments:{name:'Edits',hash:'experiments'},library:{name:'Product Library',hash:'product-library'},suggestions:{name:'Suggestions',hash:'suggestions-panel'},feedback:{name:'Feedback',hash:'feedback'}};
 const aliases={'wharton-pilot':'pilot',categories:'categories','accounts':'accounts','people':'accounts','home':'home','home-panel':'home','experiments':'experiments','experiments-panel':'experiments','product-library':'library','library-panel':'library','suggestions':'suggestions','suggestions-panel':'suggestions','feedback':'feedback'};
 let previous;
 function show(focus=false){
  const {base,item,tab,query}=Admin.parseHash(location.hash),section=aliases[base]||'home';
  const tabChange=section==='experiments'&&item&&previous?.section===section&&previous?.item===item;
  previous={section,item};
  panels.forEach(panel=>panel.hidden=panel.dataset.adminPanel!==section);
  links.forEach(link=>{const active=link.dataset.adminNav===section;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  document.getElementById('admin-phone-section').textContent=sections[section].name;
  const list=document.getElementById('admin-section-name');
  const crumb=document.getElementById('admin-detail-breadcrumb');
  list.textContent=sections[section].name;
  crumb.hidden=true;
  if(item&&item!=='new'&&['experiments','library'].includes(section)){
   const link=document.createElement('a');link.href='#'+sections[section].hash;link.textContent=sections[section].name;
   list.replaceChildren(link);
   crumb.textContent=' / '+item;
   crumb.hidden=false;
  }
  document.title='Vouch — '+sections[section].name;
  document.body.dataset.adminSection=section;
  document.dispatchEvent(new CustomEvent('vouch-admin-section',{detail:{section,item,tab,query}}));
  if(focus){
   if(tabChange){document.getElementById('experiment-tab-'+tab)?.focus({preventScroll:true});return;}
   if(section==='categories'&&item)return;
   [...(panels.find(panel=>!panel.hidden)?.querySelectorAll('h1,h2[tabindex]')||[])].find(heading=>!heading.closest('[hidden]'))?.focus({preventScroll:true});
   window.scrollTo({top:0,behavior:'instant'});
  }
 }
 document.querySelector('.admin-skip-link').onclick=e=>{e.preventDefault();document.getElementById('admin-content').focus();};
 window.addEventListener('hashchange',()=>show(true));

 show();
})();
