/* Casify: case rail (sections/cv-case-rail.liquid, styles in cv-case-rail.css).
 *
 * The rail is a native horizontal scroller with snap points, so touch,
 * trackpad and keyboard scroll it the browser's own way. Everything that
 * moves is GSAP: quickSetters place each case from where the rail stands
 * (the case in front faces the shopper, the rest turn edge-on), a spring on
 * gsap.ticker swings the cards and their tags from the rail's speed,
 * Draggable + InertiaPlugin let a mouse drag and throw the rail onto a case
 * (loaded by the layout through data-cv-gsap-drag), and tweens roll the tag
 * prices, peel the sticker, pop the saving and take a case off the rail.
 * Only --oa (the side cases' shade) is left to CSS.
 *
 * GSAP choreography (gsap.matchMedia, so a change of the reduced-motion
 * setting reverts it): the entrance draws the rod, drops the cases onto their
 * hooks and prints the ticket; ScrollTrigger pins the rail and lets the page
 * scroll flip through it when it fits the screen (otherwise a one-time peek
 * glide); the rack sways with the page's scroll speed; the front card tilts
 * toward the cursor and the sticker corner lifts on hover.
 *
 * The section is complete without this file: a flat row of linked cases and
 * the first case's ticket. Under reduced motion the rail stays flat, nothing
 * swings, the sticker and sheet change without movement (live: a change of
 * the OS setting applies at once). GSAP is optional; without it glides use
 * native smooth scrolling and the sticker swaps without the peel.
 *
 * Choose your phone is the quick pick opener (data-cvqp-open); this file
 * only points it at the case in front. Re-initialises in the theme editor.
 */
(function () {
  'use strict';

  /* The section prints this file once per placement; run it once. */
  if (window.CasifyCaseRail) return;
  window.CasifyCaseRail = true;

  var SELECTOR = '[data-cvrl]';
  function one(q, ctx) { return (ctx || document).querySelector(q); }
  function all(q, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(q)); }
  function fill(template, values) {
    return String(template || '').replace(/\[(\w+)\]/g, function (m, key) { return key in values ? values[key] : m; });
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function readJson(el, fallback) {
    try { return el ? JSON.parse(el.textContent) : fallback; } catch (e) { return fallback; }
  }

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* Sutherland-Hodgman clip of a polygon by the half plane x + y <= d (keep
     below) or x + y >= d. The sticker peels along that diagonal. */
  function clipDiagonal(points, d, keepBelow) {
    var out = [];
    for (var k = 0; k < points.length; k++) {
      var a = points[k];
      var b = points[(k + 1) % points.length];
      var fa = a[0] + a[1] - d;
      var fb = b[0] + b[1] - d;
      var inA = keepBelow ? fa <= 0 : fa >= 0;
      var inB = keepBelow ? fb <= 0 : fb >= 0;
      if (inA) out.push(a);
      if (inA !== inB) {
        var t = fa / (fa - fb);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return out;
  }
  function polygon(points) {
    if (points.length < 3) return 'polygon(0 0, 0 0, 0 0)';
    return 'polygon(' + points.map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(', ') + ')';
  }

  function init(root) {
    if (!root) return;
    if (root._cvrlDestroy) root._cvrlDestroy();

    var track = one('[data-cvrl-track]', root);
    var slots = all('[data-cvrl-slot]', root);
    var items = readJson(one('[data-cvrl-items]', root), []);
    var labels = readJson(one('[data-cvrl-labels]', root), {});
    if (!track || !slots.length || items.length !== slots.length) return;

    var n = slots.length;
    var nav = one('[data-cvrl-nav]', root);
    var ticket = one('[data-cvrl-ticket]', root);
    var sheet = one('[data-cvrl-sheet]', root);
    var openBtn = one('[data-cvrl-open]', root);
    var status = one('[data-cvrl-status]', root);
    var canSheet = !!(sheet && typeof sheet.showModal === 'function');

    var abort = new AbortController();
    var on = function (target, type, handler, opts) {
      var o = { signal: abort.signal };
      if (opts) for (var k in opts) o[k] = opts[k];
      target.addEventListener(type, handler, o);
    };

    var index = 0;
    var pos = 0;
    var pitch = 1;
    var motion = false;
    var pack = false;
    var sheetOpen = false;
    var photo = 0;
    var opener = null;
    var lastAnnounced = -1;
    var aim = null;
    var glide = null;
    var driver = null;
    var entrance = null;
    var mm = null;
    function stopGlide() {
      if (glide) { glide.kill(); glide = null; }
      if (stopThrow) stopThrow();
    }
    var interacted = false;
    var settleTimer = 0;
    var dragging = false;
    var stopThrow = null;
    var tweens = [];
    function hold(tween) { if (tween) tweens.push(tween); return tween; }
    function gsapOk() { return !!window.gsap && motion; }

    /* ---------- where the rail stands ---------- */
    function measure() {
      /* The computed width ignores the 3D turn GSAP puts on the slots (a bounding
         box would not) and keeps the fraction offsetWidth rounds away. */
      pitch = parseFloat(window.getComputedStyle(slots[0]).width) || slots[0].offsetWidth || 1;
      squeeze = pitch * 0.56;
    }

    /* The rail in 3D, placed by GSAP quickSetters: the case in front faces
       the shopper, the rest turn edge-on and close up along the rail. The
       turn goes on each hanger, never on the list item: the items are the
       scroll-snap targets, and the browser would snap to their turned boxes. */
    var TURN = 62;
    var squeeze = 1;
    var place = slots.map(function () { return { o: 0, peek: 0 }; });
    var setters = null;
    function makeSetters() {
      var gsap = window.gsap;
      return slots.map(function (slot) {
        var hanger = one('[data-cvrl-hanger]', slot);
        gsap.set(hanger, { transformOrigin: '50% 8px', transformPerspective: 1100 });
        return {
          x: gsap.quickSetter(hanger, 'x', 'px'),
          z: gsap.quickSetter(hanger, 'z', 'px'),
          turn: gsap.quickSetter(hanger, 'rotationY', 'deg')
        };
      });
    }
    function placeSlot(i) {
      var o = place[i].o;
      var oc = clamp(o, -1, 1);
      var a = Math.abs(o);
      setters[i].x(-(o - oc) * squeeze);
      setters[i].z(-Math.min(1, a) * 80);
      setters[i].turn(-oc * TURN * (1 - place[i].peek));
      slots[i].style.zIndex = String(100 - Math.round(a * 10));
    }
    function frontOf(scrollLeft) {
      return clamp(Math.round(scrollLeft / pitch), 0, n - 1);
    }
    function paint() {
      pos = track.scrollLeft / pitch;
      for (var i = 0; i < n; i++) {
        var o = i - pos;
        place[i].o = o;
        slots[i].style.setProperty('--oa', Math.min(1, Math.abs(o)).toFixed(3));
        if (setters) placeSlot(i);
      }
      var next = frontOf(track.scrollLeft);
      if (next !== index && !sheetOpen) setFront(next, true);
    }

    function setFront(i, animate) {
      if (slots[index]) slots[index].classList.remove('is-front');
      index = i;
      slots[index].classList.add('is-front');
      if (nav) {
        var counter = one('[data-cvrl-index]', nav);
        if (counter) {
          var was = Number(counter.textContent) || 1;
          counter.textContent = (index + 1 < 10 ? '0' : '') + (index + 1);
          if (animate && gsapOk()) hold(window.gsap.fromTo(counter, { yPercent: index + 1 > was ? 70 : -70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.28, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }));
        }
        all('[data-cvrl-step]', nav).forEach(function (b) {
          b.disabled = Number(b.getAttribute('data-cvrl-step')) < 0 ? index === 0 : index === n - 1;
        });
      }
      var p = (index + 1) / n;
      root.style.setProperty('--cvrl-p', p.toFixed(4));
      var bar = nav && one('[data-cvrl-bar]', nav);
      if (bar && window.gsap) hold(window.gsap.to(bar, { scaleX: p, duration: animate && motion ? 0.35 : 0, ease: 'power3.out', overwrite: true }));
      fillInfo(ticket, index, animate);
    }

    function announce() {
      if (!status || !interacted || lastAnnounced === index) return;
      lastAnnounced = index;
      status.textContent = fill(root.getAttribute('data-status-label'), { n: index + 1, total: n, title: items[index].title });
    }

    /* ---------- the ticket and the sheet show one case ---------- */
    function fillInfo(scope, i, animate) {
      if (!scope) return;
      var item = items[i];
      all('[data-cvrl-no]', scope).forEach(function (el) { el.textContent = (labels.number || '') + ' ' + item.no; });
      var name = one('[data-cvrl-name]', scope);
      if (name) { name.textContent = item.title; name.href = item.url; }
      var sheetName = one('[data-cvrl-sheet-name]', scope);
      if (sheetName) sheetName.textContent = item.title;
      var fit = one('[data-cvrl-fit]', scope);
      if (fit) {
        fit.hidden = !(item.fit > 1);
        fit.textContent = item.fit > 1 ? fill(labels.fit, { count: item.fit }) : '';
      }
      var wasLine = one('[data-cvrl-was-line]', scope);
      if (wasLine) {
        wasLine.hidden = !item.was;
        var was = one('[data-cvrl-was]', wasLine);
        if (was) was.textContent = item.was;
      }
      var mix = one('[data-cvrl-mix]', scope);
      if (mix) mix.hidden = !item.pack;
      fillPrice(one('[data-cvrl-pricing]', scope), item);

      all('[data-cvrl-choose]', scope).forEach(function (btn) {
        btn.href = item.url;
        btn.setAttribute('data-handle', item.handle);
        btn.setAttribute('data-url', item.url);
        var label = one('[data-cvrl-choose-label]', btn);
        var text = !item.available ? btn.getAttribute('data-sold-label') : item.fit > 0 ? btn.getAttribute('data-choose-label') : btn.getAttribute('data-options-label');
        if (label) label.textContent = text;
        if (item.available) {
          btn.setAttribute('data-cvqp-open', '');
          btn.removeAttribute('aria-disabled');
          btn.removeAttribute('tabindex');
        } else {
          btn.removeAttribute('data-cvqp-open');
          btn.setAttribute('aria-disabled', 'true');
          btn.setAttribute('tabindex', '-1');
        }
      });
      var link = one('[data-cvrl-link]', scope);
      if (link) link.href = item.url;

      if (animate && gsapOk()) {
        var moving = all('[data-cvrl-name], [data-cvrl-sheet-name], [data-cvrl-price], [data-cvrl-pack]', scope);
        window.gsap.killTweensOf(moving);
        hold(window.gsap.fromTo(moving, { yPercent: 45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.32, ease: 'power3.out', stagger: 0.03, clearProps: 'transform,opacity,visibility' }));
      }
    }

    function fillPrice(block, item) {
      if (!block) return;
      var single = !item.pack;
      block.classList.toggle('is-single', single);
      var price = one('[data-cvrl-price]', block);
      if (price) price.textContent = item.price;
      var from = one('[data-cvrl-from]', block);
      if (from) { from.hidden = !item.from; from.textContent = item.from || ''; }
      var packEl = one('[data-cvrl-pack]', block);
      if (packEl) packEl.textContent = item.pack || '';
      var sticker = one('[data-cvrl-sticker]', block);
      if (sticker) {
        sticker.disabled = single;
        if (single) { sticker.setAttribute('aria-hidden', 'true'); sticker.setAttribute('tabindex', '-1'); }
        else { sticker.removeAttribute('aria-hidden'); sticker.removeAttribute('tabindex'); }
      }
      var note = one('[data-cvrl-note]', block);
      if (note) note.hidden = single;
      var sr = one('[data-cvrl-price-sr]', block);
      if (sr) sr.textContent = priceText(item, false);
    }

    function priceText(item, packFirst) {
      var oneText = root.getAttribute('data-one-label') + ' ' + (item.from ? item.from + ' ' : '') + item.price;
      if (!item.pack) return oneText;
      var packText = item.pack + ' ' + root.getAttribute('data-pack-label');
      return packFirst ? packText + ', ' + oneText : oneText + ', ' + packText;
    }

    /* ---------- moving the rail ---------- */
    function glideTo(i, instant) {
      i = clamp(i, 0, n - 1);
      var left = i * pitch;
      interacted = true;
      aim = null;
      stopGlide();
      if (driver && driver.isActive) {
        /* Pinned: the page scroll owns the rail, so move the page to this case. */
        var y = driver.start + (n > 1 ? i / (n - 1) : 0) * (driver.end - driver.start);
        if (window.ScrollToPlugin && motion) {
          aim = i;
          glide = hold(window.gsap.to(window, { scrollTo: y, duration: 0.55, ease: 'power2.inOut', onComplete: function () { aim = null; }, onInterrupt: function () { aim = null; } }));
        } else {
          window.scrollTo(0, y);
        }
        return;
      }
      if (instant || !motion) {
        root.classList.remove('is-gliding');
        track.scrollTo({ left: left, behavior: 'auto' });
        paint();
        return;
      }
      if (window.gsap) {
        aim = i;
        root.classList.add('is-gliding');
        var steps = Math.abs(left - track.scrollLeft) / pitch;
        glide = hold(window.gsap.to(track, {
          scrollLeft: left,
          duration: clamp(0.38 + steps * 0.07, 0.38, 1.1),
          ease: 'power3.out',
          onComplete: function () { aim = null; root.classList.remove('is-gliding'); },
          onInterrupt: function () { aim = null; root.classList.remove('is-gliding'); }
        }));
      } else {
        track.scrollTo({ left: left, behavior: 'smooth' });
      }
    }

    /* The swing: one spring for the cards, a looser one that follows it for
       the tags. The rail's speed pushes them; they settle on their own. */
    var swing = { a: 0, w: 0, t: 0, tw: 0, lastLeft: 0, speed: 0, push: 0 };
    var hangers = all('[data-cvrl-hanger]', root);
    var tagRigs = all('[data-cvrl-tag]', root);
    var setSwing = null;
    var setTagSwing = null;
    var ticking = false;
    function kick(push) {
      if (!motion) return;
      swing.w += push;
      run();
    }
    function run() {
      if (ticking || !motion || !window.gsap) return;
      if (!setSwing) {
        window.gsap.set(hangers, { transformOrigin: '50% 8px' });
        window.gsap.set(tagRigs, { transformOrigin: '50% -15px' });
        setSwing = window.gsap.quickSetter(hangers, 'rotation', 'deg');
        setTagSwing = window.gsap.quickSetter(tagRigs, 'rotation', 'deg');
      }
      ticking = true;
      swing.lastLeft = track.scrollLeft;
      window.gsap.ticker.add(step);
    }
    function step(time, deltaTime) {
      var dt = Math.min(0.05, Math.max(0.001, (deltaTime || 16) / 1000));
      var left = track.scrollLeft;
      var v = (left - swing.lastLeft) / Math.max(dt, 0.001);
      swing.lastLeft = left;
      swing.speed += (v - swing.speed) * 0.35;
      swing.push *= 0.9;
      var target = clamp(-swing.speed * 0.006 + swing.push, -9, 9);
      swing.w += (-46 * (swing.a - target) - 4.2 * swing.w) * dt;
      swing.a += swing.w * dt;
      swing.tw += (-22 * (swing.t - swing.a * 1.7) - 2.6 * swing.tw) * dt;
      swing.t += swing.tw * dt;
      setSwing(swing.a);
      setTagSwing(swing.t);
      var busy = Math.abs(swing.a) > 0.03 || Math.abs(swing.w) > 0.05 || Math.abs(swing.t) > 0.03 || Math.abs(swing.tw) > 0.05 || Math.abs(swing.speed) > 2 || Math.abs(swing.push) > 0.05;
      if (!busy || !motion) {
        window.gsap.ticker.remove(step);
        ticking = false;
        swing.speed = 0;
      }
    }
    function stopSwing() {
      if (ticking && window.gsap) window.gsap.ticker.remove(step);
      ticking = false;
      swing.a = swing.w = swing.t = swing.tw = swing.speed = swing.push = 0;
      if (setSwing && window.gsap) {
        window.gsap.set(hangers, { rotation: 0 });
        window.gsap.set(tagRigs, { clearProps: 'transform' });
      }
      setSwing = setTagSwing = null;
    }

    var paintQueued = false;
    on(track, 'scroll', function () {
      if (!paintQueued) {
        paintQueued = true;
        var flush = function () { paintQueued = false; paint(); };
        if (window.gsap) window.gsap.ticker.add(flush, true);
        else requestAnimationFrame(flush);
      }
      root.classList.add('is-moving');
      if (motion) run();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        root.classList.remove('is-moving');
        paint();
        announce();
      }, 140);
    }, { passive: true });

    /* Mouse drag and throw: GSAP Draggable + InertiaPlugin (choreograph()). */
    var suppressClick = false;
    function touched() { interacted = true; }
    on(track, 'pointerdown', touched);
    on(track, 'wheel', touched, { passive: true });
    on(track, 'keydown', touched);
    on(track, 'dragstart', function (e) { e.preventDefault(); });

    /* A side case comes to the front; the front case comes off the rail. */
    on(track, 'click', function (e) {
      var link = e.target.closest('[data-cvrl-case]');
      if (!link) return;
      if (suppressClick) { e.preventDefault(); return; }
      paint();
      var i = slots.indexOf(link.closest('[data-cvrl-slot]'));
      if (i < 0) return;
      if (i !== index || Math.abs(pos - index) > 0.25) {
        e.preventDefault();
        glideTo(i);
        return;
      }
      if (openSheet(link)) e.preventDefault();
    });
    on(track, 'focusin', function (e) {
      if (dragging || !e.target.matches(':focus-visible')) return;
      var slot = e.target.closest('[data-cvrl-slot]');
      var i = slots.indexOf(slot);
      if (i >= 0 && i !== index) glideTo(i);
    });
    on(track, 'keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var i = clamp((aim !== null ? aim : index) + (e.key === 'ArrowRight' ? 1 : -1), 0, n - 1);
      e.preventDefault();
      var link = one('[data-cvrl-case]', slots[i]);
      if (link) link.focus({ preventScroll: true });
      glideTo(i);
    });

    on(root, 'click', function (e) {
      var stepBtn = e.target.closest('[data-cvrl-step]');
      if (!stepBtn || stepBtn.disabled) return;
      var dir = Number(stepBtn.getAttribute('data-cvrl-step')) || 0;
      if (!sheetOpen && aim === null) paint();
      var from = aim !== null && !sheetOpen ? aim : index;
      var i = clamp(from + dir, 0, n - 1);
      if (i === from) return;
      if (sheetOpen) showInSheet(i);
      glideTo(i, sheetOpen && !motion);
    });

    /* ---------- the price sticker ---------- */
    var blocks = all('[data-cvrl-pricing]', root);
    var peel = { d: 0 };
    var peelTween = null;
    function size(block) {
      var s = one('[data-cvrl-sticker]', block);
      return { w: s.offsetWidth || 232, h: s.offsetHeight || 88 };
    }
    function drawPeel(d) {
      blocks.forEach(function (block) {
        var box = size(block);
        var w = box.w;
        var h = box.h;
        var max = w + h;
        var rect = [[0, 0], [w, 0], [w, h], [0, h]];
        var foil = one('[data-cvrl-foil]', block);
        var flap = one('[data-cvrl-flap] span', block);
        var wrap = one('[data-cvrl-flap]', block);
        if (d <= 0.5) {
          foil.style.clipPath = '';
          flap.style.clipPath = '';
          wrap.style.opacity = '';
          return;
        }
        foil.style.clipPath = polygon(clipDiagonal(rect, d, false));
        var lifted = clipDiagonal(rect, d, true).map(function (p) { return [d - p[1], d - p[0]]; });
        flap.style.clipPath = polygon(lifted);
        flap.style.setProperty('--f', (d / Math.SQRT2).toFixed(1) + 'px');
        var fade = clamp((d / max - 0.72) / 0.28, 0, 1);
        wrap.style.opacity = String(1 - fade);
      });
    }
    function maxPeel() {
      var box = blocks.length ? size(blocks[0]) : { w: 232, h: 88 };
      return box.w + box.h;
    }
    function setPack(next, how) {
      if (!items[index].pack && next) return;
      var changed = next !== pack;
      pack = next;
      root.classList.toggle('is-pack', pack);
      var badges = all('.cvrl-price__save', root);
      if (changed && gsapOk()) {
        rollTags();
        if (pack) window.gsap.set(badges, { autoAlpha: 0 });
        else window.gsap.set(badges, { clearProps: 'transform,opacity,visibility' });
      }
      if (pack && !root.classList.contains('is-peeled-once')) {
        var notes = all('[data-cvrl-note]', root);
        if (gsapOk()) {
          hold(window.gsap.to(notes, { autoAlpha: 0, y: -8, duration: 0.35, ease: 'power2.in', onComplete: function () {
            root.classList.add('is-peeled-once');
            window.gsap.set(notes, { clearProps: 'transform,opacity,visibility' });
          } }));
        } else {
          root.classList.add('is-peeled-once');
        }
      }
      all('[data-cvrl-sticker]', root).forEach(function (s) {
        s.setAttribute('aria-pressed', pack ? 'true' : 'false');
        s.setAttribute('aria-label', root.getAttribute(pack ? 'data-stick-label' : 'data-peel-label'));
      });
      if (changed) {
        var live = one('[data-cvrl-price-status]', sheetOpen ? sheet : ticket);
        if (live) live.textContent = priceText(items[index], pack);
      }
      if (peelTween) { peelTween.kill(); peelTween = null; }
      var max = maxPeel();
      if (!gsapOk() || how === 'instant') {
        peel.d = 0;
        drawPeel(0);
        root.classList.toggle('is-peeled', pack);
        return;
      }
      if (!pack) {
        if (root.classList.contains('is-peeled')) { peel.d = max; drawPeel(max); root.classList.remove('is-peeled'); }
      }
      peelTween = hold(window.gsap.to(peel, {
        d: pack ? max : 0,
        duration: pack ? 0.72 : 0.5,
        ease: pack ? 'power2.inOut' : 'power3.out',
        onUpdate: function () { drawPeel(peel.d); },
        onComplete: function () {
          peelTween = null;
          if (pack) {
            root.classList.add('is-peeled');
            peel.d = 0;
            drawPeel(0);
            hold(window.gsap.fromTo(badges, { scale: 0.3, rotation: -28, autoAlpha: 0 }, { scale: 1, rotation: -5, autoAlpha: 1, duration: 0.55, ease: 'back.out(2.6)', clearProps: 'transform,opacity,visibility' }));
          } else if (blocks.length) {
            kickSticker();
          }
        }
      }));
    }

    /* Every tag on the rail rolls to its other price, rippling out from the
       case in front, and the tags swing with it. */
    function rollTags() {
      var rolls = all('.cvrl__tag-roll', root).filter(function (r) { return one('.cvrl__tag-pack', r); });
      if (!rolls.length) return;
      var ones = rolls.map(function (r) { return one('.cvrl__tag-one', r); });
      var packs = rolls.map(function (r) { return one('.cvrl__tag-pack', r); });
      var ripple = function (k, el) { return Math.min(8, Math.abs(slots.indexOf(el.closest('[data-cvrl-slot]')) - index)) * 0.045; };
      window.gsap.killTweensOf(ones.concat(packs));
      hold(window.gsap.fromTo(ones, { yPercent: pack ? 0 : -140 }, { yPercent: pack ? -140 : 0, duration: 0.5, ease: 'back.out(1.8)', stagger: ripple, clearProps: 'transform' }));
      hold(window.gsap.fromTo(packs, { yPercent: pack ? 140 : 0 }, { yPercent: pack ? 0 : 140, duration: 0.5, ease: 'back.out(1.8)', stagger: ripple, clearProps: 'transform' }));
      swing.tw += pack ? 90 : -90;
      run();
    }
    function kickSticker() {
      var visible = all('[data-cvrl-sticker]', sheetOpen ? sheet : ticket);
      hold(window.gsap.fromTo(visible, { scale: 1.04 }, { scale: 1, duration: 0.4, ease: 'back.out(3)', clearProps: 'transform' }));
    }

    var peelDrag = null;
    blocks.forEach(function (block) {
      var sticker = one('[data-cvrl-sticker]', block);
      if (!sticker) return;
      on(sticker, 'click', function (e) {
        if (peelDrag && peelDrag.used) { e.preventDefault(); return; }
        if (sticker.disabled) return;
        interacted = true;
        setPack(!pack);
      });
      on(sticker, 'pointerdown', function (e) {
        if (sticker.disabled || pack || !gsapOk() || (e.pointerType === 'mouse' && e.button !== 0)) return;
        peelDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, used: false, w: sticker.offsetWidth || 232 };
      });
      on(sticker, 'pointermove', function (e) {
        if (!peelDrag || e.pointerId !== peelDrag.id) return;
        var dx = e.clientX - peelDrag.x;
        var dy = e.clientY - peelDrag.y;
        if (!peelDrag.used && dx > 6 && dx > Math.abs(dy)) {
          peelDrag.used = true;
          try { sticker.setPointerCapture(e.pointerId); } catch (err) { /* released */ }
          if (peelTween) { peelTween.kill(); peelTween = null; }
        }
        if (!peelDrag.used) return;
        peel.d = clamp((dx + Math.max(0, dy) * 0.4) * maxPeel() / (peelDrag.w * 0.9), 0, maxPeel());
        drawPeel(peel.d);
      });
      function release(e) {
        if (!peelDrag || e.pointerId !== peelDrag.id) return;
        var used = peelDrag.used;
        if (!used) { peelDrag = null; return; }
        interacted = true;
        var through = peel.d > maxPeel() * 0.34 && e.type !== 'pointercancel';
        if (through) setPack(true);
        else {
          peelTween = hold(window.gsap.to(peel, { d: 0, duration: 0.35, ease: 'back.out(1.6)', onUpdate: function () { drawPeel(peel.d); }, onComplete: function () { peelTween = null; } }));
        }
        setTimeout(function () { peelDrag = null; }, 0);
      }
      on(sticker, 'pointerup', release);
      on(sticker, 'pointercancel', release);
    });

    /* ---------- the sheet: a case taken off the rail ---------- */
    function photoUrl(item, p) {
      var src = item.photos[p] || item.photos[0] || '';
      return src;
    }
    function showPhoto(p, animate) {
      var item = items[index];
      var count = item.photos.length;
      var from = photo;
      photo = clamp(p, 0, Math.max(0, count - 1));
      var img = one('[data-cvrl-img]', sheet);
      if (img) {
        var src = photoUrl(item, photo);
        if (img.getAttribute('src') !== src) {
          img.removeAttribute('srcset');
          img.src = src;
          if (animate && gsapOk()) hold(window.gsap.fromTo(img, { xPercent: photo === from ? 0 : photo > from ? 7 : -7, autoAlpha: 0.25 }, { xPercent: 0, autoAlpha: 1, duration: 0.42, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }));
        }
      }
      all('[data-cvrl-photos] button', sheet).forEach(function (b, k) { b.setAttribute('aria-pressed', k === photo ? 'true' : 'false'); });
    }
    function buildPhotos() {
      var box = one('[data-cvrl-photos]', sheet);
      if (!box) return;
      var item = items[index];
      box.textContent = '';
      box.hidden = item.photos.length < 2;
      if (item.photos.length < 2) return;
      item.photos.forEach(function (src, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', fill(root.getAttribute('data-photo-label'), { n: k + 1 }));
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('data-cvrl-photo', String(k));
        box.appendChild(b);
      });
    }
    function sheetSteps() {
      all('.cvrl-sheet__step', sheet).forEach(function (b) {
        b.disabled = Number(b.getAttribute('data-cvrl-step')) < 0 ? index === 0 : index === n - 1;
      });
    }
    function showInSheet(i) {
      slots[index].classList.remove('is-taken');
      setFront(i, false);
      slots[index].classList.add('is-taken');
      fillInfo(sheet, index, true);
      buildPhotos();
      showPhoto(0, true);
      sheetSteps();
    }
    function cardPhoto(i) { return one('.cvrl__photo img', slots[i]) || one('.cvrl__photo', slots[i]); }
    function flyGhost(fromEl, toEl, src, done) {
      var a = fromEl.getBoundingClientRect();
      var b = toEl.getBoundingClientRect();
      if (!a.width || !b.width) { done(); return; }
      var ghost = document.createElement('img');
      ghost.className = 'cvrl-sheet__ghost';
      ghost.alt = '';
      ghost.src = src;
      ghost.style.left = a.left + 'px';
      ghost.style.top = a.top + 'px';
      ghost.style.width = a.width + 'px';
      ghost.style.height = a.height + 'px';
      sheet.appendChild(ghost);
      hold(window.gsap.to(ghost, {
        left: b.left, top: b.top, width: b.width, height: b.height, borderRadius: 0,
        duration: 0.55, ease: 'power3.inOut',
        onComplete: function () { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); done(); },
        onInterrupt: function () { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }
      }));
    }

    function openSheet(from) {
      if (!canSheet || sheetOpen) return false;
      opener = from || null;
      sheetOpen = true;
      interacted = true;
      fillInfo(sheet, index, false);
      buildPhotos();
      showPhoto(0, false);
      sheetSteps();
      var box = one('[data-cvrl-box]', sheet);
      var frameEl = one('[data-cvrl-frame]', sheet);
      var img = one('[data-cvrl-img]', sheet);
      sheet.showModal();
      if (!gsapOk()) { slots[index].classList.add('is-taken'); return true; }
      var source = cardPhoto(index);
      window.gsap.set(box, { opacity: 0 });
      window.gsap.set(img, { autoAlpha: 0 });
      slots[index].classList.add('is-taken');
      flyGhost(source, frameEl, (source && source.currentSrc) || photoUrl(items[index], 0), function () {
        window.gsap.set(img, { clearProps: 'opacity,visibility' });
      });
      hold(window.gsap.to(box, { opacity: 1, duration: 0.3, delay: 0.22, ease: 'power1.out', clearProps: 'opacity' }));
      var info = all('.cvrl-sheet__info > *', sheet);
      hold(window.gsap.from(info, { y: 14, autoAlpha: 0, duration: 0.4, delay: 0.3, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }));
      return true;
    }

    function closeSheet() {
      if (!sheetOpen) return;
      var slot = slots[index];
      var finish = function () {
        sheetOpen = false;
        if (sheet.open) sheet.close();
        slots.forEach(function (s) { s.classList.remove('is-taken'); });
        var back = opener && opener.matches('[data-cvrl-open]') && opener.isConnected ? opener : one('[data-cvrl-case]', slot);
        if (back) back.focus({ preventScroll: true });
        opener = null;
        kick(-40);
        var card = one('.cvrl__card', slot);
        if (card && gsapOk()) hold(window.gsap.from(card, { y: -34, duration: 0.6, ease: 'bounce.out', clearProps: 'transform' }));
      };
      if (!gsapOk()) { finish(); return; }
      var box = one('[data-cvrl-box]', sheet);
      var frameEl = one('[data-cvrl-frame]', sheet);
      var img = one('[data-cvrl-img]', sheet);
      var target = cardPhoto(index);
      window.gsap.set(img, { autoAlpha: 0 });
      hold(window.gsap.to(box, { opacity: 0, duration: 0.22, ease: 'power1.in' }));
      flyGhost(frameEl, target, img.currentSrc || img.src, function () {
        window.gsap.set([box, img], { clearProps: 'opacity,visibility' });
        finish();
      });
    }

    if (canSheet) {
      on(sheet, 'cancel', function (e) { e.preventDefault(); closeSheet(); });
      on(sheet, 'click', function (e) {
        if (e.target.closest('[data-cvrl-close]')) { closeSheet(); return; }
        var dot = e.target.closest('[data-cvrl-photo]');
        if (dot) { showPhoto(Number(dot.getAttribute('data-cvrl-photo')), true); return; }
        if (e.target === sheet) closeSheet();
      });
      var frameEl = one('[data-cvrl-frame]', sheet);
      var swipe = null;
      if (frameEl) {
        on(frameEl, 'pointerdown', function (e) { swipe = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
        on(frameEl, 'pointerup', function (e) {
          if (!swipe || e.pointerId !== swipe.id) return;
          var dx = e.clientX - swipe.x;
          var dy = e.clientY - swipe.y;
          swipe = null;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(photo + (dx < 0 ? 1 : -1), true);
        });
        on(frameEl, 'pointercancel', function () { swipe = null; });
      }
      if (openBtn) {
        openBtn.hidden = false;
        on(openBtn, 'click', function () {
          paint();
          if (Math.abs(pos - index) > 0.25) glideTo(index, true);
          openSheet(openBtn);
        });
      }
    }

    /* ---------- choreography: entrance, scroll pin, sway, tilt ---------- */
    function releasePending() { document.documentElement.classList.remove('cvrl-pending'); }

    function choreograph() {
      var gsap = window.gsap;
      var ST = window.ScrollTrigger;
      if (!gsap || !ST) { releasePending(); return; }
      mm = gsap.matchMedia();
      mm.add({ motion: '(prefers-reduced-motion: no-preference)', fine: '(hover: hover) and (pointer: fine)' }, function (context) {
        if (!context.conditions.motion) { releasePending(); return; }
        var local = new AbortController();
        var bind = function (target, type, handler, opts) {
          var o = { signal: local.signal };
          if (opts) for (var k in opts) o[k] = opts[k];
          target.addEventListener(type, handler, o);
        };
        var split = null;
        var thrower = null;

        /* The entrance. Words and prices are never hidden by CSS: GSAP sets
           these start states here, and the section is readable without it. */
        var head = one('.cvrl__head', root);
        var title = one('.cvrl__title', root);
        var lines = all('.cvrl__eyebrow, .cvrl__text', root);
        var rod = one('.cvrl__rod', root);
        var brackets = all('.cvrl__bracket', root);
        var cases = slots.map(function (s) { return one('[data-cvrl-case]', s); });
        var tags = slots.map(function (s) { return one('.cvrl__tag-body', s); }).filter(Boolean);
        var sticker = one('[data-cvrl-sticker]', ticket);
        var foil = one('[data-cvrl-foil]', ticket);
        var under = one('.cvrl-price__under', ticket);
        var note = one('[data-cvrl-note]', ticket);
        var arrow = note && one('path', note);
        var script = note && one('span', note);
        var navShown = nav && !nav.hidden ? nav : null;
        var fromFront = function (k) { return Math.abs(k - index) * 0.07; };

        if (title && window.SplitText) split = window.SplitText.create(title, { type: 'words', mask: 'words' });
        if (split) gsap.set(split.words, { yPercent: 110 });
        else if (title) gsap.set(title, { y: 24, autoAlpha: 0 });
        gsap.set(lines, { y: 16, autoAlpha: 0 });
        if (rod) gsap.set(rod, { scaleX: 0, transformOrigin: '0 50%' });
        gsap.set(brackets, { y: -18, autoAlpha: 0 });
        gsap.set(cases, { y: -150, rotation: function (k) { return k % 2 ? 9 : -9; }, autoAlpha: 0, transformOrigin: '50% 0' });
        gsap.set(tags, { scaleY: 0, transformOrigin: '50% 0' });
        if (navShown) gsap.set(navShown, { y: 12, autoAlpha: 0 });
        if (ticket) gsap.set(ticket, { clipPath: 'inset(0% 0% 100% 0% round 14px)', y: 24 });
        if (sticker && !sticker.disabled) {
          gsap.set(sticker, { scale: 1.32, rotation: -7, autoAlpha: 0 });
          if (under) gsap.set(under, { autoAlpha: 0 });
        }
        if (script) gsap.set(script, { clipPath: 'inset(0% 100% 0% 0%)' });
        if (arrow && window.DrawSVGPlugin) gsap.set(arrow, { drawSVG: '0%' });
        releasePending();

        entrance = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
        if (split) entrance.to(split.words, { yPercent: 0, duration: 0.7, stagger: 0.06 }, 0);
        else if (title) entrance.to(title, { y: 0, autoAlpha: 1, duration: 0.6, clearProps: 'transform,opacity,visibility' }, 0);
        entrance
          .to(lines, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.08, clearProps: 'transform,opacity,visibility' }, 0.1)
          .to(rod, { scaleX: 1, duration: 0.85, ease: 'power3.inOut', clearProps: 'transform' }, 0.15)
          .to(brackets, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(2.4)', stagger: 0.12, clearProps: 'transform,opacity,visibility' }, 0.6)
          .to(cases, { y: 0, autoAlpha: 1, duration: 0.75, ease: 'bounce.out', stagger: fromFront }, 0.62)
          .to(cases, { rotation: 0, duration: 1.5, ease: 'elastic.out(1, 0.32)', stagger: fromFront, clearProps: 'transform,opacity,visibility' }, 0.7)
          .to(tags, { scaleY: 1, duration: 0.5, ease: 'back.out(2.2)', stagger: fromFront, clearProps: 'transform' }, 1.0)
          .add(function () { kick(-30); }, 1.15);
        if (navShown) entrance.to(navShown, { y: 0, autoAlpha: 1, duration: 0.5, clearProps: 'transform,opacity,visibility' }, 1.1);
        if (ticket) entrance.to(ticket, { clipPath: 'inset(0% 0% 0% 0% round 14px)', y: 0, duration: 0.85, ease: 'power2.out', clearProps: 'clipPath,transform' }, 1.05);
        if (sticker && !sticker.disabled) {
          entrance
            .set(sticker, { autoAlpha: 1 }, 1.45)
            .to(sticker, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.6)' }, 1.45)
            .set(under, { clearProps: 'opacity,visibility' }, 1.95)
            .fromTo(sticker, { scaleX: 1, scaleY: 1, rotation: 0 }, { scaleX: 1.04, scaleY: 0.93, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform,opacity,visibility' }, 1.97);
          if (foil) entrance.fromTo(foil, { '--cvrl-sheen': '130%' }, { '--cvrl-sheen': '-30%', duration: 0.9, ease: 'power2.inOut' }, 1.95);
        }
        if (script) entrance.to(script, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power1.inOut', clearProps: 'clipPath' }, 2.1);
        if (arrow && window.DrawSVGPlugin) entrance.to(arrow, { drawSVG: '100%', duration: 0.5, ease: 'power2.out', clearProps: 'all' }, 2.75);

        var startEntrance = ST.create({
          trigger: root, start: 'top 78%', once: true,
          onEnter: function () {
            if (document.visibilityState === 'hidden') entrance.progress(1);
            else entrance.play();
          }
        });

        /* The page scroll flips through the rail while it is pinned, when the
           rail, its arrows and the ticket fit the screen. Otherwise the rail
           peeks once so shoppers see it moves. */
        var body = one('[data-cvrl-body]', root);
        var wantPin = root.getAttribute('data-pin') === 'true' && n >= 3 && body;
        var pinned = null;
        var alive = true;
        /* Decided once the brand fonts are in: the ticket's height (and so
           whether it fits the screen) depends on them. */
        var decide = function () {
          if (!alive) return;
          if (wantPin && body.offsetHeight <= window.innerHeight - 32) {
            var steps = Math.min(n - 1, 8);
            var follow = gsap.quickTo(track, 'scrollLeft', { duration: 0.42, ease: 'power3.out' });
            pinned = driver = ST.create({
              trigger: body,
              start: 'center center',
              end: function () { return '+=' + Math.round(steps * clamp(window.innerHeight * 0.3, 170, 280)); },
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              snap: { snapTo: 1 / (n - 1), duration: { min: 0.18, max: 0.45 }, delay: 0.06, ease: 'power2.out' },
              onToggle: function (self) {
                root.classList.toggle('is-driven', self.isActive);
                if (self.isActive) { interacted = true; stopGlide(); }
                if (thrower) { if (self.isActive) thrower.disable(); else thrower.enable(); }
              },
              onUpdate: function (self) { if (self.isActive) follow(self.progress * (n - 1) * pitch); }
            });
          } else if (n > 1) {
            ST.create({
              trigger: track, start: 'top 72%', once: true,
              onEnter: function () {
                if (interacted || index !== 0) return;
                root.classList.add('is-gliding');
                glide = hold(gsap.timeline({
                  delay: 1.6,
                  onComplete: function () { glide = null; root.classList.remove('is-gliding'); },
                  onInterrupt: function () { root.classList.remove('is-gliding'); }
                })
                  .to(track, { scrollLeft: pitch * 0.6, duration: 0.75, ease: 'power2.inOut' })
                  .to(track, { scrollLeft: 0, duration: 0.9, ease: 'power3.inOut' }));
              }
            });
          }
          ST.refresh();
        };
        if (document.fonts && document.fonts.status !== 'loaded') {
          document.fonts.ready.then(function () { if (alive) context.add(decide); });
        } else {
          decide();
        }

        /* The rack sways with the page's scroll speed. */
        ST.create({
          trigger: root, start: 'top bottom', end: 'bottom top',
          onUpdate: function (self) {
            swing.push = clamp(self.getVelocity() * 0.0016, -3.5, 3.5);
            run();
          }
        });

        /* The heading drifts a little slower than the page. */
        if (head) gsap.fromTo(head, { y: 26 }, { y: -26, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'center top', scrub: 0.6 } });

        if (context.conditions.fine) {
          /* The front card tilts toward the cursor. */
          var tiltCard = null;
          var turnX = null;
          var turnY = null;
          var settleTilt = function () {
            if (!tiltCard) return;
            gsap.to(tiltCard, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform' });
            tiltCard = null;
          };
          bind(track, 'pointermove', function (e) {
            if (e.pointerType !== 'mouse' || dragging || root.classList.contains('is-moving')) return;
            var card = one('.cvrl__card', slots[index]);
            var over = e.target.closest('.cvrl__card');
            if (!card || over !== card) { settleTilt(); return; }
            if (card !== tiltCard) {
              settleTilt();
              tiltCard = card;
              gsap.set(card, { transformPerspective: 700 });
              turnX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
              turnY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
            }
            var r = card.getBoundingClientRect();
            turnY(((e.clientX - r.left) / r.width - 0.5) * 14);
            turnX(-((e.clientY - r.top) / r.height - 0.5) * 10);
          });
          bind(track, 'pointerleave', settleTilt);
          bind(track, 'scroll', settleTilt, { passive: true });

          /* A side case turns toward the cursor (GSAP tween of its own turn). */
          slots.forEach(function (slot, i) {
            var turnTo = function (peek, ease) {
              if (!setters) return;
              gsap.to(place[i], { peek: peek, duration: 0.42, ease: ease, overwrite: true, onUpdate: function () { if (setters) placeSlot(i); } });
            };
            bind(slot, 'pointerenter', function (e) {
              if (e.pointerType === 'mouse' && !dragging && i !== index && !root.classList.contains('is-moving')) turnTo(0.45, 'power3.out');
            });
            bind(slot, 'pointerleave', function (e) {
              if (e.pointerType === 'mouse' && place[i].peek) turnTo(0, 'power2.out');
            });
          });

          /* Drag and throw: Draggable moves a proxy, the proxy moves the rail,
             InertiaPlugin coasts it and snaps it onto a case. The list markup
             is never wrapped or moved. */
          if (window.Draggable && window.InertiaPlugin) {
            var proxy = document.createElement('div');
            var lastIndex = function () { return (n - 1) * pitch; };
            thrower = window.Draggable.create(proxy, {
              trigger: track,
              type: 'x',
              inertia: true,
              dragClickables: true,
              minimumMovement: 6,
              edgeResistance: 0.85,
              cursor: 'grab',
              activeCursor: 'grabbing',
              maxDuration: 1.2,
              minDuration: 0.3,
              snap: { x: function (v) { return -clamp(Math.round(-v / pitch), 0, n - 1) * pitch; } },
              onPress: function () {
                stopGlide();
                interacted = true;
                gsap.set(proxy, { x: -track.scrollLeft });
                this.applyBounds({ minX: -lastIndex(), maxX: 0 });
                this.update();
              },
              onDragStart: function () {
                dragging = true;
                root.classList.add('is-dragging');
              },
              onDrag: function () { track.scrollLeft = -this.x; },
              onDragEnd: function () {
                dragging = false;
                root.classList.remove('is-dragging');
                root.classList.add('is-gliding');
                suppressClick = true;
                setTimeout(function () { suppressClick = false; }, 0);
              },
              onThrowUpdate: function () { track.scrollLeft = -this.x; },
              onThrowComplete: function () {
                root.classList.remove('is-gliding');
                paint();
              }
            })[0];
            stopThrow = function () {
              if (thrower && thrower.tween) thrower.tween.kill();
              root.classList.remove('is-gliding');
            };
          }

          /* The sticker's corner lifts when the cursor comes near: peel me. */
          blocks.forEach(function (block) {
            var s = one('[data-cvrl-sticker]', block);
            var blockFoil = one('[data-cvrl-foil]', block);
            if (!s) return;
            bind(s, 'pointerenter', function (e) {
              if (e.pointerType !== 'mouse' || s.disabled || pack || peelDrag) return;
              if (blockFoil) gsap.fromTo(blockFoil, { '--cvrl-sheen': '130%' }, { '--cvrl-sheen': '-30%', duration: 0.8, ease: 'power2.inOut', overwrite: 'auto' });
              if (peelTween && peel.d > 30) return;
              if (peelTween) peelTween.kill();
              peelTween = gsap.to(peel, { d: 26, duration: 0.35, ease: 'power2.out', onUpdate: function () { drawPeel(peel.d); } });
            });
            bind(s, 'pointerleave', function (e) {
              if (e.pointerType !== 'mouse' || pack || (peelDrag && peelDrag.used) || peel.d > 30) return;
              if (peelTween) peelTween.kill();
              peelTween = gsap.to(peel, { d: 0, duration: 0.45, ease: 'back.out(2)', onUpdate: function () { drawPeel(peel.d); }, onComplete: function () { peelTween = null; } });
            });
          });
        }

        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (root._cvrlDestroy) ST.refresh(); });

        return function () {
          alive = false;
          local.abort();
          if (thrower) thrower.kill();
          stopThrow = null;
          dragging = false;
          place.forEach(function (pl) { pl.peek = 0; });
          if (split) split.revert();
          startEntrance.kill();
          if (pinned) root.classList.remove('is-driven');
          if (driver === pinned) driver = null;
          entrance = null;
        };
      });
    }

    /* ---------- motion mode ---------- */
    function applyMode() {
      motion = !(reduceQuery && reduceQuery.matches);
      var rail = motion && !!window.gsap;
      root.classList.toggle('is-rail', rail);
      if (rail) {
        if (!setters) setters = makeSetters();
        paint();
      } else {
        stopSwing();
        if (setters) window.gsap.set(hangers, { clearProps: 'transform' });
        slots.forEach(function (sl) { sl.style.zIndex = ''; });
        setters = null;
        if (peelTween) { peelTween.kill(); peelTween = null; }
        peel.d = 0;
        drawPeel(0);
        root.classList.toggle('is-peeled', pack);
      }
    }
    if (reduceQuery) on(reduceQuery, 'change', applyMode);

    var resizer = null;
    if (window.ResizeObserver) {
      var lastWidth = 0;
      resizer = new ResizeObserver(function () {
        var w = track.clientWidth;
        if (w === lastWidth) return;
        lastWidth = w;
        var keep = index;
        measure();
        track.scrollLeft = keep * pitch;
        paint();
      });
      resizer.observe(track);
    }


    measure();
    applyMode();
    if (nav) nav.hidden = n < 2;
    all('[data-cvrl-sticker]', root).forEach(function (s) { s.disabled = !items[index].pack; });
    blocks.forEach(function (block) { var note = one('[data-cvrl-note]', block); if (note) note.hidden = !items[0].pack; });
    setFront(frontOf(track.scrollLeft), false);
    paint();
    choreograph();

    root._cvrlFinish = function () {
      if (entrance) entrance.progress(1);
      if (sheetOpen) closeSheet();
    };
    root._cvrlDestroy = function () {
      abort.abort();
      if (mm) mm.revert();
      mm = null;
      driver = null;
      entrance = null;
      releasePending();
      clearTimeout(settleTimer);
      if (resizer) resizer.disconnect();
      tweens.forEach(function (t) { if (t && t.kill) t.kill(); });
      if (window.gsap) window.gsap.killTweensOf(track);
      stopSwing();
      if (setters) window.gsap.set(hangers, { clearProps: 'transform' });
      slots.forEach(function (sl) { sl.style.zIndex = ''; });
      setters = null;
      if (sheet && sheet.open) sheet.close();
      all('.cvrl-sheet__ghost', root).forEach(function (g) { g.parentNode.removeChild(g); });
      root.classList.remove('is-rail', 'is-moving', 'is-dragging', 'is-gliding', 'is-driven', 'is-pack', 'is-peeled', 'is-peeled-once');
      slots.forEach(function (s) { s.classList.remove('is-taken'); });
      drawPeel(0);
      delete root._cvrlDestroy;
      delete root._cvrlFinish;
    };
  }

  function rootIn(node) {
    if (!node) return null;
    return node.matches && node.matches(SELECTOR) ? node : one(SELECTOR, node);
  }
  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches(SELECTOR)) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all(SELECTOR, scope));
    roots.forEach(init);
  }

  boot(document);
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    var root = rootIn(e.target);
    if (root && root._cvrlDestroy) root._cvrlDestroy();
  });
  document.addEventListener('shopify:section:select', function (e) {
    var root = rootIn(e.target);
    if (root && root._cvrlFinish) root._cvrlFinish();
  });
})();
