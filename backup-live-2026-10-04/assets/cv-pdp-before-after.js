/* Casify product page: before & after (sections/cv-pdp-before-after.liquid).
 *
 * Interaction (works with or without GSAP, and with reduced motion)
 *   - a full-size, invisible range input is the real control: keyboard
 *     arrows / Home / End and screen readers work natively;
 *   - pointer users drag anywhere on the photo (also on iOS, where a range
 *     only moves from its thumb); vertical page scrolling stays free;
 *   - labels fade as the divider nears their edge;
 *   - several comparisons become tabs (arrow keys move between them).
 * Motion (GSAP)
 *   - the heading rises word by word; the frame opens like shop shutters
 *     from the centre; the knob spins in and the labels slide from their
 *     sides;
 *   - then one teaching sweep: the divider glides right, left and back, so
 *     it's obvious the photo can be dragged. Any touch or key stops it;
 *   - dragging follows the pointer with a short ease; the knob squeezes
 *     while held.
 */
(function () {
  'use strict';

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function destroy(root) {
    if (root && typeof root._cvbaDestroy === 'function') root._cvbaDestroy();
  }

  function init(root) {
    if (!root) return;
    destroy(root);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var animate = !!gsap && !reduce;
    var cmps = all('[data-cvba-cmp]', root);
    var cleanups = [];
    var intro = null, split = null, context = null, demo = null;

    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      cleanups.push(function () { target.removeEventListener(eventName, handler, options); });
    }

    root._cvbaDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      if (demo) demo.kill();
      if (intro) intro.kill();
      if (split) split.revert();
      if (context) context.revert();
      delete root._cvbaDestroy;
      delete root._cvbaFinish;
    };

    if (!cmps.length) return;
    root.classList.remove('cvba--static');

    // ---- one comparison ----------------------------------------------------------
    var controllers = cmps.map(function (cmp) {
      var range = one('[data-cvba-range]', cmp);
      var frame = one('[data-cvba-frame]', cmp);
      var knob = one('[data-cvba-knob]', cmp);
      var labelBefore = one('[data-cvba-label-before]', cmp);
      var labelAfter = one('[data-cvba-label-after]', cmp);
      var beforeText = labelBefore ? labelBefore.textContent.trim() : 'Before';
      var start = parseFloat(cmp.getAttribute('data-start')) || 50;
      var state = { v: start };
      range.hidden = false;

      function apply() {
        var p = clamp(state.v, 0, 100);
        cmp.style.setProperty('--pos', p.toFixed(2) + '%');
        if (labelBefore) labelBefore.style.opacity = clamp((p - 6) / 14, 0, 1);
        if (labelAfter) labelAfter.style.opacity = clamp((94 - p) / 14, 0, 1);
      }
      var glide = animate
        ? gsap.quickTo(state, 'v', { duration: .35, ease: 'power3.out', onUpdate: apply })
        : function (v) { state.v = v; apply(); };

      function setFromUser(v, smooth) {
        v = clamp(v, 0, 100);
        range.value = Math.round(v);
        range.setAttribute('aria-valuetext', Math.round(v) + '% ' + beforeText);
        if (smooth) glide(v); else { state.v = v; apply(); }
      }

      function stopDemo() { if (demo) { demo.kill(); demo = null; } }

      // Keyboard / assistive tech.
      listen(range, 'input', function () { stopDemo(); setFromUser(parseFloat(range.value), true); });
      listen(range, 'keydown', stopDemo);

      // Pointer: drag anywhere on the photo.
      var dragging = false;
      function fromPointer(e) {
        var r = frame.getBoundingClientRect();
        return ((e.clientX - r.left) / r.width) * 100;
      }
      listen(range, 'pointerdown', function (e) {
        stopDemo();
        dragging = true;
        if (range.setPointerCapture) { try { range.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
        setFromUser(fromPointer(e), true);
        if (animate && knob) gsap.to(knob, { scaleX: .88, scaleY: 1.06, duration: .15, ease: 'power2.out', overwrite: 'auto' });
      });
      listen(range, 'pointermove', function (e) { if (dragging) setFromUser(fromPointer(e), true); });
      function release() {
        if (!dragging) return;
        dragging = false;
        if (animate && knob) gsap.to(knob, { scaleX: 1, scaleY: 1, duration: .5, ease: 'elastic.out(1, .45)', overwrite: 'auto', clearProps: 'transform' });
      }
      listen(range, 'pointerup', release);
      listen(range, 'pointercancel', release);
      listen(range, 'lostpointercapture', release);

      setFromUser(start, false);
      return { cmp: cmp, frame: frame, knob: knob, labels: [labelBefore, labelAfter].filter(Boolean), state: state, apply: apply, start: start };
    });

    // ---- tabs ------------------------------------------------------------------
    var tabs = all('[data-cvba-tab]', root);
    var tablist = one('[data-cvba-tabs]', root);
    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        controllers[k].cmp.hidden = !on;
      });
      if (focus) tabs[i].focus();
      var c = controllers[i];
      if (animate) {
        gsap.fromTo(c.frame, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .5, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
        sweep(c, .6);
      }
    }
    if (tabs.length > 1 && tablist && tabs.length === controllers.length) {
      tablist.hidden = false;
      tabs.forEach(function (tab, i) {
        listen(tab, 'click', function () { select(i, false); });
        listen(tab, 'keydown', function (e) {
          var n = tabs.length, j = null;
          if (e.key === 'ArrowRight') j = (i + 1) % n;
          else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
          else if (e.key === 'Home') j = 0;
          else if (e.key === 'End') j = n - 1;
          if (j !== null) { e.preventDefault(); select(j, true); }
        });
      });
      controllers.forEach(function (c, k) { c.cmp.hidden = k !== 0; });
    }

    // ---- teaching sweep ----------------------------------------------------------
    function sweep(c, delay) {
      if (!animate) return;
      if (demo) demo.kill();
      var s = c.start;
      demo = gsap.timeline({ delay: delay || 0, onComplete: function () { demo = null; } })
        .to(c.state, { v: clamp(s + 24, 8, 92), duration: .8, ease: 'power2.inOut', onUpdate: c.apply })
        .to(c.state, { v: clamp(s - 24, 8, 92), duration: 1.1, ease: 'power2.inOut', onUpdate: c.apply })
        .to(c.state, { v: s, duration: .8, ease: 'power2.inOut', onUpdate: c.apply });
    }

    if (!animate) return;

    // ---- entrance ----------------------------------------------------------------
    context = gsap.context(function () {
      var heading = one('[data-cvba-heading]', root);
      var fades = all('[data-cvba-fade]', root);
      var first = controllers[0];
      var config = {
        defaults: { ease: 'expo.out' },
        onComplete: function () {
          if (split) { split.revert(); split = null; }
          sweep(first, .1);
        }
      };
      if (ScrollTrigger) config.scrollTrigger = { trigger: first.frame, start: 'top 78%', once: true };
      intro = gsap.timeline(config);

      if (heading && SplitText) {
        split = SplitText.create(heading, { type: 'words', mask: 'words' });
        intro.from(split.words, { yPercent: 115, duration: .9, stagger: .06 }, 0);
      } else if (heading) {
        intro.from(heading, { y: 18, autoAlpha: 0, duration: .8, clearProps: 'transform,opacity,visibility' }, 0);
      }
      if (fades.length) intro.from(fades, { y: 12, autoAlpha: 0, duration: .7, clearProps: 'transform,opacity,visibility' }, .15);
      if (tablist && !tablist.hidden) intro.from(all('[data-cvba-tab]', tablist), { y: 10, autoAlpha: 0, duration: .5, stagger: .06, clearProps: 'transform,opacity,visibility' }, .2);

      // Shutters open from the centre.
      intro.fromTo(first.frame, { clipPath: 'inset(0% 50% 0% 50% round 14px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 1.1, ease: 'power4.inOut', clearProps: 'clipPath'
      }, .25);
      if (first.knob) {
        intro.from(first.knob, { scale: 0, rotation: -180, duration: .7, ease: 'back.out(2)', clearProps: 'transform' }, .95);
      }
      first.labels.forEach(function (label) {
        var fromLeft = label.classList.contains('cvba-cmp__label--before');
        intro.from(label, { x: fromLeft ? -30 : 30, duration: .6, clearProps: 'transform' }, 1.05);
      });

      if (document.visibilityState === 'hidden') intro.progress(1);
    }, root);

    root._cvbaFinish = function () {
      if (intro) intro.progress(1);
      if (demo) { demo.kill(); demo = null; }
      controllers.forEach(function (c) { c.state.v = c.start; c.apply(); });
    };
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvba]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvba]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function rootOf(target) {
    if (!target) return null;
    return target.matches && target.matches('[data-cvba]') ? target : one('[data-cvba]', target);
  }

  boot(document);

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroy(rootOf(event.target)); });
  document.addEventListener('shopify:section:select', function (event) {
    var root = rootOf(event.target);
    if (root && root._cvbaFinish) root._cvbaFinish();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvba]');
    if (root && root._cvbaFinish) root._cvbaFinish();
  });
})();
