const width=1080,height=1920,inset=82;
const serif="'Instrument Serif', Georgia, serif";
const sans="'DM Sans', sans-serif";
const emblem='/brand/vouch-emblem.svg';

async function image(src) {
  if(!src)return null;
  try{
    const url=new URL(src,location.origin);
    if(url.origin!==location.origin||!(/^\/(assets\/|api\/account\/photos\/)/.test(url.pathname)||url.pathname===emblem))return null;
    const response=await fetch(url,{redirect:'error'});
    if(!response.ok)return null;
    const object=URL.createObjectURL(await response.blob());
    try{
      const picture=new Image();
      picture.src=object;
      await picture.decode();
      return picture;
    }finally{URL.revokeObjectURL(object);}
  }catch{return null;}
}

function ellipsis(ctx,text,maxWidth,force=false) {
  if(!force&&ctx.measureText(text).width<=maxWidth)return text;
  const letters=Array.from(text);
  while(letters.length&&ctx.measureText(letters.join('')+'…').width>maxWidth)letters.pop();
  return letters.join('').trimEnd()+'…';
}

function wrap(ctx,text,maxWidth,maxLines=2) {
  const words=String(text).trim().split(/\s+/);
  const lines=[];
  let line='';
  for(const [i,word] of words.entries()){
    const candidate=(line+' '+word).trim();
    if(ctx.measureText(candidate).width<=maxWidth){line=candidate;continue;}
    if(lines.length===maxLines-1)return [...lines,ellipsis(ctx,line||word,maxWidth,!!line||i<words.length-1)];
    if(line){lines.push(line);line=word;}
    else lines.push(ellipsis(ctx,word,maxWidth));
  }
  if(line&&lines.length<maxLines)lines.push(ellipsis(ctx,line,maxWidth));
  return lines;
}

function text(ctx,label,x,y,{size=36,font=sans,weight=400,color,align='left',maxWidth,maxLines}={}) {
  ctx.font=`${weight} ${size}px ${font}`;
  ctx.fillStyle=color;
  ctx.textAlign=align;
  const lines=maxWidth?wrap(ctx,label,maxWidth,maxLines):[label];
  lines.forEach((line,i)=>ctx.fillText(line,x,y+i*size*1.03));
  return lines.length*size*1.03;
}

function box(ctx,x,y,w,h,r,fill,stroke) {
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  ctx.fillStyle=fill;
  ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
}

function fit(ctx,img,x,y,w,h) {
  const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  const iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
  ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
}
function initial(name) {return Array.from((name||'').trim())[0]?.toUpperCase()||'';}

function product(ctx,img,name,x,y,w,h,colors) {
  box(ctx,x,y,w,h,32,colors.paper,colors.line);
  if(img)fit(ctx,img,x+22,y+22,w-44,h-44);
  else text(ctx,initial(name),x+w/2,y+h/2+h*.13,{font:serif,size:Math.min(w,h)*.42,color:colors.oliveText,align:'center'});
}

function avatar(ctx,img,name,cx,cy,r,colors,stroke=colors.paper) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.clip();
  ctx.fillStyle=colors.oliveText;
  ctx.fillRect(cx-r,cy-r,2*r,2*r);
  if(img){
    const scale=2*r/Math.min(img.naturalWidth,img.naturalHeight);
    const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    ctx.drawImage(img,cx-w/2,cy-h/2,w,h);
  }else text(ctx,initial(name),cx,cy+r*.34,{font:serif,size:r*1.14,color:colors.paper,align:'center'});
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle=stroke;
  ctx.lineWidth=5;
  ctx.stroke();
}

function footer(ctx,logo,colors,dark=false,vouch=false) {
  const tone=dark?colors.paper:colors.ink;
  ctx.strokeStyle=dark?colors.olive:colors.line;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(inset,1725);ctx.lineTo(width-inset,1725);ctx.stroke();
  text(ctx,dark?'Settle it at v4ch.app':vouch?'v4ch.app':'v4ch.app/wharton',inset,1821,{color:tone,weight:700});
  if(logo)ctx.drawImage(logo,width-inset-83,1764,83,83);
}

async function drawPicks(ctx,card,colors) {
  const images=await Promise.all(card.rows.map(row=>image(row.image)));
  const spacing=233;
  card.rows.forEach((row,i)=>{
    const y=567+i*spacing;
    product(ctx,images[i],row.name,inset,y,176,176,colors);
    const x=inset+204,maxWidth=width-inset-x;
    const lineHeight=text(ctx,row.name,x,y+63,{size:43,weight:700,color:colors.ink,maxWidth});
    text(ctx,row.category+' · '+(row.others?'+ '+row.others+' classmates':'First to vouch'),x,y+79+lineHeight,{size:30,color:colors.oliveText,maxWidth});
  });
  const y=630+card.rows.length*spacing;
  ctx.font='500 48px '+sans;
  const prefix='Whose taste do ',middle='you';
  const x=inset+ctx.measureText(prefix).width,highlight=ctx.measureText(middle).width;
  box(ctx,x-3,y-42,highlight+9,55,7,colors.lime);
  text(ctx,prefix+middle+' trust?',inset,y,{size:48,weight:500,color:colors.ink});
}
async function drawWinner(ctx,card,colors) {
  const row=card.winner;
  const [picture,...avatars]=await Promise.all([image(row.image),...row.people.map(person=>image(person.photo))]);
  product(ctx,picture,row.name,inset,548,width-2*inset,737,colors);
  text(ctx,row.name,inset,1370,{font:serif,size:59,color:colors.paper,maxWidth:width-2*inset});
  row.people.forEach((person,i)=>avatar(ctx,avatars[i],person.displayName,inset+51+i*75,1568,50,colors,colors.ink));
  text(ctx,'Vouched by '+row.count+' classmates',inset+(row.people.length?row.people.length*75+44:0),1582,{size:36,color:colors.paper});
}

async function drawLeaderboard(ctx,card,colors) {
  const images=await Promise.all(card.rows.map(row=>image(row.photo)));
  let y=543;
  for(const [i,row] of card.rows.entries()){
    if(row.separate)y+=28;
    const w=width-2*inset;
    box(ctx,inset,y,w,146,24,row.isYou?colors.lime:colors.paper,row.isYou?null:colors.line);
    text(ctx,String(row.rank),inset+50,y+88,{size:43,font:serif,color:colors.ink,align:'center'});
    avatar(ctx,images[i],row.name,inset+137,y+73,42,colors,row.isYou?colors.lime:colors.paper);
    ctx.font='700 40px '+sans;
    const lines=wrap(ctx,row.name,565);
    text(ctx,row.name,inset+203,y+(lines.length===2?64:87),{size:40,weight:700,color:colors.ink,maxWidth:565});
    text(ctx,String(row.count),width-inset-28,y+88,{size:40,weight:700,color:colors.ink,align:'right'});
    y+=163;
  }
  text(ctx,'Public vouches',inset,y+54,{size:36,color:colors.oliveText});
}

async function drawVouch(ctx,card,colors) {
  const maxWidth=width-2*inset,p=card.product;
  const segments=card.review?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(card.review)]:[];
  const quote=segments.length?'“'+segments.slice(0,120).map(part=>part.segment).join('').trimEnd()+(segments.length>120?'…':'')+'”':'';
  ctx.font='600 55px '+sans;
  const nameHeight=wrap(ctx,p.name,maxWidth).length*56.65;
  ctx.font='italic 400 49px '+serif;
  const reviewHeight=quote?wrap(ctx,quote,maxWidth,4).length*50.47+28:0;
  ctx.font='500 30px '+sans;
  let x=0,row=0;
  const pills=card.tags.map(tag=>{
    const label=ellipsis(ctx,tag,(maxWidth-28)/2-36),w=ctx.measureText(label).width+36;
    if(x+w>maxWidth){x=0;row++;}
    const position={label,w,x,row};
    x+=w+14;
    return position;
  });
  const tagsHeight=pills.length?(row+1)*58+16:0;
  const scoreHeight=card.score==null?0:105;
  const tileTop=520,tileEnd=1665-nameHeight-reviewHeight-tagsHeight-scoreHeight-112;
  product(ctx,await image(p.image),p.name,inset,tileTop,maxWidth,tileEnd-tileTop,colors);
  let y=tileEnd+50;
  text(ctx,p.brand.toUpperCase(),inset,y,{size:28,weight:700,color:colors.oliveText,maxWidth,maxLines:1});
  y+=text(ctx,p.name,inset,y+60,{size:55,weight:600,color:colors.ink,maxWidth})+63;
  if(quote)y+=text(ctx,quote,inset,y,{font:serif,weight:'italic 400',size:49,color:colors.ink,maxWidth,maxLines:4})+28;
  for(const pill of pills){
    const py=y-33+pill.row*58;
    box(ctx,inset+pill.x,py,pill.w,48,24,colors.paper,colors.line);
    text(ctx,pill.label,inset+pill.x+18,py+34,{size:30,weight:500,color:colors.ink});
  }
  y+=tagsHeight;
  if(card.score==null)return;
  ctx.fillStyle=colors.line;
  ctx.fillRect(inset,y-25,maxWidth,2);
  const cx=inset+38,cy=y+35;
  ctx.lineWidth=6;
  for(const [arc,color] of [[1,colors.line],[card.score/10,colors.olive]]){
    ctx.beginPath();
    ctx.strokeStyle=color;
    ctx.arc(cx,cy,34,-Math.PI/2,-Math.PI/2+arc*2*Math.PI);
    ctx.stroke();
  }
  text(ctx,card.score.toFixed(1),cx,cy+10,{size:29,weight:700,color:colors.oliveText,align:'center'});
  text(ctx,'Vouch score · '+card.ratings+(card.ratings===1?' rating':' ratings'),inset+96,cy+13,{size:37,weight:600,color:colors.ink,maxWidth:maxWidth-96,maxLines:1});
}

export async function makeCard(card) {
  const styles=getComputedStyle(document.documentElement);
  const colors=Object.fromEntries(Object.entries({paper:'--paper',ink:'--ink',lime:'--green',olive:'--pilot-olive',oliveText:'--pilot-olive-text',line:'--line'}).map(([key,token])=>[key,styles.getPropertyValue(token).trim()]));
  const [logo]=await Promise.all([image(emblem),document.fonts.load("400 104px 'Instrument Serif'"),document.fonts.load("400 36px 'DM Sans'"),document.fonts.load("700 43px 'DM Sans'")]);
  if(card.kind==='vouch')await document.fonts.load("italic 400 49px 'Instrument Serif'");
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Could not make this image.');
  const dark=card.kind==='winner';
  ctx.fillStyle=dark?colors.ink:colors.paper;
  ctx.fillRect(0,0,width,height);
  if(logo)ctx.drawImage(logo,inset,81,104,104);
  text(ctx,card.eyebrow,inset,263,{size:34,weight:700,color:dark?colors.lime:colors.oliveText,maxWidth:width-2*inset});
  text(ctx,card.headline,inset,391,{size:104,font:serif,color:dark?colors.paper:colors.ink,maxWidth:width-2*inset});
  if(dark)await drawWinner(ctx,card,colors);
  else if(card.kind==='leaderboard')await drawLeaderboard(ctx,card,colors);
  else if(card.kind==='vouch')await drawVouch(ctx,card,colors);
  else await drawPicks(ctx,card,colors);
  footer(ctx,logo,colors,dark,card.kind==='vouch');
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not make this image.')),'image/png'));
}

export function cardAlt(card) {
  if(card.kind==='vouch')return 'Share card: '+card.firstName+' vouches for '+[card.product.brand,card.product.name].filter(Boolean).join(' ')+(card.score==null?'':', Vouch score '+card.score.toFixed(1)+' from '+card.ratings+(card.ratings===1?' rating':' ratings'));
  if(card.kind==='winner')return `Share card: ${card.title}, ${card.winner.name}, vouched by ${card.winner.count} classmates`;
  if(card.kind==='leaderboard')return 'Share card: Wharton leaderboard, '+card.rows.map(row=>`${row.rank}. ${row.name}, ${row.count} public vouches`).join('; ');
  const [first,...rest]=card.rows;
  return `Share card: ${card.title}, ${first.name}${rest.length?' and '+rest.length+' more':''}`;
}
