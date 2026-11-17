import login from '../../../lib/admin-login.html?raw';
export const dynamic='force-dynamic';
export function GET(){
 return new Response(login,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
