import {readJson} from './request-json.mjs';

const email='demo@vouch.example';
const cookieName='vouch_wharton_demo';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const publicRead=/^\/api\/(?:categories|experiment|board|community|me|overall|search|discover|people-summary|community-leaderboard|products(?:\/[^/]+)?|profiles\/[^/]+|catalog\/(?:config|items\/[^/]+))$/;

export async function handleWhartonDemo(request,readPublic){
 const {pathname,origin,protocol}=new URL(request.url);
 const demoId=request.headers.get('cookie')?.match(/(?:^|;\s*)vouch_wharton_demo=([a-f0-9-]{36})(?:;|$)/)?.[1];
 const post=request.method==='POST';
 const sameOrigin=request.headers.get('origin')===origin&&request.headers.get('sec-fetch-site')!=='cross-site';
 const cookie=value=>({ 'Set-Cookie': `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax${value?'':'; Max-Age=0'}${protocol==='https:'?'; Secure':''}` });

 if(post&&pathname==='/api/auth/start'&&sameOrigin){
  let body;
  try{body=await readJson(request,2048)}catch(error){return json({error:error.status?error.message:'Invalid request.'},error.status||400)}
  if(String(body.email||'').trim().toLowerCase()===email){
   return json({demo:true},200,cookie(crypto.randomUUID()));
  }
  if(!demoId&&body.whartonPilot===true&&!/^[^\s@]+@wharton\.upenn\.edu$/i.test(String(body.email||'').trim())){
   return json({error:'Use your @wharton.upenn.edu email.'},400);
  }
 }
 if(!demoId)return null;
 if(post&&sameOrigin){
  if(pathname==='/api/auth/logout')return json({ok:true},200,cookie(''));
  if(pathname==='/api/events'||pathname==='/api/pilot-events')return json({ok:true,demo:true});
 }
 if(request.method!=='GET')return json({error:'Changes are disabled during the Wharton demo.'},403);
 if(pathname==='/api/auth/status')return json({available:true,identity:null,demo:true,demoId});
 if(pathname==='/api/account/me')return json({authenticated:false,profile:null,demo:true,demoId});
 if(!publicRead.test(pathname))return json({error:'This page is unavailable during the Wharton demo.'},403);

 // Serve public data without participant or organizer credentials, and keep
 // cookies issued by anonymous public reads out of the real browser session.
 const url=new URL(request.url);
 url.searchParams.delete('preview');
 const result=await readPublic(new Request(url,{signal:request.signal}));
 if(!result)return json({error:'This page is unavailable during the Wharton demo.'},404);
 const headers=new Headers(result.headers);
 headers.delete('Set-Cookie');
 return new Response(result.body,{status:result.status,headers});
}
