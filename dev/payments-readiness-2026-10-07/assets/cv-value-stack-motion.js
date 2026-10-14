/* Casify: value stack motion (sections/cv-value-stack.liquid).
 *
 * Printed by the section itself as a deferred script; it runs after the GSAP
 * bundle because snippets/gsap.liquid is rendered in <head>. (When GSAP sat at
 * the end of <body> this file ran first, found no GSAP and exited, which left
 * the metrics reading "0" and the gauge bars empty.) Nothing runs without
 * GSAP/ScrollTrigger or under reduced motion, and every row, card and bar is
 * complete and readable without it: the markup prints each number's final
 * value and each bar's full height, and this file zeroes them only when it is
 * about to animate them.
 *
 *   fix rows   the medallion pops, the metric counts up to its number, and
 *              the them/us beam tips toward "us" as its bar settles
 *   benefits   the grid cards rise in with a soft stagger
 *   gauge      each column's bar rises from the counter line in sequence —
 *              tallest (ours) first — its value counting up as it climbs;
 *              once ours settles, the candy-cane flag drops onto it
 */
(function () {
  'use strict';

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.querySelector('[data-cvvs]');
  if (!root || !gsap || !ScrollTrigger || reduce) return;

  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

  var drop = 'back.out(1.6)';
  if (window.CustomBounce) { window.CustomBounce.create('cvvsDrop', { strength: 0.45, squash: 1.1 }); drop = 'cvvsDrop'; }

  function onEnter(el, fn, start) {
    ScrollTrigger.create({ trigger: el, start: start || 'top 82%', once: true, onEnter: fn });
  }

  function countTo(el, target, duration) {
    var obj = { v: 0 };
    var isFloat = target % 1 !== 0;
    gsap.to(obj, {
      v: target, duration: duration || 1.1, ease: 'power2.out',
      onUpdate: function () { el.textContent = isFloat ? obj.v.toFixed(1) : Math.round(obj.v); }
    });
  }

  /* ------------------------------------------------------------ fix rows */
  document.documentElement.classList.remove('cvvs-pending');
  $$('[data-cvvs-fix]').forEach(function (row, i) {
    var medal = $('.cvvs-fix__medal', row);
    var ico = $('.cvvs-fix__ico', row);
    var metric = $('[data-cvvs-metric-num]', row);
    var metricWrap = $('[data-cvvs-metric]', row);
    var body = $('.cvvs-fix__body', row);
    var beamBar = $('[data-cvvs-beam-bar]', row);
    var fromLeft = row.classList.contains('cvvs-fix--flip');

    gsap.set(row.querySelector('.cvvs-fix__figure'), { opacity: 0, x: fromLeft ? 40 : -40 });
    gsap.set(body, { opacity: 0, y: 18 });
    if (medal) gsap.set(medal, { scale: 0 });
    if (metric && metricWrap) metric.textContent = '0';
    if (beamBar) gsap.set(beamBar, { rotation: 0, scaleX: 0.2, transformOrigin: '50% 50%' });

    onEnter(row, function () {
      var tl = gsap.timeline();
      tl.to(row.querySelector('.cvvs-fix__figure'), { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, 0);
      tl.to(body, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.08);
      if (medal) tl.to(medal, { scale: 1, duration: 0.7, ease: drop }, 0.1);
      if (metric && metricWrap) {
        var target = parseFloat(metricWrap.getAttribute('data-value')) || 0;
        tl.call(function () { countTo(metric, target, 1); }, null, 0.2);
      }
      if (beamBar) tl.to(beamBar, { scaleX: 1, rotation: -3.5, duration: 0.6, ease: 'power2.out' }, 0.35);
    });
  });

  /* ------------------------------------------------------------ benefits */
  var benefits = $$('[data-cvvs-benefit]');
  if (benefits.length) {
    gsap.set(benefits, { opacity: 0, y: 20 });
    onEnter(benefits[0].closest('.cvvs-benefits'), function () {
      gsap.to(benefits, { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: 'power2.out' });
    });
  }

  /* -------------------------------------------------------------- gauge */
  var gauge = $('[data-cvvs-gauge]');
  if (gauge) {
    var cols = $$('[data-cvvs-col]', gauge);
    cols.forEach(function (col) {
      var bar = $('[data-cvvs-col-bar]', col);
      var val = $('[data-cvvs-col-val]', col);
      var flag = $('.cvvs-gauge__flag', col);
      if (bar) gsap.set(bar, { '--fill': '0%' });
      if (val) val.setAttribute('data-final', val.textContent);
      if (flag) gsap.set(flag, { opacity: 0, y: -14, scale: 0.6 });
    });

    onEnter(gauge, function () {
      var tl = gsap.timeline();
      cols.forEach(function (col, i) {
        var bar = $('[data-cvvs-col-bar]', col);
        var val = $('[data-cvvs-col-val]', col);
        var flag = $('.cvvs-gauge__flag', col);
        var pct = parseFloat(col.getAttribute('data-pct')) || 0;
        var start = i * 0.16;
        if (bar) tl.to(bar, { '--fill': pct + '%', duration: 0.9, ease: drop }, start);
        if (val) {
          var text = val.getAttribute('data-final') || '';
          var num = parseFloat(text);
          if (!isNaN(num)) {
            tl.call(function () { countTo(val, num, 0.8); }, null, start);
            tl.call(function () { val.textContent = text; }, null, start + 0.82);
          }
        }
        if (flag) tl.to(flag, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(3)' }, start + 0.85);
      });
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
