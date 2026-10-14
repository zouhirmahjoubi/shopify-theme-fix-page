/* Casify hanging cards: a short, one-time swing from a single top clasp.
 * Complete cards remain visible in CSS. GSAP moves only the inner assembly;
 * the list items keep their layout and links keep their native behaviour.
 */
(function () {
  'use strict';

  function all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function rootsIn(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvhang]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvhang]', scope));
    return roots;
  }

  function destroy(root) {
    if (root && typeof root._cvhangHangingDestroy === 'function') root._cvhangHangingDestroy();
  }

  function init(root) {
    destroy(root);

    var row = root.querySelector('[data-cvhang-row]');
    var gsap = window.gsap;
    if (!row || !gsap) return;

    var cards = all('[data-cvhang-card]', row);
    var swings = cards.map(function (card) { return card.querySelector('[data-cvhang-swing]'); }).filter(Boolean);
    if (!swings.length) return;

    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cleanups = [];
    var reveal = null;
    var trigger = null;
    var observer = null;
    var revealed = false;
    var drag = null;

    function listen(target, name, handler) {
      target.addEventListener(name, handler);
      cleanups.push(function () { target.removeEventListener(name, handler); });
    }

    function clearSwings() {
      drag = null;
      swings.forEach(function (swing) {
        if (swing._cvhangHangingNudge) {
          swing._cvhangHangingNudge.kill();
          delete swing._cvhangHangingNudge;
        }
      });
      gsap.killTweensOf(swings);
      gsap.set(swings, { clearProps: 'transform,transformOrigin,willChange' });
    }

    function finish() {
      if (trigger) { trigger.kill(); trigger = null; }
      if (observer) { observer.disconnect(); observer = null; }
      if (reveal) { reveal.kill(); reveal = null; }
      clearSwings();
      revealed = true;
    }

    root._cvhangHangingFinish = finish;
    root._cvhangHangingDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      finish();
      delete root._cvhangHangingDestroy;
      delete root._cvhangHangingFinish;
    };

    function onPreferenceChange() { init(root); }
    if (motionQuery.addEventListener) listen(motionQuery, 'change', onPreferenceChange);
    else if (motionQuery.addListener) {
      motionQuery.addListener(onPreferenceChange);
      cleanups.push(function () { motionQuery.removeListener(onPreferenceChange); });
    }

    if (motionQuery.matches) return;

    function playReveal() {
      if (revealed || reveal) return;
      if (observer) { observer.disconnect(); observer = null; }
      reveal = gsap.timeline({
        onComplete: function () {
          revealed = true;
          reveal = null;
          gsap.set(swings, { clearProps: 'transform,transformOrigin,willChange' });
        }
      });
      swings.forEach(function (swing, index) {
        var direction = index % 2 ? -1 : 1;
        var start = index * 0.15;
        reveal
          .to(swing, {
            y: 14, rotationZ: direction * 7, rotationY: direction * 24,
            transformOrigin: '50% 8px', transformPerspective: 900,
            willChange: 'transform', duration: 0.38, ease: 'power2.in'
          }, start)
          .to(swing, {
            y: 0, rotationZ: -direction * 4, rotationY: -direction * 9,
            duration: 0.48, ease: 'power2.out'
          }, start + 0.38)
          .to(swing, {
            rotationZ: direction * 1.6, rotationY: direction * 3,
            duration: 0.34, ease: 'sine.inOut'
          }, start + 0.86)
          .to(swing, {
            rotationZ: 0, rotationY: 0,
            duration: 0.42, ease: 'sine.out'
          }, start + 1.2);
      });
    }

    if (window.ScrollTrigger) {
      trigger = window.ScrollTrigger.create({
        trigger: row,
        start: 'top 84%',
        once: true,
        onEnter: playReveal
      });
    } else if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) playReveal();
      }, { rootMargin: '0px 0px -16% 0px' });
      observer.observe(row);
    } else {
      playReveal();
    }

    function nudge(swing) {
      if (!revealed || motionQuery.matches || (drag && drag.swing === swing)) return;
      if (swing._cvhangHangingNudge) swing._cvhangHangingNudge.kill();
      swing._cvhangHangingNudge = gsap.timeline({
        onComplete: function () { delete swing._cvhangHangingNudge; }
      })
        .to(swing, { rotationZ: 2.5, rotationY: 5, duration: 0.24, ease: 'power2.out', transformOrigin: '50% 8px', transformPerspective: 900 })
        .to(swing, { rotationZ: -1.2, rotationY: -2, duration: 0.34, ease: 'sine.inOut' })
        .to(swing, { rotationZ: 0, rotationY: 0, duration: 0.48, ease: 'sine.out', clearProps: 'transform,transformOrigin' });
    }

    function settle(swing) {
      if (swing._cvhangHangingNudge) {
        swing._cvhangHangingNudge.kill();
        delete swing._cvhangHangingNudge;
      }
      gsap.to(swing, {
        rotationZ: 0, rotationY: 0,
        duration: 0.9, ease: 'elastic.out(1, 0.55)', overwrite: 'auto',
        clearProps: 'transform,transformOrigin,willChange'
      });
    }

    function moveDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      var dx = event.clientX - drag.startX;
      var dy = event.clientY - drag.startY;
      if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx) * 1.3) {
        settle(drag.swing);
        drag = null;
        return;
      }
      if (Math.abs(dx) < 4 && !drag.moved) return;
      drag.moved = true;
      if (event.cancelable) event.preventDefault();
      var limit = Math.min(80, drag.card.offsetWidth * 0.35);
      var amount = Math.max(-1, Math.min(1, dx / Math.max(1, limit)));
      gsap.to(drag.swing, {
        rotationZ: amount * 8, rotationY: amount * 16,
        transformOrigin: '50% 8px', transformPerspective: 900,
        willChange: 'transform', duration: 0.18, ease: 'power2.out', overwrite: 'auto'
      });
    }

    function endDrag(event) {
      if (!drag || (event.pointerId != null && event.pointerId !== drag.pointerId)) return;
      var swing = drag.swing;
      drag = null;
      settle(swing);
    }

    if (finePointer) {
      listen(window, 'pointermove', moveDrag);
      listen(window, 'pointerup', endDrag);
      listen(window, 'pointercancel', endDrag);
      listen(window, 'blur', endDrag);
    }

    cards.forEach(function (card) {
      var swing = card.querySelector('[data-cvhang-swing]');
      if (!swing) return;
      if (finePointer) listen(card, 'pointerenter', function () { nudge(swing); });
      if (finePointer) {
        var body = card.querySelector('.cvhang__card');
        if (body) listen(body, 'pointerdown', function (event) {
          if (!revealed || motionQuery.matches || drag || event.pointerType === 'touch' || event.button !== 0) return;
          if (event.target.closest('a, button, input, select, textarea, summary, label, [contenteditable]')) return;
          if (swing._cvhangHangingNudge) {
            swing._cvhangHangingNudge.kill();
            delete swing._cvhangHangingNudge;
          }
          gsap.killTweensOf(swing);
          drag = { card: card, swing: swing, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
        });
      }
      listen(card, 'focusin', function (event) {
        if (!card.contains(event.relatedTarget)) nudge(swing);
      });
    });
  }

  function boot(scope) {
    rootsIn(scope).forEach(init);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  boot(document);
  window.addEventListener('load', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, { once: true });

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) {
    rootsIn(event.target).forEach(destroy);
  });
  document.addEventListener('shopify:section:select', function (event) {
    rootsIn(event.target).forEach(function (root) {
      if (root._cvhangHangingFinish) root._cvhangHangingFinish();
    });
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvhang]');
    if (root && root._cvhangHangingFinish) root._cvhangHangingFinish();
  });
})();
