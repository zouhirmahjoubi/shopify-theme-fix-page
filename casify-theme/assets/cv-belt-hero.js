/* Casify: Belt hero (sections/cv-belt-hero.liquid, styles in cv-belt-hero.css).
 *
 * The stylesheet stands the belt at rest on the first case; this file takes
 * that same layout over and moves it. One render pass places every case from
 * three numbers: where the belt has turned to (pos), how far each case has
 * gone to its grid cell (mix) and how far the picked case has opened (open).
 * GSAP tweens those numbers; nothing else animates the cases.
 *
 *   Belt   drag, arrow keys, the number list or a tap on a side case turn it.
 *          Cases blur a little while they travel.
 *   Open   a tap on the front case: the others fade out, the counter ticket
 *          drops in on its cord and swings, its number flaps, a scan line
 *          passes over the case and leaves numbered markers.
 *   Grid   the same cases fly to a three-column grid and back.
 *
 * Geometry comes from the --cvbh-f-* custom properties in the stylesheet, so
 * the script and the scriptless first paint agree to the pixel.
 *
 * Reduced motion: everything still works; nothing glides, swings, flaps or
 * scans, and the belt never turns on its own. Without GSAP this file does
 * nothing and the page keeps the belt at rest with every case a link.
 * Re-initialises in the theme editor.
 */

const SELECTOR = '[data-cvbh]';
const CASE_ASPECT = 0.49; /* case width / height in every 3D still (and in the stylesheet) */
const TAU = Math.PI * 2;
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const wideQuery = window.matchMedia('(min-width: 990px)'); /* ds-allow-hardcode: the stylesheet's wide breakpoint */

const one = (q, ctx) => ctx.querySelector(q);
const all = (q, ctx) => Array.from(ctx.querySelectorAll(q));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (v, n) => ((v % n) + n) % n;
const fill = (template, values) => String(template || '').replace(/\[(\w+)\]/g, (m, k) => (k in values ? values[k] : m));
const sizeFor = (text) => (text.length > 26 ? 'l' : text.length > 16 ? 'm' : 's');

const instances = new Map();

function mount(root) {
  const gsap = window.gsap;
  if (!gsap || instances.has(root)) return;

  const ring = one('[data-cvbh-ring]', root);
  const body = one('[data-cvbh-body]', root);
  const dataEl = one('[data-cvbh-data]', root);
  const els = all('[data-cvbh-item]', root);
  let data = [];
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
  const n = els.length;
  if (!ring || !body || !n || data.length !== n) return;

  const ui = {
    labelsWrap: one('.cvbh__labels', root),
    labels: all('[data-cvbh-label]', root),
    views: one('[data-cvbh-views]', root),
    viewBtns: all('[data-cvbh-view]', root),
    index: one('[data-cvbh-index]', root),
    idx: all('[data-cvbh-idx]', root),
    run: one('[data-cvbh-run]', root),
    runLabel: one('[data-cvbh-run-label]', root),
    flap: one('[data-cvbh-flap]', root),
    titleWrap: one('[data-cvbh-title-wrap]', root),
    title: one('[data-cvbh-title]', root),
    meta: one('[data-cvbh-meta]', root),
    card: one('[data-cvbh-card]', root),
    cardNum: one('[data-cvbh-card-num]', root),
    price: one('[data-cvbh-price]', root),
    was: one('[data-cvbh-was]', root),
    bag: one('[data-cvbh-bag]', root),
    bagLabel: one('[data-cvbh-bag-label]', root),
    open: one('[data-cvbh-open]', root),
    openNum: one('[data-cvbh-open-num]', root),
    openName: one('[data-cvbh-open-name]', root),
    openMeta: one('[data-cvbh-open-meta]', root),
    hint: one('[data-cvbh-hint]', root),
    close: one('[data-cvbh-close]', root),
    ticket: one('[data-cvbh-ticket]', root),
    swing: one('[data-cvbh-swing]', root),
    tflap: one('[data-cvbh-tflap]', root),
    tof: one('[data-cvbh-tof]', root),
    tname: one('[data-cvbh-tname]', root),
    tprice: one('[data-cvbh-tprice]', root),
    twas: one('[data-cvbh-twas]', root),
    tbag: one('[data-cvbh-tbag]', root),
    tbagLabel: one('[data-cvbh-tbag-label]', root),
    tlink: one('[data-cvbh-tlink]', root),
    scan: one('[data-cvbh-scan]', root),
    line: one('[data-cvbh-scan-line]', root),
    markersWrap: one('[data-cvbh-markers]', root),
    markers: all('[data-cvbh-marker]', root),
    cursor: one('[data-cvbh-cursor]', root),
    status: one('[data-cvbh-status]', root),
    all: one('.cvbh__all', root)
  };
  const text = {
    drag: root.dataset.tDrag || 'Drag',
    bring: root.dataset.tBring || 'Bring in',
    view: root.dataset.tView || 'View',
    close: root.dataset.tClose || 'Close',
    running: root.dataset.tRunning || 'Belt running',
    paused: root.dataset.tPaused || 'Belt paused',
    count: root.dataset.tCount || 'Case [n] of [total]',
    add: (ui.bagLabel && ui.bagLabel.dataset.add) || 'Add to bag',
    sold: (ui.bagLabel && ui.bagLabel.dataset.sold) || 'Sold out'
  };
  const FACTS = ['edge', 'finish', 'fit'];

  const items = els.map((el, i) => ({
    el, img: one('img', el), label: ui.labels[i] || null, d: data[i],
    mix: 0, labelFade: 0, x: null, y: null, vb: 0, cache: {}, lcache: {}
  }));
  const state = { pos: 0, open: 0 };
  const g = { cells: [] };
  const ac = new AbortController();
  const on = (target, type, fn, opts) => target.addEventListener(type, fn, Object.assign({ signal: ac.signal }, opts || {}));

  let front = 0;
  let openIndex = -1;
  let mode = 'belt';
  let reduce = reduceQuery.matches;
  let lite = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  let raf = 0;
  let split = null;
  let scanTl = null;
  let autoOn = false;
  let autoTimer = 0;
  let autoSteps = 0;
  let hovering = false;
  let inView = true;
  let slowFrames = 0;
  let lastFrame = 0;
  let destroyed = false;

  /* ---------- geometry ---------- */
  function measure() {
    const cs = getComputedStyle(root);
    const f = (name, fallback) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    g.w = ring.clientWidth;
    g.ringH = ring.clientHeight;
    g.bodyH = body.clientHeight;
    g.wide = wideQuery.matches;
    g.caseW = els[0].offsetWidth || g.ringH * 0.6 * CASE_ASPECT;
    g.caseH = els[0].offsetHeight || g.ringH * 0.6;
    g.rx = Math.min(g.w * f('--cvbh-f-rx', 0.33), f('--cvbh-rx-max', 460));
    g.ry = g.ringH * f('--cvbh-f-ry', 0.13);
    g.cy = g.ringH * f('--cvbh-f-cy', 0.66);
    g.sBack = f('--cvbh-s-back', 0.42);
    g.blur = f('--cvbh-blur', 5);
    g.openX = g.w * f('--cvbh-open-x', 0.5);
    g.openFeet = g.ringH * f('--cvbh-open-feet', 0.6);
    g.openH = g.ringH * f('--cvbh-open-case', 0.52);
    g.ticketTop = g.ringH * f('--cvbh-ticket-top', 0.62);
    gridLayout();
    if (openIndex >= 0) placeOpen();
  }

  /* Three columns, so six or nine cases fill every row. The grid uses the whole body:
     on phones the name, price and button make room for it. */
  function gridLayout() {
    const cols = 3;
    const rows = Math.ceil(n / cols);
    const sideRoom = g.wide ? Math.max(92, g.w * 0.085) : 10; /* wide: the number list keeps its column */
    const areaW = Math.min(g.w - sideRoom * 2, 1080);
    const top = g.wide ? 18 : 4;
    const under = !g.wide && ui.all ? 54 : 12; /* phones: the "see all" link sits under the grid */
    const cellW = areaW / cols;
    const cellH = (g.bodyH - top - under) / rows;
    const labelH = 24;
    const caseH = Math.max(40, Math.min(cellH - labelH - 14, (cellW - 18) / CASE_ASPECT, g.caseH * 0.62));
    g.gridS = caseH / g.caseH;
    g.cells = items.map((it, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      return {
        x: g.w / 2 + (c - (inRow - 1) / 2) * cellW,
        feet: top + r * cellH + (cellH - labelH - caseH) / 2 + caseH
      };
    });
    /* Names show only when every label still fits its cell on one line. */
    if (ui.labelsWrap) {
      ui.labelsWrap.classList.remove('is-compact');
      const widest = Math.max.apply(null, ui.labels.map((l) => l.offsetWidth));
      ui.labelsWrap.classList.toggle('is-compact', widest > cellW - 14);
    }
    items.forEach((it) => { it.lcache = {}; it.labelW = it.label ? it.label.offsetWidth : 0; });
  }

  /* ---------- render ---------- */
  function render() {
    const o = state.open;
    let moving = false;
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const a = ((i - state.pos) * TAU) / n;
      const d = Math.cos(a);
      const u = (1 + d) / 2;
      let x = Math.sin(a) * g.rx;
      let y = g.cy + d * g.ry;
      let s = g.sBack + (1 - g.sBack) * u * u * (0.4 + 0.6 * u);
      let blur = clamp((0.6 - d) / 1.6, 0, 1) * g.blur;
      let op = 1 - 0.34 * clamp((0.2 - d) / 1.2, 0, 1);
      let z = Math.round(100 + d * 100);

      const m = it.mix;
      if (m > 0) {
        const cell = g.cells[i];
        x = lerp(x, cell.x - g.w / 2, m);
        y = lerp(y, cell.feet, m);
        s = lerp(s, g.gridS, m);
        blur *= 1 - m;
        op = lerp(op, 1, m);
        if (m > 0.5) z = 210 + i;
      }
      if (o > 0) {
        if (i === openIndex) {
          x = lerp(x, g.openX - g.w / 2, o);
          y = lerp(y, g.openFeet, o);
          s = lerp(s, g.openH / g.caseH, o);
          blur *= 1 - o;
          op = lerp(op, 1, o);
          z = 300;
        } else {
          blur += 12 * o;
          op *= 1 - o;
        }
      }

      /* A case that travels fast goes soft, like a long exposure. */
      if (!reduce && !lite && it.x !== null) {
        const speed = Math.hypot(x - it.x, y - it.y);
        it.vb += (Math.min(6, speed * 0.2) - it.vb) * 0.5;
        if (it.vb < 0.08) it.vb = 0; else moving = true;
        blur += it.vb;
      }
      it.x = x;
      it.y = y;

      const c = it.cache;
      const t = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
      if (t !== c.t) { it.el.style.transform = t; c.t = t; }
      const b = lite ? 0 : Math.round(blur * 2) / 2;
      if (b !== c.b) { it.el.style.filter = b ? 'blur(' + b + 'px)' : 'none'; c.b = b; }
      const opacity = Math.round(op * 100) / 100;
      if (opacity !== c.o) {
        it.el.style.opacity = opacity;
        it.el.style.pointerEvents = opacity < 0.05 ? 'none' : '';
        it.el.style.visibility = opacity < 0.01 ? 'hidden' : '';
        c.o = opacity;
      }
      if (z !== c.z) { it.el.style.zIndex = z; c.z = z; }

      if (it.label) {
        const lc = it.lcache;
        const cell = g.cells[i];
        const lo = Math.round(it.labelFade * (1 - o) * 100) / 100;
        if (lo !== lc.o) { it.label.style.opacity = lo; lc.o = lo; }
        const lt = 'translate3d(' + (cell.x - it.labelW / 2).toFixed(1) + 'px,' + (cell.feet + 9 + (1 - it.labelFade) * 6).toFixed(1) + 'px,0)';
        if (lo > 0 && lt !== lc.t) { it.label.style.transform = lt; lc.t = lt; }
      }
    }
    return moving;
  }
  function frame(now) {
    raf = 0;
    if (destroyed) return;
    /* A slow machine drops the soft focus rather than the frame rate. */
    if (!lite && lastFrame && now - lastFrame < 200) {
      slowFrames = now - lastFrame > 34 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 24) { lite = true; root.classList.add('is-lite'); }
    }
    lastFrame = now;
    if (render()) invalidate(); else lastFrame = 0;
  }
  function invalidate() {
    if (!raf && !destroyed) raf = window.requestAnimationFrame(frame);
  }

  /* ---------- words that follow the front case ---------- */
  /* A tile's flip is one timeline. A newer value kills the older flip whole, callbacks
     included, so a late callback can never put an old digit back. */
  const flips = new Map();
  function setFlap(el, value, animate) {
    if (!el) return;
    const tiles = all('.cvbh__flap-d', el);
    String(value).split('').forEach((ch, i) => {
      const tile = tiles[i];
      if (!tile) return;
      const running = flips.get(tile);
      if (running) { running.kill(); flips.delete(tile); }
      const shown = tile.dataset.v || tile.textContent;
      tile.dataset.v = ch;
      if (!animate || reduce || (shown === ch && animate !== 'roll')) {
        tile.textContent = ch;
        gsap.set(tile, { rotationX: 0 });
        return;
      }
      const turns = animate === 'roll' ? 3 : 1;
      const tl = gsap.timeline({ delay: i * 0.05, onComplete: () => flips.delete(tile) });
      flips.set(tile, tl);
      for (let k = 0; k < turns; k++) {
        const last = k === turns - 1;
        tl.to(tile, { rotationX: -90, duration: 0.085, ease: 'power1.in' })
          .call(() => { tile.textContent = last ? ch : String(Math.floor(Math.random() * 10)); })
          .fromTo(tile, { rotationX: 90 }, { rotationX: 0, duration: last ? 0.2 : 0.085, ease: last ? 'power2.out' : 'none', immediateRender: false });
      }
    });
  }
  function setTitle(value, href, animate) {
    if (split) { gsap.killTweensOf(split.chars); split.revert(); split = null; }
    ui.title.textContent = value;
    ui.title.href = href;
    ui.titleWrap.dataset.size = sizeFor(value);
    if (!animate || reduce || !window.SplitText) return;
    try {
      const mine = new window.SplitText(ui.title, { type: 'words,chars' });
      split = mine;
      gsap.from(mine.chars, {
        opacity: 0, x: -10, filter: 'blur(6px)', duration: 0.42, stagger: 0.018, ease: 'power2.out', /* ds-allow-hardcode: motion value, the letters come into focus */
        onComplete: () => { if (split === mine) { mine.revert(); split = null; } }
      });
    } catch (e) { split = null; }
  }
  function setFacts(scope, attr, d) {
    FACTS.forEach((key) => {
      const row = one('[' + attr + '="' + key + '"]', scope);
      if (!row) return;
      row.hidden = !d[key];
      const dd = one('dd', row);
      if (dd) dd.textContent = d[key] || '';
    });
  }
  function setBag(a, label, d) {
    if (!a) return;
    a.href = d.url;
    a.dataset.handle = d.handle;
    a.dataset.url = d.url;
    if (d.available) a.setAttribute('data-cvqp-open', ''); else a.removeAttribute('data-cvqp-open');
    if (label) label.textContent = d.available ? text.add : text.sold;
  }
  function upgrade(k) {
    const it = items[mod(k, n)];
    const full = it.el.dataset.sizes;
    if (full && it.img && it.img.sizes !== full) it.img.sizes = full;
  }
  function showFront(k, opts) {
    const o = opts || {};
    const d = data[k];
    const animate = o.animate !== false && !reduce;
    setTitle(d.short, d.url, animate);
    ui.meta.textContent = d.meta || '';
    setFacts(ui.card, 'data-cvbh-row', d);
    ui.price.textContent = d.price;
    ui.was.textContent = d.was || '';
    ui.was.hidden = !d.was;
    setBag(ui.bag, ui.bagLabel, d);
    setFlap(ui.flap, d.n, animate);
    if (ui.cardNum) ui.cardNum.textContent = d.n;
    ui.idx.forEach((b, i) => { if (i === k) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (animate) {
      gsap.fromTo([ui.meta, ui.price.parentNode], { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.32, stagger: 0.05, ease: 'power2.out', overwrite: true, clearProps: 'opacity,transform' });
      const rows = all('.cvbh__row:not([hidden])', ui.card);
      if (rows.length && g.wide) gsap.fromTo(rows, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out', overwrite: true, clearProps: 'opacity,transform' });
    }
    if (o.announce && ui.status) ui.status.textContent = fill(text.count, { n: k + 1, total: n }) + ': ' + d.short;
    upgrade(k);
  }
  function setFront(k, opts) {
    k = mod(k, n);
    if (k === front) return;
    front = k;
    showFront(k, opts);
  }

  /* ---------- the belt ---------- */
  const stepPx = () => Math.max(40, g.rx * Math.sin(TAU / n));
  function settle(target, opts) {
    gsap.killTweensOf(state, 'pos');
    setFront(target, opts);
    const done = () => { state.pos = mod(state.pos, n); upgrade(front + 1); upgrade(front - 1); invalidate(); };
    if (reduce) { state.pos = target; done(); render(); return; }
    gsap.to(state, {
      pos: target,
      duration: clamp(0.5 + Math.abs(target - state.pos) * 0.14, 0.5, 1.15),
      ease: 'power3.out',
      onUpdate: invalidate,
      onComplete: done
    });
  }
  function goTo(k, opts) {
    const cur = Math.round(state.pos);
    let diff = mod(k - cur, n);
    if (diff > n / 2) diff -= n;
    settle(cur + diff, opts);
  }

  /* Turning on its own: only until the shopper touches the hero, never off screen. */
  function scheduleAuto() {
    window.clearTimeout(autoTimer);
    if (!autoOn || reduce || !inView || hovering || document.hidden || mode !== 'belt' || openIndex >= 0 || drag.active) return;
    const wait = clamp(parseFloat(root.dataset.interval) || 4.5, 2.5, 12) * 1000;
    autoTimer = window.setTimeout(() => {
      if (root.contains(document.activeElement)) { scheduleAuto(); return; } /* never under keyboard focus */
      goTo(mod(front + 1, n), { announce: false });
      autoSteps += 1;
      if (autoSteps >= n * 2) setAuto(false); else scheduleAuto(); /* two laps, then rest */
    }, wait);
  }
  function setAuto(value) {
    autoOn = !!value && !reduce;
    autoSteps = 0;
    if (ui.run) {
      ui.run.setAttribute('aria-pressed', autoOn ? 'true' : 'false');
      if (ui.runLabel) ui.runLabel.textContent = autoOn ? text.running : text.paused;
    }
    scheduleAuto();
  }
  const touched = () => { if (autoOn) setAuto(false); };

  /* ---------- dragging ---------- */
  const drag = { active: false, moved: false, id: null, x0: 0, pos0: 0, lastX: 0, lastT: 0, v: 0 };
  on(ring, 'pointerdown', (e) => {
    if (e.button || openIndex >= 0 || mode !== 'belt' || e.target.closest('button')) return;
    drag.active = true;
    drag.moved = false;
    drag.id = e.pointerId;
    drag.x0 = drag.lastX = e.clientX;
    drag.pos0 = state.pos;
    drag.lastT = e.timeStamp;
    drag.v = 0;
  });
  on(ring, 'pointermove', (e) => {
    if (!drag.active || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(dx) < 7) return;
      drag.moved = true;
      drag.pos0 = state.pos + dx / stepPx();
      gsap.killTweensOf(state, 'pos');
      try { ring.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      root.classList.add('is-dragging');
      setChip('');
      touched();
    }
    const step = stepPx();
    state.pos = drag.pos0 - dx / step;
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.v = lerp(drag.v, ((drag.lastX - e.clientX) / step / dt) * 1000, 0.6);
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    setFront(Math.round(state.pos), { announce: false });
    invalidate();
  });
  const endDrag = (e) => {
    if (!drag.active || e.pointerId !== drag.id) return;
    drag.active = false;
    if (!drag.moved) return;
    root.classList.remove('is-dragging');
    const coast = e.timeStamp - drag.lastT < 80 ? clamp(drag.v * 0.22, -2.4, 2.4) : 0;
    settle(Math.round(state.pos + coast), { announce: true });
    window.setTimeout(() => { drag.moved = false; }, 0);
  };
  on(ring, 'pointerup', endDrag);
  on(ring, 'pointercancel', endDrag);
  on(ring, 'dragstart', (e) => e.preventDefault());

  /* ---------- the open case and its ticket ---------- */
  function placeOpen() {
    /* Phones: the ticket hangs under the case, wherever there is room for it. */
    if (!g.wide) {
      const room = g.bodyH + (parseFloat(getComputedStyle(root).paddingBottom) || 0) - 4; /* the hero's bottom padding counts */
      const top = Math.max(120, Math.min(g.ticketTop, room - ui.swing.offsetHeight));
      ui.ticket.style.top = top + 'px';
      g.openFeet = Math.min(g.openFeet, top - 30);
      g.openH = Math.min(g.openH, g.openFeet - 4);
    } else {
      ui.ticket.style.top = '';
    }
    const w = g.openH * CASE_ASPECT;
    const box = { left: g.openX - w / 2, top: g.openFeet - g.openH, width: w, height: g.openH };
    [ui.scan, ui.markersWrap].forEach((el) => {
      el.style.left = box.left + 'px';
      el.style.top = box.top + 'px';
      el.style.width = box.width + 'px';
      el.style.height = box.height + 'px';
    });
    root.style.setProperty('--cvbh-hint-y', g.openFeet + 'px');
  }
  function fillTicket(k) {
    const d = data[k];
    const where = fill(text.count, { n: d.n, total: String(n).padStart(2, '0') });
    ui.tname.textContent = d.short;
    ui.tof.textContent = where;
    setFacts(ui.ticket, 'data-cvbh-trow', d);
    ui.tprice.textContent = d.price;
    ui.twas.textContent = d.was || '';
    ui.twas.hidden = !d.was;
    setBag(ui.tbag, ui.tbagLabel, d);
    ui.tlink.href = d.url;
    ui.openNum.textContent = where;
    ui.openName.textContent = d.short;
    ui.openName.dataset.size = sizeFor(d.short);
    ui.openMeta.textContent = d.meta || '';
    ui.markers.forEach((m) => { m.hidden = !d[m.dataset.cvbhMarker]; m.classList.remove('is-lit'); });
    all('.cvbh__t-row', ui.ticket).forEach((r) => r.classList.remove('is-lit'));
  }
  function runScan() {
    if (openIndex < 0) return;
    const shown = ui.markers.filter((m) => !m.hidden);
    ui.scan.hidden = false;
    ui.markersWrap.hidden = false;
    ui.hint.hidden = false;
    if (scanTl) scanTl.kill();
    if (reduce) {
      gsap.set(shown, { opacity: 1, scale: 1 });
      gsap.set(ui.hint, { opacity: 1 });
      ui.scan.hidden = true;
      return;
    }
    const h = g.openH;
    const sweep = 1.05;
    scanTl = gsap.timeline();
    scanTl.fromTo(ui.line, { y: -6, opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'none' }, 0)
      .to(ui.line, { y: h + 4, duration: sweep, ease: 'sine.inOut' }, 0)
      .to(ui.line, { opacity: 0, duration: 0.22, ease: 'none' }, sweep - 0.12)
      .call(() => { ui.scan.hidden = true; }, null, sweep + 0.15)
      .fromTo(ui.hint, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, sweep - 0.1);
    shown.forEach((m) => {
      const share = (parseFloat(m.style.getPropertyValue('--my')) || 50) / 100;
      /* sine.inOut passes share s at acos(1 - 2s) / PI of the sweep */
      const at = (Math.acos(1 - 2 * clamp(share, 0, 1)) / Math.PI) * sweep;
      scanTl.fromTo(m, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, at + 0.04);
    });
  }
  function openCase(k, opts) {
    if (openIndex >= 0 || k < 0 || k >= n) return;
    const o = opts || {};
    touched();
    window.clearTimeout(autoTimer);
    gsap.killTweensOf(state, 'pos,open');
    if (mode === 'belt') {
      const cur = Math.round(state.pos);
      let diff = mod(k - cur, n);
      if (diff > n / 2) diff -= n;
      state.pos = cur + diff;
      setFront(k, { animate: false });
    }
    openIndex = k;
    fillTicket(k);
    upgrade(k);
    root.classList.add('is-open');
    setChip('');
    ui.ticket.hidden = false;
    ui.close.hidden = false;
    ui.open.hidden = false;
    ui.hint.hidden = true;
    measure();

    gsap.killTweensOf([ui.swing, ui.open, ui.close]);
    if (reduce) {
      state.open = 1;
      gsap.set(ui.swing, { y: 0, rotation: 0, opacity: 1 });
      gsap.set([ui.open, ui.close], { opacity: 1, y: 0 });
      setFlap(ui.tflap, data[k].n, false);
      render();
      runScan();
    } else {
      gsap.to(state, { open: 1, duration: 0.7, ease: 'power3.inOut', onUpdate: invalidate });
      /* The ticket falls in from above its pin, then swings out like a tag on a cord. */
      const fall = g.wide ? -(ui.ticket.offsetTop + ui.swing.offsetHeight + 60) : -110;
      gsap.fromTo(ui.swing, { y: fall, opacity: g.wide ? 1 : 0 }, { y: 0, opacity: 1, duration: 0.62, delay: 0.08, ease: 'power3.out' });
      gsap.fromTo(ui.swing, { rotation: g.wide ? 9 : 6 }, { rotation: 0, duration: 2.5, delay: 0.08, ease: 'elastic.out(1.05, 0.27)' });
      gsap.fromTo([ui.open, ui.close], { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.45, delay: 0.18, stagger: 0.06, ease: 'power2.out' });
      gsap.delayedCall(0.3, () => { if (openIndex === k) setFlap(ui.tflap, data[k].n, 'roll'); });
      gsap.delayedCall(0.56, runScan);
      invalidate();
    }
    if (ui.status) ui.status.textContent = fill(text.count, { n: k + 1, total: n }) + ': ' + data[k].short;
    if (o.focus !== false) ui.close.focus({ preventScroll: true });
  }
  function closeCase(opts) {
    if (openIndex < 0) return;
    const o = opts || {};
    const k = openIndex;
    root.classList.remove('is-open');
    setChip('');
    gsap.killTweensOf(runScan);
    if (scanTl) { scanTl.kill(); scanTl = null; }
    gsap.killTweensOf([ui.swing, ui.open, ui.close, ui.hint, ui.line].concat(ui.markers));
    gsap.killTweensOf(state, 'open');
    const finish = () => {
      if (openIndex !== k) return;
      openIndex = -1;
      state.open = 0;
      ui.ticket.hidden = true;
      ui.close.hidden = true;
      ui.open.hidden = true;
      ui.hint.hidden = true;
      ui.scan.hidden = true;
      ui.markersWrap.hidden = true;
      gsap.set(ui.markers, { opacity: 0, scale: 0 });
      invalidate();
      scheduleAuto();
    };
    if (reduce) {
      finish();
      render();
    } else {
      const lift = g.wide ? -(ui.ticket.offsetTop + ui.swing.offsetHeight + 60) : -70;
      gsap.to(ui.swing, { y: lift, rotation: -5, opacity: g.wide ? 1 : 0, duration: 0.4, ease: 'power2.in' });
      gsap.to([ui.open, ui.close, ui.hint], { opacity: 0, duration: 0.2, ease: 'none' });
      gsap.to(ui.markers, { opacity: 0, scale: 0, duration: 0.18, ease: 'power1.in' });
      gsap.to(state, { open: 0, duration: 0.6, ease: 'power3.inOut', onUpdate: invalidate, onComplete: finish });
    }
    if (o.focus !== false && items[k].el.isConnected) items[k].el.focus({ preventScroll: true });
  }
  function light(key, lit) {
    ui.markers.forEach((m) => m.classList.toggle('is-lit', !!lit && m.dataset.cvbhMarker === key));
    all('.cvbh__t-row', ui.ticket).forEach((r) => r.classList.toggle('is-lit', !!lit && r.dataset.cvbhTrow === key));
  }

  /* ---------- belt <-> grid ---------- */
  function setMode(next) {
    if (next === mode || openIndex >= 0) return;
    mode = next;
    const toGrid = mode === 'grid';
    touched();
    window.clearTimeout(autoTimer);
    root.classList.toggle('is-grid', toGrid);
    ui.viewBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.cvbhView === mode ? 'true' : 'false'));
    setChip('');
    if (toGrid) { gsap.killTweensOf(state, 'pos'); state.pos = Math.round(state.pos); }
    items.forEach((it, i) => {
      gsap.killTweensOf(it, 'mix,labelFade');
      if (reduce) { it.mix = toGrid ? 1 : 0; it.labelFade = toGrid ? 1 : 0; return; }
      /* To the grid: first cases first. Back to the belt: last cases first. */
      const order = toGrid ? i : n - 1 - i;
      gsap.to(it, { mix: toGrid ? 1 : 0, duration: 0.78, delay: order * 0.034, ease: 'power3.inOut', onUpdate: invalidate });
      gsap.to(it, { labelFade: toGrid ? 1 : 0, duration: toGrid ? 0.4 : 0.14, delay: toGrid ? 0.52 + i * 0.034 : 0, ease: 'power2.out', onUpdate: invalidate });
    });
    if (reduce) render(); else invalidate();
  }

  /* ---------- pointer label ---------- */
  let chip = '';
  let chipX = null;
  let chipY = null;
  function setChip(kind) {
    if (!ui.cursor || kind === chip) return;
    chip = kind;
    root.classList.toggle('is-chip', !!kind);
    ui.cursor.classList.toggle('is-on', !!kind);
    if (kind) {
      ui.cursor.dataset.kind = kind;
      ui.cursor.textContent = text[kind] || '';
    }
  }
  function chipFor(target) {
    if (drag.moved || !ring.contains(target) || target.closest('button')) return '';
    if (openIndex >= 0) return 'close';
    const a = target.closest('[data-cvbh-item]');
    if (mode === 'grid') return a ? 'view' : '';
    if (!a) return 'drag';
    return els.indexOf(a) === front ? 'view' : 'bring';
  }
  if (ui.cursor && fineQuery.matches) {
    gsap.set(ui.cursor, { xPercent: -50, yPercent: -50 });
    chipX = gsap.quickTo(ui.cursor, 'x', { duration: 0.22, ease: 'power3.out' });
    chipY = gsap.quickTo(ui.cursor, 'y', { duration: 0.22, ease: 'power3.out' });
    on(root, 'pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = root.getBoundingClientRect();
      chipX(e.clientX - r.left);
      chipY(e.clientY - r.top);
      setChip(chipFor(e.target));
    });
    on(root, 'pointerleave', () => setChip(''));
  }
  /* A mouse over the hero holds the belt still, so a case never changes under the pointer. */
  on(root, 'pointerenter', (e) => { if (e.pointerType === 'mouse') { hovering = true; window.clearTimeout(autoTimer); } });
  on(root, 'pointerleave', (e) => { if (e.pointerType === 'mouse') { hovering = false; scheduleAuto(); } });

  /* ---------- clicks and keys ---------- */
  on(ring, 'click', (e) => {
    if (e.target.closest('[data-cvbh-marker]')) return;
    const a = e.target.closest('[data-cvbh-item]');
    if (a && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return; /* new tab or window: the product page */
    if (a) e.preventDefault();
    if (drag.moved) return;
    if (openIndex >= 0) { closeCase(); return; }
    if (!a) return;
    const k = els.indexOf(a);
    if (mode === 'grid' || k === front) openCase(k);
    else { touched(); goTo(k, { announce: true }); }
  });
  on(ring, 'focusin', (e) => {
    const a = e.target.closest('[data-cvbh-item]');
    if (!a || mode !== 'belt' || openIndex >= 0 || drag.active) return;
    let keyboard = false;
    try { keyboard = a.matches(':focus-visible'); } catch (err) { keyboard = true; }
    const k = els.indexOf(a);
    if (keyboard && k !== front) { touched(); goTo(k, { announce: true }); }
  });
  on(root, 'keydown', (e) => {
    if (e.key === 'Escape' && openIndex >= 0) { e.preventDefault(); closeCase(); return; }
    if (openIndex >= 0 || mode !== 'belt' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    if (!e.target.closest('[data-cvbh-ring], [data-cvbh-index]')) return;
    e.preventDefault();
    touched();
    const k = mod(front + (e.key === 'ArrowRight' ? 1 : -1), n);
    goTo(k, { announce: true });
    if (e.target.closest('[data-cvbh-item]')) items[k].el.focus({ preventScroll: true });
  });
  ui.idx.forEach((b, i) => on(b, 'click', () => {
    if (openIndex >= 0) return;
    touched();
    if (mode === 'grid') openCase(i); else goTo(i, { announce: true });
  }));
  ui.viewBtns.forEach((b) => on(b, 'click', () => setMode(b.dataset.cvbhView)));
  if (ui.close) on(ui.close, 'click', () => closeCase());
  if (ui.run) on(ui.run, 'click', () => setAuto(!autoOn));
  ui.markers.forEach((m) => {
    const key = m.dataset.cvbhMarker;
    on(m, 'click', (e) => { e.stopPropagation(); light(key, !m.classList.contains('is-lit')); });
    on(m, 'pointerenter', (e) => { if (e.pointerType === 'mouse') light(key, true); });
    on(m, 'pointerleave', (e) => { if (e.pointerType === 'mouse') light(key, false); });
    on(m, 'focus', () => light(key, true));
    on(m, 'blur', () => light(key, false));
  });
  all('.cvbh__t-row', ui.ticket).forEach((r) => {
    on(r, 'pointerenter', (e) => { if (e.pointerType === 'mouse') light(r.dataset.cvbhTrow, true); });
    on(r, 'pointerleave', (e) => { if (e.pointerType === 'mouse') light(r.dataset.cvbhTrow, false); });
  });
  on(root, 'pointerdown', (e) => { if (!e.target.closest('[data-cvbh-run]')) touched(); }, { passive: true });

  /* ---------- watch the page ---------- */
  const resize = new ResizeObserver(() => {
    if (destroyed) return;
    measure();
    items.forEach((it) => { it.x = null; it.vb = 0; });
    render();
  });
  resize.observe(body);
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      scheduleAuto();
    }, { threshold: 0.3 });
    io.observe(root);
  }
  on(document, 'visibilitychange', scheduleAuto);
  const onReduce = () => {
    reduce = reduceQuery.matches;
    if (reduce) setAuto(false);
    if (ui.run) ui.run.hidden = reduce || root.dataset.autoplay !== 'true';
  };
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduce, { signal: ac.signal });

  /* ---------- take over ---------- */
  if (lite) root.classList.add('is-lite');
  measure();
  root.classList.add('is-live');
  render();
  if (ui.views) ui.views.hidden = false;
  if (ui.index) ui.index.hidden = false;
  if (ui.run) ui.run.hidden = reduce || root.dataset.autoplay !== 'true';
  upgrade(1);
  upgrade(-1);
  const editor = !!(window.Shopify && window.Shopify.designMode);
  setAuto(root.dataset.autoplay === 'true' && !reduce && !editor);

  const api = {
    goTo: (k) => goTo(mod(k, n), { announce: true }),
    open: (k) => openCase(typeof k === 'number' ? k : front),
    close: () => closeCase(),
    setMode,
    render,
    get state() { return { pos: state.pos, open: state.open, front, openIndex, mode, auto: autoOn, lite, reduce }; },
    indexOf: (el) => els.indexOf(el),
    destroy() {
      destroyed = true;
      window.clearTimeout(autoTimer);
      window.cancelAnimationFrame(raf);
      ac.abort();
      resize.disconnect();
      if (io) io.disconnect();
      if (scanTl) scanTl.kill();
      flips.forEach((tl) => tl.kill());
      flips.clear();
      if (split) split.revert();
      gsap.killTweensOf(runScan);
      gsap.killTweensOf([state, ui.swing, ui.open, ui.close, ui.hint, ui.line, ui.title, ui.cursor].concat(items, ui.markers, all('.cvbh__flap-d', root)));
      instances.delete(root);
    }
  };
  instances.set(root, api);
  root.cvBeltHero = api;
}

function boot(scope) {
  all(SELECTOR, scope || document).forEach(mount);
}
boot();
document.addEventListener('shopify:section:load', (e) => boot(e.target));
document.addEventListener('shopify:section:unload', (e) => {
  all(SELECTOR, e.target).forEach((root) => { const inst = instances.get(root); if (inst) inst.destroy(); });
});
document.addEventListener('shopify:block:select', (e) => {
  const item = e.target.closest ? e.target.closest('[data-cvbh-item]') : null;
  const root = item && item.closest(SELECTOR);
  const inst = root && instances.get(root);
  if (inst) { inst.close(); inst.setMode('belt'); inst.goTo(inst.indexOf(item)); }
});
