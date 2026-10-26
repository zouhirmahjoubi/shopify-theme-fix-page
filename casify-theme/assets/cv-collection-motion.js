/* Casify: collection grid motion (sections/cv-collection.liquid prints it, deferred).
 *
 *   stock   the shelf fills: cards drop in a row at a time as they scroll into view
 *           (ScrollTrigger.batch); results swapped in by a filter get the same drop below
 *           the fold, while cards already in view are left to the Flip in cv-pages.js
 *   add     single-variant cards add through cart.js (form[data-cart-add-form]); the button
 *           (data-cvm-btn) gets is-busy / is-done / is-error so cv-commerce-motion.js rolls the
 *           label and shakes on a failure. cart.js sends cart:added {source: 'card', from, img};
 *           the commerce fly lands it in the pack meter box marked data-cvm-bag.
 *
 * Without script, or with reduced motion, every card is plainly visible: the drop starts from
 * a state set inside gsap.matchMedia and is reverted with it. Listens for its own section's
 * shopify:section:load / unload; does not call cv-pages.js internals.
 */
(function () {
  'use strict';
  if (window.CasifyCollectionMotion) return;
  window.CasifyCollectionMotion = true;

  var gsap = window.gsap;
  var running = [];
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------ stock */
  function initStock(root) {
    var ST = window.ScrollTrigger;
    if (!gsap || !gsap.matchMedia || !ST) return null;
    var results = $('[data-cvl-swap="results"]', root) || root;
    var mm = gsap.matchMedia();
    var mo = null;
    mm.add('(prefers-reduced-motion: no-preference)', function (ctx) {
      function card(cell) { return $('.cvsh-card', cell) || cell; }
      function stock(skipInView) {
        var cells = $$('.cvl__cell', results).filter(function (c) {
          if (c._cvlStocked) return false;
          c._cvlStocked = true;
          return !(skipInView && c.getBoundingClientRect().top < window.innerHeight);
        });
        if (!cells.length) return;
        ctx.add(function () {
          /* Opacity only: a card waiting below the fold stays focusable and in the a11y tree. */
          cells.forEach(function (c, i) { gsap.set(card(c), { y: -24, rotation: i % 2 ? 1.5 : -1.5, opacity: 0 }); });
          ST.batch(cells, {
            start: 'top 92%',
            once: true,
            onEnter: function (batch) {
              gsap.to(batch.map(card), { y: 0, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.06, overwrite: true, clearProps: 'transform,opacity' });
            }
          });
        });
      }
      stock(false);
      /* Filters, sort and pages replace the results' children (cv-pages.js aisle swap). */
      if (window.MutationObserver) {
        mo = new MutationObserver(function () { stock(true); });
        mo.observe(results, { childList: true });
      }
      /* Tabbing to a card that has not dropped yet shows it at once. */
      function focusin(e) {
        var cell = e.target.closest && e.target.closest('.cvl__cell');
        if (cell) gsap.to(card(cell), { y: 0, rotation: 0, opacity: 1, duration: 0.2, overwrite: true, clearProps: 'transform,opacity' });
      }
      root.addEventListener('focusin', focusin);
      return function () {
        root.removeEventListener('focusin', focusin);
        if (mo) { mo.disconnect(); mo = null; }
        $$('.cvl__cell', results).forEach(function (c) { c._cvlStocked = false; });
      };
    });
    return function () { mm.revert(); };
  }

  function boot(scope) {
    var roots = $$('[data-cvl]', scope);
    if (scope.nodeType === 1 && scope.matches('[data-cvl]')) roots.unshift(scope);
    roots.forEach(function (root) {
      if (root._cvlmOn) return;
      root._cvlmOn = true;
      running.push({ el: root, off: initStock(root) || function () {} });
    });
  }
  function teardown(scope) {
    running = running.filter(function (r) {
      if (!scope.contains(r.el)) return true;
      try { r.off(); } catch (e) {}
      r.el._cvlmOn = false;
      return false;
    });
  }

  /* -------------------------------------------------------------------- add */
  /* Window listeners run after cart.js's document listener whatever the script order:
     capture keeps the button's markup, bubble puts it back after cart.js wrote its busy text
     over it, so the candy sign keeps its art and only [data-cvm-label] says "Adding". */
  function cvmButton(e) {
    var form = e.target;
    if (!form || !form.matches || !form.matches('form[data-cart-add-form]') || !form.closest('[data-cvl]')) return null;
    var btn = e.submitter && e.submitter.hasAttribute('data-cvm-btn') ? e.submitter : $('[data-cvm-btn]', form);
    return btn || null;
  }
  function say(key, fallback) {
    var d = document.getElementById('cm-cart-drawer');
    return (d && d.getAttribute('data-i18n-' + key)) || fallback;
  }
  function setLabel(btn, text) {
    var lb = $('[data-cvm-label]', btn);
    if (!lb || !text) return;
    if (lb._cvlHtml == null) lb._cvlHtml = lb.innerHTML;
    lb.textContent = text;
  }
  function resetLabel(btn) {
    var lb = $('[data-cvm-label]', btn);
    if (lb && lb._cvlHtml != null) { lb.innerHTML = lb._cvlHtml; lb._cvlHtml = null; }
  }
  var markup = new WeakMap();
  window.addEventListener('submit', function (e) {
    var btn = cvmButton(e);
    if (btn && btn.getAttribute('aria-busy') !== 'true') markup.set(btn, btn.innerHTML);
  }, true);
  window.addEventListener('submit', function (e) {
    var btn = cvmButton(e);
    var html = btn && markup.get(btn);
    if (!html || btn.getAttribute('aria-busy') !== 'true') return; // cart.js did not take this submit
    var busyText = (btn.textContent || '').trim();
    btn.innerHTML = html;
    setLabel(btn, busyText);
    window.clearTimeout(btn._cvlT);
    btn._cvlAdded = false;
    btn.classList.remove('is-done', 'is-error');
    btn.classList.add('is-busy');
    /* cart.js clears aria-busy and restores the markup once the add has settled. */
    var watch = new MutationObserver(function () {
      if (btn.getAttribute('aria-busy') === 'true') return;
      watch.disconnect();
      var ok = btn._cvlAdded;
      btn._cvlAdded = false;
      btn.classList.remove('is-busy');
      if (ok) setLabel(btn, say('added', 'Added to bag'));
      btn.classList.add(ok ? 'is-done' : 'is-error');
      btn._cvlT = window.setTimeout(function () {
        btn.classList.remove('is-done', 'is-error');
        resetLabel(btn);
      }, ok ? 1600 : 1200);
    });
    watch.observe(btn, { attributes: true, attributeFilter: ['aria-busy'] });
  });
  document.addEventListener('cart:added', function (e) {
    var d = e.detail || {};
    var from = d.from;
    if (d.source !== 'card' || !from || from.nodeType !== 1) return;
    var btn = from.matches('[data-cvm-btn]') ? from : $('[data-cvm-btn]', from);
    if (btn) btn._cvlAdded = true;
  });

  boot(document);
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) { teardown(e.target); });
})();
