/* Casify: Best product page (sections/main-best-product.liquid).
 *
 * Commerce: model, style and pack choice resolve one real variant; a phone model is never chosen for
 * the shopper (Add to bag and Buy now nudge to the picker). Add to bag posts through cart.js
 * (form[data-cart-add-form] emits cart:added with from/img, so cv-commerce-motion.js flies the case
 * to the bag and the page stays). Buy now posts /cart/add.js, then goes to checkout.
 * Pack totals use the theme settings cv_pack_2_pct / cv_pack_3_pct, the same as checkout.
 *
 * Motion (GSAP only, under prefers-reduced-motion: no-preference): photo crossfade, chosen pill hop,
 * Buy now press squash, Flip on "Show all models", story cards on ScrollTrigger.batch, fit callouts,
 * a short ring pulse on the magnetic card. Busy, done and error morphs come from data-cvm-btn,
 * the pack highlight from data-cvm-packs and the total roll from data-cvm-price (INF-3).
 * The section is complete without this file. Re-initialises in the theme editor.
 */
(function () {
  'use strict';

  var SELECTOR = '[data-best-product]';
  function one(q, ctx) { return (ctx || document).querySelector(q); }
  function all(q, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(q)); }
  function routeRoot() { return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/'; }

  function money(cents, root) {
    var fmt = (root && root.dataset.moneyFormat) || window.themeMoneyFormat || '${{amount}}';
    if (window.CasifyMoney && typeof window.CasifyMoney.format === 'function') return window.CasifyMoney.format(cents, fmt);
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (m, key) {
      var parts = ((Number(cents) || 0) / 100).toFixed(/no_decimals/.test(key) ? 0 : 2).split('.');
      var euro = /comma|space/.test(key);
      var sep = /apos/.test(key) ? "'" : /space/.test(key) ? ' ' : euro ? '.' : ',';
      return parts[0].replace(/\B(?=(\d{3})+$)/g, sep) + (parts[1] ? (euro ? ',' : '.') + parts[1] : '');
    });
  }

  function init(root) {
    if (!root) return;
    if (root._bestDestroy) root._bestDestroy();
    var variantsNode = one('[data-best-variants]', root);
    var form = one('.best-form', root);
    if (!variantsNode || !form) return;
    var variants = [];
    try { variants = JSON.parse(variantsNode.textContent) || []; } catch (e) { return; }

    var ac = new AbortController();
    var sig = { signal: ac.signal };
    var timers = [];
    var gsap = window.gsap;
    var ST = window.ScrollTrigger;
    var Flip = window.Flip;
    var mm = null;
    var ctx = null;
    var motionOn = false;
    var finishers = [];

    var say = function (key, fallback) {
      var name = 'i18n' + key.replace(/(^|-)([a-z])/g, function (m, d, c) { return c.toUpperCase(); });
      return root.dataset[name] || fallback;
    };
    var mainImage = one('[data-best-main-image]', root);
    var rail = one('[data-best-rail]', root);
    var idInput = one('[data-best-variant-id]', root);
    var qtyInput = one('[data-best-qty]', root);
    var priceNode = one('[data-best-price]', root);
    var compareNode = one('[data-best-compare]', root);
    var saveNode = one('[data-best-save]', root);
    var endPrice = one('[data-best-end-price]', root);
    var addBtn = one('[data-best-add]', root);
    var buyBtn = one('[data-best-buy]', root);
    var errorNode = one('[data-best-error]', root);
    var models = one('[data-best-models]', root);
    var modelIndex = models ? Number(models.dataset.bestOption) : -1;
    var packs = one('[data-best-packs]', root);
    var sticky = one('[data-best-sticky]', root);
    var stickyAdd = one('[data-best-sticky-add]', root);
    var totals = all('[data-best-total], [data-best-sticky-total]', root);
    var addButtons = [addBtn, stickyAdd].filter(Boolean);

    /* The no-JS selects live in <noscript>; with JavaScript these hidden inputs post instead. */
    if (idInput) idInput.name = 'id';
    if (qtyInput) qtyInput.name = 'quantity';
    if (sticky) sticky.hidden = false;

    function showError(message) {
      if (!errorNode) return;
      errorNode.textContent = message || '';
      errorNode.hidden = !message;
    }

    function selected() {
      var values = [];
      all('fieldset[data-best-option]', root).forEach(function (fs) {
        var checked = one('input:checked', fs);
        if (checked) values[Number(fs.dataset.bestOption)] = checked.value;
      });
      all('select[data-best-option]', root).forEach(function (sel) { values[Number(sel.dataset.bestOption)] = sel.value; });
      return values;
    }
    function modelPending(values) { return modelIndex >= 0 && values[modelIndex] == null; }
    function resolve(values) {
      if (modelPending(values)) return null;
      return variants.find(function (v) {
        return v.options.every(function (o, i) { return values[i] == null || o === values[i]; });
      }) || null;
    }
    function packQty() {
      var on = packs && one('[aria-checked="true"]', packs);
      return on ? Number(on.dataset.bestPack) || 1 : 1;
    }
    function packTotal(price, qty, pct) {
      var line = price * qty;
      return line - Math.round(line * (pct || 0) / 100);
    }

    function labelAdd(btn, text) {
      var lb = btn && one('[data-cvm-label]', btn);
      if (lb) lb.textContent = text;
    }

    function render() {
      var values = selected();
      var pending = modelPending(values);
      var variant = resolve(values);
      var price = variant ? variant.price : (variants[0] ? variants[0].price : 0);
      var available = !!(variant && variant.available);
      if (idInput) idInput.value = variant ? variant.id : '';
      if (priceNode) priceNode.textContent = (variant || pending) ? money(price, root) : say('unavailable', 'Unavailable');
      var compare = variant ? Number(variant.compare_at_price) || 0 : 0;
      if (compareNode) { compareNode.hidden = !(compare > price); if (compare > price) compareNode.textContent = money(compare, root); }
      if (saveNode) {
        saveNode.hidden = !(compare > price);
        var amount = one('[data-best-save-amount]', saveNode);
        if (compare > price && amount) amount.textContent = money(compare - price, root);
      }
      if (endPrice) endPrice.textContent = money(price, root);

      var addText = pending ? say('add-to-bag', 'Add to bag') : available ? say('add-to-bag', 'Add to bag') : variant ? say('sold-out', 'Sold out') : say('unavailable', 'Unavailable');
      addButtons.forEach(function (b) {
        b.disabled = !pending && !available;
        if (!b.classList.contains('is-busy') && !b.classList.contains('is-done')) labelAdd(b, addText);
      });
      if (buyBtn && !buyBtn.classList.contains('is-busy')) buyBtn.disabled = !pending && !available;

      var modelText = pending ? say('model-placeholder', 'Choose your phone model') : values[modelIndex];
      var modelLabel = one('[data-best-model-label]', root);
      if (modelLabel && modelIndex >= 0) {
        modelLabel.textContent = modelText;
        modelLabel.parentNode.classList.toggle('is-pending', pending);
      }
      var stickyModel = one('[data-best-sticky-model]', root);
      if (stickyModel && modelIndex >= 0) stickyModel.textContent = modelText;
      var madeFor = one('[data-best-made-for]', root);
      if (madeFor) madeFor.textContent = modelIndex >= 0 && !pending ? values[modelIndex] : say('your-phone', 'your phone');
      var styleIn = one('.best-options--styles input:checked', root);
      var styleLabel = one('[data-best-style-label]', root);
      if (styleLabel && styleIn) styleLabel.textContent = styleIn.value;

      /* Per-model stock for the other options chosen now. */
      if (models) {
        all('input', models).forEach(function (input) {
          var ok = variants.some(function (v) {
            return v.available && v.options.every(function (o, i) { return i === modelIndex ? o === input.value : (values[i] == null || o === values[i]); });
          });
          input.closest('.best-model').classList.toggle('is-unavailable', !ok);
        });
      }

      /* Packs: per-case price on each pack, total on Buy now and the sticky bar. */
      var qty = packQty();
      if (packs) {
        all('[data-best-pack]', packs).forEach(function (p) {
          var q = Number(p.dataset.bestPack) || 1;
          var each = Math.floor(packTotal(price, q, Number(p.dataset.pct)) / q);
          var node = one('[data-best-pack-each]', p);
          if (node && node.firstChild && node.firstChild.nodeType === 3) node.firstChild.nodeValue = money(each, root);
        });
      }
      var activePack = packs && one('[aria-checked="true"]', packs);
      var total = packTotal(price, qty, activePack ? Number(activePack.dataset.pct) : 0);
      totals.forEach(function (t) {
        var text = money(total, root);
        if (t.textContent !== text) t.textContent = text;
        if (t.dataset.cents !== String(total)) t.dataset.cents = String(total);
      });
      if (qtyInput) qtyInput.value = String(qty);
      return { variant: variant, pending: pending, available: available, qty: qty };
    }

    function swapImage(src, alt) {
      if (!mainImage || !src) return;
      mainImage.src = src;
      mainImage.alt = alt || '';
      if (motionOn) gsap.fromTo(mainImage, { autoAlpha: 0.55, scale: 1.02 }, { autoAlpha: 1, scale: 1, duration: 0.32, ease: 'power2.out', clearProps: 'opacity,visibility,transform' });
    }
    function hop(node) {
      if (motionOn && node) gsap.fromTo(node, { y: -4 }, { y: 0, duration: 0.28, ease: 'back.out(3)', clearProps: 'transform' });
    }

    var nudgeTimer = 0;
    function nudge() {
      showError(say('choose-model', 'Choose your phone model first'));
      if (!models) return;
      models.classList.add('is-nudge');
      /* A second press restarts the outline instead of losing it to the first press's timer. */
      clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(function () { models.classList.remove('is-nudge'); }, 1600);
      timers.push(nudgeTimer);
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      models.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      var first = one('input', models);
      if (first) first.focus({ preventScroll: true });
      if (motionOn) gsap.fromTo(models, { x: 0 }, { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.45, ease: 'none', clearProps: 'transform' });
    }

    /* Gallery */
    if (rail) rail.addEventListener('click', function (e) {
      var thumb = e.target.closest('[data-best-image]');
      if (!thumb) return;
      all('[data-best-image]', root).forEach(function (t) {
        var on = t === thumb;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', String(on));
      });
      swapImage(thumb.dataset.bestImage, thumb.dataset.bestAlt);
    }, sig);
    var prev = one('[data-best-gallery-prev]', root);
    var next = one('[data-best-gallery-next]', root);
    if (prev && rail) prev.addEventListener('click', function () { rail.scrollBy({ left: -210, behavior: motionOn ? 'smooth' : 'auto' }); }, sig);
    if (next && rail) next.addEventListener('click', function () { rail.scrollBy({ left: 210, behavior: motionOn ? 'smooth' : 'auto' }); }, sig);

    /* Options */
    all('fieldset[data-best-option] input', root).forEach(function (input) {
      input.addEventListener('change', function () {
        var state = render();
        showError('');
        hop(input.nextElementSibling);
        if (state.variant) {
          try {
            var url = new URL(location.href);
            url.searchParams.set('variant', state.variant.id);
            history.replaceState(history.state, '', url);
          } catch (e) { /* history is optional */ }
          var img = state.variant.featured_image;
          if (img && img.src) {
            swapImage(img.src, img.alt || (one('h1', root) || {}).textContent);
            /* The sticky bar's photo is what flies from the sticky Add button: keep it the chosen case. */
            var stickyImg = one('.best-sticky__img', root);
            if (stickyImg) stickyImg.src = img.src;
          }
        }
      }, sig);
    });
    all('select[data-best-option]', root).forEach(function (sel) { sel.addEventListener('change', render, sig); });

    var more = one('[data-best-more-models]', root);
    function setExpanded(expanded) {
      models.classList.toggle('is-expanded', expanded);
      more.setAttribute('aria-expanded', String(expanded));
      more.textContent = expanded ? say('show-fewer', 'Show fewer models') : say('show-all', 'Show all models');
    }
    if (more && models) {
      more.addEventListener('click', function () {
        var expanded = !models.classList.contains('is-expanded');
        var state = motionOn && Flip ? Flip.getState(all('.best-model', models)) : null;
        setExpanded(expanded);
        if (state) Flip.from(state, {
          duration: 0.42, ease: 'power3.out', absolute: false,
          onEnter: function (els) { return gsap.fromTo(els, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.015, clearProps: 'opacity,visibility,transform' }); }
        });
      }, sig);
      if (one('.best-model--extra input:checked', models)) setExpanded(true);
    }

    /* Packs (radiogroup, roving tabindex) */
    function choosePack(btn, focus) {
      if (!packs || !btn) return;
      all('[data-best-pack]', packs).forEach(function (p) {
        var on = p === btn;
        p.setAttribute('aria-checked', String(on));
        p.tabIndex = on ? 0 : -1;
      });
      if (focus) btn.focus();
      render();
    }
    if (packs) {
      packs.addEventListener('click', function (e) { choosePack(e.target.closest('[data-best-pack]')); }, sig);
      packs.addEventListener('keydown', function (e) {
        var list = all('[data-best-pack]', packs);
        var i = list.indexOf(document.activeElement);
        if (i < 0) return;
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        choosePack(list[(i + step + list.length) % list.length], true);
      }, sig);
    }

    /* Add to bag: cart.js posts; this only gates the model and paints the button states. */
    var lastAdd = null;
    var added = false;
    form.addEventListener('submit', function (e) {
      var state = render();
      if (state.pending) { e.preventDefault(); nudge(); return; }
      if (!state.available) { e.preventDefault(); showError(say('unavailable', 'Unavailable')); return; }
      showError('');
      lastAdd = addButtons.indexOf(e.submitter) >= 0 ? e.submitter : addBtn;
      added = false;
      lastAdd.classList.remove('is-done', 'is-error');
      lastAdd.classList.add('is-busy');
    }, sig);
    document.addEventListener('cart:added', function (e) {
      var from = e.detail && e.detail.from;
      if (from && addButtons.indexOf(from) >= 0) added = true;
    }, sig);
    var busyWatch = new MutationObserver(function (records) {
      records.forEach(function (r) {
        var b = r.target;
        if (b !== lastAdd || b.hasAttribute('aria-busy') || !b.classList.contains('is-busy')) return;
        b.classList.remove('is-busy');
        if (added) {
          b.classList.add('is-done');
          labelAdd(b, say('added', 'In your bag'));
          timers.push(setTimeout(function () { b.classList.remove('is-done'); render(); }, 1800));
        } else {
          b.classList.add('is-error');
          timers.push(setTimeout(function () { b.classList.remove('is-error'); }, 900));
        }
      });
    });
    addButtons.forEach(function (b) { busyWatch.observe(b, { attributes: true, attributeFilter: ['aria-busy'] }); });

    /* Buy now */
    if (buyBtn) {
      buyBtn.addEventListener('pointerdown', function () {
        if (motionOn && !buyBtn.disabled) gsap.fromTo(buyBtn, { scaleX: 1.04, scaleY: 0.9, transition: 'none' }, { scaleX: 1, scaleY: 1, duration: 0.32, ease: 'back.out(3)', clearProps: 'transform,transition' });
      }, sig);
      buyBtn.addEventListener('click', function () {
        var state = render();
        if (state.pending) { nudge(); return; }
        if (!state.available) { showError(say('unavailable', 'Unavailable')); return; }
        showError('');
        var label = one('[data-cvm-label]', buyBtn);
        var original = label ? label.textContent : '';
        buyBtn.disabled = true;
        buyBtn.setAttribute('aria-busy', 'true');
        buyBtn.classList.remove('is-error');
        buyBtn.classList.add('is-busy');
        if (label) label.textContent = say('to-checkout', 'To checkout…');
        fetch(routeRoot() + 'cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: Number(state.variant.id), quantity: state.qty }] })
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok) throw new Error((d && d.description) || '');
            window.location.assign(routeRoot() + 'checkout');
          });
        }).catch(function (err) {
          showError((err && err.message) || say('error', 'That did not go through. Please try again.'));
          buyBtn.classList.remove('is-busy');
          buyBtn.classList.add('is-error');
          buyBtn.removeAttribute('aria-busy');
          buyBtn.disabled = false;
          if (label) label.textContent = original;
          timers.push(setTimeout(function () { buyBtn.classList.remove('is-error'); }, 900));
        });
      }, sig);
    }

    /* Sticky Add bar: shown once the buy buttons have scrolled above the viewport. */
    var actions = one('.best-form__actions', root);
    var io = null;
    function setSticky(show) { if (sticky) sticky.classList.toggle('is-shown', !!show); }
    if (sticky && actions) {
      if (gsap && ST) {
        ctx = gsap.context(function () {
          ST.create({ trigger: buyBtn || actions, start: 'bottom top', onEnter: function () { setSticky(true); }, onLeaveBack: function () { setSticky(false); } });
        }, root);
      } else if (window.IntersectionObserver) {
        io = new IntersectionObserver(function (es) {
          var e = es[0];
          setSticky(!e.isIntersecting && e.boundingClientRect.bottom < 0);
        });
        io.observe(buyBtn || actions);
      }
    }

    /* Motion */
    if (gsap && gsap.matchMedia) {
      mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', function () {
        motionOn = true;
        root.classList.add('is-motion');
        if (mainImage) gsap.from(mainImage, { scale: 1.045, duration: 1.1, ease: 'power3.out', clearProps: 'transform' });
        if (ST) {
          var cards = all('[data-best-card]', root);
          if (cards.length) {
            gsap.set(cards, { y: 24, autoAlpha: 0 });
            ST.batch(cards, {
              start: 'top 92%', once: true,
              onEnter: function (batch) { gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out', overwrite: true, clearProps: 'transform,opacity,visibility' }); }
            });
            finishers.push(function () { gsap.to(cards, { y: 0, autoAlpha: 1, duration: 0, overwrite: true, clearProps: 'transform,opacity,visibility' }); });
          }
          var callouts = all('.best-callout', root);
          if (callouts.length) gsap.from(callouts, { scale: 0.85, autoAlpha: 0, duration: 0.24, stagger: 0.12, ease: 'back.out(2.4)', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: callouts[0].parentNode, start: 'top 80%', once: true } });
          var rings = all('.best-magnet-photo__rings i', root);
          if (rings.length) gsap.fromTo(rings, { scale: 0.5, autoAlpha: 0.6 }, { scale: 1.5, autoAlpha: 0, duration: 1.4, stagger: 0.35, repeat: 1, ease: 'power1.out', scrollTrigger: { trigger: rings[0].parentNode, start: 'top 75%', once: true } });
        }
        if (document.visibilityState === 'hidden') finishers.forEach(function (f) { f(); });
        return function () { motionOn = false; root.classList.remove('is-motion'); finishers.length = 0; };
      });
    }

    render();

    root._bestFinish = function () { finishers.forEach(function (f) { f(); }); };
    root._bestDestroy = function () {
      ac.abort();
      busyWatch.disconnect();
      if (io) io.disconnect();
      timers.forEach(clearTimeout);
      if (mm) mm.revert();
      if (ctx) ctx.revert();
      delete root._bestDestroy;
      delete root._bestFinish;
    };
  }

  function rootIn(node) {
    if (!node) return null;
    return node.matches && node.matches(SELECTOR) ? node : one(SELECTOR, node);
  }
  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches(SELECTOR)) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all(SELECTOR, scope));
    roots.forEach(init);
    if (window.ScrollTrigger && roots.length) window.ScrollTrigger.refresh();
  }

  boot(document);
  window.addEventListener('load', function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }, { once: true });
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    var root = rootIn(e.target);
    if (root && root._bestDestroy) root._bestDestroy();
  });
  document.addEventListener('shopify:section:select', function (e) {
    var root = rootIn(e.target);
    if (root && root._bestFinish) root._bestFinish();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:block:select', function (e) {
    var root = e.target.closest && e.target.closest(SELECTOR);
    if (root && root._bestFinish) root._bestFinish();
  });
})();
