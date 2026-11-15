import {env} from 'cloudflare:workers';
import {handleResearchMcp} from '../../lib/auto-experiments/maintenance-mcp.mjs';
import {advanceHostedSuggestions} from '../../lib/hosted-api';
import {createD1Store} from '../../lib/d1-store';
import {getExecutionContext} from '../../lib/execution-context';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const ctx=getExecutionContext();
 return handleResearchMcp(request,{adminEmails:env.ADMIN_EMAILS,store:env.DB?createD1Store(env.DB):undefined,run:advanceHostedSuggestions,env,waitUntil:ctx?(promise:Promise<unknown>)=>ctx.waitUntil(promise):undefined});
}
