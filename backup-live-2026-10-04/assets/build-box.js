/* Build-your-box guided bundle builder. */
(function () {
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function fmt(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function initBox(box) {
    var required = parseInt(box.dataset.requiredSlots || '3', 10);
    var threshold = parseInt(box.dataset.discountThreshold || required, 10);
    var pct = parseInt(box.dataset.discountPct || '10', 10);

    var panels = $$('.build-box__panel', box);
    var steps = $$('.build-box__step', box);
    var picks = new Array(panels.length).fill(null);
    var active = 0;

    function setStep(i) {
      active = Math.max(0, Math.min(panels.length - 1, i));
      panels.forEach(function (p, idx) {
        p.classList.toggle('is-open', idx === active);
        p.classList.toggle('is-done', picks[idx] != null && idx !== active);
      });
      steps.forEach(function (s, idx) {
        s.classList.toggle('is-active', idx === active);
        s.classList.toggle('is-done', picks[idx] != null && idx < active);
        s.classList.toggle('is-complete', picks[idx] != null && idx === active);
      });
      box.setAttribute('data-active', active);
    }

    function updateSummary() {
      var count = picks.filter(Boolean).length;
      var subtotal = 0;
      picks.forEach(function (p, idx) {
        var row = $('.build-box__summary-row[data-row="' + idx + '"]', box);
        if (!row) return;
        var val = $('[data-row-val]', row);
        if (p) {
          val.textContent = p.title + ' · ' + money(p.price);
          row.classList.add('is-picked');
          subtotal += p.price;
        } else {
          val.textContent = '—';
          row.classList.remove('is-picked');
        }
      });

      var discount = 0;
      var unlocked = count >= threshold;
      if (unlocked) {
        discount = subtotal * (pct / 100);
      }
      var total = Math.max(0, subtotal - discount);

      $('[data-count]', box).textContent = count + ' / ' + required;
      $('[data-bar]', box).style.width = Math.min(100, (count / required) * 100) + '%';
      $('[data-subtotal]', box).textContent = money(subtotal);
      var discRow = $('[data-discount-row]', box);
      if (unlocked) {
        discRow.hidden = false;
        $('[data-discount-amount]', box).textContent = '−' + money(discount);
        $('[data-discount-tier]', box).textContent = '(' + pct + '% off ' + threshold + '+ items)';
      } else {
        discRow.hidden = true;
      }
      $('[data-total]', box).textContent = money(total);

      var addBtn = $('[data-add]', box);
      var label = $('[data-add-label]', addBtn);
      var stock = $('[data-stock-label]', box);
      if (count >= required) {
        addBtn.disabled = false;
        label.textContent = 'Add box to bag · ' + money(total);
        stock.innerHTML = '<b>In stock</b> · ships next business day';
      } else {
        addBtn.disabled = true;
        label.textContent = 'Pick ' + (required - count) + ' more to continue';
        stock.innerHTML = '<b>Pick ' + required + ' items to unlock the saving</b>';
      }
    }

    panels.forEach(function (panel, idx) {
      $$('[data-product]', panel).forEach(function (btn) {
        btn.addEventListener('click', function () {
          picks[idx] = {
            id: btn.dataset.variantId,
            title: btn.dataset.title,
            price: parseFloat(btn.dataset.price) / 100,
            image: btn.dataset.image || ''
          };
          $$('[data-product]', panel).forEach(function (b) { b.classList.toggle('is-picked', b === btn); });
          updateSummary();
          if (idx < panels.length - 1) setStep(idx + 1);
        });
      });

      var prev = $('[data-prev]', panel);
      var next = $('[data-next]', panel);
      if (prev) prev.addEventListener('click', function () { setStep(active - 1); });
      if (next) next.addEventListener('click', function () { setStep(active + 1); });
    });

    steps.forEach(function (s, idx) {
      s.addEventListener('click', function () { setStep(idx); });
    });

    var addBtn = $('[data-add]', box);
    addBtn.addEventListener('click', function () {
      if (addBtn.disabled) return;
      var items = picks.filter(Boolean).map(function (p) { return { id: p.id, quantity: 1 }; });
      if (!items.length) return;
      var orig = addBtn.innerHTML;
      addBtn.disabled = true;
      $('[data-add-label]', addBtn).textContent = 'Wrapping…';

      fetch('/cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: items })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok) {
            if (window.CASIFY_FNS && CASIFY_FNS.toastQuick) CASIFY_FNS.toastQuick('Could not add box', (res.data && res.data.description) || '', 'danger');
            return;
          }
          if (window.CASIFY_FNS && CASIFY_FNS.toastQuick) CASIFY_FNS.toastQuick('Box added to bag', items.length + ' items', 'success');
          document.dispatchEvent(new CustomEvent('casify:cart:updated'));
          if (typeof window.updateCartCount === 'function') window.updateCartCount();
          if (window.CASIFY_FNS && CASIFY_FNS.openCartDrawer) CASIFY_FNS.openCartDrawer();
        })
        .catch(function () {
          if (window.CASIFY_FNS && CASIFY_FNS.toastQuick) CASIFY_FNS.toastQuick('Could not add box', '', 'danger');
        })
        .finally(function () {
          addBtn.innerHTML = orig;
          updateSummary();
        });
    });

    setStep(0);
    updateSummary();
  }

  function ready() { $$('[data-build-box]').forEach(initBox); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();