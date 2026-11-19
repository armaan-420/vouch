import html from '../../lib/wharton-page.html?raw';
import {accountPage} from '../../lib/account-pages.mjs';
import {pilotLandingPage} from '../../lib/pilot-events.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return pilotLandingPage(request,accountPage(html,'/wharton'))}
