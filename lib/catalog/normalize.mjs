import {brandKey} from '../brand-products.mjs';
export {brandKey};
export const tokens=text=>String(text??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
export const isBundle=p=>/\b(bundle|duo|trio|set|gift|kit|subscription|pack|combo|multipack|twin)\b|\d\s*\+\s*\d|\b\d+\s*[- ]?packs?\b|\b(?:[2-9]|\d{2,})\s*(?:x|×)\s*\d/i.test(p.title||p.name||'');
export const isSunscreen=p=>/sunscreen|sun screen|sun serum|sun cream|suncream|sun stick|sunstick|sun lotion|sun fluid|sun gel|sun milk|sun cushion|uv clear|uv defense|\bspf\s*\d/i.test(p.title||p.name||'');
export function variantLabel(text){return [...String(text||'').matchAll(/\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|ml|g)\b|\bSPF\s*\d+\+?|\b\d+\s*[- ]?pack\b/gi)].map(m=>m[0].replace(/\s+/g,' ').trim()).join(' · ')||null;}
// Conservative public-host validation. Provider servers resolve product URLs;
// Vouch never fetches arbitrary visitor-supplied URLs itself.
export function publicHttps(value){
 if(typeof value!=='string'||value.length>2048)return null;
 try{const u=new URL(value),h=u.hostname.toLowerCase().replace(/\.$/,'');
 if(u.protocol!=='https:'||u.username||u.password||u.port&&!['443'].includes(u.port)||!h.includes('.')||h.includes(':')||/^(localhost|.*\.(localhost|local|internal|test|invalid|home|lan))$/.test(h))return null;
 if(/^\d+\.\d+\.\d+\.\d+$/.test(h)){const [a,b]=h.split('.').map(Number);if(a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0)||a===100&&b>=64&&b<=127||a>=224||a===198&&(b===18||b===19))return null;}
 return u.href;
 }catch{return null;}
}
export function validGtin(code){if(typeof code!=='string'||! /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code))return false;let sum=0;for(let i=code.length-2,j=0;i>=0;i--,j++)sum+=Number(code[i])*(j%2?1:3);return (10-sum%10)%10===Number(code.at(-1));}
export function productName(title,brand){const name=String(title||'').trim();if(!brand)return name;const words=name.split(/\s+/);for(let n=1;n<=words.length;n++)if(brandKey(words.slice(0,n).join(' '))===brandKey(brand))return words.slice(n).join(' ')||name;return name;}
export const identity=p=>p?.provider?Object.fromEntries(['id','provider','providerId','brand','name','variantLabel','category','gtin','alternateRefs','photoOverride'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]])):p;
