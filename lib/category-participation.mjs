// Flow participation is independent of endorsement: Skip also answers a card.
export function categoryParticipation({experiment,data},browser,account){
 const browsers=Array.isArray(browser)?browser:[browser];
 const answeredProductIds=experiment.products.filter(p=>{
  const answeredInBrowser=browsers.some(id=>['yes','no','brand','skip'].includes(data.baseVotes?.[p.id]?.[id])),opinion=account?.opinions?.['p:'+(p.skuId||p.onBoardId||p.id)];
  return answeredInBrowser||opinion?.experimentId===experiment.id&&['yes','no','brand','skip'].includes(opinion.verdict);
 }).map(p=>p.id);
 const answered=new Set(answeredProductIds),nextProductId=experiment.products.find(p=>!answered.has(p.id))?.id||null;
 return {status:answered.size===experiment.products.length&&answered.size?'done':answered.size?'partial':'new',nextProductId,answeredProductIds};
}
