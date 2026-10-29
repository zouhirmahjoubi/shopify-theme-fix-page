/* Casify: showcase cards motion (sections/cv-showcase.liquid).
 *
 * The card is treated like a small shop-window display: it settles onto the
 * counter, the product image opens behind glass, the badge stamps down, and
 * the enamel CTA sign assembles last. Pointer-capable devices get a restrained
 * depth response plus the same peppermint/sign gesture used by the header.
 *
 * The finished UI is the default HTML/CSS state. Motion is enhancement only,
 * supports multiple section instances, and re-initialises in Shopify's editor.
 *
 * With a card for every product the row is a sideways rail. Only the cards in
 * view when the row arrives are dealt; the rest wait at rest off to the side.
 * The rail controller (previous/next buttons, progress bar, "1-3 of 31") runs
 * without GSAP and under reduced motion.
 */
(function () {
  'use strict';

  function one(selector, context) {
    return (context || document).querySelector(selector);
  }

  function all(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }

  function destroy(root) {
    if (root && typeof root._cvshDestroy === 'function') root._cvshDestroy();
    if (root && typeof root._cvshRailDestroy === 'function') root._cvshRailDestroy();
  }

  function initRail(root) {
    if (!root) return;
    if (typeof root._cvshRailDestroy === 'function') root._cvshRailDestroy();

    var row = one('[data-cvsh-row]', root);
    var prev = one('[data-cvsh-prev]', root);
    var next = one('[data-cvsh-next]', root);
    if (!row || !prev || !next) return;

    var thumb = one('[data-cvsh-thumb]', root);
    var count = one('[data-cvsh-count]', root);
    var cards = all('[data-cvsh-card]', row);
    var total = cards.length;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var frame = 0;
    var cleanups = [];

    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      cleanups.push(function () { target.removeEventListener(eventName, handler, options); });
    }

    function gap() {
      return parseFloat(window.getComputedStyle(row).columnGap) || 0;
    }

    function stepWidth() {
      return cards.length ? cards[0].getBoundingClientRect().width + gap() : row.clientWidth;
    }

    function perView() {
      return Math.max(1, Math.floor((row.clientWidth + gap() + 2) / stepWidth()));
    }

    function update() {
      frame = 0;
      var max = row.scrollWidth - row.clientWidth;
      var left = Math.max(0, Math.min(max, row.scrollLeft));
      var atEnd = left >= max - 2;
      prev.disabled = left <= 2;
      next.disabled = atEnd;
      root.classList.toggle('is-static', max <= 2);

      if (count) {
        var shown = perView();
        var first = Math.min(total, Math.round(left / stepWidth()) + 1);
        var last = Math.min(total, first + shown - 1);
        if (atEnd) { last = total; first = Math.max(1, total - shown + 1); }
        count.textContent = (first === last ? first : first + ' to ' + last) + ' of ' + total;
      }

      if (thumb && thumb.parentNode && row.scrollWidth > 0) {
        // Thumb shows the share in view, never thinner than a fingertip-readable 28px.
        var trackWidth = thumb.parentNode.clientWidth;
        var thumbWidth = Math.min(trackWidth, Math.max(28, trackWidth * row.clientWidth / row.scrollWidth));
        var progress = max > 0 ? left / max : 0;
        thumb.style.width = thumbWidth + 'px';
        thumb.style.transform = 'translateX(' + (progress * (trackWidth - thumbWidth)) + 'px)';
      }
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    function page(direction) {
      row.scrollBy({ left: direction * perView() * stepWidth(), behavior: reduce.matches ? 'auto' : 'smooth' });
    }

    listen(prev, 'click', function () { page(-1); });
    listen(next, 'click', function () { page(1); });
    listen(row, 'scroll', schedule, { passive: true });
    listen(window, 'resize', schedule);

    update();

    root._cvshRailDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      if (frame) window.cancelAnimationFrame(frame);
      delete root._cvshRailDestroy;
    };
  }

  function init(root) {
    if (!root) return;
    if (typeof root._cvshDestroy === 'function') root._cvshDestroy();

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var row = one('[data-cvsh-row]', root);
    if (!row || !gsap) return;

    var cards = all('[data-cvsh-card]', row);
    if (!cards.length) return;

    // Deal only what the row shows; cards further along the rail sit at rest.
    var rowBox = row.getBoundingClientRect();
    var dealt = cards.filter(function (card) {
      var box = card.getBoundingClientRect();
      return box.left < rowBox.right - 1 && box.right > rowBox.left + 1;
    });
    if (!dealt.length) dealt = cards.slice(0, 3);

    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cleanups = [];
    var animated = [];
    var timeline = null;
    var context = null;

    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      cleanups.push(function () { target.removeEventListener(eventName, handler, options); });
    }

    function finish() {
      if (timeline) timeline.progress(1, false);
      gsap.set(cards, { clearProps: 'transform,opacity,visibility,zIndex,willChange' });
      all('[data-cvsh-media], [data-cvsh-badge], [data-cvsh-price], [data-cvsh-cta], .cvsh-stars__star', root).forEach(function (element) {
        gsap.set(element, { clearProps: 'transform,opacity,visibility,clipPath,willChange' });
      });
    }

    root._cvshFinish = finish;
    root._cvshDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      if (timeline) timeline.kill();
      animated.forEach(function (element) { gsap.killTweensOf(element); });
      if (context) context.revert();
      delete root._cvshDestroy;
      delete root._cvshFinish;
    };

    function reinitForMotionPreference() { init(root); }
    if (motionQuery.addEventListener) listen(motionQuery, 'change', reinitForMotionPreference);
    else if (motionQuery.addListener) {
      motionQuery.addListener(reinitForMotionPreference);
      cleanups.push(function () { motionQuery.removeListener(reinitForMotionPreference); });
    }

    if (motionQuery.matches) return;

    context = gsap.context(function () {
      var timelineConfig = {
        defaults: { ease: 'power4.out' },
        onComplete: function () {
          gsap.set(dealt, { clearProps: 'willChange' });
          all('[data-cvsh-media]', root).forEach(function (media) { gsap.set(media, { clearProps: 'willChange' }); });
        }
      };
      if (ScrollTrigger) {
        timelineConfig.scrollTrigger = { trigger: row, start: 'top 84%', once: true };
      }

      timeline = gsap.timeline(timelineConfig);
      animated.push.apply(animated, dealt);
      gsap.set(dealt, { willChange: 'transform,opacity' });
      timeline.fromTo(dealt, {
        y: 26,
        x: function (index) { return (index - (dealt.length - 1) / 2) * 12; },
        rotation: function (index) { return (index - (dealt.length - 1) / 2) * 2.2; },
        scale: .985,
        autoAlpha: .01
      }, {
        y: 0, x: 0, rotation: 0, scale: 1, autoAlpha: 1,
        duration: .72, stagger: .09, clearProps: 'transform,opacity,visibility,zIndex'
      }, 0);

      cards.forEach(function (card) {
        var index = dealt.indexOf(card);
        var media = one('[data-cvsh-media]', card);
        var fallbackIcon = one('[data-cvsh-fallback-icon]', card);
        var badge = one('[data-cvsh-badge]', card);
        var stars = all('.cvsh-stars__star', card);
        var price = one('[data-cvsh-price]', card);
        var cta = one('[data-cvsh-cta]', card);
        var ctaLabel = cta && one('.cvsh-sign-cta__label', cta);
        var mint = cta && one('[data-cvsh-cta-mint]', cta);
        var arrow = cta && one('[data-cvsh-cta-arrow] path', cta);
        var start = .18 + index * .09;

        if (index < 0) {
          if (cta) bindCta(cta);
          if (canHover) bindCardDepth(card, media);
          return;
        }

        if (media) {
          animated.push(media);
          gsap.set(media, { willChange: 'transform,clip-path' });
          timeline.fromTo(media, {
            clipPath: 'inset(0 0 100% 0 round 18px)',
            scale: 1.055
          }, {
            clipPath: 'inset(0 0 0% 0 round 0px)',
            scale: 1,
            duration: .68,
            ease: 'power4.out',
            clearProps: 'transform,clipPath'
          }, start + .08);
        } else if (fallbackIcon) {
          animated.push(fallbackIcon);
          timeline.fromTo(fallbackIcon, { scale: .78, rotation: -8, autoAlpha: 0 }, {
            scale: 1, rotation: 0, autoAlpha: 1, duration: .5, ease: 'back.out(1.5)', clearProps: 'transform,opacity,visibility'
          }, start + .1);
        }

        if (badge) {
          animated.push(badge);
          timeline.fromTo(badge, { y: -18, rotation: -4, autoAlpha: 0 }, {
            y: 0, rotation: 0, autoAlpha: 1, duration: .36, ease: 'back.out(2.2)', clearProps: 'transform,opacity,visibility'
          }, start + .15);
        }

        if (stars.length) {
          animated.push.apply(animated, stars);
          timeline.fromTo(stars, { scale: .55, autoAlpha: 0, transformOrigin: '50% 50%' }, {
            scale: 1, autoAlpha: 1, duration: .24, stagger: .035, ease: 'back.out(1.7)', clearProps: 'transform,opacity,visibility'
          }, start + .28);
        }

        if (price) {
          animated.push(price);
          timeline.fromTo(price, { y: 8, autoAlpha: 0 }, {
            y: 0, autoAlpha: 1, duration: .34, clearProps: 'transform,opacity,visibility'
          }, start + .35);
        }

        if (cta) {
          animated.push(cta);
          timeline.fromTo(cta, { y: 10, scale: .98, autoAlpha: 0 }, {
            y: 0, scale: 1, autoAlpha: 1, duration: .42, clearProps: 'transform,opacity,visibility'
          }, start + .4);

          if (ctaLabel) {
            animated.push(ctaLabel);
            timeline.fromTo(ctaLabel, { x: -5, autoAlpha: 0 }, {
              x: 0, autoAlpha: 1, duration: .3, clearProps: 'transform,opacity,visibility'
            }, start + .5);
          }
          if (mint) {
            animated.push(mint);
            timeline.fromTo(mint, { scale: .55, rotation: -55, transformOrigin: '50% 50%' }, {
              scale: 1, rotation: 0, duration: .48, ease: 'back.out(1.7)', clearProps: 'transform'
            }, start + .46);
          }
          if (arrow) {
            animated.push(arrow);
            gsap.set(arrow, { strokeDasharray: 42, strokeDashoffset: 42 });
            timeline.to(arrow, { strokeDashoffset: 0, duration: .38, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' }, start + .54);
          }

          bindCta(cta);
        }

        if (canHover) bindCardDepth(card, media);
      });

      if (document.visibilityState === 'hidden') finish();
    }, root);

    function bindCta(cta) {
      var shine = one('[data-cvsh-cta-shine]', cta);
      var mint = one('[data-cvsh-cta-mint]', cta);
      var arrow = one('[data-cvsh-cta-arrow]', cta);
      var moving = [cta, shine, mint, arrow].filter(Boolean);
      animated.push.apply(animated, moving);

      function enter() {
        gsap.to(cta, { y: -2, rotation: -.45, duration: .32, ease: 'power3.out', overwrite: 'auto' });
        if (mint) gsap.to(mint, { rotation: '+=90', duration: .52, ease: 'power3.out', overwrite: 'auto' });
        if (arrow) gsap.to(arrow, { x: 4, duration: .3, ease: 'power3.out', overwrite: 'auto' });
        if (shine) {
          gsap.fromTo(shine, { x: 0, autoAlpha: 0 }, {
            x: 380, autoAlpha: .7, duration: .56, ease: 'power2.out', overwrite: true,
            onComplete: function () { gsap.set(shine, { autoAlpha: 0, x: 0 }); }
          });
        }
      }

      function leave() {
        gsap.to(cta, { y: 0, rotation: 0, scale: 1, duration: .22, ease: 'power2.out', overwrite: 'auto' });
        if (arrow) gsap.to(arrow, { x: 0, duration: .2, ease: 'power2.out', overwrite: 'auto' });
      }

      function press() { gsap.to(cta, { scale: .975, duration: .1, ease: 'power2.out', overwrite: 'auto' }); }
      function release() { gsap.to(cta, { scale: 1, duration: .18, ease: 'power3.out', overwrite: 'auto' }); }

      if (canHover) {
        listen(cta, 'pointerenter', enter);
        listen(cta, 'pointerleave', leave);
      }
      listen(cta, 'focus', enter);
      listen(cta, 'blur', leave);
      listen(cta, 'pointerdown', press);
      listen(cta, 'pointerup', release);
      listen(cta, 'pointercancel', release);
    }

    function bindCardDepth(card, media) {
      var image = media && one('.cvsh-card__image', media);
      var rotateX = gsap.quickTo(card, 'rotationX', { duration: .42, ease: 'power3.out' });
      var rotateY = gsap.quickTo(card, 'rotationY', { duration: .42, ease: 'power3.out' });
      var lift = gsap.quickTo(card, 'y', { duration: .42, ease: 'power3.out' });
      var imageX = image && gsap.quickTo(image, 'x', { duration: .5, ease: 'power3.out' });
      var imageY = image && gsap.quickTo(image, 'y', { duration: .5, ease: 'power3.out' });
      if (image) animated.push(image);

      function move(event) {
        var bounds = card.getBoundingClientRect();
        var px = (event.clientX - bounds.left) / bounds.width - .5;
        var py = (event.clientY - bounds.top) / bounds.height - .5;
        rotateY(px * 5);
        rotateX(py * -5);
        lift(-3);
        if (imageX) imageX(px * -5);
        if (imageY) imageY(py * -4);
      }

      function reset() {
        rotateX(0); rotateY(0); lift(0);
        if (imageX) imageX(0);
        if (imageY) imageY(0);
      }

      listen(card, 'pointermove', move);
      listen(card, 'pointerleave', reset);
    }
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvsh]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvsh]', scope));
    roots.forEach(initRail);
    roots.forEach(init);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  boot(document);

  window.addEventListener('load', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, { once: true });

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.matches && event.target.matches('[data-cvsh]') ? event.target : one('[data-cvsh]', event.target);
    destroy(root);
  });
  document.addEventListener('shopify:section:select', function (event) {
    var root = event.target.matches && event.target.matches('[data-cvsh]') ? event.target : one('[data-cvsh]', event.target);
    if (root && root._cvshFinish) root._cvshFinish();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvsh]');
    if (root && root._cvshFinish) root._cvshFinish();
  });
})();
