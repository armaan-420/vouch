// A browser credential, independent of email sign-in. Only its digest is stored.
export const TESTER_COOKIE='vouch_tester_session';
export function testerIdentity(request){
 const values=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(TESTER_COOKIE+'='));
 const token=values.length===1?values[0].slice(TESTER_COOKIE.length+1):'';
 return /^[a-f0-9]{64}$/.test(token)?{subject:'tester:'+token,guest:true}:null;
}
export function testerCookie(request,token){return `${TESTER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token?31536000:0}${new URL(request.url).protocol==='https:'?'; Secure':''}`}
export function isWhartonEmail(email){return typeof email==='string'&&/^[^\s@]+@wharton\.upenn\.edu$/i.test(email.trim())}
export function validEmail(email){return typeof email==='string'&&email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
