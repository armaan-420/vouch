import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseRetailer,listingKey,cleanListing} from '../lib/retailer-catalog.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'data/catalog-bootstrap.json');
const cacheDir=path.join(root,'outputs/retailer-pages');await fs.mkdir(cacheDir,{recursive:true});
const catalog=JSON.parse(await fs.readFile(catalogPath,'utf8')),startedAt=new Date().toISOString();
const brands=[...new Set(catalog.products.map(p=>p.brand).concat(['SkinCeuticals','SkinMedica','Colorescience','ALASTIN Skincare','Skinbetter Science','Revision Skincare','PCA SKIN','La Roche-Posay','CeraVe','Avène','Eucerin','Bioderma','ISDIN','Obagi Medical','jane iredale','MDSolarSciences','TiZO','COOLA','Sun Bum','Neutrogena','Australian Gold','Black Girl Sunscreen','Paula’s Choice','Paula\'s Choice','Dermalogica','Murad','Shiseido','Peter Thomas Roth','Eminence Organic Skin Care','IMAGE Skincare','iS Clinical','Epionce','Vanicream','BABOR','Senté','EltaMD']))];
const sources=[
  {id:'ulta',brand:'Ulta Beauty',origin:'https://www.ulta.com',kind:'ulta',market:'US',imageHosts:['media.ultainc.com'],paths:['/shop/body-care/suncare/sunscreen'],param:'page'},
  {id:'yesstyle',brand:'YesStyle',origin:'https://www.yesstyle.com',kind:'yesstyle',market:'international',imageHosts:['d1flfk77wl2xk4.cloudfront.net'],paths:['/en/beauty-sunscreen/list.html/bcc.15601_bpt.46'],param:'pn'},
  {id:'care',brand:'Care to Beauty',origin:'https://www.caretobeauty.com',kind:'care',market:'European/international',imageHosts:['www.caretobeauty.com'],paths:['/us/face-lips-sunscreen/','/us/body-sunscreen/','/us/baby-children-sunscreen/'],param:'p'},
  {id:'dermstore',brand:'Dermstore',origin:'https://www.dermstore.com',kind:'dermstore',market:'US',imageHosts:['www.dermstore.com','static.thcdn.com'],paths:['/c/sunscreen/view-all/'],param:'pageNumber'},
  {id:'sokoglam',brand:'Soko Glam',origin:'https://sokoglam.com',kind:'shopify',market:'US',imageHosts:['cdn.shopify.com'],paths:['/collections/sunscreen/products.json'],param:'page'},
];
const report={startedAt,before:catalog.products.length,sources:[],unavailable:[{source:'Sephora',reason:'HTTP 403: automated access denied; supplied brand counts are not product records.'},{source:'Olive Young Global',reason:'HTTP 403: automated access denied.'},{source:'Target',reason:'No validated structured product listing parser in this import.'}],limitations:['Retailer listings are imported snapshots, not inventory or availability guarantees.','Care to Beauty configurable parent listings are excluded to avoid mixing SPF/tint/formula variants.','Dermstore products require an explicitly recognized brand; unidentified brands are excluded.','Deduplication uses source ID and exact normalized brand/title within a catalog market; differently named or regional listings may remain separate.','Existing product IDs and response data are preserved.'],added:0,exactDuplicates:0};
const byId=new Map(catalog.products.map(p=>[p.id,p])),byKey=new Map(catalog.products.map(p=>[listingKey(p),p]));
async function get(url,key){const dest=path.join(cacheDir,key+'.txt');try{return await fs.readFile(dest,'utf8')}catch{}
  const r=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{Accept:'text/html,application/json','User-Agent':'VouchCatalogImporter/1.0 (+https://v4ch.app)'}});if(!r.ok)throw Error('HTTP '+r.status);const text=await r.text();await fs.writeFile(dest,text);return text;
}
for(const source of sources){const result={source:source.brand,sourceId:source.id,pages:0,parsed:0,added:0,duplicates:0,errors:[]};const seen=new Set();
  for(let route=0;route<source.paths.length;route++){
    let pages=1,previous='';
    for(let page=1;page<=pages;page++){
      try{
        const url=new URL(source.paths[route],source.origin);url.searchParams.set(source.param,page);if(source.kind==='shopify')url.searchParams.set('limit','250');
        const text=await get(url,`${source.id}-${route}-${page}`);let parsed;
        if(source.kind==='shopify'){const data=JSON.parse(text);if(!Array.isArray(data.products))throw Error('Missing Shopify listings');parsed={pages:data.products.length===250?page+1:page,products:data.products.map(p=>cleanListing({id:p.id,name:p.title,brand:p.vendor,url:'/products/'+p.handle,image:p.images?.[0]?.src},{...source,importedAt:startedAt})).filter(Boolean)};}
        else parsed=parseRetailer(text,{...source,importedAt:startedAt},brands);
        if(parsed.pages>100)throw Error('Unexpected page count');pages=parsed.pages;
        const signature=parsed.products.map(p=>p.id).sort().join('|');if(page>1&&signature&&signature===previous)throw Error('Pagination repeated the prior page; stopping this route');previous=signature;
        result.pages++;
        for(const p of parsed.products){if(seen.has(p.id))continue;seen.add(p.id);result.parsed++;if(byId.has(p.id))continue;const existing=byKey.get(listingKey(p));if(existing){existing.alternateSources=[...new Map([...(existing.alternateSources||[]),{source:p.source,url:p.url}].map(s=>[s.url,s])).values()];result.duplicates++;continue;}byId.set(p.id,p);byKey.set(listingKey(p),p);result.added++;}
        console.log(JSON.stringify({source:source.id,route,page,pages,parsed:parsed.products.length,added:result.added}));
        await new Promise(r=>setTimeout(r,200));
      }catch(e){result.errors.push({route:source.paths[route],page,error:e.message});console.log(JSON.stringify({source:source.id,page,error:e.message}));break;}
    }
  }
  report.sources.push(result);report.added+=result.added;report.exactDuplicates+=result.duplicates;
  if(result.parsed)catalog.sources=[...new Set([...catalog.sources,source.brand])];
}
catalog.products=[...byId.values()];catalog.retailerImportedAt=startedAt;
report.after=catalog.products.length;report.completedAt=new Date().toISOString();
await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
await fs.writeFile(path.join(root,'data/retailer-import-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
