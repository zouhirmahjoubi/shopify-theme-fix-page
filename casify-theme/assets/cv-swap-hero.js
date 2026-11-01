/* Casify: Swap hero (sections/cv-swap-hero.liquid, styles in cv-swap-hero.css).
 *
 * One case in up to four prints, A to D. three.js draws the case from the
 * product photos (Printify shoots these prints the same way, so they line up)
 * in a shader: the white studio background is keyed out, a brush mask that
 * follows the pointer paints the next print on and ebbs away, a rising tide
 * sweeps a print across the whole case when the shopper keeps it or picks its
 * swatch, and a gold rim glints where two prints meet. GSAP runs the swap (headline word, tint,
 * card), the scroll parallax and the pointer drift of the ornaments; Motion
 * springs the callouts and the keep pill.
 *
 * Without WebGL a CSS mask brush reveals the under photo; under reduced motion
 * nothing paints or moves and the keep pill swaps the look at once. The page
 * is complete without this file (look A, its card and links).
 *
 * three.js is imported on demand at the version cv-case-wheel pins, only when
 * the hero is near the screen, WebGL works and motion is allowed.
 * Re-initialises in the theme editor.
 */

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const SELECTOR = '[data-cvsw]';

let threeImport = null;
const loadThree = () => threeImport || (threeImport = import(THREE_URL));

const one = (q, ctx) => ctx.querySelector(q);
const all = (q, ctx) => Array.from(ctx.querySelectorAll(q));
const fill = (template, values) => String(template || '').replace(/\[(\w+)\]/g, (m, k) => (k in values ? values[k] : m));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function webglOk() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

/* ---------- shaders ---------- */
const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/* The brush: the old mask ebbs by uDecay, a soft capsule from the last
   pointer position to this one is added on top. */
const PAINT_FRAG = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uStrength;
uniform float uDecay;
uniform float uAspect;
varying vec2 vUv;
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float m = texture2D(uPrev, vUv).r - uDecay;
  vec2 k = vec2(uAspect, 1.0);
  float d = segment(vUv * k, uFrom * k, uTo * k);
  float add = uStrength * (1.0 - smoothstep(uRadius * 0.35, uRadius, d));
  gl_FragColor = vec4(clamp(max(m, 0.0) + add, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

const CASE_FRAG = `
precision highp float;
uniform sampler2D uTop;
uniform sampler2D uUnder;
uniform sampler2D uMask;
uniform vec4 uCrop;
uniform float uTide;
uniform float uScrollTide;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uRim;
uniform float uFade;
varying vec2 vUv;
float keyAlpha(vec3 c) {
  return 1.0 - smoothstep(0.962, 0.993, min(c.r, min(c.g, c.b)));
}
void main() {
  vec2 st = vec2(mix(uCrop.x, uCrop.z, vUv.x), 1.0 - mix(uCrop.y, uCrop.w, 1.0 - vUv.y));
  vec3 top = texture2D(uTop, st).rgb;
  vec3 under = texture2D(uUnder, st).rgb;
  float level = max(uTide, uScrollTide) * 1.25 - 0.12 + 0.025 * sin(vUv.x * 13.0 + uTime * 2.6);
  float tide = 1.0 - smoothstep(level - 0.025, level + 0.025, vUv.y);
  float m = max(texture2D(uMask, vUv).r, tide);
  float t = smoothstep(0.32, 0.62, m);
  vec3 col = mix(top, under, t);
  float alpha = mix(keyAlpha(top), keyAlpha(under), t);
  float rim = smoothstep(0.12, 0.45, m) * (1.0 - smoothstep(0.45, 0.85, m));
  col = mix(col, uRim, rim * 0.6);
  float band = 1.0 - smoothstep(0.0, 0.22, abs(vUv.x * 0.8 + vUv.y * 0.35 - (0.55 + uPointer.x * 0.35)));
  col += band * 0.07;
  gl_FragColor = vec4(col, alpha * uFade);
}`;

function init(root) {
  if (!root) return;
  if (root._cvswDestroy) root._cvswDestroy();

  let looks;
  try { looks = JSON.parse(one('[data-cvsw-looks]', root).textContent); } catch (e) { return; }
  if (!looks || !looks.a) return;
  const keys = ['a', 'b', 'c', 'd'].filter((k) => looks[k]);
  const hasSwap = keys.length > 1;
  const nextOf = (key) => keys[(keys.indexOf(key) + 1) % keys.length];

  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const M = window.Motion;
  const abort = new AbortController();
  const on = (target, type, handler, opts) => target.addEventListener(type, handler, Object.assign({ signal: abort.signal }, opts || {}));
  const tweens = [];
  const hold = (t) => { if (t) tweens.push(t); return t; };
  const triggers = [];

  const caseBox = one('[data-cvsw-case]', root);
  const glBox = one('[data-cvsw-gl]', root);
  const photos = one('[data-cvsw-photos]', root);
  const topImg = one('[data-cvsw-top]', root);
  const underImg = one('[data-cvsw-under]', root);
  const keepBtn = one('[data-cvsw-keep]', root);
  const hintText = one('[data-cvsw-hint]', root);
  const word = one('[data-cvsw-word]', root);
  const tints = all('[data-cvsw-tint]', root);
  const swatches = all('[data-cvsw-swatch]', root);
  const status = one('[data-cvsw-status]', root);

  let front = 'a';
  let ink = 0;
  let ready = false;
  let gl = null;
  let alive = true;
  let focused = false;
  const motion = () => !reduceQuery.matches && !!gsap;
  const other = () => nextOf(front);

  /* ---------- the card, callouts and buttons follow the front look ---------- */
  function setText(el, text) { if (el) el.textContent = text; }
  function fillCard(key) {
    const l = looks[key];
    keys.forEach((k) => root.classList.toggle('cvsw--' + k, k === key));
    swatches.forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-cvsw-swatch') === key ? 'true' : 'false'));
    const eyebrow = root.getAttribute('data-eyebrow') || '';
    setText(one('[data-cvsw-eyebrow]', root), eyebrow + (l.edge ? ' · ' + l.edge : ''));
    const name = one('[data-cvsw-name]', root);
    if (name) { name.textContent = l.short; name.href = l.url; }
    const blurb = one('[data-cvsw-blurb]', root);
    if (blurb) { blurb.textContent = l.blurb; blurb.hidden = !l.blurb; }
    setText(one('[data-cvsw-price]', root), l.price);
    const was = one('[data-cvsw-was]', root);
    if (was) { was.textContent = l.was; was.hidden = !l.was; }
    const shop = one('[data-cvsw-shop]', root);
    if (shop) shop.href = l.url;
    ['edge', 'finish', 'fit'].forEach((k) => {
      const val = one('[data-cvsw-val="' + k + '"]', root);
      if (!val) return;
      val.textContent = l[k];
      val.closest('[data-cvsw-callout]').hidden = !l[k];
    });
    const bag = one('[data-cvsw-bag]', root);
    if (bag) {
      bag.href = l.url;
      bag.setAttribute('data-handle', l.handle);
      bag.setAttribute('data-url', l.url);
      if (l.available) bag.setAttribute('data-cvqp-open', '');
      else bag.removeAttribute('data-cvqp-open');
      const label = one('[data-cvsw-bag-label]', bag);
      if (label) label.textContent = label.getAttribute(l.available ? 'data-add' : 'data-sold');
    }
    if (topImg) topImg.alt = l.alt;
  }

  function hint() {
    if (!keepBtn || !hasSwap) return;
    const w = looks[other()].word;
    /* The pill says what it does once there is nothing to paint first: reduced motion, or
       reached by keyboard. Its visible text is its name. */
    const keep = ready || focused || !motion();
    const text = keep
      ? fill(root.getAttribute('data-keep'), { word: w })
      : fill(root.getAttribute(fineQuery.matches ? 'data-hint' : 'data-touch-hint'), { word: w });
    setText(hintText, text);
    keepBtn.classList.toggle('is-ready', keep);
  }

  function spring(targets, from) {
    if (!M || !M.animate || !motion() || !targets.length) return;
    try {
      M.animate(targets, from, { type: 'spring', bounce: 0.35, duration: 0.6, delay: M.stagger ? M.stagger(0.05) : 0 });
    } catch (e) { /* Motion is a decoration */ }
  }

  /* The look changes: the word rises in, the tint follows, the card and
     callouts cross over. */
  function show(key, animate) {
    const l = looks[key];
    if (!animate || !motion()) {
      fillCard(key);
      setText(word, l.word);
      if (gsap) gsap.set(tints, { clearProps: 'opacity' });
      hint();
      return;
    }
    const card = one('[data-cvsw-card]', root);
    const tl = hold(gsap.timeline({ defaults: { ease: 'power3.out' } }));
    tints.forEach((t) => tl.to(t, { opacity: t.getAttribute('data-cvsw-tint') === key ? 1 : 0, duration: 0.8, ease: 'power2.inOut', clearProps: 'opacity' }, 0));
    tl.to(word, { yPercent: -35, opacity: 0, filter: 'blur(8px)', duration: 0.28, ease: 'power2.in' }, 0)
      .to(card, { opacity: 0, y: -8, duration: 0.24, ease: 'power2.in' }, 0)
      .add(() => {
        /* The new word takes its width over time, so the words beside it glide instead of jumping. */
        const was = word.offsetWidth;
        fillCard(key);
        setText(word, l.word);
        hold(gsap.fromTo(word, { width: was }, { width: word.offsetWidth, duration: 0.5, ease: 'power3.inOut', clearProps: 'width' }));
        hint();
      }, 0.3)
      .fromTo(word, { yPercent: 40, opacity: 0, filter: 'blur(8px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, clearProps: 'transform,opacity,filter' }, 0.32)
      .fromTo(card, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, clearProps: 'transform,opacity' }, 0.36)
      .add(() => {
        /* Spelled-out end transform: Motion turns a 'none' keyframe into scale(0). */
        spring(all('[data-cvsw-callout]:not([hidden])', root), { opacity: [0, 1], transform: ['translateY(8px) scale(0.94)', 'translateY(0px) scale(1)'] });
      }, 0.38);
  }

  /* ---------- swap: another print becomes the front (the next one, or a swatch's) ---------- */
  let swapping = false;
  function swap(target) {
    const next = target || other();
    if (!hasSwap || swapping || next === front) return;
    swapping = true;
    const done = () => {
      front = next;
      /* The photos follow too: they are what shows if WebGL is lost later. Also covers a swap
         made before three.js was ready. */
      setPhotos(front);
      if (gl) gl.show(front);
      ready = false;
      ink = 0;
      swapping = false;
      hint();
      if (status) status.textContent = looks[front].short;
    };
    if (gl) {
      gl.swapTo(next, () => show(next, true), done);
    } else if (motion()) {
      putPhoto(underImg, looks[next]);
      show(next, true);
      hold(gsap.to(brush, { v: caseBox.offsetHeight * 1.6, duration: 0.8, ease: 'power2.inOut', overwrite: true, onUpdate: setBrush, onComplete: () => {
        brush.v = 0;
        setBrush();
        done();
      } }));
    } else {
      show(next, false);
      done();
    }
  }
  function putPhoto(img, look) {
    if (img && look && img.getAttribute('src') !== look.image) img.setAttribute('src', look.image);
  }
  function setPhotos(key) {
    putPhoto(topImg, looks[key]);
    putPhoto(underImg, looks[nextOf(key)]);
  }

  if (keepBtn && hasSwap) {
    keepBtn.hidden = false;
    hint();
    on(keepBtn, 'click', () => swap());
    const swatchRow = one('[data-cvsw-swatches]', root);
    if (swatchRow) swatchRow.hidden = false;
    swatches.forEach((b) => on(b, 'click', () => swap(b.getAttribute('data-cvsw-swatch'))));
    on(fineQuery, 'change', hint);
    on(keepBtn, 'focus', () => { focused = keepBtn.matches(':focus-visible'); hint(); });
    on(keepBtn, 'blur', () => { focused = false; hint(); });
    if (M && M.animate && motion()) {
      on(keepBtn, 'pointerenter', () => spring([keepBtn], { transform: ['scale(1)', 'scale(1.05)'] }));
      on(keepBtn, 'pointerleave', () => spring([keepBtn], { transform: ['scale(1.05)', 'scale(1)'] }));
    }
  }

  function inked(amount) {
    if (!hasSwap || ready) return;
    ink += amount;
    if (ink > 1.1) {
      ready = true;
      hint();
      spring([keepBtn], { transform: ['scale(0.92)', 'scale(1)'] });
    }
  }

  /* ---------- without WebGL: a CSS mask brush on the under photo ---------- */
  const brush = { v: 0 };
  const setBrush = () => { if (underImg) underImg.style.setProperty('--cvsw-r', brush.v.toFixed(1) + 'px'); };
  function cssBrush() {
    if (!underImg || !motion()) return;
    root.classList.add('is-maskable');
    let last = null;
    on(caseBox, 'pointermove', (e) => {
      if (swapping) return;
      const b = photos.getBoundingClientRect();
      underImg.style.setProperty('--cvsw-mx', ((e.clientX - b.left) / b.width * 100).toFixed(1) + '%');
      underImg.style.setProperty('--cvsw-my', ((e.clientY - b.top) / b.height * 100).toFixed(1) + '%');
      gsap.to(brush, { v: b.width * 0.34, duration: 0.35, ease: 'power2.out', overwrite: true, onUpdate: setBrush });
      if (last) inked(Math.hypot(e.clientX - last[0], e.clientY - last[1]) / b.width * 0.5);
      last = [e.clientX, e.clientY];
    });
    on(caseBox, 'pointerleave', () => {
      last = null;
      if (!swapping) gsap.to(brush, { v: 0, duration: 0.9, ease: 'power2.inOut', overwrite: true, onUpdate: setBrush });
    });
  }

  /* ---------- three.js: the case, the brush and the tide ---------- */
  async function startGL() {
    let THREE;
    try { THREE = await loadThree(); } catch (e) { cssBrush(); return; }
    if (!alive) return;
    const crop = (root.getAttribute('data-crop') || '0,0,1,1').split(',').map(Number);
    const aspect = (crop[2] - crop[0]) / (crop[3] - crop[1]);

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch (e) { cssBrush(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    glBox.appendChild(canvas);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    /* No colour space on the textures: the shader writes the photo's own values straight to the
       canvas, so the print shows the colours it has in the photo.
       The front and next prints load first; the others when the browser is idle or when asked for. */
    const textures = {};
    const loading = {};
    const loadTex = (key) => loading[key] || (loading[key] = loader.loadAsync(looks[key].image).then((t) => {
      if (!alive) { t.dispose(); return t; }
      t.anisotropy = 4;
      textures[key] = t;
      return t;
    }));
    let texTop;
    let texUnder;
    try {
      [texTop, texUnder] = await Promise.all([loadTex(front), loadTex(other())]);
    } catch (e) {
      renderer.dispose();
      canvas.remove();
      cssBrush();
      return;
    }
    if (!alive) { renderer.dispose(); return; }
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    idle(() => { if (alive) keys.forEach((k) => loadTex(k).catch(() => {})); });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    camera.position.z = 2.35;
    const geo = new THREE.PlaneGeometry(aspect, 1, 1, 1);

    const MW = 256;
    const MH = Math.round(256 / aspect);
    const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    let maskA = new THREE.WebGLRenderTarget(MW, MH, rtOpts);
    let maskB = new THREE.WebGLRenderTarget(MW, MH, rtOpts);
    const paintScene = new THREE.Scene();
    const paintCam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
    const paintMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: PAINT_FRAG,
      uniforms: {
        uPrev: { value: maskA.texture }, uFrom: { value: new THREE.Vector2(-1, -1) }, uTo: { value: new THREE.Vector2(-1, -1) },
        uRadius: { value: 0.16 }, uStrength: { value: 0 }, uDecay: { value: 0 }, uAspect: { value: aspect }
      }
    });
    paintScene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paintMat));

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: CASE_FRAG, transparent: true,
      uniforms: {
        uTop: { value: texTop }, uUnder: { value: texUnder }, uMask: { value: maskB.texture },
        uCrop: { value: new THREE.Vector4(crop[0], crop[1], crop[2], crop[3]) },
        uTide: { value: 0 }, uScrollTide: { value: 0 }, uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) }, uRim: { value: new THREE.Vector3(240 / 255, 226 / 255, 194 / 255) }, uFade: { value: 0 }
      }
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    function size() {
      const w = glBox.clientWidth;
      const h = glBox.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    size();
    /* Resizing empties the canvas, so it is drawn again at once (a turned phone, say). */
    const resizer = new ResizeObserver(() => { size(); renderer.render(scene, camera); wake(400); });
    resizer.observe(glBox);

    /* The pointer: a ray onto the case gives the brush its spot on the print. */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let from = null;
    let to = null;
    let strength = 0;
    let lastPaint = 0;
    const turnX = gsap.quickTo(mesh.rotation, 'x', { duration: 0.7, ease: 'power3' });
    const turnY = gsap.quickTo(mesh.rotation, 'y', { duration: 0.7, ease: 'power3' });
    const pointer = gsap.quickTo(mat.uniforms.uPointer.value, 'x', { duration: 0.8, ease: 'power3' });
    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
      if (fineQuery.matches) { turnY(ndc.x * 0.16); turnX(-ndc.y * 0.1); pointer(ndc.x); }
      if (swapping || !hasSwap) return;
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(mesh)[0];
      if (!hit || !hit.uv) { from = null; return; }
      const uv = hit.uv.clone();
      if (from) inked(from.distanceTo(uv) * 1.6);
      from = to || uv;
      to = uv;
      strength = 0.5;
      lastPaint = performance.now();
      wake();
    }
    on(caseBox, 'pointermove', onMove);
    on(caseBox, 'pointerdown', onMove);
    on(caseBox, 'pointerleave', () => { from = to = null; turnX(0); turnY(0); });

    /* The render loop runs on the GSAP ticker while the case is on screen and
       something is changing; it sleeps after the brush has ebbed away. */
    let running = false;
    let visible = true;
    let sleepAt = 0;
    function wake(ms) {
      sleepAt = Math.max(sleepAt, performance.now() + (ms || 3200));
      if (!running && visible && alive) { running = true; gsap.ticker.add(frame); }
    }
    function sleep() { if (running) { running = false; gsap.ticker.remove(frame); } }
    function frame(time, delta) {
      const dt = Math.min(0.05, (delta || 16) / 1000);
      mat.uniforms.uTime.value = time;
      paintMat.uniforms.uPrev.value = maskA.texture;
      paintMat.uniforms.uDecay.value = Math.max(0.22 * dt, 1.6 / 255); /* the mask is 8-bit: smaller steps round away */
      if (to && strength > 0) {
        paintMat.uniforms.uFrom.value.copy(from || to);
        paintMat.uniforms.uTo.value.copy(to);
        paintMat.uniforms.uStrength.value = strength;
        from = to;
        strength = performance.now() - lastPaint < 60 ? 0.5 : 0;
      } else {
        paintMat.uniforms.uStrength.value = 0;
      }
      renderer.setRenderTarget(maskB);
      renderer.render(paintScene, paintCam);
      renderer.setRenderTarget(null);
      mat.uniforms.uMask.value = maskB.texture;
      renderer.render(scene, camera);
      const swapRT = maskA; maskA = maskB; maskB = swapRT;
      if (performance.now() > sleepAt && !swapping) sleep();
    }
    const clearMask = () => {
      [maskA, maskB].forEach((rt) => { renderer.setRenderTarget(rt); renderer.clear(); });
      renderer.setRenderTarget(null);
    };
    clearMask();

    const io = new IntersectionObserver((entries) => {
      visible = !!(entries[0] && entries[0].isIntersecting);
      if (visible) wake(600); else sleep();
    });
    io.observe(caseBox);

    /* WebGL can be taken away (a phone reclaiming memory): the photos come back until it returns. */
    on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); sleep(); root.classList.remove('is-gl'); });
    on(canvas, 'webglcontextrestored', () => { clearMask(); root.classList.add('is-gl'); wake(600); });

    /* The canvas takes over from the photos once its first frame is drawn: a crossfade. */
    renderer.render(scene, camera);
    hold(gsap.fromTo(mat.uniforms.uFade, { value: 0 }, { value: 1, duration: 0.6, ease: 'power2.out', onUpdate: () => wake(400) }));
    hold(gsap.to(photos, { opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => {
      root.classList.add('is-gl');
      gsap.set(photos, { clearProps: 'opacity' });
    } }));

    /* A first wave hints that the case changes: the other print laps at the
       bottom edge and runs back. */
    if (hasSwap) {
      hold(gsap.timeline({ delay: 1.2, onUpdate: () => wake(300) })
        .to(mat.uniforms.uTide, { value: 0.3, duration: 0.9, ease: 'sine.inOut' })
        .to(mat.uniforms.uTide, { value: 0, duration: 1.1, ease: 'sine.inOut' }));
    }

    /* Scroll: the other print rises a little way as the hero leaves the screen. */
    if (ST && hasSwap) {
      triggers.push(ST.create({
        trigger: root, start: 'top top', end: 'bottom top', scrub: 0.6,
        onUpdate: (self) => { mat.uniforms.uScrollTide.value = self.progress * 0.45; wake(400); }
      }));
    }

    gl = {
      swapTo(next, midway, done) {
        loadTex(next).then((t) => {
          if (!alive) return;
          mat.uniforms.uUnder.value = t;
          hold(gsap.timeline({ onUpdate: () => wake(400) })
            .to(mat.uniforms.uTide, { value: 1.05, duration: 0.95, ease: 'power2.inOut' })
            .add(midway, 0.3)
            .add(() => {
              mat.uniforms.uTide.value = 0;
              clearMask();
              done();
            }));
        }).catch(() => { midway(); done(); });
      },
      show(key) {
        /* A print that would not load: the photos, already on it, take over. */
        if (!textures[key]) { root.classList.remove('is-gl'); return; }
        mat.uniforms.uTop.value = textures[key];
        loadTex(nextOf(key)).then((t) => {
          if (alive && front === key) { mat.uniforms.uUnder.value = t; wake(400); }
        }).catch(() => {});
        wake(400);
      },
      destroy() {
        sleep();
        resizer.disconnect();
        io.disconnect();
        Object.keys(textures).forEach((k) => textures[k].dispose());
        maskA.dispose(); maskB.dispose();
        geo.dispose(); mat.dispose(); paintMat.dispose();
        renderer.dispose();
        canvas.remove();
        root.classList.remove('is-gl');
      }
    };
  }

  /* ---------- ornaments: scroll parallax and pointer drift ---------- */
  function ornaments() {
    const items = all('[data-cvsw-ornament]', root);
    if (!items.length || !motion()) return;
    const depth = [0.9, 0.5, 1.3, 0.7, 1.1, 0.6];
    if (ST) {
      items.forEach((el, i) => {
        hold(gsap.to(el, { y: -70 * depth[i % depth.length], rotation: (i % 2 ? -1 : 1) * 14, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.8 } }));
      });
    }
    if (fineQuery.matches) {
      const moves = items.map((el) => gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }));
      on(root, 'pointermove', (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        moves.forEach((mv, i) => mv(nx * 30 * depth[i % depth.length]));
      });
    }
    hold(gsap.from(items, { opacity: 0, scale: 0.6, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.08 }));
  }

  /* The headline drifts slower than the page; the case a touch faster. */
  function parallax() {
    if (!ST || !motion()) return;
    const title = one('.cvsw__title', root);
    hold(gsap.to(title, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.6 } }));
  }

  fillCard('a');
  setPhotos('a');
  hint();
  if (motion()) {
    ornaments();
    parallax();
    if (webglOk()) {
      const near = new IntersectionObserver((entries) => {
        if (!entries[0] || !entries[0].isIntersecting) return;
        near.disconnect();
        startGL();
      }, { rootMargin: '300px 0px' });
      near.observe(root);
      root._cvswNear = near;
    } else {
      cssBrush();
    }
  }
  on(reduceQuery, 'change', () => { init(root); });

  /* Scrubbed tweens stay with the scroll position. */
  root._cvswFinish = () => { tweens.forEach((t) => { if (t && t.progress && !t.scrollTrigger) t.progress(1); }); };
  root._cvswDestroy = () => {
    alive = false;
    abort.abort();
    if (root._cvswNear) { root._cvswNear.disconnect(); delete root._cvswNear; }
    tweens.forEach((t) => { if (t && t.kill) t.kill(); });
    triggers.forEach((t) => t.kill());
    if (gl) gl.destroy();
    gl = null;
    root.classList.remove('is-maskable');
    if (underImg) underImg.style.removeProperty('--cvsw-r');
    if (gsap) {
      gsap.killTweensOf(brush);
      gsap.set(all('[data-cvsw-ornament], .cvsw__title, [data-cvsw-word], [data-cvsw-card], [data-cvsw-tint], [data-cvsw-photos]', root), { clearProps: 'all' });
    }
    delete root._cvswDestroy;
    delete root._cvswFinish;
  };
}

function rootIn(node) {
  if (!node) return null;
  return node.matches && node.matches(SELECTOR) ? node : node.querySelector && node.querySelector(SELECTOR);
}
function boot(scope) {
  const roots = [];
  if (scope && scope.matches && scope.matches(SELECTOR)) roots.push(scope);
  if (scope && scope.querySelectorAll) roots.push(...scope.querySelectorAll(SELECTOR));
  roots.forEach(init);
}

boot(document);
document.addEventListener('shopify:section:load', (e) => boot(e.target));
document.addEventListener('shopify:section:unload', (e) => {
  const root = rootIn(e.target);
  if (root && root._cvswDestroy) root._cvswDestroy();
});
document.addEventListener('shopify:section:select', (e) => {
  const root = rootIn(e.target);
  if (root && root._cvswFinish) root._cvswFinish();
});
