/* Casify — cart.js: AJAX cart + drawer + qty steppers + toasts */
(function () {
  'use strict';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function on(el, evt, sel, handler) {
    el.addEventListener(evt, function (e) {
      var m = e.target.closest(sel);
      if (m && el.contains(m)) handler(e, m);
    });
  }

  /* Shared a11y: focus-trap for drawers/overlays (mobile nav, cart drawer,
     search panel). Traps Tab within `container`, focuses its first
     focusable element, and returns a release() that restores focus to
     `opener` and removes the trap listener. */
  var FOCUSABLE_SEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  window.CasifyA11y = window.CasifyA11y || {
    trapFocus: function (container, opener) {
      if (!container) return function () {};
      var focusables = $$(FOCUSABLE_SEL, container).filter(function (el) { return el.offsetParent !== null; });
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      function onKeydown(e) {
        if (e.key !== 'Tab' || !focusables.length) return;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      container.addEventListener('keydown', onKeydown);
      if (first) first.focus();
      return function release() {
        container.removeEventListener('keydown', onKeydown);
        if (opener && typeof opener.focus === 'function') opener.focus();
      };
    }
  };

  /* Qty steppers */
  /* `closest` returns null when the button is not inside a stepper wrapper,
     so resolve the group defensively before touching it. */
  function stepperInput(btn) {
    var group = btn.closest('.qty') || btn.closest('.cm-stepper') || btn.parentNode;
    return group ? group.querySelector('input') : null;
  }
  on(document, 'click', '[data-qty-decrease]', function (e, btn) {
    var input = stepperInput(btn);
    if (!input) return;
    input.value = Math.max(parseInt(input.min || '1', 10), (parseInt(input.value, 10) || 1) - 1);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  on(document, 'click', '[data-qty-increase]', function (e, btn) {
    var input = stepperInput(btn);
    if (!input) return;
    input.value = (parseInt(input.value, 10) || 1) + 1;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* Drawer */
  function drawerEls() { return { drawer: $('#cm-cart-drawer'), scrim: $('#cm-cart-drawer-scrim') }; }
  var drawerRelease = null;
  function openDrawer(opener) {
    var d = drawerEls();
    if (!d.drawer || d.drawer.classList.contains('is-open')) return;
    d.drawer.classList.add('is-open');
    d.drawer.setAttribute('aria-hidden', 'false');
    if (d.scrim) d.scrim.classList.add('is-open');
    document.documentElement.classList.add('cm-scroll-lock');
    drawerRelease = window.CasifyA11y.trapFocus(d.drawer, opener);
  }
  function closeDrawer() {
    var d = drawerEls();
    if (!d.drawer || !d.drawer.classList.contains('is-open')) return;
    d.drawer.classList.remove('is-open');
    d.drawer.setAttribute('aria-hidden', 'true');
    if (d.scrim) d.scrim.classList.remove('is-open');
    document.documentElement.classList.remove('cm-scroll-lock');
    if (drawerRelease) { drawerRelease(); drawerRelease = null; }
  }
  on(document, 'click', '[data-cart-drawer-open]', function (e, btn) { e.preventDefault(); openDrawer(btn); });
  on(document, 'click', '[data-cart-drawer-close]', function (e) { e.preventDefault(); closeDrawer(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawerEls().drawer && drawerEls().drawer.classList.contains('is-open')) closeDrawer();
  });

  /* AJAX add-to-cart */
  on(document, 'submit', 'form[data-cart-add-form]', function (e, form) {
    if (form.dataset.nativeSubmit === '1') return;
    e.preventDefault();
    var btn = form.querySelector('button[type=submit]');
    var orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Wrapping\u2026'; }
    var fd = new FormData(form);
    var payload = { items: [{ id: fd.get('id'), quantity: parseInt(fd.get('quantity') || '1', 10) }] };
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) { showToast('Could not add to bag', res.data && res.data.description || '', 'danger'); return; }
        showToast('Added to bag', (res.data && res.data.title) || '', 'success');
        updateCartCount();
        refreshDrawer().then(function () { openDrawer(btn); });
      })
      .catch(function () { showToast('Could not add to bag', '', 'danger'); })
      .finally(function () { if (btn) { btn.disabled = false; btn.innerHTML = orig; } });
  });

  on(document, 'click', '[data-cart-remove]', function (e, btn) {
    e.preventDefault();
    changeLine(btn.getAttribute('data-cart-remove'), 0);
  });
  on(document, 'change', '[data-cart-line-qty]', function (e, input) {
    changeLine(input.getAttribute('data-cart-line-qty'), parseInt(input.value, 10) || 0);
  });
  function changeLine(key, qty) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    }).then(function () { window.location.reload(); });
  }

  function updateCartCount() {
    fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
      $$('[data-cart-count]').forEach(function (el) {
        el.textContent = cart.item_count;
        if (cart.item_count === 0) { el.hidden = true; } else { el.hidden = false; }
        if (!REDUCED && cart.item_count > 0) {
          el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
        }
      });
    });
  }
  updateCartCount();

  /* The drawer is rendered with the page (snippets/cart-drawer.liquid). Adds made
     without a page load re-render it through the Section Rendering API
     (sections/cv-cart-drawer.liquid) so the bag matches the real cart. */
  function refreshDrawer() {
    var drawer = $('#cm-cart-drawer');
    if (!drawer) return Promise.resolve();
    var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    return fetch(root + '?sections=cv-cart-drawer')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var html = data && data['cv-cart-drawer'];
        var fresh = html && new DOMParser().parseFromString(html, 'text/html').getElementById('cm-cart-drawer');
        if (fresh) drawer.innerHTML = fresh.innerHTML;
      })
      .catch(function () {});
  }
  /* cv-product.js and cv-pdp-story.js announce an add with both the event and
     CasifyCart.refresh(); the timer runs one refresh for the pair. */
  var refreshTimer = null;
  function refreshCart() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { updateCartCount(); refreshDrawer(); }, 0);
  }
  document.addEventListener('cart:refresh', refreshCart);
  /* The quick pick (cv-quick-pick.js) updates the badge itself; only the drawer is stale. */
  document.addEventListener('cv:cart', function () { refreshDrawer(); });
  window.CasifyCart = window.CasifyCart || {};
  window.CasifyCart.refresh = refreshCart;

  function showToast(title, body, tone) {
    if (window.CASIFY_FNS && window.CASIFY_FNS.toastQuick) {
      window.CASIFY_FNS.toastQuick(title, body);
    }
  }

  window.Casify = window.Casify || {};
  window.Casify.openDrawer = openDrawer;
  window.Casify.updateCartCount = updateCartCount;
  window.Casify.showToast = showToast;
})();
