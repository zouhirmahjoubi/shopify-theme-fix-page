const {chromium}=require('C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
const themeId=188985999605,out=path.resolve('dev/payments-readiness-review');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(),result={products:[],policyChecks:{},errors:[]};page.on('pageerror',e=>result.errors.push(e.message));
 for(const [name,handle]of [['standard','tech-fabric-magnetic-phone-case-for-iphone'],['printify','phone-case-a-little-softer-pink-bow-protective-tough-case']]){
  await page.goto('https://casiffy.myshopify.com/products/'+handle+'?preview_theme_id='+themeId,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForTimeout(6000);
  await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  const form=page.locator('form[action*="/cart/add"]').first();
  await form.getByRole('radio',{name:/^1 case/}).click();
  const select=form.locator('select[name^="options"]').first();await select.selectOption({index:1});
  await page.waitForTimeout(250);
  const chosen=await form.locator('input[name="id"]').inputValue();
  await page.evaluate(async()=>{await fetch('/cart/clear.js',{method:'POST'});});
  const addResponse=page.waitForResponse(r=>r.url().includes('/cart/add')&&r.request().method()==='POST');
  await form.locator('button[type="submit"]').click();const added=await addResponse;
  const cart=await page.evaluate(async()=>{const r=await fetch('/cart.js');return await r.json();});
  const product=await page.evaluate(async h=>{const r=await fetch('/products/'+h+'.js');return await r.json();},handle);
  const item=cart.items.find(i=>String(i.id)===chosen),variant=product.variants.find(v=>String(v.id)===chosen);
  const info={name,chosen,chosenOptions:variant?.options,status:added.status(),quantity:cart.item_count,matchingSelectedVariant:!!item,priceMatchesCatalog:item?.original_price===variant?.price,compareAtFromCatalog:variant?.compare_at_price,cartTotal:cart.total_price};
  if(name==='standard'){
   await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
   await form.getByRole('radio',{name:/Save 18%.*2 cases/}).click();
   await page.evaluate(async()=>{await fetch('/cart/clear.js',{method:'POST'});});
   const bundleResponse=page.waitForResponse(r=>r.url().includes('/cart/add')&&r.request().method()==='POST');await form.locator('button[type="submit"]').click();await bundleResponse;
   const bundle=await page.evaluate(async()=>await(await fetch('/cart.js')).json());info.bundle={quantity:bundle.item_count,total:bundle.total_price,originalTotal:bundle.original_total_price,discounts:bundle.cart_level_discount_applications.map(d=>({title:d.title,value:d.value,valueType:d.value_type}))};
  }
  await page.goto('https://casiffy.myshopify.com/products/'+handle+'?preview_theme_id='+themeId,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(6000);await page.screenshot({path:path.join(out,'preview-'+name+'-viewport.png'),fullPage:false});
  result.products.push(info);console.log(JSON.stringify(info));
 }
 for(const [name,route]of [['shipping','shipping-policy'],['terms','terms-and-conditions'],['about','about-us']]){
  await page.goto('https://casiffy.myshopify.com/pages/'+route+'?preview_theme_id='+themeId,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(1000);
  const body=await page.locator('[data-cvd-body]').innerText();result.policyChecks[name]={body,overrideVisible:name==='shipping'?/Printify/.test(body)&&/United States/.test(body)&&/1.2 business days/.test(body):name==='terms'?body.includes('Payments are processed using the payment methods displayed at checkout.')&&!body.includes('through Shopify Payments'):body.length>100};
 }
 await page.goto('https://casiffy.myshopify.com/?preview_theme_id='+themeId,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(2500);
 await page.screenshot({path:path.join(out,'preview-home-viewport.png'),fullPage:false});
 await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}scrollTo(0,0);});await page.waitForTimeout(2000);
 result.media=await page.evaluate(()=>({productImages:[...document.querySelectorAll('main img')].filter(i=>(i.src.includes('cdn.shopify')||i.src.includes('/cdn/shop/'))).map(i=>({alt:i.alt,loaded:i.complete&&i.naturalWidth>0,source:i.src})),overflow:document.documentElement.scrollWidth>innerWidth+2,text:document.body.innerText}));
 await page.screenshot({path:path.join(out,'preview-home-loaded-desktop.png'),fullPage:true});
 await page.setViewportSize({width:820,height:1180});result.tabletOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 await page.evaluate(async()=>{await fetch('/cart/clear.js',{method:'POST'});});
 fs.writeFileSync(path.join(out,'commerce-qa.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({policies:Object.fromEntries(Object.entries(result.policyChecks).map(([k,v])=>[k,v.overrideVisible])),imageCount:result.media.productImages.length,brokenImages:result.media.productImages.filter(i=>!i.loaded).length,desktopOverflow:result.media.overflow,tabletOverflow:result.tabletOverflow,errors:result.errors}));await browser.close();
})().catch(e=>{console.error(e.stack);process.exit(1);});


