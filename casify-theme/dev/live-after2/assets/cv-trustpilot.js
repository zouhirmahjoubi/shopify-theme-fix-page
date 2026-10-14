/* Casify: review rail (sections/cv-trustpilot.liquid).
 *
 * Entrance, choreographed like a shopkeeper pinning up the guest book:
 *   - heading rises word by word; the brass plaque swings up and its score
 *     counts from 0 while the stars fill left to right,
 *   - review letters are dealt onto the rail from the right, each landing
 *     with a small tilt before its candy-red edge draws down,
 *   - the "Based on" band lifts in and its number counts up.
 * Interaction:
 *   - mouse users can drag the rail with momentum (Draggable + Inertia);
 *     touch keeps native scrolling,
 *   - Previous/Next buttons glide one letter-width (ScrollToPlugin), the
 *     striped progress bar tracks the rail, buttons disable at the ends,
 *   - letters lift under the pointer.
 * The final numbers are already in the HTML; motion only animates up to
 * them. Reduced motion keeps the buttons and progress but no animation.
 */
(function () {
  'use strict';

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }
  function fmt(n, decimals) {
    // Format in the storefront's language (<html lang>), not the browser's.
    return Number(n).toLocaleString(document.documentElement.lang || undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function destroy(root) {
    if (root && typeof root._cvtrDestroy === 'function') root._cvtrDestroy();
  }

  function init(root) {
    if (!root) return;
    destroy(root);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    var Draggable = window.Draggable;
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var reduce = motionQuery.matches || !gsap;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cleanups = [];
    var intro = null, split = null, context = null, drag = null;

    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      cleanups.push(function () { target.removeEventListener(eventName, handler, options); });
    }

    root._cvtrDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      if (intro) intro.kill();
      if (split) split.revert();
      if (drag) drag.kill();
      if (context) context.revert();
      delete root._cvtrDestroy;
      delete root._cvtrFinish;
      delete root._cvtrShow;
    };

    function reinit() { init(root); }
    if (motionQuery.addEventListener) listen(motionQuery, 'change', reinit);
    else if (motionQuery.addListener) {
      motionQuery.addListener(reinit);
      cleanups.push(function () { motionQuery.removeListener(reinit); });
    }

    // Thousands separators for the counts (the HTML carries plain numbers).
    all('[data-cvtr-count], .cvtr-band__num', root).forEach(function (el) {
      var v = parseFloat(el.getAttribute('data-value') || el.textContent);
      if (!isNaN(v)) el.textContent = fmt(v, 0);
    });

    // ---- rail: buttons, progress, drag ------------------------------------
    var rail = one('[data-cvtr-rail]', root);
    var controls = one('[data-cvtr-controls]', root);
    var progress = one('[data-cvtr-progress]', root);
    var buttons = all('[data-cvtr-step]', root);

    function maxScroll() { return Math.max(0, rail.scrollWidth - rail.clientWidth); }
    function stepSize() {
      var card = one('[data-cvtr-card]', rail);
      if (!card) return rail.clientWidth * .8;
      var gap = parseFloat(getComputedStyle(rail).columnGap) || 20;
      var w = card.getBoundingClientRect().width + gap;
      return Math.max(w, Math.floor(rail.clientWidth / w) * w);
    }

    var setProgress = null;
    function sync() {
      var max = maxScroll();
      var p = max > 0 ? rail.scrollLeft / max : 1;
      if (setProgress) setProgress(p);
      else if (progress) progress.style.transform = 'scaleX(' + p + ')';
      buttons.forEach(function (b) {
        var dir = parseFloat(b.getAttribute('data-cvtr-step'));
        b.disabled = dir < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= max - 2;
      });
      if (controls) controls.hidden = max <= 2;
    }

    function glideTo(x) {
      x = Math.max(0, Math.min(maxScroll(), x));
      if (reduce || !window.ScrollToPlugin) {
        rail.scrollTo({ left: x, behavior: reduce ? 'auto' : 'smooth' });
        return;
      }
      rail.classList.add('is-dragging'); // suspends CSS snap while GSAP drives scrollLeft
      gsap.to(rail, {
        scrollTo: { x: x, autoKill: true }, duration: .8, ease: 'power3.inOut', overwrite: true,
        onComplete: function () { rail.classList.remove('is-dragging'); },
        onInterrupt: function () { rail.classList.remove('is-dragging'); }
      });
    }

    if (rail) {
      rail.classList.add('is-enhanced');
      if (!reduce && progress) setProgress = gsap.quickTo(progress, 'scaleX', { duration: .35, ease: 'power3.out' });
      buttons.forEach(function (b) {
        listen(b, 'click', function () {
          glideTo(rail.scrollLeft + parseFloat(b.getAttribute('data-cvtr-step')) * stepSize());
        });
      });
      listen(rail, 'scroll', sync, { passive: true });
      listen(window, 'resize', sync, { passive: true });
      sync();

      if (!reduce && finePointer && Draggable && window.InertiaPlugin && maxScroll() > 2) {
        rail.classList.add('is-draggable');
        // Drag a detached proxy and mirror its x into scrollLeft: Draggable's
        // own scrollLeft type wraps the children in a div, which would break
        // the <ul> rail. Touch input keeps native scrolling (mouse only here).
        var proxy = document.createElement('div');
        var startScroll = 0;
        drag = Draggable.create(proxy, {
          trigger: rail,
          type: 'x',
          inertia: true,
          minimumMovement: 6,
          allowNativeTouchScrolling: true,
          dragClickables: true,
          onPress: function () {
            gsap.killTweensOf(rail);
            startScroll = rail.scrollLeft;
            gsap.set(proxy, { x: 0 });
            this.update();
            this.applyBounds({ minX: startScroll - maxScroll(), maxX: startScroll });
          },
          onDragStart: function () { rail.classList.add('is-dragging'); },
          onDrag: function () { rail.scrollLeft = startScroll - this.x; },
          onThrowUpdate: function () { rail.scrollLeft = startScroll - this.x; },
          onRelease: function () { if (!this.isThrowing) rail.classList.remove('is-dragging'); },
          onThrowComplete: function () { rail.classList.remove('is-dragging'); }
        })[0];
      }

      // Editor: bring a selected review into view.
      root._cvtrShow = function (card) {
        if (!rail.contains(card)) return;
        glideTo(card.offsetLeft - (parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0));
      };
    }

    if (reduce) return;

    // ---- entrance ---------------------------------------------------------
    context = gsap.context(function () {
      var heading = one('[data-cvtr-heading]', root);
      var fades = all('[data-cvtr-fade]', root);
      var plaque = one('[data-cvtr-plaque]', root);
      var scoreEl = one('[data-cvtr-score]', root);
      var starsEl = one('[data-cvtr-stars] .cv-stars', root);
      var countEl = one('[data-cvtr-count]', root);
      var cards = rail ? all('[data-cvtr-card]', rail) : [];
      var band = one('[data-cvtr-band]', root);
      var bandNum = band && one('.cvtr-band__num', band);

      var config = {
        defaults: { ease: 'expo.out' },
        onComplete: function () { if (split) { split.revert(); split = null; } }
      };
      if (ScrollTrigger) config.scrollTrigger = { trigger: root, start: 'top 78%', once: true };
      intro = gsap.timeline(config);

      if (heading && SplitText) {
        split = SplitText.create(heading, { type: 'words', mask: 'words' });
        intro.from(split.words, { yPercent: 115, duration: 1, stagger: .06 }, 0);
      } else if (heading) {
        intro.from(heading, { y: 20, autoAlpha: 0, duration: .8, clearProps: 'transform,opacity,visibility' }, 0);
      }
      if (fades.length) intro.from(fades, { y: 12, autoAlpha: 0, duration: .7, clearProps: 'transform,opacity,visibility' }, .2);

      if (plaque) {
        intro.fromTo(plaque, { y: 26, rotation: -4, scale: .9, autoAlpha: 0 }, {
          y: 0, rotation: 0, scale: 1, autoAlpha: 1, duration: 1.1, ease: 'elastic.out(1, .6)',
          clearProps: 'transform,opacity,visibility'
        }, .3);
        if (scoreEl) {
          var target = parseFloat(scoreEl.getAttribute('data-value'));
          var decimals = (String(target).split('.')[1] || '').length;
          var s = { v: 0 };
          intro.to(s, {
            v: target, duration: 1.4, ease: 'power3.out',
            onUpdate: function () { scoreEl.textContent = s.v.toFixed(decimals); }
          }, .45);
        }
        if (starsEl) {
          var fill = starsEl.style.getPropertyValue('--fill') || '0%';
          intro.fromTo(starsEl, { '--fill': '0%' }, { '--fill': fill, duration: 1.4, ease: 'power2.inOut' }, .45);
        }
        if (countEl) {
          var c = { v: 0 }, total = parseFloat(countEl.getAttribute('data-value'));
          intro.to(c, {
            v: total, duration: 1.4, ease: 'power3.out',
            onUpdate: function () { countEl.textContent = fmt(Math.round(c.v), 0); }
          }, .45);
        }
      }

      if (cards.length) {
        var visible = cards.slice(0, 6);
        intro.fromTo(visible, {
          x: 90, y: 10, rotation: function (i) { return i % 2 ? 2.5 : -2; }, autoAlpha: 0
        }, {
          x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 1.1, stagger: .1,
          clearProps: 'transform,opacity,visibility'
        }, .5);
        var edges = visible.map(function (card) { return one('[data-cvtr-edge]', card); }).filter(Boolean);
        intro.from(edges, { scaleY: 0, duration: .7, stagger: .1, ease: 'power3.out', clearProps: 'transform' }, .95);
        var cardStars = [];
        visible.forEach(function (card) { cardStars = cardStars.concat(all('.cv-stars__row--fill .cv-stars__icon', card)); });
        if (cardStars.length) {
          intro.from(cardStars, { scale: 0, rotation: -35, transformOrigin: '50% 55%', duration: .3, stagger: .018, ease: 'back.out(2.6)', clearProps: 'transform' }, 1.05);
        }
      }

      if (band) {
        intro.from(band, { y: 24, autoAlpha: 0, duration: .9, clearProps: 'transform,opacity,visibility' }, .8);
        if (bandNum) {
          // Read the raw number, never the formatted text: "1.240" is 1240 in German.
          var bn = { v: 0 }, bt = parseFloat(bandNum.getAttribute('data-value'));
          if (!isNaN(bt)) {
            intro.to(bn, {
              v: bt, duration: 1.3, ease: 'power3.out',
              onUpdate: function () { bandNum.textContent = fmt(Math.round(bn.v), 0); }
            }, .9);
          }
        }
      }

      if (document.visibilityState === 'hidden') intro.progress(1);

      // ---- hover: letters lift, plaque tips ------------------------------
      if (finePointer) {
        cards.forEach(function (card) {
          var paper = one('.cvtr-card__paper', card);
          listen(card, 'pointerenter', function () {
            if (rail.classList.contains('is-dragging')) return;
            gsap.to(paper, { y: -6, rotation: -.6, duration: .4, ease: 'back.out(2)', overwrite: 'auto' });
          });
          listen(card, 'pointerleave', function () {
            gsap.to(paper, { y: 0, rotation: 0, duration: .5, ease: 'power3.out', overwrite: 'auto' });
          });
        });
        if (plaque && plaque.tagName === 'A') {
          listen(plaque, 'pointerenter', function () { gsap.to(plaque, { rotation: -1.5, y: -3, duration: .4, ease: 'back.out(2.5)', overwrite: 'auto' }); });
          listen(plaque, 'pointerleave', function () { gsap.to(plaque, { rotation: 0, y: 0, duration: .5, ease: 'power3.out', overwrite: 'auto' }); });
        }
      }
    }, root);

    root._cvtrFinish = function () { if (intro) intro.progress(1); };
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvtr]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvtr]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function rootOf(target) {
    if (!target) return null;
    return target.matches && target.matches('[data-cvtr]') ? target : one('[data-cvtr]', target);
  }

  boot(document);

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroy(rootOf(event.target)); });
  document.addEventListener('shopify:section:select', function (event) {
    var root = rootOf(event.target);
    if (root && root._cvtrFinish) root._cvtrFinish();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvtr]');
    if (!root) return;
    if (root._cvtrFinish) root._cvtrFinish();
    if (root._cvtrShow) root._cvtrShow(event.target);
  });
})();
