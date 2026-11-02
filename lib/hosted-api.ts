import {getExecutionContext} from './execution-context';
import { env } from 'cloudflare:workers';
import {createD1Store} from './d1-store';
import {createProductSearch} from '../product-search.mjs';
import {createExperimentApi} from './experiment-api.mjs';
import initialCatalog from '../data/catalog-bootstrap.json';
let searchPromise:ReturnType<typeof createProductSearch>|undefined;
export function isOrganizer(request:Request){
  const email=request.headers.get('oai-authenticated-user-email')?.toLowerCase();
  const allowed=String(env.ADMIN_EMAILS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
  if(import.meta.env.DEV&&email==='seedy@sites.test')return true;
  return !!email&&allowed.includes(email);
}
export async function hostedApi(request:Request){
  if(!env.DB)return Response.json({error:'Database unavailable.'},{status:503});
  const store=createD1Store(env.DB);
  searchPromise??=createProductSearch({storage:store.catalog,initialCatalog});
  const search=await searchPromise;
  const ctx=getExecutionContext();
  const requestSearch={find:search.find,search:(q:string)=>search.search(q,{waitUntil:ctx?(p:Promise<unknown>)=>ctx.waitUntil(p):undefined})};
  return createExperimentApi({store,search:requestSearch,authorizeAdmin:isOrganizer})(request);
}
