import html from '../../lib/admin-page.html?raw';
import {isOrganizer} from '../../lib/hosted-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  if(!request.headers.get('oai-authenticated-user-email'))return Response.redirect(new URL('/signin-with-chatgpt?return_to=%2Fadmin',request.url));
  if(!isOrganizer(request))return new Response('Organizer access only.',{status:403});
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
