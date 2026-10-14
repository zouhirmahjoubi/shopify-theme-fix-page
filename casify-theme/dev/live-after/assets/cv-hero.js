/* Casify — homepage hero motion (sections/cv-hero.liquid).
 *
 * The section's deferred <script> sits inside <main>, ahead of the GSAP bundle
 * at the end of layout/theme.liquid, so this waits for DOMContentLoaded (which
 * fires after every deferred script) before looking for gsap. Without GSAP or
 * under reduced motion nothing runs and the hero stays in its CSS end state.
 *
 *   entry    heading words rise out of their masks and the accent's underline
 *            draws; copy and specs follow while the numbers count up. The window
 *            lifts, its striped blind rolls up, a glass sheen passes, the resting
 *            sweets drop onto the sill with a squash, the floating ones pop in,
 *            and the tag swings down on its string
 *   ambient  floating sweets bob, the tag sways, the sunburst turns — paused
 *            while the hero is off screen
 *   pointer  the window tilts toward the cursor, the photo shifts the other way
 *            and each sweet drifts by its depth (fine pointers only)
 *   scroll   the sweets rise faster than the window; the photo drifts in frame
 *   hover    sweets and the tag wiggle; the sheen passes over the window again
 *
 * Re-initialises on shopify:section:load.
 */
(function () {
  'use strict';

  var reduceQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineQuery = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');

  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function release() { document.documentElement.classList.remove('cvhero-pending'); }

  function countTarget(el) {
    return parseFloat((el.getAttribute('data-cvhero-count') || '').replace(/,/g, ''));
  }
  function writeCount(el, value) {
    var raw = el.getAttribute('data-cvhero-count');
    var decimals = (raw.split('.')[1] || '').length;
    var text = value.toFixed(decimals);
    if (raw.indexOf(',') > -1) {
      text = Number(text).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    el.textContent = text;
  }

  function init(root) {
    if (!root || root.dataset.cvheroReady === '1') return;
    root.dataset.cvheroReady = '1';

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var cleanups = [];
    var ctx = null;

    root._cvheroDestroy = function () {
      cleanups.forEach(function (fn) { fn(); });
      if (ctx) ctx.revert();
      root.dataset.cvheroReady = '';
    };

    if (!gsap || (reduceQuery && reduceQuery.matches)) { release(); return; }

    function listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      cleanups.push(function () { target.removeEventListener(type, fn, opts); });
    }

    var drop = 'bounce.out';
    if (window.CustomBounce) {
      // Also registers "cvheroDrop-squash", used for the landing squash below.
      window.CustomBounce.create('cvheroDrop', { strength: 0.4, squash: 1.4 });
      drop = 'cvheroDrop';
    }
    var wiggle = window.CustomWiggle
      ? window.CustomWiggle.create('cvheroWiggle', { wiggles: 6, type: 'easeOut' })
      : 'elastic.out(1, 0.3)';

    ctx = gsap.context(function () {
      var words = $$('.cvhero__w > span', root);
      var squiggle = root.querySelector('.cvhero__squiggle');
      var squigglePath = squiggle && squiggle.querySelector('path');
      var drawable = !!(window.DrawSVGPlugin && squigglePath);
      var ins = $$('[data-cvhero-in]', root);
      var counts = $$('[data-cvhero-count]', root).filter(function (el) { return !isNaN(countTarget(el)); });
      var copy = root.querySelector('.cvhero__copy');
      var stage = root.querySelector('.cvhero__stage');
      var win = root.querySelector('.cvhero__window');
      var photo = root.querySelector('.cvhero__photo');
      var blind = root.querySelector('.cvhero__blind');
      var sheen = root.querySelector('.cvhero__sheen');
      var burst = root.querySelector('.cvhero__sunburst');
      var tag = root.querySelector('.cvhero__tag');
      var tagCard = tag && tag.querySelector('.cvhero__tag-card');
      var sweetsBox = root.querySelector('.cvhero__sweets');
      var sweets = $$('.cvhero__sweet', root);
      var imgOf = function (s) { return s.querySelector('img'); };
      var resting = sweets.filter(function (s) { return s.getAttribute('data-kind') === 'rest'; }).map(imgOf);
      var floating = sweets.filter(function (s) { return s.getAttribute('data-kind') !== 'rest'; }).map(imgOf);
      var settled = false;
      var inView = true;
      var loops = [];

      /* Start states go on before the pending guard lifts, so nothing flashes.
         y is zeroed alongside yPercent: the CSS end-state transforms parse as px. */
      if (words.length) gsap.set(words, { y: 0, yPercent: 115, rotation: 7, transformOrigin: '0% 100%' });
      if (drawable) gsap.set(squigglePath, { drawSVG: '0%' });
      else if (squiggle) gsap.set(squiggle, { opacity: 0 });
      if (ins.length) gsap.set(ins, { opacity: 0, y: 18 });
      counts.forEach(function (el) { writeCount(el, 0); });
      if (burst) gsap.set(burst, { opacity: 0, scale: 0.6 });
      if (win) gsap.set(win, { y: 36, scale: 0.965, transformPerspective: 1100 });
      if (blind) gsap.set(blind, { y: 0, yPercent: 0 });
      if (photo) gsap.set(photo, { scale: 1.2 });
      if (resting.length) gsap.set(resting, { opacity: 0, y: -300, rotation: function (i) { return i % 2 ? 22 : -26; } });
      if (floating.length) gsap.set(floating, { opacity: 0, scale: 0.2, rotation: -40 });
      if (tag) gsap.set(tag, { opacity: 0, rotation: -75 });
      release();

      function syncAmbient() {
        loops.forEach(function (t) { if (inView) t.play(); else t.pause(); });
      }
      function settle() {
        if (settled) return;
        settled = true;
        floating.forEach(function (img, i) {
          loops.push(gsap.to(img, {
            y: i % 2 ? 9 : -11, rotation: i % 2 ? -5 : 6,
            duration: 2.4 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1
          }));
        });
        if (tag) {
          loops.push(gsap.to(tag, { keyframes: { rotation: [0, 3.5, 0, -3.5, 0], easeEach: 'sine.inOut' }, duration: 6, ease: 'none', repeat: -1 }));
        }
        if (burst) loops.push(gsap.to(burst, { rotation: '+=360', duration: 140, ease: 'none', repeat: -1 }));
        syncAmbient();
      }

      /* ---------- Entry ---------- */
      var tl = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: settle });

      // Copy: done inside ~0.8s so the promise and the button are readable at once.
      if (words.length) tl.to(words, { yPercent: 0, rotation: 0, duration: 0.8, stagger: 0.045 }, 0.05);
      if (ins.length) tl.to(ins, { opacity: 1, y: 0, duration: 0.6, stagger: 0.09, ease: 'power3.out', clearProps: 'transform' }, 0.1);
      if (squiggle) {
        if (drawable) tl.to(squigglePath, { drawSVG: '100%', duration: 0.7, ease: 'power2.inOut' }, 0.62);
        else tl.to(squiggle, { opacity: 1, duration: 0.4 }, 0.62);
      }
      if (counts.length) {
        tl.add(function () {
          counts.forEach(function (el) {
            var state = { v: 0 };
            gsap.to(state, {
              v: countTarget(el), duration: 1.2, ease: 'power2.out',
              onUpdate: function () { writeCount(el, state.v); },
              onComplete: function () { el.textContent = el.getAttribute('data-cvhero-count'); }
            });
          });
        }, 0.4);
      }

      // Window: lifts, blind rolls up with a little tug, the photo settles behind the glass.
      if (burst) tl.to(burst, { opacity: 1, scale: 1, duration: 1.6, ease: 'expo.out' }, 0);
      if (win) tl.to(win, { y: 0, scale: 1, duration: 1.1, ease: 'expo.out' }, 0);
      if (photo) tl.to(photo, { scale: 1.06, duration: 1.9, ease: 'power2.out' }, 0.3);
      if (blind) {
        tl.to(blind, { yPercent: -88, duration: 1.05, ease: 'power3.inOut' }, 0.3)
          .to(blind, { yPercent: -85, duration: 0.16, ease: 'power1.out', yoyo: true, repeat: 1 }, 1.35);
      }
      if (sheen) tl.fromTo(sheen, { xPercent: -120 }, { xPercent: 120, duration: 1.2, ease: 'power2.inOut' }, 1.0);

      // Sweets: the resting ones survive their own little drop onto the sill.
      if (resting.length) {
        tl.to(resting, { opacity: 1, duration: 0.12, stagger: 0.14, ease: 'none' }, 1.05)
          .to(resting, { y: 0, rotation: 0, duration: 1.05, stagger: 0.14, ease: drop }, 1.05);
        if (drop === 'cvheroDrop') {
          tl.fromTo(resting, { scaleX: 1, scaleY: 1 }, {
            scaleX: 1.22, scaleY: 0.78, duration: 1.05, stagger: 0.14,
            ease: 'cvheroDrop-squash', immediateRender: false
          }, 1.05);
        }
      }
      if (floating.length) tl.to(floating, { opacity: 1, scale: 1, rotation: 0, duration: 0.85, stagger: 0.1, ease: 'back.out(2.2)' }, 1.2);
      if (tag) tl.to(tag, { opacity: 1, rotation: 0, duration: 1.7, ease: 'elastic.out(1, 0.28)' }, 1.3);

      // Background tabs and prerenders get no animation frames; don't strand the hero at its start state.
      if (document.visibilityState === 'hidden') tl.progress(1);

      /* ---------- Scroll ---------- */
      if (ScrollTrigger) {
        ScrollTrigger.create({
          trigger: root, start: 'top bottom', end: 'bottom top',
          onToggle: function (self) { inView = self.isActive; syncAmbient(); }
        });
        var drift = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.6 } });
        if (sweetsBox) drift.to(sweetsBox, { yPercent: -16, ease: 'none' }, 0);
        if (photo) drift.to(photo, { yPercent: 5, ease: 'none' }, 0);
        if (copy) drift.to(copy, { y: 50, ease: 'none' }, 0);
      }

      /* ---------- Pointer ---------- */
      if (fineQuery && fineQuery.matches && stage && win) {
        var tiltX = gsap.quickTo(win, 'rotationX', { duration: 0.9, ease: 'power3.out' });
        var tiltY = gsap.quickTo(win, 'rotationY', { duration: 0.9, ease: 'power3.out' });
        var shiftX = photo ? gsap.quickTo(photo, 'x', { duration: 1.1, ease: 'power3.out' }) : null;
        var shiftY = photo ? gsap.quickTo(photo, 'y', { duration: 1.1, ease: 'power3.out' }) : null;
        var drifts = sweets.map(function (s) {
          return {
            depth: parseFloat(s.getAttribute('data-depth')) || 0.5,
            x: gsap.quickTo(s, 'x', { duration: 1, ease: 'power3.out' }),
            y: gsap.quickTo(s, 'y', { duration: 1, ease: 'power3.out' })
          };
        });
        var clamp = gsap.utils.clamp(-1, 1);
        var aim = function (nx, ny) {
          tiltY(nx * 6); tiltX(-ny * 4);
          if (shiftX) { shiftX(-nx * 10); shiftY(-ny * 8); }
          drifts.forEach(function (d) { d.x(nx * 28 * d.depth); d.y(ny * 22 * d.depth); });
        };
        listen(root, 'pointermove', function (e) {
          var r = stage.getBoundingClientRect();
          aim(clamp((e.clientX - r.left - r.width / 2) / (r.width * 0.9)),
              clamp((e.clientY - r.top - r.height / 2) / (r.height * 0.8)));
        });
        listen(root, 'pointerleave', function () { aim(0, 0); });
      }

      /* ---------- Hover ---------- */
      // Wiggles go on the wrappers: the imgs carry the drop and the bob, and
      // overwrite:'auto' there would kill the bob's rotation.
      sweets.forEach(function (s) {
        listen(s, 'mouseenter', function () {
          if (!settled) return;
          gsap.fromTo(s, { rotation: 0 }, { rotation: 14, duration: 0.9, ease: wiggle, overwrite: 'auto' });
          gsap.fromTo(s, { scale: 1 }, { scale: 1.12, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1 });
        });
      });
      if (tagCard) {
        listen(tagCard, 'mouseenter', function () {
          if (!settled) return;
          gsap.fromTo(tagCard, { rotation: 0 }, { rotation: 10, duration: 1, ease: wiggle, overwrite: 'auto' });
        });
      }
      if (win && sheen) {
        listen(win, 'mouseenter', function () {
          if (!settled) return;
          gsap.fromTo(sheen, { xPercent: -120 }, { xPercent: 120, duration: 1.1, ease: 'power2.inOut', overwrite: true });
        });
      }
    });
  }

  function boot(scope) {
    $$('[data-cv-hero]', scope).forEach(function (el) { init(el); });
  }

  function start() {
    boot(document);
    document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
    document.addEventListener('shopify:section:unload', function (e) {
      $$('[data-cv-hero]', e.target).forEach(function (el) {
        if (el._cvheroDestroy) el._cvheroDestroy();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
