/* Casify: 3D model in the Shop Counter gallery (sections/cv-product-counter.liquid).
 *
 * The product's first 3D model (Shopify Model3d media) sits second in the photo
 * reel as a "3D" ticket. Choosing it lays an interactive <model-viewer> over the
 * stage photo; choosing another ticket, or another variant, puts the photo back.
 * The viewer waits in a <template>, and Shopify's model-viewer-ui and shopify-xr
 * features load on the first open, so visitors who never open it pay nothing.
 * "View in your space" stays hidden unless ShopifyXR finds AR on the device.
 *
 * Ticket clicks are heard through cv-product.js's "cvs:photo" event, so the reel
 * keeps one owner. Styles: assets/cv-pdp-model.css.
 */
(function () {
  'use strict';

  /* Sharper 3D on ordinary screens. Shopify's model-viewer (v1.12) sizes its drawing to the
     screen's devicePixelRatio, re-read on every frame, and drops to half of that whenever
     frames run slow. On a 1x laptop screen the print came out soft, and at half scale (the
     page's other 3D animations slow its frames) blurry with stepped edges. The viewer's own
     code, and only it, is told 2 on screens below 2x: it draws at double size for the
     browser to scale down, and its slow-frame fallback now stops at the screen's own 1x.
     Every other script still reads the real value. */
  (function sharperViewer() {
    var own = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    var desc = own && own.get ? own : Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio');
    if (!desc || !desc.get) return;
    var real = desc.get;
    try {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        enumerable: true,
        get: function () {
          var dpr = real.call(window);
          if (dpr >= 2) return dpr;
          var stack = new Error().stack || '';
          return stack.indexOf('/shopifycloud/model-viewer/') === -1 ? dpr : 2;
        },
        // devicePixelRatio is replaceable: a script that assigns it gets a plain value, as before.
        set: function (value) {
          Object.defineProperty(window, 'devicePixelRatio', { value: value, writable: true, configurable: true, enumerable: true });
        }
      });
    } catch (e) { /* the browser keeps its own value */ }
  })();

  /* Theme editor: a reloaded section is a fresh root, so it is set up again; the old
     root's listeners go with its element. */
  function init(root) {
  var wrap = root && root.querySelector('[data-cvc-model]');
  if (!wrap || root._cvcModel) return;
  root._cvcModel = true;
  var stage = wrap.closest('.cvc__stage');
  var tpl = wrap.querySelector('template');
  var json = root.querySelector('[data-cvc-model-json]');
  var thumbs = Array.prototype.slice.call(root.querySelectorAll('.cvs__thumb, [data-cv-thumb]'));
  var ui = null;
  var loaded = false;
  var variantId = null;

  function setupXR(errors) {
    if (errors) return;
    if (!window.ShopifyXR) {
      document.addEventListener('shopify_xr_initialized', function () { setupXR(); }, { once: true });
      return;
    }
    if (json) {
      window.ShopifyXR.addModels(JSON.parse(json.textContent));
      json = null;
    }
    window.ShopifyXR.setupXRElements();
  }

  function load() {
    if (loaded || !tpl) return;
    loaded = true;
    wrap.insertBefore(tpl.content.cloneNode(true), wrap.firstChild);
    var viewer = wrap.querySelector('model-viewer');
    /* The overlay stays see-through (stage photo showing) until the model has drawn. */
    if (viewer) viewer.addEventListener('load', function () { wrap.classList.add('is-ready'); }, { once: true });
    if (!window.Shopify || typeof window.Shopify.loadFeatures !== 'function') return;
    window.Shopify.loadFeatures([
      {
        name: 'model-viewer-ui',
        version: '1.0',
        onLoad: function (errors) {
          if (errors || !viewer || !window.Shopify.ModelViewerUI) return;
          ui = new window.Shopify.ModelViewerUI(viewer);
          if (wrap.hidden && ui.pause) ui.pause();
        }
      },
      { name: 'shopify-xr', version: '1.0', onLoad: setupXR }
    ]);
  }

  function show(on) {
    if (on) load();
    wrap.hidden = !on;
    if (stage) stage.classList.toggle('is-3d', on);
    if (ui) {
      if (on && ui.play) ui.play();
      if (!on && ui.pause) ui.pause();
    }
  }

  root.addEventListener('cvs:photo', function (e) {
    var thumb = thumbs[e.detail ? e.detail.index : -1];
    show(!!thumb && thumb.hasAttribute('data-cv-model'));
  });

  /* "Open on the 3D view": the section renders the viewer open. Its preview picture is
     the stage photo, so the page paints at once; the viewer loads after the page has
     (or after 3s), so it never competes with that first paint. */
  if (!wrap.hidden) {
    if (document.readyState === 'complete') load();
    else {
      window.addEventListener('load', load, { once: true });
      window.setTimeout(load, 3000);
    }
  }

  /* A new variant swaps the stage photo, so the photo should be what shows. A variant
     with no photo swaps nothing (a case whose photos have not arrived), so the model stays. */
  root.addEventListener('cvs:change', function (e) {
    var v = e.detail ? e.detail.variant : null;
    var id = v ? v.id : null;
    if (variantId !== null && id !== variantId && !wrap.hidden && v && v.featured_image) show(false);
    variantId = id;
  });
  }

  function roots(scope) {
    var list = [];
    if (scope && scope.matches && scope.matches('[data-cv-pdp="counter"]')) list.push(scope);
    if (scope && scope.querySelectorAll) list.push.apply(list, scope.querySelectorAll('[data-cv-pdp="counter"]'));
    return list;
  }
  document.addEventListener('shopify:section:load', function (e) { roots(e.target).forEach(init); });
  roots(document).forEach(init);
})();
