// Only canvas-normalized PNGs are stored. Drop every ancillary chunk, including
// eXIf, text and location metadata, again at the server trust boundary.
const invalid=()=>Object.assign(Error('That photo did not upload. Try a JPG, PNG or WebP under 5 MB.'),{status:400});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
export function cleanProfilePhoto(image){
  if(typeof image!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(image)||image.length>1000000)throw invalid();
  let bytes;try{bytes=Uint8Array.from(atob(image.slice(22)),c=>c.charCodeAt(0))}catch{throw invalid()}
  if(bytes.length<45||![137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))throw invalid();
  const view=new DataView(bytes.buffer),parts=[bytes.slice(0,8)];let offset=8,header=false,data=false,ended=false;
  while(offset+12<=bytes.length){
    const length=view.getUint32(offset),end=offset+12+length;if(end>bytes.length)throw invalid();
    const type=String.fromCharCode(...bytes.slice(offset+4,offset+8));
    if(crc32(bytes.subarray(offset+4,end-4))!==view.getUint32(end-4))throw invalid();
    if(!header){if(type!=='IHDR'||length!==13||view.getUint32(offset+8)!==400||view.getUint32(offset+12)!==400||bytes[offset+16]!==8||![2,6].includes(bytes[offset+17])||bytes[offset+18]||bytes[offset+19]||bytes[offset+20])throw invalid();header=true}
    else if(type==='IHDR')throw invalid();
    if(type==='IDAT'){if(!length)throw invalid();data=true}
    if(['IHDR','IDAT','IEND'].includes(type))parts.push(bytes.slice(offset,end));
    else if(type[0]===type[0].toUpperCase())throw invalid();
    offset=end;if(type==='IEND'){if(length||!data||offset!==bytes.length)throw invalid();ended=true;break}
  }
  if(!ended)throw invalid();
  const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let cursor=0;for(const p of parts){result.set(p,cursor);cursor+=p.length}return result;
}
export const bucketPhotoStorage=bucket=>bucket?{put:(key,bytes)=>bucket.put(key,bytes,{httpMetadata:{contentType:'image/png'}}),get:async key=>{const obj=await bucket.get(key);return obj?new Uint8Array(await obj.arrayBuffer()):null},delete:key=>bucket.delete(key)}:null;
