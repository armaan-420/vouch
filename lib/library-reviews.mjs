import {initialAccounts,productKey} from './account-records.mjs';
import {tokens} from './catalog/normalize.mjs';
import {channel3CategorySlugs} from './catalog/providers/channel3.mjs';
import {voteCounts,voteScore} from './vouch-api.mjs';

const labelKey=label=>tokens(label).join('-');
const providerSlugs=label=>channel3CategorySlugs.get(tokens(label).join(' '))||[];
const categoryId=label=>providerSlugs(label)[0]||labelKey(label);
const references=product=>[product.id,...[product,...(product.alternateRefs||[])]
 .filter(ref=>ref.provider&&ref.providerId).map(ref=>ref.provider+':'+ref.providerId)];

export async function withLibraryReviews(store,editProducts,accountRecords){
 const data=accountRecords??await (await store.scope('accounts-v1',initialAccounts)).read();
 const products=new Map(editProducts.map(p=>[p.id,{...p,categoryId:categoryId(p.category)}]));
 const categories=new Map();
 for(const p of products.values()){
  for(const key of [p.categoryId,labelKey(p.category),...providerSlugs(p.category)])categories.set(key,p.category);
 }
 const categoryFor=product=>{
  const title=product.category?.trim();
  const slug=product.categorySlug||categoryId(title);
  const existing=categories.get(slug)||categories.get(labelKey(title));
  if(existing)return {category:existing,categoryId:categoryId(existing)};
  return {category:title||'Uncategorized',categoryId:slug||'uncategorized'};
 };
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
  products.set(id,{id,name,brand:brand||'',variantLabel:variantLabel||null,
   ...(provider?{provider,providerId,alternateRefs}:{}),...categoryFor(p),
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
