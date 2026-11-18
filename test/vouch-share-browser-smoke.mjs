import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '../../Codex Reviews/browser-tools/node_modules/playwright/index.mjs';
import {createVouchServer} from '../server.mjs';

const directory=await fs.mkdtemp('.data/card-d-');
const output=path.resolve(process.env.VOUCH_CARD_D_OUTPUT||'../output/wharton-pilot-share/card-d');
await fs.mkdir(output,{recursive:true});
const server=await createVouchServer({directory,productSearch:{
  config:{whereToBuy:true},find:async()=>null,search:async()=>({products:[]}),
  detail:async()=>({product:{name:'Sample product'},offers:[{retailer:'Sample retailer',url:'https://example.test/buy',price:18,currency:'USD'}]})
},autoOptions:{env:{EXPERIMENT_AUTO_BUILD:'off'}}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();
try{
 for(const width of [320,360,375,430,768,1024,1280,1440]){
  const context=await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();
  await page.addInitScript(()=>Object.defineProperty(navigator,'share',{value:undefined}));
  const post=async(route,data)=>{
    const response=await context.request.post(origin+route,{headers:{Origin:origin},data});
    assert.ok(response.ok(),route+' '+response.status());
    return response.json();
  };
  const email='card-d-'+width+'@wharton.upenn.edu';
  const {challengeId,previewCode}=await post('/api/auth/start',{email});
  await post('/api/auth/verify',{challengeId,code:previewCode});
  const {claimToken}=await (await context.request.get(origin+'/api/account/edit')).json();
  await post('/api/account/signup',{email,claimToken,displayName:'Priya Sample'});
  const check=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(origin+'/products/boj');
  const share=page.getByRole('button',{name:'Share product',exact:true});
  await share.press('Enter');
  await page.getByText('Product link copied.').waitFor();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),origin+'/products/boj');
  assert.equal(await page.getByRole('button',{name:'Share your vouch',exact:true}).count(),0);
  await check();
  if(width===360||width===1440)await page.screenshot({path:path.join(output,'product-before-'+width+'.png')});
  await page.locator('.photo-vote-option[data-verdict=yes]').click();
  await page.getByText(/Vouched\. Share your vouch is available/).waitFor();
  const saved=page.getByRole('button',{name:'Share your vouch',exact:true});
  assert.ok((await saved.boundingBox()).height>=44);
  await post('/api/events',{type:'answer',productId:'boj',value:'yes',comment:'Lightweight enough that I wear it every morning.'});
  const {tags}=await (await context.request.get(origin+'/api/products/boj')).json();
  await post('/api/products/boj',{tagIds:tags.slice(0,3).map(tag=>tag.id)});
  await check();
  if(width===360||width===1440){await saved.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'product-after-'+width+'.png')});}
  await saved.press('Enter');
  const dialog=page.getByRole('dialog',{name:'Share your vouch'});
  const preview=dialog.getByRole('img',{name:/Share card: Priya vouches/});
  await preview.waitFor();
  assert.deepEqual(await preview.evaluate(async el=>{await el.decode();return [el.naturalWidth,el.naturalHeight]}),[1080,1920]);
  await check();
  if(width===360||width===1440)await page.screenshot({path:path.join(output,'sheet-'+width+'.png')});
  for(let i=0;i<4;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));}
  await dialog.getByRole('button',{name:'Copy link'}).click();
  await dialog.getByText('Link copied',{exact:true}).waitFor();
  const link=await page.evaluate(()=>navigator.clipboard.readText());
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});
  assert.ok(await saved.evaluate(el=>el===document.activeElement));
  if(width===360){
    const full=await post('/api/pilot-share/vouch/boj',{});
    assert.equal(full.tags.length,3);
    assert.ok(full.review&&full.score!=null);
    const variants={full,'no-review':{...full,review:null},'no-tags':{...full,tags:[]},unrated:{...full,score:null,ratings:null},
      'long-name':{...full,product:{...full.product,name:'Extra Long Lightweight Everyday Sunscreen with Broad Spectrum Protection and a Smooth Natural Finish for Daily Use'}},
      'cross-origin-photo':{...full,product:{...full.product,image:'https://example.test/product.png'}}};
    for(const [label,card] of Object.entries(variants)){
      const bytes=await page.evaluate(async data=>{
        const {makeCard}=await import('/share-cards.js');
        return Array.from(new Uint8Array(await (await makeCard(data)).arrayBuffer()));
      },card);
      await fs.writeFile(path.join(output,'card-d-'+label+'.png'),Buffer.from(bytes));
    }
    await post('/api/account/vouch',{productId:'eltamd',verdict:'yes'});
    const unrated=await post('/api/pilot-share/vouch/eltamd',{});
    assert.equal(unrated.score,null);
    assert.equal(unrated.review,null);
    for(const [label,url] of [['rated',link],['unrated',origin+unrated.link]]){
      const html=await (await context.request.get(url)).text();
      const tags=html.match(/<head>([\s\S]+?)<\/head>/)[1].match(/<meta\b[^>]+>/g);
      await fs.writeFile(path.join(output,'meta-'+label+'.html'),tags.join('\n')+'\n');
    }
  }
  await page.goto(link);
  await page.getByRole('link',{name:'See it on Vouch',exact:true}).waitFor();
  await page.getByRole('heading',{name:'Where to buy'}).waitFor();
  await page.getByRole('link',{name:/Sample retailer, \$18\.00, opens in a new tab/}).waitFor();
  await check();
  if(width===360||width===1440)await page.screenshot({path:path.join(output,'share-signed-in-'+width+'.png')});
  const signedOut=await browser.newPage({viewport:{width,height:900}});
  await signedOut.goto(link);
  await signedOut.getByRole('link',{name:'Join the Wharton experiments',exact:true}).waitFor();
  assert.equal(await signedOut.locator('h1').count(),1);
  assert.equal(await signedOut.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===360||width===1440)await signedOut.screenshot({path:path.join(output,'share-signed-out-'+width+'.png')});
  await signedOut.close();
  await page.goto(origin+'/products/boj');
  await page.locator('.photo-vote-change').click();
  await page.locator('.photo-vote-option[data-verdict=no]').click();
  await page.getByText('Saved to your profile.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Share your vouch',exact:true}).count(),0);
  assert.equal((await context.request.get(link)).status(),404);
  await context.close();
  console.log('PASS Card D',width);
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
 await fs.rm(directory,{recursive:true,force:true});
}
