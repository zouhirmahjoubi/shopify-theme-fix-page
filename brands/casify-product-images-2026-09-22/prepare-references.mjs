import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const {products}=JSON.parse(await readFile(join(root,'products-before.json'),'utf8'));
let next=0;
const jobs=products.flatMap((p,i)=>p.images.slice(0,3).map((im,j)=>({p,i,j,im})));
const refs=[];
async function worker(){while(next<jobs.length){const {p,i,j,im}=jobs[next++];const rel=`product-images/${String(i+1).padStart(2,'0')}/${String(j+1).padStart(2,'0')}${new URL(im.url).pathname.endsWith('.png')?'.png':'.jpg'}`;await mkdir(dirname(join(root,rel)),{recursive:true});const r=await fetch(im.url);if(!r.ok)throw new Error(`Image download failed: ${r.status}`);await writeFile(join(root,rel),Buffer.from(await r.arrayBuffer()));refs.push({productId:p.id,title:p.title,index:i,reference:j,path:join(root,rel),relativePath:rel,url:im.url});}}
await Promise.all(Array.from({length:6},worker));
refs.sort((a,b)=>a.index-b.index||a.reference-b.reference);
await writeFile(join(root,'references.json'),JSON.stringify(refs,null,2));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=`<!doctype html><html><head><meta charset="utf-8"><title>Casify image references</title><style>body{margin:32px;background:#FBF3E4;color:#33231A;font:16px Georgia}h1{color:#A8231F}section{border-top:1px solid #DCC9A6;padding:20px 0}.images{display:flex;gap:18px}figure{margin:0;width:30%}img{width:100%;aspect-ratio:1;object-fit:contain;background:#FFFDF8}figcaption{font:12px monospace;overflow-wrap:anywhere;margin-top:8px}</style></head><body><h1>Casify · Product reference images</h1><p>22 products · 5 new images per product · 110 images total. Each row supplies references only for that product. Product appearance follows these images; backgrounds follow Casify’s cream, red, teal and antique-gold candy-shop style.</p>${products.map((p,i)=>`<section><h2>${i+1}. ${esc(p.title)}</h2><div class="images">${refs.filter(r=>r.productId===p.id).map(r=>`<figure><img src="${r.relativePath}"><figcaption>${esc(r.path)}</figcaption></figure>`).join('')}</div></section>`).join('')}</body></html>`;
await writeFile(join(root,'reference-gallery.html'),html);
console.log(`Saved ${refs.length} references for ${products.length} products.`);
