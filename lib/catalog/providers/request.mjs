export async function providerRequest(fetcher,url,options={},timeout=2500){
 // Workers supports manual/follow only. Return redirects as failures so provider
 // credentials are never forwarded to another destination.
 const start=Date.now();try{const response=await fetcher(url,{...options,redirect:'manual',signal:AbortSignal.timeout(timeout)});const status=response.ok?'ok':response.status===401||response.status===403?'auth_error':response.status===429?'rate_limited':'error';
 return {status,httpStatus:response.status,latency:Date.now()-start,data:response.ok?await response.json():null};
 }catch(error){return {status:['TimeoutError','AbortError'].includes(error.name)?'timeout':'error',httpStatus:null,latency:Date.now()-start,data:null};}
}
