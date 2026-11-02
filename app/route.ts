import home from '../lib/home-page.html?raw';
import experiment from '../lib/experiment-page.html?raw';
import {experimentPage} from '../lib/experiment-pages.mjs';
import {hostedApi} from '../lib/hosted-api';
export async function GET(request:Request){return experimentPage(request,{home,experiment,api:hostedApi})}
