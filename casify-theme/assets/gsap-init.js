/* Casify — GSAP plugin registration.
 *
 * Runs after the deferred GSAP core and plugin files (see snippets/gsap.liquid)
 * and registers every plugin that loaded. Registering up front keeps later
 * scripts free of boilerplate: anything that runs after this can call
 * gsap.to(), ScrollTrigger.create(), SplitText.create() etc. directly.
 *
 * Order matters where one plugin builds on another: ScrollTrigger before
 * ScrollSmoother, CustomEase before CustomBounce/CustomWiggle,
 * MotionPathPlugin before MotionPathHelper.
 */
(function () {
  'use strict';

  if (!window.gsap) return;

  var names = [
    'CSSRulePlugin',
    'CustomEase', 'CustomBounce', 'CustomWiggle',
    'RoughEase', 'ExpoScaleEase', 'SlowMo',
    'InertiaPlugin', 'Draggable',
    'DrawSVGPlugin', 'MorphSVGPlugin',
    'EaselPlugin', 'PixiPlugin',
    'Flip', 'Observer',
    'MotionPathPlugin', 'MotionPathHelper',
    'Physics2DPlugin', 'PhysicsPropsPlugin',
    'ScrambleTextPlugin', 'TextPlugin', 'SplitText',
    'ScrollTrigger', 'ScrollSmoother', 'ScrollToPlugin',
    'GSDevTools'
  ];

  var plugins = [];
  names.forEach(function (name) {
    if (window[name]) plugins.push(window[name]);
  });

  window.gsap.registerPlugin.apply(window.gsap, plugins);

  // Speed: ScrollTrigger refreshes every trigger by itself on DOMContentLoaded and on load.
  // The section scripts also call ScrollTrigger.refresh() as they boot (deferred scripts run
  // just before DOMContentLoaded) and again from their own load listeners, so a phone measured
  // the whole page up to a dozen extra times while it loaded: each pass is a full layout, and
  // the load event alone held the main thread for about 1.3 s at 4x CPU throttling (2026-11-09 trace).
  // A plain refresh() that ScrollTrigger's own DOMContentLoaded refresh is about to cover, or
  // that comes in the same load event right after ScrollTrigger's own load refresh, is
  // dropped. Every other call runs at once, as before, so code that reads positions right
  // after its refresh (the 3D phone scan) is unchanged. If ScrollTrigger's own
  // DOMContentLoaded refresh did not happen, one dropped call runs in its place.
  if (window.ScrollTrigger && !window.ScrollTrigger._cvRefreshGate) {
    (function (ST) {
      var realRefresh = ST.refresh;
      var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
      var gate = nav && nav.domContentLoadedEventStart === 0 ? 'boot' : 'open';
      var dropped = false;
      var refreshes = 0;
      var atComplete = -1;
      ST._cvRefreshGate = true;
      ST.addEventListener('refresh', function () { refreshes++; });
      ST.refresh = function () {
        if (!arguments.length && gate !== 'open') { dropped = true; return; }
        return realRefresh.apply(ST, arguments);
      };
      if (gate === 'boot') {
        // Registered after ScrollTrigger's own listener, so this runs once its refresh is done.
        document.addEventListener('DOMContentLoaded', function () {
          gate = 'open';
          if (dropped && refreshes === 0) realRefresh.call(ST);
          dropped = false;
        }, { once: true });
      }
      document.addEventListener('readystatechange', function () {
        if (document.readyState === 'complete') atComplete = refreshes;
      });
      window.addEventListener('load', function () {
        if (atComplete < 0 || refreshes <= atComplete) return;
        gate = 'load';
        window.setTimeout(function () { gate = 'open'; }, 0);
      }, { once: true });
    })(window.ScrollTrigger);
  }

  // A live media switch (Reduce Motion turned on or off with the page open) rebuilds
  // every gsap.matchMedia branch. ScrollTrigger records the scroll before and restores
  // it after, but any trigger created or killed during the switch wipes that record and
  // the page lands at the top. Put the shopper back where they were.
  if (window.ScrollTrigger && window.gsap.addEventListener) {
    var scrollBefore = null;
    window.gsap.addEventListener('matchMediaInit', function () { scrollBefore = window.scrollY; });
    window.gsap.addEventListener('matchMedia', function () {
      if (scrollBefore !== null && Math.abs(window.scrollY - scrollBefore) > 1) window.scrollTo(0, scrollBefore);
      scrollBefore = null;
    });
  }
})();
