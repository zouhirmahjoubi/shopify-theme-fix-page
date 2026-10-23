/* Casify: shared page helpers (loaded on every page, defer).
   - Toasts: window.CASIFY_FNS.toastQuick(title, body, tone). tone 'danger'
     adds .toast--danger and role="alert"; anything else is a success toast
     (role="status").
   - [data-cm-reveal] reveal on scroll, rescanned on shopify:section:load.
   - Legacy PDP demo bindings (thumbs, swatches, chips, tabs, stepper,
     stock row, heart) that read window.CASIFY_ART / window.CASIFY from
     casify-data.js. Each no-ops without its markup.
   Toasts and reveals do not depend on casify-data.js, so a failed data file
   never leaves [data-cm-reveal] content hidden. Honors prefers-reduced-motion
   through the CSS mirror in theme.css. */
(function () {
  'use strict';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- Toasts ---------- */
  /* Titles and bodies arrive from cart responses (product titles, error
     descriptions), so they are inserted as text, never as markup. */
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 12 10 18 20 6"/></svg>';
  var ICON_DANGER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.6"/></svg>';

  function toast(title, body, tone) {
    var danger = tone === 'danger';
    var host = $('#cm-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'cm-toast-host';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    var t = document.createElement('div');
    t.className = danger ? 'toast toast--danger' : 'toast';
    t.setAttribute('role', danger ? 'alert' : 'status');
    t.innerHTML = (danger ? ICON_DANGER : ICON_OK) + '<div><strong>' + escapeHtml(title) + '</strong>' + escapeHtml(body) + '</div>';
    host.appendChild(t);
    /* Errors stay a little longer so they can be read. */
    setTimeout(function () {
      t.classList.add('toast--leaving');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 280);
    }, danger ? 4000 : 2400);
    return t;
  }
  window.CASIFY_FNS = window.CASIFY_FNS || {};
  window.CASIFY_FNS.toastQuick = toast;

  /* ---------- Reveal on scroll: [data-cm-reveal] ---------- */
  var revealIO = null;
  function reveal(scope) {
    var els = $$('[data-cm-reveal]:not(.is-revealed)', scope || document);
    if (scope && scope.matches && scope.matches('[data-cm-reveal]:not(.is-revealed)')) els.unshift(scope);
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-revealed'); revealIO.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
    }
    els.forEach(function (el) { revealIO.observe(el); });
  }

  /* Theme editor: a section added or re-rendered there is new markup. */
  document.addEventListener('shopify:section:load', function (e) {
    reveal(e.target);
    /* halo.js observes [data-halo-reveal] once at boot and has no editor rescan,
       so a section added or re-rendered in the editor shows its halo copy finished. */
    $$('[data-halo-reveal]:not(.is-revealed)', e.target).forEach(function (el) { el.classList.add('is-revealed'); });
  });
  function finishReveal(e) {
    $$('[data-cm-reveal]', e.target).forEach(function (el) {
      el.classList.add('is-revealed');
      if (revealIO) revealIO.unobserve(el);
    });
  }
  document.addEventListener('shopify:section:select', finishReveal);
  document.addEventListener('shopify:block:select', finishReveal);
  /* A visitor who switches reduced motion on mid-visit sees everything at once. */
  var rmQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (rmQuery) {
    var onRm = function (q) { if (q.matches) finishReveal({ target: document }); };
    if (rmQuery.addEventListener) rmQuery.addEventListener('change', onRm);
    else if (rmQuery.addListener) rmQuery.addListener(onRm);
  }

  /* ---------- Legacy PDP demo bindings ---------- */
  function bindLegacy() {
    if (!window.CASIFY_ART || !window.CASIFY) return;
    var A = window.CASIFY_ART;
    var C = window.CASIFY;
    var artMap = A.artMap || {};
    var state = { color: 'candy', qty: 1 };

    $$('.cm-thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        $$('.cm-thumb').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
        var art = thumb.dataset.art;
        var host = $('#caseArt');
        if (host && artMap[art]) host.innerHTML = artMap[art];
      });
    });

    $$('.swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        $$('.swatch').forEach(function (s) { s.classList.remove('is-selected'); });
        sw.classList.add('is-selected');
        var cn = $('#colourName');
        if (cn) cn.textContent = sw.dataset.name;
        var art = sw.dataset.art;
        var host = $('#caseArt');
        if (host && artMap[art]) host.innerHTML = artMap[art];
        $$('.cm-thumb').forEach(function (t) { t.classList.toggle('is-active', t.dataset.art === art); });
        renderStock();
      });
    });

    $$('.chip').forEach(function (ch) {
      ch.addEventListener('click', function () {
        $$('.chip').forEach(function (c) { c.classList.remove('is-selected'); });
        ch.classList.add('is-selected');
      });
    });

    $$('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.tab').forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
      });
    });

    var minus = $('#qtyMinus');
    var plus = $('#qtyPlus');
    var qtyVal = $('#qtyVal');
    if (minus && plus && qtyVal) {
      var bump = function () { qtyVal.classList.remove('is-bumped'); void qtyVal.offsetWidth; qtyVal.classList.add('is-bumped'); };
      minus.addEventListener('click', function () {
        if (state.qty > 1) { state.qty--; qtyVal.textContent = state.qty; bump(); }
      });
      plus.addEventListener('click', function () {
        state.qty++; qtyVal.textContent = state.qty; bump();
      });
    }

    function renderStock() {
      var n = (C.stockByColor && C.stockByColor[state.color]) || 0;
      var row = $('#stockRow');
      var fill = $('.cm-scarcity__fill');
      if (!row) return;
      if (n === 0) {
        row.innerHTML = '<span class="low" style="color:var(--cocoa-500)">Sold out in this colour. Other colours still in stock.</span>';
        if (fill) { fill.style.width = '100%'; fill.style.background = 'var(--cocoa-500)'; }
      } else {
        var scarcity = Math.min(100, Math.max(8, 100 - n * 4));
        row.innerHTML = '<span class="dot-live"></span><span class="low">In stock &middot; only ' + n + ' left in ' + (state.color || 'candy') + '</span>';
        if (fill) { fill.style.width = scarcity + '%'; fill.style.background = 'var(--red-500)'; }
      }
    }
    renderStock();

    var heart = $('.heart');
    if (heart) {
      heart.addEventListener('click', function (e) {
        var b = e.currentTarget;
        b.classList.toggle('is-saved');
        var svg = b.querySelector('svg');
        if (svg) svg.setAttribute('fill', b.classList.contains('is-saved') ? 'currentColor' : 'none');
      });
    }
  }

  /* ---------- Init ---------- */
  function init() {
    reveal(document);
    /* The layout's reveal check (layout/theme.liquid) reads this flag together
       with CVMotion.ready; without it every page gets html.cv-reveal-timeout. */
    window.CASIFY_FNS.revealReady = true;
    bindLegacy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
