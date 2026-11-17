import {searchTerms} from './search-matching.mjs';
import {isSunscreen} from './catalog/normalize.mjs';
import {publicExperiment} from './experiment-management.mjs';
import {collectionStatus} from './experiment-schedule.mjs';
const aliases={'water bottle':['water bottles','sports water bottles'],'tv':['television','televisions'],'sunscreen':['sunscreens'],'shampoo':['shampoos']};
const normalized=s=>searchTerms(s).join(' ');
export function matchEdits(product,edits,now=Date.now()){
 const category=normalized(product.category);
 return edits.filter(e=>publicExperiment(e)&&!e.deleting&&collectionStatus(e,now)==='open').filter(e=>{
  const label=normalized(e.category),labels=[e.category,...(e.searchAliases||[]),...(aliases[label]||[])].map(normalized);
  return category&&labels.includes(category)&&(label!=='sunscreen'||isSunscreen(product));
 });
}
