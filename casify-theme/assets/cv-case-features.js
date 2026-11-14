/* Casify: the Shop Counter's case features (snippets/cv-case-features.liquid,
 * [data-cvcf]: one tile per "Case feature" block that this product backs up).
 *
 * Loaded as a module after cv-pdp-counter-motion.js.
 *   deal     GSAP: the card's tiles rise in one after another when it scrolls
 *            into view, each line of text following its icon. The snippet's
 *            inline guard hides them until their start states are set.
 *   drop     three.js: a case falls, lands on a corner with a squash, kicks up
 *            dust and impact lines, and bounces to rest. It hops again now and
 *            then; hover drops it from higher.
 *   layers   a soft liner lifts out of the hard shell and snaps back in with a
 *            squash and a gold pulse round the rim.
 *   magsafe  a phone slides down, a charging puck snaps onto its back, the
 *            bolt pops and charge rings ripple out of the magnet ring.
 *   finish   three sheets settle into a stack; a gloss band sweeps across the
 *            top one and sparkles twinkle round it. Hover fans them out.
 *   button   the case turns to show its side and the camera button clicks,
 *            with a ripple and a spark.
 *   stand    a phone lying on its back flips its kickstand out and props up.
 *   fit      a print head passes over a blank case and leaves candy stripes;
 *            crop marks pop in round it.
 * One renderer and one canvas cover the card, and each scene follows its
 * tile's art slot every frame (the promise stamps' approach, cv-pdp-promises.js).
 * Primitives in the theme's colours, toon-lit with an ink outline, so there
 * are no model files. Ambient motion pauses off screen and in a hidden tab.
 * Reduced motion: nothing here runs and the icons sit still. No WebGL: the
 * tiles are still dealt in, and their SVG icons pop and draw on.
 */
const CVCF_THREE_URL = window.CV_THREE_URL || 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const TAU = Math.PI * 2;
// Canvas overhang around the card (px): the falling case and sparks spill past the tiles.
const PAD = { t: 30, r: 14, b: 14, l: 14 };
// The scenes are modelled for a 64px-wide art slot (cv-case-features.css) and scale with it.
const ART_W = 64;
const INK = 0.85; // outline width in model px
const STEP = 0.09; // gap between tiles as they're dealt (s)

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
let cvcfThree = null;

function cvcfRelease() { document.documentElement.classList.remove('cvcf-pending'); }

function cvcfWebGL() {
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

/* ------------------------------------------------------------------ the scene */
async function cvcfScene(wrap, items) {
  if (!cvcfWebGL()) return null;
  let THREE;
  try {
    if (!cvcfThree) cvcfThree = import(CVCF_THREE_URL);
    THREE = await cvcfThree;
  } catch (error) {
    return null;
  }
  if (!wrap.isConnected) return null;

  const gsap = window.gsap;
  const styles = getComputedStyle(wrap);
  const tone = function (name, fallback) { return new THREE.Color(styles.getPropertyValue(name).trim() || fallback); };
  const C = {
    cream: tone('--cream-50', '#FDF9F1'),
    paper: tone('--cream-200', '#F5E9D3'),
    dust: tone('--cream-400', '#DCC9A6'),
    red: tone('--red-500', '#C4302B'),
    pink: tone('--cvcf-pink', '#F4CFC7'),
    gold: tone('--gold-400', '#D2B57C'),
    brass: tone('--gold-500', '#B08F52'),
    teal: tone('--teal-600', '#4E7C7B'),
    tealSoft: tone('--teal-200', '#CDE3E0'),
    glass: tone('--teal-100', '#E4F0EE'),
    ink: tone('--cocoa-700', '#33231A'),
    cocoa: tone('--cocoa-500', '#6B4229'),
    spark: new THREE.Color('#FFE7A3')
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
  canvas.className = 'cvcf__canvas';
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
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -300, 300);

  const disposables = [];
  const keep = function (item) { if (disposables.indexOf(item) < 0) disposables.push(item); return item; };

  const ramp = keep(new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat));
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;

  /* Materials for one scene. */
  function kit() {
    const cache = new Map();
    return {
      toon: function (color) {
        const id = color.getHexString();
        if (!cache.has(id)) cache.set(id, keep(new THREE.MeshToonMaterial({ color: color, gradientMap: ramp })));
        return cache.get(id);
      },
      flat: function (color, opacity) {
        return keep(new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false, side: THREE.DoubleSide }));
      },
      ink: keep(new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide }))
    };
  }
  // Outline for round shapes (rings, capsules): back faces pushed out along smooth normals.
  const inkPush = keep(new THREE.ShaderMaterial({
    uniforms: { uColor: { value: C.ink }, uWidth: { value: INK } },
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

  /* A part: the geometry centred, its mesh, and (with ink) a back-face hull a
     little larger on every axis, which reads as an even outline on boxes and discs. */
  const size = new THREE.Vector3();
  function solid(geo, mat, ink) {
    keep(geo);
    geo.computeBoundingBox();
    geo.boundingBox.getSize(size);
    geo.center();
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mat));
    if (ink) {
      const hull = new THREE.Mesh(geo, ink);
      hull.scale.set(1 + 2 * INK / Math.max(size.x, 0.2), 1 + 2 * INK / Math.max(size.y, 0.2), 1 + 2 * INK / Math.max(size.z, 0.2));
      g.add(hull);
    }
    return g;
  }
  // A round part outlined along its normals.
  function round(geo, mat) {
    keep(geo);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, mat), new THREE.Mesh(geo, inkPush));
    return g;
  }
  // A slab with rounded corners in its face, w × h × d overall.
  function roundBox(w, h, d, r) {
    const x = (w - 2) / 2;
    const y = (h - 2) / 2;
    const s = new THREE.Shape();
    s.moveTo(-x + r, -y);
    s.lineTo(x - r, -y);
    s.quadraticCurveTo(x, -y, x, -y + r);
    s.lineTo(x, y - r);
    s.quadraticCurveTo(x, y, x - r, y);
    s.lineTo(-x + r, y);
    s.quadraticCurveTo(-x, y, -x, y - r);
    s.lineTo(-x, -y + r);
    s.quadraticCurveTo(-x, -y, -x + r, -y);
    return new THREE.ExtrudeGeometry(s, { depth: Math.max(0.2, d - 2), bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 6 });
  }
  // A four-point sparkle, flat.
  function starShape(outer, inner) {
    const s = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? inner : outer;
      const a = Math.PI / 2 + i * Math.PI / 4;
      if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return s;
  }

  /* ---------------------------------------------------------- particles */
  const MAX = 120;
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
  points.position.z = 120; // over every scene
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
      pPos[i * 3 + 2] = 0;
      pSize[i] = p.s0 + (p.s1 - p.s0) * k;
      pAlpha[i] = p.a0 * (1 - k * k);
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true;
  }
  const at = new THREE.Vector3();
  function worldOf(obj, x, y, z) {
    obj.updateMatrixWorld();
    return obj.localToWorld(at.set(x, y, z));
  }
  // Particle speeds are in model px/s; k is the scene's on-screen scale.
  function puff(sc, p, vx, vy, big) {
    const k = sc.root.scale.x;
    spawn({ x: p.x, y: p.y, vx: vx * k, vy: vy * k, drag: 2.6, lift: 10 * k, max: rand(0.45, 0.75), s0: (big ? 3 : 2) * k, s1: (big ? 8 : 5.5) * k, a0: 0.75, color: C.dust });
  }
  function sparks(sc, p, n, spread, colors) {
    const k = sc.root.scale.x;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const v = rand(0.6, 1) * spread;
      spawn({ x: p.x, y: p.y, vx: Math.cos(a) * v * k, vy: Math.sin(a) * v * k, drag: 3.2, lift: -6 * k, max: rand(0.35, 0.6), s0: 3.2 * k, s1: 0.8 * k, a0: 1, color: colors[i % colors.length] });
    }
  }
  // A ring that grows and fades, laid in its parent's xy plane.
  function pulseRing(parent, inner, outer, color) {
    const m = new THREE.Mesh(keep(new THREE.RingGeometry(inner, outer, 48)), kit().flat(color, 0));
    m.visible = false;
    m.renderOrder = 4;
    parent.add(m);
    return {
      mesh: m,
      set: function (k, sx, sy, alpha) {
        m.visible = k > 0.001 && k < 0.999;
        const s = 1 + k * 0.7;
        m.scale.set(s * (sx || 1), s * (sy || 1), 1);
        m.material.opacity = (1 - k) * (alpha == null ? 0.9 : alpha);
      }
    };
  }

  /* ------------------------------------------------------------- drop */
  function makeDrop(sc) {
    const M = kit();
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.2, -0.34, 0);
    root.add(pose);
    const GROUND = -20;
    const REST = GROUND + 18.6; // centre height with the case on a corner, at rest angle
    const ground = solid(new THREE.BoxGeometry(48, 1.3, 1.3), M.toon(C.ink));
    ground.position.y = GROUND - 0.65;
    const shadow = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 28)), M.flat(C.ink, 0.16));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = GROUND + 0.1;
    pose.add(ground, shadow);

    const phone = new THREE.Group();
    const body = new THREE.Group(); // squashes on impact
    phone.add(body);
    body.add(solid(roundBox(18, 32, 5, 4.5), M.toon(C.red), M.ink));
    const bump = solid(roundBox(8, 8, 2, 2), M.toon(C.cocoa), M.ink);
    bump.position.set(-3.4, 9.4, 3.2);
    body.add(bump);
    const lensGeo = keep(new THREE.CylinderGeometry(1.35, 1.35, 1, 14));
    lensGeo.rotateX(Math.PI / 2);
    [[-5, 11.2], [-1.8, 7.8]].forEach(function (p) {
      const lens = new THREE.Mesh(lensGeo, M.toon(C.glass));
      lens.position.set(p[0], p[1], 4.4);
      body.add(lens);
    });
    pose.add(phone);

    // Impact lines either side of the landing corner.
    const crackGeo = keep(new THREE.BoxGeometry(5, 1.2, 1.2));
    const cracks = [2.62, 2.15, 0.99, 0.52].map(function (a) {
      const m = new THREE.Mesh(crackGeo, M.toon(C.ink));
      m.rotation.z = a;
      m.userData.a = a;
      m.visible = false;
      pose.add(m);
      return m;
    });

    const d = { y: REST, rot: 0.5, sq: 0, crack: 0, s: 1 };
    let next = rand(7, 10);
    let busy = false;

    function impact(big) {
      for (let i = 0; i < (big ? 7 : 4); i++) {
        const side = i % 2 ? 1 : -1;
        puff(sc, worldOf(pose, side * rand(1, 5), GROUND + 1, 0), side * rand(14, 32), rand(6, 16), big);
      }
    }
    function fall(tl, from, t0) {
      const dur = 0.2 + 0.26 * Math.sqrt(Math.max(0, from - REST) / 30);
      tl.set(d, { y: from, rot: -0.35 }, t0)
        .to(d, { y: REST, duration: dur, ease: 'power2.in' }, t0)
        .to(d, { rot: 0.5, duration: dur, ease: 'power1.in' }, t0)
        .call(impact, [from - REST > 20], t0 + dur)
        .to(d, { sq: 1, duration: 0.06, ease: 'power2.out' }, t0 + dur)
        .to(d, { sq: 0, duration: 0.55, ease: 'elastic.out(1, 0.32)' }, t0 + dur + 0.06)
        .to(d, { y: REST + 5.5, rot: 0.38, duration: 0.17, ease: 'power2.out' }, t0 + dur + 0.04)
        .to(d, { y: REST, rot: 0.5, duration: 0.4, ease: 'bounce.out' }, t0 + dur + 0.21)
        .fromTo(d, { crack: 0 }, { crack: 1, duration: 0.14, ease: 'power2.out', immediateRender: false }, t0 + dur)
        .to(d, { crack: 0, duration: 0.45, ease: 'power2.in' }, t0 + dur + 0.4);
      return tl;
    }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: function () { busy = false; } });
        tl.set(d, { s: 0.001 }, 0).to(d, { s: 1, duration: 0.2, ease: 'power2.out' }, 0);
        fall(tl, 30, 0);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        fall(gsap.timeline({ onComplete: function () { busy = false; } }), 32, 0);
      },
      update: function (t, dt) {
        phone.position.y = d.y;
        phone.rotation.z = d.rot;
        phone.scale.setScalar(d.s);
        body.scale.set(1 + d.sq * 0.1, 1 - d.sq * 0.14, 1);
        const h = clamp01((d.y - REST) / 40);
        shadow.scale.set(13 * (1 - h * 0.6), 3.4 * (1 - h * 0.6), 1);
        shadow.material.opacity = 0.16 * (1 - h * 0.7);
        cracks.forEach(function (m) {
          const a = m.userData.a;
          m.visible = d.crack > 0.02;
          m.scale.x = Math.max(0.001, d.crack);
          m.position.set(Math.cos(a) * (6 + d.crack * 4), GROUND + 1 + Math.sin(a) * (2.5 + d.crack * 3.5), 0);
        });
        if (!sc.lit || busy) return;
        next -= dt;
        if (next <= 0) {
          next = rand(7, 10);
          busy = true;
          fall(gsap.timeline({ onComplete: function () { busy = false; } }), REST + 16, 0);
        }
      },
      kill: function () { gsap.killTweensOf(d); }
    });
  }

  /* ------------------------------------------------------------ layers */
  function makeLayers(sc) {
    const M = kit();
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.42, -0.5, 0);
    root.add(pose);
    const tilt = new THREE.Group();
    tilt.rotation.z = -0.12;
    pose.add(tilt);
    const shell = solid(roundBox(25, 39, 6, 6), M.toon(C.teal), M.ink);
    tilt.add(shell);
    const liner = new THREE.Group();
    liner.add(solid(roundBox(19.5, 33.5, 3, 4.2), M.toon(C.pink), M.ink));
    // Cushion dots on the liner: the soft part.
    const dotGeo = keep(new THREE.SphereGeometry(1.15, 10, 8));
    [[-4.2, 9], [4.2, 9], [-4.2, 0], [4.2, 0], [-4.2, -9], [4.2, -9]].forEach(function (p) {
      const dot = new THREE.Mesh(dotGeo, M.toon(C.cream));
      dot.position.set(p[0], p[1], 1.3);
      dot.scale.z = 0.5;
      liner.add(dot);
    });
    tilt.add(liner);
    const pulse = pulseRing(tilt, 13.2, 14.6, C.gold);
    pulse.mesh.position.z = 3.6;

    const l = { lift: 0, sq: 0, s: 1, pulse: 0 };
    let next = rand(8, 11);
    let busy = false;
    function burst() {
      const p = worldOf(tilt, 0, 0, 4);
      sparks(sc, p, 8, 42, [C.spark, C.gold, C.cream]);
    }
    function snap(tl, t0) {
      tl.to(l, { lift: 0, duration: 0.32, ease: 'power3.in' }, t0)
        .call(burst, null, t0 + 0.32)
        .to(l, { sq: 1, duration: 0.06, ease: 'power2.out' }, t0 + 0.32)
        .to(l, { sq: 0, duration: 0.65, ease: 'elastic.out(1, 0.3)' }, t0 + 0.38)
        .fromTo(l, { pulse: 0 }, { pulse: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, t0 + 0.32);
      return tl;
    }
    function done() { busy = false; }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.set(l, { lift: 1, s: 0.001 }, 0)
          .to(l, { s: 1, duration: 0.5, ease: 'back.out(1.8)' }, 0);
        snap(tl, 0.45);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.to(l, { lift: 1, duration: 0.3, ease: 'power2.out' }, 0);
        snap(tl, 0.36);
      },
      update: function (t, dt) {
        tilt.scale.setScalar(l.s);
        liner.position.set(0, l.lift * 9, 2.5 + l.lift * 16);
        liner.rotation.x = -l.lift * 0.4;
        liner.rotation.z = l.lift * 0.22;
        liner.scale.set(1 + l.sq * 0.07, 1 - l.sq * 0.05, 1 - l.sq * 0.4);
        pulse.set(l.pulse, 0.88, 1.36);
        pose.rotation.y = -0.5 + Math.sin(t * 0.7) * 0.16;
        if (!sc.lit || busy) return;
        next -= dt;
        if (next <= 0) {
          next = rand(8, 11);
          busy = true;
          const tl = gsap.timeline({ onComplete: done });
          tl.to(l, { lift: 0.55, duration: 0.28, ease: 'power2.out' }, 0);
          snap(tl, 0.34);
        }
      },
      kill: function () { gsap.killTweensOf(l); }
    });
  }

  /* ----------------------------------------------------------- magsafe */
  function makeMagsafe(sc) {
    const M = kit();
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.3, 0.42, 0);
    root.add(pose);
    const phone = solid(roundBox(27, 44, 3, 6.5), M.toon(C.red), M.ink);
    pose.add(phone);
    const puck = new THREE.Group();
    pose.add(puck);
    const discGeo = new THREE.CylinderGeometry(11.5, 11.5, 3.2, 40);
    discGeo.rotateX(Math.PI / 2);
    puck.add(solid(discGeo, M.toon(C.cream), M.ink));
    const ring = round(new THREE.TorusGeometry(7.8, 1.25, 10, 48), M.toon(C.gold));
    ring.position.z = 1.7;
    puck.add(ring);
    const bolt = new THREE.Shape();
    [[2.2, 8.4], [-5, -1.6], [-0.4, -1.6], [-2.2, -8.6], [5, 1.6], [0.3, 1.6]].forEach(function (p, i) {
      if (i) bolt.lineTo(p[0] * 0.95, p[1] * 0.95);
      else bolt.moveTo(p[0] * 0.95, p[1] * 0.95);
    });
    const boltG = solid(new THREE.ExtrudeGeometry(bolt, { depth: 1.2, bevelEnabled: false }), M.toon(C.red), M.ink);
    boltG.position.z = 2.5;
    puck.add(boltG);
    const cable = solid(new THREE.BoxGeometry(2.8, 12, 2.6), M.toon(C.cocoa), M.ink);
    cable.position.set(0, -17, -0.2);
    puck.add(cable);
    const pulses = [pulseRing(puck, 10.6, 11.8, C.gold), pulseRing(puck, 10.6, 11.8, C.gold)];
    pulses.forEach(function (p) { p.mesh.position.z = 1.9; });

    const m = { phoneY: 0, z: 0, s: 1, lift: 0, bolt: 1, glow: 0 };
    let next = rand(5, 8);
    let busy = false;
    function zap() { sparks(sc, worldOf(puck, 0, 0, 3), 9, 46, [C.spark, C.gold, C.red]); }
    function snap(tl, t0) {
      tl.to(m, { z: 0, s: 1, lift: 0, duration: 0.26, ease: 'power3.in' }, t0)
        .call(zap, null, t0 + 0.26)
        .fromTo(m, { bolt: 0.001 }, { bolt: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)', immediateRender: false }, t0 + 0.28)
        .to(m, { glow: 1, duration: 0.4, ease: 'power2.out' }, t0 + 0.28);
      return tl;
    }
    function done() { busy = false; }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.set(m, { phoneY: 26, z: 12, s: 0.001, lift: 0, bolt: 0.001, glow: 0 }, 0)
          .fromTo(phone.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' }, 0)
          .to(m, { phoneY: 0, duration: 0.55, ease: 'back.out(1.3)' }, 0)
          .to(m, { s: 1.22, lift: 1, duration: 0.3, ease: 'power2.out' }, 0.3);
        snap(tl, 0.62);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.to(m, { s: 1.2, z: 10, lift: 1, bolt: 0.6, glow: 0, duration: 0.22, ease: 'power2.out' }, 0);
        snap(tl, 0.3);
      },
      update: function (t, dt) {
        phone.position.y = m.phoneY;
        puck.position.set(0, m.lift * 3, m.z);
        puck.scale.setScalar(m.s);
        boltG.scale.setScalar(Math.max(0.001, m.bolt));
        pulses.forEach(function (p, i) {
          const k = (t * 0.55 + i * 0.5) % 1;
          p.set(m.glow > 0.01 ? k : 0, 1, 1, 0.6 * m.glow);
        });
        pose.rotation.y = 0.42 + Math.sin(t * 0.8) * 0.14;
        if (!sc.lit || busy) return;
        next -= dt;
        if (next <= 0) {
          next = rand(5, 8);
          gsap.timeline()
            .to(m, { bolt: 1.32, duration: 0.1, ease: 'power2.out' })
            .call(function () { sparks(sc, worldOf(puck, 0, 0, 3), 4, 30, [C.spark, C.gold]); })
            .to(m, { bolt: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
        }
      },
      kill: function () { gsap.killTweensOf(m); gsap.killTweensOf(phone.scale); }
    });
  }

  /* ------------------------------------------------------------ finish */
  function makeFinish(sc) {
    const M = kit();
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.x = -1.02; // the stack lies back, seen from above
    pose.position.y = -5;
    root.add(pose);

    // The top sheet: toon, plus a white gloss band that sweeps along its local x.
    const sheen = { value: -30 };
    const glossy = keep(new THREE.MeshToonMaterial({ color: C.pink, gradientMap: ramp }));
    glossy.onBeforeCompile = function (shader) {
      shader.uniforms.uSheen = sheen;
      shader.vertexShader = 'varying vec2 vCvcfP;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vCvcfP = position.xy;'
      );
      shader.fragmentShader = 'uniform float uSheen;\nvarying vec2 vCvcfP;\n' + shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        '#include <opaque_fragment>\n  float cvcfBand = 1.0 - smoothstep(0.0, 2.6, abs(vCvcfP.x - uSheen));\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), cvcfBand * 0.82);'
      );
    };
    glossy.customProgramCacheKey = function () { return 'cvcf-glossy'; };

    const sheets = [M.toon(C.cream), M.toon(C.tealSoft), glossy].map(function (mat) {
      const g = new THREE.Group();
      g.add(solid(roundBox(28, 28, 2.2, 4.5), mat, M.ink));
      g.rotation.z = Math.PI / 4;
      pose.add(g);
      return g;
    });
    const sparkles = [[24, 16], [-26, 2], [23, -10]].map(function (p, i) {
      const s = solid(new THREE.ExtrudeGeometry(starShape(i ? 4.2 : 5.2, 1.3), { depth: 0.6, bevelEnabled: false }), M.toon(C.gold), M.ink);
      s.position.set(p[0], p[1], 40);
      s.userData.k = i;
      root.add(s);
      return s;
    });

    const f = { d0: 0, d1: 0, d2: 0, spread: 0, sheen: -20, pop: 1 };
    let next = rand(3.5, 5.5);
    let busy = false;
    function sweep(tl, t0) {
      return tl.fromTo(f, { sheen: -20 }, { sheen: 20, duration: 0.75, ease: 'power2.inOut', immediateRender: false }, t0);
    }
    function twinkle() {
      sparkles.forEach(function (s) { sparks(sc, s.getWorldPosition(new THREE.Vector3()), 3, 22, [C.spark, C.gold]); });
    }
    function done() { busy = false; }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.set(f, { d0: 34, d1: 34, d2: 34, pop: 0, sheen: -20 }, 0);
        [0, 1, 2].forEach(function (i) {
          tl.to(f, { ['d' + i]: 0, duration: 0.5, ease: 'bounce.out' }, i * 0.13);
        });
        sweep(tl, 0.72);
        tl.to(f, { pop: 1, duration: 0.5, ease: 'back.out(2.2)' }, 0.8).call(twinkle, null, 0.85);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.to(f, { spread: 1, duration: 0.28, ease: 'power2.out' }, 0)
          .to(f, { spread: 0, duration: 0.7, ease: 'elastic.out(1, 0.35)' }, 0.32)
          .call(twinkle, null, 0.1);
        sweep(tl, 0.2);
      },
      update: function (t, dt) {
        sheets.forEach(function (g, i) {
          g.position.z = i * (6 + f.spread * 5) + f['d' + i];
          g.rotation.z = Math.PI / 4 + Math.sin(t * 0.6 + i * 0.5) * 0.05 * (1 + f.spread * 4);
        });
        sheen.value = f.sheen;
        sparkles.forEach(function (s) {
          const k = s.userData.k;
          const tw = Math.pow(Math.max(0, Math.sin(t * 1.9 + k * 2.1)), 3);
          s.scale.setScalar(Math.max(0.001, f.pop * (0.35 + 0.65 * tw)));
          s.rotation.z = t * 0.8 + k;
        });
        if (!sc.lit || busy) return;
        next -= dt;
        if (next <= 0) {
          next = rand(3.5, 5.5);
          sweep(gsap.timeline(), 0);
        }
      },
      kill: function () { gsap.killTweensOf(f); }
    });
  }

  /* ------------------------------------------------------------ button */
  function makeButton(sc) {
    const M = kit();
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.12, -1, 0); // the case's right side turned toward us
    root.add(pose);
    const turn = new THREE.Group();
    pose.add(turn);
    turn.add(solid(roundBox(16, 46, 9, 4.5), M.toon(C.red), M.ink));
    const btn = new THREE.Group();
    btn.position.set(8.4, 3, 0);
    turn.add(btn);
    const cap = round(new THREE.CapsuleGeometry(2.1, 8, 4, 12), M.toon(C.glass));
    cap.scale.x = 0.6;
    btn.add(cap);
    const side = new THREE.Group(); // the side face's own plane, facing +x
    side.position.set(9.2, 3, 0);
    side.rotation.y = Math.PI / 2;
    turn.add(side);
    const ripple = pulseRing(side, 3.4, 4.2, C.gold);

    const b = { press: 0, turn: 1, ripple: 0, s: 1 };
    let next = rand(4.5, 7);
    let busy = false;
    function flash() {
      const p = worldOf(btn, 2.5, 0, 0);
      sparks(sc, p, 6, 34, [C.spark, C.gold, C.cream]);
    }
    function press(tl, t0) {
      return tl.to(b, { press: 1, duration: 0.09, ease: 'power2.in' }, t0)
        .to(b, { press: 0, duration: 0.45, ease: 'elastic.out(1, 0.35)' }, t0 + 0.12)
        .fromTo(b, { ripple: 0 }, { ripple: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, t0 + 0.08)
        .call(flash, null, t0 + 0.1);
    }
    function done() { busy = false; }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.set(b, { turn: 0, s: 0.001 }, 0)
          .to(b, { s: 1, duration: 0.4, ease: 'back.out(1.8)' }, 0)
          .to(b, { turn: 1, duration: 0.75, ease: 'power3.inOut' }, 0.15);
        press(tl, 0.9);
        press(tl, 1.3);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        press(gsap.timeline({ onComplete: done }), 0);
      },
      update: function (t, dt) {
        turn.scale.setScalar(b.s);
        turn.rotation.y = (1 - b.turn) * 1;
        btn.position.x = 8.4 - b.press * 1.5;
        cap.scale.set(0.6 * (1 - b.press * 0.25), 1 - b.press * 0.06, 1);
        ripple.set(b.ripple, 1, 2.1);
        pose.rotation.y = -1 + Math.sin(t * 0.7) * 0.12;
        if (!sc.lit || busy) return;
        next -= dt;
        if (next <= 0) {
          next = rand(4.5, 7);
          busy = true;
          press(gsap.timeline({ onComplete: done }), 0);
        }
      },
      kill: function () { gsap.killTweensOf(b); }
    });
  }

  /* ------------------------------------------------------------- stand */
  function makeStand(sc) {
    const M = kit();
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.26, -1.05, 0); // side on enough to see the stand
    pose.position.x = 3;
    root.add(pose);
    const GROUND = -20;
    const table = solid(new THREE.BoxGeometry(40, 1.4, 24), M.toon(C.paper), M.ink);
    table.position.set(0, GROUND - 0.7, -4);
    pose.add(table);
    const hinge = new THREE.Group(); // the phone's bottom edge on the table
    hinge.position.set(0, GROUND + 1.6, 5);
    pose.add(hinge);
    const phone = new THREE.Group();
    hinge.add(phone);
    const body = solid(roundBox(20, 34, 3.2, 4.2), M.toon(C.red), M.ink);
    body.position.y = 17;
    phone.add(body);
    const screen = solid(roundBox(15.5, 28, 0.6, 2.4), M.toon(C.cream));
    screen.position.set(0, 17, 1.8);
    phone.add(screen);
    const tri = new THREE.Shape();
    tri.moveTo(-2.2, 3);
    tri.lineTo(3.2, 0);
    tri.lineTo(-2.2, -3);
    const play = new THREE.Mesh(keep(new THREE.ShapeGeometry(tri)), M.toon(C.red));
    play.position.set(0.3, 17, 2.25);
    phone.add(play);
    const pivot = new THREE.Group(); // the kickstand hinge on the case's back
    pivot.position.set(0, 16, -1.8);
    phone.add(pivot);
    const bar = solid(roundBox(4.4, 16, 1.6, 1.5), M.toon(C.gold), M.ink);
    bar.position.set(0, -8, -0.6);
    pivot.add(bar);

    // lean: the phone's tilt back from upright; open: the stand's swing from the case.
    const LEAN = 0.42;
    const OPEN = 0.7;
    const s = { lean: LEAN, open: OPEN, play: 1 };
    let busy = false;
    function done() { busy = false; }
    function rise(tl, t0) {
      return tl.to(s, { open: 1.3, duration: 0.32, ease: 'power2.out' }, t0)
        .to(s, { lean: LEAN, duration: 0.7, ease: 'back.out(1.6)' }, t0 + 0.26)
        .to(s, { open: OPEN, duration: 0.7, ease: 'back.out(1.6)' }, t0 + 0.26)
        .call(function () { puff(sc, worldOf(hinge, 0, -1, -10), rand(-10, 10), rand(4, 9), false); }, null, t0 + 0.6)
        .fromTo(s, { play: 0.001 }, { play: 1, duration: 0.5, ease: 'back.out(2.4)', immediateRender: false }, t0 + 0.75);
    }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.set(s, { lean: 1.42, open: 0, play: 0.001 }, 0);
        rise(tl, 0.2);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.to(s, { lean: 1.1, open: 0.35, play: 0.001, duration: 0.3, ease: 'power2.in' }, 0);
        rise(tl, 0.3);
      },
      update: function (t) {
        phone.rotation.x = -s.lean;
        pivot.rotation.x = s.open;
        play.scale.setScalar(Math.max(0.001, s.play * (1 + Math.sin(t * 2.4) * 0.06)));
        pose.rotation.y = -1.05 + Math.sin(t * 0.6) * 0.12;
      },
      kill: function () { gsap.killTweensOf(s); }
    });
  }

  /* --------------------------------------------------------------- fit */
  function makeFit(sc) {
    const M = kit();
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.16, -0.38, 0);
    root.add(pose);
    const shell = new THREE.Group();
    pose.add(shell);
    shell.add(solid(roundBox(23, 40, 3, 5.5), M.toon(C.cream), M.ink));
    const bump = solid(roundBox(8.5, 8.5, 1.6, 2.2), M.toon(C.cocoa), M.ink);
    bump.position.set(-4.2, 13.2, 2.1);
    shell.add(bump);
    // Stripes grow from their left end as the head passes.
    const stripeGeo = keep(new THREE.BoxGeometry(19, 3, 0.5));
    stripeGeo.translate(9.5, 0, 0);
    const ROWS = [6.5, 1, -4.5, -10, -15.5];
    const stripes = ROWS.map(function (y, i) {
      const m = new THREE.Mesh(stripeGeo, M.toon(i % 2 ? C.teal : C.red));
      m.position.set(-9.5, y, 1.75);
      m.scale.x = 0.001;
      shell.add(m);
      return m;
    });
    const head = new THREE.Group();
    head.add(solid(roundBox(30, 5, 7, 2), M.toon(C.gold), M.ink));
    head.position.z = 6;
    pose.add(head);
    // Crop marks at the four corners.
    const marks = new THREE.Group();
    pose.add(marks);
    const hGeo = keep(new THREE.BoxGeometry(6, 1.1, 1.1));
    const vGeo = keep(new THREE.BoxGeometry(1.1, 6, 1.1));
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (c) {
      const g = new THREE.Group();
      g.position.set(c[0] * 15.5, c[1] * 24.5, 0);
      const h = new THREE.Mesh(hGeo, M.toon(C.ink));
      h.position.x = -c[0] * 2.5;
      const v = new THREE.Mesh(vGeo, M.toon(C.ink));
      v.position.y = -c[1] * 2.5;
      g.add(h, v);
      marks.add(g);
    });

    const p = { head: 27, hs: 0, marks: 1, s: 1, s0: 1, s1: 1, s2: 1, s3: 1, s4: 1 };
    let next = rand(9, 12);
    let busy = false;
    function ink(y, i) {
      const at = worldOf(shell, rand(-8, 8), y, 2.5);
      const k = sc.root.scale.x;
      for (let n = 0; n < 3; n++) {
        spawn({ x: at.x + rand(-6, 6) * k, y: at.y, vx: rand(-8, 8) * k, vy: rand(-14, -4) * k, drag: 3, lift: 0, max: rand(0.3, 0.5), s0: 2.4 * k, s1: 0.6 * k, a0: 0.9, color: i % 2 ? C.teal : C.red });
      }
    }
    function print(tl, t0) {
      const RUN = 1.15;
      tl.set(p, { head: 27 }, t0)
        .to(p, { hs: 1, duration: 0.22, ease: 'back.out(2)' }, t0)
        .to(p, { head: -25, duration: RUN, ease: 'none' }, t0 + 0.15);
      ROWS.forEach(function (y, i) {
        const when = t0 + 0.15 + (27 - y) / 52 * RUN;
        tl.to(p, { ['s' + i]: 1, duration: 0.22, ease: 'power2.out' }, when - 0.04).call(ink, [y, i], when);
      });
      return tl.to(p, { hs: 0, duration: 0.2, ease: 'power2.in' }, t0 + RUN + 0.15)
        .to(p, { marks: 1, duration: 0.45, ease: 'back.out(2.2)' }, t0 + RUN + 0.1);
    }
    function wipe(tl, t0) {
      return tl.to(p, { s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, duration: 0.25, ease: 'power2.in', stagger: 0.04 }, t0)
        .to(p, { marks: 0, duration: 0.2, ease: 'power2.in' }, t0);
    }
    function done() { busy = false; }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        tl.set(p, { s: 0.001, s0: 0, s1: 0, s2: 0, s3: 0, s4: 0, marks: 0, hs: 0 }, 0)
          .to(p, { s: 1, duration: 0.45, ease: 'back.out(1.8)' }, 0);
        print(tl, 0.3);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        const tl = gsap.timeline({ onComplete: done });
        wipe(tl, 0);
        print(tl, 0.35);
      },
      update: function (t, dt) {
        shell.scale.setScalar(p.s);
        head.position.y = p.head;
        head.scale.setScalar(Math.max(0.001, p.hs));
        head.visible = p.hs > 0.01;
        stripes.forEach(function (m, i) { m.scale.x = Math.max(0.001, p['s' + i]); m.visible = p['s' + i] > 0.002; });
        marks.scale.setScalar(Math.max(0.001, p.marks * p.s));
        pose.rotation.y = -0.38 + Math.sin(t * 0.7) * 0.15;
        if (!sc.lit || busy) return;
        next -= dt;
        if (next <= 0) {
          next = rand(9, 12);
          busy = true;
          const tl = gsap.timeline({ onComplete: done });
          wipe(tl, 0);
          print(tl, 0.35);
        }
      },
      kill: function () { gsap.killTweensOf(p); }
    });
  }

  const MAKERS = { drop: makeDrop, layers: makeLayers, magsafe: makeMagsafe, finish: makeFinish, button: makeButton, stand: makeStand, fit: makeFit };
  const scenes = items.map(function (item) {
    const art = item.querySelector('[data-cvcf-art]');
    if (!art) return null;
    const sc = { item: item, art: art, kind: item.getAttribute('data-cvcf-item'), lit: false };
    (MAKERS[sc.kind] || makeDrop)(sc);
    sc.root.visible = false;
    scene.add(sc.root);
    return sc;
  }).filter(Boolean);

  function disposeAll() {
    disposables.forEach(function (item) { item.dispose(); });
    renderer.dispose();
  }
  if (!scenes.length) { disposeAll(); return null; }

  /* -------------------------------------------------------------- layout */
  let sized = false;
  function layout() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return false;
    renderer.setSize(w + PAD.l + PAD.r, h + PAD.t + PAD.b);
    camera.right = w + PAD.l + PAD.r;
    camera.bottom = -(h + PAD.t + PAD.b);
    camera.updateProjectionMatrix();
    return true;
  }
  sized = layout();

  // Each scene sits on its tile's art slot as it is now (dealt, hover-lifted).
  function follow() {
    const box = wrap.getBoundingClientRect();
    const ox = box.left - PAD.l;
    const oy = box.top - PAD.t;
    scenes.forEach(function (sc) {
      const a = sc.art.getBoundingClientRect();
      const k = (sc.art.offsetWidth || ART_W) / ART_W;
      sc.root.position.set(a.left + a.width / 2 - ox, -(a.top + a.height / 2 - oy), 0);
      sc.root.scale.setScalar(k);
    });
  }

  // Compile every shader now, with everything shown, so the first lit frame doesn't stall.
  scenes.forEach(function (sc) { sc.root.visible = true; });
  try {
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  } catch (error) { /* compiles on first draw instead */ }
  scenes.forEach(function (sc) { sc.root.visible = sc.lit; });
  if (!wrap.isConnected) { disposeAll(); return null; }

  let last = performance.now();
  let clock = 0;
  function frame() {
    if (!sized) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    follow();
    scenes.forEach(function (sc) { sc.update(clock, dt); });
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

  // Pointer: each scene plays its trick. Touch: a tap does the same.
  scenes.forEach(function (sc) {
    const poke = function () { if (sc.lit) sc.poke(); };
    const onEnter = function () { if (fine.matches) poke(); };
    const onDown = function (event) { if (event.pointerType !== 'mouse') poke(); };
    sc.item.addEventListener('pointerenter', onEnter);
    sc.item.addEventListener('pointerdown', onDown);
    cleanups.push(function () {
      sc.item.removeEventListener('pointerenter', onEnter);
      sc.item.removeEventListener('pointerdown', onDown);
    });
  });

  return {
    light: function (item) {
      const sc = scenes.find(function (s) { return s.item === item; });
      if (!sc || sc.lit) return;
      sc.lit = true;
      sc.root.visible = true;
      item.classList.add('is-lit');
      sc.intro();
    },
    destroy: function () {
      setRunning(false);
      cleanups.forEach(function (fn) { fn(); });
      scenes.forEach(function (sc) {
        sc.kill();
        sc.item.classList.remove('is-lit');
      });
      disposeAll();
      canvas.remove();
      wrap.classList.remove('is-3d');
    }
  };
}

/* ---------------------------------------------------------------- boot */
function cvcfMount(wrap) {
  if (wrap._cvcfDestroy) wrap._cvcfDestroy();
  const gsap = window.gsap;
  const items = Array.prototype.slice.call(wrap.querySelectorAll('[data-cvcf-item]'));
  if (!gsap || reduced || !items.length) { cvcfRelease(); return; }
  const title = wrap.querySelector('.cvcf__title');

  // Deal only tiles the guard is still hiding; ones already on screen stay put.
  const guarded = document.documentElement.classList.contains('cvcf-pending');
  if (guarded) {
    gsap.set(items, { opacity: 0, y: 16, scale: 0.92 });
    gsap.set(items.map(function (item) { return item.querySelector('.cvcf__text'); }), { opacity: 0, y: 6 });
    if (title) gsap.set(title, { opacity: 0 });
  }
  cvcfRelease();

  let scene = null;
  let destroyed = false;
  const landed = [];
  const tweens = [];
  function settle(item) {
    gsap.set([item, item.querySelector('.cvcf__text')], { clearProps: 'opacity,transform' });
  }
  // Without the 3D scene, the SVG icon pops and its marked strokes draw on.
  function still(item) {
    const svg = item.querySelector('.cvcf-ic');
    if (!svg) return;
    tweens.push(gsap.from(svg, { scale: 0.6, rotation: -8, transformOrigin: '50% 60%', duration: 0.6, ease: 'back.out(2)', clearProps: 'transform' }));
    const strokes = svg.querySelectorAll('[data-cvcf-draw]');
    if (strokes.length && window.DrawSVGPlugin) {
      tweens.push(gsap.from(strokes, { drawSVG: '0%', duration: 0.7, ease: 'power2.out', stagger: 0.06, delay: 0.15, clearProps: 'all' }));
    }
  }
  function land(item) {
    if (landed.indexOf(item) < 0) landed.push(item);
    if (scene) scene.light(item);
    else still(item);
  }

  function deal() {
    const tl = gsap.timeline({ delay: 0.1 });
    if (guarded && title) tl.to(title, { opacity: 1, duration: 0.4, ease: 'power1.out', clearProps: 'opacity' }, 0);
    items.forEach(function (item, i) {
      const t0 = 0.08 + i * STEP;
      if (guarded) {
        tl.to(item, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }, t0)
          .to(item.querySelector('.cvcf__text'), { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, t0 + 0.16)
          .call(settle, [item], t0 + 0.62);
      }
      tl.call(land, [item], t0 + (guarded ? 0.14 : 0.05));
    });
    tweens.push(tl);
    if (document.hidden) tl.progress(1);
  }
  const io = new IntersectionObserver(function (list) {
    if (!list.some(function (entry) { return entry.isIntersecting; })) return;
    io.disconnect();
    deal();
  }, { threshold: 0.25 });
  io.observe(wrap);

  wrap._cvcfDestroy = function () {
    destroyed = true;
    io.disconnect();
    tweens.forEach(function (tw) { tw.progress(1).kill(); });
    items.forEach(settle);
    if (title) gsap.set(title, { clearProps: 'opacity' });
    if (scene) scene.destroy();
    delete wrap._cvcfDestroy;
  };

  cvcfScene(wrap, items).then(function (result) {
    if (!result) return;
    if (destroyed) { result.destroy(); return; }
    scene = result;
    landed.forEach(function (item) { scene.light(item); });
  });
}

function cvcfBoot(scope) {
  const wraps = [];
  if (scope.matches && scope.matches('[data-cvcf]')) wraps.push(scope);
  if (scope.querySelectorAll) wraps.push.apply(wraps, scope.querySelectorAll('[data-cvcf]'));
  if (!wraps.length) cvcfRelease();
  wraps.forEach(cvcfMount);
}

cvcfBoot(document);
document.addEventListener('shopify:section:load', function (event) { cvcfBoot(event.target); });
document.addEventListener('shopify:section:unload', function (event) {
  const wraps = event.target.querySelectorAll ? event.target.querySelectorAll('[data-cvcf]') : [];
  wraps.forEach(function (wrap) { if (wrap._cvcfDestroy) wrap._cvcfDestroy(); });
});
