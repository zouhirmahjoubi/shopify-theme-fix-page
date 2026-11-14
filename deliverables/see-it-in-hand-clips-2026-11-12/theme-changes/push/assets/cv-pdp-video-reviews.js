/* Casify: product page video reviews: sections/cv-pdp-video-reviews.liquid.
 *
 *   - rail: a clip plays muted while most of it is on screen and pauses when
 *     it leaves; one clip has sound at a time; "Pause clips" stops them all
 *     and keeps them stopped. Reduced motion or Save-Data: nothing autoplays.
 *   - player: a native <dialog> (focus stays inside, Esc closes). It plays the
 *     larger file with sound, moves on to the next review when a clip ends,
 *     and takes the arrows, swipes and the keyboard.
 *   - shopping panel: the same contract as the colour carousel. Picks go to
 *     the buy box ([data-cv-pdp]) as "cvs:choose", the panel repaints from its
 *     "cvs:change", and "Add to bag" submits the buy box's own form, so the
 *     pack and any mixed cases go in exactly as from the top. The phone must
 *     be chosen first. Without a buy box it adds the one case directly.
 *   - motion (GSAP, skipped under reduced motion): the heading rises word by
 *     word, the score ticket stamps down and counts up, the clips are dealt in.
 *
 * Loaded by layout/theme.liquid ahead of cv-product.js, so the buy box's first
 * "cvs:change" is heard.
 */
(function () {
  'use strict';

  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  function init(section) {
    if (!section || section.__cvvr) return;
    section.__cvvr = true;

    const $ = (sel, ctx) => (ctx || section).querySelector(sel);
    const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || section).querySelectorAll(sel));
    const on = (el, type, fn, opts) => { if (el) el.addEventListener(type, fn, opts); };

    let cfg;
    try { cfg = JSON.parse($('[data-cvvr-data]').textContent); } catch (e) { return; }
    const t = cfg.t || {};
    const variants = cfg.variants || [];
    const mi = cfg.modelIndex;
    const si = cfg.styleIndex;
    const fill = (str, map) => String(str || '').replace(/\[(\w+)\]/g, (m, k) => (k in map ? map[k] : m));

    const moneyFormat = section.getAttribute('data-money-format') || window.themeMoneyFormat || '${{amount}}';
    function formatMoney(cents) {
      const value = Number(cents);
      if (isNaN(value)) return '';
      const group = (num, decimals, thousands, decimal) => {
        const parts = (num / 100).toFixed(decimals).split('.');
        parts[0] = parts[0].replace(/(\d)(?=(\d{3})+$)/g, '$1' + thousands);
        return parts.join(decimal);
      };
      return moneyFormat.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
        switch (key) {
          case 'amount_no_decimals': return group(value, 0, ',', '.');
          case 'amount_with_comma_separator': return group(value, 2, '.', ',');
          case 'amount_no_decimals_with_comma_separator': return group(value, 0, '.', ',');
          default: return group(value, 2, ',', '.');
        }
      });
    }

    const cards = $$('[data-cvvr-card]');
    if (!cards.length) return;
    const reviews = cards.map((card) => {
      try { return JSON.parse($('[data-cvvr-review]', card).textContent); } catch (e) { return {}; }
    });
    const rail = $('[data-cvvr-rail]');
    const videoOf = (card) => $('[data-cvvr-video]', card);
    // Each clip's shape (width / height): from Shopify for uploaded videos,
    // otherwise learnt from the video itself. The player sizes its stage by it.
    const ratios = reviews.map((r) => Number(r.ar) || 0);

    /* =================================================================== rail */
    let userPaused = reduced || saveData;
    let lbOpen = false;
    let loud = null;
    const inView = new Set();

    function playCard(card) {
      const v = videoOf(card);
      if (!v) return;
      const p = v.play();
      if (p && p.catch) p.catch(() => {}); // autoplay refused: the poster stays
    }
    function pauseCard(card) {
      const v = videoOf(card);
      if (v && !v.paused) v.pause();
    }
    function setLoud(card) {
      loud = card;
      cards.forEach((c) => {
        const v = videoOf(c);
        const b = $('[data-cvvr-sound]', c);
        if (v) v.muted = c !== card;
        if (b) b.setAttribute('aria-pressed', c === card ? 'true' : 'false');
      });
    }

    cards.forEach((card, k) => {
      const v = videoOf(card);
      if (!v) return;
      const bar = $('[data-cvvr-progress]', card);
      let last = 0;
      on(v, 'loadedmetadata', () => { if (!ratios[k] && v.videoHeight) ratios[k] = v.videoWidth / v.videoHeight; });
      on(v, 'playing', () => card.classList.add('is-live'));
      on(v, 'pause', () => card.classList.remove('is-live'));
      on(v, 'timeupdate', () => {
        if (!bar || !v.duration) return;
        const r = Math.min(1, v.currentTime / v.duration);
        bar.style.transition = r < last ? 'none' : 'transform 260ms linear';
        bar.style.transform = 'scaleX(' + r + ')';
        last = r;
      });
      on($('[data-cvvr-sound]', card), 'click', () => {
        if (loud === card) { setLoud(null); return; }
        setLoud(card);
        playCard(card); // asking for sound is asking for the clip, even when clips are paused
      });
    });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const card = e.target;
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            inView.add(card);
            if (!userPaused && !lbOpen) playCard(card);
          } else {
            inView.delete(card);
            pauseCard(card);
            if (loud === card) setLoud(null);
          }
        });
      }, { threshold: [0, 0.6] });
      cards.forEach((c) => { if (videoOf(c)) io.observe(c); });
    }

    on(document, 'visibilitychange', () => {
      if (document.hidden) { cards.forEach(pauseCard); return; }
      if (!userPaused && !lbOpen) inView.forEach(playCard);
    });

    const pauseBtn = $('[data-cvvr-pause]');
    function setUserPaused(p) {
      userPaused = p;
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
        const label = $('[data-cvvr-pause-label]', pauseBtn);
        if (label) label.textContent = p ? (t.play || 'Play clips') : (t.pause || 'Pause clips');
        const iPause = $('[data-cvvr-pause-icon="pause"]', pauseBtn);
        const iPlay = $('[data-cvvr-pause-icon="play"]', pauseBtn);
        if (iPause) iPause.hidden = p;
        if (iPlay) iPlay.hidden = !p;
      }
      if (p) cards.forEach(pauseCard);
      else if (!lbOpen) inView.forEach(playCard);
    }
    if (!cards.some(videoOf)) { if (pauseBtn) pauseBtn.hidden = true; }
    else setUserPaused(userPaused);
    on(pauseBtn, 'click', () => setUserPaused(!userPaused));

    // Arrows page the rail by however many clips fit.
    const arrows = $$('[data-cvvr-step]');
    function gap() { return parseFloat(getComputedStyle(rail).columnGap) || 16; }
    function syncArrows() {
      const max = rail.scrollWidth - rail.clientWidth;
      const fits = max <= 2;
      arrows.forEach((a) => {
        a.hidden = fits;
        const dir = Number(a.getAttribute('data-cvvr-step'));
        a.disabled = dir < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= max - 2;
      });
    }
    arrows.forEach((a) => on(a, 'click', () => {
      const w = cards[0].getBoundingClientRect().width + gap();
      const per = Math.max(1, Math.floor((rail.clientWidth + gap()) / w));
      rail.scrollBy({ left: Number(a.getAttribute('data-cvvr-step')) * w * per, behavior: reduced ? 'auto' : 'smooth' });
    }));
    let scrollRaf = 0;
    on(rail, 'scroll', () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; syncArrows(); });
    }, { passive: true });
    on(window, 'resize', syncArrows);
    syncArrows();

    /* ================================================================= player */
    const lb = $('[data-cvvr-lb]');
    const lbInner = $('.cvvr-lb__inner', lb);
    const media = $('[data-cvvr-lb-media]', lb);
    const segs = $('[data-cvvr-segs]', lb);
    const scroller = $('[data-cvvr-lb-scroll]', lb);
    const playBtn = $('[data-cvvr-lb-play]', lb);
    const soundBtn = $('[data-cvvr-lb-sound]', lb);
    const stepBtns = $$('[data-cvvr-lb-step]', lb);
    const out = {
      rateRow: $('[data-cvvr-lb-rate-row]', lb),
      stars: $('[data-cvvr-lb-stars] .cv-stars', lb),
      rate: $('[data-cvvr-lb-rate]', lb),
      title: $('[data-cvvr-lb-title]', lb),
      tag: $('[data-cvvr-lb-tag]', lb),
      body: $('[data-cvvr-lb-body]', lb),
      more: $('[data-cvvr-more]', lb),
      by: $('[data-cvvr-lb-by]', lb),
      name: $('[data-cvvr-lb-name]', lb),
      verified: $('[data-cvvr-lb-verified]', lb),
      date: $('[data-cvvr-lb-date]', lb),
      bought: $('[data-cvvr-lb-bought]', lb),
      boughtLabel: $('[data-cvvr-lb-bought-label]', lb),
      boughtText: $('[data-cvvr-lb-bought-text]', lb)
    };
    const boughtLabelText = out.boughtLabel ? out.boughtLabel.textContent : '';
    let current = -1;
    let lbVideo = null;
    let lbMuted = false;
    let opener = null;
    let raf = 0;
    let advance = true; // off once the shopper works the panel, so the review and the case stay put

    const segFills = reviews.map(() => {
      const s = document.createElement('span');
      const i = document.createElement('i');
      s.appendChild(i);
      segs.appendChild(s);
      return i;
    });
    if (reviews.length < 2) { segs.hidden = true; stepBtns.forEach((b) => { b.hidden = true; }); }

    function tick() {
      raf = 0;
      if (!lbVideo) return;
      const f = segFills[current];
      if (f && lbVideo.duration) f.style.transform = 'scaleX(' + Math.min(1, lbVideo.currentTime / lbVideo.duration) + ')';
      if (!lbVideo.paused) raf = requestAnimationFrame(tick);
    }
    function syncPlay() {
      const playing = !!lbVideo && !lbVideo.paused;
      playBtn.setAttribute('aria-pressed', playing ? 'false' : 'true');
      $('[data-cvvr-lb-play-label]', playBtn).textContent = playing ? (t.lbPause || 'Pause') : (t.lbPlay || 'Play');
      $('[data-cvvr-lb-play-icon="pause"]', playBtn).hidden = !playing;
      $('[data-cvvr-lb-play-icon="play"]', playBtn).hidden = playing;
      if (playing && !raf) raf = requestAnimationFrame(tick);
    }
    function syncSound() {
      soundBtn.setAttribute('aria-pressed', lbMuted ? 'false' : 'true');
    }
    function stopVideo() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (lbVideo) {
        lbVideo.pause();
        lbVideo.removeAttribute('src');
        lbVideo.load();
        lbVideo = null;
      }
    }
    function togglePlay() {
      if (!lbVideo) return;
      if (lbVideo.paused) {
        if (lbVideo.ended) lbVideo.currentTime = 0;
        const p = lbVideo.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        lbVideo.pause();
      }
    }

    // Upright clips get a 9:16 stage; landscape ones a wide stage (desktop) or
    // a shorter one that leaves the shopping panel more room (phones).
    function setShape(ar) {
      lb.classList.toggle('is-wide', ar > 1.05);
      lb.style.setProperty('--cvvr-ar', String(1 / ar));
    }
    function learnShape(i, w, h) {
      if (!w || !h) return;
      ratios[i] = w / h;
      if (current === i) setShape(ratios[i]);
    }

    function show(i) {
      if (i < 0 || i >= reviews.length) return;
      current = i;
      const r = reviews[i];
      // A shop clip (the shop's own, not a customer's): no stars, no reviewer line.
      const shop = r.kind === 'shop';
      stopVideo();
      media.textContent = '';
      media.style.setProperty('--cvvr-cover', r.poster ? 'url("' + String(r.poster).replace(/"/g, '%22') + '")' : 'none');
      if (ratios[i]) setShape(ratios[i]); // unknown yet: keep the last shape until the clip says

      if (r.src) {
        const v = document.createElement('video');
        v.setAttribute('playsinline', '');
        v.playsInline = true;
        v.preload = 'auto';
        if (r.poster) v.poster = r.poster;
        v.muted = r.silent ? true : lbMuted; // a clip with no sound never asks the browser for it
        v.setAttribute('aria-label', shop ? (r.label || '') : fill('Video review by [name]', { name: r.name || '' }));
        v.src = r.src;
        on(v, 'loadedmetadata', () => { if (lbVideo === v) learnShape(i, v.videoWidth, v.videoHeight); });
        if (!r.poster) {
          // No cover to blur behind the letterboxing: blur the clip's own first frame.
          on(v, 'loadeddata', () => {
            if (lbVideo !== v || !v.videoWidth) return;
            const c = document.createElement('canvas');
            c.className = 'cvvr-lb__glow';
            c.width = 48;
            c.height = Math.max(1, Math.round(48 * v.videoHeight / v.videoWidth));
            try { c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); media.insertBefore(c, v); } catch (e) { /* no frame: plain dark */ }
          }, { once: true });
        }
        on(v, 'play', syncPlay);
        on(v, 'pause', syncPlay);
        on(v, 'click', togglePlay);
        on(v, 'ended', () => {
          if (advance && current < reviews.length - 1) show(current + 1);
          else syncPlay();
        });
        media.appendChild(v);
        lbVideo = v;
        const p = v.play();
        if (p && p.catch) {
          p.catch(() => {
            // Sound refused by the browser: play muted and let the button turn it on.
            // (A clip with no sound is already muted and stops here.)
            if (lbVideo !== v || v.muted) return;
            v.muted = true;
            lbMuted = true;
            syncSound();
            const p2 = v.play();
            if (p2 && p2.catch) p2.catch(() => {});
          });
        }
      } else if (r.poster) {
        const img = document.createElement('img');
        on(img, 'load', () => learnShape(i, img.naturalWidth, img.naturalHeight));
        img.src = r.poster;
        img.alt = '';
        media.appendChild(img);
      }
      playBtn.hidden = !r.src;
      soundBtn.hidden = !r.src || !!r.silent;
      syncPlay();
      syncSound();

      segFills.forEach((f, k) => { f.style.transform = 'scaleX(' + (k < i ? 1 : 0) + ')'; });
      stepBtns.forEach((b) => {
        b.disabled = Number(b.getAttribute('data-cvvr-lb-step')) < 0 ? i === 0 : i === reviews.length - 1;
      });

      const stars = Math.max(0, Math.min(5, Number(r.stars) || 0));
      if (out.rateRow) out.rateRow.hidden = shop;
      if (out.stars) out.stars.style.setProperty('--fill', stars * 20 + '%');
      out.rate.textContent = shop ? '' : fill(t.rate || '[n] out of 5', { n: stars });
      out.title.textContent = r.title || '';
      if (out.tag) out.tag.hidden = !(shop && r.ai);
      out.body.textContent = r.body || '';
      if (out.by) out.by.hidden = shop;
      out.name.textContent = r.name || '';
      out.verified.hidden = !r.verified;
      out.date.textContent = r.date || '';
      const bought = [r.phone, r.colour].filter(Boolean).join(' · ');
      out.bought.hidden = !bought;
      if (out.boughtLabel) out.boughtLabel.textContent = r.boughtLabel || boughtLabelText;
      out.boughtText.textContent = bought;

      // Long reviews fold to three lines on phones (CSS); offer the rest.
      out.body.classList.add('is-clamped');
      out.more.setAttribute('aria-expanded', 'false');
      out.more.hidden = true;
      requestAnimationFrame(() => {
        const clipped = out.body.scrollHeight > out.body.clientHeight + 2;
        out.more.hidden = !clipped;
        if (!clipped) out.body.classList.remove('is-clamped');
      });
      if (scroller) scroller.scrollTop = 0;

      renderMatch();
    }

    function lock(onOff) { document.documentElement.classList.toggle('cvvr-locked', onOff); }

    function open(i, from) {
      opener = from || null;
      if (!lb.open) {
        lbOpen = true;
        cards.forEach(pauseCard);
        lock(true);
        if (typeof lb.showModal === 'function') lb.showModal();
        else lb.setAttribute('open', '');
        if (!reduced && window.gsap) {
          gsap.fromTo(lbInner, { y: 28, autoAlpha: 0, scale: .985 }, { y: 0, autoAlpha: 1, scale: 1, duration: .42, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
        }
      }
      advance = true;
      setStatus('');
      show(i);
    }
    function close() {
      if (typeof lb.close === 'function' && lb.open) lb.close();
      else { lb.removeAttribute('open'); onClosed(); }
    }
    function onClosed() {
      stopVideo();
      media.textContent = '';
      lbOpen = false;
      lock(false);
      if (!userPaused) inView.forEach(playCard);
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    }
    on(lb, 'close', onClosed);
    on(lb, 'click', (e) => { if (e.target === lb) close(); }); // a click on the backdrop
    on($('[data-cvvr-close]', lb), 'click', close);
    on(playBtn, 'click', togglePlay);
    on(soundBtn, 'click', () => {
      lbMuted = !lbMuted;
      if (lbVideo) {
        lbVideo.muted = lbMuted;
        if (!lbMuted && lbVideo.paused) togglePlay();
      }
      syncSound();
    });
    stepBtns.forEach((b) => on(b, 'click', () => show(current + Number(b.getAttribute('data-cvvr-lb-step')))));
    on(out.more, 'click', () => {
      out.body.classList.remove('is-clamped');
      out.more.setAttribute('aria-expanded', 'true');
      out.more.hidden = true;
    });

    const panel = $('.cvvr-lb__panel', lb);
    on(panel, 'pointerdown', () => { advance = false; });
    on(panel, 'focusin', () => { advance = false; });

    on(document, 'keydown', (e) => {
      if (!lbOpen) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'select' || tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
      else if ((e.key === ' ' || e.key === 'k') && tag !== 'button' && tag !== 'a') { e.preventDefault(); togglePlay(); }
    });

    // Swipe sideways on the clip for the next or previous review.
    const stage = $('[data-cvvr-lb-stage]', lb);
    let sx = 0, sy = 0, swiping = false;
    on(stage, 'touchstart', (e) => {
      if (e.touches.length !== 1) return;
      swiping = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    on(stage, 'touchend', (e) => {
      if (!swiping) return;
      swiping = false;
      const tch = e.changedTouches[0];
      const dx = tch.clientX - sx;
      const dy = tch.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });

    cards.forEach((card, i) => on($('[data-cvvr-open]', card), 'click', (e) => open(i, e.currentTarget)));

    /* ========================================================= shopping panel */
    const bb = document.querySelector('[data-cv-pdp]');
    const els = {
      sel: $('[data-cvvr-sel]', lb),
      thumb: $('.cvvr-lb__thumb', lb),
      now: $('[data-cvvr-now]', lb),
      was: $('[data-cvvr-was]', lb),
      off: $('[data-cvvr-off]', lb),
      match: $('[data-cvvr-match]', lb),
      matchText: $('[data-cvvr-match-text]', lb),
      matchPick: $('[data-cvvr-match-pick]', lb),
      model: $('[data-cvvr-model]', lb),
      selectWrap: $('[data-cvvr-select-wrap]', lb),
      pack: $('[data-cvvr-pack]', lb),
      packText: $('[data-cvvr-pack-text]', lb),
      packChange: $('[data-cvvr-pack-change]', lb),
      add: $('[data-cvvr-add]', lb),
      addLabel: $('[data-cvvr-add-label]', lb),
      addTotal: $('[data-cvvr-add-total]', lb),
      bag: $('[data-cvvr-view-bag]', lb),
      status: $('[data-cvvr-status]', lb)
    };
    const state = {
      opts: (cfg.selected || []).slice(),
      confirmed: !!cfg.confirmed,
      detail: null,
      busy: false,
      added: false,
      mine: false
    };
    const variantFor = (opts) => variants.filter((v) => v.o.every((x, k) => x === opts[k]))[0] || null;

    function setStatus(msg, tone) {
      if (!els.status) return; // sections without a shopping panel have no status line
      els.status.textContent = msg || '';
      if (tone) els.status.setAttribute('data-tone', tone);
      else els.status.removeAttribute('data-tone');
    }

    function choose(index, value) {
      if (index < 0) return;
      if (bb) {
        bb.dispatchEvent(new CustomEvent('cvs:choose', { detail: { index: index, value: value } }));
      } else {
        state.opts[index] = value;
        render();
      }
    }

    function syncModelList() {
      if (!els.model) return;
      const style = si >= 0 ? state.opts[si] : null;
      Array.prototype.forEach.call(els.model.options, (opt) => {
        if (!opt.value) return;
        const match = variants.filter((v) => v.o[mi] === opt.value && (si < 0 || v.o[si] === style));
        let label = opt.value;
        if (!match.length) label += t.noneSuffix || ' (not in this colour)';
        else if (!match.some((v) => v.a)) label += t.soldSuffix || ' (sold out)';
        if (opt.textContent !== label) opt.textContent = label;
      });
      const want = state.confirmed ? state.opts[mi] : '';
      if (els.model.value !== want) els.model.value = want;
    }

    function renderMatch() {
      if (!els.match) return;
      const r = reviews[current] || {};
      const wanted = String(r.colour || '').trim().toLowerCase();
      let value = null;
      if (wanted) {
        for (let k = 0; k < variants.length; k++) {
          const v = variants[k].o[si];
          if (v && v.toLowerCase() === wanted) { value = v; break; }
        }
      }
      if (!value) { els.match.hidden = true; return; }
      els.match.hidden = false;
      const same = state.opts[si] === value;
      els.matchText.textContent = fill(same ? t.matchSame : t.match, { colour: value });
      els.matchPick.hidden = same;
      els.matchPick.textContent = fill(t.matchPick || 'Choose [colour]', { colour: value });
      els.matchPick.setAttribute('data-value', value);
    }

    function render() {
      const d = state.detail;
      const own = variantFor(state.opts);
      const variant = d ? d.variant : null;
      const price = variant ? variant.price : (own ? own.p : 0);
      const compare = d ? d.compareAt : (own ? own.c : 0);
      const available = variant ? variant.available : (own ? own.a : false);
      const qty = d ? d.qty || 1 : 1;
      const total = d ? d.total : price;

      // The selection line: colour, and the phone once the shopper chose it.
      const parts = [];
      if (si >= 0 && state.opts[si]) parts.push(state.opts[si]);
      if (mi >= 0 && state.confirmed && state.opts[mi]) parts.push(state.opts[mi]);
      if (!parts.length && own) parts.push(own.t);
      els.sel.textContent = parts.join(' · ');
      const img = variant && variant.featured_image && variant.featured_image.src ? variant.featured_image.src : (own && own.img) || '';
      if (els.thumb && img) {
        const src = img.indexOf('width=') > -1 ? img : img + (img.indexOf('?') > -1 ? '&' : '?') + 'width=160';
        if (els.thumb.getAttribute('src') !== src) { els.thumb.src = src; els.thumb.removeAttribute('srcset'); }
      }

      els.now.textContent = formatMoney(price);
      const hasWas = compare > price;
      els.was.hidden = !hasWas;
      els.off.hidden = !hasWas;
      if (hasWas) {
        els.was.textContent = formatMoney(compare);
        els.off.textContent = fill(t.off || '[pct]% off', { pct: Math.round((compare - price) * 100 / compare) });
      }

      els.pack.hidden = !(qty > 1);
      if (qty > 1) {
        els.packText.textContent = fill(d && d.pct ? t.pack : t.packPlain, { qty: qty, total: formatMoney(total), pct: d ? d.pct : 0 });
      }

      syncModelList();
      renderMatch();

      if (state.busy) return;
      if (state.added) {
        els.add.disabled = false;
        return;
      }
      const ok = available || (mi >= 0 && !state.confirmed);
      els.add.disabled = !ok;
      els.add.classList.remove('is-done');
      if (!available && !(mi >= 0 && !state.confirmed)) {
        els.addLabel.textContent = own ? t.soldOut : t.unavailable;
        els.addTotal.textContent = '';
      } else {
        els.addLabel.textContent = qty > 1 ? fill(t.addPack, { qty: qty }) : t.add;
        els.addTotal.textContent = formatMoney(total);
      }
    }

    on(els.model, 'change', () => {
      const value = els.model.value;
      if (!value) return;
      state.confirmed = true;
      state.opts[mi] = value;
      if (els.selectWrap) els.selectWrap.classList.remove('is-wanted');
      setStatus('');
      choose(mi, value);
      render();
    });
    on(els.matchPick, 'click', () => {
      const value = els.matchPick.getAttribute('data-value');
      if (!value) return;
      state.opts[si] = value;
      choose(si, value);
      render();
    });

    if (bb) {
      on(bb, 'cvs:change', (e) => {
        const d = e.detail || {};
        if (!d.variant) return;
        state.detail = d;
        state.opts = d.variant.options.slice();
        if (state.busy && state.mine && !state.added) {
          // The buy box repaints after a failed add: say what it said.
          state.busy = false;
          state.mine = false;
          els.add.classList.remove('is-busy');
          els.add.removeAttribute('aria-disabled');
          const said = document.getElementById('cvStatus');
          setStatus((said && said.textContent) || t.failed, 'warn');
        }
        render();
      });
      // A phone chosen in the buy box, the fit list or the carousel counts as the shopper's phone.
      const markChosen = () => {
        state.confirmed = true;
        if (els.selectWrap) els.selectWrap.classList.remove('is-wanted');
        render();
      };
      if (mi >= 0) {
        on(bb.querySelector('select[data-cv-option-index="' + mi + '"]'), 'change', markChosen);
        bb.querySelectorAll('button[data-cv-option-index="' + mi + '"]').forEach((btn) => on(btn, 'click', markChosen));
      }
      on(bb, 'cvs:adding', () => {
        if (!state.mine) return;
        state.busy = true;
        state.added = false;
        els.add.classList.add('is-busy');
        els.add.setAttribute('aria-disabled', 'true'); // not disabled: focus stays on it
        els.addLabel.textContent = t.adding;
        els.addTotal.textContent = '';
        els.bag.hidden = true;
        setStatus('');
      });
      on(bb, 'cvs:added', () => {
        if (!state.mine) return;
        state.mine = false;
        added();
      });
    }

    function added() {
      state.busy = false;
      state.added = true;
      els.add.classList.remove('is-busy');
      els.add.classList.add('is-done');
      els.add.removeAttribute('aria-disabled');
      els.addLabel.textContent = t.added;
      els.bag.hidden = false;
      const said = document.getElementById('cvStatus');
      setStatus(said ? said.textContent : '');
      if (!reduced && window.gsap) gsap.fromTo(els.add, { scale: .96 }, { scale: 1, duration: .5, ease: 'back.out(3)', clearProps: 'transform' });
      window.setTimeout(() => {
        state.added = false;
        els.add.classList.remove('is-done');
        render();
      }, 2600);
    }

    function addDirect(v) {
      const base = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
      state.busy = true;
      els.add.classList.add('is-busy');
      els.add.setAttribute('aria-disabled', 'true');
      els.addLabel.textContent = t.adding;
      els.addTotal.textContent = '';
      fetch(base + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] })
      })
        .then((res) => res.json().then((body) => { if (!res.ok) throw body; return body; }))
        .then(() => {
          document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
          document.dispatchEvent(new CustomEvent('cart:added', { bubbles: true }));
          if (window.CasifyCart && typeof window.CasifyCart.refresh === 'function') window.CasifyCart.refresh();
          added();
        })
        .catch((err) => {
          state.busy = false;
          els.add.classList.remove('is-busy');
          els.add.removeAttribute('aria-disabled');
          setStatus((err && err.description) || t.failed, 'warn');
          render();
        });
    }

    on(els.add, 'click', () => {
      if (els.add.disabled || state.busy) return;
      if (state.added) { els.bag.focus(); return; }
      if (mi >= 0 && !state.confirmed) {
        setStatus(t.pickModel, 'warn');
        if (els.selectWrap) {
          els.selectWrap.classList.add('is-wanted');
          els.selectWrap.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
          if (!reduced && window.gsap) gsap.fromTo(els.selectWrap, { x: 0 }, { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: .45, ease: 'power1.out', clearProps: 'transform' });
        }
        if (els.model) els.model.focus({ preventScroll: true });
        return;
      }
      const v = variantFor(state.opts);
      if (!v || !v.a) return;
      const form = bb ? document.getElementById('cvAddForm') : null;
      if (form) {
        // The buy box should already hold this case; make sure before submitting its form.
        const idInput = form.querySelector('[name="id"]');
        if (!idInput || Number(idInput.value) !== v.id) {
          if (si >= 0) choose(si, v.o[si]);
          if (mi >= 0) choose(mi, v.o[mi]);
        }
        state.mine = true;
        if (form.requestSubmit) form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return;
      }
      addDirect(v);
    });

    on(els.bag, 'click', () => {
      close();
      if (window.Casify && typeof window.Casify.openDrawer === 'function') window.Casify.openDrawer();
      else window.location.href = ((window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/') + 'cart';
    });

    on(els.packChange, 'click', () => {
      close();
      if (!bb) return;
      const packs = bb.querySelector('.cvc__packs') || document.getElementById('cvAddForm') || bb;
      packs.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      const checked = bb.querySelector('[data-cv-pack][aria-checked="true"]');
      if (checked) window.setTimeout(() => checked.focus({ preventScroll: true }), reduced ? 0 : 650);
    });

    // Sections without a shopping panel (content pages) skip the buy-box render.
    if (els.add) render();

    /* ================================================================= motion */
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 78%', once: true } });
    const title = $('[data-cvvr-split]');
    if (title && window.SplitText) {
      const split = new SplitText(title, { type: 'words', mask: 'words' });
      tl.from(split.words, { yPercent: 110, duration: .7, ease: 'power3.out', stagger: .05 });
    }
    const score = $('[data-cvvr-score]');
    const num = $('[data-cvvr-score-num]');
    const scoreStars = $('.cvvr__score-stars');
    if (score) {
      tl.from(score, { scale: 1.22, rotation: -5, autoAlpha: 0, duration: .55, ease: 'back.out(2.2)', clearProps: 'transform,opacity,visibility' }, title ? '-=.45' : 0);
      const target = parseFloat(num && num.getAttribute('data-cvvr-score-num'));
      if (num && !isNaN(target)) {
        const c = { v: 0 };
        tl.to(c, { v: target, duration: .9, ease: 'power2.out', onUpdate: () => { num.textContent = c.v.toFixed(1); } }, '<0.1');
      }
      if (scoreStars) {
        const end = scoreStars.style.getPropertyValue('--fill') || '100%';
        tl.fromTo(scoreStars, { '--fill': '0%' }, { '--fill': end, duration: .9, ease: 'power2.out' }, '<');
      }
    }
    tl.from(cards, {
      y: 56,
      rotation: (k) => (k % 2 ? 2.5 : -2.5),
      autoAlpha: 0,
      duration: .7,
      ease: 'power3.out',
      stagger: .08,
      clearProps: 'transform,opacity,visibility'
    }, '-=.6');
  }

  document.querySelectorAll('[data-cvvr]').forEach(init);
  // Theme editor: a re-rendered section brings fresh markup.
  document.addEventListener('shopify:section:load', (e) => {
    const s = e.target && e.target.querySelector && e.target.querySelector('[data-cvvr]');
    if (s) init(s);
  });
})();
