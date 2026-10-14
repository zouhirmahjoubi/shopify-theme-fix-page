import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// A local, read-only snapshot of the generation run. Only gallery.html is written.
const base = dirname(fileURLToPath(import.meta.url));
const readJson = async (name) => JSON.parse(await readFile(join(base, name), 'utf8'));
const [manifest, catalog, taskNames, outputNames] = await Promise.all([
  readJson('prompts.json'), readJson('products-before.json'),
  readdir(join(base, 'tasks')), readdir(join(base, 'outputs')),
]);
const tasks = new Map(await Promise.all(taskNames.filter(n => n.endsWith('.json')).map(async name => {
  try { return [name.slice(0, -5), await readJson(join('tasks', name))]; }
  catch { return [name.slice(0, -5), { status: 'unavailable' }]; }
})));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const linkPath = (path) => relative(base, path).split(sep).map(encodeURIComponent).join('/');
const views = [
  ['hero', 'Hero product view'], ['detail', 'Material and camera detail'],
  ['profile', 'Side and back angle'], ['lifestyle', 'Candy-shop lifestyle view'], ['gift', 'Gift display'],
];
const knownOutputs = new Map(outputNames.filter(n => /\.(png|jpe?g|webp)$/i.test(n)).map(n => [n.slice(0, -extname(n).length), join(base, 'outputs', n)]));
const seenPaths = new Set();
const products = await Promise.all(catalog.products.map(async (product, index) => {
  const jobs = manifest.jobs.filter(j => j.productId === product.id).sort((a,b) => a.id.localeCompare(b.id));
  const cells = await Promise.all(views.map(async ([kind, label], viewIndex) => {
    const job = jobs.find(j => j.id.endsWith('-' + kind)) || jobs[viewIndex];
    const task = job ? tasks.get(job.id) : undefined;
    let file = job ? knownOutputs.get(job.id) : undefined;
    if (!file && task?.path) {
      const candidate = resolve(task.path);
      const rel = relative(base, candidate);
      if (rel && !rel.startsWith('..') && !rel.includes(':')) file = candidate;
    }
    let available = false;
    if (file) {
      try { const info = await stat(file); available = info.isFile() && info.size > 0 && !seenPaths.has(file); }
      catch { /* A file may still be downloading. Keep the empty cell explicit. */ }
    }
    if (available) seenPaths.add(file);
    const state = available ? 'saved' : task?.status === 'fail' ? 'failed'
      : ['waiting', 'queuing', 'generating', 'submitting'].includes(task?.status) ? 'pending'
      : task?.status === 'success' ? 'downloading' : 'missing';
    return { kind, label: job?.view || label, alt: job?.alt || product.title + ' — ' + label.toLowerCase(), state,
      src: available ? linkPath(file) : null, id: job?.id || 'missing-' + index + '-' + kind };
  }));
  const saved = cells.filter(c => c.state === 'saved').length;
  return { title: product.title, id: product.id, handle: product.handle || jobs.find(j=>j.handle)?.handle,
    tags: product.tags || [], cells, saved, complete: saved === views.length };
}));
const expected = products.length * views.length;
const saved = products.reduce((n,p) => n + p.saved, 0);
const complete = products.filter(p => p.complete).length;
const failed = products.flatMap(p=>p.cells).filter(c=>c.state === 'failed').length;
const pending = expected - saved - failed;
const built = new Date();
const stateCopy = {
  failed: ['Generation failed', 'This view is awaiting another attempt.'],
  pending: ['Image in progress', 'This view was still being generated when the gallery was built.'],
  downloading: ['Download pending', 'Generation finished; the local image is not available yet.'],
  missing: ['Image not available', 'No saved local file was found for this view.'],
};
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
const missingIcon = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="6" y="8" width="36" height="32" rx="2"/><circle cx="17" cy="18" r="3"/><path d="m7 34 11-10 9 8 6-6 8 8"/></svg>';
const store = /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(catalog.store || '') ? catalog.store : null;
const renderCell = (cell, firstProduct) => `<figure class="image-cell ${cell.state}" data-view="${cell.kind}">
  ${cell.src ? `<a class="image-link" href="${esc(cell.src)}" target="_blank" rel="noopener" aria-label="Open original: ${esc(cell.alt)}"><img src="${esc(cell.src)}" alt="${esc(cell.alt)}" loading="${firstProduct ? 'eager' : 'lazy'}" decoding="async" width="2048" height="2048"><span class="open-original">Open original ${arrow}</span></a>`
    : `<div class="placeholder">${missingIcon}<strong>${stateCopy[cell.state][0]}</strong><span>${stateCopy[cell.state][1]}</span></div>`}
  <figcaption><span>${esc(cell.label)}</span><span class="image-state">${cell.state === 'saved' ? 'Saved locally' : cell.state === 'failed' ? 'Failed' : cell.state === 'pending' || cell.state === 'downloading' ? 'In progress' : 'Missing'}</span></figcaption>
</figure>`;
const sections = products.map((p, i) => `<section class="product" id="product-${i+1}" data-title="${esc((p.title + ' ' + p.tags.join(' ')).toLowerCase())}" data-complete="${p.complete}" aria-labelledby="title-${i+1}">
  <div class="product-heading"><div><h2 id="title-${i+1}">${esc(p.title)}</h2><p class="product-progress ${p.complete ? 'complete' : 'incomplete'}">${p.saved} of 5 images saved${p.complete ? '' : ' · Set incomplete'}</p></div>
  ${store && p.handle ? `<a class="product-link" href="https://${store}/products/${encodeURIComponent(p.handle)}" target="_blank" rel="noopener">Product page ${arrow}</a>` : ''}</div>
  <div class="image-grid">${p.cells.map(c => renderCell(c, i === 0)).join('')}</div>
</section>`).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Casify · Product image collection</title>
<style>
:root{--cream:#fbf3e4;--paper:#fdf9f1;--red:#a92321;--teal:#386d6a;--ink:#33231a;--muted:#755c49;--line:#d7c4a4;--pink:#f3dfd4;--mint:#e1eae2}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:150px;scrollbar-color:var(--teal) var(--cream)}body{margin:0;background:var(--cream);color:var(--ink);font:15px/1.5 Arial,Helvetica,sans-serif}::selection{background:var(--teal);color:var(--paper)}a{color:inherit;text-underline-offset:4px}button,input,select{font:inherit;accent-color:var(--red)}button,select{cursor:pointer}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--teal);outline-offset:4px}button,input,select{border:1px solid var(--line);border-radius:4px;background:var(--paper);color:var(--ink)}button:disabled{opacity:.5;cursor:not-allowed}svg{display:block;width:17px;height:17px;flex:none}.skip{position:absolute;top:-100px;left:16px;z-index:20;background:var(--ink);color:var(--paper);padding:12px}.skip:focus{top:12px}.masthead{max-width:1560px;margin:auto;padding:27px 48px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.wordmark{color:var(--red);font:bold 37px/1 Georgia,'Times New Roman',serif;letter-spacing:-.035em;text-decoration:none}.collection-label{color:var(--muted);font-size:13px}.intro{max-width:1560px;padding:38px 48px 27px;margin:auto;display:flex;gap:32px;justify-content:space-between;align-items:flex-end}h1{font:normal clamp(30px,3.2vw,45px)/1.13 Georgia,'Times New Roman',serif;letter-spacing:-.025em;margin:0 0 14px;text-wrap:balance}.intro p{margin:0;max-width:67ch;color:var(--muted);font-size:15px}.summary{flex-shrink:0;min-width:215px;padding-bottom:2px}.summary strong{font-size:17px;font-weight:600;display:block}.summary span{font-size:13px;display:block;color:var(--muted);margin-top:3px}.progress{margin-top:12px;display:block;height:4px;background:var(--line);overflow:hidden}.progress i{display:block;height:100%;background:var(--teal);width:${Math.round(saved/expected*100)}%}.toolbar-wrap{background:var(--cream);position:sticky;top:0;z-index:5;border-bottom:1px solid var(--line);border-top:1px solid var(--line)}.toolbar{max-width:1560px;margin:auto;padding:17px 48px;display:flex;gap:14px;align-items:end}.search-field{flex:1;max-width:480px;min-width:160px}label,.filter-label{font-size:12px;display:block;color:var(--muted);margin:0 0 5px}input{width:100%;padding:10px 13px;min-height:43px;caret-color:var(--red)}input::placeholder{color:var(--muted)}.filter-options{display:flex;border:1px solid var(--line);border-radius:4px;overflow:hidden}.filter-options button{border:0;border-radius:0;background:transparent;padding:10px 15px;min-height:41px;white-space:nowrap}.filter-options button+button{border-left:1px solid var(--line)}.filter-options button[aria-pressed="true"]{background:var(--teal);color:var(--paper)}.filter-options button:hover:not([aria-pressed="true"]){background:var(--mint)}select{padding:10px 35px 10px 12px;min-height:43px;max-width:255px}main{max-width:1560px;margin:auto;padding:0 48px 64px}.results-meta{margin:20px 0 0;display:flex;align-items:baseline;justify-content:space-between;gap:20px;color:var(--muted);font-size:12px}.clear{border:0;background:none;color:var(--red);text-decoration:underline;text-underline-offset:3px;padding:4px 0;font-size:13px}.product{padding-top:29px;margin-top:0;padding-bottom:30px;border-bottom:1px solid var(--line);content-visibility:auto;contain-intrinsic-size:auto 440px}.product-heading{display:flex;justify-content:space-between;align-items:center;gap:25px;margin-bottom:19px}h2{font:normal clamp(22px,2vw,29px)/1.2 Georgia,'Times New Roman',serif;letter-spacing:-.015em;margin:0;max-width:49ch;text-wrap:balance}.product-progress{font-size:12px;margin:8px 0 0;color:var(--teal);font-variant-numeric:tabular-nums}.product-progress.incomplete{color:var(--red)}.product-link{display:flex;align-items:center;gap:8px;white-space:nowrap;color:var(--red);font-size:13px;text-decoration:none}.product-link:hover{text-decoration:underline}.image-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:15px}.image-cell{min-width:0;margin:0}.image-link{display:block;position:relative;background:var(--paper);aspect-ratio:1;overflow:hidden;border-radius:3px}.image-link img{display:block;width:100%;height:100%;object-fit:contain}.open-original{position:absolute;right:8px;bottom:8px;padding:6px 8px;display:flex;align-items:center;gap:5px;background:var(--paper);color:var(--ink);border-radius:3px;font-size:11px;opacity:0;transform:translateY(4px);transition:opacity .18s ease-out,transform .18s ease-out}.image-link:hover .open-original,.image-link:focus-visible .open-original{opacity:1;transform:none}.open-original svg{width:13px;height:13px}figcaption{display:flex;flex-direction:column;gap:3px;padding:11px 1px 0;font-size:12px;line-height:1.35}.image-state{font-size:11px;color:var(--muted)}.failed .image-state{color:var(--red)}.placeholder{aspect-ratio:1;border:1px dashed var(--line);background:var(--paper);display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px;text-align:center;gap:10px;color:var(--muted);border-radius:3px}.placeholder svg{width:38px;height:38px;opacity:.75}.placeholder strong{font-size:13px;color:var(--ink);font-weight:500}.placeholder span{font-size:11px;line-height:1.5;max-width:23ch}.failed .placeholder{background:#faeee4}.empty{padding:65px 20px;text-align:center;border-bottom:1px solid var(--line)}.empty h2{margin:auto}.empty p{color:var(--muted)}footer{max-width:1560px;margin:auto;padding:24px 48px 35px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:24px;color:var(--muted);font-size:12px}footer p{margin:0;max-width:70ch}.footer-links{display:flex;gap:20px;white-space:nowrap}.image-grid.single-view{grid-template-columns:repeat(3,minmax(0,1fr))}.image-grid.single-view .image-cell{max-width:360px}[hidden]{display:none!important}
@media(min-width:1550px){.product{contain-intrinsic-size:auto 450px}}@media(max-width:1050px){.masthead,.intro,.toolbar,footer{padding-left:28px;padding-right:28px}main{padding-left:28px;padding-right:28px}.intro{align-items:flex-start}.summary{min-width:170px}.toolbar{flex-wrap:wrap}.search-field{max-width:none;flex-basis:40%}.image-grid{gap:10px}.image-cell figcaption{font-size:11px}.image-state{font-size:10px}.product{contain-intrinsic-size:auto 350px}h2{max-width:40ch}}
@media(max-width:700px){html{scroll-padding-top:225px}.masthead{padding:20px}.wordmark{font-size:32px}.collection-label{max-width:115px;text-align:right;line-height:1.4}.intro{padding:27px 20px 24px;display:block}.intro p{font-size:14px}.summary{margin-top:22px;max-width:100%;display:flex;flex-wrap:wrap;align-items:baseline;column-gap:10px}.summary strong{font-size:15px}.summary span{font-size:12px}.progress{flex-basis:100%;margin-top:10px}.toolbar{padding:13px 20px;gap:10px}.search-field{flex-basis:100%}.filter-options button{padding:9px 12px;font-size:12px}.view-field{flex:1;min-width:120px}select{width:100%;max-width:none;font-size:12px;padding-right:24px}.set-field{flex:none}.toolbar label,.filter-label{font-size:11px}main{padding:0 20px 38px}.results-meta{margin-top:15px;gap:10px;font-size:11px}.product{padding-top:25px;padding-bottom:25px;contain-intrinsic-size:auto 1000px}.product-heading{display:block;margin-bottom:16px}.product-link{margin-top:10px;font-size:12px}h2{font-size:25px}.image-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 12px}.image-grid .image-cell:first-child{grid-column:1/-1}.image-grid .image-cell:first-child figcaption{flex-direction:row;justify-content:space-between}.image-grid.single-view{grid-template-columns:1fr}.image-grid.single-view .image-cell{max-width:none}.image-cell figcaption{font-size:12px}.image-state{font-size:10px}.open-original{opacity:1;transform:none;font-size:10px}.placeholder{padding:14px}.image-grid .image-cell:first-child .placeholder{min-height:200px}.placeholder span{font-size:11px}footer{padding:20px;display:block;font-size:11px}.footer-links{margin-top:16px}.empty{padding:50px 0}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.open-original{transition:none}}
@media print{.toolbar-wrap,.results-meta,.product-link,.footer-links,.open-original{display:none}body{background:white}.product{break-inside:avoid;content-visibility:visible;contain-intrinsic-size:none}main,.intro,.masthead,footer{padding-left:0;padding-right:0}.image-grid{grid-template-columns:repeat(5,1fr)}.image-grid .image-cell:first-child{grid-column:auto}.image-cell img{max-height:160px}.intro{padding-top:20px}.summary{margin:0}}
</style></head><body id="top">
<a class="skip" href="#collection">Skip to the collection</a>
<header class="masthead"><a class="wordmark" href="#top" aria-label="Casify, back to top">Casify</a><span class="collection-label">Product image collection</span></header>
<div class="intro"><div><h1>A fresh view of every case.</h1><p>Five photographs for each product, in Casify’s warm candy-shop style. Explore the hero, detail, profile, lifestyle and gift views. Select an image to open its full-size original.</p></div><div class="summary"><strong>${saved} of ${expected} images saved</strong><span>${complete} of ${products.length} complete product sets</span><span>${failed ? failed + ' failed · ' : ''}${pending} other images awaiting a local file</span><span class="progress" aria-hidden="true"><i></i></span></div></div>
<div class="toolbar-wrap"><div class="toolbar"><div class="search-field"><label for="search">Find a product</label><input id="search" type="search" placeholder="Search by product name or feature" autocomplete="off"></div><div class="set-field"><span class="filter-label" id="set-label">Product sets</span><div class="filter-options" role="group" aria-labelledby="set-label"><button type="button" data-filter="all" aria-pressed="true">All ${products.length}</button><button type="button" data-filter="complete" aria-pressed="false">Complete ${complete}</button><button type="button" data-filter="incomplete" aria-pressed="false">Incomplete ${products.length-complete}</button></div></div><div class="view-field"><label for="view">Show view</label><select id="view"><option value="all">All five views</option>${views.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></div></div></div>
<main id="collection"><div class="results-meta"><span id="results" role="status" aria-live="polite">Showing ${products.length} products · ${saved} locally saved images</span><button class="clear" id="clear" type="button" hidden>Clear filters</button></div>
${sections}
<div class="empty" id="empty" hidden><h2>No products match these filters.</h2><p>Try a different name or show all product sets.</p><button class="clear" type="button" id="reset-empty">Show all products</button></div></main>
<footer><p>This gallery shows local image files and generation status as of <time datetime="${built.toISOString()}">${built.toISOString().slice(0,16).replace('T',' ')} UTC</time>. It does not verify whether images are published on Shopify.</p><div class="footer-links"><a href="reference-gallery.html" target="_blank" rel="noopener">Reference photos</a><a href="#top">Back to top</a></div></footer>
<script>
(() => {
 const search=document.getElementById('search'),view=document.getElementById('view'),clear=document.getElementById('clear');
 const sections=[...document.querySelectorAll('.product')],buttons=[...document.querySelectorAll('[data-filter]')];
 let filter='all';
 function update(){
   const query=search.value.trim().toLocaleLowerCase();let count=0,images=0;
   for(const section of sections){
     const include=section.dataset.title.includes(query)&&(filter==='all'||(filter==='complete')===(section.dataset.complete==='true'));
     section.hidden=!include;if(include)count++;
     section.querySelector('.image-grid').classList.toggle('single-view',view.value!=='all');
     for(const cell of section.querySelectorAll('.image-cell')){cell.hidden=view.value!=='all'&&cell.dataset.view!==view.value;if(include&&!cell.hidden&&cell.classList.contains('saved'))images++;}
   }
   document.getElementById('results').textContent='Showing '+count+' product'+(count===1?'':'s')+' · '+images+' locally saved image'+(images===1?'':'s');
   document.getElementById('empty').hidden=count!==0;clear.hidden=!query&&filter==='all'&&view.value==='all';
   buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
 }
 function reset(){search.value='';view.value='all';filter='all';update();search.focus();}
 search.addEventListener('input',update);view.addEventListener('change',update);clear.addEventListener('click',reset);document.getElementById('reset-empty').addEventListener('click',reset);
 buttons.forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;update();}));
 document.querySelectorAll('.image-link img').forEach(img=>img.addEventListener('error',()=>{const link=img.closest('a');link.classList.add('placeholder');img.hidden=true;const note=document.createElement('span');note.textContent='This local image could not be opened. It may have moved after the gallery was built.';link.appendChild(note);}));
})();
</script></body></html>`;
await writeFile(join(base, 'gallery.html'), html, 'utf8');
console.log(JSON.stringify({ gallery: join(base, 'gallery.html'), products: products.length, expected, saved, complete, failed, pending }, null, 2));
