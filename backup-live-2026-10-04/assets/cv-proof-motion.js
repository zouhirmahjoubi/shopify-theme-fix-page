/* Casify — motion for sections/cv-social-proof.liquid.
 * GSAP reveals the live ledger and draws its authored SVG mark. Three.js is
 * imported only when this section is present, motion is allowed, and WebGL
 * exists; its floating paper forms are decorative and encode no rating data.
 */
(function () {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
  var instances = new WeakMap();

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function supportsWebGL() {
    try {
      var canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (error) {
      return false;
    }
  }

  function drawSvgPaths(root, timeline, at) {
    var paths = Array.prototype.slice.call(root.querySelectorAll('[data-cv-proof-svg]'));
    if (!paths.length) return;
    timeline.from(paths, {
      scale: 0.92,
      rotation: -2,
      transformOrigin: '50% 50%',
      duration: 0.62,
      stagger: 0.09,
      ease: 'power2.out'
    }, at);
  }

  function mountGsap(root, cleanups) {
    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger || reducedMotion()) return;

    var heading = root.querySelector('[data-cv-proof-heading]');
    var intro = root.querySelector('.cvp-proof__intro');
    var board = root.querySelector('[data-cv-proof-board]');
    var summary = root.querySelector('[data-cv-proof-summary]');
    var ledger = root.querySelector('[data-cv-proof-ledger]');
    var score = root.querySelector('[data-cv-proof-score]');
    var sourceRows = root.querySelectorAll('[data-cv-proof-lines] > div');
    var waitingLines = root.querySelectorAll('.cvp-proof__waiting-line');
    var thanks = root.querySelector('[data-cv-proof-thanks]');
    var stamp = root.querySelector('[data-cv-proof-stamp] img');

    var trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top 72%',
      once: true,
      onEnter: function () {
        var timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
        timeline
          .from(heading, { y: 24, duration: 0.85 }, 0)
          .from(intro, { y: 24, duration: 0.75 }, 0.12)
          .from(board, { y: 28, scale: 0.985, boxShadow: '0 12px 30px rgba(13, 8, 5, .18)', duration: 1.05 }, 0.2)
          .from(summary, { y: 20, duration: 0.68 }, 0.62)
          .from(ledger, { y: 20, duration: 0.68 }, 0.72);

        if (score) {
          var target = parseFloat(score.getAttribute('data-score')) || 0;
          var counter = { value: 0 };
          score.textContent = '0.0';
          timeline.to(counter, {
            value: target,
            duration: 1.05,
            ease: 'power3.out',
            onUpdate: function () { score.textContent = counter.value.toFixed(1); }
          }, 0.75);
        }

        if (sourceRows.length) timeline.from(sourceRows, { x: -14, duration: 0.55, stagger: 0.09 }, 0.86);
        if (waitingLines.length) timeline.from(waitingLines, { y: 6, duration: 0.7, stagger: 0.12 }, 0.88);
        drawSvgPaths(root, timeline, 0.72);
      }
    });

    cleanups.push(function () {
      trigger.kill();
      gsap.set([heading, intro, board, summary, ledger, sourceRows, waitingLines], { clearProps: 'all' });
    });

    if (thanks) {
      var thanksTrigger = ScrollTrigger.create({
        trigger: thanks,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          var thanksTimeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
          thanksTimeline.from(thanks, { y: 22, duration: 0.72 });
          if (stamp) {
            thanksTimeline.from(stamp, {
              scale: 1.55,
              rotation: -22,
              duration: 0.46,
              ease: 'power4.out'
            }, 0.18).to(stamp, { scale: 1.03, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.52);
          }
        }
      });
      cleanups.push(function () {
        thanksTrigger.kill();
        gsap.set([thanks, stamp], { clearProps: 'all' });
      });
    }
  }

  function mountThree(root, cleanups) {
    var host = root.querySelector('[data-cv-proof-three]');
    if (!host || root.getAttribute('data-three-enabled') !== 'true' || reducedMotion() || !supportsWebGL()) return;

    var disposed = false;

    import(THREE_URL).then(function (THREE) {
      if (disposed || !host.isConnected) return;

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 8.5);

      var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      var group = new THREE.Group();
      group.rotation.set(-0.18, -0.28, -0.04);
      scene.add(group);

      var paperMaterial = new THREE.MeshBasicMaterial({ color: 0xfff3d8, transparent: true, opacity: 0.075, side: THREE.DoubleSide });
      var edgeMaterial = new THREE.LineBasicMaterial({ color: 0xd2b57c, transparent: true, opacity: 0.34 });
      var inkMaterial = new THREE.LineBasicMaterial({ color: 0xfdf9f1, transparent: true, opacity: 0.22 });
      var geometries = [];
      var materials = [paperMaterial, edgeMaterial, inkMaterial];

      for (var index = 0; index < 6; index += 1) {
        var geometry = new THREE.PlaneGeometry(2.45, 3.25, 1, 1);
        geometries.push(geometry);
        var page = new THREE.Mesh(geometry, paperMaterial);
        page.position.set((index - 2.5) * 0.44, (index % 2 ? 0.15 : -0.1) + index * 0.04, -index * 0.24);
        page.rotation.set((index % 2 ? -1 : 1) * 0.035, (index - 2.5) * 0.018, (index - 2.5) * 0.035);
        group.add(page);

        var edgesGeometry = new THREE.EdgesGeometry(geometry);
        geometries.push(edgesGeometry);
        var edges = new THREE.LineSegments(edgesGeometry, edgeMaterial);
        edges.position.copy(page.position);
        edges.rotation.copy(page.rotation);
        group.add(edges);

        for (var lineIndex = 0; lineIndex < 4; lineIndex += 1) {
          var points = [
            new THREE.Vector3(-.82, .82 - lineIndex * .43, .015),
            new THREE.Vector3(.72 - (lineIndex % 2) * .28, .82 - lineIndex * .43, .015)
          ];
          var lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          geometries.push(lineGeometry);
          var line = new THREE.Line(lineGeometry, inkMaterial);
          line.position.copy(page.position);
          line.rotation.copy(page.rotation);
          group.add(line);
        }
      }

      var pointerX = 0;
      var pointerY = 0;
      var visible = true;
      var frame = 0;
      var start = performance.now();

      function resize() {
        var rect = host.getBoundingClientRect();
        var width = Math.max(1, Math.round(rect.width));
        var height = Math.max(1, Math.round(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      function pointerMove(event) {
        var rect = root.getBoundingClientRect();
        pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width) - .5) * .3;
        pointerY = ((event.clientY - rect.top) / Math.max(1, rect.height) - .5) * .2;
      }

      function render(now) {
        if (disposed || !visible || document.hidden) { frame = 0; return; }
        var time = (now - start) * .001;
        group.rotation.y += (pointerX + Math.sin(time * .28) * .08 - group.rotation.y) * .025;
        group.rotation.x += (-.18 - pointerY + Math.cos(time * .22) * .035 - group.rotation.x) * .025;
        group.position.y = Math.sin(time * .45) * .08;
        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(render);
      }

      function wake() {
        if (!frame && visible && !document.hidden) frame = window.requestAnimationFrame(render);
      }

      var resizeObserver = new ResizeObserver(resize);
      var intersectionObserver = new IntersectionObserver(function (entries) {
        visible = entries[0] ? entries[0].isIntersecting : true;
        if (!visible && frame) { window.cancelAnimationFrame(frame); frame = 0; }
        wake();
      }, { rootMargin: '160px' });

      resizeObserver.observe(host);
      intersectionObserver.observe(root);
      root.addEventListener('pointermove', pointerMove, { passive: true });
      document.addEventListener('visibilitychange', wake);
      resize();
      root.classList.add('is-three-ready');
      wake();

      cleanups.push(function () {
        disposed = true;
        if (frame) window.cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        root.removeEventListener('pointermove', pointerMove);
        document.removeEventListener('visibilitychange', wake);
        geometries.forEach(function (geometry) { geometry.dispose(); });
        materials.forEach(function (material) { material.dispose(); });
        renderer.dispose();
        renderer.domElement.remove();
        root.classList.remove('is-three-ready');
      });
    }).catch(function () {
      /* The proof remains fully readable if the optional 3D import fails. */
    });

    cleanups.push(function () { disposed = true; });
  }

  function mount(root) {
    if (!root || instances.has(root)) return;
    var cleanups = [];
    instances.set(root, cleanups);
    mountGsap(root, cleanups);
    mountThree(root, cleanups);
  }

  function unmount(root) {
    var cleanups = instances.get(root) || [];
    cleanups.reverse().forEach(function (cleanup) { cleanup(); });
    instances.delete(root);
  }

  function mountAll(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-cv-proof]'), mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountAll(document); });
  else mountAll(document);

  document.addEventListener('shopify:section:load', function (event) { mountAll(event.target); });
  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.matches && event.target.matches('[data-cv-proof]') ? event.target : event.target.querySelector('[data-cv-proof]');
    if (root) unmount(root);
  });
})();
