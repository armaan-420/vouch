(()=>{
 const originalFetch=window.fetch.bind(window);let checking=false;
 window.fetch=async(...args)=>{const response=await originalFetch(...args);const url=new URL(args[0] instanceof Request?args[0].url:args[0],location.href);if(url.origin===location.origin&&url.pathname.startsWith('/api/admin/')&&response.status===401)location.reload();return response;};
 async function check(){if(checking||document.hidden)return;checking=true;try{const response=await originalFetch('/api/admin/auth/status',{cache:'no-store'});if(response.ok&&!(await response.json()).authenticated)location.reload();}catch{}finally{checking=false;}}
 setInterval(check,30000);window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);
 document.getElementById('admin-lock').addEventListener('click',async()=>{const response=await originalFetch('/api/admin/auth/logout',{method:'POST'});if(response.ok)location.reload();});
})();
