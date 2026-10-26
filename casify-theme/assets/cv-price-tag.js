/* Casify price tag on the main product photo (snippets/cv-photo-price.liquid).
 *
 * three.js: the HTML tag becomes a thick paper card with a punched hole, the
 * price printed on both faces, hanging on a string from the awning rod. A
 * perspective camera scaled 1 unit = 1 CSS px lines it up with the HTML tag.
 * GSAP + a small pendulum: it swings in a light breeze, gets a push whenever
 * the awning gusts (cvaw:gust) or the pointer arrives, drops in on first view,
 * and turns edge-on to show a new price when the variant changes (cvs:change).
 *
 * The HTML tag is the finished version and always carries the live price.
 * Reduced motion or no WebGL: it stays the static HTML tag.
 */
const CVPT_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
let cvptThree = null;

function cvptWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (error) {
    return false;
  }
}

function cvptMoney(format, cents) {
  const value = Number(cents);
  if (isNaN(value)) return '';
  /* One money formatter for the page (cv-product.js); this copy is the fallback only. */
  if (window.CasifyMoney && typeof window.CasifyMoney.format === 'function') {
    return window.CasifyMoney.format(value, format);
  }
  function group(num, decimals, thousands, decimal) {
    const parts = (num / 100).toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + thousands);
    return parts.join(decimal);
  }
  return (format || '${{amount}}').replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
    switch (key) {
      case 'amount_no_decimals': return group(value, 0, ',', '.');
      case 'amount_with_comma_separator': return group(value, 2, '.', ',');
      case 'amount_no_decimals_with_comma_separator': return group(value, 0, '.', ',');
      default: return group(value, 2, ',', '.');
    }
  });
}

/* Reads the tag's current prices and keeps the HTML tag in step. */
function cvptModel(tag) {
  const format = tag.getAttribute('data-money-format') || window.themeMoneyFormat || '${{amount}}';
  const saveLabel = tag.getAttribute('data-save-label') || 'Save';
  const model = {
    price: Number(tag.getAttribute('data-price')) || 0,
    was: Number(tag.getAttribute('data-was')) || 0,
    text: function () {
      const hasWas = model.was > model.price;
      return {
        now: cvptMoney(format, model.price),
        was: hasWas ? cvptMoney(format, model.was) : '',
        save: hasWas ? saveLabel + ' ' + cvptMoney(format, model.was - model.price) : ''
      };
    },
    set: function (price, was) {
      model.price = Number(price) || 0;
      model.was = was && Number(was) > model.price ? Number(was) : 0;
      tag.setAttribute('data-price', model.price);
      tag.setAttribute('data-was', model.was);
      const t = model.text();
      const now = tag.querySelector('[data-cv-ptag-now]');
      const wasEl = tag.querySelector('[data-cv-ptag-was]');
      const save = tag.querySelector('[data-cv-ptag-save]');
      const saveValue = tag.querySelector('[data-cv-ptag-save-value]');
      if (now) now.textContent = t.now;
      if (wasEl) { wasEl.hidden = !t.was; wasEl.textContent = t.was; }
      if (save) save.hidden = !t.save;
      if (saveValue) saveValue.textContent = t.was ? cvptMoney(format, model.was - model.price) : '';
    }
  };
  return model;
}

function cvptDrawFace(canvas, styles, text, cardW, cardH, holeY, holeR) {
  const s = 3;
  canvas.width = Math.round(cardW * s);
  canvas.height = Math.round(cardH * s);
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const css = function (name, fallback) { return styles.getPropertyValue(name).trim() || fallback; };
  const display = css('--font-display', 'Georgia, serif');
  const body = css('--font-body', 'Georgia, serif');
  const label = css('--font-label', 'monospace');
  const base = cardW * 0.115 * s;

  g.clearRect(0, 0, W, H);
  g.fillStyle = css('--cream-50', '#FDF9F1');
  g.fillRect(0, 0, W, H);
  // Inner keyline, like the HTML tag's inset border.
  g.strokeStyle = 'rgba(74,51,36,.28)';
  g.lineWidth = 1.2 * s;
  g.beginPath();
  g.roundRect(6 * s, 6 * s, W - 12 * s, H - 12 * s, 8 * s);
  g.stroke();
  // Gold eyelet around the punched hole.
  g.strokeStyle = css('--gold-400', '#D2B57C');
  g.lineWidth = 2.4 * s;
  g.beginPath();
  g.arc(W / 2, holeY * s, (holeR + 1.6) * s, 0, Math.PI * 2);
  g.stroke();

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const hasWas = Boolean(text.was);
  g.fillStyle = css('--red-700', '#7E1A17');
  g.font = '900 ' + (2.05 * base) + 'px ' + display;
  g.fillText(text.now, W / 2, H * (hasWas ? 0.49 : 0.6));
  if (hasWas) {
    g.fillStyle = css('--cocoa-500', '#6B4229');
    g.font = '400 ' + (1.05 * base) + 'px ' + body;
    const wy = H * 0.655;
    g.fillText(text.was, W / 2, wy);
    const ww = g.measureText(text.was).width;
    g.fillRect(W / 2 - ww / 2, wy - 0.6 * s, ww, 1.5 * s);
    g.font = '700 ' + (0.82 * base) + 'px ' + label;
    const sw = g.measureText(text.save).width + base * 1.2;
    const sh = base * 1.45;
    const sy = H * 0.8;
    g.fillStyle = css('--red-500', '#C4302B');
    g.beginPath();
    g.roundRect(W / 2 - sw / 2, sy - sh / 2, sw, sh, sh / 2);
    g.fill();
    g.fillStyle = css('--cream-50', '#FDF9F1');
    g.fillText(text.save, W / 2, sy + 0.5 * s);
  }
}

async function cvptInit(tag, model) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !cvptWebGL()) return null;

  let THREE;
  try {
    if (!cvptThree) cvptThree = import(CVPT_THREE_URL);
    THREE = await cvptThree;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch (error) {
    return null;
  }
  if (!tag.isConnected) return null;

  const gsap = window.gsap;
  const styles = getComputedStyle(tag);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  // Lambert: flat face ≈ ambient + key·cosθ ≈ π, so it matches the HTML colours.
  scene.add(new THREE.AmbientLight(0xffffff, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-0.4, 0.8, 1);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(24, 1, 1, 5000);

  const faceCanvas = document.createElement('canvas');
  const faceMap = new THREE.CanvasTexture(faceCanvas);
  faceMap.colorSpace = THREE.SRGBColorSpace;
  faceMap.anisotropy = 4;
  const faceMat = new THREE.MeshLambertMaterial({ map: faceMap, transparent: true });
  const bodyMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(styles.getPropertyValue('--cream-300').trim() || '#EADCBF') });
  const stringMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(styles.getPropertyValue('--cocoa-600').trim() || '#4A3324') });

  const pivot = new THREE.Group();
  const card = new THREE.Group();
  pivot.add(card);
  scene.add(pivot);
  const disposables = [faceMap, faceMat, bodyMat, stringMat];
  let geoms = [];
  let W = 0;
  let H = 0;
  let cardW = 0;
  let cardH = 0;
  let holeY = 0;
  let holeR = 0;
  let limit = 0.2;

  let faceSize = '';
  function paint() {
    cvptDrawFace(faceCanvas, styles, model.text(), cardW, cardH, holeY, holeR);
    // A resize changes the face canvas size; three.js can't update a texture in
    // place at a new size (GL "offset overflows texture dimensions"), so drop the
    // old GPU copy and let it upload fresh.
    const size = faceCanvas.width + 'x' + faceCanvas.height;
    if (faceSize && size !== faceSize) faceMap.dispose();
    faceSize = size;
    faceMap.needsUpdate = true;
  }

  function build() {
    const box = tag.getBoundingClientRect();
    if (!box.width || !box.height) return false;
    const cw = box.width;
    const ch = box.height;
    W = cw * 2.4;
    H = ch * 1.12;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const dist = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(W / 2, -H / 2, dist);
    camera.lookAt(W / 2, -H / 2, 0);
    camera.near = dist * 0.2;
    camera.far = dist * 4;
    camera.updateProjectionMatrix();

    cardW = cw;
    cardH = cw * 1.25;
    holeR = cw * 0.055;
    holeY = cardH * 0.09 + holeR;
    const cardTop = ch * 0.29;

    geoms.forEach(function (geo) { geo.dispose(); });
    geoms = [];
    while (card.children.length) card.remove(card.children[0]);
    while (pivot.children.length > 1) pivot.remove(pivot.children[1]);

    const w2 = cardW / 2;
    const h2 = cardH / 2;

    // The stage clips anything past its edge, so the swing stays inside it: the widest
    // angle at which the card's bottom corner still clears the stage's right edge.
    const stageBox = tag.parentElement.getBoundingClientRect();
    const reach = stageBox.right - (box.left + cw / 2) - 6;
    const cornerY = cardTop + cardH;
    limit = Math.max(0.05, Math.asin(Math.min(1, reach / Math.hypot(w2, cornerY))) - Math.atan2(w2, cornerY));
    const r = Math.min(12, cardW * 0.1);
    const shape = new THREE.Shape();
    shape.moveTo(-w2 + r, -h2);
    shape.lineTo(w2 - r, -h2);
    shape.quadraticCurveTo(w2, -h2, w2, -h2 + r);
    shape.lineTo(w2, h2 - r);
    shape.quadraticCurveTo(w2, h2, w2 - r, h2);
    shape.lineTo(-w2 + r, h2);
    shape.quadraticCurveTo(-w2, h2, -w2, h2 - r);
    shape.lineTo(-w2, -h2 + r);
    shape.quadraticCurveTo(-w2, -h2, -w2 + r, -h2);
    const hole = new THREE.Path();
    hole.absarc(0, h2 - holeY, holeR, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const depth = Math.max(3, cardW * 0.035);
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2, curveSegments: 14 });
    bodyGeo.translate(0, 0, -depth / 2);
    const faceGeo = new THREE.ShapeGeometry(shape, 14);
    // ShapeGeometry UVs are raw x/y: map the card box onto 0..1.
    const uv = faceGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / cardW + 0.5, uv.getY(i) / cardH + 0.5);
    const front = new THREE.Mesh(faceGeo, faceMat);
    front.position.z = depth / 2 + 0.9;
    const back = new THREE.Mesh(faceGeo, faceMat);
    back.position.z = -depth / 2 - 0.9;
    back.rotation.y = Math.PI;
    card.add(new THREE.Mesh(bodyGeo, bodyMat), front, back);
    card.position.set(0, -cardTop - h2, 0);

    const stringLen = cardTop + holeY;
    const stringGeo = new THREE.CylinderGeometry(1, 1, stringLen, 8);
    stringGeo.translate(0, -stringLen / 2, 0);
    pivot.add(new THREE.Mesh(stringGeo, stringMat));
    pivot.position.set(W / 2, 0, 0);
    geoms = [bodyGeo, faceGeo, stringGeo];
    paint();
    return true;
  }

  if (!build()) return null;

  // Pendulum: θ'' = -gθ - cθ' + breeze; gusts push θ'. A push of 2.4·limit swings
  // about 0.8·limit (natural frequency 3), and tanh softly caps the drawn angle.
  const swing = { theta: 0, omega: 0, drop: 0, flip: 0 };
  let last = performance.now();
  const start = last;
  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - start) / 1000;
    const breeze = 0.05 * Math.sin(t * 0.9) + 0.025 * Math.sin(t * 2.3);
    swing.omega += (-9 * swing.theta - 0.9 * swing.omega + breeze) * dt;
    swing.theta += swing.omega * dt;
    pivot.rotation.z = limit * Math.tanh(swing.theta / limit);
    pivot.position.y = swing.drop;
    card.rotation.y = 0.22 * Math.sin(t * 0.7) + swing.flip;
    renderer.render(scene, camera);
  }

  // Drop in while the page intro still hides it; otherwise swing into view.
  const box = tag.getBoundingClientRect();
  const inView = box.bottom > 0 && box.top < window.innerHeight;
  const pending = document.documentElement.classList.contains('cvc-pending');
  if (gsap && inView && pending) swing.drop = H * 0.9;
  tag.appendChild(renderer.domElement);
  frame();
  tag.classList.add('is-3d');
  if (gsap && inView) {
    if (pending) gsap.to(swing, { drop: 0, duration: 0.9, ease: 'back.out(1.4)', onComplete: function () { swing.omega += 1.8 * limit; } });
    else swing.omega += 2.4 * limit;
  }

  let lastKick = 0;
  function kick(force) {
    const now = performance.now();
    if (now - lastKick < 500) return;
    lastKick = now;
    swing.omega += (Math.random() < 0.5 ? -1 : 1) * (force || 1) * 2.4 * limit;
  }

  let flipping = null;
  function showPrice(price, was) {
    if (!gsap) { model.set(price, was); paint(); return; }
    if (flipping) flipping.kill();
    flipping = gsap.timeline()
      .to(swing, { flip: Math.PI / 2, duration: 0.22, ease: 'power2.in', onComplete: function () { model.set(price, was); paint(); swing.flip = -Math.PI / 2; } })
      .to(swing, { flip: 0, duration: 0.55, ease: 'back.out(1.8)' });
    kick(0.7);
  }

  const cleanups = [];
  let running = false;
  let visible = true;
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) last = performance.now();
    renderer.setAnimationLoop(on ? frame : null);
  }
  const io = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    setRunning(visible && !document.hidden);
  });
  io.observe(tag);
  cleanups.push(function () { io.disconnect(); });
  const onVisibility = function () { setRunning(visible && !document.hidden); };
  document.addEventListener('visibilitychange', onVisibility);
  cleanups.push(function () { document.removeEventListener('visibilitychange', onVisibility); });

  const stage = tag.parentElement;
  if (stage) {
    const onGust = function () { kick(1); };
    stage.addEventListener('cvaw:gust', onGust);
    cleanups.push(function () { stage.removeEventListener('cvaw:gust', onGust); });
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const onEnter = function () { kick(0.8); };
      stage.addEventListener('pointerenter', onEnter);
      cleanups.push(function () { stage.removeEventListener('pointerenter', onEnter); });
    }
  }

  if ('ResizeObserver' in window) {
    let lastW = Math.round(tag.getBoundingClientRect().width);
    const ro = new ResizeObserver(function () {
      const w = Math.round(tag.getBoundingClientRect().width);
      if (w !== lastW && build()) { lastW = w; if (!running) frame(); }
    });
    ro.observe(tag);
    cleanups.push(function () { ro.disconnect(); });
  }

  return {
    showPrice: showPrice,
    destroy: function () {
      setRunning(false);
      cleanups.forEach(function (fn) { fn(); });
      if (flipping) flipping.kill();
      if (gsap) gsap.killTweensOf(swing);
      geoms.concat(disposables).forEach(function (item) { item.dispose(); });
      renderer.dispose();
      renderer.domElement.remove();
      tag.classList.remove('is-3d');
    }
  };
}

function cvptBoot(scope) {
  const tags = [];
  if (scope.matches && scope.matches('[data-cv-ptag]')) tags.push(scope);
  if (scope.querySelectorAll) tags.push(...scope.querySelectorAll('[data-cv-ptag]'));
  tags.forEach(function (tag) {
    if (tag._cvptDestroy) tag._cvptDestroy();
    const model = cvptModel(tag);
    let scene3d = null;
    let destroyed = false;

    // Variant changes: the HTML tag always updates; the 3D card flips to it.
    const pdp = tag.closest('[data-cv-pdp]');
    const onChange = function (event) {
      const variant = event.detail && event.detail.variant;
      if (!variant) return;
      const was = variant.compare_at_price && variant.compare_at_price > variant.price ? variant.compare_at_price : 0;
      if (variant.price === model.price && was === model.was) return;
      if (scene3d) scene3d.showPrice(variant.price, was);
      else model.set(variant.price, was);
    };
    if (pdp) pdp.addEventListener('cvs:change', onChange);

    tag._cvptDestroy = function () {
      destroyed = true;
      if (pdp) pdp.removeEventListener('cvs:change', onChange);
      if (scene3d) scene3d.destroy();
      delete tag._cvptDestroy;
    };
    cvptInit(tag, model).then(function (result) {
      if (!result) return;
      if (destroyed) result.destroy();
      else scene3d = result;
    });
  });
}

cvptBoot(document);
/* Follow a live reduced-motion change: re-boot so init re-reads the preference
 * (reduce keeps the static HTML tag, no-preference brings the 3D card back). */
const cvptMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
if (cvptMotionQuery.addEventListener) cvptMotionQuery.addEventListener('change', function () { cvptBoot(document); });
document.addEventListener('shopify:section:load', function (event) { cvptBoot(event.target); });
document.addEventListener('shopify:section:unload', function (event) {
  const tags = event.target.querySelectorAll ? event.target.querySelectorAll('[data-cv-ptag]') : [];
  tags.forEach(function (tag) { if (tag._cvptDestroy) tag._cvptDestroy(); });
});
