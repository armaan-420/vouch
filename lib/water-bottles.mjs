// Curated starter identities, checked against manufacturer pages on 2026-11-02.
// No popularity, performance endorsements, or price claims are seeded.
const images={owala:'owala.png',hydroflask:'hydroflask.png',stanley:'stanley.png',yeti:'yeti.png',nalgene:'nalgene.jpg',camelbak:'camelbak.png',kleankanteen:'kleankanteen.jpg',swell:'swell.jpg',takeya:'takeya.png'};
export const WATER_BOTTLES = [
 ['owala-freesip-24oz','Owala','FreeSip Stainless Steel 24 oz','https://owalalife.com/products/freesip?Material=Stainless+Steel&Size=24oz'],
 ['hydroflask-wide-mouth-flex-straw-32oz','Hydro Flask','Wide Mouth with Flex Straw Cap 32 oz','https://www.hydroflask.com/32-oz-wide-mouth-with-flex-straw-cap-s'],
 ['stanley-iceflow-flip-straw-2-24oz','Stanley','IceFlow Bottle Flip Straw 2.0 24 oz','https://www.stanley1913.com/products/iceflow-bottle-flip-straw-2-0-24-oz'],
 ['yeti-rambler-flip-chug-26oz','YETI','Rambler with Flip Chug Cap 26 oz','https://www.yeti.com/drinkware/hydration/21071508305.html'],
 ['nalgene-wide-mouth-32oz','Nalgene','Wide Mouth Bottle 32 oz','https://nalgene.com/product/32oz-wide-mouth-bottle/'],
 ['camelbak-eddy-insulated-25oz','CamelBak','Eddy+ Insulated Stainless Steel 25 oz','https://www.camelbak.com/product/eddy%2B-25oz-water-bottle%2C-insulated-stainless-steel/CB-2809.html'],
 ['kleankanteen-classic-flip-seal-27oz','Klean Kanteen','Classic with Flip Seal Sport Cap 27 oz','https://www.kleankanteen.com/products/water-bottle-classic-27-oz'],
 ['swell-original-17oz',"S’well",'Original Bottle 17 oz','https://www.swell.com/products/original-bottle-17oz'],
 ['takeya-actives-straw-24oz','Takeya','Actives Water Bottle with Straw Lid 24 oz','https://takeyausa.com/products/actives-insulated-water-bottle-w-straw?variant=42050670035053'],
].map(([id,brand,name,url])=>({id:'sku-'+id,brand,name,url,category:'Water bottles',formula:'',image:'/assets/water-bottles/'+images[id.split('-')[0]],source:'Manufacturer',verifiedAt:'2026-11-02',searchAliases:['water bottle','water bottles']}));

const bottleImages=Object.fromEntries(WATER_BOTTLES.map(p=>[p.id,p.image]));
export function needsBottleImages(registry){return [...Object.values(registry.skus),...Object.values(registry.experiments).flatMap(e=>e.products)].some(p=>!p.image&&bottleImages[p.id]);}
export function addBottleImages(registry){for(const p of [...Object.values(registry.skus),...Object.values(registry.experiments).flatMap(e=>e.products)])if(!p.image&&bottleImages[p.id])p.image=bottleImages[p.id];}
