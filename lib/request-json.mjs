export async function readJson(request,limit=8192){
  const invalid=message=>Object.assign(Error(message),{status:400});
  const tooLarge=()=>Object.assign(Error('Request too large.'),{status:413});
  if(Number(request.headers.get('content-length'))>limit)throw tooLarge();
  const reader=request.body?.getReader();if(!reader)throw invalid('Invalid request.');
  const chunks=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw tooLarge()}chunks.push(value)}
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value}catch{throw invalid('Invalid request.')}
}
