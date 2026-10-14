/*
  Review widget (sections/review-widget.liquid).

  - "Load more" reveals the review cards a page at a time.
  - "Write a review" opens the form: a 1-5 star picker, title, review, name, email.
  - Sending: the review is posted as a comment on the reviews blog post, whose blog
    holds comments for the merchant to approve, and a copy is emailed to the
    merchant through the contact form. Both are real Shopify forms and pass
    Shopify's own spam check (see handOver) before fetch sends them, so the
    shopper stays on the page.
  - If Shopify still wants a human check, the review is posted again as a normal
    page post so the shopper can answer it; the reviews page then thanks them and
    links back to the product (sessionStorage "rw-return").
*/
(() => {
  const SEP = '§';
  const RETURN_KEY = 'rw-return';
  const BIND_WAIT_MS = 8000;
  const WAIT_HINT_MS = 6000;
  const CHECK_STALL_MS = 10000;
  const POST_TIMEOUT_MS = 45000;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const designMode = () => Boolean(window.Shopify && window.Shopify.designMode);

  const session = {
    get(key) { try { return window.sessionStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { window.sessionStorage.setItem(key, value); } catch (e) { /* private mode */ } },
    remove(key) { try { window.sessionStorage.removeItem(key); } catch (e) { /* private mode */ } },
  };

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

  /* ---------- Sending through Shopify's spam check ---------- */
  // Shopify binds its check (hCaptcha) to a protected form on the form's first
  // focusin or change event. Binding keeps the form's own submit() and replaces it
  // with one that runs the check, writes the token into the form, then calls the
  // kept submit(). handOver() gives the form a submit() of ours before that happens,
  // so the checked form comes back to us and we send it with fetch. (Storefront
  // pages refuse to load in frames, so the reply can't be read any other way.)
  // With hook.native set, the checked form is posted as a normal page instead.
  function handOver(form) {
    const hook = { onChecked: null, native: false };
    form.submit = function submitChecked() {
      if (hook.native) HTMLFormElement.prototype.submit.call(form);
      else if (hook.onChecked) hook.onChecked();
    };
    return hook;
  }

  function prime(form) {
    const field = form.querySelector('input[type="hidden"], textarea');
    if (field) field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Resolves once Shopify has bound the form, or straight away when the store has
  // no check. If binding never happens, sending goes ahead and Shopify answers with
  // its own check page.
  function whenBound(form) {
    prime(form);
    if (!(window.Shopify && window.Shopify.ce_forms)) return Promise.resolve();
    const started = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (form.hasAttribute('data-hcaptcha-bound') || Date.now() - started > BIND_WAIT_MS) resolve();
        else window.setTimeout(tick, 100);
      };
      tick();
    });
  }

  // hCaptcha's puzzle frame, while it is on screen.
  function puzzleOpen() {
    return Array.from(document.querySelectorAll('iframe[title="hCaptcha challenge"]')).some((frame) => {
      const box = frame.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && window.getComputedStyle(frame).visibility === 'visible';
    });
  }

  // Runs Shopify's check on a handed-over form, then posts it with fetch.
  // Returns { done, kick }: done settles with read()'s verdict on the reply;
  // kick() re-runs the check if the shopper closed its puzzle. A puzzle being
  // solved is never timed; a check that stalls with no puzzle on screen (hCaptcha
  // blocked, offline) is skipped, and Shopify then replies with its check page.
  function send(form, hook, read, options) {
    const opts = options || {};
    let posted = false;
    let settled = false;
    let kickedAt = 0;
    let puzzleSeenAt = 0;
    let watch = 0;
    let hint = 0;
    let resolveDone;
    const done = new Promise((resolve) => { resolveDone = resolve; });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      window.clearInterval(watch);
      window.clearTimeout(hint);
      hook.onChecked = null;
      resolveDone(result);
    };

    const post = () => {
      if (posted || settled) return;
      posted = true;
      window.clearTimeout(hint);
      const abort = new AbortController();
      const timer = window.setTimeout(() => abort.abort(), POST_TIMEOUT_MS);
      fetch(form.action, {
        method: 'POST',
        // Encoded the way a normal form post is, so Shopify's check finds its token.
        body: new URLSearchParams(new FormData(form)),
        credentials: 'same-origin',
        redirect: opts.followRedirect ? 'follow' : 'manual',
        headers: { Accept: 'text/html' },
        signal: abort.signal,
      })
        .then((response) => {
          if (response.type === 'opaqueredirect') return { state: 'sent' };
          if (/\/challenge(\/|$)/.test(new URL(response.url, window.location.href).pathname)) return { state: 'challenge', url: response.url };
          if (!response.ok) return { state: 'error' };
          return response.text().then((html) => read(html, response));
        })
        .catch(() => ({ state: 'error' }))
        .then((result) => {
          window.clearTimeout(timer);
          finish(result);
        });
    };
    hook.onChecked = post;

    const kick = () => {
      if (posted || settled) return;
      kickedAt = Date.now();
      form.submit();
    };

    watch = window.setInterval(() => {
      if (!kickedAt || posted || settled) return;
      if (puzzleOpen()) puzzleSeenAt = Date.now();
      else if (Date.now() - Math.max(kickedAt, puzzleSeenAt) > CHECK_STALL_MS) post();
    }, 250);
    if (opts.onWaiting) hint = window.setTimeout(() => { if (!posted && !settled) opts.onWaiting(); }, WAIT_HINT_MS);
    whenBound(form).then(kick);
    return { done, kick };
  }

  // The reviews page marks the comment form's outcome with [data-rw-result].
  function readReview(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const mark = doc.querySelector('[data-rw-result]');
    if (!mark) return { state: 'unknown' };
    if (mark.getAttribute('data-rw-result') === 'posted') return { state: 'posted' };
    return { state: 'error', message: (mark.textContent || '').replace(/\s+/g, ' ').trim() };
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
    const doneTitle = form.querySelector('[data-rw-done] [data-rw-done-title]');
    const rate = form.querySelector('[data-rw-rate]');
    const rateWord = form.querySelector('[data-rw-rate-word]');
    const errorText = (form.querySelector('[data-rw-error-text]') || {}).textContent || '';
    const waitText = (form.querySelector('[data-rw-wait-text]') || {}).textContent || '';
    const alertForm = panel.querySelector('[data-rw-alert]');
    const words = ((rate && rate.dataset.words) || '').split('|');
    const submitLabel = submit ? submit.textContent : '';
    let lastOpener = openers[0] || null;
    let sending = false;
    let pending = [];
    // Before anything focuses them, so Shopify's check hands the forms back to us.
    const reviewHook = handOver(form);
    const alertHook = alertForm ? handOver(alertForm) : null;

    const setOpen = (open, opener) => {
      panel.hidden = !open;
      openers.forEach((button) => button.setAttribute('aria-expanded', String(open)));
      if (open) {
        if (opener) lastOpener = opener;
        panel.classList.remove('is-opening');
        void panel.offsetWidth;
        panel.classList.add('is-opening');
        panel.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        const firstStar = form.querySelector('input[name="rw-rating"]:checked') || form.querySelector('input[name="rw-rating"]');
        if (firstStar && fields && !fields.hidden) firstStar.focus({ preventScroll: true });
        // Bind Shopify's spam check now, so it's ready by the time they press Send.
        prime(form);
        if (alertForm) prime(alertForm);
      } else if (lastOpener) {
        lastOpener.focus();
      }
    };

    openers.forEach((button) => {
      button.addEventListener('click', () => setOpen(panel.hidden, button));
    });
    // "Be the first to review" under the product title (data-rw-write) opens the form.
    const anchorId = root.dataset.rwAnchor;
    if (anchorId) {
      document.addEventListener('click', (event) => {
        const link = event.target.closest && event.target.closest('a[data-rw-write]');
        if (!link || link.getAttribute('href') !== '#' + anchorId) return;
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
        const checked = form.querySelector('input[name="rw-rating"]:checked');
        const value = checked ? Number(checked.value) : 0;
        rateWord.textContent = value ? `${value}/5 · ${words[value - 1] || ''}` : '';
      });
    }

    const setStatus = (message, isError) => {
      if (!status) return;
      status.textContent = message || '';
      status.classList.toggle('is-error', Boolean(isError));
    };
    // The button stays clickable while sending: if Shopify's check showed a puzzle
    // and the shopper closed it, pressing Send again re-opens the check.
    const setSending = (on) => {
      sending = on;
      form.setAttribute('aria-busy', String(on));
      if (submit) submit.textContent = on ? (submit.dataset.sendingLabel || submitLabel) : submitLabel;
    };
    const showDone = (author) => {
      const first = (author || '').trim().split(/\s+/)[0] || '';
      if (doneTitle) {
        doneTitle.textContent = (doneTitle.dataset.template || '')
          .replace('[name]', first)
          .replace(/,\s*([!.])/, '$1');
      }
      if (fields) fields.hidden = true;
      if (done) {
        done.hidden = false;
        done.focus();
      }
      // assets/review-motion.js answers with a burst of gold stars.
      form.dispatchEvent(new CustomEvent('rw:sent', { bubbles: true }));
      form.reset();
      if (rateWord) rateWord.textContent = '';
      session.remove(RETURN_KEY);
    };

    form.addEventListener('submit', (event) => {
      // Our handler runs first (capture) and drives the post, so Shopify's own
      // submit listeners don't also post the page away.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (sending) {
        pending.forEach((job) => job.kick());
        return;
      }

      const data = new FormData(form);
      const rating = Number(data.get('rw-rating') || 0);
      const title = String(data.get('rw-title') || '').replace(/§/g, '-').replace(/\s+/g, ' ').trim();
      const text = String(data.get('rw-text') || '').replace(/§/g, '-').trim();
      const author = String(data.get('comment[author]') || '').trim();
      const email = String(data.get('comment[email]') || '').trim();
      if (!rating) {
        setStatus(form.querySelector('legend') ? form.querySelector('legend').textContent : '', true);
        const star = form.querySelector('input[name="rw-rating"]');
        if (star) star.focus();
        return;
      }

      form.elements['comment[body]'].value = [`${rating}/5`, form.dataset.rwHandle || '', title, text].join(` ${SEP} `);
      setStatus('');
      setSending(true);
      session.set(RETURN_KEY, JSON.stringify({ url: window.location.href, name: author }));

      if (alertForm) {
        const put = (name, value) => {
          const field = alertForm.elements[name];
          if (field) field.value = value;
        };
        put('contact[name]', author);
        put('contact[email]', email);
        put('contact[Rating]', `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} ${rating}/5`);
        put('contact[Review title]', title || '-');
        put('contact[body]', text);
        // The merchant's email copy. Sent alongside the review, so any check is answered once.
        const copy = send(alertForm, alertHook, () => ({ state: 'sent' }));
        pending.push(copy);
        copy.done.then(() => { pending = pending.filter((job) => job !== copy); });
      }

      const review = send(form, reviewHook, readReview, { followRedirect: true, onWaiting: () => setStatus(waitText) });
      pending.push(review);
      review.done.then((result) => {
        pending = pending.filter((job) => job !== review);
        if (result.state === 'posted' || result.state === 'unknown') {
          setStatus('');
          setSending(false);
          showDone(author);
        } else if (result.state === 'challenge') {
          // Shopify wouldn't take it in the background. Run its check again for a
          // fresh token and post as a normal page: the reviews page thanks them, or
          // Shopify shows its own check first.
          reviewHook.native = true;
          form.submit();
        } else {
          setSending(false);
          setStatus(result.state === 'error' && result.message ? result.message : errorText, true);
        }
      });
    }, true);

    // Arrived on the reviews page after a normal page post: show the outcome.
    const result = form.querySelector('[data-rw-result]');
    if (result) {
      panel.hidden = false;
      openers.forEach((button) => button.setAttribute('aria-expanded', 'true'));
      const back = result.querySelector('[data-rw-back]');
      if (back && result.getAttribute('data-rw-result') === 'posted') {
        try {
          const saved = JSON.parse(session.get(RETURN_KEY) || 'null');
          const heading = result.querySelector('[data-rw-done-title]');
          const first = saved && saved.name ? String(saved.name).trim().split(/\s+/)[0] : '';
          if (heading && first && heading.dataset.template) {
            heading.textContent = heading.dataset.template.replace('[name]', first);
          }
          const url = saved && saved.url ? new URL(saved.url, window.location.href) : null;
          if (url && url.origin === window.location.origin && url.pathname !== window.location.pathname) {
            back.href = url.href;
            back.hidden = false;
          }
        } catch (e) { /* nothing saved */ }
        session.remove(RETURN_KEY);
      }
      result.scrollIntoView({ block: 'center', behavior: 'auto' });
      result.focus({ preventScroll: true });
      if (result.getAttribute('data-rw-result') === 'posted') {
        window.setTimeout(() => form.dispatchEvent(new CustomEvent('rw:sent', { bubbles: true })), 300);
      }
    }
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
