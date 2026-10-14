/* Casify — "Case wheel" (sections/cv-case-wheel.liquid).
 *
 * A module printed by the section, so it runs after the GSAP bundle in <head>.
 * three.js is fetched only when the wheel comes near the screen.
 *
 * Motion (candy-shop prize wheel):
 *   primary   tap or hover a case: the needle swings to it with a little
 *             overshoot (back.out) and the ticket's name and price swap in.
 *             "Spin the wheel": the needle lifts off the dial, spins three
 *             turns and more (power4.out), then drops back with a bounce on a
 *             random case
 *   secondary every case the needle passes clicks outward, like a prize-wheel
 *             peg; the chosen case grows and gets its red ring
 *   entrance  cases deal round the dial clockwise from the top, the heading's
 *             words rise, and the needle sweeps one full turn onto the first case
 *   three.js  the needle is glossy enamel with a peppermint hub; it catches the
 *             light as it turns, and its shadow slides out while it's lifted
 *   ambient   "Spin on its own": after the entrance the wheel spins itself (two
 *             turns, onto a random case), holds a few seconds, and spins again.
 *             It waits for the shopper (hover, keyboard focus, a recent pick or
 *             spin, the pause button, off screen, hidden tab); its picks aren't
 *             announced to screen readers, a shopper's own are
 * Keyboard: the ring is one tab stop; arrow keys move the needle, Home/End jump,
 * Enter on the chosen case opens it. A second tap on the chosen case opens it.
 * Reduced motion: the needle jumps straight to the case; nothing spins or deals in.
 */

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const mod = (n, m) => ((n % m) + m) % m;
const pad = (n) => String(n).padStart(2, '0');

let threeImport = null;
const loadThree = () => threeImport || (threeImport = import(THREE_URL));

function webglOk() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const ok = Boolean(window.WebGLRenderingContext && gl);
    const lose = gl && gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return ok;
  } catch (e) {
    return false;
  }
}

function whenNear(element, margin, fn) {
  if (!('IntersectionObserver' in window)) { fn(); return () => {}; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: margin });
  io.observe(element);
  return () => io.disconnect();
}

/* Run fn once: when the browser is first idle after load, or when the element
 * comes near, whichever is first. The needle's build (a WebGL context and its
 * first shader compile, ~200 ms) then lands while the shopper is still up the
 * page instead of mid-scroll as the wheel arrives. */
function whenIdleOrNear(element, margin, fn) {
  let done = false;
  let idle = 0;
  let stopNear = () => {};
  const cancelIdle = () => {
    if (!idle) return;
    if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
    else window.clearTimeout(idle);
  };
  const run = () => {
    if (done) return;
    done = true;
    stopNear();
    cancelIdle();
    fn();
  };
  stopNear = whenNear(element, margin, run);
  const queue = () => {
    if (done) return;
    idle = window.requestIdleCallback ? window.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 2500);
  };
  if (document.readyState === 'complete') queue();
  else window.addEventListener('load', queue, { once: true });
  return () => { done = true; stopNear(); cancelIdle(); };
}

/* ------------------------------------------------------------ three.js needle */

function peppermintTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FDF9F1';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#C4302B';
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    // Curved wedges: a swirl, not a pie.
    ctx.quadraticCurveTo(128 + Math.cos(a + 0.5) * 70, 128 + Math.sin(a + 0.5) * 70, 128 + Math.cos(a + 0.2) * 128, 128 + Math.sin(a + 0.2) * 128);
    ctx.lineTo(128 + Math.cos(a + 0.55) * 128, 128 + Math.sin(a + 0.55) * 128);
    ctx.quadraticCurveTo(128 + Math.cos(a + 0.9) * 70, 128 + Math.sin(a + 0.9) * 70, 128, 128);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function shadowTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(30,20,16,.55)');
  grad.addColorStop(1, 'rgba(30,20,16,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/*
  The needle, drawn over the dial in a square canvas. World units: the dial is
  2 wide (-1..1), so pixel sizes divide by half the dial's width.
  draw(state) renders one frame: state.angle (degrees, clockwise from 12 o'clock)
  and state.lift (0 resting on the dial .. 1 lifted for a spin).
*/
async function needleStage(root, host, dial) {
  if (!webglOk()) return null;
  let THREE;
  try { THREE = await loadThree(); } catch (e) { return null; }
  if (!host.isConnected) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  // Narrow lens, straight down: the needle lines up with the flat dial underneath.
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 40);
  camera.position.set(0, 0, 1 / Math.tan((10 * Math.PI) / 180));
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xb08f52, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-3, 5, 8);
  const rim = new THREE.DirectionalLight(0xffd9a0, 1.2);
  rim.position.set(5, -3, 4);
  scene.add(key, rim);

  // Sizes from the dial itself: the tip stops just short of the cases' inner edge.
  const dialRect = dial.getBoundingClientRect();
  const half = dialRect.width / 2;
  const topSlot = dial.querySelector('.cvwh__slot');
  const slotRect = topSlot.getBoundingClientRect();
  const inner = Math.max(0.3, (dialRect.top + half - slotRect.bottom) / half);
  const L = inner * 0.9;
  const tail = 0.12;
  const b = 0.062;

  const shape = new THREE.Shape();
  shape.moveTo(0, L);
  shape.lineTo(b, -tail);
  shape.absarc(0, -tail, b, 0, Math.PI, true);
  shape.lineTo(0, L);
  const depth = 0.035;
  const armGeo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.01, bevelSegments: 4, curveSegments: 18,
  });
  const hubGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.05, 48);
  hubGeo.rotateX(Math.PI / 2);
  const capGeo = new THREE.SphereGeometry(0.022, 20, 12);
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const mint = peppermintTexture(THREE);
  const shade = shadowTexture(THREE);

  const enamel = new THREE.MeshPhysicalMaterial({ color: 0x1e1410, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12 });
  const hubSide = new THREE.MeshStandardMaterial({ color: 0x1e1410, roughness: 0.35 });
  const hubFace = new THREE.MeshPhysicalMaterial({ map: mint, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd2b57c, roughness: 0.28, metalness: 0.75 });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shade, transparent: true, depthWrite: false, opacity: 0.5 });

  const needle = new THREE.Group();
  const arm = new THREE.Mesh(armGeo, enamel);
  arm.position.z = 0.012;
  const hub = new THREE.Mesh(hubGeo, [hubSide, hubFace, hubFace]);
  hub.position.z = depth + 0.04;
  const cap = new THREE.Mesh(capGeo, gold);
  cap.position.z = depth + 0.07;
  needle.add(arm, hub, cap);

  // A soft shadow under the arm, stretched along it.
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.scale.set(0.28, L + tail + 0.3, 1);
  shadow.position.set(0, (L - tail) / 2, -0.02);
  const shadowPivot = new THREE.Group();
  shadowPivot.add(shadow);
  scene.add(shadowPivot, needle);

  const size = () => {
    const w = host.clientWidth;
    if (!w) return;
    renderer.setSize(w, w, false);
  };

  const draw = (state) => {
    const rad = (-state.angle * Math.PI) / 180;
    const lift = state.lift || 0;
    needle.rotation.z = rad;
    needle.position.z = lift * 0.16;
    needle.rotation.x = lift * 0.06;
    shadowPivot.rotation.z = rad;
    shadowPivot.position.set(0.012 + lift * 0.05, -0.02 - lift * 0.07, 0);
    shadowMat.opacity = 0.5 - lift * 0.28;
    shadow.scale.x = 0.28 + lift * 0.12;
    renderer.render(scene, camera);
  };

  size();
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); } catch (e) { /* compiles on first draw */ }
  const ro = new ResizeObserver(() => { size(); if (root.cvwhState) draw(root.cvwhState); });
  ro.observe(host);

  return {
    draw,
    destroy() {
      ro.disconnect();
      [armGeo, hubGeo, capGeo, shadowGeo].forEach((g) => g.dispose());
      [mint, shade].forEach((t) => t.dispose());
      [enamel, hubSide, hubFace, gold, shadowMat].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      host.replaceChildren();
    },
  };
}

/* ------------------------------------------------------------ the wheel */

function initWheel(root) {
  if (root.cvwh) return;
  const itemsEl = root.querySelector('[data-cvwh-items]');
  const dial = root.querySelector('[data-cvwh-dial]');
  const ring = root.querySelector('[data-cvwh-ring]');
  const cases = Array.from(root.querySelectorAll('[data-cvwh-case]'));
  if (!itemsEl || !dial || !ring || !cases.length) return;
  let items;
  try { items = JSON.parse(itemsEl.textContent); } catch (e) { return; }

  const n = cases.length;
  const step = 360 / n;
  const gsap = window.gsap;
  const animate = () => Boolean(gsap) && !reduceQuery.matches;
  const cleanups = [];
  const needleEl = root.querySelector('[data-cvwh-needle]');
  const ticket = {
    name: root.querySelector('[data-cvwh-name]'),
    price: root.querySelector('[data-cvwh-price]'),
    was: root.querySelector('[data-cvwh-was]'),
    wasValue: root.querySelector('[data-cvwh-was-value]'),
    shop: root.querySelector('[data-cvwh-shop]'),
    count: root.querySelector('[data-cvwh-count]'),
    live: root.querySelector('.cvwh__pick-title'),
  };
  const spinButton = root.querySelector('[data-cvwh-spin]');
  const state = { angle: 0, lift: 0, active: 0 };
  root.cvwhState = state;
  let stage = null;
  let spinning = false;
  let autoSpinning = false;
  let spinTimeline = null;
  let lastPeg = 0;
  let ticketTimer = 0;
  let noteUser = () => {};

  const render = () => {
    needleEl.style.setProperty('--angle', `${state.angle}deg`);
    if (stage) stage.draw(state);
  };

  // A peg click: the case under the needle pops outward and back.
  const peg = (index) => {
    if (!animate()) return;
    const card = cases[index].querySelector('.cvwh__card');
    gsap.fromTo(card, { y: 0 }, { y: '-14%', duration: 0.09, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto' });
  };
  const onUpdate = () => {
    render();
    const under = mod(Math.round(state.angle / step), n);
    if (under !== lastPeg) {
      lastPeg = under;
      if (spinning) peg(under);
    }
  };

  const fillTicket = (index) => {
    const item = items[index] || {};
    ticket.name.textContent = item.title || '';
    ticket.name.href = item.url || '#';
    ticket.shop.href = item.url || '#';
    ticket.price.textContent = item.price || '';
    ticket.was.hidden = !item.was;
    ticket.wasValue.textContent = item.was || '';
    ticket.count.textContent = `${pad(index + 1)} / ${pad(n)}`;
  };
  // quiet: the change came from the automatic spin, so screen readers aren't told
  // every few seconds; a shopper's own pick is announced.
  const swapTicket = (index, quiet) => {
    window.clearTimeout(ticketTimer);
    if (ticket.live) ticket.live.setAttribute('aria-live', quiet ? 'off' : 'polite');
    if (!animate()) { fillTicket(index); return; }
    const parts = [ticket.name, ticket.price.parentNode];
    ticketTimer = window.setTimeout(() => {
      gsap.to(parts, {
        y: -8, opacity: 0, duration: 0.14, ease: 'power2.in', overwrite: true,
        onComplete: () => {
          fillTicket(index);
          gsap.fromTo(parts, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, ease: 'back.out(2.2)', stagger: 0.05, clearProps: 'transform,opacity' });
        },
      });
    }, 40);
  };

  const setActive = (index, { focus = false, quiet = false } = {}) => {
    const previous = cases[state.active];
    previous.classList.remove('is-active');
    previous.setAttribute('aria-pressed', 'false');
    previous.tabIndex = -1;
    const next = cases[index];
    next.classList.add('is-active');
    next.setAttribute('aria-pressed', 'true');
    next.tabIndex = 0;
    if (focus) next.focus({ preventScroll: true });
    if (index !== state.active) swapTicket(index, quiet);
    state.active = index;
  };

  // Shortest way round from where the needle is now.
  const angleFor = (index) => {
    const delta = mod(index * step - state.angle + 180, 360) - 180;
    return state.angle + delta;
  };

  // A shopper always wins over the automatic spin: it lets go and the needle settles.
  const stopAutoSpin = () => {
    if (!autoSpinning) return;
    if (spinTimeline) spinTimeline.kill();
    spinTimeline = null;
    autoSpinning = false;
    spinning = false;
    gsap.to(state, { lift: 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto', onUpdate });
  };

  const point = (index, options = {}) => {
    const i = mod(index, n);
    noteUser();
    if (autoSpinning) stopAutoSpin();
    if (spinning) return;
    setActive(i, options);
    const target = angleFor(i);
    if (!animate()) { state.angle = target; render(); return; }
    gsap.to(state, { angle: target, duration: 0.85, ease: 'back.out(1.6)', overwrite: 'auto', onUpdate });
  };

  // auto: started by the wheel itself (a little shorter, and not announced).
  const spin = ({ auto = false, onDone } = {}) => {
    if (!auto) noteUser();
    if (autoSpinning && !auto) stopAutoSpin();
    if (spinning) return;
    let pick = Math.floor(Math.random() * n);
    if (n > 1 && pick === state.active) pick = mod(pick + 1 + Math.floor(Math.random() * (n - 1)), n);
    if (!animate()) { setActive(pick); state.angle = angleFor(pick); render(); return; }
    spinning = true;
    autoSpinning = auto;
    if (spinButton && !auto) spinButton.setAttribute('aria-disabled', 'true');
    const turns = auto ? 2 : 3;
    const duration = auto ? 2.8 : 3.4;
    const land = duration * 0.8;
    const target = state.angle + 360 * turns + mod(pick * step - state.angle, 360);
    spinTimeline = gsap.timeline({
      onComplete: () => {
        spinning = false;
        autoSpinning = false;
        spinTimeline = null;
        if (spinButton) spinButton.removeAttribute('aria-disabled');
        // A shopper's own spin: give them time with the result before the wheel moves again.
        if (!auto) noteUser();
        if (onDone) onDone();
      },
    })
      .to(state, { lift: 1, duration: 0.3, ease: 'power2.out', onUpdate }, 0)
      .to(state, { angle: target, duration, ease: 'power4.out', onUpdate }, 0.05)
      .add(() => setActive(pick, { quiet: auto }), land)
      .to(state, { lift: 0, duration: 0.7, ease: 'bounce.out', onUpdate }, land + 0.05);
  };

  // Tap/click: point at it, or open it if the needle is already there.
  const onClick = (event) => {
    const button = event.target.closest('[data-cvwh-case]');
    if (!button) return;
    const index = cases.indexOf(button);
    if (index === state.active && !spinning && items[index] && items[index].url) {
      window.location.href = items[index].url;
      return;
    }
    point(index);
  };
  ring.addEventListener('click', onClick);
  cleanups.push(() => ring.removeEventListener('click', onClick));

  // Hover previews with a mouse: the needle follows the pointer round the ring.
  let hoverTimer = 0;
  const onOver = (event) => {
    if (!fineQuery.matches || spinning) return;
    const button = event.target.closest('[data-cvwh-case]');
    if (!button) return;
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => point(cases.indexOf(button)), 70);
  };
  ring.addEventListener('pointerover', onOver);
  cleanups.push(() => { ring.removeEventListener('pointerover', onOver); window.clearTimeout(hoverTimer); });

  const onKey = (event) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (event.key in keys) {
      event.preventDefault();
      point(state.active + keys[event.key], { focus: true });
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      point(event.key === 'Home' ? 0 : n - 1, { focus: true });
    }
  };
  ring.addEventListener('keydown', onKey);
  cleanups.push(() => ring.removeEventListener('keydown', onKey));

  if (spinButton) {
    const onSpin = () => spin();
    spinButton.hidden = false;
    spinButton.addEventListener('click', onSpin);
    cleanups.push(() => { spinButton.removeEventListener('click', onSpin); spinButton.hidden = true; });
  }

  /* Automatic spin: land on a random case, hold, spin again. It waits while the
     shopper hovers the dial, moves through it by keyboard, has just picked or spun
     (IDLE seconds), has paused it, or can't see it. A spin already under way lands
     first; a shopper's tap on a case takes over straight away. */
  const IDLE = 6;
  const autoplay = {
    on: root.dataset.autoplay === 'true' && animate(),
    hold: Math.max(2, parseFloat(root.dataset.hold) || 4),
    started: false, paused: false, hover: false, keys: false, visible: false,
    lastUser: -Infinity, call: null,
  };
  noteUser = () => { autoplay.lastUser = performance.now(); };
  const canAutoSpin = () => autoplay.started && !autoplay.paused && !autoplay.hover && !autoplay.keys
    && autoplay.visible && !document.hidden && !spinning && performance.now() - autoplay.lastUser > IDLE * 1000;
  const queue = (delay) => {
    if (autoplay.call) autoplay.call.kill();
    autoplay.call = gsap.delayedCall(delay, () => {
      autoplay.call = null;
      if (canAutoSpin()) spin({ auto: true, onDone: () => queue(autoplay.hold) });
      else queue(0.5);
    });
  };
  const startAutoplay = () => {
    if (!autoplay.on || autoplay.started) return;
    autoplay.started = true;
    queue(autoplay.hold);
  };

  const autoButton = root.querySelector('[data-cvwh-auto]');
  if (autoplay.on) {
    const io = new IntersectionObserver((entries) => {
      autoplay.visible = entries.some((entry) => entry.isIntersecting);
    }, { threshold: 0.35 });
    io.observe(dial);
    const onEnterDial = (event) => { if (event.pointerType === 'mouse') autoplay.hover = true; };
    const onLeaveDial = (event) => { if (event.pointerType === 'mouse') autoplay.hover = false; };
    dial.addEventListener('pointerenter', onEnterDial);
    dial.addEventListener('pointerleave', onLeaveDial);
    // Keyboard focus anywhere in the wheel (not the pause button itself) holds it still,
    // so the case and link under focus don't change out from under the shopper.
    const onFocusIn = (event) => {
      const target = event.target;
      autoplay.keys = target !== autoButton && Boolean(target.matches && target.matches(':focus-visible'));
    };
    const onFocusOut = (event) => { if (!root.contains(event.relatedTarget)) autoplay.keys = false; };
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    cleanups.push(() => {
      io.disconnect();
      dial.removeEventListener('pointerenter', onEnterDial);
      dial.removeEventListener('pointerleave', onLeaveDial);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      if (autoplay.call) autoplay.call.kill();
    });

    if (autoButton) {
      const label = () => {
        autoButton.dataset.paused = String(autoplay.paused);
        autoButton.setAttribute('aria-label', autoplay.paused ? autoButton.dataset.playLabel : autoButton.dataset.pauseLabel);
      };
      const onToggle = () => {
        autoplay.paused = !autoplay.paused;
        // Playing again spins straight away, so the button visibly does something.
        if (!autoplay.paused) autoplay.lastUser = -Infinity;
        label();
      };
      autoButton.hidden = false;
      label();
      autoButton.addEventListener('click', onToggle);
      cleanups.push(() => { autoButton.removeEventListener('click', onToggle); autoButton.hidden = true; });
    }
  }

  // Entrance: cases deal round clockwise, the heading rises, the needle sweeps a turn.
  const ScrollTrigger = window.ScrollTrigger;
  let context = null;
  if (animate() && ScrollTrigger) {
    context = gsap.context(() => {
      const cards = cases.map((button) => button.querySelector('.cvwh__card'));
      const title = root.querySelector('[data-cvwh-title]');
      const copy = root.querySelectorAll('.cvwh__eyebrow, .cvwh__text, .cvwh__ticket');
      let split = null;
      gsap.set(cards, { scale: 0, opacity: 0 });
      gsap.set(copy, { opacity: 0, y: 18 });
      if (title) gsap.set(title, { opacity: 0 });
      state.angle = -360;
      render();

      // The copy and the dial enter on their own: on phones the dial sits below the copy.
      // (The copy column is display: contents on phones, so it can't be the trigger.)
      ScrollTrigger.create({
        trigger: root.querySelector('.cvwh__eyebrow, .cvwh__title, .cvwh__text, .cvwh__ticket'),
        start: 'top 82%',
        once: true,
        onEnter: () => {
          const timeline = gsap.timeline();
          if (title) {
            timeline.set(title, { opacity: 1 }, 0);
            if (window.SplitText) {
              split = new window.SplitText(title, { type: 'words' });
              timeline.from(split.words, {
                yPercent: 70, opacity: 0, rotation: 4, duration: 0.7, ease: 'back.out(1.8)', stagger: 0.06,
                onComplete: () => { if (split) { split.revert(); split = null; } },
              }, 0);
            }
          }
          timeline.to(copy, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity' }, 0.1);
        },
      });

      ScrollTrigger.create({
        trigger: dial,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          const timeline = gsap.timeline({ onComplete: startAutoplay });
          timeline.to(cards, {
            scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)', stagger: { each: Math.min(0.045, 1 / n) }, clearProps: 'transform,opacity',
          }, 0.05);
          timeline.to(state, { lift: 0.6, duration: 0.3, ease: 'power2.out', onUpdate }, 0.2);
          timeline.to(state, { angle: 0, duration: 1.6, ease: 'power3.inOut', onUpdate }, 0.25);
          timeline.to(state, { lift: 0, duration: 0.6, ease: 'bounce.out', onUpdate }, 1.55);
        },
      });
    }, root);
  } else {
    startAutoplay();
  }

  // three.js needle once the page is idle or the wheel is near; until then (and without WebGL) the CSS needle.
  let alive = true;
  if (!reduceQuery.matches) {
    const host = root.querySelector('[data-cvwh-three]');
    cleanups.push(whenIdleOrNear(root, '300px 0px', async () => {
      const made = await needleStage(root, host, dial);
      if (!made) return;
      if (!alive) { made.destroy(); return; }
      stage = made;
      render();
      root.classList.add('is-three-ready');
      cleanups.push(() => { made.destroy(); root.classList.remove('is-three-ready'); stage = null; });
    }));
  }

  render();
  root.cvwh = {
    destroy() {
      alive = false;
      window.clearTimeout(ticketTimer);
      if (spinTimeline) spinTimeline.kill();
      if (gsap) gsap.killTweensOf(state);
      if (context) context.revert();
      cleanups.splice(0).forEach((fn) => fn());
      delete root.cvwh;
      delete root.cvwhState;
    },
  };
}

const boot = (scope) => scope.querySelectorAll('[data-cvwh]').forEach(initWheel);
boot(document);
document.addEventListener('shopify:section:load', (event) => boot(event.target));
document.addEventListener('shopify:section:unload', (event) => {
  event.target.querySelectorAll('[data-cvwh]').forEach((root) => { if (root.cvwh) root.cvwh.destroy(); });
});
