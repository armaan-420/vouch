(()=>{
 const panels=[...document.querySelectorAll('[data-admin-panel]')],links=[...document.querySelectorAll('[data-admin-nav]')];
 const sections={accounts:{name:'People',hash:'accounts'},home:{name:'Home',hash:'home'},experiments:{name:'Experiments',hash:'experiments'},library:{name:'Product Library',hash:'product-library'},suggestions:{name:'Suggestions',hash:'suggestions-panel'},feedback:{name:'Feedback',hash:'feedback'}};
 const aliases={'accounts':'accounts','people':'accounts','home':'home','home-panel':'home','experiments':'experiments','experiments-panel':'experiments','product-library':'library','library-panel':'library','suggestions':'suggestions','suggestions-panel':'suggestions','feedback':'feedback'};
 function show(focus=false){const [base,...parts]=location.hash.slice(1).split('/'),section=aliases[base]||'home';let item=null;try{item=parts.length?decodeURIComponent(parts.join('/')):null;}catch{}
  panels.forEach(panel=>panel.hidden=panel.dataset.adminPanel!==section);
  links.forEach(link=>{const active=link.dataset.adminNav===section;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  document.getElementById('admin-section-name').textContent=sections[section].name;
  document.getElementById('admin-experiment-context').hidden=section!=='home';
  document.title='Vouch — '+sections[section].name;
  document.body.dataset.adminSection=section;
  if(focus){panels.find(panel=>!panel.hidden)?.querySelector('h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  document.dispatchEvent(new CustomEvent('vouch-admin-section',{detail:{section,item}}));
 }
 document.querySelector('.admin-skip-link').onclick=e=>{e.preventDefault();document.getElementById('admin-content').focus();};
 window.addEventListener('hashchange',()=>show(true));

 show();
})();
