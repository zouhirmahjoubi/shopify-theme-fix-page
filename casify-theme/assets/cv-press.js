/* Casify: Press (sections/cv-press.liquid, styles in cv-press.css).
 *
 * The case stays mid-screen on a CSS sticky rail while the page scrolls past it, so this file only
 * adds what sticky cannot do: it cuts the white studio background out of the photo so the big type
 * shows behind the case, tilts the case upright at the start, blooms the ink splats, and shrinks
 * the case into the middle slot of the row at the end. All of that follows the scroll.
 *
 * The Christmas layer adds one loop, which runs only while the section is on screen: snow on a
 * canvas, and baubles that swing as the scroll pushes them. Holly grows from behind the case, a bow
 * lands on it, and stars burst from the middle slot when it drops into the row.
 *
 * With reduced motion, or without GSAP and ScrollTrigger, the section stays the plain stack the
 * CSS gives it. Re-initialises in the theme editor.
 */
(function () {
  'use strict';

  var SELECTOR = '[data-cvpr]';
  var CROP = { x: 0.19, y: 0.066, w: 0.4345, h: 0.838 }; // the front of the case in the usual mockup
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

  function all(q, ctx) { return Array.prototype.slice.call(ctx.querySelectorAll(q)); }

  /* Near-white pixels joined to the edge of the crop are studio background; white inside the print
     stays, because the fill cannot reach it past the case's dark rim. */
  function cutout(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.crossOrigin = 'anonymous';
      image.onerror = reject;
      image.onload = function () {
        try {
          var sx = Math.round(image.naturalWidth * CROP.x);
          var sy = Math.round(image.naturalHeight * CROP.y);
          var w = Math.round(image.naturalWidth * CROP.w);
          var h = Math.round(image.naturalHeight * CROP.h);
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.className = 'cvpr__cut';
          canvas.setAttribute('aria-hidden', 'true');
          var ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(image, sx, sy, w, h, 0, 0, w, h);
          var data = ctx.getImageData(0, 0, w, h);
          var px = data.data;
          var seen = new Uint8Array(w * h);
          var stack = [];
          var push = function (i) { if (!seen[i]) { seen[i] = 1; stack.push(i); } };
          var x; var y;
          for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
          for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
          var bg = new Uint8Array(w * h);
          while (stack.length) {
            var at = stack.pop();
            var o = at * 4;
            var lo = Math.min(px[o], px[o + 1], px[o + 2]);
            var hi = Math.max(px[o], px[o + 1], px[o + 2]);
            if (lo < 232 || hi - lo > 18) continue;
            bg[at] = 1;
            if (at % w) push(at - 1);
            if (at % w < w - 1) push(at + 1);
            if (at >= w) push(at - w);
            if (at < w * (h - 1)) push(at + w);
          }
          // Clear the background, then soften the one-pixel rim so no white halo is left.
          for (var i = 0; i < bg.length; i++) if (bg[i]) px[i * 4 + 3] = 0;
          for (y = 1; y < h - 1; y++) {
            for (x = 1; x < w - 1; x++) {
              var p = y * w + x;
              if (bg[p]) continue;
              if (bg[p - 1] || bg[p + 1] || bg[p - w] || bg[p + w]) {
                var edge = Math.min(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]);
                px[p * 4 + 3] = edge > 170 ? 40 : 170;
              }
            }
          }
          ctx.putImageData(data, 0, 0);
          resolve(canvas);
        } catch (error) { reject(error); } // a tainted canvas: the plain photo stays
      };
      image.src = src;
    });
  }

  /* Snow, and the baubles and garland as pendulums. Both take the scroll's speed: it blows the snow
     about and pushes the pendulums, which settle by themselves when the page stops. */
  function christmasLoop(root, gsap, ST, signal) {
    var canvas = root.querySelector('[data-cvpr-snow]');
    var ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;

    var css = getComputedStyle(root);
    var teal = css.getPropertyValue('--teal-300').trim() || '#A8C8C4';
    var white = css.getPropertyValue('--white').trim() || '#FFFDF8';
    var gold = css.getPropertyValue('--gold-400').trim() || '#D2B57C';
    var w = 0; var h = 0; var ratio = 1;
    var flakes = [];
    function seed() {
      var count = w < 750 ? 46 : 96;
      flakes = [];
      for (var i = 0; i < count; i++) {
        var depth = 0.35 + Math.random() * 0.65;
        var roll = Math.random();
        flakes.push({
          x: Math.random() * w, y: Math.random() * h, r: 1 + depth * 2.8, fall: 16 + depth * 46, phase: Math.random() * 6.28,
          color: roll < 0.68 ? teal : (roll < 0.94 ? white : gold), crystal: depth > 0.72, spin: Math.random() * 3
        });
      }
    }
    function size() {
      var box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      w = box.width; h = box.height;
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      seed();
    }
    size();
    var sizer = new ResizeObserver(size);
    sizer.observe(canvas);

    var swingers = all('[data-cvpr-bauble]', root).map(function (el, i) {
      return { set: gsap.quickSetter(el, 'rotation', 'deg'), push: i % 2 ? -240 : 240, stiff: 24 + i * 5, idle: 1.4, phase: i * 1.7, angle: 0, spin: 0 };
    });
    var garland = root.querySelector('[data-cvpr-garland]');
    if (garland) swingers.push({ set: gsap.quickSetter(garland, 'skewX', 'deg'), push: 20, stiff: 14, idle: 0.12, phase: 0, angle: 0, spin: 0 });

    var page = ST.create({ trigger: root, start: 'top bottom', end: 'bottom top' });
    var top = ST.create({ trigger: root, start: 'top bottom', end: '+=170%' }); // the baubles are in view
    var wind = 0;
    var lift = 0;
    var running = false;

    function frame(time, delta) {
      var dt = Math.min(0.05, (delta || 16) / 1000);
      var speed = page.getVelocity();
      lift += (speed * 0.05 - lift) * 0.08; // the page moves, so the snow does too
      wind += (Math.max(-60, Math.min(60, speed * 0.02)) - wind) * 0.05;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += (f.fall - lift) * dt;
        f.x += (Math.sin(time * 0.8 + f.phase) * 12 + wind) * dt;
        if (f.y > h + 8) { f.y = -8; f.x = Math.random() * w; }
        if (f.y < -8) f.y = h + 8;
        if (f.x > w + 8) f.x = -8;
        if (f.x < -8) f.x = w + 8;
        ctx.fillStyle = ctx.strokeStyle = f.color;
        ctx.beginPath();
        if (f.crystal) {
          ctx.lineWidth = 1;
          for (var k = 0; k < 3; k++) {
            var a = f.spin + time * 0.3 + k * 1.047;
            ctx.moveTo(f.x - Math.cos(a) * f.r * 1.5, f.y - Math.sin(a) * f.r * 1.5);
            ctx.lineTo(f.x + Math.cos(a) * f.r * 1.5, f.y + Math.sin(a) * f.r * 1.5);
          }
          ctx.stroke();
        } else {
          ctx.arc(f.x, f.y, f.r, 0, 6.2832);
          ctx.fill();
        }
      }

      if (top.isActive) {
        var push = Math.max(-1, Math.min(1, speed / 2500));
        swingers.forEach(function (s) {
          s.spin += (s.push * push - s.stiff * s.angle - 1.4 * s.spin) * dt;
          s.angle += s.spin * dt;
          s.set(s.angle + Math.sin(time * 0.9 + s.phase) * s.idle);
        });
      }
    }

    var seen = new IntersectionObserver(function (entries) {
      var on = !!(entries[0] && entries[0].isIntersecting);
      if (on && !running) { running = true; gsap.ticker.add(frame); }
      if (!on && running) { running = false; gsap.ticker.remove(frame); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    });
    seen.observe(root);

    signal.addEventListener('abort', function () {
      seen.disconnect();
      sizer.disconnect();
      page.kill();
      top.kill();
      if (running) gsap.ticker.remove(frame);
      running = false;
    });
  }

  /* Stars fly out of the middle slot, and the cases either side give a little hop. */
  function burst(gsap, sparks, hops) {
    sparks.forEach(function (spark, i) {
      var angle = (i / sparks.length) * 6.2832 + Math.random() * 0.4;
      var reach = 70 + Math.random() * 90;
      gsap.fromTo(spark, { x: 0, y: 0, scale: 0.2, rotation: 0, opacity: 1 }, {
        x: Math.cos(angle) * reach, y: Math.sin(angle) * reach - 26, scale: 0.6 + Math.random() * 0.8, rotation: 180 + Math.random() * 240,
        opacity: 0, duration: 0.8 + Math.random() * 0.45, ease: 'power3.out', overwrite: true
      });
    });
    if (hops.length) gsap.to(hops, { keyframes: { y: [0, -12, 0], easeEach: 'sine.inOut' }, duration: 0.5, stagger: 0.05, overwrite: true });
  }

  function init(root) {
    if (!root) return;
    if (root._cvprDestroy) root._cvprDestroy();

    var gsap = window.gsap;
    var ST = window.ScrollTrigger;
    if (!gsap || !ST || reduceQuery.matches) return;

    var alive = true;
    var abort = new AbortController();
    var box = root.querySelector('[data-cvpr-case]');
    var tilt = root.querySelector('[data-cvpr-tilt]');
    var rail = root.querySelector('[data-cvpr-rail]');
    var slot = root.querySelector('[data-cvpr-slot]');
    var canvasEl = null;
    var sparks = [];
    var hops = all('.cvpr__slot:not(.cvpr__slot--main) .cvpr__slot-photo', root);
    var burstCall = null;

    root.classList.add('is-live');

    var mainSlot = root.querySelector('[data-cvpr-main]');
    if (mainSlot && root.querySelector('[data-cvpr-snow]')) {
      for (var s = 0; s < 18; s++) {
        var spark = document.createElement('span');
        spark.className = 'cvpr__spark';
        spark.setAttribute('aria-hidden', 'true');
        mainSlot.appendChild(spark);
        sparks.push(spark);
      }
    }

    /* The rail ends level with the bottom of the middle slot: that is where sticky lets go. */
    function fitRail() {
      if (!slot || !rail) return;
      var rootBox = root.getBoundingClientRect();
      var slotBox = slot.getBoundingClientRect();
      rail.style.bottom = Math.max(0, Math.round(rootBox.bottom - slotBox.bottom)) + 'px';
    }
    fitRail();
    ST.addEventListener('refreshInit', fitRail);

    var ctx = gsap.context(function () {
      /* The opening tilt is on the inner layer, the shrink at the end on the outer one, so a fast
         scroll cannot let one undo the other. */
      gsap.fromTo(tilt, { rotation: -19, scale: 1.1 }, {
        rotation: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: root, start: 'top 75%', end: 'top -55%', scrub: 0.6 }
      });

      var big = root.querySelector('[data-cvpr-big]');
      if (big) gsap.to(big, { yPercent: -16, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: '+=100%', scrub: 0.5 } });
      var stamp = root.querySelector('[data-cvpr-stamp]');
      if (stamp) gsap.fromTo(stamp, { rotation: -40 }, { rotation: 120, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: '+=170%', scrub: 0.6 } });
      var cue = root.querySelector('[data-cvpr-cue]');
      if (cue) gsap.to(cue, { opacity: 0, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: '+=28%', scrub: true } });
      var big2 = root.querySelector('[data-cvpr-big2]');
      if (big2) gsap.fromTo(big2, { yPercent: 30 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: big2, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });

      all('[data-cvpr-rise]', root).forEach(function (el) {
        gsap.fromTo(el, { y: 44, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 94%', end: 'top 68%', scrub: 0.5 } });
      });

      /* A splat lands: the blob spreads and turns, the droplets fly out from under it, the words
         come up last. Tied to the scroll, so scrolling back draws it in again. */
      all('[data-cvpr-note]', root).forEach(function (note, i) {
        var tl = gsap.timeline({ scrollTrigger: { trigger: note, start: 'top 92%', end: 'top 46%', scrub: 0.5 } });
        var blob = note.querySelector('[data-cvpr-blob]');
        var drops = all('[data-cvpr-drops] circle', note);
        tl.fromTo(blob, { scale: 0.06, rotation: i % 2 ? 40 : -40, transformOrigin: '50% 50%' }, { scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.6)' }, 0);
        if (drops.length) tl.fromTo(drops, { x: function (n, el) { return (200 - el.getAttribute('cx')) * 0.9; }, y: function (n, el) { return (200 - el.getAttribute('cy')) * 0.9; }, scale: 0, transformOrigin: '50% 50%' },
          { x: 0, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', stagger: 0.008 }, 0.08);
        /* GSAP reads the CSS translate(-50%, -50%) as percent only when half the box rounds to the same
           pixel; at other widths it keeps it as x and y and the words slide off the splat. So say it outright. */
        tl.fromTo(note.querySelector('[data-cvpr-note-text]'), { opacity: 0, scale: 0.8, xPercent: -50, yPercent: -50, x: 0, y: 0 }, { opacity: 1, scale: 1, xPercent: -50, yPercent: -50, x: 0, y: 0, duration: 0.3, ease: 'power2.out' }, 0.45);
      });

      all('[data-cvpr-item]', root).forEach(function (el, i) {
        gsap.fromTo(el, { y: 36, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top ' + (98 - i * 2) + '%', end: 'top 76%', scrub: 0.5 } });
      });

      /* The baubles drop in as the section arrives. */
      var hanging = all('[data-cvpr-bauble]', root);
      if (hanging.length) gsap.fromTo(hanging, { y: -220 }, { y: 0, ease: 'back.out(1.3)', stagger: 0.05, scrollTrigger: { trigger: root, start: 'top 85%', end: 'top 20%', scrub: 0.6 } });

      /* Holly grows out from behind the case once it stands upright and goes before the landing:
         one timeline, so a fast scroll cannot leave it half way. */
      var sprigs = all('[data-cvpr-sprig]', root);
      if (sprigs.length && slot) {
        gsap.timeline({ scrollTrigger: { trigger: root, start: 'top -40%', endTrigger: slot, end: 'top 72%', scrub: 0.5 } })
          .fromTo(sprigs, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, stagger: 0.1, ease: 'back.out(1.6)' }, 0)
          .to(sprigs, { scale: 0, opacity: 0, duration: 1, ease: 'power2.in' }, 9);
      }

      /* The bow lands on the case as the ink splats begin, and stays on it down into the row. */
      var bow = root.querySelector('[data-cvpr-bow]');
      var bowAt = root.querySelector('[data-cvpr-note]') || slot;
      if (bow && bowAt) gsap.fromTo(bow, { scale: 0, y: -60, opacity: 0 }, { scale: 1, y: 0, opacity: 1, ease: 'back.out(2.4)', scrollTrigger: { trigger: bowAt, start: 'top 92%', end: 'top 60%', scrub: 0.4 } });

      /* The case shrinks to the size of the middle slot as it comes down onto it. */
      if (slot) {
        gsap.fromTo(box, { scale: 1 }, {
          scale: function () { return slot.offsetWidth / box.offsetWidth; },
          ease: 'none', immediateRender: false,
          scrollTrigger: {
            trigger: slot, start: 'top bottom',
            end: function () { return 'bottom ' + Math.round(window.innerHeight / 2 + box.offsetHeight / 2) + 'px'; },
            scrub: 0.4, invalidateOnRefresh: true,
            onLeave: function () {
              if (!sparks.length) return;
              if (burstCall) burstCall.kill();
              burstCall = gsap.delayedCall(0.25, burst, [gsap, sparks, hops]); // once the scrub has caught up
            }
          }
        });
      }

      /* A little give under the pointer. */
      if (fineQuery.matches && tilt) {
        gsap.set(tilt, { transformPerspective: 900 });
        var turnX = gsap.quickTo(tilt, 'rotationX', { duration: 0.8, ease: 'power3' });
        var turnY = gsap.quickTo(tilt, 'rotationY', { duration: 0.8, ease: 'power3' });
        root.addEventListener('pointermove', function (e) {
          turnY((e.clientX / window.innerWidth - 0.5) * 12);
          turnX((e.clientY / window.innerHeight - 0.5) * -8);
        }, { signal: abort.signal });
      }
    }, root);

    christmasLoop(root, gsap, ST, abort.signal);

    /* Cut the photo out when it comes near. Until then, and if it fails, the photo shows as it is. */
    var near = new IntersectionObserver(function (entries) {
      if (!entries[0] || !entries[0].isIntersecting) return;
      near.disconnect();
      cutout(root.getAttribute('data-photo')).then(function (canvas) {
        if (!alive) return;
        canvasEl = canvas;
        tilt.appendChild(canvas);
        box.classList.add('is-cut');
      }).catch(function () {});
    }, { rootMargin: '1200px 0px' });
    near.observe(root);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (alive) { fitRail(); ST.refresh(); } });
    }
    reduceQuery.addEventListener('change', function () {
      init(root);
    }, { signal: abort.signal });

    root._cvprDestroy = function () {
      alive = false;
      abort.abort();
      near.disconnect();
      ST.removeEventListener('refreshInit', fitRail);
      if (burstCall) burstCall.kill();
      gsap.killTweensOf(sparks);
      gsap.killTweensOf(hops);
      sparks.forEach(function (el) { el.remove(); });
      ctx.revert();
      gsap.set(all('[data-cvpr-bauble], [data-cvpr-garland], .cvpr__slot-photo', root), { clearProps: 'transform' });
      root.classList.remove('is-live');
      if (rail) rail.style.removeProperty('bottom');
      if (canvasEl) canvasEl.remove();
      if (box) box.classList.remove('is-cut');
      delete root._cvprDestroy;
    };
  }

  function boot(scope) {
    if (scope.matches && scope.matches(SELECTOR)) init(scope);
    if (scope.querySelectorAll) all(SELECTOR, scope).forEach(init);
  }

  boot(document);
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    var root = e.target.matches && e.target.matches(SELECTOR) ? e.target : e.target.querySelector && e.target.querySelector(SELECTOR);
    if (root && root._cvprDestroy) root._cvprDestroy();
  });
})();
