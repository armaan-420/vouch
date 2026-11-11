// A durable outbox in the job record. Provider idempotency covers a crash after send.
export function createNotifications({store,env,notify,now=Date.now}){
 return {async deliver(){
  if(!notify||!env.SUGGESTION_NOTIFY_EMAIL)return false;
  const jobs=await store.scope('suggestion-jobs',()=>({jobs:{},budget:{}})),token=crypto.randomUUID(),time=now();
  const job=await jobs.transaction(d=>{
   for(const j of Object.values(d.jobs)){
    if(!['ready','needs_attention','failed','rejected'].includes(j.state))continue;
    const id=j.id+':'+(j.notificationCycle||0)+':'+(j.attempts||0)+':'+j.state;
    if(j.notification?.id!==id){
     if(j.notifiedAt&&!j.notificationError&&!j.notification&&!(j.notificationCycle>0))continue;
     j.notification={id,status:'pending',attempts:0};
    }
    const n=j.notification;
    if(n.status==='sent'||n.status==='failed'||n.lockedUntil>time||n.nextAttemptAt>time)continue;
    n.lease=token;n.lockedUntil=time+30000;n.attempts++;n.firstAttemptAt??=time;
    return structuredClone(j);
   }
   return null;
  });
  if(!job)return false;
  try{
   const result=await notify({email:env.SUGGESTION_NOTIFY_EMAIL,category:job.research?.canonicalCategory||job.category,state:job.state,key:job.key,idempotencyKey:job.notification.id});
   await jobs.transaction(d=>{const j=d.jobs[job.key],n=j?.notification;if(n?.lease!==token)return;n.status='sent';n.lockedUntil=0;n.lease=null;n.sentAt=new Date(now()).toISOString();n.deliveryId=result?.id||null;j.notifiedAt=n.sentAt;j.notificationError=null;});
  }catch{
   await jobs.transaction(d=>{const j=d.jobs[job.key],n=j?.notification;if(n?.lease!==token)return;n.lockedUntil=0;n.lease=null;n.nextAttemptAt=now()+Math.min(3600000,60000*2**(n.attempts-1));n.status=n.attempts>=10||now()-n.firstAttemptAt>20*3600000?'failed':'pending';j.notificationError=n.status==='failed'?'Email could not be delivered after repeated attempts. Review this suggestion here.':'Email delivery failed; an automatic retry is scheduled.';});
  }
  return true;
 }};
}
