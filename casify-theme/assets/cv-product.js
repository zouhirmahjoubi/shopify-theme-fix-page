/* Casify: product page commerce, shared by both product templates:
 *   "The Order Slip"   sections/cv-product.liquid          (data-cv-pdp)
 *   "The Shop Counter" sections/cv-product-counter.liquid  (data-cv-pdp="counter")
 *
 * This file owns the money:
 *   - option buttons and the model dropdown resolve a real Shopify variant id
 *   - pack tiers set the quantity; a pack's price takes the tier's percentage
 *     off the whole pack and rounds to the cent, the way the store's automatic
 *     discounts do, so the page price is the checkout price
 *   - mix-and-match packs (snippets/cv-pack-slots.liquid): in a pack of 2 or 3
 *     each extra case has its own colour and phone model. The store's pack
 *     discounts count any cases in the bag, so mixing never changes the price
 *     rule, only the sum it applies to
 *   - the savings meter reports the saving of the chosen pack
 *   - add to bag posts every case in the pack to /cart/add.js, then lets the
 *     theme's cart drawer refresh itself; Buy now posts the same cases and goes
 *     straight to checkout
 *   - the sticky bar appears once the main button has scrolled away
 *
 * Model first: a phone model is never chosen for the shopper. On a product with
 * a phone-model option, Add to bag and Buy now post nothing until the shopper
 * picks a model (the model select, a model button, a "cvs:choose" for the model
 * option) or the URL carries a real ?variant=. Until then the model select shows
 * a "Choose your phone model" placeholder, prices come from the best case for
 * the other choices, and a press sends "cvs:needmodel", focuses the picker and
 * says "Choose your phone model first" in #cvStatus. Products without a model
 * option (lens film) are unaffected. root[data-cv-model-confirmed] mirrors it.
 *
 * Every [data-cv-pdp] root is its own instance; all queries are scoped to it.
 * Roots boot on load, re-init on shopify:section:load and destroy on unload.
 *
 * Public API (call it from event handlers or after DOMContentLoaded, never at parse):
 *   window.CasifyPDP.init(root)           boot a root (idempotent); returns its api
 *   window.CasifyPDP.destroy(root)        remove its listeners, observer and timers
 *   window.CasifyPDP.add(root, {from})    Add to bag for a proxy button; Promise of {ok, reason}
 *   window.CasifyPDP.buyNow(root, {from}) Buy now for a proxy button; Promise of {ok, reason}
 *   window.CasifyPDP.state(root)          {variant, options, qty, pct, each, total, lines,
 *                                          modelIndex, hasModel, modelConfirmed, modelValue, canBuy, busy}
 *   (root: the [data-cv-pdp] element, anything inside or around it, a selector, or empty for the first)
 *   window.CasifyMoney.format(cents[, format])  the shop's money format (root data-money-format,
 *                                          else window.themeMoneyFormat)
 *
 * Events on the root (detail; fields only ever added, never renamed or removed):
 *   cvs:change       {variant, qty, each, total, pct, lines, compareAt, compareSaving, comparePct,
 *                     modelConfirmed, modelValue}   modelValue is null until a model is confirmed;
 *                     modelConfirmed is true on products without a model option
 *   cvs:slots-before {from, qty}      cvs:slots {from, qty, changed, lines}
 *   cvs:models       {open}           cvs:photo {index}
 *   cvs:adding       {qty, items, from, img}
 *   cvs:added        {qty, items, from, img}
 *   cvs:buying       {qty, button, from, img, items}
 *   bubbling: cvs:needmodel {button, kind}   cvs:error {message, button, kind: 'add'|'buy'}
 *             cvs:sticky {visible}           cvs:layout {reason, reasons} (slots or models changed height)
 *   document: cart:refresh (no detail), cart:added {source: 'pdp', from, img, qty, items}
 *   heard:    cvs:choose {index, value}, cvs:pack {qty}
 *
 * Shopper strings come from root data-i18n-* attributes, with the current English as fallback:
 *   adding, added, try-again, to-checkout, checkout-redirect, unavailable, each, sold-out, error,
 *   choose-model, model-placeholder, added-one, added-many, mixed, add-to-bag, buy-now
 *   ([qty] is filled in added-one, added-many and mixed).
 *
 * Motion lives in cv-pdp-slip-motion.js, cv-pdp-counter-motion.js and
 * cv-pack-motion.js. Loads on product templates and no-ops without [data-cv-pdp].
 */
(function () {
  'use strict';

  var FALLBACK_FORMAT = '${{amount}}';
  var instances = [];

  /* Format cents with a money format: the standard Shopify placeholders. */
  function formatWith(format, cents) {
    var value = Number(cents);
    if (isNaN(value)) return '';
    function group(num, decimals, thousands, decimal) {
      var parts = (num / 100).toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + thousands);
      return parts.join(decimal);
    }
    return String(format || FALLBACK_FORMAT).replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
      switch (key) {
        case 'amount_no_decimals': return group(value, 0, ',', '.');
        case 'amount_with_comma_separator': return group(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return group(value, 0, '.', ',');
        case 'amount_with_space_separator': return group(value, 2, ' ', ',');
        case 'amount_no_decimals_with_space_separator': return group(value, 0, ' ', '');
        case 'amount_with_period_and_space_separator': return group(value, 2, ' ', '.');
        case 'amount_with_apostrophe_separator': return group(value, 2, '\'', '.');
        default: return group(value, 2, ',', '.');
      }
    });
  }

  function isBlank(v) { return v === null || v === undefined || v === ''; }

  function create(root) {
    var alive = true;
    var cleanups = [];
    var timers = [];
    var io = null;

    function $(sel, ctx) { return (ctx || root).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

    /* Every listener goes through on(), so destroy() leaves nothing behind. */
    function on(el, type, fn, opts) {
      if (!el) return;
      el.addEventListener(type, fn, opts);
      cleanups.push(function () { el.removeEventListener(type, fn, opts); });
    }
    function later(fn, ms) {
      var id = window.setTimeout(function () {
        var at = timers.indexOf(id);
        if (at > -1) timers.splice(at, 1);
        if (alive) fn();
      }, ms);
      timers.push(id);
      return id;
    }

    function parseJSONAttr(attr, fallback) {
      var raw = root.getAttribute(attr);
      if (!raw) return fallback;
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    }

    /* Shopper strings: the root's data-i18n-* attribute, else the current English. */
    function t(key, fallback) {
      var v = root.getAttribute('data-i18n-' + key);
      return isBlank(v) ? fallback : v;
    }

    var moneyFormat = root.getAttribute('data-money-format') || window.themeMoneyFormat || FALLBACK_FORMAT;
    function formatMoney(cents) { return formatWith(moneyFormat, cents); }

    var variants = parseJSONAttr('data-variants', []) || [];
    var selected = parseJSONAttr('data-current-options', []) || [];
    var compareFallback = parseInt(root.getAttribute('data-compare-at-fallback'), 10) || 0;

    var els = {
      form: $('#cvAddForm'),
      variantId: $('#cvVariantId'),
      quantity: $('#cvQuantity'),
      priceNow: $('#cvPriceNow'),
      priceWas: $('#cvPriceWas'),
      priceProof: $('[data-cv-price-proof]'),
      priceSave: $('[data-cv-price-save]'),
      tagSale: $('[data-cv-tag-sale]'),
      discountPct: $('[data-cv-discount-pct]'),
      total: $('#cvTotal'),
      addBtn: $('#cvAddBtn'),
      ctaLabel: $('#cvCtaLabel'),
      status: $('#cvStatus'),
      mainImage: $('#cvMainImage'),
      sticky: $('#cvSticky'),
      stickyTotal: $('#cvStickyTotal'),
      stickyBtn: $('#cvStickyBtn'),
      stickyVariant: $('[data-cv-opt-out-sticky]'),
      change: $('[data-cvs-change]'),
      models: $('[data-cvs-models]'),
      savings: $('[data-cv-savings]'),
      savingsFill: $('[data-cv-savings-fill]'),
      slots: $('[data-cv-slots]'),
      stock: $('[data-cvc-stock]')
    };
    var ctaDefault = els.ctaLabel ? (els.ctaLabel.getAttribute('data-label-default') || t('add-to-bag', 'Add to bag')) : t('add-to-bag', 'Add to bag');
    var buyButtons = $$('[data-cv-buy-now]');

    /* ------------------------------------------------------------ phone model */
    /* Which option is the phone model: the section says so (data-model-index), else a select
       named like one, else the first option whose values name phones (same rule as the Liquid). */
    function detectModelIndex() {
      var attr = root.getAttribute('data-model-index');
      if (!isBlank(attr)) { var n = parseInt(attr, 10); return isNaN(n) ? -1 : n; }
      var named = $$('select[data-cv-option-index]').filter(function (s) { return /model|phone|device|compatib/i.test(s.getAttribute('name') || ''); })[0];
      if (named) return parseInt(named.getAttribute('data-cv-option-index'), 10);
      var first = variants[0];
      if (first && first.options) {
        for (var i = 0; i < first.options.length; i++) if (/iphone|galaxy|pixel|samsung/i.test(String(first.options[i]))) return i;
      }
      return -1;
    }
    var modelIndex = detectModelIndex();
    var hasModel = modelIndex >= 0 && variants.some(function (v) { return v.options && v.options.length > modelIndex; });
    if (!hasModel) modelIndex = -1;
    var modelSelect = hasModel ? $('select[data-cv-option-index="' + modelIndex + '"]') : null;

    /* A real ?variant= in the URL is the shopper's own choice (a shared or bookmarked case). */
    function urlVariant() {
      var id = null;
      try { id = new URLSearchParams(window.location.search).get('variant'); } catch (e) { id = null; }
      if (!id) return null;
      for (var i = 0; i < variants.length; i++) if (String(variants[i].id) === String(id)) return variants[i];
      return null;
    }
    var fromUrl = hasModel ? urlVariant() : null;
    var modelUnset = hasModel && isBlank(selected[modelIndex]);
    var modelAdopted = false; // the JS, not the Liquid, filled in the phone shown
    if (fromUrl && modelUnset) { selected = fromUrl.options.slice(); modelUnset = false; modelAdopted = true; }

    /* Nothing to choose: a case made for one phone only, or a page with no phone picker for this
       root (the Order Slip prints none for a single model). The model counts as chosen, else the
       case could never be bought. */
    var modelValues = [];
    if (hasModel) variants.forEach(function (v) {
      var x = v.options ? v.options[modelIndex] : null;
      if (!isBlank(x) && modelValues.indexOf(String(x)) === -1) modelValues.push(String(x));
    });
    var modelPicker = hasModel && !!($('[data-cv-option-index="' + modelIndex + '"]') || els.models);
    var modelFixed = hasModel && (modelValues.length <= 1 || !modelPicker);
    if (modelFixed && modelUnset && modelValues.length === 1) { selected[modelIndex] = modelValues[0]; modelUnset = false; modelAdopted = true; }
    if (modelFixed && modelUnset) modelFixed = false; // no phone known and no picker: Liquid must print one

    var modelConfirmed = !hasModel || !!fromUrl || modelFixed;

    /* Not chosen yet: the model select shows a placeholder, never a phone the shopper did not pick. */
    if (hasModel && !modelConfirmed && modelSelect) {
      var blankOpt = Array.prototype.filter.call(modelSelect.options, function (o) { return o.value === ''; })[0];
      if (!blankOpt) {
        blankOpt = document.createElement('option');
        blankOpt.value = '';
        blankOpt.disabled = true;
        blankOpt.setAttribute('data-cv-placeholder', '');
        blankOpt.textContent = t('model-placeholder', 'Choose your phone model');
        modelSelect.insertBefore(blankOpt, modelSelect.firstChild);
      }
      modelSelect.value = '';
      selected[modelIndex] = '';
      modelUnset = true;
    }

    function setModelConfirmed(yes) {
      var was = modelConfirmed;
      modelConfirmed = !hasModel || !!yes;
      root.setAttribute('data-cv-model-confirmed', modelConfirmed ? 'true' : 'false');
      return was !== modelConfirmed;
    }
    setModelConfirmed(modelConfirmed);

    var packs = $$('.cvs__pack, [data-cv-pack]');
    var activePack = packs.filter(function (p) { return p.getAttribute('aria-checked') === 'true'; })[0] || packs[0] || null;

    function setRadioSelection(items, selectedItem) {
      items.forEach(function (item) {
        var active = item === selectedItem;
        item.setAttribute('aria-checked', active ? 'true' : 'false');
        item.tabIndex = active ? 0 : -1;
      });
    }

    $$('[role="radiogroup"]').forEach(function (group) {
      var radios = $$('[role="radio"]', group);
      var checked = radios.filter(function (radio) { return radio.getAttribute('aria-checked') === 'true'; })[0] || radios[0] || null;
      setRadioSelection(radios, checked);
    });

    /* The JS filled in the phone (a ?variant= link, or the only phone there is): the picker shows it. */
    if (modelAdopted) {
      var shown = String(selected[modelIndex]);
      if (modelSelect && Array.prototype.some.call(modelSelect.options, function (o) { return o.value === shown; })) modelSelect.value = shown;
      var shownBtn = $$('button[data-cv-option-index="' + modelIndex + '"]').filter(function (b) { return b.getAttribute('data-cv-value') === shown; })[0];
      if (shownBtn) setRadioSelection($$('[data-cv-option-index]', shownBtn.parentNode), shownBtn);
      var shownOut = $('[data-cv-opt-out="' + modelIndex + '"]');
      if (shownOut) shownOut.textContent = shown;
    }

    function packQty(pack) {
      var q = pack ? parseInt(pack.getAttribute('data-cv-qty'), 10) : 1;
      return isNaN(q) || q < 1 ? 1 : q;
    }
    function packPct(pack) {
      var d = pack ? parseFloat(pack.getAttribute('data-cv-discount')) : 0;
      return isNaN(d) || d < 0 ? 0 : Math.min(d, 90);
    }
    /* A pack after its discount: the percentage comes off the whole pack, rounded to the cent. */
    function discounted(subtotal, pct) { return subtotal - Math.round(subtotal * pct / 100); }
    function eachPrice(price, qty, pct) { return Math.floor(discounted(price * qty, pct) / qty); }
    var maxPct = packs.reduce(function (m, p) { return Math.max(m, packPct(p)); }, 0);

    function variantFor(opts) {
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        var match = true;
        for (var oi = 0; oi < opts.length; oi++) {
          if (String(v.options[oi]) !== String(opts[oi])) { match = false; break; }
        }
        if (match) return v;
      }
      return null;
    }
    /* No phone chosen yet: the best case for the other choices (any phone), for price and photo only. */
    function representative() {
      var best = null;
      var bestScore = 0;
      variants.forEach(function (v) {
        for (var oi = 0; oi < selected.length; oi++) {
          if (oi === modelIndex || isBlank(selected[oi])) continue;
          if (String(v.options[oi]) !== String(selected[oi])) return;
        }
        var score = v.available ? 2 : 1;
        if (score > bestScore) { best = v; bestScore = score; }
      });
      return best;
    }
    function findVariant() { return modelUnset ? representative() : variantFor(selected); }

    function swapImage(src) {
      if (!els.mainImage || !src || els.mainImage.tagName !== 'IMG') return;
      if (els.mainImage.getAttribute('src') === src) return;
      els.mainImage.classList.add('is-swapping');
      els.mainImage.removeAttribute('srcset');
      els.mainImage.src = src;
      later(function () { els.mainImage.classList.remove('is-swapping'); }, 260);
    }

    function fill(template, values) {
      return String(template || '').replace(/\[(\w+)\]/g, function (m, key) { return key in values ? values[key] : m; });
    }

    function sized(src, width) {
      if (!src) return '';
      return src + (src.indexOf('?') === -1 ? '?' : '&') + 'width=' + width;
    }

    /* The photo of the case being bought: the variant's own image, else the main photo. */
    function currentImg() {
      var v = findVariant();
      if (v && v.featured_image && v.featured_image.src) return v.featured_image.src;
      if (els.mainImage && els.mainImage.tagName === 'IMG') return els.mainImage.currentSrc || els.mainImage.getAttribute('src') || '';
      return '';
    }

    /* One cvs:layout per frame after the slots or the model list change height. */
    var layoutFrame = 0;
    var layoutReasons = [];
    function layoutChanged(reason) {
      if (layoutReasons.indexOf(reason) === -1) layoutReasons.push(reason);
      if (layoutFrame) return;
      var raf = window.requestAnimationFrame || function (fn) { return window.setTimeout(fn, 16); };
      layoutFrame = raf(function () {
        layoutFrame = 0;
        var reasons = layoutReasons;
        layoutReasons = [];
        if (!alive) return;
        root.dispatchEvent(new CustomEvent('cvs:layout', { bubbles: true, detail: { reason: reasons[0], reasons: reasons } }));
      });
    }

    /* ------------------------------------------------------------ mix-and-match */
    var slotRows = els.slots ? $$('[data-cv-slot]', els.slots) : [];
    var slotCases = els.slots ? $$('[data-cv-slot-case]', els.slots) : [];
    var slotState = slotRows.map(function () { return { linked: true, options: selected.slice() }; });
    var slotIds = [];
    var slotQty = els.slots && !els.slots.hidden ? slotCases.filter(function (c) { return !c.hidden; }).length : 1;

    function slotOptions(i) { return i === 0 ? selected : slotState[i].options; }

    /* Linked cases follow case 1 (the page's own options). */
    function syncLinked() {
      slotState.forEach(function (s, i) { if (i > 0 && s.linked) s.options = selected.slice(); });
    }

    /* 'ok', 'out' (made, sold out) or 'none' (not made) for one value, holding the rest of a case's choice.
       A choice not made yet (no phone picked) holds nothing. */
    function stockFor(opts, oi, val) {
      var exists = false;
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        if (String(v.options[oi]) !== String(val)) continue;
        var others = true;
        for (var oj = 0; oj < opts.length; oj++) {
          if (oj !== oi && !isBlank(opts[oj]) && String(v.options[oj]) !== String(opts[oj])) { others = false; break; }
        }
        if (!others) continue;
        if (v.available) return 'ok';
        exists = true;
      }
      return exists ? 'out' : 'none';
    }

    /* After one value changes, the closest available case that keeps it (most other values kept). */
    function closestVariant(opts, oi) {
      var best = null;
      var bestScore = -1;
      variants.forEach(function (v) {
        if (!v.available || String(v.options[oi]) !== String(opts[oi])) return;
        var score = 0;
        for (var oj = 0; oj < opts.length; oj++) if (String(v.options[oj]) === String(opts[oj])) score++;
        if (score > bestScore) { best = v; bestScore = score; }
      });
      return best;
    }

    /* The variant of every case in a pack of qty (null where the choice isn't made). */
    function packLines(qty, mainVariant) {
      var lines = [];
      for (var i = 0; i < qty; i++) {
        var s = slotState[i];
        lines.push(i > 0 && s ? (s.linked && modelUnset ? mainVariant : variantFor(s.options)) : mainVariant);
      }
      return lines;
    }

    var changedSlot = -1;
    function renderSlots(qty, lines) {
      if (!els.slots) return;
      var from = slotQty;
      var show = qty > 1;
      var wasHidden = els.slots.hidden;
      if (from !== qty) root.dispatchEvent(new CustomEvent('cvs:slots-before', { detail: { from: from, qty: qty } }));

      els.slots.hidden = !show;
      var legend = $('[data-cv-slots-legend]', els.slots);
      if (legend) {
        var text = fill(els.slots.getAttribute('data-template-legend') || 'Your [qty] cases', { qty: qty });
        if (legend.textContent !== text) legend.textContent = text;
      }
      var soldSuffix = els.slots.getAttribute('data-sold-suffix') || ' (sold out)';
      var missingSuffix = els.slots.getAttribute('data-missing-suffix') || ' (unavailable)';
      var fallbackImg = els.slots.getAttribute('data-fallback-img') || '';
      var changed = [];

      slotRows.forEach(function (row) {
        var i = parseInt(row.getAttribute('data-cv-slot'), 10);
        row.hidden = i >= qty;
        if (i >= qty) return;
        var opts = slotOptions(i);
        var v = lines[i];

        if (i === 0) {
          var summary = $('[data-cv-slot-summary]', row);
          if (summary) {
            var parts = $$('select[data-cv-slot-option]', els.slots).length
              ? $$('select[data-cv-slot-option]', slotRows[1] || row).map(function (s) { return opts[parseInt(s.getAttribute('data-cv-slot-option'), 10)]; }).filter(function (p) { return !isBlank(p); })
              : [v ? v.title : ''];
            var line = parts.join(' · ');
            if (summary.textContent !== line) summary.textContent = line;
          }
        } else {
          $$('select[data-cv-slot-option]', row).forEach(function (sel) {
            var oi = parseInt(sel.getAttribute('data-cv-slot-option'), 10);
            Array.prototype.forEach.call(sel.options, function (opt) {
              if (opt.value === '') return;
              var stock = stockFor(opts, oi, opt.value);
              var label = opt.value + (stock === 'ok' ? '' : (stock === 'out' ? soldSuffix : missingSuffix));
              if (opt.textContent !== label) opt.textContent = label;
            });
            if (sel.value !== String(opts[oi])) sel.value = opts[oi];
          });
          var same = $('[data-cv-slot-same]', row);
          if (same) same.hidden = slotState[i].linked;
          if (!v || !v.available) row.setAttribute('data-cv-slot-bad', ''); else row.removeAttribute('data-cv-slot-bad');
        }
      });

      slotCases.forEach(function (c) {
        var i = parseInt(c.getAttribute('data-cv-slot-case'), 10);
        c.hidden = i >= qty;
        if (i >= qty) return;
        var v = lines[i];
        var id = v ? v.id : null;
        if (i < from && slotIds[i] !== undefined && slotIds[i] !== id) changed.push(i);
        slotIds[i] = id;
        var img = $('[data-cv-slot-img]', c);
        var src = v && v.featured_image && v.featured_image.src ? sized(v.featured_image.src, 240) : fallbackImg;
        if (img && src && img.getAttribute('src') !== src) { img.src = src; img.hidden = false; }
      });

      slotQty = show ? qty : 1;
      if (changedSlot > 0 && changed.indexOf(changedSlot) === -1 && changedSlot < qty) changed.push(changedSlot);
      changedSlot = -1;
      root.dispatchEvent(new CustomEvent('cvs:slots', { detail: { from: from, qty: show ? qty : 1, changed: changed, lines: lines } }));
      if (wasHidden !== els.slots.hidden || from !== slotQty) layoutChanged('slots');
    }

    /* The savings line: the real saving of the chosen pack, or what the next pack up would take off. */
    function renderSavings(subtotal, total, pct) {
      if (els.savingsFill) els.savingsFill.style.width = (maxPct ? Math.round(pct / maxPct * 100) : 0) + '%';
      if (!els.savings) return;
      var qty = packQty(activePack);
      var off = subtotal - total;
      var text = '';
      if (off > 0) {
        text = fill(els.savings.getAttribute('data-template-save'), { qty: qty, amount: formatMoney(off) });
      } else {
        var next = null;
        packs.forEach(function (p) {
          if (packPct(p) > pct && (!next || packPct(p) < packPct(next))) next = p;
        });
        if (next) text = fill(els.savings.getAttribute('data-template-next'), { qty: packQty(next), pct: packPct(next) });
      }
      if (els.savings.textContent !== text) els.savings.textContent = text;
    }

    var inflight = false;
    function busy() {
      return inflight || (els.addBtn && els.addBtn.classList.contains('is-busy')) ||
        buyButtons.some(function (b) { return b.classList.contains('is-busy'); });
    }

    var snapshot = { variant: null, qty: 1, pct: 0, each: 0, total: 0, lines: [], canBuy: false };

    /* Repaint every price, stock and label surface from the real variants and pack. */
    function render() {
      var variant = findVariant();
      var qty = packQty(activePack);
      var pct = packPct(activePack);

      if (!variant) {
        if (els.addBtn) els.addBtn.disabled = true;
        buyButtons.forEach(function (b) { b.disabled = true; });
        if (els.ctaLabel) els.ctaLabel.textContent = t('unavailable', 'Unavailable');
        if (els.variantId) els.variantId.value = '';
        if (els.total) els.total.textContent = '';
        snapshot = { variant: null, qty: qty, pct: pct, each: 0, total: 0, lines: [], canBuy: false };
        return;
      }

      syncLinked();
      var lines = els.slots ? packLines(qty, variant) : [];
      var subtotal = variant.price * qty;
      var badCase = -1;
      if (lines.length) {
        subtotal = 0;
        lines.forEach(function (v, i) {
          subtotal += v ? v.price : variant.price;
          if (i > 0 && badCase < 0 && (!v || !v.available)) badCase = i;
        });
      }
      var total = discounted(subtotal, pct);
      var each = Math.floor(total / qty);
      var mixed = lines.some(function (v) { return v && v.id !== variant.id; });

      // No phone chosen yet: no case id is written for the form (JS posts nothing until one is).
      if (els.variantId) els.variantId.value = modelUnset ? '' : variant.id;
      if (els.quantity) els.quantity.value = qty;
      var compareAt = variant.compare_at_price && variant.compare_at_price > variant.price
        ? variant.compare_at_price
        : compareFallback;
      var hasWas = compareAt > variant.price;
      var compareSaving = hasWas ? compareAt - variant.price : 0;
      var comparePct = hasWas ? Math.round(compareSaving * 100 / compareAt) : 0;
      if (els.priceNow) els.priceNow.textContent = formatMoney(variant.price);
      if (els.priceWas) {
        els.priceWas.hidden = !hasWas;
        if (hasWas) els.priceWas.textContent = formatMoney(compareAt);
      }
      if (els.priceProof) els.priceProof.hidden = !hasWas;
      if (els.tagSale) els.tagSale.hidden = !hasWas;
      if (els.priceSave && hasWas) els.priceSave.textContent = formatMoney(compareSaving);
      if (els.discountPct && hasWas) els.discountPct.textContent = comparePct + '%';
      // "Rating, price & pitch" block under the title (snippets/cv-product-summary.liquid).
      $$('[data-cv-sum-now]').forEach(function (el) { el.textContent = formatMoney(variant.price); });
      // It shows only the variant's real compare-at price, never the section fallback.
      var realWas = variant.compare_at_price && variant.compare_at_price > variant.price ? variant.compare_at_price : 0;
      var realSaving = realWas ? realWas - variant.price : 0;
      $$('[data-cv-sum-was-wrap]').forEach(function (el) {
        el.hidden = !realWas;
        var out = $('[data-cv-sum-was]', el);
        if (out) out.textContent = realWas ? formatMoney(realWas) : '';
      });
      $$('[data-cv-sum-save]').forEach(function (el) {
        el.hidden = !realWas;
        var out = $('[data-cv-sum-save-value]', el);
        if (out && realWas) out.textContent = el.hasAttribute('data-percent') ? Math.round(realSaving * 100 / realWas) + '%' : formatMoney(realSaving);
      });
      if (els.total) els.total.textContent = formatMoney(total);
      if (els.stickyTotal) els.stickyTotal.textContent = formatMoney(total);
      if (els.stickyVariant) {
        els.stickyVariant.textContent = mixed ? fill(t('mixed', '[qty] cases, mixed'), { qty: qty })
          : (modelUnset ? selected.filter(function (v, oi) { return oi !== modelIndex && !isBlank(v); }).join(' / ') : variant.title);
      }

      if (els.stock) {
        var threshold = parseInt(els.stock.getAttribute('data-threshold'), 10) || 0;
        var showStock = !modelUnset && threshold > 0 && variant.inventory_management === 'shopify' &&
          variant.inventory_policy === 'deny' && variant.inventory_quantity > 0 && variant.inventory_quantity <= threshold;
        els.stock.hidden = !showStock;
        if (showStock) {
          var stockOut = $('[data-cvc-stock-text]', els.stock);
          if (stockOut) stockOut.textContent = fill(els.stock.getAttribute('data-template') || 'Only [qty] left', { qty: variant.inventory_quantity });
        }
      }

      var eachWord = t('each', ' each');
      if (!/^\s/.test(eachWord)) eachWord = ' ' + eachWord;
      packs.forEach(function (pack) {
        var out = $('[data-cv-tier-each]', pack);
        if (!out) return;
        var q = packQty(pack);
        var money = formatMoney(eachPrice(variant.price, q, packPct(pack)));
        if (out.getAttribute('data-cv-tier-each') === 'small') { // the counter sets "each" smaller
          out.textContent = money;
          if (q > 1) {
            var small = document.createElement('small');
            small.textContent = eachWord;
            out.appendChild(small);
          }
        } else {
          out.textContent = money + (q > 1 ? eachWord : '');
        }
        // Struck-through compare-at price per case, same rule as the price under the title.
        var was = $('[data-cv-tier-was]', pack);
        if (was) {
          was.hidden = !hasWas;
          var wasOut = $('[data-cv-tier-was-value]', was);
          if (wasOut && hasWas) wasOut.textContent = formatMoney(compareAt);
        }
      });
      renderSavings(subtotal, total, pct);
      renderSlots(qty, lines);

      var canBuy = variant.available && badCase < 0;
      if (!busy()) {
        if (els.addBtn) els.addBtn.disabled = !canBuy;
        buyButtons.forEach(function (b) { b.disabled = !canBuy; });
        if (els.ctaLabel) {
          els.ctaLabel.textContent = !variant.available ? t('sold-out', 'Sold out')
            : (badCase > 0 ? fill(els.slots.getAttribute('data-template-bad') || 'Case [n] is sold out', { n: badCase + 1 }) : ctaDefault);
        }
      }
      if (els.stickyBtn) els.stickyBtn.disabled = !canBuy;
      if (variant.featured_image && variant.featured_image.src) swapImage(variant.featured_image.src);

      syncAvailability();
      snapshot = { variant: variant, qty: qty, pct: pct, each: each, total: total, lines: lines, canBuy: canBuy };
      root.dispatchEvent(new CustomEvent('cvs:change', { detail: {
        variant: variant, qty: qty, each: each, total: total, pct: pct, lines: lines,
        compareAt: compareAt, compareSaving: compareSaving, comparePct: comparePct,
        modelConfirmed: modelConfirmed, modelValue: hasModel && modelConfirmed && !modelUnset ? selected[modelIndex] : null
      } }));
    }

    /* Can this option value combine with the rest of the current selection? */
    function isAvailable(oi, val) { return stockFor(selected, oi, val) === 'ok'; }

    function syncAvailability() {
      $$('button[data-cv-option-index]').forEach(function (btn) {
        var ok = isAvailable(parseInt(btn.getAttribute('data-cv-option-index'), 10), btn.getAttribute('data-cv-value'));
        btn.setAttribute('data-cv-stock', ok ? '' : 'out');
      });
      $$('select[data-cv-option-index]').forEach(function (sel) {
        var oi = parseInt(sel.getAttribute('data-cv-option-index'), 10);
        var suffix = sel.getAttribute('data-sold-suffix') || ' (sold out)';
        Array.prototype.forEach.call(sel.options, function (opt) {
          if (opt.value === '') return; // the "Choose your phone model" placeholder keeps its words
          var label = opt.value + (isAvailable(oi, opt.value) ? '' : suffix);
          if (opt.textContent !== label) opt.textContent = label;
        });
      });
    }

    function setModelsOpen(open) {
      if (!els.models || !els.change) return;
      els.models.hidden = !open;
      els.change.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var current = $('[aria-checked="true"]', els.models) || $('button', els.models);
        if (current) { current.focus({ preventScroll: true }); current.scrollIntoView({ block: 'nearest' }); }
      }
      root.dispatchEvent(new CustomEvent('cvs:models', { detail: { open: open } }));
      layoutChanged('models');
    }
    if (els.change) {
      on(els.change, 'click', function () { setModelsOpen(els.models.hidden); });
    }

    /* Radio groups: click selects, arrow keys move and select. */
    function radioKeys(items, e) {
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].indexOf(e.key) === -1) return;
      e.preventDefault();
      var idx = items.indexOf(e.currentTarget);
      var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
      var next = items[(idx + dir + items.length) % items.length];
      if (next) { next.focus(); next.click(); }
    }

    $$('button[data-cv-option-index]').forEach(function (btn) {
      on(btn, 'click', function () {
        var oi = parseInt(btn.getAttribute('data-cv-option-index'), 10);
        var val = btn.getAttribute('data-cv-value');
        selected[oi] = val;
        if (oi === modelIndex) { modelUnset = false; setModelConfirmed(true); }
        var group = $$('[data-cv-option-index]', btn.parentNode);
        setRadioSelection(group, btn);
        var out = $('[data-cv-opt-out="' + oi + '"]');
        if (out) out.textContent = val;
        if (els.models && els.models.contains(btn)) {
          setModelsOpen(false);
          if (els.change) els.change.focus({ preventScroll: true });
        }
        render();
      });
      on(btn, 'keydown', function (e) {
        if (e.key === 'Escape' && els.models && els.models.contains(btn)) { setModelsOpen(false); if (els.change) els.change.focus(); return; }
        radioKeys($$('[data-cv-option-index]', btn.parentNode), e);
      });
    });

    $$('select[data-cv-option-index]').forEach(function (sel) {
      on(sel, 'change', function () {
        var oi = parseInt(sel.getAttribute('data-cv-option-index'), 10);
        selected[oi] = sel.value;
        if (oi === modelIndex) { modelUnset = isBlank(sel.value); setModelConfirmed(!modelUnset); }
        var out = $('[data-cv-opt-out="' + oi + '"]');
        if (out) out.textContent = sel.value;
        render();
      });
    });

    /* A case in a mixed pack: its own colour and model; changing one unlinks it from case 1. */
    slotRows.forEach(function (row) {
      var i = parseInt(row.getAttribute('data-cv-slot'), 10);
      if (!i) return;
      $$('select[data-cv-slot-option]', row).forEach(function (sel) {
        on(sel, 'change', function () {
          var oi = parseInt(sel.getAttribute('data-cv-slot-option'), 10);
          var s = slotState[i];
          s.linked = false;
          s.options[oi] = sel.value;
          var v = variantFor(s.options);
          if (!v || !v.available) {
            var near = closestVariant(s.options, oi);
            if (near) s.options = near.options.slice();
          }
          changedSlot = i;
          render();
        });
      });
      var same = $('[data-cv-slot-same]', row);
      if (same) {
        on(same, 'click', function () {
          slotState[i].linked = true;
          changedSlot = i;
          render();
          var first = $('select', row);
          if (first) first.focus();
        });
      }
    });

    /* Other parts of the page (the fit list) pick an option value through this event. */
    on(root, 'cvs:choose', function (e) {
      var d = e.detail || {};
      var value = String(d.value);
      var btn = $$('button[data-cv-option-index="' + d.index + '"]').filter(function (b) { return b.getAttribute('data-cv-value') === value; })[0];
      if (btn) { btn.click(); return; }
      var sel = $('select[data-cv-option-index="' + d.index + '"]');
      var known = sel && value !== '' && Array.prototype.some.call(sel.options, function (o) { return o.value === value; });
      if (sel && sel.value !== value && known) {
        sel.value = value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (known && hasModel && Number(d.index) === modelIndex && !modelConfirmed) {
        // The phone already shown, now picked by the shopper: it counts as chosen.
        selected[modelIndex] = value;
        modelUnset = false;
        setModelConfirmed(true);
        render();
      }
    });

    /* Sections below (the pack comparison) choose a pack through this event. */
    on(root, 'cvs:pack', function (e) {
      var qty = e.detail && Number(e.detail.qty);
      var pack = packs.filter(function (p) { return packQty(p) === qty; })[0];
      if (pack && pack !== activePack) pack.click();
    });

    packs.forEach(function (pack) {
      on(pack, 'click', function () {
        activePack = pack;
        setRadioSelection(packs, pack);
        render();
      });
      on(pack, 'keydown', function (e) { radioKeys(packs, e); });
    });

    var thumbs = $$('.cvs__thumb, [data-cv-thumb]');
    var galleryPanel = $('[role="tabpanel"][aria-labelledby]');
    function setTabSelection(items, selectedItem) {
      items.forEach(function (item) {
        var active = item === selectedItem;
        item.setAttribute('aria-selected', active ? 'true' : 'false');
        item.tabIndex = active ? 0 : -1;
      });
      if (galleryPanel && selectedItem && selectedItem.id) galleryPanel.setAttribute('aria-labelledby', selectedItem.id);
    }
    var activeThumb = thumbs.filter(function (thumb) { return thumb.getAttribute('aria-selected') === 'true'; })[0] || thumbs[0] || null;
    setTabSelection(thumbs, activeThumb);
    thumbs.forEach(function (thumb) {
      on(thumb, 'click', function () {
        setTabSelection(thumbs, thumb);
        swapImage(thumb.getAttribute('data-cv-full'));
        root.dispatchEvent(new CustomEvent('cvs:photo', { detail: { index: thumbs.indexOf(thumb) } }));
      });
      on(thumb, 'keydown', function (e) { radioKeys(thumbs, e); });
    });

    /* ------------------------------------------------------- add to bag, buy now */
    function say(message) { if (els.status) els.status.textContent = message; }
    var base = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';

    /* Every case in the chosen pack, identical cases merged into one line. */
    function cartItems() {
      if (modelUnset) return [];
      var variant = findVariant();
      if (!variant) return [];
      var qty = packQty(activePack);
      if (!els.slots) return [{ id: Number(variant.id), quantity: qty }];
      syncLinked();
      var byId = {};
      var order = [];
      packLines(qty, variant).forEach(function (v) {
        if (!v) return;
        if (!byId[v.id]) { byId[v.id] = { id: Number(v.id), quantity: 0 }; order.push(v.id); }
        byId[v.id].quantity += 1;
      });
      return order.map(function (id) { return byId[id]; });
    }

    function postItems(items) {
      return fetch(base + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: items })
      }).then(function (res) { return res.json().then(function (body) { if (!res.ok) throw body; return body; }); });
    }
    function failed(err) {
      var message = (err && err.description) ? err.description : t('error', 'That didn’t go through. Please try again.');
      say(message);
      return message;
    }
    /* A failed add or buy: the pressed button(s) carry is-error for 1200 ms, and cvs:error says why. */
    function flagError(buttons, kind, message, from) {
      var list = [];
      buttons.forEach(function (b) { if (b && b.classList && list.indexOf(b) === -1) list.push(b); });
      list.forEach(function (b) { b.classList.add('is-error'); });
      window.setTimeout(function () { list.forEach(function (b) { b.classList.remove('is-error'); }); }, 1200);
      root.dispatchEvent(new CustomEvent('cvs:error', { bubbles: true, detail: { message: message, button: from || null, kind: kind } }));
    }

    /* Model first: no phone picked yet, so nothing is posted; the shopper is sent to the picker. */
    function needModel(from, kind) {
      if (!hasModel || modelConfirmed) return false;
      root.dispatchEvent(new CustomEvent('cvs:needmodel', { bubbles: true, detail: { button: from || null, kind: kind } }));
      if (modelSelect) modelSelect.focus();
      else if (els.models && els.change) setModelsOpen(true);
      else {
        var pick = $('button[data-cv-option-index="' + modelIndex + '"][aria-checked="true"]') || $('button[data-cv-option-index="' + modelIndex + '"]');
        if (pick) pick.focus();
      }
      say(t('choose-model', 'Choose your phone model first'));
      return true;
    }

    function addedText(qty) {
      return fill(qty > 1 ? t('added-many', '[qty] cases added to your bag.') : t('added-one', '[qty] case added to your bag.'), { qty: qty });
    }

    function addToBag(from) {
      from = from || els.addBtn || null;
      if (busy()) return Promise.resolve({ ok: false, reason: 'busy' });
      if (needModel(from, 'add')) return Promise.resolve({ ok: false, reason: 'needmodel' });
      var items = cartItems();
      if (!items.length || !els.addBtn || els.addBtn.disabled) return Promise.resolve({ ok: false, reason: 'unavailable' });
      var qty = packQty(activePack);
      var img = currentImg();
      inflight = true;
      els.addBtn.classList.add('is-busy');
      els.addBtn.disabled = true;
      if (els.ctaLabel) els.ctaLabel.textContent = t('adding', 'Adding…');
      root.dispatchEvent(new CustomEvent('cvs:adding', { detail: { qty: qty, items: items, from: from, img: img } }));

      return postItems(items)
        .then(function () {
          inflight = false;
          els.addBtn.classList.remove('is-busy');
          els.addBtn.classList.add('is-done');
          if (els.ctaLabel) els.ctaLabel.textContent = t('added', 'In your bag');
          say(addedText(qty));
          root.dispatchEvent(new CustomEvent('cvs:added', { detail: { qty: qty, items: items, from: from, img: img } }));
          document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
          document.dispatchEvent(new CustomEvent('cart:added', { bubbles: true, detail: { source: 'pdp', from: from, img: img, qty: qty, items: items } }));
          if (window.CasifyCart && typeof window.CasifyCart.refresh === 'function') window.CasifyCart.refresh();
          later(function () { els.addBtn.classList.remove('is-done'); render(); }, 2000);
          return { ok: true, qty: qty, items: items };
        })
        .catch(function (err) {
          inflight = false;
          els.addBtn.classList.remove('is-busy');
          if (els.ctaLabel) els.ctaLabel.textContent = t('try-again', 'Try again');
          var message = failed(err);
          flagError([from, els.addBtn], 'add', message, from);
          later(render, 2400);
          return { ok: false, reason: 'error', message: message };
        });
    }

    /* Buy now: the same cases into the bag, then checkout, where the pack discount applies itself. */
    function buyNow(from) {
      from = from || buyButtons[0] || null;
      if (busy()) return Promise.resolve({ ok: false, reason: 'busy' });
      if (needModel(from, 'buy')) return Promise.resolve({ ok: false, reason: 'needmodel' });
      var items = cartItems();
      var own = buyButtons.indexOf(from) > -1;
      if (!items.length || (own ? from.disabled : !snapshot.canBuy)) return Promise.resolve({ ok: false, reason: 'unavailable' });
      var qty = packQty(activePack);
      var img = currentImg();
      inflight = true;
      buyButtons.forEach(function (b) { b.classList.add('is-busy'); b.disabled = true; });
      var label = from && from.querySelector ? $('[data-cv-buy-label]', from) : null;
      if (label) label.textContent = t('to-checkout', 'To checkout…');
      root.dispatchEvent(new CustomEvent('cvs:buying', { detail: { qty: qty, button: from, from: from, img: img, items: items } }));

      return postItems(items)
        .then(function () {
          say(t('checkout-redirect', 'Taking you to checkout.'));
          window.location.href = base + 'checkout';
          return { ok: true, qty: qty, items: items };
        })
        .catch(function (err) {
          inflight = false;
          buyButtons.forEach(function (b) { b.classList.remove('is-busy'); });
          if (label) label.textContent = label.getAttribute('data-label-default') || t('buy-now', 'Buy now');
          var message = failed(err);
          flagError([from], 'buy', message, from);
          render();
          return { ok: false, reason: 'error', message: message };
        });
    }

    if (els.form) {
      on(els.form, 'submit', function (e) { e.preventDefault(); addToBag(e.submitter || els.addBtn); });
    }
    if (els.stickyBtn) on(els.stickyBtn, 'click', function () { addToBag(els.stickyBtn); });
    buyButtons.forEach(function (b) { on(b, 'click', function () { buyNow(b); }); });
    /* Coming back from checkout with the browser's back button: the page is restored as it was left. */
    on(window, 'pageshow', function (e) {
      if (!e.persisted) return;
      inflight = false;
      buyButtons.forEach(function (b) {
        b.classList.remove('is-busy');
        var label = $('[data-cv-buy-label]', b);
        if (label) label.textContent = label.getAttribute('data-label-default') || t('buy-now', 'Buy now');
      });
      render();
    });

    /* ---------------------------------------------------------------- sticky bar */
    var stickyVisible = false;
    if (els.sticky && els.addBtn && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          els.sticky.classList.toggle('is-visible', show);
          els.sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
          $$('button', els.sticky).forEach(function (b) { b.tabIndex = show ? 0 : -1; });
          if (show !== stickyVisible) {
            stickyVisible = show;
            root.dispatchEvent(new CustomEvent('cvs:sticky', { bubbles: true, detail: { visible: show } }));
          }
        });
      }, { threshold: 0 });
      io.observe(els.addBtn);
    }

    render();

    return {
      root: root,
      add: function (opts) { return addToBag(opts && opts.from); },
      buyNow: function (opts) { return buyNow(opts && opts.from); },
      format: formatMoney,
      state: function () {
        return {
          variant: snapshot.variant, options: selected.slice(), qty: snapshot.qty, pct: snapshot.pct,
          each: snapshot.each, total: snapshot.total, lines: snapshot.lines.slice(),
          modelIndex: modelIndex, hasModel: hasModel, modelConfirmed: modelConfirmed,
          modelValue: hasModel && modelConfirmed && !modelUnset ? selected[modelIndex] : null,
          canBuy: snapshot.canBuy, busy: !!busy()
        };
      },
      destroy: function () {
        if (!alive) return;
        alive = false;
        cleanups.forEach(function (fn) { fn(); });
        cleanups = [];
        timers.forEach(function (id) { window.clearTimeout(id); });
        timers = [];
        if (io) { io.disconnect(); io = null; }
        if (layoutFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(layoutFrame);
        layoutFrame = 0;
      }
    };
  }

  /* ---------------------------------------------------------------- roots */
  function find(root) {
    for (var i = 0; i < instances.length; i++) if (instances[i].root === root) return instances[i];
    return null;
  }
  function resolveRoot(target) {
    if (!target) return instances.length ? instances[0].root : document.querySelector('[data-cv-pdp]');
    if (typeof target === 'string') { try { target = document.querySelector(target); } catch (e) { return null; } }
    if (!target || target.nodeType !== 1) return null;
    if (target.matches('[data-cv-pdp]')) return target;
    return target.closest('[data-cv-pdp]') || target.querySelector('[data-cv-pdp]');
  }
  function init(target) {
    var root = resolveRoot(target);
    if (!root) return null;
    var existing = find(root);
    if (existing) return existing;
    var api = create(root);
    instances.push(api);
    return api;
  }
  function destroy(target) {
    var root = resolveRoot(target);
    var api = root && find(root);
    if (!api) return;
    api.destroy();
    instances.splice(instances.indexOf(api), 1);
  }
  function rootsIn(el) {
    if (!el || el.nodeType !== 1) return [];
    var list = Array.prototype.slice.call(el.querySelectorAll('[data-cv-pdp]'));
    if (el.matches('[data-cv-pdp]')) list.unshift(el);
    return list;
  }
  function firstFormat() {
    for (var i = 0; i < instances.length; i++) {
      var f = instances[i].root.getAttribute('data-money-format');
      if (f) return f;
    }
    var el = document.querySelector('[data-cv-pdp][data-money-format]');
    return el ? el.getAttribute('data-money-format') : '';
  }

  window.CasifyPDP = {
    init: init,
    destroy: destroy,
    add: function (target, opts) { var api = init(target); return api ? api.add(opts) : Promise.resolve({ ok: false, reason: 'noroot' }); },
    buyNow: function (target, opts) { var api = init(target); return api ? api.buyNow(opts) : Promise.resolve({ ok: false, reason: 'noroot' }); },
    state: function (target) { var root = resolveRoot(target); var api = root && find(root); return api ? api.state() : null; }
  };
  if (!window.CasifyMoney || typeof window.CasifyMoney.format !== 'function') {
    window.CasifyMoney = {
      format: function (cents, format) { return formatWith(format || firstFormat() || window.themeMoneyFormat || FALLBACK_FORMAT, cents); }
    };
  }

  /* Theme editor: a reloaded section gets a fresh instance; a removed one leaves nothing behind. */
  document.addEventListener('shopify:section:unload', function (e) { rootsIn(e.target).forEach(destroy); });
  document.addEventListener('shopify:section:load', function (e) { rootsIn(e.target).forEach(init); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-cv-pdp]'), init);
})();
