import {env} from 'cloudflare:workers';
import {handleResearchMcp} from '../../lib/auto-experiments/maintenance-mcp.mjs';
import {advanceHostedSuggestions} from '../../lib/hosted-api';
import {createD1Store} from '../../lib/d1-store';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 return handleResearchMcp(request,{adminEmails:env.ADMIN_EMAILS,store:env.DB?createD1Store(env.DB):undefined,run:advanceHostedSuggestions});
}
