/* Casify: product page motion (the order slip and the story below it).
 *
 * Loaded at the end of <body> on product templates (layout/theme.liquid),
 * after the GSAP bundle. Nothing here runs without GSAP or under reduced
 * motion, and the page is complete without it: titles, prices, photos and
 * every control are visible from the first paint.
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
 * Lifecycle (MOTION-SYSTEM 4.4 shape 3, 4.6): one gsap.matchMedia per
 * [data-cv-pdp] root and per [data-cvp-fit] section, with
 * (prefers-reduced-motion: no-preference). shopify:section:load re-inits,
 * :unload reverts (tweens, triggers, listeners, a stub still in flight),
 * :select and :block:select jump the entry to its end.
 *
 * cv-product.js owns the buy box and announces cvs:change, cvs:models,
 * cvs:adding and cvs:added on the [data-cv-pdp] root; this file only listens.
 * The Shop Counter ([data-cv-pdp="counter"]) runs its own entry and
 * add-to-bag motion (cv-pdp-counter-motion.js), so on that root the CTA and
 * photo are left alone and no stub flies (isCounter, MOTION-SYSTEM 7.7).
 * Every other home section rebuilt onto this template gets its motion from
 * cv-pdp-home-motion.js.
 */
(function () {
  'use strict';

  var PDP = '[data-cv-pdp]';
  var FIT = '[data-cvp-fit]';
  var html = document.documentElement;
  function release() { html.classList.remove('cvs-pending'); }
  function all(q, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(q)); }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !gsap.matchMedia) { release(); return; }

  var bounce = 'back.out(2.6)';
  if (window.CustomBounce) {
    window.CustomBounce.create('cvsStamp', { strength: 0.35, squash: 1.2 });
    bounce = 'cvsStamp';
  }
  var MOTION = { motion: '(prefers-reduced-motion: no-preference)' };

  function bagTarget() {
    var candidates = all('#bagBtn, [data-cart-drawer-open], .nav__icons .iconbtn:last-child');
    for (var i = 0; i < candidates.length; i++) {
      var r = candidates[i].getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < window.innerHeight) return candidates[i];
    }
    return null;
  }

  /* ------------------------------------------------------------ the slip */
  function initPdp(root) {
    if (root._cvsMotion) root._cvsMotion.destroy();
    var api = root._cvsMotion = { entry: null };
    // The Shop Counter runs its own entry and add-to-bag motion; the story below is shared.
    var isCounter = root.getAttribute('data-cv-pdp') === 'counter';
    function one(q) { return root.querySelector(q); }

    var mm = gsap.matchMedia();
    mm.add(MOTION, function (context) {
      if (!context.conditions.motion) { release(); return; }
      var off = [];
      function on(target, type, fn) { target.addEventListener(type, fn); off.push(function () { target.removeEventListener(type, fn); }); }

      /* ---------------------------------------------------------- entry */
      var slip = one('.cvs__slip');
      var tape = one('.cvs__tape');
      var stamps = all('.cvs__stamp', root);
      var totalBits = [one('.cvs__total-label'), one('.cvs__total-value')].filter(Boolean);
      var cta = isCounter ? null : one('#cvAddBtn');
      var photo = isCounter ? null : one('#cvMainImage');
      var thumbs = all('.cvs__thumb', root);

      // Start states for the decorative pieces the inline guard hid; the slip's words stay put.
      if (stamps.length) gsap.set(stamps, { opacity: 0, scale: 1.8, rotation: -34 });
      if (tape) gsap.set(tape, { opacity: 0, scale: 1.3, rotation: 9, transformOrigin: '30% 60%' });
      if (totalBits.length) gsap.set(totalBits, { clipPath: 'inset(-20% 100% -20% 0%)' });
      release();

      var entry = api.entry = gsap.timeline({ defaults: { ease: 'expo.out' } });
      if (slip) entry.from(slip, { y: -22, rotation: -4.5, duration: 0.9, clearProps: 'y' }, 0);
      if (photo) entry.from(photo, { scale: 1.08, duration: 1.3, ease: 'power3.out' }, 0);
      if (thumbs.length) entry.from(thumbs, { y: 12, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' }, 0.15);
      if (tape) entry.to(tape, { opacity: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'power4.out' }, 0.25);
      if (stamps.length) entry.to(stamps, { opacity: 1, scale: 1, rotation: -8, duration: 0.55, stagger: 0.13, ease: bounce }, 0.35);
      if (totalBits.length) entry.to(totalBits, { clipPath: 'inset(-20% 0% -20% 0%)', duration: 0.7, stagger: 0.18, ease: 'power2.inOut', clearProps: 'clipPath' }, 0.7);
      if (cta) entry.from(cta, { scale: 0.94, duration: 0.8, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' }, 1.05);
      if (document.visibilityState === 'hidden') entry.progress(1);

      /* ------------------------------------------------------- choosing */
      var totalValue = one('.cvs__total-value');
      var lastTotal = totalValue ? totalValue.textContent : '';

      function restamp(control) {
        var line = control.closest('.cvs__line');
        var stamp = line && line.querySelector('.cvs__stamp');
        if (stamp) gsap.fromTo(stamp, { scale: 1.5, rotation: -20 }, { scale: 1, rotation: -8, duration: 0.5, ease: bounce, overwrite: 'auto' });
        gsap.fromTo(control, { y: 0 }, { y: -4, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto', clearProps: 'transform' });
      }
      /* delegated, so model buttons the buy box draws later are covered too */
      on(root, 'click', function (e) {
        var control = e.target && e.target.closest && e.target.closest('.cvs__pill, .cvs__pack, .cvs__model');
        if (control && root.contains(control)) restamp(control);
      });

      on(root, 'cvs:change', function () {
        if (!totalValue || totalValue.textContent === lastTotal) return;
        lastTotal = totalValue.textContent;
        gsap.fromTo(totalValue, { clipPath: 'inset(-20% 100% -20% 0%)' }, { clipPath: 'inset(-20% 0% -20% 0%)', duration: 0.5, ease: 'power2.out', overwrite: 'auto', clearProps: 'clipPath' });
      });

      on(root, 'cvs:models', function (e) {
        if (!e.detail || !e.detail.open) return;
        var models = all('.cvs__model', root);
        if (models.length) gsap.from(models, { opacity: 0, y: 8, duration: 0.32, stagger: { amount: 0.3 }, ease: 'power3.out', clearProps: 'opacity,transform' });
      });

      /* ----------------------------------------- add to bag: the torn stub */
      on(root, 'cvs:adding', function () {
        if (cta) gsap.fromTo(cta, { scaleX: 1, scaleY: 1 }, { scaleX: 1.04, scaleY: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' });
      });

      var stubs = [];
      on(root, 'cvs:added', function (e) {
        if (isCounter || !cta) return;
        var qty = e.detail && e.detail.qty ? e.detail.qty : 1;
        var from = cta.getBoundingClientRect();
        var target = bagTarget();
        var to = target ? target.getBoundingClientRect() : { left: window.innerWidth - 60, top: -40, width: 40, height: 40 };

        var stub = document.createElement('span');
        stub.className = 'cvs__stub';
        stub.setAttribute('aria-hidden', 'true');
        stub.textContent = qty + (qty > 1 ? ' cases' : ' case');
        document.body.appendChild(stub);
        stubs.push(stub);

        var sx = from.left + from.width / 2 - stub.offsetWidth / 2;
        var sy = from.top + from.height / 2 - stub.offsetHeight / 2;
        var ex = to.left + to.width / 2 - stub.offsetWidth / 2;
        var ey = to.top + to.height / 2 - stub.offsetHeight / 2;

        var tl = gsap.timeline({ onComplete: function () { stub.remove(); stubs = stubs.filter(function (s) { return s !== stub; }); } });
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
        if (document.visibilityState === 'hidden') tl.progress(1);
      });

      return function () {
        off.forEach(function (fn) { fn(); });
        stubs.forEach(function (s) { s.remove(); });
        stubs = [];
        api.entry = null;
      };
    }, root);

    api.finish = function () { if (api.entry) api.entry.progress(1); };
    api.destroy = function () { mm.revert(); delete root._cvsMotion; };
  }

  /* ------------------------------------------------------------ the fit story */
  function initFit(fit) {
    if (fit._cvsFit) fit._cvsFit.destroy();
    var api = fit._cvsFit = { anim: null };
    var mm = gsap.matchMedia();
    mm.add(MOTION, function (context) {
      if (!context.conditions.motion || !ScrollTrigger) return;
      var pad = fit.querySelector('.cvp-fit__pad');
      var models = all('.cvp-fit__model', fit);
      if (!pad && !models.length) return;
      if (pad) gsap.set(pad, { y: 30, opacity: 0 });
      if (models.length) gsap.set(models, { y: 12, opacity: 0 });
      var played = false;
      function play() {
        if (played) return;
        played = true;
        var tl = api.anim = gsap.timeline();
        if (pad) tl.to(pad, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', clearProps: 'transform,opacity' }, 0);
        if (models.length) tl.to(models, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', stagger: { amount: 0.55, from: 'start' }, clearProps: 'transform,opacity' }, 0.15);
        if (document.visibilityState === 'hidden') tl.progress(1);
      }
      var r = fit.getBoundingClientRect();
      if (r.top <= window.innerHeight * 0.82) play();
      else ScrollTrigger.create({ trigger: fit, start: 'top 82%', once: true, onEnter: play });
      /* a missed trigger (restored scroll, jump link) never leaves the list hidden */
      var safety = function () { if (!played && fit.getBoundingClientRect().top <= window.innerHeight * 0.82) play(); };
      ScrollTrigger.addEventListener('scrollEnd', safety);
      ScrollTrigger.addEventListener('refresh', safety);
      var onFilter = function () {
        gsap.fromTo(models.filter(function (m) { return !m.parentNode.hidden; }), { y: 6 }, { y: 0, duration: 0.25, ease: 'power2.out', stagger: 0.01, overwrite: 'auto', clearProps: 'transform' });
      };
      fit.addEventListener('cvp:filter', onFilter);
      api.play = play;
      return function () {
        ScrollTrigger.removeEventListener('scrollEnd', safety);
        ScrollTrigger.removeEventListener('refresh', safety);
        fit.removeEventListener('cvp:filter', onFilter);
        api.anim = null;
        api.play = null;
      };
    }, fit);
    api.finish = function () { if (api.play) api.play(); if (api.anim) api.anim.progress(1); };
    api.destroy = function () { mm.revert(); delete fit._cvsFit; };
  }

  /* ------------------------------------------------------------ lifecycle */
  function within(node, sel) {
    if (!node || !node.querySelectorAll) return [];
    var out = node.matches && node.matches(sel) ? [node] : [];
    return out.concat(all(sel, node));
  }
  function boot(scope) {
    within(scope, PDP).forEach(initPdp);
    within(scope, FIT).forEach(initFit);
    if (!within(document, PDP).length) release();
    if (ScrollTrigger) ScrollTrigger.refresh();
  }
  function each(node, fn) {
    within(node, PDP).forEach(function (r) { if (r._cvsMotion) fn(r._cvsMotion); });
    within(node, FIT).forEach(function (f) { if (f._cvsFit) fn(f._cvsFit); });
  }

  boot(document);
  if (ScrollTrigger) window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });

  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) { each(e.target, function (api) { api.destroy(); }); });
  document.addEventListener('shopify:section:select', function (e) {
    each(e.target, function (api) { api.finish(); });
    if (ScrollTrigger) ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:block:select', function (e) {
    var host = e.target && e.target.closest && (e.target.closest(PDP) || e.target.closest(FIT));
    if (host) each(host, function (api) { api.finish(); });
  });
})();
