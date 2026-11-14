/* Casify: multimedia collage motion (sections/cv-collage.liquid).
 *
 * The collage is dressed like a shop window being opened for the day:
 *   - the heading rises word by word out of its own line (SplitText masks),
 *   - each print rolls up into view like an awning shutter (clip-path), its
 *     photograph settling from a slight zoom,
 *   - the hang-tag swings in on its grommet and the enamel arrow pops on,
 *   - the video wax-seal spins into place and its ring text keeps turning
 *     slowly while on screen (paused offscreen).
 * After the entrance, images drift against scroll (ScrollTrigger scrub) and,
 * on fine pointers, lean toward the cursor while the tag sways.
 *
 * Video tiles open a native <dialog>; the panel grows out of the tile that
 * was clicked (a manual FLIP) and shrinks back into it on close.
 *
 * The finished UI is the default HTML/CSS state. Motion is enhancement only,
 * fully skipped for prefers-reduced-motion, supports multiple instances and
 * re-initialises in the Shopify theme editor.
 */
(function () {
  'use strict';

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }

  function destroy(root) {
    if (root && typeof root._cvclDestroy === 'function') root._cvclDestroy();
  }

  function embedSrc(type, id) {
    id = encodeURIComponent(id || '');
    return type === 'vimeo'
      ? 'https://player.vimeo.com/video/' + id + '?autoplay=1&playsinline=1'
      : 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
  }

  function init(root) {
    if (!root) return;
    destroy(root);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    var grid = one('[data-cvcl-grid]', root);
    if (!grid) return;

    var tiles = all('[data-cvcl-tile]', grid);
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var reduce = motionQuery.matches || !gsap;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cleanups = [];
    var timeline = null;
    var context = null;
    var split = null;
    var ready = false;

    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      cleanups.push(function () { target.removeEventListener(eventName, handler, options); });
    }

    function finish() {
      if (timeline) timeline.progress(1, false);
    }

    root._cvclFinish = finish;
    root._cvclDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      if (timeline) timeline.kill();
      if (split) split.revert();
      if (context) context.revert();
      var dialog = one('[data-cvcl-dialog]', root);
      if (dialog && dialog.open) dialog.close();
      document.documentElement.classList.remove('cvcl-lock');
      delete root._cvclDestroy;
      delete root._cvclFinish;
    };

    function reinit() { init(root); }
    if (motionQuery.addEventListener) listen(motionQuery, 'change', reinit);
    else if (motionQuery.addListener) {
      motionQuery.addListener(reinit);
      cleanups.push(function () { motionQuery.removeListener(reinit); });
    }

    // The lightbox works with or without motion.
    bindLightbox();

    if (reduce || !tiles.length) return;

    context = gsap.context(function () {
      var heading = one('[data-cvcl-heading]', root);
      var fades = all('[data-cvcl-fade]', root);

      var config = {
        defaults: { ease: 'expo.out' },
        onComplete: function () {
          ready = true;
          if (split) { split.revert(); split = null; }
        }
      };
      if (ScrollTrigger) config.scrollTrigger = { trigger: grid, start: 'top 82%', once: true };
      timeline = gsap.timeline(config);

      // ---- heading --------------------------------------------------------
      if (heading && SplitText) {
        split = SplitText.create(heading, { type: 'words', mask: 'words' });
        timeline.from(split.words, { yPercent: 110, duration: 1, stagger: .055 }, 0);
      } else if (heading) {
        timeline.from(heading, { y: 24, autoAlpha: 0, duration: .9, clearProps: 'transform,opacity,visibility' }, 0);
      }
      if (fades.length) {
        timeline.from(fades, { y: 14, autoAlpha: 0, duration: .7, stagger: .08, clearProps: 'transform,opacity,visibility' }, .12);
      }

      // Big tile leads the deal, then the small ones in reading order.
      var order = tiles.slice().sort(function (a, b) {
        return (b.classList.contains('cvcl-tile--big') ? 1 : 0) - (a.classList.contains('cvcl-tile--big') ? 1 : 0);
      });

      order.forEach(function (tile, index) {
        var frame = one('[data-cvcl-frame]', tile);
        var imgs = all('.cvcl-tile__img', tile);
        var tag = one('[data-cvcl-tag]', tile);
        var go = one('[data-cvcl-go]', tile);
        var seal = one('[data-cvcl-seal]', tile);
        var at = .18 + index * .14;

        // Awning roll-up: the print is uncovered from the bottom edge upward.
        timeline.fromTo(frame, {
          clipPath: 'inset(100% 0% 0% 0% round 14px)',
          y: 36
        }, {
          clipPath: 'inset(0% 0% 0% 0% round 14px)',
          y: 0,
          duration: 1.1,
          clearProps: 'clipPath,transform'
        }, at);

        if (imgs.length) {
          timeline.fromTo(imgs, { scale: 1.28 }, {
            scale: 1, duration: 1.6, clearProps: 'transform'
          }, at);
        }

        if (tag) {
          timeline.fromTo(tag, { rotation: -16, y: -10, autoAlpha: 0 }, {
            rotation: 0, y: 0, autoAlpha: 1,
            duration: 1.3, ease: 'elastic.out(1, 0.42)',
            clearProps: 'transform,opacity,visibility'
          }, at + .42);
        }

        if (go) {
          timeline.fromTo(go, { scale: 0, rotation: -90 }, {
            scale: 1, rotation: 0, duration: .6, ease: 'back.out(2.2)', clearProps: 'transform'
          }, at + .55);
        }

        if (seal) {
          timeline.fromTo(seal, { scale: .3, rotation: -140, autoAlpha: 0 }, {
            scale: 1, rotation: 0, autoAlpha: 1, duration: .9, ease: 'back.out(1.6)',
            clearProps: 'transform,opacity,visibility'
          }, at + .35);
        }
      });

      // ---- scroll drift ---------------------------------------------------
      if (ScrollTrigger && root.getAttribute('data-cvcl-parallax') !== 'false') {
        tiles.forEach(function (tile) {
          var drift = one('[data-cvcl-drift]', tile);
          if (!drift) return;
          gsap.fromTo(drift, { yPercent: -5 }, {
            yPercent: 5, ease: 'none',
            scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: .6 }
          });
        });
      }

      // ---- ambient seal ring ----------------------------------------------
      all('[data-cvcl-seal-ring]', root).forEach(function (ring) {
        var spin = gsap.to(ring, { rotation: 360, duration: 22, ease: 'none', repeat: -1, transformOrigin: '50% 50%', paused: true });
        var tile = ring.closest('[data-cvcl-tile]');
        if (ScrollTrigger) {
          ScrollTrigger.create({
            trigger: tile, start: 'top bottom', end: 'bottom top',
            onToggle: function (self) { if (self.isActive) spin.play(); else spin.pause(); }
          });
        } else {
          spin.play();
        }
        var frame = one('[data-cvcl-frame]', tile);
        if (frame) {
          var faster = function () { gsap.to(spin, { timeScale: 5, duration: .5, ease: 'power2.out', overwrite: true }); };
          var slower = function () { gsap.to(spin, { timeScale: 1, duration: .9, ease: 'power2.out', overwrite: true }); };
          listen(frame, 'pointerenter', faster);
          listen(frame, 'pointerleave', slower);
          listen(frame, 'focus', faster);
          listen(frame, 'blur', slower);
        }
      });

      // ---- pointer depth --------------------------------------------------
      if (canHover) tiles.forEach(bindDepth);

      if (document.visibilityState === 'hidden') finish();
    }, root);

    function bindDepth(tile) {
      var frame = one('[data-cvcl-frame]', tile);
      var drift = one('[data-cvcl-drift]', tile);
      var tag = one('[data-cvcl-tag]', tile);
      var go = one('[data-cvcl-go]', tile);
      var seal = one('[data-cvcl-seal]', tile);
      if (!frame) return;

      var tiltX = gsap.quickTo(tile, 'rotationX', { duration: .5, ease: 'power3.out' });
      var tiltY = gsap.quickTo(tile, 'rotationY', { duration: .5, ease: 'power3.out' });
      var lift = gsap.quickTo(tile, 'y', { duration: .5, ease: 'power3.out' });
      var imgX = drift && gsap.quickTo(drift, 'x', { duration: .7, ease: 'power3.out' });
      var imgY = drift && gsap.quickTo(drift, 'y', { duration: .7, ease: 'power3.out' });
      var sway = tag && gsap.quickTo(tag, 'rotation', { duration: .9, ease: 'elastic.out(1, 0.5)' });
      var goX = go && gsap.quickTo(go, 'x', { duration: .4, ease: 'power3.out' });
      var sealX = seal && gsap.quickTo(seal, 'x', { duration: .6, ease: 'power3.out' });
      var sealY = seal && gsap.quickTo(seal, 'y', { duration: .6, ease: 'power3.out' });
      var big = tile.classList.contains('cvcl-tile--big');
      var depth = big ? 3 : 5;

      function move(event) {
        if (!ready) return;
        var r = tile.getBoundingClientRect();
        var px = (event.clientX - r.left) / r.width - .5;
        var py = (event.clientY - r.top) / r.height - .5;
        tiltY(px * depth);
        tiltX(py * -depth);
        lift(-4);
        if (imgX) { imgX(px * -14); imgY(py * -10); }
        if (sway) sway(px * 6);
        if (goX) goX(4);
        if (sealX) { sealX(px * 12); sealY(py * 12); }
      }

      function reset() {
        tiltX(0); tiltY(0); lift(0);
        if (imgX) { imgX(0); imgY(0); }
        if (sway) sway(0);
        if (goX) goX(0);
        if (sealX) { sealX(0); sealY(0); }
      }

      listen(tile, 'pointermove', move);
      listen(tile, 'pointerleave', reset);
    }

    // ---- lightbox ---------------------------------------------------------
    function bindLightbox() {
      var dialog = one('[data-cvcl-dialog]', root);
      if (!dialog || typeof dialog.showModal !== 'function') return;

      var panel = one('[data-cvcl-dialog-panel]', dialog);
      var stage = one('[data-cvcl-dialog-stage]', dialog);
      var caption = one('[data-cvcl-dialog-caption]', dialog);
      var closeBtn = one('[data-cvcl-dialog-close]', dialog);
      var origin = null;
      var closing = false;

      // Transform that makes the panel sit exactly over the clicked tile.
      function flipFrom(el) {
        var a = el.getBoundingClientRect();
        var b = panel.getBoundingClientRect();
        if (!b.width || !b.height) return null;
        return {
          x: (a.left + a.width / 2) - (b.left + b.width / 2),
          y: (a.top + a.height / 2) - (b.top + b.height / 2),
          scaleX: a.width / b.width,
          scaleY: a.height / b.height
        };
      }

      function open(trigger) {
        origin = trigger;
        closing = false;
        stage.innerHTML = '';
        caption.textContent = trigger.getAttribute('data-cvcl-caption') || '';
        dialog.classList.remove('is-closing');
        dialog.showModal();
        // Keep the page behind the player still while it is open.
        document.documentElement.classList.add('cvcl-lock');

        var frame = document.createElement('iframe');
        frame.src = embedSrc(trigger.getAttribute('data-cvcl-embed-type'), trigger.getAttribute('data-cvcl-embed-id'));
        frame.title = caption.textContent || 'Video';
        frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
        frame.setAttribute('allowfullscreen', '');

        if (reduce) { stage.appendChild(frame); closeBtn.focus(); return; }

        var from = flipFrom(trigger);
        gsap.killTweensOf([panel, closeBtn]);
        if (from) {
          gsap.fromTo(panel, {
            x: from.x, y: from.y, scaleX: from.scaleX, scaleY: from.scaleY,
            borderRadius: 14, transformOrigin: '50% 50%'
          }, {
            x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .75, ease: 'expo.out',
            clearProps: 'transform,borderRadius',
            onComplete: function () { if (!closing) stage.appendChild(frame); }
          });
        } else {
          stage.appendChild(frame);
        }
        gsap.fromTo(closeBtn, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: .5, delay: .35, ease: 'back.out(2)', clearProps: 'transform' });
        closeBtn.focus();
      }

      function close() {
        if (!dialog.open || closing) return;
        closing = true;
        stage.innerHTML = '';
        dialog.classList.add('is-closing');

        function done() {
          dialog.close();
          // Release the page scroll right away (the 'close' event is a backup).
          document.documentElement.classList.remove('cvcl-lock');
          dialog.classList.remove('is-closing');
          gsap && gsap.set(panel, { clearProps: 'transform,opacity' });
          closing = false;
          if (origin && origin.focus) origin.focus();
        }

        if (reduce || !origin) { done(); return; }
        var to = flipFrom(origin);
        if (!to) { done(); return; }
        gsap.to(panel, {
          x: to.x, y: to.y, scaleX: to.scaleX, scaleY: to.scaleY, opacity: .2,
          duration: .45, ease: 'power3.in', onComplete: done
        });
      }

      all('[data-cvcl-play]', root).forEach(function (trigger) {
        listen(trigger, 'click', function (event) {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
          event.preventDefault();
          open(trigger);
        });
      });
      listen(closeBtn, 'click', close);
      // However the dialog ends up closed, release the page scroll.
      listen(dialog, 'close', function () { document.documentElement.classList.remove('cvcl-lock'); });
      listen(dialog, 'cancel', function (event) { event.preventDefault(); close(); });
      listen(dialog, 'click', function (event) { if (event.target === dialog) close(); });
    }
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvcl]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvcl]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function rootOf(target) {
    if (!target) return null;
    return target.matches && target.matches('[data-cvcl]') ? target : one('[data-cvcl]', target);
  }

  /* Speed: on page load the collage's motion is built only once it is about 1.5 screens away
     (window.cvNear in layout/theme.liquid), in a task of its own, instead of inside the page's
     start-up task (about 140 ms at 4x CPU on a mid-range phone, 2026-11-09). CSS hides nothing
     before it runs, and a tile tapped before then opens its video link, as without JS. The theme
     editor and section reloads build at once, as before. */
  function bootLater(scope) {
    all('[data-cvcl]', scope).forEach(function (root) {
      if ((window.Shopify && window.Shopify.designMode) || typeof window.cvNear !== 'function') { init(root); return; }
      window.cvNear(root, 1.5).then(function () {
        setTimeout(function () { if (root.isConnected) init(root); }, 0);
      });
    });
  }

  bootLater(document);

  window.addEventListener('load', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, { once: true });

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroy(rootOf(event.target)); });
  document.addEventListener('shopify:section:select', function (event) {
    var root = rootOf(event.target);
    if (root && root._cvclFinish) root._cvclFinish();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvcl]');
    if (root && root._cvclFinish) root._cvclFinish();
  });
})();
