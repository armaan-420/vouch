import {STANDARD_TAGS,DEFAULT_TAGS,categoryKey} from './product-tags.mjs';
export const initialTagVotes=()=>({products:{}});
export function productTagView({productId,category,taxonomy,votes,visitor}){
 const definitions={...Object.fromEntries(DEFAULT_TAGS.map(t=>[t.id,t])),...taxonomy.definitions};
 const assignment=taxonomy.products[productId],effectiveCategory=assignment?.category||category;
 const eligible=t=>t&&(!t.category||categoryKey(t.category)===categoryKey(effectiveCategory));
 const assigned=(assignment?.tagIds||[]).filter(id=>eligible(definitions[id]));
 const selections=votes.products[productId]?.visitors||{},counts={};
 for(const ids of Object.values(selections))for(const id of new Set(ids))if(eligible(definitions[id]))counts[id]=(counts[id]||0)+1;
 const selected=(selections[visitor]||[]).filter(id=>eligible(definitions[id]));
 const ids=[...new Set([...STANDARD_TAGS.map(t=>t.id),...assigned,...Object.keys(counts),...selected])];
 return {tags:ids.filter(id=>eligible(definitions[id])).map(id=>({...definitions[id],count:counts[id]||0,assigned:assigned.includes(id)})),selectedTagIds:selected};
}
