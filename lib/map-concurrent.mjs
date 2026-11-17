// Bound outstanding storage/provider calls while retaining the source order.
export async function mapConcurrent(items, fn, concurrency=6) {
  const results=new Array(items.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
    while(next<items.length){const index=next++;results[index]=await fn(items[index],index);}
  }));
  return results;
}
