import {readFile,writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const env=await readFile(resolve(root,'../../mcp-kie-gpt6/.env'),'utf8');
const key=process.env.KIE_API_KEY || env.match(/^KIE_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g,'');
if(!key)throw new Error('KIE_API_KEY is missing.');
const jobs=JSON.parse(await readFile(join(root,'prompts.json'),'utf8')).jobs;
const stateDir=join(root,'tasks');
await mkdir(stateDir,{recursive:true});
async function api(path,body){
 const r=await fetch('https://api.kie.ai/api/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{throw new Error('Kie returned non-JSON HTTP '+r.status)}
 if(!r.ok||data.code!==200)throw new Error('Kie HTTP '+r.status+' code '+data.code+': '+String(data.msg).slice(0,250));
 return data.data;
}
async function exists(path){try{await access(path);return true}catch{return false}}
async function writeState(id,state){await writeFile(join(stateDir,id+'.json'),JSON.stringify(state,null,2))}
const cmd=process.argv[2],limit=Number(process.argv[3]||'110');
if(cmd==='credits'){console.log(JSON.stringify({credits:await api('chat/credit')}));}
else if(cmd==='submit'||cmd==='retry-failed'){
 let submitted=0;
 for(const j of jobs){
  if(submitted>=limit)break;
  let previous=null;
  if(await exists(join(stateDir,j.id+'.json'))){
   previous=JSON.parse(await readFile(join(stateDir,j.id+'.json'),'utf8'));
  }
  if(cmd==='retry-failed'){
   if(previous?.status!=='fail'||(previous.attempt||1)>=2)continue;
  }else if(previous&&(previous.taskId||!String(previous.error||'').includes('code 429:')))continue;
  const history=cmd==='retry-failed'?[...(previous.history||[]),{...previous,history:undefined}]:previous?.history||[];
  const state={id:j.id,productId:j.productId,status:'submitting',startedAt:new Date().toISOString(),attempt:cmd==='retry-failed'?(previous.attempt||1)+1:1,history};
  await writeState(j.id,state);
  try{
   const data=await api('jobs/createTask',{model:'gpt-image-2-5-flare-image-to-image',input:{prompt:j.prompt,input_urls:j.input_urls,aspect_ratio:j.aspect_ratio,resolution:j.resolution,background:j.background}});
   if(!data?.taskId)throw new Error('Missing task ID; do not retry automatically.');
   await writeState(j.id,{...state,status:'waiting',taskId:data.taskId});
   console.log(JSON.stringify({id:j.id,status:'submitted',taskId:data.taskId})); submitted++;
   await new Promise(r=>setTimeout(r,4500));
  }catch(e){
   await writeState(j.id,{...state,status:'submission_unresolved',error:e.message});
   throw new Error(j.id+': '+e.message);
  }
 }
 console.log(JSON.stringify({submitted}));
}
else if(cmd==='poll'){
 const names=(await readdir(stateDir)).filter(x=>x.endsWith('.json'));
 let next=0; const counts={};
 async function worker(){while(next<names.length){
  const name=names[next++];const st=JSON.parse(await readFile(join(stateDir,name),'utf8'));
  if(st.status==='downloaded'||st.status==='fail'||!st.taskId){counts[st.status]=(counts[st.status]||0)+1;continue}
  try{
   const data=await api('jobs/recordInfo?taskId='+encodeURIComponent(st.taskId));
   const update={...st,status:data.state,creditsConsumed:data.creditsConsumed,updatedAt:new Date().toISOString()};
   if(data.state==='success'){
    const results=typeof data.resultJson==='string'?JSON.parse(data.resultJson):data.resultJson;
    const urls=results?.resultUrls||[];
    if(urls.length!==1)throw new Error('Expected one image, got '+urls.length);
    const res=await fetch(urls[0],{signal:AbortSignal.timeout(90000)});if(!res.ok)throw new Error('Image download HTTP '+res.status);
    const ext=(res.headers.get('content-type')||'').includes('png')?'.png':'.jpg';
    const dest=join(root,'outputs',st.id+ext);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,Buffer.from(await res.arrayBuffer()));
    Object.assign(update,{status:'downloaded',path:dest,url:urls[0]});
    console.log(JSON.stringify({id:st.id,status:'downloaded',path:dest,creditsConsumed:data.creditsConsumed}));
   }else if(data.state==='fail'){update.error=data.failMsg;console.log(JSON.stringify({id:st.id,status:'fail',error:data.failMsg}));}
   await writeState(st.id,update);counts[update.status]=(counts[update.status]||0)+1;
  }catch(e){console.log(JSON.stringify({id:st.id,pollError:e.message}));counts.pollError=(counts.pollError||0)+1;}
 }}
 await Promise.all(Array.from({length:4},worker));console.log(JSON.stringify({counts}));
}
else if(cmd==='status'){
 const states=await Promise.all((await readdir(stateDir)).filter(x=>x.endsWith('.json')).map(async n=>JSON.parse(await readFile(join(stateDir,n),'utf8'))));
 console.log(JSON.stringify({total:jobs.length,submitted:states.length,counts:states.reduce((a,s)=>(a[s.status]=(a[s.status]||0)+1,a),{}),creditsConsumed:states.reduce((s,t)=>s+(Number(t.creditsConsumed)||0),0)}));
}else throw new Error('Use credits, submit [limit], retry-failed [limit], poll or status.');
