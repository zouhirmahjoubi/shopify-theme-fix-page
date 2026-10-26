/* Casify: quick pick (snippets/cv-quick-pick.liquid, styles in cv-quick-pick.css).
 *
 * Any product card button with [data-cvqp-open] opens one shared dialog,
 * filled on demand from /products/<handle>.js. The shopper chooses colour and
 * phone model, sees that exact variant's photo, price and stock, and adds that
 * variant. Nothing is ever chosen for the shopper: every option with more than
 * one value starts empty, and Add to bag / Buy now stay disabled (their label
 * says what is missing) until a real variant is resolved from all options.
 *
 * Opener attributes: data-handle, data-url, and data-cvqp-buy-now to show the
 * secondary Buy now (posts the same variant, then goes to checkout).
 * After an add: cv:cart {cart} (badge, pack meter) and cart:added
 * {source: 'quick-pick', from: opener, img: chosen variant image, qty: 1}.
 *
 * Loaded by layout/theme.liquid only when a card on the page asks for it.
 * GSAP is optional: without it, or under reduced motion, the dialog opens and
 * closes without animation.
 */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  var dialog = $('[data-cvqp]');
  if (!dialog) return;

  function motion() { return !!window.gsap && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  var base = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';

  function formatMoney(cents, format) {
    var value = Number(cents);
    if (isNaN(value)) return '';
    function group(num, decimals, thousands, decimal) {
      var parts = (num / 100).toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + thousands);
      return parts.join(decimal);
    }
    return String(format || window.themeMoneyFormat || '${{amount}}').replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, key) {
      switch (key) {
        case 'amount_no_decimals': return group(value, 0, ',', '.');
        case 'amount_with_comma_separator': return group(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return group(value, 0, '.', ',');
        default: return group(value, 2, ',', '.');
      }
    });
  }
  function fill(template, values) {
    return String(template || '').replace(/\[(\w+)\]/g, function (m, key) { return key in values ? values[key] : m; });
  }
  function sized(src, width) {
    if (!src) return '';
    return src + (src.indexOf('?') === -1 ? '?' : '&') + 'width=' + width;
  }
  function absolute(src) { return src && src.indexOf('//') === 0 ? 'https:' + src : src; }
  function getCart() {
    return fetch(base + 'cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); });
  }
  function announceCart(cart) {
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });
    document.dispatchEvent(new CustomEvent('cv:cart', { detail: { cart: cart } }));
  }

  var els = {
    sheet: $('.cvqp__sheet', dialog),
    img: $('[data-cvqp-img]', dialog),
    title: $('[data-cvqp-title]', dialog),
    price: $('[data-cvqp-price]', dialog),
    was: $('[data-cvqp-was]', dialog),
    options: $('[data-cvqp-options]', dialog),
    add: $('[data-cvqp-add]', dialog),
    addLabel: $('[data-cvqp-add-label]', dialog),
    buy: $('[data-cvqp-buy]', dialog),
    buyLabel: $('[data-cvqp-buy-label]', dialog),
    status: $('[data-cvqp-status]', dialog),
    more: $('[data-cvqp-more]', dialog)
  };
  /* Shopper strings come from the snippet (locale keys); English is only the fallback. */
  var EN = {
    add: 'Add to bag', adding: 'Adding…', added: 'In your bag', sold: 'Sold out',
    missing: 'Not made in this combination', loading: 'Opening the case…',
    error: 'That didn’t load. Open the product page instead.', buy: 'Buy now',
    buying: 'Going to checkout…', 'choose-phone': 'Choose your phone', 'choose-option': 'Choose [option]',
    'phone-label': 'Your phone', 'sold-suffix': ' (sold out)', 'none-suffix': ' (unavailable)',
    'in-bag': '[n] in your bag.', 'add-failed': 'That didn’t go through. Please try again.'
  };
  function t(k) { return dialog.getAttribute('data-t-' + k) || EN[k] || ''; }
  var moneyFormat = dialog.getAttribute('data-money-format');
  var cache = {};
  var product = null;
  var names = [];
  var mi = -1;
  var selected = [];
  var opener = null;
  var busy = false;
  var closeTimer = 0;
  function clearCloseTimer() { if (closeTimer) { window.clearTimeout(closeTimer); closeTimer = 0; } }

  function optionNames(p) { return (p.options || []).map(function (o) { return typeof o === 'string' ? o : o.name; }); }
  /* STORE-FACTS 4: name first, then values (several, not only the first variant). */
  function modelIndex(p, list) {
    for (var i = 0; i < list.length; i++) if (/model|phone|device|compatib|applicable/i.test(list[i])) return i;
    for (var j = 0; j < list.length; j++) {
      var vals = valuesFor(p, j);
      for (var k = 0; k < vals.length; k++) if (/iphone|galaxy|samsung|pixel|\bs2[0-9]\b/i.test(String(vals[k]))) return j;
    }
    return -1;
  }
  function valuesFor(p, i) {
    var o = p.options[i];
    if (o && o.values) return o.values;
    var seen = [];
    p.variants.forEach(function (v) { if (seen.indexOf(v.options[i]) === -1) seen.push(v.options[i]); });
    return seen;
  }
  function chosen(i) { return selected[i] != null && selected[i] !== ''; }
  function complete() { for (var i = 0; i < names.length; i++) if (!chosen(i)) return false; return true; }
  function variantFor(opts) {
    if (!complete()) return null;
    return product.variants.filter(function (v) { return v.options.every(function (x, i) { return String(x) === String(opts[i]); }); })[0] || null;
  }
  /* Stock of one value, given the other choices made so far (an empty choice matches anything). */
  function stockFor(oi, val) {
    var exists = false;
    for (var i = 0; i < product.variants.length; i++) {
      var v = product.variants[i];
      if (String(v.options[oi]) !== String(val)) continue;
      var others = v.options.every(function (x, j) { return j === oi || !chosen(j) || String(x) === String(selected[j]); });
      if (!others) continue;
      if (v.available) return 'ok';
      exists = true;
    }
    return exists ? 'out' : 'none';
  }
  /* When a full choice is not sold, move only the non-phone options to the nearest available
     variant. The phone model is never changed for the shopper. */
  function closest(oi) {
    var best = null, score = -1;
    product.variants.forEach(function (v) {
      if (!v.available || String(v.options[oi]) !== String(selected[oi])) return;
      if (mi >= 0 && String(v.options[mi]) !== String(selected[mi])) return;
      var s = v.options.reduce(function (n, x, j) { return n + (String(x) === String(selected[j]) ? 1 : 0); }, 0);
      if (s > score) { best = v; score = s; }
    });
    return best;
  }
  /* The photo for the choices so far: the full variant's, else the first variant that matches
     every choice made and has its own image, else the product photo. */
  function imageFor(v) {
    if (v && v.featured_image && v.featured_image.src) return v.featured_image.src;
    for (var i = 0; i < product.variants.length; i++) {
      var x = product.variants[i];
      var match = x.options.every(function (o, j) { return !chosen(j) || String(o) === String(selected[j]); });
      if (match && x.featured_image && x.featured_image.src && names.some(function (_, j) { return chosen(j); })) return x.featured_image.src;
    }
    return product.featured_image || '';
  }
  function missingLabel() {
    if (mi >= 0 && !chosen(mi)) return t('choose-phone');
    for (var i = 0; i < names.length; i++) if (!chosen(i)) return fill(t('choose-option'), { option: names[i].toLowerCase() });
    return t('missing');
  }

  function paint() {
    var v = variantFor(selected);
    $$('select[data-cvqp-option]', els.options).forEach(function (sel) {
      var oi = parseInt(sel.getAttribute('data-cvqp-option'), 10);
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!o.value) return;
        var s = stockFor(oi, o.value);
        var label = o.value + (s === 'ok' ? '' : (s === 'out' ? t('sold-suffix') : t('none-suffix')));
        if (o.textContent !== label) o.textContent = label;
      });
      var want = chosen(oi) ? String(selected[oi]) : '';
      if (sel.value !== want) sel.value = want;
    });
    var price = v ? v.price : product.price;
    els.price.textContent = formatMoney(price, moneyFormat);
    var compare = v ? v.compare_at_price : product.compare_at_price;
    els.was.hidden = !(compare && compare > price);
    if (!els.was.hidden) els.was.textContent = formatMoney(compare, moneyFormat);
    var src = imageFor(v);
    if (src) {
      var next = sized(absolute(src), 900);
      if (els.img.getAttribute('src') !== next) {
        els.img.src = next;
        els.img.alt = product.title + (v ? ', ' + v.title : '');
        els.img.hidden = false;
        if (motion()) window.gsap.fromTo(els.img, { autoAlpha: 0.35, scale: 1.03 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out', clearProps: 'all' });
      }
    }
    if (!busy) {
      var ready = !!(v && v.available);
      els.add.disabled = !ready;
      els.addLabel.textContent = !v ? missingLabel() : (v.available ? t('add') : t('sold'));
      if (els.buy) {
        els.buy.disabled = !ready;
        if (els.buyLabel) els.buyLabel.textContent = t('buy');
      }
    }
  }

  function build(p) {
    product = p;
    names = optionNames(p);
    mi = modelIndex(p, names);
    /* Only an option with a single value is filled in; nothing else is chosen for the shopper. */
    selected = names.map(function (_, i) { var vals = valuesFor(p, i); return vals.length === 1 ? vals[0] : null; });
    els.title.textContent = p.title;
    els.options.innerHTML = '';
    var order = names.map(function (_, i) { return i; }).filter(function (i) { return i !== mi; });
    if (mi >= 0) order.push(mi);
    order.forEach(function (oi) {
      var vals = valuesFor(p, oi);
      if (vals.length < 2) return;
      var field = document.createElement('label');
      field.className = 'cvqp__field';
      var name = document.createElement('span');
      name.textContent = oi === mi ? t('phone-label') : names[oi];
      var wrap = document.createElement('span');
      wrap.className = 'cvqp__select';
      var sel = document.createElement('select');
      sel.setAttribute('data-cvqp-option', oi);
      if (oi === mi) sel.setAttribute('data-cvqp-model', '');
      var blank = document.createElement('option');
      blank.value = '';
      blank.disabled = true;
      blank.selected = true;
      blank.textContent = oi === mi ? t('choose-phone') : fill(t('choose-option'), { option: names[oi].toLowerCase() });
      sel.appendChild(blank);
      vals.forEach(function (val) {
        var o = document.createElement('option');
        o.value = val;
        o.textContent = val;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        selected[oi] = sel.value || null;
        var v = variantFor(selected);
        if (complete() && (!v || !v.available)) { var near = closest(oi); if (near) selected = near.options.slice(); }
        els.status.textContent = '';
        paint();
      });
      wrap.appendChild(sel);
      wrap.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>');
      field.appendChild(name);
      field.appendChild(wrap);
      els.options.appendChild(field);
    });
    paint();
    var firstSelect = $('select', els.options);
    if (firstSelect) firstSelect.focus();
  }

  function open(btn) {
    clearCloseTimer();
    opener = btn;
    var handle = btn.getAttribute('data-handle');
    els.more.href = btn.getAttribute('data-url') || els.more.href;
    els.title.textContent = '';
    els.options.innerHTML = '';
    els.price.textContent = '';
    els.was.hidden = true;
    els.img.hidden = true;
    els.add.disabled = true;
    els.addLabel.textContent = t('add');
    if (els.buy) {
      els.buy.hidden = !btn.hasAttribute('data-cvqp-buy-now');
      els.buy.disabled = true;
      if (els.buyLabel) els.buyLabel.textContent = t('buy');
    }
    els.status.textContent = t('loading');
    product = null;
    dialog.showModal();
    if (motion()) window.gsap.fromTo(els.sheet, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.42, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    var load = cache[handle] || fetch(base + 'products/' + encodeURIComponent(handle) + '.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    cache[handle] = load;
    load.then(function (p) { if (opener !== btn || !dialog.open) return; els.status.textContent = ''; build(p); })
      .catch(function () { delete cache[handle]; els.status.textContent = t('error'); });
  }

  function close() {
    clearCloseTimer();
    if (!dialog.open) return;
    var done = function () { dialog.close(); if (opener) opener.focus(); };
    if (motion()) window.gsap.to(els.sheet, { y: 30, autoAlpha: 0, duration: 0.22, ease: 'power2.in', onComplete: function () { window.gsap.set(els.sheet, { clearProps: 'all' }); done(); } });
    else done();
  }

  /* The cart drawer opened after an add (theme setting cv_open_drawer_on_add): the modal sheet
     steps aside at once, without refocusing the opener, and focus goes into the drawer. The
     drawer returns focus to the same opener when it closes. */
  document.addEventListener('cart:drawer:open', function (e) {
    if (!dialog.open) return;
    clearCloseTimer();
    if (window.gsap) window.gsap.killTweensOf(els.sheet);
    if (window.gsap) window.gsap.set(els.sheet, { clearProps: 'all' });
    dialog.close();
    paint();
    var drawer = e.detail && e.detail.drawer;
    var first = drawer && drawer.querySelector('[data-cart-drawer-close], button, [href], input');
    if (first) first.focus();
  });

  /* Back from checkout (bfcache): a sheet left busy by Buy now unlocks. */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted || !busy) return;
    busy = false;
    paint();
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cvqp-open]');
    if (btn && !btn.disabled) { e.preventDefault(); open(btn); }
  });
  dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  dialog.addEventListener('click', function (e) {
    if (e.target.closest('[data-cvqp-close]')) { close(); return; }
    if (e.target !== dialog) return;
    var r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });

  function post(v) {
    return fetch(base + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] })
    }).then(function (r) { return r.json().then(function (body) { if (!r.ok) throw body; return body; }); });
  }
  function failed(err) {
    busy = false;
    els.status.textContent = (err && err.description) || t('add-failed');
    paint();
  }

  els.add.addEventListener('click', function () {
    var v = product && variantFor(selected);
    if (!v || !v.available || busy) return;
    var from = opener;
    var img = sized(absolute(imageFor(v)), 600);
    busy = true;
    els.add.disabled = true;
    if (els.buy) els.buy.disabled = true;
    els.addLabel.textContent = t('adding');
    post(v)
      .then(function () { return getCart(); })
      .then(function (cart) {
        busy = false;
        els.addLabel.textContent = t('added');
        var meter = $('[data-cv-pack-meter]');
        var line = meter ? fill(meter.getAttribute('data-t' + Math.min(cart.item_count, 3)), { p2: meter.getAttribute('data-p2'), p3: meter.getAttribute('data-p3'), n: cart.item_count }) : '';
        els.status.textContent = line || fill(t('in-bag'), { n: cart.item_count });
        announceCart(cart);
        document.dispatchEvent(new CustomEvent('cart:added', { bubbles: true, detail: { source: 'quick-pick', from: from, img: img, qty: 1 } }));
        clearCloseTimer();
        closeTimer = window.setTimeout(function () { closeTimer = 0; paint(); close(); }, 1500);
      })
      .catch(failed);
  });

  /* Buy now: the same chosen variant into the bag, then checkout. */
  if (els.buy) els.buy.addEventListener('click', function () {
    var v = product && variantFor(selected);
    if (!v || !v.available || busy) return;
    busy = true;
    els.add.disabled = true;
    els.buy.disabled = true;
    if (els.buyLabel) els.buyLabel.textContent = t('buying');
    post(v)
      .then(function () { window.location.href = base + 'checkout'; })
      .catch(failed);
  });
})();
