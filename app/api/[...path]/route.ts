import {hostedApi} from '../../../lib/hosted-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return hostedApi(request)}
export async function POST(request:Request){return hostedApi(request)}
