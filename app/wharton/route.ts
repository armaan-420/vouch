import html from '../../lib/wharton-page.html?raw';
import {accountPage} from '../../lib/account-pages.mjs';
export const dynamic='force-dynamic';
export async function GET(){return accountPage(html)}
