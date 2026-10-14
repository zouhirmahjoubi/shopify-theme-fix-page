/* Casify Halo — product page interactions (chrome only; real product/variant
   state — price, stock, model/finish selection, add-to-cart — is owned by
   the inline <script> in sections/main-halo-product.liquid so there's a
   single source of truth. This file only handles behavior that's independent
   of which variant is selected.
   - colour swatch recolours the fallback case SVG via CSS variables
     (only relevant when a product has no real image and main-halo-product
     falls back to the drawn SVG; harmless no-op otherwise)
   - radiogroup arrow-key support for model/finish/tier
   - yellowing scrubber: tints the "TPU" sample by month (0..36)
   - drop bars: reveal-on-scroll fill animation
   - sticky mobile ATC: appears when main CTA scrolls off
   - dispatch countdown: counts to the next 19:00 UTC cutoff
   - IntersectionObserver reveal for [data-halo-reveal]
*/
(function () {
  'use strict';

  var root = document.querySelector('.halo-tpl');
  if (!root) return;

  // -------- Reveal on scroll --------
  var reveals = document.querySelectorAll('[data-halo-reveal]');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-revealed'); });
  }

  // -------- Radiogroup arrow-key support (no state, no display writes —
  // click-selection and all price/model/stock display updates are handled
  // by main-halo-product.liquid's own script) --------
  function wireArrowKeys(selector) {
    var items = Array.prototype.slice.call(document.querySelectorAll(selector));
    items.forEach(function (el, i) {
      el.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
        var n = i, guard = 0;
        do { n = (n + dir + items.length) % items.length; guard++; }
        while (items[n].dataset.stock === 'out' && guard < items.length);
        items[n].focus(); items[n].click();
      });
    });
  }
  wireArrowKeys('.halo-model');
  wireArrowKeys('.halo-sw');
  wireArrowKeys('.halo-tier');

  // -------- Colour swatches: recolour the fallback SVG case art via CSS
  // variables. Only visually relevant when main-halo-product.liquid has no
  // real product image and renders the drawn <svg class="halo-case-svg">
  // fallback instead of a photo. --------
  document.querySelectorAll('.halo-sw').forEach(function (el) {
    el.addEventListener('click', function () {
      if (el.dataset.stock === 'out') return;
      var r = document.documentElement.style;
      if (el.dataset.a)     r.setProperty('--case-a',     el.dataset.a);
      if (el.dataset.b)     r.setProperty('--case-b',     el.dataset.b);
      if (el.dataset.inner) r.setProperty('--case-inner', el.dataset.inner);
      if (el.dataset.edge)  r.setProperty('--case-edge',  el.dataset.edge);
    });
  });

  // -------- Yellowing scrubber --------
  var slider   = document.getElementById('haloAge');
  var monthOut = document.getElementById('haloMonth');
  var ageShell = document.getElementById('haloAgeShell');
  var verdictA = document.getElementById('haloVerdictA');

  function age() {
    if (!slider) return;
    var m = parseInt(slider.value, 10);
    var t = m / 36;
    var rC = Math.round(233 + (222 - 233) * t);
    var gC = Math.round(236 + (196 - 236) * t);
    var bC = Math.round(241 + (128 - 241) * t);
    if (ageShell) ageShell.setAttribute('fill', 'rgb(' + rC + ',' + gC + ',' + bC + ')');
    if (monthOut) monthOut.textContent = 'Month ' + m;
    slider.setAttribute('aria-valuetext', 'Month ' + m);
    if (verdictA) {
      if (m < 3)        verdictA.textContent = 'No visible change';
      else if (m < 8)   verdictA.textContent = 'Faint tint starting';
      else if (m < 16)  verdictA.textContent = 'Clearly yellowed';
      else if (m < 26)  verdictA.textContent = 'Most people replace it here';
      else              verdictA.textContent = 'Deep amber — unusable';
      verdictA.className = 'halo-yc__verdict ' + (m < 3 ? 'good' : 'bad');
    }
  }
  if (slider) { slider.addEventListener('input', age); age(); }

  // -------- Drop bars reveal (width animation matches preview) --------
  var bars = document.getElementById('haloBars');
  if (bars) {
    var fill = function () {
      bars.querySelectorAll('.halo-bfill').forEach(function (b) { b.style.width = b.dataset.pct + '%'; });
    };
    if (!('IntersectionObserver' in window)) fill();
    else new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { fill(); obs.disconnect(); } });
    }, { threshold: 0.35 }).observe(bars);
  }

  // -------- Sticky mobile ATC --------
  var addBtn = document.getElementById('haloAddBtn');
  var sticky = document.getElementById('haloSticky');
  if (addBtn && sticky && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { sticky.classList.toggle('is-visible', !en.isIntersecting); });
    }, { threshold: 0 }).observe(addBtn);
  }

  // -------- Dispatch clock --------
  var clock = document.getElementById('haloClock');
  function tickClock() {
    if (!clock) return;
    var now = new Date();
    var cut = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 19, 0, 0));
    if (cut <= now) cut = new Date(cut.getTime() + 864e5);
    var d = cut - now;
    var h = Math.floor(d / 36e5), m = Math.floor(d % 36e5 / 6e4);
    clock.textContent = h + 'h ' + m + 'm';
  }
  tickClock(); setInterval(tickClock, 30000);

  // -------- Thumb tabs (visual-only fallback; main-halo-product.liquid's
  // own script also binds .halo-thumb[data-full-src] to swap the image) --------
  var thumbs = document.querySelectorAll('.halo-thumb');
  thumbs.forEach(function (t) {
    t.addEventListener('click', function () {
      thumbs.forEach(function (o) { o.setAttribute('aria-selected', 'false'); });
      t.setAttribute('aria-selected', 'true');
    });
  });
})();
