/* Casify: motion for mix-and-match packs (snippets/cv-pack-slots.liquid).
 *
 * Every case in a pack stands in its own striped candy box:
 *   - when a pack of 2 or 3 is first shown, each box's lid pops off and the
 *     real case photo drops in, one box after another
 *   - changing the pack size re-flows the boxes with Flip; a new box drops in
 *     closed and pops its lid, a removed one lifts out
 *   - a case whose colour or phone changes hops in its box
 *
 * cv-product.js owns the state and announces it with cvs:slots-before and
 * cvs:slots on [data-cv-pdp]. Nothing runs under reduced motion; the boxes are
 * already open in CSS.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-cv-pdp]');
  var slots = root && root.querySelector('[data-cv-slots]');
  if (!slots || !window.gsap) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gsap = window.gsap;
  var Flip = window.Flip;
  var cases = gsap.utils.toArray('[data-cv-slot-case]', slots);
  var flipState = null;
  var opened = false;

  function part(box, sel) { return box.querySelector(sel); }

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

  function shown() { return cases.filter(function (c) { return !c.hidden; }); }

  /* A pack chosen on load: closed boxes, opened when they scroll into view. */
  if (!slots.hidden) {
    var first = shown();
    first.forEach(function (box) {
      gsap.set(part(box, '[data-cv-slot-photo]'), { autoAlpha: 0 });
      gsap.set(part(box, '[data-cv-slot-lid]'), { autoAlpha: 1 });
    });
    var start = function () { if (!opened) openBoxes(first); };
    if (window.ScrollTrigger) {
      window.ScrollTrigger.create({ trigger: slots, start: 'top 90%', once: true, onEnter: start });
    } else {
      start();
    }
  }

  root.addEventListener('cvs:slots-before', function () {
    flipState = (Flip && !slots.hidden && opened) ? Flip.getState(cases) : null;
  });

  root.addEventListener('cvs:slots', function (e) {
    var d = e.detail || {};
    var qty = d.qty || 0;
    if (qty < 2) { flipState = null; return; }

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
          els.forEach(function (box) {
            gsap.set(part(box, '[data-cv-slot-photo]'), { autoAlpha: 0 });
            gsap.set(part(box, '[data-cv-slot-lid]'), { autoAlpha: 1 });
          });
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
})();
