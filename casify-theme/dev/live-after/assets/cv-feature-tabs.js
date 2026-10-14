/* Casify "Feature tabs": accessible tabs (click, arrow keys, Home/End) that swap a
 * media frame and copy. Only the open tab's video plays; each video has a pause
 * button, and nothing autoplays for reduced motion. GSAP adds a short crossfade
 * when it is loaded; without it the panels simply switch.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function rootsIn(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvft]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(Array.prototype.slice.call(scope.querySelectorAll('[data-cvft]')));
    return roots;
  }

  function setPlaying(panel, play) {
    var video = panel.querySelector('[data-cvft-video]');
    var toggle = panel.querySelector('[data-cvft-toggle]');
    if (!video) return;
    if (play) {
      var attempt = video.play();
      if (attempt && attempt.catch) attempt.catch(function () { sync(video, toggle); });
    } else {
      video.pause();
    }
    sync(video, toggle);
  }

  function sync(video, toggle) {
    if (!toggle) return;
    var playing = !video.paused;
    if (playing) toggle.setAttribute('data-playing', '');
    else toggle.removeAttribute('data-playing');
    toggle.setAttribute('aria-label', toggle.getAttribute(playing ? 'data-label-pause' : 'data-label-play'));
  }

  function init(root) {
    if (root._cvftDestroy) root._cvftDestroy();

    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-cvft-tab]'));
    var panels = tabs.map(function (tab) { return document.getElementById(tab.getAttribute('aria-controls')); });
    if (!tabs.length) return;

    var cleanups = [];
    var inView = false;
    var observer = null;

    function listen(target, name, handler) {
      target.addEventListener(name, handler);
      cleanups.push(function () { target.removeEventListener(name, handler); });
    }

    function current() {
      for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute('aria-selected') === 'true') return i;
      return 0;
    }

    function select(index, focus) {
      var previous = current();
      if (index === previous && !focus) return;
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        if (panels[i]) {
          panels[i].hidden = !active;
          if (!active) setPlaying(panels[i], false);
        }
      });
      if (focus) tabs[index].focus();
      var panel = panels[index];
      if (!panel) return;
      if (inView && !reduceMotion.matches) setPlaying(panel, true);
      if (window.gsap && !reduceMotion.matches && index !== previous) {
        window.gsap.fromTo(panel.querySelector('.cvft__media'), { autoAlpha: 0, y: 16, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out', clearProps: 'all' });
        window.gsap.fromTo(panel.querySelector('.cvft__copy'), { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: 0.45, delay: 0.08, ease: 'power2.out', clearProps: 'all' });
      }
    }

    tabs.forEach(function (tab, i) {
      listen(tab, 'click', function () { select(i, false); });
      listen(tab, 'keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        event.preventDefault();
        select(next, true);
      });
    });

    panels.forEach(function (panel) {
      if (!panel) return;
      var video = panel.querySelector('[data-cvft-video]');
      var toggle = panel.querySelector('[data-cvft-toggle]');
      if (!video || !toggle) return;
      listen(toggle, 'click', function () { setPlaying(panel, video.paused); });
      listen(video, 'play', function () { sync(video, toggle); });
      listen(video, 'pause', function () { sync(video, toggle); });
    });

    // Play the open tab's video only while the section is on screen.
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        var panel = panels[current()];
        if (panel) setPlaying(panel, inView && !reduceMotion.matches);
      }, { threshold: 0.25 });
      observer.observe(root);
    }

    root._cvftSelect = function (tab) {
      var index = tabs.indexOf(tab);
      if (index > -1) select(index, false);
    };
    root._cvftDestroy = function () {
      if (observer) observer.disconnect();
      cleanups.forEach(function (remove) { remove(); });
      panels.forEach(function (panel) { if (panel) setPlaying(panel, false); });
      delete root._cvftDestroy;
      delete root._cvftSelect;
    };
  }

  function boot(scope) { rootsIn(scope).forEach(init); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(document); }, { once: true });
  else boot(document);

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) {
    rootsIn(event.target).forEach(function (root) { if (root._cvftDestroy) root._cvftDestroy(); });
  });
  document.addEventListener('shopify:block:select', function (event) {
    var tab = event.target && event.target.closest && event.target.closest('[data-cvft-tab]');
    var root = tab && tab.closest('[data-cvft]');
    if (root && root._cvftSelect) root._cvftSelect(tab);
  });
})();
