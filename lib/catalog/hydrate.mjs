// One read-only hydration boundary covers nested boards, nomination responses,
// organizer views, account collections and public contributor/profile payloads.
export async function hydrateResponse(response,resolver){
 if(!resolver?.hydrate||!response?.headers.get('content-type')?.includes('application/json')||!response.ok)return response;
 const data=await response.json(),products=[];
 const walk=value=>{if(!value||typeof value!=='object')return;if(value.provider&&value.providerId&&value.name){products.push(value);return;}for(const child of Object.values(value))walk(child);};walk(data);
 if(products.length){const hydrated=await resolver.hydrate(products);products.forEach((p,i)=>{p.image=hydrated[i].image;p.images=hydrated[i].images;p.url=hydrated[i].url;});}
 return Response.json(data,{status:response.status,headers:response.headers});
}
