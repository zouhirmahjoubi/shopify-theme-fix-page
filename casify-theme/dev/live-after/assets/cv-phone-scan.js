/* Casify — "3D phone scan" (sections/cv-phone-scan.liquid).
 *
 * Loaded as a module from layout/theme.liquid after the GSAP bundle, so gsap
 * and ScrollTrigger exist when this runs. three.js is imported only when the
 * section is on the page, WebGL works and motion is allowed.
 *
 * After Codegrid's three.js "3D scroll animation" (the Silencio scanner):
 *   opening  both phones float over the headline: a slow bob and sway, and
 *            they lean a little toward the pointer
 *   middle   they tumble one full turn end over end, tied to scroll, and part
 *            to either side of the statement (above it on narrow screens)
 *   scanner  the panel pins. The phones settle side by side in the frame and
 *            spin once, a red beam passes and ticks off the fit check
 *            (cameras, buttons, port) as it reaches each, the frame flashes,
 *            the phones drop into the scanner, the frame folds away and the
 *            stamp lands. Scrolling back up rewinds it.
 *   fitting  iPhone 18, 18 Pro and 18 Pro Max stand in a row at true
 *   room     relative size in a slot in the page. Hovering a model chip (or
 *            the phone) lifts it; picking one brings it forward with a turn,
 *            the others drop away, a case comes up from below and presses on
 *            with a kick, and the panel deals out the cases cut for it. Drag
 *            sideways to turn the phone. The chips are radios, so the panel
 *            works without any of this (CSS :has).
 * The phones and cases are built from primitives (buildPhone, buildCase),
 * sized from Apple's published dimensions and lit by a small studio made in
 * code, so there is no model file to load. Ambient motion pauses off screen,
 * in a hidden tab and from the pause button. Reduced motion or no WebGL: no
 * three.js at all; the section keeps its compact still layout (see
 * cv-phone-scan.css).
 */

const CVPS_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
const TAU = Math.PI * 2;
const MM = 1 / 80; // world units per millimetre
const BACK = Math.PI; // a phone turned to show its back
const GAP = 0.26; // space between the phones in the scanner
const NARROW = 0.8; // width / height; matches the 4:5 media query in the CSS
const CLEAR_OPACITY = 0.34; // the clear case, fully on

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const span = (v, a, b) => clamp((v - a) / (b - a), 0, 1);

let cvpsThree = null;
function loadThree() {
  if (!cvpsThree) cvpsThree = import(CVPS_THREE_URL);
  return cvpsThree;
}

function webglWorks() {
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

/* Apple's published sizes for the iPhone 17 family in millimetres; the 18
 * family keeps the same bodies. cam: "plateau" is the full-width camera
 * plateau with three lenses (Pro, Pro Max); "pill" is two lenses in a raised
 * vertical pill (iPhone 18). */
export const SPECS = {
  'iphone-18': { h: 149.6, w: 71.5, d: 7.95, r: 11.2, cam: 'pill' },
  'iphone-18-pro': { h: 150.0, w: 71.9, d: 8.75, r: 11.4, cam: 'plateau' },
  'iphone-18-pro-max': { h: 163.4, w: 78.0, d: 8.75, r: 12.4, cam: 'plateau' }
};

/* ---------- Geometry and texture helpers ---------- */

/* A rounded rectangle centred on (cx, cy), default the origin; the top and
 * bottom corners can differ. */
function roundRect(THREE, w, h, rTop, rBottom, cx = 0, cy = 0) {
  const shape = new THREE.Shape();
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const x1 = cx + w / 2;
  const y1 = cy + h / 2;
  const rt = clamp(rTop, 0.0001, Math.min(w, h) / 2);
  const rb = clamp(rBottom == null ? rTop : rBottom, 0.0001, Math.min(w, h) / 2);
  shape.moveTo(x0 + rb, y0);
  shape.lineTo(x1 - rb, y0);
  shape.absarc(x1 - rb, y0 + rb, rb, -Math.PI / 2, 0, false);
  shape.lineTo(x1, y1 - rt);
  shape.absarc(x1 - rt, y1 - rt, rt, 0, Math.PI / 2, false);
  shape.lineTo(x0 + rt, y1);
  shape.absarc(x0 + rt, y1 - rt, rt, Math.PI / 2, Math.PI, false);
  shape.lineTo(x0, y0 + rb);
  shape.absarc(x0 + rb, y0 + rb, rb, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/* ShapeGeometry UVs are in shape units; stretch them to 0..1 for a texture. */
function fitUV(geo) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const w = box.max.x - box.min.x || 1;
  const h = box.max.y - box.min.y || 1;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - box.min.x) / w, (pos.getY(i) - box.min.y) / h);
  uv.needsUpdate = true;
  return geo;
}

function paint(THREE, w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function pill(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
  g.fill();
}

/* Lock screen: a wallpaper in the phone's own colour with a faint candy-stripe
 * hem, the clock, and the two quick-action buttons. */
function lockScreen(THREE, hex, aspect) {
  const W = 540;
  const H = Math.round(W / aspect);
  return paint(THREE, W, H, (g) => {
    const hsl = {};
    new THREE.Color(hex).getHSL(hsl, THREE.SRGBColorSpace);
    const hue = Math.round(hsl.h * 360);
    const sat = clamp(hsl.s, 0.22, 0.62) * 100;
    const tone = (light, satMul) => `hsl(${hue} ${Math.round(sat * (satMul || 1))}% ${light}%)`;

    const bg = g.createLinearGradient(0, 0, W * 0.35, H);
    bg.addColorStop(0, tone(80, 0.55));
    bg.addColorStop(0.5, tone(50));
    bg.addColorStop(1, tone(17, 1.1));
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    const glow = (x, y, radius, colour) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, radius);
      rg.addColorStop(0, colour);
      rg.addColorStop(1, 'rgba(253,249,241,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    };
    glow(W * 0.18, H * 0.56, W * 0.95, 'rgba(253,249,241,0.32)');
    glow(W * 1.02, H * 0.94, W * 0.85, 'rgba(196,48,43,0.30)');

    // Candy-stripe hem, like the shop awning.
    g.save();
    g.beginPath();
    g.rect(0, H * 0.74, W, H * 0.26);
    g.clip();
    g.globalAlpha = 0.13;
    g.translate(W / 2, H * 0.87);
    g.rotate(-0.5);
    for (let i = -16; i < 16; i++) {
      g.fillStyle = i % 2 ? '#fdf9f1' : '#c4302b';
      g.fillRect(i * 38, -H, 38, H * 2);
    }
    g.restore();

    const sys = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(255,255,255,0.86)';
    g.font = `600 ${Math.round(W * 0.062)}px ${sys}`;
    g.fillText('Friday 18 September', W / 2, H * 0.112);
    g.fillStyle = 'rgba(255,255,255,0.96)';
    g.font = `700 ${Math.round(W * 0.31)}px ${sys}`;
    g.fillText('9:41', W / 2, H * 0.112 + W * 0.3);

    // Torch and camera buttons, then the home indicator.
    const qy = H * 0.9;
    const qr = W * 0.072;
    [W * 0.17, W * 0.83].forEach((x) => {
      g.fillStyle = 'rgba(25,16,12,0.34)';
      g.beginPath();
      g.arc(x, qy, qr, 0, TAU);
      g.fill();
    });
    g.fillStyle = 'rgba(255,255,255,0.92)';
    pill(g, W * 0.17 - W * 0.013, qy - W * 0.032, W * 0.026, W * 0.064, W * 0.008);
    pill(g, W * 0.83 - W * 0.036, qy - W * 0.024, W * 0.072, W * 0.05, W * 0.012);
    g.fillStyle = 'rgba(25,16,12,0.55)';
    g.beginPath();
    g.arc(W * 0.83, qy + W * 0.001, W * 0.013, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.88)';
    pill(g, W * 0.32, H * 0.972, W * 0.36, W * 0.012, W * 0.006);
  });
}

/* Lens glass: dark well, element rings, a violet-teal coating and a catch-light. */
function lensGlass(THREE) {
  return paint(THREE, 256, 256, (g, w) => {
    const c = w / 2;
    let rg = g.createRadialGradient(c, c, 0, c, c, c);
    rg.addColorStop(0, '#1a1c2c');
    rg.addColorStop(0.45, '#0a0b12');
    rg.addColorStop(0.82, '#040406');
    rg.addColorStop(1, '#1b1b22');
    g.fillStyle = rg;
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(150,160,215,0.24)';
    g.lineWidth = 2;
    [0.9, 0.7, 0.52].forEach((k) => {
      g.beginPath();
      g.arc(c, c, c * k, 0, TAU);
      g.stroke();
    });
    rg = g.createRadialGradient(c * 0.86, c * 0.8, 0, c, c, c * 0.44);
    rg.addColorStop(0, 'rgba(126,112,226,0.6)');
    rg.addColorStop(0.55, 'rgba(36,96,118,0.38)');
    rg.addColorStop(1, 'rgba(8,8,16,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(c, c, c * 0.44, 0, TAU);
    g.fill();
    g.fillStyle = '#020203';
    g.beginPath();
    g.arc(c, c, c * 0.15, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.ellipse(c * 0.66, c * 0.6, c * 0.1, c * 0.055, -0.65, 0, TAU);
    g.fill();
  });
}

function flashGlass(THREE) {
  return paint(THREE, 128, 128, (g, w) => {
    const c = w / 2;
    const rg = g.createRadialGradient(c, c, 0, c, c, c);
    rg.addColorStop(0, '#fffaf0');
    rg.addColorStop(0.68, '#efe3c4');
    rg.addColorStop(1, '#b6a786');
    g.fillStyle = rg;
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(140,120,84,0.32)';
    g.lineWidth = 1.5;
    for (let k = 0.16; k < 1; k += 0.14) {
      g.beginPath();
      g.arc(c, c, c * k, 0, TAU);
      g.stroke();
    }
  });
}

/* A lens housing: a lathe profile with a rounded lip, standing out toward -z
 * (the back of the phone) by `height`. */
function lensHousing(THREE, R, height) {
  const e = Math.min(R * 0.12, height * 0.45);
  const rIn = R * 0.8;
  const pts = [new THREE.Vector2(R, 0), new THREE.Vector2(R, height - e)];
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - e + Math.cos(a) * e, height - e + Math.sin(a) * e));
  }
  pts.push(new THREE.Vector2(rIn + R * 0.03, height), new THREE.Vector2(rIn, height * 0.82), new THREE.Vector2(rIn, height * 0.25));
  const geo = new THREE.LatheGeometry(pts, 56);
  geo.rotateX(-Math.PI / 2); // lathe height (y) now runs toward -z
  return geo;
}

/* The front element: a shallow dome bulging toward -z, so a light shows as a
 * small highlight rather than flooding a flat disc. UVs are planar, so the
 * lens texture reads straight on. */
function lensDome(THREE, a, rise) {
  const rho = (a * a + rise * rise) / (2 * rise);
  const geo = new THREE.SphereGeometry(rho, 48, 10, 0, TAU, 0, Math.asin(a / rho));
  geo.translate(0, -(rho - rise), 0); // cap base at y = 0, apex at y = rise
  geo.rotateX(-Math.PI / 2); // apex now at z = -rise
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 - pos.getX(i) / (2 * a), 0.5 + pos.getY(i) / (2 * a));
  uv.needsUpdate = true;
  return geo;
}

/* ---------- Studio light: softboxes in a warm room, baked to an environment map ---------- */
export function studioEnvironment(THREE, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({ color: 0x6e645b, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, power, colour) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(power), side: THREE.DoubleSide })
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
  };
  panel(5.5, 3, 0.6, 4.6, 3.6, 5.2, 0xfff6ea); // overhead key, in front
  panel(2.2, 7, -5.6, 0.4, 2.2, 3.2, 0xfff1e2); // left strip
  panel(2.2, 7, 5.6, 0.8, 0.6, 2.4, 0xffe7d6); // right strip
  panel(9, 2.4, 0, -5.2, 2.4, 1.3, 0xfbf3e4); // cream bounce from the counter
  panel(5, 4, 0, 1.2, -6, 1.5, 0xf0e2c2); // warm fill behind
  const env = pmrem.fromScene(room, 0.035).texture;
  room.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  pmrem.dispose();
  return env;
}

/* Direct lights on top of the environment: a key for crisp edge highlights
 * that also casts a soft shadow (the front phone shades the one behind, the
 * lenses shade the plateau), a rim from behind, and a warm lamp close in
 * front whose falloff paints a gradient across the flat backs. */
export function addLights(THREE, scene, renderer) {
  const key = new THREE.DirectionalLight(0xfff4e8, 1.25);
  key.position.set(2.5, 4, 6);
  const rim = new THREE.DirectionalLight(0xffe2cc, 1.0);
  rim.position.set(-4, 2, -3);
  const lamp = new THREE.PointLight(0xffe9d2, 9, 0, 2);
  lamp.position.set(-1.6, 2.2, 2.6);
  scene.add(key, rim, lamp, new THREE.AmbientLight(0xffffff, 0.1));

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512); // the blur hides the resolution; a quarter of the fill
  Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 2, far: 16 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.016;
  key.shadow.radius = 3;
  key.shadow.intensity = 0.55;
}

/* Every mesh of a phone casts and receives the key light's shadow. */
export function castShadows(group) {
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

/* ---------- The phone ----------
 * Screen faces +z, back faces -z, centred on the origin. `keep` collects
 * geometries, materials and textures for disposal. Back-view coordinates
 * (u, v) are millimetres from the left and top edges as you look at the back. */
export function buildPhone(THREE, key, hex, keep) {
  const s = SPECS[key] || SPECS['iphone-18'];
  const pro = s.cam === 'plateau';
  const w = s.w * MM;
  const h = s.h * MM;
  const d = s.d * MM;
  const bevel = 1.5 * MM;
  const fw = w - 2 * bevel;
  const fh = h - 2 * bevel;
  const fr = s.r * MM - bevel;
  const zf = d / 2;
  const zb = -d / 2;
  const group = new THREE.Group();
  const bx = (u) => w / 2 - u * MM;
  const by = (v) => h / 2 - v * MM;
  const add = (geo, mat, x, y, z) => {
    const mesh = new THREE.Mesh(keep(geo), mat);
    mesh.position.set(x || 0, y || 0, z || 0);
    group.add(mesh);
    return mesh;
  };

  /* Materials. Pro: anodised aluminium unibody with a frosted glass window,
   * colour-matched. iPhone 18: aluminium frame, frosted colour-infused glass
   * back, glossy camera pill. */
  const tint = new THREE.Color(hex);
  const metal = keep(new THREE.MeshPhysicalMaterial({ color: tint.clone().offsetHSL(0, 0, 0.03), metalness: 0.42, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.22 }));
  const frost = keep(new THREE.MeshPhysicalMaterial({ color: tint.clone().offsetHSL(0, -0.03, pro ? -0.005 : 0.03), metalness: 0, roughness: 0.6, clearcoat: 0.45, clearcoatRoughness: 0.55 }));
  const gloss = keep(new THREE.MeshPhysicalMaterial({ color: tint.clone().offsetHSL(0, 0, -0.03), metalness: 0.05, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const ring = keep(new THREE.MeshPhysicalMaterial({ color: tint.clone().lerp(new THREE.Color(0x2a2a2e), pro ? 0.3 : 0.12), metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide }));
  // Lenses and sensors keep their reflections low: a broad softbox would
  // otherwise wash the whole glass grey at an angle.
  const lens = keep(new THREE.MeshPhysicalMaterial({ map: keep(lensGlass(THREE)), roughness: 0.05, metalness: 0, specularIntensity: 0.6, iridescence: 0.25, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 400], envMapIntensity: 0.1 }));
  const flash = keep(new THREE.MeshPhysicalMaterial({ map: keep(flashGlass(THREE)), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }));
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.55, metalness: 0 }));
  const sensor = keep(new THREE.MeshPhysicalMaterial({ color: 0x0c0c10, roughness: 0.12, metalness: 0, clearcoat: 0.35, envMapIntensity: 0.3 }));
  const blackGlass = keep(new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 }));
  const border = 1.35 * MM;
  const dw = fw - 2 * border;
  const dh = fh - 2 * border;
  const screen = keep(new THREE.MeshPhysicalMaterial({ color: 0x020203, emissive: 0xffffff, emissiveMap: keep(lockScreen(THREE, hex, dw / dh)), emissiveIntensity: 0.92, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 }));
  const control = keep(new THREE.MeshPhysicalMaterial({ color: 0x1c1c22, roughness: 0.18, metalness: 0.4, clearcoat: 1 }));
  const band = keep(new THREE.MeshStandardMaterial({ color: tint.clone().lerp(new THREE.Color(0x8c8c8c), 0.45), roughness: 0.7, metalness: 0 }));

  /* Body: one rounded slab. Caps take the back finish, the walls the frame. */
  const body = new THREE.ExtrudeGeometry(roundRect(THREE, fw, fh, fr), {
    depth: d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6, curveSegments: 20
  });
  body.translate(0, 0, -(d - 2 * bevel) / 2);
  add(body, [pro ? metal : frost, metal]);

  /* Front: black glass, the display, the Dynamic Island. */
  add(new THREE.ShapeGeometry(roundRect(THREE, fw + 0.3 * MM, fh + 0.3 * MM, fr + 0.15 * MM), 20), blackGlass, 0, 0, zf + 0.02 * MM);
  add(fitUV(new THREE.ShapeGeometry(roundRect(THREE, dw, dh, fr - border * 0.85), 20)), screen, 0, 0, zf + 0.06 * MM);
  const diW = 0.262 * w;
  const diH = 0.075 * w;
  add(new THREE.ShapeGeometry(roundRect(THREE, diW, diH, diH / 2), 12), blackGlass, 0, dh / 2 - 2.6 * MM - diH / 2, zf + 0.1 * MM);

  /* Back details. */
  const disc = (u, v, radius, mat, zSurface) => {
    const geo = new THREE.CircleGeometry(radius * MM, 36);
    geo.rotateY(Math.PI);
    return add(geo, mat, bx(u), by(v), zSurface - 0.04 * MM);
  };
  const cameraLens = (u, v, R, zSurface, height) => {
    add(lensHousing(THREE, R * MM, height), ring, bx(u), by(v), zSurface + 0.05 * MM);
    add(lensDome(THREE, R * 0.81 * MM, height * 0.22), lens, bx(u), by(v), zSurface - height * 0.42);
  };

  if (pro) {
    /* Full-width plateau across the top of the back. */
    const k = s.w / 78;
    const pH = 0.28 * s.h * MM;
    const pbs = 0.45 * MM;
    const pDepth = 0.8 * MM;
    const inset = 0.2 * MM;
    const pw = fw - 2 * inset - 2 * pbs;
    const ph = pH - 2 * pbs;
    const plateau = new THREE.ExtrudeGeometry(roundRect(THREE, pw, ph, fr - inset - pbs, 6.5 * MM), {
      depth: pDepth, bevelEnabled: true, bevelThickness: pbs, bevelSize: pbs, bevelSegments: 4, curveSegments: 20
    });
    plateau.translate(0, fh / 2 - inset - pbs - ph / 2, zb - pDepth);
    add(plateau, metal);
    const zp = zb - pDepth - pbs;

    /* Frosted glass window below it, flush with the aluminium. */
    const gTop = fh / 2 - inset - pH - 3 * MM;
    const gBottom = -fh / 2 + 3.2 * MM;
    const win = new THREE.ShapeGeometry(roundRect(THREE, fw - 6.4 * MM, gTop - gBottom, 4.2 * MM, fr - 3.2 * MM), 20);
    win.translate(0, (gTop + gBottom) / 2, 0);
    win.rotateY(Math.PI);
    add(win, frost, 0, 0, zb - 0.03 * MM);

    /* Three lenses in a triangle; flash, microphone and LiDAR on the right. */
    const R = 8.2 * k;
    [[15.8, 14.2], [15.8, 33.6], [32.6, 23.9]].forEach(([u, v]) => cameraLens(u * k, v * k, R, zp, 1.55 * MM));
    disc(s.w - 12.5 * k, 13.6 * k, 3.25 * k, flash, zp);
    disc(s.w - 12.5 * k, 23.6 * k, 0.7 * k, dark, zp);
    disc(s.w - 12.5 * k, 33.6 * k, 3.25 * k, sensor, zp);

    /* Antenna bands through the frame. */
    const bandGeo = keep(new THREE.BoxGeometry(0.3 * MM, 0.8 * MM, d - 2 * bevel));
    [-1, 1].forEach((side) => [11, s.h - 11].forEach((v) => {
      const mesh = new THREE.Mesh(bandGeo, band);
      mesh.position.set(side * w / 2, by(v), 0);
      group.add(mesh);
    }));
  } else {
    /* Two lenses in a raised vertical pill; flash and microphone beside it. */
    const k = s.w / 71.5;
    const pw = 19.4 * k;
    const ph = 37.2 * k;
    const u0 = 6.4 * k;
    const v0 = 6.4 * k;
    const pbs = 0.4 * MM;
    const pDepth = 0.55 * MM;
    const island = new THREE.ExtrudeGeometry(roundRect(THREE, pw * MM - 2 * pbs, ph * MM - 2 * pbs, pw * MM / 2 - pbs), {
      depth: pDepth, bevelEnabled: true, bevelThickness: pbs, bevelSize: pbs, bevelSegments: 4, curveSegments: 24
    });
    island.translate(bx(u0 + pw / 2), by(v0 + ph / 2), zb - pDepth);
    add(island, gloss);
    const zp = zb - pDepth - pbs;
    const R = 7 * k;
    cameraLens(u0 + pw / 2, v0 + pw / 2, R, zp, 1.2 * MM);
    cameraLens(u0 + pw / 2, v0 + ph - pw / 2, R, zp, 1.2 * MM);
    disc(u0 + pw + 5.4 * k, 12.4 * k, 2.9 * k, flash, zb);
    disc(u0 + pw + 5.4 * k, 21 * k, 0.6 * k, dark, zb);
  }

  /* Buttons. Seen from the front: Action button and volume on the left,
   * side button and Camera Control on the right. */
  const kv = s.h / 163.4;
  const button = (side, v, len, mat, flat) => {
    const geo = new THREE.CapsuleGeometry(1.1 * MM, Math.max(0.2, len - 2.2) * MM, 4, 12);
    const mesh = add(geo, mat, side * w / 2, h / 2 - v * kv * MM, 0);
    mesh.scale.x = flat;
  };
  button(-1, 32.5, 8.5, metal, 0.44);
  button(-1, 49.5, 12.5, metal, 0.44);
  button(-1, 64.5, 12.5, metal, 0.44);
  button(1, 55, 18.5, metal, 0.44);
  button(1, 110, 12.5, control, 0.22);

  /* Bottom edge: USB-C port and speaker holes. */
  const holes = [roundRect(THREE, 8.6 * MM, 2.6 * MM, 1.3 * MM)];
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 6; i++) {
      const hole = new THREE.Shape();
      hole.absarc(side * (7.6 + i * 2.15) * MM, 0, 0.52 * MM, 0, TAU, false);
      holes.push(hole);
    }
  });
  const port = new THREE.ShapeGeometry(holes, 10);
  port.rotateX(Math.PI / 2);
  add(port, dark, 0, -h / 2 - 0.03 * MM, 0);

  return { group, w, h, spec: s };
}

/* Where the fit check looks on a phone: heights (world units, phone centred
 * on the origin, upright) of the camera, the side button and the port. */
export function featureHeights(spec) {
  const h = spec.h * MM;
  const camera = spec.cam === 'plateau' ? 24 * (spec.w / 78) : 25 * (spec.w / 71.5);
  return { camera: h / 2 - camera * MM, buttons: h / 2 - 55 * (spec.h / 163.4) * MM, port: -h / 2 + 1.5 * MM };
}

/* The case's finish. Clear: a glossy, faintly warm see-through shell, so the
 * phone's own colour and the fit show through. Solid: soft-touch colour. */
export function caseMaterial(THREE, finish, hex) {
  if (finish !== 'clear') {
    const tint = new THREE.Color(hex || '#c4302b');
    return new THREE.MeshPhysicalMaterial({
      color: tint, roughness: 0.52, metalness: 0, sheen: 0.6, sheenRoughness: 0.5,
      sheenColor: tint.clone().lerp(new THREE.Color(0xffffff), 0.45), clearcoat: 0.25, clearcoatRoughness: 0.4
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: 0xfff6ea, roughness: 0.14, metalness: 0, transparent: true, opacity: CLEAR_OPACITY,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.5, depthWrite: false
  });
}

/* ---------- The case ----------
 * A fitted case for buildPhone's phone of the same key, on the same axes
 * (screen +z), so it can be parented to the phone. A shell 1.3 mm thick with
 * 0.35 mm of clearance: walls that stand 0.9 mm proud of the screen, a back
 * with a cut-out round the cameras and a raised bumper round that, and covers
 * over the side buttons. Every mesh shares `mat`. */
export function buildCase(THREE, key, mat, keep) {
  const s = SPECS[key] || SPECS['iphone-18'];
  const pro = s.cam === 'plateau';
  const w = s.w * MM;
  const h = s.h * MM;
  const d = s.d * MM;
  const bevel = 1.5 * MM; // the phone's edge bevel
  const fw = w - 2 * bevel;
  const fh = h - 2 * bevel;
  const fr = s.r * MM - bevel;
  const gap = 0.35 * MM;
  const wall = 1.3 * MM;
  const lip = 0.9 * MM;
  const eb = 0.45 * MM; // edge rounding
  const iw = w + 2 * gap;
  const ih = h + 2 * gap;
  const ir = s.r * MM + gap;
  const zb = -d / 2;
  const zOut = zb - gap - wall; // outside face of the back
  const group = new THREE.Group();
  const add = (geo, z) => {
    const mesh = new THREE.Mesh(keep(geo), mat);
    mesh.position.z = z;
    group.add(mesh);
    return mesh;
  };
  const bx = (u) => w / 2 - u * MM;
  const by = (v) => h / 2 - v * MM;

  /* A ring of material between two rounded rectangles, extruded `depth` along
   * z with rounded edges. The extrude bevel grows the solid by `eb` on both
   * contours, so they start that much inside the sizes asked for. */
  const ring = (o, i, depth) => {
    const shape = roundRect(THREE, o.w - 2 * eb, o.h - 2 * eb, o.rt - eb, o.rb - eb, o.x, o.y);
    shape.holes.push(roundRect(THREE, i.w + 2 * eb, i.h + 2 * eb, i.rt + eb, i.rb + eb, i.x, i.y));
    return new THREE.ExtrudeGeometry(shape, {
      depth: depth - 2 * eb, bevelEnabled: true, bevelThickness: eb, bevelSize: eb, bevelSegments: 3, curveSegments: 20
    });
  };

  /* Walls, from the outside of the back to the lip round the screen. */
  const span = d / 2 + lip - zOut;
  add(ring(
    { w: iw + 2 * wall, h: ih + 2 * wall, rt: ir + wall, rb: ir + wall, x: 0, y: 0 },
    { w: iw, h: ih, rt: ir, rb: ir, x: 0, y: 0 },
    span
  ), zOut + eb);

  /* The camera cut-out. Pro: round the whole plateau. iPhone 18: round the
   * pill and the flash beside it. */
  let hole;
  let bumpDepth;
  if (pro) {
    const inset = 0.2 * MM;
    const pH = 0.28 * s.h * MM;
    const m = 0.6 * MM;
    hole = { w: fw - 2 * inset + 2 * m, h: pH + 2 * m, rt: fr - inset + m, rb: 6.5 * MM + m, x: 0, y: fh / 2 - inset - pH / 2 };
    bumpDepth = 1.55 * MM;
  } else {
    const k = s.w / 71.5;
    const u0 = 6.4 * k;
    const v0 = 6.4 * k;
    const pw = 19.4 * k;
    const ph = 37.2 * k;
    const uL = u0 - 0.9;
    const uR = u0 + pw + 8.3 * k + 1.4;
    const vT = v0 - 0.9;
    const vB = v0 + ph + 0.9;
    const r = Math.min(pw / 2 + 0.9, (uR - uL) / 2) * MM;
    hole = { w: (uR - uL) * MM, h: (vB - vT) * MM, rt: r, rb: r, x: bx((uL + uR) / 2), y: by((vT + vB) / 2) };
    bumpDepth = 0.85 * MM;
  }

  /* The back: a plate inside the walls with the cut-out through it. */
  const plate = roundRect(THREE, iw + 0.2 * MM, ih + 0.2 * MM, ir + 0.1 * MM);
  plate.holes.push(roundRect(THREE, hole.w, hole.h, hole.rt, hole.rb, hole.x, hole.y));
  add(new THREE.ExtrudeGeometry(plate, { depth: wall, bevelEnabled: false, curveSegments: 20 }), zOut);

  /* A raised bumper round the cut-out, standing back past the lenses. */
  const b = 1 * MM;
  add(ring(
    { w: hole.w + 2 * b, h: hole.h + 2 * b, rt: hole.rt + b, rb: hole.rb + b, x: hole.x, y: hole.y },
    hole,
    bumpDepth + 0.2 * MM
  ), zOut - bumpDepth + eb);

  /* Button covers: soft bumps on the outside of the walls. */
  const kv = s.h / 163.4;
  const xo = iw / 2 + wall;
  [[-1, 32.5, 8.5], [-1, 49.5, 12.5], [-1, 64.5, 12.5], [1, 55, 18.5]].forEach(([side, v, len]) => {
    const geo = keep(new THREE.CapsuleGeometry(1.35 * MM, Math.max(0.2, len - 2.2) * MM, 4, 12));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(side * xo, h / 2 - v * kv * MM, 0);
    mesh.scale.x = 0.42;
    group.add(mesh);
  });

  return group;
}

/* ---------- Section ---------- */

const FIT_COLORS = ['#9fb8b1', '#d6d3cc', '#5b1f2a']; // iPhone 18, 18 Pro, 18 Pro Max when no phone setting names them

async function mount(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const $ = (selector) => root.querySelector(selector);
  const stage = $('[data-cvps-stage]');
  const hero = $('[data-cvps-hero]');
  const info = $('[data-cvps-info]');
  const scanner = $('[data-cvps-scanner]');
  const scanHead = $('.cvps__scan-head');
  const scanFoot = $('.cvps__scan-foot');
  const frame = $('[data-cvps-frame]');
  const beam = $('[data-cvps-beam]');
  const stamp = $('[data-cvps-stamp]');
  const statement = $('[data-cvps-statement]');
  const checksEl = $('[data-cvps-checks]');
  const fitEl = $('[data-cvps-fit]');
  const slot = $('[data-cvps-slot]');
  const snapEl = $('[data-cvps-snap]');
  const statusEl = $('[data-cvps-status]');
  const jump = $('[data-cvps-jump]');
  const pauseButton = $('[data-cvps-pause]');
  const pauseLabel = $('[data-cvps-pause-label]');
  const dataEl = $('[data-cvps-data]');
  if (!gsap || !ScrollTrigger || !stage || !hero || !info || !scanner || !frame || !beam || !fitEl || !slot || !dataEl) return;

  let config;
  try { config = JSON.parse(dataEl.textContent); } catch (error) { return; }
  const phoneData = (config.phones || []).slice(0, 2);
  const fitData = config.fit || [];
  const modelInputs = [...fitEl.querySelectorAll('[data-cvps-model]')];
  if (phoneData.length < 2 || !fitData.length || fitData.length !== modelInputs.length) return;

  let THREE;
  try { THREE = await loadThree(); } catch (error) { return; }
  if (!root.isConnected) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.domElement.className = 'cvps__canvas';

  const disposables = [];
  const keep = (thing) => { disposables.push(thing); return thing; };

  const scene = new THREE.Scene();
  const env = studioEnvironment(THREE, renderer);
  scene.environment = env;
  addLights(THREE, scene, renderer);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 60);

  /* The scanned pair. */
  const phones = phoneData.map((p, i) => {
    const built = buildPhone(THREE, p.body, p.color || (i ? '#5b1f2a' : '#9fb8b1'), keep);
    castShadows(built.group);
    scene.add(built.group);
    return built;
  });

  /* The fitting room: one phone per model, each wearing its own case. */
  const caseInfo = config.case || {};
  const solidCase = caseInfo.finish !== 'clear';
  const fits = fitData.map((m, i) => {
    const built = buildPhone(THREE, m.body, m.color || FIT_COLORS[i], keep);
    castShadows(built.group);
    const mat = keep(caseMaterial(THREE, caseInfo.finish, caseInfo.color));
    const shell = buildCase(THREE, m.body, mat, keep);
    if (solidCase) castShadows(shell);
    built.group.add(shell);
    scene.add(built.group);
    return { ...built, shell, mat, st: { show: 0, lift: 0, pick: 0, out: 0, spin: 0, fit: 0, kick: 0 } };
  });

  /* Compile every shader now (in parallel where the browser can), with the
   * phones and cases visible but tiny. Left to the first frame they appear
   * in, the physical materials stall the page for seconds mid-scroll. One
   * tiny draw then compiles the shadow pass too. */
  [...phones, ...fits].forEach((p) => p.group.scale.setScalar(0.0001));
  try { await renderer.compileAsync(scene, camera); } catch (error) { /* compiles on first draw instead */ }
  renderer.setSize(2, 2, false);
  renderer.render(scene, camera);
  if (!root.isConnected) {
    disposables.forEach((thing) => thing.dispose && thing.dispose());
    env.dispose();
    renderer.dispose();
    return;
  }

  /* ---------- State ---------- */
  const prog = { target: 0, value: 0 }; // opening → scanner, from scroll
  const amb = { float: 1 }; // ambient bob and sway (0 in the scanner)
  const intro = [{ v: 0 }, { v: 0 }];
  const scan = [{ spin: 0, size: 1 }, { spin: 0, size: 1 }];
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const view = { visW: 1, visH: 1 };
  const beamState = { p: 0 }; // the beam's way down the frame, 0..1
  const drag = { rot: 0, tilt: 0 }; // the picked phone, turned by hand
  const rowPx = []; // each fitting-room phone's left and right edge on screen while they stand in a row
  let K0 = [];
  let K1 = [];
  let K2 = [];
  let pin = null; // the scanner's pinning ScrollTrigger
  let scanTl = null; // the scan, played on the way in and rewound on the way back
  let clock = 0;
  let paused = false;
  let running = false;
  let inView = false;
  let fitNear = false;
  let sel = -1; // the picked model, -1 before the first pick
  let hovered = -1;

  function playScan() { scanTl.timeScale(1).play(); }
  function rewindScan() { scanTl.timeScale(2.2).reverse(); }
  function finishScan() { scanTl.timeScale(1).reversed(false).progress(1); }

  const checks = checksEl ? [...checksEl.querySelectorAll('[data-cvps-check]')] : [];

  /* ---------- Layout: camera fit, poses, the frame and the fit check ---------- */
  function layout() {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const narrow = aspect < NARROW;
    const [A, B] = phones;
    const pairW = A.w + GAP + B.w;
    const pairH = Math.max(A.h, B.h);
    const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const fillH = narrow ? 0.46 : 0.6;
    const fillW = narrow ? 0.8 : 0.62;
    const padX = narrow ? 0.22 : 0.5;
    const padY = narrow ? 0.3 : 0.42;
    if (checksEl && narrow) root.classList.add('cvps--checks-low');
    let dist = Math.max(pairH / (fillH * t), pairW / (fillW * t * aspect));
    // Narrow screens stack the scanner's heading above the frame and the
    // barcode (and the fit check) below it; keep the frame, and so the
    // phones, in the band between.
    if (narrow && scanHead && scanFoot) {
      const top = scanHead.offsetTop + scanHead.offsetHeight + 14;
      const footTop = checksEl ? Math.min(scanFoot.offsetTop, checksEl.offsetTop) : scanFoot.offsetTop;
      const bottom = footTop - 14;
      const room = 2 * Math.min(h / 2 - top, bottom - h / 2);
      if (room > 120) dist = Math.max(dist, ((pairH + padY) * h) / (t * room));
    }
    camera.aspect = aspect;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const visH = t * dist;
    const visW = visH * aspect;
    const px = h / visH;
    view.visW = visW;
    view.visH = visH;

    root.style.setProperty('--cvps-frame-w', Math.round((pairW + padX) * px) + 'px');
    root.style.setProperty('--cvps-frame-h', Math.round((pairH + padY) * px) + 'px');

    /* Fit check: each line level with its part of the phones (whichever of
     * the two the beam reaches first). Where the gutter beside the frame is
     * too narrow for the labels, they sit under it instead. */
    if (checksEl) {
      const fA = featureHeights(A.spec);
      const fB = featureHeights(B.spec);
      checks.forEach((el) => {
        const key = el.dataset.cvpsCheck;
        if (!(key in fA)) return;
        const at = clamp(0.5 - Math.max(fA[key], fB[key]) / (pairH + padY), 0.03, 0.97);
        el.dataset.at = at.toFixed(3);
        el.style.setProperty('--cvps-at', at.toFixed(3));
      });
      if (!narrow) root.classList.toggle('cvps--checks-low', (scanner.clientWidth - (pairW + padX) * px) / 2 < 200);
    }

    // Scanner: side by side, backs to the camera, centred in the frame.
    K2 = [
      { x: -pairW / 2 + A.w / 2, y: 0, z: 0, ry: BACK, rz: 0, s: 1 },
      { x: pairW / 2 - B.w / 2, y: 0, z: 0, ry: BACK, rz: 0, s: 1 }
    ];
    if (narrow) {
      K0 = [
        { x: -0.4, y: -visH * 0.05, z: -0.5, ry: BACK + 0.42, rz: 0.13, s: 1.24 },
        { x: 0.32, y: -visH * 0.07, z: 0.25, ry: BACK - 0.34, rz: -0.1, s: 1.24 }
      ];
      K1 = [
        { x: -visW * 0.21, y: visH * 0.2, z: -0.3, ry: BACK + 0.7, rz: 0.2, s: 0.66 },
        { x: visW * 0.21, y: visH * 0.17, z: 0, ry: BACK - 0.7, rz: -0.2, s: 0.66 }
      ];
    } else {
      // Opening: overlapped tightly so the headline's outer letters read either side.
      const side = Math.min(visW * 0.33, 2.4);
      K0 = [
        { x: -0.3, y: -0.05, z: -0.55, ry: BACK + 0.44, rz: 0.15, s: 0.96 },
        { x: 0.3, y: 0.04, z: 0.3, ry: BACK - 0.34, rz: -0.11, s: 0.96 }
      ];
      K1 = [
        { x: -side, y: 0.16, z: -0.2, ry: BACK + 0.72, rz: 0.22, s: 0.86 },
        { x: side, y: -0.12, z: 0, ry: BACK - 0.72, rz: -0.2, s: 0.86 }
      ];
    }
    place();
    placeFit();
    renderer.render(scene, camera);
  }

  /* ---------- Per-frame pose: the scanned pair ---------- */
  function place() {
    const p = prog.value;
    const late = p >= 0.5;
    const t = smooth(late ? (p - 0.5) * 2 : p * 2);
    const settle = smooth(p);
    for (let i = 0; i < 2; i++) {
      const a = late ? K1[i] : K0[i];
      const b = late ? K2[i] : K1[i];
      const g = phones[i].group;
      const shown = intro[i].v;
      const sc = scan[i];
      const f = amb.float;
      const bob = Math.sin(clock * 1.3 + i * 2.1) * 0.05 * f;
      const sway = Math.sin(clock * 0.45 + i * 2.6) * 0.3 * f * (1 - settle);
      const flip = smooth(span(p, i * 0.07, 0.93 + i * 0.07)) * TAU;
      const lean = 1 - settle;
      g.position.set(mix(a.x, b.x, t), mix(a.y, b.y, t) + bob - (1 - shown) * 0.7, mix(a.z, b.z, t));
      g.rotation.set(
        flip + ptr.y * 0.09 * lean,
        mix(a.ry, b.ry, t) + sway + sc.spin * TAU + (1 - shown) * 1.3 + ptr.x * 0.16 * lean,
        mix(a.rz, b.rz, t) + Math.sin(clock * 0.8 + i) * 0.03 * f
      );
      const size = mix(a.s, b.s, t) * shown * sc.size;
      g.scale.setScalar(Math.max(size, 0.0001));
      g.visible = size > 0.002;
    }
  }

  /* ---------- Per-frame pose: the fitting room ----------
   * The phones live in the slot, a box in the page: each frame reads where
   * the slot is on screen and stands them there on the z = 0 plane, so they
   * scroll with the layout. Before a pick they stand in a row at true
   * relative size; the picked one steps forward to fill the slot, the others
   * drop away, and its case slides on. */
  function placeFit() {
    const sr = stage.getBoundingClientRect();
    const r = slot.getBoundingClientRect();
    if (!fitNear || !r.height || !sr.height || r.bottom < sr.top || r.top > sr.bottom) {
      fits.forEach((f) => { f.group.visible = false; });
      rowPx.length = 0;
      return;
    }
    const u = view.visH / sr.height; // world units per CSS pixel
    const midX = sr.left + sr.width / 2;
    const cx = (r.left + r.width / 2 - midX) * u;
    const cy = (sr.top + sr.height / 2 - r.top - r.height / 2) * u;
    const sw = r.width * u;
    const sh = r.height * u;
    const gap = 0.3;
    const rowW = fits.reduce((sum, f) => sum + f.w, 0) + gap * (fits.length - 1);
    const rowH = Math.max(...fits.map((f) => f.h));
    const ls = Math.min((sw * 0.9) / rowW, (sh * 0.7) / rowH);
    let x = cx - (rowW * ls) / 2;
    fits.forEach((f, i) => {
      const st = f.st;
      const g = f.group;
      const lx = x + (f.w * ls) / 2;
      rowPx[i] = [midX + x / u, midX + (x + f.w * ls) / u];
      x += (f.w + gap) * ls;
      const fs = Math.min((sh * 0.76) / f.h, (sw * 0.58) / f.w);
      const k = st.pick;
      const lift = st.lift * (1 - k);
      const shown = st.show;
      const gone = st.out;
      const bob = Math.sin(clock * 1.2 + i * 1.9) * 0.02 * sh;
      const size = mix(ls * (1 + lift * 0.05), fs, k) * shown * (1 - gone) * (1 + st.kick * 0.035);
      g.position.set(
        mix(lx, cx, k),
        mix(cy + lift * sh * 0.05, cy, k) + bob - (1 - shown) * sh * 0.5 - gone * sh * 0.22,
        0
      );
      g.rotation.set(
        mix(0.06, 0.12 + drag.tilt, k) + ptr.y * 0.07 + st.kick * 0.12,
        mix(BACK + (i - 1) * 0.32 - lift * 0.5, BACK + 0.45 + drag.rot, k)
          + st.spin * TAU + Math.sin(clock * 0.5 + i * 2.3) * 0.07 + gone * 1.5 + (1 - shown) * 1.1 + ptr.x * 0.16,
        Math.sin(clock * 0.8 + i) * 0.02 + gone * 0.35
      );
      g.scale.setScalar(Math.max(size, 0.0001));
      g.visible = size > 0.002;
      placeCase(f);
    });
  }

  /* The case comes up from below, squares up behind the phone's back and
   * presses on. `fit` runs 0..1; the press is its last 40 %. */
  function placeCase(f) {
    const v = f.st.fit;
    const shell = f.shell;
    shell.visible = v > 0.001;
    if (!shell.visible) return;
    const a = smooth(span(v, 0, 0.6));
    const b = smooth(span(v, 0.6, 1));
    shell.position.set(0, -(1 - a) * f.h * 1.15, -(1 - b) * 0.42);
    shell.rotation.set(-(1 - a) * 0.7, 0, (1 - a) * 0.45);
    shell.scale.setScalar(0.8 + 0.2 * a);
    if (!solidCase) f.mat.opacity = CLEAR_OPACITY * a;
  }

  function tick(time, deltaMs) {
    const dt = Math.min(0.05, (deltaMs || 16) / 1000);
    if (!paused) clock += dt;
    // A jump straight over the scanner (End key, an anchor, a hard fling) can
    // skip its callbacks; the scanned state follows the scroll position.
    if (pin) {
      const y = window.scrollY;
      if (y > pin.end && (scanTl.progress() < 1 || scanTl.reversed())) finishScan();
      else if (y < pin.start && scanTl.progress() > 0 && !scanTl.reversed()) rewindScan();
    }
    prog.value += (prog.target - prog.value) * (1 - Math.exp(-dt * 6));
    ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 4));
    ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 4));
    place();
    placeFit();
    renderer.render(scene, camera);
  }

  function sync() {
    const want = inView && !document.hidden;
    if (want === running) return;
    running = want;
    if (running) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  }

  /* ---------- Go 3D ---------- */
  // A visitor already below the section (three.js arrived late) keeps their
  // place: note where the section they are reading sits on screen, and put it
  // back once the page below has been re-measured (see the refresh below).
  const wasAbove = root.getBoundingClientRect().bottom < 0;
  const reading = wasAbove && document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  const anchor = reading && reading.closest('.shopify-section');
  const anchorTop = anchor ? anchor.getBoundingClientRect().top : 0;
  root.classList.add('is-3d');
  stage.prepend(renderer.domElement);
  if (pauseButton) pauseButton.hidden = false;
  layout();

  const ro = new ResizeObserver(() => layout());
  ro.observe(stage);

  const triggers = [];
  const tweens = [];

  /* Scroll → pose, opening to scanner. */
  triggers.push(ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    endTrigger: scanner,
    end: 'top top',
    onUpdate: (self) => { prog.target = self.progress; },
    onRefresh: (self) => { prog.target = self.progress; }
  }));

  /* Opening: the phones pop up and the headline rises from its mask. */
  const rise = hero.querySelectorAll('[data-cvps-rise]');
  const heroFades = hero.querySelectorAll('[data-cvps-fade]');
  const introTl = gsap.timeline({ paused: true })
    .to(intro[0], { v: 1, duration: 1.1, ease: 'back.out(1.5)' }, 0.1)
    .to(intro[1], { v: 1, duration: 1.1, ease: 'back.out(1.5)' }, 0.22)
    .fromTo(rise, { yPercent: 105 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.09 }, 0)
    .fromTo(heroFades, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, clearProps: 'transform' }, 0.45);
  tweens.push(introTl);
  triggers.push(ScrollTrigger.create({ trigger: root, start: 'top 72%', once: true, onEnter: () => introTl.play() }));

  /* Middle: tags drop in; the statement's words ink in as it is read. */
  const tags = info.querySelectorAll('.cvps__tags li');
  if (tags.length) {
    tweens.push(gsap.fromTo(tags, { y: -16, opacity: 0, rotation: (i) => (i % 2 ? 4 : -4) }, {
      y: 0, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(2.2)', stagger: 0.06,
      scrollTrigger: { trigger: info, start: 'top 70%', toggleActions: 'play none none reverse' }
    }));
  }
  let split = null;
  if (statement && window.SplitText) {
    split = new window.SplitText(statement, { type: 'words', wordsClass: 'cvps__word' });
    tweens.push(gsap.fromTo(split.words, { opacity: 0.16 }, {
      opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 42%', scrub: true }
    }));
  }

  /* Scanner: pinned for one screen; the scan plays once on the way in and
   * rewinds on the way back. The beam is a proxy (beamState) so the fit
   * check can tick each line as the beam reaches its height, and untick it
   * on the rewind. */
  const corners = frame.querySelectorAll('i');
  const beamLine = beam.querySelector('i');
  const checkIcons = checks.map((el) => el.querySelector('.cv-ico'));
  const checkBoxes = checks.map((el) => el.querySelector('.cvps__check-box'));
  const checkDraws = checks.map((el) => el.querySelector('.cv-ico__draw'));
  const canDraw = Boolean(window.DrawSVGPlugin);
  if (checkIcons.length) gsap.set(checkIcons.filter(Boolean), { opacity: 0, scale: 0.3 });
  function drawBeam() {
    beamLine.style.top = (beamState.p * 100).toFixed(2) + '%';
    checks.forEach((el, k) => {
      const hit = beamState.p >= Number(el.dataset.at || 1);
      if (hit === el.classList.contains('is-hit')) return;
      el.classList.toggle('is-hit', hit);
      const icon = checkIcons[k];
      if (!icon) return;
      gsap.killTweensOf([icon, checkBoxes[k], checkDraws[k]].filter(Boolean));
      if (hit) {
        gsap.fromTo(icon, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' });
        if (checkBoxes[k]) gsap.fromTo(checkBoxes[k], { scale: 1.4 }, { scale: 1, duration: 0.5, ease: 'back.out(2.5)' });
        if (canDraw && checkDraws[k]) gsap.fromTo(checkDraws[k], { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.35, ease: 'power2.out' });
      } else {
        gsap.to(icon, { opacity: 0, scale: 0.3, duration: 0.2, ease: 'power2.in' });
      }
    });
  }
  scanTl = gsap.timeline({ paused: true })
    .to(amb, { float: 0, duration: 0.4, ease: 'power2.out' }, 0)
    .to(scan[0], { spin: 1, duration: 1.15, ease: 'power2.inOut' }, 0.1)
    .to(scan[1], { spin: 1, duration: 1.15, ease: 'power2.inOut' }, 0.22)
    .set(beam, { visibility: 'visible' }, 0.25)
    .fromTo(beamLine, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' }, 0.25)
    .fromTo(beamState, { p: 0 }, { p: 1, duration: 0.95, ease: 'sine.inOut', onUpdate: drawBeam }, 0.25)
    .to(beamLine, { opacity: 0, duration: 0.18 }, 1.08)
    .set(beam, { visibility: 'hidden' }, 1.3)
    .to(corners, { borderColor: '#c4302b', duration: 0.09, yoyo: true, repeat: 3, ease: 'none' }, 1.02)
    .to(scan[0], { size: 0, duration: 0.5, ease: 'power2.in' }, 1.35)
    .to(scan[1], { size: 0, duration: 0.5, ease: 'power2.in' }, 1.45)
    .to(frame, { scale: 0, duration: 0.5, ease: 'power2.in' }, 1.95);
  // The fit check's lead-ins point at the frame; they go with it.
  if (checksEl) scanTl.fromTo(checksEl, { '--cvps-lead': 1 }, { '--cvps-lead': 0, duration: 0.35, ease: 'none' }, 1.95);
  if (stamp) {
    scanTl.fromTo(stamp, { autoAlpha: 0, scale: 1.8, rotation: -18 }, { autoAlpha: 1, scale: 1, rotation: -6, duration: 0.5, ease: 'back.out(2.4)' }, 2.15);
  }
  tweens.push(scanTl);

  pin = ScrollTrigger.create({
    trigger: scanner,
    start: 'top top',
    end: () => '+=' + window.innerHeight,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onEnter: playScan,
    // Past the pinned screen the phones must already be in the scanner,
    // or they would float over the fitting room.
    onLeave: () => { if (scanTl.progress() < 1 || scanTl.reversed()) finishScan(); },
    onLeaveBack: rewindScan
  });
  triggers.push(pin);

  /* ---------- Fitting room ---------- */
  const chips = modelInputs.map((input) => input.closest('[data-cvps-model-chip]') || input);
  const panels = modelInputs.map((input) => fitEl.querySelector('[data-cvps-panel="' + input.value + '"]'));
  const fitTitle = fitEl.querySelector('[data-cvps-fit-title]');
  const fitIns = [...fitEl.querySelectorAll('[data-cvps-fit-in]')];
  let fitSplit = null;
  if (fitTitle && window.SplitText) fitSplit = new window.SplitText(fitTitle, { type: 'words', mask: 'words', wordsClass: 'cvps__fit-word' });

  /* Arrival: the heading rises word by word, the model chips are dealt and
   * the three phones pop up into their row. Scrolling back up sends them
   * down again. */
  const fitTl = gsap.timeline({ paused: true });
  if (fitSplit) fitTl.fromTo(fitSplit.words, { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, 0);
  if (fitIns.length) fitTl.fromTo(fitIns, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, 0.12);
  fitTl
    .fromTo(chips, { y: 24, opacity: 0, rotation: (k) => [-3, 2, -2][k % 3] }, { y: 0, opacity: 1, rotation: 0, duration: 0.75, ease: 'back.out(2)', stagger: 0.07 }, 0.25)
    .to(fits.map((f) => f.st), { show: 1, duration: 1.1, ease: 'back.out(1.3)', stagger: 0.12 }, 0.1);
  tweens.push(fitTl);
  triggers.push(ScrollTrigger.create({
    trigger: fitEl,
    start: 'top 75%',
    onEnter: () => fitTl.timeScale(1).play(),
    onLeaveBack: () => fitTl.timeScale(1.6).reverse()
  }));
  // Card photos sit in hidden panels, where lazy images never start; fetch
  // them once the shopper is on their way to the fitting room.
  const cardImgs = [...fitEl.querySelectorAll('.cvps__card-img')];
  triggers.push(ScrollTrigger.create({
    trigger: fitEl,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      fitNear = self.isActive;
      if (fitNear) cardImgs.splice(0).forEach((img) => { img.loading = 'eager'; });
    }
  }));

  /* Hovering a chip (or a phone in the row) lifts that phone and turns it
   * a little toward the shopper. */
  function hoverFit(i) {
    if (i === hovered) return;
    hovered = i;
    slot.classList.toggle('is-hover', sel < 0 && i >= 0);
    if (sel >= 0) return;
    fits.forEach((f, j) => gsap.to(f.st, { lift: j === i ? 1 : 0, duration: 0.5, ease: 'power3.out', overwrite: 'auto' }));
  }

  /* The click as the case seats: the phone kicks, a ring goes out behind it. */
  function snap(i) {
    const st = fits[i].st;
    gsap.timeline()
      .to(st, { kick: 1, duration: 0.08, ease: 'power2.out' })
      .to(st, { kick: 0, duration: 1, ease: 'elastic.out(1, 0.32)' });
    if (snapEl) gsap.fromTo(snapEl, { scale: 0.4, opacity: 0.85 }, { scale: 1.45, opacity: 0, duration: 0.75, ease: 'power2.out' });
  }

  /* The picked model's panel (shown by CSS :has): the count rolls up, the
   * cards are dealt, and the live region reads the result. */
  let panelTweens = [];
  function showPanel(i, instant) {
    panelTweens.forEach((tween) => tween.kill());
    panelTweens = [];
    const panel = panels[i];
    if (!panel) return;
    const textEl = panel.querySelector('[data-cvps-status-text]');
    if (statusEl && textEl) statusEl.textContent = textEl.dataset.cvpsStatusText;
    if (instant) return;
    const lines = panel.querySelectorAll('.cvps__fit-count, [data-cvps-fit-cta]');
    const cards = panel.querySelectorAll('[data-cvps-card]');
    const countEl = panel.querySelector('[data-cvps-count]');
    panelTweens.push(gsap.fromTo(lines, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.12, delay: 0.1, clearProps: 'transform,opacity' }));
    if (cards.length) {
      panelTweens.push(gsap.fromTo(cards, { y: 42, opacity: 0, rotation: (k) => (k - 1) * 6 }, {
        y: 0, opacity: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.5)', stagger: 0.09, delay: 0.28, clearProps: 'transform,opacity'
      }));
    }
    if (countEl) {
      const n = Number(countEl.dataset.cvpsCount) || 0;
      const roll = { v: 0 };
      countEl.textContent = '0';
      panelTweens.push(gsap.to(roll, {
        v: n, duration: 0.9, delay: 0.15, ease: 'power2.out',
        onUpdate: () => { countEl.textContent = String(Math.round(roll.v)); },
        onComplete: () => { countEl.textContent = String(n); },
        onInterrupt: () => { countEl.textContent = String(n); }
      }));
    }
  }

  let chooseTl = null;
  function choose(i, instant) {
    if (i === sel || !fits[i]) return;
    const first = sel < 0;
    sel = i;
    root.classList.add('is-picked');
    slot.classList.remove('is-hover');
    hovered = -1;
    if (chooseTl) chooseTl.kill();
    gsap.killTweensOf(drag);
    drag.rot = 0;
    drag.tilt = 0;
    const me = fits[i].st;
    if (instant) {
      fits.forEach((f, j) => {
        gsap.killTweensOf(f.st, 'lift,pick,out,spin,fit,kick');
        Object.assign(f.st, j === i ? { pick: 1, out: 0, fit: 1, spin: 0, lift: 0, kick: 0 } : { out: 1, lift: 0 });
      });
      showPanel(i, true);
      return;
    }
    const tl = (chooseTl = gsap.timeline());
    fits.forEach((f, j) => {
      if (j !== i) tl.to(f.st, { out: 1, lift: 0, duration: 0.55, ease: 'power3.in' }, 0);
    });
    if (first) {
      // From the row: it steps forward to fill the slot with one full turn.
      tl.to(me, { pick: 1, lift: 0, duration: 1.1, ease: 'expo.inOut' }, 0.1)
        .fromTo(me, { spin: 0 }, { spin: 1, duration: 1.2, ease: 'power3.inOut' }, 0.1);
    } else {
      // Swapping models: the old one spins away, the new one spins in on its spot.
      tl.set(me, { pick: 1, fit: 0, lift: 0, spin: -0.4, out: 1 }, 0.2)
        .to(me, { out: 0, spin: 0, duration: 0.9, ease: 'expo.out' }, 0.25);
    }
    tl.fromTo(me, { fit: 0 }, { fit: 1, duration: 0.85, ease: 'power2.inOut', immediateRender: false }, first ? 0.95 : 0.7)
      .call(snap, [i]);
    showPanel(i, false);
  }

  function pickInput(i) {
    const input = modelInputs[i];
    if (!input || input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const onModelChange = (e) => {
    const i = modelInputs.indexOf(e.target);
    if (i < 0) return;
    const face = e.target.nextElementSibling;
    if (face) gsap.fromTo(face, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' });
    choose(i, false);
  };
  fitEl.addEventListener('change', onModelChange);

  const chipEnter = chips.map((chip, i) => () => hoverFit(i));
  const chipLeave = () => hoverFit(-1);
  chips.forEach((chip, i) => {
    chip.addEventListener('pointerenter', chipEnter[i]);
    chip.addEventListener('pointerleave', chipLeave);
  });
  modelInputs.forEach((input, i) => {
    input.addEventListener('focus', chipEnter[i]);
    input.addEventListener('blur', chipLeave);
  });

  /* The slot: in the row, point at a phone and click to pick it; once one
   * is picked, drag sideways to turn it (it springs back). Vertical swipes
   * stay with the page (touch-action: pan-y in the CSS). */
  const rowIndexAt = (x) => rowPx.findIndex((edge) => edge && x >= edge[0] - 12 && x <= edge[1] + 12);
  let press = null;
  const onSlotDown = (e) => {
    if (e.button) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, rot: drag.rot, tilt: drag.tilt };
  };
  const onSlotMove = (e) => {
    if (press && e.pointerId === press.id) {
      const dx = e.clientX - press.x;
      const dy = e.clientY - press.y;
      if (!press.moved && sel >= 0 && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        press.moved = true;
        gsap.killTweensOf(drag);
        try { slot.setPointerCapture(e.pointerId); } catch (error) { /* already released */ }
        slot.classList.add('is-dragging');
      }
      if (press.moved) {
        drag.rot = press.rot + dx * 0.011;
        drag.tilt = clamp(press.tilt + dy * 0.004, -0.45, 0.45);
      }
      return;
    }
    if (sel < 0 && e.pointerType === 'mouse') hoverFit(rowIndexAt(e.clientX));
  };
  const onSlotUp = (e) => {
    if (!press || e.pointerId !== press.id) return;
    const was = press;
    press = null;
    slot.classList.remove('is-dragging');
    if (was.moved) {
      drag.rot = Math.atan2(Math.sin(drag.rot), Math.cos(drag.rot));
      gsap.to(drag, { rot: 0, tilt: 0, duration: 1.6, ease: 'elastic.out(1, 0.4)' });
    } else if (e.type === 'pointerup' && sel < 0) {
      const i = rowIndexAt(e.clientX);
      if (i >= 0) pickInput(i);
    }
  };
  const onSlotLeave = () => { if (!press) hoverFit(-1); };
  slot.addEventListener('pointerdown', onSlotDown);
  slot.addEventListener('pointermove', onSlotMove);
  slot.addEventListener('pointerup', onSlotUp);
  slot.addEventListener('pointercancel', onSlotUp);
  slot.addEventListener('pointerleave', onSlotLeave);

  // A model already ticked (the browser restored the form on Back): show it as picked.
  const restored = modelInputs.findIndex((input) => input.checked);
  if (restored >= 0) choose(restored, true);

  /* The opening's "Find my case": glide down to the fitting room. A
   * keyboard press also moves focus to the model chips. */
  const onJump = (e) => {
    if (!window.ScrollToPlugin) return; // the plain anchor jump
    e.preventDefault();
    const byKeyboard = e.detail === 0;
    gsap.to(window, {
      scrollTo: { y: fitEl, autoKill: true },
      duration: 1.6,
      ease: 'power3.inOut',
      onComplete: () => { if (byKeyboard) modelInputs[Math.max(sel, 0)].focus({ preventScroll: true }); }
    });
  };
  if (jump) jump.addEventListener('click', onJump);

  /* Render only while the section is on screen. Its end is the section's
   * bottom, which the pin's spacer moves, so it refreshes after the pin. */
  triggers.push(ScrollTrigger.create({
    trigger: root,
    start: 'top bottom',
    end: 'bottom top',
    refreshPriority: -1,
    onToggle: (self) => { inView = self.isActive; sync(); }
  }));
  const onVisibility = () => sync();
  document.addEventListener('visibilitychange', onVisibility);

  /* Pointer lean, fine pointers only. */
  const onPointer = (e) => {
    ptr.tx = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
    ptr.ty = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
  };
  const usePointer = fineQuery.matches;
  if (usePointer) window.addEventListener('pointermove', onPointer, { passive: true });

  /* Pause the ambient motion (the bob and sway); scrolling still drives the rest. */
  const onPause = () => {
    paused = !paused;
    pauseButton.setAttribute('aria-pressed', String(paused));
    if (pauseLabel) pauseLabel.textContent = paused ? 'Play motion' : 'Pause motion';
  };
  if (pauseButton) pauseButton.addEventListener('click', onPause);

  // This mounts after the other sections made their ScrollTriggers (it waits
  // for three.js), so theirs sit earlier in the refresh order than the pin
  // above them and would measure the page without its spacer: everything
  // below fired one screen early. Sort into page order before refreshing.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  // Measured, not computed: the browser's scroll anchoring has already made up
  // part of the growth, and the refresh can resize sections further down.
  if (anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - anchorTop);
  // Already at or past the scanner (a reload mid-page): show the scanned state.
  if (window.scrollY >= pin.start) finishScan();
  root.dataset.cvpsMounted = '1';
  root.dispatchEvent(new CustomEvent('cvps:ready'));

  root._cvpsDestroy = () => {
    gsap.ticker.remove(tick);
    running = false;
    triggers.forEach((t) => t.kill(true));
    tweens.forEach((t) => {
      if (t.scrollTrigger) t.scrollTrigger.kill();
      t.kill();
    });
    if (chooseTl) chooseTl.kill();
    panelTweens.forEach((tween) => tween.kill());
    gsap.killTweensOf([drag, beamState, ...fits.map((f) => f.st)]);
    if (split) split.revert();
    if (fitSplit) fitSplit.revert();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    if (usePointer) window.removeEventListener('pointermove', onPointer);
    if (pauseButton) {
      pauseButton.removeEventListener('click', onPause);
      pauseButton.hidden = true;
    }
    if (jump) jump.removeEventListener('click', onJump);
    fitEl.removeEventListener('change', onModelChange);
    chips.forEach((chip, i) => {
      chip.removeEventListener('pointerenter', chipEnter[i]);
      chip.removeEventListener('pointerleave', chipLeave);
    });
    modelInputs.forEach((input, i) => {
      input.removeEventListener('focus', chipEnter[i]);
      input.removeEventListener('blur', chipLeave);
    });
    slot.removeEventListener('pointerdown', onSlotDown);
    slot.removeEventListener('pointermove', onSlotMove);
    slot.removeEventListener('pointerup', onSlotUp);
    slot.removeEventListener('pointercancel', onSlotUp);
    slot.removeEventListener('pointerleave', onSlotLeave);
    const panelBits = panels.filter(Boolean).flatMap((panel) => [...panel.querySelectorAll('.cvps__fit-count, [data-cvps-fit-cta], [data-cvps-card]')]);
    gsap.set([
      ...rise, ...heroFades, ...tags, frame, beam, beamLine, ...corners, stamp,
      checksEl, ...checkIcons, ...checkBoxes, ...checkDraws, ...chips, ...fitIns, snapEl, ...panelBits
    ].filter(Boolean), { clearProps: 'all' });
    checks.forEach((el) => {
      el.classList.remove('is-hit');
      el.style.removeProperty('--cvps-at');
      delete el.dataset.at;
    });
    if (statusEl) statusEl.textContent = '';
    slot.classList.remove('is-hover', 'is-dragging');
    disposables.forEach((thing) => thing.dispose && thing.dispose());
    env.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    root.classList.remove('is-3d', 'is-picked', 'cvps--checks-low');
    root.style.removeProperty('--cvps-frame-w');
    root.style.removeProperty('--cvps-frame-h');
    delete root.dataset.cvpsMounted;
    ScrollTrigger.refresh();
  };
}

function boot(scope) {
  if (!window.gsap || !window.ScrollTrigger) return;
  scope.querySelectorAll('[data-cvps]').forEach((root) => {
    if (root.dataset.cvpsReady === '1') return;
    root.dataset.cvpsReady = '1';
    if (reduceQuery.matches || !webglWorks()) return;
    mount(root);
  });
}

boot(document);
document.addEventListener('shopify:section:load', (e) => boot(e.target));
document.addEventListener('shopify:section:unload', (e) => {
  e.target.querySelectorAll('[data-cvps]').forEach((root) => {
    if (root._cvpsDestroy) root._cvpsDestroy();
    root.dataset.cvpsReady = '';
  });
});
