/* Casify: googly eyes on the Add to bag and Buy now pills (snippets/cv-eyes.liquid, styles in cv-eyes.css).
 *
 * The pupils watch the mouse. A phone has no mouse, so they look at the last tap and then glance
 * around on their own. A set blinks now and then, and when its button is pressed. cv-eyes.css shuts
 * the eyes on a disabled button and blinks them twice when the bag fills.
 *
 * The collections below are live, so the quick pick, the sticky bar and theme editor reloads need
 * no setup. Without JS, or with reduced motion, the eyes stay open and look straight ahead.
 */
(function () {
  'use strict';

  var sets = document.getElementsByClassName('cv-eyes');
  var eyes = document.getElementsByClassName('cv-eye');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  var FAR = 120; // px from an eye at which the pupil reaches the rim
  var RIM = 0.3; // pupil travel as a share of the eye's width; the pupil is 36% wide in cv-eyes.css
  var TAP_HOLD = 1500; // ms a tap keeps their attention
  var SHUT = 110; // ms a blink stays shut

  var target = null; // the point they look at, in viewport pixels
  var hasMouse = false;
  var tappedAt = 0;
  var queued = false;

  function onScreen(box) {
    return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
  }

  function follow() {
    queued = false;
    if (!target || calm.matches) return;
    var moves = [];
    for (var i = 0; i < eyes.length; i++) {
      var box = eyes[i].getBoundingClientRect();
      if (!onScreen(box)) continue;
      var dx = target.x - box.left - box.width / 2;
      var dy = target.y - box.top - box.height / 2;
      var gap = Math.sqrt(dx * dx + dy * dy) || 1;
      var reach = box.width * RIM * Math.min(gap / FAR, 1) / gap;
      moves.push({ pupil: eyes[i].firstElementChild, x: dx * reach, y: dy * reach });
    }
    moves.forEach(function (m) {
      m.pupil.style.transform = 'translate(' + m.x.toFixed(1) + 'px,' + m.y.toFixed(1) + 'px)';
    });
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(follow);
  }

  function blink(set) {
    set.classList.add('is-blinking');
    setTimeout(function () { set.classList.remove('is-blinking'); }, SHUT);
  }

  function tick() {
    setTimeout(tick, 1400 + Math.random() * 2000);
    if (document.hidden || calm.matches) return;
    var seen = [];
    for (var i = 0; i < sets.length; i++) {
      if (onScreen(sets[i].getBoundingClientRect())) seen.push(sets[i]);
    }
    if (!seen.length) return;
    if (Math.random() < 0.7) blink(seen[Math.floor(Math.random() * seen.length)]);
    if (!hasMouse && Date.now() - tappedAt > TAP_HOLD && Math.random() < 0.6) {
      target = { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight };
      queue();
    }
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return; // a moving finger is usually a scroll
    hasMouse = true;
    target = { x: e.clientX, y: e.clientY };
    queue();
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    target = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'touch') {
      hasMouse = false;
      tappedAt = Date.now();
    }
    queue();
    var host = e.target.closest && e.target.closest('button, a');
    var set = host && !host.disabled && host.querySelector('.cv-eyes');
    if (set && !calm.matches) blink(set);
  }, { passive: true });

  // The page moves under a resting mouse. Capture also hears the quick pick sheet scroll.
  window.addEventListener('scroll', function () {
    if (hasMouse) queue();
  }, { passive: true, capture: true });

  calm.addEventListener('change', function () {
    if (!calm.matches) return;
    for (var i = 0; i < eyes.length; i++) eyes[i].firstElementChild.style.transform = '';
  });

  setTimeout(tick, 1200);
})();
