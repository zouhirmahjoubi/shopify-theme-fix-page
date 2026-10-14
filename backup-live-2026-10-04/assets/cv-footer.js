/* Casify — footer behaviour and motion (sections/footer.liquid).
 *
 * Loaded after the GSAP bundle (layout/theme.liquid). The back-to-top button
 * works with or without GSAP; motion layers on top only when GSAP and
 * ScrollTrigger loaded and the visitor hasn't asked for reduced motion.
 *
 *   scroll-in  the stripe band's scallops drop, the "thank you" sign swings down
 *              on its cords, columns and links cascade up, social icons pop, and
 *              the shop items hop up onto the shelf
 *   ambient    stripes drift and the sign sways — only while the footer is on screen
 *   hover      sign wiggles, shop items hop, social icons wiggle
 *   actions    back-to-top spins its peppermint as the page scrolls up; the
 *              newsletter button squashes on press
 *
 * Reveals tween opacity, never visibility, so footer links stay in the tab
 * order before they've animated in. Re-initialises on shopify:section:load.
 */
(function () {
  'use strict';

  var reduceQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function init(root) {
    if (!root || root.dataset.cvfReady === '1') return;
    root.dataset.cvfReady = '1';

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var reduced = !!(reduceQuery && reduceQuery.matches);
    var motion = !!(gsap && ScrollTrigger) && !reduced;
    var cleanups = [];
    var ctx = null;

    function listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      cleanups.push(function () { target.removeEventListener(type, fn, opts); });
    }

    /* ---------- Back to top ---------- */
    var topBtn = root.querySelector('[data-cvf-top]');
    var topMint = topBtn && topBtn.querySelector('img');
    if (topBtn) {
      listen(topBtn, 'click', function () {
        var main = document.getElementById('MainContent');
        var land = function () { if (main) main.focus({ preventScroll: true }); };
        if (motion && window.ScrollToPlugin) {
          var duration = Math.min(1.6, 0.5 + window.pageYOffset / 4000);
          gsap.to(window, { scrollTo: 0, duration: duration, ease: 'power3.inOut', overwrite: 'auto', onComplete: land });
          if (topMint) gsap.fromTo(topMint, { rotation: 0 }, { rotation: -720, duration: duration, ease: 'power3.inOut', overwrite: 'auto' });
        } else {
          window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
          land();
        }
      });
    }

    if (motion) {
      document.documentElement.classList.add('cvf-motion');
      var wiggle = window.CustomWiggle
        ? window.CustomWiggle.create('cvfWiggle', { wiggles: 5, type: 'easeOut' })
        : 'elastic.out(1, 0.3)';

      ctx = gsap.context(function () {
        var footer = root.querySelector('footer') || root;
        var stripes = root.querySelector('.cvf-stripes');
        var valance = root.querySelector('.cvf-stripes__valance');
        var signImg = root.querySelector('.cvf-sign__img');
        var ledger = root.querySelector('[data-cvf-ledger]');
        var columns = $$('.footer__inner > *', root);
        var listItems = $$('.footer__inner li', root);
        var socialLinks = $$('.socials a', root);
        var socialIcons = $$('.socials .cm-icon', root);
        var newsOk = root.querySelector('.cvf-news__ok');
        var newsLabel = root.querySelector('.cvf-news__btn span');
        var shelfEl = root.querySelector('.cvf-shelf');
        var items = $$('.cvf-shelf__item', root);
        var bottomBits = $$('.footer__bottom > *', root);
        var inView = false;
        var settled = !signImg;
        var swayStarted = false;

        /* Ambient loops, paused whenever the footer is off screen. */
        var drift = stripes
          ? gsap.fromTo(stripes, { '--cvf-drift': '0px' }, { '--cvf-drift': '36px', duration: 5, ease: 'none', repeat: -1, paused: true })
          : null;
        var sway = signImg
          ? gsap.fromTo(signImg, { rotation: -1.4 }, { rotation: 1.4, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true, immediateRender: false })
          : null;

        function playSway(fromMiddle) {
          if (!sway) return;
          // Half a swing in, the sign is at 0° — where the drop and the hover wiggle leave it.
          if (fromMiddle || !swayStarted) { swayStarted = true; sway.totalTime(sway.duration() / 2); }
          sway.play();
        }
        function syncAmbient() {
          if (drift) { if (inView) drift.play(); else drift.pause(); }
          if (sway && settled) { if (inView) playSway(false); else sway.pause(); }
        }

        /* Top of the footer: scallops, sign, columns. */
        var reveal = gsap.timeline({ paused: true, defaults: { duration: 0.6, ease: 'power3.out' } });
        if (valance) reveal.from(valance, { scaleY: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)', immediateRender: false }, 0);
        if (signImg) {
          reveal.from(signImg, { yPercent: -110, rotation: -12, duration: 1.6, ease: 'elastic.out(1, 0.3)', immediateRender: false }, 0.05)
            .add(function () { settled = true; syncAmbient(); }, 1.5);
        }
        if (ledger) reveal.from(ledger, { y: 26, scale: 0.985, boxShadow: '0 12px 30px rgba(13,8,5,.16)', duration: 0.9, immediateRender: false }, 0.28);
        reveal.from(columns, { y: 18, duration: 0.7, stagger: 0.09, clearProps: 'transform', immediateRender: false }, 0.35)
          .from(listItems, { x: -8, duration: 0.45, stagger: 0.025, clearProps: 'transform', immediateRender: false }, 0.5);
        if (socialIcons.length) {
          reveal.from(socialIcons, { scale: 0.6, rotation: -18, duration: 0.6, stagger: 0.06, ease: 'back.out(2.4)', immediateRender: false }, 0.6);
        }
        if (newsOk) reveal.from(newsOk, { scale: 0.9, duration: 0.7, ease: 'back.out(2)', immediateRender: false }, 0.7);

        /* Bottom: shop items hop onto the shelf, then the bottom bar. */
        var shelf = gsap.timeline({ paused: true });
        if (items.length) {
          shelf.from(items, { yPercent: 70, scaleY: 0.7, duration: 0.65, stagger: 0.08, ease: 'back.out(2.2)', immediateRender: false }, 0);
        }
        if (bottomBits.length) {
          shelf.from(bottomBits, { y: 10, duration: 0.5, stagger: 0.07, ease: 'power3.out', clearProps: 'transform', immediateRender: false }, 0.15);
        }

        ScrollTrigger.create({ trigger: footer, start: 'top 88%', once: true, onEnter: function () { reveal.play(); } });
        ScrollTrigger.create({
          trigger: shelfEl || root.querySelector('.footer__bottom') || footer,
          start: 'top 96%', once: true,
          onEnter: function () { shelf.play(); }
        });
        ScrollTrigger.create({
          trigger: root, start: 'top bottom', end: 'bottom top',
          onToggle: function (self) { inView = self.isActive; syncAmbient(); }
        });
        // Tabbing into the footer scrolls it into view anyway; don't make keyboard users wait on a trigger.
        listen(root, 'focusin', function () { reveal.play(); shelf.play(); });

        /* Hover + press */
        if (signImg) {
          // On the image: its wrapper is pointer-events:none so it doesn't block the columns.
          listen(signImg, 'mouseenter', function () {
            if (!settled) return;
            if (sway) sway.pause();
            gsap.fromTo(signImg, { rotation: 0 }, {
              rotation: 5, duration: 1.1, ease: wiggle,
              onComplete: function () { if (inView) playSway(true); }
            });
          });
        }
        items.forEach(function (item) {
          listen(item, 'mouseenter', function () {
            gsap.fromTo(item, { y: 0 }, { y: -12, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto' });
          });
        });
        socialLinks.forEach(function (link) {
          var ico = link.querySelector('.cm-icon');
          if (!ico) return;
          listen(link, 'mouseenter', function () {
            gsap.fromTo(ico, { rotation: 0 }, { rotation: 14, duration: 0.8, ease: wiggle, overwrite: 'auto' });
          });
        });
        if (topBtn && topMint) {
          // Quarter turns: the swirl is symmetric, so the click spin can restart from 0° without a visible jump.
          listen(topBtn, 'mouseenter', function () { gsap.to(topMint, { rotation: '-=90', duration: 0.5, ease: 'back.out(2)' }); });
        }
        if (newsLabel) {
          var newsBtn = newsLabel.parentNode;
          var release = function () { gsap.to(newsLabel, { scale: 1, duration: 0.6, ease: 'elastic.out(1.1, 0.35)', overwrite: 'auto' }); };
          listen(newsBtn, 'pointerdown', function () { gsap.to(newsLabel, { scale: 0.88, duration: 0.12, ease: 'power2.out', overwrite: 'auto' }); });
          listen(newsBtn, 'pointerup', release);
          listen(newsBtn, 'pointerleave', release);
        }
      });
    }

    root._cvfDestroy = function () {
      cleanups.forEach(function (fn) { fn(); });
      if (ctx) ctx.revert();
      root.dataset.cvfReady = '';
    };
  }

  function boot(scope) {
    $$('[data-cv-footer]', scope).forEach(function (el) { init(el); });
  }

  boot(document);
  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    $$('[data-cv-footer]', e.target).forEach(function (el) {
      if (el._cvfDestroy) el._cvfDestroy();
    });
  });
})();
