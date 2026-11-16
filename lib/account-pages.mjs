export function isAccountPage(pathname){
  return pathname==='/account'||pathname==='/community-leaderboard'||pathname==='/community-leaderboard/'||/^\/(profiles|products)\/[^/]+\/?$/.test(pathname);
}
export function accountPage(html){return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
