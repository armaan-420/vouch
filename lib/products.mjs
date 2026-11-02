export const DEFAULT_PRODUCTS=[
{id:'boj',brand:'BEAUTY OF JOSEON',name:'Relief Sun',formula:'Rice + Niacinamide · SPF 50+ PA++++'},
{id:'eltamd',brand:'ELTAMD',name:'UV Clear',formula:'Untinted · Broad-Spectrum SPF 46'},
{id:'skin1004',brand:'SKIN1004',name:'Hyalu-Cica Water-Fit Sun Serum UV',formula:'SPF 50 · US formula'},
{id:'supergoop',brand:'SUPERGOOP!',name:'Unseen Sunscreen',formula:'SPF 50'},
{id:'roundlab',brand:'ROUND LAB',name:'Birch Moisturizing Sunscreen UVLock',formula:'Broad Spectrum SPF 50 · US formula'},
{id:'medicube',brand:'MEDICUBE',name:'No Cast Just Glow Collagen Sunscreen',formula:'SPF 50'},
{id:'mixsoon',brand:'MIXSOON',name:'Bean Sunscreen',formula:'SPF 50'},
{id:'innisfree',brand:'INNISFREE',name:'Daily UV Defense Sunscreen',formula:'Broad Spectrum SPF 50+'}].map(p=>({...p,image:'/assets/'+p.id+'.png'}));
