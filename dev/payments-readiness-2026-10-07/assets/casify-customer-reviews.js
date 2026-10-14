(function () {
  'use strict';

  if (window.CasifyCustomerReviewsCarousel) {
    window.CasifyCustomerReviewsCarousel.mountAll(document);
    return;
  }

  var instances = new WeakMap();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function mount(section) {
    if (instances.has(section)) return;

    var rail = section.querySelector('[data-ccr-rail]');
    var controls = section.querySelector('[data-ccr-controls]');
    if (!rail || !controls) return;

    var cards = Array.prototype.slice.call(rail.querySelectorAll('[data-ccr-card]'));
    var previous = controls.querySelector('[data-ccr-prev]');
    var next = controls.querySelector('[data-ccr-next]');
    var position = controls.querySelector('[data-ccr-position]');
    if (cards.length < 2 || !previous || !next || !position) return;

    var positionTemplate = position.getAttribute('data-template') || 'Review %current% of %total%';
    var railLabel = rail.getAttribute('aria-label');
    var frame = 0;
    var observer;

    function currentIndex() {
      var railLeft = rail.getBoundingClientRect().left;
      var closest = 0;
      var distance = Infinity;
      cards.forEach(function (card, index) {
        var cardDistance = Math.abs(card.getBoundingClientRect().left - railLeft);
        if (cardDistance < distance) {
          closest = index;
          distance = cardDistance;
        }
      });
      return closest;
    }

    function update() {
      var maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
      var canScroll = maxScroll >= 3;
      controls.hidden = !canScroll;
      if (canScroll) {
        rail.tabIndex = 0;
        if (railLabel) rail.setAttribute('aria-label', railLabel);
      } else {
        rail.removeAttribute('tabindex');
        rail.removeAttribute('aria-label');
      }
      previous.disabled = rail.scrollLeft < 3;
      next.disabled = rail.scrollLeft >= maxScroll - 3;
      var index = currentIndex();
      var nextPosition = positionTemplate
        .replace('%current%', String(index + 1))
        .replace('%total%', String(cards.length));
      if (position.textContent !== nextPosition) position.textContent = nextPosition;
    }

    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        update();
      });
    }

    function goTo(index, instant) {
      var target = cards[Math.max(0, Math.min(cards.length - 1, index))];
      if (!target) return;
      var left = target.offsetLeft - cards[0].offsetLeft;
      rail.scrollTo({
        left: left,
        behavior: instant || (reduceMotion && reduceMotion.matches) ? 'auto' : 'smooth'
      });
      scheduleUpdate();
    }

    function onPrevious() { goTo(currentIndex() - 1, false); }
    function onNext() { goTo(currentIndex() + 1, false); }

    function onKeydown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0, true);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(cards.length - 1, true);
      }
    }

    previous.addEventListener('click', onPrevious);
    next.addEventListener('click', onNext);
    rail.addEventListener('keydown', onKeydown);
    rail.addEventListener('scroll', scheduleUpdate, { passive: true });

    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(rail);
    } else {
      window.addEventListener('resize', scheduleUpdate);
    }

    instances.set(section, {
      goTo: goTo,
      unmount: function () {
        previous.removeEventListener('click', onPrevious);
        next.removeEventListener('click', onNext);
        rail.removeEventListener('keydown', onKeydown);
        rail.removeEventListener('scroll', scheduleUpdate);
        if (observer) observer.disconnect();
        else window.removeEventListener('resize', scheduleUpdate);
        if (frame) window.cancelAnimationFrame(frame);
      }
    });

    update();
  }

  function mountAll(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.matches && root.matches('[data-casify-customer-reviews]')) mount(root);
    root.querySelectorAll('[data-casify-customer-reviews]').forEach(mount);
  }

  function unmountAll(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    var sections = Array.prototype.slice.call(root.querySelectorAll('[data-casify-customer-reviews]'));
    if (root.matches && root.matches('[data-casify-customer-reviews]')) sections.push(root);
    sections.forEach(function (section) {
      var instance = instances.get(section);
      if (instance) {
        instance.unmount();
        instances.delete(section);
      }
    });
  }

  window.CasifyCustomerReviewsCarousel = { mountAll: mountAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountAll(document); }, { once: true });
  } else {
    mountAll(document);
  }

  document.addEventListener('shopify:section:load', function (event) { mountAll(event.target); });
  document.addEventListener('shopify:section:unload', function (event) { unmountAll(event.target); });
  document.addEventListener('shopify:block:select', function (event) {
    var card = event.target && event.target.closest && event.target.closest('[data-ccr-card]');
    if (!card) return;
    var section = card.closest('[data-casify-customer-reviews]');
    var instance = section && instances.get(section);
    if (!instance) return;
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-ccr-card]'));
    instance.goTo(cards.indexOf(card), true);
  });
})();
