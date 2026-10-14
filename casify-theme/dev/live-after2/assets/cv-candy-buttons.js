/* Casify — candy CTA motion (GSAP).
 *
 * Animates the enamel "Add to cart" / "Buy now" buttons rendered by
 * snippets/cv-candy-button.liquid. The buttons are complete without this file
 * — every state (disabled, is-busy, is-done, is-error) is styled in
 * cv-badges.css and cv-product.js owns the commerce — so everything here only
 * listens and decorates:
 *
 *   intro   plate opens, medal rolls in, label settles, sparkles pop (once)
 *   idle    sparkles twinkle, shine sweeps, peppermint turns, cart hops —
 *           paused while the button is off screen
 *   hover   lift + magnetic pull, peppermint spins up, cart rattles
 *   press   squash on pointerdown, elastic release
 *   state   is-busy → spin / pulse · is-done → candy burst · is-error → shake
 *           · label text changes flip in
 *
 * Runs only for prefers-reduced-motion: no-preference. gsap.matchMedia reverts
 * every tween and trigger (and we drop every listener and observer) if that
 * preference changes.
 */
(function () {
  'use strict';

  var gsap = window.gsap;
  if (!gsap) return;

  var buttons = gsap.utils.toArray('[data-cv-candy]');
  if (!buttons.length) return;

  var ScrollTrigger = window.ScrollTrigger;
  var handlerId = 0;
  var confettiColors = ['var(--cream-50)', 'var(--gold-300)', 'var(--red-300)', 'var(--teal-300)'];

  function removeNode(node) { if (node && node.parentNode) node.parentNode.removeChild(node); }

  function setup(btn, finePointer, context) {
    var q = gsap.utils.selector(btn);
    var kind = btn.getAttribute('data-cv-candy');
    var compact = btn.classList.contains('cv-candy-btn--sm');

    var plate = q('.cv-candy-btn__plate');
    var medal = q('.cv-candy-btn__medal');
    var label = q('.cv-candy-btn__label')[0];
    var shine = q('.cv-candy-btn__shine');
    var sparkles = q('.cv-candy-btn__sparkle');
    var twinkles = q('.cv-candy-btn__twinkle');
    var swirl = q('.cv-candy-btn__swirl');
    var cart = q('.cv-candy-btn__cart');
    var burst = q('.cv-candy-btn__burst path');
    var arrow = q('.cv-candy-btn__arrow');
    var curls = q('.cv-candy-btn__curl');

    var listeners = [];
    var observers = [];
    var idle = [];
    var hovering = false;

    /* Handlers fire long after setup; wrapping them in the matchMedia context
       means the tweens they create are reverted along with everything else. */
    function wrap(fn) { return context.add('cvCandy' + (++handlerId), fn); }
    function on(type, fn) {
      var handler = wrap(fn);
      btn.addEventListener(type, handler);
      listeners.push([type, handler]);
    }

    // ---- intro --------------------------------------------------------------
    if (!compact) {
      // Short on purpose: this is the primary buy action, so it must be
      // readable within a fraction of a second. The plate wipes open with a
      // clip-path (scaleX would squash the pill's rounded ends); negative
      // insets leave room for its drop shadow.
      var intro = gsap.timeline({ paused: true });
      intro.fromTo(plate,
        { clipPath: 'inset(-20px 100% -30px -20px round 999px)' },
        { clipPath: 'inset(-20px -20px -30px -20px round 999px)', duration: 0.55, ease: 'expo.out', clearProps: 'clipPath' });
      intro.from(medal, { xPercent: -40, rotation: -240, scale: 0.5, autoAlpha: 0, duration: 0.8, ease: 'elastic.out(1, 0.65)' }, 0);
      if (label) intro.from(label, { autoAlpha: 0, letterSpacing: '0.24em', duration: 0.5, ease: 'power3.out' }, 0.08);
      if (curls.length) intro.from(curls, { scale: 0, autoAlpha: 0, transformOrigin: '50% 90%', duration: 0.45, stagger: 0.06, ease: 'back.out(3)' }, 0.22);
      if (sparkles.length) intro.from(sparkles, { scale: 0, rotation: -120, duration: 0.45, stagger: 0.08, ease: 'back.out(4)' }, 0.28);
      if (arrow.length) intro.from(arrow, { scale: 0.3, autoAlpha: 0, duration: 0.4, ease: 'back.out(3)' }, 0.32);

      // Already on screen (the buy box usually is): play now rather than
      // waiting for ScrollTrigger's first refresh, which can lag by ~1s.
      var rect = btn.getBoundingClientRect();
      var inView = rect.top < window.innerHeight && rect.bottom > 0;

      if (inView || !ScrollTrigger) {
        intro.play();
      } else {
        ScrollTrigger.create({ trigger: btn, start: 'top 92%', once: true, onEnter: function () { intro.play(); } });
        // Never leave a primary CTA hidden if the trigger somehow never fires.
        gsap.delayedCall(3, function () { if (intro.progress() === 0 && !intro.isActive()) intro.play(); });
      }
    }

    // ---- idle ---------------------------------------------------------------
    if (twinkles.length) {
      idle.push(gsap.to(twinkles, {
        scale: 0.7, rotation: 45, opacity: 0.75, transformOrigin: '50% 50%',
        duration: 0.9, ease: 'sine.inOut',
        stagger: { each: 0.55, repeat: -1, yoyo: true }
      }));
    }

    var shineTl = null;
    if (shine.length) {
      gsap.set(shine, { xPercent: -160, skewX: -18 });
      shineTl = gsap.timeline({ repeat: -1, repeatDelay: 3.4, delay: 1.4 })
        .to(shine, { xPercent: 720, duration: 1.1, ease: 'power2.inOut' });
      idle.push(shineTl);
    }

    var spin = null;
    if (swirl.length) {
      spin = gsap.to(swirl, { rotation: 360, svgOrigin: '50 50', duration: 12, ease: 'none', repeat: -1 });
      idle.push(spin);
    }

    var hop = null;
    var rattle = null;
    if (cart.length) {
      gsap.set(cart, { svgOrigin: '52 64' });
      hop = gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 1.2 })
        .to(cart, { y: -4, rotation: -8, duration: 0.22, ease: 'power2.out' })
        .to(cart, { y: 0, rotation: 0, duration: 0.65, ease: 'bounce.out' });
      if (burst.length) {
        hop.from(burst, { scale: 0.3, opacity: 0, transformOrigin: '50% 100%', duration: 0.4, stagger: 0.06, ease: 'back.out(3)', immediateRender: false }, 0.12);
      }
      idle.push(hop);

      rattle = gsap.timeline({ paused: true })
        .to(cart, { x: 5, rotation: 7, duration: 0.12, ease: 'power1.inOut' })
        .to(cart, { x: -4, rotation: -6, duration: 0.12, ease: 'power1.inOut' })
        .to(cart, { x: 0, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.35)' });
      if (burst.length) {
        rattle
          .fromTo(burst, { scale: 0.3, opacity: 0 }, { scale: 1.25, opacity: 1, transformOrigin: '50% 100%', duration: 0.35, stagger: 0.05, ease: 'back.out(4)', immediateRender: false }, 0.05)
          .to(burst, { scale: 1, duration: 0.3, ease: 'power2.out' });
      }
    }

    if (arrow.length) {
      idle.push(gsap.to(arrow, { x: 5, duration: 0.75, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    }
    if (curls.length) {
      idle.push(gsap.to(curls, { rotation: 8, transformOrigin: '50% 90%', duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.4 }));
    }

    // Idle loops only run while the button is on screen.
    if (idle.length && ScrollTrigger && !compact) {
      idle.forEach(function (t) { t.pause(); });
      ScrollTrigger.create({
        trigger: btn, start: 'top bottom', end: 'bottom top',
        onToggle: function (self) {
          idle.forEach(function (t) { if (self.isActive) t.resume(); else t.pause(); });
        }
      });
    }

    // ---- hover + magnetic pull ---------------------------------------------
    if (finePointer) {
      var xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      var yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });

      on('pointerenter', function () {
        if (btn.disabled) return;
        hovering = true;
        gsap.to(btn, { scale: 1.025, duration: 0.45, ease: 'back.out(3)', overwrite: 'auto' });
        gsap.to(medal, { scale: 1.08, rotation: kind === 'cart' ? -8 : 0, duration: 0.5, ease: 'back.out(3)', overwrite: 'auto' });
        if (sparkles.length) gsap.to(sparkles, { scale: 1.35, rotation: '+=90', duration: 0.5, stagger: 0.05, ease: 'back.out(3)', overwrite: 'auto' });
        if (spin) gsap.to(spin, { timeScale: 10, duration: 0.5, ease: 'power2.out', overwrite: true });
        if (rattle) { hop.pause(0); rattle.restart(); }
        if (shineTl) shineTl.play(0);
      });

      on('pointermove', function (e) {
        if (!hovering) return;
        var r = btn.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        xTo(px * 10);
        yTo(-3 + py * 5);
      });

      on('pointerleave', function () {
        if (!hovering) return;
        hovering = false;
        xTo(0);
        yTo(0);
        gsap.to(btn, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
        gsap.to(medal, { scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
        if (sparkles.length) gsap.to(sparkles, { scale: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
        if (spin && !btn.classList.contains('is-busy')) gsap.to(spin, { timeScale: 1, duration: 1.2, ease: 'power2.out', overwrite: true });
        if (hop) hop.restart(true);
      });
    }

    // ---- press --------------------------------------------------------------
    on('pointerdown', function () {
      if (btn.disabled) return;
      gsap.to(btn, { scale: 0.95, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(medal, { scaleX: 1.07, scaleY: 0.92, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
    });

    function release() {
      var s = hovering ? 1.08 : 1;
      gsap.to(btn, { scale: hovering ? 1.025 : 1, duration: 0.75, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
      gsap.to(medal, { scaleX: s, scaleY: s, duration: 0.75, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
    }
    on('pointerup', release);
    on('pointercancel', release);

    on('click', function (e) {
      // Keyboard activation has no pointer events — give it the same squash.
      if (e.detail === 0) {
        gsap.fromTo(btn, { scale: 0.95 }, { scale: 1, duration: 0.75, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
      }
      if (kind === 'buy') burstParticles();
    });

    // ---- state written by cv-product.js ------------------------------------
    var busyPulse = null;
    function has(cls) { return btn.classList.contains(cls); }
    var was = { busy: has('is-busy'), done: has('is-done'), error: has('is-error') };

    function onBusy(busy) {
      if (spin) gsap.to(spin, { timeScale: busy ? 16 : 1, duration: busy ? 0.4 : 1.2, ease: 'power2.out', overwrite: true });
      if (busyPulse) { busyPulse.kill(); busyPulse = null; }
      if (busy && !spin) {
        busyPulse = gsap.to(medal, { scale: 0.9, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      } else if (!busy) {
        gsap.to(medal, { scale: hovering ? 1.08 : 1, duration: 0.4, ease: 'back.out(3)', overwrite: 'auto' });
      }
    }

    function onDone() {
      gsap.timeline()
        .fromTo(medal, { scale: 0.75, rotation: -360 }, { scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(2.2)', overwrite: 'auto' })
        .fromTo(plate, { filter: 'brightness(1.4)' }, { filter: 'brightness(1)', duration: 0.7, ease: 'power2.out', clearProps: 'filter' }, 0);
      burstParticles();
    }

    function onError() {
      gsap.to(btn, { keyframes: { x: [0, -10, 9, -7, 5, -2, 0], easeEach: 'sine.inOut' }, duration: 0.55, overwrite: 'auto' });
    }

    var classObserver = new MutationObserver(wrap(function () {
      var now = { busy: has('is-busy'), done: has('is-done'), error: has('is-error') };
      if (now.busy !== was.busy) onBusy(now.busy);
      if (now.done && !was.done) onDone();
      if (now.error && !was.error) onError();
      was = now;
    }));
    classObserver.observe(btn, { attributes: true, attributeFilter: ['class'] });
    observers.push(classObserver);

    if (label) {
      var lastText = label.textContent;
      var labelObserver = new MutationObserver(wrap(function () {
        var text = label.textContent;
        if (text === lastText) return;
        lastText = text;
        gsap.fromTo(label,
          { yPercent: 50, rotationX: -75, autoAlpha: 0 },
          { yPercent: 0, rotationX: 0, autoAlpha: 1, transformPerspective: 400, duration: 0.5, ease: 'back.out(2.2)', overwrite: 'auto' });
      }));
      labelObserver.observe(label, { childList: true, characterData: true, subtree: true });
      observers.push(labelObserver);
    }

    // ---- candy burst --------------------------------------------------------
    function burstParticles() {
      var host = medal[0];
      if (!host) return;
      // Layout offsets, not client rects, so the button's own scale is ignored.
      var cx = host.offsetLeft + host.offsetWidth / 2;
      var cy = host.offsetTop + host.offsetHeight / 2;
      var count = compact ? 8 : 14;

      for (var i = 0; i < count; i++) {
        var p = document.createElement('span');
        p.className = 'cv-candy-btn__particle' + (i % 3 === 0 ? ' is-star' : '');
        p.setAttribute('aria-hidden', 'true');
        p.style.background = confettiColors[i % confettiColors.length];
        btn.appendChild(p);

        var angle = (i / count) * Math.PI * 2 + gsap.utils.random(-0.3, 0.3);
        var dist = gsap.utils.random(40, compact ? 60 : 96);
        gsap.set(p, { x: cx, y: cy, xPercent: -50, yPercent: -50, scale: gsap.utils.random(0.6, 1.3) });
        gsap.to(p, {
          x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
          rotation: gsap.utils.random(-200, 200),
          duration: gsap.utils.random(0.6, 0.95), ease: 'power3.out'
        });
        gsap.to(p, { autoAlpha: 0, scale: 0, duration: 0.4, delay: 0.5, ease: 'power1.in', onComplete: removeNode, onCompleteParams: [p] });
      }
    }

    return function () {
      listeners.forEach(function (l) { btn.removeEventListener(l[0], l[1]); });
      observers.forEach(function (o) { o.disconnect(); });
      q('.cv-candy-btn__particle').forEach(removeNode);
    };
  }

  gsap.matchMedia().add({
    motion: '(prefers-reduced-motion: no-preference)',
    finePointer: '(hover: hover) and (pointer: fine)'
  }, function (context) {
    if (!context.conditions.motion) return;
    var cleanups = buttons.map(function (btn) {
      return setup(btn, context.conditions.finePointer, context);
    });
    return function () {
      cleanups.forEach(function (fn) { fn(); });
    };
  });
})();
