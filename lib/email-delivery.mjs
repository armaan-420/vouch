/** HTTPS-only transactional delivery; the API key remains on the server.
 * @param {{apiKey?:string,from?:string,fetcher?:typeof fetch}} [options]
 */
export function createResendDelivery({apiKey,from,fetcher=fetch}={}){
 if(!apiKey||!from)return undefined;
 return async function sendCode({email,code,verificationUrl,expiresIn}){
  const response=await fetcher('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
   body:JSON.stringify({from,to:[email],subject:verificationUrl?'Verify your Vouch email':'Your Vouch sign-in code',text:verificationUrl?`Verify your email and sign in to Vouch: ${verificationUrl}\n\nThis link expires in ${Math.ceil(expiresIn/60)} minutes. If you did not request it, you can ignore this email.`:`Your Vouch sign-in code is ${code}. It expires in ${Math.ceil(expiresIn/60)} minutes. If you did not request this code, you can ignore this email.`}),
   signal:AbortSignal.timeout(10000),
  });
  if(!response.ok)throw Error('Email delivery failed.');
 };
}

// Category-only notification; never include suggestion notes or browser identity.
export function createSuggestionDelivery({apiKey,from,adminUrl,fetcher=fetch}={}){
 if(!apiKey||!from||!adminUrl)return undefined;
 return async ({email,category,state,key,idempotencyKey})=>{
  const url=new URL(adminUrl);url.hash='suggestions/'+encodeURIComponent(key||'');
  const label={ready:'Ready for approval',needs_attention:'Research complete — sources or photos need attention',failed:'Research stalled — action needed',rejected:'Suggestion could not become a draft'}[state]||'Review needed';
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify({from,to:[email],subject:'Vouch: '+label,text:`${category}: ${label}. Nothing has been published. Review at ${url.href}`}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Notification delivery failed.');
  return response.json();
 };
}
