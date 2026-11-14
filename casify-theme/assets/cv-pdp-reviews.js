const CVW_THREE_URL = window.CV_THREE_URL || 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';

function cvwSupportsWebGL() {
  if (window.cvWebGL) return window.cvWebGL();
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (error) {
    return false;
  }
}

function cvwReviewMotion(root) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return function () {};

  const stage = root.querySelector('[data-cvw-review-stage]');
  const board = root.querySelector('[data-cvw-board]');
  const tilt = root.querySelector('[data-cvw-review-tilt]');
  const note = root.querySelector('[data-cvw-review-note]');
  const app = root.querySelector('[data-cvw-review-app]');
  const chalk = Array.from(root.querySelectorAll('[data-cvw-chalk]'));
  const stars = Array.from(root.querySelectorAll('.cv-stars__row path'));
  const line = root.querySelector('[data-cvw-chalk-line]');
  const score = root.querySelector('[data-cvw-score-number]');
  const count = root.querySelector('[data-cvw-count-number]');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cleanups = [];

  const context = gsap.context(function () {
    const trigger = ScrollTrigger.create({
      trigger: stage || root,
      start: 'top 78%',
      once: true,
      onEnter: function () {
        root.classList.add('is-review-entered');
        root.dispatchEvent(new CustomEvent('cvw:reviews:enter'));
        const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
        if (board) timeline.fromTo(board, { y: 38, rotation: -6 }, { y: 0, rotation: 0, duration: 1.15, clearProps: 'transform' }, 0);
        if (note) timeline.fromTo(note, { x: 18, y: 28, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: .72, clearProps: 'transform,opacity' }, .2);
        if (chalk.length) timeline.fromTo(chalk, { clipPath: 'inset(-15% 100% -15% 0%)' }, { clipPath: 'inset(-15% 0% -15% 0%)', duration: .78, stagger: .16, ease: 'steps(14)', clearProps: 'clipPath' }, .28);
        if (stars.length) timeline.fromTo(stars, { scale: .55, opacity: .2, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: .34, stagger: .045, ease: 'back.out(2.2)', clearProps: 'transform,opacity' }, .72);
        if (line && window.DrawSVGPlugin) timeline.fromTo(line, { drawSVG: '0%' }, { drawSVG: '100%', duration: .62, ease: 'power2.inOut' }, .9);
        if (app) timeline.fromTo(app, { y: 26, clipPath: 'inset(0 0 22% 0)', opacity: .35 }, { y: 0, clipPath: 'inset(0 0 0% 0)', opacity: 1, duration: .7, clearProps: 'transform,clipPath,opacity' }, .82);

        if (score) {
          const targetScore = Number(root.dataset.reviewRating || 0);
          const scoreState = { value: 0 };
          gsap.to(scoreState, {
            value: targetScore,
            duration: .9,
            delay: .55,
            ease: 'power3.out',
            onUpdate: function () { score.textContent = scoreState.value.toFixed(1); }
          });
        }

        if (count) {
          const targetCount = Number(root.dataset.reviewCount || 0);
          const countState = { value: 0 };
          const formatter = new Intl.NumberFormat(document.documentElement.lang || 'en');
          gsap.to(countState, {
            value: targetCount,
            duration: .85,
            delay: .68,
            ease: 'power3.out',
            onUpdate: function () { count.textContent = formatter.format(Math.round(countState.value)); }
          });
        }
      }
    });
    cleanups.push(function () { trigger.kill(); });
  }, root);

  if (canHover && stage && tilt) {
    const rotateX = gsap.quickTo(tilt, 'rotationX', { duration: .55, ease: 'power3.out' });
    const rotateY = gsap.quickTo(tilt, 'rotationY', { duration: .55, ease: 'power3.out' });
    const noteX = note ? gsap.quickTo(note, 'x', { duration: .7, ease: 'power3.out' }) : null;
    const noteY = note ? gsap.quickTo(note, 'y', { duration: .7, ease: 'power3.out' }) : null;
    const move = function (event) {
      const rect = stage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      rotateY(x * 3.2);
      rotateX(y * -2.4);
      if (noteX) noteX(x * -5);
      if (noteY) noteY(y * -4);
    };
    const leave = function () {
      rotateX(0);
      rotateY(0);
      if (noteX) noteX(0);
      if (noteY) noteY(0);
    };
    stage.addEventListener('pointermove', move, { passive: true });
    stage.addEventListener('pointerleave', leave);
    cleanups.push(function () {
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', leave);
    });
  }

  return function () {
    cleanups.forEach(function (cleanup) { cleanup(); });
    context.revert();
  };
}

async function cvwReviewThree(root) {
  const host = root.querySelector('[data-cvw-review-three]');
  const stage = root.querySelector('[data-cvw-review-stage]');
  const gsap = window.gsap;
  if (!host || !stage || !cvwSupportsWebGL()) return function () {};

  let THREE;
  try {
    THREE = await import(CVW_THREE_URL);
  } catch (error) {
    return function () {};
  }
  if (!root.isConnected || root.dataset.cvwReviewsMounted !== 'true') return function () {};

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    return function () {};
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 30);
  camera.position.z = 8.5;
  const group = new THREE.Group();
  scene.add(group);

  const compact = window.matchMedia('(max-width: 720px)').matches;
  const count = compact ? 44 : 86;
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorChoices = [new THREE.Color(0xb92f2a), new THREE.Color(0x4f7f7b), new THREE.Color(0xc99b3f), new THREE.Color(0x6d4d36)];

  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.7 + Math.random() * 2.3;
    const offset = index * 3;
    base[offset] = Math.cos(angle) * radius;
    base[offset + 1] = Math.sin(angle) * radius * .62;
    base[offset + 2] = (Math.random() - .5) * 2.5;
    positions[offset] = base[offset];
    positions[offset + 1] = base[offset + 1];
    positions[offset + 2] = base[offset + 2];
    const color = colorChoices[index % colorChoices.length];
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dustMaterial = new THREE.PointsMaterial({ size: compact ? .075 : .065, vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  group.add(dust);

  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x4f7f7b, transparent: true, opacity: 0, depthWrite: false });
  const ringMaterialTwo = new THREE.MeshBasicMaterial({ color: 0xb92f2a, transparent: true, opacity: 0, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.7, .012, 6, 150), ringMaterial);
  const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(3.15, .009, 6, 130), ringMaterialTwo);
  ring.scale.y = .58;
  ringTwo.scale.y = .66;
  ring.rotation.z = .16;
  ringTwo.rotation.z = -.24;
  group.add(ring, ringTwo);

  const state = { reveal: 0, pointerX: 0, pointerY: 0 };
  const target = { x: 0, y: 0 };
  let visible = false;
  let ticking = false;

  const resize = function () {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  };

  const frame = function (time) {
    const seconds = time ? (gsap ? time : time / 1000) : performance.now() / 1000;
    state.pointerX += (target.x - state.pointerX) * .045;
    state.pointerY += (target.y - state.pointerY) * .045;
    camera.position.x = state.pointerX * .38;
    camera.position.y = state.pointerY * -.24;
    camera.lookAt(0, 0, 0);
    group.rotation.z = Math.sin(seconds * .22) * .025;
    group.rotation.y = state.pointerX * .045;
    group.scale.setScalar(.88 + state.reveal * .12);

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const drift = seconds * (.16 + (index % 7) * .012) + index * .71;
      positions[offset] = base[offset] + Math.sin(drift) * .12;
      positions[offset + 1] = base[offset + 1] + Math.cos(drift * 1.13) * .1;
      positions[offset + 2] = base[offset + 2] + Math.sin(drift * .73) * .18;
    }
    dustGeometry.attributes.position.needsUpdate = true;
    dustMaterial.opacity = .48 * state.reveal;
    ringMaterial.opacity = .2 * state.reveal;
    ringMaterialTwo.opacity = .16 * state.reveal;
    renderer.render(scene, camera);
  };

  const updateTicker = function () {
    const active = visible && !document.hidden;
    if (active && !ticking) {
      ticking = true;
      if (gsap) gsap.ticker.add(frame);
    } else if (!active && ticking) {
      ticking = false;
      if (gsap) gsap.ticker.remove(frame);
    }
    if (!gsap && active) renderer.setAnimationLoop(frame);
    if (!gsap && !active) renderer.setAnimationLoop(null);
  };

  const reveal = function () {
    if (gsap) gsap.to(state, { reveal: 1, duration: .9, ease: 'power3.out', overwrite: true });
    else state.reveal = 1;
  };

  const pointerMove = function (event) {
    const rect = stage.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    target.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  };

  const pointerLeave = function () { target.x = 0; target.y = 0; };
  const visibilityChange = function () { updateTicker(); };
  const enter = function () { reveal(); };
  const observer = new IntersectionObserver(function (entries) {
    visible = Boolean(entries[0] && entries[0].isIntersecting);
    updateTicker();
  }, { rootMargin: '120px 0px' });
  const resizeObserver = new ResizeObserver(resize);

  stage.addEventListener('pointermove', pointerMove, { passive: true });
  stage.addEventListener('pointerleave', pointerLeave);
  root.addEventListener('cvw:reviews:enter', enter);
  document.addEventListener('visibilitychange', visibilityChange);
  observer.observe(root);
  resizeObserver.observe(host);
  resize();
  root.classList.add('is-three-ready');
  if (root.classList.contains('is-review-entered')) reveal();
  frame(0);

  return function () {
    observer.disconnect();
    resizeObserver.disconnect();
    stage.removeEventListener('pointermove', pointerMove);
    stage.removeEventListener('pointerleave', pointerLeave);
    root.removeEventListener('cvw:reviews:enter', enter);
    document.removeEventListener('visibilitychange', visibilityChange);
    if (gsap) {
      gsap.ticker.remove(frame);
      gsap.killTweensOf(state);
    } else {
      renderer.setAnimationLoop(null);
    }
    dustGeometry.dispose();
    dustMaterial.dispose();
    ring.geometry.dispose();
    ring.material.dispose();
    ringTwo.geometry.dispose();
    ringTwo.material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    host.replaceChildren();
    root.classList.remove('is-three-ready');
  };
}

function cvwInitReview(root) {
  if (!root || root.dataset.cvwReviewsMounted === 'true') return;
  root.dataset.cvwReviewsMounted = 'true';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];
  let alive = true;

  if (!reduced) {
    cleanups.push(cvwReviewMotion(root));
    cvwReviewThree(root).then(function (cleanup) {
      if (alive) cleanups.push(cleanup);
      else cleanup();
    });
  }

  root.cvwReviewDestroy = function () {
    alive = false;
    cleanups.splice(0).forEach(function (cleanup) { cleanup(); });
    delete root.dataset.cvwReviewsMounted;
    delete root.cvwReviewDestroy;
  };
}

function cvwInitAllReviews(scope) {
  const target = scope || document;
  if (target.matches && target.matches('[data-cvw-reviews]')) cvwInitReview(target);
  target.querySelectorAll('[data-cvw-reviews]').forEach(cvwInitReview);
}

cvwInitAllReviews(document);

document.addEventListener('shopify:section:load', function (event) { cvwInitAllReviews(event.target); });
document.addEventListener('shopify:section:unload', function (event) {
  const root = event.target.querySelector('[data-cvw-reviews]');
  if (root && root.cvwReviewDestroy) root.cvwReviewDestroy();
});
