/* Casify: promise stickers beside the collection sign
 * (snippets/cv-promise-stickers.liquid, styles in cv-promise-stickers.css).
 *
 * Motion (motion.dev, window.Motion: layout/theme.liquid loads it because the
 * aside carries data-motion-dev):
 *   enter   the stickers slap onto the page one after another on a bouncy
 *           spring, the first time the column scrolls into view
 *   hover   a sticker lifts and straightens (fine pointers only)
 *   press   a sticker squishes under the finger or button and springs back
 * GSAP (window.gsap with DrawSVGPlugin and CustomWiggle, loaded on every page):
 *   print   the toaster printer sinks its case, rattles while it prints, then
 *           pops a fresh one up with a sparkle; its little flag wobbles
 *   care    the parcel gets bumped and cracks, a swap arrow circles it, and it
 *           flips round as a brand-new box
 *   ship    the van pulls away out of its window and comes back round,
 *           nodding as it brakes, the parcel on its roof hopping
 *   eyes    every character blinks now and then; with a mouse, the eyes
 *           follow the pointer
 * Each character acts as the stickers arrive, again on hover or tap, and on
 * its own every 7-11 s while the column is on screen. Off screen nothing is
 * scheduled. Reduced motion or no GSAP: nothing moves, and the stickers show
 * as the HTML draws them, each character in its finished pose. Without
 * Motion, GSAP does the entrance and the hover.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var gsap = window.gsap;
  var M = window.Motion && window.Motion.animate ? window.Motion : null;

  function release() { root.classList.remove('cvsk-pending'); }

  if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    release();
    return;
  }

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var DRAW = !!window.DrawSVGPlugin;
  var WIGGLE = 'sine.inOut';
  if (window.CustomWiggle) {
    window.CustomWiggle.create('cvskWiggle', { wiggles: 5, type: 'easeOut' });
    WIGGLE = 'cvskWiggle';
  }
  var LIFT = { type: 'spring', stiffness: 420, damping: 20 };
  var POP = { type: 'spring', stiffness: 300, damping: 14 };
  var BACK = { type: 'spring', stiffness: 520, damping: 15 };

  function $(scope, name) { return scope.querySelector('[data-sk="' + name + '"]'); }
  function $$(scope, name) { return Array.prototype.slice.call(scope.querySelectorAll('[data-sk="' + name + '"]')); }
  function all(scope, sel) { return Array.prototype.slice.call(scope.querySelectorAll(sel)); }
  // Stroke drawing with DrawSVGPlugin; a plain fade without it.
  function drawn(on, vars) {
    var v = vars || {};
    if (DRAW) v.drawSVG = on ? '100%' : '0%';
    else v.opacity = on ? 1 : 0;
    return v;
  }

  /* ------------------------------------------------------------ characters */

  /* 1. The printer: the case sinks into the slot, the printer rattles and its
     light blinks, then a fresh case pops up with a sparkle. */
  function printer(svg) {
    var body = $(svg, 'body');
    var kase = $(svg, 'case');
    var lever = $(svg, 'lever');
    var flag = $(svg, 'flag');
    var light = $(svg, 'light');
    var spark = $(svg, 'spark');
    var lids = all(svg, '[data-sk-lid]');
    gsap.set(body, { svgOrigin: '40 64' });
    gsap.set(flag, { svgOrigin: '60 36.2' });
    gsap.set(spark, { transformOrigin: '50% 50%', scale: 0, opacity: 1 });
    gsap.set(lids, { transformOrigin: '50% 50%' });

    var tl = gsap.timeline({ paused: true });
    tl.to(kase, { y: 27, duration: 0.3, ease: 'power2.in' }, 0)
      .to(lever, { y: 3.2, duration: 0.14, ease: 'power2.in' }, 0.24)
      .to(body, { scaleY: 0.95, scaleX: 1.03, duration: 0.14, ease: 'power2.in' }, 0.24)
      .to(lids, { scaleY: 0.45, duration: 0.12 }, 0.26)
      .fromTo(body, { x: -0.6 }, { x: 0.6, duration: 0.055, repeat: 11, yoyo: true, ease: 'none', immediateRender: false }, 0.4)
      .to(light, { opacity: 0.15, duration: 0.09, repeat: 7, yoyo: true, ease: 'none' }, 0.4)
      .addLabel('ding', 1.08)
      .to(body, { x: 0, scaleY: 1.06, scaleX: 0.97, duration: 0.12, ease: 'power2.out' }, 'ding')
      .to(kase, { y: 0, duration: 0.62, ease: 'back.out(2.4)' }, 'ding')
      .to(lever, { y: 0, duration: 0.4, ease: 'back.out(3)' }, 'ding')
      .to(lids, { scaleY: 1.12, duration: 0.12 }, 'ding')
      .to(body, { scaleY: 1, scaleX: 1, duration: 0.75, ease: 'elastic.out(1, 0.35)' }, 'ding+=0.12')
      .to(lids, { scaleY: 1, duration: 0.3 }, 'ding+=0.2')
      .fromTo(spark, { scale: 0, rotation: -60 }, { scale: 1, rotation: 20, duration: 0.32, ease: 'back.out(3)', immediateRender: false }, 'ding+=0.24')
      .to(spark, { scale: 0, rotation: 90, duration: 0.26, ease: 'power2.in' }, 'ding+=0.78')
      .fromTo(flag, { rotation: 0 }, { rotation: 10, duration: 1.1, ease: WIGGLE, immediateRender: false }, 'ding+=0.05');
    return tl;
  }

  /* 2. The parcel: a bump cracks it and worries it, a swap arrow circles it,
     and it flips round as a fresh, happy box. */
  function parcel(svg) {
    var box = $(svg, 'box');
    var flip = $(svg, 'flip');
    var crack = $(svg, 'crack');
    var brows = $(svg, 'brows');
    var smile = $(svg, 'smile');
    var wobble = $(svg, 'wobble');
    var swap = $(svg, 'swap');
    var arc = $(svg, 'arc');
    var head = $(svg, 'head');
    var sparks = $$(svg, 'spark');
    var lids = all(svg, '[data-sk-lid]');
    gsap.set(box, { svgOrigin: '19 64' });
    gsap.set(flip, { svgOrigin: '40 48' });
    gsap.set(swap, { svgOrigin: '40 44.5' });
    gsap.set(head, { transformOrigin: '50% 50%' });
    gsap.set(sparks, { transformOrigin: '50% 50%', scale: 0, opacity: 1 });
    gsap.set(lids, { transformOrigin: '50% 50%' });
    if (DRAW) gsap.set(crack, { drawSVG: '0%' });

    var tl = gsap.timeline({ paused: true });
    // The crack shows only once it starts drawing: a round cap at 0% length is still a dot.
    tl.set(crack, drawn(false, { opacity: 0 }), 0)
      .set(crack, { opacity: 1 }, 0.05)
      .set(swap, { opacity: 0, rotation: 0 }, 0)
      .to(box, { rotation: -10, duration: 0.1, ease: 'power2.out' }, 0)
      .to(box, { rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.32)' }, 0.1)
      .to(crack, drawn(true, { duration: 0.22, ease: 'power1.out' }), 0.05)
      .to(brows, { opacity: 1, duration: 0.1 }, 0.06)
      .to(smile, { opacity: 0, duration: 0.06 }, 0.06)
      .to(wobble, { opacity: 1, duration: 0.06 }, 0.06)
      .to(lids, { scale: 0.78, duration: 0.14 }, 0.06)
      .addLabel('swap', 0.9)
      .set(swap, { opacity: 1 }, 'swap')
      .fromTo(arc, drawn(false), drawn(true, { duration: 0.42, ease: 'power2.inOut', immediateRender: false }), 'swap')
      .fromTo(head, { scale: 0 }, { scale: 1, duration: 0.2, ease: 'back.out(3)', immediateRender: false }, 'swap+=0.34')
      .to(swap, { rotation: 360, duration: 0.95, ease: 'power2.inOut' }, 'swap+=0.3')
      .to(flip, { scaleX: 0, duration: 0.17, ease: 'power2.in' }, 'swap+=0.36')
      .set([crack, brows, wobble], { opacity: 0 }, 'swap+=0.53')
      .set(smile, { opacity: 1 }, 'swap+=0.53')
      .set(lids, { scale: 1 }, 'swap+=0.53')
      .to(flip, { scaleX: 1, duration: 0.5, ease: 'back.out(2.2)' }, 'swap+=0.53')
      .to(box, { y: -5, duration: 0.17, ease: 'power2.out' }, 'swap+=0.75')
      .to(box, { y: 0, duration: 0.55, ease: 'bounce.out' }, 'swap+=0.92')
      .to(lids, { scaleY: 0.3, duration: 0.1, repeat: 1, yoyo: true }, 'swap+=0.82')
      .fromTo(sparks, { scale: 0, rotation: -45 }, { scale: 1, rotation: 15, duration: 0.3, ease: 'back.out(3)', stagger: 0.12, immediateRender: false }, 'swap+=0.78')
      .to(sparks, { scale: 0, rotation: 80, duration: 0.25, ease: 'power2.in', stagger: 0.12 }, 'swap+=1.25')
      .to(swap, { opacity: 0, duration: 0.3 }, 'swap+=1.25');
    return tl;
  }

  /* 3. The van: leans back and pulls away out of its window, comes back round
     from the other side, and nods as it brakes; the roof parcel hops. */
  function van(svg) {
    var car = $(svg, 'van');
    var vbody = $(svg, 'vbody');
    var roof = $(svg, 'roofbox');
    var speed = $(svg, 'speed');
    var wheels = $$(svg, 'wheel');
    var puffs = $$(svg, 'puff');
    var lids = all(svg, '[data-sk-lid]');
    gsap.set(vbody, { svgOrigin: '40 62' });
    gsap.set(roof, { svgOrigin: '27 28' });
    gsap.set(wheels[0], { svgOrigin: '22 56.5' });
    gsap.set(wheels[1], { svgOrigin: '56.5 56.5' });
    gsap.set(puffs, { transformOrigin: '50% 50%' });
    gsap.set(lids, { transformOrigin: '50% 50%' });

    var tl = gsap.timeline({ paused: true });
    // The wheel turns are multiples of 180 degrees: the hub bar looks the same, so resets never jump.
    tl.to(vbody, { rotation: -4, duration: 0.2, ease: 'power2.out' }, 0)
      .to(car, { x: 76, duration: 0.72, ease: 'power2.in' }, 0.08)
      .to(wheels, { rotation: 540, duration: 0.8, ease: 'power1.in' }, 0)
      .to(speed, { opacity: 1, duration: 0.2 }, 0.32)
      .fromTo(puffs, { opacity: 0.9, scale: 0.3, x: 0, y: 0 }, { opacity: 0, scale: 1.7, x: -9, y: -4, duration: 0.65, ease: 'power1.out', stagger: 0.1, immediateRender: false }, 0.05)
      .set(car, { x: -74 }, 0.82)
      .set(vbody, { rotation: 0 }, 0.82)
      .set(wheels, { rotation: 0 }, 0.82)
      .to(car, { x: 0, duration: 1.0, ease: 'power3.out' }, 0.84)
      .to(wheels, { rotation: 720, duration: 1.05, ease: 'power3.out' }, 0.84)
      .to(speed, { opacity: 0, duration: 0.3 }, 1.25)
      .addLabel('brake', 1.52)
      .to(vbody, { rotation: 5, duration: 0.14, ease: 'power2.out' }, 'brake')
      .to(vbody, { rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.35)' }, 'brake+=0.14')
      .to(roof, { y: -5, rotation: -8, duration: 0.16, ease: 'power2.out' }, 'brake')
      .to(roof, { y: 0, rotation: 0, duration: 0.55, ease: 'bounce.out' }, 'brake+=0.16')
      .to(lids, { scaleY: 0.3, duration: 0.1, repeat: 1, yoyo: true }, 'brake+=0.24');
    return tl;
  }

  var CAST = { print: printer, care: parcel, ship: van };

  /* ------------------------------------------------------------ the column */
  function mount(aside) {
    var items = all(aside, '[data-cvsk-item]');
    if (!items.length) return null;

    var actors = items.map(function (item) {
      var svg = item.querySelector('svg');
      var make = CAST[item.getAttribute('data-cvsk-item')];
      if (!svg || !make) return null;
      var actor = {
        item: item,
        svg: svg,
        tl: make(svg),
        lids: all(svg, '[data-sk-lid]'),
        tilt: parseFloat(getComputedStyle(item).getPropertyValue('--sk-tilt')) || 0,
        eyes: all(svg, '[data-sk-eye]').map(function (eye) {
          var box = { x: 40, y: 40, width: 0, height: 0 };
          try { box = eye.getBBox(); } catch (error) { /* not rendered: aim from the middle */ }
          return {
            cx: box.x + box.width / 2,
            cy: box.y + box.height / 2,
            x: gsap.quickTo(eye, 'x', { duration: 0.35, ease: 'power3' }),
            y: gsap.quickTo(eye, 'y', { duration: 0.35, ease: 'power3' })
          };
        }),
        next: null,
        blinkNext: null
      };
      return actor;
    }).filter(Boolean);

    function play(actor) {
      if (!actor.tl.isActive()) actor.tl.restart();
      // Acting on hover or tap resets the clock, so it doesn't act again straight after.
      if (actor.next) {
        actor.next.kill();
        actor.next = gsap.delayedCall(gsap.utils.random(7, 11), cue, [actor]);
      }
    }
    function cue(actor) {
      play(actor);
      actor.next = gsap.delayedCall(gsap.utils.random(7, 11), cue, [actor]);
    }
    function blink(actor) {
      if (!actor.tl.isActive()) {
        gsap.to(actor.lids, { scaleY: 0.08, duration: 0.07, repeat: 1, yoyo: true, ease: 'power1.inOut', overwrite: 'auto' });
      }
      actor.blinkNext = gsap.delayedCall(gsap.utils.random(2.4, 5.5), blink, [actor]);
    }
    function wake(firstActs) {
      actors.forEach(function (actor, i) {
        sleepOne(actor);
        actor.next = gsap.delayedCall(firstActs ? 0.55 + i * 0.5 : gsap.utils.random(1, 4), cue, [actor]);
        actor.blinkNext = gsap.delayedCall(gsap.utils.random(1.2, 3), blink, [actor]);
      });
    }
    function sleepOne(actor) {
      if (actor.next) actor.next.kill();
      if (actor.blinkNext) actor.blinkNext.kill();
      actor.next = actor.blinkNext = null;
    }

    /* Eyes follow a mouse pointer while the column is on screen. */
    var px = 0;
    var py = 0;
    var frame = 0;
    function look() {
      frame = 0;
      actors.forEach(function (actor) {
        var r = actor.svg.getBoundingClientRect();
        if (!r.width) return;
        var unit = r.width / 80; // CSS px per SVG unit
        actor.eyes.forEach(function (eye) {
          var dx = px - (r.left + eye.cx * unit);
          var dy = py - (r.top + eye.cy * unit);
          var d = Math.sqrt(dx * dx + dy * dy) || 1;
          var reach = Math.min(d / 140, 1) * 1.3; // SVG units
          eye.x(dx / d * reach);
          eye.y(dy / d * reach);
        });
      });
    }
    function onMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      if (!frame) frame = requestAnimationFrame(look);
    }
    function onLeaveWindow() {
      actors.forEach(function (actor) { actor.eyes.forEach(function (eye) { eye.x(0); eye.y(0); }); });
    }

    /* Motion springs for the stickers themselves (GSAP stands in without Motion). */
    function spring(el, values, options) {
      if (M) return M.animate(el, values, options);
      var v = {};
      Object.keys(values).forEach(function (key) {
        var to = values[key];
        v[key === 'rotate' ? 'rotation' : key] = Array.isArray(to) ? to[to.length - 1] : to;
      });
      v.duration = options && options.duration ? options.duration : 0.5;
      v.ease = options && options.type === 'spring' ? 'back.out(1.8)' : 'power2.out';
      v.overwrite = 'auto';
      return gsap.to(el, v);
    }

    var hovered = [];
    actors.forEach(function (actor) {
      var item = actor.item;
      var down = false;
      function lift() {
        hovered.push(item);
        spring(item, { y: -4, scale: 1.035, rotate: -actor.tilt }, LIFT);
        play(actor);
      }
      function drop() {
        hovered = hovered.filter(function (el) { return el !== item; });
        spring(item, { y: 0, scale: 1, rotate: 0 }, LIFT);
      }
      if (M && M.hover) {
        M.hover(item, function () { lift(); return drop; });
      } else {
        item.addEventListener('mouseenter', function () { if (fine.matches) lift(); });
        item.addEventListener('mouseleave', function () { if (fine.matches) drop(); });
      }
      // Press: a plain pointer handler. Motion's press() would make every sticker a tab stop.
      item.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        down = true;
        spring(item, { scale: 0.95 }, { duration: 0.12, ease: 'easeOut' });
      });
      function up() {
        if (!down) return;
        down = false;
        spring(item, { scale: hovered.indexOf(item) > -1 ? 1.035 : 1 }, BACK);
      }
      item.addEventListener('pointerup', up);
      item.addEventListener('pointercancel', up);
      item.addEventListener('pointerleave', up);
      // A tap (not a scroll that started on the sticker) wakes the character.
      item.addEventListener('click', function () { play(actor); });
    });

    /* Entrance: hide in place now (the guard in the snippet still hides them),
       then slap them on when the column comes into view. If the guard already
       timed out, they are showing: leave them and just start the characters. */
    var entered = !root.classList.contains('cvsk-pending');
    var offsets = [-14, 11, -9];
    if (!entered) {
      items.forEach(function (item, i) {
        item.style.opacity = '0';
        item.style.transform = 'translateY(26px) scale(0.5) rotate(' + offsets[i % 3] + 'deg)';
      });
    }
    release();

    function enter() {
      entered = true;
      items.forEach(function (item, i) {
        var delay = i * 0.12;
        if (M) {
          M.animate(item, { y: [26, 0], scale: [0.5, 1], rotate: [offsets[i % 3], 0] }, { type: 'spring', stiffness: POP.stiffness, damping: POP.damping, delay: delay });
          M.animate(item, { opacity: [0, 1] }, { duration: 0.2, ease: 'easeOut', delay: delay });
        } else {
          gsap.fromTo(item, { opacity: 0, y: 26, scale: 0.5, rotation: offsets[i % 3] },
            { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(2)', delay: delay });
        }
      });
    }

    var watching = false;
    function onScreen() {
      var first = !entered;
      if (first) enter();
      wake(first);
      if (fine.matches && !watching) {
        watching = true;
        window.addEventListener('pointermove', onMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', onLeaveWindow);
      }
    }
    function offScreen() {
      actors.forEach(sleepOne);
      if (watching) {
        watching = false;
        window.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
      }
    }

    var stopWatching;
    if (M && M.inView) {
      stopWatching = M.inView(aside, function () { onScreen(); return offScreen; }, { amount: 0.3 });
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) onScreen(); else offScreen(); });
      }, { threshold: 0.3 });
      io.observe(aside);
      stopWatching = function () { io.disconnect(); };
    } else {
      onScreen();
    }

    return function destroy() {
      offScreen();
      if (stopWatching) stopWatching();
      actors.forEach(function (actor) { actor.tl.kill(); });
    };
  }

  function boot(scope) {
    all(scope || document, '[data-cv-stickers]').forEach(function (aside) {
      if (aside._cvsk) return;
      aside._cvsk = mount(aside) || true;
    });
    release();
  }

  boot(document);

  // Theme editor: the section re-renders in place.
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    all(e.target, '[data-cv-stickers]').forEach(function (aside) {
      if (typeof aside._cvsk === 'function') aside._cvsk();
    });
  });
})();
