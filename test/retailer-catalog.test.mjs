import test from 'node:test';
import assert from 'node:assert/strict';
import {jsonAt,cleanListing,parseRetailer,listingKey} from '../lib/retailer-catalog.mjs';
const source={id:'shop',brand:'Shop',origin:'https://shop.test',market:'US',imageHosts:['images.test']};
test('listing import rejects bundles, foreign links and unsupported images',()=>{
  const p={id:'1',brand:'Example',name:'Sun Fluid SPF50+',url:'/p/sun',image:'https://images.test/sun.jpg'};
  assert.equal(cleanListing(p,source).spf,'SPF50+');
  for(const name of ['Sun Fluid SPF50 Duo','Sunscreen 2pcs','Sunscreen Gift Kit','After Sun Gel','Sunscreen Multipack (3 count)','Sunscreen SPF50 150ml x2'])assert.equal(cleanListing({...p,name},source),null);
  assert.equal(cleanListing({...p,url:'https://foreign.test/p/sun'},source),null);
  assert.equal(cleanListing({...p,image:'https://foreign.test/sun.jpg'},source).image,null);
  assert.notEqual(listingKey({...p,catalogMarket:'US'}),listingKey({...p,catalogMarket:'Japan'}));
});
test('retailer script extraction reads JSON without evaluating executable tails',()=>{
  const text='{"name":"braces } and \\"quotes\\"","items":[1]} ; throw Error("must not run")';
  assert.deepEqual(jsonAt(text,0).items,[1]);
  const product={productId:'123',productName:'Sunscreen SPF 50',brandName:'Example',action:{url:'https://shop.test/p/sun'},image:{imageUrl:'https://images.test/sun.jpg'}};
  const html='window.__APOLLO_STATE__ = '+JSON.stringify({listing:{resultCount:130,pageSize:64,products:[product,product]}})+';dangerous()';
  const result=parseRetailer(html,{...source,kind:'ulta'});assert.equal(result.pages,3);assert.equal(result.products.length,1);
});
test('Care to Beauty import skips configurable cards which combine formulas',()=>{
  const p={id:'1',manufacturer_name:'Example',name:'Sunscreen SPF50',url:'/sun',image:'https://images.test/sun.jpg',product_type:'simple'};
  const html='window.category_data = '+JSON.stringify({collection:{pages:2,products:[p,{...p,id:'2',product_type:'configurable'}]}});
  const result=parseRetailer(html,{...source,kind:'care'});assert.equal(result.products.length,1);assert.equal(result.pages,2);
});
