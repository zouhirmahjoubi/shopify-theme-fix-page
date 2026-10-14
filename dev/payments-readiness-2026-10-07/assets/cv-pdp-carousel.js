/* Casify — Product: colour carousel (sections/cv-pdp-carousel.liquid).
 *
 * Loaded as a module from layout/theme.liquid after the GSAP bundle and after
 * assets/cv-product.js, so the buy box is already set up when this runs.
 *
 * Commerce (the buy box stays the single source of truth):
 *   - picking a colour or phone here sends "cvs:choose" to the buy box
 *     ([data-cv-pdp]); the buy box answers with "cvs:change" and this panel
 *     repaints from it, so price, pack and total always match the checkout
 *   - the phone list starts unchosen until the shopper picks a phone anywhere
 *     on the page; "Add to bag" asks for it first
 *   - "Add to bag" submits the buy box's own form (pack, mixed cases and all)
 *
 * Motion:
 *   GSAP      heading words rise from a mask, the ticket stamps in, chips pop
 *             in order; on a pick the name slides, the price rolls, the ticket
 *             re-stamps and the button ticks when the bag takes it
 *   three.js  a 1920s merry-go-round: striped tent canopy, scalloped valance,
 *             brass poles, bulb chase lights. Each colour's own photo rides a
 *             card that bobs like a carousel horse. It builds itself when it
 *             scrolls in (deck, poles, canopy drop, cards pop, lights flicker
 *             on, one spin to the chosen colour), turns to each pick with a
 *             weighted overshoot, leans with scroll speed and springs back,
 *             and follows drag with a snap to the nearest card.
 * Ambient motion pauses off screen, in a hidden tab and from the pause button.
 * Reduced motion or no WebGL: no three.js at all; the static photo stage and
 * the whole panel work the same, without transforms.
 */

const CVCR_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const TAU = Math.PI * 2;
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
let cvcrThree = null;

function cvcrLoadThree() {
  if (!cvcrThree) cvcrThree = import(CVCR_THREE_URL);
  return cvcrThree;
}

function cvcrWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (error) {
    return false;
  }
}

function fill(template, values) {
  return String(template || '').replace(/\[(\w+)\]/g, (m, key) => (key in values ? values[key] : m));
}

const pad2 = (n) => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* The shop's money format, the same four placeholders as cv-product.js. */
function cvcrMoney(format) {
  return function (cents) {
    const value = Number(cents);
    if (isNaN(value)) return '';
    const group = (num, decimals, thousands, decimal) => {
      const parts = (num / 100).toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + thousands);
      return parts.join(decimal);
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return group(value, 0, ',', '.');
        case 'amount_with_comma_separator': return group(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return group(value, 0, '.', ',');
        default: return group(value, 2, ',', '.');
      }
    });
  };
}

/* The weighted turn: eases in like something heavy, overshoots a hair, settles. */
let cvcrEase = '';
function cvcrTurnEase() {
  if (!cvcrEase) {
    cvcrEase = 'power3.inOut';
    if (window.CustomEase) {
      window.CustomEase.create('cvcrTurn', 'M0,0 C0.24,0 0.22,1.06 0.52,1.045 0.72,1.02 0.84,1 1,1');
      cvcrEase = 'cvcrTurn';
    }
  }
  return cvcrEase;
}

/* GSAP a transform on something whose CSS also transitions transform. */
function cvcrTween(el, from, to) {
  const gsap = window.gsap;
  if (!gsap || !el) return;
  gsap.fromTo(el, from, Object.assign({
    onStart() { el.style.transition = 'none'; },
    clearProps: 'transform,transition'
  }, to));
}

/* ============================================================== the ride */

async function cvcrRide(root, options) {
  const holder = root.querySelector('[data-cvcr-canvas]');
  const stage = root.querySelector('[data-cvcr-stage]');
  const gsap = window.gsap;
  if (!holder || !stage || !gsap || !cvcrWebGL()) return null;

  let THREE;
  try {
    THREE = await cvcrLoadThree();
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all([document.fonts.load('700 40px "Special Elite"'), document.fonts.ready]),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    }
  } catch (error) {
    return null;
  }
  if (!root.isConnected) return null;

  const styles = options.styles;
  const S = styles.length;
  const css = getComputedStyle(root);
  const tok = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const C = {
    red: tok('--red-500', '#C4302B'),
    redDeep: tok('--red-700', '#7E1A17'),
    cream: tok('--cream-50', '#FDF9F1'),
    cream2: tok('--cream-200', '#F5E9D3'),
    gold: tok('--gold-400', '#D2B57C'),
    goldDeep: tok('--gold-500', '#B08F52'),
    ink: tok('--cocoa-700', '#33231A'),
    label: tok('--font-label', '"Special Elite", "Courier New", monospace')
  };

  /* ---- Seats: every colour at least once; small ranges repeat round the ring ---- */
  const n = S >= 5 ? S : S * Math.ceil(6 / S);
  const seatStyle = Array.from({ length: n }, (_, k) => k % S);
  const R = Math.max(2.1, 0.8 / Math.sin(Math.PI / n));
  const PR = R + 0.55;         // platform radius
  const CR = R + 0.74;         // canopy radius
  const POLE = 3.1;            // deck to canopy
  const CH = 1.25;             // canopy height
  const VH = 0.4;              // valance depth
  const CW = 1.3;              // card width
  const CARD_H = 1.56;
  const PW = 1.16;             // photo size
  const CARD_Y = 1.6;
  const PHOTO_Y = CARD_H / 2 - 0.07 - PW / 2;
  const LABEL_Y = PHOTO_Y - PW / 2 - 0.16;

  const disposables = [];
  const keep = (thing) => { disposables.push(thing); return thing; };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 600 ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral keeps the candy red and cream on brand; ACES would drift them toward salmon.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const target = new THREE.Vector3(0, 2.05, 0);

  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = keep(new THREE.CanvasTexture(c));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    if (repeat) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
    }
    return tex;
  }

  /* Warm shop-light environment so the brass reads as brass, not grey. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = canvasTex(32, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fff6e2');
    grad.addColorStop(0.45, '#f0d9a8');
    grad.addColorStop(0.62, '#b98b52');
    grad.addColorStop(1, '#3a261a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const envScene = new THREE.Scene();
  const envGeo = new THREE.SphereGeometry(10, 32, 16);
  const envMat = new THREE.MeshBasicMaterial({ map: envTex, side: THREE.BackSide });
  envScene.add(new THREE.Mesh(envGeo, envMat));
  const envRT = pmrem.fromScene(envScene, 0.035);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.7;
  envGeo.dispose();
  envMat.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b4229, 0.9));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.9);
  key.position.set(3.5, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd79a, 0.9);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  const lamp = new THREE.PointLight(0xffd99a, 0, 9, 1.6); // the bulbs' warm spill, fades up with the lights
  lamp.position.set(0, POLE - 0.35, 0);
  scene.add(lamp);

  /* ---- Materials ---- */
  const brass = keep(new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.95, roughness: 0.26 }));
  const paper = keep(new THREE.MeshStandardMaterial({ color: C.cream, roughness: 0.82 }));

  const diagonal = (a, b, period, width) => (g, w, h) => {
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = b;
    g.lineWidth = width;
    for (let x = -h; x < w + h; x += period) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + h, 0);
      g.stroke();
    }
  };
  const caneTex = canvasTex(128, 128, diagonal(C.cream, C.red, 32, 12), [2, 6]);
  const backTex = canvasTex(128, 128, diagonal(C.cream, C.red, 32, 9), [2, 2.4]);
  const skirtTex = canvasTex(256, 64, diagonal(C.red, C.cream, 32, 9), [Math.round(PR * 7), 1]);

  const stripeCount = n * 4;
  const canopyTex = canvasTex(2048, 32, (g, w, h) => {
    const sw = w / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      g.fillStyle = i % 2 ? C.cream : C.red;
      g.fillRect(Math.floor(i * sw), 0, Math.ceil(sw) + 1, h);
    }
  });
  const valanceTex = canvasTex(2048, 128, (g, w, h) => {
    const sw = w / stripeCount;
    const r = sw / 2;
    const drop = h * 0.4;
    for (let i = 0; i < stripeCount; i++) {
      const x = i * sw;
      g.fillStyle = i % 2 ? C.cream : C.red;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + sw, 0);
      g.lineTo(x + sw, drop);
      g.arc(x + r, drop, r, 0, Math.PI, false);
      g.closePath();
      g.fill();
    }
    g.fillStyle = C.gold;
    g.fillRect(0, 0, w, h * 0.12);
  });
  const deckTex = canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    const k = n * 2;
    for (let i = 0; i < k; i++) {
      g.beginPath();
      g.moveTo(c, c);
      g.arc(c, c, c, (i / k) * TAU, ((i + 1) / k) * TAU);
      g.closePath();
      g.fillStyle = i % 2 ? '#eed9b1' : '#f7e9cd';
      g.fill();
      g.strokeStyle = 'rgba(107, 66, 41, .22)';
      g.lineWidth = 2;
      g.stroke();
    }
    g.strokeStyle = C.goldDeep;
    g.lineWidth = 12;
    g.beginPath();
    g.arc(c, c, c - 7, 0, TAU);
    g.stroke();
    g.fillStyle = C.red;
    g.beginPath();
    g.arc(c, c, c * 0.14, 0, TAU);
    g.fill();
  });
  const ceilingTex = canvasTex(512, 512, (g, w) => {
    const c = w / 2;
    const grad = g.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, '#fff3d6');
    grad.addColorStop(1, '#e8cf9c');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(176, 143, 82, .55)';
    g.lineWidth = 3;
    for (let i = 0; i < stripeCount; i++) {
      const a = (i / stripeCount) * TAU;
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c);
      g.stroke();
    }
  });
  const shadowTex = canvasTex(256, 256, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grad.addColorStop(0, 'rgba(51, 35, 26, .38)');
    grad.addColorStop(0.6, 'rgba(51, 35, 26, .16)');
    grad.addColorStop(1, 'rgba(51, 35, 26, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  });

  /* ---- Geometry ---- */
  const ride = new THREE.Group();
  scene.add(ride);

  const shadow = new THREE.Mesh(keep(new THREE.CircleGeometry(PR * 1.4, 48)), keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.3;
  scene.add(shadow);

  const deck = new THREE.Group();
  ride.add(deck);
  const deckMats = [
    keep(new THREE.MeshStandardMaterial({ map: skirtTex, roughness: 0.5 })),
    keep(new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.7 })),
    keep(new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 0.9 }))
  ];
  const platform = new THREE.Mesh(keep(new THREE.CylinderGeometry(PR, PR * 1.015, 0.28, 96)), deckMats);
  platform.position.y = -0.14;
  deck.add(platform);
  const trimGeo = keep(new THREE.TorusGeometry(PR * 1.004, 0.035, 10, 120));
  [0, -0.28].forEach((y) => {
    const trim = new THREE.Mesh(trimGeo, brass);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = y;
    deck.add(trim);
  });

  const column = new THREE.Group();
  ride.add(column);
  const shaft = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.24, 0.24, POLE, 40, 1, true)), keep(new THREE.MeshStandardMaterial({ map: caneTex, roughness: 0.32 })));
  shaft.position.y = POLE / 2;
  column.add(shaft);
  const collarGeo = keep(new THREE.TorusGeometry(0.26, 0.05, 10, 40));
  [0.05, POLE - 0.05].forEach((y) => {
    const collar = new THREE.Mesh(collarGeo, brass);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = y;
    column.add(collar);
  });

  /* Canopy: a tent lathe (concave, like a real carousel roof), valance, ceiling, finial. */
  const canopy = new THREE.Group();
  canopy.position.y = POLE;
  ride.add(canopy);
  const profile = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    profile.push(new THREE.Vector2(Math.max(0.02, CR * Math.pow(1 - t, 1.55)), CH * t));
  }
  const roof = new THREE.Mesh(keep(new THREE.LatheGeometry(profile, n * 12)), keep(new THREE.MeshStandardMaterial({ map: canopyTex, roughness: 0.55, side: THREE.DoubleSide })));
  canopy.add(roof);
  const ceiling = new THREE.Mesh(keep(new THREE.CircleGeometry(CR * 0.995, 72)), keep(new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.8, side: THREE.DoubleSide })));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 0.002;
  canopy.add(ceiling);
  const valance = new THREE.Mesh(keep(new THREE.CylinderGeometry(CR * 1.003, CR * 1.003, VH, n * 16, 1, true)), keep(new THREE.MeshStandardMaterial({ map: valanceTex, alphaTest: 0.5, roughness: 0.55, side: THREE.DoubleSide })));
  valance.position.y = -VH / 2 + 0.01;
  canopy.add(valance);
  const edge = new THREE.Mesh(keep(new THREE.TorusGeometry(CR * 1.006, 0.04, 10, 140)), brass);
  edge.rotation.x = Math.PI / 2;
  canopy.add(edge);
  const finial = new THREE.Mesh(keep(new THREE.SphereGeometry(0.16, 24, 16)), brass);
  finial.position.y = CH + 0.1;
  canopy.add(finial);
  const mast = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8)), brass);
  mast.position.y = CH + 0.42;
  canopy.add(mast);
  const flagGeo = keep(new THREE.PlaneGeometry(0.44, 0.26, 8, 1));
  flagGeo.translate(0.22, 0, 0);
  const flag = new THREE.Mesh(flagGeo, keep(new THREE.MeshStandardMaterial({ color: C.red, roughness: 0.6, side: THREE.DoubleSide })));
  flag.position.y = CH + 0.54;
  canopy.add(flag);
  const flagBase = flagGeo.attributes.position.array.slice();

  /* Bulbs: a ring under the canopy edge and a ring on the deck skirt. */
  const rimBulbs = n * 4;
  const deckBulbs = n * 3;
  const bulbCount = rimBulbs + deckBulbs;
  const bulbs = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.052, 12, 8)), keep(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })), bulbCount);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < bulbCount; i++) {
    const isRim = i < rimBulbs;
    const a = isRim ? ((i + 0.5) / rimBulbs) * TAU : ((i - rimBulbs + 0.5) / deckBulbs) * TAU;
    const r = isRim ? CR * 1.03 : PR * 1.02;
    m4.makeTranslation(Math.sin(a) * r, isRim ? POLE - 0.02 : -0.14, Math.cos(a) * r);
    bulbs.setMatrixAt(i, m4);
    bulbs.setColorAt(i, new THREE.Color(0.3, 0.22, 0.15));
  }
  ride.add(bulbs);

  /* Cards */
  function roundedRect(w, h, r) {
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
  function planarUV(geo, w, h) {
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
    uv.needsUpdate = true;
  }
  const bodyGeo = keep(new THREE.ExtrudeGeometry(roundedRect(CW, CARD_H, 0.1), { depth: 0.04, bevelEnabled: false, curveSegments: 6 }));
  bodyGeo.translate(0, 0, -0.02);
  const rimShape = roundedRect(CW + 0.07, CARD_H + 0.07, 0.13);
  rimShape.holes.push(roundedRect(CW - 0.03, CARD_H - 0.03, 0.09));
  const rimGeo = keep(new THREE.ExtrudeGeometry(rimShape, { depth: 0.06, bevelEnabled: false, curveSegments: 6 }));
  rimGeo.translate(0, 0, -0.03);
  const photoGeo = keep(new THREE.ShapeGeometry(roundedRect(PW, PW, 0.07), 6));
  planarUV(photoGeo, PW, PW);
  photoGeo.translate(0, PHOTO_Y, 0.0215);
  const labelGeo = keep(new THREE.PlaneGeometry(PW, 0.24));
  labelGeo.translate(0, LABEL_Y, 0.0215);
  const backGeo = keep(new THREE.ShapeGeometry(roundedRect(CW - 0.05, CARD_H - 0.05, 0.08), 6));
  planarUV(backGeo, CW, CARD_H);
  backGeo.rotateY(Math.PI);
  backGeo.translate(0, 0, -0.0215);
  const backMat = keep(new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.6 }));
  const poleGeo = keep(new THREE.CylinderGeometry(0.03, 0.03, POLE, 12));
  poleGeo.translate(0, POLE / 2, 0); // grows up from the deck

  function labelTexture(text) {
    return canvasTex(512, 106, (g, w, h) => {
      g.fillStyle = C.cream;
      g.fillRect(0, 0, w, h);
      g.fillStyle = C.red;
      [30, w - 30].forEach((x) => {
        g.beginPath();
        g.moveTo(x, h / 2 - 9);
        g.lineTo(x + 9, h / 2);
        g.lineTo(x, h / 2 + 9);
        g.lineTo(x - 9, h / 2);
        g.closePath();
        g.fill();
      });
      let label = String(text).toUpperCase();
      let size = 44;
      const room = w - 100;
      const font = (s) => '700 ' + s + 'px ' + C.label;
      g.font = font(size);
      while (size > 26 && g.measureText(label).width > room) {
        size -= 2;
        g.font = font(size);
      }
      while (label.length > 2 && g.measureText(label).width > room) {
        label = label.slice(0, -2) + '…';
      }
      g.fillStyle = C.ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, w / 2, h / 2 + 2);
    });
  }

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const photoTex = styles.map(() => null);
  const labelTex = styles.map((s) => labelTexture(s.value));

  const seats = [];
  const pickables = [];
  for (let k = 0; k < n; k++) {
    const theta = (k / n) * TAU;
    const si = seatStyle[k];
    const seat = new THREE.Group();
    seat.rotation.y = theta;
    ride.add(seat);
    const pole = new THREE.Mesh(poleGeo, brass);
    pole.position.set(0, 0, R);
    seat.add(pole);

    const card = new THREE.Group();
    card.position.set(0, CARD_Y, R + 0.07);
    seat.add(card);
    const body = new THREE.Mesh(bodyGeo, paper);
    const frame = new THREE.Mesh(rimGeo, brass);
    const photoMat = keep(new THREE.MeshBasicMaterial({ color: C.cream2, toneMapped: false }));
    const photo = new THREE.Mesh(photoGeo, photoMat);
    const labelMat = keep(new THREE.MeshBasicMaterial({ map: labelTex[si], toneMapped: false }));
    const label = new THREE.Mesh(labelGeo, labelMat);
    const back = new THREE.Mesh(backGeo, backMat);
    card.add(body, frame, photo, label, back);
    [body, photo, label].forEach((mesh) => { mesh.userData.seat = k; pickables.push(mesh); });

    seats.push({ k, theta, style: si, pole, card, photoMat, labelMat, pop: 1, hover: 0, phase: k * 1.13 });
  }

  styles.forEach((style, si) => {
    if (!style.img) return;
    loader.load(style.img, (tex) => {
      if (destroyed) { tex.dispose(); return; }
      keep(tex);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      const img = tex.image;
      const aspect = img && img.height ? img.width / img.height : 1;
      if (aspect > 1) {
        tex.repeat.set(1 / aspect, 1);
        tex.offset.set((1 - 1 / aspect) / 2, 0);
      } else if (aspect < 1) {
        tex.repeat.set(1, aspect);
        tex.offset.set(0, (1 - aspect) / 2);
      }
      tex.needsUpdate = true;
      photoTex[si] = tex;
      seats.forEach((s) => {
        if (s.style !== si) return;
        s.photoMat.map = tex;
        s.photoMat.color.set(0xffffff);
        s.photoMat.needsUpdate = true;
      });
      wake(400);
    });
  });

  /* ---- Camera framing ---- */
  const cam = { elev: 0.3, dist: 12, sway: 0 };
  let baseDist = 12;
  function measure() {
    const w = Math.max(1, holder.clientWidth);
    const h = Math.max(1, holder.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const fitH = 2.7 / half;
    const fitW = (PR + 0.15) / (half * camera.aspect);
    baseDist = Math.max(fitH, fitW) + R * 0.2;
    camera.updateProjectionMatrix();
  }
  function placeCamera() {
    const d = cam.dist;
    camera.position.set(cam.sway, target.y + Math.sin(cam.elev) * d, Math.cos(cam.elev) * d);
    camera.lookAt(target);
  }

  /* ---- State ---- */
  let destroyed = false;
  let paused = false;
  let visible = false;
  let running = false;
  let dragging = false;
  let introStarted = false;
  let introDone = false;
  let awakeUntil = 0;
  let time = 0;
  let last = 0;
  let targetStyle = options.start;
  const rot = { phi: -seats[options.start].theta };
  const lights = { v: 0, burst: 0 };
  const scroll = { p: 0.5, eased: 0.5, lean: 0 };
  let kick = 0;
  let kickV = 0;
  const pointer = { x: 0, eased: 0 };
  let hovered = -1;
  let hoverEvent = null;
  const bulbColor = new THREE.Color();
  const glow = root.querySelector('[data-cvcr-glow]');
  const turnEase = cvcrTurnEase();

  function nearestAngle(a, ref) { return a + Math.round((ref - a) / TAU) * TAU; }
  function angleForSeat(k, ref) { return nearestAngle(-seats[k].theta, ref); }
  function nearestSeatOfStyle(si, ref) {
    let best = -1;
    let bestD = Infinity;
    seats.forEach((s) => {
      if (s.style !== si) return;
      const d = Math.abs(angleForSeat(s.k, ref) - ref);
      if (d < bestD) { bestD = d; best = s.k; }
    });
    return best;
  }
  function seatNearest(angle) {
    let best = 0;
    let bestD = Infinity;
    seats.forEach((s) => {
      const d = Math.abs(angleForSeat(s.k, angle) - angle);
      if (d < bestD) { bestD = d; best = s.k; }
    });
    return best;
  }

  function turnTo(k, duration, ease) {
    const to = angleForSeat(k, rot.phi);
    gsap.killTweensOf(rot);
    gsap.to(rot, {
      phi: to,
      duration: duration || clamp(0.8 + Math.abs(to - rot.phi) * 0.14, 0.8, 1.35),
      ease: ease || turnEase,
      onUpdate: wake
    });
  }

  /* ---- Frame ---- */
  function tick(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (!paused) time += dt;

    // Scroll: the camera settles from high and wide to close as the section passes.
    scroll.eased += (scroll.p - scroll.eased) * Math.min(1, dt * 5);
    cam.elev = 0.34 - 0.2 * scroll.eased;
    cam.dist = baseDist * (1.1 - 0.13 * scroll.eased);
    pointer.eased += (pointer.x - pointer.eased) * Math.min(1, dt * 4);
    cam.sway = pointer.eased * 0.45;
    placeCamera();

    // Scroll speed leans the ride; a spring brings it back.
    scroll.lean *= Math.exp(-dt * 5);
    kickV += (40 * (scroll.lean - kick) - 6 * kickV) * dt;
    kick += kickV * dt;

    const angle = rot.phi + kick;
    ride.rotation.y = angle;

    seats.forEach((s) => {
      const c = Math.cos(s.theta + angle);
      const front = Math.pow(Math.max(0, c), 5);
      s.hover += ((hovered === s.k ? 1 : 0) - s.hover) * Math.min(1, dt * 10);
      const bob = Math.sin(time * 1.7 + s.phase) * 0.1 * (1 - 0.65 * front);
      s.card.position.y = CARD_Y + bob + 0.08 * front;
      s.card.position.z = R + 0.07 + 0.1 * front + 0.05 * s.hover;
      s.card.rotation.z = Math.sin(time * 1.7 + s.phase + 1.2) * 0.025 * (1 - front);
      s.card.scale.setScalar(Math.max(0.001, s.pop * (1 + 0.16 * front + 0.05 * s.hover)));
      s.pole.scale.y = Math.max(0.001, s.poleGrow === undefined ? 1 : s.poleGrow);
      const shade = 0.6 + 0.4 * clamp((c + 0.25) / 1.25, 0, 1);
      if (s.photoMat.map) s.photoMat.color.setScalar(shade);
      s.labelMat.color.setScalar(shade);
    });

    // Bulbs chase round the canopy; a pick fires a quick sparkle.
    for (let i = 0; i < bulbCount; i++) {
      const chase = 0.5 + 0.5 * Math.sin(time * 4.2 - i * 0.85);
      const sparkle = lights.burst * (0.5 + 0.5 * Math.sin(time * 22 - i * 2.3));
      const level = lights.v * (0.5 + 0.5 * chase) + sparkle;
      bulbColor.setRGB(0.28 + 0.95 * level, 0.2 + 0.8 * level, 0.13 + 0.5 * level);
      bulbs.setColorAt(i, bulbColor);
    }
    bulbs.instanceColor.needsUpdate = true;
    lamp.intensity = 2.2 * lights.v + 1.5 * lights.burst;
    if (glow) glow.style.opacity = String(0.35 + 0.65 * lights.v);

    // The pennant ripples.
    const pos = flagGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = flagBase[i * 3];
      pos.setZ(i, Math.sin(time * 6 - x * 9) * 0.05 * (x / 0.44));
    }
    pos.needsUpdate = true;

    if (hoverEvent) {
      hovered = hitSeat(hoverEvent);
      holder.classList.toggle('is-over', hovered >= 0 && !dragging);
      hoverEvent = null;
    }

    renderer.render(scene, camera);

    const settled = !dragging && !gsap.isTweening(rot) && Math.abs(kick) < 0.0005 && Math.abs(kickV) < 0.0005 && Math.abs(scroll.eased - scroll.p) < 0.001;
    if (paused && introDone && settled && performance.now() > awakeUntil) sync();
  }

  function shouldRun() {
    if (!visible || document.hidden || !introStarted) return false;
    if (!paused || !introDone) return true;
    return dragging || performance.now() < awakeUntil || gsap.isTweening(rot) || Math.abs(kick) > 0.0005;
  }
  function sync() {
    const on = shouldRun();
    if (on === running) return;
    running = on;
    last = 0;
    renderer.setAnimationLoop(on ? tick : null);
  }
  function wake(ms) {
    awakeUntil = Math.max(awakeUntil, performance.now() + (typeof ms === 'number' ? ms : 900));
    sync();
  }

  /* ---- Picking ---- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function hitSeat(event) {
    const box = renderer.domElement.getBoundingClientRect();
    ndc.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    for (let i = 0; i < hits.length; i++) {
      const k = hits[i].object.userData.seat;
      if (Math.cos(seats[k].theta + ride.rotation.y) > -0.15) return k;
    }
    return -1;
  }

  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  const cleanups = [];
  const on = (el, type, fn, opts) => {
    el.addEventListener(type, fn, opts);
    cleanups.push(() => el.removeEventListener(type, fn, opts));
  };

  let down = null;
  let velocity = 0;
  on(canvas, 'pointerdown', (e) => {
    if (e.button !== 0 || !introDone) return;
    down = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastT: performance.now(), id: e.pointerId };
    velocity = 0;
  });
  on(canvas, 'pointermove', (e) => {
    if (!down) {
      if (fineQuery.matches) {
        hoverEvent = e;
        const box = stage.getBoundingClientRect();
        pointer.x = clamp(((e.clientX - box.left) / box.width) * 2 - 1, -1, 1);
        wake(600);
      }
      return;
    }
    const dx = e.clientX - down.x;
    if (!dragging && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(e.clientY - down.y)) {
      dragging = true;
      gsap.killTweensOf(rot);
      holder.classList.add('is-dragging');
      try { canvas.setPointerCapture(down.id); } catch (error) { /* already released */ }
      options.onInteract();
      sync();
    }
    if (dragging) {
      const now = performance.now();
      const step = ((e.clientX - down.lastX) / Math.max(320, holder.clientWidth)) * Math.PI * 1.1;
      rot.phi += step;
      const dtMs = Math.max(1, now - down.lastT);
      velocity = velocity * 0.6 + (step / dtMs) * 0.4;
      down.lastX = e.clientX;
      down.lastT = now;
    }
  });
  function release(e, cancelled) {
    if (!down) return;
    if (dragging) {
      dragging = false;
      holder.classList.remove('is-dragging');
      const projected = rot.phi + clamp(velocity * 260, -2.4, 2.4);
      const k = seatNearest(projected);
      targetStyle = seats[k].style;
      turnTo(k, 0.9, 'power3.out'); // carry the flick's momentum, then settle
      options.onPick(seats[k].style);
    } else if (!cancelled) {
      const k = hitSeat(e);
      if (k >= 0) {
        options.onInteract();
        targetStyle = seats[k].style;
        turnTo(k);
        options.onPick(seats[k].style);
      }
    }
    down = null;
    wake();
  }
  on(canvas, 'pointerup', (e) => release(e, false));
  on(canvas, 'pointercancel', (e) => release(e, true));
  on(canvas, 'pointerleave', () => {
    pointer.x = 0;
    hovered = -1;
    holder.classList.remove('is-over');
    wake(600);
  });

  /* ---- Mount ---- */
  measure();
  cam.dist = baseDist * 1.1;
  placeCamera();
  holder.appendChild(canvas);

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    sync();
  }, { rootMargin: '120px 0px' });
  io.observe(stage);
  cleanups.push(() => io.disconnect());
  on(document, 'visibilitychange', sync);

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      measure();
      placeCamera();
      if (!running) renderer.render(scene, camera);
    });
    ro.observe(holder);
    cleanups.push(() => ro.disconnect());
  }

  const triggers = [];
  if (window.ScrollTrigger) {
    triggers.push(window.ScrollTrigger.create({
      trigger: stage,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate(self) {
        scroll.p = self.progress;
        scroll.lean = clamp(scroll.lean + clamp(self.getVelocity(), -5000, 5000) * 0.00002, -0.22, 0.22);
        wake(700);
      }
    }));
  }

  /* ---- Intro: the ride builds itself as it scrolls in ---- */
  const stills = root.querySelector('[data-cvcr-stills]');
  function settleInstantly() {
    introStarted = true;
    seats.forEach((s) => { s.pop = 1; s.poleGrow = 1; });
    lights.v = 1;
    introDone = true;
    stage.classList.add('is-3d');
    options.onReady();
    wake();
  }
  function playIntro() {
    introStarted = true;
    seats.forEach((s) => { s.pop = 0; s.poleGrow = 0; });
    const endPhi = rot.phi;
    const tl = gsap.timeline({
      onUpdate: wake,
      onComplete() {
        introDone = true;
        options.onReady();
        // A colour picked while the ride was still building: turn to it now.
        const k = nearestSeatOfStyle(targetStyle, rot.phi);
        if (k >= 0 && Math.abs(angleForSeat(k, rot.phi) - rot.phi) > 0.01) turnTo(k);
        wake();
      }
    });
    if (stills) tl.to(stills, { autoAlpha: 0, scale: 0.94, duration: 0.45, ease: 'power2.in' }, 0);
    tl.fromTo(holder, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, 0.1)
      .add(() => stage.classList.add('is-3d'), 0.5)
      .fromTo(deck.scale, { x: 0.4, y: 0.4, z: 0.4 }, { x: 1, y: 1, z: 1, duration: 0.75, ease: 'back.out(1.5)' }, 0.1)
      .fromTo(column.scale, { y: 0.001 }, { y: 1, duration: 0.6, ease: 'power3.out' }, 0.2)
      .to(seats, { poleGrow: 1, duration: 0.55, ease: 'power3.out', stagger: 0.03 }, 0.28)
      .fromTo(canopy.position, { y: POLE + 3.6 }, { y: POLE, duration: 1.05, ease: 'back.out(1.25)' }, 0.35)
      .fromTo(rot, { phi: endPhi - TAU * 0.8 }, { phi: endPhi, duration: 2.2, ease: 'power3.out' }, 0.4)
      .to(seats, { pop: 1, duration: 0.6, ease: 'back.out(2)', stagger: 0.05 }, 0.7)
      .to(lights, { keyframes: { v: [0, 1, 0.15, 1, 0.45, 1] }, duration: 0.75, ease: 'none' }, 1.15);
  }

  measure();
  const box = stage.getBoundingClientRect();
  if (box.bottom <= 0) {
    if (stills) gsap.set(stills, { autoAlpha: 0 });
    settleInstantly();
  } else if (!window.ScrollTrigger || box.top < window.innerHeight * 0.72) {
    playIntro();
  } else {
    gsap.set(holder, { autoAlpha: 0 });
    triggers.push(window.ScrollTrigger.create({ trigger: stage, start: 'top 72%', once: true, onEnter: playIntro }));
  }
  renderer.render(scene, camera);

  return {
    target: () => targetStyle,
    goTo(si) {
      if (si === targetStyle && !dragging) return;
      targetStyle = si;
      const k = nearestSeatOfStyle(si, rot.phi);
      if (k < 0) return;
      if (!introStarted) rot.phi = angleForSeat(k, rot.phi);
      else if (introDone) turnTo(k);
    },
    flash() {
      gsap.fromTo(lights, { burst: 0.9 }, { burst: 0, duration: 1.1, ease: 'power2.out', onUpdate: wake });
    },
    setPaused(value) {
      paused = value;
      wake();
    },
    destroy() {
      destroyed = true;
      renderer.setAnimationLoop(null);
      gsap.killTweensOf([rot, lights, deck.scale, column.scale, canopy.position, holder, stills].concat(seats).filter(Boolean));
      triggers.forEach((t) => t.kill());
      cleanups.forEach((fn) => fn());
      disposables.forEach((thing) => thing.dispose());
      photoTex.forEach((tex) => tex && tex.dispose());
      envRT.dispose();
      renderer.dispose();
      canvas.remove();
      stage.classList.remove('is-3d');
      if (stills) gsap.set(stills, { clearProps: 'all' });
      gsap.set(holder, { clearProps: 'all' });
      if (glow) glow.style.opacity = '';
    }
  };
}

/* ============================================================== the panel */

function cvcrInit(root) {
  if (root._cvcrDestroy) root._cvcrDestroy();
  let data;
  try {
    data = JSON.parse(root.querySelector('[data-cvcr-data]').textContent);
  } catch (error) {
    return;
  }
  const styles = data.styles || [];
  const variants = data.variants || [];
  if (styles.length < 2) return;

  const gsap = window.gsap;
  const reduced = reduceQuery.matches;
  const motion = Boolean(gsap) && !reduced;
  const t = data.t || {};
  const si = data.styleIndex;
  const mi = data.modelIndex;
  const money = cvcrMoney(root.getAttribute('data-money-format') || window.themeMoneyFormat || '${{amount}}');
  const bb = document.querySelector('[data-cv-pdp]');
  const fallbackCompare = bb ? parseInt(bb.getAttribute('data-compare-at-fallback'), 10) || 0 : 0;

  const $ = (sel) => root.querySelector(sel);
  const els = {
    stage: $('[data-cvcr-stage]'),
    stills: Array.from(root.querySelectorAll('[data-cvcr-still]')),
    hint: $('[data-cvcr-hint]'),
    pause: $('[data-cvcr-pause]'),
    pauseLabel: $('[data-cvcr-pause-label]'),
    pauseIcons: Array.from(root.querySelectorAll('[data-cvcr-pause-icon]')),
    steps: Array.from(root.querySelectorAll('[data-cvcr-step]')),
    countNow: $('[data-cvcr-count-now]'),
    count: $('[data-cvcr-count]'),
    ticket: $('[data-cvcr-ticket]'),
    name: $('[data-cvcr-name]'),
    fit: $('[data-cvcr-fit]'),
    fitText: $('[data-cvcr-fit-text]'),
    now: $('[data-cvcr-now]'),
    was: $('[data-cvcr-was]'),
    off: $('[data-cvcr-off]'),
    chipsWrap: $('[data-cvcr-chips]'),
    chips: Array.from(root.querySelectorAll('[data-cvcr-chip]')),
    buy: $('[data-cvcr-buy]'),
    model: $('[data-cvcr-model]'),
    pack: $('[data-cvcr-pack]'),
    packText: $('[data-cvcr-pack-text]'),
    packChange: $('[data-cvcr-pack-change]'),
    add: $('[data-cvcr-add]'),
    addLabel: $('[data-cvcr-add-label]'),
    addTotal: $('[data-cvcr-add-total]'),
    tick: $('[data-cvcr-tick]'),
    status: $('[data-cvcr-status]')
  };
  els.selectWrap = els.model ? els.model.closest('.cvcr__select') : null;

  const cleanups = [];
  const on = (el, type, fn, opts) => {
    if (!el) return;
    el.addEventListener(type, fn, opts);
    cleanups.push(() => el.removeEventListener(type, fn, opts));
  };

  /* ---- State: start from what the buy box shows right now ---- */
  const variantById = (id) => variants.find((v) => v.id === id) || null;
  const bbVariantInput = document.getElementById('cvVariantId');
  const startVariant = bb && bbVariantInput && bbVariantInput.value ? variantById(Number(bbVariantInput.value)) : null;
  const state = {
    opts: (startVariant ? startVariant.o : data.selected || []).slice(),
    confirmed: Boolean(data.confirmed) || mi < 0,
    qty: 1,
    pct: 0,
    detail: null,
    busy: false,
    added: false
  };
  if (bb) {
    const pack = bb.querySelector('[data-cv-pack][aria-checked="true"], .cvs__pack[aria-checked="true"]');
    if (pack) {
      state.qty = Math.max(1, parseInt(pack.getAttribute('data-cv-qty'), 10) || 1);
      state.pct = clamp(parseFloat(pack.getAttribute('data-cv-discount')) || 0, 0, 90);
    }
  }

  function variantFor(opts) {
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      let match = true;
      for (let oi = 0; oi < opts.length; oi++) {
        if (String(v.o[oi]) !== String(opts[oi])) { match = false; break; }
      }
      if (match) return v;
    }
    return null;
  }
  const styleIndex = () => styles.findIndex((s) => s.value === state.opts[si]);
  function withOption(index, value) {
    const opts = state.opts.slice();
    opts[index] = value;
    return opts;
  }
  /* 'ok' | 'out' | 'none' for a colour, against the shopper's phone once chosen. */
  function colourStock(style) {
    if (mi >= 0 && state.confirmed) {
      const v = variantFor(withOption(si, style.value));
      return !v ? 'none' : (v.a ? 'ok' : 'out');
    }
    return style.ok > 0 ? 'ok' : 'out';
  }

  let ride = null;
  let silent = false;
  let lastIndex = styleIndex();

  function choose(index, value) {
    if (bb) bb.dispatchEvent(new CustomEvent('cvs:choose', { detail: { index: index, value: value } }));
  }

  function setStatus(text, tone) {
    els.status.textContent = text || '';
    if (tone) els.status.setAttribute('data-tone', tone);
    else els.status.removeAttribute('data-tone');
  }

  /* ---- Repaint ---- */
  function setName(text, animate) {
    const el = els.name;
    if (el.textContent === text) return;
    if (!animate || !motion) { el.textContent = text; return; }
    gsap.killTweensOf(el);
    gsap.timeline()
      .to(el, { yPercent: -70, autoAlpha: 0, duration: 0.16, ease: 'power2.in' })
      .add(() => { el.textContent = text; })
      .fromTo(el, { yPercent: 80, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.7)' });
  }

  function setMoney(el, cents, animate) {
    const prev = Number(el.getAttribute('data-cents'));
    el.setAttribute('data-cents', String(cents));
    if (!animate || !motion || !prev || prev === cents) {
      el.textContent = money(cents);
      return;
    }
    const roll = { v: prev };
    if (el._cvcrRoll) el._cvcrRoll.kill();
    el._cvcrRoll = gsap.to(roll, { v: cents, duration: 0.5, ease: 'power2.out', onUpdate: () => { el.textContent = money(Math.round(roll.v)); } });
    gsap.fromTo(el, { scale: 1.12 }, { scale: 1, duration: 0.45, ease: 'back.out(2)', clearProps: 'transform' });
  }

  function render(animate) {
    const idx = styleIndex();
    const style = styles[idx];
    const v = variantFor(state.opts);
    const model = mi >= 0 ? state.opts[mi] : '';
    const changed = idx !== lastIndex;

    setName(style ? style.value : String(state.opts[si] || ''), animate && changed);
    els.count.textContent = fill(t.count, { i: idx + 1, n: styles.length });
    els.countNow.textContent = pad2(idx + 1);

    els.chips.forEach((chip, i) => {
      const current = i === idx;
      chip.setAttribute('aria-checked', current ? 'true' : 'false');
      chip.tabIndex = current ? 0 : -1;
      chip.setAttribute('data-stock', colourStock(styles[i]) === 'ok' ? '' : 'out');
    });
    els.stills.forEach((fig, i) => { fig.hidden = i !== idx; });

    // The stock line: this colour across every phone, or for the shopper's own phone.
    let fitState = 'ok';
    let fitText = '';
    if (mi >= 0 && state.confirmed) {
      if (!v) { fitState = 'none'; fitText = fill(t.fitYoursNone, { model: model }); }
      else if (!v.a) { fitState = 'out'; fitText = fill(t.fitYoursOut, { model: model }); }
      else fitText = fill(t.fitYours, { model: model });
    } else if (style) {
      if (style.ok === 0) { fitState = 'out'; fitText = t.fitNone; }
      else if (mi < 0) fitText = t.fitStock;
      else if (style.ok === style.total) fitText = fill(t.fitAll, { n: style.total });
      else fitText = fill(t.fitSome, { ok: style.ok, n: style.total });
    }
    els.fit.setAttribute('data-state', fitState);
    els.fitText.textContent = fitText;

    // Price: the case the buy box holds, else the first of this colour to show what it costs.
    const shown = v
      || variants.find((x) => String(x.o[si]) === String(state.opts[si]) && x.a)
      || variants.find((x) => String(x.o[si]) === String(state.opts[si]));
    if (shown) {
      const d = state.detail && state.detail.variant && state.detail.variant.id === shown.id ? state.detail : null;
      const compareAt = d && typeof d.compareAt === 'number' ? d.compareAt : (shown.c > shown.p ? shown.c : fallbackCompare);
      const hasWas = compareAt > shown.p;
      setMoney(els.now, shown.p, animate && changed);
      els.was.hidden = !hasWas;
      els.off.hidden = !hasWas;
      if (hasWas) {
        els.was.textContent = money(compareAt);
        els.off.textContent = fill(t.off, { pct: Math.round(((compareAt - shown.p) * 100) / compareAt) });
      }

      const subtotal = shown.p * state.qty;
      const total = d && typeof d.total === 'number' ? d.total : subtotal - Math.floor((subtotal * state.pct) / 100);
      els.pack.hidden = state.qty < 2;
      if (state.qty > 1) {
        els.packText.textContent = fill(state.pct > 0 ? t.pack : t.packPlain, { qty: state.qty, total: money(total), pct: state.pct });
      }

      if (!state.busy && !state.added) {
        let label;
        let disabled = false;
        if (mi >= 0 && state.confirmed && !v) { label = t.unavailable; disabled = true; }
        else if ((state.confirmed && v && !v.a) || (!state.confirmed && style && style.ok === 0)) { label = t.soldOut; disabled = true; }
        else label = state.qty > 1 ? fill(t.addPack, { qty: state.qty }) : t.add;
        els.add.disabled = disabled;
        els.addLabel.textContent = label;
        if (disabled) els.addTotal.textContent = '';
        else setMoney(els.addTotal, total, animate);
      }
    }

    // The phone list: mark what this colour isn't made in or has sold out of.
    if (els.model) {
      Array.prototype.forEach.call(els.model.options, (opt) => {
        if (!opt.value) return;
        const pv = variantFor(withOption(mi, opt.value));
        const text = opt.value + (!pv ? t.noneSuffix : (pv.a ? '' : t.soldSuffix));
        if (opt.textContent !== text) opt.textContent = text;
      });
      const want = state.confirmed ? String(model) : '';
      if (els.model.value !== want) els.model.value = want;
    }

    if (animate && changed && motion) {
      cvcrTween(els.ticket, { rotation: -1.4, scale: 1.025 }, { rotation: 0, scale: 1, duration: 0.55, ease: 'back.out(2.2)' });
      if (els.chips[idx]) cvcrTween(els.chips[idx], { scale: 0.88 }, { scale: 1, duration: 0.5, ease: 'back.out(2.6)' });
    }
    lastIndex = idx;
  }

  /* ---- Choosing ---- */
  function pickStyle(i, source) {
    const style = styles[i];
    if (!style) return;
    const changed = String(state.opts[si]) !== style.value;
    state.opts[si] = style.value;
    if (changed && bb) {
      choose(si, style.value);
      // No phone chosen yet: keep the buy box on a case that exists and is in stock.
      if (mi >= 0 && !state.confirmed) {
        const v = variantFor(state.opts);
        if (!v || !v.a) {
          const alt = variants.find((x) => x.o[si] === style.value && x.a) || variants.find((x) => x.o[si] === style.value);
          if (alt) {
            state.opts = alt.o.slice();
            silent = true;
            choose(mi, alt.o[mi]);
            silent = false;
          }
        }
      }
    }
    if (ride && source !== 'ride') ride.goTo(i);
    if (ride && changed) ride.flash();
    if (changed && !state.busy) setStatus('');
    render(true);
    hideHint();
  }

  els.chips.forEach((chip, i) => {
    on(chip, 'click', () => pickStyle(i, 'chip'));
    on(chip, 'keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let next = -1;
      if (e.key in keys) next = (i + keys[e.key] + styles.length) % styles.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = styles.length - 1;
      if (next < 0) return;
      e.preventDefault();
      els.chips[next].focus();
      pickStyle(next, 'chip');
    });
  });
  els.steps.forEach((btn) => {
    on(btn, 'click', () => {
      const dir = Number(btn.getAttribute('data-cvcr-step')) || 1;
      const idx = Math.max(0, styleIndex());
      pickStyle((idx + dir + styles.length) % styles.length, 'step');
    });
  });

  on(els.model, 'change', () => {
    const value = els.model.value;
    if (!value) {
      state.confirmed = false;
      render(false);
      return;
    }
    state.confirmed = true;
    state.opts[mi] = value;
    if (els.selectWrap) els.selectWrap.classList.remove('is-wanted');
    setStatus('');
    choose(mi, value);
    render(true);
  });

  /* ---- Listening to the buy box ---- */
  if (bb) {
    on(bb, 'cvs:change', (e) => {
      const d = e.detail || {};
      if (!d.variant) return;
      state.detail = d;
      state.opts = d.variant.options.slice();
      state.qty = d.qty || 1;
      state.pct = d.pct || 0;
      const idx = styleIndex();
      if (ride && idx >= 0 && idx !== ride.target()) ride.goTo(idx);
      if (state.busy && !state.added) {
        // The buy box repaints after a failed add: say what it said.
        state.busy = false;
        els.add.classList.remove('is-busy');
        const said = document.getElementById('cvStatus');
        setStatus((said && said.textContent) || t.failed, 'warn');
      }
      render(true);
    });
    // A phone chosen in the buy box or the fit list counts as the shopper's phone.
    const markChosen = () => {
      if (silent) return;
      state.confirmed = true;
      if (els.selectWrap) els.selectWrap.classList.remove('is-wanted');
      render(false);
    };
    if (mi >= 0) {
      on(bb.querySelector('select[data-cv-option-index="' + mi + '"]'), 'change', markChosen);
      bb.querySelectorAll('button[data-cv-option-index="' + mi + '"]').forEach((btn) => on(btn, 'click', markChosen));
    }
    on(bb, 'cvs:adding', () => {
      state.busy = true;
      state.added = false;
      els.add.classList.add('is-busy');
      els.add.disabled = true;
      els.addLabel.textContent = t.adding;
      setStatus('');
    });
    on(bb, 'cvs:added', () => {
      state.busy = false;
      state.added = true;
      els.add.classList.remove('is-busy');
      els.add.classList.add('is-done');
      els.addLabel.textContent = t.added;
      const said = document.getElementById('cvStatus');
      setStatus(said ? said.textContent : '');
      if (motion && els.tick && window.DrawSVGPlugin) gsap.fromTo(els.tick, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45, ease: 'power2.out' });
      if (ride) ride.flash();
      window.setTimeout(() => {
        state.added = false;
        els.add.classList.remove('is-done');
        render(false);
      }, 2200);
    });
  }

  /* No buy box on the page: add the one case directly. */
  function addDirect(v) {
    const base = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    state.busy = true;
    els.add.classList.add('is-busy');
    els.add.disabled = true;
    els.addLabel.textContent = t.adding;
    fetch(base + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] })
    })
      .then((res) => res.json().then((body) => { if (!res.ok) throw body; return body; }))
      .then(() => {
        state.busy = false;
        state.added = true;
        els.add.classList.remove('is-busy');
        els.add.classList.add('is-done');
        els.addLabel.textContent = t.added;
        document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
        document.dispatchEvent(new CustomEvent('cart:added', { bubbles: true }));
        if (window.CasifyCart && typeof window.CasifyCart.refresh === 'function') window.CasifyCart.refresh();
        window.setTimeout(() => { state.added = false; els.add.classList.remove('is-done'); render(false); }, 2200);
      })
      .catch((err) => {
        state.busy = false;
        els.add.classList.remove('is-busy');
        setStatus((err && err.description) || t.failed, 'warn');
        render(false);
      });
  }

  on(els.add, 'click', () => {
    if (els.add.disabled || state.busy) return;
    if (mi >= 0 && !state.confirmed) {
      setStatus(t.pickModel, 'warn');
      if (els.selectWrap) {
        els.selectWrap.classList.add('is-wanted');
        if (motion) gsap.fromTo(els.selectWrap, { x: 0 }, { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.45, ease: 'power1.out', clearProps: 'transform' });
      }
      if (els.model) els.model.focus();
      return;
    }
    const v = variantFor(state.opts);
    if (!v || !v.a) return;
    const form = bb ? document.getElementById('cvAddForm') : null;
    if (form) {
      // The buy box should already hold this case; make sure before submitting its form.
      if (!bbVariantInput || Number(bbVariantInput.value) !== v.id) {
        choose(si, v.o[si]);
        if (mi >= 0) choose(mi, v.o[mi]);
      }
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      return;
    }
    addDirect(v);
  });

  on(els.packChange, 'click', () => {
    if (!bb) return;
    const packs = bb.querySelector('.cvc__packs') || document.getElementById('cvAddForm') || bb;
    packs.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    const checked = bb.querySelector('[data-cv-pack][aria-checked="true"]');
    if (checked) window.setTimeout(() => checked.focus({ preventScroll: true }), reduced ? 0 : 650);
  });

  /* ---- Hint and pause (3D only) ---- */
  let hintShown = false;
  function hideHint() {
    if (!hintShown || !els.hint) return;
    hintShown = false;
    if (motion) gsap.to(els.hint, { autoAlpha: 0, y: -8, duration: 0.3, ease: 'power2.in', onComplete: () => { els.hint.hidden = true; } });
    else els.hint.hidden = true;
  }
  on(els.pause, 'click', () => {
    const pausedNow = els.pause.getAttribute('aria-pressed') !== 'true';
    els.pause.setAttribute('aria-pressed', pausedNow ? 'true' : 'false');
    els.pauseLabel.textContent = pausedNow ? t.play : t.pause;
    els.pauseIcons.forEach((icon) => { icon.hidden = icon.getAttribute('data-cvcr-pause-icon') !== (pausedNow ? 'play' : 'pause'); });
    if (ride) ride.setPaused(pausedNow);
  });

  /* ---- Ready: the buy row replaces the no-JS link ---- */
  els.buy.hidden = false;
  root.classList.add('is-ready');
  render(false);

  /* ---- Scroll choreography for the panel ---- */
  let ctx = null;
  if (motion && window.ScrollTrigger) {
    ctx = gsap.context(() => {
      const head = root.querySelector('[data-cvcr-head]');
      const title = root.querySelector('[data-cvcr-split]');
      const lede = head && head.querySelector('.cvcr__lede');
      const once = (el, start) => ({ trigger: el, start: start || 'top 86%', once: true });
      if (title && window.SplitText) {
        const split = window.SplitText.create(title, { type: 'words', mask: 'words' });
        gsap.from(split.words, { yPercent: 110, duration: 0.8, ease: 'power4.out', stagger: 0.06, scrollTrigger: once(title) });
      } else if (title) {
        gsap.from(title, { autoAlpha: 0, y: 24, duration: 0.7, ease: 'power3.out', scrollTrigger: once(title) });
      }
      if (lede) gsap.from(lede, { autoAlpha: 0, y: 18, duration: 0.7, delay: 0.18, ease: 'power3.out', scrollTrigger: once(lede) });
      gsap.from(els.stage, { autoAlpha: 0, y: 36, scale: 0.97, duration: 0.9, ease: 'power3.out', scrollTrigger: once(els.stage, 'top 90%') });
      cvcrTween(els.ticket, { autoAlpha: 0, y: 26, rotation: -2.5, scale: 1.04 }, {
        autoAlpha: 1, y: 0, rotation: 0, scale: 1, duration: 0.75, ease: 'back.out(1.6)',
        clearProps: 'transform,transition,opacity,visibility', scrollTrigger: once(els.ticket, 'top 90%')
      });
      els.chips.forEach((chip) => { chip.style.transition = 'none'; });
      gsap.fromTo(els.chips, { autoAlpha: 0, y: 14, scale: 0.9 }, {
        autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.8)', stagger: 0.05,
        clearProps: 'transform,transition,opacity,visibility', scrollTrigger: once(els.chipsWrap, 'top 94%')
      });
      const rows = Array.from(els.buy.children).filter((el) => !el.hidden && el !== els.status);
      rows.forEach((row) => { row.style.transition = 'none'; });
      gsap.fromTo(rows, { autoAlpha: 0, y: 16 }, {
        autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.08,
        clearProps: 'transform,transition,opacity,visibility', scrollTrigger: once(els.buy, 'top 96%')
      });
    }, root);
  }

  /* ---- The ride ---- */
  let destroyed = false;
  if (!reduced) {
    cvcrRide(root, {
      styles: styles,
      start: Math.max(0, styleIndex()),
      onPick: (i) => pickStyle(i, 'ride'),
      onInteract: hideHint,
      onReady: () => {
        if (destroyed) return;
        if (els.pause) els.pause.hidden = false;
        if (els.hint && !hintShown) {
          hintShown = true;
          els.hint.hidden = false;
          if (motion) gsap.fromTo(els.hint, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(1.8)' });
        }
      }
    }).then((instance) => {
      if (!instance) return;
      if (destroyed) instance.destroy();
      else ride = instance;
    });
  }

  root._cvcrDestroy = function () {
    destroyed = true;
    if (ride) ride.destroy();
    ride = null;
    if (ctx) ctx.revert();
    cleanups.forEach((fn) => fn());
    root.classList.remove('is-ready');
    delete root._cvcrDestroy;
  };
}

/* ---------------------------------------------------------------- boot */

function cvcrInitAll(scope) {
  const roots = [];
  if (scope.matches && scope.matches('[data-cvcr]')) roots.push(scope);
  if (scope.querySelectorAll) roots.push(...scope.querySelectorAll('[data-cvcr]'));
  roots.forEach(cvcrInit);
  if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
}

cvcrInitAll(document);
document.addEventListener('shopify:section:load', (event) => cvcrInitAll(event.target));
document.addEventListener('shopify:section:unload', (event) => {
  const roots = event.target.querySelectorAll ? event.target.querySelectorAll('[data-cvcr]') : [];
  roots.forEach((root) => { if (root._cvcrDestroy) root._cvcrDestroy(); });
});
