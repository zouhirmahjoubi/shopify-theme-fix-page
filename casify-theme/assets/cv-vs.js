/* Casify "Us vs. them" (sections/cv-vs.liquid).
 *
 * GSAP: pictures swing in from their sides, then each row's two halves slide
 * together from opposite edges; checks draw on and crosses pop.
 * three.js: the flat VS badge becomes a glossy peppermint coin that spins in,
 * bobs gently and tilts toward the pointer.
 *
 * The section is complete without this file. Reduced motion keeps everything
 * still (the coin renders once, no spin). three.js is only fetched when the
 * section is on the page and WebGL works; its loop runs only while on screen.
 */
const CVVS_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
let cvvsThree = null;

function cvvsLoadThree() {
  if (!cvvsThree) cvvsThree = import(CVVS_THREE_URL);
  return cvvsThree;
}

function cvvsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (error) {
    return false;
  }
}

/* ---------------------------------------------------------------- GSAP */

function cvvsMotion(root, reduced) {
  const gsap = window.gsap;
  if (!gsap || !window.ScrollTrigger || reduced) return function () {};

  const ctx = gsap.context(function () {
    const head = root.querySelector('[data-cvvs-head]');
    const us = root.querySelector('[data-cvvs-pic="us"]');
    const them = root.querySelector('[data-cvvs-pic="them"]');
    const rows = Array.from(root.querySelectorAll('[data-cvvs-row]'));
    const foot = root.querySelector('[data-cvvs-foot]');

    if (head) {
      gsap.from(head.children, {
        autoAlpha: 0, y: 22, duration: 0.6, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: head, start: 'top 85%', once: true }
      });
    }

    if (us && them) {
      gsap.timeline({ scrollTrigger: { trigger: us, start: 'top 80%', once: true } })
        .from(us, { autoAlpha: 0, x: -48, rotation: -5, duration: 0.8, ease: 'back.out(1.4)' }, 0)
        .from(them, { autoAlpha: 0, x: 48, rotation: 5, duration: 0.8, ease: 'back.out(1.4)' }, 0.08);
    }

    if (rows.length) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: rows[0], start: 'top 86%', once: true } });
      rows.forEach(function (row, i) {
        const at = i * 0.13;
        const left = row.querySelector('[data-cvvs-us]');
        const right = row.querySelector('[data-cvvs-them]');
        const check = row.querySelector('[data-cvvs-check]');
        const cross = row.querySelector('[data-cvvs-cross]');
        if (left) tl.from(left, { xPercent: -28, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, at);
        if (right) tl.from(right, { xPercent: 28, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, at);
        if (check) {
          const length = check.getTotalLength ? check.getTotalLength() : 16;
          tl.fromTo(check, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 0.38, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' }, at + 0.34);
        }
        if (cross) tl.from(cross, { scale: 0, rotation: -120, transformOrigin: '50% 50%', duration: 0.45, ease: 'back.out(2.4)' }, at + 0.38);
      });
    }

    if (foot) {
      // Explicit end values: the button's CSS transform transition would otherwise make GSAP read its
      // start offset back as the resting place and leave it 16px low, over the fine print.
      // Cleared afterwards so the button's CSS hover lift works again.
      gsap.fromTo(foot.children, { autoAlpha: 0, y: 16 }, {
        autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08,
        clearProps: 'transform,translate,rotate,scale,opacity,visibility',
        scrollTrigger: { trigger: foot, start: 'top 90%', once: true }
      });
    }
  }, root);

  return function () { ctx.revert(); };
}

/* ------------------------------------------------------------ three.js */

function cvvsFaceTexture(THREE, root, text) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const styles = getComputedStyle(root);
  const red = styles.getPropertyValue('--red-500').trim() || '#C4302B';
  const redDeep = styles.getPropertyValue('--red-700').trim() || '#7E1A17';
  const cream = styles.getPropertyValue('--cream-50').trim() || '#FDF9F1';
  const display = styles.getPropertyValue('--font-display').trim() || 'Georgia, serif';
  const c = size / 2;

  g.fillStyle = cream;
  g.fillRect(0, 0, size, size);

  // Peppermint swirl: eight curved red wedges.
  g.fillStyle = red;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = a + Math.PI / 8;
    g.beginPath();
    g.moveTo(c, c);
    g.quadraticCurveTo(c + Math.cos(a + 0.5) * 150, c + Math.sin(a + 0.5) * 150, c + Math.cos(a) * 262, c + Math.sin(a) * 262);
    g.arc(c, c, 262, a, b);
    g.quadraticCurveTo(c + Math.cos(b + 0.5) * 150, c + Math.sin(b + 0.5) * 150, c, c);
    g.fill();
  }

  // Centre medallion with the VS.
  g.beginPath();
  g.arc(c, c, 128, 0, Math.PI * 2);
  g.fillStyle = red;
  g.fill();
  g.lineWidth = 12;
  g.strokeStyle = cream;
  g.stroke();

  g.font = '900 150px ' + display;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = redDeep;
  g.fillText(text, c + 3, c + 12);
  g.fillStyle = cream;
  g.fillText(text, c, c + 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function cvvsEdgeTexture(THREE, root) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const g = canvas.getContext('2d');
  const styles = getComputedStyle(root);
  g.fillStyle = styles.getPropertyValue('--cream-50').trim() || '#FDF9F1';
  g.fillRect(0, 0, 256, 32);
  g.fillStyle = styles.getPropertyValue('--red-500').trim() || '#C4302B';
  for (let x = -32; x < 288; x += 32) {
    g.beginPath();
    g.moveTo(x, 32);
    g.lineTo(x + 16, 32);
    g.lineTo(x + 32, 0);
    g.lineTo(x + 16, 0);
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(10, 1);
  return texture;
}

async function cvvsToken(root, reduced) {
  const holder = root.querySelector('[data-cvvs-token]');
  if (!holder || !cvvsWebGL()) return function () {};

  let THREE;
  try {
    THREE = await cvvsLoadThree();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch (error) {
    return function () {};
  }
  if (!root.isConnected) return function () {};

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6b4229, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2.5, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2b0, 1.2);
  rim.position.set(-3, -1.5, 2);
  scene.add(rim);

  const label = (holder.textContent || 'VS').trim() || 'VS';
  const faceMap = cvvsFaceTexture(THREE, root, label);
  const edgeMap = cvvsEdgeTexture(THREE, root);
  const candy = { roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4 };
  const faceMaterial = new THREE.MeshPhysicalMaterial(Object.assign({ map: faceMap }, candy));
  const edgeMaterial = new THREE.MeshPhysicalMaterial(Object.assign({ map: edgeMap }, candy));
  const rimMaterial = new THREE.MeshPhysicalMaterial({ color: 0xfdf9f1, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });

  const depth = 0.34;
  const faceGeometry = new THREE.CircleGeometry(1, 96);
  const edgeGeometry = new THREE.CylinderGeometry(1, 1, depth, 96, 1, true);
  edgeGeometry.rotateX(Math.PI / 2);
  const rimGeometry = new THREE.TorusGeometry(1, 0.055, 16, 96);

  const coin = new THREE.Group();
  const front = new THREE.Mesh(faceGeometry, faceMaterial);
  front.position.z = depth / 2;
  const back = new THREE.Mesh(faceGeometry, faceMaterial);
  back.position.z = -depth / 2;
  back.rotation.y = Math.PI;
  const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
  const rimFront = new THREE.Mesh(rimGeometry, rimMaterial);
  rimFront.position.z = depth / 2;
  const rimBack = new THREE.Mesh(rimGeometry, rimMaterial);
  rimBack.position.z = -depth / 2;
  coin.add(front, back, edge, rimFront, rimBack);

  const tilt = new THREE.Group();
  tilt.add(coin);
  scene.add(tilt);

  function resize() {
    const size = Math.max(1, Math.round(holder.clientWidth));
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  resize();
  holder.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.render(scene, camera);
  holder.classList.add('is-3d');

  const cleanups = [];
  const pointer = { x: 0, y: 0 };
  let introDone = reduced;
  let running = false;
  let visible = false;
  const start = performance.now();

  function frame() {
    const t = (performance.now() - start) / 1000;
    if (introDone) {
      tilt.rotation.y += ((pointer.x * 0.45) + Math.sin(t * 0.8) * 0.12 - tilt.rotation.y) * 0.08;
      tilt.rotation.x += ((pointer.y * 0.35) - tilt.rotation.x) * 0.08;
      tilt.position.y = Math.sin(t * 1.6) * 0.06;
      coin.rotation.z = Math.sin(t * 0.9) * 0.06;
    }
    renderer.render(scene, camera);
  }

  function setRunning(on) {
    if (reduced || on === running) return;
    running = on;
    renderer.setAnimationLoop(on ? frame : null);
  }

  if (!reduced) {
    // Hidden until the stage scrolls in, then spin in.
    coin.scale.setScalar(0.001);
    renderer.render(scene, camera);
    let spun = false;
    const settle = function () { coin.scale.setScalar(1); coin.rotation.y = 0; introDone = true; };
    const spin = function () {
      if (spun) return;
      spun = true;
      const gsap = window.gsap;
      if (!gsap) { settle(); return; }
      gsap.timeline({ onComplete: function () { introDone = true; } })
        .fromTo(coin.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.8)' }, 0)
        .fromTo(coin.rotation, { y: -Math.PI * 4 }, { y: 0, duration: 1.5, ease: 'power3.out' }, 0);
    };
    // three.js arrives asynchronously, so the shopper may already be level with
    // (or past) the stage: never leave the coin shrunk waiting for a trigger.
    const box = holder.getBoundingClientRect();
    if (box.bottom <= 0) {
      spun = true;
      settle();
    } else if (!window.ScrollTrigger || box.top < window.innerHeight * 0.85) {
      spin();
    } else {
      const trigger = window.ScrollTrigger.create({ trigger: holder, start: 'top 85%', once: true, onEnter: spin });
      cleanups.push(function () { trigger.kill(); });
    }

    const io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      setRunning(visible && !document.hidden);
    });
    io.observe(holder);
    cleanups.push(function () { io.disconnect(); });

    const onVisibility = function () { setRunning(visible && !document.hidden); };
    document.addEventListener('visibilitychange', onVisibility);
    cleanups.push(function () { document.removeEventListener('visibilitychange', onVisibility); });

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const stage = root.querySelector('[data-cvvs-stage]') || root;
      const onMove = function (event) {
        const box = stage.getBoundingClientRect();
        pointer.x = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
        pointer.y = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1));
      };
      const onLeave = function () { pointer.x = 0; pointer.y = 0; };
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerleave', onLeave);
      cleanups.push(function () {
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerleave', onLeave);
      });
    }
  }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(function () { resize(); if (!running) renderer.render(scene, camera); });
    ro.observe(holder);
    cleanups.push(function () { ro.disconnect(); });
  }

  return function () {
    setRunning(false);
    cleanups.forEach(function (fn) { fn(); });
    if (window.gsap) window.gsap.killTweensOf([coin.scale, coin.rotation]);
    [faceGeometry, edgeGeometry, rimGeometry, faceMaterial, edgeMaterial, rimMaterial, faceMap, edgeMap].forEach(function (item) { item.dispose(); });
    renderer.dispose();
    renderer.domElement.remove();
    holder.classList.remove('is-3d');
  };
}

/* ---------------------------------------------------------------- boot */

function cvvsInit(root) {
  if (root._cvvsDestroy) root._cvvsDestroy();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [cvvsMotion(root, reduced)];
  let destroyed = false;
  cvvsToken(root, reduced).then(function (cleanup) {
    if (destroyed) cleanup();
    else cleanups.push(cleanup);
  });
  root._cvvsDestroy = function () {
    destroyed = true;
    cleanups.forEach(function (fn) { fn(); });
    delete root._cvvsDestroy;
  };
}

// The home "value stack" section (cv-value-stack.liquid) also carries
// [data-cvvs]; only a root with the vs rows is an "Us vs. them" section.
function cvvsIsVs(root) {
  return Boolean(root.querySelector('[data-cvvs-row], [data-cvvs-head]'));
}

function cvvsInitAll(scope) {
  const candidates = [];
  if (scope.matches && scope.matches('[data-cvvs]')) candidates.push(scope);
  if (scope.querySelectorAll) candidates.push(...scope.querySelectorAll('[data-cvvs]'));
  const roots = candidates.filter(cvvsIsVs);
  roots.forEach(cvvsInit);
  if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
}

cvvsInitAll(document);
document.addEventListener('shopify:section:load', function (event) { cvvsInitAll(event.target); });
document.addEventListener('shopify:section:unload', function (event) {
  const roots = event.target.querySelectorAll ? event.target.querySelectorAll('[data-cvvs]') : [];
  roots.forEach(function (root) { if (root._cvvsDestroy) root._cvvsDestroy(); });
});
