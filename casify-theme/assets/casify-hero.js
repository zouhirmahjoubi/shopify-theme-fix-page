(function () {
  'use strict';

  var ROOT_SELECTOR = '[data-casify-story-hero]';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrowViewport = window.matchMedia && window.matchMedia('(max-width: 767px)');
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)');

  function all(selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  }

  function init(root) {
    if (!root || root.dataset.cshReady === 'true') return;
    root.dataset.cshReady = 'true';

    var modelButtons = all('[data-csh-model]', root);
    var colorButtons = all('[data-csh-color]', root);
    var variantNodes = all('[data-csh-variant]', root);
    var devices = all('[data-csh-device]', root);
    var stage = root.querySelector('[data-csh-stage]');
    var productSet = root.querySelector('[data-csh-product-set]');
    var ribbon = root.querySelector('[data-csh-ribbon]');
    var shopping = root.querySelector('[data-csh-shopping]');
    var cta = root.querySelector('[data-csh-cta]');
    var details = root.querySelector('[data-csh-details]');
    var selectedModel = root.querySelector('[data-csh-selected-model]');
    var selectedColor = root.querySelector('[data-csh-selected-color]');
    var selectedColorCopy = root.querySelector('[data-csh-selected-color-copy]');
    var motionControls = root.querySelector('[data-csh-motion-controls]');
    var pauseButton = root.querySelector('[data-csh-pause]');
    var pauseLabel = root.querySelector('[data-csh-pause-label]');
    var skipButton = root.querySelector('[data-csh-skip]');
    var replayButton = root.querySelector('[data-csh-replay]');
    var status = root.querySelector('[data-csh-status]');
    var gsap = window.gsap;
    var cleanup = [];
    var observer = null;
    var timeline = null;
    var mobileReveal = null;
    var introActive = false;
    var introFinished = false;
    var introPaused = false;
    var userInteracted = false;
    var inView = false;
    var autoTried = false;
    var autoExpired = false;
    var readyImages = false;
    var destroyed = false;
    var autoTimer = null;
    var initTime = performance.now();
    var state = {
      model: root.dataset.selectedModel || '',
      color: root.dataset.selectedColor || ''
    };
    var labels = {
      pause: root.dataset.labelPause || 'Pause',
      resume: root.dataset.labelResume || 'Resume',
      playing: root.dataset.statusPlaying || '',
      paused: root.dataset.statusPaused || '',
      skipped: root.dataset.statusSkipped || '',
      complete: root.dataset.statusComplete || ''
    };
    var modelLabels = {};
    var variants = variantNodes.map(function (node) {
      return {
        id: node.dataset.id,
        model: node.dataset.model || '',
        color: node.dataset.color || '',
        available: node.dataset.available === 'true',
        url: node.dataset.url || '',
        image: node.dataset.image || ''
      };
    });

    modelButtons.forEach(function (button) {
      var labelNode = button.querySelector('span');
      modelLabels[button.dataset.cshModel] = labelNode ? labelNode.textContent.trim() : button.dataset.cshModel;
    });

    function setStatus(message) {
      if (status) status.textContent = message || '';
    }

    function variantFor(model, color) {
      return variants.find(function (variant) {
        return variant.available && variant.model === model && variant.color === color;
      }) || null;
    }

    function firstVariantFor(model) {
      return variants.find(function (variant) {
        return variant.available && variant.model === model;
      }) || null;
    }

    function alternateVariantFor(model, color) {
      return variants.find(function (variant) {
        return variant.available && variant.model === model && variant.color !== color;
      }) || firstVariantFor(model);
    }

    function deviceFor(model) {
      return devices.find(function (device) {
        return device.dataset.model === model;
      }) || null;
    }

    function swapImage(device, variant) {
      if (!device || !variant) return;
      var token = String(Date.now()) + String(Math.random());
      device.dataset.cshLoadToken = token;
      var image = device.querySelector('[data-csh-image], .csh__product-image');
      var placeholder = device.querySelector('.csh__image-placeholder');
      if (!variant.image) {
        device.classList.remove('is-loading');
        device.classList.add('is-image-error');
        device.dataset.imageError = root.dataset.labelImageError || '';
        if (placeholder) placeholder.hidden = true;
        return;
      }
      if (!image) {
        image = document.createElement('img');
        image.className = 'csh__product-image';
        image.width = 1000;
        image.height = 1000;
        device.prepend(image);
      }
      if (placeholder) placeholder.hidden = true;
      image.alt = (modelLabels[variant.model] || variant.model) + ' · ' + variant.color;
      device.classList.remove('is-image-error');
      device.dataset.imageError = root.dataset.labelImageError || '';
      var current = image.currentSrc || image.src || '';
      if (current && new URL(current, location.href).pathname === new URL(variant.image, location.href).pathname && image.complete && image.naturalWidth) {
        device.classList.remove('is-loading');
        return;
      }
      device.classList.add('is-loading');
      var loader = new Image();
      loader.onload = function () {
        if (destroyed || device.dataset.cshLoadToken !== token) return;
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.src = variant.image;
        device.classList.remove('is-loading');
      };
      loader.onerror = function () {
        if (destroyed || device.dataset.cshLoadToken !== token) return;
        device.classList.remove('is-loading');
        device.classList.add('is-image-error');
        setStatus(root.dataset.labelImageError);
      };
      loader.src = variant.image;
    }

    function updateAvailability() {
      modelButtons.forEach(function (button) {
        var available = !!firstVariantFor(button.dataset.cshModel);
        button.disabled = !available;
        button.classList.toggle('is-selected', button.dataset.cshModel === state.model);
        button.setAttribute('aria-pressed', button.dataset.cshModel === state.model ? 'true' : 'false');
      });
      colorButtons.forEach(function (button) {
        var available = !!variantFor(state.model, button.dataset.cshColor);
        var selected = button.dataset.cshColor === state.color;
        button.disabled = !available;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
    }

    function updateDeviceOrder(reason) {
      var front = deviceFor(state.model);
      var back = devices.find(function (device) { return device !== front; }) || null;
      devices.forEach(function (device) {
        var active = device === front;
        device.classList.toggle('is-front', active);
        device.classList.toggle('is-back', !active);
      });
      var selectedVariant = variantFor(state.model, state.color);
      swapImage(front, selectedVariant);
      if (reason === 'model' || reason === 'initial') {
        swapImage(back, back ? alternateVariantFor(back.dataset.model, state.color) : null);
      }
    }

    function renderSelection(reason) {
      var selectedVariant = variantFor(state.model, state.color);
      if (!selectedVariant) {
        selectedVariant = firstVariantFor(state.model);
        if (!selectedVariant && reason === 'initial') {
          selectedVariant = variants.find(function (variant) { return variant.available; });
          if (selectedVariant) state.model = selectedVariant.model;
        }
        if (selectedVariant) state.color = selectedVariant.color;
      }
      root.dataset.selectedModel = state.model;
      root.dataset.selectedColor = state.color;
      updateAvailability();
      updateDeviceOrder(reason);
      if (selectedModel && state.model) selectedModel.textContent = modelLabels[state.model] || state.model;
      if (selectedColor) selectedColor.textContent = state.color;
      if (selectedColorCopy) selectedColorCopy.textContent = state.color;
      if (selectedVariant && cta) {
        cta.href = selectedVariant.url;
        var ctaText = cta.querySelector('span');
        if (ctaText && root.dataset.labelShop) ctaText.textContent = root.dataset.labelShop;
      }
      if (selectedVariant && details && selectedVariant.url) {
        details.href = selectedVariant.url.split('?')[0];
      }
      if (reason !== 'initial') setStatus(selectedVariant ? '' : root.dataset.statusUnavailable);
    }

    function settleScene() {
      if (!gsap) return;
      var images = devices.map(function (device) { return device.querySelector('.csh__product-image'); }).filter(Boolean);
      if (productSet) {
        gsap.killTweensOf(productSet);
        gsap.set(productSet, { clearProps: 'transform,opacity,visibility' });
      }
      gsap.set(images, { clearProps: 'transform,opacity,visibility,filter' });
      if (ribbon) gsap.set(ribbon, { clearProps: 'transform,opacity,visibility' });
    }

    function syncMotionControls(mode) {
      var playing = mode === 'playing';
      var paused = mode === 'paused';
      if (pauseButton) pauseButton.disabled = !(playing || paused);
      if (skipButton) skipButton.disabled = !(playing || paused);
      if (replayButton) replayButton.disabled = !gsap || !productSet || devices.length < 2 || !!(reduceMotion && reduceMotion.matches);
      if (motionControls) motionControls.classList.toggle('is-paused', paused);
      if (pauseLabel) pauseLabel.textContent = paused ? labels.resume : labels.pause;
      if (pauseButton) pauseButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
    }

    function finishIntro(message) {
      introActive = false;
      introPaused = false;
      introFinished = true;
      settleScene();
      syncMotionControls('idle');
      setStatus(message || labels.complete);
    }

    function buildTimeline() {
      if (!gsap || !productSet || devices.length < 2) return null;
      var front = deviceFor(state.model) || devices[0];
      var back = devices.find(function (device) { return device !== front; }) || devices[1];
      var frontImage = front.querySelector('.csh__product-image');
      var backImage = back.querySelector('.csh__product-image');
      if (!frontImage || !backImage || !frontImage.naturalWidth || !backImage.naturalWidth) return null;
      var next = gsap.timeline({
        paused: true,
        defaults: { overwrite: 'auto' },
        onComplete: function () { finishIntro(labels.complete); }
      });
      next.addLabel('reveal', 0)
        .fromTo(productSet, { y: 12 }, { y: 0, duration: 0.65, ease: 'power2.out' }, 'reveal')
        .addLabel('finish', 0.65)
        .to(frontImage, { rotationY: 14, rotationZ: -2, xPercent: 2, duration: 0.85, ease: 'power2.inOut' }, 'finish')
        .to(backImage, { xPercent: -4, yPercent: 2, duration: 0.85, ease: 'power2.inOut' }, 'finish')
        .addLabel('detail', 1.5)
        .to(frontImage, { scale: 1.12, xPercent: -1, duration: 0.4, ease: 'power2.inOut' }, 'detail')
        .to({}, { duration: 0.4 }, 1.9)
        .addLabel('pair', 2.3)
        .to(frontImage, { scale: 1, rotationY: 0, rotationZ: 0, xPercent: 0, duration: 0.9, ease: 'power2.inOut' }, 'pair')
        .to(backImage, { xPercent: 0, yPercent: 0, duration: 0.9, ease: 'power2.inOut' }, 'pair')
        .addLabel('colour', 3.2)
        .fromTo(ribbon, { xPercent: -118, opacity: 0.2 }, { xPercent: 4, opacity: 0.28, duration: 0.8, ease: 'sine.inOut' }, 'colour')
        .addLabel('settle', 4)
        .to(ribbon, { xPercent: 118, opacity: 0.08, duration: 0.8, ease: 'power2.out' }, 'settle')
        .to(productSet, { y: 0, duration: 0.8, ease: 'power2.out' }, 'settle');
      return next;
    }

    function playIntro(explicit) {
      if (destroyed || !gsap || !productSet || devices.length < 2 || (reduceMotion && reduceMotion.matches)) return;
      if (timeline) timeline.kill();
      timeline = null;
      if (mobileReveal) mobileReveal.kill();
      mobileReveal = null;
      introPaused = false;
      settleScene();
      if (narrowViewport && narrowViewport.matches) {
        if (!explicit) return;
        if (mobileReveal) mobileReveal.kill();
        mobileReveal = gsap.fromTo(productSet, { y: 12, autoAlpha: 0.92 }, {
          y: 0,
          autoAlpha: 1,
          duration: 1.05,
          ease: 'power2.out',
          clearProps: 'transform,opacity,visibility',
          onStart: function () { syncMotionControls('playing'); setStatus(labels.playing); },
          onComplete: function () { finishIntro(labels.complete); }
        });
        introActive = true;
        introFinished = false;
        return;
      }
      timeline = buildTimeline();
      if (!timeline) return;
      introActive = true;
      introFinished = false;
      introPaused = false;
      syncMotionControls('playing');
      setStatus(labels.playing);
      timeline.play(0);
    }

    function skipIntro(message) {
      if (timeline) timeline.kill();
      timeline = null;
      if (mobileReveal) mobileReveal.kill();
      mobileReveal = null;
      finishIntro(message || labels.skipped);
    }

    function interruptIntro() {
      userInteracted = true;
      if (introActive) skipIntro(labels.skipped);
    }

    function onModelClick(event) {
      interruptIntro();
      var button = event.currentTarget;
      if (button.disabled || button.dataset.cshModel === state.model) return;
      state.model = button.dataset.cshModel;
      if (!variantFor(state.model, state.color)) {
        var fallback = firstVariantFor(state.model);
        if (fallback) state.color = fallback.color;
      }
      renderSelection('model');
    }

    function onColorClick(event) {
      interruptIntro();
      var button = event.currentTarget;
      if (button.disabled || button.dataset.cshColor === state.color) return;
      state.color = button.dataset.cshColor;
      renderSelection('color');
    }

    function onPause() {
      if (!introActive) return;
      var activeTimeline = timeline || mobileReveal;
      if (!activeTimeline) return;
      introPaused = !introPaused;
      activeTimeline.paused(introPaused);
      syncMotionControls(introPaused ? 'paused' : 'playing');
      setStatus(introPaused ? labels.paused : labels.playing);
    }

    function onSkip() {
      if (introActive) skipIntro(labels.skipped);
    }

    function onReplay() {
      userInteracted = true;
      playIntro(true);
    }

    function onVisibility() {
      if (document.hidden && introActive) skipIntro(labels.skipped);
    }

    function onReducedChange() {
      if (reduceMotion && reduceMotion.matches) skipIntro(labels.skipped);
      syncMotionControls(introActive ? (introPaused ? 'paused' : 'playing') : 'idle');
    }

    function setupPointerDepth() {
      if (!gsap || !stage || !productSet || !finePointer || !finePointer.matches || (reduceMotion && reduceMotion.matches)) return;
      var yaw = gsap.quickTo(productSet, 'rotationY', { duration: 0.3, ease: 'power2.out' });
      var pitch = gsap.quickTo(productSet, 'rotationX', { duration: 0.3, ease: 'power2.out' });
      function move(event) {
        if (destroyed || !introFinished || introActive || (reduceMotion && reduceMotion.matches) || (narrowViewport && narrowViewport.matches)) return;
        var bounds = stage.getBoundingClientRect();
        var x = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2;
        var y = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2;
        yaw(Math.max(-4, Math.min(4, x * 4)));
        pitch(Math.max(-2, Math.min(2, -y * 2)));
      }
      function leave() {
        if (introActive || (reduceMotion && reduceMotion.matches)) return;
        yaw(0);
        pitch(0);
      }
      stage.addEventListener('pointermove', move, { passive: true });
      stage.addEventListener('pointerleave', leave, { passive: true });
      cleanup.push(function () {
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerleave', leave);
        yaw.tween.kill();
        pitch.tween.kill();
      });
    }

    function imagesReady() {
      var images = devices.map(function (device) { return device.querySelector('.csh__product-image'); }).filter(Boolean);
      return Promise.all(images.map(function (image) {
        if (image.complete && image.naturalWidth > 0) return Promise.resolve();
        if (image.decode) return image.decode().catch(function () {});
        return new Promise(function (resolve) {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }));
    }

    function maybeAutoplay() {
      if (destroyed || !root.isConnected || !readyImages || autoTried || autoExpired || userInteracted || !inView || document.hidden) return;
      if (root.dataset.introEnabled !== 'true' || !gsap || (reduceMotion && reduceMotion.matches) || (narrowViewport && narrowViewport.matches)) return;
      if (performance.now() - initTime > 2400) {
        autoExpired = true;
        return;
      }
      autoTried = true;
      playIntro(false);
    }

    modelButtons.forEach(function (button) {
      button.addEventListener('click', onModelClick);
      cleanup.push(function () { button.removeEventListener('click', onModelClick); });
    });
    colorButtons.forEach(function (button) {
      button.addEventListener('click', onColorClick);
      cleanup.push(function () { button.removeEventListener('click', onColorClick); });
    });
    if (pauseButton) {
      pauseButton.addEventListener('click', onPause);
      cleanup.push(function () { pauseButton.removeEventListener('click', onPause); });
    }
    if (skipButton) {
      skipButton.addEventListener('click', onSkip);
      cleanup.push(function () { skipButton.removeEventListener('click', onSkip); });
    }
    if (replayButton) {
      replayButton.addEventListener('click', onReplay);
      cleanup.push(function () { replayButton.removeEventListener('click', onReplay); });
    }

    if (shopping) {
      shopping.addEventListener('pointerdown', interruptIntro, { passive: true });
      shopping.addEventListener('focusin', interruptIntro);
      cleanup.push(function () {
        shopping.removeEventListener('pointerdown', interruptIntro);
        shopping.removeEventListener('focusin', interruptIntro);
      });
    }

    function onStagePointer(event) {
      if (!event.target.closest('[data-csh-motion-controls]')) interruptIntro();
    }
    if (stage) {
      stage.addEventListener('pointerdown', onStagePointer, { passive: true });
      cleanup.push(function () { stage.removeEventListener('pointerdown', onStagePointer); });
    }

    document.addEventListener('visibilitychange', onVisibility);
    cleanup.push(function () { document.removeEventListener('visibilitychange', onVisibility); });
    if (reduceMotion && reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', onReducedChange);
      cleanup.push(function () { reduceMotion.removeEventListener('change', onReducedChange); });
    }

    if (window.IntersectionObserver) {
      observer = new IntersectionObserver(function (entries) {
        inView = !!(entries[0] && entries[0].isIntersecting && entries[0].intersectionRatio >= 0.35);
        if (!inView && introActive) skipIntro(labels.skipped);
        if (inView) maybeAutoplay();
      }, { threshold: 0.35 });
      observer.observe(root);
    } else {
      inView = true;
    }

    renderSelection('initial');
    if (motionControls) motionControls.hidden = !gsap || !productSet || devices.length < 2;
    syncMotionControls('idle');
    setupPointerDepth();
    imagesReady().then(function () { readyImages = true; maybeAutoplay(); });
    autoTimer = window.setTimeout(function () {
      if (!autoTried) autoExpired = true;
    }, 2500);

    root._cshDestroy = function () {
      destroyed = true;
      window.clearTimeout(autoTimer);
      if (observer) observer.disconnect();
      if (timeline) timeline.kill();
      if (mobileReveal) mobileReveal.kill();
      settleScene();
      cleanup.forEach(function (remove) { remove(); });
      delete root._cshDestroy;
      delete root.dataset.cshReady;
    };
  }

  function mount(context) {
    all(ROOT_SELECTOR, context || document).forEach(init);
  }

  if (document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', function () { mount(document); }, { once: true });
    window.addEventListener('load', function () { mount(document); }, { once: true });
  } else {
    mount(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    if (event.target.matches && event.target.matches(ROOT_SELECTOR)) init(event.target);
    else mount(event.target);
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var root = event.target.matches && event.target.matches(ROOT_SELECTOR) ? event.target : event.target.querySelector(ROOT_SELECTOR);
    if (root && root._cshDestroy) root._cshDestroy();
  });
})();
