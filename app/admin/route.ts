import html from '../../lib/admin-page.html?raw';
import login from '../../lib/admin-login.html?raw';
import {isOrganizer} from '../../lib/hosted-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 return new Response(await isOrganizer(request)?html:login,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
