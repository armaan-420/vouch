import html from '../../../lib/account-page.html?raw';
import {accountPage} from '../../../lib/account-pages.mjs';
export const dynamic='force-dynamic';
export async function GET(){return accountPage(html)}
