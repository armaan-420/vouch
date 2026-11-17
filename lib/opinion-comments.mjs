// Notes accompany verdicts; they never contribute to scores or analytics.
export function cleanComment(value){
 if(typeof value!=='string'||value.trim().length>240)throw Object.assign(Error('Keep your comment to 240 characters.'),{status:400});
 return value.trim();
}
export function saveComment(data,kind,id,visitor,input,previous,now){
 if(previous===input.value&&!Object.hasOwn(input,'comment'))return;
 const bucket=kind+'Comments';data[bucket]??={};data[bucket][id]??={};
 const old=data[bucket][id][visitor];
 const text=input.value==='skip'||previous!==input.value?'':old?.text||'';
 data[bucket][id][visitor]={text:input.value==='skip'?'':Object.hasOwn(input,'comment')?cleanComment(input.comment):text,updatedAt:now};
}
