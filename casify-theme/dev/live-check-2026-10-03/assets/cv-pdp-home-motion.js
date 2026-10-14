/* Casify: motion for the home sections rebuilt on the product pages
 * (sections/cv-pdp-ribbon, -spotlight, -value, -compare, -journey, -reel,
 * -snap, -showcase, -row, -guarantee), plus the secure-checkout bar
 * (sections/cv-pdp-trust).
 *
 * Loaded after the GSAP bundle (layout/theme.liquid). Nothing runs without
 * GSAP and ScrollTrigger or under reduced motion, and every section is complete
 * and readable without it. Each section gets its own movement, not one shared
 * entrance:
 *
 *   ribbon     a marquee that speeds up, leans and reverses with the scroll
 *   trust bar  the lock rotates shut, then the accepted payment icons slide
 *              up into place beside it
 *   headings   candy-drop letters (SplitText) on the big section headings
 *   spotlight  the brass lamp swings on and its beam brightens, the glass
 *              dome lifts off the stand as you scroll, and each real fact
 *              (phones made for, styles, pack saving) pops into its corner
 *   worries    answers flip down like shop cards; the brass scale settles,
 *              the heavier pan (buying one by one) sinks
 *   compare    the cases drop into their jars
 *   journey    signature: pinned; the delivery bicycle rides the road as you
 *              scroll, the road draws behind it, each stop lights, the parcel
 *              lands at the door
 *   reel       pinned; the film strip runs sideways with the scroll, leaning
 *              with its speed, each photo panning inside its frame
 *   snapshots  the twine draws itself, a clothespin drops onto each photo and
 *              clips it in place, then the whole line sways gently
 *   clips      the counter draws itself, the three screens are set down on it and
 *              settle, their tickets drop in; afterwards each clip's footage only
 *              drifts inside its frame with the scroll — the video carries the rest
 *   showcase   three cards dealt from one stack; they tilt toward the pointer
 *   shelf      products drop onto the plank and wobble when pointed at
 *   promises   tickets flutter in, each gets a rubber stamp; the close rises,
 *              its sweets bob and its button leans toward the pointer
 */
(function () {
  'use strict';

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!gsap || !ScrollTrigger || reduce || !document.querySelector('.cvw')) return;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  var clamp = gsap.utils.clamp;
  var random = gsap.utils.random;
  var canHover = window.matchMedia('(hover: hover)').matches;

  var drop = 'back.out(2)';
  if (window.CustomBounce) { window.CustomBounce.create('cvwDrop', { strength: 0.45, squash: 1 }); drop = 'cvwDrop'; }
  var wiggle = null;
  if (window.CustomWiggle) { window.CustomWiggle.create('cvwWiggle', { wiggles: 6, type: 'easeOut' }); wiggle = 'cvwWiggle'; }

  function onEnter(el, fn, start) {
    ScrollTrigger.create({ trigger: el, start: start || 'top 80%', once: true, onEnter: fn });
  }

  /* A button that leans toward the pointer. */
  function magnet(btn) {
    if (!canHover || !btn) return;
    var xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
    var yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
    var zone = btn.parentElement;
    zone.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      if (Math.abs(dx) > r.width || Math.abs(dy) > r.height * 2) { xTo(0); yTo(0); return; }
      xTo(dx * 0.22); yTo(dy * 0.3);
    });
    zone.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
  }

  var mm = gsap.matchMedia();
  mm.add({ wide: '(min-width: 990px)', narrow: '(max-width: 989px)' }, function (context) {
    var wide = context.conditions.wide;
    var cleanups = [];

    /* ------------------------------------------------------------ ribbon */
    $$('[data-cvw-ribbon]').forEach(function (ribbon) {
      var band = $('.cvw-ribbon__band', ribbon);
      var track = $('[data-cvw-ribbon-track]', ribbon);
      if (!track) return;
      var originals = $$(':scope > li', track);
      var clones = [];
      for (var k = 0; k < 2; k++) {
        originals.forEach(function (li) {
          var c = li.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          c.removeAttribute('data-shopify-editor-block');
          track.appendChild(c);
          clones.push(c);
        });
      }
      ribbon.classList.add('is-marquee');
      var loop = gsap.to(track, { xPercent: -100 / 3, duration: wide ? 34 : 24, ease: 'none', repeat: -1 });
      var lean = gsap.quickTo(band, 'skewX', { duration: 0.5, ease: 'power3.out' });
      var st = ScrollTrigger.create({
        trigger: ribbon, start: 'top bottom', end: 'bottom top',
        onToggle: function (self) { if (self.isActive) loop.play(); else loop.pause(); },
        onUpdate: function (self) {
          var v = self.getVelocity();
          gsap.to(loop, { timeScale: clamp(-6, 6, v / 220) || 1, duration: 0.25, overwrite: true });
          lean(clamp(-8, 8, v / -160));
        }
      });
      var settle = function () { gsap.to(loop, { timeScale: loop.timeScale() < 0 ? -1 : 1, duration: 1.2, overwrite: true }); lean(0); };
      ScrollTrigger.addEventListener('scrollEnd', settle);
      cleanups.push(function () {
        ScrollTrigger.removeEventListener('scrollEnd', settle);
        st.kill();
        clones.forEach(function (c) { c.remove(); });
        ribbon.classList.remove('is-marquee');
      });
    });

    /* ------------------------------------------------------------ trust bar */
    $$('[data-cvw-trust]').forEach(function (sec) {
      var lock = $('[data-cvw-trust-lock]', sec);
      var pay = $$('[data-cvw-trust-pay] li', sec);
      if (lock) gsap.set(lock, { rotate: -16, transformOrigin: '50% 20%' });
      if (pay.length) gsap.set(pay, { y: 10, opacity: 0 });
      onEnter(sec, function () {
        var tl = gsap.timeline();
        if (lock) tl.to(lock, { rotate: 0, duration: 0.5, ease: 'back.out(3)' }, 0);
        if (pay.length) tl.to(pay, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', clearProps: 'transform,opacity' }, 0.2);
      });
    });

    /* ------------------------------------------------------------ headings */
    if (window.SplitText) {
      $$('[data-cvw-split]').forEach(function (h) {
        var split = new window.SplitText(h, { type: 'words,chars', wordsClass: 'cvw-word' });
        gsap.set(split.chars, { yPercent: -130, opacity: 0, rotation: function () { return random(-35, 35); } });
        onEnter(h, function () {
          gsap.to(split.chars, { yPercent: 0, opacity: 1, rotation: 0, duration: 0.95, ease: drop, stagger: { each: 0.016, from: 'random' } });
        }, 'top 86%');
        cleanups.push(function () { split.revert(); });
      });
    }

    /* ------------------------------------------------------------ spotlight */
    $$('[data-cvw-spot]').forEach(function (sec) {
      var dome = $('[data-cvw-cloche]', sec);
      var photo = $('[data-cvw-spot-photo]', sec);
      var glow = $('[data-cvw-spot-glow]', sec);
      var stage = $('[data-cvw-spot-stage]', sec);
      var label = $('[data-cvw-spot-label]', sec);
      var lamp = $('[data-cvw-spot-lamp]', sec);
      var beam = $('[data-cvw-spot-beam]', sec);
      var callouts = $$('[data-cvw-spot-callout]', sec);

      if (dome && stage) {
        gsap.timeline({ scrollTrigger: { trigger: stage, start: wide ? 'top 62%' : 'top 75%', end: wide ? 'center 30%' : 'center 40%', scrub: 0.7 } })
          .fromTo(dome, { yPercent: 0, rotation: 0 }, { yPercent: wide ? -34 : -22, rotation: -5, ease: 'power2.inOut' }, 0)
          .fromTo(photo, { scale: 0.9 }, { scale: 1.04, ease: 'power2.out' }, 0)
          .fromTo(glow, { opacity: 0.35, scale: 0.8 }, { opacity: 1, scale: 1.1, ease: 'none' }, 0);
      }

      /* the lamp swings on and the beam brightens, then each real fact pops into its corner */
      if (lamp) gsap.set(lamp, { rotation: -34, y: -26, opacity: 0, transformOrigin: '78% 4%' });
      if (beam) gsap.set(beam, { opacity: 0, scaleY: 0.6, transformOrigin: '88% 0%' });
      if (callouts.length) gsap.set(callouts, { opacity: 0, y: -16, scale: 0.6 });
      if (lamp || beam || callouts.length) {
        onEnter(stage || sec, function () {
          var tl = gsap.timeline();
          if (lamp) {
            tl.to(lamp, { opacity: 1, duration: 0.2 }, 0)
              .to(lamp, { rotation: -8, y: 0, duration: 1, ease: 'back.out(1.6)' }, 0);
          }
          if (beam) tl.to(beam, { opacity: 1, scaleY: 1, duration: 0.6, ease: 'power2.out' }, lamp ? 0.55 : 0);
          if (callouts.length) {
            tl.to(callouts, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.16, ease: 'back.out(2.4)' }, lamp ? 0.75 : 0.15);
          }
        }, 'top 78%');
      }

      if (label) {
        /* the shop card is stood up on the counter */
        gsap.set(label, { opacity: 0, y: 46, rotation: -10, transformOrigin: '50% 100%' });
        onEnter(stage || sec, function () {
          gsap.to(label, { opacity: 1, duration: 0.25 }, 0);
          gsap.to(label, { y: 0, rotation: 3, duration: 1.1, ease: 'back.out(2.2)', clearProps: 'transform' }, 0);
        }, 'top 70%');
      }
      magnet($('[data-cvw-magnet]', sec));
    });

    /* ------------------------------------------------------------ worries + scale */
    $$('[data-cvw-value]').forEach(function (sec) {
      var worries = $$('[data-cvw-worry]', sec);
      if (worries.length) {
        gsap.set(worries, { opacity: 0, rotationX: -78, transformOrigin: '50% 0%', transformPerspective: 900 });
        onEnter(worries[0], function () {
          gsap.to(worries, { opacity: 1, rotationX: 0, duration: 1, stagger: 0.16, ease: 'back.out(1.5)', clearProps: 'transform' });
          gsap.fromTo($$('.cvw-worry__ico', sec), { scale: 0.4, rotation: -40 }, { scale: 1, rotation: -7, duration: 0.8, stagger: 0.16, ease: drop, delay: 0.15 });
        });
      }
      var scale = $('[data-cvw-scale]', sec);
      if (scale) {
        var img = $('[data-cvw-scale-img]', scale);
        var pans = $$('[data-cvw-pan]', scale);
        var saving = $('.cvw-scale__saving b', scale);
        gsap.set(pans, { opacity: 0, y: -60 });
        if (saving) gsap.set(saving, { clipPath: 'inset(-10% 100% -10% 0%)' });
        onEnter(scale, function () {
          var tl = gsap.timeline();
          if (img) tl.fromTo(img, { rotation: -3 }, { rotation: 0, duration: 1.8, ease: 'elastic.out(1, 0.28)' }, 0);
          tl.to(pans, { opacity: 1, y: 0, duration: 0.9, stagger: 0.25, ease: drop }, 0.15);
          if (saving) tl.to(saving, { clipPath: 'inset(-10% 0% -10% 0%)', duration: 0.8, ease: 'power2.inOut' }, 0.9);
        });
      }
    });

    /* ------------------------------------------------------------ compare */
    $$('[data-cvw-compare]').forEach(function (sec) {
      var cols = $$('[data-cvw-pack-col]', sec);
      var cases = $$('.cvw-pack__case', sec);
      var flags = $$('.cvw-pack__flag', sec);
      if (cases.length) gsap.set(cases, { y: -240, opacity: 0, rotation: function () { return random(-50, 50); } });
      if (flags.length) gsap.set(flags, { scale: 0 });
      onEnter(sec, function () {
        cols.forEach(function (col, i) {
          var inJar = $$('.cvw-pack__case', col);
          gsap.to(inJar, { y: 0, opacity: 1, rotation: function (j) { return [-6, 9, -3][j] || 0; }, duration: 1, ease: drop, stagger: 0.2, delay: 0.2 + i * 0.3 });
        });
        if (flags.length) gsap.to(flags, { scale: 1, duration: 0.6, stagger: 0.2, ease: 'back.out(3)', delay: 1.1 });
        gsap.fromTo($$('.cvw-pack__glass', sec), { scaleY: 0.96, scaleX: 1.03, transformOrigin: '50% 100%' }, { scaleY: 1, scaleX: 1, duration: 0.6, stagger: 0.3, ease: 'elastic.out(1, 0.35)', delay: 0.9 });
      }, 'top 70%');
    });

    /* ------------------------------------------------------------ journey (signature) */
    $$('[data-cvw-journey]').forEach(function (sec) {
      var pin = $('[data-cvw-journey-pin]', sec);
      var stops = $$('[data-cvw-stop]', sec);
      var bike = $('[data-cvw-bike]', sec);
      var parcel = $('[data-cvw-parcel]', sec);
      var bed = $('.cvw-journey__road-bed', sec);
      var road = $('[data-cvw-road]', sec);
      if (!stops.length || !bike || !bed) return;

      function light(p) {
        var at = Math.min(stops.length - 1, Math.floor(p * stops.length + 0.02));
        stops.forEach(function (s, k) { s.classList.toggle('is-lit', k <= at); });
      }

      if (wide && window.MotionPathPlugin) {
        var pedal = gsap.to(bike, { rotation: 1.6, yPercent: -2, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true });
        var tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: pin, start: 'top top', end: '+=' + (stops.length * 62) + '%',
            pin: true, scrub: 0.8, invalidateOnRefresh: true,
            onUpdate: function (self) { light(self.progress); if (Math.abs(self.getVelocity()) > 20) pedal.play(); else pedal.pause(); },
            onLeave: function () { pedal.pause(); },
            onLeaveBack: function () { pedal.pause(); stops.forEach(function (s) { s.classList.remove('is-lit'); }); }
          }
        });
        if (road && window.DrawSVGPlugin) tl.fromTo(road, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1 }, 0);
        tl.fromTo(bike, { x: 0, y: 0 }, {
          duration: 0.88,
          motionPath: { path: bed, align: bed, alignOrigin: [0.5, 0.94], start: 0.02, end: 0.9 }
        }, 0);
        if (parcel) tl.fromTo(parcel, { y: -200, opacity: 0, rotation: -30 }, { y: 0, opacity: 1, rotation: 0, duration: 0.12, ease: drop }, 0.86);
        cleanups.push(function () { pedal.kill(); stops.forEach(function (s) { s.classList.remove('is-lit'); }); });
      } else {
        gsap.set(stops, { opacity: 0, x: -30 });
        onEnter(sec, function () {
          var t = gsap.timeline();
          t.fromTo(bike, { xPercent: -120 }, { xPercent: 0, duration: 1.6, ease: 'power2.out' }, 0);
          t.to(stops, { opacity: 1, x: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out' }, 0.2);
          if (road && window.DrawSVGPlugin) t.fromTo(road, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1.4, ease: 'power1.inOut' }, 0);
          if (parcel) t.fromTo(parcel, { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: drop }, 0.9);
          t.add(function () { light(1); }, 1);
        }, 'top 72%');
      }
    });

    /* ------------------------------------------------------------ reel */
    $$('[data-cvw-reel]').forEach(function (sec) {
      var viewport = $('[data-cvw-reel-viewport]', sec);
      var strip = $('[data-cvw-reel-strip]', sec);
      var frames = $$('[data-cvw-reel-frame]', sec);
      var now = $('[data-cvw-reel-now]', sec);
      if (!viewport || !strip || frames.length < 3) return;

      if (!wide) {
        gsap.set(frames, { opacity: 0, y: 40, rotation: function (i) { return i % 2 ? 3 : -3; } });
        onEnter(sec, function () {
          gsap.to(frames, { opacity: 1, y: 0, rotation: 0, duration: 0.8, stagger: 0.07, ease: 'back.out(1.6)' });
        }, 'top 75%');
        return;
      }

      sec.classList.add('is-pinned');
      viewport.scrollLeft = 0;
      function distance() {
        var pad = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
        return Math.max(0, strip.scrollWidth - (viewport.clientWidth - pad * 2));
      }
      var lean = gsap.quickTo(strip, 'skewX', { duration: 0.45, ease: 'power3.out' });
      var run = gsap.to(strip, {
        x: function () { return -distance(); }, ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: function () { return '+=' + distance(); },
          pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) {
            if (now) now.textContent = Math.round(self.progress * (frames.length - 1)) + 1;
            lean(clamp(-6, 6, self.getVelocity() / -260));
          }
        }
      });
      var settle = function () { lean(0); };
      ScrollTrigger.addEventListener('scrollEnd', settle);
      frames.forEach(function (frame) {
        var img = $('.cvw-reel__img', frame);
        if (!img) return;
        gsap.fromTo(img, { xPercent: 5 }, { xPercent: -5, ease: 'none', scrollTrigger: { containerAnimation: run, trigger: frame, start: 'left right', end: 'right left', scrub: true } });
      });
      cleanups.push(function () {
        ScrollTrigger.removeEventListener('scrollEnd', settle);
        sec.classList.remove('is-pinned');
      });
    });

    /* ------------------------------------------------------------ counter snapshots */
    $$('[data-cvw-snap]').forEach(function (sec) {
      var line = $('[data-cvw-snap-line]', sec);
      var frames = $$('[data-cvw-snap-frame]', sec);
      var quote = $('[data-cvw-quote]', sec);
      var stats = $$('[data-cvw-snap-stats] .cvw-snap__stat', sec);
      if (!frames.length) return;
      var pins = frames.map(function (f) { return $('.cvw-snap__pin', f); }).filter(Boolean);
      var photos = frames.map(function (f) { return $('.cvw-snap__photo', f); }).filter(Boolean);

      gsap.set(pins, { scale: 0, transformOrigin: '50% 0%' });
      gsap.set(photos, { opacity: 0, y: -22 });
      if (quote) gsap.set(quote, { opacity: 0, y: 16 });
      if (stats.length) gsap.set(stats, { opacity: 0, y: 14 });
      var drawn = line && window.DrawSVGPlugin;
      if (drawn) gsap.set(line, { drawSVG: '0%' });

      onEnter(sec, function () {
        var tl = gsap.timeline();
        if (drawn) tl.to(line, { drawSVG: '100%', duration: 0.7, ease: 'power2.inOut' }, 0);
        tl.to(pins, { scale: 1, duration: 0.6, stagger: 0.12, ease: drop }, drawn ? 0.25 : 0);
        tl.to(photos, { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: 'power3.out' }, drawn ? 0.4 : 0.12);
        if (quote) tl.to(quote, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.25');
        if (stats.length) tl.to(stats, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, '-=0.3');
        tl.call(function () {
          /* pinned photos sway on their line, like real washing-line snapshots */
          gsap.to(photos, {
            rotation: function (i) { return i % 2 ? 1.6 : -1.6; },
            duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: 0.3, from: 'random' }
          });
        });
      }, 'top 78%');
    });

    /* ------------------------------------------------------------ showcase */
    $$('[data-cvw-showcase]').forEach(function (sec) {
      var cards = $$('[data-cvw-card]', sec);
      if (!cards.length) return;
      gsap.set(cards, { opacity: 0 });
      onEnter(sec, function () {
        // Only the cards on the counter deal in; a hidden spare (see cv-pdp-story.js) shows as is if brought in later.
        var shown = cards.filter(function (c) { return !c.hidden; });
        gsap.set(cards.filter(function (c) { return c.hidden; }), { opacity: 1 });
        if (!shown.length) return;
        var mid = shown[Math.floor(shown.length / 2)].getBoundingClientRect();
        var midX = mid.left + mid.width / 2;
        gsap.fromTo(shown,
          { opacity: 1, y: 90, x: function (i) { if (!wide) return 0; var r = shown[i].getBoundingClientRect(); return midX - (r.left + r.width / 2); }, rotation: function (i) { return [-10, 3, 12][i % 3]; } },
          { y: 0, x: 0, rotation: 0, duration: 1.1, stagger: 0.14, ease: 'expo.out', clearProps: 'transform' });
      }, 'top 72%');
      if (canHover && wide) {
        cards.forEach(function (card) {
          var link = $('.cvw-card__link', card);
          var rx = gsap.quickTo(link, 'rotationX', { duration: 0.5, ease: 'power3.out' });
          var ry = gsap.quickTo(link, 'rotationY', { duration: 0.5, ease: 'power3.out' });
          gsap.set(link, { transformPerspective: 900 });
          link.addEventListener('pointermove', function (e) {
            var r = link.getBoundingClientRect();
            ry(((e.clientX - r.left) / r.width - 0.5) * 12);
            rx(((e.clientY - r.top) / r.height - 0.5) * -10);
          });
          link.addEventListener('pointerleave', function () { rx(0); ry(0); });
        });
      }
    });

    /* ------------------------------------------------------------ shelves */
    $$('[data-cvw-row]').forEach(function (sec) {
      var items = $$('[data-cvw-row-item]', sec);
      var boxes = items.map(function (i) { return $('.cvw-row__box', i); }).filter(Boolean);
      if (!boxes.length) return;
      gsap.set(boxes, { y: -130, opacity: 0, rotation: function () { return random(-12, 12); } });
      onEnter(sec, function () {
        gsap.to(boxes, { y: 0, opacity: 1, rotation: 0, duration: 1, stagger: 0.12, ease: drop });
      }, 'top 75%');
      if (canHover) {
        items.forEach(function (item) {
          var box = $('.cvw-row__box', item);
          if (!box) return;
          item.addEventListener('pointerenter', function () {
            if (wiggle) gsap.fromTo(box, { rotation: 0 }, { rotation: 3, duration: 0.8, ease: wiggle, overwrite: 'auto' });
          });
        });
      }
    });

    /* ------------------------------------------------------------ promises + close */
    $$('[data-cvw-guarantee]').forEach(function (sec) {
      var marks = $$('.cvp-faq__mark', sec);
      var close = $('[data-cvw-close]', sec);
      if (marks.length) {
        gsap.set(marks, { scale: 0 });
        onEnter($('.cvp-faq', sec) || sec, function () { gsap.to(marks, { scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(3)' }); }, 'top 85%');
      }
      if (close) {
        var sweets = $$('.cvw-close__sweet', close);
        var vows = $$('[data-cvw-vow]', close);
        var stamps = $$('.cvw-vow__stamp', close);
        gsap.set(close, { opacity: 0, y: 60 });
        if (sweets.length) gsap.set(sweets, { scale: 0.3, opacity: 0 });
        if (vows.length) { gsap.set(vows, { opacity: 0, x: -18 }); gsap.set(stamps, { opacity: 0, scale: 2.6, rotation: -40 }); }
        onEnter(close, function () {
          gsap.to(close, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' });
          if (vows.length) {
            /* each promise is rubber-stamped onto the card */
            gsap.to(vows, { opacity: 1, x: 0, duration: 0.5, stagger: 0.18, delay: 0.35, ease: 'power3.out', clearProps: 'transform' });
            gsap.to(stamps, { opacity: 1, scale: 1, rotation: function (i) { return i % 2 ? 9 : -10; }, duration: 0.45, stagger: 0.18, delay: 0.5, ease: drop, clearProps: 'transform' });
          }
          if (sweets.length) {
            gsap.to(sweets, {
              scale: 1, opacity: 1, duration: 0.8, stagger: 0.14, delay: 0.3, ease: 'back.out(2.4)',
              onComplete: function () { gsap.to(sweets, { y: function (i) { return i ? 8 : -10; }, rotation: '+=6', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }); }
            });
          }
        }, 'top 88%');
        magnet($('[data-cvw-magnet]', close));
      }
    });

    /* ------------------------------------------------------------ counter clips */
    /* Restrained on purpose: three clips are already moving, so this section only
       gets set down once and then leaves the footage alone. */
    $$('[data-cvw-ugc]').forEach(function (sec) {
      var clips = $$('[data-cvw-ugc-clip]', sec);
      if (!clips.length) return;
      var screens = clips.map(function (c) { return $('.cvw-ugc__screen', c); }).filter(Boolean);
      var tags = clips.map(function (c) { return $('.cvw-ugc__tag', c); }).filter(Boolean);
      var counter = $('.cvw-ugc__counter', sec);
      var tilt = [-6, 3, 8];

      if (counter) gsap.set(counter, { scaleX: 0, transformOrigin: '50% 50%' });
      gsap.set(screens, { opacity: 0, y: 72, scale: 0.94, rotation: function (i) { return tilt[i % tilt.length]; } });
      if (tags.length) gsap.set(tags, { opacity: 0, scale: 0.6 });

      onEnter(sec, function () {
        var tl = gsap.timeline();
        if (counter) tl.to(counter, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, 0);
        /* each clip is set down on the counter and settles */
        tl.to(screens, { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.9, stagger: 0.11, ease: drop, clearProps: 'transform' }, 0.15);
        if (tags.length) tl.to(tags, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.11, ease: 'back.out(3)', clearProps: 'scale' }, 0.5);
      }, 'top 76%');

      /* the footage drifts a little inside its frame as the page moves past it */
      clips.forEach(function (clip) {
        var media = $('.cvw-ugc__video', clip) || $('.cvw-ugc__still', clip);
        if (!media) return;
        gsap.set(media, { scale: 1.07 });
        gsap.fromTo(media, { yPercent: -2.2 }, {
          yPercent: 2.2, ease: 'none',
          scrollTrigger: { trigger: clip, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      /* a screen leans toward the pointer, the same way the showcase cards do */
      if (canHover && wide) {
        screens.forEach(function (screen) {
          var rx = gsap.quickTo(screen, 'rotationX', { duration: 0.5, ease: 'power3.out' });
          var ry = gsap.quickTo(screen, 'rotationY', { duration: 0.5, ease: 'power3.out' });
          screen.addEventListener('pointermove', function (e) {
            var r = screen.getBoundingClientRect();
            ry(((e.clientX - r.left) / r.width - 0.5) * 9);
            rx(((e.clientY - r.top) / r.height - 0.5) * -7);
          });
          screen.addEventListener('pointerleave', function () { rx(0); ry(0); });
        });
      }
    });

    ScrollTrigger.refresh();
    return function () { cleanups.forEach(function (fn) { fn(); }); };
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
