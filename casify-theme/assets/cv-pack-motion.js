/* Casify: motion for mix-and-match packs (snippets/cv-pack-slots.liquid).
 *
 * Every case in a pack stands in its own striped candy box:
 *   - when a pack of 2 or 3 is first shown, each box's lid pops off and the
 *     real case photo drops in, one box after another
 *   - changing the pack size re-flows the boxes with Flip; a new box drops in
 *     closed and pops its lid, a removed one lifts out
 *   - a case whose colour or phone changes hops in its box
 *
 * cv-product.js owns the state (pack size, slot choices, the pack percentages
 * from settings.cv_pack_2_pct / cv_pack_3_pct) and announces it with
 * cvs:slots-before and cvs:slots on [data-cv-pdp]. This file only moves boxes.
 *
 * Lifecycle: one init(root) per [data-cv-pdp] that holds [data-cv-slots], on
 * load and on shopify:section:load; destroy(root) on shopify:section:unload.
 * Everything runs inside gsap.matchMedia('(prefers-reduced-motion:
 * no-preference)'), so a revert (unload, or the shopper turning reduced motion
 * on) kills the tweens, the ScrollTrigger and the root listeners and puts the
 * boxes back in their CSS finished state: open, photo showing, no lid.
 */
(function () {
  'use strict';

  var MOTION_OK = '(prefers-reduced-motion: no-preference)';

  function init(root) {
    var gsap = window.gsap;
    if (!root || root._cvpkDestroy || !gsap || !gsap.matchMedia) return;
    var slots = root.querySelector('[data-cv-slots]');
    if (!slots) return;

    var mm = gsap.matchMedia();
    mm.add(MOTION_OK, function (ctx) {
      var Flip = window.Flip;
      var cases = gsap.utils.toArray('[data-cv-slot-case]', slots);
      var parts = gsap.utils.toArray('[data-cv-slot-case], [data-cv-slot-photo], [data-cv-slot-lid]', slots);
      var flipState = null;
      var opened = false;

      function part(box, sel) { return box.querySelector(sel); }
      function shown() { return cases.filter(function (c) { return !c.hidden; }); }
      function closeBox(box) {
        gsap.set(part(box, '[data-cv-slot-photo]'), { autoAlpha: 0 });
        gsap.set(part(box, '[data-cv-slot-lid]'), { autoAlpha: 1 });
      }

      /* One box: the lid pops up and tumbles away, then the photo drops in and settles. */
      function openOne(box, i) {
        var lid = part(box, '[data-cv-slot-lid]');
        var photo = part(box, '[data-cv-slot-photo]');
        var dir = i % 2 ? -1 : 1;
        var tl = gsap.timeline();
        if (lid) {
          tl.fromTo(lid, { autoAlpha: 1, x: 0, y: 0, rotation: 0 }, {
            keyframes: [
              { y: -26, rotation: -6 * dir, duration: 0.22, ease: 'power2.out' },
              { x: 70 * dir, y: -64, rotation: 28 * dir, autoAlpha: 0, duration: 0.42, ease: 'power2.in' }
            ]
          }, 0);
        }
        if (photo) {
          tl.fromTo(photo, { y: -120, rotation: 12 * dir, autoAlpha: 0 },
            { y: 0, rotation: 0, autoAlpha: 1, duration: 0.85, ease: 'bounce.out', clearProps: 'transform' }, lid ? 0.26 : 0);
        }
        return tl;
      }

      function openBoxes(list) {
        opened = true;
        var tl = gsap.timeline();
        list.forEach(function (box, n) { tl.add(openOne(box, cases.indexOf(box)), n * 0.14); });
        return tl;
      }

      function hop(box) {
        var photo = part(box, '[data-cv-slot-photo]');
        if (!photo) return;
        gsap.timeline()
          .to(photo, { y: -22, rotation: -8, duration: 0.16, ease: 'power2.out' })
          .to(photo, { y: 0, rotation: 0, duration: 0.6, ease: 'bounce.out', clearProps: 'transform' });
      }

      /* A pack chosen on load: closed boxes (JS-set, never a CSS-only hidden state),
         opened when they scroll into view. */
      if (!slots.hidden) {
        var first = shown();
        first.forEach(closeBox);
        var start = function () { if (!opened) openBoxes(first); };
        if (window.ScrollTrigger) {
          window.ScrollTrigger.create({ trigger: slots, start: 'top 90%', once: true, onEnter: start });
        } else {
          start();
        }
      }

      /* Handlers run later, so ctx.add wraps them (named: an unnamed function would run at once);
         their tweens join this context and revert with it. */
      var onBefore = ctx.add('cvpkBefore', function () {
        flipState = (Flip && !slots.hidden && opened) ? Flip.getState(cases) : null;
      });

      var onSlots = ctx.add('cvpkSlots', function (e) {
        var d = e.detail || {};
        var qty = d.qty || 0;
        if (qty < 2 || slots.hidden) { flipState = null; return; }

        if (d.from < 2 || !opened) {
          cases.forEach(function (box) { gsap.killTweensOf([part(box, '[data-cv-slot-lid]'), part(box, '[data-cv-slot-photo]')]); });
          openBoxes(shown());
          flipState = null;
          return;
        }

        if (flipState && d.from !== qty) {
          var entering = cases.slice(d.from, qty);
          Flip.from(flipState, {
            targets: cases,
            duration: 0.5,
            ease: 'power3.out',
            absolute: true,
            onEnter: function (els) {
              els.forEach(closeBox);
              return gsap.fromTo(els, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: 'back.out(2)', clearProps: 'transform', onComplete: function () { openBoxes(entering); } });
            },
            onLeave: function (els) {
              return gsap.to(els, { y: 30, scale: 0.8, autoAlpha: 0, duration: 0.3, ease: 'power2.in' });
            }
          });
          flipState = null;
          return;
        }
        flipState = null;

        (d.changed || []).forEach(function (i) { if (cases[i] && !cases[i].hidden) hop(cases[i]); });
      });

      root.addEventListener('cvs:slots-before', onBefore);
      root.addEventListener('cvs:slots', onSlots);
      root.classList.add('cvpk-motion');

      return function () {
        root.removeEventListener('cvs:slots-before', onBefore);
        root.removeEventListener('cvs:slots', onSlots);
        root.classList.remove('cvpk-motion');
        flipState = null;
        /* Runs after the context reverted its tweens. GSAP folds the photo's CSS tilt (rotate) into
           an inline transform; clear what is left so the CSS finished state (one tilt) is back. */
        gsap.set(parts, { clearProps: 'all' });
      };
    });

    root._cvpkDestroy = function () {
      mm.revert();
      delete root._cvpkDestroy;
    };
  }

  function destroy(root) {
    if (root && root._cvpkDestroy) root._cvpkDestroy();
  }

  function rootsIn(node) {
    if (!node || !node.querySelectorAll) return [];
    var list = Array.prototype.slice.call(node.querySelectorAll('[data-cv-pdp]'));
    if (node.matches && node.matches('[data-cv-pdp]')) list.unshift(node);
    return list;
  }

  rootsIn(document).forEach(init);
  document.addEventListener('shopify:section:unload', function (e) { rootsIn(e.target).forEach(destroy); });
  document.addEventListener('shopify:section:load', function (e) { rootsIn(e.target).forEach(init); });

  window.CasifyPackMotion = { init: init, destroy: destroy };
})();
