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
 * Motion lives in cv-pdp-slip-motion.js, cv-pdp-counter-motion.js and
 * cv-pack-motion.js. Loads on product templates and no-ops without [data-cv-pdp].
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-cv-pdp]');
  if (!root) return;

  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

  function parseJSONAttr(attr, fallback) {
    var raw = root.getAttribute(attr);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  var moneyFormat = root.getAttribute('data-money-format') || window.themeMoneyFormat || '${{amount}}';

  /* Format cents with the shop's money format (the four standard placeholders). */
  function formatMoney(cents) {
    var value = Number(cents);
    if (isNaN(value)) return '';
    function group(num, decimals, thousands, decimal) {
      var parts = (num / 100).toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + thousands);
      return parts.join(decimal);
    }
    return moneyFormat.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
      switch (key) {
        case 'amount_no_decimals': return group(value, 0, ',', '.');
        case 'amount_with_comma_separator': return group(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return group(value, 0, '.', ',');
        default: return group(value, 2, ',', '.');
      }
    });
  }

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
  var ctaDefault = els.ctaLabel ? (els.ctaLabel.getAttribute('data-label-default') || 'Add to bag') : 'Add to bag';
  var buyButtons = $$('[data-cv-buy-now]');

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
  function findVariant() { return variantFor(selected); }

  function swapImage(src) {
    if (!els.mainImage || !src || els.mainImage.tagName !== 'IMG') return;
    if (els.mainImage.getAttribute('src') === src) return;
    els.mainImage.classList.add('is-swapping');
    els.mainImage.removeAttribute('srcset');
    els.mainImage.src = src;
    window.setTimeout(function () { els.mainImage.classList.remove('is-swapping'); }, 260);
  }

  function fill(template, values) {
    return String(template || '').replace(/\[(\w+)\]/g, function (m, key) { return key in values ? values[key] : m; });
  }

  function sized(src, width) {
    if (!src) return '';
    return src + (src.indexOf('?') === -1 ? '?' : '&') + 'width=' + width;
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

  /* 'ok', 'out' (made, sold out) or 'none' (not made) for one value, holding the rest of a case's choice. */
  function stockFor(opts, oi, val) {
    var exists = false;
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (String(v.options[oi]) !== String(val)) continue;
      var others = true;
      for (var oj = 0; oj < opts.length; oj++) {
        if (oj !== oi && String(v.options[oj]) !== String(opts[oj])) { others = false; break; }
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
      lines.push(i > 0 && slotState[i] ? variantFor(slotState[i].options) : mainVariant);
    }
    return lines;
  }

  var changedSlot = -1;
  function renderSlots(qty, lines) {
    if (!els.slots) return;
    var from = slotQty;
    var show = qty > 1;
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
            ? $$('select[data-cv-slot-option]', slotRows[1] || row).map(function (s) { return opts[parseInt(s.getAttribute('data-cv-slot-option'), 10)]; })
            : [v ? v.title : ''];
          var line = parts.join(' · ');
          if (summary.textContent !== line) summary.textContent = line;
        }
      } else {
        $$('select[data-cv-slot-option]', row).forEach(function (sel) {
          var oi = parseInt(sel.getAttribute('data-cv-slot-option'), 10);
          Array.prototype.forEach.call(sel.options, function (opt) {
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

  function busy() {
    return (els.addBtn && els.addBtn.classList.contains('is-busy')) ||
      buyButtons.some(function (b) { return b.classList.contains('is-busy'); });
  }

  /* Repaint every price, stock and label surface from the real variants and pack. */
  function render() {
    var variant = findVariant();
    var qty = packQty(activePack);
    var pct = packPct(activePack);

    if (!variant) {
      if (els.addBtn) els.addBtn.disabled = true;
      buyButtons.forEach(function (b) { b.disabled = true; });
      if (els.ctaLabel) els.ctaLabel.textContent = 'Unavailable';
      if (els.variantId) els.variantId.value = '';
      if (els.total) els.total.textContent = '';
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

    if (els.variantId) els.variantId.value = variant.id;
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
    if (els.stickyVariant) els.stickyVariant.textContent = mixed ? qty + ' cases, mixed' : variant.title;

    if (els.stock) {
      var threshold = parseInt(els.stock.getAttribute('data-threshold'), 10) || 0;
      var showStock = threshold > 0 && variant.inventory_management === 'shopify' &&
        variant.inventory_policy === 'deny' && variant.inventory_quantity > 0 && variant.inventory_quantity <= threshold;
      els.stock.hidden = !showStock;
      if (showStock) {
        var stockOut = $('[data-cvc-stock-text]', els.stock);
        if (stockOut) stockOut.textContent = fill(els.stock.getAttribute('data-template') || 'Only [qty] left', { qty: variant.inventory_quantity });
      }
    }

    packs.forEach(function (pack) {
      var out = $('[data-cv-tier-each]', pack);
      if (!out) return;
      var q = packQty(pack);
      var money = formatMoney(eachPrice(variant.price, q, packPct(pack)));
      if (out.getAttribute('data-cv-tier-each') === 'small') { // the counter sets "each" smaller
        out.textContent = money;
        if (q > 1) {
          var small = document.createElement('small');
          small.textContent = ' each';
          out.appendChild(small);
        }
      } else {
        out.textContent = money + (q > 1 ? ' each' : '');
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
        els.ctaLabel.textContent = !variant.available ? 'Sold out'
          : (badCase > 0 ? fill(els.slots.getAttribute('data-template-bad') || 'Case [n] is sold out', { n: badCase + 1 }) : ctaDefault);
      }
    }
    if (els.stickyBtn) els.stickyBtn.disabled = !canBuy;
    if (variant.featured_image && variant.featured_image.src) swapImage(variant.featured_image.src);

    syncAvailability();
    root.dispatchEvent(new CustomEvent('cvs:change', { detail: { variant: variant, qty: qty, each: each, total: total, pct: pct, lines: lines, compareAt: compareAt, compareSaving: compareSaving, comparePct: comparePct } }));
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
  }
  if (els.change) {
    els.change.addEventListener('click', function () { setModelsOpen(els.models.hidden); });
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
    btn.addEventListener('click', function () {
      var oi = parseInt(btn.getAttribute('data-cv-option-index'), 10);
      var val = btn.getAttribute('data-cv-value');
      selected[oi] = val;
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
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.models && els.models.contains(btn)) { setModelsOpen(false); if (els.change) els.change.focus(); return; }
      radioKeys($$('[data-cv-option-index]', btn.parentNode), e);
    });
  });

  $$('select[data-cv-option-index]').forEach(function (sel) {
    sel.addEventListener('change', function () {
      var oi = parseInt(sel.getAttribute('data-cv-option-index'), 10);
      selected[oi] = sel.value;
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
      sel.addEventListener('change', function () {
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
      same.addEventListener('click', function () {
        slotState[i].linked = true;
        changedSlot = i;
        render();
        var first = $('select', row);
        if (first) first.focus();
      });
    }
  });

  /* Other parts of the page (the fit list) pick an option value through this event. */
  root.addEventListener('cvs:choose', function (e) {
    var d = e.detail || {};
    var value = String(d.value);
    var btn = $$('button[data-cv-option-index="' + d.index + '"]').filter(function (b) { return b.getAttribute('data-cv-value') === value; })[0];
    if (btn) { btn.click(); return; }
    var sel = $('select[data-cv-option-index="' + d.index + '"]');
    if (sel && sel.value !== value && Array.prototype.some.call(sel.options, function (o) { return o.value === value; })) {
      sel.value = value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  /* Sections below (the pack comparison) choose a pack through this event. */
  root.addEventListener('cvs:pack', function (e) {
    var qty = e.detail && Number(e.detail.qty);
    var pack = packs.filter(function (p) { return packQty(p) === qty; })[0];
    if (pack && pack !== activePack) pack.click();
  });

  packs.forEach(function (pack) {
    pack.addEventListener('click', function () {
      activePack = pack;
      setRadioSelection(packs, pack);
      render();
    });
    pack.addEventListener('keydown', function (e) { radioKeys(packs, e); });
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
    thumb.addEventListener('click', function () {
      setTabSelection(thumbs, thumb);
      swapImage(thumb.getAttribute('data-cv-full'));
      root.dispatchEvent(new CustomEvent('cvs:photo', { detail: { index: thumbs.indexOf(thumb) } }));
    });
    thumb.addEventListener('keydown', function (e) { radioKeys(thumbs, e); });
  });

  /* ------------------------------------------------------- add to bag, buy now */
  function say(message) { if (els.status) els.status.textContent = message; }
  var base = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';

  /* Every case in the chosen pack, identical cases merged into one line. */
  function cartItems() {
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
    say((err && err.description) ? err.description : 'That didn’t go through. Please try again.');
  }

  function addToBag() {
    var items = cartItems();
    if (!items.length || !els.addBtn || els.addBtn.disabled || busy()) return;
    var qty = packQty(activePack);
    els.addBtn.classList.add('is-busy');
    els.addBtn.disabled = true;
    if (els.ctaLabel) els.ctaLabel.textContent = 'Adding…';
    root.dispatchEvent(new CustomEvent('cvs:adding'));

    postItems(items)
      .then(function () {
        els.addBtn.classList.remove('is-busy');
        els.addBtn.classList.add('is-done');
        if (els.ctaLabel) els.ctaLabel.textContent = 'In your bag';
        say(qty + (qty > 1 ? ' cases' : ' case') + ' added to your bag.');
        root.dispatchEvent(new CustomEvent('cvs:added', { detail: { qty: qty, items: items } }));
        document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
        document.dispatchEvent(new CustomEvent('cart:added', { bubbles: true }));
        if (window.CasifyCart && typeof window.CasifyCart.refresh === 'function') window.CasifyCart.refresh();
        window.setTimeout(function () { els.addBtn.classList.remove('is-done'); render(); }, 2000);
      })
      .catch(function (err) {
        els.addBtn.classList.remove('is-busy');
        if (els.ctaLabel) els.ctaLabel.textContent = 'Try again';
        failed(err);
        window.setTimeout(render, 2400);
      });
  }

  /* Buy now: the same cases into the bag, then checkout, where the pack discount applies itself. */
  function buyNow(btn) {
    var items = cartItems();
    if (!items.length || btn.disabled || busy()) return;
    var qty = packQty(activePack);
    buyButtons.forEach(function (b) { b.classList.add('is-busy'); b.disabled = true; });
    var label = $('[data-cv-buy-label]', btn);
    if (label) label.textContent = 'To checkout…';
    root.dispatchEvent(new CustomEvent('cvs:buying', { detail: { qty: qty, button: btn } }));

    postItems(items)
      .then(function () {
        say('Taking you to checkout.');
        window.location.href = base + 'checkout';
      })
      .catch(function (err) {
        buyButtons.forEach(function (b) { b.classList.remove('is-busy'); });
        if (label) label.textContent = label.getAttribute('data-label-default') || 'Buy now';
        failed(err);
        render();
      });
  }

  if (els.form) {
    els.form.addEventListener('submit', function (e) { e.preventDefault(); addToBag(); });
  }
  if (els.stickyBtn) els.stickyBtn.addEventListener('click', addToBag);
  buyButtons.forEach(function (b) { b.addEventListener('click', function () { buyNow(b); }); });
  /* Coming back from checkout with the browser's back button: the page is restored as it was left. */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    buyButtons.forEach(function (b) {
      b.classList.remove('is-busy');
      var label = $('[data-cv-buy-label]', b);
      if (label) label.textContent = label.getAttribute('data-label-default') || 'Buy now';
    });
    render();
  });

  /* ---------------------------------------------------------------- sticky bar */
  if (els.sticky && els.addBtn && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        els.sticky.classList.toggle('is-visible', show);
        els.sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
        $$('button', els.sticky).forEach(function (b) { b.tabIndex = show ? 0 : -1; });
      });
    }, { threshold: 0 }).observe(els.addBtn);
  }

  render();
})();
