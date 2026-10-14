/* Casify main-image awning (snippets/cv-awning.liquid).
 *
 * three.js: the flat SVG awning becomes a fabric canopy — each stripe a soft
 * pleat, the scalloped hem swaying in a light breeze. An orthographic camera
 * maps it pixel-for-pixel onto the SVG, so the hand-over is invisible.
 * GSAP: it unrolls from the rod with a springy drop, a gust ripples through
 * when the pointer moves over the photo or the photo changes, and a sideways
 * scroll or swipe over the awning slides the fabric one stripe pair while the
 * other colourway (red <-> teal) wipes in.
 *
 * The SVG is the finished awning. Without WebGL or with reduced motion the
 * swipe still switches colours on the SVG, just without the 3D slide.
 * three.js is fetched only when an awning is on the page and the render loop
 * runs only while the photo is on screen.
 */
const CVAW_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const CVAW_TONES = ['red', 'teal'];
let cvawThree = null;

function cvawWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (error) {
    return false;
  }
}

function cvawTone(holder) {
  return holder.classList.contains('cv-awning--teal') ? 'teal' : 'red';
}

function cvawSetTone(holder, tone) {
  CVAW_TONES.forEach(function (name) { holder.classList.toggle('cv-awning--' + name, name === tone); });
}

/* Paints the awning texture: one colourway, or a transition frame where the
 * fabric has slid by p of a stripe pair and the next colourway has wiped in. */
function cvawPainter(THREE, holder, stripes) {
  const styles = getComputedStyle(holder);
  const colours = {
    red: styles.getPropertyValue('--cv-awning-red').trim() || '#C4302B',
    teal: styles.getPropertyValue('--cv-awning-teal').trim() || '#4E7C7B'
  };
  const cream = styles.getPropertyValue('--cv-awning-b').trim() || '#FBF3E4';
  const texW = Math.min(2048, Math.max(512, stripes * 64));
  const texH = Math.round(texW * 30 / (stripes * 20));
  const canvas = document.createElement('canvas');
  canvas.width = texW;
  canvas.height = texH;
  const g = canvas.getContext('2d');
  const sw = texW / stripes;
  const body = texH * 18.6 / 30;
  const hemY = texH * 18.5 / 30;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  function layer(colour, offset) {
    for (let i = -2; i < stripes + 2; i++) {
      const x = i * sw + offset;
      if (x > texW || x + sw < 0) continue;
      // One outline per stripe (body + scallop), so no seam where they meet.
      const shape = new Path2D();
      shape.moveTo(x, 0);
      shape.lineTo(x + sw + 0.6, 0);
      shape.lineTo(x + sw + 0.6, hemY);
      shape.arc(x + sw / 2, hemY, sw / 2, 0, Math.PI, false);
      shape.closePath();
      g.fillStyle = ((i % 2) + 2) % 2 ? cream : colour;
      g.fill(shape);
      // Fabric: a touch darker toward each seam.
      const seam = g.createLinearGradient(x, 0, x + sw, 0);
      seam.addColorStop(0, 'rgba(0,0,0,.10)');
      seam.addColorStop(0.5, 'rgba(0,0,0,0)');
      seam.addColorStop(1, 'rgba(0,0,0,.10)');
      g.fillStyle = seam;
      g.fill(shape);
    }
  }

  // dir -1: fabric moves left and the next colour enters from the right; +1 the reverse.
  function paint(from, to, p, dir) {
    g.clearRect(0, 0, texW, texH);
    const offset = to ? dir * p * 2 * sw : 0;
    layer(colours[from], offset);
    if (to && p > 0) {
      const width = texW * p;
      const left = dir < 0 ? texW - width : 0;
      g.save();
      g.beginPath();
      g.rect(left, 0, width, texH);
      g.clip();
      g.clearRect(left, 0, width, texH);
      layer(colours[to], offset);
      g.restore();
    }
    // Shade under the rod, and the rod's highlight.
    const shade = g.createLinearGradient(0, 0, 0, body);
    shade.addColorStop(0, 'rgba(0,0,0,.16)');
    shade.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.fillStyle = shade;
    g.fillRect(0, 0, texW, body);
    g.fillStyle = 'rgba(255,253,248,.45)';
    g.fillRect(0, 0, texW, texH * 1.6 / 30);
    texture.needsUpdate = true;
  }

  return { texture, paint };
}

async function cvawInit(holder) {
  const stripes = Math.max(6, parseInt(holder.getAttribute('data-stripes'), 10) || 16);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !cvawWebGL()) return function () {};

  let THREE;
  try {
    if (!cvawThree) cvawThree = import(CVAW_THREE_URL);
    THREE = await cvawThree;
  } catch (error) {
    return function () {};
  }
  if (!holder.isConnected) return function () {};

  const gsap = window.gsap;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  // Lambert: flat cloth ≈ ambient + key·cosθ ≈ π, so it matches the SVG colours.
  scene.add(new THREE.AmbientLight(0xffffff, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-0.4, 0.8, 1);
  scene.add(key);

  let tone = cvawTone(holder);
  const painter = cvawPainter(THREE, holder, stripes);
  painter.paint(tone, null, 0, 0);
  const material = new THREE.MeshLambertMaterial({ map: painter.texture, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide });
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 1000);
  camera.position.z = 200;

  let mesh = null;
  let base = null;
  let W = 0;
  let H = 0;

  function build() {
    const width = Math.round(holder.clientWidth);
    if (!width) return false;
    W = width;
    H = W * 30 / (stripes * 20);
    const canvasH = H * 1.6;
    renderer.setSize(W, canvasH, false);
    camera.left = 0;
    camera.right = W;
    camera.top = 0;
    camera.bottom = -canvasH;
    camera.updateProjectionMatrix();

    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const geometry = new THREE.PlaneGeometry(W + 4, H, stripes * 6, 10);
    geometry.translate(W / 2, -H / 2, 0);
    base = Float32Array.from(geometry.attributes.position.array);
    const scaleY = mesh ? mesh.scale.y : 1;
    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.y = scaleY;
    scene.add(mesh);
    return true;
  }

  const IDLE = 0.38;
  const state = { amp: IDLE, unroll: 1 };
  const start = performance.now();

  function draw() {
    if (!mesh) return;
    const t = (performance.now() - start) / 1000;
    const pos = mesh.geometry.attributes.position;
    const arr = pos.array;
    const sw = W / stripes;
    const pleat = sw * 0.12;
    for (let i = 0; i < arr.length; i += 3) {
      const x0 = base[i];
      const y0 = base[i + 1];
      const u = (x0 + 2) / (W + 4);
      const v = Math.min(1, Math.max(0, -y0 / H));
      const sway = state.amp * Math.pow(v, 1.6);
      arr[i] = x0 + state.amp * v * v * Math.sin(t * 1.1 + u * 3) * sw * 0.08;
      arr[i + 1] = y0 + state.amp * v * v * (0.5 + 0.5 * Math.sin(t * 1.3 + u * 5)) * H * 0.1;
      arr[i + 2] = -Math.cos(Math.PI * 2 * u * stripes) * pleat * (0.35 + 0.65 * v) + sway * Math.sin(t * 1.8 + u * 7) * sw * 0.35;
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.scale.y = state.unroll;
    renderer.render(scene, camera);
  }

  if (!build()) return function () {};
  // Unroll from the rod only while the section still hides its intro pieces
  // (html.cvc-pending, max 1.4s) — otherwise the flat awning is already
  // showing, and the canopy takes over with a gust instead of vanishing.
  const box = holder.getBoundingClientRect();
  const willUnroll = Boolean(gsap) && document.documentElement.classList.contains('cvc-pending') && box.bottom > 0 && box.top < window.innerHeight;
  if (willUnroll) { state.unroll = 0.03; state.amp = 1.2; }
  holder.appendChild(renderer.domElement);
  draw();
  holder.classList.add('is-3d');

  const cleanups = [];
  let running = false;
  let visible = true;
  function setRunning(on) {
    if (on === running) return;
    running = on;
    renderer.setAnimationLoop(on ? draw : null);
  }

  let intro = null;
  if (willUnroll) {
    intro = gsap.timeline()
      .to(state, { unroll: 1, duration: 1.15, ease: 'elastic.out(1, 0.55)' }, 0)
      .to(state, { amp: IDLE, duration: 2.4, ease: 'power2.out' }, 0);
  } else if (gsap && box.bottom > 0 && box.top < window.innerHeight) {
    // The flat awning was already showing (the page's intro released first):
    // billow — lift toward the rod, then drop back with a spring and a gust.
    intro = gsap.timeline()
      .to(state, { unroll: 0.62, amp: 1.1, duration: 0.32, ease: 'power2.in' })
      .to(state, { unroll: 1, duration: 1.1, ease: 'elastic.out(1, 0.45)' })
      .to(state, { amp: IDLE, duration: 1.8, ease: 'power2.out' }, '<');
  }

  let gustTl = null;
  let lastGust = 0;
  function gust(force) {
    if (!gsap || (intro && intro.isActive())) return;
    const now = performance.now();
    if (force !== true && now - lastGust < 1200) return;
    lastGust = now;
    if (holder.parentElement) holder.parentElement.dispatchEvent(new CustomEvent('cvaw:gust'));
    if (gustTl) gustTl.kill();
    gustTl = gsap.timeline()
      .to(state, { amp: 1, duration: 0.35, ease: 'power2.out' })
      .to(state, { amp: IDLE, duration: 1.8, ease: 'power2.inOut' });
  }

  // Sideways scroll / swipe: slide the fabric and wipe in the other colourway.
  let slide = null;
  holder._cvawSwitch = function (dir) {
    if (slide) return;
    const from = tone;
    const to = CVAW_TONES[(CVAW_TONES.indexOf(from) + 1) % CVAW_TONES.length];
    const finish = function () {
      tone = to;
      slide = null;
      painter.paint(tone, null, 0, 0);
      cvawSetTone(holder, tone);
      if (!running) draw();
    };
    if (!gsap) { finish(); return; }
    const s = { p: 0 };
    slide = gsap.to(s, {
      p: 1, duration: 0.8, ease: 'power3.inOut',
      onUpdate: function () { painter.paint(from, to, s.p, dir); if (!running) draw(); },
      onComplete: finish
    });
    gust(true);
  };
  cleanups.push(function () { if (slide) slide.kill(); delete holder._cvawSwitch; });

  const io = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    setRunning(visible && !document.hidden);
  });
  io.observe(holder);
  cleanups.push(function () { io.disconnect(); });

  const onVisibility = function () { setRunning(visible && !document.hidden); };
  document.addEventListener('visibilitychange', onVisibility);
  cleanups.push(function () { document.removeEventListener('visibilitychange', onVisibility); });

  const stage = holder.parentElement;
  if (stage && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('pointerenter', gust);
    stage.addEventListener('pointermove', gust);
    cleanups.push(function () {
      stage.removeEventListener('pointerenter', gust);
      stage.removeEventListener('pointermove', gust);
    });
  }

  // A new photo (colour or thumbnail change) sends a gust through.
  const photo = stage && stage.querySelector('#cvMainImage');
  if (photo && 'MutationObserver' in window) {
    const mo = new MutationObserver(gust);
    mo.observe(photo, { attributes: true, attributeFilter: ['src'] });
    cleanups.push(function () { mo.disconnect(); });
  }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(function () {
      if (Math.round(holder.clientWidth) !== W && build() && !running) draw();
    });
    ro.observe(holder);
    cleanups.push(function () { ro.disconnect(); });
  }

  return function () {
    setRunning(false);
    cleanups.forEach(function (fn) { fn(); });
    if (intro) intro.kill();
    if (gustTl) gustTl.kill();
    if (mesh) mesh.geometry.dispose();
    material.dispose();
    painter.texture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    holder.classList.remove('is-3d');
  };
}

/* Sideways gestures over the awning: a horizontal wheel/trackpad scroll, or a
 * horizontal swipe/drag. Vertical scrolling is left to the page (touch-action: pan-y). */
function cvawBindSwipe(holder) {
  const hit = holder.querySelector('[data-cv-awning-hit]');
  if (!hit) return function () {};

  let lastChange = 0;
  function change(dir) {
    lastChange = performance.now();
    if (holder._cvawSwitch) holder._cvawSwitch(dir);
    else cvawSetTone(holder, cvawTone(holder) === 'red' ? 'teal' : 'red');
  }

  // The strip sits over the top of the photo: a plain click or tap (not the end
  // of a swipe) goes on to the photo, so it still opens the zoom as before.
  function onClick() {
    if (performance.now() - lastChange < 450) return;
    const photo = holder.parentElement && holder.parentElement.querySelector('#cvMainImage');
    if (photo && photo.tagName === 'IMG') photo.click();
  }

  let acc = 0;
  let lastWheel = 0;
  let coolUntil = 0;
  function onWheel(event) {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheel > 250) acc = 0;
    lastWheel = now;
    acc += event.deltaX;
    if (now < coolUntil || Math.abs(acc) < 60) return;
    change(acc > 0 ? -1 : 1);
    acc = 0;
    coolUntil = now + 850;
  }

  let startX = null;
  let startY = 0;
  function onDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startX = event.clientX;
    startY = event.clientY;
  }
  function onMove(event) {
    if (startX === null) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) { startX = null; return; }
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      change(dx < 0 ? -1 : 1);
      startX = null;
    }
  }
  function onEnd() { startX = null; }

  hit.addEventListener('wheel', onWheel, { passive: false });
  hit.addEventListener('click', onClick);
  hit.addEventListener('pointerdown', onDown);
  hit.addEventListener('pointermove', onMove);
  hit.addEventListener('pointerup', onEnd);
  hit.addEventListener('pointercancel', onEnd);
  hit.addEventListener('pointerleave', onEnd);
  return function () {
    hit.removeEventListener('wheel', onWheel);
    hit.removeEventListener('click', onClick);
    hit.removeEventListener('pointerdown', onDown);
    hit.removeEventListener('pointermove', onMove);
    hit.removeEventListener('pointerup', onEnd);
    hit.removeEventListener('pointercancel', onEnd);
    hit.removeEventListener('pointerleave', onEnd);
  };
}

function cvawBoot(scope) {
  const holders = [];
  if (scope.matches && scope.matches('[data-cv-awning]')) holders.push(scope);
  if (scope.querySelectorAll) holders.push(...scope.querySelectorAll('[data-cv-awning]'));
  holders.forEach(function (holder) {
    if (holder._cvawDestroy) holder._cvawDestroy();
    let cleanup = null;
    let destroyed = false;
    const unbindSwipe = cvawBindSwipe(holder);
    holder._cvawDestroy = function () {
      destroyed = true;
      unbindSwipe();
      if (cleanup) cleanup();
      delete holder._cvawDestroy;
    };
    cvawInit(holder).then(function (fn) {
      if (destroyed) fn();
      else cleanup = fn;
    });
  });
}

cvawBoot(document);
document.addEventListener('shopify:section:load', function (event) { cvawBoot(event.target); });
document.addEventListener('shopify:section:unload', function (event) {
  const holders = event.target.querySelectorAll ? event.target.querySelectorAll('[data-cv-awning]') : [];
  holders.forEach(function (holder) { if (holder._cvawDestroy) holder._cvawDestroy(); });
});
