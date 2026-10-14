/* Casify — Motion (motion.dev) enhancements.
 *
 * Printed by snippets/motion.liquid right after the Motion build, so it only
 * loads on pages whose markup has a data-motion-dev attribute, and
 * window.Motion exists when it runs. Each module no-ops without its markup.
 *
 *   data-motion-dev="cards"  a product grid: the cards rise in on a staggered
 *                            spring when the grid first scrolls into view
 *                            (grids already on screen at load stay as they
 *                            are), and lift a little on hover with a fine
 *                            pointer.
 *   data-motion-dev="faq"    a list of <details>: answers open and close on a
 *                            soft spring instead of snapping. Keyboard and
 *                            screen readers get the same <details> behaviour.
 *
 * Reduced motion, or no Motion: nothing moves and nothing is hidden.
 */
(function () {
  'use strict';

  var M = window.Motion;
  if (!M || !M.animate || !M.inView) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var LIFT = { type: 'spring', bounce: 0.3, duration: 0.5 };
  var OPEN = { type: 'spring', bounce: 0.1, duration: 0.45 };
  var CLOSE = { duration: 0.26, ease: [0.4, 0, 0.2, 1] };

  /* ---------- Product cards ---------- */
  function cards(grid) {
    var items = Array.prototype.slice.call(grid.children);
    if (!items.length) return;
    // Only a grid still below the fold starts hidden, so nothing on screen blinks.
    if (grid.getBoundingClientRect().top > window.innerHeight * 0.9) {
      M.animate(items, { opacity: 0, y: 32, scale: 0.96 }, { duration: 0 });
      M.inView(grid, function () {
        M.animate(items, { opacity: 1, y: 0, scale: 1 }, { type: 'spring', bounce: 0.32, duration: 0.8, delay: M.stagger(0.08) });
      }, { amount: 0.15 });
    }
    if (fine && M.hover) {
      items.forEach(function (card) {
        M.hover(card, function (el) {
          M.animate(el, { y: -6 }, LIFT);
          return function () { M.animate(el, { y: 0 }, LIFT); };
        });
      });
    }
  }

  /* ---------- FAQ accordion ---------- */
  function faq(list) {
    Array.prototype.forEach.call(list.querySelectorAll('details'), function (item) {
      var summary = item.querySelector('summary');
      var body = summary && summary.nextElementSibling;
      if (!body) return;
      var run = null;
      function settle() {
        body.style.height = body.style.paddingTop = body.style.paddingBottom = body.style.opacity = body.style.overflow = '';
        run = null;
      }
      // Motion commits its last frame after `finished` resolves: clear a frame later.
      function settleLater() { requestAnimationFrame(settle); }
      // Opened some other way (find in page, a script): show it as the HTML renders it.
      item.addEventListener('toggle', function () { if (!run) settle(); });
      summary.addEventListener('click', function (e) {
        e.preventDefault();
        if (run) run.stop();
        body.style.animation = 'none'; // the CSS rise would play on top of the spring
        body.style.overflow = 'hidden';
        var opening = !item.open || item.dataset.closing === '1';
        if (opening) {
          delete item.dataset.closing;
          item.open = true;
          settle();
          var cs = getComputedStyle(body);
          var pt = parseFloat(cs.paddingTop) || 0;
          var pb = parseFloat(cs.paddingBottom) || 0;
          var h = body.scrollHeight - pt - pb;
          body.style.overflow = 'hidden';
          run = M.animate(body, { height: [0, h + 'px'], paddingTop: [0, pt + 'px'], paddingBottom: [0, pb + 'px'], opacity: [0, 1] }, OPEN);
          run.finished.then(settleLater, function () {});
        } else {
          item.dataset.closing = '1';
          var now = getComputedStyle(body);
          run = M.animate(body, {
            height: [body.clientHeight - parseFloat(now.paddingTop) - parseFloat(now.paddingBottom) + 'px', '0px'],
            paddingTop: [now.paddingTop, '0px'], paddingBottom: [now.paddingBottom, '0px'], opacity: [1, 0]
          }, CLOSE);
          run.finished.then(function () {
            if (item.dataset.closing !== '1') return;
            delete item.dataset.closing;
            run = null;
            item.open = false;
            settleLater();
          }, function () {});
        }
      });
    });
  }

  var MODULES = { cards: cards, faq: faq };

  function boot(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-motion-dev]'), function (el) {
      if (el._cvMotionDev) return;
      var fn = MODULES[el.getAttribute('data-motion-dev')];
      if (!fn) return;
      el._cvMotionDev = true;
      fn(el);
    });
  }

  boot(document);
  // Theme editor: sections re-render in place.
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
})();
