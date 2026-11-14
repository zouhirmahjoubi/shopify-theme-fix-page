const CVCX_THREE_URL = window.CV_THREE_URL || 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';

function cvcxSupportsWebGL() {
  if (window.cvWebGL) return window.cvWebGL();
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (error) {
    return false;
  }
}

function cvcxSetActive(root, index) {
  const activeIndex = Number(index) || 0;
  root.querySelectorAll('[data-cvcx-col]').forEach(function (cell) {
    cell.classList.toggle('is-active', Number(cell.dataset.cvcxCol) === activeIndex);
  });
  root.querySelectorAll('[data-cvcx-activate]').forEach(function (button) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.cvcxActivate) === activeIndex));
  });
  root.dispatchEvent(new CustomEvent('cvcx:column', { detail: { index: activeIndex } }));
}

function cvcxMotion(root, reduced) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const title = root.querySelector('[data-cvcx-title]');
  const lede = root.querySelector('[data-cvcx-lede]');
  const rule = root.querySelector('[data-cvcx-rule]');
  const stage = root.querySelector('[data-cvcx-stage]');
  const ledger = root.querySelector('[data-cvcx-ledger]');
  const rows = Array.from(root.querySelectorAll('[data-cvcx-row]'));
  const foot = root.querySelector('[data-cvcx-foot]');
  const awning = root.querySelector('.cvcx__awning span');
  const buttons = Array.from(root.querySelectorAll('[data-cvcx-activate]'));
  const cells = Array.from(root.querySelectorAll('[data-cvcx-col]'));
  const cleanups = [];
  const defaultButton = buttons.find(function (button) { return button.getAttribute('aria-pressed') === 'true'; });
  const defaultIndex = defaultButton ? Number(defaultButton.dataset.cvcxActivate) : 0;

  const activateFromEvent = function (event) {
    const target = event.currentTarget;
    const index = target.dataset.cvcxActivate || target.dataset.cvcxCol;
    cvcxSetActive(root, index);
  };
  const resetActive = function () { cvcxSetActive(root, defaultIndex); };

  buttons.forEach(function (button) {
    button.addEventListener('pointerenter', activateFromEvent);
    button.addEventListener('focus', activateFromEvent);
    button.addEventListener('click', activateFromEvent);
    cleanups.push(function () {
      button.removeEventListener('pointerenter', activateFromEvent);
      button.removeEventListener('focus', activateFromEvent);
      button.removeEventListener('click', activateFromEvent);
    });
  });

  cells.forEach(function (cell) {
    cell.addEventListener('pointerenter', activateFromEvent);
    cleanups.push(function () { cell.removeEventListener('pointerenter', activateFromEvent); });
  });

  if (ledger) {
    ledger.addEventListener('pointerleave', resetActive);
    cleanups.push(function () { ledger.removeEventListener('pointerleave', resetActive); });
  }

  cvcxSetActive(root, defaultIndex);

  if (gsap && ScrollTrigger && !reduced) {
    const context = gsap.context(function () {
      ScrollTrigger.create({
        trigger: root,
        start: 'top 76%',
        once: true,
        onEnter: function () {
          root.classList.add('is-cvcx-entered');
          root.dispatchEvent(new CustomEvent('cvcx:enter'));
          const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
          if (awning) timeline.fromTo(awning, { scaleX: 0 }, { scaleX: 1, duration: .78, clearProps: 'transform' }, 0);
          if (title) timeline.fromTo(title, { y: 38, clipPath: 'inset(0 0 100% 0)' }, { y: 0, clipPath: 'inset(0 0 0% 0)', duration: .82, clearProps: 'transform,clipPath' }, .08);
          if (lede) timeline.fromTo(lede, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .58, clearProps: 'transform,opacity' }, .24);
          if (rule) timeline.fromTo(rule, { strokeDasharray: 520, strokeDashoffset: 520 }, { strokeDashoffset: 0, duration: .72, ease: 'power2.inOut' }, .32);
          if (stage) timeline.fromTo(stage, { y: 30, rotation: 2.2, scale: .965, filter: 'blur(5px)' }, { y: 0, rotation: 0, scale: 1, filter: 'blur(0px)', duration: .88, clearProps: 'transform,filter' }, .12);
          if (ledger) timeline.fromTo(ledger, { y: 34, clipPath: 'inset(0 0 18% 0 round 14px)' }, { y: 0, clipPath: 'inset(0 0 0% 0 round 14px)', duration: .78, clearProps: 'transform,clipPath' }, .46);
          if (rows.length) timeline.fromTo(rows, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .42, stagger: .045, clearProps: 'transform,opacity' }, .68);
          if (foot) timeline.fromTo(foot, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .5, clearProps: 'transform,opacity' }, .92);
        }
      });
    }, root);
    cleanups.push(function () { context.revert(); });
  } else {
    root.classList.add('is-cvcx-entered');
  }

  return function () { cleanups.splice(0).forEach(function (cleanup) { cleanup(); }); };
}

function cvcxRoundedShape(THREE, width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function cvcxCase(THREE, color, depth, index) {
  const group = new THREE.Group();
  const shape = cvcxRoundedShape(THREE, 1.5, 2.95, .28);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: .045,
    bevelThickness: .04,
    curveSegments: 16
  });
  geometry.center();
  const shell = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
    color: color,
    transparent: true,
    opacity: index === 0 ? .68 : .5,
    roughness: .2,
    metalness: .04,
    clearcoat: 1,
    clearcoatRoughness: .16,
    side: THREE.DoubleSide
  }));
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 24),
    new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: .86 })
  );
  group.add(edge);

  const island = new THREE.Mesh(
    new THREE.BoxGeometry(.58, .66, depth + .09, 3, 3, 1),
    new THREE.MeshStandardMaterial({ color: 0x33231a, roughness: .5, transparent: true, opacity: .78 })
  );
  island.position.set(-.36, .92, .04);
  group.add(island);

  [[-.48, 1.06], [-.25, 1.06], [-.365, .84]].forEach(function (position) {
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(.09, .09, depth + .14, 24),
      new THREE.MeshStandardMaterial({ color: 0xfdf9f1, metalness: .35, roughness: .28 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(position[0], position[1], .08);
    group.add(lens);
  });

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(.47, .034, 12, 56),
    new THREE.MeshStandardMaterial({ color: index === 0 ? 0xd2b57c : 0xf0e2c2, metalness: .5, roughness: .28 })
  );
  ring.position.z = depth / 2 + .085;
  group.add(ring);

  const stem = new THREE.Mesh(
    new THREE.BoxGeometry(.065, .29, .035),
    new THREE.MeshStandardMaterial({ color: index === 0 ? 0xd2b57c : 0xf0e2c2, metalness: .5, roughness: .28 })
  );
  stem.position.set(0, -.61, depth / 2 + .085);
  group.add(stem);
  return group;
}

async function cvcxThree(root) {
  const host = root.querySelector('[data-cvcx-three]');
  const stage = root.querySelector('[data-cvcx-stage]');
  if (!host || !stage || !cvcxSupportsWebGL()) return function () {};

  let THREE;
  try {
    THREE = await import(CVCX_THREE_URL);
  } catch (error) {
    return function () {};
  }

  if (!root.isConnected) return function () {};

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap was removed in three r18x (it fell back to this with a console warning)
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 40);
  camera.position.set(0, .1, 9.4);

  scene.add(new THREE.HemisphereLight(0xfff8e8, 0x6c9e9c, 2.4));
  const key = new THREE.DirectionalLight(0xfff2d8, 3.8);
  key.position.set(-3.5, 5.2, 7);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xcde3e0, 2.6);
  rim.position.set(4, 1.2, 5);
  scene.add(rim);

  const rig = new THREE.Group();
  rig.rotation.x = -.05;
  scene.add(rig);

  const colors = [0xc4302b, 0x4e7c7b, 0xb08f52];
  const depths = [.16, .2, .46];
  const cases = colors.map(function (color, index) {
    const specimen = cvcxCase(THREE, color, depths[index], index);
    specimen.userData.baseX = (index - 1) * 2.25;
    specimen.userData.baseY = index === 1 ? .04 : -.08;
    specimen.userData.baseRotation = (index - 1) * -.09;
    specimen.position.set(specimen.userData.baseX, specimen.userData.baseY, 0);
    specimen.rotation.set(-.14, specimen.userData.baseRotation, (index - 1) * .035);
    rig.add(specimen);
    return specimen;
  });

  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, .18, 1.35),
    new THREE.MeshStandardMaterial({ color: 0xd2b57c, metalness: .32, roughness: .42 })
  );
  shelf.position.set(0, -1.73, -.32);
  shelf.rotation.x = -.08;
  shelf.receiveShadow = true;
  rig.add(shelf);

  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, metalness: .2, roughness: .58 });
  [-2.25, 0, 2.25].forEach(function (x) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.78, .08, .78), railMaterial);
    rail.position.set(x, -1.56, .08);
    rail.receiveShadow = true;
    rig.add(rail);
  });

  const state = { reveal: 0, active: 0, pointerX: 0, pointerY: 0 };
  const target = { pointerX: 0, pointerY: 0 };
  const gsap = window.gsap;
  let visible = false;
  let running = false;

  const resize = function () {
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const render = function (time) {
    const seconds = (time || 0) * .001;
    state.pointerX += (target.pointerX - state.pointerX) * .055;
    state.pointerY += (target.pointerY - state.pointerY) * .055;
    rig.rotation.y = state.pointerX * .09;
    rig.rotation.x = -.05 + state.pointerY * .05;
    cases.forEach(function (specimen, index) {
      const active = index === Math.round(state.active) ? 1 : 0;
      const revealOffset = (1 - state.reveal) * (2.8 + index * .34);
      specimen.position.x += (specimen.userData.baseX - specimen.position.x) * .08;
      specimen.position.y += (specimen.userData.baseY + active * .22 + revealOffset - specimen.position.y) * .09;
      specimen.position.z += (active * .72 - specimen.position.z) * .09;
      specimen.rotation.y += (specimen.userData.baseRotation + active * .08 - specimen.rotation.y) * .08;
      specimen.rotation.z = (index - 1) * .035 + Math.sin(seconds * .72 + index) * .008 * state.reveal;
      const scale = 1 + active * .055;
      specimen.scale.lerp(new THREE.Vector3(scale, scale, scale), .08);
    });
    renderer.render(scene, camera);
  };

  const start = function () {
    if (running || !visible || document.hidden) return;
    running = true;
    renderer.setAnimationLoop(render);
  };

  const stop = function () {
    if (!running) return;
    running = false;
    renderer.setAnimationLoop(null);
  };

  const updateRunState = function () { if (visible && !document.hidden) start(); else stop(); };
  const enter = function () {
    if (gsap) gsap.to(state, { reveal: 1, duration: 1.05, ease: 'power3.out', overwrite: true });
    else state.reveal = 1;
  };
  const activeColumn = function (event) {
    const index = Number(event.detail && event.detail.index) || 0;
    if (gsap) gsap.to(state, { active: index, duration: .42, ease: 'power3.out', overwrite: true });
    else state.active = index;
  };
  const pointerMove = function (event) {
    const rect = stage.getBoundingClientRect();
    target.pointerX = ((event.clientX - rect.left) / rect.width - .5) * 2;
    target.pointerY = ((event.clientY - rect.top) / rect.height - .5) * 2;
  };
  const pointerLeave = function () { target.pointerX = 0; target.pointerY = 0; };
  const visibilityChange = function () { updateRunState(); };
  const observer = new IntersectionObserver(function (entries) {
    visible = Boolean(entries[0] && entries[0].isIntersecting);
    updateRunState();
  }, { rootMargin: '160px 0px' });
  const resizeObserver = new ResizeObserver(resize);

  root.addEventListener('cvcx:enter', enter);
  root.addEventListener('cvcx:column', activeColumn);
  stage.addEventListener('pointermove', pointerMove, { passive: true });
  stage.addEventListener('pointerleave', pointerLeave);
  document.addEventListener('visibilitychange', visibilityChange);
  observer.observe(root);
  resizeObserver.observe(host);
  resize();
  root.classList.add('is-three-ready');
  if (root.classList.contains('is-cvcx-entered')) enter();
  render(0);

  return function () {
    observer.disconnect();
    resizeObserver.disconnect();
    root.removeEventListener('cvcx:enter', enter);
    root.removeEventListener('cvcx:column', activeColumn);
    stage.removeEventListener('pointermove', pointerMove);
    stage.removeEventListener('pointerleave', pointerLeave);
    document.removeEventListener('visibilitychange', visibilityChange);
    stop();
    if (gsap) {
      gsap.killTweensOf(state);
    }
    scene.traverse(function (object) {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(function (material) { material.dispose(); });
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
    host.replaceChildren();
    root.classList.remove('is-three-ready');
  };
}

function cvcxInit(root) {
  if (!root || root.dataset.cvcxMounted === 'true') return;
  root.dataset.cvcxMounted = 'true';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [cvcxMotion(root, reduced)];
  let alive = true;

  if (!reduced) {
    cvcxThree(root).then(function (cleanup) {
      if (alive) cleanups.push(cleanup);
      else cleanup();
    });
  }

  root.cvcxDestroy = function () {
    alive = false;
    cleanups.splice(0).forEach(function (cleanup) { cleanup(); });
    delete root.dataset.cvcxMounted;
    delete root.cvcxDestroy;
  };
}

function cvcxInitAll(scope) {
  const target = scope || document;
  if (target.matches && target.matches('[data-cvcx]')) cvcxInit(target);
  target.querySelectorAll('[data-cvcx]').forEach(cvcxInit);
}

cvcxInitAll(document);

document.addEventListener('shopify:section:load', function (event) { cvcxInitAll(event.target); });
document.addEventListener('shopify:section:unload', function (event) {
  const root = event.target.querySelector('[data-cvcx]');
  if (root && root.cvcxDestroy) root.cvcxDestroy();
});
