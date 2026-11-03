// Curated starter identities, checked against manufacturer pages on 2026-11-02.
// No popularity, performance endorsements, or price claims are seeded.
export const WATER_BOTTLES = [
 ['owala-freesip-24oz','Owala','FreeSip Stainless Steel 24 oz','https://owalalife.com/products/freesip?Material=Stainless+Steel&Size=24oz'],
 ['hydroflask-wide-mouth-flex-straw-32oz','Hydro Flask','Wide Mouth with Flex Straw Cap 32 oz','https://www.hydroflask.com/32-oz-wide-mouth-with-flex-straw-cap-s'],
 ['stanley-iceflow-flip-straw-2-24oz','Stanley','IceFlow Bottle Flip Straw 2.0 24 oz','https://www.stanley1913.com/products/iceflow-bottle-flip-straw-2-0-24-oz'],
 ['yeti-rambler-flip-chug-26oz','YETI','Rambler with Flip Chug Cap 26 oz','https://www.yeti.com/drinkware/hydration/21071508305.html'],
 ['nalgene-wide-mouth-32oz','Nalgene','Wide Mouth Bottle 32 oz','https://nalgene.com/product/32oz-wide-mouth-bottle/'],
 ['camelbak-eddy-insulated-25oz','CamelBak','Eddy+ Insulated Stainless Steel 25 oz','https://www.camelbak.com/product/eddy%2B-25oz-water-bottle%2C-insulated-stainless-steel/CB-2809.html'],
 ['kleankanteen-classic-flip-seal-27oz','Klean Kanteen','Classic with Flip Seal Sport Cap 27 oz','https://www.kleankanteen.com/products/water-bottle-classic-27-oz'],
 ['swell-original-17oz',"S’well",'Original Bottle 17 oz','https://www.swell.com/products/original-bottle-17oz'],
].map(([id,brand,name,url])=>({id:'sku-'+id,brand,name,url,category:'Water bottles',formula:'',image:null,source:'Manufacturer',verifiedAt:'2026-11-02',searchAliases:['water bottle','water bottles']}));
