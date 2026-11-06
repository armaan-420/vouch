/** HTTPS-only transactional delivery; the API key remains on the server.
 * @param {{apiKey?:string,from?:string,fetcher?:typeof fetch}} [options]
 */
export function createResendDelivery({apiKey,from,fetcher=fetch}={}){
 if(!apiKey||!from)return undefined;
 return async function sendCode({email,code,expiresIn}){
  const response=await fetcher('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
   body:JSON.stringify({from,to:[email],subject:'Your Vouch sign-in code',text:`Your Vouch sign-in code is ${code}. It expires in ${Math.ceil(expiresIn/60)} minutes. If you did not request this code, you can ignore this email.`}),
   signal:AbortSignal.timeout(10000),
  });
  if(!response.ok)throw Error('Email delivery failed.');
 };
}

// Category-only notification; never include suggestion notes or browser identity.
export function createSuggestionDelivery({apiKey,from,adminUrl,fetcher=fetch}={}){
 if(!apiKey||!from||!adminUrl)return undefined;
 return async ({email,category,state})=>{
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'A Vouch Edit is ready for review',text:`${category}: ${state.replaceAll('_',' ')}. Review and approve at ${adminUrl}`}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Notification delivery failed.');
 };
}
