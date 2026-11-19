import html from '../../lib/categories-page.html?raw';
import {publicPage} from '../../lib/page-shell.mjs';
import {hostedPageAccount} from '../../lib/hosted-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return publicPage(html,request,hostedPageAccount)}
