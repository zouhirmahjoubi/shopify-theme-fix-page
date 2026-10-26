/* Casify: bag page lines and motion (sections/cv-cart.liquid).
 *
 * Commerce: the line list is marked [data-cart-self], so cart.js leaves it alone. Quantity and
 * remove post /cart/change.js (the same call cart.js makes) with this section bundled, swap the
 * lines and the summary in place and dispatch cart:refresh so the header badge and the drawer
 * catch up. A change made in the drawer while this page is open re-renders the page the same way.
 * The section is complete without this file: inputs post as updates[] and Remove is a link.
 * With this file the quantity inputs lose their name (at init and after every swap): updates[] is
 * matched to lines by position, and a removed line stays in the form while its change is in flight
 * and while it collapses, so a named list could post one line's quantity to another. Checkout then
 * posts only the note; a pending stepper change is sent first and the submit waits for the queue.
 *
 * Motion (only with GSAP and prefers-reduced-motion: no-preference): lines deal in and the summary
 * settles on load, a removed line collapses while the lines below slide up, a changed line flashes
 * ticket gold, new discount rows slide in, the checkout button squashes on press and its lock
 * shackle draws (never delays the submit), the empty bag swings once. The total roll and the pack
 * line stamp come from assets/cv-commerce-motion.js (data-cvm-price, data-cvm-stamp).
 * Motion never owns cart state. Re-initialises in the theme editor.
 */
(function () {
  'use strict';

  var SELECTOR = '[data-cv-cart-page]';
  var doc = document;
  function one(q, ctx) { return (ctx || doc).querySelector(q); }
  function all(q, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(q)); }
  function emit(name, detail) { doc.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); }
  function root() { return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/'; }

  function init(page) {
    if (!page) return;
    if (page._cvcpDestroy) page._cvcpDestroy();

    var gsap = window.gsap;
    var ac = new AbortController();
    var opt = { signal: ac.signal };
    var mm = gsap && gsap.matchMedia ? gsap.matchMedia() : null;
    var motion = false;
    var live = [];
    var timers = {};
    var removing = {};
    var pend = {};
    var busy = 0;
    var queue = Promise.resolve();
    var sectionId = page.getAttribute('data-section-id');

    function track(t) { if (t) live.push(t); return t; }
    function finish() { live.splice(0).forEach(function (t) { t.progress(1); }); }

    /* ---------------------------------------------------------------- motion pieces */
    function deal() {
      var lines = all('[data-cvcp-line]', page);
      var sum = one('[data-cvcp-sum]', page);
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (lines.length) tl.fromTo(lines, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.42, stagger: 0.05, clearProps: 'transform,opacity,visibility' }, 0);
      if (sum) tl.fromTo(sum, { x: 16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, clearProps: 'transform,opacity,visibility' }, 0.08);
      if (doc.visibilityState === 'hidden') tl.progress(1);
      return track(tl);
    }
    function swing() {
      var ico = one('[data-cvcp-swing]', page);
      if (!ico) return null;
      return track(gsap.timeline().set(ico, { transformOrigin: '50% 0%' })
        .to(ico, { keyframes: { rotation: [0, -14, 10, -6, 3, 0] }, duration: 0.9, ease: 'none', clearProps: 'transform' }));
    }
    function flash(line) {
      var end = getComputedStyle(line).backgroundColor;
      var gold = getComputedStyle(doc.documentElement).getPropertyValue('--gold-200').trim() || '#F0E2C2';
      track(gsap.fromTo(line, { backgroundColor: gold }, { backgroundColor: end, duration: 0.42, ease: 'power1.out', clearProps: 'backgroundColor' }));
    }
    function collapse(line, done) {
      if (!motion) { done(); return; }
      var gap = parseFloat(getComputedStyle(line.parentNode).rowGap) || 0;
      line.style.overflow = 'hidden';
      track(gsap.to(line, { height: 0, paddingTop: 0, paddingBottom: 0, borderTopWidth: 0, borderBottomWidth: 0, marginBottom: -gap, autoAlpha: 0, duration: 0.32, ease: 'power2.in', onComplete: done }));
    }
    function slideIn(row) {
      track(gsap.fromTo(row, { x: -14, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.42, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }));
    }
    function press(btn) {
      var tl = gsap.timeline();
      tl.set(btn, { transition: 'none' })
        .to(btn, { scaleX: 1.04, scaleY: 0.9, duration: 0.12, ease: 'power1.out', yoyo: true, repeat: 1 })
        .set(btn, { clearProps: 'transform,transition' });
      var paths = window.DrawSVGPlugin ? all('svg :is(path,polyline,line,rect,circle)', btn) : [];
      if (paths.length) tl.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.36, ease: 'power2.out', stagger: 0.04, clearProps: 'all' }, 0);
      track(tl);
    }

    /* ---------------------------------------------------------------- swap */
    function setPrice(oldNode, newNode) {
      if (!oldNode || !newNode) return;
      var cents = newNode.getAttribute('data-cents');
      if (oldNode.getAttribute('data-cents') === cents) return;
      /* Text first: the commerce motion module rolls a copy and keeps this final text. */
      oldNode.textContent = newNode.textContent;
      oldNode.setAttribute('data-cents', cents);
    }
    /* Positional updates[] must never reach checkout from a live page (see the header). */
    function unname() {
      all('input[data-cart-line-qty][name]', page).forEach(function (i) { i.removeAttribute('name'); });
    }
    /* Keyboard focus never falls to <body> when its line goes: the next line's matching control,
       else the previous line's, else the summary heading. */
    function survivor(line, keep) {
      var dirs = ['nextElementSibling', 'previousElementSibling'];
      for (var d = 0; d < dirs.length; d++) {
        for (var s = line[dirs[d]]; s; s = s[dirs[d]]) {
          if (s.hasAttribute('data-cvcp-line') && !s.hasAttribute('inert') && keep[s.getAttribute('data-key')]) return s;
        }
      }
      return null;
    }
    function focusTo(el) {
      if (!el) return;
      if (!el.matches('a[href],button,input')) el.setAttribute('tabindex', '-1');
      el.focus();
    }
    function apply(html, changedKey) {
      var next = new DOMParser().parseFromString(html, 'text/html');
      var fresh = one(SELECTOR, next);
      if (!fresh) return false;
      var oldLines = one('[data-cvcp-lines]', page);
      var newLines = one('[data-cvcp-lines]', fresh);

      if (!oldLines || !newLines) {
        /* The bag went empty (or came back from empty): take the whole section. */
        var hadFocus = page.contains(doc.activeElement);
        page.innerHTML = fresh.innerHTML;
        page.setAttribute('data-count', fresh.getAttribute('data-count') || '0');
        unname();
        if (hadFocus) focusTo(one('.cv-cart__hd h1', page) || one('[data-cvcp-empty] a', page) || one('[data-cvcp-lines] [data-cart-line-qty]', page));
        if (motion) swing();
        return true;
      }

      var byKey = {};
      var keep = {};
      var refocus = null;
      all('[data-cvcp-line]', newLines).forEach(function (n) { byKey[n.getAttribute('data-key')] = n; keep[n.getAttribute('data-key')] = 1; });
      all('[data-cvcp-line]', oldLines).forEach(function (line) {
        var key = line.getAttribute('data-key');
        var n = byKey[key];
        if (!n) {
          var a = doc.activeElement;
          if (a && line.contains(a)) {
            refocus = { line: survivor(line, keep), sel: focusKey(line) || '[data-cart-line-qty]' };
          }
          line.setAttribute('inert', '');
          line.setAttribute('aria-hidden', 'true');
          var gone = one('[data-cart-line-qty]', line);
          if (gone) { gone.removeAttribute('name'); gone.disabled = true; }
          collapse(line, function () { line.remove(); });
          return;
        }
        delete byKey[key];
        var qtyChanged = line.getAttribute('data-qty') !== n.getAttribute('data-qty');
        var focusedSel = focusKey(line);
        line.innerHTML = n.innerHTML;
        line.setAttribute('data-qty', n.getAttribute('data-qty'));
        line.removeAttribute('aria-busy');
        restoreFocus(line, focusedSel);
        if (motion && (qtyChanged || key === changedKey)) flash(line);
      });
      /* Lines that arrived from elsewhere (the drawer, another tab): append them in server order. */
      Object.keys(byKey).forEach(function (key) {
        var n = byKey[key].cloneNode(true);
        var ns = one('noscript', oldLines);
        oldLines.insertBefore(n, ns);
        if (motion) slideIn(n);
      });

      var oldRows = one('[data-cvcp-rows]', page);
      var newRows = one('[data-cvcp-rows]', fresh);
      if (oldRows && newRows) {
        var had = {};
        all('[data-cvcp-discount]', oldRows).forEach(function (r) { had[r.getAttribute('data-cvcp-discount')] = 1; });
        oldRows.innerHTML = newRows.innerHTML;
        if (motion) all('[data-cvcp-discount]', oldRows).forEach(function (r) { if (!had[r.getAttribute('data-cvcp-discount')]) slideIn(r); });
      }
      ['[data-cvcp-ship]', '[data-cvcp-tax]'].forEach(function (q) {
        var a = one(q, page), b = one(q, fresh);
        if (a && b) a.innerHTML = b.innerHTML;
      });
      setPrice(one('[data-cvcp-total]', page), one('[data-cvcp-total]', fresh));
      setPrice(one('[data-cvcp-cta-total]', page), one('[data-cvcp-cta-total]', fresh));
      page.setAttribute('data-count', fresh.getAttribute('data-count') || '0');
      unname();
      /* After every line is swapped, so the target is not replaced under the focus. */
      if (refocus) focusTo((refocus.line && one(refocus.sel, refocus.line)) || one('[data-cvcp-sum] h2', page));
      return true;
    }
    function focusKey(line) {
      var a = doc.activeElement;
      if (!a || !line.contains(a)) return null;
      if (a.hasAttribute('data-qty-decrease')) return '[data-qty-decrease]';
      if (a.hasAttribute('data-qty-increase')) return '[data-qty-increase]';
      if (a.hasAttribute('data-cart-line-qty')) return '[data-cart-line-qty]';
      if (a.hasAttribute('data-cart-remove')) return '[data-cart-remove]';
      return null;
    }
    function restoreFocus(line, sel) {
      var n = sel && one(sel, line);
      if (n) n.focus({ preventScroll: true });
    }

    /* ---------------------------------------------------------------- commerce */
    function fail(key) {
      delete removing[key];
      var line = one('[data-cvcp-line][data-key="' + cssEsc(key) + '"]', page);
      if (line) {
        line.removeAttribute('aria-busy');
        var input = one('[data-cart-line-qty]', line);
        if (input) input.value = line.getAttribute('data-qty');
      }
      var msg = page.getAttribute('data-i18n-change-error') || 'Could not update your bag';
      if (window.Casify && window.Casify.showToast) window.Casify.showToast(msg, '', 'danger');
    }
    function cssEsc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); }
    function send(key, qty) {
      return fetch(root() + 'cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: qty, sections: sectionId })
      }).then(function (r) {
        return r.json().then(function (d) { if (!r.ok) throw d || {}; return d; });
      }).then(function (d) {
        var html = d && d.sections && d.sections[sectionId];
        if (html) return html;
        return fetch(root() + 'cart?section_id=' + encodeURIComponent(sectionId)).then(function (r) {
          if (!r.ok) throw new Error('section');
          return r.text();
        });
      }).then(function (html) {
        delete removing[key];
        if (!apply(html, key)) throw new Error('swap');
        emit('cart:refresh');
      }).catch(function () { fail(key); });
    }
    function change(key, qty) {
      if (!key || removing[key]) return;
      var line = one('[data-cvcp-line][data-key="' + cssEsc(key) + '"]', page);
      if (qty === 0) removing[key] = true;
      if (line) line.setAttribute('aria-busy', 'true');
      /* Rapid stepper taps on one line collapse into one request with the last value. */
      clearTimeout(timers[key]);
      pend[key] = qty;
      timers[key] = setTimeout(function () { run(key); }, qty === 0 ? 0 : 150);
    }
    function run(key) {
      clearTimeout(timers[key]);
      delete timers[key];
      var qty = pend[key];
      delete pend[key];
      busy++;
      /* send() catches its own failures, so the queue always moves on. */
      queue = queue.then(function () { return send(key, qty); }).then(function () { busy--; });
    }

    function inLines(el) { return el && el.closest('[data-cvcp-lines]') && page.contains(el); }
    page.addEventListener('click', function (e) {
      var t = e.target;
      var step = t.closest && t.closest('[data-qty-decrease],[data-qty-increase]');
      var rm = !step && t.closest && t.closest('[data-cart-remove]');
      var btn = !step && !rm && t.closest && t.closest('[data-cvcp-checkout]');
      if (btn) { if (motion) press(btn); return; }
      if (!inLines(step || rm)) return;
      e.preventDefault();
      if (rm) { change(rm.getAttribute('data-cart-remove'), 0); return; }
      var input = one('[data-cart-line-qty]', step.closest('.qty') || step.parentNode);
      if (!input) return;
      var key = input.getAttribute('data-cart-line-qty');
      if (removing[key]) return;
      var v = parseInt(input.value, 10) || 0;
      v = step.hasAttribute('data-qty-decrease') ? Math.max(0, v - 1) : v + 1;
      input.value = v;
      change(key, v);
    }, { capture: true, signal: ac.signal });
    page.addEventListener('change', function (e) {
      var input = e.target;
      if (!input.hasAttribute || !input.hasAttribute('data-cart-line-qty') || !inLines(input)) return;
      var line = input.closest('[data-cvcp-line]');
      var qty = parseInt(input.value, 10);
      if (isNaN(qty) || qty < 0) { input.value = line ? line.getAttribute('data-qty') : '1'; return; }
      if (line && String(qty) === line.getAttribute('data-qty')) return;
      change(input.getAttribute('data-cart-line-qty'), qty);
    }, opt);
    /* Checkout while a change is pending or in flight: send it now, submit once the queue drains,
       so the bag the shopper sees is the bag checkout gets. */
    page.addEventListener('submit', function (e) {
      var keys = Object.keys(timers);
      if (!keys.length && !busy) return;
      e.preventDefault();
      keys.forEach(run);
      queue.then(function () {
        var btn = one('[data-cvcp-checkout]', page);
        if (!btn || !btn.form) return;
        if (btn.form.requestSubmit) btn.form.requestSubmit(btn); else btn.click();
      });
    }, opt);
    /* Enter in a quantity field must not submit the form (its first submit button is checkout). */
    page.addEventListener('keydown', function (e) {
      var input = e.target;
      if (e.key !== 'Enter' || !input.hasAttribute || !input.hasAttribute('data-cart-line-qty')) return;
      e.preventDefault();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, opt);

    /* A change made in the drawer on this page: re-render when the bag no longer matches. */
    doc.addEventListener('cart:drawer:refreshed', function (e) {
      var c = e.detail && e.detail.cart;
      var total = one('[data-cvcp-total]', page);
      if (!c || c.item_count == null) return;
      var sameCount = String(c.item_count) === page.getAttribute('data-count');
      var sameTotal = !total || String(c.total_price) === total.getAttribute('data-cents');
      if (sameCount && sameTotal) return;
      queue = queue.then(function () {
        return fetch(root() + 'cart?section_id=' + encodeURIComponent(sectionId))
          .then(function (r) { if (!r.ok) throw new Error('section'); return r.text(); })
          .then(function (html) { apply(html, null); })
          .catch(function () {});
      });
    }, opt);

    unname();
    if (mm) {
      mm.add('(prefers-reduced-motion: no-preference)', function () {
        motion = true;
        page.classList.add('is-motion');
        if (one('[data-cvcp-lines]', page)) deal(); else swing();
        return function () { finish(); motion = false; page.classList.remove('is-motion'); };
      });
    }

    page._cvcpFinish = finish;
    page._cvcpDestroy = function () {
      ac.abort();
      Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
      timers = {};
      pend = {};
      finish();
      if (mm) mm.revert();
      delete page._cvcpDestroy;
      delete page._cvcpFinish;
    };
  }

  function rootIn(node) {
    if (!node || node.nodeType !== 1) return null;
    return node.matches(SELECTOR) ? node : one(SELECTOR, node);
  }
  function boot(scope) {
    var r = rootIn(scope);
    if (r) init(r);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { boot(doc.body); }, { once: true });
  else boot(doc.body);

  doc.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  doc.addEventListener('shopify:section:unload', function (e) {
    var r = rootIn(e.target);
    if (r && r._cvcpDestroy) r._cvcpDestroy();
  });
  doc.addEventListener('shopify:section:select', function (e) {
    var r = rootIn(e.target);
    if (r && r._cvcpFinish) r._cvcpFinish();
  });
  doc.addEventListener('shopify:block:select', function (e) {
    var r = e.target.closest && e.target.closest(SELECTOR);
    if (r && r._cvcpFinish) r._cvcpFinish();
  });
})();
