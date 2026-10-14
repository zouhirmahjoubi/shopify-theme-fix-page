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
 *            buttons spring
 *   counter  the tag leans after the pointer; a photo ticket stamps into place
 *            when picked; a candy box squashes and its ribbon wiggles when chosen;
 *            the total, the savings line and the low-stock line roll over
 *            when they change
 *   add      signature: the chosen photo, as a striped ticket token with the
 *            pack count, arcs from the button to the bag, which bounces
 *   buy now  the arrow keeps nudging toward checkout while the cart is updated
 *   below    complete-the-set cards pop onto the counter (and fly to the bag
 *            when added); review stars pop in
 *
 * cv-product.js announces cvs:change, cvs:adding, cvs:added and cvs:buying on
 * the [data-cv-pdp] root; cv-pdp-counter.js announces cvc:zoom, cvc:zoomstep
 * and cvc:zoomclose; cv-pdp-story.js announces cvp:set and cvp:setadded. The
 * fit section animates from cv-pdp-slip-motion.js; ribbon, spotlight, value,
 * compare, journey, reel, reviews, showcase, row and guarantee animate from
 * cv-pdp-home-motion.js.
 */
(function () {
  'use strict';

  var html = document.documentElement;
  function release() { html.classList.remove('cvc-pending'); }

  var root = document.querySelector('[data-cv-pdp="counter"]');
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!root || !gsap || reduce) { release(); return; }

  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

  var drop = 'back.out(2.2)';
  if (window.CustomBounce) {
    window.CustomBounce.create('cvcDrop', { strength: 0.4, squash: 1.1 });
    drop = 'cvcDrop';
  }
  var hasWiggle = !!window.CustomWiggle;
  if (hasWiggle) window.CustomWiggle.create('cvcWiggle', { wiggles: 5, type: 'easeOut' });

  function wiggle(el, amount) {
    if (hasWiggle) {
      gsap.fromTo(el, { rotation: 0 }, { rotation: amount, duration: 0.75, ease: 'cvcWiggle', overwrite: 'auto', clearProps: 'transform' });
    } else {
      gsap.fromTo(el, { rotation: 0 }, { rotation: amount, duration: 0.14, ease: 'sine.inOut', yoyo: true, repeat: 3, overwrite: 'auto', clearProps: 'transform' });
    }
  }

  /* ------------------------------------------------------------------ entry */
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
  var benefitsRibbon = $('[data-cvc-benefits]');
  var benefitItems = $$('[data-cvc-benefit]');
  var benefitIcons = $$('[data-cvc-benefit-icon]');

  // Start states for the pieces the inline guard hid; words and prices stay put.
  if (tag) gsap.set(tag, { opacity: 0, y: -40, rotation: -26, transformOrigin: '62% 0%' });
  if (tagSale && !tagSale.hidden) gsap.set(tagSale, { opacity: 0, scale: 0.45, rotation: -20, transformOrigin: '50% 50%' });
  if (priceProof && !priceProof.hidden) gsap.set(priceProof, { opacity: 0, clipPath: 'inset(0 100% 0 0)' });
  if (flags.length) gsap.set(flags, { opacity: 0, y: -14, rotation: -8 });
  if (fill) gsap.set(fill, { scaleX: 0, transformOrigin: '0% 50%' });
  if (tickets.length) gsap.set(tickets, { opacity: 0, x: -14, rotation: -3, scale: 0.94 });
  if (reelSweets.length) gsap.set(reelSweets, { opacity: 0, scale: 0.65, rotation: -12 });
  if (reelPaths.length) gsap.set(reelPaths, { strokeDashoffset: 52 });
  var benefitsTl = null;
  if (benefitsRibbon) {
    gsap.set(benefitsRibbon, { opacity: 0, clipPath: 'inset(0 100% 0 0)', boxShadow: '0 1px 1px -1px rgba(51, 35, 26, 0.12)' });
    if (benefitItems.length) gsap.set(benefitItems, { opacity: 0, y: 7 });
    if (benefitIcons.length) gsap.set(benefitIcons, { scale: 0.88, rotation: -4, transformOrigin: '50% 50%' });
    benefitsTl = gsap.timeline({ paused: true });
    benefitsTl.to(benefitsRibbon, {
      opacity: 1,
      clipPath: 'inset(0 0% 0 0)',
      boxShadow: '0 6px 12px -10px rgba(51, 35, 26, 0.4)',
      duration: 0.42,
      ease: 'power3.out',
      clearProps: 'opacity,clipPath,boxShadow'
    }, 0);
    if (benefitItems.length) benefitsTl.to(benefitItems, { opacity: 1, y: 0, duration: 0.24, stagger: 0.055, ease: 'power2.out', clearProps: 'opacity,transform' }, 0.16);
    if (benefitIcons.length) benefitsTl.to(benefitIcons, { scale: 1, rotation: 0, duration: 0.26, stagger: 0.055, ease: 'power2.out', clearProps: 'transform' }, 0.22);
  }
  release();

  var entry = gsap.timeline({ defaults: { ease: 'expo.out' } });
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
  if (packs.length) entry.from(packs, { y: 22, opacity: 0, duration: 0.6, stagger: 0.09, ease: 'back.out(1.8)', clearProps: 'transform,opacity' }, 0.35);
  if (flags.length) entry.to(flags, { opacity: 1, y: 0, rotation: 0, duration: 0.7, stagger: 0.12, ease: drop, clearProps: 'transform' }, 0.75);
  if (fill) entry.to(fill, { scaleX: 1, duration: 0.9, ease: 'power2.inOut', clearProps: 'transform' }, 0.9);
  if (zoomChip) entry.from(zoomChip, { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(2.4)', clearProps: 'transform,opacity' }, 0.7);
  if (stock && !stock.hidden) entry.from(stock, { opacity: 0, x: -8, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,transform' }, 0.55);
  var buttons = [add, buy].filter(Boolean);
  if (buttons.length) entry.from(buttons, { scale: 0.93, duration: 0.8, stagger: 0.08, ease: 'elastic.out(1, 0.5)', clearProps: 'transform' }, 1.0);
  if (benefitsTl) {
    if (ScrollTrigger) {
      ScrollTrigger.create({ trigger: benefitsRibbon, start: 'top 88%', once: true, onEnter: function () { benefitsTl.play(); } });
    } else {
      entry.call(function () { benefitsTl.play(); }, null, 0.72);
    }
  }
  if (document.visibilityState === 'hidden') {
    entry.progress(1);
    if (benefitsTl) benefitsTl.progress(1);
  }

  if (rating && window.matchMedia('(hover: hover)').matches) {
    rating.addEventListener('pointerenter', function () {
      starRows.forEach(function (row) {
        gsap.fromTo(row.querySelectorAll('.cv-stars__icon'),
          { y: 0, rotation: 0 },
          { y: -2, rotation: 3, duration: 0.16, stagger: 0.025, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto', clearProps: 'transform' });
      });
    });
  }

  /* ---------------------------------------------------------------- the tag */
  function swing(amount) {
    if (!tag) return;
    gsap.fromTo(tag, { rotation: amount }, { rotation: 0, duration: 1.5, ease: 'elastic.out(1, 0.3)', overwrite: 'auto' });
  }
  var box = $('.cvc__box');
  entry.eventCallback('onComplete', function () {
    if (!tag || !box || !window.matchMedia('(hover: hover)').matches) return;
    var lean = gsap.quickTo(tag, 'rotation', { duration: 1.1, ease: 'power3.out' });
    box.addEventListener('pointermove', function (e) {
      var r = box.getBoundingClientRect();
      lean(((e.clientX - r.left) / r.width - 0.5) * 7);
    });
    box.addEventListener('pointerleave', function () { lean(0); });
  });

  /* ---------------------------------------------------------------- choosing */
  tickets.forEach(function (ticket) {
    ticket.addEventListener('click', function () {
      gsap.fromTo(ticket, { scaleX: 1.06, scaleY: 0.93 }, { scaleX: 1, scaleY: 1, duration: 0.38, ease: 'back.out(1.8)', transformOrigin: '50% 50%', overwrite: 'auto', clearProps: 'transform' });
      var outline = ticket.querySelector('.cvc__photo-ticket-outline');
      if (outline) gsap.fromTo(outline, { strokeDashoffset: 14 }, { strokeDashoffset: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto', clearProps: 'strokeDashoffset' });
      if (photo) gsap.fromTo(photo, { scale: 1.04 }, { scale: 1, duration: 0.8, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' });
    });
  });

  $$('.cvc__swatch').forEach(function (swatch) {
    swatch.addEventListener('click', function () {
      gsap.fromTo(swatch, { rotation: -60, scale: 0.88 }, { rotation: 0, scale: 1, duration: 0.7, ease: 'back.out(2)', overwrite: 'auto', clearProps: 'transform' });
      swing(-9);
    });
  });

  var select = $('.cvc__select');
  if (select) {
    select.addEventListener('change', function () {
      gsap.fromTo(select, { x: -5 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)', overwrite: 'auto', clearProps: 'transform' });
      swing(7);
    });
  }

  packs.forEach(function (pack) {
    pack.addEventListener('click', function () {
      gsap.fromTo(pack, { scaleX: 1.07, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.65, ease: 'elastic.out(1, 0.4)', transformOrigin: '50% 100%', overwrite: 'auto', clearProps: 'transform' });
      var flag = pack.querySelector('.cvc__flag');
      if (flag) wiggle(flag, 7);
    });
  });

  var totalEl = $('#cvTotal');
  var savingsEl = $('[data-cv-savings]');
  var priceEl = $('#cvPriceNow');
  var last = {
    total: totalEl ? totalEl.textContent : '',
    savings: savingsEl ? savingsEl.textContent : '',
    price: priceEl ? priceEl.textContent : '',
    offer: (tagSale ? tagSale.hidden + '|' + tagSale.textContent : '') + '|' + (priceProof ? priceProof.hidden + '|' + priceProof.textContent : ''),
    stock: stock ? stock.hidden + '|' + stock.textContent : ''
  };
  root.addEventListener('cvs:change', function () {
    if (totalEl && totalEl.textContent !== last.total) {
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

  });

  /* ------------------------------------------ add to bag: the photo-ticket token */
  function bagTarget() {
    var candidates = $$('#bagBtn, [data-cart-drawer-open], .nav__icons .iconbtn:last-child', document);
    for (var i = 0; i < candidates.length; i++) {
      var r = candidates[i].getBoundingClientRect();
      if (r.width && r.bottom > 0 && r.top < window.innerHeight) return candidates[i];
    }
    return null;
  }
  function onScreen(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  }

  function fly(fromEl, imgSrc, qty) {
    if (!fromEl) return;
    var from = fromEl.getBoundingClientRect();
    var target = bagTarget();
    var to = target ? target.getBoundingClientRect() : { left: window.innerWidth - 60, top: -40, width: 40, height: 40 };

    var token = document.createElement('span');
    token.className = 'cvc__token';
    token.setAttribute('aria-hidden', 'true');
    if (imgSrc) {
      var img = document.createElement('img');
      img.src = imgSrc;
      img.alt = '';
      token.appendChild(img);
    }
    if (qty > 1) {
      var count = document.createElement('span');
      count.className = 'cvc__token-count';
      count.textContent = '×' + qty;
      token.appendChild(count);
    }
    document.body.appendChild(token);

    var half = token.offsetWidth / 2;
    var sx = from.left + from.width / 2 - half;
    var sy = from.top + from.height / 2 - half;
    var ex = to.left + to.width / 2 - half;
    var ey = to.top + to.height / 2 - half;

    var tl = gsap.timeline({ onComplete: function () { token.remove(); } });
    tl.set(token, { x: sx, y: sy, scale: 0.3, rotation: -40, opacity: 0 })
      .to(token, { opacity: 1, scale: 1, rotation: 0, y: sy - 48, duration: 0.36, ease: 'back.out(2.2)' });
    if (window.MotionPathPlugin) {
      tl.to(token, {
        duration: 0.9, ease: 'power2.in', scale: 0.32, rotation: 320,
        motionPath: { path: [{ x: sx + (ex - sx) * 0.4, y: Math.min(sy, ey) - 150 }, { x: ex, y: ey }], curviness: 1.3 }
      });
    } else {
      tl.to(token, { x: ex, y: ey, scale: 0.32, rotation: 320, duration: 0.9, ease: 'power2.in' });
    }
    tl.to(token, { opacity: 0, duration: 0.12 }, '-=0.1');
    if (target) {
      var ico = target.querySelector('.cm-icon, svg') || target;
      tl.fromTo(ico, { scale: 1 }, { scale: 1.35, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' }, '-=0.05');
    }
  }
  function currentPhoto() {
    return photo && photo.tagName === 'IMG' ? (photo.currentSrc || photo.getAttribute('src')) : '';
  }

  root.addEventListener('cvs:adding', function () {
    if (add && onScreen(add)) gsap.fromTo(add, { scaleX: 1, scaleY: 1 }, { scaleX: 1.04, scaleY: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' });
  });
  root.addEventListener('cvs:added', function (e) {
    var qty = e.detail && e.detail.qty ? e.detail.qty : 1;
    fly(onScreen(add) ? add : $('#cvStickyBtn'), currentPhoto(), qty);
  });

  /* Buy now: squash, then keep the arrow nudging toward checkout until the page leaves. */
  root.addEventListener('cvs:buying', function (e) {
    var btn = e.detail && e.detail.button;
    if (!btn) return;
    gsap.fromTo(btn, { scaleX: 1, scaleY: 1 }, { scaleX: 1.04, scaleY: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' });
    var arrow = btn.querySelector('svg');
    if (arrow) {
      var nudge = gsap.to(arrow, { x: 7, duration: 0.38, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      var stop = window.setInterval(function () {
        if (btn.classList.contains('is-busy')) return;
        window.clearInterval(stop);
        nudge.kill();
        gsap.set(arrow, { clearProps: 'transform' });
      }, 300);
    }
  });

  /* ---------------------------------------------------------------- zoom */
  root.addEventListener('cvc:zoom', function (e) {
    var d = e.detail || {};
    if (!d.open || !d.dialog) return;
    gsap.fromTo(d.dialog, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out', clearProps: 'opacity' });
    var img = d.dialog.querySelector('[data-cvc-zoom-img]');
    if (img) gsap.fromTo(img, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform' });
  });
  root.addEventListener('cvc:zoomstep', function (e) {
    var d = e.detail || {};
    if (d.img) gsap.fromTo(d.img, { x: (d.dir || 1) * 48, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform,opacity' });
  });
  /* The dialog closes natively and instantly; here it gets a real exit so the
     zoom the entrance promised doesn't end in a hard cut. counter.js defers
     to us via a cancelable event and falls back to an instant close on its own. */
  root.addEventListener('cvc:zoomclose', function (e) {
    var d = e.detail || {};
    if (!d.dialog) return;
    e.preventDefault();
    var img = d.dialog.querySelector('[data-cvc-zoom-img]');
    var tl = gsap.timeline({ onComplete: function () { d.dialog.close(); } });
    if (img) tl.to(img, { scale: 0.92, duration: 0.2, ease: 'power2.in', overwrite: 'auto' }, 0);
    tl.to(d.dialog, { opacity: 0, duration: 0.22, ease: 'power2.in', overwrite: 'auto' }, 0.02);
  });

  /* ---------------------------------------------------------------- below */
  document.addEventListener('cvp:setadded', function (e) {
    var d = e.detail || {};
    if (!d.item || !d.button) return;
    var img = d.item.querySelector('.cvp-set__media img');
    fly(d.button, img ? (img.currentSrc || img.src) : '', 1);
  });

  if (!ScrollTrigger) return;

  function onEnter(el, fn, start) {
    ScrollTrigger.create({ trigger: el, start: start || 'top 82%', once: true, onEnter: fn });
  }

  function setIn(set) {
    if (set.dataset.cvcMotion === '1') return;
    var items = $$('.cvp-set__item', set);
    if (!items.length) return;
    set.dataset.cvcMotion = '1';
    var media = $$('.cvp-set__media', set);
    gsap.set(items, { y: 26, opacity: 0 });
    onEnter(set, function () {
      gsap.to(items, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)', clearProps: 'transform,opacity' });
      if (media.length) gsap.from(media, { rotation: -30, scale: 0.8, duration: 1, stagger: 0.1, delay: 0.1, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' });
    });
    ScrollTrigger.refresh();
  }
  $$('[data-cvp-set].is-filled', document).forEach(setIn);
  document.addEventListener('cvp:set', function (e) { if (e.target && e.target.matches('[data-cvp-set]')) setIn(e.target); });

  /* The reviews chalkboard animates from cv-pdp-reviews.js. */

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
