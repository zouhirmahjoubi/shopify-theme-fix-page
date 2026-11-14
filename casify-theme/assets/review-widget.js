/*
  Review widget (sections/review-widget.liquid).

  - "Load more" reveals the review cards a page at a time.
  - "Write a review" opens the form: a 1-5 star picker, title, review, name, email.
  - Sending: the review goes to Judge.me the way Judge.me's own review form sends it,
    a multipart POST to {API host}/api/v1/reviews with the shop domain and no API
    token. On a product page it is a review of that product (Shopify product id);
    anywhere else it is a store review (id 0, source "store-review-collection").
    Judge.me then emails the reviewer a link to confirm it, and the section shows
    the review once Judge.me has matched it to an order (verified buyer).
  - Judge.me answers a refused review with 422 and {"message": "..."}; that message
    is shown under the form.
  - Nothing is sent from the theme editor, or when the hidden "leave this empty"
    field is filled in (spam bots).
*/
(() => {
  const SEND_TIMEOUT_MS = 20000;
  const STORE_REVIEW_ID = '0';
  const STORE_REVIEW_SOURCE = 'store-review-collection';
  const JUDGE_ME_HOST = /^https:\/\/([a-z0-9-]+\.)*judge\.me\/?$/i;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const designMode = () => Boolean(window.Shopify && window.Shopify.designMode);

  /* ---------- Load more ---------- */
  function setupMore(root) {
    const button = root.querySelector('[data-rw-more]');
    if (!button) return;
    if (designMode()) { button.parentNode.remove(); return; }
    const per = parseInt(root.dataset.perPage, 10) || 6;
    const cards = Array.from(root.querySelectorAll('[data-rw-card]'));
    let shown = per;
    const render = () => {
      cards.forEach((card, i) => { card.hidden = i >= shown; });
      if (shown >= cards.length) button.parentNode.remove();
    };
    button.addEventListener('click', () => {
      const firstNew = cards[shown];
      shown += per;
      render();
      if (firstNew) firstNew.focus();
    });
    render();
  }

  /* ---------- Sending to Judge.me ---------- */
  // Judge.me's storefront script names its API host (window.jdgm.API_HOST); the form
  // carries the same default for pages where that script hasn't loaded.
  function apiHost(form) {
    const live = window.jdgm && typeof window.jdgm.API_HOST === 'string' ? window.jdgm.API_HOST : '';
    const host = JUDGE_ME_HOST.test(live) ? live : form.dataset.rwApi || 'https://api.judge.me';
    return host.replace(/\/$/, '');
  }

  // Resolves { ok: true } once Judge.me has the review, or { ok: false, message }.
  function sendReview(form, review) {
    const shop = form.dataset.rwShop || '';
    const productId = form.dataset.rwProduct || '';
    const body = new FormData();
    body.append('url', shop);
    body.append('shop_domain', shop);
    body.append('platform', 'shopify');
    body.append('rating', String(review.rating));
    body.append('name', review.name);
    body.append('email', review.email);
    if (review.title) body.append('title', review.title);
    body.append('body', review.text);
    if (productId) {
      body.append('id', productId);
    } else {
      body.append('id', STORE_REVIEW_ID);
      body.append('judgeme_review_source', STORE_REVIEW_SOURCE);
    }

    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), SEND_TIMEOUT_MS);
    return fetch(`${apiHost(form)}/api/v1/reviews`, {
      method: 'POST',
      body,
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: abort.signal,
    })
      .then((response) => {
        if (response.ok) return { ok: true };
        return response.json()
          .catch(() => ({}))
          .then((data) => {
            const message = data && typeof data.message === 'string' ? data.message.trim() : '';
            return { ok: false, message: message.length > 0 && message.length < 200 ? message : '' };
          });
      })
      .catch(() => ({ ok: false, message: '' }))
      .then((result) => {
        window.clearTimeout(timer);
        return result;
      });
  }

  /* ---------- Write a review ---------- */
  function setupCompose(root) {
    const panel = root.querySelector('[data-rw-compose]');
    const form = panel && panel.querySelector('[data-rw-form]');
    if (!form) return;

    const openers = Array.from(root.querySelectorAll('[data-rw-open]'));
    const fields = form.querySelector('[data-rw-fields]');
    const status = form.querySelector('[data-rw-status]');
    const submit = form.querySelector('[data-rw-submit]');
    const cancel = form.querySelector('[data-rw-cancel]');
    const done = form.querySelector('[data-rw-done]');
    const doneTitle = form.querySelector('[data-rw-done-title]');
    const previewNote = form.querySelector('[data-rw-preview-note]');
    const rate = form.querySelector('[data-rw-rate]');
    const rateWord = form.querySelector('[data-rw-rate-word]');
    const errorText = (form.querySelector('[data-rw-error-text]') || {}).textContent || '';
    const words = ((rate && rate.dataset.words) || '').split('|');
    const submitLabel = submit ? submit.textContent : '';
    let lastOpener = openers[0] || null;
    let sending = false;

    const setOpen = (open, opener) => {
      panel.hidden = !open;
      openers.forEach((button) => button.setAttribute('aria-expanded', String(open)));
      if (open) {
        if (opener) lastOpener = opener;
        panel.classList.remove('is-opening');
        void panel.offsetWidth;
        panel.classList.add('is-opening');
        panel.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        const firstStar = form.querySelector('input[name="rating"]:checked') || form.querySelector('input[name="rating"]');
        if (firstStar && fields && !fields.hidden) firstStar.focus({ preventScroll: true });
      } else if (lastOpener) {
        lastOpener.focus();
      }
    };

    openers.forEach((button) => {
      button.addEventListener('click', () => setOpen(panel.hidden, button));
    });

    // Links to this section open the form while it has no reviews to show
    // ("Be the first to review" under the product title), and always when they
    // carry data-rw-write. With reviews on show, links only scroll to them.
    const anchorId = root.dataset.rwAnchor;
    if (anchorId) {
      document.addEventListener('click', (event) => {
        const link = event.target.closest && event.target.closest('a[href^="#"]');
        if (!link || link.getAttribute('href') !== `#${anchorId}`) return;
        if (!link.hasAttribute('data-rw-write') && !root.querySelector('.rw-empty')) return;
        event.preventDefault();
        if (panel.hidden) setOpen(true, null);
        else panel.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
    if (cancel) cancel.addEventListener('click', () => setOpen(false));
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !sending) setOpen(false);
    });

    if (rate && rateWord) {
      rate.addEventListener('change', () => {
        const checked = form.querySelector('input[name="rating"]:checked');
        const value = checked ? Number(checked.value) : 0;
        rateWord.textContent = value ? `${value}/5 · ${words[value - 1] || ''}` : '';
      });
    }

    const setStatus = (message, isError) => {
      if (!status) return;
      status.textContent = message || '';
      status.classList.toggle('is-error', Boolean(isError));
    };
    const setSending = (on) => {
      sending = on;
      form.setAttribute('aria-busy', String(on));
      if (submit) {
        submit.disabled = on;
        submit.textContent = on ? (submit.dataset.sendingLabel || submitLabel) : submitLabel;
      }
    };
    const showDone = (name, preview) => {
      const first = (name || '').trim().split(/\s+/)[0] || '';
      if (doneTitle) {
        doneTitle.textContent = (doneTitle.dataset.template || '')
          .replace('[name]', first)
          .replace(/,\s*([!.])/, '$1');
      }
      if (previewNote) previewNote.hidden = !preview;
      if (fields) fields.hidden = true;
      if (done) {
        done.hidden = false;
        done.focus();
      }
      // assets/review-motion.js answers with a burst of gold stars.
      form.dispatchEvent(new CustomEvent('rw:sent', { bubbles: true }));
      form.reset();
      if (rateWord) rateWord.textContent = '';
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (sending) return;

      const data = new FormData(form);
      const review = {
        rating: Number(data.get('rating') || 0),
        title: String(data.get('title') || '').replace(/\s+/g, ' ').trim(),
        text: String(data.get('body') || '').trim(),
        name: String(data.get('name') || '').replace(/\s+/g, ' ').trim(),
        email: String(data.get('email') || '').trim(),
      };
      if (!review.rating) {
        const legend = form.querySelector('legend');
        setStatus(legend ? legend.textContent : '', true);
        const star = form.querySelector('input[name="rating"]');
        if (star) star.focus();
        return;
      }

      setStatus('');
      if (String(data.get('rw_website') || '') !== '') {
        showDone(review.name, false);
        return;
      }
      if (designMode()) {
        showDone(review.name, true);
        return;
      }

      setSending(true);
      sendReview(form, review).then((result) => {
        setSending(false);
        if (result.ok) {
          showDone(review.name, false);
        } else {
          setStatus(result.message || errorText, true);
        }
      });
    });
  }

  function init(root) {
    if (root.dataset.rwReady) return;
    root.dataset.rwReady = 'true';
    setupMore(root);
    setupCompose(root);
  }

  const boot = (scope) => scope.querySelectorAll('[data-rw]').forEach(init);
  boot(document);
  document.addEventListener('shopify:section:load', (event) => boot(event.target));
})();
