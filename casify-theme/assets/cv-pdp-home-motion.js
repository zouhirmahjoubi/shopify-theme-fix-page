/* Casify: motion for the home sections rebuilt on the product pages
 * (sections/cv-pdp-ribbon, -spotlight, -value, -compare, -journey, -reel,
 * -snap, -showcase, -row, -guarantee, -ugc), plus the secure-checkout bar
 * (sections/cv-pdp-trust).
 *
 * Loaded at the end of <body> on product templates (layout/theme.liquid),
 * after the GSAP bundle. Every section is complete and readable without this
 * file: words, prices, photos and controls are visible from the first paint,
 * and nothing hides unless this file sets the start state itself.
 *
 * Shape (MOTION-SYSTEM 4.4 shape 3, 4.6): one gsap.matchMedia per section root
 * (.cvw), scoped to that root, with (prefers-reduced-motion: no-preference) and
 * a 990px breakpoint. A preference flip, a breakpoint change, or a theme editor
 * unload reverts that root's tweens, ScrollTriggers, pins, SplitText and
 * listeners. shopify:section:load re-inits, :select and :block:select jump the
 * entrances to their end, and a selected ribbon block holds the marquee still.
 *
 * Entrances never strand content: a start state is set only while the section
 * has not been reached yet (the root carries .cvw-pending while it waits), and
 * a sweep 1.4 s after boot, on every ScrollTrigger refresh, on scrollEnd and
 * when the tab comes back reveals anything whose trigger line is already
 * behind the shopper (a restored scroll, a jump link).
 *
 * Loops stay polite (WCAG 2.2.2, DESIGN.md Motion): the ribbon marquee has a
 * visible pause toggle (aria-pressed) and also stops on hover, on keyboard
 * focus, offscreen and in a hidden tab; the snapshot sway and the closing
 * sweets bob three times, then settle, and pause offscreen. Roots with loops
 * or animated icons get .is-offscreen while out of view (cv-pdp-home.css pauses
 * their CSS animations).
 *
 * Behaviour that is not motion (reel prev/next buttons) works under reduced
 * motion and without GSAP. Motion never owns commerce state: no fetch, no
 * prices, no disabled toggles on buy buttons.
 *
 *   ribbon     a marquee that speeds up, leans and reverses with the scroll
 *   trust bar  the lock rotates shut, then the payment icons slide up
 *   headings   candy-drop letters (SplitText) on the big section headings
 *   spotlight  the brass lamp swings on, the beam brightens, the glass dome
 *              lifts as you scroll, each real fact pops into its corner
 *   worries    answers flip down like shop cards; the brass scale settles
 *   compare    the cases drop into their jars
 *   journey    wide: pinned, the bicycle rides the road, each stop lights,
 *              the parcel lands (pin length from data-cvw-pin, % per stop);
 *              narrow: no pin, stops light one by one (ScrollTrigger.batch)
 *              while the bicycle rides across with the scroll
 *   reel       wide: pinned, the strip runs sideways with the scroll; prev and
 *              next ([data-cvw-reel-prev/next]) step one frame in any mode
 *   snapshots  the twine draws, the pins clip each photo, the line sways
 *   clips      the counter draws, the screens are set down, tickets drop in
 *   showcase   three cards dealt from one stack; they tilt toward the pointer
 *   shelf      products drop onto the plank and wobble when pointed at
 *   promises   tickets flutter in, each gets a rubber stamp; the close rises,
 *              its sweets bob and its button leans toward the pointer
 */
(function () {
  'use strict';

  var ROOT = '.cvw';
  var PENDING = 'cvw-pending';
  var live = [];

  function one(q, ctx) { return (ctx || document).querySelector(q); }
  function all(q, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(q)); }
  function mq(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  function reduceNow() { return mq('(prefers-reduced-motion: reduce)'); }
  function attrNum(el, name) {
    if (!el || !el.hasAttribute(name)) return NaN;
    return parseFloat(el.getAttribute(name));
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var motionOK = !!(gsap && ScrollTrigger && gsap.matchMedia);

  var drop = 'back.out(2)';
  var wiggle = null;
  if (motionOK) {
    if (window.CustomBounce) { window.CustomBounce.create('cvwDrop', { strength: 0.45, squash: 1 }); drop = 'cvwDrop'; }
    if (window.CustomWiggle) { window.CustomWiggle.create('cvwWiggle', { wiggles: 6, type: 'easeOut' }); wiggle = 'cvwWiggle'; }
  }

  /* ------------------------------------------------------------ helpers */

  /* Is the trigger line ('top 80%') already reached by this element? */
  function reached(el, start) {
    if (!el || !el.getBoundingClientRect) return true;
    var pct = parseFloat(String(start || 'top 80%').split(' ')[1]);
    if (isNaN(pct)) pct = 80;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    return r.top <= window.innerHeight * pct / 100;
  }

  function markPending(env) {
    var waiting = env.armed.some(function (a) { return !a.done; });
    env.root.classList.toggle(PENDING, waiting);
  }

  /* A one-shot entrance. hide() sets the start state, play() returns the tween
     or timeline to the finished state. Already reached: play at once, so no
     hidden gap. Not reached: hide, wait for the trigger, and stay in the sweep. */
  function entrance(env, trigger, start, hide, play) {
    if (!trigger) return;
    var rec = { trigger: trigger, start: start, done: false, anim: null };
    rec.run = function () {
      if (rec.done) return;
      rec.done = true;
      rec.anim = play() || null;
      if (rec.anim) env.anims.push(rec.anim);
      if (rec.anim && document.visibilityState === 'hidden') rec.anim.progress(1);
      markPending(env);
    };
    env.armed.push(rec);
    hide();
    if (reached(trigger, start)) { rec.run(); return; }
    ScrollTrigger.create({ trigger: trigger, start: start, once: true, onEnter: rec.run });
    markPending(env);
  }

  /* The pending fallback: reveal every armed entrance whose line is behind the shopper. */
  function sweep() {
    live.forEach(function (root) {
      var env = root._cvw && root._cvw.env;
      if (!env) return;
      env.armed.forEach(function (a) { if (!a.done && reached(a.trigger, a.start)) a.run(); });
    });
  }

  /* A button that leans toward the pointer. Listeners leave with the context. */
  function magnet(env, btn) {
    if (!env.hover || !btn || !btn.parentElement) return;
    var xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
    var yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
    var zone = btn.parentElement;
    function move(e) {
      var r = btn.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      if (Math.abs(dx) > r.width || Math.abs(dy) > r.height * 2) { xTo(0); yTo(0); return; }
      xTo(dx * 0.22); yTo(dy * 0.3);
    }
    function leave() { xTo(0); yTo(0); }
    listen(env, zone, 'pointermove', move);
    listen(env, zone, 'pointerleave', leave);
  }

  /* A tilt toward the pointer (showcase cards, clip screens). */
  function tilt(env, el, ry, rx) {
    var toX = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    var toY = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    listen(env, el, 'pointermove', function (e) {
      var r = el.getBoundingClientRect();
      toY(((e.clientX - r.left) / r.width - 0.5) * ry);
      toX(((e.clientY - r.top) / r.height - 0.5) * -rx);
    });
    listen(env, el, 'pointerleave', function () { toX(0); toY(0); });
  }

  function listen(env, target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    env.off.push(function () { target.removeEventListener(type, fn, opts); });
  }

  /* Ambient loops: bounded (3 cycles, then rest) and paused while offscreen. */
  function ambient(env, tween) {
    env.loops.push(tween);
    if (!env.visible) tween.pause();
    return tween;
  }

  /* .is-offscreen on the root, and the loops follow it. */
  function watchView(env) {
    var root = env.root;
    function apply(active) {
      env.visible = active;
      root.classList.toggle('is-offscreen', !active);
      env.loops.forEach(function (t) {
        if (active && !document.hidden && t.progress() < 1) t.play(); else t.pause();
      });
      env.viewFns.forEach(function (fn) { fn(active); });
    }
    ScrollTrigger.create({
      trigger: root, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { apply(self.isActive); },
      onRefresh: function (self) { apply(self.isActive); }
    });
    env.off.push(function () { root.classList.remove('is-offscreen'); });
  }

  /* ------------------------------------------------------------ ribbon */
  function ribbon(env) {
    var root = env.root;
    var band = one('.cvw-ribbon__band', root);
    var track = one('[data-cvw-ribbon-track]', root);
    if (!band || !track) return;
    var originals = all(':scope > li', track);
    if (!originals.length) return;

    var clones = [];
    for (var k = 0; k < 2; k++) {
      originals.forEach(function (li) {
        var c = li.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        c.setAttribute('inert', '');
        c.removeAttribute('data-shopify-editor-block');
        c.removeAttribute('id');
        all('[id]', c).forEach(function (n) { n.removeAttribute('id'); });
        track.appendChild(c);
        clones.push(c);
      });
    }
    root.classList.add('is-marquee');

    /* The pause toggle: the section may print one ([data-cvw-ribbon-pause]); otherwise it is made here, since the marquee itself only exists with JS. */
    var btn = one('[data-cvw-ribbon-pause]', root);
    var made = !btn;
    var wasHidden = btn ? btn.hidden : false;
    if (made) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cvw-ribbon__pause';
      btn.setAttribute('data-cvw-ribbon-pause', '');
      btn.setAttribute('aria-label', root.getAttribute('data-i18n-pause') || 'Pause the moving ribbon');
      btn.innerHTML =
        '<svg class="is-pause" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>' +
        '<svg class="is-play" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
      root.appendChild(btn);
    }
    btn.hidden = false;

    var state = { user: false, hover: false, focus: false, view: false, hold: false };
    var loop = gsap.to(track, { xPercent: -100 / 3, duration: env.wide ? 34 : 24, ease: 'none', repeat: -1, paused: true });
    var lean = gsap.quickTo(band, 'skewX', { duration: 0.5, ease: 'power3.out' });
    function moving() { return state.view && !state.user && !state.hover && !state.focus && !state.hold && !document.hidden; }
    function sync() {
      var go = moving();
      if (go) loop.play(); else { loop.pause(); lean(0); }
      root.classList.toggle('is-paused', !go);
      btn.setAttribute('aria-pressed', state.user ? 'true' : 'false');
    }

    ScrollTrigger.create({
      trigger: root, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { state.view = self.isActive; sync(); },
      onRefresh: function (self) { state.view = self.isActive; sync(); },
      onUpdate: function (self) {
        if (!moving()) return;
        var v = self.getVelocity();
        gsap.to(loop, { timeScale: gsap.utils.clamp(-6, 6, v / 220) || 1, duration: 0.25, overwrite: true });
        lean(gsap.utils.clamp(-8, 8, v / -160));
      }
    });
    var settle = function () {
      gsap.to(loop, { timeScale: loop.timeScale() < 0 ? -1 : 1, duration: 1.2, overwrite: true });
      lean(0);
    };
    ScrollTrigger.addEventListener('scrollEnd', settle);

    /* Play is an explicit request, so it clears the passive hover and focus holds; they come back only when the pointer re-enters or focus moves to ribbon content. */
    listen(env, btn, 'click', function () {
      state.user = !state.user;
      if (state.user) gsap.set(loop, { timeScale: 1 });
      else { state.hover = false; state.focus = false; }
      sync();
    });
    listen(env, root, 'pointerenter', function (e) { if (e.pointerType !== 'touch') { state.hover = true; sync(); } });
    listen(env, root, 'pointerleave', function () { state.hover = false; sync(); });
    /* Focus on the toggle itself is not a hold: its aria-pressed is the state a keyboard or tap user hears. */
    listen(env, root, 'focusin', function (e) { state.focus = !btn.contains(e.target); sync(); });
    listen(env, root, 'focusout', function (e) { if (!root.contains(e.relatedTarget)) { state.focus = false; sync(); } });
    listen(env, document, 'visibilitychange', sync);
    env.hold = function (on) { state.hold = !!on; sync(); };
    sync();

    env.off.push(function () {
      ScrollTrigger.removeEventListener('scrollEnd', settle);
      clones.forEach(function (c) { c.remove(); });
      root.classList.remove('is-marquee', 'is-paused');
      if (made) btn.remove(); else { btn.hidden = wasHidden; btn.removeAttribute('aria-pressed'); }
      delete env.hold;
    });
  }

  /* ------------------------------------------------------------ trust bar */
  function trust(env) {
    var lock = one('[data-cvw-trust-lock]', env.root);
    var pay = all('[data-cvw-trust-pay] li', env.root);
    if (!lock && !pay.length) return;
    entrance(env, env.root, 'top 80%', function () {
      if (lock) gsap.set(lock, { rotate: -16, transformOrigin: '50% 20%' });
      if (pay.length) gsap.set(pay, { y: 10, opacity: 0 });
    }, function () {
      var tl = gsap.timeline();
      if (lock) tl.to(lock, { rotate: 0, duration: 0.5, ease: 'back.out(3)' }, 0);
      if (pay.length) tl.to(pay, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', clearProps: 'transform,opacity' }, 0.2);
      return tl;
    });
  }

  /* ------------------------------------------------------------ headings */
  function headings(env) {
    if (!window.SplitText) return;
    all('[data-cvw-split]', env.root).forEach(function (h) {
      var split = new window.SplitText(h, { type: 'words,chars', wordsClass: 'cvw-word' });
      env.off.push(function () { split.revert(); });
      entrance(env, h, 'top 86%', function () {
        gsap.set(split.chars, { yPercent: -130, opacity: 0, rotation: function () { return gsap.utils.random(-35, 35); } });
      }, function () {
        return gsap.to(split.chars, { yPercent: 0, opacity: 1, rotation: 0, duration: 0.95, ease: drop, stagger: { each: 0.016, from: 'random' } });
      });
    });
  }

  /* ------------------------------------------------------------ spotlight */
  function spotlight(env) {
    var root = env.root, wide = env.wide;
    var dome = one('[data-cvw-cloche]', root);
    var photo = one('[data-cvw-spot-photo]', root);
    var glow = one('[data-cvw-spot-glow]', root);
    var stage = one('[data-cvw-spot-stage]', root);
    var label = one('[data-cvw-spot-label]', root);
    var lamp = one('[data-cvw-spot-lamp]', root);
    var beam = one('[data-cvw-spot-beam]', root);
    var callouts = all('[data-cvw-spot-callout]', root);

    if (dome && stage) {
      var lift = gsap.timeline({ scrollTrigger: { trigger: stage, start: wide ? 'top 62%' : 'top 75%', end: wide ? 'center 30%' : 'center 40%', scrub: 0.7 } });
      lift.fromTo(dome, { yPercent: 0, rotation: 0 }, { yPercent: wide ? -34 : -22, rotation: -5, ease: 'power2.inOut' }, 0);
      if (photo) lift.fromTo(photo, { scale: 0.9 }, { scale: 1.04, ease: 'power2.out' }, 0);
      if (glow) lift.fromTo(glow, { opacity: 0.35, scale: 0.8 }, { opacity: 1, scale: 1.1, ease: 'none' }, 0);
    }

    if (lamp || beam || callouts.length) {
      entrance(env, stage || root, 'top 78%', function () {
        if (lamp) gsap.set(lamp, { rotation: -34, y: -26, opacity: 0, transformOrigin: '78% 4%' });
        if (beam) gsap.set(beam, { opacity: 0, scaleY: 0.6, transformOrigin: '88% 0%' });
        if (callouts.length) gsap.set(callouts, { opacity: 0, y: -16, scale: 0.6 });
      }, function () {
        var tl = gsap.timeline();
        if (lamp) tl.to(lamp, { opacity: 1, duration: 0.2 }, 0).to(lamp, { rotation: -8, y: 0, duration: 1, ease: 'back.out(1.6)' }, 0);
        if (beam) tl.to(beam, { opacity: 1, scaleY: 1, duration: 0.6, ease: 'power2.out' }, lamp ? 0.55 : 0);
        if (callouts.length) tl.to(callouts, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.16, ease: 'back.out(2.4)' }, lamp ? 0.75 : 0.15);
        return tl;
      });
    }

    if (label) {
      /* the shop card is stood up on the counter */
      entrance(env, stage || root, 'top 70%', function () {
        gsap.set(label, { opacity: 0, y: 46, rotation: -10, transformOrigin: '50% 100%' });
      }, function () {
        return gsap.timeline()
          .to(label, { opacity: 1, duration: 0.25 }, 0)
          .to(label, { y: 0, rotation: 0, duration: 1.1, ease: 'back.out(2.2)', clearProps: 'transform,opacity' }, 0);
      });
    }
    magnet(env, one('[data-cvw-magnet]', root));
  }

  /* ------------------------------------------------------------ worries + scale */
  function value(env) {
    var root = env.root;
    var worries = all('[data-cvw-worry]', root);
    if (worries.length) {
      var icons = all('.cvw-worry__ico', root);
      entrance(env, worries[0], 'top 80%', function () {
        gsap.set(worries, { opacity: 0, rotationX: -78, transformOrigin: '50% 0%', transformPerspective: 900 });
      }, function () {
        var tl = gsap.timeline();
        tl.to(worries, { opacity: 1, rotationX: 0, duration: 1, stagger: 0.16, ease: 'back.out(1.5)', clearProps: 'transform' }, 0);
        /* the CSS rotate (-7deg) is the resting tilt, so the tween lands on 0 and hands back to it */
        if (icons.length) tl.fromTo(icons, { scale: 0.4, rotation: -33 }, { scale: 1, rotation: 0, duration: 0.8, stagger: 0.16, ease: drop, clearProps: 'transform' }, 0.15);
        return tl;
      });
    }
    var scale = one('[data-cvw-scale]', root);
    if (scale) {
      var img = one('[data-cvw-scale-img]', scale);
      var pans = all('[data-cvw-pan]', scale);
      var saving = one('.cvw-scale__saving b', scale);
      entrance(env, scale, 'top 80%', function () {
        if (pans.length) gsap.set(pans, { opacity: 0, y: -60 });
        if (saving) gsap.set(saving, { clipPath: 'inset(-10% 100% -10% 0%)' });
      }, function () {
        var tl = gsap.timeline();
        if (img) tl.fromTo(img, { rotation: -3 }, { rotation: 0, duration: 1.8, ease: 'elastic.out(1, 0.28)' }, 0);
        if (pans.length) tl.to(pans, { opacity: 1, y: 0, duration: 0.9, stagger: 0.25, ease: drop, clearProps: 'transform,opacity' }, 0.15);
        if (saving) tl.to(saving, { clipPath: 'inset(-10% 0% -10% 0%)', duration: 0.8, ease: 'power2.inOut', clearProps: 'clipPath' }, 0.9);
        return tl;
      });
    }
  }

  /* ------------------------------------------------------------ compare */
  function compare(env) {
    var root = env.root;
    var cols = all('[data-cvw-pack-col]', root);
    var cases = all('.cvw-pack__case', root);
    var flags = all('.cvw-pack__flag', root);
    var glass = all('.cvw-pack__glass', root);
    if (!cases.length && !flags.length) return;
    entrance(env, root, 'top 70%', function () {
      if (cases.length) gsap.set(cases, { y: -240, opacity: 0, rotation: function () { return gsap.utils.random(-50, 50); } });
      if (flags.length) gsap.set(flags, { scale: 0 });
    }, function () {
      var tl = gsap.timeline();
      cols.forEach(function (col, i) {
        var inJar = all('.cvw-pack__case', col);
        /* the resting tilts are CSS rotate (nth-child), so the drop lands on 0 */
        if (inJar.length) tl.to(inJar, { y: 0, opacity: 1, rotation: 0, duration: 1, ease: drop, stagger: 0.2, clearProps: 'transform,opacity' }, 0.2 + i * 0.3);
      });
      if (flags.length) tl.to(flags, { scale: 1, duration: 0.6, stagger: 0.2, ease: 'back.out(3)', clearProps: 'transform' }, 1.1);
      if (glass.length) tl.fromTo(glass, { scaleY: 0.96, scaleX: 1.03, transformOrigin: '50% 100%' }, { scaleY: 1, scaleX: 1, duration: 0.6, stagger: 0.3, ease: 'elastic.out(1, 0.35)', clearProps: 'transform' }, 0.9);
      return tl;
    });
  }

  /* ------------------------------------------------------------ journey (signature) */
  function journey(env) {
    var root = env.root;
    var pin = one('[data-cvw-journey-pin]', root);
    var stops = all('[data-cvw-stop]', root);
    var bike = one('[data-cvw-bike]', root);
    var parcel = one('[data-cvw-parcel]', root);
    var bed = one('.cvw-journey__road-bed', root);
    var road = one('[data-cvw-road]', root);
    var scene = one('.cvw-journey__scene', root) || root;
    var hint = one('[data-cvw-journey-hint]', root);
    if (!stops.length || !bike || !bed) return;

    /* The pin length is a section setting (data-cvw-pin, % of the viewport per stop; 0 = no pin). */
    var per = attrNum(root, 'data-cvw-pin');
    if (isNaN(per)) per = attrNum(pin, 'data-cvw-pin');
    if (isNaN(per)) per = 62;
    per = gsap.utils.clamp(0, 150, per);
    var drawn = road && window.DrawSVGPlugin;

    function light(p) {
      var at = Math.min(stops.length - 1, Math.floor(p * stops.length + 0.02));
      stops.forEach(function (s, k) { s.classList.toggle('is-lit', k <= at); });
    }
    env.off.push(function () { stops.forEach(function (s) { s.classList.remove('is-lit'); }); });

    if (env.wide && window.MotionPathPlugin && per > 0 && pin) {
      if (hint) { var hintHidden = hint.hidden; hint.hidden = false; env.off.push(function () { hint.hidden = hintHidden; }); }
      var pedal = gsap.to(bike, { rotation: 1.6, yPercent: -2, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true });
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pin, start: 'top top', end: '+=' + Math.round(stops.length * per) + '%',
          pin: true, scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: function (self) { light(self.progress); if (Math.abs(self.getVelocity()) > 20) pedal.play(); else pedal.pause(); },
          onLeave: function () { pedal.pause(); },
          onLeaveBack: function () { pedal.pause(); stops.forEach(function (s) { s.classList.remove('is-lit'); }); }
        }
      });
      if (drawn) tl.fromTo(road, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1 }, 0);
      tl.fromTo(bike, { x: 0, y: 0 }, {
        duration: 0.88,
        motionPath: { path: bed, align: bed, alignOrigin: [0.5, 0.94], start: 0.02, end: 0.9 }
      }, 0);
      if (parcel) tl.fromTo(parcel, { y: -200, opacity: 0, rotation: -30 }, { y: 0, opacity: 1, rotation: 0, duration: 0.12, ease: drop }, 0.86);
      return;
    }

    /* Narrow (or no MotionPath, or no pin): stops light one by one as each enters,
       and the bicycle rides across the scene with the scroll. Nothing is pinned. */
    var batched = stops.filter(function (s) { return !reached(s, 'top 85%'); });
    stops.forEach(function (s) { if (batched.indexOf(s) < 0) s.classList.add('is-lit'); });
    if (batched.length) {
      var rec = { trigger: batched[batched.length - 1], start: 'top 85%', done: false, anim: null };
      gsap.set(batched, { opacity: 0, x: -30 });
      var left = batched.slice();
      var reveal = function (batch) {
        batch = batch.filter(function (s) { return left.indexOf(s) > -1; });
        if (!batch.length) return;
        left = left.filter(function (s) { return batch.indexOf(s) < 0; });
        var t = gsap.to(batch, { opacity: 1, x: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out', clearProps: 'transform,opacity' });
        env.anims.push(t);
        if (document.visibilityState === 'hidden') t.progress(1);
        batch.forEach(function (s) { s.classList.add('is-lit'); });
        if (!left.length) { rec.done = true; markPending(env); }
      };
      ScrollTrigger.batch(batched, { start: 'top 85%', once: true, onEnter: reveal });
      /* the sweep reveals whatever is already behind the shopper */
      rec.run = function () { reveal(left.filter(function (s) { return reached(s, 'top 85%'); })); };
      rec.finish = function () { reveal(left.slice()); };
      env.armed.push(rec);
      markPending(env);
    }

    var bikeTravel = function () {
      var room = scene.clientWidth - bike.offsetWidth - (parcel ? parcel.offsetWidth * 0.6 : 0);
      return Math.max(0, room);
    };
    gsap.fromTo(bike, { x: 0 }, {
      x: bikeTravel, ease: 'none',
      scrollTrigger: { trigger: scene, start: 'top 85%', end: 'bottom 35%', scrub: 0.6, invalidateOnRefresh: true }
    });
    if (drawn) {
      gsap.fromTo(road, { drawSVG: '0% 0%' }, {
        drawSVG: '0% 100%', ease: 'none',
        scrollTrigger: { trigger: scene, start: 'top 85%', end: 'bottom 35%', scrub: 0.6 }
      });
    }
    if (parcel) {
      entrance(env, scene, 'top 55%', function () {
        gsap.set(parcel, { y: -140, opacity: 0 });
      }, function () {
        return gsap.to(parcel, { y: 0, opacity: 1, duration: 0.9, ease: drop, clearProps: 'transform,opacity' });
      });
    }
  }

  /* ------------------------------------------------------------ reel */
  function reel(env) {
    var root = env.root;
    var viewport = one('[data-cvw-reel-viewport]', root);
    var strip = one('[data-cvw-reel-strip]', root);
    var frames = all('[data-cvw-reel-frame]', root);
    var now = one('[data-cvw-reel-now]', root);
    if (!viewport || !strip || frames.length < 3) return;

    if (!env.wide) {
      entrance(env, root, 'top 75%', function () {
        gsap.set(frames, { opacity: 0, y: 40, rotation: function (i) { return i % 2 ? 3 : -3; } });
      }, function () {
        return gsap.to(frames, { opacity: 1, y: 0, rotation: 0, duration: 0.8, stagger: 0.07, ease: 'back.out(1.6)', clearProps: 'transform,opacity' });
      });
      return;
    }

    root.classList.add('is-pinned');
    viewport.scrollLeft = 0;
    function distance() {
      var pad = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
      return Math.max(0, strip.scrollWidth - (viewport.clientWidth - pad * 2));
    }
    var lean = gsap.quickTo(strip, 'skewX', { duration: 0.45, ease: 'power3.out' });
    var last = frames.length - 1;
    var run = gsap.to(strip, {
      x: function () { return -distance(); }, ease: 'none',
      scrollTrigger: {
        trigger: root, start: 'top top', end: function () { return '+=' + distance(); },
        pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: function (self) {
          var at = Math.round(self.progress * last);
          if (now) now.textContent = at + 1;
          if (env.reelSync) env.reelSync(at);
          lean(gsap.utils.clamp(-6, 6, self.getVelocity() / -260));
        }
      }
    });
    var settle = function () { lean(0); };
    ScrollTrigger.addEventListener('scrollEnd', settle);
    frames.forEach(function (frame) {
      var img = one('.cvw-reel__img', frame);
      if (!img) return;
      gsap.fromTo(img, { xPercent: 5 }, { xPercent: -5, ease: 'none', scrollTrigger: { containerAnimation: run, trigger: frame, start: 'left right', end: 'right left', scrub: true } });
    });

    /* prev/next while pinned: scroll the page to that frame's place in the pin */
    env.reelPinned = {
      index: function () { return Math.round(run.scrollTrigger.progress * last); },
      go: function (i) {
        var st = run.scrollTrigger;
        var y = st.start + (st.end - st.start) * (i / last);
        window.scrollTo({ top: Math.round(y) + 1, behavior: 'smooth' });
      }
    };
    env.off.push(function () {
      ScrollTrigger.removeEventListener('scrollEnd', settle);
      root.classList.remove('is-pinned');
      env.reelPinned = null;
    });
  }

  /* Reel prev/next buttons: behaviour, so they work in every mode (reduced motion, no GSAP). */
  function reelNav(root, base) {
    var prev = one('[data-cvw-reel-prev]', root);
    var next = one('[data-cvw-reel-next]', root);
    var viewport = one('[data-cvw-reel-viewport]', root);
    var frames = all('[data-cvw-reel-frame]', root);
    if ((!prev && !next) || !viewport || frames.length < 2) return;
    var buttons = [prev, next].filter(Boolean);
    var hiddenBefore = buttons.map(function (b) { return b.hidden; });
    buttons.forEach(function (b) { b.hidden = false; });

    function pinned() { return base.env && base.env.reelPinned; }
    function nearest() {
      var p = pinned();
      if (p) return p.index();
      var vr = viewport.getBoundingClientRect();
      var mid = vr.left + vr.width / 2, best = 0, gap = Infinity;
      frames.forEach(function (f, i) {
        var r = f.getBoundingClientRect();
        var d = Math.abs(r.left + r.width / 2 - mid);
        if (d < gap) { gap = d; best = i; }
      });
      return best;
    }
    function sync(at) {
      if (typeof at !== 'number') at = nearest();
      if (prev) prev.setAttribute('aria-disabled', at <= 0 ? 'true' : 'false');
      if (next) next.setAttribute('aria-disabled', at >= frames.length - 1 ? 'true' : 'false');
    }
    function go(step) {
      var i = Math.max(0, Math.min(frames.length - 1, nearest() + step));
      var p = pinned();
      if (p) { p.go(i); return; }
      var vr = viewport.getBoundingClientRect();
      var r = frames[i].getBoundingClientRect();
      viewport.scrollBy({ left: (r.left + r.width / 2) - (vr.left + vr.width / 2), behavior: reduceNow() ? 'auto' : 'smooth' });
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; sync(); });
    }
    function onPrev() { go(-1); }
    function onNext() { go(1); }
    if (prev) prev.addEventListener('click', onPrev);
    if (next) next.addEventListener('click', onNext);
    viewport.addEventListener('scroll', onScroll, { passive: true });
    base.reelSync = sync;
    sync(0);
    base.cleanups.push(function () {
      if (prev) prev.removeEventListener('click', onPrev);
      if (next) next.removeEventListener('click', onNext);
      viewport.removeEventListener('scroll', onScroll, { passive: true });
      buttons.forEach(function (b, k) { b.hidden = hiddenBefore[k]; b.removeAttribute('aria-disabled'); });
      base.reelSync = null;
    });
  }

  /* ------------------------------------------------------------ counter snapshots */
  function snap(env) {
    var root = env.root;
    var line = one('[data-cvw-snap-line]', root);
    var frames = all('[data-cvw-snap-frame]', root);
    var quote = one('[data-cvw-quote]', root);
    var stats = all('[data-cvw-snap-stats] .cvw-snap__stat', root);
    if (!frames.length) return;
    var pins = frames.map(function (f) { return one('.cvw-snap__pin', f); }).filter(Boolean);
    var photos = frames.map(function (f) { return one('.cvw-snap__photo', f); }).filter(Boolean);
    var drawn = line && window.DrawSVGPlugin;

    entrance(env, root, 'top 78%', function () {
      if (pins.length) gsap.set(pins, { scale: 0, transformOrigin: '50% 0%' });
      if (photos.length) gsap.set(photos, { opacity: 0, y: -22 });
      if (quote) gsap.set(quote, { opacity: 0, y: 16 });
      if (stats.length) gsap.set(stats, { opacity: 0, y: 14 });
      if (drawn) gsap.set(line, { drawSVG: '0%' });
    }, function () {
      var tl = gsap.timeline();
      if (drawn) tl.to(line, { drawSVG: '100%', duration: 0.7, ease: 'power2.inOut' }, 0);
      if (pins.length) tl.to(pins, { scale: 1, duration: 0.6, stagger: 0.12, ease: drop, clearProps: 'transform' }, drawn ? 0.25 : 0);
      if (photos.length) tl.to(photos, { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: 'power3.out', clearProps: 'opacity' }, drawn ? 0.4 : 0.12);
      if (quote) tl.to(quote, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.25');
      if (stats.length) tl.to(stats, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out', clearProps: 'transform,opacity' }, '-=0.3');
      tl.call(function () {
        /* the photos sway on their line three times, then hang still (paused offscreen) */
        if (!photos.length) return;
        ambient(env, gsap.to(photos, {
          rotation: function (i) { return i % 2 ? 1.6 : -1.6; },
          duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: 5, stagger: { each: 0.3, from: 'random' },
          onComplete: function () { gsap.set(photos, { clearProps: 'transform' }); }
        }));
      });
      return tl;
    });
  }

  /* ------------------------------------------------------------ showcase */
  function showcase(env) {
    var root = env.root;
    var cards = all('[data-cvw-card]', root);
    if (!cards.length) return;
    entrance(env, root, 'top 72%', function () {
      gsap.set(cards.filter(function (c) { return !c.hidden; }), { opacity: 0 });
    }, function () {
      /* Only the cards on the counter deal in; a hidden spare (cv-pdp-story.js) shows as is if brought in later. */
      var shown = cards.filter(function (c) { return !c.hidden; });
      gsap.set(cards.filter(function (c) { return c.hidden; }), { clearProps: 'opacity' });
      if (!shown.length) return null;
      var mid = shown[Math.floor(shown.length / 2)].getBoundingClientRect();
      var midX = mid.left + mid.width / 2;
      return gsap.fromTo(shown,
        { opacity: 1, y: 90, x: function (i) { if (!env.wide) return 0; var r = shown[i].getBoundingClientRect(); return midX - (r.left + r.width / 2); }, rotation: function (i) { return [-10, 3, 12][i % 3]; } },
        { y: 0, x: 0, rotation: 0, duration: 1.1, stagger: 0.14, ease: 'expo.out', clearProps: 'transform,opacity' });
    });
    if (env.hover && env.wide) {
      cards.forEach(function (card) {
        var link = one('.cvw-card__link', card);
        if (!link) return;
        gsap.set(link, { transformPerspective: 900 });
        tilt(env, link, 12, 10);
      });
    }
  }

  /* ------------------------------------------------------------ shelves */
  function row(env) {
    var root = env.root;
    var items = all('[data-cvw-row-item]', root);
    var boxes = items.map(function (i) { return one('.cvw-row__box', i); }).filter(Boolean);
    if (!boxes.length) return;
    entrance(env, root, 'top 75%', function () {
      gsap.set(boxes, { y: -130, opacity: 0, rotation: function () { return gsap.utils.random(-12, 12); } });
    }, function () {
      return gsap.to(boxes, { y: 0, opacity: 1, rotation: 0, duration: 1, stagger: 0.12, ease: drop, clearProps: 'transform,opacity' });
    });
    if (env.hover && wiggle) {
      items.forEach(function (item) {
        var box = one('.cvw-row__box', item);
        if (!box) return;
        listen(env, item, 'pointerenter', function () {
          gsap.fromTo(box, { rotation: 0 }, { rotation: 3, duration: 0.8, ease: wiggle, overwrite: 'auto' });
        });
      });
    }
  }

  /* ------------------------------------------------------------ promises + close */
  function guarantee(env) {
    var root = env.root;
    var marks = all('.cvp-faq__mark', root);
    var close = one('[data-cvw-close]', root);
    if (marks.length) {
      entrance(env, one('.cvp-faq', root) || root, 'top 85%', function () {
        gsap.set(marks, { scale: 0 });
      }, function () {
        return gsap.to(marks, { scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(3)', clearProps: 'transform' });
      });
    }
    if (!close) return;
    var sweets = all('.cvw-close__sweet', close);
    var vows = all('[data-cvw-vow]', close);
    var stamps = all('.cvw-vow__stamp', close);
    entrance(env, close, 'top 88%', function () {
      gsap.set(close, { opacity: 0, y: 60 });
      if (sweets.length) gsap.set(sweets, { scale: 0.3, opacity: 0 });
      if (vows.length) { gsap.set(vows, { opacity: 0, x: -18 }); gsap.set(stamps, { opacity: 0, scale: 2.6, rotation: -40 }); }
    }, function () {
      var tl = gsap.timeline();
      tl.to(close, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity' }, 0);
      if (vows.length) {
        /* each promise is rubber-stamped onto the card */
        tl.to(vows, { opacity: 1, x: 0, duration: 0.5, stagger: 0.18, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.35);
        /* the stamps' resting tilt is CSS rotate, so the stamp lands on 0 */
        tl.to(stamps, { opacity: 1, scale: 1, rotation: 0, duration: 0.45, stagger: 0.18, ease: drop, clearProps: 'transform,opacity' }, 0.5);
      }
      if (sweets.length) {
        tl.to(sweets, {
          scale: 1, opacity: 1, duration: 0.8, stagger: 0.14, ease: 'back.out(2.4)', clearProps: 'opacity',
          onComplete: function () {
            /* the sweets bob three times, then rest (paused offscreen) */
            ambient(env, gsap.to(sweets, {
              y: function (i) { return i ? 8 : -10; }, rotation: '+=6',
              duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: 5,
              onComplete: function () { gsap.set(sweets, { clearProps: 'transform' }); }
            }));
          }
        }, 0.3);
      }
      return tl;
    });
    magnet(env, one('[data-cvw-magnet]', close));
  }

  /* ------------------------------------------------------------ counter clips */
  /* Restrained on purpose: three clips already move, so this section is set
     down once and then leaves the footage alone. The screens are content, so
     they never fade: they are only set down (offset, tilt, scale). */
  function ugc(env) {
    var root = env.root;
    var clips = all('[data-cvw-ugc-clip]', root);
    if (!clips.length) return;
    var screens = clips.map(function (c) { return one('.cvw-ugc__screen', c); }).filter(Boolean);
    var tags = clips.map(function (c) { return one('.cvw-ugc__tag', c); }).filter(Boolean);
    var counter = one('.cvw-ugc__counter', root);
    var lean = [-6, 3, 8];

    entrance(env, root, 'top 76%', function () {
      if (counter) gsap.set(counter, { scaleX: 0, transformOrigin: '50% 50%' });
      if (screens.length) gsap.set(screens, { y: 72, scale: 0.94, rotation: function (i) { return lean[i % lean.length]; } });
      if (tags.length) gsap.set(tags, { opacity: 0, scale: 0.6 });
    }, function () {
      var tl = gsap.timeline();
      if (counter) tl.to(counter, { scaleX: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform' }, 0);
      /* each clip is set down on the counter and settles */
      if (screens.length) tl.to(screens, { y: 0, scale: 1, rotation: 0, duration: 0.9, stagger: 0.11, ease: drop, clearProps: 'transform' }, 0.15);
      if (tags.length) tl.to(tags, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.11, ease: 'back.out(3)', clearProps: 'transform,opacity' }, 0.5);
      return tl;
    });

    /* the footage drifts a little inside its frame as the page moves past it */
    clips.forEach(function (clip) {
      var media = one('.cvw-ugc__video', clip) || one('.cvw-ugc__still', clip);
      if (!media) return;
      gsap.set(media, { scale: 1.07 });
      gsap.fromTo(media, { yPercent: -2.2 }, {
        yPercent: 2.2, ease: 'none',
        scrollTrigger: { trigger: clip, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* a screen leans toward the pointer, the same way the showcase cards do */
    if (env.hover && env.wide) screens.forEach(function (screen) { tilt(env, screen, 9, 7); });
  }

  var KINDS = [
    ['data-cvw-ribbon', ribbon],
    ['data-cvw-trust', trust],
    ['data-cvw-spot', spotlight],
    ['data-cvw-value', value],
    ['data-cvw-compare', compare],
    ['data-cvw-journey', journey],
    ['data-cvw-reel', reel],
    ['data-cvw-snap', snap],
    ['data-cvw-showcase', showcase],
    ['data-cvw-row', row],
    ['data-cvw-guarantee', guarantee],
    ['data-cvw-ugc', ugc]
  ];

  /* ------------------------------------------------------------ lifecycle */
  function init(root) {
    if (!root) return;
    if (root._cvw) destroy(root);
    var base = root._cvw = { cleanups: [], env: null, mm: null, reelSync: null };
    live.push(root);

    if (root.hasAttribute('data-cvw-reel')) reelNav(root, base);
    if (!motionOK) return;

    var mm = base.mm = gsap.matchMedia();
    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      wide: '(min-width: 990px)',
      hover: '(hover: hover)'
    }, function (context) {
      if (!context.conditions.motion) { root.classList.remove(PENDING); return; }
      var env = base.env = {
        root: root, wide: context.conditions.wide, hover: context.conditions.hover,
        armed: [], anims: [], loops: [], off: [], viewFns: [], visible: true,
        reelSync: function (at) { if (base.reelSync) base.reelSync(at); }
      };
      var loopy = root.hasAttribute('data-cvw-ribbon') || root.hasAttribute('data-cvw-snap') || root.hasAttribute('data-cvw-guarantee') || !!one('.cv-ico--anim', root);
      if (loopy) watchView(env);
      headings(env);
      KINDS.forEach(function (k) { if (root.hasAttribute(k[0])) k[1](env); });
      listen(env, document, 'visibilitychange', function () {
        env.loops.forEach(function (t) {
          if (env.visible && !document.hidden && t.progress() < 1) t.play(); else t.pause();
        });
      });
      gsap.delayedCall(1.4, sweep);
      return function () {
        env.off.forEach(function (fn) { fn(); });
        root.classList.remove(PENDING);
        if (base.env === env) base.env = null;
      };
    }, root);
  }

  function finish(root) {
    var base = root && root._cvw;
    var env = base && base.env;
    if (!env) return;
    env.armed.forEach(function (a) {
      if (a.finish) a.finish(); else a.run();
      if (a.anim) a.anim.progress(1);
    });
    env.anims.forEach(function (t) { t.progress(1); });
    markPending(env);
  }

  function destroy(root) {
    var base = root && root._cvw;
    if (!base) return;
    if (base.mm) base.mm.revert();
    base.cleanups.forEach(function (fn) { fn(); });
    root.classList.remove(PENDING);
    live = live.filter(function (r) { return r !== root; });
    delete root._cvw;
  }

  function rootsIn(node) {
    if (!node || !node.querySelectorAll) return [];
    var out = node.matches && node.matches(ROOT) ? [node] : [];
    return out.concat(all(ROOT, node));
  }

  var refreshTimer = 0;
  function refreshSoon() {
    if (!ScrollTrigger) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 60);
  }

  function boot(scope) {
    rootsIn(scope).forEach(init);
    refreshSoon();
  }

  boot(document);

  if (ScrollTrigger) {
    ScrollTrigger.addEventListener('refresh', sweep);
    ScrollTrigger.addEventListener('scrollEnd', sweep);
    window.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { refreshSoon(); });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) sweep(); });

  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) { rootsIn(e.target).forEach(destroy); refreshSoon(); });
  document.addEventListener('shopify:section:select', function (e) { rootsIn(e.target).forEach(finish); refreshSoon(); });
  document.addEventListener('shopify:block:select', function (e) {
    var root = e.target && e.target.closest && e.target.closest(ROOT);
    if (!root) return;
    finish(root);
    var env = root._cvw && root._cvw.env;
    if (env && env.hold) env.hold(true);
  });
  document.addEventListener('shopify:block:deselect', function (e) {
    var root = e.target && e.target.closest && e.target.closest(ROOT);
    var env = root && root._cvw && root._cvw.env;
    if (env && env.hold) env.hold(false);
  });
})();
