export function isAccountPage(pathname){
  return pathname==='/account'||pathname==='/community-leaderboard'||pathname==='/community-leaderboard/'||/^\/(profiles|products)\/[^/]+\/?$/.test(pathname);
}
const invitePreviews={
  '/account':{
    name:'Vouch',slug:'friend',description:'See what people actually use and share the products you’d vouch for.'
  },
  '/wharton':{
    name:'Vouch at Wharton',slug:'wharton',description:'See what your Wharton classmates actually use and share the products you’d vouch for.'
  }
};

export function withInvitePreview(html,path){
  const preview=invitePreviews[path];
  if(!preview)return html;
  const {name,slug,description}=preview;
  const title=`${name} — Real recs. Real human.`;
  const image=`https://v4ch.app/brand/${slug}-invite.png`;
  return html.replace('</head>',`<meta property="og:type" content="website">
<meta property="og:site_name" content="Vouch">
<meta property="og:url" content="https://v4ch.app${path}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${name} logo">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${name} logo">
</head>`);
}

export function accountPage(html,path){return new Response(withInvitePreview(html,path),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
