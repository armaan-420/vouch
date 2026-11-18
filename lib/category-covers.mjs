import {initialCategoryRegistry,resolveCategory} from './category-registry.mjs';

const seed=initialCategoryRegistry();
export function categoryCover(category='',registry=seed,categoryId){
 const resolved=resolveCategory(registry,{category,categoryId});
 return (resolved.matched&&registry.categories[resolved.id].cover)||'essentials';
}
