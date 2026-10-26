/* Casify: shop pages (collection, every collection, contact, pages and policies).
 *
 * Modules, each a no-op without its markup:
 *   signs      aisle signs drop in on their chains and swing to rest, and lean
 *              a little with scroll speed
 *   packMeter  the three candy boxes fill with the real photos of the cases in
 *              the bag; the line says what the store's pack discounts take off
 *   aisle      storefront filters, sort and pages update in place through the
 *              Section Rendering API (links and a submit button without script)
 *   (quick pick moved to assets/cv-quick-pick.js, loaded by the layout on
 *   any page whose cards use it)
 *   ruleBook   "On this page" from the page's own headings, a rail that fills
 *              as you read, the current heading marked
 *   contact    the letter flies into the letterbox on send; the bell rings
 *              once the message has been sent
 *
 * GSAP 3.15 (snippets/gsap.liquid). Under reduced motion nothing moves; every
 * state is still reached.
 */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

  var gsap = window.gsap;
  /* Live: gsap.matchMedia flips it when the visitor changes the reduced motion setting. */
  var motion = false;
  if (gsap && gsap.matchMedia) {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
      motion = true;
      return function () { motion = false; };
    });
  }
  var base = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';

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


  /* Collection modules (signs, packMeter, aisle) start per root and stop on
     shopify:section:unload, so the theme editor can re-render the section without a reload.
     Each init returns its own stop function; listeners on document and window go through
     listen() so they are removed again. */
  var running = [];
  function listen(target, type, fn, opts, offs) {
    target.addEventListener(type, fn, opts);
    offs.push(function () { target.removeEventListener(type, fn, opts); });
  }
  function stopAll(offs) { while (offs.length) { try { offs.pop()(); } catch (e) {} } }
  function boot(scope) {
    [['[data-cv-sign]', initSign], ['[data-cv-pack-meter]', initPackMeter], ['[data-cvl]', initAisle]].forEach(function (m) {
      var els = $$(m[0], scope);
      if (scope.nodeType === 1 && scope.matches(m[0])) els.unshift(scope);
      els.forEach(function (el) {
        if (el._cvpOn) return;
        el._cvpOn = true;
        running.push({ el: el, off: m[1](el) || function () {} });
      });
    });
  }
  function teardown(scope) {
    running = running.filter(function (r) {
      if (scope !== document && !scope.contains(r.el)) return true;
      try { r.off(); } catch (e) {}
      r.el._cvpOn = false;
      return false;
    });
  }

  /* ------------------------------------------------------------------ signs */
  function initSign(sign) {
    if (!gsap || !gsap.matchMedia) return null;
    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var drop = function () {
        gsap.fromTo(sign, { y: -80, rotation: -13, autoAlpha: 0 },
          { y: 0, rotation: 0, autoAlpha: 1, duration: 1.9, ease: 'elastic.out(1, 0.32)', clearProps: 'transform' });
      };
      if (sign.getBoundingClientRect().top < window.innerHeight) {
        drop();
      } else if (window.ScrollTrigger) {
        gsap.set(sign, { autoAlpha: 0 });
        window.ScrollTrigger.create({ trigger: sign, start: 'top 92%', once: true, onEnter: drop });
      }
      /* Lean with the scroll: a quick scroll swings the sign, then it settles. */
      if (!window.ScrollTrigger) return;
      var lean = gsap.quickTo(sign, '--lean', { duration: 0.9, ease: 'elastic.out(1, 0.4)' });
      var rest = gsap.delayedCall(0.14, function () { lean(0); }).pause();
      window.ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: function (self) {
          lean(clamp(self.getVelocity() / -260, -5, 5));
          rest.restart(true);
        }
      });
      return function () { rest.kill(); };
    });
    return function () { mm.revert(); };
  }

  /* ------------------------------------------------------------- pack meter */
  function initPackMeter(meter) {
    var offs = [];
    var boxes = $$('[data-cvpm-box]', meter);
    var row = $('.cvpm__boxes', meter);
    var text = $('[data-cvpm-text]', meter);
    var p2 = meter.getAttribute('data-p2');
    var p3 = meter.getAttribute('data-p3');
    var count = parseInt(meter.getAttribute('data-count'), 10) || 0;
    var tweens = [];

    function openBox(box, i) {
      var lid = $('[data-cvpm-lid]', box);
      var photo = $('.cvpm__photo', box);
      box.classList.add('is-filled');
      if (!motion) return;
      var dir = i % 2 ? -1 : 1;
      tweens.push(gsap.timeline()
        .fromTo(lid, { autoAlpha: 1, x: 0, y: 0, rotation: 0 }, {
          keyframes: [
            { y: -24, rotation: -6 * dir, duration: 0.2, ease: 'power2.out' },
            { x: 64 * dir, y: -60, rotation: 26 * dir, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }
          ],
          clearProps: 'transform,opacity,visibility'
        })
        .fromTo(photo, { y: -110, rotation: 10 * dir, autoAlpha: 0 },
          { y: 0, rotation: 0, autoAlpha: 1, duration: 0.85, ease: 'bounce.out', clearProps: 'transform,opacity,visibility' }, 0.24));
    }
    function closeBox(box) {
      box.classList.remove('is-filled');
      if (motion) tweens.push(gsap.fromTo($('[data-cvpm-lid]', box), { y: -40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'bounce.out', clearProps: 'all' }));
    }
    /* The commerce fly (cv-commerce-motion.js) aims at [data-cvm-bag]: the next empty box,
       or the row of boxes once all three are full. */
    function aim() {
      var next = boxes.filter(function (b) { return !b.classList.contains('is-filled'); })[0] || row;
      boxes.concat(row ? [row] : []).forEach(function (b) { if (b !== next) b.removeAttribute('data-cvm-bag'); });
      if (next) next.setAttribute('data-cvm-bag', '');
    }

    /* Pack discounts apply to phone cases only: the shared test lives in cart.js (loaded on every
       page, after this file, so it is read at call time). cart.item_count only if it is missing. */
    function caseCount(cart) {
      var cc = window.CasifyCart && window.CasifyCart.caseCount;
      return typeof cc === 'function' ? cc(cart) : (cart.item_count || 0);
    }

    function update(cart) {
      var imgs = [];
      (cart.items || []).forEach(function (item) {
        for (var q = 0; q < item.quantity && imgs.length < 3; q++) imgs.push(item.image || (item.featured_image && item.featured_image.url) || '');
      });
      var n = caseCount(cart);
      boxes.forEach(function (box, i) {
        var img = $('[data-cvpm-img]', box);
        var want = imgs[i];
        var was = box.classList.contains('is-filled');
        if (want !== undefined) {
          var src = sized(want, 200);
          if (img && src && img.getAttribute('src') !== src) img.src = src;
          if (!was) openBox(box, i);
        } else if (was) {
          closeBox(box);
        }
      });
      aim();
      if (text) {
        var t = meter.getAttribute('data-t' + Math.min(n, 3));
        var line = fill(t, { p2: p2, p3: p3, n: n });
        if (text.textContent !== line) text.textContent = line;
      }
      /* Crossing 2 or 3 cases earns a pack price: the line is stamped on. Other rises just nudge it. */
      if (motion && n > count && text) {
        var earned = [2, 3].some(function (k) { return count < k && n >= k; });
        tweens.push(earned
          ? gsap.fromTo(text, { scale: 1.18, rotation: -6, autoAlpha: 0.4, transformOrigin: '0% 60%' }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(2)', clearProps: 'all' })
          : gsap.fromTo(text, { y: 8, autoAlpha: 0.2 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', clearProps: 'all' }));
      }
      count = n;
    }

    /* Events carry the cart when they can (quick pick cv:cart, cart.js drawer refresh); the others
       (cart:refresh from product pages, cart:added from card forms) fetch it once. No polling.
       While an added case flies into the meter (cart:added, meter in view), the box waits for it
       (hold) and opens as the case lands. */
    var hold = 0, queued = null, flushT = 0, pending = false;
    function flush() {
      var wait = hold - Date.now();
      if (wait > 0) { flushT = window.setTimeout(flush, wait); return; }
      flushT = 0;
      var c = queued;
      queued = null;
      if (c) update(c);
    }
    function later(cart) {
      queued = cart;
      window.clearTimeout(flushT);
      flushT = window.setTimeout(flush, 0);
    }
    function refetch() {
      if (pending) return;
      pending = true;
      getCart().then(function (c) { pending = false; later(c); }).catch(function () { pending = false; });
    }
    function inView() {
      var r = meter.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
    }
    function withCart(e) {
      if (e.detail && e.detail.cart) later(e.detail.cart); else refetch();
    }
    function added(e) {
      var d = e.detail || {};
      if (motion && (d.source === 'quick-pick' || d.source === 'card') && inView()) hold = Date.now() + 1000;
      if (d.source !== 'quick-pick') refetch(); // the quick pick already sent cv:cart with the cart
    }
    listen(document, 'cv:cart', withCart, false, offs);
    listen(document, 'cart:drawer:refreshed', withCart, false, offs);
    listen(document, 'cart:refresh', refetch, false, offs);
    listen(document, 'cart:added', added, false, offs);
    listen(window, 'pageshow', function (e) { if (e.persisted) refetch(); }, false, offs);
    aim();
    return function () {
      stopAll(offs);
      window.clearTimeout(flushT);
      tweens.forEach(function (t) { t.progress(1).kill(); });
      tweens = [];
    };
  }

  /* ------------------------------------------------------------------ aisle */
  function initAisle(root) {
    var offs = [];
    var sectionId = root.getAttribute('data-section-id');
    var form = $('[data-cvl-form]', root);
    var drawer = $('[data-cvl-drawer]', root);
    var opener = $('[data-cvl-open]', root);
    var fx = []; // swap tweens, finished on teardown
    var controller = null;
    var timer = null;
    var alive = true;

    function openDrawer() {
      if (!drawer || drawer.open) return;
      drawer.showModal();
      if (opener) opener.setAttribute('aria-expanded', 'true');
      if (motion) gsap.fromTo(drawer, { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform' });
    }
    function closeDrawer() {
      if (!drawer || !drawer.open) return;
      var done = function () { drawer.close(); if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); } };
      if (motion) gsap.to(drawer, { xPercent: 100, duration: 0.3, ease: 'power2.in', onComplete: function () { gsap.set(drawer, { clearProps: 'transform' }); done(); } });
      else done();
    }
    if (opener) opener.addEventListener('click', openDrawer);
    if (drawer) {
      drawer.addEventListener('cancel', function (e) { e.preventDefault(); closeDrawer(); });
      drawer.addEventListener('click', function (e) {
        if (e.target.closest('[data-cvl-close]')) { closeDrawer(); return; }
        if (e.target !== drawer) return;
        var r = drawer.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDrawer();
      });
    }

    function urlFromForm() {
      var params = new URLSearchParams();
      new FormData(form).forEach(function (value, key) { if (String(value).trim() !== '') params.append(key, value); });
      var qs = params.toString();
      return root.getAttribute('data-url') + (qs ? '?' + qs : '');
    }

    /* The layout loads Flip on shop pages; check it at use so a missing plugin only skips that motion. */
    function flipApi() {
      var F = window.Flip;
      return motion && F && typeof F.getState === 'function' && typeof F.from === 'function' ? F : null;
    }
    function track(t) { if (t) fx.push(t); return t; }
    function finish() { fx.forEach(function (t) { t.progress(1).kill(); }); fx = []; }
    function badgeText() {
      var b = $('[data-cvl-swap="badge"]', root);
      return b && !b.hidden ? b.textContent.trim() : '';
    }
    function countOf(b) {
      var n = b ? parseInt(b.textContent.replace(/[^\d]/g, ''), 10) : NaN;
      return isNaN(n) ? null : n;
    }
    function chipKeys(scope) {
      return $$('.cvl__chip', scope).map(function (c) {
        if (!c.hasAttribute('data-flip-id')) c.setAttribute('data-flip-id', 'chip:' + c.textContent.replace(/\s+/g, ' ').trim());
        return c.getAttribute('data-flip-id');
      });
    }

    /* Filter feedback once the swap lands: the badge pops, the result count rolls from the old
       number (aria-busy holds the live region so it announces the final count only), chips that
       stay slide to their new places and new chips pop in. */
    function feedback(before) {
      if (!motion) return;
      var badge = $('[data-cvl-swap="badge"]', root);
      var nowBadge = badgeText();
      if (badge && nowBadge && nowBadge !== before.badge) {
        track(gsap.fromTo(badge, { scale: 0.3 }, { scale: 1, duration: 0.28, ease: 'back.out(2)', clearProps: 'transform' }));
      }

      var line = $('[data-cvl-swap="count"]', root);
      var num = line && $('b', line);
      var to = countOf(num);
      if (num && to !== null && before.count !== null && to !== before.count) {
        var from = before.count;
        var o = { v: from };
        var settle = function () { num.textContent = String(to); line.removeAttribute('aria-busy'); };
        line.setAttribute('aria-busy', 'true');
        num.textContent = String(from);
        track(gsap.to(o, {
          v: to, duration: Math.min(0.9, 0.4 + Math.abs(to - from) * 0.015), ease: 'power2.out',
          onUpdate: function () { num.textContent = String(Math.round(o.v)); },
          onComplete: settle, onInterrupt: settle
        }));
        track(gsap.fromTo(num, { yPercent: to > from ? 35 : -35 }, { yPercent: 0, duration: 0.45, ease: 'back.out(2)', clearProps: 'transform' }));
      }

      var chips = $$('.cvl__chip', $('[data-cvl-swap="chips"]', root));
      if (!chips.length) return;
      chipKeys($('[data-cvl-swap="chips"]', root));
      var pop = function (els) {
        return els.length ? gsap.fromTo(els, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.04, clearProps: 'transform,opacity,visibility' }) : null;
      };
      var F = flipApi();
      if (before.chips && F) {
        track(F.from(before.chips, { targets: chips, duration: 0.4, ease: 'power3.inOut', scale: true, onEnter: pop }));
      } else {
        track(pop(chips.filter(function (c) { return before.keys.indexOf(c.getAttribute('data-flip-id')) === -1; })));
      }
    }

    function swap(doc) {
      var focused = document.activeElement;
      var focusKey = focused && focused.name ? focused.name + '=' + focused.value : null;
      finish(); // a swap still moving ends first, so the numbers and places read below are final
      var F = flipApi();
      var oldChips = $('[data-cvl-swap="chips"]', root);
      var before = {
        badge: badgeText(),
        count: countOf($('[data-cvl-swap="count"] b', root)),
        keys: oldChips ? chipKeys(oldChips) : [],
        chips: F && oldChips && $('.cvl__chip', oldChips) ? F.getState($$('.cvl__chip', oldChips)) : null
      };

      $$('[data-cvl-swap]', root).forEach(function (el) {
        var name = el.getAttribute('data-cvl-swap');
        var next = doc.querySelector('[data-cvl-swap="' + name + '"]');
        if (!next) return;
        if (name === 'groups') {
          var open = $$('details[data-cvl-group]', el).reduce(function (m, d) { m[d.getAttribute('data-cvl-group')] = d.open; return m; }, {});
          el.innerHTML = next.innerHTML;
          $$('details[data-cvl-group]', el).forEach(function (d) {
            var key = d.getAttribute('data-cvl-group');
            if (key in open) d.open = open[key];
          });
          return;
        }
        if (name === 'results') {
          /* server-rendered cells carry no flip id yet: give them the product id so kept cards move */
          $$('.cvl__cell', el).forEach(function (c) { c.setAttribute('data-flip-id', c.getAttribute('data-cvl-cell')); });
          var state = F ? F.getState($$('.cvl__cell', el)) : null;
          el.innerHTML = next.innerHTML;
          var cells = $$('.cvl__cell', el);
          cells.forEach(function (c) {
            c.setAttribute('data-flip-id', c.getAttribute('data-cvl-cell'));
            $$('[data-cv-reveal]', c).forEach(function (r) { r.classList.add('is-revealed'); });
          });
          if (state) {
            track(F.from(state, {
              targets: cells, duration: 0.5, ease: 'power3.inOut', absolute: true, scale: false,
              onEnter: function (els) { return gsap.fromTo(els, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out', stagger: 0.04, clearProps: 'transform,opacity,visibility' }); }
            }));
          }
          return;
        }
        el.replaceWith(next);
      });
      feedback(before);

      if (focusKey) {
        var again = $$('input, select', root).filter(function (i) { return i.name + '=' + i.value === focusKey; })[0];
        if (again && document.activeElement !== again) again.focus({ preventScroll: true });
      }
    }

    function render(url, push) {
      if (controller) controller.abort();
      controller = 'AbortController' in window ? new AbortController() : null;
      var results = $('[data-cvl-swap="results"]', root);
      if (results) results.classList.add('is-loading');
      var fetchUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + 'section_id=' + encodeURIComponent(sectionId);
      return fetch(fetchUrl, { signal: controller ? controller.signal : undefined, headers: { Accept: 'text/html' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (html) {
          if (!alive) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          swap(doc);
          if (push) history.pushState({ cvl: true }, '', url);
        })
        .catch(function (err) {
          if (!alive || (err && err.name === 'AbortError')) return;
          window.location.href = url; // fall back to a normal page load
        })
        .finally(function () {
          var r = $('[data-cvl-swap="results"]', root);
          if (r) r.classList.remove('is-loading');
        });
    }

    if (form) {
      form.addEventListener('change', function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { render(urlFromForm(), true); }, 320);
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        window.clearTimeout(timer);
        render(urlFromForm(), true).then(closeDrawer);
      });
    }

    root.addEventListener('click', function (e) {
      var link = e.target.closest('a[data-cvl-link]');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      var toTop = !!link.closest('.cv-pager');
      render(link.href, true).then(function () {
        closeDrawer();
        if (toTop) {
          var bar = $('.cvl__bar', root);
          if (bar) bar.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
        }
      });
    });

    listen(window, 'popstate', function () { render(window.location.href, false); }, false, offs);
    return function () {
      alive = false;
      stopAll(offs);
      finish();
      window.clearTimeout(timer);
      if (controller) controller.abort();
      if (drawer && drawer.open) drawer.close();
    };
  }

  boot(document);
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) { teardown(e.target); });

  /* --------------------------------------------------------------- rule book */
  (function ruleBook() {
    var root = $('[data-cvd]');
    if (!root) return;
    var body = $('[data-cvd-body]', root);
    var toc = $('[data-cvd-toc]', root);
    var list = $('[data-cvd-toc-list]', root);
    var box = $('[data-cvd-toc-box]', root);
    var fillEl = $('[data-cvd-fill]', root);
    var badge = $('[data-cvd-badge]', root);
    var bell = $('[data-cvd-bell]', root);

    if (motion && badge) {
      gsap.fromTo(badge, { rotation: -18, y: -24, autoAlpha: 0 }, { rotation: 0, y: 0, autoAlpha: 1, duration: 1.6, ease: 'elastic.out(1, 0.35)', clearProps: 'transform' });
    }
    if (motion && bell) {
      var ring = function () { gsap.fromTo(bell, { rotation: 0 }, { keyframes: { rotation: [0, 14, -12, 9, -6, 3, 0] }, duration: 0.8, ease: 'power1.inOut' }); };
      bell.closest('.cvd__help').addEventListener('pointerenter', ring);
    }

    if (!body || !toc || !list) return;
    var heads = $$('h2', body);
    if (heads.length < 2) return;

    var used = {};
    var links = heads.map(function (h, i) {
      var slug = (h.textContent || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section-' + (i + 1);
      if (used[slug]) slug += '-' + (++used[slug]); else used[slug] = 1;
      if (!h.id) h.id = slug;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim();
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });
    toc.hidden = false;
    var layout = toc.parentNode;
    if (layout) layout.classList.add('has-toc');

    var narrow = window.matchMedia('(max-width: 989px)');
    function syncOpen() { if (box) box.open = !narrow.matches; }
    syncOpen();
    if (narrow.addEventListener) narrow.addEventListener('change', syncOpen);

    list.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' });
      history.replaceState(null, '', '#' + target.id);
      if (narrow.matches && box) box.open = false;
    });

    var current = -1;
    var ticking = false;
    function update() {
      ticking = false;
      var line = window.innerHeight * 0.3;
      var idx = 0;
      heads.forEach(function (h, i) { if (h.getBoundingClientRect().top <= line) idx = i; });
      if (idx !== current) {
        links.forEach(function (a, i) { if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        current = idx;
      }
      if (fillEl) {
        var r = body.getBoundingClientRect();
        var p = clamp((line - r.top) / Math.max(r.height - window.innerHeight * 0.4, 1), 0, 1);
        fillEl.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      }
    }
    function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    update();
  })();

  /* ----------------------------------------------------------------- contact */
  (function contact() {
    var root = $('[data-cvct]');
    if (!root) return;
    var form = $('#cvctForm', root);
    var bell = $('[data-cvct-bell]', root);
    var letterbox = $('[data-cvct-box]', root);
    var sent = $('[data-cvct-sent]', root);

    function ring() {
      if (!motion || !bell) return;
      gsap.fromTo(bell, { rotation: 0 }, { keyframes: { rotation: [0, 16, -14, 11, -8, 5, -2, 0] }, duration: 0.95, ease: 'power1.inOut' });
    }
    if (bell) bell.addEventListener('click', ring);

    if (sent) {
      var card = sent.closest('.cvct__card');
      if (card) card.scrollIntoView({ behavior: 'auto', block: 'center' });
      window.setTimeout(ring, 350);
    }

    if (!form || !motion) return;
    form.addEventListener('submit', function () {
      if (!form.checkValidity || !form.checkValidity() || !letterbox) return;
      var icon = $('[data-cvct-letter]', form);
      if (!icon) return;
      var from = icon.getBoundingClientRect();
      var to = letterbox.getBoundingClientRect();
      var flyer = icon.cloneNode(true);
      flyer.classList.add('cvct__flying');
      flyer.removeAttribute('data-cvct-letter');
      flyer.style.width = from.width + 'px';
      flyer.style.height = from.height + 'px';
      document.body.appendChild(flyer);
      gsap.set(icon, { autoAlpha: 0 });
      var dx = to.left + to.width * 0.5 - from.width * 0.5 - from.left;
      var dy = to.top + to.height * 0.2 - from.top;
      gsap.set(flyer, { x: from.left, y: from.top });
      var path = [{ x: from.left, y: from.top }, { x: from.left + dx * 0.45, y: from.top + Math.min(dy, 0) - 140 }, { x: from.left + dx, y: from.top + dy }];
      var tween = window.MotionPathPlugin
        ? { motionPath: { path: path, curviness: 1.25, autoRotate: false }, rotation: -12, scale: 0.7, duration: 0.75, ease: 'power2.inOut' }
        : { x: path[2].x, y: path[2].y, rotation: -12, scale: 0.7, duration: 0.75, ease: 'power2.inOut' };
      tween.onComplete = function () {
        gsap.to(flyer, { scaleY: 0.1, autoAlpha: 0, duration: 0.18, onComplete: function () { flyer.remove(); } });
        gsap.fromTo(letterbox, { rotation: 0 }, { keyframes: { rotation: [0, -4, 3, -1, 0] }, duration: 0.5, ease: 'power1.inOut' });
      };
      gsap.to(flyer, tween);
    });
  })();
})();
