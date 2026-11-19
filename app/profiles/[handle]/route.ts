import html from '../../../lib/account-page.html?raw';
import {publicPage,accountLoading} from '../../../lib/page-shell.mjs';
import {hostedPageAccount} from '../../../lib/hosted-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return publicPage(html,request,hostedPageAccount,{loading:accountLoading(new URL(request.url).pathname)})}
