/* Casify: product page story behaviour (the sections below the buy box).
 *
 *   fit     filter the phone-model list; choosing a model sets it in the buy box
 *           (a cvs:choose event that cv-product.js answers), then brings the
 *           buy box back
 *   set     "Complete the set": fetch complementary recommendations, or related
 *           ones when there are none. One tap adds a product only when its exact
 *           variant is known: a product with a single variant, or the variant
 *           made for the phone model chosen in the buy box. Otherwise the card
 *           links to the product so the shopper picks a model there.
 *   shelf   fetch Shopify product recommendations into the shelf section
 *   closer  keep the closing summary in step with the buy box; its button
 *           scrolls up and focuses add to bag
 *
 * The buy box (assets/cv-product.js) announces every change with a "cvs:change"
 * event on its [data-cv-pdp] root.
 */
(function () {
  'use strict';

  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  var slip = document.querySelector('[data-cv-pdp]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cartBase = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';

  function backToSlip() {
    var form = document.getElementById('cvAddForm');
    var btn = document.getElementById('cvAddBtn');
    if (form) form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    if (btn) window.setTimeout(function () { btn.focus({ preventScroll: true }); }, reduce ? 0 : 650);
  }
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function namesPhone(s) { return /iphone|galaxy|samsung|pixel/i.test(String(s)); }

  /* Fetch a section from the recommendations endpoint; resolves to its filled root, or null. */
  function fetchSection(url, selector) {
    if (!url || !window.fetch) return Promise.resolve(null);
    return fetch(url)
      .then(function (res) { return res.ok ? res.text() : ''; })
      .then(function (html) {
        if (!html) return null;
        var fresh = new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
        return fresh && fresh.querySelector('li') ? fresh : null;
      })
      .catch(function () { return null; });
  }

  /* ---------------------------------------------------------------- fit list */
  $$('[data-cvp-fit]').forEach(function (fit) {
    var oi = fit.getAttribute('data-option-index');
    var input = fit.querySelector('[data-cvp-fit-filter]');
    var count = fit.querySelector('[data-cvp-fit-count]');
    var empty = fit.querySelector('[data-cvp-fit-empty]');
    var buttons = $$('[data-cvp-model]', fit);

    function filter() {
      var q = norm(input.value);
      var shown = 0;
      buttons.forEach(function (b) {
        var ok = !q || norm(b.textContent).indexOf(q) > -1;
        b.parentNode.hidden = !ok;
        if (ok) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? ' model' : ' models');
      if (empty) empty.hidden = shown > 0;
      fit.dispatchEvent(new CustomEvent('cvp:filter', { detail: { shown: shown } }));
    }
    if (input) input.addEventListener('input', filter);

    function mark(value) {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cvp-model') === String(value) ? 'true' : 'false'); });
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var value = b.getAttribute('data-cvp-model');
        if (slip) slip.dispatchEvent(new CustomEvent('cvs:choose', { detail: { index: Number(oi), value: value } }));
        mark(value);
        backToSlip();
      });
    });

    if (slip) {
      slip.addEventListener('cvs:change', function (e) {
        if (e.detail && e.detail.variant) mark(e.detail.variant.options[Number(oi)]);
      });
    }
  });

  /* ---------------------------------------------------------------- complete the set */
  var modelIndex = slip ? parseInt(slip.getAttribute('data-model-index'), 10) : -1;
  var currentModel = null;
  if (slip && modelIndex >= 0) {
    try { currentModel = JSON.parse(slip.getAttribute('data-current-options'))[modelIndex]; } catch (e) { currentModel = null; }
  }

  $$('[data-cvp-set]').forEach(function (set) {
    var updates = [];
    function label(name, fallback) { return set.getAttribute('data-' + name + '-label') || fallback; }

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
          chosen = null;
          if (variants.length === 1 && !variants[0].options.some(namesPhone)) {
            chosen = open[0] || null; // one variant that fits any phone (a charger, a strap)
          } else if (currentModel) {
            var m = norm(currentModel);
            chosen = open.filter(function (v) { return v.options.some(function (o) { return norm(o) === m; }); })[0] || null;
          }
          if (add) add.hidden = !chosen;
          if (choose) choose.hidden = !!chosen;
          if (fitNote) {
            var show = !!chosen && chosen.options.some(namesPhone);
            fitNote.hidden = !show;
            fitNote.textContent = show ? label('fit', 'For your [model]').replace('[model]', currentModel) : '';
          }
        }
        function resetLabel() { if (addText) addText.textContent = label('add', 'Add'); }

        if (add) {
          add.addEventListener('click', function () {
            if (!chosen || add.classList.contains('is-busy')) return;
            add.classList.add('is-busy');
            add.disabled = true;
            if (addText) addText.textContent = label('adding', 'Adding…');
            fetch(cartBase + 'cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ items: [{ id: chosen.id, quantity: 1 }] })
            })
              .then(function (res) { return res.json().then(function (body) { if (!res.ok) throw body; return body; }); })
              .then(function () {
                add.classList.remove('is-busy');
                add.classList.add('is-done');
                if (addText) addText.textContent = label('added', 'In your bag');
                document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
                document.dispatchEvent(new CustomEvent('cart:added', { bubbles: true }));
                if (window.CasifyCart && typeof window.CasifyCart.refresh === 'function') window.CasifyCart.refresh();
                set.dispatchEvent(new CustomEvent('cvp:setadded', { bubbles: true, detail: { item: item, button: add } }));
                window.setTimeout(function () { add.classList.remove('is-done'); add.disabled = false; resetLabel(); }, 2200);
              })
              .catch(function () {
                add.classList.remove('is-busy');
                add.disabled = false;
                if (addText) addText.textContent = label('retry', 'Try again');
                window.setTimeout(resetLabel, 2400);
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
      fetchSection(set.getAttribute('data-url-complementary'), '[data-cvp-set]')
        .then(function (fresh) { return fresh || fetchSection(set.getAttribute('data-url-related'), '[data-cvp-set]'); })
        .then(function (fresh) {
          if (!fresh) return; // nothing to suggest: the section stays hidden
          set.innerHTML = fresh.innerHTML;
          set.classList.add('is-filled');
          wire();
          set.dispatchEvent(new CustomEvent('cvp:set', { bubbles: true }));
        });
    }

    if (slip && modelIndex >= 0) {
      slip.addEventListener('cvs:change', function (e) {
        if (!e.detail || !e.detail.variant) return;
        currentModel = e.detail.variant.options[modelIndex];
        updates.forEach(function (update) { update(); });
      });
    }
  });

  /* ---------------------------------------------------------------- one product, shown once */
  /* Complete-the-set, the showcase and the product shelves draw from overlapping collections;
     a product already shown higher on the page is hidden further down, and an emptied section with it. */
  function productPath(link) {
    var href = link && link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return '';
    var at = href.indexOf('/products/');
    return at > -1 ? href.slice(at).split(/[?#]/)[0].replace(/\/$/, '') : '';
  }
  var SHOWCASE_CARDS = 3;
  var SHOWCASE_TONES = ['cream', 'teal', 'cocoa'];
  function showEachProductOnce() {
    var seen = {};
    $$('[data-cvw-showcase]').forEach(function (sec) { sec.cvwShown = 0; });
    $$('[data-cvp-set-item], [data-cvw-card], [data-cvw-row-item]').forEach(function (item) {
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
  }
  showEachProductOnce();
  document.addEventListener('cvp:set', showEachProductOnce);

  /* ---------------------------------------------------------------- shelf */
  $$('[data-cvp-shelf]').forEach(function (shelf) {
    if (shelf.classList.contains('is-filled')) return;
    fetchSection(shelf.getAttribute('data-url'), '[data-cvp-shelf]').then(function (fresh) {
      if (!fresh) return; // the shelf simply stays hidden
      shelf.innerHTML = fresh.innerHTML;
      shelf.classList.add('is-filled');
      shelf.dispatchEvent(new CustomEvent('cvp:shelf', { bubbles: true }));
    });
  });

  /* ---------------------------------------------------------------- closer */
  $$('[data-cvp-closer]').forEach(function (closer) {
    var summary = closer.querySelector('[data-cvp-summary]');
    if (slip && summary) {
      slip.addEventListener('cvs:change', function (e) {
        var d = e.detail;
        if (!d || !d.variant) return;
        var total = document.getElementById('cvTotal');
        summary.textContent = d.variant.title + ' · ' + d.qty + (d.qty > 1 ? ' cases' : ' case') + (total && total.textContent ? ' · ' + total.textContent : '');
      });
    }
  });

  /* ---------------------------------------------------------------- photo reel */
  /* When the strip scrolls by hand (phones, tablets, reduced motion), keep the counter on the frame nearest the middle. */
  $$('[data-cvw-reel]').forEach(function (reel) {
    var viewport = reel.querySelector('[data-cvw-reel-viewport]');
    var now = reel.querySelector('[data-cvw-reel-now]');
    var frames = $$('[data-cvw-reel-frame]', reel);
    if (!viewport || !now || !frames.length) return;
    var ticking = false;
    viewport.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
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
  });

  /* ---------------------------------------------------------------- counter snapshots */
  /* Prev/next buttons page the pinned-photo strip by one frame; works with no GSAP too. */
  $$('[data-cvw-snap]').forEach(function (snap) {
    var viewport = snap.querySelector('[data-cvw-snap-viewport]');
    var frames = $$('[data-cvw-snap-frame]', snap);
    if (!viewport || !frames.length) return;
    $$('[data-cvw-snap-nav]', snap).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = Number(btn.getAttribute('data-cvw-snap-nav')) || 1;
        var step = frames[0].getBoundingClientRect().width + 22; /* frame width + gap */
        viewport.scrollBy({ left: step * dir, behavior: 'smooth' });
      });
    });
  });

  /* ---------------------------------------------------------------- counter clips */
  /* Each clip plays muted once it is actually on screen and stops when it leaves, so
     nothing ever plays out of sight. Every clip can be stopped by hand and stays
     stopped (WCAG 2.2.2), and under reduced motion none of them start on their own —
     the poster holds until the shopper presses play. Tapping a clip opens it large,
     where the native controls carry sound for any clip that has some. */
  $$('[data-cvw-ugc]').forEach(function (sec) {
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
      function resume() { if (seen && !byHand && !reduce && !(dialog && dialog.open)) start(); }

      video.addEventListener('play', function () { mark(true); });
      video.addEventListener('pause', function () { mark(false); });
      video.addEventListener('timeupdate', function () {
        if (bar && video.duration) bar.style.width = (video.currentTime / video.duration * 100) + '%';
      });

      if (playBtn) {
        playBtn.addEventListener('click', function () {
          if (video.paused) { byHand = false; start(); } else { byHand = true; video.pause(); }
        });
      }

      players.push({ video: video, resume: resume });

      if (!window.IntersectionObserver) { seen = true; resume(); return; }
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          seen = e.isIntersecting;
          if (seen) resume();
          else if (!video.paused) video.pause();
        });
      }, { threshold: 0.5 }).observe(clip);
    });

    if (!dialog || !stage || typeof dialog.showModal !== 'function') return;
    var opener = null;
    var closeBtn = sec.querySelector('[data-cvw-ugc-close]');

    $$('[data-cvw-ugc-clip]', sec).forEach(function (clip) {
      var open = clip.querySelector('[data-cvw-ugc-open]');
      var video = clip.querySelector('[data-cvw-ugc-video]');
      if (!open || !video) return;
      open.addEventListener('click', function () {
        var big = video.cloneNode(true);
        big.removeAttribute('data-cvw-ugc-video');
        big.removeAttribute('style'); /* drop the rail's scroll-pan transform */
        big.muted = true;     /* muted so it is allowed to start by itself… */
        big.controls = true;  /* …and the controls are there to turn sound on */
        big.loop = true;
        stage.innerHTML = '';
        stage.appendChild(big);
        opener = open;
        players.forEach(function (p) { p.video.pause(); });
        dialog.showModal();
        /* Close, not the video's own controls, takes the focus: it keeps the way
           out first in the tab order and out of the video's shadow DOM. */
        if (closeBtn) closeBtn.focus({ preventScroll: true });
        var p = big.play();
        if (p && p.catch) p.catch(function () {});
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
    /* Escape closes it here rather than leaving it to the dialog's own handling,
       which a focused <video controls> can swallow. */
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); dialog.close(); }
    });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', function () {
      stage.innerHTML = '';
      if (opener) { opener.focus({ preventScroll: true }); opener = null; }
      players.forEach(function (p) { p.resume(); });
    });
  });

  /* Every "back to the case" button, and the pack comparison's "choose" buttons, which pick that pack first. */
  $$('[data-cvp-back]').forEach(function (back) { back.addEventListener('click', backToSlip); });
  $$('[data-cvw-pack]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (slip) slip.dispatchEvent(new CustomEvent('cvs:pack', { detail: { qty: Number(btn.getAttribute('data-cvw-pack')) } }));
      backToSlip();
    });
  });
})();
