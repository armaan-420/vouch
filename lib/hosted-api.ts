import {runnerAuthorized,runSuggestions} from './auto-experiments/runner.mjs';
import {createAdminAuth} from './admin-auth.mjs';
import {createSuggestions} from './auto-experiments/api.mjs';
import {createCatalogRuntime} from './catalog/runtime.mjs';
import {bucketPhotoStorage} from './profile-photo.mjs';
import {getExecutionContext} from './execution-context';
import { env } from 'cloudflare:workers';
import {createD1Store} from './d1-store';
import {createProductSearch} from '../product-search.mjs';
import {createApplicationApi} from './application-api.mjs';
import {createResendDelivery,createSuggestionDelivery} from './email-delivery.mjs';
import initialCatalog from '../data/catalog-bootstrap.json';
const initializeSearch=async(store:ReturnType<typeof createD1Store>)=>createCatalogRuntime({local:await createProductSearch({storage:store.catalog,initialCatalog}),env,db:env.DB,store,development:import.meta.env.DEV});
let searchPromise:ReturnType<typeof initializeSearch>|undefined;
export function hostedAdminAuth(){
 return createAdminAuth({store:createD1Store(env.DB),pin:env.VOUCH_ADMIN_PIN});
}
export async function isOrganizer(request:Request){
 return !!env.DB&&hostedAdminAuth().authorize(request);
}
export async function hostedApi(request:Request){
  if(!env.DB)return Response.json({error:'Database unavailable.'},{status:503});
  if(['/api/internal/suggestions/run','/api/internal/suggestions/notification-test'].includes(new URL(request.url).pathname)){
   if(request.method!=='POST'||!await runnerAuthorized(request,env.SUGGESTION_RUNNER_SECRET))return Response.json({error:'Unauthorized'},{status:401});
   if(new URL(request.url).pathname.endsWith('/notification-test')){
    const send=createSuggestionDelivery({apiKey:env.RESEND_API_KEY,from:env.VOUCH_EMAIL_FROM,adminUrl:env.SUGGESTION_ADMIN_URL});
    if(!send||!env.SUGGESTION_NOTIFY_EMAIL)return Response.json({error:'Notifications not configured'},{status:503});
    await send({email:env.SUGGESTION_NOTIFY_EMAIL,category:'Notification setup test',state:'ready',key:'',idempotencyKey:'vouch-notification-setup-v1'});
    return Response.json({ok:true,accepted:true},{headers:{'Cache-Control':'no-store'}});
   }
   return Response.json(await advanceHostedSuggestions(),{headers:{'Cache-Control':'no-store'}});
  }
  const adminAuth=hostedAdminAuth();
  const authResponse=await adminAuth.handle(request);
  if(authResponse)return authResponse;
  if(new URL(request.url).pathname.startsWith('/api/admin/')&&!await adminAuth.authorize(request))return Response.json({error:'Enter the admin PIN to continue.'},{status:401,headers:{'Cache-Control':'private, no-store'}});
  const store=createD1Store(env.DB);
  // Retry initialization after a transient storage failure.
  searchPromise??=initializeSearch(store).catch(error=>{searchPromise=undefined;throw error});
  const search=await searchPromise;
  const ctx=getExecutionContext();
  const requestSearch={...search,search:(q:string,options={})=>search.search(q,{...options,waitUntil:ctx?(p:Promise<unknown>)=>ctx.waitUntil(p):undefined})};
  return createApplicationApi({store,search:requestSearch,authorizeAdmin:isOrganizer,photoStorage:bucketPhotoStorage(env.BUCKET),autoOptions:{env,notify:createSuggestionDelivery({apiKey:env.RESEND_API_KEY,from:env.VOUCH_EMAIL_FROM,adminUrl:env.SUGGESTION_ADMIN_URL||new URL('/admin',request.url).href}),development:import.meta.env.DEV,waitUntil:ctx?(p:Promise<unknown>)=>ctx.waitUntil(p):undefined},authOptions:{secret:env.VOUCH_AUTH_SECRET,sendCode:createResendDelivery({apiKey:env.RESEND_API_KEY,from:env.VOUCH_EMAIL_FROM}),previewDelivery:import.meta.env.DEV&&!env.RESEND_API_KEY}})(request);
}

export async function advanceHostedSuggestions(){
 if(!env.DB)return;
 const store=createD1Store(env.DB);
 searchPromise??=initializeSearch(store).catch(error=>{searchPromise=undefined;throw error});
 const search=await searchPromise;
 return runSuggestions({store,auto:createSuggestions({store,search,env,development:import.meta.env.DEV,notify:createSuggestionDelivery({apiKey:env.RESEND_API_KEY,from:env.VOUCH_EMAIL_FROM,adminUrl:env.SUGGESTION_ADMIN_URL})})});
}
