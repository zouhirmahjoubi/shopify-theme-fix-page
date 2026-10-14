/* Casify: scrolling reviews (sections/cv-scrolling-reviews.liquid).
 *
 * Rows of review tickets run like a sweet-shop conveyor:
 *   - each row's tickets are cloned (aria-hidden; they hold nothing focusable) until the row can
 *     loop seamlessly, then a linear GSAP tween carries it one copy-width
 *     and repeats forever; alternate rows run in opposite directions,
 *   - page scroll couples in: scrolling speeds the rows up and scrolling
 *     back up flips every row's direction, then they coast back to pace,
 *   - hovering or focusing a row eases it almost to a stop; a ticket under
 *     the pointer lifts off the belt,
 *   - a visible Pause/Play button stops everything (WCAG 2.2.2), rows stop
 *     while offscreen, and in the theme editor selecting a review parks its
 *     row with that ticket in view.
 * Entrance: heading rises word by word, rows slide in from opposite sides,
 * tickets pop onto the belt and their stars light up in sequence.
 *
 * Without JS or with prefers-reduced-motion the rows stay as plain,
 * horizontally scrollable lists (the CSS default).
 */
(function () {
  'use strict';

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }

  function destroy(root) {
    if (root && typeof root._cvsrDestroy === 'function') root._cvsrDestroy();
  }

  function init(root) {
    if (!root) return;
    destroy(root);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var cleanups = [];

    function listen(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      cleanups.push(function () { target.removeEventListener(eventName, handler, options); });
    }

    function reinit() { init(root); }
    if (motionQuery.addEventListener) listen(motionQuery, 'change', reinit);
    else if (motionQuery.addListener) {
      motionQuery.addListener(reinit);
      cleanups.push(function () { motionQuery.removeListener(reinit); });
    }

    root._cvsrDestroy = function () {
      cleanups.forEach(function (remove) { remove(); });
      cleanups.length = 0;
      delete root._cvsrDestroy;
    };

    if (motionQuery.matches || !gsap) return;

    var speed = parseFloat(root.getAttribute('data-cvsr-speed')) || 50;
    var toggle = one('[data-cvsr-toggle]', root);
    var toggleLabel = toggle && one('[data-cvsr-toggle-label]', toggle);
    var userPaused = false;
    var onScreen = !ScrollTrigger;
    var scrollSign = 1;
    var boost = 0;
    var intro = null;
    var split = null;
    var context = null;
    var alive = true;
    var rows = all('[data-cvsr-row]', root).map(function (row) {
      return {
        el: row,
        track: one('[data-cvsr-track]', row),
        dir: parseFloat(row.getAttribute('data-cvsr-dir')) || -1,
        loop: null,
        ease: { v: 1 },   // hover/focus slow-down factor
        parked: false
      };
    }).filter(function (r) { return r.track && r.track.children.length; });

    if (!rows.length) return;

    // ---- build the seamless loop for one row -------------------------------
    function build(row) {
      if (row.loop) { row.loop.kill(); row.loop = null; }
      all('[data-cvsr-clone]', row.track).forEach(function (c) { c.remove(); });
      gsap.set(row.track, { x: 0 });
      row.el.classList.add('is-looping');

      var originals = Array.prototype.slice.call(row.track.children);
      var first = originals[0];
      var needed = row.el.clientWidth * 2;
      var copies = 0;

      function addCopy() {
        originals.forEach(function (card) {
          var clone = card.cloneNode(true);
          clone.setAttribute('data-cvsr-clone', '');
          clone.setAttribute('aria-hidden', 'true');
          clone.removeAttribute('data-shopify-editor-block');
          row.track.appendChild(clone);
          // Rebuilds (fonts loading, resizes) can run while the entrance still
          // holds the originals in their "from" pose; clones must start settled.
          gsap.set([clone].concat(all('.cv-stars__icon', clone)), { clearProps: 'transform' });
        });
        copies++;
      }

      addCopy();
      // Distance of one full copy, gap included: where the first clone begins.
      var firstClone = row.track.children[originals.length];
      var dist = firstClone.offsetLeft - first.offsetLeft;
      if (dist <= 0) return;
      while (row.track.scrollWidth < needed + dist && copies < 40) addCopy();

      var from = row.dir < 0 ? 0 : -dist;
      var to = row.dir < 0 ? -dist : 0;
      row.loop = gsap.fromTo(row.track, { x: from }, {
        x: to, duration: dist / speed, ease: 'none', repeat: -1, paused: true
      });
      // Start far into the repeats so reversing (scrolling up) never hits time 0.
      row.loop.totalTime(row.loop.duration() * 500);
      syncPlayState();
    }

    function syncPlayState() {
      rows.forEach(function (row) {
        if (!row.loop) return;
        var run = !userPaused && onScreen && !row.parked;
        if (run && row.loop.paused()) row.loop.play();
        else if (!run && !row.loop.paused()) row.loop.pause();
      });
    }

    // ---- one ticker drives every row's speed ------------------------------
    function tick() {
      boost *= 0.9;
      if (boost < 0.01) boost = 0;
      rows.forEach(function (row) {
        if (!row.loop) return;
        var ts = scrollSign * (1 + boost) * row.ease.v;
        // Never let a row sit at exactly zero: GSAP treats it as frozen time.
        row.loop.timeScale(Math.abs(ts) < 0.02 ? 0.02 * scrollSign : ts);
      });
    }
    gsap.ticker.add(tick);
    cleanups.push(function () { gsap.ticker.remove(tick); });

    if (ScrollTrigger) {
      var st = ScrollTrigger.create({
        trigger: root, start: 'top bottom', end: 'bottom top',
        onToggle: function (self) { onScreen = self.isActive; syncPlayState(); },
        onUpdate: function (self) {
          var v = self.getVelocity();
          // Refreshes and restored scroll positions report ~0 velocity;
          // only a real scroll gesture may flip the belt's direction.
          if (Math.abs(v) < 40) return;
          scrollSign = self.direction < 0 ? -1 : 1;
          boost = Math.max(boost, Math.min(Math.abs(v) / 350, 6));
        }
      });
      onScreen = st.isActive;
      cleanups.push(function () { st.kill(); });
    }

    // ---- hover / focus: ease almost to a stop -----------------------------
    rows.forEach(function (row) {
      function slow() { gsap.to(row.ease, { v: 0.12, duration: .6, ease: 'power3.out', overwrite: true }); }
      function resume() { gsap.to(row.ease, { v: 1, duration: .9, ease: 'power2.inOut', overwrite: true }); }
      if (canHover) {
        listen(row.el, 'pointerenter', slow);
        listen(row.el, 'pointerleave', resume);
      }
      listen(row.el, 'focusin', slow);
      listen(row.el, 'focusout', resume);

      if (canHover) {
        listen(row.track, 'pointerover', function (e) {
          var card = e.target.closest && e.target.closest('[data-cvsr-card]');
          if (!card || card.contains(e.relatedTarget)) return;
          gsap.to(card, { y: -5, rotation: row.dir < 0 ? -1.2 : 1.2, scale: 1.02, duration: .35, ease: 'back.out(2)', overwrite: 'auto' });
        });
        listen(row.track, 'pointerout', function (e) {
          var card = e.target.closest && e.target.closest('[data-cvsr-card]');
          if (!card || card.contains(e.relatedTarget)) return;
          gsap.to(card, { y: 0, rotation: 0, scale: 1, duration: .5, ease: 'power3.out', overwrite: 'auto' });
        });
      }
    });

    // ---- pause button -----------------------------------------------------
    if (toggle) {
      toggle.hidden = false;
      listen(toggle, 'click', function () {
        userPaused = !userPaused;
        toggle.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
        if (toggleLabel) toggleLabel.textContent = userPaused ? 'Play reviews' : 'Pause reviews';
        syncPlayState();
      });
      cleanups.push(function () { toggle.hidden = true; });
    }

    // ---- theme editor: park the row with the selected review in view ------
    root._cvsrPark = function (card) {
      var row = rows.filter(function (r) { return r.track.contains(card); })[0];
      if (!row) return;
      row.parked = true;
      syncPlayState();
      var target = -(card.offsetLeft - (row.el.clientWidth - card.offsetWidth) / 2);
      gsap.to(row.track, { x: Math.min(0, target), duration: .6, ease: 'power3.inOut' });
    };
    root._cvsrUnpark = function () {
      rows.forEach(function (row) {
        if (!row.parked) return;
        row.parked = false;
        build(row);
      });
    };

    // ---- build + rebuild on width changes ---------------------------------
    rows.forEach(build);
    var lastWidth = root.clientWidth;
    var resizeTimer = null;
    function onResize() {
      if (Math.abs(root.clientWidth - lastWidth) < 2) return;
      lastWidth = root.clientWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { rows.forEach(build); }, 150);
    }
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(onResize);
      ro.observe(root);
      cleanups.push(function () { ro.disconnect(); });
    } else {
      listen(window, 'resize', onResize);
    }
    // Web fonts change ticket widths; re-measure once they are in.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (alive) rows.forEach(build); });
    }

    // ---- entrance ---------------------------------------------------------
    context = gsap.context(function () {
      var heading = one('[data-cvsr-heading]', root);
      var fades = all('[data-cvsr-fade], [data-cvsr-toggle]', root);
      var config = {
        defaults: { ease: 'expo.out' },
        onComplete: function () { if (split) { split.revert(); split = null; } }
      };
      if (ScrollTrigger) config.scrollTrigger = { trigger: root, start: 'top 80%', once: true };
      intro = gsap.timeline(config);

      if (heading && SplitText) {
        split = SplitText.create(heading, { type: 'words', mask: 'words' });
        intro.from(split.words, { yPercent: 115, duration: 1, stagger: .06 }, 0);
      } else if (heading) {
        intro.from(heading, { y: 20, autoAlpha: 0, duration: .8, clearProps: 'transform,opacity,visibility' }, 0);
      }
      if (fades.length) {
        intro.from(fades, { y: 12, autoAlpha: 0, duration: .7, stagger: .08, clearProps: 'transform,opacity,visibility' }, .2);
      }

      rows.forEach(function (row, i) {
        var at = .2 + i * .14;
        intro.from(row.el, { x: row.dir * -160, autoAlpha: 0, duration: 1.3, clearProps: 'transform,opacity,visibility' }, at);
        // Originals only: clones are rebuilt after this timeline exists, and a
        // tween on a removed clone would leave its replacement untouched.
        var cards = all('[data-cvsr-card]:not([data-cvsr-clone])', row.track).slice(0, 10);
        intro.from(cards, {
          scale: .82, y: 14, rotation: function (k) { return k % 2 ? 3 : -3; },
          duration: .8, stagger: .05, ease: 'back.out(1.8)', clearProps: 'transform'
        }, at + .15);
        var stars = all('[data-cvsr-card]:not([data-cvsr-clone]) .cv-stars__row--fill .cv-stars__icon', row.track).slice(0, 50);
        if (stars.length) {
          intro.from(stars, {
            scale: 0, rotation: -40, transformOrigin: '50% 55%',
            duration: .35, stagger: .02, ease: 'back.out(2.6)', clearProps: 'transform'
          }, at + .45);
        }
      });
      if (document.visibilityState === 'hidden') intro.progress(1);
    }, root);

    var baseDestroy = root._cvsrDestroy;
    root._cvsrDestroy = function () {
      alive = false;
      clearTimeout(resizeTimer);
      if (intro) intro.kill();
      if (split) split.revert();
      if (context) context.revert();
      rows.forEach(function (row) {
        if (row.loop) row.loop.kill();
        all('[data-cvsr-clone]', row.track).forEach(function (c) { c.remove(); });
        gsap.set(row.track, { clearProps: 'transform' });
        row.el.classList.remove('is-looping');
      });
      delete root._cvsrPark;
      delete root._cvsrUnpark;
      delete root._cvsrFinish;
      baseDestroy();
    };
    root._cvsrFinish = function () { if (intro) intro.progress(1); };
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvsr]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvsr]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function rootOf(target) {
    if (!target) return null;
    return target.matches && target.matches('[data-cvsr]') ? target : one('[data-cvsr]', target);
  }

  boot(document);

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroy(rootOf(event.target)); });
  document.addEventListener('shopify:section:select', function (event) {
    var root = rootOf(event.target);
    if (root && root._cvsrFinish) root._cvsrFinish();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvsr]');
    if (!root) return;
    if (root._cvsrFinish) root._cvsrFinish();
    if (root._cvsrPark) root._cvsrPark(event.target);
  });
  document.addEventListener('shopify:block:deselect', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvsr]');
    if (root && root._cvsrUnpark) root._cvsrUnpark();
  });
})();
