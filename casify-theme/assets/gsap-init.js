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
