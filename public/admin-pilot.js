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
  const toggle=panel.querySelector('[data-pilot-targets]');
  const value=(number,unit)=>number==null?'—':number+(unit==='percent'?'%':'');
  const storageKey='vouch.admin.pilot.sections';
  let sectionsOpen={};
  try { sectionsOpen=JSON.parse(localStorage.getItem(storageKey))||{}; } catch {}
  toggle.onclick=()=>{
    const editing=toggle.getAttribute('aria-pressed')!=='true';
    toggle.setAttribute('aria-pressed',String(editing));
    toggle.textContent=editing?'Done':'Set targets';
    panel.classList.toggle('pilot-editing-targets',editing);
  };
  function targetText(row){
    const target=data.settings.targets[row.key];
    const comparison=target!=null&&row.value!=null?row.value>=target?'On track':'Below target':'';
    return target==null?'':'Target '+value(target,row.unit)+(comparison?' · '+comparison:'');
  }
  const targetSummary=row=>'<small data-target-summary="'+esc(row.key)+'" class="pilot-target-summary">'+esc(targetText(row))+'</small>';
  const targetInput=row=>'<label class="pilot-target">Target for '+esc(row.label)+'<input type="number" inputmode="decimal" min="0" step="any" data-target="'+esc(row.key)+'" value="'+esc(data.settings.targets[row.key])+'"></label>';
  function metricCard(row){
    const sub=row.value==null?'No data yet':row.percentOfCompleters==null?'':value(row.percentOfCompleters,'percent')+' of completers';
    return Admin.metric(row.label,value(row.value,row.unit),{sub,description:row.definition,extra:targetSummary(row)+targetInput(row)});
  }
  const cards=metrics=>'<div class="metrics">'+metrics.map(metricCard).join('')+'</div>';
  const extras=metrics=>'<div class="pilot-extra-targets">'+metrics.map(targetInput).join('')+'</div>';
  function pulseChart(section,followUps){
    const answers=['yes','maybe','no'].map(key=>{
      const count=section.metrics.find(row=>row.key==='pulse-count-'+key);
      const rate=section.metrics.find(row=>row.key==='pulse-'+key);
      return [key,key[0].toUpperCase()+key.slice(1),count.value,[count,rate]];
    });
    const total=answers.reduce((sum,[,,count])=>sum+count,0);
    const trust=section.metrics[0];
    return '<div class="pilot-trust">'+cards([trust])+'<div class="pilot-pulse"><h3>Pulse answers</h3>'+
     (total?'<div class="pilot-pulse-track" aria-hidden="true">'+answers.map(([key,,count])=>'<span class="pulse-'+key+'" style="flex:'+count+'"></span>').join('')+'</div>'+
     '<ul>'+answers.map(([key,label,count,targets])=>'<li><i class="pulse-'+key+'" aria-hidden="true"></i>'+label+' '+count+' · '+Admin.percent(count,total)+'%'+targets.map(targetSummary).join('')+'</li>').join('')+'</ul><p>'+Admin.plural(total,'pulse answer')+'</p>':'<p>— <small>No data yet</small></p>')+
     '</div></div>'+extras(section.metrics.slice(1))+
     (followUps.length?'<h3>Recent pulse follow-ups</h3><ul class="pilot-followups">'+followUps.map(({followUp,answer,at})=>'<li><p>'+esc(followUp)+'</p><small>'+esc(answer)+' · <time datetime="'+esc(at)+'">'+esc(date.format(new Date(at)))+'</time></small></li>').join('')+'</ul>':'');
  }
  function spread(section){
    const methods=['native','download','copy_link'],kinds=['picks','winner','leaderboard','vouch'];
    const matrix=kinds.map(kind=>methods.map(method=>section.metrics.find(row=>row.key==='share-'+kind+'-'+method)));
    const sum=values=>values.reduce((total,n)=>total+n,0);
    return cards(section.metrics.slice(0,5))+
     '<div class="admin-table-wrap" tabindex="0" role="region" aria-label="Shares by card and method"><table class="admin-table"><caption class="sr-only">Shares by card and method</caption><thead><tr><th scope="col">Share card</th><th scope="col">Native</th><th scope="col">Download</th><th scope="col">Copy link</th><th scope="col">Total</th></tr></thead><tbody>'+
     kinds.map((kind,i)=>'<tr><th scope="row">'+kind[0].toUpperCase()+kind.slice(1)+'</th>'+matrix[i].map(row=>'<td>'+row.value+targetSummary(row)+'</td>').join('')+'<td>'+sum(matrix[i].map(row=>row.value))+'</td>'+'</tr>').join('')+
     '</tbody><tfoot><tr><th scope="row">Total</th>'+[...methods.map((_,i)=>sum(matrix.map(rows=>rows[i].value))),sum(matrix.flat().map(row=>row.value))].map(n=>'<td>'+n+'</td>').join('')+'</tr></tfoot></table></div>'+extras(section.metrics.slice(5));
  }
  function sectionSummary(section){
    const keys={'Trust signal':'trust','Depth':'depth-3','Return rate':'return-week','Spread':'shares','Intro':'intro-done'};
    const primary=section.metrics.find(row=>row.key===keys[section.title])||section.metrics[0];
    if(!primary)return '— · No data yet';
    return primary.value==null?'— · No data yet':value(primary.value,primary.unit)+' · '+primary.label;
  }
  function render(){
    const report=data.reports[category.value]||data.reports.all;
    const metrics=new Map([...report.funnel,...report.sections.flatMap(section=>section.metrics)].map(row=>[row.key,row]));
    const headline=['signup','trust','return-week','share-signups'].map(key=>metrics.get(key));
    const conversions=report.funnel.map(row=>row.conversion);
    const drops=report.funnel.map((row,i)=>i&&conversions[i]!=null?report.funnel[i-1].value-row.value:0);
    const biggest=Math.max(...drops);
    const drop=biggest>0?drops.indexOf(biggest):-1;
    content.innerHTML='<section aria-label="Pilot highlights">'+cards(headline.map((row,i)=>i===0?{...row,label:'Profiles created'}:row))+'</section>'+
     '<section class="admin-surface pilot-report-section"><h2>Signup funnel</h2><p class="pilot-scroll-hint">Scroll across to see all nine steps.</p>'+
     '<div class="pilot-funnel-scroll" tabindex="0" role="region" aria-label="Signup funnel steps">'+Admin.funnel(report.funnel.map(row=>[row.label,row.value,targetSummary(row)]),true,drop)+'</div>'+extras(report.funnel)+'</section>'+
     report.sections.map(section=>{
      const open=sectionsOpen[section.title]??section.title==='Trust signal';
      const body=section.title==='Trust signal'?pulseChart(section,report.followUps):section.title==='Spread'?spread(section):cards(section.metrics);
      return '<details class="admin-surface pilot-report-section" data-pilot-section="'+esc(section.title)+'" '+(open?'open':'')+'>'+
       '<summary><strong>'+esc(section.title)+'</strong><small>'+esc(sectionSummary(section))+'</small></summary><div class="pilot-section-content">'+body+'</div></details>';
     }).join('');
    content.querySelectorAll('[data-pilot-section]').forEach(details=>details.ontoggle=()=>{
      if(!details.isConnected)return;
      sectionsOpen[details.dataset.pilotSection]=details.open;
      try { localStorage.setItem(storageKey,JSON.stringify(sectionsOpen)); } catch {}
    });
  }
  async function load(){
    const id=++sequence;
    status.textContent='Loading pilot metrics…';
    try{
      await pendingTargets;
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
  let pendingTargets=Promise.resolve();
  content.addEventListener('change',event=>{
    const input=event.target.closest('[data-target]');
    if(!input||!input.validity.valid)return;
    const key=input.dataset.target,value=input.value===''?null:input.valueAsNumber;
    pendingTargets=pendingTargets.then(async()=>{
      try{
        data.settings=await request({target:{key,value}});
        const report=data.reports[category.value]||data.reports.all;
        const row=[...report.funnel,...report.sections.flatMap(section=>section.metrics)].find(metric=>metric.key===key);
        if(row){
          content.querySelectorAll('[data-target-summary="'+key+'"]').forEach(label=>label.textContent=targetText(row));
          content.querySelectorAll('[data-target="'+key+'"]').forEach(field=>{
            if(field!==input&&field!==document.activeElement)field.value=data.settings.targets[key]??'';
          });
        }
        status.textContent='Target saved.';
      }catch(error){status.textContent=error.message;}
    });
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
