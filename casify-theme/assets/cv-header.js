/* Casify — header behaviour and motion (sections/header.liquid).
 *
 * Loaded after the GSAP bundle (layout/theme.liquid). The parts that make the
 * header work — mobile menu, search panel, predictive search, focus handling,
 * the sticky offset — run with or without GSAP. Motion layers on top only when
 * GSAP loaded and the visitor hasn't asked for reduced motion.
 *
 *   load    valance drops, ticker starts, topbar and nav settle, the sign swings
 *           in from its top edge, peppermints roll out from behind it, links and
 *           icons stagger in
 *   scroll  candy-stripe progress bar; scroll speed blows the awning stripes and
 *           spins the peppermints; the nav tucks away going down, returns going up
 *   hover   sign wiggles and the mints spin up; link icons wiggle; icon buttons press
 *   state   drawer slides in with a link cascade; search panel drops in; the cart
 *           badge bounces whenever its count changes
 *
 * Re-initialises on shopify:section:load so the theme editor keeps working.
 */
(function () {
  'use strict';

  var reduceQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

  function init(nav) {
    if (!nav || nav.dataset.cvhReady === '1') return;
    nav.dataset.cvhReady = '1';

    var root = nav.closest('.shopify-section') || document;
    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var motion = !!gsap && !(reduceQuery && reduceQuery.matches);
    var cleanups = [];
    var ctx = null;

    function listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      cleanups.push(function () { target.removeEventListener(type, fn, opts); });
    }

    if (motion) document.documentElement.classList.add('cvh-motion');

    var wiggle = motion && window.CustomWiggle
      ? window.CustomWiggle.create('cvhWiggle', { wiggles: 5, type: 'easeOut' })
      : 'elastic.out(1, 0.3)';

    /* ---------- Mobile menu ---------- */
    var burger = nav.querySelector('[data-mobile-menu-toggle]');
    var drawer = root.querySelector('#cm-mobile-nav');
    var scrim = root.querySelector('#cm-mobile-nav-scrim');
    var menuOpen = false;
    var releaseMenuFocus = null;

    function setMobileMenu(open) {
      if (!drawer || open === menuOpen) return;
      menuOpen = open;
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (scrim) scrim.classList.toggle('is-open', open);
      document.body.classList.toggle('cm-scroll-lock', open);
      if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');

      if (open) {
        drawer.classList.add('is-open');
        if (motion) {
          gsap.fromTo(drawer, { xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: 'expo.out', overwrite: true });
          // opacity, not autoAlpha: visibility:hidden would make the links unfocusable mid-cascade
          gsap.fromTo($$('.cm-mobile-nav__link', drawer), { opacity: 0, x: 28 },
            { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05, delay: 0.12, overwrite: true });
        }
        if (window.CasifyA11y) releaseMenuFocus = window.CasifyA11y.trapFocus(drawer, burger);
        return;
      }

      if (releaseMenuFocus) { releaseMenuFocus(); releaseMenuFocus = null; }
      if (!motion) { drawer.classList.remove('is-open'); return; }
      gsap.to(drawer, {
        xPercent: 100, duration: 0.35, ease: 'power2.in', overwrite: true,
        onComplete: function () {
          if (menuOpen) return;
          drawer.classList.remove('is-open');
          gsap.set(drawer, { clearProps: 'transform' });
        }
      });
    }

    if (burger) listen(burger, 'click', function () { setMobileMenu(!menuOpen); });
    $$('[data-mobile-menu-close]', root).forEach(function (el) {
      listen(el, 'click', function () { setMobileMenu(false); });
    });
    if (drawer) $$('a', drawer).forEach(function (a) {
      listen(a, 'click', function () { setMobileMenu(false); });
    });

    /* ---------- Search panel + predictive search ---------- */
    var searchBtn = nav.querySelector('[data-search-toggle]');
    var searchPanel = root.querySelector('#cm-search-panel');
    var searchOpen = false;
    var searchForm = searchPanel && searchPanel.querySelector('[data-predictive-search-form]');
    var predictiveUrl = searchForm && searchForm.getAttribute('data-predictive-url');
    var predictiveInput = searchPanel && searchPanel.querySelector('[data-predictive-search-input]');
    var predictiveResults = root.querySelector('#cm-predictive-search-results');
    var predictiveTimer = null;
    var predictiveController = null;

    function clearPredictive() {
      if (!predictiveResults) return;
      predictiveResults.hidden = true;
      predictiveResults.innerHTML = '';
      if (predictiveInput) predictiveInput.setAttribute('aria-expanded', 'false');
    }

    function setSearchPanel(open) {
      if (!searchPanel) return;
      searchOpen = open;
      searchPanel.classList.toggle('is-open', open);
      searchPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (searchBtn) searchBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) { clearPredictive(); return; }
      if (motion && searchForm) {
        // opacity, not autoAlpha: the input is focused right below and can't be while visibility:hidden
        gsap.fromTo(searchForm, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', overwrite: true });
      }
      var input = searchPanel.querySelector('input[type=search]');
      if (input) input.focus();
    }

    if (searchBtn && searchPanel) listen(searchBtn, 'click', function () { setSearchPanel(!searchOpen); });

    function runPredictive(term) {
      if (predictiveController && predictiveController.abort) predictiveController.abort();
      predictiveController = window.AbortController ? new AbortController() : null;
      var params = 'q=' + encodeURIComponent(term) + '&resources[type]=product,collection,page,query&resources[limit]=4&section_id=predictive-search';
      fetch(predictiveUrl + '?' + params, { signal: predictiveController ? predictiveController.signal : undefined })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          if (!predictiveResults) return;
          predictiveResults.innerHTML = html;
          var isEmpty = predictiveResults.textContent.trim() === '';
          predictiveResults.hidden = isEmpty;
          if (predictiveInput) predictiveInput.setAttribute('aria-expanded', isEmpty ? 'false' : 'true');
          if (motion && !isEmpty) {
            gsap.fromTo(predictiveResults.querySelectorAll('.cm-predictive-results__query, .cm-predictive-results__item, .cm-predictive-results__link'),
              { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out', stagger: 0.03 });
          }
        })
        .catch(function (err) { if (err && err.name !== 'AbortError') clearPredictive(); });
    }

    if (predictiveUrl && predictiveInput && predictiveResults) {
      listen(predictiveInput, 'input', function () {
        var term = predictiveInput.value.trim();
        clearTimeout(predictiveTimer);
        if (term.length < 2) { clearPredictive(); return; }
        predictiveTimer = setTimeout(function () { runPredictive(term); }, 220);
      });
    }

    listen(document, 'keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (menuOpen) { setMobileMenu(false); return; }
      if (searchOpen) { setSearchPanel(false); if (searchBtn) searchBtn.focus(); }
    });

    /* ---------- Sticky: awning + topbar scroll away, the nav stays ----------
       The whole section wrapper is sticky with a negative top equal to the
       nav's offset inside it (see cv-header.css), so the search panel stays
       attached under the nav when it opens mid-page. */
    var sign = nav.querySelector('.casify-sign');
    var offset = 0;
    var stuck = false;
    var hidden = false;
    var lastY = window.pageYOffset;
    var turnY = lastY;
    var lastDir = 0;
    var scrollQueued = false;

    function measure() {
      if (root === document) return;
      offset = nav.offsetTop;
      root.style.setProperty('--cvh-offset', offset + 'px');
      queueScroll();
    }

    function showNav() {
      if (!hidden) return;
      hidden = false;
      gsap.to(nav, { yPercent: 0, duration: 0.55, ease: 'expo.out', overwrite: 'auto' });
    }

    function onScrollFrame() {
      scrollQueued = false;
      var y = window.pageYOffset;
      var nowStuck = root === document ? y > 0 : (y > 0 && root.getBoundingClientRect().top <= -offset + 1);

      if (nowStuck !== stuck) {
        stuck = nowStuck;
        nav.classList.toggle('is-stuck', stuck);
        if (motion && sign) gsap.to(sign, { scale: stuck ? 0.86 : 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
      }

      if (motion) {
        var dir = y > lastY ? 1 : (y < lastY ? -1 : 0);
        if (dir && dir !== lastDir) { turnY = lastY; lastDir = dir; }
        var busy = menuOpen || searchOpen || nav.contains(document.activeElement) || Date.now() < holdUntil;
        var wantHide = hidden;
        if (busy || !stuck || y < offset + 240) wantHide = false;
        else if (dir === 1 && y - turnY > 24) wantHide = true;
        else if (dir === -1 && turnY - y > 12) wantHide = false;

        if (wantHide && !hidden) {
          hidden = true;
          gsap.to(nav, { yPercent: -115, duration: 0.35, ease: 'power2.in', overwrite: 'auto' });
        } else if (!wantHide) {
          showNav();
        }
      }
      lastY = y;
    }

    function queueScroll() {
      if (scrollQueued) return;
      scrollQueued = true;
      window.requestAnimationFrame(onScrollFrame);
    }

    listen(window, 'scroll', queueScroll, { passive: true });
    listen(window, 'resize', measure, { passive: true });
    if (motion) listen(nav, 'focusin', showNav);
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    /* ---------- Cart badge: bounce when the count changes ---------- */
    var badge = nav.querySelector('[data-cart-count]');
    if (motion && badge && window.MutationObserver) {
      var bagIcon = badge.parentNode.querySelector('.cm-icon');
      var seenCount = badge.textContent;
      var badgeObserver = new MutationObserver(function () {
        var count = badge.textContent;
        if (count === seenCount) return;
        seenCount = count;
        if (badge.hidden) return;
        gsap.fromTo(badge, { scale: 1.8 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1.2, 0.35)', overwrite: 'auto' });
        // During an add the icon belongs to receive() below (one bag moment, MOTION-SYSTEM 7.6).
        if (bagIcon && Date.now() >= holdUntil) gsap.fromTo(bagIcon, { rotation: 0 }, { rotation: 16, duration: 0.9, ease: wiggle, overwrite: 'auto' });
      });
      badgeObserver.observe(badge, { childList: true, characterData: true, subtree: true });
      cleanups.push(function () { badgeObserver.disconnect(); });
    }

    /* ---------- Bag: in view while something is added, and it "receives" the photo ticket ----------
       window.CasifyBag.show() brings the tucked nav back and holds it 2.5 s, so a flying ticket
       (cv-commerce-motion.js) has a bag to land on; it runs on cvs:adding (dispatched on the buy
       box root without bubbling, so heard in the capture phase), cart:added and cv:cart.
       receive() squashes the bag icon when the ticket lands; the badge pop stays in the
       observer above, so there is one badge bump. */
    var holdUntil = 0;
    var receivedAt = 0;
    var bagBtn = nav.querySelector('#bagBtn');
    function holdNav() {
      holdUntil = Date.now() + 2500;
      if (motion) showNav();
    }
    function receive() {
      var ico = bagBtn && bagBtn.querySelector('.cm-icon');
      if (!ico || !motion || (reduceQuery && reduceQuery.matches) || Date.now() - receivedAt < 500) return;
      receivedAt = Date.now();
      gsap.fromTo(ico, { scaleX: 1.2, scaleY: 0.78 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
    }
    listen(document, 'cvs:adding', holdNav, true);
    listen(document, 'cart:added', holdNav);
    listen(document, 'cv:cart', holdNav);
    var bagApi = { show: holdNav, receive: receive };
    currentBag = bagApi;
    cleanups.push(function () { if (currentBag === bagApi) currentBag = null; });

    /* ---------- Scroll progress (kept under reduced motion: it only tracks position) ---------- */
    var progressFill = nav.querySelector('.cvh-progress__fill');

    if (gsap) ctx = gsap.context(function () {
      if (progressFill && ScrollTrigger) {
        document.documentElement.classList.add('cvh-has-progress'); // stands in for cv-motion's page bar
        gsap.fromTo(progressFill, { scaleX: 0 }, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: 0.4 }
        });
      }
      if (!motion) return;

      var awning = root.querySelector('.cvh-awning');
      var valance = root.querySelector('.cvh-awning__valance');
      var ticker = root.querySelector('.cvh-ticker');
      var track = root.querySelector('.cvh-ticker__track');
      var plaque = sign && sign.querySelector('.casify-sign__plaque');
      var mints = sign ? $$('.casify-sign__mint', sign) : [];
      var mintFaces = sign ? $$('.casify-sign__mint img', sign) : [];
      var links = $$('.nav__link', nav);
      var iconBtns = $$('.iconbtn', nav);
      var btnIcons = $$('.iconbtn .cm-icon', nav);

      /* Ambient loops. Scroll speed and sign hovers push their timeScale up
         ("gusts"), then they ease back to their resting pace. */
      var loops = [];
      if (awning) {
        // One 36px stripe period; the scallops read the same variable so they drift in step.
        loops.push(gsap.fromTo(awning, { '--cvh-drift': '0px' }, { '--cvh-drift': '36px', duration: 5, ease: 'none', repeat: -1 }));
      }
      if (mintFaces.length) {
        var spin = gsap.timeline({ repeat: -1 });
        mintFaces.forEach(function (face, i) {
          spin.to(face, { rotation: i % 2 ? -360 : 360, duration: 10, ease: 'none' }, 0);
        });
        loops.push(spin);
      }
      if (track) {
        var tickerLoop = gsap.to(track, { xPercent: -50, duration: 42, ease: 'none', repeat: -1 });
        listen(ticker, 'mouseenter', function () { gsap.to(tickerLoop, { timeScale: 0, duration: 0.4, overwrite: 'auto' }); });
        listen(ticker, 'mouseleave', function () { gsap.to(tickerLoop, { timeScale: 1, duration: 0.6, overwrite: 'auto' }); });
      }

      function gust(strength) {
        if (!loops.length) return;
        gsap.to(loops, { timeScale: 1 + strength, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
        gsap.to(loops, { timeScale: 1, duration: 1.4, delay: 0.25, ease: 'power2.inOut' });
      }

      if (ScrollTrigger) {
        var lastGust = 0;
        ScrollTrigger.create({
          start: 0, end: 'max',
          onUpdate: function (self) {
            var v = self.getVelocity();
            var now = Date.now();
            if (now - lastGust > 120) { lastGust = now; gust(clamp(Math.abs(v) / 300, 0, 8)); }
            if (valance) {
              gsap.to(valance, {
                skewX: clamp(-v / 160, -10, 10), duration: 0.2, overwrite: 'auto',
                onComplete: function () { gsap.to(valance, { skewX: 0, duration: 0.9, ease: 'elastic.out(1, 0.3)' }); }
              });
            }
          }
        });
      }

      /* Entry — the sign is the one theatrical moment; everything else settles quietly. */
      var tl = gsap.timeline({ defaults: { duration: 0.6, ease: 'power3.out' } });
      if (valance) tl.fromTo(valance, { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: 'elastic.out(1, 0.35)' }, 0);
      if (ticker) tl.fromTo(ticker, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.1);
      tl.fromTo($$('.topbar__inner > *', root), { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, clearProps: 'transform' }, 0.12);
      if (plaque) {
        tl.fromTo(plaque, { autoAlpha: 0, y: -16, rotation: -10 },
          { autoAlpha: 1, y: 0, rotation: 0, duration: 1.2, ease: 'elastic.out(1, 0.4)' }, 0.15);
      }
      if (mints.length) {
        tl.fromTo(mints, { autoAlpha: 0, scale: 0.2, x: function (i) { return i ? -18 : 18; } },
          { autoAlpha: 1, scale: 1, x: 0, duration: 0.7, ease: 'back.out(2)', stagger: 0.08 }, 0.3);
      }
      tl.fromTo(links, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, clearProps: 'transform' }, 0.28)
        .fromTo(iconBtns, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.05 }, 0.34)
        .fromTo(btnIcons, { scale: 0.3, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.6, stagger: 0.05, ease: 'back.out(2.4)' }, 0.34);
      // Background tabs and prerenders get no animation frames; don't leave the header at its hidden start state.
      if (document.visibilityState === 'hidden') tl.progress(1);

      /* Hover + press */
      var brand = nav.querySelector('.brand');
      if (brand && plaque) {
        listen(brand, 'mouseenter', function () {
          gsap.fromTo(plaque, { rotation: 0 }, { rotation: 4, duration: 1, ease: wiggle, overwrite: 'auto' });
          gust(9);
        });
      }
      links.forEach(function (link) {
        var ico = link.querySelector('.cv-ico');
        if (!ico) return;
        listen(link, 'mouseenter', function () {
          gsap.fromTo(ico, { rotation: 0 }, { rotation: 14, duration: 0.8, ease: wiggle, overwrite: 'auto' });
        });
      });
      iconBtns.forEach(function (btn) {
        var ico = btn.querySelector('.cm-icon');
        if (!ico) return;
        function release() { gsap.to(ico, { scale: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.35)', overwrite: 'auto' }); }
        listen(btn, 'mouseenter', function () {
          gsap.fromTo(ico, { rotation: 0 }, { rotation: 10, duration: 0.7, ease: wiggle, overwrite: 'auto' });
        });
        listen(btn, 'pointerdown', function () { gsap.to(ico, { scale: 0.78, duration: 0.12, ease: 'power2.out', overwrite: 'auto' }); });
        listen(btn, 'pointerup', release);
        listen(btn, 'pointerleave', release);
      });

      // Preview another style without the editor: ?nav_fx=spotlight|bubble|blob|none
      var fxParam = /[?&]nav_fx=(spotlight|bubble|blob|none)\b/.exec(window.location.search);
      var fxStyle = fxParam ? fxParam[1] : nav.getAttribute('data-nav-fx');
      if (/^(spotlight|bubble|blob)$/.test(fxStyle)) initNavFx(nav, fxStyle, links, listen, cleanups);
    });

    // From-states are applied; the header can show now (see the inline guard in header.liquid).
    document.documentElement.classList.remove('cvh-pending');

    nav._cvhDestroy = function () {
      cleanups.forEach(function (fn) { fn(); });
      if (ctx) ctx.revert();
      if (menuOpen) document.body.classList.remove('cm-scroll-lock');
      nav.dataset.cvhReady = '';
    };
  }

  /* ---------- Menu hover animation ----------
     After the "Navigation Tabs V2" reel by Code XR, in three styles (section
     setting "nav_style", markup and styles in header.liquid / cv-header.css):
       spotlight  a lamp on the nav's top edge slides over and shines down on the link
       bubble     a raised peppermint bubble hops from link to link carrying its icon
       blob       a candy-pink pill melts across like liquid, a droplet bubbles up
                  out of it, and a dot marks the link
     The indicator follows hover and keyboard focus and rests on the current
     page's link (or leaves, when no menu link is current). Desktop only: the
     links are in the drawer below 981px. */
  function initNavFx(nav, style, links, listen, cleanups) {
    var gsap = window.gsap;
    var fx = nav.querySelector('.cvh-fx');
    var bar = nav.querySelector('.nav__links');
    if (!fx || !bar || !links.length) return;

    var home = links.filter(function (l) { return l.getAttribute('aria-current') === 'page'; })[0] || null;
    var part = fx.querySelector(style === 'spotlight' ? '.cvh-fx__spot' : (style === 'bubble' ? '.cvh-fx__bubble' : '.cvh-fx__goo'));
    var at = null;
    var shown = false;

    nav.setAttribute('data-nav-fx', style);
    nav.classList.add('cvh-fx-on');
    cleanups.push(function () {
      nav.classList.remove('cvh-fx-on');
      links.forEach(function (l) { l.classList.remove('is-fx-at'); });
    });

    // Link box and icon centre in the nav's coordinates (the nav's own slide-away transform cancels out).
    function geom(link) {
      var n = nav.getBoundingClientRect();
      var r = link.getBoundingClientRect();
      var i = (link.querySelector('.cv-ico') || link).getBoundingClientRect();
      return {
        y: r.top - n.top, w: r.width, h: r.height,
        cx: r.left + r.width / 2 - n.left, cy: r.top + r.height / 2 - n.top,
        ix: i.left + i.width / 2 - n.left, iy: i.top + i.height / 2 - n.top
      };
    }

    /* spotlight */
    var lamp = part.querySelector('.cvh-fx__lamp');
    var beam = part.querySelector('.cvh-fx__beam');
    var flicker = null;
    function spot(g, mode) {
      var w = g.w + 28;
      var to = { x: g.cx - w / 2, width: w, height: g.y + g.h + 10 };
      if (mode === 'snap') { gsap.set(part, to); return; }
      if (mode === 'in') {
        gsap.set(part, to);
        gsap.to(part, { autoAlpha: 1, duration: 0.25, overwrite: 'auto' });
        gsap.fromTo(lamp, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
      } else {
        gsap.to(part, Object.assign({ duration: 0.55, ease: 'expo.out', overwrite: 'auto' }, to));
        gsap.fromTo(lamp, { scaleX: 1.8 }, { scaleX: 1, duration: 0.8, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
      }
      // the bulb flickers as it settles
      if (flicker) flicker.kill();
      flicker = gsap.timeline()
        .set(beam, { opacity: 0.25 })
        .to(beam, { opacity: 1, duration: 0.06 }, 0.14)
        .to(beam, { opacity: 0.5, duration: 0.05 })
        .to(beam, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    }

    /* bubble */
    var bubbleIco = part.querySelector('.cvh-fx__bubble-ico');
    var hop = null;
    var swap = null;
    function setBubbleIcon(link) {
      var ico = link.querySelector('.cv-ico');
      bubbleIco.innerHTML = '';
      if (!ico) return;
      var clone = ico.cloneNode(true);
      clone.style.transform = ''; // drop any hover wiggle caught mid-flight
      bubbleIco.appendChild(clone);
    }
    function bubble(g, link, mode) {
      var to = { x: g.ix - 15, y: g.iy - 19 }; // 30px sweet, lifted 4px off the icon's spot
      if (mode === 'snap') { gsap.set(part, to); return; }
      if (hop) hop.kill();
      if (swap) swap.kill();
      if (mode === 'in') {
        setBubbleIcon(link);
        gsap.set(part, to);
        gsap.set(bubbleIco, { scale: 1, rotation: 0 });
        gsap.fromTo(part, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(2.2)', overwrite: 'auto' });
        return;
      }
      gsap.to(part, { x: to.x, duration: 0.6, ease: 'power3.inOut', overwrite: 'auto' });
      hop = gsap.timeline()
        .to(part, { y: Math.min(to.y, gsap.getProperty(part, 'y')) - 11, scale: 1, duration: 0.26, ease: 'power2.out' })
        .to(part, { y: to.y, duration: 0.42, ease: 'bounce.out' })
        .fromTo(part, { scaleX: 1.18, scaleY: 0.84 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, '-=0.3');
      swap = gsap.timeline()
        .to(bubbleIco, { scale: 0, rotation: -70, duration: 0.14, ease: 'power2.in' })
        .call(setBubbleIcon, [link])
        .fromTo(bubbleIco, { scale: 0, rotation: 70 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.6)' }, '+=0.1');
    }

    /* blob */
    var pillEl = part.querySelector('.cvh-fx__goo-pill');
    var drop = part.querySelector('.cvh-fx__goo-drop');
    var dot = style === 'blob' ? fx.querySelector('.cvh-fx__dot') : null;
    var edge = { l: 0, r: 0 };
    var drip = null;
    function drawPill() { gsap.set(pillEl, { x: edge.l, width: Math.max(edge.r - edge.l, 32) }); }
    function blob(g, mode) {
      var w = g.w + 24;
      var l = g.cx - w / 2;
      var rest = { x: g.cx - 6, y: g.cy - 6 };          // the droplet waits inside the pill
      var mark = { x: g.cx - 2.5, y: g.y + g.h + 7 };    // the dot sits where the underline was
      gsap.set(pillEl, { y: g.cy - 16 });
      if (mode !== 'move') {
        edge.l = l; edge.r = l + w;
        drawPill();
        gsap.set(drop, rest);
        gsap.set(dot, mark);
        if (mode === 'snap') return;
        gsap.to(part, { autoAlpha: 1, duration: 0.2, overwrite: 'auto' });
        gsap.fromTo(pillEl, { scaleX: 0.3, scaleY: 0.5 }, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
        gsap.fromTo(dot, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(3)', overwrite: 'auto' });
      } else {
        // The leading edge darts ahead and the trailing edge catches up, so the
        // pill stretches thin like a pulled sweet, then springs back to shape.
        var right = l > edge.l;
        var lead = { duration: 0.42, ease: 'expo.out', onUpdate: drawPill, overwrite: 'auto' };
        var trail = { duration: 0.78, ease: 'power3.inOut', onUpdate: drawPill, overwrite: 'auto' };
        gsap.to(edge, Object.assign({ r: l + w }, right ? lead : trail));
        gsap.to(edge, Object.assign({ l: l }, right ? trail : lead));
        gsap.fromTo(pillEl, { scaleY: 0.72 }, { scaleY: 1, duration: 0.9, delay: 0.2, ease: 'elastic.out(1, 0.35)', overwrite: 'auto' });
        gsap.to(drop, { x: rest.x, duration: 0.6, ease: 'power3.inOut', overwrite: 'auto' });
        gsap.to(dot, Object.assign({ duration: 0.6, delay: 0.08, ease: 'back.out(2)', overwrite: 'auto' }, mark));
      }
      if (drip) drip.kill();
      drip = gsap.timeline({ delay: 0.12 })
        .fromTo(drop, { y: rest.y }, { y: g.cy - 32, duration: 0.32, ease: 'power2.out' }) // 16px above the pill's top
        .to(drop, { y: rest.y, duration: 0.5, ease: 'power2.in' });
    }

    function place(link, mode) {
      if (at) at.classList.remove('is-fx-at');
      at = link;
      link.classList.add('is-fx-at');
      var g = geom(link);
      if (style === 'spotlight') spot(g, mode);
      else if (style === 'bubble') bubble(g, link, mode);
      else blob(g, mode);
    }

    function hide() {
      if (!shown) return;
      shown = false;
      if (at) at.classList.remove('is-fx-at');
      at = null;
      if (hop) hop.kill();
      if (drip) drip.kill();
      gsap.to(part, { autoAlpha: 0, scale: style === 'bubble' ? 0.2 : 1, duration: 0.3, ease: 'power2.in', overwrite: 'auto' });
      if (dot) gsap.to(dot, { autoAlpha: 0, scale: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
    }

    function go(link) {
      if (!link || bar.offsetParent === null) { hide(); return; }
      if (shown && at === link) return;
      place(link, shown ? 'move' : 'in');
      shown = true;
    }

    // Layout changed (resize, late fonts): snap to where the link is now.
    function resync() {
      if (bar.offsetParent === null) { hide(); return; }
      if (shown && at) place(at, 'snap');
      else go(home);
    }

    links.forEach(function (link) {
      listen(link, 'mouseenter', function () { go(link); });
      listen(link, 'focus', function () { go(link); });
    });
    listen(bar, 'mouseleave', function () { if (!bar.contains(document.activeElement)) go(home); });
    listen(bar, 'focusout', function (e) { if (!bar.contains(e.relatedTarget)) go(home); });
    listen(window, 'resize', resync, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (shown) resync(); });
    // Light up the current page's link once the links have settled in.
    gsap.delayedCall(document.visibilityState === 'hidden' ? 0 : 1, function () { if (!shown) go(home); });
  }

  function boot(scope) {
    $$('[data-section-type="header"]', scope).forEach(function (nav) { init(nav); });
  }

  /* Bag API for commerce motion; it follows the live header across editor reloads. */
  var currentBag = null;
  window.CasifyBag = {
    show: function () { if (currentBag) currentBag.show(); },
    receive: function () { if (currentBag) currentBag.receive(); }
  };

  boot(document);
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    $$('[data-section-type="header"]', e.target).forEach(function (nav) {
      if (nav._cvhDestroy) nav._cvhDestroy();
    });
  });
})();
