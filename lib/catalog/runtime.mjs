import {createGtinLookup} from './providers/gtin.mjs';
import {createProductResolver} from './resolver.mjs';
import {memoryCache,d1Cache,createBudget} from './cache.mjs';
import {createChannel3} from './providers/channel3.mjs';
import {createShopifyCatalog,DEVELOPMENT_PROFILE} from './providers/shopify-catalog.mjs';
export function createCatalogRuntime({local,env={},db,store,development=false,fetcher=fetch}){
 const order=String(env.CATALOG_LIVE_PROVIDERS||'').split(',').map(s=>s.trim()).filter(s=>['channel3','shopify'].includes(s));const providers=[...new Set(order)].map(name=>name==='channel3'?createChannel3({apiKey:env.CHANNEL3_API_KEY,fetcher}):createShopifyCatalog({clientId:env.SHOPIFY_CATALOG_CLIENT_ID,clientSecret:env.SHOPIFY_CATALOG_CLIENT_SECRET,mcpUrl:env.SHOPIFY_CATALOG_MCP_URL,catalogId:env.SHOPIFY_CATALOG_ID,profileUrl:env.SHOPIFY_UCP_PROFILE_URL||(development?DEVELOPMENT_PROFILE:'https://v4ch.app/ucp/vouch-agent-profile.json'),fetcher})).filter(p=>p.name!=='channel3'||env.CHANNEL3_API_KEY);
 const on=name=>['1','true','on'].includes(String(env[name]||'').toLowerCase()),limit=Number(env.CATALOG_DAILY_LIVE_SEARCH_BUDGET??300);
 const cache=db?d1Cache(db):memoryCache(),budget=createBudget({db,store,limit:Number.isFinite(limit)?Math.max(0,Math.floor(limit)):300});
 return createProductResolver({local,providers,enabled:order.length>0,cache,budget,gtin:createGtinLookup({cache,fetcher,goUpcKey:env.GO_UPC_API_KEY,upcitemdbKey:env.UPCITEMDB_USER_KEY,allow:()=>budget.take()}),switches:{linkPaste:on('CATALOG_LINK_PASTE'),whereToBuy:on('CATALOG_WHERE_TO_BUY'),barcode:on('CATALOG_BARCODE'),photo:on('CATALOG_PHOTO_SEARCH')}});
}
