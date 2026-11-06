// Local-only review server. No credentials or production data are saved here.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createProductSearch} from '../product-search.mjs';
import {createFileStore} from '../lib/file-store.mjs';
import {createCatalogRuntime} from '../lib/catalog/runtime.mjs';
import {createVouchServer} from '../server.mjs';
import {DEFAULT_EXPERIMENT} from '../lib/experiment-api.mjs';
import {WATER_BOTTLES} from '../lib/water-bottles.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const directory=path.join(root,'.data','product-lookup-preview');
const port=Number(process.env.PORT||4174);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a local preview port between 1024 and 65535.');
const catalog=JSON.parse(await fs.readFile(new URL('../data/catalog-bootstrap.json',import.meta.url),'utf8'));
// Review uses the existing checked-in local catalog, without refreshing feeds.
const local=await createProductSearch({directory,initialCatalog:catalog,sources:[],ttl:Infinity});
const store=await createFileStore(directory);
const registry=await store.scope('experiment-registry',()=>({experiments:{sunscreen:{...DEFAULT_EXPERIMENT,title:'Sunscreen — local testing'}},skus:{}}));
await registry.transaction(data=>{
 const example=(id,title,category,products)=>({id,title,category,products,closed:false,includeInOverall:false,startsAt:null,endsAt:null,createdAt:new Date().toISOString()});
 data.experiments.waterbottle??=example('waterbottle','Water bottles — local testing','Water bottles',WATER_BOTTLES);
 data.experiments.shampoo??=example('shampoo','Shampoo — local testing','Shampoo',[]);
 data.experiments.televisions??=example('televisions','TVs — local testing','TVs',[]);
});
const env={...process.env,
 CATALOG_LIVE_PROVIDERS:process.env.CATALOG_LIVE_PROVIDERS??(process.env.CHANNEL3_API_KEY?'channel3':''),
 CATALOG_DAILY_LIVE_SEARCH_BUDGET:process.env.CATALOG_DAILY_LIVE_SEARCH_BUDGET??'100',
 ...Object.fromEntries(['CATALOG_LINK_PASTE','CATALOG_WHERE_TO_BUY','CATALOG_BARCODE','CATALOG_PHOTO_SEARCH'].map(key=>[key,process.env[key]??'true'])),
};
const resolver=createCatalogRuntime({local,store,env,development:true});
const server=await createVouchServer({directory,root:path.join(root,'public'),productSearch:resolver});
server.listen(port,'127.0.0.1',()=>{
 console.log('Vouch local product-lookup preview: http://127.0.0.1:'+port+'/sunscreen?board=1');
 console.log('Also available: /waterbottle?board=1, /shampoo?board=1, /televisions?board=1, /admin');
 console.log('Providers: '+env.CATALOG_LIVE_PROVIDERS+'; Shopify: '+(env.SHOPIFY_CATALOG_CLIENT_ID&&env.SHOPIFY_CATALOG_CLIENT_SECRET?'authenticated':'keyless'));
 console.log('Separate local testing data; production is unchanged.');
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
