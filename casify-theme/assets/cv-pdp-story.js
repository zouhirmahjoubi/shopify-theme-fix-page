/* Casify: product page story behaviour (the sections below the buy box).
 *
 *   fit     filter the phone-model list; choosing a model sets it in the buy box
 *           (a cvs:choose event that cv-product.js answers), then brings the
 *           buy box back. A model shows pressed only once the shopper chose it.
 *   set     "Complete the set": fetch complementary recommendations, or related
 *           ones when there are none. One tap adds a product only when its exact
 *           variant is known: a product with a single variant that fits any
 *           phone, or the variant made for the phone model the shopper chose in
 *           the buy box. Otherwise the card links to the product so the shopper
 *           picks a model there. "For your [model]" only after a real choice.
 *   shelf   fetch Shopify product recommendations into the shelf section
 *   closer  keep the closing summaries (closer, guarantee) in step with the buy
 *           box; until a phone is chosen they read "Choose your phone"
 *   reel, snap, ugc   hand-scroll counter, prev/next paging, muted clips
 *
 * Generic hooks any product section may print (no section-specific code here):
 *   [data-cvw-pct="2|3"]       text becomes the buy box [data-cv-pack][data-cv-qty=N]
 *                              data-cv-discount; the server text stays when there is no buy box
 *   [data-cvw-buy="add|buy"]   calls CasifyPDP.add / buyNow(root, {from: button})
 *   [data-cvw-model="value"]   picks that phone model in the buy box (cvs:choose)
 *   [data-cvw-pack="N"]        picks that pack in the buy box (cvs:pack), then back to the box
 *   [data-cvp-back]            back to Add to bag (an anchor's own jump is replaced)
 *
 * Model state comes from cv-product.js (INF-1): cvs:change detail.modelConfirmed and
 * detail.modelValue (null until the shopper chose), and CasifyPDP.state(root) at boot,
 * because the buy box's first cvs:change fires before this file runs.
 * Commerce stays in cv-product.js: this file only asks it (events, CasifyPDP calls),
 * except the set's own one-tap add of a known single variant.
 *
 * Shopper strings: data-i18n-* on each section root, then the older data-*-label
 * attributes, then the current English. Every module inits per root, re-inits on
 * shopify:section:load and leaves nothing behind on unload.
 */
(function () {
  'use strict';

  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function isBlank(v) { return v === null || v === undefined || v === ''; }
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mqReduce && mqReduce.matches); }
  function cartBase() { return window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : '/'; }
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function namesPhone(s) { return /iphone|galaxy|samsung|pixel/i.test(String(s)); }
  function fill(str, map) {
    return String(str).replace(/\[(\w+)\]/g, function (m, k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : m; });
  }
  /* A shopper string: data-i18n-<key>, then the legacy data-<legacy>-label, then English. */
  function text(el, key, fallback, legacy) {
    var v = el && el.getAttribute('data-i18n-' + key);
    if (isBlank(v) && legacy && el) v = el.getAttribute('data-' + legacy + '-label');
    return isBlank(v) ? fallback : v;
  }
  /* Listener bookkeeping: every module's listeners go through on() so destroy() removes them all. */
  function bag() {
    var list = [];
    return {
      on: function (el, type, fn, opts) {
        if (!el) return;
        el.addEventListener(type, fn, opts);
        list.push(function () { el.removeEventListener(type, fn, opts); });
      },
      add: function (fn) { list.push(fn); },
      clear: function () { list.splice(0).forEach(function (fn) { fn(); }); }
    };
  }

  /* ---------------------------------------------------------------- the buy box */
  function slip() { return document.querySelector('[data-cv-pdp]'); }
  function modelIndexOf(root) {
    var mi = root ? parseInt(root.getAttribute('data-model-index'), 10) : -1;
    return isNaN(mi) ? -1 : mi;
  }
  /* {root, modelIndex, confirmed, model, variant, qty, total} from the live buy box. */
  function pdpState() {
    var root = slip();
    var mi = modelIndexOf(root);
    var out = { root: root, modelIndex: mi, confirmed: mi < 0, model: null, variant: null, qty: 1, total: null };
    if (!root) return out;
    var api = window.CasifyPDP && typeof window.CasifyPDP.state === 'function' ? window.CasifyPDP.state(root) : null;
    if (api) {
      out.confirmed = !!api.modelConfirmed;
      out.model = isBlank(api.modelValue) ? null : String(api.modelValue);
      out.variant = api.variant || null;
      out.qty = api.qty || 1;
      out.total = api.total;
      if (!isBlank(api.modelIndex)) out.modelIndex = api.modelIndex;
    } else {
      // cv-product.js not booted: only its own confirmation attribute counts.
      out.confirmed = mi < 0 || root.getAttribute('data-cv-model-confirmed') === 'true';
    }
    return out;
  }
  /* The same fields from a cvs:change detail (fields only ever added by cv-product.js). */
  function fromChange(e) {
    var d = (e && e.detail) || {};
    var root = e && e.target && e.target.nodeType === 1 ? e.target : slip();
    var mi = modelIndexOf(root);
    var confirmed = d.modelConfirmed === undefined
      ? (mi < 0 || (root && root.getAttribute('data-cv-model-confirmed') === 'true'))
      : !!d.modelConfirmed;
    return {
      root: root, modelIndex: mi, confirmed: confirmed,
      model: isBlank(d.modelValue) ? null : String(d.modelValue),
      variant: d.variant || null, qty: d.qty || 1, total: d.total
    };
  }
  /* cvs:change does not bubble: listen in the capture phase on document, so a buy box
     re-rendered in the theme editor is heard without re-binding. */
  function onChange(b, fn) {
    b.on(document, 'cvs:change', function (e) {
      if (e.target && e.target.matches && e.target.matches('[data-cv-pdp]')) fn(fromChange(e));
    }, true);
  }

  var backTimer = 0;
  function viewH() { return window.innerHeight || document.documentElement.clientHeight || 0; }
  function backToSlip() {
    var root = slip();
    var form = (root && root.querySelector('#cvAddForm')) || document.getElementById('cvAddForm');
    var btn = (root && root.querySelector('#cvAddBtn')) || document.getElementById('cvAddBtn');
    var calm = reduced();
    var shown = btn && btn.getClientRects().length > 0;
    /* Center the whole form only when it fits the screen. A taller form (most phones and
       laptops) would push Add to bag below the fold, so center the button itself. */
    var target = shown && (!form || form.getBoundingClientRect().height > viewH()) ? btn : (form || btn);
    if (target) target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
    window.clearTimeout(backTimer);
    if (!btn) return;
    /* Focus once the smooth scroll has settled (scroll position unchanged between two
       reads, 2 s cap). If the button is still not fully on screen, focus scrolls it in. */
    var t0 = Date.now(), lastY = -1;
    function settle() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (!calm && y !== lastY && Date.now() - t0 < 2000) { lastY = y; backTimer = window.setTimeout(settle, 80); return; }
      var r = btn.getBoundingClientRect();
      btn.focus({ preventScroll: r.top >= 0 && r.bottom <= viewH() });
    }
    backTimer = window.setTimeout(settle, calm ? 0 : 250);
  }

  /* Debounced ScrollTrigger.refresh(): after the buy box changes height (cvs:layout) or a fill. */
  var refreshTimer = 0;
  function refreshSoon() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
      var ST = window.ScrollTrigger;
      if (ST && typeof ST.refresh === 'function') ST.refresh();
    }, 160);
  }

  /* Fetch a section from the recommendations endpoint; resolves to its filled root, or null. */
  function fetchSection(url, selector, signal) {
    if (!url || !window.fetch) return Promise.resolve(null);
    return fetch(url, signal ? { signal: signal } : undefined)
      .then(function (res) { return res.ok ? res.text() : ''; })
      .then(function (html) {
        if (!html) return null;
        var fresh = new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
        return fresh && fresh.querySelector('li') ? fresh : null;
      })
      .catch(function () { return null; });
  }
  function aborter() { return typeof window.AbortController === 'function' ? new window.AbortController() : null; }

  /* ---------------------------------------------------------------- fit list */
  function initFit(fit, b) {
    var oi = Number(fit.getAttribute('data-option-index'));
    var input = fit.querySelector('[data-cvp-fit-filter]');
    var count = fit.querySelector('[data-cvp-fit-count]');
    var empty = fit.querySelector('[data-cvp-fit-empty]');
    var buttons = $$('[data-cvp-model]', fit);

    function filter() {
      var q = norm(input.value);
      var shown = 0;
      buttons.forEach(function (btn) {
        var ok = !q || norm(btn.textContent).indexOf(q) > -1;
        btn.parentNode.hidden = !ok;
        if (ok) shown++;
      });
      if (count) count.textContent = fill(shown === 1 ? text(fit, 'count-one', '[n] model') : text(fit, 'count-other', '[n] models'), { n: shown });
      if (empty) empty.hidden = shown > 0;
      fit.dispatchEvent(new CustomEvent('cvp:filter', { detail: { shown: shown } }));
    }
    if (input) b.on(input, 'input', filter);

    /* Pressed only for a model the shopper chose; the server's first-variant guess is cleared. */
    function mark(value) {
      buttons.forEach(function (btn) {
        var on = value !== null && btn.getAttribute('data-cvp-model') === String(value);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function sync(s) {
      if (!s.confirmed) { mark(null); return; }
      if (s.model !== null && s.modelIndex === oi) mark(s.model);
      else if (s.variant && s.variant.options) mark(s.variant.options[oi]);
      else mark(null);
    }

    buttons.forEach(function (btn) {
      b.on(btn, 'click', function () {
        var value = btn.getAttribute('data-cvp-model');
        var root = slip();
        // The buy box answers with a cvs:change that marks the button; with no buy box, mark here.
        if (root) root.dispatchEvent(new CustomEvent('cvs:choose', { detail: { index: oi, value: value } }));
        else mark(value);
        backToSlip();
      });
    });
    onChange(b, sync);
    sync(pdpState());
  }

  /* ---------------------------------------------------------------- complete the set */
  function initSet(set, b) {
    var updates = [];
    var alive = true;
    var timers = [];
    var current = pdpState();
    function model() { return current.confirmed && current.modelIndex >= 0 ? current.model : null; }
    function later(fn, ms) { var id = window.setTimeout(function () { if (alive) fn(); }, ms); timers.push(id); }
    b.add(function () { alive = false; timers.forEach(window.clearTimeout); timers = []; });

    function wire() {
      updates = $$('[data-cvp-set-item]', set).map(function (item) {
        var variants = [];
        try { variants = JSON.parse(item.querySelector('[data-cvp-set-variants]').textContent) || []; } catch (e) { variants = []; }
        var add = item.querySelector('[data-cvp-set-add]');
        var addText = add && add.querySelector('[data-cvp-set-label]');
        var choose = item.querySelector('[data-cvp-set-choose]');
        var fitNote = item.querySelector('[data-cvp-set-fit]');
        var chosen = null;

        function update() {
          var open = variants.filter(function (v) { return v.available; });
          var phone = model();
          chosen = null;
          if (variants.length === 1 && !variants[0].options.some(namesPhone)) {
            chosen = open[0] || null; // one variant that fits any phone (a charger, a strap)
          } else if (phone) {
            var m = norm(phone);
            chosen = open.filter(function (v) { return v.options.some(function (o) { return norm(o) === m; }); })[0] || null;
          }
          if (add) add.hidden = !chosen;
          if (choose) choose.hidden = !!chosen;
          if (fitNote) {
            var show = !!chosen && !!phone && chosen.options.some(namesPhone);
            fitNote.hidden = !show;
            fitNote.textContent = show ? fill(text(set, 'fit', 'For your [model]', 'fit'), { model: phone }) : '';
          }
        }
        function resetLabel() { if (addText) addText.textContent = text(set, 'add', 'Add', 'add'); }

        if (add) {
          b.on(add, 'click', function () {
            if (!chosen || add.classList.contains('is-busy')) return;
            var picked = chosen;
            add.classList.add('is-busy');
            add.disabled = true;
            if (addText) addText.textContent = text(set, 'adding', 'Adding…', 'adding');
            fetch(cartBase() + 'cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ items: [{ id: picked.id, quantity: 1 }] })
            })
              .then(function (res) { return res.json().then(function (body) { if (!res.ok) throw body; return body; }); })
              .then(function () {
                if (!alive) return;
                add.classList.remove('is-busy');
                add.classList.add('is-done');
                if (addText) addText.textContent = text(set, 'added', 'In your bag', 'added');
                document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
                document.dispatchEvent(new CustomEvent('cart:added', { bubbles: true, detail: { source: 'set', from: add, qty: 1, items: [{ id: picked.id, quantity: 1 }] } }));
                if (window.CasifyCart && typeof window.CasifyCart.refresh === 'function') window.CasifyCart.refresh();
                set.dispatchEvent(new CustomEvent('cvp:setadded', { bubbles: true, detail: { item: item, button: add } }));
                later(function () { add.classList.remove('is-done'); add.disabled = false; resetLabel(); }, 2200);
              })
              .catch(function () {
                if (!alive) return;
                add.classList.remove('is-busy');
                add.disabled = false;
                if (addText) addText.textContent = text(set, 'retry', 'Try again', 'retry');
                later(resetLabel, 2400);
              });
          });
        }
        update();
        return update;
      });
    }

    if (set.classList.contains('is-filled')) {
      wire();
    } else {
      var ctl = aborter();
      b.add(function () { if (ctl) ctl.abort(); });
      var signal = ctl ? ctl.signal : null;
      fetchSection(set.getAttribute('data-url-complementary'), '[data-cvp-set]', signal)
        .then(function (fresh) { return fresh || !alive ? fresh : fetchSection(set.getAttribute('data-url-related'), '[data-cvp-set]', signal); })
        .then(function (fresh) {
          if (!fresh || !alive) return; // nothing to suggest: the section stays hidden
          set.innerHTML = fresh.innerHTML;
          set.classList.add('is-filled');
          wire();
          showEachProductOnce();
          refreshSoon();
          set.dispatchEvent(new CustomEvent('cvp:set', { bubbles: true }));
        });
    }

    onChange(b, function (s) {
      var was = model();
      current = s;
      if (model() !== was) updates.forEach(function (update) { update(); });
    });
  }

  /* ---------------------------------------------------------------- shelf */
  function initShelf(shelf, b) {
    if (shelf.classList.contains('is-filled')) return;
    var alive = true;
    var ctl = aborter();
    b.add(function () { alive = false; if (ctl) ctl.abort(); });
    fetchSection(shelf.getAttribute('data-url'), '[data-cvp-shelf]', ctl ? ctl.signal : null).then(function (fresh) {
      if (!fresh || !alive) return; // the shelf simply stays hidden
      shelf.innerHTML = fresh.innerHTML;
      shelf.classList.add('is-filled');
      showEachProductOnce();
      refreshSoon();
      shelf.dispatchEvent(new CustomEvent('cvp:shelf', { bubbles: true }));
    });
  }

  /* ---------------------------------------------------------------- closing summaries */
  /* Closer and guarantee: "[product] · [variant] · [qty] · [total]" once a phone is chosen,
     "[product] · Choose your phone" before. Strings from data-i18n-* on the [data-cvp-closer] root. */
  function initCloser(closer, b) {
    var summary = closer.querySelector('[data-cvp-summary]');
    if (!summary) return;
    var product = summary.getAttribute('data-product-title') || closer.getAttribute('data-product-title');
    if (isBlank(product)) product = String(summary.textContent).split(' · ')[0].trim();

    function money(cents) {
      if (typeof cents !== 'number' || isNaN(cents)) return '';
      if (window.CasifyMoney && typeof window.CasifyMoney.format === 'function') return window.CasifyMoney.format(cents);
      var t = document.getElementById('cvTotal');
      return t ? t.textContent : '';
    }
    function render(s) {
      if (!s.root) return; // no buy box on this page: the server text stays
      var out;
      if (!s.confirmed) {
        out = fill(text(closer, 'summary-pending', '[product] · Choose your phone'), { product: product });
      } else {
        var qty = s.qty || 1;
        out = fill(text(closer, 'summary', '[product] · [variant] · [qty] · [total]'), {
          product: product,
          variant: s.variant && s.variant.title ? s.variant.title : '',
          qty: fill(qty > 1 ? text(closer, 'case-other', '[n] cases') : text(closer, 'case-one', '[n] case'), { n: qty }),
          total: money(s.total)
        });
        out = out.split(' · ').filter(function (part) { return part.trim() !== ''; }).join(' · ');
      }
      if (summary.textContent !== out) summary.textContent = out; // one write per real change
    }
    onChange(b, render);
    render(pdpState());
  }

  /* ---------------------------------------------------------------- photo reel */
  /* When the strip scrolls by hand (phones, tablets, reduced motion), keep the counter on the frame nearest the middle. */
  function initReel(reel, b) {
    var viewport = reel.querySelector('[data-cvw-reel-viewport]');
    var now = reel.querySelector('[data-cvw-reel-now]');
    var frames = $$('[data-cvw-reel-frame]', reel);
    if (!viewport || !now || !frames.length) return;
    var frame = 0;
    b.add(function () { if (frame) window.cancelAnimationFrame(frame); frame = 0; });
    b.on(viewport, 'scroll', function () {
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        var mid = viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
        var best = 0, gap = Infinity;
        frames.forEach(function (f, i) {
          var r = f.getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - mid);
          if (d < gap) { gap = d; best = i; }
        });
        now.textContent = best + 1;
      });
    }, { passive: true });
  }

  /* ---------------------------------------------------------------- counter snapshots */
  /* Prev/next buttons page the pinned-photo strip by one frame; works with no GSAP too. */
  function initSnap(snap, b) {
    var viewport = snap.querySelector('[data-cvw-snap-viewport]');
    var frames = $$('[data-cvw-snap-frame]', snap);
    if (!viewport || !frames.length) return;
    $$('[data-cvw-snap-nav]', snap).forEach(function (btn) {
      b.on(btn, 'click', function () {
        var dir = Number(btn.getAttribute('data-cvw-snap-nav')) || 1;
        var step = frames[0].getBoundingClientRect().width + 22; /* frame width + gap */
        viewport.scrollBy({ left: step * dir, behavior: reduced() ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------------------------------------------------------------- counter clips */
  /* Each clip plays muted once it is actually on screen and stops when it leaves, so
     nothing ever plays out of sight. Every clip can be stopped by hand and stays
     stopped (WCAG 2.2.2), and under reduced motion none of them start on their own:
     the poster holds until the shopper presses play. Tapping a clip opens it large,
     where the native controls carry sound for any clip that has some. */
  function initUgc(sec, b) {
    var dialog = sec.querySelector('[data-cvw-ugc-dialog]');
    var stage = sec.querySelector('[data-cvw-ugc-stage]');
    var players = [];

    $$('[data-cvw-ugc-clip]', sec).forEach(function (clip) {
      var video = clip.querySelector('[data-cvw-ugc-video]');
      if (!video) return;
      var playBtn = clip.querySelector('[data-cvw-ugc-play]');
      var bar = clip.querySelector('[data-cvw-ugc-bar]');
      var byHand = false;  /* the shopper stopped it: scrolling never restarts it */
      var seen = false;

      function mark(playing) {
        if (!playBtn) return;
        playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
        var label = playBtn.getAttribute(playing ? 'data-pause-label' : 'data-play-label');
        if (label) playBtn.setAttribute('aria-label', label);
      }
      function start() {
        var p = video.play();
        if (p && p.catch) p.catch(function () { mark(false); });
      }
      function resume() { if (seen && !byHand && !reduced() && !(dialog && dialog.open)) start(); }

      b.on(video, 'play', function () { mark(true); });
      b.on(video, 'pause', function () { mark(false); });
      b.on(video, 'timeupdate', function () {
        if (bar && video.duration) bar.style.width = (video.currentTime / video.duration * 100) + '%';
      });
      if (playBtn) {
        b.on(playBtn, 'click', function () {
          if (video.paused) { byHand = false; start(); } else { byHand = true; video.pause(); }
        });
      }
      b.add(function () { if (!video.paused) video.pause(); });

      players.push({ video: video, resume: resume });

      if (!window.IntersectionObserver) { seen = true; resume(); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          seen = e.isIntersecting;
          if (seen) resume();
          else if (!video.paused) video.pause();
        });
      }, { threshold: 0.5 });
      io.observe(clip);
      b.add(function () { io.disconnect(); });
    });

    if (!dialog || !stage || typeof dialog.showModal !== 'function') return;
    var opener = null;
    var closeBtn = sec.querySelector('[data-cvw-ugc-close]');

    $$('[data-cvw-ugc-clip]', sec).forEach(function (clip) {
      var open = clip.querySelector('[data-cvw-ugc-open]');
      var video = clip.querySelector('[data-cvw-ugc-video]');
      if (!open || !video) return;
      b.on(open, 'click', function () {
        var big = video.cloneNode(true);
        big.removeAttribute('data-cvw-ugc-video');
        big.removeAttribute('style'); /* drop the rail's scroll-pan transform */
        big.muted = true;     /* muted so it is allowed to start by itself, */
        big.controls = true;  /* and the controls are there to turn sound on */
        big.loop = true;
        stage.innerHTML = '';
        stage.appendChild(big);
        opener = open;
        players.forEach(function (p) { p.video.pause(); });
        dialog.showModal();
        /* Close, not the video's own controls, takes the focus: it keeps the way
           out first in the tab order and out of the video's shadow DOM. */
        if (closeBtn) closeBtn.focus({ preventScroll: true });
        var p = big.play(); /* the shopper asked for this clip, so it plays */
        if (p && p.catch) p.catch(function () {});
      });
    });

    if (closeBtn) b.on(closeBtn, 'click', function () { dialog.close(); });
    /* Escape closes it here rather than leaving it to the dialog's own handling,
       which a focused <video controls> can swallow. */
    b.on(dialog, 'keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); dialog.close(); }
    });
    b.on(dialog, 'click', function (e) { if (e.target === dialog) dialog.close(); });
    b.on(dialog, 'close', function () {
      stage.innerHTML = '';
      if (opener) { opener.focus({ preventScroll: true }); opener = null; }
      players.forEach(function (p) { p.resume(); });
    });
    b.add(function () { if (dialog.open) dialog.close(); stage.innerHTML = ''; });
  }

  /* ---------------------------------------------------------------- one product, shown once */
  /* Complete-the-set, the showcase, the rows and the shelf draw from overlapping collections;
     a product already shown higher on the page is hidden further down, and an emptied section with it. */
  function productPath(link) {
    var href = link && link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return '';
    var at = href.indexOf('/products/');
    return at > -1 ? href.slice(at).split(/[?#]/)[0].replace(/\/$/, '') : '';
  }
  var SHOWCASE_CARDS = 3;
  var SHOWCASE_TONES = ['cream', 'teal', 'cocoa'];
  var SHELF_ITEM = '[data-cvp-shelf].is-filled .cvp-shelf__item';
  function showEachProductOnce() {
    var seen = {};
    $$('[data-cvw-showcase]').forEach(function (sec) { sec.cvwShown = 0; });
    $$('[data-cvp-set-item], [data-cvw-card], [data-cvw-row-item], ' + SHELF_ITEM).forEach(function (item) {
      var path = productPath(item.querySelector('a[href]'));
      if (!path) return;
      // Complete-the-set cards are always shown; they only mark their products as seen.
      if (item.hasAttribute('data-cvp-set-item')) { if (!item.hidden) seen[path] = true; return; }
      // The showcase keeps its first three unseen products; its spares fill in for duplicates.
      var sec = item.hasAttribute('data-cvw-card') ? item.closest('[data-cvw-showcase]') : null;
      var show = !seen[path] && (!sec || sec.cvwShown < SHOWCASE_CARDS);
      item.hidden = !show;
      if (show) { seen[path] = true; if (sec) sec.cvwShown += 1; }
    });
    $$('[data-cvw-showcase]').forEach(function (sec) {
      var n = 0;
      $$('[data-cvw-card]', sec).forEach(function (card) {
        if (card.hidden) return;
        SHOWCASE_TONES.forEach(function (t) { card.classList.remove('cvw-card--' + t); });
        card.classList.add('cvw-card--' + SHOWCASE_TONES[Math.min(n, SHOWCASE_TONES.length - 1)]);
        n += 1;
      });
    });
    $$('[data-cvw-row]').forEach(function (row) {
      var visible = $$('[data-cvw-row-item]', row).filter(function (i) { return !i.hidden; });
      var list = row.querySelector('.cvw-row__items');
      visible.forEach(function (item, i) { item.style.gridColumn = String(i + 1); });
      if (list) list.style.setProperty('--n', Math.max(visible.length, 1));
      row.hidden = visible.length === 0;
    });
    $$('[data-cvw-showcase]').forEach(function (sec) {
      sec.hidden = $$('[data-cvw-card]', sec).every(function (c) { return c.hidden; });
    });
    // A filled set or shelf with no card left (all skipped by Liquid or hidden above) hides with its heading.
    $$('[data-cvp-set].is-filled').forEach(function (set) {
      set.hidden = !$$('[data-cvp-set-item]', set).some(function (i) { return !i.hidden; });
    });
    $$('[data-cvp-shelf].is-filled').forEach(function (shelf) {
      var items = $$('.cvp-shelf__item', shelf);
      shelf.hidden = items.length > 0 && items.every(function (i) { return i.hidden; });
    });
  }

  /* ---------------------------------------------------------------- pack percentages */
  /* [data-cvw-pct="N"] shows the buy box's live discount for an N-pack; the server text stays otherwise. */
  function packPct(qty) {
    var root = slip();
    if (!root) return null;
    var pack = root.querySelector('[data-cv-pack][data-cv-qty="' + qty + '"]');
    var raw = pack ? pack.getAttribute('data-cv-discount') : null;
    if (isBlank(raw)) return null;
    var n = parseFloat(raw);
    if (isNaN(n) || n < 0) return null;
    return String(Math.round(n * 100) / 100);
  }
  function fillPct() {
    $$('[data-cvw-pct]').forEach(function (el) {
      var v = packPct(el.getAttribute('data-cvw-pct'));
      if (v !== null && el.textContent !== v) el.textContent = v;
    });
  }
  var pctWatch = null;
  var pctRoot = null;
  function watchPct() {
    var root = slip();
    if (root === pctRoot) return;
    if (pctWatch) pctWatch.disconnect();
    pctWatch = null;
    pctRoot = root;
    if (!root || typeof window.MutationObserver !== 'function') return;
    pctWatch = new MutationObserver(fillPct);
    pctWatch.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-cv-discount', 'data-cv-qty'] });
  }

  /* ---------------------------------------------------------------- lifecycle */
  var MODULES = [
    { name: 'fit', sel: '[data-cvp-fit]', init: initFit },
    { name: 'set', sel: '[data-cvp-set]', init: initSet },
    { name: 'shelf', sel: '[data-cvp-shelf]', init: initShelf },
    { name: 'closer', sel: '[data-cvp-closer]', init: initCloser },
    { name: 'reel', sel: '[data-cvw-reel]', init: initReel },
    { name: 'snap', sel: '[data-cvw-snap]', init: initSnap },
    { name: 'ugc', sel: '[data-cvw-ugc]', init: initUgc }
  ];
  function rootsIn(scope, sel) {
    if (!scope || scope.nodeType !== 1 && scope.nodeType !== 9) return [];
    var list = $$(sel, scope);
    if (scope.nodeType === 1 && scope.matches(sel)) list.unshift(scope);
    return list;
  }
  function destroyOne(el, mod) {
    var store = el._cvpStory;
    if (store && store[mod.name]) { store[mod.name](); delete store[mod.name]; }
  }
  function initOne(el, mod) {
    destroyOne(el, mod);
    var b = bag();
    try { mod.init(el, b); } catch (err) { b.clear(); if (window.console) window.console.error(err); return; }
    el._cvpStory = el._cvpStory || {};
    el._cvpStory[mod.name] = b.clear;
  }
  function boot(scope) {
    MODULES.forEach(function (mod) { rootsIn(scope, mod.sel).forEach(function (el) { initOne(el, mod); }); });
    showEachProductOnce();
    watchPct();
    fillPct();
  }
  function teardown(scope) {
    MODULES.forEach(function (mod) { rootsIn(scope, mod.sel).forEach(function (el) { destroyOne(el, mod); }); });
  }

  /* Generic proxies, delegated once on document: they work in any section and survive editor reloads. */
  function closestIn(e, sel) { return e.target && e.target.closest ? e.target.closest(sel) : null; }
  document.addEventListener('click', function (e) {
    var proxy = closestIn(e, '[data-cvw-buy]');
    if (proxy) {
      if (proxy.tagName === 'A') e.preventDefault();
      if (proxy.disabled || proxy.getAttribute('aria-disabled') === 'true') return;
      var api = window.CasifyPDP;
      var root = slip();
      if (!api || !root) { if (proxy.tagName === 'A') backToSlip(); return; }
      var kind = proxy.getAttribute('data-cvw-buy');
      if (kind === 'buy' && typeof api.buyNow === 'function') api.buyNow(root, { from: proxy });
      else if (typeof api.add === 'function') api.add(root, { from: proxy });
      return;
    }
    var pick = closestIn(e, '[data-cvw-model]');
    if (pick) {
      var box = slip();
      var mi = modelIndexOf(box);
      if (pick.tagName === 'A') e.preventDefault();
      if (box && mi >= 0) box.dispatchEvent(new CustomEvent('cvs:choose', { detail: { index: mi, value: pick.getAttribute('data-cvw-model') } }));
      backToSlip();
      return;
    }
    var pack = closestIn(e, '[data-cvw-pack]');
    if (pack) {
      var r = slip();
      if (pack.tagName === 'A') e.preventDefault();
      if (r) r.dispatchEvent(new CustomEvent('cvs:pack', { detail: { qty: Number(pack.getAttribute('data-cvw-pack')) } }));
      backToSlip();
      return;
    }
    var back = closestIn(e, '[data-cvp-back]');
    if (back) {
      if (back.tagName === 'A') e.preventDefault(); // the smooth scroll replaces the anchor's jump
      backToSlip();
    }
  });

  document.addEventListener('cvs:layout', refreshSoon);
  document.addEventListener('cvs:change', fillPct, true);
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); refreshSoon(); });
  document.addEventListener('shopify:section:unload', function (e) {
    teardown(e.target);
    if (pctRoot && e.target && e.target.contains && e.target.contains(pctRoot)) { if (pctWatch) pctWatch.disconnect(); pctWatch = null; pctRoot = null; }
  });
  document.addEventListener('shopify:section:select', refreshSoon);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(document); }, { once: true });
  else boot(document);
})();
