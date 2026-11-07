import {publicExperiment,experimentProducts,changeProducts,photoUrl,productsWithPhotos} from './experiment-management.mjs';
import {publicHttps} from './catalog/normalize.mjs';
import {adminInventory} from './admin-inventory.mjs';
import {identity} from './catalog/normalize.mjs';
import {inCategory} from './catalog/resolver.mjs';
import {catalogApi} from './catalog/api.mjs';
import {WATER_BOTTLES,needsBottleImages,addBottleImages} from './water-bottles.mjs';
import {TAG_SEED_VERSION,seedDefaultTags,initialTags,categoryKey,canonicalProductId,validateTagDefinition,validateAssignment} from './product-tags.mjs';
import {oneProductPerBrand} from './brand-products.mjs';
import {collectionStatus,validateSchedule} from './experiment-schedule.mjs';
import {readJson} from './request-json.mjs';
import {createVouchApi, fresh, community, voteScore, voteCounts} from './vouch-api.mjs';
import {isExperimentId,experimentPath} from './experiment-paths.mjs';
import {DEFAULT_PRODUCTS} from './products.mjs';

export const DEFAULT_EXPERIMENT={id:'sunscreen',title:'The Wharton Sunscreen Edit',category:'Sunscreen',products:DEFAULT_PRODUCTS,includeInOverall:false,closed:false,startsAt:null,endsAt:null,createdAt:null};
export const initialRegistry=()=>({experiments:{sunscreen:DEFAULT_EXPERIMENT},skus:{}});
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const slug=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=64;
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

const input=request=>readJson(request,32768);

function text(value,label,max=120){if(typeof value!=='string'||value.trim().length<2||value.length>max)throw fail(`Enter ${label} (2–${max} characters).`);return value.trim()}
export function customProduct(p){
  if(!p||!slug(p.id)||!p.id.startsWith('sku-'))throw fail('Custom SKU IDs must start with sku- and use lowercase letters, numbers, and hyphens.');
  const product={id:p.id,name:text(p.name,'a product name'),brand:text(p.brand,'a brand'),formula:typeof p.formula==='string'?p.formula.trim().slice(0,160):'',image:null,url:null};
  for(const field of ['image','url'])if(p[field]){try{const u=new URL(p[field]);if(u.protocol!=='https:'||u.username||u.password||u.href.length>2048)throw Error();product[field]=u.href}catch{throw fail('Product links and photos must use valid HTTPS URLs.')}}
  return product;
}

export async function validateExperiment(data,findProduct){
        if(!isExperimentId(data.id)||data.id==='sunscreen')throw fail('Choose a unique experiment ID using lowercase letters, numbers, and hyphens.');
        const title=text(data.title,'an experiment title'),category=text(data.category||'Products','a category',60);
        if(!Array.isArray(data.productIds)||!Array.isArray(data.customProducts||[]))throw fail('Choose products for this experiment.');
        if(data.productIds.length+(data.customProducts||[]).length<1||data.productIds.length+(data.customProducts||[]).length>32)throw fail('Choose between 1 and 32 products.');
        const products=[];
        for(const id of data.productIds){
          if(typeof id!=='string'||id.length>160)throw fail('Invalid product ID.');
          const p=await findProduct(id);
          if(!p)throw fail('Product unavailable. Search and select it again.');
          products.push({...identity(p),id:p.onBoardId||p.id});
        }
        const custom=(data.customProducts||[]).map(customProduct);products.push(...custom);
        if(new Set(products.map(p=>p.id)).size!==products.length)throw fail('Choose each product only once.');
        return {id:data.id,title,category,products:oneProductPerBrand(products),closed:false,includeInOverall:false,startsAt:null,endsAt:null,createdAt:new Date().toISOString()};
}
export function insertExperiment(d,experiment){
 if(Object.hasOwn(d.deletedExperimentIds||{},experiment.id))throw fail('That experiment path was permanently deleted. Choose a new path.',409);
 if(Object.hasOwn(d.experiments,experiment.id))throw fail('That experiment ID already exists.',409);
 if(experiment.status!=='draft'&&Object.values(d.experiments).filter(e=>e.status!=='draft').length>=50)throw fail('This prototype supports up to 50 live experiments.');
 if(experiment.status!=='draft')for(const p of experiment.products.filter(p=>p.id.startsWith('sku-'))){if(d.skus[p.id]&&(d.skus[p.id].name!==p.name||d.skus[p.id].brand!==p.brand))throw fail('That SKU ID already belongs to a different product.',409);d.skus[p.id]??=p;}
 d.experiments[experiment.id]=experiment;
}

/** @param {{store:any,search:any,authorizeAdmin?:(request:Request)=>boolean|Promise<boolean>,storageLabel?:string}} options */
export function createExperimentApi({store,search,authorizeAdmin=()=>false,storageLabel='d1'}){
  return async request=>{
    const url=new URL(request.url),path=url.pathname;
    try{
      if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Request origin not allowed'},403);
      const isAdmin=path.startsWith('/api/admin/');
      if(isAdmin&&!await authorizeAdmin(request))return json({error:'Organizer access required.'},request.headers.get('oai-authenticated-user-email')?403:401);
      const registryStore=await store.scope('experiment-registry',initialRegistry);
      let registry=await registryStore.read();
      if(WATER_BOTTLES.some(p=>!Object.hasOwn(registry.skus,p.id))||needsBottleImages(registry)){
        await registryStore.transaction(d=>{for(const p of WATER_BOTTLES)if(!Object.hasOwn(d.skus,p.id))d.skus[p.id]=p;addBottleImages(d)});
        registry=await registryStore.read();
      }
      const tagStore=await store.scope('product-tags',initialTags);
      // Public voting and schedule polling do not need the organizer taxonomy.
      if(['/api/admin/tags','/api/admin/product-tags','/api/admin/products','/api/admin/inventory'].includes(path)&&Number((await tagStore.read()).seedVersion||0)<TAG_SEED_VERSION)await tagStore.transaction(seedDefaultTags);
      const knownProducts=()=>[...new Map([...DEFAULT_PRODUCTS.map(p=>({...p,category:'Sunscreen'})),...Object.values(registry.skus).filter(p=>isAdmin||!Object.values(registry.experiments).some(e=>!publicExperiment(e)&&e.products.some(x=>x.id===p.id))||Object.values(registry.experiments).some(e=>publicExperiment(e)&&e.products.some(x=>x.id===p.id))),...Object.values(registry.experiments).filter(e=>isAdmin||publicExperiment(e)).flatMap(e=>e.products.map(p=>({...p,category:e.category})))].map(p=>[canonicalProductId(p),p])).values()];
      const findProduct=async id=>knownProducts().find(p=>canonicalProductId(p)===id)||await search.find(id)||(await adminInventory({store,registry,tags:await tagStore.read()})).products.find(p=>p.id===id);
      if(path==='/api/admin/inventory'&&request.method==='GET')return json(await adminInventory({store,registry,tags:await tagStore.read()}));
      if(path==='/api/admin/tags'&&request.method==='GET')return json(await tagStore.read());
      if(path==='/api/admin/tags'&&request.method==='POST'){
        const tag=validateTagDefinition(await input(request));
        await tagStore.transaction(d=>{if(Object.values(d.definitions).some(t=>categoryKey(t.label)===categoryKey(tag.label)&&categoryKey(t.category)===categoryKey(tag.category)))throw fail('That tag already exists.',409);d.definitions[tag.id]=tag});
        return json({tag},201);
      }
      if(path==='/api/admin/product-tags'&&request.method==='POST'){
        const data=await input(request);
        if(typeof data.productId!=='string'||data.productId.length>160)throw fail('Choose a product.');
        const p=await findProduct(data.productId);if(!p)throw fail('Product not found.',404);
        const category=text(data.category||p.category||'Sunscreen','a category',60);
        const productId=canonicalProductId(p);
        const assignment=await tagStore.transaction(d=>{const tagIds=validateAssignment(data,d.definitions,category);const value={category,tagIds,source:'organizer',updatedAt:new Date().toISOString()};d.products[productId]=value;return value});
        return json({productId,...assignment});
      }
      if(path==='/api/admin/products'&&request.method==='GET'){
        const q=(url.searchParams.get('q')||'').trim();if(q.length>100)throw fail('Keep your search under 100 characters.');
        const tags=await tagStore.read();
        const matches=knownProducts().filter(p=>!q||(p.brand+' '+p.name+' '+(p.category||'')).toLowerCase().includes(q.toLowerCase()));
        const found=q.length>=2?(await search.search(q,{category:url.searchParams.get('category')||'Products',localProducts:knownProducts(),visitorKey:request.headers.get('cookie')?.match(/vouch_visitor=([a-f0-9-]{36})/)?.[1]})).products:[];
        const products=[...new Map([...matches,...found].map(p=>[canonicalProductId(p),p])).values()].slice(0,60).map(p=>({...p,id:canonicalProductId(p),category:tags.products[canonicalProductId(p)]?.category||p.category||'Sunscreen',tagIds:tags.products[canonicalProductId(p)]?.tagIds||[]}));
        return json({products});
      }
      if(path==='/api/admin/product-lookup'&&request.method==='POST'){
        const data=await input(request);if(!publicHttps(data.url))throw fail('Use a public HTTPS product URL.');
        if(!search.lookupUrl)throw fail('URL lookup is unavailable. Search by name or enter product details.',503);
        const product=await search.lookupUrl(data.url,{category:typeof data.category==='string'?data.category:'Products',visitorKey:'organizer-lookup'});
        if(!product)throw fail('Could not identify that product. Search by name or enter its details.',404);
        return json({product});
      }
      if(path==='/api/admin/experiment-products'){
        const data=request.method==='POST'?await input(request):{id:url.searchParams.get('id')};
        const e=Object.hasOwn(registry.experiments,data.id)?registry.experiments[data.id]:null;if(!e)throw fail('Experiment not found.',404);
        if(request.method==='GET')return json(await experimentProducts(store,e,search));
        if(request.method!=='POST')throw fail('Method not allowed.',405);
        const product=data.action==='add'?(data.customProduct?customProduct(data.customProduct):await findProduct(data.productId)):null;
        if(data.action==='add'&&!e.disabled&&product&&!photoUrl((await productsWithPhotos([product],search))[0].image))throw fail('Attach a photo before adding this product to a live experiment.');
        const updated=await registryStore.transaction(d=>{const current=d.experiments[data.id];if(!current)throw fail('Experiment not found.',404);const result=changeProducts(current,data,product);if(product?.id.startsWith('sku-')){const existing=d.skus[product.id];if(existing&&(existing.brand!==product.brand||existing.name!==product.name))throw fail('This product ID already belongs to a different product.',409);d.skus[product.id]??=product;}return result;});
        return json(await experimentProducts(store,updated,search));
      }
      if(path==='/api/admin/experiment-lifecycle'&&request.method==='POST'){
        const data=await input(request);if(!['disable','reactivate','delete'].includes(data.action))throw fail('Unknown experiment action.');
        if(data.action==='delete'&&data.confirmation!==data.id)throw fail('Type the experiment path to confirm permanent deletion.');
        if(data.action==='reactivate'&&registry.experiments[data.id]){const products=await productsWithPhotos(registry.experiments[data.id].products,search);if(products.some(p=>!photoUrl(p.image)))throw fail('Attach a photo to every product before reactivating this experiment.',409);}
        const removed=await registryStore.transaction(d=>{const e=Object.hasOwn(d.experiments,data.id)?d.experiments[data.id]:null;
          if(!e){if(data.action==='delete'&&Object.hasOwn(d.deletedExperimentIds||{},data.id))return null;throw fail('Experiment not found.',404);}
          if(e.status==='draft')throw fail('Manage private drafts from Suggestions.',409);if(e.deleting&&data.action!=='delete')throw fail('Deletion is pending. Retry Delete to finish cleanup.',409);
          if(data.action==='delete'){d.deletedExperimentIds??={};d.deletedExperimentIds[e.id]=true;e.disabled=true;e.deleting=true;return e;}
          e.disabled=data.action==='disable';e.updatedAt=new Date().toISOString();return e;
        });
        if(data.action==='delete'){
          // Block discovery first; retries can finish cleanup after a partial storage failure.
          const scoped=data.id==='sunscreen'?store:await store.scope('experiment:'+data.id,fresh);await scoped.destroy();
          const jobs=await store.scope('suggestion-jobs',()=>({jobs:{},budget:{}}));const keys=await jobs.transaction(d=>{const keys=Object.keys(d.jobs).filter(k=>d.jobs[k].draftId===data.id||d.jobs[k].deletedDraft?.id===data.id||k===removed?.origin?.suggestionKey);for(const k of keys)delete d.jobs[k];return keys;});
          const suggestions=await store.scope('category-suggestions',()=>({suggestions:{}}));await suggestions.transaction(d=>{for(const k of keys)delete d.suggestions[k];});
          await registryStore.transaction(d=>{if(d.experiments[data.id]?.deleting)delete d.experiments[data.id];});
        }
        return json({ok:true,action:data.action,id:data.id});
      }
      // Preserve historical records while presenting one representative per brand.
      for(const e of Object.values(registry.experiments))e.products=oneProductPerBrand(e.products);
      if(path==='/api/health'&&request.method==='GET'){
        await store.read();return json({ok:true,storage:storageLabel,experimentCount:Object.keys(registry.experiments).length});
      }
      if(path==='/api/admin/experiments'&&request.method==='GET')return json({experiments:Object.values(registry.experiments),defaultProducts:DEFAULT_PRODUCTS,customProducts:Object.values(registry.skus)});
      if(path==='/api/admin/experiments'&&request.method==='POST'){
        const data=await input(request);
        const experiment=await validateExperiment(data,findProduct);
        await registryStore.transaction(d=>{
          insertExperiment(d,experiment);
        });
        return json({experiment,url:experimentPath(experiment.id)},201);
      }
      if(path==='/api/admin/experiment-settings'&&request.method==='POST'){
        const data=await input(request);
        if(typeof data.includeInOverall!=='boolean'||typeof data.closed!=='boolean')throw fail('Choose the leaderboard and collection settings.');
        const schedule=Object.hasOwn(data,'startsAt')||Object.hasOwn(data,'endsAt')?validateSchedule(data):null;
        const result=await registryStore.transaction(d=>{
          const e=Object.hasOwn(d.experiments,data.id)?d.experiments[data.id]:null;
          if(!e)throw fail('Experiment not found.',404);
          e.includeInOverall=data.includeInOverall;e.closed=data.closed;if(schedule)Object.assign(e,schedule);return e;
        });return json({experiment:result});
      }
      const experimentStore=async id=>id==='sunscreen'?store:await store.scope('experiment:'+id,fresh);
      if(path==='/api/overall'&&request.method==='GET'){
        const eligible=Object.values(registry.experiments).filter(e=>publicExperiment(e)&&e.includeInOverall),totals=new Map();
        // One latest verdict per browser per canonical SKU across included experiments.
        for(const e of eligible){
          const d=await (await experimentStore(e.id)).read();
          const additions=community(d,'',e.products);
          for(const p of [...e.products,...additions]){
            // Keep reviewed name-only additions visible without merging unrelated collections.
            const id=p.communityNominated?(p.skuId||e.id+':'+p.id):canonicalProductId(p);
            if(!totals.has(id))totals.set(id,{product:{...(p.provider?identity(p):{}),id,name:p.name,brand:p.brand,image:p.image,url:p.url,...(p.communityNominated?{communityNominated:true,skuId:p.skuId}:{})},votes:new Map()});
            const t=totals.get(id),votes=(p.communityNominated?d.communityVotes:d.baseVotes)?.[p.id]||{};
            const times=(p.communityNominated?d.communityVoteTimes:d.baseVoteTimes)?.[p.id]||{};
            for(const [visitor,value] of Object.entries(votes)){
              const at=times[visitor]||'1970-01-01T00:00:00.000Z',previous=t.votes.get(visitor);
              if(!previous||at>previous.at)t.votes.set(visitor,{value,at});
            }
          }
        }
        const products=[...totals.values()].map(t=>{const votes=Object.fromEntries([...t.votes].map(([v,x])=>[v,x.value]));return {...t.product,score:voteScore(votes),voteCounts:voteCounts(votes)}}).sort((a,b)=>Number(b.score??-1)-Number(a.score??-1));
        return json({products,includedExperiments:eligible.length});
      }
      const id=url.searchParams.get('experiment')||'sunscreen';
      const experiment=Object.hasOwn(registry.experiments,id)?registry.experiments[id]:null;
      if(!experiment)throw fail('Experiment not found.',404);
      if(experiment.disabled&&!isAdmin)throw fail('Experiment not found.',404);
      if(experiment.status==='draft'&&!(request.method==='GET'&&url.searchParams.get('preview')==='1'&&await authorizeAdmin(request)))throw fail('Experiment not found.',404);
      if(path==='/api/experiment'&&request.method==='GET')return json({experiment});
      if(request.method==='POST'&&!isAdmin&&!path.startsWith('/api/catalog/')){const status=collectionStatus(experiment);if(status!=='open')throw fail(status==='upcoming'?'This experiment has not started yet.':'This experiment has closed. Its results are still available.',409);}
      const scopedStore=await experimentStore(id);
      if(path==='/api/admin/export'&&request.method==='GET'){
        const data=await scopedStore.read();return new Response(JSON.stringify({formatVersion:2,exportedAt:new Date().toISOString(),experiment,data}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Content-Disposition':`attachment; filename="vouch-${id}-results.json"`}});
      }
      const communityProducts=community(await scopedStore.read(),'',experiment.products).map(p=>({...p,id:p.skuId||p.id,category:experiment.category,onBoardId:p.id}));
      const productIds=new Set(experiment.products.map(p=>p.id));
      const visibleIds=new Set([...productIds,...communityProducts.map(p=>p.onBoardId)]);
      const adapt=p=>p?{...p,skuId:p.skuId||p.onBoardId||p.id,onBoardId:visibleIds.has(p.onBoardId||p.id)?(p.onBoardId||p.id):null}:null;
      const searchCategory=isAdmin?experiment.category:(await authorizeAdmin(request)&&url.searchParams.get('category')||experiment.category);
      const bottleCategory=categoryKey(searchCategory)==='water bottles';
      const categoryProducts=[...knownProducts(),...communityProducts].filter(p=>categoryKey(p.category)===categoryKey(searchCategory));
      const catalogOptions={category:searchCategory,localProducts:categoryProducts,visitorKey:request.headers.get('cookie')?.match(/vouch_visitor=([a-f0-9-]{36})/)?.[1]};
      const scopedSearch={...search,find:async id=>{const p=await findProduct(id);if(!p)return null;if(p.provider&&!inCategory(p,searchCategory))return null;if(p.category&&categoryKey(p.category)!==categoryKey(searchCategory)&&!p.provider)return null;if(bottleCategory&&!p.provider&&categoryKey(p.category)!=='water bottles')return null;if(!bottleCategory&&categoryKey(p.category)==='water bottles')return null;return adapt(p)},search:async q=>{
        const local=categoryProducts.filter(p=>q.toLowerCase().split(/\s+/).every(w=>(p.brand+' '+p.name+' '+(p.searchAliases||[]).join(' ')).toLowerCase().includes(w)));
        const result=search.config?await search.search(q,catalogOptions):bottleCategory||categoryKey(searchCategory)!=='sunscreen'?{products:[],catalogCount:categoryProducts.length}:await search.search(q);
        return {...result,products:[...new Map([...local,...result.products].map(p=>[p.id,p])).values()].slice(0,20).map(adapt)};
      }};
      const catalogResponse=await catalogApi(request,scopedSearch,catalogOptions);if(catalogResponse)return catalogResponse;
      return await createVouchApi({store:scopedStore,search:scopedSearch,authorizeAdmin,productIds,products:experiment.products})(request);
    }catch(error){
      if(!error.status)console.error('Vouch API failed',path,error instanceof Error?error.name:'Error');
      return json({error:error.status?error.message:'Could not load or save right now. Please try again.'},error.status||500);
    }
  };
}
