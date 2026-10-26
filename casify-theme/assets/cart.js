/* Casify: cart.js. AJAX cart, cart drawer, quantity steppers, toasts.
 *
 * Commerce only. Motion listens to the events below (assets/cv-commerce-motion.js) and never
 * owns cart state.
 *
 * Public:
 *   window.CasifyCart.refresh()  Promise of {added, removed, changed, cart} (or null); calls made in
 *                                the same tick share one refresh
 *   window.CasifyCart.open(opener), window.CasifyCart.close()
 *   window.Casify.openDrawer(opener), .updateCartCount() (Promise of the cart or null),
 *   .showToast(title, body, tone)  tone 'danger' gives the red alert toast (theme.js)
 * Dispatched on document:
 *   cart:drawer:open {drawer, opener}, cart:drawer:close {drawer}
 *   cart:drawer:refreshed {added: [keys], removed: [keys], changed: [keys], cart}
 *   cart:added {source: 'card', from, img, qty}  after a card form (form[data-cart-add-form]) add
 * Heard on document:
 *   cart:refresh, plus the legacy aliases cart:updated (cv-home-conversion.js) and
 *   casify:cart:updated (build-box.js); cv:cart (quick pick, badge already painted);
 *   cart:added (opens the drawer after the refresh only when the drawer carries
 *   data-open-on-add, the theme setting cv_open_drawer_on_add, default off).
 * Lines: quantity and remove post /cart/change.js with the drawer section bundled, swap the
 * drawer in place (no reload) and keep focus on the same control. Lines outside the drawer belong
 * to their own page script when it cancels the click or marks a wrapper [data-cart-self];
 * unowned lines elsewhere fall back to a reload.
 */
(function () {
  'use strict';
  var SECTION = 'cv-cart-drawer';
  var FOCUSABLE_SEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function on(el, evt, sel, handler) {
    el.addEventListener(evt, function (e) {
      var m = e.target && e.target.closest ? e.target.closest(sel) : null;
      if (m && el.contains(m)) handler(e, m);
    });
  }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function root() { return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/'; }
  function emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail })); }
  function drawerEls() { return { drawer: $('#cm-cart-drawer'), scrim: $('#cm-cart-drawer-scrim') }; }
  /* Shopper strings come from the drawer markup (locale keys); English is only the fallback. */
  function say(key, fallback) {
    var d = $('#cm-cart-drawer');
    return (d && d.getAttribute('data-i18n-' + key)) || fallback;
  }

  /* Shared a11y: focus trap for drawers and overlays (mobile nav, cart drawer, search panel).
     Focusables are read on every Tab, so content swapped in while the trap is active (the
     drawer refresh) is still trapped. Returns release(), which restores focus to `opener`. */
  window.CasifyA11y = window.CasifyA11y || {
    trapFocus: function (container, opener) {
      if (!container) return function () {};
      function list() { return $$(FOCUSABLE_SEL, container).filter(function (el) { return el.offsetParent !== null; }); }
      function onKeydown(e) {
        if (e.key !== 'Tab') return;
        /* A trap whose container left the page (editor reload) releases itself; a hidden
           container (menu past its breakpoint) leaves Tab alone instead of swallowing it. */
        if (!container.isConnected) { document.removeEventListener('keydown', onKeydown); return; }
        var f = list();
        if (!f.length) return;
        var inside = container.contains(document.activeElement);
        if (e.shiftKey && (!inside || document.activeElement === f[0])) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (!inside || document.activeElement === f[f.length - 1])) { e.preventDefault(); f[0].focus(); }
      }
      document.addEventListener('keydown', onKeydown);
      var start = list()[0];
      if (start) start.focus();
      return function release() {
        document.removeEventListener('keydown', onKeydown);
        if (opener && typeof opener.focus === 'function') opener.focus();
      };
    }
  };

  /* Quantity steppers. A page script that owns its own steppers cancels the click first. */
  function stepperInput(btn) {
    var group = btn.closest('.qty') || btn.closest('.cm-stepper') || btn.parentNode;
    return group ? group.querySelector('input') : null;
  }
  on(document, 'click', '[data-qty-decrease]', function (e, btn) {
    if (e.defaultPrevented) return;
    var input = stepperInput(btn);
    if (!input) return;
    input.value = Math.max(parseInt(input.min || '1', 10), (parseInt(input.value, 10) || 1) - 1);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  on(document, 'click', '[data-qty-increase]', function (e, btn) {
    if (e.defaultPrevented) return;
    var input = stepperInput(btn);
    if (!input) return;
    input.value = (parseInt(input.value, 10) || 1) + 1;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* Drawer. Closed it is inert and aria-hidden, so Tab never reaches its links and steppers. */
  var drawerRelease = null;
  function openDrawer(opener) {
    var d = drawerEls();
    if (!d.drawer || d.drawer.classList.contains('is-open')) return;
    var back = opener && opener.nodeType === 1 && document.contains(opener) ? opener : $('#bagBtn');
    d.drawer.removeAttribute('inert');
    d.drawer.setAttribute('aria-hidden', 'false');
    d.drawer.classList.add('is-open');
    if (d.scrim) d.scrim.classList.add('is-open');
    document.documentElement.classList.add('cm-scroll-lock');
    drawerRelease = window.CasifyA11y.trapFocus(d.drawer, back);
    emit('cart:drawer:open', { drawer: d.drawer, opener: back || null });
  }
  function closeDrawer() {
    var d = drawerEls();
    if (!d.drawer || !d.drawer.classList.contains('is-open')) return;
    d.drawer.classList.remove('is-open');
    if (d.scrim) d.scrim.classList.remove('is-open');
    document.documentElement.classList.remove('cm-scroll-lock');
    var release = drawerRelease;
    drawerRelease = null;
    if (release) release();
    d.drawer.setAttribute('aria-hidden', 'true');
    d.drawer.setAttribute('inert', '');
    emit('cart:drawer:close', { drawer: d.drawer });
  }
  on(document, 'click', '[data-cart-drawer-open]', function (e, btn) { e.preventDefault(); openDrawer(btn); });
  on(document, 'click', '[data-cart-drawer-close]', function (e) { e.preventDefault(); closeDrawer(); });
  document.addEventListener('keydown', function (e) {
    var d = drawerEls().drawer;
    if (e.key === 'Escape' && d && d.classList.contains('is-open')) closeDrawer();
  });

  /* The photo an add should fly: [data-cvm-fly-img] on the image itself, on a wrapper of it, or
     on an image near the control (closest ancestor that holds one). */
  function flyImg(from) {
    var el = null;
    var n = from && from.nodeType === 1 ? from : null;
    while (n && n !== document.documentElement && !el) {
      if (n.matches('[data-cvm-fly-img]')) el = n;
      else el = $('[data-cvm-fly-img]', n);
      n = n.parentElement;
    }
    if (el && el.tagName !== 'IMG') el = $('img', el) || el;
    if (!el) return '';
    return el.currentSrc || el.getAttribute('src') || el.getAttribute('data-src') || '';
  }

  /* AJAX add for card forms (single-variant products). The page stays where it is; the drawer
     opens only when the theme setting asks for it (cart:added listener below). */
  on(document, 'submit', 'form[data-cart-add-form]', function (e, form) {
    if (e.defaultPrevented || form.dataset.nativeSubmit === '1') return;
    e.preventDefault();
    var btn = e.submitter || form.querySelector('button[type=submit], [type=submit]');
    if (btn && btn.getAttribute('aria-busy') === 'true') return;
    var orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = say('adding', 'Adding…'); }
    var fd = new FormData(form);
    var qty = Math.max(1, parseInt(fd.get('quantity') || '1', 10) || 1);
    var img = flyImg(btn || form);
    fetch(root() + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: fd.get('id'), quantity: qty }] })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) { showToast(say('add-error', 'Could not add to bag'), (res.data && res.data.description) || '', 'danger'); return; }
        var item = res.data && res.data.items ? res.data.items[0] : res.data;
        showToast(say('added', 'Added to bag'), (item && (item.product_title || item.title)) || '', 'success');
        schedule(true);
        emit('cart:added', { source: 'card', from: btn || form, img: img, qty: qty });
      })
      .catch(function () { showToast(say('add-error', 'Could not add to bag'), '', 'danger'); })
      .then(function () { if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = orig; } });
  });

  /* Lines: quantity and remove */
  function ownedElsewhere(e, el) { return e.defaultPrevented || !!el.closest('[data-cart-self]'); }
  on(document, 'click', '[data-cart-remove]', function (e, btn) {
    if (ownedElsewhere(e, btn)) return;
    e.preventDefault();
    lineChange(btn.getAttribute('data-cart-remove'), 0, btn);
  });
  on(document, 'change', '[data-cart-line-qty]', function (e, input) {
    if (ownedElsewhere(e, input)) return;
    var qty = parseInt(input.value, 10);
    var line = input.closest('[data-qty]');
    if (isNaN(qty)) {
      input.value = line ? line.getAttribute('data-qty') : '1';
      return;
    }
    var key = input.getAttribute('data-cart-line-qty');
    if (lineChange(key, Math.max(0, qty), input) === false) {
      /* Ignored input: show what the line is really doing (going away, or its server quantity). */
      input.value = removing[key] ? '0' : (line ? line.getAttribute('data-qty') : input.value);
    }
  });

  /* Double tap guard. A second tap on Remove, or on '-' at 1, used to queue another remove, and
     once the first one landed the next line had moved up under the finger and went too. So a line
     whose removal is on its way ignores more input, and for LINE_LOCK_MS after lines leave or
     arrive in the open drawer no line control acts. */
  var LINE_LOCK_MS = 400;
  var removing = {};
  var lineLockUntil = 0;
  var lineTimers = {};
  var lineQueue = Promise.resolve();
  function lineChange(key, qty, el) {
    var drawer = $('#cm-cart-drawer');
    if (!key) return;
    if (removing[key]) return false;
    if (!drawer || !drawer.contains(el)) {
      /* An unowned line on another page (no script of its own): keep the old full reload. */
      if (qty === 0) removing[key] = true;
      postChange(key, qty, false).then(function () { window.location.reload(); }, function () { window.location.reload(); });
      return true;
    }
    if (Date.now() < lineLockUntil) return false;
    if (qty === 0) removing[key] = true;
    var line = el.closest('[data-key]');
    if (line) line.setAttribute('aria-busy', 'true');
    /* Rapid stepper taps on one line collapse into one request with the last value. */
    clearTimeout(lineTimers[key]);
    lineTimers[key] = setTimeout(function () {
      delete lineTimers[key];
      lineQueue = lineQueue.then(function () { return sendLine(key, qty); });
    }, qty === 0 ? 0 : 150);
    return true;
  }
  function postChange(key, qty, withSection) {
    var body = { id: key, quantity: qty };
    if (withSection) body.sections = SECTION;
    return fetch(root() + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (d) { if (!r.ok) throw d || {}; return d; });
    });
  }
  function sendLine(key, qty) {
    var seq = ++drawerSeq;
    return postChange(key, qty, true)
      .then(function (cart) {
        paintCount(cart, false);
        var html = cart && cart.sections && cart.sections[SECTION];
        if (html && seq === drawerSeq) return applyDrawer(html, cart);
        return refreshNow(false);
      })
      .catch(function (err) {
        showToast(say('change-error', 'Could not update your bag'), (err && err.description) || '', 'danger');
        return refreshNow(true);
      })
      /* Cleared only after the drawer repaint, which starts the line lock: no gap between the two.
         Never rejects, so one failure cannot stall lineQueue. */
      .then(function (r) { if (qty === 0) delete removing[key]; return r; },
        function () { if (qty === 0) delete removing[key]; return null; });
  }

  /* Bag count. The bag link's accessible name carries the count; the badge is only visual. */
  function labelBag(count) {
    var bag = $('#bagBtn');
    if (!bag || typeof count !== 'number') return;
    var text = count === 1 ? say('bag-one', 'Cart, 1 item') : say('bag-other', 'Cart, [count] items');
    bag.setAttribute('aria-label', text.replace('[count]', count));
  }
  function paintCount(cart, bump) {
    if (!cart || typeof cart.item_count !== 'number') return;
    labelBag(cart.item_count);
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
      if (bump && !reduced() && cart.item_count > 0) {
        el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
      }
    });
  }
  function getCart() {
    return fetch(root() + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('cart ' + r.status); return r.json(); });
  }
  function updateCartCount() {
    return getCart().then(function (cart) { paintCount(cart, true); return cart; }).catch(function () { return null; });
  }

  /* Drawer refresh through the Section Rendering API (sections/cv-cart-drawer.liquid). Only the
     aside's children are replaced; the aside keeps its open state, inert and data attributes. */
  function lineMap(scope) {
    var map = {};
    $$('[data-key]', scope).forEach(function (el, i) { map[el.getAttribute('data-key')] = { qty: el.getAttribute('data-qty'), index: i }; });
    return map;
  }
  function lineByKey(scope, key) {
    var lines = $$('[data-key]', scope);
    for (var i = 0; i < lines.length; i++) if (lines[i].getAttribute('data-key') === key) return lines[i];
    return null;
  }
  function focusMemo(drawer) {
    var a = document.activeElement;
    if (!a || a === drawer || !drawer.contains(a)) return null;
    var line = a.closest('[data-key]');
    var scope = line || drawer;
    return {
      key: line ? line.getAttribute('data-key') : null,
      lineIndex: line ? $$('[data-key]', drawer).indexOf(line) : -1,
      index: $$(FOCUSABLE_SEL, scope).indexOf(a)
    };
  }
  function restoreFocus(drawer, memo) {
    if (!memo || !drawer.classList.contains('is-open')) return;
    var target = null;
    if (memo.key) {
      var line = lineByKey(drawer, memo.key);
      if (!line) {
        /* The line is gone: the same control on the line that took its place, else the one above. */
        var lines = $$('[data-key]', drawer);
        line = lines[Math.min(memo.lineIndex, lines.length - 1)] || null;
      }
      if (line) target = $$(FOCUSABLE_SEL, line)[memo.index] || $(FOCUSABLE_SEL, line);
    } else {
      target = $$(FOCUSABLE_SEL, drawer)[memo.index];
    }
    if (!target) target = $('.cart-drawer__empty-link', drawer) || $('[data-cart-drawer-close]', drawer);
    if (target && document.activeElement !== target) target.focus();
  }
  function applyDrawer(html, cart) {
    var drawer = $('#cm-cart-drawer');
    if (!drawer || !html) return null;
    var fresh = new DOMParser().parseFromString(html, 'text/html').getElementById('cm-cart-drawer');
    if (!fresh) return null;
    var before = lineMap(drawer);
    var after = lineMap(fresh);
    var memo = focusMemo(drawer);
    /* Keep one Total node (aria-live) across refreshes, so screen readers hear the new total. */
    var oldTotal = $('[data-cart-total]', drawer);
    var newTotal = $('[data-cart-total]', fresh);
    if (oldTotal && newTotal) {
      oldTotal.textContent = newTotal.textContent;
      oldTotal.setAttribute('data-cents', newTotal.getAttribute('data-cents') || '');
      newTotal.parentNode.replaceChild(oldTotal, newTotal);
    }
    var frag = document.createDocumentFragment();
    while (fresh.firstChild) frag.appendChild(document.adoptNode(fresh.firstChild));
    while (drawer.firstChild) drawer.removeChild(drawer.firstChild);
    drawer.appendChild(frag);
    var detail = { added: [], removed: [], changed: [], cart: cart || null };
    Object.keys(after).forEach(function (k) {
      if (!(k in before)) detail.added.push(k);
      else if (before[k].qty !== after[k].qty) detail.changed.push(k);
    });
    Object.keys(before).forEach(function (k) { if (!(k in after)) detail.removed.push(k); });
    /* The list just shifted under the shopper's finger: let a stray second tap land on nothing. */
    if ((detail.added.length || detail.removed.length) && drawer.classList.contains('is-open')) {
      lineLockUntil = Date.now() + LINE_LOCK_MS;
    }
    restoreFocus(drawer, memo);
    emit('cart:drawer:refreshed', detail);
    return detail;
  }
  var drawerSeq = 0;
  function refreshNow(count) {
    var drawer = $('#cm-cart-drawer');
    var seq = ++drawerSeq;
    var cartP = getCart().catch(function () { return null; });
    var htmlP = !drawer ? Promise.resolve(null) : fetch(root() + '?sections=' + SECTION)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { return data && data[SECTION]; })
      .catch(function () { return null; });
    return Promise.all([cartP, htmlP]).then(function (res) {
      if (count) paintCount(res[0], true);
      else if (res[0]) labelBag(res[0].item_count);
      if (seq !== drawerSeq) return null; /* a newer refresh or line change owns the drawer */
      return applyDrawer(res[1], res[0]);
    });
  }
  /* cv-product.js and cv-pdp-story.js announce an add with both an event and
     CasifyCart.refresh(); every call in the same tick shares one refresh. */
  var pending = null;
  var wantCount = false;
  function schedule(count) {
    if (count) wantCount = true;
    if (pending) return pending;
    pending = new Promise(function (resolve) {
      setTimeout(function () {
        var c = wantCount;
        wantCount = false;
        pending = null;
        refreshNow(c).then(resolve, function () { resolve(null); });
      }, 0);
    });
    return pending;
  }
  function refreshCart() { return schedule(true); }
  document.addEventListener('cart:refresh', refreshCart);
  /* Legacy names for the same request (cv-home-conversion.js, build-box.js). */
  document.addEventListener('cart:updated', refreshCart);
  document.addEventListener('casify:cart:updated', refreshCart);
  /* The quick pick (cv-quick-pick.js) paints the badge itself; only the drawer and the bag label are stale. */
  document.addEventListener('cv:cart', function (e) {
    if (e.detail && e.detail.cart) labelBag(e.detail.cart.item_count);
    schedule(false);
  });
  /* Open after add only when the theme setting asks (owner decision: default off, the page stays). */
  document.addEventListener('cart:added', function (e) {
    var p = schedule(false);
    var d = drawerEls().drawer;
    if (!d || !d.hasAttribute('data-open-on-add')) return;
    var from = e.detail && e.detail.from;
    p.then(function () { openDrawer(from); });
  });

  function showToast(title, body, tone) {
    if (window.CASIFY_FNS && window.CASIFY_FNS.toastQuick) {
      window.CASIFY_FNS.toastQuick(title, body, tone);
    }
  }

  /* The count is already server rendered; boot only syncs it (no bump). */
  getCart().then(function (cart) { paintCount(cart, false); }, function () {});

  window.CasifyCart = window.CasifyCart || {};
  window.CasifyCart.refresh = refreshCart;
  window.CasifyCart.open = openDrawer;
  window.CasifyCart.close = closeDrawer;
  window.Casify = window.Casify || {};
  window.Casify.openDrawer = openDrawer;
  window.Casify.updateCartCount = updateCartCount;
  window.Casify.showToast = showToast;
})();
