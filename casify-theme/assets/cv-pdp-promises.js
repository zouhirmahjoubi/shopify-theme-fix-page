/* Casify: the Shop Counter's promise stamps (sections/cv-product-counter.liquid,
 * [data-cvc-promises]: one postage stamp per "Service fact" block).
 *
 * Loaded as a module after cv-pdp-counter-motion.js.
 *   deal     GSAP: the stamps drop onto the counter one after another, turning
 *            to their resting angle as their shadows settle. The section's
 *            inline guard hides them until their start states are set.
 *   truck    three.js: a candy-shop van drives in through the stamp's left
 *            edge, nods as it brakes, then idles with its wheels turning over
 *            a scrolling road and a puff from the exhaust. It hops a bump now
 *            and then, and gives two hops when the pointer arrives.
 *   returns  a parcel spirals out along a teal return arrow and comes home;
 *            the arrow keeps circling it and whirls now and then. Hover sends
 *            the parcel round again.
 *   box      an open packing box folds its flaps shut, the tape pulls across
 *            and down, and it hops. Hover unpacks and re-packs it.
 * One renderer and one canvas cover the row, and each scene follows its
 * stamp's art slot (position, angle, hover lift) every frame. The scenes are
 * built from primitives in the theme's colours, toon-lit with an ink outline
 * like the sales-note rocket (cv-pdp-sales.js), so there are no model files.
 * Ambient motion pauses off screen and in a hidden tab. Reduced motion:
 * nothing here runs and the stamps sit still. No WebGL: the stamps are still
 * dealt in, with their SVG icons.
 */
const CVPR_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const TAU = Math.PI * 2;
// Canvas overhang around the row (px): dust, sparkles and the parcel's loop spill past the stamps.
const PAD = { t: 26, r: 16, b: 20, l: 16 };
// The scenes are modelled for a 54px-wide art slot (cv-pdp-counter.css) and scale with it.
const ART_W = 54;
const INK = 0.8; // outline width in model px
const STEP = 0.13; // gap between stamps as they're dealt (s)
const TILT_FROM = [-9, 7, -6]; // extra turn (deg) each stamp lands out of

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const rand = (a, b) => a + Math.random() * (b - a);
let cvprThree = null;

function cvprRelease() { document.documentElement.classList.remove('cvc-promises-pending'); }

function cvprWebGL() {
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
async function cvprScene(wrap, stamps) {
  if (!cvprWebGL()) return null;
  let THREE;
  try {
    if (!cvprThree) cvprThree = import(CVPR_THREE_URL);
    THREE = await cvprThree;
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
    kraft: tone('--gold-300', '#E7D3A8'),
    brass: tone('--gold-500', '#B08F52'),
    teal: tone('--teal-600', '#4E7C7B'),
    tealSoft: tone('--teal-300', '#A8C8C4'),
    glass: tone('--teal-100', '#E4F0EE'),
    ink: tone('--cocoa-700', '#33231A'),
    cocoa: tone('--cocoa-400', '#8A5A3C'),
    road: tone('--cocoa-300', '#A87B58'),
    dust: tone('--cream-400', '#DCC9A6'),
    lamp: new THREE.Color('#FFE7A3'),
    flame: new THREE.Color('#E9A23B')
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
  renderer.localClippingEnabled = true; // the van drives in through its stamp's edge
  const canvas = renderer.domElement;
  canvas.className = 'cvc__promises-canvas';
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

  /* Materials for one scene; clip (optional) is that scene's clipping planes. */
  function kit(clip) {
    const cache = new Map();
    return {
      toon: function (color) {
        const id = color.getHexString();
        if (!cache.has(id)) cache.set(id, keep(new THREE.MeshToonMaterial({ color: color, gradientMap: ramp, clippingPlanes: clip || null })));
        return cache.get(id);
      },
      flat: function (color, opacity) {
        return keep(new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false, clippingPlanes: clip || null }));
      },
      ink: keep(new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide, clippingPlanes: clip || null }))
    };
  }
  // Outline for round shapes (ring, arrowhead): back faces pushed out along smooth normals.
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
     little larger on every axis, which reads as an even outline on boxes and drums. */
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
  // A box with rounded corners in its side profile, w × h × d overall.
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
    return new THREE.ExtrudeGeometry(s, { depth: d - 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 6 });
  }

  /* ---------------------------------------------------------- particles */
  const MAX = 90;
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
  const at = new THREE.Vector3();
  function worldOf(obj, x, y, z) {
    obj.updateMatrixWorld();
    return obj.localToWorld(at.set(x, y, z));
  }
  function puff(p, vx, vy, big) {
    spawn({ x: p.x, y: p.y, z: p.z, vx: vx, vy: vy, drag: 2.4, lift: 9, max: rand(0.5, 0.8), s0: big ? 3 : 2, s1: big ? 8 : 5.5, a0: 0.8, color: C.dust });
  }

  /* ------------------------------------------------------- the van (truck) */
  function makeVan(sc) {
    const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    sc.clip = plane;
    const M = kit([plane]);
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.32, -0.62, 0); // three-quarter view from a little above
    root.add(pose);
    const van = new THREE.Group(); // drives along x
    pose.add(van);
    const body = new THREE.Group(); // rides the suspension: hops and nods
    van.add(body);

    const cargo = solid(roundBox(24, 16, 15, 2.5), M.toon(C.red), M.ink);
    cargo.position.set(-5, 3, 0);
    const band = solid(new THREE.BoxGeometry(24.4, 2.4, 15.4), M.toon(C.cream));
    band.position.set(-5, -1.4, 0);
    const cab = solid(roundBox(11, 12, 14, 3), M.toon(C.cream), M.ink);
    cab.position.set(12.5, 1, 0);
    const windshield = solid(new THREE.BoxGeometry(0.6, 4.6, 10.5), M.toon(C.glass));
    windshield.position.set(18.1, 3.2, 0);
    const windows = solid(new THREE.BoxGeometry(5.4, 4.4, 14.3), M.toon(C.glass));
    windows.position.set(13.4, 3.2, 0);
    const bumper = solid(new THREE.BoxGeometry(1.6, 2.6, 13), M.toon(C.brass), M.ink);
    bumper.position.set(18.6, -4, 0);
    // A candy badge on the cargo side.
    const badgeGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.5, 24);
    badgeGeo.rotateX(Math.PI / 2);
    const badge = solid(badgeGeo, M.toon(C.cream), M.ink);
    badge.position.set(-5, 4.2, 7.7);
    const dotGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.6, 16);
    dotGeo.rotateX(Math.PI / 2);
    const dot = solid(dotGeo, M.toon(C.red));
    dot.position.set(-5, 4.2, 8.05);
    body.add(cargo, band, cab, windshield, windows, bumper, badge, dot);
    const lampGeo = keep(new THREE.SphereGeometry(1.3, 10, 8));
    [4.6, -4.6].forEach(function (z) {
      const lamp = new THREE.Mesh(lampGeo, M.toon(C.lamp));
      lamp.position.set(18.9, -1.2, z);
      body.add(lamp);
    });

    // Wheels, each with a cream bar across its hub so the turning shows.
    const tyreGeo = new THREE.CylinderGeometry(4, 4, 3, 20);
    tyreGeo.rotateX(Math.PI / 2);
    const hubGeo = keep(new THREE.CylinderGeometry(1.8, 1.8, 3.3, 12));
    hubGeo.rotateX(Math.PI / 2);
    const barGeo = keep(new THREE.BoxGeometry(0.9, 3, 3.5));
    const wheels = [[-10.5, 7], [-10.5, -7], [12.5, 7], [12.5, -7]].map(function (p) {
      const w = new THREE.Group();
      w.position.set(p[0], -6.8, p[1]);
      w.add(solid(tyreGeo, M.toon(C.ink)), new THREE.Mesh(hubGeo, M.toon(C.gold)), new THREE.Mesh(barGeo, M.toon(C.cream)));
      van.add(w);
      return w;
    });

    // The van's shadow, and dashes on the road in front of it.
    const shadow = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 28)), M.flat(C.ink, 0.16));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(21, 9, 1);
    shadow.position.set(1.5, -10.9, 0);
    van.add(shadow);
    const dashGeo = keep(new THREE.BoxGeometry(5, 0.5, 1.4));
    const dashes = [0, 1, 2].map(function () {
      const d = new THREE.Mesh(dashGeo, M.toon(C.road));
      d.position.set(0, -11, 9.5);
      pose.add(d);
      return d;
    });

    const v = { x: 0, speed: 0, pitch: 0, hop: 0 };
    let road = 0;
    let nextBump = rand(5, 8);
    let nextPuff = rand(0.4, 0.9);
    let busy = false;

    function dust(n) {
      for (let i = 0; i < n; i++) {
        const p = worldOf(van, -10.5 + rand(-2, 2), -10, rand(-6, 7));
        puff(p, rand(-26, -12), rand(4, 12), true);
      }
    }
    function bump(big) {
      const tl = gsap.timeline();
      tl.to(v, { hop: big ? 3.2 : 2.2, duration: 0.13, ease: 'power2.out' })
        .to(v, { hop: 0, duration: 0.5, ease: 'bounce.out' })
        .to(v, { pitch: big ? 0.08 : 0.05, duration: 0.13, ease: 'power2.out' }, 0)
        .to(v, { pitch: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' }, 0.13);
      return tl;
    }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        gsap.timeline({ onComplete: function () { busy = false; } })
          .set(v, { x: -84, speed: 150 }) // past the stamp's edge, where the clip hides it
          .to(v, { x: 0, duration: 1.0, ease: 'power3.out' }, 0)
          .to(v, { speed: 24, duration: 1.05, ease: 'power2.out' }, 0)
          .to(v, { pitch: -0.1, duration: 0.16, ease: 'power2.out' }, 0.66)
          .to(v, { pitch: 0, duration: 0.9, ease: 'elastic.out(1, 0.38)' }, 0.82)
          .call(function () { dust(5); }, null, 0.68);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        // Two quick hops and a burst of speed: a toot.
        const tl = gsap.timeline({ onComplete: function () { busy = false; } });
        tl.add(bump(true), 0).add(bump(false), 0.32)
          .to(v, { speed: 90, duration: 0.2, ease: 'power2.out' }, 0)
          .to(v, { speed: 24, duration: 0.9, ease: 'power2.inOut' }, 0.4)
          .call(function () { dust(4); }, null, 0.05);
      },
      update: function (t, dt) {
        van.position.x = v.x;
        road = (road + v.speed * dt) % 48;
        dashes.forEach(function (d, i) {
          const x = (((i * 16 - road) % 48) + 48) % 48 - 24;
          const fade = Math.max(0, 1 - Math.max(0, Math.abs(x) - 13) / 10);
          d.position.x = x;
          d.scale.x = Math.max(0.001, fade);
          d.visible = fade > 0.02;
        });
        wheels.forEach(function (w) { w.rotation.z -= v.speed * dt / 4; });
        body.position.y = v.hop + Math.sin(t * 31) * 0.18 * Math.min(1, v.speed / 30);
        body.rotation.z = v.pitch;
        wheels.forEach(function (w) { w.position.y = -6.8 + v.hop * 0.35; });
        if (!sc.lit) return;
        nextPuff -= dt;
        if (nextPuff <= 0) {
          nextPuff = rand(0.5, 1.1);
          puff(worldOf(van, -17.5, -4.5, -4), rand(-14, -8), rand(3, 8), false);
        }
        if (busy) return;
        nextBump -= dt;
        if (nextBump <= 0) {
          nextBump = rand(6, 9);
          bump(false);
        }
      },
      kill: function () { gsap.killTweensOf(v); }
    });
  }

  /* ------------------------------------------------ the return loop (returns) */
  function makeReturns(sc) {
    const M = kit(null);
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.12, 0, 0);
    root.add(pose);
    const TILT = 1.12; // the ring lies back, seen from above
    const R = 17;
    const ARC = TAU * 0.78;
    const orbit = new THREE.Group();
    orbit.rotation.x = -TILT;
    orbit.position.y = -2;
    pose.add(orbit);
    const spinner = new THREE.Group(); // turns in the ring's own plane, arrow first
    orbit.add(spinner);
    const ringGeo = keep(new THREE.TorusGeometry(R, 1.6, 10, 72, ARC));
    const teal = M.toon(C.teal);
    spinner.add(new THREE.Mesh(ringGeo, teal), new THREE.Mesh(ringGeo, inkPush));
    const coneGeo = keep(new THREE.ConeGeometry(3.6, 6.8, 18));
    const head = new THREE.Group();
    head.position.set(R * Math.cos(ARC), R * Math.sin(ARC), 0);
    head.rotation.z = ARC; // +y along the ring's direction of travel
    const cone = new THREE.Mesh(coneGeo, teal);
    const coneInk = new THREE.Mesh(coneGeo, inkPush);
    cone.position.y = coneInk.position.y = 2.4;
    head.add(cone, coneInk);
    spinner.add(head);

    const parcel = new THREE.Group(); // travels the loop
    pose.add(parcel);
    const crate = new THREE.Group(); // squashes and sways
    crate.rotation.set(0.35, -0.6, 0);
    parcel.add(crate);
    crate.add(
      solid(new THREE.BoxGeometry(15, 12, 12), M.toon(C.gold), M.ink),
      solid(new THREE.BoxGeometry(3, 12.4, 12.4), teal)
    );
    const label = solid(new THREE.BoxGeometry(4.6, 3.2, 0.3), M.toon(C.cream));
    label.position.set(4.2, -1.8, 6.1);
    crate.add(label);
    const shadow = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 24)), M.flat(C.ink, 0.14));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(9, 6, 1);
    shadow.position.set(0, -8.5, 0);
    pose.add(shadow);

    const r = { p: 1, spin: 0.9, ring: 0, squash: 0 };
    let nextWhirl = rand(6, 9);
    let busy = false;

    function loop(tl, from) {
      tl.set(r, { p: 0 }, from)
        .to(r, { p: 1, duration: 1.15, ease: 'sine.inOut' }, from)
        .to(r, { squash: 1, duration: 0.08, ease: 'power2.out' }, from + 1.12)
        .to(r, { squash: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, from + 1.2);
    }
    function whirl(tl, from, peak) {
      tl.to(r, { spin: peak, duration: 0.25, ease: 'power2.out' }, from)
        .to(r, { spin: 0.9, duration: 1.1, ease: 'power2.inOut' }, from + 0.25);
    }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: function () { busy = false; } });
        tl.fromTo(r, { ring: 0 }, { ring: 1, duration: 0.55, ease: 'back.out(1.8)' }, 0);
        whirl(tl, 0, 9);
        loop(tl, 0.15);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        const tl = gsap.timeline({ onComplete: function () { busy = false; } });
        whirl(tl, 0, 6);
        loop(tl, 0);
      },
      update: function (t, dt) {
        spinner.rotation.z += r.spin * dt;
        orbit.scale.setScalar(Math.max(0.001, r.ring));
        // Out along the ring and home again: radius sin(πp), one turn.
        const rad = R * Math.sin(Math.PI * r.p);
        const phi = -Math.PI / 2 + r.p * TAU;
        const ly = rad * Math.sin(phi);
        // Home sits 4px above the ring's centre; at the far point it rides the ring itself.
        parcel.position.set(rad * Math.cos(phi), 2 - 4 * Math.sin(Math.PI * r.p) + ly * Math.cos(TILT) + Math.sin(t * 2.1) * 0.7, -ly * Math.sin(TILT));
        parcel.scale.setScalar(1 - 0.38 * Math.sin(Math.PI * r.p));
        crate.scale.set(1 + r.squash * 0.12, 1 - r.squash * 0.16, 1 + r.squash * 0.12);
        crate.rotation.y = -0.6 + Math.sin(t * 0.7) * 0.25 + r.p * TAU * (r.p < 1 ? 1 : 0);
        shadow.scale.set(9 * (1 - 0.5 * Math.sin(Math.PI * r.p)), 6, 1);
        if (r.p > 0.04 && r.p < 0.96 && Math.random() < 0.6) {
          const p = worldOf(parcel, 0, 0, 0);
          spawn({ x: p.x + rand(-1, 1), y: p.y + rand(-1, 1), z: p.z - 1, vx: rand(-4, 4), vy: rand(-2, 4), drag: 1.5, max: rand(0.35, 0.6), s0: rand(2, 3), s1: 0.5, a0: 0.9, color: Math.random() < 0.5 ? C.teal : C.tealSoft });
        }
        if (!sc.lit || busy) return;
        nextWhirl -= dt;
        if (nextWhirl <= 0) {
          nextWhirl = rand(7, 10);
          whirl(gsap.timeline(), 0, 5);
        }
      },
      kill: function () { gsap.killTweensOf(r); }
    });
  }

  /* ---------------------------------------------------- the packing box (box) */
  function makeBox(sc) {
    const M = kit(null);
    const root = new THREE.Group();
    const pose = new THREE.Group();
    pose.rotation.set(0.5, -0.55, 0); // looking into the box from above
    root.add(pose);
    const W = 22;
    const H = 13;
    const D = 16;
    const crate = new THREE.Group(); // origin at the bottom, so it squashes onto the counter
    crate.position.y = -9;
    pose.add(crate);

    const side = M.toon(C.gold);
    const inside = M.toon(C.cocoa);
    const bodyGeo = new THREE.BoxGeometry(W, H, D);
    const bodyPart = solid(bodyGeo, [side, side, inside, side, side, side], M.ink);
    bodyPart.position.y = H / 2;
    crate.add(bodyPart);
    const label = solid(new THREE.BoxGeometry(6.4, 4.4, 0.3), M.toon(C.cream));
    label.position.set(-6, H * 0.42, D / 2 + 0.2);
    const line1 = solid(new THREE.BoxGeometry(4.4, 0.6, 0.3), M.toon(C.cocoa));
    line1.position.set(-6, H * 0.42 + 0.8, D / 2 + 0.4);
    const line2 = solid(new THREE.BoxGeometry(3.2, 0.6, 0.3), M.toon(C.red));
    line2.position.set(-6.6, H * 0.42 - 0.8, D / 2 + 0.4);
    crate.add(label, line1, line2);

    const flapMat = M.toon(C.kraft);
    function flap(geo, hinge, offset) {
      const pivot = new THREE.Group();
      pivot.position.copy(hinge);
      const part = solid(geo, flapMat, M.ink);
      part.position.copy(offset);
      pivot.add(part);
      crate.add(pivot);
      return pivot;
    }
    const longGeo = new THREE.BoxGeometry(W, 0.8, D / 2);
    const shortGeo = new THREE.BoxGeometry(W / 2 - 0.4, 0.7, D - 1.4);
    const V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
    const front = flap(longGeo, V(0, H + 0.45, D / 2), V(0, 0, -D / 4));
    const back = flap(longGeo, V(0, H + 0.45, -D / 2), V(0, 0, D / 4));
    const right = flap(shortGeo, V(W / 2, H + 0.05, 0), V(-(W / 4 - 0.2), 0, 0));
    const left = flap(shortGeo, V(-W / 2, H + 0.05, 0), V(W / 4 - 0.2, 0, 0));

    // Red tape: across the closed flaps, then down the front.
    const tapeMat = M.toon(C.red);
    const tapeTop = new THREE.Group();
    tapeTop.position.set(-(W + 1.2) / 2, H + 1.0, 0);
    const tt = solid(new THREE.BoxGeometry(W + 1.2, 0.5, 3.6), tapeMat);
    tt.position.x = (W + 1.2) / 2;
    tapeTop.add(tt);
    const tapeFront = new THREE.Group();
    tapeFront.position.set(0, H + 0.3, D / 2 + 0.3);
    const tf = solid(new THREE.BoxGeometry(3.6, H * 0.55, 0.5), tapeMat);
    tf.position.y = -H * 0.55 / 2;
    tapeFront.add(tf);
    crate.add(tapeTop, tapeFront);

    const shadow = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 28)), M.flat(C.ink, 0.15));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(15, 11, 1);
    shadow.position.set(0, -9.2, 0);
    pose.add(shadow);

    const b = { s: 1, l: 1, tape: 0, tapeF: 0, hop: 0, squash: 0 };
    let nextHop = rand(7, 10);
    let busy = false;

    function sparkle() {
      for (let i = 0; i < 10; i++) {
        const p = worldOf(crate, rand(-W / 2, W / 2), H + 2, rand(-D / 2, D / 2));
        const a = rand(0.2, Math.PI - 0.2);
        const sp = rand(18, 34);
        spawn({ x: p.x, y: p.y, z: p.z + 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 2.6, lift: -18, max: rand(0.45, 0.75), s0: rand(2.2, 3.2), s1: 0.5, a0: 1, color: [C.flame, C.red, C.teal][i % 3] });
      }
    }
    function hop(tl, from, height) {
      tl.to(b, { squash: 1, duration: 0.1, ease: 'power2.out' }, from)
        .to(b, { squash: -0.4, hop: height, duration: 0.2, ease: 'power2.out' }, from + 0.1)
        .to(b, { squash: 0, duration: 0.3, ease: 'power2.out' }, from + 0.3)
        .to(b, { hop: 0, duration: 0.45, ease: 'bounce.out' }, from + 0.3);
    }
    function pack(tl, from) {
      tl.to(b, { s: 0, duration: 0.3, ease: 'back.out(1.6)' }, from)
        .to(b, { l: 0, duration: 0.36, ease: 'back.out(1.4)' }, from + 0.22)
        .to(b, { tape: 1, duration: 0.3, ease: 'power2.out' }, from + 0.6)
        .to(b, { tapeF: 1, duration: 0.2, ease: 'power2.out' }, from + 0.86)
        .call(sparkle, null, from + 1.16);
      hop(tl, from + 1.02, 6);
    }

    Object.assign(sc, {
      root: root,
      intro: function () {
        busy = true;
        const tl = gsap.timeline({ onComplete: function () { busy = false; } });
        pack(tl, 0.1);
      },
      poke: function () {
        if (busy) return;
        busy = true;
        const tl = gsap.timeline({ onComplete: function () { busy = false; } });
        tl.to(b, { tapeF: 0, tape: 0, duration: 0.14, ease: 'power2.in' }, 0)
          .to(b, { l: 1, duration: 0.26, ease: 'power2.out' }, 0.1)
          .to(b, { s: 1, duration: 0.22, ease: 'power2.out' }, 0.2);
        pack(tl, 0.5);
      },
      update: function (t, dt) {
        // The back flap trails the front one a little as they close.
        front.rotation.x = 2.2 * b.l;
        back.rotation.x = -2.2 * Math.min(1, b.l * 1.25);
        right.rotation.z = -2.1 * b.s;
        left.rotation.z = 2.1 * Math.min(1, b.s * 1.2);
        tapeTop.scale.x = Math.max(0.001, b.tape);
        tapeTop.visible = b.tape > 0.01;
        tapeFront.scale.y = Math.max(0.001, b.tapeF);
        tapeFront.visible = b.tapeF > 0.01;
        crate.position.y = -9 + b.hop;
        crate.scale.set(1 + b.squash * 0.12, 1 - b.squash * 0.16, 1 + b.squash * 0.12);
        crate.rotation.y = Math.sin(t * 0.6) * 0.22;
        shadow.scale.set(15 * (1 - b.hop * 0.03), 11 * (1 - b.hop * 0.03), 1);
        if (!sc.lit || busy) return;
        nextHop -= dt;
        if (nextHop <= 0) {
          nextHop = rand(8, 11);
          hop(gsap.timeline(), 0, 3);
        }
      },
      kill: function () { gsap.killTweensOf(b); }
    });
  }

  const scenes = stamps.map(function (stamp) {
    const art = stamp.querySelector('[data-cvc-promise-art]');
    if (!art) return null;
    const sc = { stamp: stamp, art: art, kind: stamp.getAttribute('data-cvc-promise'), lit: false, clip: null };
    if (sc.kind === 'returns') makeReturns(sc);
    else if (sc.kind === 'box') makeBox(sc);
    else makeVan(sc);
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

  // Each scene sits on its stamp's art slot as the stamp is now: dealt, tilted, lifted.
  function follow() {
    const box = wrap.getBoundingClientRect();
    const ox = box.left - PAD.l;
    const oy = box.top - PAD.t;
    scenes.forEach(function (sc) {
      const a = sc.art.getBoundingClientRect();
      const k = (sc.art.offsetWidth || ART_W) / ART_W;
      const lift = parseFloat(sc.stamp.style.getPropertyValue('--ds')) || 1;
      const turn = (parseFloat(getComputedStyle(sc.stamp).rotate) || 0) + (parseFloat(sc.stamp.style.getPropertyValue('--dr')) || 0);
      sc.root.position.set(a.left + a.width / 2 - ox, -(a.top + a.height / 2 - oy), 0);
      sc.root.scale.setScalar(k * lift);
      sc.root.rotation.z = -turn * Math.PI / 180;
      if (sc.clip) {
        // The stamp's printed panel starts 7px in from its paper edge.
        const s = sc.stamp.getBoundingClientRect();
        sc.clip.constant = -(s.left - ox + 7);
      }
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
    sc.stamp.addEventListener('pointerenter', onEnter);
    sc.stamp.addEventListener('pointerdown', onDown);
    cleanups.push(function () {
      sc.stamp.removeEventListener('pointerenter', onEnter);
      sc.stamp.removeEventListener('pointerdown', onDown);
    });
  });

  return {
    light: function (stamp) {
      const sc = scenes.find(function (s) { return s.stamp === stamp; });
      if (!sc || sc.lit) return;
      sc.lit = true;
      sc.root.visible = true;
      stamp.classList.add('is-lit');
      sc.intro();
    },
    destroy: function () {
      setRunning(false);
      cleanups.forEach(function (fn) { fn(); });
      scenes.forEach(function (sc) {
        sc.kill();
        sc.stamp.classList.remove('is-lit');
      });
      disposeAll();
      canvas.remove();
      wrap.classList.remove('is-3d');
    }
  };
}

/* ---------------------------------------------------------------- boot */
function cvprMount(wrap) {
  if (wrap._cvprDestroy) wrap._cvprDestroy();
  const gsap = window.gsap;
  const stamps = Array.prototype.slice.call(wrap.querySelectorAll('[data-cvc-promise]'));
  if (!gsap || reduced || !stamps.length) { cvprRelease(); return; }

  let drop = 'back.out(1.5)';
  if (window.CustomBounce) {
    window.CustomBounce.create('cvprDrop', { strength: 0.32, squash: 1.2 });
    drop = 'cvprDrop';
  }

  // Deal only stamps the guard is still hiding; ones already on screen stay put.
  // The deal runs on the stamp's own CSS variables (cv-pdp-counter.css), not on
  // transform: GSAP would fold the CSS tilt into an inline transform and the
  // hover could no longer straighten the stamp.
  const DEAL_VARS = ['--dx', '--dy', '--dr', '--ds', '--lift'];
  function settle(stamp) {
    stamp.style.removeProperty('opacity');
    DEAL_VARS.forEach(function (name) { stamp.style.removeProperty(name); });
  }
  const guarded = document.documentElement.classList.contains('cvc-promises-pending');
  if (guarded) {
    stamps.forEach(function (stamp, i) {
      gsap.set(stamp, { opacity: 0, '--dx': (i % 2 ? 7 : -7) + 'px', '--dy': '-24px', '--dr': TILT_FROM[i % TILT_FROM.length] + 'deg', '--ds': 1.12, '--lift': 1 });
    });
  }
  cvprRelease();

  let scene = null;
  let destroyed = false;
  const landed = [];
  const tweens = [];
  function land(stamp) {
    if (landed.indexOf(stamp) < 0) landed.push(stamp);
    if (scene) scene.light(stamp);
  }

  function deal() {
    const tl = gsap.timeline({ delay: 0.2 });
    stamps.forEach(function (stamp, i) {
      const t0 = i * STEP;
      if (guarded) {
        tl.to(stamp, { opacity: 1, '--dx': '0px', '--dy': '0px', '--dr': '0deg', '--ds': 1, duration: 0.62, ease: drop }, t0)
          .to(stamp, { '--lift': 0, duration: 0.5, ease: 'power2.out' }, t0 + 0.22)
          .call(settle, [stamp], t0 + 0.72);
      }
      tl.call(land, [stamp], t0 + (guarded ? 0.4 : 0.1));
    });
    tweens.push(tl);
    if (document.hidden) tl.progress(1);
  }
  const io = new IntersectionObserver(function (list) {
    if (!list.some(function (item) { return item.isIntersecting; })) return;
    io.disconnect();
    deal();
  }, { threshold: 0.2 });
  io.observe(wrap);

  wrap._cvprDestroy = function () {
    destroyed = true;
    io.disconnect();
    tweens.forEach(function (tl) { tl.progress(1).kill(); });
    stamps.forEach(settle);
    if (scene) scene.destroy();
    delete wrap._cvprDestroy;
  };

  cvprScene(wrap, stamps).then(function (result) {
    if (!result) return;
    if (destroyed) { result.destroy(); return; }
    scene = result;
    landed.forEach(function (stamp) { scene.light(stamp); });
  });
}

function cvprBoot(scope) {
  const wraps = [];
  if (scope.matches && scope.matches('[data-cvc-promises]')) wraps.push(scope);
  if (scope.querySelectorAll) wraps.push.apply(wraps, scope.querySelectorAll('[data-cvc-promises]'));
  if (!wraps.length) cvprRelease();
  wraps.forEach(cvprMount);
}

cvprBoot(document);
/* When reduced motion is switched on mid-visit, settle every stamp and drop the 3D scenes
 * (the destroy path lands the stamps in their finished state). */
const cvprMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
if (cvprMotionQuery.addEventListener) {
  cvprMotionQuery.addEventListener('change', function (event) {
    if (!event.matches) return;
    document.querySelectorAll('[data-cvc-promises]').forEach(function (wrap) { if (wrap._cvprDestroy) wrap._cvprDestroy(); });
  });
}
document.addEventListener('shopify:section:load', function (event) { cvprBoot(event.target); });
document.addEventListener('shopify:section:unload', function (event) {
  const wraps = event.target.querySelectorAll ? event.target.querySelectorAll('[data-cvc-promises]') : [];
  wraps.forEach(function (wrap) { if (wrap._cvprDestroy) wrap._cvprDestroy(); });
});
