export function retailerUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}
}

export function retailerOffers(offers){
  return (offers||[]).filter(o=>retailerUrl(o.url)&&Number.isFinite(o.price)&&o.price>=0)
    .map(o=>{
      try{return {...o,formattedPrice:new Intl.NumberFormat('en-US',{style:'currency',currency:o.currency||'USD'}).format(o.price)};}
      catch{return null;}
    }).filter(Boolean).sort((a,b)=>a.price-b.price).slice(0,5);
}
