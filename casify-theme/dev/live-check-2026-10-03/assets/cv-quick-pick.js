/* Casify: quick pick (snippets/cv-quick-pick.liquid, styles in cv-quick-pick.css).
 *
 * Any product card button with [data-cvqp-open] opens one shared dialog,
 * filled on demand from /products/<handle>.js. The shopper chooses colour and
 * phone model, sees that exact variant's photo, price and stock, and adds that
 * variant. Nothing is ever added with a guessed model.
 *
 * Loaded by layout/theme.liquid only when a card on the page asks for it
 * (collection pages and the home page product rows). Moved out of
 * cv-pages.js so it works on every template. GSAP is optional: without it,
 * or under reduced motion, the dialog opens and closes without animation.
 */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  var dialog = $('[data-cvqp]');
  if (!dialog) return;

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function motion() { return !!window.gsap && !reduce; }
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
    status: $('[data-cvqp-status]', dialog),
    more: $('[data-cvqp-more]', dialog)
  };
  var t = function (k) { return dialog.getAttribute('data-t-' + k) || ''; };
  var moneyFormat = dialog.getAttribute('data-money-format');
  var cache = {};
  var product = null;
  var selected = [];
  var opener = null;
  var busy = false;

  function optionNames(p) { return (p.options || []).map(function (o) { return typeof o === 'string' ? o : o.name; }); }
  function modelIndex(p, names) {
    for (var i = 0; i < names.length; i++) if (/model|phone|device|compatib/i.test(names[i])) return i;
    for (var j = 0; j < names.length; j++) {
      var v = p.variants[0] && p.variants[0].options[j];
      if (/iphone|galaxy|samsung|pixel/i.test(String(v))) return j;
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
  function variantFor(opts) {
    return product.variants.filter(function (v) { return v.options.every(function (x, i) { return String(x) === String(opts[i]); }); })[0] || null;
  }
  function stockFor(oi, val) {
    var exists = false;
    for (var i = 0; i < product.variants.length; i++) {
      var v = product.variants[i];
      if (String(v.options[oi]) !== String(val)) continue;
      var others = v.options.every(function (x, j) { return j === oi || String(x) === String(selected[j]); });
      if (!others) continue;
      if (v.available) return 'ok';
      exists = true;
    }
    return exists ? 'out' : 'none';
  }
  function closest(oi) {
    var best = null, score = -1;
    product.variants.forEach(function (v) {
      if (!v.available || String(v.options[oi]) !== String(selected[oi])) return;
      var s = v.options.reduce(function (n, x, j) { return n + (String(x) === String(selected[j]) ? 1 : 0); }, 0);
      if (s > score) { best = v; score = s; }
    });
    return best;
  }

  function paint() {
    var v = variantFor(selected);
    $$('select[data-cvqp-option]', els.options).forEach(function (sel) {
      var oi = parseInt(sel.getAttribute('data-cvqp-option'), 10);
      Array.prototype.forEach.call(sel.options, function (o) {
        var s = stockFor(oi, o.value);
        var label = o.value + (s === 'ok' ? '' : (s === 'out' ? ' (sold out)' : ' (unavailable)'));
        if (o.textContent !== label) o.textContent = label;
      });
      if (sel.value !== String(selected[oi])) sel.value = selected[oi];
    });
    var price = v ? v.price : product.price;
    els.price.textContent = formatMoney(price, moneyFormat);
    var compare = v ? v.compare_at_price : product.compare_at_price;
    els.was.hidden = !(compare && compare > price);
    if (!els.was.hidden) els.was.textContent = formatMoney(compare, moneyFormat);
    var src = (v && v.featured_image && v.featured_image.src) || product.featured_image;
    if (src) {
      var next = sized(src.indexOf('//') === 0 ? 'https:' + src : src, 900);
      if (els.img.getAttribute('src') !== next) {
        els.img.src = next;
        els.img.alt = product.title + (v ? ' — ' + v.title : '');
        els.img.hidden = false;
        if (motion()) window.gsap.fromTo(els.img, { autoAlpha: 0.35, scale: 1.03 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power2.out', clearProps: 'all' });
      }
    }
    if (!busy) {
      els.add.disabled = !(v && v.available);
      els.addLabel.textContent = !v ? t('missing') : (v.available ? t('add') : t('sold'));
    }
  }

  function build(p) {
    product = p;
    var names = optionNames(p);
    var mi = modelIndex(p, names);
    var first = p.variants.filter(function (v) { return v.available; })[0] || p.variants[0];
    selected = first.options.slice();
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
      name.textContent = oi === mi ? 'Your phone' : names[oi];
      var wrap = document.createElement('span');
      wrap.className = 'cvqp__select';
      var sel = document.createElement('select');
      sel.setAttribute('data-cvqp-option', oi);
      vals.forEach(function (val) {
        var o = document.createElement('option');
        o.value = val;
        o.textContent = val;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        selected[oi] = sel.value;
        var v = variantFor(selected);
        if (!v || !v.available) { var near = closest(oi); if (near) selected = near.options.slice(); }
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
    els.status.textContent = t('loading');
    dialog.showModal();
    if (motion()) window.gsap.fromTo(els.sheet, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.42, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    var load = cache[handle] || fetch(base + 'products/' + encodeURIComponent(handle) + '.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    cache[handle] = load;
    load.then(function (p) { els.status.textContent = ''; build(p); })
      .catch(function () { delete cache[handle]; els.status.textContent = t('error'); });
  }

  function close() {
    if (!dialog.open) return;
    var done = function () { dialog.close(); if (opener) opener.focus(); };
    if (motion()) window.gsap.to(els.sheet, { y: 30, autoAlpha: 0, duration: 0.22, ease: 'power2.in', onComplete: function () { window.gsap.set(els.sheet, { clearProps: 'all' }); done(); } });
    else done();
  }

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

  els.add.addEventListener('click', function () {
    var v = product && variantFor(selected);
    if (!v || !v.available || busy) return;
    busy = true;
    els.add.disabled = true;
    els.addLabel.textContent = t('adding');
    fetch(base + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] })
    })
      .then(function (r) { return r.json().then(function (body) { if (!r.ok) throw body; return body; }); })
      .then(function () { return getCart(); })
      .then(function (cart) {
        busy = false;
        els.addLabel.textContent = t('added');
        var meter = $('[data-cv-pack-meter]');
        var line = meter ? fill(meter.getAttribute('data-t' + Math.min(cart.item_count, 3)), { p2: meter.getAttribute('data-p2'), p3: meter.getAttribute('data-p3'), n: cart.item_count }) : '';
        els.status.textContent = line || (cart.item_count + ' in your bag.');
        announceCart(cart);
        window.setTimeout(function () { paint(); close(); }, 1500);
      })
      .catch(function (err) {
        busy = false;
        els.status.textContent = (err && err.description) || 'That didn’t go through. Please try again.';
        paint();
      });
  });
})();
