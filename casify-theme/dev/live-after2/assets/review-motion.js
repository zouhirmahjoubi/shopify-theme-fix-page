/*
  Review motion: sections/review-widget.liquid and sections/review-carousel.liquid.

  Candy Shop Matinee, "playful paper": tickets lift and settle (expo.out), small
  delights spring (back.out), and the stage is dressed with glossy three.js sweets
  (gold stars, peppermint discs, wrapped candies) that drift and follow the pointer.

  Review widget
    primary   the summary ticket lifts in, the score counts up, its stars fill
    secondary rating bars grow, the "Write a review" button springs in; cards deal
              in like tickets; picking stars in the form pops them
    ambient   sweets float around the heading and summary (three.js)
    delight   sending a review bursts gold stars out of the thank-you tick
  Review carousel
    primary   cards deal in from the right
    secondary as the row scrolls, cards turn on a shallow drum, like a carousel
    ambient   a ring of sweets orbits the row and turns with the scroll (three.js)

  Both pause off screen and in hidden tabs, load three.js only when the section
  comes near the viewport, clean up in the theme editor, and do nothing at all for
  prefers-reduced-motion (the sections are complete without motion).
  This file can be included by both sections; it runs once.
*/
(() => {
  if (window.CasifyReviewMotion) return;
  window.CasifyReviewMotion = true;

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compactQuery = window.matchMedia('(max-width: 989px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const noop = () => {};
  let threeImport = null;
  const loadThree = () => threeImport || (threeImport = import(THREE_URL));

  // Probed once: every probe would otherwise hold a WebGL context until garbage collection.
  let webglSupport = null;
  function webglOk() {
    if (webglSupport === null) {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        webglSupport = Boolean(window.WebGLRenderingContext && gl);
        const lose = gl && gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (e) {
        webglSupport = false;
      }
    }
    return webglSupport;
  }

  // Runs fn once the element is within `margin` of the viewport.
  function whenNear(element, margin, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return noop; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        io.disconnect();
        fn();
      }
    }, { rootMargin: margin });
    io.observe(element);
    return () => io.disconnect();
  }

  /* =======================================================================
     Sweets: shared three.js kit
     ======================================================================= */

  function stripeTexture(THREE, base, stripe) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = stripe;
    for (let x = -64; x < 160; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 10, 0);
      ctx.lineTo(x + 42, 64);
      ctx.lineTo(x + 32, 64);
      ctx.closePath();
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  function swirlTexture(THREE) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = size / 2;
    ctx.fillStyle = '#FDF9F1';
    ctx.fillRect(0, 0, size, size);
    const wedges = 10;
    for (let i = 0; i < wedges; i += 2) {
      const a0 = (i / wedges) * Math.PI * 2;
      const a1 = ((i + 1) / wedges) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(c, c);
      // A curved wedge reads as a peppermint swirl rather than a pie chart.
      for (let s = 0; s <= 16; s += 1) {
        const t = s / 16;
        const r = t * c;
        const a = a0 + t * 0.9;
        ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
      }
      for (let s = 16; s >= 0; s -= 1) {
        const t = s / 16;
        const r = t * c;
        const a = a1 + t * 0.9;
        ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = '#C4302B';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(c, c, size * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#FDF9F1';
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function makeKit(THREE) {
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 ? 0.47 : 1;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starShape.closePath();
    const star = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.3, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.11, bevelSegments: 3, curveSegments: 1,
    });
    star.center();

    const disc = new THREE.CylinderGeometry(0.62, 0.62, 0.26, 40, 1);
    disc.rotateX(Math.PI / 2);
    const candy = new THREE.CapsuleGeometry(0.34, 0.46, 6, 18);
    candy.rotateZ(Math.PI / 2);
    const wrap = new THREE.ConeGeometry(0.32, 0.42, 7, 1, true);

    const swirl = swirlTexture(THREE);
    const redStripe = stripeTexture(THREE, '#C4302B', '#FDF9F1');
    const tealStripe = stripeTexture(THREE, '#6C9E9C', '#FDF9F1');

    const materials = {
      star: new THREE.MeshStandardMaterial({ color: 0xffc43a, roughness: 0.26, metalness: 0.1, emissive: 0x7a4300, emissiveIntensity: 0.14 }),
      discSide: new THREE.MeshStandardMaterial({ color: 0xf5ebdc, roughness: 0.32 }),
      discFace: new THREE.MeshStandardMaterial({ map: swirl, roughness: 0.24 }),
      candyRed: new THREE.MeshStandardMaterial({ map: redStripe, roughness: 0.22 }),
      candyTeal: new THREE.MeshStandardMaterial({ map: tealStripe, roughness: 0.22 }),
      wrap: new THREE.MeshStandardMaterial({ color: 0xe9d7ae, roughness: 0.42, metalness: 0.28, side: THREE.DoubleSide }),
    };

    const build = (kind) => {
      const group = new THREE.Group();
      if (kind === 'star') {
        group.add(new THREE.Mesh(star, materials.star));
      } else if (kind === 'disc') {
        // Cylinder material order: side, top cap, bottom cap.
        group.add(new THREE.Mesh(disc, [materials.discSide, materials.discFace, materials.discFace]));
      } else {
        group.add(new THREE.Mesh(candy, kind === 'candy-teal' ? materials.candyTeal : materials.candyRed));
        const left = new THREE.Mesh(wrap, materials.wrap);
        left.rotation.z = Math.PI / 2;
        left.position.x = -0.72;
        const right = new THREE.Mesh(wrap, materials.wrap);
        right.rotation.z = -Math.PI / 2;
        right.position.x = 0.72;
        group.add(left, right);
      }
      return group;
    };

    const dispose = () => {
      [star, disc, candy, wrap].forEach((g) => g.dispose());
      [swirl, redStripe, tealStripe].forEach((t) => t.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    };

    return { build, dispose };
  }

  function addLights(THREE, scene) {
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0xb08f52, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-5, 7, 9);
    const rim = new THREE.DirectionalLight(0xffd9a0, 1.1);
    rim.position.set(6, -4, -5);
    scene.add(key, rim);
  }

  /*
    A sweets stage in `host` (an absolutely positioned layer behind the content).
    layout(items, view, time, state) places every item each frame; view holds the
    visible half-width/height in world units at z = 0.
  */
  async function candyStage(host, options) {
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    camera.position.set(0, 0, 18);
    addLights(THREE, scene);

    const kit = makeKit(THREE);
    const items = options.recipe.map((spec, index) => {
      const object = kit.build(spec.kind);
      object.userData = Object.assign({ index, pop: 0, phase: index * 1.7, spin: 0.25 + (index % 4) * 0.08 }, spec);
      object.scale.setScalar(0.0001);
      scene.add(object);
      return object;
    });

    const view = { halfW: 1, halfH: 1 };
    const state = { pointerX: 0, pointerY: 0, targetX: 0, targetY: 0, progress: 0 };
    let visible = false;
    let running = false;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      view.halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      view.halfW = view.halfH * camera.aspect;
      view.px = rect.width;
    };

    const frame = () => {
      const time = performance.now() / 1000;
      state.pointerX += (state.targetX - state.pointerX) * 0.05;
      state.pointerY += (state.targetY - state.pointerY) * 0.05;
      camera.position.x = state.pointerX * 0.9;
      camera.position.y = -state.pointerY * 0.6;
      camera.lookAt(0, 0, 0);
      options.layout(items, view, time, state);
      renderer.render(scene, camera);
    };

    const sync = () => {
      const active = visible && !document.hidden;
      if (active === running) return;
      running = active;
      if (window.gsap) {
        if (active) window.gsap.ticker.add(frame);
        else window.gsap.ticker.remove(frame);
      } else {
        renderer.setAnimationLoop(active ? frame : null);
      }
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      sync();
    }, { rootMargin: '80px 0px' });
    const ro = new ResizeObserver(resize);
    const onVisibility = () => sync();

    const onPointer = (event) => {
      const rect = host.getBoundingClientRect();
      state.targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      state.targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    const onLeave = () => { state.targetX = 0; state.targetY = 0; };
    const pointerArea = options.pointerArea || host;
    if (finePointer.matches) {
      pointerArea.addEventListener('pointermove', onPointer, { passive: true });
      pointerArea.addEventListener('pointerleave', onLeave);
    }

    resize();
    // Compile shaders now, while nothing is on screen, so the first visible frame doesn't stall.
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); } catch (e) { /* compiles on first draw */ }
    if (!host.isConnected) { renderer.dispose(); return null; }

    io.observe(host);
    ro.observe(host);
    document.addEventListener('visibilitychange', onVisibility);
    frame();

    // Items pop in, staggered, the first time the stage is revealed.
    const reveal = () => {
      if (window.gsap) {
        window.gsap.to(items.map((item) => item.userData), {
          pop: 1, duration: 0.7, ease: 'back.out(1.9)', stagger: { each: 0.06, from: 'random' }, overwrite: true,
        });
      } else {
        items.forEach((item) => { item.userData.pop = 1; });
      }
    };

    return {
      state,
      reveal,
      destroy() {
        io.disconnect();
        ro.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        pointerArea.removeEventListener('pointermove', onPointer);
        pointerArea.removeEventListener('pointerleave', onLeave);
        if (window.gsap) {
          window.gsap.ticker.remove(frame);
          window.gsap.killTweensOf(items.map((item) => item.userData));
        }
        renderer.setAnimationLoop(null);
        kit.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        host.replaceChildren();
      },
    };
  }

  // Shared per-item motion: pop scale, a slow bob, and a lazy spin.
  function animateItem(item, x, y, z, time, baseScale) {
    const d = item.userData;
    const bob = Math.sin(time * 0.9 + d.phase) * 0.18;
    item.position.set(x, y + bob, z);
    item.rotation.x = Math.sin(time * 0.5 + d.phase) * 0.35;
    item.rotation.y = time * d.spin + d.phase;
    item.rotation.z = (d.tilt || 0) + Math.sin(time * 0.4 + d.phase) * 0.12;
    item.scale.setScalar(Math.max(0.0001, d.pop * baseScale));
  }

  /* =======================================================================
     Gold-star burst for a sent review
     ======================================================================= */

  async function starBurst(anchor) {
    if (reduceMotion.matches || !anchor || !webglOk()) return;
    let THREE;
    try { THREE = await loadThree(); } catch (e) { return; }
    const size = 360;
    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = `position:fixed;left:0;top:0;width:${size}px;height:${size}px;pointer-events:none;z-index:60;visibility:hidden;`;
    document.body.appendChild(layer);

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); } catch (e) { layer.remove(); return; }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(size, size, false);
    renderer.domElement.style.cssText = 'width:100%;height:100%';
    layer.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.z = 14;
    addLights(THREE, scene);
    const kit = makeKit(THREE);
    const kinds = ['star', 'star', 'star', 'disc', 'star', 'candy-red', 'star', 'candy-teal'];
    const parts = Array.from({ length: 18 }, (_, i) => {
      const object = kit.build(kinds[i % kinds.length]);
      // An upward fountain that clears the thank-you text quickly, then falls away.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 3 + Math.random() * 1.8;
      object.userData = {
        vx: Math.cos(angle) * speed, vy: -Math.sin(angle) * speed,
        spin: (Math.random() - 0.5) * 9, size: 0.16 + Math.random() * 0.13,
      };
      object.scale.setScalar(0.0001);
      scene.add(object);
      return object;
    });

    // Compile first (off the main thread where the GPU allows), then start the clock:
    // a compile on the first frame would otherwise eat the whole burst.
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); } catch (e) { /* compiles on first draw */ }
    renderer.render(scene, camera);
    const box = anchor.getBoundingClientRect();
    layer.style.left = `${box.left + 15 - size / 2}px`;
    layer.style.top = `${box.top + 15 - size / 2}px`;
    layer.style.visibility = 'visible';
    const started = performance.now();
    const duration = 1400;
    await new Promise((resolve) => {
      const tick = () => {
        const t = (performance.now() - started) / 1000;
        parts.forEach((part) => {
          const d = part.userData;
          part.position.set(d.vx * t, d.vy * t - 4.2 * t * t, 0);
          part.rotation.set(d.spin * t * 0.6, d.spin * t, d.spin * t * 0.3);
          const grow = Math.min(1, t / 0.12);
          const fade = 1 - Math.max(0, (t * 1000 - duration * 0.6) / (duration * 0.4));
          part.scale.setScalar(Math.max(0.0001, d.size * grow * fade));
        });
        renderer.render(scene, camera);
        if (t * 1000 < duration) window.requestAnimationFrame(tick);
        else resolve();
      };
      window.requestAnimationFrame(tick);
    });

    kit.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    layer.remove();
  }

  /* =======================================================================
     Review widget
     ======================================================================= */

  // Where the sweets sit around the heading and summary: nx/ny run -1..1 across the layer.
  const WIDGET_RECIPE = [
    { kind: 'star', nx: -0.86, ny: 0.62, z: 0.5, s: 1.05, tilt: 0.3 },
    { kind: 'disc', nx: -0.66, ny: 0.86, z: -1.5, s: 0.9 },
    { kind: 'candy-red', nx: -0.95, ny: -0.2, z: -0.5, s: 1, tilt: -0.5 },
    { kind: 'star', nx: -0.72, ny: 0.28, z: -2.5, s: 0.62, tilt: -0.2 },
    { kind: 'disc', nx: 0.84, ny: 0.66, z: 0.4, s: 1 },
    { kind: 'star', nx: 0.66, ny: 0.9, z: -1.8, s: 0.7, tilt: 0.5 },
    { kind: 'candy-teal', nx: 0.94, ny: -0.12, z: -0.6, s: 0.95, tilt: 0.6 },
    { kind: 'star', nx: 0.72, ny: 0.3, z: -2.6, s: 0.58, tilt: 0.1 },
    { kind: 'star', nx: -0.9, ny: -0.82, z: -1, s: 0.8 },
    { kind: 'disc', nx: 0.9, ny: -0.8, z: -1.2, s: 0.75 },
  ];
  // Phones and tablets have no room beside the heading: the sweets tuck behind the
  // summary ticket's edges instead, peeking out.
  const WIDGET_RECIPE_COMPACT = [
    { kind: 'star', nx: -0.95, ny: 0.22, z: -0.4, s: 0.62, tilt: 0.3 },
    { kind: 'disc', nx: 0.96, ny: 0.06, z: -0.8, s: 0.58 },
    { kind: 'candy-red', nx: -0.97, ny: -0.58, z: -1, s: 0.52, tilt: -0.5 },
    { kind: 'star', nx: 0.95, ny: -0.82, z: -0.6, s: 0.56, tilt: 0.2 },
  ];

  function widgetLayout(items, view, time) {
    items.forEach((item) => {
      const d = item.userData;
      // Keep sweets off the text: never closer to the middle than the recipe says.
      animateItem(item, d.nx * view.halfW, d.ny * view.halfH, d.z, time, d.s * Math.min(0.85, view.halfH / 7));
    });
  }

  // onEnter runs once, when the summary first scrolls into view (possibly straight away).
  function widgetEntrance(root, onEnter) {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) { onEnter(); return { destroy: noop }; }

    const cards = Array.from(root.querySelectorAll('[data-rw-card]'));
    const context = gsap.context(() => {
      const head = root.querySelector('.rw__head');
      const ticket = root.querySelector('.rw-summary, .rw-empty');
      const avg = root.querySelector('.rw-summary__avg');
      const stars = root.querySelector('.rw-summary__stars .cv-stars');
      const bars = root.querySelectorAll('.rw-bar__track span');
      const cta = root.querySelector('.rw-summary__cta .rw-btn, .rw-empty__cta .rw-btn');
      const timeline = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });

      if (head) timeline.from(head, { y: 18, opacity: 0, duration: 0.42 }, 0);
      if (ticket) timeline.from(ticket, { y: 28, rotation: -1.4, opacity: 0, duration: 0.56, transformOrigin: '30% 100%' }, 0.08);
      if (stars) {
        const fill = parseFloat(stars.style.getPropertyValue('--fill')) || 0;
        timeline.fromTo(stars, { '--fill': '0%' }, { '--fill': `${fill}%`, duration: 0.8, ease: 'power2.out' }, 0.3);
      }
      if (avg) {
        const target = parseFloat(avg.textContent) || 0;
        const counter = { value: 0 };
        timeline.to(counter, {
          value: target, duration: 0.9, ease: 'power3.out',
          onUpdate: () => { avg.textContent = counter.value.toFixed(1); },
        }, 0.24);
      }
      if (bars.length) timeline.from(bars, { scaleX: 0, transformOrigin: '0% 50%', duration: 0.55, ease: 'power3.out', stagger: 0.06 }, 0.34);
      if (cta) timeline.from(cta, { scale: 0.84, opacity: 0, duration: 0.45, ease: 'back.out(2.2)' }, 0.6);

      ScrollTrigger.create({
        trigger: ticket || root,
        start: 'top 86%',
        once: true,
        onEnter: () => { timeline.play(); onEnter(); },
      });

      // Cards deal in like tickets: a lift, a slight alternating tilt, settling flat.
      const shown = cards.filter((card) => !card.hidden);
      gsap.set(cards, { opacity: 0, y: 26 });
      ScrollTrigger.batch(shown, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => dealIn(batch),
      });
    }, root);

    function dealIn(batch) {
      gsap.fromTo(batch, { opacity: 0, y: 26, rotation: (i) => (i % 2 ? 1.3 : -1.3) }, {
        opacity: 1, y: 0, rotation: 0, duration: 0.55, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity,visibility',
      });
    }

    // Cards revealed by "Load more" deal in too (review-widget.js unhides them first).
    const more = root.querySelector('[data-rw-more]');
    const onMore = () => {
      window.requestAnimationFrame(() => {
        const fresh = cards.filter((card) => !card.hidden && gsap.getProperty(card, 'opacity') === 0);
        if (fresh.length) dealIn(fresh);
      });
    };
    if (more) more.addEventListener('click', onMore);

    // Picking stars in the form: the chosen star and the ones before it pop in turn.
    const onRate = (event) => {
      const input = event.target;
      if (!input || input.name !== 'rw-rating') return;
      const labels = Array.from(root.querySelectorAll('.rw-rate__star')).slice(0, Number(input.value));
      gsap.fromTo(labels.map((label) => label.querySelector('svg')), { scale: 0.62 }, {
        scale: 1, duration: 0.42, ease: 'back.out(3)', stagger: 0.035, transformOrigin: '50% 55%', overwrite: true,
      });
    };
    root.addEventListener('change', onRate);

    return {
      destroy() {
        if (more) more.removeEventListener('click', onMore);
        root.removeEventListener('change', onRate);
        context.revert();
      },
    };
  }

  function initWidget(root) {
    if (root.rwMotion) return;
    const cleanups = [];
    let alive = true;
    root.rwMotion = {
      destroy() {
        alive = false;
        cleanups.splice(0).forEach((fn) => fn());
        delete root.rwMotion;
      },
    };

    const onSent = (event) => {
      const tick = event.target.querySelector('[data-rw-done]:not([hidden]) .rw-done__title, [data-rw-result="posted"] .rw-done__title') || event.target;
      starBurst(tick);
    };
    root.addEventListener('rw:sent', onSent);
    cleanups.push(() => root.removeEventListener('rw:sent', onSent));
    if (reduceMotion.matches) return;

    let stage = null;
    let entered = false;
    const entrance = widgetEntrance(root, () => { entered = true; if (stage) stage.reveal(); });
    cleanups.push(() => entrance.destroy());

    const host = root.querySelector('[data-rw-three]');
    if (!host) return;
    cleanups.push(whenNear(root, '400px 0px', async () => {
      const made = await candyStage(host, {
        recipe: compactQuery.matches ? WIDGET_RECIPE_COMPACT : WIDGET_RECIPE,
        layout: widgetLayout,
        pointerArea: root,
      });
      if (!made) return;
      if (!alive) { made.destroy(); return; }
      stage = made;
      root.classList.add('is-three-ready');
      cleanups.push(() => { made.destroy(); root.classList.remove('is-three-ready'); });
      if (entered) made.reveal();
    }));
  }

  /* =======================================================================
     Review carousel
     ======================================================================= */

  function carouselLayout(items, view, time, state) {
    const count = items.length;
    // The ring turns slowly on its own and a half turn across the whole scroll.
    const turn = time * 0.05 + state.progress * Math.PI;
    items.forEach((item, i) => {
      const angle = turn + (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * view.halfW * 0.94;
      const y = Math.sin(angle) * view.halfH * 0.86;
      const z = Math.sin(angle) * 1.6 - 0.6;
      animateItem(item, x, y, z, time, item.userData.s * Math.min(0.8, view.halfH / 7.5));
    });
  }

  function carouselRecipe() {
    const kinds = ['star', 'disc', 'star', 'candy-red', 'star', 'disc', 'star', 'candy-teal'];
    const total = compactQuery.matches ? 8 : 14;
    return Array.from({ length: total }, (_, i) => ({
      kind: kinds[i % kinds.length],
      s: kinds[i % kinds.length] === 'star' ? 0.62 + (i % 3) * 0.12 : 0.7,
      tilt: (i % 5) * 0.2 - 0.4,
    }));
  }

  function initCarousel(root) {
    if (root.rcMotion) return;
    const cleanups = [];
    let alive = true;
    root.rcMotion = {
      destroy() {
        alive = false;
        cleanups.splice(0).forEach((fn) => fn());
        delete root.rcMotion;
      },
    };
    if (reduceMotion.matches) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const track = root.querySelector('[data-rc-track]');
    const slides = track ? Array.from(track.querySelectorAll('.rc-slide')) : [];
    if (!track || !slides.length) return;

    let stage = null;
    let tiltOn = false;

    // Cards turn on a shallow drum: the further from the middle, the more they turn away.
    const tilt = () => {
      const half = track.clientWidth / 2;
      if (!half) return;
      const center = track.scrollLeft + half;
      slides.forEach((slide) => {
        const offset = Math.max(-1.4, Math.min(1.4, (slide.offsetLeft + slide.offsetWidth / 2 - center) / half));
        const scale = 1 - Math.min(1, Math.abs(offset)) * 0.035;
        slide.style.transform = `perspective(1100px) rotateY(${(offset * 7).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      });
    };
    const progress = () => {
      const max = track.scrollWidth - track.clientWidth;
      return max > 0 ? track.scrollLeft / max : 0;
    };
    const onScroll = () => {
      if (stage) stage.state.progress = progress();
      if (tiltOn) window.requestAnimationFrame(tilt);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    cleanups.push(() => {
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      slides.forEach((slide) => { slide.style.transform = ''; });
    });

    const enableTilt = () => { tiltOn = true; tilt(); };
    if (gsap && ScrollTrigger) {
      const context = gsap.context(() => {
        const head = root.querySelector('.rc-head');
        const firstSlides = slides.slice(0, 4);
        gsap.set(firstSlides, { opacity: 0, x: 48, rotation: 1.5 });
        if (head) gsap.set(head, { opacity: 0, y: 18 });
        ScrollTrigger.create({
          trigger: track,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            if (stage) stage.reveal();
            const timeline = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: enableTilt });
            if (head) timeline.to(head, { opacity: 1, y: 0, duration: 0.45, clearProps: 'transform,opacity,visibility' }, 0);
            timeline.to(firstSlides, { opacity: 1, x: 0, rotation: 0, duration: 0.6, stagger: 0.08, clearProps: 'transform,opacity,visibility' }, 0.1);
            root.dataset.rcEntered = 'true';
          },
        });
      }, root);
      cleanups.push(() => context.revert());
    } else {
      enableTilt();
    }

    const host = root.querySelector('[data-rc-three]');
    if (!host) return;
    cleanups.push(whenNear(root, '400px 0px', async () => {
      const made = await candyStage(host, { recipe: carouselRecipe(), layout: carouselLayout, pointerArea: root });
      if (!made) return;
      if (!alive) { made.destroy(); return; }
      stage = made;
      made.state.progress = progress();
      root.classList.add('is-three-ready');
      cleanups.push(() => { made.destroy(); root.classList.remove('is-three-ready'); });
      if (root.dataset.rcEntered === 'true' || !gsap) made.reveal();
    }));
  }

  /* =======================================================================
     Boot
     ======================================================================= */

  const boot = (scope) => {
    scope.querySelectorAll('[data-rw]').forEach(initWidget);
    scope.querySelectorAll('[data-rc]').forEach(initCarousel);
  };
  boot(document);
  document.addEventListener('shopify:section:load', (event) => boot(event.target));
  document.addEventListener('shopify:section:unload', (event) => {
    event.target.querySelectorAll('[data-rw], [data-rc]').forEach((root) => {
      if (root.rwMotion) root.rwMotion.destroy();
      if (root.rcMotion) root.rcMotion.destroy();
    });
  });
})();
