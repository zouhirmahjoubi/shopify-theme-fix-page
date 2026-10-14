const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=__dirname,origin='http://127.0.0.1:8767';
const ps='C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe';
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
function saveToken(token){return new Promise((resolve,reject)=>{const child=spawn(ps,['-NoProfile','-NonInteractive','-Command',"$printifySetupToken = [Console]::In.ReadToEnd().Trim(); [Environment]::SetEnvironmentVariable('PRINTIFY_API_TOKEN',$printifySetupToken,'User')"],{stdio:['pipe','ignore','pipe'],windowsHide:true});child.on('error',()=>reject(new Error('Could not save the Windows user variable.')));child.on('close',code=>code===0?resolve():reject(new Error('Could not save the Windows user variable.')));child.stdin.end(token);});}
const server=http.createServer(async(req,res)=>{
 if(req.method==='GET'&&(req.url==='/'||req.url==='/connect.html')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(path.join(root,'connect.html')));return;}
 if(req.method!=='POST'||req.url!=='/connect'){send(res,404,{message:'Not found'});return;}
 if(req.headers.origin!==origin||!String(req.headers['content-type']).startsWith('application/json')){send(res,403,{message:'Please use the local connection form.'});return;}
 let body='';for await(const chunk of req){body+=chunk;if(body.length>16384){send(res,413,{message:'Token is too long.'});return;}}
 try{let token=JSON.parse(body).token;if(typeof token!=='string'||token.length<20){send(res,400,{message:'Please enter a valid Printify API token.'});return;}
 const r=await fetch('https://api.printify.com/v1/shops.json',{headers:{Authorization:'Bearer '+token,'User-Agent':'Casify-Design-Studio'},signal:AbortSignal.timeout(30000)});
 if(!r.ok){send(res,400,{message:'Printify could not authorize this token. Check that it is valid and has access to your shops.'});return;}
 const shops=await r.json();if(!Array.isArray(shops)){send(res,400,{message:'Printify returned an unexpected response.'});return;}
 await saveToken(token);process.env.PRINTIFY_API_TOKEN=token;token='';body='';
 fs.writeFileSync(path.join(root,'printify-shops.json'),JSON.stringify(shops,null,2));fs.writeFileSync(path.join(root,'connection-ready.json'),JSON.stringify({connected:true,checkedAt:new Date().toISOString(),shopCount:shops.length},null,2));
 send(res,200,{connected:true,shopCount:shops.length});console.log('Printify connection saved successfully. Shops: '+shops.length);
 }catch(e){send(res,500,{message:'Connection failed. Please try again, or save PRINTIFY_API_TOKEN in your Windows user environment variables.'});}
});server.listen(8767,'127.0.0.1',()=>console.log('Local Printify connection form: '+origin+'/connect.html'));
