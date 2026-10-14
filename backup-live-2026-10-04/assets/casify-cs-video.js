/* Casify: CS Video block (blocks/cs-video.liquid).
 *
 * Playback
 *   - click-to-play (default, and always for prefers-reduced-motion): native
 *     controls are hidden behind a wax-seal play button; pressing it plays
 *     immediately (inside the click, so browsers allow sound) and hands over
 *     to native controls if the merchant enabled them, or to a pause button
 *     if not. When playback stops, the seal returns.
 *   - autoplay: muted, plays only while at least a third is on screen, stops
 *     offscreen; without native controls it gets a pause button, and a
 *     visitor's pause is respected (it won't resume by itself).
 *   - without JS the video simply has native controls.
 * Motion (GSAP)
 *   - entrance: the mat lifts in and the picture switches on like the shop's
 *     little TV — a bright line opening to full frame — then the seal spins
 *     into place; the seal's ring text turns slowly while on screen and
 *     speeds up on hover/focus,
 *   - on play the seal is pressed and flicks away while a glass glint sweeps
 *     across the screen.
 */
(function () {
  'use strict';

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }

  function destroy(root) {
    if (root && typeof root._csvDestroy === 'function') root._csvDestroy();
  }

  function init(root) {
    if (!root) return;
    destroy(root);

    var video = one('[data-csv-video]', root);
    if (!video) return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var frame = one('[data-csv-frame]', root);
    var seal = one('[data-csv-play]', root);
    var ring = one('[data-csv-ring]', root);
    var glass = one('[data-csv-glass]', root);
    var toggle = one('[data-csv-toggle]', root);
    var toggleLabel = toggle && one('[data-csv-toggle-label]', toggle);
    var caption = one('[data-csv-caption]', root);

    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var reduce = motionQuery.matches;
    var animate = !!gsap && !reduce;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var wantsControls = root.getAttribute('data-csv-controls') === 'true';
    var autoMode = root.getAttribute('data-csv-autoplay') === 'true' && !reduce;

    var cleanups = [];
    var intro = null, spin = null, context = null, io = null;
    var userPaused = false;
    // Set when the viewport observer pauses the video. 'pause' events arrive
    // asynchronously, so this stays set until the next 'play'.
    var pausedByObserver = false;
    var inView = false;

    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      cleanups.push(function () { target.removeEventListener(eventName, handler, options); });
    }

    root._csvDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      if (io) io.disconnect();
      if (intro) intro.kill();
      if (context) context.revert();
      delete root._csvDestroy;
      delete root._csvFinish;
    };

    function reinit() { init(root); }
    if (motionQuery.addEventListener) listen(motionQuery, 'change', reinit);
    else if (motionQuery.addListener) {
      motionQuery.addListener(reinit);
      cleanups.push(function () { motionQuery.removeListener(reinit); });
    }

    // ---- UI state -----------------------------------------------------------
    function setToggle(paused) {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      if (toggleLabel) toggleLabel.textContent = paused ? 'Play video' : 'Pause video';
    }

    function showSeal(instant) {
      if (!seal) return;
      root.classList.add('is-idle');
      video.removeAttribute('controls');
      if (toggle) toggle.hidden = true;
      seal.hidden = false;
      if (animate && !instant) {
        gsap.fromTo(seal, { scale: .6, rotation: -60, autoAlpha: 0 }, {
          scale: 1, rotation: 0, autoAlpha: 1, duration: .6, ease: 'back.out(1.8)', overwrite: true
        });
      }
    }

    function hideSeal(focusTarget) {
      root.classList.remove('is-idle');
      if (wantsControls) video.setAttribute('controls', '');
      else if (toggle) { toggle.hidden = false; setToggle(false); }
      function done() {
        seal.hidden = true;
        if (animate) gsap.set(seal, { clearProps: 'transform,opacity,visibility' });
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      }
      if (!animate) { done(); return; }
      var core = one('.csv__core', seal);
      gsap.timeline({ onComplete: done })
        .to(core, { scale: .86, duration: .09, ease: 'power2.out' })
        .to(core, { scale: 1, duration: .12, ease: 'power2.out' })
        .to(seal, { scale: 1.35, rotation: 70, autoAlpha: 0, duration: .42, ease: 'back.in(1.6)' }, '<');
      if (glass) {
        gsap.fromTo(glass, { backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0', duration: 1, ease: 'power2.inOut' });
      }
    }

    function safePlay() {
      if (video.preload === 'none') video.preload = 'metadata';
      var p = video.play();
      if (p && p.catch) p.catch(function () { if (!autoMode) showSeal(); });
    }

    // ---- click-to-play -----------------------------------------------------
    if (!autoMode) {
      showSeal(true); // the entrance timeline brings it in
      if (seal) {
        listen(seal, 'click', function () {
          safePlay(); // inside the gesture, so sound is allowed
          // Keep keyboard focus somewhere useful once the seal disappears.
          hideSeal(wantsControls ? video : toggle);
        });
      }
      // Without native controls, clicking the picture pauses.
      if (!wantsControls) {
        listen(video, 'click', function () { if (!video.paused) video.pause(); });
      }
      listen(video, 'pause', function () {
        if (video.seeking) return;
        if (!wantsControls || video.ended) {
          var hadFocus = toggle && document.activeElement === toggle;
          showSeal();
          if (hadFocus && seal) seal.focus({ preventScroll: true });
        } else {
          setToggle(true);
        }
      });
      listen(video, 'ended', function () { if (!video.loop) showSeal(); });
    }

    // ---- autoplay ----------------------------------------------------------
    if (autoMode) {
      video.muted = true;
      if (!wantsControls) {
        video.removeAttribute('controls');
        if (toggle) { toggle.hidden = false; setToggle(false); }
      }
      listen(video, 'pause', function () {
        if (pausedByObserver || video.ended) return;
        // Only native controls (or our button, which sets userPaused itself)
        // mean the visitor chose to pause. Anything else — a media-session
        // interruption, a loop glitch — is not their choice: show the true
        // state, and let a looping, on-screen video carry on.
        if (wantsControls) userPaused = true;
        setToggle(true);
        if (!userPaused && video.loop && inView) {
          setTimeout(function () { if (video.paused && !userPaused && inView) safePlay(); }, 250);
        }
      });
      listen(video, 'play', function () { pausedByObserver = false; userPaused = false; setToggle(false); });

      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            // isIntersecting stays true while the video leaves past the
            // threshold, so gate on the ratio itself.
            inView = entry.isIntersecting && entry.intersectionRatio >= .34;
            if (inView) {
              if (!userPaused) safePlay();
            } else if (!video.paused) {
              pausedByObserver = true;
              video.pause();
            }
          });
        }, { threshold: .35 });
        io.observe(root);
      } else {
        safePlay();
      }
    }

    if (toggle) {
      listen(toggle, 'click', function () {
        if (video.paused) { userPaused = false; safePlay(); setToggle(false); }
        else { video.pause(); userPaused = true; setToggle(true); }
        if (animate) gsap.fromTo(toggle, { scale: .8, rotation: -30 }, { scale: 1, rotation: 0, duration: .45, ease: 'back.out(2.4)' });
      });
    }

    if (!animate) return;

    // ---- entrance + ambient ------------------------------------------------
    context = gsap.context(function () {
      var config = { defaults: { ease: 'expo.out' } };
      if (ScrollTrigger) config.scrollTrigger = { trigger: root, start: 'top 85%', once: true };
      intro = gsap.timeline(config);

      intro.from(frame, { y: 36, scale: .95, rotation: -1.2, autoAlpha: 0, duration: 1, clearProps: 'transform,opacity,visibility' }, 0);
      // The shop TV switching on: a bright line opens out to the full picture.
      intro.fromTo(video, { clipPath: 'inset(49.5% 0% 49.5% 0%)', filter: 'brightness(2.4)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: .75, ease: 'power4.inOut', clearProps: 'clipPath'
      }, .25);
      intro.to(video, { filter: 'brightness(1)', duration: .8, ease: 'power2.out', clearProps: 'filter' }, .75);

      if (seal && !seal.hidden) {
        intro.fromTo(seal, { scale: .3, rotation: -140, autoAlpha: 0 }, {
          scale: 1, rotation: 0, autoAlpha: 1, duration: .9, ease: 'back.out(1.6)', clearProps: 'transform,opacity,visibility'
        }, .75);
      }
      if (toggle && !toggle.hidden) intro.from(toggle, { scale: 0, duration: .5, ease: 'back.out(2)', clearProps: 'transform' }, .9);
      if (caption) intro.from(caption, { y: 10, autoAlpha: 0, duration: .7, clearProps: 'transform,opacity,visibility' }, .6);

      if (ring) {
        spin = gsap.to(ring, { rotation: 360, duration: 22, ease: 'none', repeat: -1, transformOrigin: '50% 50%', paused: true });
        if (ScrollTrigger) {
          ScrollTrigger.create({
            trigger: root, start: 'top bottom', end: 'bottom top',
            onToggle: function (self) { if (self.isActive) spin.play(); else spin.pause(); }
          });
        } else {
          spin.play();
        }
        var faster = function () { gsap.to(spin, { timeScale: 5, duration: .5, ease: 'power2.out', overwrite: true }); };
        var slower = function () { gsap.to(spin, { timeScale: 1, duration: .9, ease: 'power2.out', overwrite: true }); };
        if (canHover) { listen(seal, 'pointerenter', faster); listen(seal, 'pointerleave', slower); }
        listen(seal, 'focus', faster);
        listen(seal, 'blur', slower);
      }

      if (document.visibilityState === 'hidden') intro.progress(1);
    }, root);

    root._csvFinish = function () { if (intro) intro.progress(1); };
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-csv]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-csv]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  boot(document);

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) {
    all('[data-csv]', event.target).forEach(destroy);
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-csv]');
    if (root && root._csvFinish) root._csvFinish();
  });
})();
