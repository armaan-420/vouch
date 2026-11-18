import {retailerOffers as itemOffers,retailerUrl} from '../public/retailer-offers.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/accounts.js',import.meta.url),'utf8');
const context={
  URL,URLSearchParams,
  location:{pathname:'/products/current',search:'',hash:''},
  document:{getElementById(){},body:{classList:{add(){}}}},
};
const {itemBuyMarkup:buyMarkup,itemCategoryHeading,itemCategoryPicks,plural}=vm.runInNewContext(
  source.replace('  load();\n})();','  return {itemBuyMarkup,itemCategoryHeading,itemCategoryPicks,plural};\n})();'),
  context,
);
const itemBuyMarkup=(product,offers,options={})=>buyMarkup(product,offers,{...options,retailerUrl});
const product={id:'current',url:'https://fallback.example/',variantLabel:'Guava SPF 46',retailerCount:19};
const offer=(retailer,price)=>({retailer,price,currency:'USD',url:'https://'+retailer.toLowerCase()+'.example/'});

test('buy copy and destination follow the lowest offer, preserving catalog order on ties',()=>{
  const offers=itemOffers([offer('High',24),offer('Zeta',12),offer('Alpha',12)]);
  const markup=itemBuyMarkup(product,offers);
  assert.equal(plural(1,'retailer'),'1 retailer');
  assert.doesNotMatch(markup,/Guava|SPF|19 retailers|See current price|item-buy-price/);
  assert.match(markup,/<ul id="item-buy-offers" hidden>.*Zeta, \$12\.00, opens in a new tab, lowest price/);
  assert.match(markup,/aria-expanded="false" aria-controls="item-buy-offers"/);
  assert.match(markup,/Compare 3 retailers/);
  assert.match(markup,/class="item-buy" href="https:\/\/zeta.example\/" target="_blank" rel="sponsored noopener noreferrer"/);
  assert.match(markup,/Buy at Zeta\. Opens in a new tab/);

  const single=itemBuyMarkup(product,itemOffers([offer('Zeta',12)]));
  assert.match(single,/Buy at Zeta\. Opens in a new tab/);
  assert.match(single,/See retailer price/);
  assert.match(single,/<ul id="item-buy-offers" hidden>.*Zeta, \$12\.00, opens in a new tab/);
  assert.doesNotMatch(single,/Compare|>From<|>Lowest</);
});

test('buy row falls back to HTTPS and hides when there is no destination',()=>{
  const fallback=itemBuyMarkup(product,[]);
  assert.match(fallback,/href="https:\/\/fallback.example\/"/);
  assert.match(fallback,/>Buy now</);
  assert.doesNotMatch(fallback,/item-buy-price|sponsored|Compare/);
  assert.equal(itemBuyMarkup({url:'http://example.com/'},[]),'');
  assert.doesNotMatch(itemBuyMarkup({},[],{canCompare:true}),/item-buy-card/);
  assert.match(itemBuyMarkup(product,[],{canCompare:true}),/Compare retailers/);
});

test('category strip excludes the current product and its aliases and needs two scored picks',()=>{
  const row=(id,fields={})=>({id,href:'/products/'+id,score:8,...fields});
  const current={id:'current',skuId:'sku',alternateRefs:[{provider:'channel3',providerId:'alias'}]};
  const excluded=[row('current'),row('sku'),row('c3-alias'),row('old'),row('other',{skuId:'current'}),row('unscored',{score:null})];
  assert.equal(itemCategoryPicks([...excluded,row('one')],current,'old').length,0);
  const picks=itemCategoryPicks([...excluded,row('one'),row('two',{score:null,reviewScore:7}),row('three'),row('four')],current,'old');
  assert.deepEqual(Array.from(picks,p=>p.id),['one','two','three']);
});

test('category strip names match the product state',()=>{
  assert.equal(itemCategoryHeading(false,'Lip Balms'),'Also vouched in Lip Balms');
  assert.equal(itemCategoryHeading(true,'Phones'),'While it’s new: top-vouched Phones');
});
