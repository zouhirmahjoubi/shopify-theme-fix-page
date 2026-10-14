(function () {
  'use strict';

  var instances = new WeakMap();

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function mount(root) {
    if (!root || instances.has(root)) return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var cleanups = [];
    var ambient = null;
    var visible = false;

    instances.set(root, cleanups);
    if (!gsap || !ScrollTrigger || prefersReducedMotion()) return;

    var plaque = root.querySelector('[data-cvx-plaque]');
    var pins = Array.prototype.slice.call(root.querySelectorAll('[data-cvx-pin]'));
    var tickets = Array.prototype.slice.call(root.querySelectorAll('[data-cvx-ticket]'));
    var heading = root.querySelector('[data-cvx-heading]');
    var intro = root.querySelector('[data-cvx-intro]');
    var rule = root.querySelector('[data-cvx-rule]');
    var rows = Array.prototype.slice.call(root.querySelectorAll('[data-cvx-experience]'));
    var seals = Array.prototype.slice.call(root.querySelectorAll('[data-cvx-seal]'));
    var rings = Array.prototype.slice.call(root.querySelectorAll('[data-cvx-ring]'));
    var iconPaths = Array.prototype.slice.call(root.querySelectorAll('[data-cvx-icon] svg path, [data-cvx-icon] svg circle, [data-cvx-icon] svg rect'));
    var closing = root.querySelector('[data-cvx-closing]');
    var app = root.querySelector('[data-cvx-app]');

    var playAmbient = function () {
      if (!ambient || !visible || document.hidden) return;
      ambient.play();
    };

    var pauseAmbient = function () {
      if (ambient) ambient.pause();
    };

    var visibilityChange = function () {
      if (document.hidden) pauseAmbient();
      else playAmbient();
    };

    var context = gsap.context(function () {
      if (plaque) {
        ambient = gsap.to(plaque, {
          y: -3,
          scale: 1.006,
          duration: 4.8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          paused: true
        });
      }

      var trigger = ScrollTrigger.create({
        trigger: root,
        start: 'top 74%',
        once: true,
        onEnter: function () {
          var timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

          if (plaque) {
            timeline.fromTo(plaque,
              { y: 22, scale: .9, rotation: -2.5, filter: 'blur(2px) drop-shadow(0 12px 16px rgba(51, 35, 26, .12))' },
              { y: 0, scale: 1, rotation: 0, filter: 'blur(0px) drop-shadow(0 22px 22px rgba(51, 35, 26, .22))', duration: .72 },
              0
            );
          }

          if (tickets.length) {
            timeline.fromTo(tickets,
              { y: 18, scale: .955, autoAlpha: 0 },
              { y: 0, scale: 1, autoAlpha: 1, duration: .5, stagger: .045 },
              .18
            );
          }

          if (pins.length) {
            timeline.fromTo(pins,
              { scale: 2.2, autoAlpha: 0 },
              { scale: 1, autoAlpha: 1, duration: .26, stagger: .08, ease: 'back.out(1.7)' },
              .48
            );
          }

          if (heading) timeline.fromTo(heading, { x: 24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .62 }, .12);
          if (intro) timeline.fromTo(intro, { x: 18, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .55 }, .22);
          if (rule) timeline.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: .58 }, .34);

          if (rows.length) {
            timeline.fromTo(rows,
              { y: 14, clipPath: 'inset(0 0 36% 0)', autoAlpha: 0 },
              { y: 0, clipPath: 'inset(0 0 0% 0)', autoAlpha: 1, duration: .5, stagger: .09 },
              .38
            );
          }

          if (seals.length) {
            timeline.fromTo(seals,
              { scale: .72, rotation: -8 },
              { scale: 1, rotation: 0, duration: .38, stagger: .09, ease: 'back.out(1.35)' },
              .48
            );
          }

          rings.forEach(function (ring, index) {
            var target = Math.max(0, Math.min(100, Number(ring.getAttribute('data-percent')) || 0));
            var label = ring.closest('[data-cvx-seal]').querySelector('[data-cvx-percent]');
            var counter = { value: 0 };
            gsap.set(ring, { strokeDasharray: '100 100', strokeDashoffset: 100 });
            timeline.to(ring, {
              strokeDashoffset: 100 - target,
              duration: .68,
              ease: 'power2.out'
            }, .52 + index * .09);
            if (label) {
              timeline.to(counter, {
                value: target,
                duration: .68,
                ease: 'power2.out',
                onUpdate: function () { label.textContent = Math.round(counter.value) + '%'; }
              }, .52 + index * .09);
            }
          });

          if (iconPaths.length && window.DrawSVGPlugin) {
            timeline.fromTo(iconPaths, { drawSVG: '0%' }, { drawSVG: '100%', duration: .42, stagger: .018 }, .58);
          }

          if (closing) timeline.fromTo(closing, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .42 }, .72);
          if (app) timeline.fromTo(app, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .55 }, .82);

          timeline.call(playAmbient);
        }
      });

      var visibilityTrigger = ScrollTrigger.create({
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: function (self) {
          visible = self.isActive;
          if (visible) playAmbient();
          else pauseAmbient();
        }
      });

      cleanups.push(function () {
        trigger.kill();
        visibilityTrigger.kill();
      });
    }, root);

    document.addEventListener('visibilitychange', visibilityChange);
    cleanups.push(function () {
      document.removeEventListener('visibilitychange', visibilityChange);
      if (ambient) ambient.kill();
      context.revert();
    });
  }

  function unmount(root) {
    var cleanups = instances.get(root) || [];
    cleanups.reverse().forEach(function (cleanup) { cleanup(); });
    instances.delete(root);
  }

  function mountAll(scope) {
    var target = scope || document;
    if (target.matches && target.matches('[data-cvx]')) mount(target);
    Array.prototype.forEach.call(target.querySelectorAll('[data-cvx]'), mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountAll(document); });
  } else {
    mountAll(document);
  }

  document.addEventListener('shopify:section:load', function (event) { mountAll(event.target); });
  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.matches && event.target.matches('[data-cvx]') ? event.target : event.target.querySelector('[data-cvx]');
    if (root) unmount(root);
  });
})();
