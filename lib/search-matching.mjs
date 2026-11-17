import {tokens} from './catalog/normalize.mjs';
const filler=new Set(['a','an','the','for','with','and','of','i','want','need','please']);
const fold=t=>t.replace(/cancelling/g,'canceling').replace(/ies$/,'y').replace(/s$/,'');
export const searchTerms=s=>tokens(s).filter(t=>!filler.has(t)).map(fold);
const prepared=new WeakMap();
export function matchRelevance(product,query){
 const terms=searchTerms(query);let title=prepared.get(product);if(!title){title=searchTerms([product.brand,product.name,product.category,...(product.searchAliases||[]),...(product.tags||[]).map(t=>t.label)].join(' '));prepared.set(product,title)}
 if(!terms.length)return 0;
 const compact=title.join(''),matched=terms.filter(term=>title.some(t=>t.startsWith(term))||compact.includes(term)).length;
 const exact=searchTerms(product.brand+' '+product.name).join(' ')===terms.join(' ');
 const brand=searchTerms(product.brand);
 return exact?100:Math.max(terms.some(t=>brand.some(b=>b.startsWith(t)))?40:0,Math.round(80*matched/terms.length));
}
export const globalBundle=p=>/\s\+\s|\b\d+\s*x\s+\w+/i.test(p.title||p.name||'')||(/\b(bundle|combo|multipack|variety pack)\b/i.test(p.title||p.name||'')&&/\s(?:and|&)\s/i.test(p.title||p.name||''));
