/* Casify — product PDP renderer + cart interactions
   Reads window.CASIFY_ART (case-art SVGs) and window.CASIFY (product data).
   Honors prefers-reduced-motion for all animations. */
(function () {
  'use strict';
  if (!window.CASIFY_ART || !window.CASIFY) return;

  var A = window.CASIFY_ART;
  var C = window.CASIFY;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { family: 'iphone', model: C.models.iphone[0].name, color: 'candy', bundle: 0, qty: 1, bag: 0 };
  var artMap = A.artMap;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function money(c) { return '$' + (c / 100).toFixed(2).replace(/\.00$/, ''); }

  /* ---------- Thumbnail switcher ---------- */
  function bindThumbs(root) {
    $$('.cm-thumb', root || document).forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        $$('.cm-thumb', root || document).forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
        var art = thumb.dataset.art;
        var host = $('#caseArt');
        if (host && artMap[art]) host.innerHTML = artMap[art];
      });
    });
  }

  /* ---------- Swatch picker ---------- */
  function bindSwatches(root) {
    $$('.swatch', root || document).forEach(function (sw) {
      sw.addEventListener('click', function () {
        $$('.swatch', root || document).forEach(function (s) { s.classList.remove('is-selected'); });
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
  }

  /* ---------- Chip picker ---------- */
  function bindChips(root) {
    $$('.chip', root || document).forEach(function (ch) {
      ch.addEventListener('click', function () {
        $$('.chip', root || document).forEach(function (c) { c.classList.remove('is-selected'); });
        ch.classList.add('is-selected');
      });
    });
  }

  /* ---------- Tabs ---------- */
  function bindTabs(root) {
    $$('.tab', root || document).forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.tab', root || document).forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
      });
    });
  }

  /* ---------- Qty stepper ---------- */
  function bindStepper(root) {
    var minus = $('#qtyMinus', root || document);
    var plus = $('#qtyPlus', root || document);
    var qtyVal = $('#qtyVal', root || document);
    if (!minus || !plus || !qtyVal) return;
    function bump() { qtyVal.classList.remove('is-bumped'); void qtyVal.offsetWidth; qtyVal.classList.add('is-bumped'); }
    minus.addEventListener('click', function () {
      if (state.qty > 1) { state.qty--; qtyVal.textContent = state.qty; bump(); }
    });
    plus.addEventListener('click', function () {
      state.qty++; qtyVal.textContent = state.qty; bump();
    });
  }

  /* ---------- Stock + scarcity ---------- */
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

  /* ---------- Heart toggle ---------- */
  function bindHeart() {
    var heart = $('.heart');
    if (!heart) return;
    heart.addEventListener('click', function (e) {
      var b = e.currentTarget;
      b.classList.toggle('is-saved');
      var svg = b.querySelector('svg');
      if (svg) svg.setAttribute('fill', b.classList.contains('is-saved') ? 'currentColor' : 'none');
    });
  }

  /* ---------- Add to bag with bag-fly animation + toast ---------- */
  function addToBag(srcEl) {
    state.bag += state.qty;
    var badge = $('#bagBadge');
    if (badge) {
      badge.textContent = state.bag;
      badge.classList.remove('is-bump');
      void badge.offsetWidth;
      badge.classList.add('is-bump');
    }
    var host = $('#addPillHost');
    if (host) {
      var pill = document.createElement('span');
      pill.className = 'cm-add-pill';
      pill.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg> Added to bag';
      host.appendChild(pill);
      setTimeout(function () { if (pill.parentNode) pill.parentNode.removeChild(pill); }, 1700);
    }
    if (!REDUCED) {
      var bag = $('#bagBtn');
      if (bag) {
        var rect = (srcEl && srcEl.getBoundingClientRect) || bag.getBoundingClientRect();
        var start = srcEl ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : bag.getBoundingClientRect();
        var flyer = document.createElement('div');
        flyer.className = 'cm-bag-fly';
        flyer.style.left = (start.left + start.width / 2 - 24) + 'px';
        flyer.style.top = (start.top + start.height / 2 - 24) + 'px';
        flyer.innerHTML = '<svg viewBox="0 0 48 48" width="48" height="48"><path d="M14 16 h20 l-2 22 h-16 z M18 16 v-2 a6 6 0 0 1 12 0 v2" fill="#C4302B" stroke="#4A3324" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        document.body.appendChild(flyer);
        setTimeout(function () { if (flyer.parentNode) flyer.parentNode.removeChild(flyer); }, 720);
      }
    }
    toast('Added to bag', C.currentProduct.title);
  }

  function bindAdd() {
    var add = $('#addBtn');
    var addM = $('#addBtnMobile');
    if (add) add.addEventListener('click', function (e) { addToBag(e.currentTarget); });
    if (addM) addM.addEventListener('click', function (e) { addToBag(e.currentTarget); });
  }

  /* ---------- Toasts ---------- */
  function toast(title, body) {
    var host = $('#cm-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'cm-toast-host';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg><div><strong>' + title + '</strong>' + body + '</div>';
    host.appendChild(t);
    setTimeout(function () {
      t.classList.add('toast--leaving');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 280);
    }, 2400);
  }
  window.CASIFY_FNS = window.CASIFY_FNS || {};
  window.CASIFY_FNS.toastQuick = toast;

  /* ---------- Reveal on scroll ---------- */
  function reveal() {
    if (!('IntersectionObserver' in window)) {
      $$('[data-cm-reveal]').forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    $$('[data-cm-reveal]').forEach(function (el) { io.observe(el); });
  }

  /* ---------- Init ---------- */
  function init() {
    bindThumbs();
    bindSwatches();
    bindChips();
    bindTabs();
    bindStepper();
    bindHeart();
    bindAdd();
    renderStock();
    reveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
