/* Casify: "The Shop Counter" product page motion (sections/cv-product-counter.liquid,
 * plus the complete-the-set and reviews sections below it).
 *
 * Loaded after the GSAP bundle (layout/theme.liquid). Nothing here runs without
 * GSAP or under reduced motion, and the page is complete without it: the title,
 * prices, photos and every control are visible from the first paint.
 *
 *   entry    the photo settles on the marble, the candy-ticket reel unrolls,
 *            the brass tag swings in on its string and comes to rest, the candy
 *            boxes pop up with their ribbons, the savings meter fills, the
 *            buttons spring, the sales notes slide in (cv-pdp-sales.js rolls
 *            their numbers up and lights the flame and the rocket)
 *   counter  the tag leans after the pointer; a photo ticket stamps into place
 *            when picked; a candy box squashes and its ribbon wiggles when chosen;
 *            the total, the savings line and the low-stock line roll over
 *            when they change; the style value flips and the model picker
 *            pulses when the shopper picks; the picked swatch pops
 *   add      the button squashes; the photo-ticket token is flown by
 *            cv-commerce-motion.js on cart:added (one token per add)
 *   buy now  ticket punch: a border draws during the POST, the arrow slides out
 *   below    complete-the-set cards pop onto the counter (and fly to the bag
 *            when added); review stars pop in
 *
 * cv-product.js announces cvs:change, cvs:adding, cvs:added and cvs:buying on
 * the [data-cv-pdp] root; cv-pdp-counter.js announces cvc:zoom, cvc:zoomstep
 * and cvc:zoomclose; cv-pdp-story.js announces cvp:set and cvp:setadded. The
 * fit section animates from cv-pdp-slip-motion.js; ribbon, spotlight, value,
 * compare, journey, reel, reviews, showcase, row and guarantee animate from
 * cv-pdp-home-motion.js.
 *
 * Lifecycle (house shape: cv-showcase-motion.js boot/destroy). Each counter root
 * gets init(root) / destroy(root); each filled complete-the-set gets setIn(set) /
 * destroySet(set). Both run inside gsap.matchMedia('(prefers-reduced-motion:
 * no-preference)') scoped to their element, so revert() undoes every start state,
 * timeline and ScrollTrigger they made, and the media function's cleanup removes
 * the listeners and observers it added. Booted on load and on
 * shopify:section:load, torn down on shopify:section:unload; section and block
 * select jump the entry to its end. Window and document listeners are added once
 * per page, never per init.
 */
(function () {
  'use strict';

  var html = document.documentElement;
  var ROOT = '[data-cv-pdp="counter"]';
  var SET = '[data-cvp-set]';
  var MOTION = '(prefers-reduced-motion: no-preference)';
  var NARROW = '(max-width: 989px)';
  function release() { html.classList.remove('cvc-pending'); }

  /* The fly to the bag belongs to assets/cv-commerce-motion.js (U1.1, requests/INF-3.md option 1):
     it hears cart:added (source 'pdp' from cv-product.js, 'set' from cv-pdp-story.js), flies one
     token from detail.from and calls CasifyBag.receive(). The module claims 'pdp' and 'set' while a
     counter is on the page; this file hands both back once the module has booted, and again after
     every theme-editor reload of the section (the module re-claims on shopify:section:load). Runs
     with or without GSAP and under reduced motion, so the claim never strands the bag receive. */
  /* layout/theme.liquid defers both files, cv-commerce-motion.js after cart.js: while deferred
     scripts run, readyState is already 'interactive' and a 0 ms timer can fire before the module
     exists, so try now, again on DOMContentLoaded (after every deferred script) and on load.
     `handed` keeps it to one hand-back per claim (reset when the editor reloads the section). */
  var handed = false;
  function handBack() {
    var M = window.CasifyMotion;
    if (handed || !M || typeof M.release !== 'function' || !document.querySelector(ROOT)) return;
    handed = true;
    M.release('pdp');
    M.release('set');
  }
  handBack();
  if (!handed) {
    document.addEventListener('DOMContentLoaded', handBack, { once: true });
    window.addEventListener('load', handBack, { once: true });
  }
  document.addEventListener('shopify:section:load', function () { handed = false; setTimeout(handBack, 0); });

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var canMotion = !!(gsap && typeof gsap.matchMedia === 'function');

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function within(scope, sel) {
    var out = [];
    if (!scope) return out;
    if (scope.matches && scope.matches(sel)) out.push(scope);
    if (scope.querySelectorAll) out = out.concat(all(sel, scope));
    return out;
  }

  /* Eases are registered once per page, not per init. */
  var drop = 'back.out(2.2)';
  var hasWiggle = false;
  if (canMotion) {
    if (window.CustomBounce) {
      window.CustomBounce.create('cvcDrop', { strength: 0.4, squash: 1.1 });
      drop = 'cvcDrop';
    }
    hasWiggle = !!window.CustomWiggle;
    if (hasWiggle) window.CustomWiggle.create('cvcWiggle', { wiggles: 5, type: 'easeOut' });
  }

  function wiggle(el, amount) {
    if (hasWiggle) {
      gsap.fromTo(el, { rotation: 0 }, { rotation: amount, duration: 0.75, ease: 'cvcWiggle', overwrite: 'auto', clearProps: 'transform' });
    } else {
      gsap.fromTo(el, { rotation: 0 }, { rotation: amount, duration: 0.14, ease: 'sine.inOut', yoyo: true, repeat: 3, overwrite: 'auto', clearProps: 'transform' });
    }
  }

  /* ================================================================ counter */
  function destroy(root) {
    if (root && typeof root._cvcmDestroy === 'function') root._cvcmDestroy();
  }

  function init(root) {
    if (!root) return;
    destroy(root);
    if (!canMotion) { release(); return; }
    var mm = gsap.matchMedia();
    root._cvcmDestroy = function () {
      mm.revert();
      delete root._cvcmDestroy;
      delete root._cvcmFinish;
      delete root._cvcmSeen;
    };
    /* `narrow` re-runs the function when the page crosses 990px. After the first run the entry is
       not replayed: the re-run jumps straight to the end state (root._cvcmSeen). */
    mm.add({ motion: MOTION, narrow: NARROW }, function (context) {
      if (!context.conditions.motion) return;
      var cleanup = counterMotion(root, context, !!context.conditions.narrow && !!ScrollTrigger, !!root._cvcmSeen);
      root._cvcmSeen = true;
      return cleanup;
    }, root);
    release();
  }

  /* Runs inside the root's gsap.matchMedia context: start states, the entry timeline and every
     tween made here are reverted by mm.revert(). The returned cleanup removes the listeners and
     observers, and stops tweens that event handlers started later (outside the context). */
  /* narrow: below 990px with ScrollTrigger loaded, the packs, meter, buttons and sales notes start
     below the fold, so they play once on a ScrollTrigger instead of in the load timeline (start
     states set here in JS only). seen: a re-run after the 990px line was crossed; everything jumps
     to its end state. .is-motion hands the meter width and the sticky bar slide from CSS to GSAP. */
  function counterMotion(root, context, narrow, seen) {
    var local = [];
    var watchers = [];
    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      local.push(function () { target.removeEventListener(eventName, handler, options); });
    }
    function $(sel, ctx) { return (ctx || root).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }
    root.classList.add('is-motion');
    local.push(function () { root.classList.remove('is-motion'); });

    /* ---------------------------------------------------------------- entry */
    var photo = $('#cvMainImage');
    var tickets = $$('.cvc__photo-ticket');
    var reelSweets = $$('.cvc__photo-reel-sweet');
    var reelPaths = $$('[data-cvc-reel-path]');
    var zoomChip = $('.cvc__zoom');
    var tag = $('.cvc__tag');
    var tagSale = $('[data-cv-tag-sale]');
    var priceProof = $('[data-cv-price-proof]');
    var rating = $('[data-cvc-rating]');
    var ratingText = $('[data-cvc-rating-text]');
    var starRows = $$('.cvc__stars .cv-stars__row');
    var packs = $$('.cvc__pack');
    var flags = $$('.cvc__flag');
    var fill = $('.cvc__meter-fill');
    var add = $('#cvAddBtn');
    var buy = $('.cvc__buy');
    var stock = $('[data-cvc-stock]');

    // Start states for the pieces the inline guard hid; words and prices stay put.
    if (tag) gsap.set(tag, { opacity: 0, y: -40, rotation: -26, transformOrigin: '62% 0%' });
    if (tagSale && !tagSale.hidden) gsap.set(tagSale, { opacity: 0, scale: 0.45, rotation: -20, transformOrigin: '50% 50%' });
    if (priceProof && !priceProof.hidden) gsap.set(priceProof, { opacity: 0, clipPath: 'inset(0 100% 0 0)' });
    if (flags.length) gsap.set(flags, { opacity: 0, y: -14, rotation: -8 });
    if (fill) gsap.set(fill, { scaleX: 0, transformOrigin: '0% 50%' });
    if (tickets.length) gsap.set(tickets, { opacity: 0, x: -14, rotation: -3, scale: 0.94 });
    if (reelSweets.length) gsap.set(reelSweets, { opacity: 0, scale: 0.65, rotation: -12 });
    if (reelPaths.length) gsap.set(reelPaths, { strokeDashoffset: 52 });
    release();

    var entry = gsap.timeline({ defaults: { ease: 'expo.out' } });
    /* low: the lower half of the entry. On wide screens it is the entry itself; on narrow ones a
       paused timeline, shifted 0.35 s earlier, that a once-only ScrollTrigger plays. */
    var low = narrow ? gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } }) : entry;
    var LO = narrow ? 0.35 : 0;
    var lowerBox = [];
    root._cvcmFinish = function () {
      entry.progress(1);
      low.progress(1);
      if (lowerBox.length) gsap.set(lowerBox, { opacity: 1, y: 0, clearProps: 'transform,opacity' });
    };
    if (photo) entry.from(photo, { scale: 1.07, duration: 1.4, ease: 'power3.out', clearProps: 'transform' }, 0);
    if (reelPaths.length) entry.to(reelPaths, { strokeDashoffset: 0, duration: 0.72, ease: 'power3.out', clearProps: 'strokeDashoffset' }, 0.04);
    if (tickets.length) entry.to(tickets, { x: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.38, stagger: 0.055, ease: 'back.out(1.55)', clearProps: 'transform,opacity' }, 0.08);
    if (reelSweets.length) entry.to(reelSweets, { opacity: 1, scale: 1, rotation: 0, duration: 0.46, stagger: 0.08, ease: 'back.out(1.7)', clearProps: 'transform,opacity' }, 0.2);
    if (tag) {
      entry.to(tag, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.2);
      entry.to(tag, { rotation: 0, duration: 1.9, ease: 'elastic.out(1, 0.26)' }, 0.2);
    }
    if (tagSale && !tagSale.hidden) entry.to(tagSale, { opacity: 1, scale: 1, rotation: -7, duration: 0.48, ease: 'back.out(2.5)', clearProps: 'transform,opacity' }, 0.58);
    if (priceProof && !priceProof.hidden) entry.to(priceProof, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.52, ease: 'expo.out', clearProps: 'opacity,clipPath' }, 0.68);
    starRows.forEach(function (row) {
      entry.from(row.querySelectorAll('.cv-stars__icon'), { y: 4, scale: 0.45, rotation: -9, opacity: 0, transformOrigin: '50% 55%', duration: 0.32, stagger: 0.045, ease: 'back.out(2.4)', clearProps: 'transform,opacity' }, 0.45);
    });
    if (ratingText) entry.from(ratingText, { opacity: 0, clipPath: 'inset(0 100% 0 0)', duration: 0.4, ease: 'power3.out', clearProps: 'opacity,clipPath' }, 0.54);
    if (packs.length) low.from(packs, { y: 22, opacity: 0, duration: 0.6, stagger: 0.09, ease: 'back.out(1.8)', clearProps: 'transform,opacity' }, 0.35 - LO);
    // cv-commerce-motion.js measures the pack outline on load, while the boxes still rise in:
    // keep it out of sight during the entrance and measure again once they have landed.
    var packGroup = packs.length ? packs[0].closest('[data-cvm-packs]') : null;
    var packOutline = packGroup ? packGroup.querySelector('[data-cvm-pack-highlight]') : null;
    if (packOutline) {
      gsap.set(packOutline, { opacity: 0 });
      low.call(function () { if (window.CasifyMotion) window.CasifyMotion.packs(packGroup); }, null, 0.95 + 0.09 * (packs.length - 1) - LO);
      low.to(packOutline, { opacity: 1, duration: 0.25, ease: 'power2.out', clearProps: 'opacity' }, '>');
    }
    if (flags.length) low.to(flags, { opacity: 1, y: 0, rotation: 0, duration: 0.7, stagger: 0.12, ease: drop, clearProps: 'transform' }, 0.75 - LO);
    if (fill) low.to(fill, { scaleX: 1, duration: 0.9, ease: 'power2.inOut', clearProps: 'transform' }, 0.9 - LO);
    if (zoomChip) entry.from(zoomChip, { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(2.4)', clearProps: 'transform,opacity' }, 0.7);
    if (stock && !stock.hidden) entry.from(stock, { opacity: 0, x: -8, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,transform' }, 0.55);
    var buttons = [add, buy].filter(Boolean);
    if (buttons.length) low.from(buttons, { scale: 0.93, duration: 0.8, stagger: 0.08, ease: 'elastic.out(1, 0.5)', clearProps: 'transform' }, 1.0 - LO);

    /* ------------------------------------------------- the sales notes */
    var pill = $('.cvc__pill:not(.cvc__pill--hint)');
    var rocket = $('.cvc__sold');
    if (pill) low.from(pill, { x: -18, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', clearProps: 'transform,opacity' }, 0.62 - LO);
    if (rocket) {
      low.from(rocket, { x: -18, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', clearProps: 'transform,opacity' }, 0.74 - LO);
      var rocketIcon = $('.cvc__sold-icon');
      if (rocketIcon) low.from(rocketIcon, { y: -12, rotation: 24, transformOrigin: '50% 80%', duration: 0.85, ease: 'elastic.out(1, 0.38)', clearProps: 'transform' }, 0.82 - LO);
    }
    // Their numbers roll up, and the dot and rocket light, from cv-pdp-sales.js.

    // The promise stamps under the price are dealt in from cv-pdp-promises.js.

    var hidden = document.visibilityState === 'hidden';
    if (hidden || seen) {
      entry.progress(1);
      low.progress(1);
    } else if (narrow) {
      /* onLeave as well as onEnter: a page restored below the packs still ends finished. play() at
         the end, or after the editor finished it, does nothing. */
      var playLow = function () { low.play(); };
      ScrollTrigger.create({ trigger: packGroup || packs[0] || fill || add || root, start: 'top 88%', once: true, onEnter: playLow, onLeave: playLow });
    }

    /* ------------------------------- the lower buy box: ship-by, rating strip, accordions
       They rise in batches as they reach the screen (ScrollTrigger.batch, once). The start state is
       set here, never in CSS; under reduced motion, without ScrollTrigger, in a hidden tab or on a
       re-run they are simply there. */
    if (ScrollTrigger && typeof ScrollTrigger.batch === 'function' && !hidden && !seen) {
      lowerBox = $$('.cvc__shipby, .cvrb, .cvc__acc').filter(function (el) { return !el.hidden && el.getClientRects().length; });
      if (lowerBox.length) {
        gsap.set(lowerBox, { opacity: 0, y: 16 });
        var rise = function (batch) {
          context.add(function () {
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform,opacity' });
          });
        };
        ScrollTrigger.batch(lowerBox, { start: 'top 92%', once: true, onEnter: rise, onLeave: rise });
      }
    }

    if (rating && window.matchMedia('(hover: hover)').matches) {
      listen(rating, 'pointerenter', function () {
        starRows.forEach(function (row) {
          gsap.fromTo(row.querySelectorAll('.cv-stars__icon'),
            { y: 0, rotation: 0 },
            { y: -2, rotation: 3, duration: 0.16, stagger: 0.025, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto', clearProps: 'transform' });
        });
      });
    }

    /* -------------------------------------------------------------- the tag */
    function swing(amount) {
      if (!tag) return;
      gsap.fromTo(tag, { rotation: amount }, { rotation: 0, duration: 1.5, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' });
    }
    var box = $('.cvc__box');
    entry.eventCallback('onComplete', function () {
      if (!tag || !box || !window.matchMedia('(hover: hover)').matches) return;
      var lean = gsap.quickTo(tag, 'rotation', { duration: 1.1, ease: 'power3.out' });
      listen(box, 'pointermove', function (e) {
        var r = box.getBoundingClientRect();
        lean(((e.clientX - r.left) / r.width - 0.5) * 7);
      });
      listen(box, 'pointerleave', function () { lean(0); });
    });

    /* -------------------------------------------------------------- choosing */
    tickets.forEach(function (ticket) {
      listen(ticket, 'click', function () {
        gsap.fromTo(ticket, { scaleX: 1.06, scaleY: 0.93 }, { scaleX: 1, scaleY: 1, duration: 0.38, ease: 'back.out(1.8)', transformOrigin: '50% 50%', overwrite: 'auto', clearProps: 'transform' });
        var outline = ticket.querySelector('.cvc__photo-ticket-outline');
        if (outline) gsap.fromTo(outline, { strokeDashoffset: 14 }, { strokeDashoffset: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto', clearProps: 'strokeDashoffset' });
        if (photo) gsap.fromTo(photo, { scale: 1.04 }, { scale: 1, duration: 0.8, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' });
      });
    });

    $$('.cvc__swatch').forEach(function (swatch) {
      listen(swatch, 'click', function () {
        gsap.fromTo(swatch, { rotation: -60, scale: 0.88 }, { rotation: 0, scale: 1, duration: 0.7, ease: 'back.out(2)', overwrite: 'auto', clearProps: 'transform' });
        swing(-9);
      });
    });

    var select = $('.cvc__select');
    if (select) {
      listen(select, 'change', function () {
        gsap.fromTo(select, { x: -5 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)', overwrite: 'auto', clearProps: 'transform' });
        swing(7);
      });
    }

    /* The travelling outline between packs is the Flip highlight of cv-commerce-motion.js
       ([data-cvm-packs] in the Liquid). Here the box squashes, and its ribbon wiggles once when the
       shopper steps up from a single case. */
    var checkedPack = $('.cvc__pack[aria-checked="true"]');
    var lastQty = checkedPack ? Number(checkedPack.getAttribute('data-cv-qty')) || 1 : 1;
    /* The module measures the newly checked box from its MutationObserver, in the same tick as this
       click. Squashing in that tick made the outline take the squashed size (7% too wide, 10% too
       short) and keep it, so the squash starts on the next frame. The chosen box also lifts 5px
       through a CSS `translate` transition that GSAP sets to none while it scales the box (here and
       in the entry), so the outline was left 5px low: it is placed again, with a short glide, when
       the lift settles. */
    function settleOutline(group) {
      var hl = group && group.querySelector('[data-cvm-pack-highlight]');
      if (!hl || !window.CasifyMotion) return;
      var was = hl.getBoundingClientRect();
      window.CasifyMotion.packs(group);
      var now = hl.getBoundingClientRect();
      var dx = was.left - now.left, dy = was.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) gsap.fromTo(hl, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform' });
    }
    listen(root, 'transitionend', function (e) {
      var t = e.target;
      if (e.propertyName !== 'translate' || !t.classList || !t.classList.contains('cvc__pack') || t.getAttribute('aria-checked') !== 'true') return;
      settleOutline(t.closest('[data-cvm-packs]'));
    });
    var frames = [];
    packs.forEach(function (pack) {
      listen(pack, 'click', function () {
        frames.push(requestAnimationFrame(function () {
          gsap.fromTo(pack, { scaleX: 1.07, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.65, ease: 'elastic.out(1, 0.4)', transformOrigin: '50% 100%', overwrite: 'auto', clearProps: 'transform' });
        }));
        var qty = Number(pack.getAttribute('data-cv-qty')) || 1;
        var flag = pack.querySelector('.cvc__flag');
        if (flag && lastQty < 2 && qty >= 2) wiggle(flag, 7);
        lastQty = qty;
      });
    });

    var totalEl = $('#cvTotal');
    var savingsEl = $('[data-cv-savings]');
    var priceEl = $('#cvPriceNow');
    var modelSelect = root.querySelector('.cvc__opt--model select[data-cv-option-index]');
    var styleValues = $$('[data-cv-opt-out]');
    var last = {
      total: totalEl ? totalEl.textContent : '',
      savings: savingsEl ? savingsEl.textContent : '',
      price: priceEl ? priceEl.textContent : '',
      model: modelSelect ? modelSelect.value : '',
      swatch: $('.cvc__swatch[aria-checked="true"]'),
      offer: (tagSale ? tagSale.hidden + '|' + tagSale.textContent : '') + '|' + (priceProof ? priceProof.hidden + '|' + priceProof.textContent : ''),
      stock: stock ? stock.hidden + '|' + stock.textContent : ''
    };
    styleValues.forEach(function (valEl) {
      last['opt' + valEl.getAttribute('data-cv-opt-out')] = valEl.textContent;
    });
    var stickyTotalEl = $('#cvStickyTotal');

    /* ------------------------------------------------ the savings meter
       cv-product.js writes the fill's width (the share of the biggest pack saving) just before
       cvs:change. Under .is-motion the CSS width transition is off, so the width is put back where it
       was and GSAP runs it to the new value; a change mid-tween starts from where the bar is. */
    if (fill) {
      var meterTo = fill.style.width || '0%';
      var meterAt = meterTo;
      var meterTween = null;
      listen(root, 'cvs:change', function () {
        var to = fill.style.width || '0%';
        if (to === meterTo) return;
        var from = meterTween ? meterAt : meterTo;
        meterTo = to;
        if (meterTween) meterTween.kill();
        if (document.hidden) { meterTween = null; meterAt = to; return; }
        meterTween = gsap.fromTo(fill, { width: from }, {
          width: to, duration: 0.6, ease: 'power3.out',
          onUpdate: function () { meterAt = fill.style.width; },
          onComplete: function () { meterTween = null; meterAt = to; fill.style.width = to; }
        });
      });
      local.push(function () {
        if (meterTween) meterTween.kill();
        meterTween = null;
        fill.style.width = meterTo;
      });
    }

    /* ------------------------------------------------ the sticky bar
       cv-product.js toggles .is-visible (and aria-hidden, tabindex) and sends cvs:sticky. Under
       .is-motion the CSS slide is off: the bar rises with a little spring and its total rolls up,
       or drops away quickly. The CSS class keeps the end state; GSAP only plays the way there. */
    var sticky = $('#cvSticky');
    if (sticky) {
      var stickyMeta = sticky.querySelector('.cvc-sticky__meta');
      listen(root, 'cvs:sticky', function (e) {
        var show = !!(e.detail && e.detail.visible);
        var off = sticky.offsetHeight + 30;
        var y = gsap.isTweening(sticky) ? gsap.getProperty(sticky, 'y') : (show ? off : 0);
        gsap.killTweensOf(sticky);
        if (stickyMeta) gsap.killTweensOf(stickyMeta);
        gsap.set(sticky, { clearProps: 'transform' });
        if (stickyMeta) gsap.set(stickyMeta, { clearProps: 'transform,opacity' });
        if (document.hidden) return;
        if (show) {
          gsap.fromTo(sticky, { xPercent: -50, x: 0, y: y }, { y: 0, duration: 0.55, ease: 'back.out(1.3)', clearProps: 'transform' });
          if (stickyMeta) gsap.fromTo(stickyMeta, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, delay: 0.2, ease: 'back.out(2)', clearProps: 'transform,opacity' });
        } else {
          gsap.fromTo(sticky, { xPercent: -50, x: 0, y: y }, { y: off, duration: 0.28, ease: 'power2.in', clearProps: 'transform' });
        }
      });
      local.push(function () {
        gsap.killTweensOf(sticky);
        gsap.set(sticky, { clearProps: 'transform' });
        if (stickyMeta) { gsap.killTweensOf(stickyMeta); gsap.set(stickyMeta, { clearProps: 'transform,opacity' }); }
      });
    }

    listen(root, 'cvs:change', function (e) {
      var d = e.detail || {};
      /* The total rolls through data-cvm-price: setting data-cents lets cv-commerce-motion.js tween
         from the old amount to the new one and end on the text cv-product.js wrote. */
      if (typeof d.total === 'number') {
        [totalEl, stickyTotalEl].forEach(function (el) {
          if (el && el.hasAttribute('data-cvm-price') && String(el.getAttribute('data-cents')) !== String(d.total)) el.setAttribute('data-cents', d.total);
        });
        last.total = totalEl ? totalEl.textContent : last.total;
      } else if (totalEl && totalEl.textContent !== last.total) {
        last.total = totalEl.textContent;
        gsap.fromTo(totalEl, { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)', overwrite: 'auto', clearProps: 'transform,opacity' });
      }
      if (savingsEl && savingsEl.textContent !== last.savings) {
        last.savings = savingsEl.textContent;
        gsap.fromTo(savingsEl, { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,opacity' });
      }
      if (priceEl && priceEl.textContent !== last.price) {
        last.price = priceEl.textContent;
        swing(-12);
      }
      var offerKey = (tagSale ? tagSale.hidden + '|' + tagSale.textContent : '') + '|' + (priceProof ? priceProof.hidden + '|' + priceProof.textContent : '');
      if (offerKey !== last.offer) {
        last.offer = offerKey;
        if (tagSale && !tagSale.hidden) {
          gsap.fromTo(tagSale, { opacity: 0.45, scale: 0.62, rotation: -18 }, { opacity: 1, scale: 1, rotation: -7, duration: 0.48, ease: 'back.out(2.5)', overwrite: 'auto', clearProps: 'transform,opacity' });
        }
        if (priceProof && !priceProof.hidden) {
          gsap.fromTo(priceProof, { opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.45, ease: 'expo.out', overwrite: 'auto', clearProps: 'opacity,clipPath' });
        }
      }
      if (stock) {
        var stockKey = stock.hidden + '|' + stock.textContent;
        if (stockKey !== last.stock) {
          last.stock = stockKey;
          if (!stock.hidden) gsap.fromTo(stock, { scale: 0.86, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.4, ease: drop, overwrite: 'auto', clearProps: 'transform' });
        }
      }

      // The style value flips up like the total when a swatch is picked.
      styleValues.forEach(function (valEl) {
        var key = 'opt' + valEl.getAttribute('data-cv-opt-out');
        if (valEl.textContent !== last[key]) {
          last[key] = valEl.textContent;
          gsap.fromTo(valEl, { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'back.out(2)', overwrite: 'auto', clearProps: 'transform,opacity' });
        }
      });

      // The model picker pulses once when the phone changes.
      if (modelSelect && modelSelect.value !== last.model) {
        last.model = modelSelect.value;
        gsap.fromTo(modelSelect, { scale: 0.98 }, { scale: 1, duration: 0.4, ease: 'back.out(2.2)', overwrite: 'auto', clearProps: 'transform' });
      }

      // The swatch the shopper just picked pops.
      var picked = $('.cvc__swatch[aria-checked="true"]');
      if (picked && picked !== last.swatch) {
        last.swatch = picked;
        gsap.fromTo(picked, { scale: 0.88 }, { scale: 1, duration: 0.45, ease: 'back.out(2.6)', overwrite: 'auto', clearProps: 'transform' });
      }
    });

    /* ------------------------------- photo: clip reveal when the variant image changes
       cv-product.js swaps #cvMainImage's src (and dims it with is-swapping). Once the new file has
       loaded, the photo rises out of a clip from the bottom edge and settles from 1.04. The start
       state is set only in the load handler, so a slow or failed load never leaves it hidden. */
    if (photo && photo.tagName === 'IMG' && typeof MutationObserver === 'function') {
      var photoSrc = photo.getAttribute('src');
      var revealPhoto = function () {
        photo.removeEventListener('load', revealPhoto);
        if (document.hidden) return;
        photo.classList.remove('is-swapping');
        gsap.fromTo(photo,
          { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.04 },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.42, ease: 'expo.out', overwrite: 'auto', clearProps: 'clipPath,transform' });
      };
      var photoWatch = new MutationObserver(function () {
        var src = photo.getAttribute('src');
        if (!src || src === photoSrc) return;
        photoSrc = src;
        photo.removeEventListener('load', revealPhoto);
        if (photo.complete && photo.naturalWidth) revealPhoto();
        else photo.addEventListener('load', revealPhoto);
      });
      photoWatch.observe(photo, { attributes: true, attributeFilter: ['src'] });
      watchers.push(photoWatch);
      local.push(function () {
        photo.removeEventListener('load', revealPhoto);
        gsap.killTweensOf(photo);
        gsap.set(photo, { clearProps: 'clipPath,transform' });
      });
    }

    /* ----------------------------- accordions: height tween on open and close
       Native <details> stays the no-JS and reduced-motion behaviour (this runs only inside the
       motion media query). Summary clicks (and Enter/Space, which fire click) are taken over:
       opening sets [open] and tweens the answer from 0 to its height; closing tweens to 0 first,
       then removes [open]. A click mid-tween reverses from the current height. */
    $$('.cvc__acc').forEach(function (acc) {
      var q = acc.querySelector('.cvc__acc-q');
      var a = acc.querySelector('.cvc__acc-a');
      if (!q || !a) return;
      var accProps = 'height,paddingBottom,opacity,overflow';
      listen(q, 'click', function (e) {
        if (document.hidden) return;
        e.preventDefault();
        var closing = acc.classList.contains('is-closing');
        var opening = !acc.open || closing;
        var fromH = acc.open ? a.offsetHeight : 0;
        gsap.killTweensOf(a);
        if (opening) {
          acc.classList.remove('is-closing');
          gsap.set(a, { clearProps: accProps });
          acc.open = true;
          var pad = window.getComputedStyle(a).paddingBottom;
          gsap.fromTo(a,
            { height: fromH, paddingBottom: closing ? pad : 0, opacity: closing ? 1 : 0, overflow: 'hidden' },
            { height: 'auto', paddingBottom: pad, opacity: 1, duration: 0.42, ease: 'expo.out', clearProps: accProps });
        } else {
          acc.classList.add('is-closing');
          gsap.fromTo(a,
            { height: fromH, overflow: 'hidden' },
            { height: 0, paddingBottom: 0, opacity: 0, duration: 0.24, ease: 'power2.in',
              onComplete: function () {
                acc.open = false;
                acc.classList.remove('is-closing');
                gsap.set(a, { clearProps: accProps });
              } });
        }
      });
      local.push(function () {
        gsap.killTweensOf(a);
        if (acc.classList.contains('is-closing')) acc.open = false;
        acc.classList.remove('is-closing');
        gsap.set(a, { clearProps: accProps });
      });
    });

    /* ---------------------------------------- add to bag: the photo-ticket token */
    function onScreen(el) {
      if (!el) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
    }

    listen(root, 'cvs:adding', function () {
      if (add && onScreen(add)) gsap.fromTo(add, { scaleX: 1, scaleY: 1 }, { scaleX: 1.04, scaleY: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' });
    });
    /* cvs:added: no token here any more. cv-product.js sends cart:added with from and img, and
       cv-commerce-motion.js flies it (one token per add). */

    /* Buy now: squash, then keep the arrow nudging toward checkout until the page leaves. */
    listen(root, 'cvs:buying', function (e) {
      var btn = e.detail && e.detail.button;
      if (!btn) return;
      gsap.fromTo(btn, { scaleX: 1, scaleY: 1 }, { scaleX: 1.04, scaleY: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' });
      var arrow = btn.querySelector('svg:not(.cvc__punch)');
      /* Ticket punch: a dashed border draws round the button while the cart is updated, then the
         arrow slides out toward checkout. If the page stays (an error), it all runs back. A
         MutationObserver on the class (cv-product.js drops is-busy) replaces the old polling. */
      var punch = btn.querySelector('.cvc__punch');
      if (!punch) {
        punch = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        punch.setAttribute('class', 'cvc__punch');
        punch.setAttribute('aria-hidden', 'true');
        punch.setAttribute('focusable', 'false');
        var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '1'); rect.setAttribute('y', '1');
        rect.setAttribute('width', '98%'); rect.setAttribute('height', '94%');
        rect.setAttribute('rx', '10'); rect.setAttribute('pathLength', '1');
        punch.appendChild(rect);
        btn.appendChild(punch);
      }
      var ring = punch.firstChild;
      var tl = gsap.timeline();
      tl.fromTo(ring, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power1.inOut' }, 0);
      if (arrow) tl.to(arrow, { x: 14, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.75);
      var watch = new MutationObserver(function () {
        if (btn.classList.contains('is-busy')) return;
        watch.disconnect();
        tl.eventCallback('onReverseComplete', function () { if (arrow) gsap.set(arrow, { clearProps: 'transform,opacity' }); });
        tl.timeScale(2).reverse();
      });
      watch.observe(btn, { attributes: true, attributeFilter: ['class'] });
      watchers.push(watch);
    });

    /* -------------------------------------------------------------- zoom */
    listen(root, 'cvc:zoom', function (e) {
      var d = e.detail || {};
      if (!d.open || !d.dialog) return;
      gsap.fromTo(d.dialog, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out', clearProps: 'opacity' });
      var img = d.dialog.querySelector('[data-cvc-zoom-img]');
      if (img) gsap.fromTo(img, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform' });
    });
    listen(root, 'cvc:zoomstep', function (e) {
      var d = e.detail || {};
      if (d.img) gsap.fromTo(d.img, { x: (d.dir || 1) * 48, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform,opacity' });
    });
    /* The dialog closes natively and instantly; here it gets a real exit so the
       zoom the entrance promised doesn't end in a hard cut. counter.js defers
       to us via a cancelable event and falls back to an instant close on its own. */
    listen(root, 'cvc:zoomclose', function (e) {
      var d = e.detail || {};
      if (!d.dialog) return;
      e.preventDefault();
      var img = d.dialog.querySelector('[data-cvc-zoom-img]');
      var tl = gsap.timeline({ onComplete: function () { d.dialog.close(); } });
      if (img) tl.to(img, { scale: 0.92, duration: 0.2, ease: 'power2.in', overwrite: 'auto' }, 0);
      tl.to(d.dialog, { opacity: 0, duration: 0.22, ease: 'power2.in', overwrite: 'auto' }, 0.02);
    });

    return function () {
      local.forEach(function (remove) { remove(); });
      local.length = 0;
      watchers.forEach(function (w) { w.disconnect(); });
      watchers.length = 0;
      frames.forEach(function (id) { cancelAnimationFrame(id); });
      frames.length = 0;
      gsap.killTweensOf([root].concat($$('*')));
      delete root._cvcmFinish;
    };
  }

  /* ======================================================= complete the set */
  /* Complete-the-set adds fly from cv-commerce-motion.js (cart:added source 'set'; the claim is
     handed back above). The cards pop in once per filled set; cv-pdp-story.js fills the set and
     announces cvp:set. */
  function destroySet(set) {
    if (set && typeof set._cvcsDestroy === 'function') set._cvcsDestroy();
  }

  function setIn(set) {
    if (!set || !canMotion || !ScrollTrigger || typeof set._cvcsDestroy === 'function' || !document.querySelector(ROOT)) return;
    var items = all('.cvp-set__item', set);
    if (!items.length) return;
    var media = all('.cvp-set__media', set);
    var mm = gsap.matchMedia();
    set._cvcsDestroy = function () { mm.revert(); delete set._cvcsDestroy; };
    mm.add(MOTION, function (context) {
      gsap.set(items, { y: 26, opacity: 0 });
      ScrollTrigger.create({
        trigger: set, start: 'top 82%', once: true,
        onEnter: function () {
          context.add(function () {
            gsap.to(items, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)', clearProps: 'transform,opacity' });
            if (media.length) gsap.from(media, { rotation: -30, scale: 0.8, duration: 1, stagger: 0.1, delay: 0.1, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' });
          });
        }
      });
    }, set);
    ScrollTrigger.refresh();
  }

  /* Make it a pair (sections/cv-pdp-set.liquid): after a one-tap Add, /cart.js says whether the bag
     now holds 2 or more phone cases, the minimum of the 2 case automatic discount (cases only, so a
     cloth or charm never counts: window.CasifyCart.caseCount in cart.js, read at call time,
     cart.item_count only if it is missing); only then the card's [data-cvp-set-pair] note shows.
     Removing [hidden] is what cv-commerce-motion.js stamps (data-cvm-stamp); under reduced motion, or without GSAP, it is a plain reveal. One document
     listener for the page's life, so editor reloads add nothing. */
  function cartRoot() {
    var r = window.Shopify && window.Shopify.routes && window.Shopify.routes.root;
    return r || '/';
  }
  document.addEventListener('cvp:setadded', function (e) {
    var item = e.detail && e.detail.item;
    var note = item && item.querySelector ? item.querySelector('[data-cvp-set-pair]') : null;
    if (!note || !note.hidden || typeof window.fetch !== 'function') return;
    window.fetch(cartRoot() + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (cart) {
        if (!cart) return;
        var cc = window.CasifyCart && window.CasifyCart.caseCount;
        var cases = typeof cc === 'function' ? cc(cart) : (cart.item_count || 0);
        if (cases >= 2 && note.isConnected) note.hidden = false;
      })
      .catch(function () {});
  });

  /* Model gate: the "Choose your model" link on a phone case card ([data-cvp-set-gate]), pressed while
     the buy box model is not chosen, scrolls to the buy box model picker (ScrollToPlugin when motion
     is allowed, an instant scroll otherwise), focuses it and sends cvs:needmodel, which
     cv-commerce-motion.js answers with its ring and shake. With a model chosen, a modified click or
     no picker, the link opens the product as before. */
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('[data-cvp-set-gate]') : null;
    if (!link || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var root = document.querySelector(ROOT);
    if (!root || root.getAttribute('data-cv-model-confirmed') !== 'false') return;
    var mi = root.getAttribute('data-model-index');
    var picker = root.querySelector('select[data-cv-option-index="' + mi + '"]') ||
      root.querySelector('button[data-cv-option-index="' + mi + '"]');
    if (!picker || !picker.getClientRects().length) return;
    e.preventDefault();
    function nudge() {
      try { picker.focus({ preventScroll: true }); } catch (err) { picker.focus(); }
      root.dispatchEvent(new CustomEvent('cvs:needmodel', { bubbles: true, detail: { button: link, kind: 'set' } }));
    }
    var smooth = !!(window.matchMedia && window.matchMedia(MOTION).matches);
    var STP = window.ScrollToPlugin;
    if (smooth && gsap && STP) {
      gsap.registerPlugin(STP);
      var y = Math.max(0, picker.getBoundingClientRect().top + window.pageYOffset - window.innerHeight * 0.35);
      gsap.to(window, { scrollTo: { y: y, autoKill: true, onAutoKill: nudge }, duration: 0.7, ease: 'power3.inOut', overwrite: 'auto', onComplete: nudge });
    } else {
      picker.scrollIntoView({ block: 'center', behavior: 'auto' });
      nudge();
    }
  });

  /* The reviews chalkboard animates from cv-pdp-reviews.js. */

  /* ================================================================== boot */
  function rootFor(target) { return within(target, ROOT)[0] || (target && target.closest && target.closest(ROOT)); }

  within(document, ROOT).forEach(init);
  all(SET + '.is-filled').forEach(setIn);

  document.addEventListener('cvp:set', function (e) { if (e.target && e.target.matches && e.target.matches(SET)) setIn(e.target); });
  document.addEventListener('shopify:section:load', function (event) {
    within(event.target, ROOT).forEach(init);
    within(event.target, SET + '.is-filled').forEach(setIn);
    if (ScrollTrigger) ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:section:unload', function (event) {
    within(event.target, ROOT).forEach(destroy);
    within(event.target, SET).forEach(destroySet);
  });
  /* In the editor, a selected section or block shows its finished state at once. */
  function finish(event) {
    var root = rootFor(event.target);
    if (root && typeof root._cvcmFinish === 'function') root._cvcmFinish();
  }
  document.addEventListener('shopify:section:select', finish);
  document.addEventListener('shopify:block:select', finish);

  if (ScrollTrigger) window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
})();
