const {chromium}=require('C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
const themeId=process.argv[2];if(!themeId)throw new Error('Preview theme ID required');
const out=path.resolve('dev/payments-readiness-review');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const routes=[['home','/'],['shipping','/pages/shipping-policy'],['terms','/pages/terms-and-conditions'],['about','/pages/about-us'],['contact','/pages/contact'],['standard-product','/products/tech-fabric-magnetic-phone-case-for-iphone'],['printify-product','/products/phone-case-a-little-softer-pink-bow-protective-tough-case']];
 const result={themeId,routes:[],errors};
 for(const [name,route]of routes){
   const res=await page.goto('https://casiffy.myshopify.com'+route+'?preview_theme_id='+themeId,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForTimeout(2500);
   const info=await page.evaluate(()=>({url:location.href,title:document.title,theme:window.Shopify?.theme,heading:document.querySelector('h1')?.textContent?.trim(),text:document.body.innerText,overflow:document.documentElement.scrollWidth>innerWidth+2,liquidErrors:document.body.innerText.includes('Liquid error'),forms:[...document.querySelectorAll('form[action*="cart/add"]')].map(f=>({action:f.action,selects:[...f.querySelectorAll('select')].map(s=>({name:s.name,id:s.id,options:[...s.options].map(o=>({value:o.value,text:o.textContent}))})),buttons:[...f.querySelectorAll('button')].map(b=>({text:b.textContent.trim(),type:b.type,disabled:b.disabled})),variant:f.querySelector('input[name="id"]')?.value}))}));
   info.name=name;info.status=res.status();
   if(['home','shipping','standard-product','printify-product'].includes(name))await page.screenshot({path:path.join(out,'preview-'+name+'-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);info.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
   if(['home','standard-product','printify-product'].includes(name))await page.screenshot({path:path.join(out,'preview-'+name+'-mobile.png'),fullPage:true});
   await page.setViewportSize({width:1440,height:1000});
   result.routes.push(info);
   console.log(JSON.stringify({name,status:info.status,theme:info.theme?.id,heading:info.heading,overflow:info.overflow,mobileOverflow:info.mobileOverflow,liquidErrors:info.liquidErrors,forms:info.forms,textExcerpt:info.text.slice(0,700)}));
 }
 fs.writeFileSync(path.join(out,'preview-qa.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({errors,routeCount:result.routes.length}));await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
