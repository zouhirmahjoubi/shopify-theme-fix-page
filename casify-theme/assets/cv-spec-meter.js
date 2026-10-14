/* Casify: the Shop Counter's "Protection meter" (snippets/cv-spec-meter.liquid,
 * block "spec_meter" of sections/cv-product-counter.liquid).
 *
 * Loaded as a module from the block itself, so it runs after GSAP's deferred
 * bundle in <head>.
 *   deal     the first time the card is on screen the ticket swings up into
 *            place and its perforation draws down the middle.
 *   fill     each bar fills segment by segment while its wrapped sweet rolls
 *            along to the end of the fill and lands with a squash; the drop
 *            height rolls up from zero and a highlighter swipes behind it;
 *            the end labels rise in and a gloss runs along the bars.
 *   drop     three.js: a small phone in the impact colour pops in above the
 *            impact bar, tumbles down, lands corner first by the sweet and
 *            tips onto its back. The bars ripple out from where it lands, the
 *            sweet hops, a shock ring spreads and candy confetti flies.
 *            Hover (mouse) or tap the impact meter to drop it again.
 *   swell    hover or tap the thickness meter: its filled bars swell in turn
 *            and its sweet hops.
 *   idle     while the card is on screen the candy stripes drift, and every
 *            few seconds a gloss passes and the sweets wiggle.
 * The phone is built from primitives in the theme's colours, so there's no
 * model file. The canvas only renders while the phone is moving. Reduced
 * motion: nothing here runs and the card is shown finished. No WebGL, or
 * three.js fails to load: everything else runs and the impact meter ripples
 * instead of the drop.
 */
const CVM_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const TAU = Math.PI * 2;
// Canvas overhang around the impact meter (px): the phone falls from above it.
const PAD = { t: 82, r: 18, b: 14, l: 18 };
// The phone (px): width, height, depth, corner radius.
const PHONE = { w: 17, h: 32, d: 3.4, r: 4.2 };
// Poses (Euler XYZ, so z turns it in the screen plane first and x tilts it last).
const START = { x: 0.35, y: 0, z: 0.5 };
const CONTACT = { x: -0.32, y: 0, z: 0.62 };
const REST = { x: -(Math.PI / 2 - 0.42), y: 0, z: Math.PI / 2 };
// Reveal timing (s): when the first bar starts filling, and the gap to the second.
const FILL_AT = 0.42;
const FILL_STEP = 0.2;

const html = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
let cvmThree = null;
let cvmWiggle = null;

function release() { html.classList.remove('cvm-pending'); }

function cvmWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    if (!gl) return false;
    // Hand the probe context back: browsers cap live WebGL contexts per page.
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch (error) {
    return false;
  }
}

function cvmFillTime(meter) { return 0.1 * Math.max(meter.fills.length - 1, 0) + 0.38; }

/* Rolls every number in "8.2ft | 2.5m" up from zero, keeping its decimals. */
function cvmRoller(el) {
  const final = el.textContent;
  const parts = final.split(/(\d+(?:[.,]\d+)?)/);
  const nums = [];
  for (let i = 1; i < parts.length; i += 2) {
    const dec = /[.,](\d+)$/.exec(parts[i]);
    nums.push({
      i: i,
      target: parseFloat(parts[i].replace(',', '.')),
      places: dec ? dec[1].length : 0,
      comma: parts[i].indexOf(',') > -1
    });
  }
  if (!nums.length) return null;
  function write(p) {
    const out = parts.slice();
    nums.forEach(function (n) {
      const v = (n.target * p).toFixed(n.places);
      out[n.i] = n.comma ? v.replace('.', ',') : v;
    });
    el.textContent = out.join('');
  }
  function finish() {
    el.textContent = final;
    el.style.minWidth = '';
  }
  return {
    zero: function () {
      el.style.minWidth = el.offsetWidth + 'px';
      write(0);
    },
    tween: function (gsap, duration) {
      const o = { p: 0 };
      return gsap.to(o, { p: 1, duration: duration, ease: 'power2.out', onUpdate: function () { write(o.p); }, onComplete: finish });
    },
    finish: finish
  };
}

/* The sweet jumps off the bar with a twist and bounces back down. */
function cvmHop(gsap, sweet, k) {
  if (!sweet) return;
  const turn = (Math.random() < 0.5 ? -1 : 1) * (18 + 16 * k);
  gsap.timeline()
    .to(sweet, { y: -(5 + 9 * k), rotation: turn, scaleX: 1, scaleY: 1, duration: 0.17, ease: 'power2.out', overwrite: 'auto' })
    .to(sweet, { y: 0, rotation: 0, duration: 0.55, ease: 'bounce.out' })
    .fromTo(sweet, { scaleX: 1.2, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'elastic.out(1, 0.4)' }, 0.42);
}

/* The bars dip and spring back, strongest where the phone landed. */
function cvmRipple(gsap, meter, at, strength) {
  meter.segs.forEach(function (seg, i) {
    const d = Math.abs(i - at);
    const k = strength * Math.max(0, 1 - d / 3.4);
    if (k < 0.04) return;
    gsap.timeline({ delay: d * 0.04 })
      .to(seg, { y: 2.6 * k, scaleY: 1 + 0.8 * k, duration: 0.07, ease: 'power2.out', overwrite: 'auto' })
      .to(seg, { y: 0, scaleY: 1, duration: 0.55, ease: 'elastic.out(1, 0.32)', clearProps: 'transform' });
  });
  cvmHop(gsap, meter.sweet, strength);
  if (meter.value) {
    gsap.fromTo(meter.value, { scale: 1 }, {
      scale: 1 + 0.1 * strength, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out',
      transformOrigin: '100% 70%', overwrite: 'auto', clearProps: 'transform'
    });
  }
}

/* ------------------------------------------------------------------ the drop */
async function cvmScene(meter) {
  if (!cvmWebGL()) return null;
  let THREE;
  try {
    if (!cvmThree) cvmThree = import(CVM_THREE_URL);
    THREE = await cvmThree;
  } catch (error) {
    return null;
  }
  if (!meter.el.isConnected) return null;

  const gsap = window.gsap;
  const styles = getComputedStyle(meter.el);
  const tone = function (name, fallback) { return new THREE.Color(styles.getPropertyValue(name).trim() || fallback); };
  const C = {
    body: tone('--cvm-tone', '#C4302B'),
    ink: tone('--cocoa-700', '#33231A'),
    glass: tone('--teal-100', '#E4F0EE'),
    red: tone('--red-500', '#C4302B'),
    teal: tone('--teal-500', '#6C9E9C'),
    gold: tone('--gold-400', '#D2B57C'),
    cream: tone('--cream-300', '#EADCBF')
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (error) {
    return null; // three.js needs WebGL2
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'cvm__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.left = -PAD.l + 'px';
  canvas.style.top = -PAD.t + 'px';
  canvas.style.visibility = 'hidden';
  meter.el.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-0.4, 0.9, 1);
  scene.add(key);
  // 1 unit = 1 CSS px, origin at the canvas's top-left corner, y up.
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -200, 200);

  const disposables = [];
  const keep = function (item) { disposables.push(item); return item; };
  const ramp = keep(new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat));
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const toon = function (color) { return keep(new THREE.MeshToonMaterial({ color: color, gradientMap: ramp })); };
  const flat = function (color, opacity) {
    return keep(new THREE.MeshBasicMaterial({ color: color, transparent: opacity < 1, opacity: opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide }));
  };
  const inkBack = keep(new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide }));
  // For the ring and the confetti, which fade out.
  const fading = function (color) {
    return keep(new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  };

  function rounded(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* The phone in its case: a bevelled slab in the impact colour with an ink
     rim, a dark screen with a glint on the front, a camera block on the back. */
  const phone = new THREE.Group();
  const bevel = 0.9;
  const bodyGeo = keep(new THREE.ExtrudeGeometry(rounded(PHONE.w - 2 * bevel, PHONE.h - 2 * bevel, PHONE.r - bevel), {
    depth: PHONE.d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6
  }));
  bodyGeo.center();
  const body = new THREE.Mesh(bodyGeo, toon(C.body));
  const rim = new THREE.Mesh(bodyGeo, inkBack);
  rim.scale.set((PHONE.w + 1.6) / PHONE.w, (PHONE.h + 1.6) / PHONE.h, (PHONE.d + 1.6) / PHONE.d);
  phone.add(rim, body);

  const screen = new THREE.Mesh(keep(new THREE.ShapeGeometry(rounded(PHONE.w - 3.6, PHONE.h - 3.6, PHONE.r - 1.7), 6)), flat(C.ink, 1));
  screen.position.z = PHONE.d / 2 + 0.06;
  const glint = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 13)), flat(C.glass, 0.38));
  glint.rotation.z = -0.5;
  glint.position.set(-1.6, 2.4, PHONE.d / 2 + 0.12);
  phone.add(screen, glint);

  const bumpGeo = keep(new THREE.ExtrudeGeometry(rounded(7.4, 7.4, 2.2), { depth: 0.9, bevelEnabled: false, curveSegments: 4 }));
  const bump = new THREE.Mesh(bumpGeo, toon(C.body.clone().multiplyScalar(0.8)));
  bump.position.set(-PHONE.w / 2 + 5.4, PHONE.h / 2 - 5.4, -PHONE.d / 2 - 0.9);
  phone.add(bump);
  const lensGeo = keep(new THREE.CircleGeometry(1.3, 14));
  const lensMat = flat(C.ink, 1);
  [[-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]].forEach(function (o) {
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(bump.position.x + o[0], bump.position.y + o[1], -PHONE.d / 2 - 0.96);
    phone.add(lens);
  });
  scene.add(phone);

  // How far the phone's lowest point sits below its centre in a pose.
  const box = new THREE.Box3();
  function lift(pose) {
    phone.position.set(0, 0, 0);
    phone.rotation.set(pose.x, pose.y, pose.z);
    phone.scale.setScalar(1);
    phone.updateMatrixWorld(true);
    box.setFromObject(body, true);
    return -box.min.y;
  }
  const LIFT = { contact: lift(CONTACT), rest: lift(REST) };

  // Shock ring: an ellipse lying on the bar. Confetti: little candy pieces in the shop's colours.
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.8, 1, 40)), fading(C.body));
  scene.add(ring);
  const dotGeo = keep(new THREE.CircleGeometry(1.2, 10));
  const barGeo = keep(new THREE.PlaneGeometry(3.6, 1.5));
  const palette = [C.red, C.teal, C.gold, C.cream, C.red, C.teal, C.gold, C.body];
  const confetti = palette.map(function (color, i) {
    const piece = new THREE.Mesh(i % 2 ? barGeo : dotGeo, fading(color));
    scene.add(piece);
    return piece;
  });

  let W = 1;
  let barMid = 0;
  let barTop = 0;
  let segX = [];
  function measure() {
    const r = meter.el.getBoundingClientRect();
    const bar = meter.bar.getBoundingClientRect();
    W = Math.round(r.width + PAD.l + PAD.r);
    const H = Math.round(r.height + PAD.t + PAD.b);
    renderer.setSize(W, H);
    camera.right = W;
    camera.bottom = -H;
    camera.updateProjectionMatrix();
    barTop = -(bar.top - r.top + PAD.t);
    barMid = barTop - bar.height / 2;
    segX = meter.segs.map(function (s) {
      const b = s.getBoundingClientRect();
      return b.left - r.left + PAD.l + b.width / 2;
    });
  }

  // Compile every material now, while the phone is on stage but tiny, so the first drop doesn't stall.
  measure();
  phone.scale.setScalar(0.001);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  ring.visible = false;
  confetti.forEach(function (c) { c.visible = false; });

  function render() { renderer.render(scene, camera); }

  function nearest(x) {
    let best = 0;
    segX.forEach(function (sx, i) { if (Math.abs(sx - x) < Math.abs(segX[best] - x)) best = i; });
    return best;
  }

  function impact(x, k) {
    ring.position.set(x, barMid, -40);
    ring.visible = true;
    gsap.fromTo(ring.scale, { x: 3, y: 1 }, { x: 3 + 28 * k, y: 1 + 7 * k, duration: 0.5, ease: 'power2.out', overwrite: true });
    gsap.fromTo(ring.material, { opacity: 0.75 * k }, { opacity: 0, duration: 0.5, ease: 'power1.in', overwrite: true, onComplete: function () { ring.visible = false; } });
    if (k > 0.8) {
      confetti.forEach(function (c, i) {
        const dir = i % 2 ? 1 : -1;
        const fly = 0.62 + Math.random() * 0.2;
        c.visible = true;
        c.position.set(x + dir * 3, barMid, 40);
        c.rotation.z = Math.random() * TAU;
        c.scale.setScalar(0.7 + Math.random() * 0.6);
        c.material.opacity = 1;
        gsap.to(c.position, { x: x + dir * (10 + Math.random() * 26), duration: fly, ease: 'power1.out', overwrite: true });
        gsap.fromTo(c.position, { y: barMid }, { y: barMid + 8 + Math.random() * 18, duration: fly / 2, ease: 'power2.out', yoyo: true, repeat: 1 });
        gsap.to(c.rotation, { z: '+=' + (dir * (4 + Math.random() * 6)), duration: fly, ease: 'none', overwrite: true });
        gsap.to(c.material, { opacity: 0, duration: 0.25, delay: fly - 0.25, onComplete: function () { c.visible = false; } });
      });
    }
    cvmRipple(gsap, meter, nearest(x), k);
  }

  let busy = false;
  function drop() {
    if (busy || !meter.el.isConnected) return;
    busy = true;
    measure();
    const x = segX[Math.max(meter.level, 1) - 1] || W / 2;
    const p = phone.position;
    const r = phone.rotation;
    const s = phone.scale;
    p.set(x - 12, -24, 0);
    r.set(START.x, START.y, START.z);
    s.setScalar(0.001);
    canvas.style.visibility = 'visible';
    gsap.ticker.add(render);

    gsap.timeline({
      onComplete: function () {
        gsap.delayedCall(0.35, function () {
          gsap.ticker.remove(render);
          canvas.style.visibility = 'hidden';
          busy = false;
        });
      }
    })
      .to(s, { x: 1, y: 1, z: 1, duration: 0.22, ease: 'back.out(2.4)' })
      // The fall: it tumbles a full turn and comes down corner first.
      .to(p, { x: x - 2, duration: 0.5, ease: 'none' }, 0.14)
      .to(p, { y: barTop + LIFT.contact, duration: 0.5, ease: 'power2.in' }, 0.14)
      .to(r, { x: CONTACT.x, y: TAU, z: CONTACT.z, duration: 0.5, ease: 'power1.in' }, 0.14)
      .add(function () { impact(x - 2, 1); }, 0.64)
      // First bounce: it tips over onto its back.
      .to(r, { x: REST.x, z: REST.z, duration: 0.42, ease: 'power2.out' }, 0.64)
      .to(p, { x: x + 3, duration: 0.42, ease: 'power1.out' }, 0.64)
      .to(p, { y: barTop + LIFT.rest + 11, duration: 0.2, ease: 'power2.out' }, 0.64)
      .to(p, { y: barTop + LIFT.rest, duration: 0.2, ease: 'power2.in' }, 0.84)
      .add(function () { impact(x + 3, 0.45); }, 1.04)
      // A small second bounce, a moment's rest, then it's gone.
      .to(p, { y: barTop + LIFT.rest + 3, duration: 0.09, ease: 'power2.out' }, 1.04)
      .to(p, { y: barTop + LIFT.rest, duration: 0.09, ease: 'power2.in' }, 1.13)
      .to(s, { x: 0.001, y: 0.001, z: 0.001, duration: 0.3, ease: 'back.in(2)' }, 1.9);
  }

  return { drop: drop };
}

/* ------------------------------------------------------------------ one card */
function cvmInit(root) {
  if (root.dataset.cvmReady) return;
  root.dataset.cvmReady = '1';
  const gsap = window.gsap;
  if (!cvmWiggle && window.CustomWiggle) cvmWiggle = window.CustomWiggle.create('cvmWiggle', { wiggles: 4, type: 'easeOut' });

  const perf = root.querySelector('[data-cvm-perf]');
  const meters = Array.prototype.map.call(root.querySelectorAll('[data-cvm-meter]'), function (el) {
    const value = el.querySelector('[data-cvm-value]');
    return {
      el: el,
      key: el.getAttribute('data-cvm-meter'),
      level: parseInt(el.getAttribute('data-level'), 10) || 0,
      bar: el.querySelector('[data-cvm-bar]'),
      segs: Array.prototype.slice.call(el.querySelectorAll('[data-cvm-seg]')),
      fills: Array.prototype.slice.call(el.querySelectorAll('[data-cvm-seg].is-on .cvm__fill')),
      sheen: el.querySelector('[data-cvm-sheen]'),
      sweet: el.querySelector('[data-cvm-sweet]'),
      ends: el.querySelector('[data-cvm-ends]'),
      value: value,
      roll: value ? cvmRoller(value) : null
    };
  });

  // Start state: the ticket low and tilted, every bar empty.
  gsap.set(root, { autoAlpha: 0, y: 18, rotation: -1.4, transformOrigin: '50% 100%' });
  if (perf) gsap.set(perf, { scaleY: 0 });
  meters.forEach(function (m) {
    gsap.set(m.fills, { scaleX: 0, transformOrigin: '0% 50%' });
    if (m.sweet) gsap.set(m.sweet, { autoAlpha: 0 });
    if (m.ends) gsap.set(m.ends, { autoAlpha: 0, y: 5 });
    if (m.value) gsap.set(m.value, { '--cvm-hl': '0%' });
    if (m.roll) m.roll.zero();
  });
  release();

  const impact = meters.filter(function (m) { return m.key === 'impact'; })[0];
  const wantsDrop = Boolean(impact) && root.hasAttribute('data-cvm-drop');
  let scene = null;
  let played = false;
  let live = false;
  let onScreen = false;

  // Every few seconds while on screen: a gloss passes and the sweets wiggle.
  const idle = gsap.timeline({ repeat: -1, repeatDelay: 3.4, paused: true });
  meters.forEach(function (m, k) {
    if (m.sheen && m.fills.length) {
      idle.fromTo(m.sheen, { '--cvm-sheen-x': '-120%' }, { '--cvm-sheen-x': '220%', duration: 0.8, ease: 'power2.inOut', immediateRender: false }, 1 + k * 0.28);
    }
    if (m.sweet) {
      idle.to(m.sweet, cvmWiggle
        ? { rotation: 16, duration: 0.8, ease: 'cvmWiggle' }
        : { rotation: 10, duration: 0.12, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 1.3 + k * 0.28);
    }
  });
  function setLive() {
    const on = played === true && onScreen && !document.hidden;
    if (on === live) return;
    live = on;
    root.classList.toggle('is-live', on);
    if (on) idle.play(); else idle.pause();
  }

  function reveal() {
    if (played) return;
    if (wantsDrop) scene = cvmScene(impact);
    const tl = gsap.timeline({ delay: 0.1, onComplete: function () { played = true; setLive(); } });
    tl.to(root, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.65, ease: 'back.out(1.7)', clearProps: 'transform' }, 0);
    if (perf) tl.to(perf, { scaleY: 1, duration: 0.55, ease: 'power2.out', clearProps: 'transform' }, 0.2);
    meters.forEach(function (m, k) {
      const at = FILL_AT + k * FILL_STEP;
      const fillTime = cvmFillTime(m);
      tl.to(m.fills, { scaleX: 1, duration: 0.38, ease: 'power3.out', stagger: 0.1 }, at);
      if (m.sweet) {
        const dist = m.sweet.offsetLeft;
        tl.set(m.sweet, { autoAlpha: 1 }, at)
          .fromTo(m.sweet, { x: -dist, rotation: -360 * Math.max(1, Math.round(dist / 48)) },
            { x: 0, rotation: 0, duration: fillTime, ease: 'power2.out' }, at)
          .fromTo(m.sweet, { scaleX: 1.28, scaleY: 0.72 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)', immediateRender: false }, at + fillTime);
      }
      if (m.roll) tl.add(m.roll.tween(gsap, 0.95), at);
      if (m.value) tl.to(m.value, { '--cvm-hl': '100%', duration: 0.45, ease: 'power2.inOut' }, at + 0.75);
      if (m.ends) tl.to(m.ends, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', clearProps: 'transform' }, at + 0.15);
      if (m.sheen && m.fills.length) {
        tl.fromTo(m.sheen, { '--cvm-sheen-x': '-120%' }, { '--cvm-sheen-x': '220%', duration: 0.75, ease: 'power2.inOut' }, at + fillTime + 0.05);
      }
    });
    if (wantsDrop) {
      // Land the phone by the sweet as the impact bar finishes filling; skip it if three.js is slow to arrive.
      const landAt = 0.1 + FILL_AT + cvmFillTime(impact);
      const asked = performance.now();
      gsap.delayedCall(Math.max(landAt - 0.64, 0.1), function () {
        scene.then(function (s) {
          if (s && performance.now() - asked < 3500) s.drop();
        });
      });
    }
    played = 'playing';
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        onScreen = entry.isIntersecting;
        if (onScreen) reveal();
        setLive();
      });
    }, { threshold: 0.35 }).observe(root);
    document.addEventListener('visibilitychange', setLive);
  } else {
    reveal();
  }

  // Impact: drop the phone again (or ripple the bar and hop the sweet without WebGL).
  if (impact) {
    const again = function () {
      if (played !== true) return;
      const at = Math.max(impact.level, 1) - 1;
      if (!wantsDrop) { cvmRipple(gsap, impact, at, 1); return; }
      if (!scene) scene = cvmScene(impact);
      scene.then(function (s) {
        if (s) s.drop();
        else cvmRipple(gsap, impact, at, 1);
      });
    };
    impact.el.addEventListener('pointerenter', function (event) { if (fine.matches && event.pointerType === 'mouse') again(); });
    impact.el.addEventListener('click', again);
  }

  // Thickness: the filled bars swell one after another and the sweet hops.
  meters.forEach(function (m) {
    if (m === impact) return;
    let swelling = false;
    const on = m.segs.filter(function (s) { return s.classList.contains('is-on'); });
    const swell = function () {
      if (played !== true || swelling || !on.length) return;
      swelling = true;
      gsap.timeline({ onComplete: function () { swelling = false; } })
        .to(on, { scaleY: 2.1, duration: 0.16, ease: 'power2.out', stagger: 0.06 })
        .to(on, { scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.38)', stagger: 0.06, clearProps: 'transform' }, 0.16)
        .add(function () { cvmHop(gsap, m.sweet, 0.7); }, 0.06 * on.length);
    };
    m.el.addEventListener('pointerenter', function (event) { if (fine.matches && event.pointerType === 'mouse') swell(); });
    m.el.addEventListener('click', swell);
  });
}

function cvmBoot(scope) {
  const roots = scope.querySelectorAll('[data-cvm]');
  if (!roots.length) return;
  if (reduced || !window.gsap) { release(); return; }
  Array.prototype.forEach.call(roots, cvmInit);
}

cvmBoot(document);
document.addEventListener('shopify:section:load', function (event) { cvmBoot(event.target); });
