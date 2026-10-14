const fs=require('node:fs'),path=require('node:path');
const root=path.resolve('deliverables/christmas-merry-little-moments-2026-10-08');
const token=process.env.PRINTIFY_API_TOKEN;
async function api(endpoint){const r=await fetch('https://api.printify.com/v1'+endpoint,{headers:{Authorization:'Bearer '+token,'User-Agent':'Casify-Design-Studio'},signal:AbortSignal.timeout(45000)});const text=await r.text();if(!r.ok)throw new Error('Printify '+r.status+' '+text.slice(0,300));return JSON.parse(text);}
(async()=>{
 if(!token){console.log('Printify token not configured');return;}
 const shops=await api('/shops.json');fs.writeFileSync(path.join(root,'printify-shops.json'),JSON.stringify(shops,null,2));
 const catalog=await api('/catalog/blueprints/1273/print_providers/88/variants.json');fs.writeFileSync(path.join(root,'printify-catalog.json'),JSON.stringify(catalog,null,2));
 console.log(JSON.stringify({shops:shops.map(s=>({id:s.id,title:s.title,sales_channel:s.sales_channel})),provider:catalog.title,variants:catalog.variants.map(v=>({id:v.id,title:v.title,options:v.options,placeholders:v.placeholders}))},null,2));
})().catch(e=>{console.error(e.message.replaceAll(token||'never-token','[redacted]'));process.exitCode=1});
