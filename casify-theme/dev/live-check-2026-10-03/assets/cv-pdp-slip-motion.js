/* Casify: product page motion (the order slip and the story below it).
 *
 * Loaded after the GSAP bundle (layout/theme.liquid). Nothing here runs without
 * GSAP or under reduced motion, and the page is complete without it: titles,
 * prices, photos and every control are visible from the first paint.
 *
 *   entry    the slip settles onto the counter, the tape presses down, the
 *            numbered stamps thump in, the total writes itself, the photo eases
 *            into the window
 *   choose   picking a phone, style or pack re-stamps that line's number, hops
 *            the chosen control and rewrites the total
 *   add      signature: a torn-off stub ("2 cases") leaves the slip and flies
 *            to the bag in the header, which bounces when it lands
 *   story    fit models cascade in as the section scrolls into view
 *
 * cv-product.js announces changes with cvs:change, cvs:models, cvs:adding and
 * cvs:added on the [data-cv-pdp] root. Every other home section rebuilt onto
 * this template (ribbon, spotlight, value, compare, journey, reel,
 * showcase, row, guarantee) gets its motion from cv-pdp-home-motion.js.
 */
(function () {
  'use strict';

  var html = document.documentElement;
  function release() { html.classList.remove('cvs-pending'); }

  var root = document.querySelector('[data-cv-pdp]');
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!root || !gsap || reduce) { release(); return; }
  // The Shop Counter runs its own entry and add-to-bag motion (cv-pdp-counter-motion.js); the story below is shared.
  var isCounter = root.getAttribute('data-cv-pdp') === 'counter';

  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

  var bounce = 'back.out(2.6)';
  if (window.CustomBounce) {
    window.CustomBounce.create('cvsStamp', { strength: 0.35, squash: 1.2 });
    bounce = 'cvsStamp';
  }

  /* ------------------------------------------------------------------ entry */
  var slip = $('.cvs__slip');
  var tape = $('.cvs__tape');
  var stamps = $$('.cvs__stamp');
  var totalBits = [$('.cvs__total-label'), $('.cvs__total-value')].filter(Boolean);
  var cta = isCounter ? null : $('#cvAddBtn');
  var photo = isCounter ? null : $('#cvMainImage');
  var thumbs = $$('.cvs__thumb');

  // Start states for the decorative pieces the inline guard hid; the slip's words stay put.
  if (stamps.length) gsap.set(stamps, { opacity: 0, scale: 1.8, rotation: -34 });
  if (tape) gsap.set(tape, { opacity: 0, scale: 1.3, rotation: 9, transformOrigin: '30% 60%' });
  if (totalBits.length) gsap.set(totalBits, { clipPath: 'inset(-20% 100% -20% 0%)' });
  release();

  var entry = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (slip) entry.from(slip, { y: -22, rotation: -4.5, duration: 0.9, clearProps: 'y' }, 0);
  if (photo) entry.from(photo, { scale: 1.08, duration: 1.3, ease: 'power3.out' }, 0);
  if (thumbs.length) entry.from(thumbs, { y: 12, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }, 0.15);
  if (tape) entry.to(tape, { opacity: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'power4.out' }, 0.25);
  if (stamps.length) entry.to(stamps, { opacity: 1, scale: 1, rotation: -8, duration: 0.55, stagger: 0.13, ease: bounce }, 0.35);
  if (totalBits.length) entry.to(totalBits, { clipPath: 'inset(-20% 0% -20% 0%)', duration: 0.7, stagger: 0.18, ease: 'power2.inOut', clearProps: 'clipPath' }, 0.7);
  if (cta) entry.from(cta, { scale: 0.94, duration: 0.8, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' }, 1.05);
  if (document.visibilityState === 'hidden') entry.progress(1);

  /* ------------------------------------------------------------ choosing */
  var totalValue = $('.cvs__total-value');
  var lastTotal = totalValue ? totalValue.textContent : '';

  function restamp(control) {
    var line = control.closest('.cvs__line');
    var stamp = line && line.querySelector('.cvs__stamp');
    if (stamp) {
      gsap.fromTo(stamp, { scale: 1.5, rotation: -20 }, { scale: 1, rotation: -8, duration: 0.5, ease: bounce, overwrite: 'auto' });
    }
    gsap.fromTo(control, { y: 0 }, { y: -4, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto', clearProps: 'transform' });
  }
  $$('.cvs__pill, .cvs__pack, .cvs__model').forEach(function (control) {
    control.addEventListener('click', function () { restamp(control); });
  });

  root.addEventListener('cvs:change', function () {
    if (!totalValue || totalValue.textContent === lastTotal) return;
    lastTotal = totalValue.textContent;
    gsap.fromTo(totalValue, { clipPath: 'inset(-20% 100% -20% 0%)' }, { clipPath: 'inset(-20% 0% -20% 0%)', duration: 0.5, ease: 'power2.out', overwrite: 'auto', clearProps: 'clipPath' });
  });

  root.addEventListener('cvs:models', function (e) {
    if (!e.detail || !e.detail.open) return;
    gsap.from($$('.cvs__model'), { opacity: 0, y: 8, duration: 0.32, stagger: { amount: 0.3 }, ease: 'power3.out', clearProps: 'opacity,transform' });
  });

  /* ---------------------------------------------- add to bag: the torn stub */
  root.addEventListener('cvs:adding', function () {
    if (cta) gsap.fromTo(cta, { scaleX: 1, scaleY: 1 }, { scaleX: 1.04, scaleY: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' });
  });

  function bagTarget() {
    var candidates = $$('#bagBtn, [data-cart-drawer-open], .nav__icons .iconbtn:last-child', document);
    for (var i = 0; i < candidates.length; i++) {
      var r = candidates[i].getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < window.innerHeight) return candidates[i];
    }
    return null;
  }

  root.addEventListener('cvs:added', function (e) {
    var qty = e.detail && e.detail.qty ? e.detail.qty : 1;
    var from = cta ? cta.getBoundingClientRect() : null;
    if (!from) return;
    var target = bagTarget();
    var to = target ? target.getBoundingClientRect() : { left: window.innerWidth - 60, top: -40, width: 40, height: 40 };

    var stub = document.createElement('span');
    stub.className = 'cvs__stub';
    stub.setAttribute('aria-hidden', 'true');
    stub.textContent = qty + (qty > 1 ? ' cases' : ' case');
    document.body.appendChild(stub);

    var sx = from.left + from.width / 2 - stub.offsetWidth / 2;
    var sy = from.top + from.height / 2 - stub.offsetHeight / 2;
    var ex = to.left + to.width / 2 - stub.offsetWidth / 2;
    var ey = to.top + to.height / 2 - stub.offsetHeight / 2;

    var tl = gsap.timeline({ onComplete: function () { stub.remove(); } });
    tl.set(stub, { x: sx, y: sy, rotation: -6, scale: 0.6, opacity: 0 })
      .to(stub, { opacity: 1, scale: 1, y: sy - 34, rotation: 6, duration: 0.3, ease: 'back.out(2)' });
    if (window.MotionPathPlugin) {
      tl.to(stub, {
        duration: 0.85, ease: 'power2.in', rotation: -24, scale: 0.35,
        motionPath: { path: [{ x: sx + (ex - sx) * 0.35, y: Math.min(sy, ey) - 120 }, { x: ex, y: ey }], curviness: 1.4 }
      });
    } else {
      tl.to(stub, { x: ex, y: ey, rotation: -24, scale: 0.35, duration: 0.85, ease: 'power2.in' });
    }
    tl.to(stub, { opacity: 0, duration: 0.12 }, '-=0.1');
    if (target) {
      var ico = target.querySelector('.cm-icon, svg') || target;
      tl.fromTo(ico, { scale: 1 }, { scale: 1.35, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' }, '-=0.05');
    }
  });

  /* ------------------------------------------------------------------ story */
  if (!ScrollTrigger) return;

  function onEnter(el, fn, start) {
    ScrollTrigger.create({ trigger: el, start: start || 'top 82%', once: true, onEnter: fn });
  }

  $$('[data-cvp-fit]', document).forEach(function (fit) {
    var pad = fit.querySelector('.cvp-fit__pad');
    var models = $$('.cvp-fit__model', fit);
    if (pad) gsap.set(pad, { y: 30, opacity: 0 });
    if (models.length) gsap.set(models, { y: 12, opacity: 0 });
    onEnter(fit, function () {
      if (pad) gsap.to(pad, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', clearProps: 'transform' });
      if (models.length) gsap.to(models, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', stagger: { amount: 0.55, from: 'start' }, delay: 0.15, clearProps: 'transform,opacity' });
    });
    fit.addEventListener('cvp:filter', function () {
      gsap.fromTo(models.filter(function (m) { return !m.parentNode.hidden; }), { y: 6 }, { y: 0, duration: 0.25, ease: 'power2.out', stagger: 0.01, overwrite: 'auto', clearProps: 'transform' });
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
