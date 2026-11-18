import {initialAccounts,productKey} from './account-records.mjs';
import {categoryFields,initialCategoryRegistry,resolveCategory} from './category-registry.mjs';
import {voteCounts,voteScore} from './vouch-api.mjs';

const references=product=>[product.id,...[product,...(product.alternateRefs||[])]
 .filter(ref=>ref.provider&&ref.providerId).map(ref=>ref.provider+':'+ref.providerId)];

export async function withLibraryReviews(store,editProducts,accountRecords,registry=initialCategoryRegistry()){
 const data=accountRecords??await (await store.scope('accounts-v1',initialAccounts)).read();
 const products=new Map(editProducts.map(p=>[p.id,{...p,...categoryFields(resolveCategory(registry,p))}]));
 const aliases=new Map();
 for(const p of products.values())for(const ref of references(p))aliases.set(ref,p.id);
 const reviews=[];
 for(const account of Object.values(data.accounts)){
  if(account.visibility!=='public'||account.disabledAt||account.deletedAt)continue;
  for(const opinion of Object.values(account.opinions||{})){
   if(opinion.source!=='search'||opinion.visibility!=='public'||!['yes','no','brand'].includes(opinion.verdict))continue;
   const product=data.products[productKey(opinion.productId)]||opinion.product;
   if(!product?.id||!product.name)continue;
   reviews.push({account,opinion,product});
  }
 }
 // A public item endorsement qualifies a standalone listing. Its other public
 // ratings can then be counted without adding votes to any Edit.
 for(const {opinion,product:p} of reviews){
  if(opinion.verdict!=='yes')continue;
  const refs=references(p);
  const existing=refs.map(ref=>aliases.get(ref)).find(Boolean);
  if(existing){for(const ref of refs)aliases.set(ref,existing);continue;}
  const {id,name,brand,variantLabel,provider,providerId,alternateRefs}=p;
  const category=resolveCategory(registry,{...p,category:p.category?.trim()});
  // Keep existing Discover links for standalone provider categories.
  const fields=categoryFields(category);
  if(!category.matched&&p.categorySlug)fields.categoryId=p.categorySlug;
  products.set(id,{id,name,brand:brand||'',variantLabel:variantLabel||null,
   ...(provider?{provider,providerId,alternateRefs}:{}),category:category.label,...fields,
   formula:'',image:null,tags:[],href:'/products/'+encodeURIComponent(id),
   score:null,voteCounts:voteCounts()});
  for(const ref of refs)aliases.set(ref,id);
 }
 const ratings=new Map();
 for(const {account,opinion,product} of reviews){
  const id=references(product).map(ref=>aliases.get(ref)).find(Boolean);
  if(!id)continue;
  if(!ratings.has(id))ratings.set(id,new Map());
  const byAccount=ratings.get(id),previous=byAccount.get(account);
  if(!previous||(opinion.updatedAt||'')>(previous.updatedAt||''))byAccount.set(account,opinion);
 }
 for(const [id,byAccount] of ratings){
  const values=[...byAccount.values()].map(opinion=>opinion.verdict);
  Object.assign(products.get(id),{reviewCounts:voteCounts(values),reviewScore:voteScore(values)});
 }
 return [...products.values()];
}
