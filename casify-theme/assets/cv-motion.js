/* Casify: shared motion engine (attribute API), loaded on every page.
 *
 * Three modules, each of which no-ops when its markup is absent, so any
 * section can opt in just by using the attributes:
 *
 *   motion: reveals, stagger, split headings, counters, bars, parallax,
 *           tilt, magnetic buttons, page scroll progress, scroll-to-buy
 *   story:  scroll-scrubbed sequences (a sticky stage driven by --cv-p)
 *   ugc:    customer video rails: autoplay in view, sound, lightbox
 *
 * The page is complete without this file: layout/theme.liquid swaps
 * html.no-js for html.js before first paint, and theme.css hides reveal
 * start states only under html.js. If this file never finishes booting, the
 * layout (and the catch below) add html.cv-reveal-timeout, which resolves
 * every reveal to its finished state.
 *
 * Public API (window.CVMotion):
 *   CVMotion.scan(root)    wire every attribute inside root (idempotent)
 *   CVMotion.finish(root)  jump every reveal, count and bar in root to its end
 *   CVMotion.ready         true once the first scan of the document finished
 * Theme editor: shopify:section:load rescans the section,
 * shopify:section:select and shopify:block:select finish it,
 * shopify:section:unload releases its story / ugc listeners.
 * Reduced motion is live: switching it on mid-visit resolves everything.
 *
 * Commerce behaviour lives in cv-product.js and cart.js; nothing here
 * changes prices, variants or the cart.
 *
 * Attribute reference:
 *   data-cv-reveal[="left|right|scale|blur"]  fade/slide in once on scroll
 *   data-cv-stagger                            index children for cascade
 *   data-cv-split                              stagger a plain-text heading
 *                                              word by word (headings with
 *                                              child elements keep their markup)
 *   data-cv-count="12" data-cv-suffix="ft"     count up when revealed; the
 *                                              final value is written first
 *   data-cv-pct="80"                           grow a bar to this width
 *   data-cv-bars                               fill bars / counts in a group
 *   data-cv-parallax="0.12"                    drift against scroll
 *   data-cv-tilt                               3D tilt toward the pointer
 *   data-cv-scroll-to-buy                      scroll to the buy box; hidden
 *                                              when the page has none
 *   data-cv-video-reduced-motion="pause"       no autoplay under reduced motion
 */
(function () {
  'use strict';

  var html = document.documentElement;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }
  /* Elements matching sel inside scope, plus scope itself when it matches. */
  function within(sel, scope) {
    scope = scope || document;
    var list = $$(sel, scope);
    if (scope !== document && scope.matches && scope.matches(sel)) list.unshift(scope);
    return list;
  }

  var reduceMotionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = !!(reduceMotionQuery && reduceMotionQuery.matches);
  var finePointer = !(window.matchMedia && window.matchMedia('(hover: none)').matches);
  function timedOut() { return html.classList.contains('cv-reveal-timeout'); }

  /* One shared rAF ticker so scroll work never stacks up. A job tied to an
     element is dropped once that element leaves the document (theme editor). */
  var scrollJobs = [];
  var ticking = false;
  function onScrollFrame() {
    ticking = false;
    for (var i = scrollJobs.length - 1; i >= 0; i--) {
      var job = scrollJobs[i];
      if (job.el && !job.el.isConnected) { scrollJobs.splice(i, 1); continue; }
    }
    for (var j = 0; j < scrollJobs.length; j++) scrollJobs[j].fn();
  }
  function requestScrollFrame() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScrollFrame);
  }
  var scrollListening = false;
  function addScrollJob(fn, el) {
    scrollJobs.push({ fn: fn, el: el || null });
    if (!scrollListening) {
      scrollListening = true;
      window.addEventListener('scroll', requestScrollFrame, { passive: true });
      window.addEventListener('resize', requestScrollFrame, { passive: true });
    }
    fn();
  }

  // ===========================================================================
  // MOTION
  // ===========================================================================

  // ---- decorative video ------------------------------------------------------
  // Never autoplay motion a visitor has asked to reduce: fall back to the poster.
  function pauseReducedVideos(scope) {
    if (!reduceMotion) return;
    within('[data-cv-video-reduced-motion="pause"]', scope).forEach(function (v) {
      v.removeAttribute('autoplay');
      if (v.pause) v.pause();
    });
  }

  // ---- split headings into staggered words ---------------------------------
  function splitHeadings(scope) {
    within('[data-cv-split]', scope).forEach(function (el) {
      if (el.querySelector('.cv-word')) return;   // already split
      if (el.children.length) return;            // keep inline markup (em, br, links)
      var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      var words = text.split(' ');
      if (words.length > 40) return;              // not a headline: leave it alone
      el.setAttribute('aria-label', text);
      el.textContent = '';
      words.forEach(function (w, i) {
        var span = document.createElement('span');
        span.className = 'cv-word';
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--cv-i', i);
        span.textContent = w;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.classList.add('cv-split');
    });
  }

  // ---- index children of stagger containers --------------------------------
  function indexStagger(scope) {
    within('[data-cv-stagger]', scope).forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (!child.style.getPropertyValue('--cv-i')) child.style.setProperty('--cv-i', i);
      });
    });
  }

  // ---- counters --------------------------------------------------------------
  function countParts(el) {
    var target = parseFloat(el.getAttribute('data-cv-count'));
    if (isNaN(target)) return null;
    return {
      target: target,
      suffix: el.getAttribute('data-cv-suffix') || '',
      decimals: (String(target).split('.')[1] || '').length
    };
  }
  function writeFinal(el) {
    var c = countParts(el);
    if (c) el.textContent = c.target.toFixed(c.decimals) + c.suffix;
  }
  /* The final value is on the page before any animation: the count never
     sits at 0 if the reveal never fires. */
  function primeCounts(scope) {
    within('[data-cv-count]', scope).forEach(function (el) {
      if (el.getAttribute('data-cv-counted') === '1') return;
      writeFinal(el);
    });
  }
  function animateCount(el) {
    if (el.getAttribute('data-cv-counted') === '1') return;
    el.setAttribute('data-cv-counted', '1');
    var c = countParts(el);
    if (!c) return;
    if (reduceMotion || document.visibilityState === 'hidden') { writeFinal(el); return; }

    var duration = 1100;
    var start = null;
    function step(ts) {
      if (el.getAttribute('data-cv-counted') !== '1') return;
      if (reduceMotion) { writeFinal(el); return; }
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var current = c.target * eased;
      el.textContent = (c.decimals ? current.toFixed(c.decimals) : Math.round(current).toString()) + c.suffix;
      if (p < 1) window.requestAnimationFrame(step);
      else writeFinal(el);
    }
    el.textContent = (c.decimals ? (0).toFixed(c.decimals) : '0') + c.suffix;
    window.requestAnimationFrame(step);
  }
  function finishCount(el) {
    el.setAttribute('data-cv-counted', '1');
    writeFinal(el);
  }

  function fillBars(scope) {
    within('[data-cv-pct]', scope).forEach(function (bar) {
      var pct = parseFloat(bar.getAttribute('data-cv-pct'));
      if (isNaN(pct)) pct = 0;
      bar.style.width = clamp(pct, 0, 100) + '%';
    });
  }

  // ---- reveal on scroll --------------------------------------------------------
  var revealIO = null;
  var barsIO = null;
  var REVEAL_SEL = '[data-cv-reveal], [data-cv-split]';

  function revealNow(el) {
    el.classList.add('is-revealed');
    $$('[data-cv-count]', el).forEach(animateCount);
    fillBars(el);
  }
  function settle(el) {
    el.classList.add('is-revealed');
    if (revealIO) revealIO.unobserve(el);
  }

  function observeReveals(scope) {
    var targets = within(REVEAL_SEL, scope).filter(function (el) { return !el.classList.contains('is-revealed'); });
    var bars = within('[data-cv-bars]', scope).filter(function (g) { return !g.hasAttribute('data-cv-reveal'); });

    if (!('IntersectionObserver' in window) || reduceMotion || timedOut()) {
      targets.forEach(settle);
      finishScope(scope);
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          revealIO.unobserve(entry.target);
          revealNow(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    }
    targets.forEach(function (el) { revealIO.observe(el); });

    // Bar groups that are not themselves reveal targets.
    if (bars.length && !barsIO) {
      barsIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          barsIO.unobserve(entry.target);
          fillBars(entry.target);
          $$('[data-cv-count]', entry.target).forEach(animateCount);
        });
      }, { threshold: 0.2 });
    }
    bars.forEach(function (g) { barsIO.observe(g); });
  }

  /* Everything in scope at its finished state, now. */
  function finishScope(scope) {
    scope = scope || document;
    within(REVEAL_SEL, scope).forEach(settle);
    within('[data-cv-bars]', scope).forEach(function (g) { if (barsIO) barsIO.unobserve(g); });
    within('[data-cv-count]', scope).forEach(finishCount);
    fillBars(scope);
  }

  // ---- page scroll progress ----------------------------------------------------
  var progressBar = null;
  function setupProgress() {
    if (reduceMotion || progressBar || !document.querySelector('.cv-page-root')) return;
    var progress = document.createElement('div');
    progress.className = 'cv-progress';
    progress.setAttribute('aria-hidden', 'true');
    progressBar = document.createElement('span');
    progress.appendChild(progressBar);
    document.body.appendChild(progress);

    addScrollJob(function () {
      if (reduceMotion) return;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(window.pageYOffset / max, 0, 1) : 0;
      progressBar.style.transform = 'scaleX(' + p + ')';
    });
  }

  // ---- parallax ----------------------------------------------------------------
  var parallaxEls = [];
  var parallaxJob = false;
  function parallaxFrame() {
    if (reduceMotion) return;
    var vh = window.innerHeight;
    for (var i = parallaxEls.length - 1; i >= 0; i--) {
      var el = parallaxEls[i];
      if (!el.isConnected) { parallaxEls.splice(i, 1); continue; }
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue;
      var depth = parseFloat(el.getAttribute('data-cv-parallax')) || 0.12;
      var centre = rect.top + rect.height / 2 - vh / 2;
      el.style.setProperty('--cv-shift', (-centre * depth).toFixed(2) + 'px');
    }
  }
  function setupParallax(scope) {
    within('[data-cv-parallax]', scope).forEach(function (el) {
      if (parallaxEls.indexOf(el) === -1) parallaxEls.push(el);
    });
    if (!parallaxEls.length) return;
    if (!parallaxJob) { parallaxJob = true; addScrollJob(parallaxFrame); }
    else parallaxFrame();
  }

  // ---- pointer tilt + magnetic CTAs -------------------------------------------
  function bindPointer(scope) {
    if (!finePointer) return;
    within('[data-cv-tilt]', scope).forEach(function (el) {
      if (el.__cvTilt) return;
      el.__cvTilt = true;
      el.addEventListener('pointermove', function (e) {
        if (reduceMotion) return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--cv-rx', (-py * 7).toFixed(2) + 'deg');
        el.style.setProperty('--cv-ry', (px * 9).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--cv-rx', '0deg');
        el.style.setProperty('--cv-ry', '0deg');
      });
    });

    within('.cv-cta', scope).forEach(function (btn) {
      if (btn.__cvMagnet) return;
      btn.__cvMagnet = true;
      btn.addEventListener('pointermove', function (e) {
        if (reduceMotion) return;
        var r = btn.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        btn.style.setProperty('--cv-mx', (px * 7).toFixed(2) + 'px');
        btn.style.setProperty('--cv-my', (py * 4).toFixed(2) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--cv-mx', '0px');
        btn.style.setProperty('--cv-my', '0px');
      });
    });
  }
  function resetPointer() {
    $$('[data-cv-tilt]').forEach(function (el) {
      el.style.setProperty('--cv-rx', '0deg');
      el.style.setProperty('--cv-ry', '0deg');
    });
    $$('.cv-cta').forEach(function (btn) {
      btn.style.setProperty('--cv-mx', '0px');
      btn.style.setProperty('--cv-my', '0px');
    });
  }

  // ---- "scroll back to the buy box" buttons -----------------------------------
  function buyTarget() { return $('.cv-buy') || $('#cvPdp'); }
  /* A page without a buy box hides the buttons instead of offering a dead
     click. Re-checked on every scan: the editor can add or remove the buy box. */
  function syncScrollToBuy(scope) {
    var hasTarget = !!buyTarget();
    $$('[data-cv-scroll-to-buy]').forEach(function (btn) {
      if (!hasTarget) {
        if (!btn.hidden) { btn.hidden = true; btn.setAttribute('data-cv-stb-hidden', ''); }
      } else if (btn.hasAttribute('data-cv-stb-hidden')) {
        btn.hidden = false;
        btn.removeAttribute('data-cv-stb-hidden');
      }
    });
    within('[data-cv-scroll-to-buy]', scope).forEach(function (btn) {
      if (btn.__cvStb) return;
      btn.__cvStb = true;
      btn.addEventListener('click', function () {
        var target = buyTarget();
        if (!target) return;
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  // ===========================================================================
  // STORY: scroll-scrubbed sequence
  // ===========================================================================
  function initStory(section) {
    if (!section || section.__cvStory) return;
    section.__cvStory = true;

    var stage = $('[data-cv-story-stage]', section);
    var heightOut = $('[data-cv-story-height]', section);
    var phaseOut = $('[data-cv-story-phase]', section);
    var rail = $('[data-cv-story-rail]', section);
    var chapters = $$('[data-cv-story-chapter]', section);
    if (!stage) return;

    var START_FT = 12;
    var phases = [
      { at: 0.00, label: 'Held' },
      { at: 0.08, label: 'Released' },
      { at: 0.30, label: 'Free fall' },
      { at: 0.68, label: 'Contact' },
      { at: 0.78, label: 'Cells crushing' },
      { at: 0.90, label: 'Recovered' }
    ];

    /* Reduced motion: park at the impact frame, mark every chapter read. */
    if (reduceMotion) {
      stage.style.setProperty('--cv-p', 1);
      stage.style.setProperty('--cv-fall', 1);
      stage.style.setProperty('--cv-drop', Math.round(stage.clientHeight * 0.6) + 'px');
      stage.classList.add('is-impact');
      if (heightOut) heightOut.textContent = '0.0';
      if (phaseOut) phaseOut.textContent = 'Recovered';
      if (rail) rail.style.transform = 'scaleY(1)';
      chapters.forEach(function (c) { c.classList.add('is-active'); });
      return;
    }

    var lastPhase = '';
    addScrollJob(function () {
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight;
      var travel = rect.height - vh;

      var p;
      if (travel > 40) {
        p = clamp(-rect.top / travel, 0, 1);
      } else {
        // Section shorter than the viewport: fall back to a simple in-view ramp.
        p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      }

      // Free fall covers distance in proportion to t squared, so the phone
      // creeps at first and then arrives all at once. `--cv-fall` drives the
      // sprite, `--cv-drop` is the measured distance from the release point to
      // the ground line so the landing is exact at any stage size.
      var fallP = clamp(p / 0.68, 0, 1);
      var eased = fallP * fallP;

      stage.style.setProperty('--cv-p', p.toFixed(4));
      stage.style.setProperty('--cv-fall', eased.toFixed(4));
      stage.style.setProperty('--cv-drop', Math.round(stage.clientHeight * 0.6) + 'px');
      stage.classList.toggle('is-impact', p >= 0.68);
      stage.classList.toggle('is-recovered', p >= 0.9);

      if (heightOut) {
        heightOut.textContent = (START_FT * (1 - eased)).toFixed(1);
      }

      if (phaseOut) {
        var label = phases[0].label;
        for (var i = 0; i < phases.length; i++) {
          if (p >= phases[i].at) label = phases[i].label;
        }
        if (label !== lastPhase) {
          lastPhase = label;
          phaseOut.textContent = label;
          phaseOut.classList.remove('is-swap');
          void phaseOut.offsetWidth;
          phaseOut.classList.add('is-swap');
        }
      }

      if (rail) rail.style.transform = 'scaleY(' + p.toFixed(4) + ')';

      var activeIndex = -1;
      chapters.forEach(function (c, i) {
        var at = (parseFloat(c.getAttribute('data-cv-at')) || 0) / 100;
        if (p >= at) activeIndex = i;
      });
      chapters.forEach(function (c, i) {
        c.classList.toggle('is-active', i === activeIndex);
        c.classList.toggle('is-past', i < activeIndex);
      });
    }, section);
  }

  // ===========================================================================
  // UGC: customer video rail
  // ===========================================================================
  /* Window/document listeners carry an AbortSignal so shopify:section:unload
     releases them; element listeners go away with the replaced markup. */
  function listenOpts(signal, extra) {
    var o = extra || {};
    if (signal) o.signal = signal;
    return o;
  }

  function initUgc(section) {
    if (!section || section.__cvUgc) return;
    section.__cvUgc = true;

    var rail = $('[data-cv-ugc-rail]', section);
    var clips = $$('[data-cv-clip]', section);
    if (!rail || !clips.length) return;

    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var signal = ctrl ? ctrl.signal : null;
    var playIO = null;
    section.__cvUgcDestroy = function () {
      if (ctrl) ctrl.abort();
      if (playIO) playIO.disconnect();
      delete section.__cvUgcDestroy;
    };

    // ---- rail arrows ------------------------------------------------------
    $$('[data-cv-ugc-scroll]', section).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = parseInt(btn.getAttribute('data-cv-ugc-scroll'), 10) || 1;
        var card = clips[0];
        var step = card ? card.getBoundingClientRect().width + 14 : 260;
        rail.scrollBy({ left: dir * step * 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });

    function syncArrows() {
      var maxScroll = rail.scrollWidth - rail.clientWidth - 2;
      $$('[data-cv-ugc-scroll]', section).forEach(function (btn) {
        var dir = parseInt(btn.getAttribute('data-cv-ugc-scroll'), 10) || 1;
        btn.disabled = dir < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= maxScroll;
      });
    }
    rail.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows, listenOpts(signal, { passive: true }));
    syncArrows();

    // ---- autoplay only what is actually on screen -------------------------
    function videoOf(clip) { return $('.cv-clip__video', clip); }

    if ('IntersectionObserver' in window && !reduceMotion) {
      playIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var clip = entry.target;
          var video = videoOf(clip);
          if (!video) return;
          if (entry.isIntersecting) {
            clip.classList.add('is-live');
            if (video.preload === 'none') video.preload = 'metadata';
            var playing = video.play();
            if (playing && playing.catch) playing.catch(function () { /* autoplay refused: poster stays */ });
          } else {
            clip.classList.remove('is-live');
            video.pause();
          }
        });
      }, { threshold: 0.55 });
      clips.forEach(function (clip) { if (videoOf(clip)) playIO.observe(clip); });
    }

    // ---- sound: one clip audible at a time --------------------------------
    function muteAll(except) {
      clips.forEach(function (clip) {
        var v = videoOf(clip);
        if (!v || v === except) return;
        v.muted = true;
        clip.classList.remove('is-loud');
        var b = $('[data-cv-clip-sound]', clip);
        if (b) { b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Turn sound on'); }
      });
    }

    clips.forEach(function (clip) {
      var soundBtn = $('[data-cv-clip-sound]', clip);
      if (!soundBtn) return;
      soundBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var video = videoOf(clip);
        if (!video) return;
        var turningOn = video.muted;
        if (turningOn) muteAll(video);
        video.muted = !turningOn;
        clip.classList.toggle('is-loud', turningOn);
        soundBtn.setAttribute('aria-pressed', turningOn ? 'true' : 'false');
        soundBtn.setAttribute('aria-label', turningOn ? 'Turn sound off' : 'Turn sound on');
        if (turningOn) {
          var playing = video.play();
          if (playing && playing.catch) playing.catch(function () {});
        }
      });
    });

    // ---- lightbox ---------------------------------------------------------
    var lightbox = $('[data-cv-lightbox]', section);
    var lbStage = lightbox ? $('[data-cv-lb-stage]', lightbox) : null;
    if (!lightbox || !lbStage) return;

    var openable = clips.filter(function (c) { return c.getAttribute('data-cv-clip-kind') !== 'poster'; });
    var current = -1;
    var lastFocus = null;

    function buildSlide(clip) {
      lbStage.innerHTML = '';
      var kind = clip.getAttribute('data-cv-clip-kind');

      if (kind === 'embed') {
        var type = clip.getAttribute('data-cv-embed-type');
        var id = clip.getAttribute('data-cv-embed-id');
        var src = type === 'vimeo'
          ? 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?autoplay=1'
          : 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
        var frame = document.createElement('iframe');
        frame.className = 'cv-lightbox__media';
        frame.src = src;
        frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
        frame.setAttribute('allowfullscreen', '');
        frame.setAttribute('title', 'Customer clip');
        lbStage.appendChild(frame);
      } else {
        var source = videoOf(clip);
        var video = document.createElement('video');
        video.className = 'cv-lightbox__media';
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        if (source) {
          if (source.poster) video.poster = source.poster;
          $$('source', source).forEach(function (s) {
            var copy = document.createElement('source');
            copy.src = s.src;
            if (s.type) copy.type = s.type;
            video.appendChild(copy);
          });
        }
        lbStage.appendChild(video);
      }

      var meta = $('.cv-clip__meta', clip);
      if (meta) {
        var caption = document.createElement('div');
        caption.className = 'cv-lightbox__meta';
        caption.innerHTML = meta.innerHTML;
        lbStage.appendChild(caption);
      }
    }

    function openAt(index) {
      if (!openable.length) return;
      current = (index + openable.length) % openable.length;
      buildSlide(openable[current]);
      lightbox.hidden = false;
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('cv-lb-open');
      // Pause the rail while the lightbox owns the screen.
      clips.forEach(function (c) { var v = videoOf(c); if (v) v.pause(); });
      var closeBtn = $('[data-cv-lb-close]', lightbox);
      if (closeBtn) closeBtn.focus();
    }

    function closeLb() {
      lbStage.innerHTML = '';
      lightbox.hidden = true;
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('cv-lb-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      lastFocus = null;
      current = -1;
    }

    clips.forEach(function (clip) {
      var openBtn = $('[data-cv-clip-open]', clip);
      if (!openBtn) return;
      openBtn.addEventListener('click', function () {
        lastFocus = openBtn;
        openAt(openable.indexOf(clip));
      });
    });

    $$('[data-cv-lb-step]', lightbox).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dir = parseInt(btn.getAttribute('data-cv-lb-step'), 10) || 1;
        openAt(current + dir);
      });
    });

    var closeEl = $('[data-cv-lb-close]', lightbox);
    if (closeEl) closeEl.addEventListener('click', closeLb);

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLb();
    });

    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') { closeLb(); }
      else if (e.key === 'ArrowRight') { openAt(current + 1); }
      else if (e.key === 'ArrowLeft') { openAt(current - 1); }
    }, listenOpts(signal));
  }

  // ===========================================================================
  // Public API, boot and lifecycle
  // ===========================================================================
  function scan(root) {
    root = root || document;
    pauseReducedVideos(root);
    splitHeadings(root);
    indexStagger(root);
    primeCounts(root);
    observeReveals(root);
    setupProgress();
    setupParallax(root);
    bindPointer(root);
    syncScrollToBuy(root);
    within('[data-cv-story]', root).forEach(initStory);
    within('[data-cv-ugc]', root).forEach(initUgc);
  }

  function finish(root) {
    finishScope(root || document);
  }

  var api = window.CVMotion = window.CVMotion || {};
  api.scan = scan;
  api.finish = finish;
  api.ready = false;

  function boot() {
    try {
      scan(document);
      api.ready = true;
    } catch (err) {
      /* Never leave revealed content hidden because the engine broke. */
      html.classList.add('cv-reveal-timeout');
      finishScope(document);
      throw err;
    }
  }

  document.addEventListener('shopify:section:load', function (e) { scan(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    within('[data-cv-ugc]', e.target).forEach(function (s) { if (s.__cvUgcDestroy) s.__cvUgcDestroy(); });
    within(REVEAL_SEL, e.target).forEach(function (el) { if (revealIO) revealIO.unobserve(el); });
    within('[data-cv-bars]', e.target).forEach(function (g) { if (barsIO) barsIO.unobserve(g); });
  });
  document.addEventListener('shopify:section:select', function (e) { finish(e.target); });
  document.addEventListener('shopify:block:select', function (e) {
    var section = e.target.closest ? e.target.closest('.shopify-section') : null;
    finish(section || e.target);
  });

  /* Live reduced motion: switching it on resolves everything visible at once;
     switching it off lets content added later animate again. */
  if (reduceMotionQuery) {
    var onReduceChange = function (q) {
      reduceMotion = !!q.matches;
      if (reduceMotion) {
        finishScope(document);
        pauseReducedVideos(document);
        resetPointer();
      } else {
        setupProgress();
        parallaxFrame();
      }
    };
    if (reduceMotionQuery.addEventListener) reduceMotionQuery.addEventListener('change', onReduceChange);
    else if (reduceMotionQuery.addListener) reduceMotionQuery.addListener(onReduceChange);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* Endless CSS animations off screen.
 *
 * Pulses, sways, shines and marquees declared in CSS keep ticking while their
 * section is screens away, and every tick costs the main thread a style
 * update, often a layout and a repaint as well (the guarantee section's SVG
 * pulse laid itself out on every frame while a shopper sat at the top of the
 * home page). Each template and footer section is watched: once it is more
 * than a screen from the viewport its endless CSS animations pause, and they
 * carry on from the same point as it comes back within a screen.
 * Only CSS-declared animations that repeat forever are touched, and only the
 * ones paused here are resumed, so animations owned by scripts (GSAP, Motion,
 * element.animate) and CSS play-state rules keep their own control. The
 * header group is left alone: its sign stays on screen while the page scrolls.
 */
(function () {
  'use strict';

  if (!('IntersectionObserver' in window) || !window.CSSAnimation || !Element.prototype.getAnimations) return;

  var MARK = '__cvOffscreenPaused';

  function endless(animation) {
    if (!(animation instanceof window.CSSAnimation)) return false;
    try { return animation.effect.getTiming().iterations === Infinity; } catch (e) { return false; }
  }

  function settle(section, near) {
    var list = section.getAnimations({ subtree: true });
    for (var i = 0; i < list.length; i++) {
      var animation = list[i];
      if (!endless(animation)) continue;
      if (near) {
        if (animation[MARK]) {
          animation[MARK] = false;
          if (animation.playState === 'paused') animation.play();
        }
      } else if (animation.playState === 'running') {
        animation[MARK] = true;
        animation.pause();
      }
    }
  }

  var watcher = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) settle(entries[i].target, entries[i].isIntersecting);
  }, { rootMargin: '100% 0px' });

  var WATCHED = '#MainContent > .shopify-section, .shopify-section-group-footer-group';

  function start() {
    var sections = document.querySelectorAll(WATCHED);
    for (var i = 0; i < sections.length; i++) watcher.observe(sections[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // Theme editor: a re-rendered section is a new element.
  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target && e.target.closest ? e.target.closest('.shopify-section') : null;
    if (section && section.matches(WATCHED)) watcher.observe(section);
  });
})();
