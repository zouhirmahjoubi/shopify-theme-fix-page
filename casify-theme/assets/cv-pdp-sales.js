/* Casify: the Shop Counter's sales notes, lit (snippets/cv-sales-note.liquid,
 * inside the [data-cvc-sales] wrapper in sections/cv-product-counter.liquid).
 *
 * Loaded as a module after cv-pdp-counter-motion.js, which slides the notes in.
 *   numbers  each count rolls up from zero to the number Liquid rendered the
 *            first time its note is on screen. The width is held while it
 *            rolls, and the final text is exactly what was rendered.
 *   pill     three.js: the blinking dot catches and becomes a small flame
 *            that flickers on its glow and sends an ember up now and then.
 *            It flares when the pointer arrives.
 *   rocket   three.js: the line's icon becomes a 3D rocket in the same pose.
 *            The engine lights, it lifts and barrel-rolls, then hovers on a
 *            flickering flame with puffs of exhaust. Every few seconds it
 *            fires a short burst and the number pulses with it. Pointer or
 *            tap: a bigger burst and another roll.
 * One renderer and one canvas cover both notes. The rocket and flame are
 * built from primitives in the theme's colours, so there's no model file to
 * load. Ambient motion pauses off screen and in a hidden tab. Reduced motion:
 * nothing here runs. No WebGL: the numbers still roll, and the dot and the
 * SVG rocket stay as they are.
 */
const CVSN_THREE_URL = window.CV_THREE_URL || 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const TAU = Math.PI * 2;
// Canvas overhang around the notes (px): embers rise above, exhaust trails off down-left.
const PAD = { t: 30, r: 10, b: 16, l: 22 };
// When cv-pdp-counter-motion.js slides each note in on page load (s).
const SLIDE = { pill: 0.62, rocket: 0.74 };
// The SVG rocket leans 35deg clockwise (cv-pdp-counter.css); y is up here, so negative.
const LEAN = -35 * Math.PI / 180;
// Flame body and heart; the outer flame is the theme's red (or teal on a teal pill).
const FIRE = { mid: '#E9A23B', core: '#FFF1C9' };

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const rand = (a, b) => a + Math.random() * (b - a);
let cvsnThree = null;

function cvsnWebGL() {
  if (window.cvWebGL) return window.cvWebGL();
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

/* Rolls a count from 0 up to the number Liquid rendered ("1480+", "100").
   Only for a count that is the product's own (its sales metafield), which the snippet marks
   with data-cvsn-source="product" on the note or the count. The merchant-typed store-wide
   fallback stays still: motion would amplify a number that is not this product's. */
function cvsnRoller(el) {
  if (!el.closest('[data-cvsn-source="product"]')) return null;
  const final = el.textContent;
  const m = /^(\D*)(\d+)(\D*)$/.exec(final.trim());
  if (!m || parseInt(m[2], 10) < 2) return null;
  const target = parseInt(m[2], 10);
  let tween = null;
  return {
    play: function (gsap, delay, onDone) {
      el.style.minWidth = el.offsetWidth + 'px';
      el.classList.add('is-rolling');
      el.textContent = m[1] + '0' + m[3];
      const o = { v: 0 };
      tween = gsap.to(o, {
        v: target,
        duration: target > 300 ? 1.25 : 1.0,
        delay: delay,
        ease: 'power3.out',
        onUpdate: function () { el.textContent = m[1] + Math.round(o.v) + m[3]; },
        onComplete: function () {
          tween = null;
          el.textContent = final;
          el.style.minWidth = '';
          el.classList.remove('is-rolling');
          if (onDone) onDone();
        }
      });
    },
    stop: function () {
      if (!tween) return;
      tween.kill();
      tween = null;
      el.textContent = final;
      el.style.minWidth = '';
      el.classList.remove('is-rolling');
    }
  };
}

// Kept near the old CSS pulse (1.1): more and the number crowds the word after it.
function cvsnPulse(gsap, el, amount) {
  if (!el) return;
  gsap.fromTo(el, { scale: 1 }, { scale: 1 + amount, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform' });
}

/* ------------------------------------------------------------------ the scene */
async function cvsnScene(wrap, entries) {
  if (!cvsnWebGL()) return null;
  let THREE;
  try {
    if (!cvsnThree) cvsnThree = import(CVSN_THREE_URL);
    THREE = await cvsnThree;
  } catch (error) {
    return null;
  }
  if (!wrap.isConnected) return null;

  const gsap = window.gsap;
  const styles = getComputedStyle(wrap);
  const tone = function (name, fallback) { return new THREE.Color(styles.getPropertyValue(name).trim() || fallback); };
  const C = {
    cream: tone('--cream-50', '#FDF9F1'),
    red: tone('--red-500', '#C4302B'),
    gold: tone('--gold-400', '#D2B57C'),
    brass: tone('--gold-500', '#B08F52'),
    glass: tone('--teal-100', '#E4F0EE'),
    ink: tone('--cocoa-700', '#33231A'),
    smoke: tone('--cream-400', '#DCC9A6'),
    tealDeep: tone('--teal-600', '#4E7C7B'),
    tealMid: tone('--teal-400', '#86B0AE'),
    mid: new THREE.Color(FIRE.mid),
    core: new THREE.Color(FIRE.core)
  };

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    return null; // three.js needs WebGL2
  }
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'cvc__sales-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.left = -PAD.l + 'px';
  canvas.style.top = -PAD.t + 'px';

  const scene = new THREE.Scene();
  // Toon: lit face ≈ (ambient + key·ramp)/π × colour, so the middle step reads as the HTML colour.
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-0.5, 0.8, 1);
  scene.add(key);
  // 1 unit = 1 CSS px, origin at the canvas's top-left corner, y up.
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -100, 100);

  const disposables = [];
  const keep = function (item) { disposables.push(item); return item; };

  const ramp = keep(new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat));
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const toon = function (color) { return keep(new THREE.MeshToonMaterial({ color: color, gradientMap: ramp })); };
  const basic = function (color, opacity) {
    return keep(new THREE.MeshBasicMaterial({ color: color, transparent: opacity < 1, opacity: opacity, depthWrite: opacity >= 1 }));
  };

  // Ink outline like the SVG icon's stroke: the back faces, pushed out along the normals.
  const outline = keep(new THREE.ShaderMaterial({
    uniforms: { uColor: { value: C.ink }, uWidth: { value: 0.8 } },
    vertexShader: [
      'uniform float uWidth;',
      'void main() {',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uWidth, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uColor;',
      'void main() {',
      '  gl_FragColor = vec4(uColor, 1.0);',
      '  #include <colorspace_fragment>',
      '}'
    ].join('\n'),
    side: THREE.BackSide
  }));
  const inkBack = keep(new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide }));

  /* A cartoon flame: a teardrop of revolution, base at 0, tip at -1. The tail
     stretches with uLen and flickers; uWide scales its girth (0 hides it). */
  const flameGeo = keep(new THREE.LatheGeometry([
    [0, 0.16], [0.3, 0.12], [0.44, 0], [0.46, -0.16], [0.4, -0.38], [0.27, -0.64], [0.12, -0.86], [0, -1]
  ].map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 20));
  function flameMaterial(color, seed) {
    return keep(new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uLen: { value: 0 }, uWide: { value: 0 }, uSeed: { value: seed },
        uColor: { value: color }, uAlpha: { value: 1 }
      },
      vertexShader: [
        'uniform float uTime;',
        'uniform float uLen;',
        'uniform float uWide;',
        'uniform float uSeed;',
        'void main() {',
        '  vec3 p = position;',
        '  float t = clamp(-p.y, 0.0, 1.0);',
        '  float flick = 1.0 + (0.16 * sin(uTime * 29.0 + uSeed) + 0.09 * sin(uTime * 13.0 + uSeed * 1.7)) * t;',
        '  if (p.y < 0.0) p.y *= uLen * flick;',
        '  p.xz *= uWide;',
        '  p.x += sin(uTime * 21.0 + t * 4.0 + uSeed) * 0.07 * t * uWide;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor;',
        'uniform float uAlpha;',
        'void main() {',
        '  gl_FragColor = vec4(uColor, uAlpha);',
        '  #include <colorspace_fragment>',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false
    }));
  }
  // Three nested layers drawn outer first; none writes depth, so each sits on the last.
  function buildFlame(colors, seed) {
    const group = new THREE.Group();
    const layers = [[colors[0], 1, 1], [colors[1], 0.7, 0.76], [colors[2], 0.4, 0.48]].map(function (spec, i) {
      const mesh = new THREE.Mesh(flameGeo, flameMaterial(spec[0], seed + i * 2.1));
      mesh.scale.set(spec[1], spec[2], spec[1]);
      mesh.position.z = i * 0.5;
      mesh.renderOrder = 2 + i;
      mesh.frustumCulled = false;
      group.add(mesh);
      return mesh;
    });
    return {
      group: group,
      set: function (t, len, wide) {
        layers.forEach(function (mesh) {
          const u = mesh.material.uniforms;
          u.uTime.value = t;
          u.uLen.value = len;
          u.uWide.value = wide;
        });
      }
    };
  }

  /* ---------------------------------------------------------- particles */
  const MAX = 80;
  const pPos = new Float32Array(MAX * 3);
  const pCol = new Float32Array(MAX * 3);
  const pSize = new Float32Array(MAX);
  const pAlpha = new Float32Array(MAX);
  const pool = [];
  for (let i = 0; i < MAX; i++) pool.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, lift: 0, drag: 0, s0: 1, s1: 1, a0: 1 });
  const pGeo = keep(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlpha, 1));
  const pMat = keep(new THREE.ShaderMaterial({
    uniforms: { uDpr: { value: dpr } },
    vertexShader: [
      'uniform float uDpr;',
      'attribute vec3 aColor;',
      'attribute float aSize;',
      'attribute float aAlpha;',
      'varying vec3 vColor;',
      'varying float vAlpha;',
      'void main() {',
      '  vColor = aColor;',
      '  vAlpha = aAlpha;',
      '  gl_PointSize = aSize * uDpr;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vColor;',
      'varying float vAlpha;',
      'void main() {',
      '  float d = length(gl_PointCoord - 0.5);',
      '  if (d > 0.5 || vAlpha <= 0.0) discard;',
      '  gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.36, d));',
      '  #include <colorspace_fragment>',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false
  }));
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  points.renderOrder = 6;
  scene.add(points);

  let pNext = 0;
  function spawn(o) {
    let index = -1;
    for (let n = 0; n < MAX; n++) {
      const i = (pNext + n) % MAX;
      if (pool[i].life <= 0) { index = i; break; }
    }
    if (index < 0) index = pNext;
    pNext = (index + 1) % MAX;
    const p = pool[index];
    Object.assign(p, { lift: 0, drag: 0, z: 0 }, o);
    p.life = p.max;
    o.color.toArray(pCol, index * 3);
    pGeo.attributes.aColor.needsUpdate = true;
  }
  function updateParticles(dt) {
    for (let i = 0; i < MAX; i++) {
      const p = pool[i];
      if (p.life <= 0) { pAlpha[i] = 0; continue; }
      p.life -= dt;
      if (p.life <= 0) { pAlpha[i] = 0; continue; }
      const k = 1 - p.life / p.max;
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.lift * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      pPos[i * 3] = p.x;
      pPos[i * 3 + 1] = p.y;
      pPos[i * 3 + 2] = p.z;
      pSize[i] = p.s0 + (p.s1 - p.s0) * k;
      pAlpha[i] = p.a0 * (1 - k * k);
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true;
  }

  /* ------------------------------------------------------------- actors */
  function makePill(entry) {
    const dotEl = entry.note.querySelector('.cvc__pill-dot');
    if (!dotEl) return null;
    const teal = entry.note.classList.contains('cvc__pill--teal');
    const dotColor = new THREE.Color(getComputedStyle(dotEl).backgroundColor || '#C9920A');
    const group = new THREE.Group();
    const halo = new THREE.Mesh(keep(new THREE.CircleGeometry(7, 28)), basic(dotColor, 0.22));
    const dot = new THREE.Mesh(keep(new THREE.CircleGeometry(4, 24)), basic(dotColor, 1));
    dot.position.z = 1;
    const flame = buildFlame(teal ? [C.tealDeep, C.tealMid, C.cream] : [C.red, C.mid, C.core], rand(0, 9));
    flame.group.rotation.z = Math.PI; // tip up
    flame.group.position.set(0, -3.5, 3);
    group.add(halo, dot, flame.group);
    group.visible = false;
    scene.add(group);
    const s = { dot: 1, size: 0, glow: 0, flare: 0 };
    let nextEmber = rand(0.8, 1.6);
    const emberColors = teal ? [C.tealDeep, C.tealMid] : [C.red, C.mid];

    const actor = {
      entry: entry,
      anchor: dotEl,
      group: group,
      lit: false,
      x: 0,
      y: 0,
      place: function () { group.position.set(actor.x, actor.y, 0); },
      ember: function (burst) {
        spawn({
          x: actor.x + rand(-1.5, 1.5), y: actor.y + 2 + 7 * s.size, z: 4,
          vx: rand(-9, 9), vy: burst ? rand(26, 42) : rand(16, 26), drag: 1.2, lift: -6,
          max: rand(0.7, 1.1), s0: rand(2.2, 3.2), s1: 0.6, a0: 1,
          color: emberColors[Math.random() < 0.6 ? 1 : 0]
        });
      },
      ignite: function () {
        if (actor.lit) return;
        actor.lit = true;
        group.visible = true;
        entry.note.classList.add('is-lit');
        gsap.timeline()
          .to(s, { dot: 0, duration: 0.24, ease: 'power2.in' }, 0)
          .to(s, { size: 1, duration: 0.95, ease: 'elastic.out(1, 0.45)' }, 0.04)
          .to(s, { glow: 1, duration: 0.6, ease: 'power2.out' }, 0.1)
          .call(function () { for (let i = 0; i < 5; i++) actor.ember(true); }, null, 0.16)
          .call(function () { cvsnPulse(gsap, entry.count, 0.1); }, null, 0.2);
      },
      flare: function () {
        if (!actor.lit) return;
        gsap.timeline()
          .to(s, { flare: 1, duration: 0.16, ease: 'power2.out', overwrite: 'auto' })
          .to(s, { flare: 0, duration: 0.8, ease: 'elastic.out(1, 0.45)' });
        for (let i = 0; i < 4; i++) actor.ember(true);
      },
      update: function (t, dt) {
        const f = s.flare;
        flame.group.scale.set(9 * (1 + f * 0.2), 12.5 * (1 + f * 0.45), 9);
        flame.group.rotation.z = Math.PI + Math.sin(t * 2.6) * 0.07;
        flame.set(t, s.size * (1 + 0.06 * Math.sin(t * 7.0)), s.size);
        dot.scale.setScalar(Math.max(0.001, s.dot));
        halo.scale.setScalar(1 + s.glow * (0.14 + 0.08 * Math.sin(t * 3.3) + f * 0.3));
        if (!actor.lit) return;
        nextEmber -= dt;
        if (nextEmber <= 0) {
          nextEmber = rand(1.0, 2.4);
          actor.ember(false);
        }
      },
      kill: function () { gsap.killTweensOf(s); }
    };
    return actor;
  }

  function makeRocket(entry) {
    const iconEl = entry.note.querySelector('.cvc__sold-icon');
    if (!iconEl) return null;
    const rocket = new THREE.Group(); // position + lean
    const spin = new THREE.Group(); // barrel roll about the rocket's own axis
    rocket.add(spin);
    rocket.rotation.z = LEAN;
    rocket.visible = false;
    scene.add(rocket);

    // Built in the SVG icon's units (viewBox 24), origin at its centre, nose up (+y).
    const lathe = function (pts) {
      return keep(new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 28));
    };
    const red = toon(C.red);
    const hullGeo = lathe([[0, -4.6], [4.1, -4.6], [4.6, -2.6], [5.0, -0.2], [4.8, 2.4], [4.3, 4.3]]);
    const noseGeo = lathe([[4.3, 4.3], [3.6, 5.8], [2.6, 7.3], [1.4, 8.4], [0, 9.2]]);
    [[hullGeo, toon(C.cream)], [noseGeo, red]].forEach(function (part) {
      spin.add(new THREE.Mesh(part[0], part[1]), new THREE.Mesh(part[0], outline));
    });
    const nozzleGeo = keep(new THREE.CylinderGeometry(1.8, 2.4, 1.3, 24));
    const nozzle = new THREE.Mesh(nozzleGeo, toon(C.brass));
    nozzle.position.y = -5.2;
    const nozzleLine = new THREE.Mesh(nozzleGeo, outline);
    nozzleLine.position.y = -5.2;
    spin.add(nozzle, nozzleLine);

    // Porthole: brass ring and teal glass, facing the shopper.
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(1.95, 0.42, 8, 28)), toon(C.gold));
    ring.position.set(0, 2, 4.72);
    const glass = new THREE.Mesh(keep(new THREE.CircleGeometry(1.7, 24)), toon(C.glass));
    glass.position.set(0, 2, 4.92);
    spin.add(ring, glass);

    // Three fins (front, back-left, back-right), from the icon's swept fin.
    const finShape = new THREE.Shape();
    finShape.moveTo(3.6, -4.4);
    finShape.lineTo(7.0, -7.2);
    finShape.lineTo(6.6, -2.9);
    finShape.lineTo(4.2, -0.8);
    finShape.closePath();
    const finGeo = keep(new THREE.ExtrudeGeometry(finShape, { depth: 1.1, bevelEnabled: false }));
    finGeo.computeBoundingBox();
    const fc = new THREE.Vector3();
    finGeo.boundingBox.getCenter(fc);
    finGeo.translate(-fc.x, -fc.y, -fc.z);
    for (let i = 0; i < 3; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = -Math.PI / 2 + i * TAU / 3;
      const fin = new THREE.Mesh(finGeo, red);
      fin.position.set(fc.x, fc.y, 0);
      const finLine = new THREE.Mesh(finGeo, inkBack);
      finLine.position.copy(fin.position);
      finLine.scale.set(1.3, 1.16, 2.2);
      pivot.add(fin, finLine);
      spin.add(pivot);
    }

    const flame = buildFlame([C.red, C.mid, C.core], rand(0, 9));
    flame.group.position.set(0, -5.6, 0);
    rocket.add(flame.group);

    const s = { thrust: 0.32, lift: 0, lean: 0, roll: 0, shake: 0, hover: 0 };
    const tip = new THREE.Vector3();
    let busy = false;
    let exhaustAcc = 0;
    let nextBurst = rand(5, 7);

    const actor = {
      entry: entry,
      anchor: iconEl,
      group: rocket,
      lit: false,
      x: 0,
      y: 0,
      k: 22 / 24,
      place: function () {
        rocket.scale.setScalar(actor.k);
        outline.uniforms.uWidth.value = 0.75 / actor.k;
      },
      exhaust: function (spark) {
        rocket.updateMatrixWorld();
        tip.set(rand(-0.6, 0.6), -6.4 - 3.2 * s.thrust, 0);
        rocket.localToWorld(tip);
        const a = rocket.rotation.z + rand(-0.35, 0.35);
        const speed = spark ? rand(30, 52) : rand(16, 28);
        spawn(spark ? {
          x: tip.x, y: tip.y, z: -2, vx: Math.sin(a) * speed, vy: -Math.cos(a) * speed, drag: 2.2,
          max: rand(0.35, 0.6), s0: rand(2.0, 2.8), s1: 0.5, a0: 1,
          color: Math.random() < 0.5 ? C.mid : C.red
        } : {
          x: tip.x, y: tip.y, z: -3, vx: Math.sin(a) * speed, vy: -Math.cos(a) * speed, drag: 2.8, lift: 10,
          max: rand(0.45, 0.75), s0: rand(1.8, 2.6), s1: rand(5, 7), a0: 0.85,
          color: C.smoke
        });
      },
      burst: function (big) {
        if (!actor.lit || busy) return;
        busy = true;
        const tl = gsap.timeline({ onComplete: function () { busy = false; } });
        tl.to(s, { thrust: big ? 1.3 : 0.95, duration: 0.18, ease: 'power2.out' }, 0)
          .to(s, { lift: big ? 4.5 : 2.2, duration: 0.32, ease: 'power2.out' }, 0)
          .call(function () {
            cvsnPulse(gsap, entry.count, big ? 0.1 : 0.07);
            for (let i = 0; i < (big ? 9 : 4); i++) actor.exhaust(true);
          }, null, 0.06)
          .to(s, { thrust: 0.5, duration: 0.6, ease: 'power2.inOut' }, 0.32)
          .to(s, { lift: 0, duration: 0.95, ease: 'elastic.out(1, 0.5)' }, 0.32);
        if (big) tl.to(s, { roll: '+=' + TAU, duration: 0.85, ease: 'power2.inOut' }, 0.04);
      },
      ignite: function () {
        if (actor.lit) return;
        actor.lit = true;
        busy = true;
        rocket.visible = true;
        entry.note.classList.add('is-lit');
        gsap.timeline({ onComplete: function () { busy = false; } })
          .to(s, { thrust: 1.3, duration: 0.26, ease: 'power2.out' }, 0)
          .to(s, { shake: 1, duration: 0.12 }, 0)
          .call(function () { for (let i = 0; i < 8; i++) actor.exhaust(Math.random() < 0.5); }, null, 0.12)
          .to(s, { lift: 5.5, lean: 0.12, duration: 0.5, ease: 'power3.out' }, 0.18)
          .to(s, { shake: 0, duration: 0.25 }, 0.3)
          .to(s, { roll: '+=' + TAU, duration: 0.95, ease: 'power2.inOut' }, 0.2)
          .call(function () { cvsnPulse(gsap, entry.count, 0.1); }, null, 0.5)
          .to(s, { lift: 0, lean: 0, duration: 1.1, ease: 'elastic.out(1, 0.5)' }, 0.75)
          .to(s, { thrust: 0.5, duration: 0.7, ease: 'power2.inOut' }, 0.7)
          .to(s, { hover: 1, duration: 0.8, ease: 'sine.inOut' }, 0.75);
      },
      update: function (t, dt) {
        const hover = s.hover;
        const jx = s.shake ? (Math.random() - 0.5) * s.shake * 1.1 : 0;
        const jy = s.shake ? (Math.random() - 0.5) * s.shake * 1.1 : 0;
        const lean = LEAN + s.lean + Math.sin(t * 1.4) * 0.05 * hover;
        // Lift travels along the nose; the hover bob is straight up and down.
        rocket.position.set(
          actor.x - Math.sin(lean) * s.lift + jx,
          actor.y + Math.cos(lean) * s.lift + Math.sin(t * 2.2) * 0.9 * hover + jy,
          10
        );
        rocket.rotation.z = lean;
        spin.rotation.y = s.roll + Math.sin(t * 0.8) * 0.35 * hover;
        const thrust = s.thrust * (1 + 0.08 * Math.sin(t * 9.0));
        flame.group.scale.set(3.4, 7, 3.4);
        flame.set(t, thrust, Math.min(1, thrust * 2.2));
        if (!actor.lit) return;
        exhaustAcc += dt * Math.max(0, s.thrust * 16 - 4);
        while (exhaustAcc > 1) {
          exhaustAcc -= 1;
          actor.exhaust(Math.random() < 0.25);
        }
        nextBurst -= dt;
        if (nextBurst <= 0) {
          nextBurst = rand(6, 9);
          actor.burst(false);
        }
      },
      kill: function () { gsap.killTweensOf(s); }
    };
    return actor;
  }

  const actors = entries.map(function (entry) {
    const actor = entry.kind === 'rocket' ? makeRocket(entry) : makePill(entry);
    if (actor) entry.actor = actor;
    return actor;
  }).filter(Boolean);
  if (!actors.length) {
    disposables.forEach(function (item) { item.dispose(); });
    renderer.dispose();
    return null;
  }

  /* -------------------------------------------------------------- layout */
  // Offsets, not rects, for the notes: the counter's entry may still be sliding them in.
  function layout() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return false;
    const W = w + PAD.l + PAD.r;
    const H = h + PAD.t + PAD.b;
    renderer.setSize(W, H);
    camera.right = W;
    camera.bottom = -H;
    camera.updateProjectionMatrix();
    actors.forEach(function (actor) {
      const note = actor.entry.note;
      const n = note.getBoundingClientRect();
      const a = actor.anchor.getBoundingClientRect();
      actor.x = PAD.l + note.offsetLeft + (a.left + a.width / 2 - n.left);
      actor.y = -(PAD.t + note.offsetTop + (a.top + a.height / 2 - n.top));
      if (actor.entry.kind === 'rocket') actor.k = (actor.anchor.clientWidth || 22) / 24;
      actor.place();
    });
    return true;
  }
  // No size yet (a hidden tab or container): wait for one rather than give up.
  let sized = layout();

  // Compile every shader now, with everything shown, so the first lit frame doesn't stall.
  actors.forEach(function (actor) { actor.group.visible = true; });
  try {
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  } catch (error) { /* compiles on first draw instead */ }
  actors.forEach(function (actor) { actor.group.visible = actor.lit; });
  if (!wrap.isConnected) {
    disposables.forEach(function (item) { item.dispose(); });
    renderer.dispose();
    return null;
  }

  let last = performance.now();
  let clock = 0;
  function frame() {
    if (!sized) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    actors.forEach(function (actor) { actor.update(clock, dt); });
    updateParticles(dt);
    renderer.render(scene, camera);
  }

  wrap.appendChild(canvas);
  wrap.classList.add('is-3d');
  frame();

  const cleanups = [];
  let running = false;
  let visible = true;
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) last = performance.now();
    renderer.setAnimationLoop(on ? frame : null);
  }
  const io = new IntersectionObserver(function (list) {
    visible = list[list.length - 1].isIntersecting;
    setRunning(visible && !document.hidden);
  }, { rootMargin: '40px 0px' });
  io.observe(wrap);
  cleanups.push(function () { io.disconnect(); });
  const onVisibility = function () { setRunning(visible && !document.hidden); };
  document.addEventListener('visibilitychange', onVisibility);
  cleanups.push(function () { document.removeEventListener('visibilitychange', onVisibility); });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(function () {
      sized = layout() || sized;
      if (sized && !running) frame();
    });
    ro.observe(wrap);
    cleanups.push(function () { ro.disconnect(); });
  }
  const onLoad = function () {
    sized = layout() || sized;
    if (sized && !running) frame();
  };
  window.addEventListener('load', onLoad);
  cleanups.push(function () { window.removeEventListener('load', onLoad); });

  // Pointer: the rocket fires and rolls; the flame flares. Touch: a tap does the same.
  actors.forEach(function (actor) {
    const note = actor.entry.note;
    const poke = actor.entry.kind === 'rocket' ? function () { actor.burst(true); } : function () { actor.flare(); };
    const onEnter = function () { if (fine.matches) poke(); };
    const onDown = function (event) { if (event.pointerType !== 'mouse') poke(); };
    note.addEventListener('pointerenter', onEnter);
    note.addEventListener('pointerdown', onDown);
    cleanups.push(function () {
      note.removeEventListener('pointerenter', onEnter);
      note.removeEventListener('pointerdown', onDown);
    });
  });

  return {
    ignite: function (entry) { if (entry.actor) entry.actor.ignite(); },
    destroy: function () {
      setRunning(false);
      cleanups.forEach(function (fn) { fn(); });
      actors.forEach(function (actor) {
        actor.kill();
        actor.entry.note.classList.remove('is-lit');
      });
      disposables.forEach(function (item) { item.dispose(); });
      renderer.dispose();
      canvas.remove();
      wrap.classList.remove('is-3d');
    }
  };
}

/* ---------------------------------------------------------------- boot */
function cvsnMount(wrap) {
  if (wrap._cvsnDestroy) wrap._cvsnDestroy();
  const gsap = window.gsap;
  if (!gsap || reduced) return;
  const notes = Array.prototype.slice.call(wrap.querySelectorAll('.cvc__pill:not(.cvc__pill--hint), .cvc__sold'));
  if (!notes.length) return;

  const vh = window.innerHeight;
  const entries = notes.map(function (note) {
    const count = note.querySelector('.cvc__sold-count');
    const box = note.getBoundingClientRect();
    return {
      atLoad: box.top < vh && box.bottom > 0,
      note: note,
      kind: note.classList.contains('cvc__sold') ? 'rocket' : 'pill',
      count: count,
      roller: count ? cvsnRoller(count) : null,
      seen: false,
      igniteAt: 0,
      actor: null
    };
  });

  let scene = null;
  let destroyed = false;
  const calls = [];
  function schedule(entry) {
    if (!scene || !entry.seen || !entry.actor || entry.actor.lit) return;
    const wait = Math.max(0, entry.igniteAt - performance.now()) / 1000;
    calls.push(gsap.delayedCall(wait, function () { scene.ignite(entry); }));
  }

  // A note on screen at load starts with the counter's entry, which slides it
  // in; one further down starts the moment it scrolls into view.
  const booted = performance.now();
  function seen(entry) {
    if (entry.seen) return;
    entry.seen = true;
    const now = performance.now();
    const slide = SLIDE[entry.kind];
    const delay = entry.atLoad ? Math.max(0, slide + 0.06 - (now - booted) / 1000) : 0;
    entry.igniteAt = entry.atLoad ? booted + 1000 * (slide + (entry.kind === 'rocket' ? 0.55 : 0.42)) : now + 180;
    if (entry.roller) {
      entry.roller.play(gsap, delay, function () {
        // An unlit rocket's number keeps its CSS pulse (a transform), so it gets no pop.
        if (entry.kind === 'pill' || entry.note.classList.contains('is-lit')) cvsnPulse(gsap, entry.count, 0.1);
      });
    }
    schedule(entry);
  }
  const io = new IntersectionObserver(function (list) {
    list.forEach(function (item) {
      if (!item.isIntersecting) return;
      const entry = entries.find(function (e) { return e.note === item.target; });
      if (entry) seen(entry);
      io.unobserve(item.target);
    });
  });
  entries.forEach(function (entry) { io.observe(entry.note); });

  wrap._cvsnDestroy = function () {
    destroyed = true;
    io.disconnect();
    calls.forEach(function (call) { call.kill(); });
    entries.forEach(function (entry) { if (entry.roller) entry.roller.stop(); });
    if (scene) scene.destroy();
    delete wrap._cvsnDestroy;
  };

  cvsnScene(wrap, entries).then(function (result) {
    if (!result) return;
    if (destroyed) { result.destroy(); return; }
    scene = result;
    entries.forEach(schedule);
  });
}

function cvsnBoot(scope) {
  const wraps = [];
  if (scope.matches && scope.matches('[data-cvc-sales]')) wraps.push(scope);
  if (scope.querySelectorAll) wraps.push.apply(wraps, scope.querySelectorAll('[data-cvc-sales]'));
  wraps.forEach(cvsnMount);
}

cvsnBoot(document);
document.addEventListener('shopify:section:load', function (event) { cvsnBoot(event.target); });
document.addEventListener('shopify:section:unload', function (event) {
  const wraps = event.target.querySelectorAll ? event.target.querySelectorAll('[data-cvc-sales]') : [];
  wraps.forEach(function (wrap) { if (wrap._cvsnDestroy) wrap._cvsnDestroy(); });
});
