/* Casify: Apps section (sections/cv-apps.liquid).
 *
 *   - Reveal: the heading rises word by word, then each app's wrapper lifts
 *     in (the paper card, when framed). Only our wrappers move — never the
 *     app's own markup — and every transform is cleared afterwards, so apps
 *     with fixed-position popups or their own measurements are unaffected
 *     once the reveal ends. Merchants can switch the reveal off per section.
 *   - Layout sync: apps often inject their content seconds after load. When
 *     an app's height changes, ScrollTrigger is refreshed (debounced) so
 *     every scroll animation further down the page stays on its mark.
 * Reduced motion: no reveal; layout sync still runs.
 */
(function () {
  'use strict';

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }

  function destroy(root) {
    if (root && typeof root._cvapDestroy === 'function') root._cvapDestroy();
  }

  function init(root) {
    if (!root) return;
    destroy(root);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    var apps = all('[data-cvap-app]', root);
    var list = one('[data-cvap-apps]', root);
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wantsReveal = root.getAttribute('data-cvap-animate') !== 'false';
    var ro = null, refreshTimer = null, intro = null, split = null, context = null;

    root._cvapDestroy = function () {
      if (ro) ro.disconnect();
      clearTimeout(refreshTimer);
      if (intro) intro.kill();
      if (split) split.revert();
      if (context) context.revert();
      delete root._cvapDestroy;
      delete root._cvapFinish;
    };

    // ---- layout sync --------------------------------------------------------
    if (ScrollTrigger && list && 'ResizeObserver' in window) {
      var lastHeight = list.offsetHeight;
      ro = new ResizeObserver(function () {
        var h = list.offsetHeight;
        if (Math.abs(h - lastHeight) < 2) return;
        lastHeight = h;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 200);
      });
      ro.observe(list);
    }

    if (!gsap || reduce || !wantsReveal) return;

    // ---- reveal ---------------------------------------------------------------
    context = gsap.context(function () {
      var heading = one('[data-cvap-heading]', root);
      var fades = all('[data-cvap-fade]', root);
      var config = {
        defaults: { ease: 'expo.out' },
        onComplete: function () { if (split) { split.revert(); split = null; } }
      };
      if (ScrollTrigger) config.scrollTrigger = { trigger: root, start: 'top 85%', once: true };
      intro = gsap.timeline(config);

      if (heading && SplitText) {
        split = SplitText.create(heading, { type: 'words', mask: 'words' });
        intro.from(split.words, { yPercent: 115, duration: .9, stagger: .05 }, 0);
      } else if (heading) {
        intro.from(heading, { y: 18, autoAlpha: 0, duration: .8, clearProps: 'transform,opacity,visibility' }, 0);
      }
      if (fades.length) intro.from(fades, { y: 12, autoAlpha: 0, duration: .7, clearProps: 'transform,opacity,visibility' }, .15);

      if (apps.length) {
        intro.from(apps, {
          y: 28, autoAlpha: 0, duration: .9, stagger: .12,
          clearProps: 'transform,opacity,visibility'
        }, heading ? .25 : 0);
      }

      if (document.visibilityState === 'hidden') intro.progress(1);
    }, root);

    root._cvapFinish = function () { if (intro) intro.progress(1); };
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvap]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvap]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function rootOf(target) {
    if (!target) return null;
    return target.matches && target.matches('[data-cvap]') ? target : one('[data-cvap]', target);
  }

  boot(document);

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroy(rootOf(event.target)); });
  document.addEventListener('shopify:section:select', function (event) {
    var root = rootOf(event.target);
    if (root && root._cvapFinish) root._cvapFinish();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvap]');
    if (root && root._cvapFinish) root._cvapFinish();
  });
})();
