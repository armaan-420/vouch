// Merchant purchase destinations matched to the checked-in catalog identities.
export const DEFAULT_PRODUCT_BUY_URLS={
 boj:'https://www.yesstyle.com/en/beauty-of-joseon-relief-sun-50ml/info.html/pid.1137908658',
 eltamd:'https://eltamd.com/products/uv-clear-broad-spectrum-spf-46',
 skin1004:'https://www.skin1004.com/products/hyalu-cica-water-fit-sun-serum-uv',
 supergoop:'https://supergoop.com/products/unseen-sunscreen-spf-50',
 roundlab:'https://roundlab.com/products/birch-moisturizing-uv-sunscreen',
 medicube:'https://medicube.us/products/no-cast-just-glow-collagen-sunscreen',
 mixsoon:'https://mixsoon.us/products/mixsoon-bean-sunscreen-50ml',
 innisfree:'https://us.innisfree.com/products/daily-uv-defense-sunscreen-spf-50'
};
export const DEFAULT_PRODUCTS=[
{id:'boj',brand:'BEAUTY OF JOSEON',name:'Relief Sun',formula:'Rice + Niacinamide · SPF 50+ PA++++'},
{id:'eltamd',brand:'ELTAMD',name:'UV Clear',formula:'Untinted · Broad-Spectrum SPF 46'},
{id:'skin1004',brand:'SKIN1004',name:'Hyalu-Cica Water-Fit Sun Serum UV',formula:'SPF 50 · US formula'},
{id:'supergoop',brand:'SUPERGOOP!',name:'Unseen Sunscreen',formula:'SPF 50'},
{id:'roundlab',brand:'ROUND LAB',name:'Birch Moisturizing Sunscreen UVLock',formula:'Broad Spectrum SPF 50 · US formula'},
{id:'medicube',brand:'MEDICUBE',name:'No Cast Just Glow Collagen Sunscreen',formula:'SPF 50'},
{id:'mixsoon',brand:'MIXSOON',name:'Bean Sunscreen',formula:'SPF 50'},
{id:'innisfree',brand:'INNISFREE',name:'Daily UV Defense Sunscreen',formula:'Broad Spectrum SPF 50+'}].map(p=>({...p,image:'/assets/'+p.id+'.png',url:DEFAULT_PRODUCT_BUY_URLS[p.id]}));
