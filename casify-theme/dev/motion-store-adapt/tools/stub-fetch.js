/* Harness fetch stub for Casify theme preview pages (dev only, never shipped).
 *
 * Load it as a plain, non-deferred script in <head>, BEFORE any theme script:
 *   <script>window.__STUB_FIXTURE = {...};</script>   (optional, see below)
 *   <script src="../../tools/stub-fetch.js"></script>
 *
 * Stubs, by URL pathname (any locale prefix, absolute or relative):
 *   POST /cart/add.js     JSON {items:[{id,quantity}]} or {id,quantity}, FormData or urlencoded
 *   POST /cart/change.js  {id: key|variant id, quantity} or {line, quantity}
 *   GET  /cart.js
 *   any URL with ?sections=a,b   -> {"a": html, "b": html}   (Section Rendering API)
 *   any URL with ?section_id=a   -> html
 * Add/change also honour a "sections" field in the body and return the sections map.
 * Everything else goes to the real fetch.
 *
 * Switches on the PAGE url:
 *   ?fail=1     add and change answer 422 {status, message, description}
 *   ?fail=all   every stubbed endpoint answers 500
 *   ?latency=N  wait N ms before answering (default 120)
 * At runtime: window.__stubFetch.setFail('0'|'1'|'all'), .reset(), .cart().
 *
 * Every stubbed call is recorded on window.__calls:
 *   {url, path, method, body, status, ok, at}
 *
 * Fixture (window.__STUB_FIXTURE, all optional):
 *   variants: [{id, title, price (cents), product_title, product_handle, image, options:[..],
 *               available, requires_shipping}]
 *   cart:     a Shopify cart object to start from (items with key, id/variant_id, quantity, ...)
 *   sections: {"cv-cart-drawer": "<div ...>html</div>", ...}
 *   currency: "USD"
 * Fixture text must be real store wording or clearly marked "fixture".
 */
(function () {
  'use strict';
  if (window.__stubFetch) return;
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  var q = new URLSearchParams(location.search);
  var fx = window.__STUB_FIXTURE || {};
  var failMode = q.get('fail') || '0';
  var latency = q.has('latency') ? Number(q.get('latency')) || 0 : 120;
  window.__calls = window.__calls || [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function emptyCart() {
    return {
      token: 'fixture-cart', note: null, attributes: {}, original_total_price: 0, total_price: 0,
      total_discount: 0, total_weight: 0, item_count: 0, items: [], requires_shipping: false,
      currency: fx.currency || 'USD', items_subtotal_price: 0, cart_level_discount_applications: []
    };
  }
  var cart = fx.cart ? clone(fx.cart) : emptyCart();
  var startCart = clone(cart);

  function recompute() {
    var total = 0, count = 0;
    cart.items.forEach(function (it) {
      it.line_price = it.price * it.quantity;
      it.original_line_price = it.line_price;
      it.final_price = it.price;
      it.final_line_price = it.line_price;
      total += it.line_price; count += it.quantity;
    });
    cart.items_subtotal_price = total;
    cart.original_total_price = total;
    cart.total_price = total;
    cart.item_count = count;
  }
  recompute();

  function findVariant(id) {
    id = Number(id);
    var list = fx.variants || [];
    for (var i = 0; i < list.length; i++) if (Number(list[i].id) === id) return list[i];
    return null;
  }
  function lineFor(v, id, qty) {
    var title = v ? (v.product_title || 'Fixture product') : 'Fixture product';
    var vt = v ? v.title : 'Fixture variant';
    return {
      id: Number(id), variant_id: Number(id), key: id + ':fixture', quantity: qty,
      title: title + (vt && vt !== 'Default Title' ? ' - ' + vt : ''),
      product_title: title, variant_title: vt, price: v ? v.price : 0,
      image: v ? (v.image || null) : null, url: '/products/' + (v && v.product_handle || 'fixture'),
      handle: v && v.product_handle || 'fixture', options_with_values: [],
      product_has_only_default_variant: !v || vt === 'Default Title', requires_shipping: true
    };
  }
  function add(items) {
    var added = [];
    items.forEach(function (it) {
      var id = it.id, qty = Number(it.quantity || 1);
      var v = findVariant(id);
      if (fx.variants && fx.variants.length && !v) {
        var e = new Error('fixture: unknown variant ' + id); e.status = 404; throw e;
      }
      if (v && v.available === false) {
        var s = new Error((v.product_title || 'This case') + ' is sold out.'); s.status = 422; throw s;
      }
      var existing = cart.items.filter(function (l) { return Number(l.id) === Number(id); })[0];
      if (existing) { existing.quantity += qty; added.push(existing); }
      else { var l = lineFor(v, id, qty); cart.items.unshift(l); added.push(l); }
    });
    recompute();
    return added;
  }
  function change(body) {
    var idx = -1;
    if (body.line) idx = Number(body.line) - 1;
    else cart.items.forEach(function (l, i) { if (l.key === String(body.id) || String(l.id) === String(body.id)) idx = i; });
    if (idx < 0 || !cart.items[idx]) { var e = new Error('fixture: no such line'); e.status = 400; throw e; }
    var qty = Number(body.quantity);
    if (qty <= 0) cart.items.splice(idx, 1); else cart.items[idx].quantity = qty;
    recompute();
  }

  function parseBody(init) {
    var b = init && init.body;
    if (!b) return {};
    if (typeof b === 'string') {
      try { return JSON.parse(b); } catch (e) { /* urlencoded */ }
      return formToObj(new URLSearchParams(b));
    }
    if (typeof FormData !== 'undefined' && b instanceof FormData) return formToObj(b);
    if (b instanceof URLSearchParams) return formToObj(b);
    return {};
  }
  function formToObj(fd) {
    var o = {}; var items = {};
    fd.forEach(function (v, k) {
      var m = /^items\[(\d+)\]\[(\w+)\]$/.exec(k);
      if (m) { items[m[1]] = items[m[1]] || {}; items[m[1]][m[2]] = v; return; }
      if (k === 'sections[]') { o.sections = (o.sections || []).concat(v); return; }
      o[k] = v;
    });
    if (Object.keys(items).length) o.items = Object.keys(items).map(function (k) { return items[k]; });
    return o;
  }
  function sectionsMap(ids) {
    if (!ids) return null;
    if (typeof ids === 'string') ids = ids.split(',');
    var out = {};
    ids.forEach(function (id) {
      id = id.trim(); if (!id) return;
      out[id] = (fx.sections && fx.sections[id]) || '<div id="shopify-section-' + id + '" class="shopify-section"><!-- fixture: no HTML for ' + id + ' --></div>';
    });
    return out;
  }
  function respond(status, body, type) {
    var text = typeof body === 'string' ? body : JSON.stringify(body);
    var res = new Response(text, { status: status, headers: { 'Content-Type': type || 'application/json' } });
    return new Promise(function (r) { setTimeout(function () { r(res); }, latency); });
  }
  function record(url, path, method, body, status) {
    window.__calls.push({ url: url, path: path, method: method, body: body, status: status, ok: status < 400, at: Date.now() });
  }

  function handle(input, init) {
    var raw = typeof input === 'string' ? input : (input && input.url) || String(input);
    var url;
    try { url = new URL(raw, location.href); } catch (e) { return null; }
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var path = url.pathname;
    var body = parseBody(init);
    var hard = failMode === 'all';
    var soft = failMode === '1' || failMode === 'true';

    if (/\/cart\/add(\.js)?$/.test(path) && method === 'POST') {
      if (hard || soft) {
        var st = hard ? 500 : 422;
        record(raw, path, method, body, st);
        return respond(st, { status: st, message: 'Cart Error', description: 'fixture: forced failure (?fail=' + failMode + ')' });
      }
      try {
        var items = body.items || [{ id: body.id, quantity: body.quantity || 1 }];
        var added = add(items);
        var out = body.items ? { items: added } : clone(added[0]);
        var sm = sectionsMap(body.sections); if (sm) out.sections = sm;
        record(raw, path, method, body, 200);
        return respond(200, out);
      } catch (e) {
        record(raw, path, method, body, e.status || 422);
        return respond(e.status || 422, { status: e.status || 422, message: 'Cart Error', description: e.message });
      }
    }
    if (/\/cart\/change(\.js)?$/.test(path) && method === 'POST') {
      if (hard || soft) {
        var st2 = hard ? 500 : 422;
        record(raw, path, method, body, st2);
        return respond(st2, { status: st2, message: 'Cart Error', description: 'fixture: forced failure (?fail=' + failMode + ')' });
      }
      try {
        change(body);
        var c = clone(cart); var sm2 = sectionsMap(body.sections); if (sm2) c.sections = sm2;
        record(raw, path, method, body, 200);
        return respond(200, c);
      } catch (e2) {
        record(raw, path, method, body, e2.status || 400);
        return respond(e2.status || 400, { status: e2.status || 400, message: 'Cart Error', description: e2.message });
      }
    }
    if (/\/cart(\.js)?$/.test(path) && method === 'GET' && /\.js$/.test(path)) {
      record(raw, path, method, body, hard ? 500 : 200);
      return hard ? respond(500, { status: 500 }) : respond(200, clone(cart));
    }
    if (url.searchParams.has('sections')) {
      record(raw, path, method, body, hard ? 500 : 200);
      return hard ? respond(500, { status: 500 }) : respond(200, sectionsMap(url.searchParams.get('sections')));
    }
    if (url.searchParams.has('section_id')) {
      var id = url.searchParams.get('section_id');
      record(raw, path, method, body, hard ? 500 : 200);
      return hard ? respond(500, 'fixture failure', 'text/html') : respond(200, sectionsMap([id])[id], 'text/html');
    }
    return null;
  }

  window.fetch = function (input, init) {
    var stubbed = handle(input, init);
    if (stubbed) return stubbed;
    if (!realFetch) return Promise.reject(new Error('fetch unavailable'));
    return realFetch(input, init);
  };
  window.__stubFetch = {
    setFail: function (mode) { failMode = String(mode); },
    reset: function () { cart = clone(startCart); recompute(); window.__calls.length = 0; },
    cart: function () { return clone(cart); },
    fixture: fx
  };
})();
