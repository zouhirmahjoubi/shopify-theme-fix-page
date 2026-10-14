/* Homepage shopping: explicit variant choices, accessible dialogs and finite motion. */
(function () {
  'use strict';

  if (window.CasifyHomeConversion) {
    window.CasifyHomeConversion.init(document);
    return;
  }

  var instances = new Map();
  var instanceNumber = 0;
  var selector = '[data-home-conversion]';

  function init(scope) {
    var roots = Array.from(scope.querySelectorAll(selector));
    if (scope.matches && scope.matches(selector)) roots.unshift(scope);
    roots.forEach(function (root) {
      if (!instances.has(root)) instances.set(root, mount(root));
    });
  }

  function mount(root) {
    var lifetime = new AbortController();
    var signal = lifetime.signal;
    var uid = 'cvhc-' + (++instanceNumber);
    var find = function (query) { return root.querySelector(query); };
    var all = function (query) { return Array.from(root.querySelectorAll(query)); };
    var catalog = [];
    try {
      var source = find('script[data-home-catalog]');
      var parsed = source ? JSON.parse(source.textContent) : [];
      if (Array.isArray(parsed)) catalog = parsed;
    } catch (error) {
      // Ordinary product links remain usable if catalog data is unavailable.
    }
    var products = new Map();
    catalog.forEach(function (product) {
      if (product && product.id && Array.isArray(product.options) && Array.isArray(product.variants)) {
        products.set(String(product.id), product);
      }
    });

    var modelSelect = find('[data-home-model]');
    var cards = all('[data-home-card]');
    var results = find('[data-home-results]');
    var empty = find('[data-home-empty]');
    var clearButtons = all('[data-home-clear]');
    var dialog = find('[data-home-dialog]');
    var form = dialog && dialog.querySelector('form[data-home-form]');
    var optionsHost = dialog && dialog.querySelector('[data-home-options]');
    var addButton = dialog && dialog.querySelector('[data-home-add]');
    var status = dialog && dialog.querySelector('[data-home-status]');
    var success = dialog && dialog.querySelector('[data-home-success]');
    var variantInput = form && form.querySelector('input[name="id"]');
    var quantityInput = form && form.querySelector('input[name="quantity"]');
    var canPick = Boolean(dialog && typeof dialog.showModal === 'function' && form && optionsHost && addButton && variantInput);
    var currentProduct = null;
    var currentVariant = null;
    var optionSelects = [];
    var opener = null;
    var session = 0;
    var pending = null;
    var added = false;
    var destroyed = false;
    var activeFeature = null;
    var gsap = window.gsap;
    var scrollTrigger = window.ScrollTrigger;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var motionContext = null;
    var motionEvents = null;
    var introPlayed = false;
    var revealed = new WeakSet();

    function modelIndex(product) {
      var byName = product.options.findIndex(function (option) {
        return /model|phone|device|compatib/i.test(option.name || '');
      });
      if (byName !== -1) return byName;
      return product.options.findIndex(function (option) {
        return (option.values || []).some(function (value) { return /iphone|samsung|galaxy/i.test(value); });
      });
    }

    function formatMoney(cents) {
      var amount = Number(cents);
      if (!Number.isFinite(amount)) return '';
      var format = root.dataset.moneyFormat || '';
      var token = format.match(/\{\{\s*(amount(?:_[a-z]+)*)\s*\}\}/);
      var formats = {
        amount: [2, ',', '.'],
        amount_no_decimals: [0, ',', '.'],
        amount_with_comma_separator: [2, '.', ','],
        amount_no_decimals_with_comma_separator: [0, '.', ','],
        amount_with_apostrophe_separator: [2, "'", '.'],
        amount_with_space_separator: [2, ' ', ','],
        amount_no_decimals_with_space_separator: [0, ' ', ','],
        amount_with_period_and_space_separator: [2, ' ', '.']
      };
      if (token && formats[token[1]]) {
        var rules = formats[token[1]];
        var parts = (amount / 100).toFixed(rules[0]).split('.');
        var number = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, rules[1]);
        if (parts[1]) number += rules[2] + parts[1];
        // Money formats can contain Shopify's currency spans; output only text.
        return new DOMParser().parseFromString(format.replace(token[0], number), 'text/html').body.textContent;
      }
      try {
        return new Intl.NumberFormat(document.documentElement.lang || 'en', {
          style: 'currency', currency: root.dataset.currency || 'USD'
        }).format(amount / 100);
      } catch (error) {
        return (amount / 100).toFixed(2);
      }
    }

    function productPrice(product) {
      return (product.price_varies ? 'From ' : '') + formatMoney(product.price);
    }

    function setImage(element, source, title) {
      if (!element) return;
      element.alt = title || '';
      if (!source) {
        element.hidden = true;
        return;
      }
      element.hidden = false;
      element.removeAttribute('srcset');
      element.removeAttribute('sizes');
      element.src = source;
    }

    function animate(callback) {
      if (gsap && motionContext && !reduced.matches) motionContext.add(callback);
    }

    function featureProduct(id, shouldAnimate) {
      var product = products.get(String(id));
      if (!product || activeFeature === String(id)) return;
      activeFeature = String(id);
      all('[data-home-feature]').forEach(function (button) {
        var selected = button.dataset.homeFeature === activeFeature;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      var heroImage = find('[data-home-hero-image]');
      var heroTitle = find('[data-home-hero-title]');
      var heroPrice = find('[data-home-hero-price]');
      setImage(heroImage, product.image, product.title);
      if (heroTitle) heroTitle.textContent = product.title;
      if (heroPrice) heroPrice.textContent = productPrice(product);
      all('[data-home-hero-link]').forEach(function (link) {
        link.href = product.url;
        link.dataset.homePick = String(product.id);
        link.setAttribute('aria-label', 'Choose options for ' + product.title);
      });
      if (shouldAnimate) animate(function () {
        if (heroImage) gsap.fromTo(heroImage, { opacity: 0.45, y: 6, scale: 0.98 }, {
          opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out', overwrite: true, clearProps: 'opacity,transform'
        });
        var copy = [heroTitle, heroPrice].filter(Boolean);
        if (copy.length) gsap.fromTo(copy, { opacity: 0.5, y: 4 }, {
          opacity: 1, y: 0, duration: 0.24, stagger: 0.04, ease: 'power3.out', overwrite: true, clearProps: 'opacity,transform'
        });
      });
    }

    function filterProducts() {
      var chosen = modelSelect ? modelSelect.value : '';
      var count = 0;
      cards.forEach(function (card) {
        var product = products.get(card.dataset.homeCard);
        var index = product ? modelIndex(product) : -1;
        var matches = !chosen || Boolean(product && index !== -1 && product.variants.some(function (variant) {
          return variant.available && variant.options[index] === chosen;
        }));
        card.hidden = !matches;
        if (matches) count += 1;
      });
      if (results) results.textContent = count + (count === 1 ? ' design' : ' designs') + (chosen ? ' for ' + chosen : ' to choose from');
      if (empty) empty.hidden = count !== 0;
      clearButtons.forEach(function (button) { button.hidden = !chosen; });
      if (gsap && motionContext) {
        gsap.killTweensOf(cards);
        gsap.set(cards, { clearProps: 'opacity,transform' });
        if (scrollTrigger) scrollTrigger.refresh();
      }
    }

    if (modelSelect && products.size) {
      var models = new Set();
      products.forEach(function (product) {
        var index = modelIndex(product);
        if (index === -1) return;
        product.variants.forEach(function (variant) {
          if (variant.available && variant.options[index]) models.add(variant.options[index]);
        });
      });
      modelSelect.replaceChildren(new Option('All phones', ''));
      Array.from(models).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); }).forEach(function (model) {
        modelSelect.add(new Option(model, model));
      });
      modelSelect.disabled = models.size === 0;
      var modelFilter = find('[data-home-filter]');
      if (modelFilter) modelFilter.hidden = models.size === 0;
      modelSelect.addEventListener('change', filterProducts, { signal: signal });
      filterProducts();
    }

    function announce(message) {
      if (status) status.textContent = message;
    }

    function setBusy(busy) {
      form.setAttribute('aria-busy', String(busy));
      optionSelects.forEach(function (select) { select.disabled = busy; });
      if (quantityInput) quantityInput.disabled = busy;
      addButton.disabled = busy || !currentVariant || !currentVariant.available || added;
      addButton.textContent = busy ? 'Adding to bag…' : added ? 'Added to bag' : currentVariant && !currentVariant.available ? 'Sold out' : 'Add to bag';
    }

    function resolveVariant() {
      if (!currentProduct) return;
      var selected = optionSelects.map(function (select) { return select.value; });
      var complete = selected.every(Boolean);
      currentVariant = complete ? currentProduct.variants.find(function (variant) {
        return variant.options.length === selected.length && variant.options.every(function (value, index) { return value === selected[index]; });
      }) || null : null;
      variantInput.value = currentVariant && currentVariant.available ? String(currentVariant.id) : '';
      var price = dialog.querySelector('[data-home-dialog-price]');
      if (price) price.textContent = currentVariant ? formatMoney(currentVariant.price) : productPrice(currentProduct);
      setImage(dialog.querySelector('[data-home-dialog-image]'), currentVariant && currentVariant.featured_image ? currentVariant.featured_image.src : currentProduct.image, currentProduct.title);
      if (pending) {
        announce(pending.session === session ? 'Adding your case to the bag…' : 'Your previous item is still being added. Please wait.');
      } else if (!complete) {
        var missing = optionSelects.filter(function (select) { return !select.value; }).map(function (select) { return select.dataset.optionName.toLowerCase(); });
        announce('Choose ' + missing.join(' and ') + ' to check availability.');
      } else if (!currentVariant) {
        announce('This combination is unavailable. Please choose another option.');
      } else if (!currentVariant.available) {
        announce('This combination is sold out. Please choose another option.');
      } else {
        announce('Available. Your selected case is ready to add.');
      }
      setBusy(Boolean(pending));
    }

    function openPicker(product, trigger) {
      if (!canPick) return false;
      session += 1;
      currentProduct = product;
      currentVariant = null;
      added = false;
      opener = trigger;
      if (success) success.hidden = true;
      if (quantityInput) quantityInput.value = '1';
      var title = dialog.querySelector('[data-home-dialog-title]');
      var more = dialog.querySelector('[data-home-more]');
      if (title) title.textContent = product.title;
      if (more) more.href = product.url;
      optionsHost.replaceChildren();
      var phoneOption = modelIndex(product);
      optionSelects = product.options.map(function (option, index) {
        var group = document.createElement('div');
        group.className = 'cvhc__option';
        var label = document.createElement('label');
        label.className = 'cvhc__option-label';
        label.htmlFor = uid + '-option-' + index;
        label.textContent = option.name;
        var select = document.createElement('select');
        select.className = 'cvhc__option-select';
        select.id = label.htmlFor;
        select.name = 'options[' + option.name + ']';
        select.dataset.optionName = option.name;
        select.required = true;
        select.add(new Option('Select ' + option.name.toLowerCase(), ''));
        var values = Array.from(new Set(option.values || []));
        values.forEach(function (value) { select.add(new Option(value, value)); });
        if (index === phoneOption && modelSelect && values.includes(modelSelect.value)) select.value = modelSelect.value;
        else if (index !== phoneOption && values.length === 1) select.value = values[0];
        group.append(label, select);
        optionsHost.append(group);
        return select;
      });
      resolveVariant();
      try {
        if (!dialog.open) dialog.showModal();
      } catch (error) {
        return false;
      }
      var focusTarget = optionSelects.find(function (select) { return !select.value && !select.disabled; }) || dialog.querySelector('[data-home-close]');
      if (focusTarget) focusTarget.focus({ preventScroll: true });
      animate(function () {
        gsap.fromTo(dialog, { opacity: 0.5, y: 12, scale: 0.99 }, {
          opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out', overwrite: true, clearProps: 'opacity,transform'
        });
      });
      return true;
    }

    function closePicker() {
      if (dialog && dialog.open) dialog.close();
    }

    function notifyCart(data, request) {
      if (window.Casify && typeof window.Casify.updateCartCount === 'function') {
        try {
          var updated = window.Casify.updateCartCount();
          if (updated && typeof updated.catch === 'function') updated.catch(function () {});
        } catch (error) { /* Adding succeeded even if the header cannot refresh. */ }
      }
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { source: 'home-conversion', productId: request.productId, variantId: request.variantId, quantity: request.quantity, data: data }
      }));
    }

    if (canPick) {
      if (success) {
        var cartLink = success.matches('a') ? success : success.querySelector('a');
        if (cartLink) cartLink.href = root.dataset.cartUrl || '/cart';
      }
      dialog.addEventListener('cancel', function (event) { event.preventDefault(); closePicker(); }, { signal: signal });
      dialog.addEventListener('close', function () {
        if (dialog.open) return;
        session += 1;
        if (!destroyed && opener && opener.isConnected) opener.focus({ preventScroll: true });
      }, { signal: signal });
      form.addEventListener('change', function () {
        if (pending) return;
        added = false;
        if (success) success.hidden = true;
        resolveVariant();
      }, { signal: signal });
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (pending || added) return;
        resolveVariant();
        if (!currentVariant || !currentVariant.available || !form.reportValidity()) return;
        var quantity = quantityInput ? Number(quantityInput.value) : 1;
        if (!Number.isInteger(quantity) || quantity < 1) {
          announce('Choose a quantity of at least one.');
          return;
        }
        var request = {
          session: session, productId: currentProduct.id, variantId: currentVariant.id,
          quantity: quantity, controller: new AbortController()
        };
        pending = request;
        setBusy(true);
        announce('Adding your case to the bag…');
        var outcome = '';
        try {
          var response = await fetch(root.dataset.cartAddUrl || '/cart/add.js', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ items: [{ id: request.variantId, quantity: quantity }] }),
            signal: request.controller.signal
          });
          var data = await response.json().catch(function () { return null; });
          if (!response.ok) {
            var description = data && (data.description || data.message);
            outcome = typeof description === 'string' ? description : 'This item could not be added. Please try again.';
          } else {
            notifyCart(data, request);
            if (!destroyed && request.session === session && dialog.open) {
              added = true;
              if (success) success.hidden = false;
              outcome = 'Added to your bag. View your bag to continue to checkout.';
              animate(function () {
                if (success) gsap.fromTo(success, { opacity: 0.4, y: 5 }, {
                  opacity: 1, y: 0, duration: 0.24, ease: 'power3.out', clearProps: 'opacity,transform'
                });
              });
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') outcome = 'We could not confirm the add. Check your bag before trying again.';
        } finally {
          if (pending === request) pending = null;
          if (!destroyed && dialog.open) {
            if (request.session === session) {
              setBusy(false);
              if (outcome) announce(outcome);
            } else resolveVariant();
          }
        }
      }, { signal: signal });
    }

    root.addEventListener('click', function (event) {
      var target = event.target.closest ? event.target.closest('[data-home-feature], [data-home-pick], [data-home-clear], [data-home-close]') : null;
      if (!target || !root.contains(target)) return;
      if (target.hasAttribute('data-home-close')) {
        event.preventDefault();
        closePicker();
      } else if (target.hasAttribute('data-home-clear')) {
        event.preventDefault();
        if (modelSelect) modelSelect.value = '';
        filterProducts();
        if (modelSelect) modelSelect.focus({ preventScroll: true });
      } else if (target.hasAttribute('data-home-feature')) {
        event.preventDefault();
        featureProduct(target.dataset.homeFeature, true);
      } else if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented) {
        var product = products.get(target.dataset.homePick);
        if (product && openPicker(product, target)) event.preventDefault();
      }
    }, { signal: signal });

    function setupMotion() {
      if (motionEvents) motionEvents.abort();
      if (motionContext) motionContext.revert();
      motionContext = null;
      if (!gsap || reduced.matches) { introPlayed = true; return; }
      motionEvents = new AbortController();
      if (scrollTrigger) gsap.registerPlugin(scrollTrigger);
      motionContext = gsap.context(function () {
        if (!introPlayed) {
          introPlayed = true;
          var intro = all('[data-home-intro]');
          var media = find('[data-home-hero-media]') || find('[data-home-hero-image]');
          var timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
          if (intro.length) timeline.fromTo(intro, { y: 14, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.38, stagger: { amount: 0.16 }, clearProps: 'opacity,transform'
          }, 0);
          if (media) timeline.fromTo(media, { y: 18, opacity: 0.3, scale: 0.98 }, {
            y: 0, opacity: 1, scale: 1, duration: 0.5, clearProps: 'opacity,transform'
          }, 0.16);
        }
        if (scrollTrigger) {
          all('[data-home-reveal]').forEach(function (element) {
            if (revealed.has(element) || element.getBoundingClientRect().bottom < 0) return;
            gsap.fromTo(element, { y: 16, opacity: 0 }, {
              y: 0, opacity: 1, duration: 0.42, ease: 'power3.out', clearProps: 'opacity,transform',
              onStart: function () { revealed.add(element); },
              scrollTrigger: { trigger: element, start: 'top 92%', once: true }
            });
          });
          var unseenCards = cards.filter(function (card) { return !revealed.has(card); });
          if (unseenCards.length) scrollTrigger.batch(unseenCards, {
            start: 'top 94%', once: true, interval: 0.08, batchMax: 3,
            onEnter: function (batch) {
              var visible = batch.filter(function (card) { return !card.hidden; });
              visible.forEach(function (card) { revealed.add(card); });
              if (visible.length) animate(function () {
                gsap.fromTo(visible, { y: 10, opacity: 0.4 }, {
                  y: 0, opacity: 1, duration: 0.28, stagger: 0.045, ease: 'power3.out', clearProps: 'opacity,transform'
                });
              });
            }
          });
        }
        var decor = all('[data-home-decor]');
        var hero = find('[data-home-hero]') || root;
        if (finePointer.matches && decor.length) {
          var moves = decor.map(function (element) {
            return {
              x: gsap.quickTo(element, 'x', { duration: 0.38, ease: 'power3.out' }),
              y: gsap.quickTo(element, 'y', { duration: 0.38, ease: 'power3.out' })
            };
          });
          hero.addEventListener('pointermove', function (event) {
            if (event.pointerType === 'touch') return;
            var rect = hero.getBoundingClientRect();
            var x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
            var y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
            moves.forEach(function (move, index) {
              var depth = (index + 1) / moves.length;
              move.x(x * 6 * depth);
              move.y(y * 4 * depth);
            });
          }, { signal: motionEvents.signal, passive: true });
          hero.addEventListener('pointerleave', function () {
            moves.forEach(function (move) { move.x(0); move.y(0); });
          }, { signal: motionEvents.signal });
        }
      }, root);
    }

    reduced.addEventListener('change', setupMotion, { signal: signal });
    finePointer.addEventListener('change', setupMotion, { signal: signal });
    var initialFeature = find('[data-home-feature].is-active') || find('[data-home-feature]');
    if (initialFeature) featureProduct(initialFeature.dataset.homeFeature, false);
    setupMotion();
    root.dataset.homeReady = 'true';

    return function destroy() {
      destroyed = true;
      session += 1;
      lifetime.abort();
      if (pending) pending.controller.abort();
      if (motionEvents) motionEvents.abort();
      if (motionContext) motionContext.revert();
      if (dialog && dialog.open) dialog.close();
      delete root.dataset.homeReady;
    };
  }

  window.CasifyHomeConversion = { init: init };
  var started = false;
  function start() {
    if (started) return;
    started = true;
    init(document);
  }
  // Deferred section scripts run while readyState is already interactive. Wait
  // for every global defer (including GSAP) before mounting the initial page.
  if (document.readyState === 'complete') start();
  else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
    window.addEventListener('load', start, { once: true });
  }
  document.addEventListener('shopify:section:load', function (event) { init(event.target); });
  document.addEventListener('shopify:section:unload', function (event) {
    instances.forEach(function (destroy, root) {
      if (root === event.target || event.target.contains(root)) {
        destroy();
        instances.delete(root);
      }
    });
  });
})();
