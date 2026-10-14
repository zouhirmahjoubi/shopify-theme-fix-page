/* Casify: Facebook reviews motion (sections/facebook-reviews.liquid).
 *
 * Replaces Elixir's "reveal on scroll" with a live-thread entrance:
 *   - the title rises word by word; the blue badge pops in and its Facebook
 *     mark spins into place;
 *   - as each comment scrolls into view, the profile picture pops in, the
 *     grey card grows from its top-left corner, a three-dot "typing"
 *     indicator bounces, then the name and comment appear, followed by the
 *     Like · Reply · time row;
 *   - on fine pointers a comment card lifts slightly under the cursor.
 * The finished layout is the plain HTML/CSS state; reduced motion skips all
 * of it, and in the theme editor selecting the section or a review shows
 * the final state immediately.
 */
(function () {
  'use strict';

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }

  function destroy(root) {
    if (root && typeof root._cvfrDestroy === 'function') root._cvfrDestroy();
  }

  function init(root) {
    if (!root) return;
    destroy(root);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var items = all('[data-cvfr-item]', root);
    var cleanups = [];
    var context = null, split = null;

    function listen(target, eventName, handler) {
      target.addEventListener(eventName, handler);
      cleanups.push(function () { target.removeEventListener(eventName, handler); });
    }

    function finish() {
      // Reverting the context restores the untouched HTML/CSS state.
      if (context) { context.revert(); context = null; }
      if (split) { split.revert(); split = null; }
      all('.cvfr-typing', root).forEach(function (dots) { dots.remove(); });
    }

    root._cvfrFinish = finish;
    root._cvfrDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      finish();
      delete root._cvfrDestroy;
      delete root._cvfrFinish;
    };

    function parts(item) {
      return {
        pic: one('.profile-pic', item),
        card: one('.fb-comment-card', item),
        content: all('.reviewer-name, .fb-comment-text', item),
        meta: one('.review-meta', item)
      };
    }

    function arrive(item) {
      var p = parts(item);
      var dots = document.createElement('span');
      dots.className = 'cvfr-typing';
      dots.setAttribute('aria-hidden', 'true');
      dots.innerHTML = '<i></i><i></i><i></i>';
      p.card.appendChild(dots);

      var tl = gsap.timeline({ onComplete: function () { dots.remove(); } });
      if (p.pic) tl.to(p.pic, { scale: 1, autoAlpha: 1, duration: .45, ease: 'back.out(2.2)', clearProps: 'transform,opacity,visibility' }, 0);
      tl.to(p.card, { scale: 1, autoAlpha: 1, duration: .55, ease: 'back.out(1.5)', clearProps: 'transform,transformOrigin,opacity,visibility' }, .1)
        .fromTo(dots.children, { y: 0 }, { y: -3, duration: .18, ease: 'sine.inOut', yoyo: true, repeat: 3, stagger: .09 }, .28)
        .to(dots, { autoAlpha: 0, duration: .15 }, .92)
        .to(p.content, { y: 0, autoAlpha: 1, duration: .5, stagger: .07, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, .95);
      if (p.meta) tl.to(p.meta, { y: 0, autoAlpha: 1, duration: .45, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, 1.12);
      return tl;
    }

    context = gsap.context(function () {
      // ---- title + badge -------------------------------------------------
      var title = one('[data-cvfr-title]', root);
      var badge = one('[data-cvfr-badge]', root);
      var badgeIcon = one('[data-cvfr-badge-icon]', root);
      var head = gsap.timeline({
        paused: !!ScrollTrigger,
        defaults: { ease: 'expo.out' },
        onComplete: function () { if (split) { split.revert(); split = null; } }
      });
      if (title && SplitText) {
        split = SplitText.create(title, { type: 'words', mask: 'words' });
        head.from(split.words, { yPercent: 115, duration: .95, stagger: .06 }, 0);
      } else if (title) {
        head.from(title, { y: 18, autoAlpha: 0, duration: .8, clearProps: 'transform,opacity,visibility' }, 0);
      }
      if (badge) {
        head.from(badge, { scale: .6, y: 8, autoAlpha: 0, duration: .6, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' }, .3);
        if (badgeIcon) head.from(badgeIcon, { rotation: -180, scale: 0, duration: .7, ease: 'back.out(2.2)', transformOrigin: '50% 50%', clearProps: 'transform' }, .38);
      }
      if (ScrollTrigger) {
        ScrollTrigger.create({ trigger: root, start: 'top 82%', once: true, onEnter: function () { head.play(); } });
      }

      // ---- comments arrive as they scroll in -------------------------------
      items.forEach(function (item) {
        var p = parts(item);
        if (p.pic) gsap.set(p.pic, { scale: 0, autoAlpha: 0 });
        gsap.set(p.card, { scale: .6, autoAlpha: 0, transformOrigin: '0% 0%' });
        gsap.set(p.content, { y: 6, autoAlpha: 0 });
        if (p.meta) gsap.set(p.meta, { y: 4, autoAlpha: 0 });
      });

      if (ScrollTrigger && items.length) {
        ScrollTrigger.batch(items, {
          start: 'top 90%',
          once: true,
          onEnter: function (batch) {
            // Register late-created timelines with the context so finish()
            // and teardown revert them too.
            if (!context) return;
            context.add(function () {
              batch.forEach(function (item, i) { arrive(item).delay(i * .16); });
            });
          }
        });
      } else {
        items.forEach(function (item, i) { arrive(item).delay(i * .16); });
      }

      // ---- hover -------------------------------------------------------------
      if (canHover) {
        items.forEach(function (item) {
          var card = parts(item).card;
          listen(item, 'pointerenter', function () {
            gsap.to(card, { y: -2, boxShadow: '0 6px 16px rgba(0,0,0,.12)', duration: .3, ease: 'power3.out', overwrite: 'auto' });
          });
          listen(item, 'pointerleave', function () {
            gsap.to(card, { y: 0, boxShadow: '0 1px 2px rgba(0,0,0,.1)', duration: .4, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform,boxShadow' });
          });
        });
      }

      if (document.visibilityState === 'hidden') head.progress(1);
    }, root);

    if (document.visibilityState === 'hidden') finish();
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvfr]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvfr]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function rootOf(target) {
    if (!target) return null;
    return target.matches && target.matches('[data-cvfr]') ? target : one('[data-cvfr]', target);
  }

  boot(document);

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroy(rootOf(event.target)); });
  document.addEventListener('shopify:section:select', function (event) {
    var root = rootOf(event.target);
    if (root && root._cvfrFinish) root._cvfrFinish();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvfr]');
    if (root && root._cvfrFinish) root._cvfrFinish();
  });
})();
