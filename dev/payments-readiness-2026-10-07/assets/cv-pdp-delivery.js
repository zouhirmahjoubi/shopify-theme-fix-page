/* Casify product page: delivery estimate (sections/cv-pdp-delivery.liquid).
 *
 * Dates
 *   Worked out here rather than in Liquid, because storefront HTML is cached
 *   and server-rendered dates go stale. "Now" is taken in the shop's time zone
 *   (the section carries the shop's UTC offset). An order placed after the
 *   daily cut-off counts as the next day's order; with business days on,
 *   each step counts only Monday–Friday days that aren't listed holidays,
 *   starting the day after the order day. Day 0 is the order day itself.
 *   Dates are formatted for the storefront language with Intl.
 * Countdown
 *   With a cut-off set, on a working day before the cut-off, shows the time
 *   left; when it passes, every date moves on and the countdown hides.
 * Motion (GSAP)
 *   The ticket lifts in, the arrival date rises word by word, then a parcel
 *   rides the road as it fills, each stop popping as the parcel reaches it,
 *   and drops into the last stop. The countdown's digits roll as they change
 *   (only while on screen). Reduced motion: dates and countdown, no motion.
 */
(function () {
  'use strict';

  var DAY = 86400000;

  function one(selector, context) { return (context || document).querySelector(selector); }
  function all(selector, context) { return Array.prototype.slice.call((context || document).querySelectorAll(selector)); }

  function destroy(root) {
    if (root && typeof root._cvdlDestroy === 'function') root._cvdlDestroy();
  }

  // ---- date helpers (all "shop local" dates are Date objects read in UTC) ---
  function parseOffset(z) {
    var m = /^([+-])(\d{2}):?(\d{2})$/.exec((z || '').trim());
    if (!m) return -new Date().getTimezoneOffset(); // fall back to the visitor's zone
    return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
  }
  function dayOnly(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
  function addCal(d, n) { return new Date(d.getTime() + n * DAY); }
  function ymd(d) { return d.toISOString().slice(0, 10); }

  function init(root) {
    if (!root) return;
    destroy(root);

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var SplitText = window.SplitText;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var animate = !!gsap && !reduce;

    var offsetMin = parseOffset(root.getAttribute('data-tz'));
    var business = root.getAttribute('data-business') === 'true';
    var cutoffAttr = root.getAttribute('data-cutoff');
    var cutoff = cutoffAttr === '' || cutoffAttr === null ? null : parseInt(cutoffAttr, 10);
    var holidays = {};
    (root.getAttribute('data-holidays') || '').split(/[\s,;]+/).forEach(function (h) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(h)) holidays[h] = true;
    });

    var stops = all('[data-cvdl-stop]', root);
    var arriveLabel = one('[data-cvdl-arrive-label]', root);
    var arriveDate = one('[data-cvdl-arrive-date]', root);
    var cutoffBox = one('[data-cvdl-cutoff]', root);
    var countEl = one('[data-cvdl-count]', root);
    var lang = document.documentElement.lang || undefined;

    var timer = null, intro = null, context = null, split = null, st = null;
    var lastDayKey = '';
    var onScreen = true;

    root._cvdlDestroy = function () {
      clearInterval(timer);
      if (intro) intro.kill();
      if (split) split.revert();
      if (st) st.kill();
      if (context) context.revert();
      delete root._cvdlDestroy;
      delete root._cvdlFinish;
    };

    function shopNow() { return new Date(Date.now() + offsetMin * 60000); }
    function isWorkday(d) {
      if (!business) return true;
      var wd = d.getUTCDay();
      return wd !== 0 && wd !== 6 && !holidays[ymd(d)];
    }
    // Counting starts the day after the order day; with business days on,
    // only working days count.
    function addDays(start, n) {
      var d = start, counted = 0;
      while (counted < n) {
        d = addCal(d, 1);
        if (isWorkday(d)) counted++;
      }
      return d;
    }
    function orderDay(now) {
      var d = dayOnly(now);
      if (cutoff !== null && now.getUTCHours() >= cutoff) d = addCal(d, 1);
      return d;
    }

    var fmt, rel;
    try {
      fmt = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    } catch (e) {
      fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    }
    try { rel = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }); } catch (e) { rel = null; }
    function todayWord() {
      var t = rel ? rel.format(0, 'day') : 'today';
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    function formatRange(a, b) {
      if (ymd(a) === ymd(b)) return fmt.format(a);
      if (fmt.formatRange) { try { return fmt.formatRange(a, b); } catch (e) { /* fall through */ } }
      return fmt.format(a) + ' – ' + fmt.format(b);
    }

    // ---- compute and write every date ---------------------------------------
    function render() {
      var now = shopNow();
      var today = dayOnly(now);
      var start = orderDay(now);
      var head = null;

      stops.forEach(function (stop) {
        var minA = stop.getAttribute('data-min');
        var maxA = stop.getAttribute('data-max');
        var out = one('[data-cvdl-date]', stop);
        if (minA === '' || minA === null) return; // no days set: keep the merchant's text
        var min = parseInt(minA, 10), max = parseInt(maxA, 10);
        if (isNaN(max) || max < min) max = min;
        var text;
        if (min === 0 && max === 0) {
          text = todayWord();
        } else {
          text = formatRange(addDays(start, min), addDays(start, max));
        }
        out.textContent = text;
        head = { title: stop.getAttribute('data-title'), text: text };
      });

      if (head && arriveLabel && arriveDate) {
        arriveLabel.textContent = head.title;
        arriveDate.textContent = head.text;
      }
      lastDayKey = ymd(start);
      tick(now, today);
    }

    // ---- countdown to the cut-off --------------------------------------------
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tick(now, today) {
      if (!cutoffBox || cutoff === null) return;
      now = now || shopNow();
      today = today || dayOnly(now);
      var cutoffAt = today.getTime() + cutoff * 3600000;
      var left = cutoffAt - now.getTime();
      var show = left > 0 && isWorkday(today);
      cutoffBox.hidden = !show;
      if (!show) return;
      var s = Math.floor(left / 1000);
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      var text = h > 0 ? h + 'h ' + pad(m) + 'm' : m + 'm ' + pad(sec) + 's';
      if (countEl.textContent !== text) {
        countEl.textContent = text;
        if (animate && onScreen && intro && intro.progress() === 1) {
          gsap.fromTo(countEl, { yPercent: -45, autoAlpha: .35 }, { yPercent: 0, autoAlpha: 1, duration: .28, ease: 'power3.out', overwrite: true });
        }
      }
    }

    render();
    timer = setInterval(function () {
      var now = shopNow();
      // Cut-off passed or the day rolled over: every date moves on.
      if (ymd(orderDay(now)) !== lastDayKey) {
        render();
        if (animate && onScreen) {
          gsap.from(all('[data-cvdl-date], [data-cvdl-arrive-date]', root), { yPercent: 60, autoAlpha: 0, duration: .5, stagger: .06, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
        }
      } else {
        tick(now);
      }
    }, 1000);

    if (!animate) return;

    // ---- entrance ---------------------------------------------------------------
    context = gsap.context(function () {
      var ticket = one('[data-cvdl-ticket]', root);
      var track = one('[data-cvdl-track]', root);
      var road = one('[data-cvdl-road]', root);
      var parcel = one('[data-cvdl-parcel]', root);
      var icons = stops.map(function (s) { return one('[data-cvdl-icon]', s); });
      var texts = stops.map(function (s) { return all('.cvdl-stop__title, .cvdl-stop__date', s); });
      var ride = 1.5;

      var config = {
        defaults: { ease: 'expo.out' },
        onComplete: function () { if (split) { split.revert(); split = null; } }
      };
      if (ScrollTrigger) config.scrollTrigger = { trigger: root, start: 'top 85%', once: true };
      intro = gsap.timeline(config);

      intro.from(ticket, { y: 26, autoAlpha: 0, duration: .8, clearProps: 'transform,opacity,visibility' }, 0);
      if (arriveDate && SplitText && arriveDate.textContent.trim()) {
        split = SplitText.create(arriveDate, { type: 'words', mask: 'words' });
        intro.from(split.words, { yPercent: 110, duration: .8, stagger: .05 }, .2);
      }
      if (cutoffBox && !cutoffBox.hidden) intro.from(cutoffBox, { scale: .85, autoAlpha: 0, duration: .55, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' }, .45);

      // Stops wait at 0; each pops as the parcel reaches it.
      gsap.set(icons, { scale: 0 });
      texts.forEach(function (t) { gsap.set(t, { y: 8, autoAlpha: 0 }); });

      var n = stops.length;
      intro.fromTo(road, { scaleX: 0 }, { scaleX: 1, duration: ride, ease: 'power2.inOut', clearProps: 'transform' }, .55);
      icons.forEach(function (icon, i) {
        var at = .55 + (n > 1 ? (i / (n - 1)) * ride : 0);
        intro.to(icon, { scale: 1, duration: .5, ease: 'back.out(2.4)', clearProps: 'transform' }, at);
        intro.to(texts[i], { y: 0, autoAlpha: 1, duration: .5, stagger: .06, clearProps: 'transform,opacity,visibility' }, at + .08);
      });

      if (parcel && track && n > 1) {
        var centre = function (i) {
          var el = icons[i].parentNode;
          return el.offsetLeft + el.offsetWidth / 2;
        };
        intro.set(parcel, { autoAlpha: 1, x: function () { return centre(0); } }, .55)
          .to(parcel, { x: function () { return centre(n - 1); }, duration: ride, ease: 'power2.inOut' }, .55)
          .to(parcel, { y: -6, duration: ride / 6, ease: 'sine.inOut', yoyo: true, repeat: 5 }, .55)
          // Delivered: the parcel drops into the last stop, which catches it.
          .to(parcel, { y: 20, scale: .4, autoAlpha: 0, duration: .35, ease: 'power2.in' }, .55 + ride)
          .fromTo(icons[n - 1], { scale: 1 }, { scale: 1.14, duration: .12, yoyo: true, repeat: 1, ease: 'power2.out', clearProps: 'transform' }, .55 + ride + .3)
          .set(parcel, { clearProps: 'all' });
      }

      if (ScrollTrigger) {
        st = ScrollTrigger.create({
          trigger: root, start: 'top bottom', end: 'bottom top',
          onToggle: function (self) { onScreen = self.isActive; }
        });
      }
      if (document.visibilityState === 'hidden') intro.progress(1);
    }, root);

    root._cvdlFinish = function () { if (intro) intro.progress(1); };
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches('[data-cvdl]')) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all('[data-cvdl]', scope));
    roots.forEach(init);
    if (roots.length && window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function rootOf(target) {
    if (!target) return null;
    return target.matches && target.matches('[data-cvdl]') ? target : one('[data-cvdl]', target);
  }

  boot(document);

  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { destroy(rootOf(event.target)); });
  document.addEventListener('shopify:section:select', function (event) {
    var root = rootOf(event.target);
    if (root && root._cvdlFinish) root._cvdlFinish();
  });
  document.addEventListener('shopify:block:select', function (event) {
    var root = event.target.closest && event.target.closest('[data-cvdl]');
    if (root && root._cvdlFinish) root._cvdlFinish();
  });
})();
