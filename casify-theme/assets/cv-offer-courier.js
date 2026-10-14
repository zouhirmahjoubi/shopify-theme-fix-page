/* Casify "Offer delivery": the shopkeeper walks in, waves, leaves, then drags the
 * offer card on stage. CSS already renders the finished scene; this script only
 * animates into it once, and skips entirely for reduced motion or missing GSAP.
 * As a popup (a <dialog data-cvoc-pop>), it opens after a delay, plays the
 * delivery inside the dialog, and stays shut for the chosen number of days once
 * the shopper closes it.
 */
(function () {
  'use strict';

  function allIn(scope, selector) {
    var found = [];
    if (scope && scope.matches && scope.matches(selector)) found.push(scope);
    if (scope && scope.querySelectorAll) found = found.concat(Array.prototype.slice.call(scope.querySelectorAll(selector)));
    return found;
  }

  function rootsIn(scope) {
    return allIn(scope, '[data-cvoc]');
  }

  // Scenes inside a popup wait for it to open.
  function inlineRootsIn(scope) {
    return rootsIn(scope).filter(function (root) { return !root.closest('[data-cvoc-pop]'); });
  }

  function destroy(root) {
    if (root && typeof root._cvocDestroy === 'function') root._cvocDestroy();
  }

  function bindCopy(root, cleanups) {
    var button = root.querySelector('[data-cvoc-copy]');
    var status = root.querySelector('[data-cvoc-status]');
    if (!button) return;
    var label = button.textContent;
    var timer = 0;

    function copied() {
      button.textContent = button.getAttribute('data-copied') || label;
      if (status) status.textContent = button.textContent;
      clearTimeout(timer);
      timer = setTimeout(function () {
        button.textContent = label;
        if (status) status.textContent = '';
      }, 2200);
    }

    function fallback(code) {
      var field = document.createElement('textarea');
      field.value = code;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
      document.body.removeChild(field);
      if (ok) copied();
    }

    function onClick() {
      var code = button.getAttribute('data-code') || '';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(copied, function () { fallback(code); });
      } else {
        fallback(code);
      }
    }

    button.addEventListener('click', onClick);
    cleanups.push(function () {
      button.removeEventListener('click', onClick);
      clearTimeout(timer);
      button.textContent = label;
    });
  }

  // now: a popup that has just opened. It plays at once instead of waiting to scroll
  // into view, and starts where the shopkeeper hauls the card in, so the offer
  // arrives in about two seconds rather than after the whole walk-on.
  function init(root, now) {
    destroy(root);

    var cleanups = [];
    var timeline = null;
    var trigger = null;
    var waving = null;
    root._cvocDestroy = function () {
      if (trigger) trigger.kill();
      if (timeline) timeline.kill();
      if (waving) waving.kill();
      cleanups.forEach(function (remove) { remove(); });
      clear();
      delete root._cvocDestroy;
      delete root._cvocFinish;
    };

    bindCopy(root, cleanups);

    var gsap = window.gsap;
    var figure = root.querySelector('[data-cvoc-figure]');
    var inner = root.querySelector('[data-cvoc-inner]');
    var card = root.querySelector('[data-cvoc-card]');
    var legBack = root.querySelector('[data-cvoc-leg-back]');
    var legFront = root.querySelector('[data-cvoc-leg-front]');
    var armBack = root.querySelector('[data-cvoc-arm-back]');
    var armFront = root.querySelector('[data-cvoc-arm-front]');
    var head = root.querySelector('[data-cvoc-head]');
    var before = root.querySelector('[data-cvoc-bubble-before]');
    var after = root.querySelector('[data-cvoc-bubble-after]');
    var parts = [figure, inner, card, legBack, legFront, armBack, armFront, head, before, after].filter(Boolean);

    function clear() {
      if (gsap && parts.length) gsap.set(parts, { clearProps: 'all' });
    }

    if (!gsap || !figure || !inner || !card || !legBack || !legFront || !armBack || !armFront) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function pivots() {
      gsap.set([legFront, legBack], { transformOrigin: '50% 0%' });
      gsap.set([armFront, armBack], { transformOrigin: '50% 6px' });
      if (head) gsap.set(head, { transformOrigin: '50% 90%' });
      gsap.set(inner, { transformOrigin: '50% 100%' });
    }

    function steps(duration) {
      var count = Math.max(2, Math.round(duration / 0.32));
      var beat = duration / count;
      var walk = gsap.timeline();
      for (var i = 0; i < count; i++) {
        var swing = i % 2 ? -22 : 22;
        walk
          .to(legFront, { rotation: swing, duration: beat, ease: 'sine.inOut' }, i * beat)
          .to(legBack, { rotation: -swing, duration: beat, ease: 'sine.inOut' }, i * beat)
          .to(inner, { y: -4, duration: beat / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, i * beat);
      }
      walk.to([legFront, legBack], { rotation: 0, duration: 0.14, ease: 'sine.out' });
      return walk;
    }

    function wave(cycles) {
      var hand = gsap.timeline();
      hand.to(armFront, { rotation: -150, duration: 0.26, ease: 'back.out(2)' });
      for (var i = 0; i < cycles; i++) {
        hand.to(armFront, { rotation: -168, duration: 0.14, ease: 'sine.inOut' })
          .to(armFront, { rotation: -140, duration: 0.14, ease: 'sine.inOut' });
      }
      hand.to(armFront, { rotation: 0, duration: 0.28, ease: 'power2.inOut' });
      return hand;
    }

    function build() {
      var bounds = root.getBoundingClientRect();
      var figureBox = figure.getBoundingClientRect();
      var offLeft = -(figureBox.right - bounds.left) - 30;
      var offRight = bounds.right - figureBox.left + 30;
      var enter = 1.3;
      var leave = 1.0;
      var haul = 1.9;

      pivots();
      timeline = gsap.timeline({
        paused: true,
        onComplete: function () {
          timeline = null;
          clear();
        }
      });

      timeline
        .set(figure, { x: offLeft })
        .set(card, { x: offRight, rotation: 4 })
        .set([before, after], { autoAlpha: 0, scale: 0.6 })

        // 1. Walk in from the left.
        .to(figure, { x: 0, duration: enter, ease: 'none' }, 0)
        .add(steps(enter), 0)

        // 2. Stop, wave, first bubble.
        .add('hello')
        .to(head, { rotation: -6, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 'hello')
        .add(wave(2), 'hello')
        .to(before, { autoAlpha: 1, scale: 1, duration: 0.32, ease: 'back.out(2.2)' }, 'hello+=0.1')
        .to(before, { autoAlpha: 0, scale: 0.85, duration: 0.2, ease: 'power1.in' }, 'hello+=1.55')

        // 3. Walk off to the right.
        .add('exit', 'hello+=1.75')
        .to(figure, { x: offRight, duration: leave, ease: 'power1.in' }, 'exit')
        .add(steps(leave), 'exit')

        // 4. Come back facing left, hauling the card behind.
        .add('haul')
        .set(inner, { scaleX: -1 }, 'haul')
        .set(armBack, { rotation: 78 }, 'haul')
        .to([figure, card], { x: 0, duration: haul, ease: 'power2.out' }, 'haul')
        .add(steps(haul * 0.85), 'haul')
        .to(card, { rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' }, 'haul+=' + (haul - 0.2))

        // 5. Turn round, let go, present it.
        .add('present', 'haul+=' + haul)
        .set(inner, { scaleX: 1 }, 'present')
        .to(armBack, { rotation: 0, duration: 0.3, ease: 'power2.out' }, 'present')
        .to(after, { autoAlpha: 1, scale: 1, duration: 0.34, ease: 'back.out(2.2)' }, 'present+=0.1')
        .add(wave(1), 'present+=0.15');

      return timeline;
    }

    function finish() {
      if (trigger) { trigger.kill(); trigger = null; }
      if (timeline) { timeline.kill(); timeline = null; }
      clear();
    }
    root._cvocFinish = finish;

    // Park everything off stage only once the intro is sure to run.
    build();
    timeline.progress(0.0001).pause();

    var played = false;
    function play(from) {
      if (played || !timeline) return;
      played = true;
      timeline.play(from || 0);
    }

    // The scene is parked off stage now, so it must never wait on a trigger that
    // cannot fire: a page restored below the section skips straight to the end,
    // and one that opens with the section already in view plays at once.
    var box = root.getBoundingClientRect();
    if (now) {
      play('haul');
    } else if (box.bottom <= 0) {
      finish();
    } else if (!window.ScrollTrigger || box.top < window.innerHeight * 0.72) {
      play();
    } else {
      trigger = window.ScrollTrigger.create({ trigger: root, start: 'top 72%', once: true, onEnter: play });
    }

    // A greeting wave when someone points at the shopkeeper after the intro.
    function onEnter() {
      if (timeline || waving) return;
      pivots();
      waving = wave(1);
      waving.eventCallback('onComplete', function () {
        waving = null;
        gsap.set(armFront, { clearProps: 'all' });
      });
    }
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      figure.addEventListener('pointerenter', onEnter);
      cleanups.push(function () { figure.removeEventListener('pointerenter', onEnter); });
    }
  }

  /* ---------------------------------------------------------------- popup */
  var STORE = 'cvoc-pop:';

  // days > 0: closed within that many days (localStorage); 0: never suppressed — shows on every page load.
  function dismissed(key, days) {
    try {
      if (days > 0) {
        var at = Number(window.localStorage.getItem(STORE + key));
        return at > 0 && Date.now() - at < days * 864e5;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  function dismiss(key, days) {
    try {
      if (days > 0) window.localStorage.setItem(STORE + key, String(Date.now()));
      // days 0: the popup shows again on the next load, so nothing is stored.
    } catch (error) {
      // Storage blocked: the popup may simply show again on a later page.
    }
  }

  function destroyPop(dialog) {
    if (dialog && typeof dialog._cvocDestroy === 'function') dialog._cvocDestroy();
  }

  function initPop(dialog) {
    destroyPop(dialog);
    if (typeof dialog.showModal !== 'function') return;

    var root = dialog.querySelector('[data-cvoc]');
    var key = dialog.getAttribute('data-key') || 'offer';
    var days = parseInt(dialog.getAttribute('data-days'), 10) || 0;
    var delay = Math.max(0, parseFloat(dialog.getAttribute('data-delay')) || 0) * 1000;
    var editor = dialog.hasAttribute('data-editor');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timer = 0;

    function open() {
      clearTimeout(timer);
      if (dialog.open) return;
      // Never on top of another dialog (photo zoom, quick pick): try again shortly.
      if (document.querySelector('dialog[open]')) {
        timer = setTimeout(open, 4000);
        return;
      }
      dialog.showModal();
      if (root) init(root, true);
    }

    function close() {
      if (dialog.open) dialog.close();
    }

    function onClose() {
      // The close event is async: ignore one that lands after the popup reopened.
      if (dialog.open) return;
      if (!editor) dismiss(key, days);
      if (root) destroy(root);
    }

    function onClick(event) {
      // A click on the backdrop lands on the dialog itself.
      if (event.target === dialog) { close(); return; }
      if (event.target.closest('[data-cvoc-close]')) { close(); return; }
      var cta = event.target.closest('a[href]');
      if (!cta) return;
      var target = cta.hasAttribute('data-cvoc-scroll') && document.querySelector(cta.getAttribute('data-cvoc-scroll'));
      if (!target) target = cta.hasAttribute('data-cvoc-scroll') && document.getElementById('cvPdp');
      close();
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      var choice = target.querySelector('[aria-checked="true"], input:checked, button, [tabindex="0"]');
      if (choice) choice.focus({ preventScroll: true });
    }

    dialog.addEventListener('close', onClose);
    dialog.addEventListener('click', onClick);
    if (!editor && !dismissed(key, days)) timer = setTimeout(open, delay);

    dialog._cvocOpen = open;
    dialog._cvocDestroy = function () {
      clearTimeout(timer);
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('click', onClick);
      if (dialog.open) dialog.close();
      if (root) destroy(root);
      delete dialog._cvocOpen;
      delete dialog._cvocDestroy;
    };
  }

  function boot(scope) {
    inlineRootsIn(scope).forEach(function (root) { init(root); });
    allIn(scope, '[data-cvoc-pop]').forEach(initPop);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  boot(document);
  document.addEventListener('shopify:section:load', function (event) { boot(event.target); });
  document.addEventListener('shopify:section:unload', function (event) {
    allIn(event.target, '[data-cvoc-pop]').forEach(destroyPop);
    rootsIn(event.target).forEach(destroy);
  });
  // In the theme editor, selecting the section shows the popup (without counting
  // as a dismissal); deselecting it closes it again.
  document.addEventListener('shopify:section:select', function (event) {
    inlineRootsIn(event.target).forEach(function (root) { if (root._cvocFinish) root._cvocFinish(); });
    allIn(event.target, '[data-cvoc-pop]').forEach(function (dialog) { if (dialog._cvocOpen) dialog._cvocOpen(); });
  });
  document.addEventListener('shopify:section:deselect', function (event) {
    allIn(event.target, '[data-cvoc-pop]').forEach(function (dialog) { if (dialog.open) dialog.close(); });
  });
})();
