(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fallbackTemplates = [
    {id:'iphone16pm',label:'iPhone 16 Pro Max · Tough / MagSafe',template:'templates/iphone16pm.png'},
    {id:'iphone16',label:'iPhone 16 · Tough / MagSafe',template:'templates/iphone16.png'},
    {id:'iphone13mini',label:'iPhone 13 Mini · Tough / MagSafe',template:'templates/iphone13mini.png'},
    {id:'iphone17pm',label:'iPhone 17 Pro Max · Tough / MagSafe',template:'templates/iphone17pm.png'},
    {id:'samsung26u',label:'Samsung Galaxy S26 Ultra · Tough',template:'templates/samsung26u.png'},
    {id:'samsung24',label:'Samsung Galaxy S24 · Tough',template:'templates/samsung24.png'},
    {id:'pixel9pro',label:'Google Pixel 9 Pro · Tough',template:'templates/pixel9pro.png'}
  ];
  const imageCache = new Map();
  let baseTemplates = fallbackTemplates;
  let templates = fallbackTemplates;
  let qa = null;
  let renderTicket = 0;
  let reveal = null;
  let hasRevealed = false;
  const loadImage = src => {
    if (!imageCache.has(src)) {
      imageCache.set(src, new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image could not be opened: ' + src));
        img.src = src;
      }));
    }
    return imageCache.get(src);
  };
  function assetPath(value) {
    if (!value || typeof value !== 'string') return '';
    const path = value.replaceAll('\\', '/');
    if (/^(https?:|data:|javascript:|blob:)/i.test(path)) return '';
    const marker = 'christmas-merry-little-moments-2026-10-08/';
    if (path.includes(marker)) return path.split(marker).pop();
    if (/^[a-z]:\//i.test(path)) return '';
    return path;
  }
  const safeText = (node, value) => { node.textContent = String(value ?? ''); };
  function entryStatus(entry) {
    const s = String(entry.status || entry.result || '').toLowerCase();
    if (entry.passed === false || entry.pass === false || /fail|reject|unsafe/.test(s)) return 'failed';
    if (entry.passed === true || entry.pass === true || /^(pass|passed|verified|approved|ok|reference-pass)$/.test(s)) return 'passed';
    return 'pending';
  }
  function qaEntries(manifest) {
    const entries = manifest?.templates || manifest?.checks || manifest?.results || manifest?.models || [];
    if (Array.isArray(entries)) return entries;
    if (entries && typeof entries === 'object') return Object.entries(entries).map(([id, item]) => ({id, ...item}));
    return [];
  }
  function normalizeEntry(entry, index) {
    const id = String(entry.id || entry.template_id || entry.model_id || index);
    const label = String(entry.label || entry.name || entry.model || entry.phone || entry.template_name || id);
    const original = assetPath(entry.template || entry.template_file || entry.template_path || entry.source);
    const match = baseTemplates.find(t => t.id === id || t.label === label || (original && t.source && original.endsWith(String(t.source).replaceAll('\\','/'))));
    return {
      ...match, ...entry, id, label,
      template: original || match?.template || '',
      preview: assetPath(entry.overlay || entry.preview || entry.preview_file || entry.composite || entry.output),
      cleanPreview: assetPath(entry.cleanPreview || entry.preview_without_guides || entry.artwork_preview || entry.preview || entry.print),
      status: entryStatus(entry),
      note: entry.note || entry.message || entry.reason || ''
    };
  }
  function populateTemplates() {
    const selected = $('template-select').value;
    $('template-select').replaceChildren(...templates.map(t => {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.label;
      return option;
    }));
    if (templates.some(t => t.id === selected)) $('template-select').value = selected;
    safeText($('template-count'), templates.length + ' local templates');
  }
  function updateReview() {
    const entries = qaEntries(qa).map(normalizeEntry);
    if (!entries.length) {
      safeText($('review-summary'), qa ? 'Manifest loaded. It contains no completed per-template checks yet.' : 'No completed QA manifest has been loaded. Review each print sheet before publication.');
      $('review-results').replaceChildren(Object.assign(document.createElement('p'), {className:'empty-note',textContent:'Completed checks will appear here.'}));
      return;
    }
    const passed = entries.filter(e => e.status === 'passed').length;
    const failed = entries.filter(e => e.status === 'failed').length;
    safeText($('review-summary'), passed + ' of ' + entries.length + ' local template checks passed.' + (failed ? ' ' + failed + (failed === 1 ? ' needs attention before publication.' : ' need attention before publication.') : ' Final Printify checks pending. Review the individual notes and camera clearances below.'));
    const table = document.createElement('table');
    const caption = document.createElement('caption');caption.className='sr-only';caption.textContent='Per-template production checks';table.append(caption);
    const head = document.createElement('thead');
    const row = document.createElement('tr');
    ['Template', 'Check', 'Notes'].forEach(label => {const th = document.createElement('th');th.scope='col';th.textContent=label;row.append(th);});head.append(row);table.append(head);
    const body = document.createElement('tbody');
    for (const entry of entries) {
      const tr = document.createElement('tr');
      const name = document.createElement('td');name.textContent=entry.label;tr.append(name);
      const status = document.createElement('td');status.className='result-status ' + entry.status;status.textContent=entry.status==='passed'?'Passed':entry.status==='failed'?'Needs attention':'Pending';tr.append(status);
      const note = document.createElement('td');note.textContent=entry.note || (entry.status==='pending'?'Completed evidence not present.':'See manifest for recorded measurements.');tr.append(note);body.append(tr);
    }
    table.append(body);$('review-results').replaceChildren(table);
  }
  function useManifest(manifest, origin) {
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('The manifest must be a JSON object.');
    qa = manifest;
    $('manifest-json').value = JSON.stringify(qa, null, 2);
    const entries = qaEntries(qa).map(normalizeEntry).filter(e => e.template || e.preview);
    templates = entries.length ? entries : baseTemplates;
    populateTemplates();updateReview();renderPreview();
    message('Manifest loaded from ' + origin + '.', false);
    window.GALLERY_STATE = {manifest:qa,templates:templates,manifestOrigin:origin};
  }
  function message(text, error=false) {
    safeText($('manifest-message'),text);$('manifest-message').dataset.error=String(error);
  }
  async function refreshManifest() {
    $('refresh-qa').disabled = true;
    try {
      const response = await fetch('qa.json', {cache:'no-store'});
      if (!response.ok) throw new Error('qa.json is not available yet.');
      useManifest(await response.json(), 'qa.json');
    } catch (error) {
      message(location.protocol === 'file:' ? 'Open this gallery through a local preview server to load qa.json automatically, or import the file below.' : 'qa.json is not available yet. Import a manifest, or refresh after checks are ready.');
      if (!qa) {updateReview();renderPreview();}
    } finally { $('refresh-qa').disabled = false; }
  }
  function cover(context, img, width, height) {
    const factor = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * factor, h = img.naturalHeight * factor;
    context.drawImage(img, (width-w)/2, (height-h)/2, w, h);
  }
  async function referenceCanvas(template) {
    const [art, guide] = await Promise.all([loadImage('artwork.png'), loadImage(template.template)]);
    const canvas = $('fit-canvas');
    const ratio = Math.min(1, 1600 / guide.naturalHeight);
    canvas.width = Math.round(guide.naturalWidth * ratio);canvas.height = Math.round(guide.naturalHeight * ratio);
    const context = canvas.getContext('2d');
    cover(context, art, canvas.width, canvas.height);
    if ($('guides').checked) {
      const temp = document.createElement('canvas');temp.width=canvas.width;temp.height=canvas.height;
      const g = temp.getContext('2d', {willReadFrequently:true});g.drawImage(guide,0,0,temp.width,temp.height);
      const pixels=g.getImageData(0,0,temp.width,temp.height);
      for (let i=0;i<pixels.data.length;i+=4) {
        const darkness=255-Math.min(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);
        pixels.data[i]=244;pixels.data[i+1]=216;pixels.data[i+2]=159;pixels.data[i+3]=Math.round(darkness*.9);
      }
      g.putImageData(pixels,0,0);context.drawImage(temp,0,0);
    }
    safeText($('template-dimensions'), guide.naturalWidth + ' × ' + guide.naturalHeight + ' px template');
  }
  async function renderPreview() {
    const ticket = ++renderTicket;
    const entry = templates.find(t => t.id === $('template-select').value) || templates[0];
    if (!entry) return;
    $('preview-loading').hidden=false;safeText($('preview-loading'),'Loading template…');
    document.querySelector('.template-stage').setAttribute('aria-busy','true');
    $('open-template').href=entry.template || entry.preview || 'artwork.png';
    const status=entryStatus(entry);
    $('fit-status').dataset.status=status;
    safeText($('status-title'),status==='passed'?(qa?.printifyVerified===true?'Printify fit check passed':'Local template check passed'):status==='failed'?'Fit needs attention':'Fit checks pending');
    safeText($('status-detail'),entry.note || (status==='passed'?'The manifest records a passed local template check. Final Printify checks are pending.':status==='failed'?'The manifest identifies a fit issue. Review the check before publishing this model.':'This is a reference overlay. Verified placement will appear when qa.json contains completed checks.'));
    const previewSrc = $('guides').checked ? entry.preview : (entry.cleanPreview || entry.preview);
    try {
      if (previewSrc) {
        const preview = await loadImage(previewSrc);if(ticket!==renderTicket)return;
        $('checked-preview').src=previewSrc;$('checked-preview').alt=entry.label + ' production preview';$('checked-preview').hidden=false;$('fit-canvas').hidden=true;
        safeText($('template-dimensions'),preview.naturalWidth + ' × ' + preview.naturalHeight + ' px preview');
        safeText($('stage-note'),$('guides').checked?'Local template guides':entry.cleanPreview?'Artwork placement · guides off':'Local preview · guides embedded');
      } else {
        $('checked-preview').hidden=true;$('fit-canvas').hidden=false;
        await referenceCanvas(entry);if(ticket!==renderTicket)return;
        safeText($('stage-note'),'Reference overlay · placement pending');
      }
      if (ticket!==renderTicket)return;
      $('preview-loading').hidden=true;
      if (!reduced.matches && window.gsap && hasRevealed) {
        gsap.fromTo(previewSrc ? $('checked-preview') : $('fit-canvas'),{y:8,scale:.985},{y:0,scale:1,duration:.32,ease:'power3.out',clearProps:'transform'});
      }
    } catch (error) {
      if (ticket!==renderTicket)return;
      safeText($('preview-loading'),'Preview unavailable. Open the original template below.');
      safeText($('stage-note'),'Preview could not be opened');
    } finally { if(ticket===renderTicket)document.querySelector('.template-stage').setAttribute('aria-busy','false'); }
  }
  function playReveal() {
    if (!window.gsap || reduced.matches) { hasRevealed=true;return; }
    if (reveal) reveal.kill();
    gsap.set(['#artwork','.art-shadow','.fit-panel','.intro h1','.intro-copy','.wordmark-dot'],{clearProps:'all'});
    reveal=gsap.timeline({defaults:{ease:'power3.out'},onComplete:()=>{hasRevealed=true;}});
    reveal.fromTo('#artwork',{y:20,scale:.96,rotation:-.7},{y:0,scale:1,rotation:0,duration:.68,clearProps:'transform'},0)
      .fromTo('.art-shadow',{scaleX:.85,opacity:.55},{scaleX:1,opacity:1,duration:.55,clearProps:'all'},.09)
      .fromTo('.intro h1',{y:10,clipPath:'inset(0 0 100% 0)'},{y:0,clipPath:'inset(0 0 0% 0)',duration:.52,clearProps:'all'},.08)
      .fromTo('.intro-copy',{y:8,opacity:.7},{y:0,opacity:1,duration:.46,clearProps:'all'},.2)
      .fromTo('.fit-panel',{y:12,opacity:.65},{y:0,opacity:1,duration:.52,clearProps:'all'},.24)
      .to('.wordmark-dot',{scale:1.35,duration:.2,repeat:1,yoyo:true,ease:'sine.inOut',clearProps:'all'},.57);
  }
  $('template-select').addEventListener('change',renderPreview);
  $('guides').addEventListener('change',renderPreview);
  $('refresh-qa').addEventListener('click',refreshManifest);
  $('replay').addEventListener('click',playReveal);
  $('apply-manifest').addEventListener('click',()=>{try{useManifest(JSON.parse($('manifest-json').value),'edited JSON');message('Edits applied to this preview. Save a copy to keep them.');}catch(error){message('Invalid manifest: '+error.message,true);}});
  $('manifest-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{useManifest(JSON.parse(await file.text()),file.name);}catch(error){message('Manifest could not be loaded: '+error.message,true);}event.target.value='';});
  $('save-manifest').addEventListener('click',()=>{try{const contents=JSON.stringify(JSON.parse($('manifest-json').value),null,2);const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='qa-edited.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('A manifest copy has been downloaded.');}catch(error){message('Load or enter valid JSON before saving a copy.',true);}});
  reduced.addEventListener('change',()=>{if(reduced.matches&&reveal){reveal.progress(1).kill();}});
  const art=$('artwork');
  const artReady=()=>{safeText($('artwork-dimensions'),art.naturalWidth+' × '+art.naturalHeight+' px');playReveal();};
  art.complete&&art.naturalWidth?artReady():art.addEventListener('load',artReady,{once:true});
  (async()=>{
    try{const response=await fetch('gallery-templates.json');if(response.ok){baseTemplates=await response.json();templates=baseTemplates;}}catch(error){}
    populateTemplates();await refreshManifest();
  })();
})();

