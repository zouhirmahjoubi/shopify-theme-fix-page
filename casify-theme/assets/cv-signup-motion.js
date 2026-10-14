/* Casify: email signup banner motion (sections/cv-signup-banner.liquid).
 *
 * The card behaves like a letter arriving at the shop counter:
 *   - the banner photograph settles from a slow push-in and then drifts
 *     against scroll (or, with no image, the peppermints bob in place),
 *   - the airmail envelope slides up and levels out from a slight tilt,
 *   - the wax seal is pressed down with a squash and springs back,
 *   - the heading rises word by word, then copy, label and form follow,
 *   - the button arrow draws itself in.
 * Interaction: hovering the card crawls the airmail stripes along its edge;
 * the button leans toward the pointer and presses in on click. After a
 * successful signup the postmark is stamped onto the card.
 *
 * The finished UI is the default HTML/CSS state. Motion is enhancement only,
 * fully skipped for prefers-reduced-motion, never blocks form submission,
 * supports multiple instances and re-initialises in the theme editor.
 */
(function () {
  'use strict';

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }

  // One seamless repeat of the 45° airmail stripe (44px period × √2).
  var STRIPE_TILE = 62.225;

  function destroy(root) {
    if (root && typeof root._cvsuDestroy === 'function') root._cvsuDestroy();
  }

  function init(root) {
    if (!root) return;
    destroy(root);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    var card = one('[data-cvsu-card]', root);
    if (!card) return;

    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cleanups = [];
    var timeline = null;
    var context = null;
    var split = null;

    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      cleanups.push(function () { target.removeEventListener(eventName, handler, options); });
    }

    function finish() { if (timeline) timeline.progress(1, false); }

    root._cvsuFinish = finish;
    root._cvsuDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      if (timeline) timeline.kill();
      if (split) split.revert();
      if (context) context.revert();
      delete root._cvsuDestroy;
      delete root._cvsuFinish;
    };

    function reinit() { init(root); }
    if (motionQuery.addEventListener) listen(motionQuery, 'change', reinit);
    else if (motionQuery.addListener) {
      motionQuery.addListener(reinit);
      cleanups.push(function () { motionQuery.removeListener(reinit); });
    }

    // After a post, bring the confirmation into focus so it is announced
    // and visible even when the section sits far down the page — but only
    // when this banner's form was the one submitted. Every customer form on
    // the page reports success after any newsletter signup (e.g. the
    // footer's); Shopify adds the submitted form's id as the URL hash.
    var doneMsg = one('.cvsu-done__msg', root);
    var doneForm = doneMsg && doneMsg.closest('form');
    if (doneMsg && doneForm && doneForm.id && window.location.hash === '#' + doneForm.id) {
      doneMsg.focus({ preventScroll: false });
    }

    if (motionQuery.matches || !gsap) return;

    context = gsap.context(function () {
      var img = one('.cvsu__img', root);
      var drift = one('[data-cvsu-drift]', root);
      var sweets = all('[data-cvsu-sweet]', root);
      var seal = one('[data-cvsu-seal]', root);
      var heading = one('[data-cvsu-heading]', root);
      var fades = all('[data-cvsu-fade]', root);
      var label = one('.cvsu-form__label', root);
      var row = one('.cvsu-form__row', root);
      var fine = one('.cvsu-form__fine', root);
      var arrow = one('[data-cvsu-arrow] path', root);
      var postmark = one('[data-cvsu-postmark]', root);
      var doneEl = one('.cvsu-done__msg', root);

      var config = {
        defaults: { ease: 'expo.out' },
        onComplete: function () { if (split) { split.revert(); split = null; } }
      };
      if (ScrollTrigger) config.scrollTrigger = { trigger: root, start: 'top 72%', once: true };
      timeline = gsap.timeline(config);

      // ---- backdrop -------------------------------------------------------
      if (img) {
        timeline.fromTo(img, { scale: 1.16 }, { scale: 1, duration: 2.2, ease: 'power3.out', clearProps: 'transform' }, 0);
      }
      if (sweets.length) {
        timeline.fromTo(sweets, { scale: 0, rotation: -120 }, {
          scale: 1, rotation: 0, duration: 1, stagger: .1, ease: 'back.out(1.8)', clearProps: 'transform'
        }, .1);
      }

      // ---- envelope -------------------------------------------------------
      timeline.fromTo(card, { y: 70, rotation: -3.5, autoAlpha: 0 }, {
        y: 0, rotation: 0, autoAlpha: 1, duration: 1.2, clearProps: 'transform,opacity,visibility'
      }, .15);

      if (seal) {
        timeline
          .fromTo(seal, { scale: 1.9, y: -26, rotation: -25, autoAlpha: 0 }, {
            scale: 1, y: 0, rotation: 0, autoAlpha: 1, duration: .42, ease: 'power4.in'
          }, .78)
          // The press: a quick squash as the wax meets paper, then settle.
          .to(seal, { scaleX: 1.14, scaleY: .86, duration: .09, ease: 'power2.out' })
          .to(seal, { scaleX: 1, scaleY: 1, duration: .6, ease: 'elastic.out(1, .4)', clearProps: 'transform,opacity,visibility' });
      }

      // ---- copy -----------------------------------------------------------
      var copyAt = .5;
      if (heading && SplitText) {
        split = SplitText.create(heading, { type: 'words', mask: 'words' });
        timeline.from(split.words, { yPercent: 115, duration: 1, stagger: .06 }, copyAt);
      } else if (heading) {
        timeline.from(heading, { y: 20, autoAlpha: 0, duration: .8, clearProps: 'transform,opacity,visibility' }, copyAt);
      }

      var follow = fades.concat([label, row, fine, postmark ? null : doneEl]).filter(Boolean);
      if (follow.length) {
        timeline.from(follow, { y: 16, autoAlpha: 0, duration: .8, stagger: .08, clearProps: 'transform,opacity,visibility' }, copyAt + .25);
      }

      if (arrow) {
        gsap.set(arrow, { strokeDasharray: 42, strokeDashoffset: 42 });
        timeline.to(arrow, { strokeDashoffset: 0, duration: .5, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' }, copyAt + .7);
      }

      // ---- postmark (after a successful signup) ---------------------------
      if (postmark) {
        var rings = all('circle, path', postmark);
        var word = one('.cvsu-done__word', postmark);
        timeline
          .fromTo(postmark, { scale: 2.2, rotation: -40, autoAlpha: 0 }, {
            scale: 1, rotation: -12, autoAlpha: 1, duration: .45, ease: 'power4.in'
          }, copyAt + .1)
          .to(postmark, { scale: 1.08, duration: .08, ease: 'power2.out', yoyo: true, repeat: 1 });
        if (window.DrawSVGPlugin) {
          timeline.from(rings, { drawSVG: '0%', duration: .7, stagger: .06, ease: 'power2.out' }, '<');
        }
        if (word && window.ScrambleTextPlugin) {
          timeline.to(word, { duration: .8, scrambleText: { text: word.textContent, chars: 'upperCase', speed: .6 } }, '<');
        }
        if (doneEl) timeline.from(doneEl, { y: 12, autoAlpha: 0, duration: .7, clearProps: 'transform,opacity,visibility' }, '<.2');
      }

      // ---- scroll drift ---------------------------------------------------
      if (ScrollTrigger && drift && img) {
        gsap.fromTo(drift, { yPercent: -6 }, {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: .6 }
        });
      }

      // ---- ambient peppermints (paused offscreen) -------------------------
      if (sweets.length) {
        var bob = gsap.timeline({ paused: true, repeat: -1, yoyo: true, delay: 1.4 });
        sweets.forEach(function (sweet, i) {
          bob.to(sweet, {
            y: i % 2 ? 14 : -16, rotation: i % 2 ? -18 : 22,
            duration: 3.2 + i * .45, ease: 'sine.inOut'
          }, 0);
        });
        if (ScrollTrigger) {
          ScrollTrigger.create({
            trigger: root, start: 'top bottom', end: 'bottom top',
            onToggle: function (self) { if (self.isActive) bob.play(); else bob.pause(); }
          });
        } else {
          bob.play();
        }
      }

      // ---- airmail stripes crawl while the card is engaged ----------------
      var crawl = gsap.fromTo(card, { backgroundPosition: '0px 0px, 0px 0px' }, {
        backgroundPosition: '0px 0px, ' + STRIPE_TILE + 'px 0px',
        duration: 1.6, ease: 'none', repeat: -1, paused: true
      });
      function engage() { crawl.play(); gsap.to(crawl, { timeScale: 1, duration: .4, overwrite: true }); }
      function release() {
        gsap.to(crawl, { timeScale: 0, duration: .8, ease: 'power2.out', overwrite: true, onComplete: function () { crawl.pause(); } });
      }
      if (canHover) {
        listen(card, 'pointerenter', engage);
        listen(card, 'pointerleave', function () { if (!card.contains(document.activeElement)) release(); });
      }
      listen(card, 'focusin', engage);
      listen(card, 'focusout', function (e) { if (!card.contains(e.relatedTarget)) release(); });

      // ---- button: lean, press, arrow nudge -------------------------------
      var btn = one('[data-cvsu-btn]', root);
      if (btn) {
        var arrowEl = one('[data-cvsu-arrow]', btn);
        var bx = gsap.quickTo(btn, 'x', { duration: .4, ease: 'power3.out' });
        var by = gsap.quickTo(btn, 'y', { duration: .4, ease: 'power3.out' });
        var ax = arrowEl && gsap.quickTo(arrowEl, 'x', { duration: .3, ease: 'power3.out' });

        if (canHover) {
          listen(btn, 'pointermove', function (e) {
            var r = btn.getBoundingClientRect();
            bx(((e.clientX - r.left) / r.width - .5) * 6);
            by(((e.clientY - r.top) / r.height - .5) * 4);
            if (ax) ax(4);
          });
          listen(btn, 'pointerleave', function () { bx(0); by(0); if (ax) ax(0); });
        }
        listen(btn, 'pointerdown', function () { gsap.to(btn, { scale: .96, duration: .1, ease: 'power2.out', overwrite: 'auto' }); });
        function up() { gsap.to(btn, { scale: 1, duration: .35, ease: 'back.out(3)', overwrite: 'auto' }); }
        listen(btn, 'pointerup', up);
        listen(btn, 'pointercancel', up);
      }

      if (document.visibilityState === 'hidden') finish();
    }, root);
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvsu]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvsu]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function rootOf(target) {
    if (!target) return null;
    return target.matches && target.matches('[data-cvsu]') ? target : one('[data-cvsu]', target);
  }

  boot(document);

  window.addEventListener('load', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, { once: true });

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroy(rootOf(event.target)); });
  document.addEventListener('shopify:section:select', function (event) {
    var root = rootOf(event.target);
    if (root && root._cvsuFinish) root._cvsuFinish();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvsu]');
    if (root && root._cvsuFinish) root._cvsuFinish();
  });
})();
