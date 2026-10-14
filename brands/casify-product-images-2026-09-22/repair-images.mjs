import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const env=await readFile(resolve(root,'../../mcp-kie-gpt6/.env'),'utf8');
const key=process.env.KIE_API_KEY||env.match(/^KIE_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g,'');
if(!key)throw new Error('Missing configured Kie key');
const jobs=JSON.parse(await readFile(join(root,'prompts.json'),'utf8')).jobs;
for(const id of ['p06-4-lifestyle','p14-1-hero','p21-1-hero']){
 const j=jobs.find(x=>x.id===id),path=join(root,'tasks',id+'.json');
 const previous=JSON.parse(await readFile(path,'utf8'));
 const correction=id==='p21-1-hero';
 if(previous.repairSubmitted||(correction?previous.status!=='downloaded':previous.status!=='fail'))continue;
 const input=correction?JSON.parse(await readFile(join(root,'qa/p21-1-hero-correction.json'),'utf8')):j;
 const model=correction?'gpt-image-2-5-flare-image-to-image':'gpt-image-2-5-sunburst-image-to-image';
 if(correction){await mkdir(join(root,'qa/rejected'),{recursive:true});await copyFile(previous.path,join(root,'qa/rejected',id+'.png'));}
 const state={id,productId:j.productId,model,status:'submitting',repairSubmitted:true,attempt:(previous.attempt||1)+1,startedAt:new Date().toISOString(),history:[...(previous.history||[]),{...previous,history:undefined}],reason:correction?'Correct open-bottom magnetic arc':'Alternative GPT Image 2.5 route after two explicit provider failures with sufficient account credit'};
 await writeFile(path,JSON.stringify(state,null,2));
 const r=await fetch('https://api.kie.ai/api/v1/jobs/createTask',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,input:{prompt:input.prompt,input_urls:input.input_urls,aspect_ratio:'1:1',resolution:'2K',background:'opaque'}}),signal:AbortSignal.timeout(90000)});
 const data=await r.json();
 if(!r.ok||data.code!==200||!data.data?.taskId){state.status='submission_unresolved';state.error=String(data.msg);await writeFile(path,JSON.stringify(state,null,2));throw new Error(id+': '+state.error);}
 Object.assign(state,{status:'waiting',taskId:data.data.taskId});await writeFile(path,JSON.stringify(state,null,2));
 console.log(JSON.stringify({id,model,status:'submitted',taskId:state.taskId}));
 await new Promise(r=>setTimeout(r,4500));
}
