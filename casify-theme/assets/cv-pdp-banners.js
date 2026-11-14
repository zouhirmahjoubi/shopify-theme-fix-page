/* Casify: product page feature banners (sections/cv-pdp-banners.liquid).
 *
 * 1. Entrance: each banner settles in once, when a fifth of it is on screen. Start states are
 *    only set here, and never under reduced motion, in the theme editor or for a banner that is
 *    already on screen when the script runs, so nothing is ever hidden without it.
 * 2. Fit banner: once the shopper confirms a phone in the buy box (cvs:change from
 *    assets/cv-product.js with a modelValue), the first photo becomes that variant's photo and
 *    its tag reads "Your [model]". Product photos only, never a guess: nothing changes until a
 *    phone is confirmed.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sized(src, w) {
    if (!src) return '';
    if (src.indexOf('//') === 0) src = 'https:' + src;
    return src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=' + w;
  }

  function enter(sec) {
    var editor = window.Shopify && window.Shopify.designMode;
    if (reduce || editor || !('IntersectionObserver' in window)) return;
    var items = Array.prototype.slice.call(sec.querySelectorAll('[data-cvbn-item]'));
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        en.target.classList.add('is-in');
        en.target.classList.remove('is-pending');
      });
    }, { threshold: 0.2 });
    var vh = window.innerHeight || document.documentElement.clientHeight;
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) return;
      el.classList.add('is-pending');
      io.observe(el);
    });
  }

  function wireFit(sec) {
    var fit = sec.querySelector('.cvbn--fit');
    var pdp = document.querySelector('[data-cv-pdp]');
    if (!fit || !pdp) return;
    var json = fit.querySelector('[data-cvbn-fit-json]');
    var img = fit.querySelector('[data-cvbn-phone] img');
    var tag = fit.querySelector('[data-cvbn-tag]');
    if (!json || !img || !tag) return;
    var data;
    try { data = JSON.parse(json.textContent); } catch (e) { return; }
    var shown = null;

    pdp.addEventListener('cvs:change', function (e) {
      var d = e.detail || {};
      var v = d.variant;
      var model = d.modelValue;
      if (!model || !v || !v.featured_image || !v.featured_image.src) return;
      var src = v.featured_image.src;
      if (src === shown) return;
      shown = src;
      var label = String(data.yours || '[model]').split('[model]').join(model);
      var next = new Image();
      next.onload = function () {
        if (shown !== src) return;
        var swap = function () {
          img.removeAttribute('srcset');
          img.src = next.src;
          img.alt = (data.alt || '') + model;
          tag.textContent = label;
          img.classList.remove('is-swapping');
        };
        if (reduce) { swap(); return; }
        img.classList.add('is-swapping');
        setTimeout(swap, 260);
      };
      next.src = sized(src, (window.innerWidth || 0) >= 990 ? 1600 : 900);
    });
  }

  function init(sec) {
    if (sec.__cvbn) return;
    sec.__cvbn = true;
    enter(sec);
    wireFit(sec);
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cvbn]'), init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('shopify:section:load', function (e) {
    var sec = e.target && e.target.querySelector && e.target.querySelector('[data-cvbn]');
    if (sec) init(sec);
  });
})();
