/* Casify: "The Shop Counter" product page behaviour (sections/cv-product-counter.liquid).
 *
 *   ship-by  "Order today, ships by Fri, Sep 18": today plus the section's latest
 *            dispatch window in business days (Monday to Friday). It is a
 *            dispatch date from the confirmed 1-3 business day window, never a
 *            delivery promise.
 *   zoom     the stage's "Tap to zoom" opens the real photo large in a dialog;
 *            a mouse pans by moving, a finger pans by dragging, a tap on the
 *            photo switches between close-up and whole photo, arrows step
 *            through the photos; closing (button, tap-outside or Escape) goes
 *            through requestClose(), which fires the cancelable cvc:zoomclose
 *            so cv-pdp-counter-motion.js can animate the exit before the
 *            native dialog actually closes; with no listener it closes at once
 *
 * Money and the cart live in cv-product.js. No-ops without the counter.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-cv-pdp="counter"]');
  if (!root) return;

  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------- ship-by */
  var shipBy = $('[data-cvc-ship-by]');
  if (shipBy) {
    var days = parseInt(shipBy.getAttribute('data-max-days'), 10);
    var out = $('[data-cvc-ship-by-text]', shipBy);
    var template = shipBy.getAttribute('data-template') || '';
    if (days > 0 && out && template.indexOf('[date]') > -1) {
      var date = new Date();
      var added = 0;
      while (added < days) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0 && date.getDay() !== 6) added++;
      }
      var label;
      try {
        label = date.toLocaleDateString(document.documentElement.lang || undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      } catch (e) {
        label = date.toDateString().slice(0, 10);
      }
      out.textContent = template.replace('[date]', label);
      shipBy.setAttribute('data-ready', '');
    }
  }

  /* ---------------------------------------------------------------- zoom */
  var dialog = $('[data-cvc-zoom]');
  var opener = $('[data-cvc-zoom-open]');
  var stage = $('.cvc__stage');
  if (!dialog || !opener || typeof dialog.showModal !== 'function') {
    if (opener) opener.hidden = true;
    return;
  }

  var frame = $('[data-cvc-zoom-frame]', dialog);
  var img = $('[data-cvc-zoom-img]', dialog);
  var count = $('[data-cvc-zoom-count]', dialog);
  var thumbs = $$('[data-cv-thumb]');
  var index = 0;
  var zoomClosing = false;

  /* A listener (the motion file) can animate the close by preventing this
     event and calling dialog.close() itself when its exit finishes; with no
     listener (no GSAP, reduced motion) the dialog just closes immediately. */
  function requestClose() {
    if (zoomClosing || !dialog.open) return;
    var evt = new CustomEvent('cvc:zoomclose', { detail: { dialog: dialog }, cancelable: true });
    if (root.dispatchEvent(evt)) {
      dialog.close();
    } else {
      zoomClosing = true;
    }
  }

  function larger(src) {
    if (!src) return '';
    return /[?&]width=\d+/.test(src) ? src.replace(/([?&])width=\d+/, '$1width=2400') : src;
  }
  function selectedIndex() {
    for (var i = 0; i < thumbs.length; i++) if (thumbs[i].getAttribute('aria-selected') === 'true') return i;
    return 0;
  }
  function centre() {
    frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) / 2;
    frame.scrollTop = (frame.scrollHeight - frame.clientHeight) / 2;
  }
  function setCount() {
    if (count) count.textContent = thumbs.length > 1 ? (index + 1) + ' / ' + thumbs.length : '';
  }
  function load(src) {
    dialog.classList.add('is-loading');
    img.onload = function () { dialog.classList.remove('is-loading'); centre(); };
    img.src = src;
    if (img.complete) { dialog.classList.remove('is-loading'); centre(); }
  }

  function open() {
    var main = document.getElementById('cvMainImage');
    index = selectedIndex();
    dialog.classList.remove('is-fit');
    img.alt = main && main.alt ? main.alt : '';
    load(larger(main && (main.currentSrc || main.getAttribute('src'))) || opener.getAttribute('data-cv-zoom'));
    setCount();
    dialog.showModal();
    document.documentElement.classList.add('cvc-zoom-open');
    root.dispatchEvent(new CustomEvent('cvc:zoom', { detail: { open: true, dialog: dialog } }));
  }
  function step(dir) {
    if (thumbs.length < 2) return;
    index = (index + dir + thumbs.length) % thumbs.length;
    load(thumbs[index].getAttribute('data-cv-zoom'));
    setCount();
    root.dispatchEvent(new CustomEvent('cvc:zoomstep', { detail: { dir: dir, img: img } }));
  }

  opener.addEventListener('click', open);
  if (stage) {
    stage.addEventListener('click', function (e) {
      if (e.target.closest('[data-cvc-zoom-open]') || !e.target.closest('#cvMainImage')) return;
      open();
    });
  }
  $$('[data-cvc-zoom-close]', dialog).forEach(function (b) { b.addEventListener('click', requestClose); });
  $$('[data-cvc-zoom-step]', dialog).forEach(function (b) {
    b.addEventListener('click', function () { step(parseInt(b.getAttribute('data-cvc-zoom-step'), 10) || 1); });
  });
  dialog.addEventListener('cancel', function (e) { e.preventDefault(); requestClose(); });
  dialog.addEventListener('close', function () {
    zoomClosing = false;
    document.documentElement.classList.remove('cvc-zoom-open');
    root.dispatchEvent(new CustomEvent('cvc:zoom', { detail: { open: false, dialog: dialog } }));
  });
  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  /* A mouse pans by position; touch keeps the frame's native drag-to-scroll. */
  frame.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || dialog.classList.contains('is-fit')) return;
    var r = frame.getBoundingClientRect();
    frame.scrollLeft = ((e.clientX - r.left) / r.width) * (frame.scrollWidth - frame.clientWidth);
    frame.scrollTop = ((e.clientY - r.top) / r.height) * (frame.scrollHeight - frame.clientHeight);
  });
  var downAt = null;
  frame.addEventListener('pointerdown', function (e) { downAt = { x: e.clientX, y: e.clientY }; });
  frame.addEventListener('click', function (e) {
    if (downAt && Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y) > 8) return; // a drag, not a tap
    if (e.target !== img) { requestClose(); return; }
    dialog.classList.toggle('is-fit');
    if (!dialog.classList.contains('is-fit')) {
      var r = frame.getBoundingClientRect();
      frame.scrollLeft = ((e.clientX - r.left) / r.width) * (frame.scrollWidth - frame.clientWidth);
      frame.scrollTop = ((e.clientY - r.top) / r.height) * (frame.scrollHeight - frame.clientHeight);
    }
  });
})();
