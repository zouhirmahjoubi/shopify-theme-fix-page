(function () {
  'use strict';

  var selector = '[data-cvsp]';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function one(query, context) {
    return (context || document).querySelector(query);
  }

  function all(query, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(query));
  }

  function splitWords(element) {
    if (!element) return [];
    var label = (element.textContent || '').trim();
    if (!label) return [];

    element.textContent = '';
    element.setAttribute('aria-label', label);

    return label.split(/\s+/).map(function (word, index, words) {
      var span = document.createElement('span');
      span.className = 'cvsp-word';
      span.textContent = word;
      span.setAttribute('aria-hidden', 'true');
      element.appendChild(span);
      if (index < words.length - 1) element.appendChild(document.createTextNode(' '));
      return span;
    });
  }

  function showStatic(root) {
    root.classList.remove('cvsp-motion');
    all('[style]', root).forEach(function (element) {
      if (element.classList.contains('cvsp-icon')) return;
      element.removeAttribute('style');
    });
    document.documentElement.classList.remove('cvsp-pending');
  }

  function init(root) {
    if (!root || root._cvspCleanup) return;
    if (reduceMotion && reduceMotion.matches) {
      showStatic(root);
      return;
    }

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) {
      showStatic(root);
      return;
    }

    try {
      gsap.registerPlugin(ScrollTrigger);
      root.classList.add('cvsp-motion');

      var heading = one('[data-cvsp-heading]', root);
      var words = splitWords(heading);
      var awning = one('[data-cvsp-awning]', root);
      var sign = one('[data-cvsp-sign]', root);
      var copy = one('[data-cvsp-copy]', root);
      var ornament = one('[data-cvsp-ornament]', root);
      var lede = one('[data-cvsp-lede]', root);
      var ctas = all('[data-cvsp-cta]', root);
      var display = one('[data-cvsp-display]', root);
      var shopWindow = one('[data-cvsp-window]', root);
      var shutters = all('[data-cvsp-shutter]', root);
      var reflection = one('[data-cvsp-reflection]', root);
      var spark = one('[data-cvsp-spark]', root);
      var tickets = all('[data-cvsp-ticket]', root);
      var countElement = one('[data-cvsp-count]', root);
      var mints = all('[data-cvsp-mint]', root);
      var marquee = one('[data-cvsp-marquee]', root);
      var track = one('[data-cvsp-track]', root);
      var toggle = one('[data-cvsp-marquee-toggle]', root);
      var pauseIcon = one('[data-cvsp-pause-icon]', root);
      var playIcon = one('[data-cvsp-play-icon]', root);
      var cleanup = [];

      var context = gsap.context(function () {
        gsap.set(words, { yPercent: 118, rotate: 2.5, opacity: 0, filter: 'blur(5px)', willChange: 'transform, opacity, filter' });
        if (awning) gsap.set(awning, { y: -20, scaleY: .72, transformOrigin: '50% 0', willChange: 'transform' });
        if (sign) gsap.set(sign, { y: -24, rotate: -5, opacity: 0, willChange: 'transform, opacity' });
        if (ornament) gsap.set(ornament, { scaleX: .55, opacity: 0, transformOrigin: '0 50%' });
        if (lede) gsap.set(lede, { y: 14, opacity: 0 });
        if (ctas.length) gsap.set(ctas, { y: 12, scale: .96, opacity: 0 });
        if (display) gsap.set(display, { y: 26, scale: .975, opacity: 0, willChange: 'transform, opacity' });
        if (shopWindow) gsap.set(shopWindow, { rotationY: -2, rotationX: 1, transformPerspective: 1000, transformStyle: 'preserve-3d' });
        if (shutters.length) gsap.set(shutters, { scaleX: 1 });
        if (reflection) gsap.set(reflection, { xPercent: -135 });
        if (spark) gsap.set(spark, { opacity: 0, scale: .45, rotate: -24, transformOrigin: '50% 50%' });
        if (tickets.length) gsap.set(tickets, { y: 22, scale: .88, opacity: 0, willChange: 'transform, opacity' });

        var countTarget = 0;
        if (countElement) {
          countTarget = parseInt(countElement.getAttribute('data-cv-count'), 10) || 0;
          countElement.textContent = '0';
        }

        document.documentElement.classList.remove('cvsp-pending');

        var timeline = gsap.timeline({
          defaults: { ease: 'power3.out' },
          scrollTrigger: {
            trigger: root,
            start: 'top 76%',
            once: true
          },
          onComplete: function () {
            gsap.set(words.concat(tickets), { clearProps: 'willChange' });
            if (awning) gsap.set(awning, { clearProps: 'willChange' });
            if (sign) gsap.set(sign, { clearProps: 'willChange' });
            if (display) gsap.set(display, { clearProps: 'willChange' });
          }
        });

        if (awning) timeline.to(awning, { y: 0, scaleY: 1, duration: .54, ease: 'power4.out' }, 0);
        if (sign) timeline.to(sign, { y: 0, rotate: 0, opacity: 1, duration: .62, ease: 'back.out(1.25)' }, .1);
        if (display) timeline.to(display, { y: 0, scale: 1, opacity: 1, duration: .72, ease: 'power4.out' }, .14);
        if (words.length) timeline.to(words, { yPercent: 0, rotate: 0, opacity: 1, filter: 'blur(0px)', duration: .68, stagger: .045, ease: 'power4.out' }, .2);
        if (ornament) timeline.to(ornament, { scaleX: 1, opacity: 1, duration: .52 }, .3);
        if (lede) timeline.to(lede, { y: 0, opacity: 1, duration: .56 }, .48);
        if (ctas.length) timeline.to(ctas, { y: 0, scale: 1, opacity: 1, duration: .5, stagger: .07, ease: 'back.out(1.15)' }, .58);
        if (shutters.length) timeline.to(shutters, { scaleX: 0, duration: .78, stagger: .04, ease: 'power3.inOut' }, .36);
        if (shopWindow) timeline.to(shopWindow, { rotationY: 0, rotationX: 0, duration: .86, ease: 'power3.out' }, .4);
        if (reflection) timeline.to(reflection, { xPercent: 135, duration: .82, ease: 'power2.inOut' }, .9);
        if (spark) timeline.to(spark, { opacity: .88, scale: 1, rotate: 0, duration: .42, ease: 'back.out(1.35)' }, .92);
        if (tickets.length) timeline.to(tickets, { y: 0, scale: 1, opacity: 1, duration: .52, stagger: .09, ease: 'back.out(1.3)' }, .78);

        if (countElement && countTarget > 0) {
          var counter = { value: 0 };
          timeline.to(counter, {
            value: countTarget,
            duration: .74,
            ease: 'power2.out',
            onUpdate: function () {
              countElement.textContent = Math.round(counter.value).toString();
            }
          }, .9);
        }

        var ambientTweens = [];
        if (track) ambientTweens.push(gsap.to(track, { xPercent: -50, duration: 30, ease: 'none', repeat: -1, paused: true }));
        if (mints.length) ambientTweens.push(gsap.to(mints, { rotation: 360, duration: 18, ease: 'none', repeat: -1, paused: true, transformOrigin: '50% 50%' }));
        if (spark) ambientTweens.push(gsap.to(spark, { scale: 1.08, rotate: 4, duration: 1.8, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true }));

        var inView = false;
        var manuallyPaused = false;

        function syncAmbient() {
          var shouldPlay = inView && !manuallyPaused && !document.hidden;
          ambientTweens.forEach(function (tween) {
            if (shouldPlay) tween.play();
            else tween.pause();
          });
        }

        function updateToggle() {
          if (!toggle) return;
          toggle.setAttribute('aria-pressed', manuallyPaused ? 'true' : 'false');
          toggle.setAttribute('aria-label', manuallyPaused ? 'Resume service ticker' : 'Pause service ticker');
          if (pauseIcon) pauseIcon.hidden = manuallyPaused;
          if (playIcon) playIcon.hidden = !manuallyPaused;
        }

        var ambientTrigger = ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: function (state) {
            inView = state.isActive;
            syncAmbient();
          }
        });

        if (toggle) {
          var onToggle = function () {
            manuallyPaused = !manuallyPaused;
            updateToggle();
            syncAmbient();
          };
          toggle.addEventListener('click', onToggle);
          cleanup.push(function () { toggle.removeEventListener('click', onToggle); });
          updateToggle();
        }

        var onVisibility = function () { syncAmbient(); };
        document.addEventListener('visibilitychange', onVisibility);
        cleanup.push(function () { document.removeEventListener('visibilitychange', onVisibility); });
        cleanup.push(function () { ambientTrigger.kill(); });
      }, root);

      root._cvspCleanup = function () {
        cleanup.forEach(function (dispose) { dispose(); });
        context.revert();
        root.classList.remove('cvsp-motion');
        delete root._cvspCleanup;
      };
    } catch (error) {
      showStatic(root);
    }
  }

  function initAll(context) {
    var scope = context || document;
    if (scope.matches && scope.matches(selector)) init(scope);
    all(selector, scope).forEach(init);
  }

  function start() {
    initAll(document);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.matches && event.target.matches(selector) ? event.target : one(selector, event.target);
    if (root && root._cvspCleanup) root._cvspCleanup();
  });
})();
