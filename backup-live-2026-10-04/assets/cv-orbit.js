/* Casify — "The collection, in 3D" (sections/cv-orbit.liquid).
 *
 * Loaded as a module from layout/theme.liquid after the GSAP bundle, so gsap
 * and ScrollTrigger exist when this runs. three.js is imported only when the
 * section is on the page.
 *
 * Motion (candy-shop personality: eased steps for the heavy 3D move,
 * back.out overshoot for the light ticket pieces):
 *   primary   the turntable steps one case at a time — a power3.inOut turn,
 *             then a hold with a countdown bar on that case's dot
 *   secondary the front case lifts, brightens and grows; the ticket's title,
 *             price and benefit chips swap out/in with a short stagger
 *             (the CTA stays put, only its link changes)
 *   ambient   cases bob, KIE sweets float at different depths and drift
 *             against the turn, the camera dollies with scroll
 * Autoplay can be paused persistently, and also pauses while the stage is
 * hovered or dragged, while the ticket has focus, off screen and in a hidden
 * tab. Drag snaps to the nearest case; a click on a side case brings it round,
 * and a click on the front case opens it.
 * Reduced motion, no WebGL or fewer than three photos: the Liquid card grid
 * stays as the experience.
 */

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const TAU = Math.PI * 2;
const mod = (n, m) => ((n % m) + m) % m;
const pad = (n) => String(n).padStart(2, '0');

const reduceQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
const fineQuery = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function roundedAlpha(THREE, w, h, r) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  if (g.roundRect) g.roundRect(0, 0, w, h, r); else g.rect(0, 0, w, h);
  g.fill();
  return new THREE.CanvasTexture(c);
}

function glowTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(240,226,194,.55)');
  grad.addColorStop(0.55, 'rgba(210,181,124,.18)');
  grad.addColorStop(1, 'rgba(210,181,124,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function coverUV(tex, planeAspect) {
  const img = tex.image;
  const ia = img.width / img.height;
  if (ia > planeAspect) {
    tex.repeat.set(planeAspect / ia, 1);
    tex.offset.set((1 - planeAspect / ia) / 2, 0);
  } else {
    tex.repeat.set(1, ia / planeAspect);
    tex.offset.set(0, (1 - ia / planeAspect) / 2);
  }
}

/* ---------- Perks row: works with or without the 3D stage ---------- */
function animatePerks(root, gsap) {
  const list = root.querySelector('[data-cvorbit-perks]');
  const perks = list ? list.querySelectorAll('.cvorbit__perk') : [];
  if (!perks.length || !window.ScrollTrigger) return;
  const icons = list.querySelectorAll('.cvorbit__perk-ico');
  const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 92%', once: true } });
  tl.from(perks, { y: 22, opacity: 0, scale: 0.96, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.07, clearProps: 'transform,opacity' })
    .from(icons, { scale: 0.4, rotation: -30, duration: 0.6, ease: 'back.out(3)', stagger: 0.07, clearProps: 'transform' }, 0.12);
  return tl;
}

async function mount(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const wrap = root.querySelector('[data-cvorbit-wrap]');
  const dataEl = root.querySelector('[data-cvorbit-data]');
  if (!wrap || !dataEl || !ScrollTrigger) return;

  let items;
  try { items = JSON.parse(dataEl.textContent).filter((i) => i.image); } catch (e) { return; }
  if (items.length < 3) return;

  let THREE;
  try { THREE = await import(THREE_URL); } catch (e) { return; }
  if (!root.isConnected) return;

  const stage = root.querySelector('[data-cvorbit-stage]');
  const ticket = root.querySelector('[data-cvorbit-ticket]');
  const countEl = root.querySelector('[data-cvorbit-count]');
  const saveEl = root.querySelector('[data-cvorbit-save]');
  const titleEl = root.querySelector('[data-cvorbit-title]');
  const priceEl = root.querySelector('[data-cvorbit-price]');
  const wasEl = root.querySelector('[data-cvorbit-was]');
  const priceRow = priceEl.parentElement;
  const chipsEl = root.querySelector('[data-cvorbit-chips]');
  const linkEl = root.querySelector('[data-cvorbit-link]');
  const dotsEl = root.querySelector('[data-cvorbit-dots]');
  const pauseButton = root.querySelector('[data-cvorbit-pause]');
  const pauseLabel = root.querySelector('[data-cvorbit-pause-label]');
  const hold = parseFloat(root.dataset.hold) || 3.5;

  const N = items.length;
  const STEP = TAU / N;
  const RADIUS = N > 5 ? 2.15 : 1.85;
  const CARD_W = 1.2;
  const CARD_H = 1.5;

  /* ---------- Renderer, scene, camera ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = 'cvorbit__canvas';
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const lookTarget = new THREE.Vector3(0, 0.1, 0);
  let baseZ = 7.4;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  /* ---------- Turntable (KIE) + glow ---------- */
  const tableGroup = new THREE.Group();
  tableGroup.position.y = -CARD_H / 2 - 0.14;
  scene.add(tableGroup);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry((RADIUS + 1.6) * 2, (RADIUS + 1.6) * 2),
    new THREE.MeshBasicMaterial({ map: glowTexture(THREE), transparent: true, depthWrite: false, opacity: 0 })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.02;
  glow.renderOrder = -2;
  tableGroup.add(glow);

  const table = new THREE.Mesh(
    new THREE.CircleGeometry(RADIUS + 0.75, 96),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
  );
  table.rotation.x = -Math.PI / 2;
  table.renderOrder = -1;
  tableGroup.add(table);
  if (root.dataset.turntable) {
    loader.load(root.dataset.turntable, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      table.material.map = tex;
      table.material.needsUpdate = true;
    });
  }

  /* ---------- Cases: cream paper card + real product photo ---------- */
  const photoAlpha = roundedAlpha(THREE, 256, 320, 24);
  const paperAlpha = roundedAlpha(THREE, 256, 320, 30);

  const cards = items.map((item, index) => {
    const group = new THREE.Group();
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W + 0.12, CARD_H + 0.12),
      new THREE.MeshBasicMaterial({ color: 0xfdf9f1, alphaMap: paperAlpha, transparent: true, opacity: 0 })
    );
    paper.position.z = -0.01;
    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, CARD_H),
      new THREE.MeshBasicMaterial({ alphaMap: photoAlpha, transparent: true, opacity: 0 })
    );
    group.add(paper, photo);
    scene.add(group);

    const card = { group, paper, photo, item, index, intro: 0, load: 0 };
    photo.userData.card = card;
    loader.load(item.image, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      coverUV(tex, CARD_W / CARD_H);
      photo.material.map = tex;
      photo.material.needsUpdate = true;
      gsap.to(card, { load: 1, duration: 0.5, ease: 'power2.out' });
    });
    return card;
  });
  const photos = cards.map((c) => c.photo);

  /* ---------- KIE sweets: ambient depth layer ---------- */
  const spots = [[-3.7, 1.5, -2.2, 0.62], [3.8, 1.8, -2.6, 0.55], [-3.2, -0.7, 1.3, 0.48], [3.4, -0.4, 1.0, 0.56], [0.4, 2.5, -3.4, 0.46]];
  const sweets = (root.dataset.sweets || '').split(',').filter(Boolean).map((url, i) => {
    const [x, y, z, size] = spots[i % spots.length];
    const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(0.001);
    sprite.userData = { x, y, z, size, phase: i * 1.7, depth: (z + 3.5) / 5, fade: 0 };
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
      sprite.userData.aspect = tex.image.width / tex.image.height;
    });
    scene.add(sprite);
    return sprite;
  });

  /* ---------- State ---------- */
  const state = { rot: 0, dolly: 0, table: 0 };
  const pauses = new Set();
  let current = 0;
  let countdown = null;
  let swapTl = null;
  let drag = null;
  let ticking = false;
  let started = false;
  let ticketReady = false;
  const tmp = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  /* ---------- Dots with countdown fills ---------- */
  const dots = items.map((item, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cvorbit__dot';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', item.title);
    b.appendChild(document.createElement('i'));
    b.addEventListener('click', () => showCase(k));
    dotsEl.appendChild(b);
    return b;
  });
  const fills = dots.map((d) => d.firstChild);

  /* ---------- Ticket ---------- */
  function chipsFor(item) {
    const out = [];
    if (item.models > 1) out.push({ text: 'Fits ' + item.models + ' phone models', strong: true });
    if (item.styles > 1) out.push({ text: item.styles + ' colours & styles' });
    (item.features || []).slice(0, 3).forEach((f) => out.push({ text: f }));
    return out;
  }

  function fillTicket(item, i) {
    countEl.textContent = pad(i + 1) + ' / ' + pad(N);
    titleEl.textContent = item.title;
    priceEl.textContent = (item.from ? 'From ' : '') + item.price;
    wasEl.textContent = item.was || '';
    if (!item.available) {
      saveEl.hidden = false;
      saveEl.textContent = 'Sold out';
    } else if (item.save > 0) {
      saveEl.hidden = false;
      saveEl.textContent = 'Save ' + item.save + '%';
    } else {
      saveEl.hidden = true;
    }
    chipsEl.textContent = '';
    chipsFor(item).forEach((c) => {
      const li = document.createElement('li');
      li.className = 'cvorbit__chip' + (c.strong ? ' cvorbit__chip--strong' : '');
      li.textContent = c.text;
      chipsEl.appendChild(li);
    });
    linkEl.href = item.url;
    linkEl.setAttribute('aria-label', 'View ' + item.title);
  }

  function swapTicket(i) {
    const item = items[i];
    if (!ticketReady) {
      fillTicket(item, i);
      ticketReady = true;
      return;
    }
    if (swapTl) swapTl.kill();
    const outgoing = [titleEl, priceRow].concat(Array.from(chipsEl.children));
    swapTl = gsap.timeline()
      .to(outgoing, { y: -8, opacity: 0, duration: 0.16, ease: 'power2.in', stagger: 0.02 })
      .to(countEl, { y: -6, opacity: 0, duration: 0.14, ease: 'power2.in' }, 0)
      .add(() => fillTicket(item, i))
      .add(() => {
        const incoming = [titleEl, priceRow].concat(Array.from(chipsEl.children));
        gsap.fromTo(incoming, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.34, ease: 'back.out(1.7)', stagger: 0.045, clearProps: 'transform' });
        gsap.fromTo(countEl, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.26, ease: 'power2.out', clearProps: 'transform' });
        if (!saveEl.hidden) {
          gsap.fromTo(saveEl, { scale: 0.3, rotation: -14 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)', clearProps: 'transform' });
        }
      }, '+=0.12');
  }

  /* ---------- Autoplay ---------- */
  function setPause(reason, on) {
    if (on) pauses.add(reason); else pauses.delete(reason);
    if (!countdown) return;
    if (pauses.size) countdown.pause(); else countdown.resume();
  }

  function onPauseClick() {
    const paused = !pauses.has('user');
    setPause('user', paused);
    pauseButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseButton.setAttribute('aria-label', paused ? 'Resume automatic rotation' : 'Pause automatic rotation');
    pauseLabel.textContent = paused ? 'Resume' : 'Pause';
  }

  function showCase(i, opts) {
    i = mod(i, N);
    const changed = i !== current || !ticketReady;
    current = i;

    const delta = mod(-i * STEP - state.rot + Math.PI, TAU) - Math.PI;
    const turn = Math.abs(delta) < 0.001 ? 0.01 : gsap.utils.clamp(0.75, 1.35, 0.6 + Math.abs(delta) * 0.5);
    gsap.to(state, { rot: state.rot + delta, duration: turn, ease: opts && opts.fromDrag ? 'power3.out' : 'power3.inOut', overwrite: 'auto' });

    dots.forEach((d, k) => {
      d.setAttribute('aria-selected', k === i ? 'true' : 'false');
      d.classList.remove('is-done');
    });
    if (countdown) countdown.kill();
    gsap.set(fills, { scaleX: 0 });
    countdown = gsap.fromTo(fills[i], { scaleX: 0 }, {
      scaleX: 1, duration: hold, ease: 'none', delay: turn * 0.7,
      paused: pauses.size > 0,
      onComplete: () => {
        dots[i].classList.add('is-done');
        showCase(current + 1);
      }
    });

    if (changed) swapTicket(i);
  }

  /* ---------- Render ---------- */
  function render(time) {
    camera.position.set(0, 1.35 - state.dolly * 0.35, baseZ - state.dolly * 1.1);
    camera.lookAt(lookTarget);

    tableGroup.rotation.y = state.rot;
    tableGroup.scale.setScalar(0.7 + state.table * 0.3);
    table.material.opacity = state.table;
    glow.material.opacity = state.table;

    cards.forEach((c) => {
      const a = state.rot + c.index * STEP;
      const f = (Math.cos(a) + 1) / 2; // 1 = facing the camera
      const x = Math.sin(a) * RADIUS;
      const z = Math.cos(a) * RADIUS;
      const bob = Math.sin(time * 1.1 + c.index * 1.3) * 0.035;
      const lift = f * f * 0.24;
      const y = lift + bob - (1 - c.intro) * 1.3;
      c.group.position.set(x, y, z);
      tmp.set(camera.position.x, y, camera.position.z);
      c.group.lookAt(tmp);
      c.group.scale.setScalar((0.84 + f * 0.24) * (0.55 + 0.45 * c.intro));

      const shade = 0.4 + 0.6 * Math.pow(f, 1.6);
      c.photo.material.color.setScalar(shade);
      c.paper.material.color.setRGB(0.992 * shade, 0.976 * shade, 0.945 * shade, THREE.SRGBColorSpace);
      c.paper.material.opacity = c.intro;
      c.photo.material.opacity = c.intro * c.load;
    });

    // Back to front, so overlapping cases blend correctly.
    cards.slice().sort((p, q) => p.group.position.z - q.group.position.z).forEach((c, k) => {
      c.paper.renderOrder = k * 2;
      c.photo.renderOrder = k * 2 + 1;
    });

    sweets.forEach((s) => {
      const u = s.userData;
      const drift = Math.sin(state.rot) * 0.3 * u.depth; // counter-motion against the turn
      s.position.set(u.x - drift, u.y + Math.sin(time * 0.7 + u.phase) * 0.14, u.z);
      s.material.rotation = Math.sin(time * 0.45 + u.phase) * 0.28;
      const h = u.size * (0.4 + 0.6 * u.fade);
      s.scale.set(h * (u.aspect || 1), h, 1);
      s.material.opacity = u.fade * 0.92;
    });

    renderer.render(scene, camera);
  }

  function setTicking(on) {
    if (on === ticking) return;
    ticking = on;
    if (on) gsap.ticker.add(render); else gsap.ticker.remove(render);
  }

  /* ---------- Size ---------- */
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    baseZ = camera.aspect < 1 ? 10.4 : camera.aspect < 1.6 ? 9 : 8;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (!ticking) render(gsap.ticker.time);
  }
  const ro = new ResizeObserver(resize);

  /* ---------- Pointer: drag to spin, click to bring round or open ---------- */
  const canvas = renderer.domElement;

  function hitCard(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(photos, false);
    return hits.length ? hits[0].object.userData.card : null;
  }

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, rot: state.rot, lastX: e.clientX, lastT: performance.now(), v: 0, moved: false };
  }
  function onMove(e) {
    if (!drag) {
      if (fineQuery && fineQuery.matches) canvas.classList.toggle('is-pointing', !!hitCard(e));
      return;
    }
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
      drag.moved = true;
      try { canvas.setPointerCapture(drag.id); } catch (err) { /* pointer already gone */ }
      canvas.classList.add('is-grabbing');
      gsap.killTweensOf(state, 'rot');
      setPause('drag', true);
    }
    state.rot = drag.rot + dx * 0.0065;
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastT);
    drag.v = ((e.clientX - drag.lastX) * 0.0065) / dt * 16.7;
    drag.lastX = e.clientX;
    drag.lastT = now;
    const nearest = mod(Math.round(-state.rot / STEP), N);
    if (nearest !== current) {
      current = nearest;
      swapTicket(nearest);
    }
  }
  function onUp(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    canvas.classList.remove('is-grabbing');
    if (d.moved) {
      setPause('drag', false);
      showCase(Math.round(-(state.rot + d.v * 12) / STEP), { fromDrag: true });
      return;
    }
    if (e.type === 'pointercancel') return;
    const card = hitCard(e);
    if (!card) return;
    if (card.index === current) window.location.href = card.item.url;
    else showCase(card.index);
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  const onPointerEnter = () => setPause('hover', true);
  const onPointerLeave = () => { setPause('hover', false); canvas.classList.remove('is-pointing'); };
  if (fineQuery && fineQuery.matches) {
    stage.addEventListener('pointerenter', onPointerEnter);
    stage.addEventListener('pointerleave', onPointerLeave);
  }
  const onTicketFocusIn = (e) => {
    if (!pauseButton.contains(e.target)) setPause('focus', true);
  };
  const onTicketFocusOut = (e) => {
    const next = e.relatedTarget;
    setPause('focus', !!(next && ticket.contains(next) && !pauseButton.contains(next)));
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); showCase(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); showCase(current - 1); }
  };
  pauseButton.addEventListener('click', onPauseClick);
  ticket.addEventListener('focusin', onTicketFocusIn);
  ticket.addEventListener('focusout', onTicketFocusOut);
  wrap.addEventListener('keydown', onKeyDown);
  const onVisibility = () => setPause('hidden', document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  /* ---------- Go 3D ---------- */
  wrap.classList.add('is-3d');
  ticket.hidden = false;
  fillTicket(items[0], 0);
  ticketReady = true;
  ro.observe(stage);
  resize();
  setPause('intro', true);
  showCase(0);

  const triggers = [];
  const introTl = gsap.timeline({ paused: true, onComplete: () => setPause('intro', false) })
    .to(state, { table: 1, duration: 1.2, ease: 'expo.out' }, 0)
    .fromTo(state, { rot: STEP * 0.9 }, { rot: 0, duration: 1.5, ease: 'power3.out', immediateRender: false }, 0)
    .to(cards, { intro: 1, duration: 0.9, ease: 'back.out(1.3)', stagger: 0.07 }, 0.15)
    .to(sweets.map((s) => s.userData), { fade: 1, duration: 0.8, ease: 'back.out(2)', stagger: 0.08 }, 0.5)
    .from(ticket, { x: 30, opacity: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.35);

  triggers.push(ScrollTrigger.create({
    trigger: wrap, start: 'top 80%', once: true,
    onEnter: () => introTl.play()
  }));
  triggers.push(ScrollTrigger.create({
    trigger: wrap, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => { setTicking(self.isActive); setPause('offscreen', !self.isActive); }
  }));
  const dolly = gsap.to(state, {
    dolly: 1, ease: 'none',
    scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
  });
  started = true;
  ScrollTrigger.refresh();

  root._cvorbitDestroy = () => {
    setTicking(false);
    triggers.forEach((t) => t.kill());
    if (dolly.scrollTrigger) dolly.scrollTrigger.kill();
    dolly.kill();
    introTl.kill();
    if (countdown) countdown.kill();
    if (swapTl) swapTl.kill();
    gsap.killTweensOf(state);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    if (fineQuery && fineQuery.matches) {
      stage.removeEventListener('pointerenter', onPointerEnter);
      stage.removeEventListener('pointerleave', onPointerLeave);
    }
    pauseButton.removeEventListener('click', onPauseClick);
    ticket.removeEventListener('focusin', onTicketFocusIn);
    ticket.removeEventListener('focusout', onTicketFocusOut);
    wrap.removeEventListener('keydown', onKeyDown);
    renderer.dispose();
    canvas.remove();
    dotsEl.textContent = '';
    wrap.classList.remove('is-3d');
    ticket.hidden = true;
    return started;
  };
}

function boot(scope) {
  const gsap = window.gsap;
  if (!gsap) return;
  scope.querySelectorAll('[data-cvorbit]').forEach((root) => {
    if (root.dataset.cvorbitReady === '1') return;
    root.dataset.cvorbitReady = '1';
    if (reduceQuery && reduceQuery.matches) return;
    animatePerks(root, gsap);
    if (supportsWebGL()) mount(root);
  });
}

boot(document);
document.addEventListener('shopify:section:load', (e) => boot(e.target));
document.addEventListener('shopify:section:unload', (e) => {
  e.target.querySelectorAll('[data-cvorbit]').forEach((root) => {
    if (root._cvorbitDestroy) root._cvorbitDestroy();
    root.dataset.cvorbitReady = '';
  });
});
