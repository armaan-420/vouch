import test from 'node:test';import assert from 'node:assert/strict';
import {publicHttps,validGtin,variantLabel,tokens,isBundle} from '../lib/catalog/normalize.mjs';
import {createChannel3,mapChannel3} from '../lib/catalog/providers/channel3.mjs';
import {createShopifyCatalog,mapShopify} from '../lib/catalog/providers/shopify-catalog.mjs';
const c3={id:'fixture-bottle',title:'Example Bottle 24 oz',brands:[{name:'Example'}],images:[{url:'https://images.example.com/bottle.jpg'}],offers:[{domain:'merchant.example.com',url:'https://merchant.example.com/buy',price:{price:25,currency:'USD'},max_commission_rate:0.9}],category:{title:'Water bottles'}};
const shop={id:'gid://shopify/p/fixture',title:'Example Bottle 24 oz',media:[{type:'image',url:'https://images.example.com/bottle.jpg'}],variants:[{seller:{name:'Example'},price:{amount:2500,currency:'USD'}}]};
test('Channel3 narrows text and photo requests to verified voting categories in one request',async()=>{
 const bodies=[];const provider=createChannel3({apiKey:'fixture',fetcher:async(_url,o)=>{bodies.push(JSON.parse(o.body));return Response.json({products:[]})}});
 for(const [category,ids]of [['Sunscreen',['sunscreen']],['Shampoos',['shampoo']],['Water bottles',['water-bottles','sports-water-bottles']],['TVs',['televisions']]]){
  await provider.search('Example',{category});const body=bodies.at(-1);assert.equal(body.query,'Example');assert.deepEqual(body.filters,{category_ids:ids});
  await provider.imageSearch({data:'/9j/AAAA'},{category});assert.deepEqual(bodies.at(-1).filters,body.filters);
 }
 assert.equal(bodies.length,8);
 await provider.search('Example',{category:'Golf bags'});assert.equal(bodies.at(-1).query,'Example Golf bags');assert.equal(bodies.at(-1).filters,undefined);
 await provider.search('Example golf bags',{category:'Golf bags'});assert.equal(bodies.at(-1).query,'Example golf bags');
 for(const category of [undefined,'Products']){await provider.search('Example',{category});assert.equal(bodies.at(-1).query,'Example');assert.equal(bodies.at(-1).filters,undefined);}
});
test('catalog normalization rejects unsafe hosts, invalid GTINs and bundles',()=>{
 for(const u of ['http://example.com','https://localhost','https://127.1','https://2130706433','https://10.0.0.1','https://172.20.0.1','https://192.168.1.1','https://169.254.1.2','https://[::1]','https://[::ffff:127.0.0.1]','https://user:password@example.com','https://example.com/'+ 'a'.repeat(2048)])assert.equal(publicHttps(u),null,u);
 assert.equal(publicHttps('https://shop.example.com/p?shclid=fixture'),'https://shop.example.com/p?shclid=fixture');
 assert.equal(validGtin('012345678905'),true);assert.equal(validGtin('012345678904'),false);assert.equal(validGtin('123'),false);
 assert.deepEqual(tokens('Bioré UV-Aqua'),['biore','uv','aqua']);assert.equal(variantLabel('Bottle 24 oz SPF 50'),'24 oz · SPF 50');assert.equal(isBundle({title:'Bottle 2-pack'}),true);
});
test('provider mapping strips offers, commissions and ratings from search; tolerates absent fields',()=>{
 const a=mapChannel3(c3,100),b=mapShopify(shop,100);assert.equal(a.brand,'Example');assert.equal(a.name,'Bottle 24 oz');assert.equal(a.url,null);assert.equal(a.retailerCount,1);assert.equal(b.brand,'Example');
 for(const p of [a,b])for(const key of ['offers','price','ratings','max_commission_rate'])assert.equal(p[key],undefined);
 assert.equal(mapShopify({...shop,variants:[]}).brand,null);assert.equal(mapChannel3({...c3,images:[]}).image,null);assert.equal(mapChannel3({...c3,title:'Bottle kit'}),null);assert.equal(mapShopify({...shop,title:'Bottle duo'}),null);
});
for(const [name,create,data]of [['channel3',createChannel3,{products:[c3]}],['shopify',createShopifyCatalog,{result:{structuredContent:{products:[shop]}}}]]){
 test(name+' successful requests and errors are sanitized without retry',async()=>{
 let calls=[];const build=fetcher=>create({apiKey:'fixture-not-a-real-key',fetcher});
 const provider=build(async(url,options)=>{calls.push({url,options});return Response.json(data)});const r=await provider.search('Example Bottle');assert.equal(r.status,'ok');assert.equal(r.products.length,1);assert.equal(calls[0].options.headers['x-user-id'],undefined);
 for(const [code,status]of [[401,'auth_error'],[429,'rate_limited'],[500,'error']]){calls=[];const p=build(async()=>{calls.push(1);return new Response('private provider error',{status:code})});const result=await p.search('Example');assert.equal(result.status,status);assert.equal(calls.length,1);assert.equal(JSON.stringify(result).includes('private provider'),false);}
 });
 test(name+' aborts at configured deadline',async()=>{const p=create({apiKey:'fixture',timeouts:{search:5},fetcher:async(_url,{signal})=>new Promise((_,reject)=>{const keepAlive=setTimeout(()=>reject(Error('no abort')),200);signal.addEventListener('abort',()=>{clearTimeout(keepAlive);reject(signal.reason)},{once:true})})});assert.equal((await p.search('Bottle')).status,'timeout');});
}
test('Shopify URL lookup uses documented ids and preserves tracking',async()=>{let body;const p=createShopifyCatalog({fetcher:async(_u,o)=>{body=JSON.parse(o.body);return Response.json({result:{structuredContent:{products:[{...shop,url:'https://shop.example.com/p?shcgid=1&shclid=2'}]}}})}});const r=await p.lookupUrl('https://shop.example.com/p');assert.deepEqual(body.params.arguments.catalog.ids,['https://shop.example.com/p']);assert.match(r.products[0].url,/shcgid=1&shclid=2/);});
test('Shopify exchanges credentials once, reuses its token and refreshes before expiry',async()=>{
 let now=Date.parse('2026-11-06T13:00:00Z'),authCalls=0,toolCalls=0;
 const provider=createShopifyCatalog({clientId:'fixture-client',clientSecret:'fixture-secret',now:()=>now,fetcher:async(url,options)=>{
 if(url.includes('/auth/access_token')){authCalls++;assert.deepEqual(JSON.parse(options.body),{client_id:'fixture-client',client_secret:'fixture-secret',grant_type:'client_credentials'});return Response.json({access_token:'fixture.'+btoa(JSON.stringify({exp:Math.floor(now/1000)+3600}))+'.fixture'});}
 toolCalls++;assert.match(options.headers.Authorization,/^Bearer fixture\./);assert.equal(options.headers['x-user-id'],undefined);return Response.json({result:{structuredContent:{products:[shop]}}});
 }});
 await Promise.all([provider.search('Example'),provider.search('Example')]);assert.equal(authCalls,1);assert.equal(toolCalls,2);
 now+=3541000;assert.equal((await provider.search('Example')).status,'ok');assert.equal(authCalls,2);
});
test('Shopify does not silently fall back to keyless when credentials are incomplete or invalid',async()=>{
 let calls=0;const incomplete=createShopifyCatalog({clientId:'fixture-client',fetcher:async()=>{calls++;return Response.json({})}});assert.equal((await incomplete.search('Example')).status,'auth_error');assert.equal(calls,0);
 const invalid=createShopifyCatalog({clientId:'fixture-client',clientSecret:'fixture-secret',fetcher:async()=>Response.json({})});assert.equal((await invalid.search('Example')).status,'auth_error');
});
test('Shopify uses the saved catalog ID for text and photo searches without modifying lookup IDs',async()=>{
 const requests=[];const p=createShopifyCatalog({catalogId:'fixture-saved-catalog',fetcher:async(_u,options)=>{requests.push(JSON.parse(options.body).params.arguments.catalog);return Response.json({result:{structuredContent:{products:[shop]}}});}});
 await p.search('Example');await p.imageSearch({content_type:'image/jpeg',data:'/9j/AAAA'});await p.lookupUrl('https://shop.example.com/products/fixture');
 assert.equal(requests[0].catalog_id,'fixture-saved-catalog');assert.equal(requests[1].catalog_id,'fixture-saved-catalog');assert.deepEqual(requests[2].ids,['https://shop.example.com/products/fixture']);assert.equal(requests[2].catalog_id,undefined);
});
test('combo and quantity bundles stay out of product lookup while single variants remain valid',()=>{
 for(const title of ['Example Shampoo & Conditioner Combo','Example Bottle Multipack','Example Shampoo Twin','Example Shampoo 2 x 250ml']){assert.equal(isBundle({title}),true);assert.equal(mapChannel3({...c3,title}),null);assert.equal(mapShopify({...shop,title}),null);}
 assert.equal(isBundle({title:'Example 2-in-1 Shampoo 250ml'}),false);
});
