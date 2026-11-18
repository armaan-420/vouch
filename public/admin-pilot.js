(() => {
  const panel=document.querySelector('[data-admin-panel="pilot"]');
  const category=panel.querySelector('#pilot-category'),since=panel.querySelector('#pilot-since');
  const status=panel.querySelector('[role="status"]'),content=panel.querySelector('[data-pilot-report]');
  const csv=panel.querySelector('[data-pilot-csv]');
  const endpoint='/api/admin/pilot-metrics';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeZone:'America/New_York'});
  let data,sequence=0;
  async function request(payload){
    const response=await fetch(endpoint,payload===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Pilot metrics could not load.');
    return result;
  }
  const value=(number,unit)=>number==null?'—':number+(unit==='percent'?'%':'');
  function metricCard(row){
    const target=data.settings.targets[row.key];
    const comparison=target!=null&&row.value!=null?row.value>=target?'On track':'Below target':'';
    return `<article class="pilot-metric">
      <h3>${esc(row.label)}</h3>
      <div class="pilot-metric-result"><p class="pilot-number">${value(row.value,row.unit)}</p>
      <span class="pilot-target-status" data-on-track="${comparison==='On track'}">${comparison}</span></div>
      ${Object.hasOwn(row,'conversion')?`<div class="pilot-funnel-bar" aria-hidden="true"><span style="width:${row.progress}%"></span></div><small>${row.conversion==null?'—':row.conversion+'% of previous step'}</small>`:''}
      ${row.percentOfCompleters==null?'':`<small>${value(row.percentOfCompleters,'percent')} of completers</small>`}
      <p class="pilot-definition">${esc(row.definition)}</p>
      <label class="pilot-target">Target <input type="number" inputmode="decimal" min="0" step="any" data-target="${esc(row.key)}" aria-label="${esc(row.label)} target${row.unit==='percent'?' in percent':''}" value="${esc(target)}"></label>
    </article>`;
  }
  function render(){
    const report=data.reports[category.value]||data.reports.all;
    content.innerHTML=`<section class="pilot-report-section"><h2>Signup funnel</h2><ol class="pilot-funnel">${report.funnel.map(row=>'<li>'+metricCard({...row,progress:Math.min(100,100*row.value/Math.max(1,report.funnel[0].value))})+'</li>').join('')}</ol></section>`+
      report.sections.map(section=>`<section class="pilot-report-section"><h2>${esc(section.title)}</h2><div class="pilot-metric-grid">${section.metrics.map(metricCard).join('')}</div>${
        section.title==='Trust signal'&&report.followUps.length?`<h3>Recent pulse follow-ups</h3><ul class="pilot-followups">${report.followUps.map(({followUp,answer,at})=>`<li><p>${esc(followUp)}</p><small>${esc(answer)} · <time datetime="${esc(at)}">${esc(date.format(new Date(at)))}</time></small></li>`).join('')}</ul>`:''
      }</section>`).join('');
  }
  async function load(){
    const id=++sequence;
    status.textContent='Loading pilot metrics…';
    try{
      const next=await request();
      if(id!==sequence)return;
      const current=category.value;
      data=next;
      category.replaceChildren(new Option('All','all'),...data.categories.map(c=>new Option(c.name,c.id)));
      category.value=Object.hasOwn(data.reports,current)?current:'all';
      since.value=data.since||'';
      csv.disabled=false;
      render();
      status.textContent='';
    }catch(error){if(id===sequence)status.textContent=error.message;}
  }
  category.addEventListener('change',()=>{if(data)render();});
  since.addEventListener('change',async()=>{
    if(!since.validity.valid)return;
    try{await request({since:since.value||null});await load();}catch(error){status.textContent=error.message;}
  });
  content.addEventListener('change',async event=>{
    const input=event.target.closest('[data-target]');
    if(!input||!input.validity.valid)return;
    const key=input.dataset.target;
    try{
      data.settings=await request({target:{key,value:input.value===''?null:input.valueAsNumber}});
      const list=data.reports[category.value];
      const row=[...list.funnel,...list.sections.flatMap(section=>section.metrics)].find(metric=>metric.key===key);
      const label=input.closest('.pilot-metric').querySelector('.pilot-target-status');
      const target=data.settings.targets[key];
      const met=row?.value!=null&&target!=null&&row.value>=target;
      label.dataset.onTrack=met;
      label.textContent=row?.value==null||target==null?'':met?'On track':'Below target';
      status.textContent='Target saved.';
    }catch(error){status.textContent=error.message;}
  });
  csv.addEventListener('click',()=>{
    const rows=[['Category','Since','Section','Metric','Value','Unit','Percent of previous step','Target','Definition','Percent of completers']];
    const names=new Map(data.categories.map(c=>[c.id,c.name]));
    for(const [id,report] of Object.entries(data.reports)){
      for(const section of [{title:'Signup funnel',metrics:report.funnel},...report.sections]){
        for(const m of section.metrics)rows.push([names.get(id)||'All',data.since,section.title,m.label,m.value,m.unit,m.conversion,data.settings.targets[m.key],m.definition,m.percentOfCompleters]);
      }
    }
    const literal=rows.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([literal],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;
    link.download='wharton-pilot-metrics.csv';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  document.addEventListener('vouch-admin-section',event=>{if(event.detail.section==='pilot')load();});
  if(document.body.dataset.adminSection==='pilot')load();
})();
