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
export function isOrganizer(request:Request){
  const email=request.headers.get('oai-authenticated-user-email')?.toLowerCase();
  const allowed=String(env.ADMIN_EMAILS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
  if(import.meta.env.DEV&&email==='seedy@sites.test')return true;
  return !!email&&allowed.includes(email);
}
export async function hostedApi(request:Request){
  if(!env.DB)return Response.json({error:'Database unavailable.'},{status:503});
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
 await createSuggestions({store,search,env,development:import.meta.env.DEV,notify:createSuggestionDelivery({apiKey:env.RESEND_API_KEY,from:env.VOUCH_EMAIL_FROM,adminUrl:env.SUGGESTION_ADMIN_URL})}).advance();
}
