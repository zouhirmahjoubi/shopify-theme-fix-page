/* Casify commerce motion (every page, after cart.js): listens, owns no state, delegated on
 * document. Contract: dev/motion-store-adapt/PLAN.md INF-3. */
(() => {
'use strict';
if (window.CasifyMotion) return;
const D = document, H = D.documentElement, W = window, gsap = W.gsap, live = [], claims = {}, CT = 'transform,opacity';
let on = 0, lines = {}, count = null, total = null, cvT = 0, auto = 0;
const one = (q, c) => (c || D).querySelector(q);
const all = (q, c) => [...(c || D).querySelectorAll(q)];
const hear = (n, f) => D.addEventListener(n, f);
const box = n => n.getBoundingClientRect();
const hide = n => { n.setAttribute('aria-hidden', 'true'); return n; };
const mk = (t, c, p) => { const n = D.createElement(t); n.className = c; return p.appendChild(n); };

function run(build, after) {
  if (!on) { after?.(); return null; }
  const tl = gsap.timeline({defaults:{duration:.42,ease:'power3.out'},onComplete:() => {
    live.splice(live.indexOf(tl) >>> 0, 1); after?.();
  }});
  build(tl); live.push(tl);
  if (D.hidden) tl.progress(1);
  return tl;
}
const finishAll = () => live.slice().forEach(t => t.progress(1));
const tw = (n, a, b) => n && run(tl => tl.fromTo(n, a, b));
const shake = (n, k) => n && run(tl => tl.set(n, {transition:'none'})
  .to(n, {keyframes:{x:k || [0, -10, 9, -7, 5, -2, 0]},duration:.45,ease:'none'}).set(n, {clearProps:'transform,transition'}));
const money = (c, f) => W.CasifyMoney ? W.CasifyMoney.format(c, f) : (f || W.themeMoneyFormat || '${{amount}}')
  .replace(/\{\{\s*(\w+)\s*\}\}/, (m, k) => {
    const [i, d] = (c / 100).toFixed(/no_dec/.test(k) ? 0 : 2).split('.'), x = /comma|space/.test(k);
    return i.replace(/\B(?=(\d{3})+$)/g, /apos/.test(k) ? "'" : /space/.test(k) ? ' ' : x ? '.' : ',') + (d ? (x ? ',' : '.') + d : '');
  });

function bag(t) {
  for (const n of [t, one('[data-cvm-bag]'), one('#bagBtn')]) {
    const r = n?.nodeType === 1 && box(n);
    if (r && r.width && r.bottom > 0 && r.top < innerHeight) return r;
  }
  return {left:innerWidth - 60,top:-40,width:40,height:40};
}
function fly(from, o = {}) {
  return new Promise(done => {
    const r = from?.nodeType === 1 && box(from);
    if (!on || !r || !(r.width || r.height) || D.hidden) return done();
    W.CasifyBag?.show();
    const tk = hide(mk('span', 'cvm-token', D.body));
    if (o.img) { const i = mk('img', '', tk); i.alt = ''; i.src = o.img; }
    if (o.qty > 1) mk('b', 'cvm-token__qty', tk).textContent = '×' + o.qty;
    if (tk.showPopover) { tk.setAttribute('popover', 'manual'); try { tk.showPopover(); } catch {} }
    const h = tk.offsetWidth / 2, sx = r.left + r.width / 2 - h, sy = r.top + r.height / 2 - h, fade = {opacity:0,duration:.12};
    const end = () => { const b = bag(o.target); return {x:b.left + b.width / 2 - h,y:b.top + b.height / 2 - h}; };
    run(tl => {
      const arc = {duration:.8,ease:'power2.in',scale:.32,rotation:300};
      tl.set(tk, {x:sx,y:sy,scale:.3,rotation:-30,opacity:0}).to(tk, {opacity:1,scale:1,rotation:0,y:sy - 48,duration:.36,ease:'back.out(2.2)'});
      if (window.MotionPathPlugin) tl.add(() => {
        const e = end();
        arc.motionPath = {path:[{x:sx + (e.x - sx) * .4,y:Math.max(8, Math.min(sy, e.y) - 150)}, e],curviness:1.3};
        tl.to(tk, arc, tl.time()).to(tk, fade, '-=0.1');
      });
      else tl.to(tk, Object.assign(arc, {ease:'power1.out',x:() => end().x}))
        .to(tk, {duration:.8,ease:'power2.in',y:() => end().y}, '<').to(tk, fade, '-=0.1');
    }, () => { tk.remove(); done(); });
  });
}

const stateOf = t => ['error', 'done', 'busy'].find(s => t.classList.contains('is-' + s)) || 'idle';
function button(b, s) {
  if (!b) return;
  const lb = one('[data-cvm-label]', b), p = s === 'done' ? all('[data-cvm-icon] :is(path,polyline,line,circle)', b) : [];
  b._cvmS = s;
  if (s === 'idle' && b._cvmW) { b._cvmW = 0; b.style.width = ''; }
  if (!on) return;
  if (s === 'busy' && !b._cvmW) { b._cvmW = 1; b.style.width = box(b).width + 'px'; }
  if (lb || p.length) run(tl => {
    if (lb) tl.fromTo(lb, {yPercent:100,opacity:0}, {yPercent:0,opacity:1,duration:.24,clearProps:CT}, 0);
    if (p.length && window.DrawSVGPlugin) tl.fromTo(p, {drawSVG:'0%'}, {drawSVG:'100%'}, .08);
  });
  if (s === 'error') shake(b);
}

function strip(g) {
  [g, ...all('*', g)].forEach(n => [...n.attributes].forEach(({name}) => /^(data-|id$|name$|aria-live)/.test(name) && n.removeAttribute(name)));
  return hide(g);
}
const txt = n => { const r = D.createRange(); r.selectNodeContents(n); return box(r); };
/* The live node gets only the final value; the roll runs on a copy measured over its text. */
function price(n, a, b, o = {}) {
  if (!n) return;
  const fin = o.final ?? money(b, o.format), ln = n.closest('[aria-live]'), p = {v:a}, still = !on || !(a - b);
  let out = n, cp = null;
  n._cvmP?.progress(1);
  if ((ln || still) && n.textContent !== fin) n.textContent = fin;
  if (still || (ln && !n.offsetParent)) return;
  if (ln) {
    cp = out = strip(n.cloneNode(false));
    cp.classList.add('cvm-roll');
    cp.textContent = money(a, o.format);
    n.after(cp);
    const t = txt(n), c = txt(cp);
    cp.style.margin = `${t.top - c.top}px 0 0 ${t.left - c.left}px`;
    n.classList.add('cvm-rolling');
  }
  n._cvmP = run(tl => tl.to(p, {v:b,duration:.4,ease:'power2.out',snap:{v:1},onUpdate:() => { out.textContent = money(p.v, o.format); }}), () => {
    n._cvmP = null;
    if (cp) { cp.remove(); n.classList.remove('cvm-rolling'); } else n.textContent = fin;
  });
}

function place(g, anim) {
  const hl = one('[data-cvm-pack-highlight]', g), r = one('[role="radio"][aria-checked="true"]', g), F = window.Flip;
  if (!hl) return;
  hide(hl);
  if (!r) { hl.style.visibility = 'hidden'; return; }
  anim = anim && on;
  const st = anim && F ? F.getState(hl) : null, old = anim && !st && box(hl), gr = box(g), rr = box(r);
  hl.style.cssText = `visibility:visible;left:${rr.left - gr.left - g.clientLeft}px;top:${rr.top - gr.top - g.clientTop}px;width:${rr.width}px;height:${rr.height}px`;
  if (st) run(tl => tl.add(F.from(st, {duration:.42,ease:'back.out(1.4)'})));
  else if (old && old.width) {
    const nw = box(hl);
    tw(hl, {x:old.left - nw.left,y:old.top - nw.top,scaleX:old.width / nw.width,scaleY:old.height / nw.height,transformOrigin:'0 0'},
      {x:0,y:0,scaleX:1,scaleY:1,ease:'back.out(1.4)',clearProps:'transform'});
  }
}
const packs = g => g && place(g);
const stamp = n => tw(n, {scale:1.3,rotation:-6}, {scale:1,rotation:0,ease:'back.out(2)',clearProps:'transform'});
const io = W.IntersectionObserver && new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { io.unobserve(e.target); stamp(e.target); }
}), {threshold:.6});

const HOOK = '[data-cvm-packs],[data-cvm-stamp]';
function scan(n) {
  if (n?.nodeType !== 1) return;
  const l = all(HOOK, n);
  if (n.matches(HOOK)) l.push(n);
  l.forEach(x => x.hasAttribute('data-cvm-packs') ? packs(x) : io?.observe(x));
}
new MutationObserver(ms => {
  const moved = new Set();
  ms.forEach(({target:t, attributeName:a, addedNodes, oldValue}) => {
    const s = a === 'class' && t.hasAttribute('data-cvm-btn') && stateOf(t);
    if (!a) addedNodes.forEach(scan);
    else if (s) s !== (t._cvmS || 'idle') && button(t, s);
    else if (a === 'data-cents') t.hasAttribute('data-cvm-price') && price(t, +oldValue, +t.dataset.cents, {final:t.textContent});
    else if (a === 'aria-checked') moved.add(t.parentNode?.closest('[data-cvm-packs]'));
    else if (a === 'hidden' && !t.hidden && t.hasAttribute('data-cvm-stamp')) stamp(t);
  });
  moved.forEach(g => g && place(g, 1));
}).observe(H, {subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class', 'data-cents', 'aria-checked', 'hidden']});

const receive = () => on && W.CasifyBag?.receive();
hear('cv:cart', () => { clearTimeout(cvT); cvT = setTimeout(receive, 0); });
hear('cart:added', e => {
  const x = e.detail || {}, a = D.activeElement, dlg = a?.closest?.('dialog[open]');
  let f = x.from, w;
  clearTimeout(cvT);
  if (claims[x.source] > 0) return;
  if (f?.nodeType !== 1) return receive();
  if (dlg && !dlg.contains(f)) f = a;
  w = !x.img && f.closest('[data-cvm-fly-img]');
  if (w && w.tagName !== 'IMG') w = one('img', w);
  fly(f, {img:x.img || (w ? w.currentSrc || w.src : ''),qty:x.qty}).then(receive);
});

function remember(d) {
  const t = one('[data-cart-total]', d);
  lines = {}; count = 0;
  all('[data-cvm-line]', d).forEach(l => { lines[l.dataset.key] = l; count += +l.dataset.qty || 0; });
  total = t ? +t.dataset.cents : null;
}
hear('cart:drawer:open', e => {
  const d = e.detail?.drawer || one('#cm-cart-drawer');
  if (!d) return;
  remember(d);
  const head = one('.cart-drawer__head', d), foot = one('[data-cvm-drawer-foot]', d), ls = Object.values(lines);
  run(tl => {
    if (head) tl.from(head, {backgroundPosition:'-36px 0px',clearProps:'backgroundPosition'}, 0);
    if (ls.length) tl.from(ls, {y:12,opacity:0,duration:.35,stagger:.05,clearProps:CT}, .06);
    if (foot) tl.from(foot, {y:10,opacity:0,duration:.35,clearProps:CT}, '>-0.2');
  });
});
function flash(l) {
  const c = gsap.utils.splitColor(getComputedStyle(H).getPropertyValue('--gold-200').trim() || '#F0E2C2'), img = one('img', l);
  run(tl => {
    tl.fromTo(l, {backgroundColor:`rgba(${c},1)`}, {backgroundColor:`rgba(${c},0)`,duration:.9,ease:'power2.out',clearProps:'backgroundColor'}, 0);
    if (img) tl.from(img, {yPercent:-70,duration:.6,ease:'bounce.out',clearProps:'transform'}, 0);
  });
}
function ghost(old, d) {
  const body = one('#cm-cart-drawer-content', d), g = old && strip(old.cloneNode(true));
  let n = old;
  if (!g || !body) return;
  while ((n = n.nextElementSibling) && !lines[n.dataset.key]);
  g.classList.add('cvm-ghost');
  g.inert = true;
  if (n) lines[n.dataset.key].before(g); else body.append(g);
  run(tl => tl.to(g, {height:0,opacity:0,paddingTop:0,paddingBottom:0,borderBottomWidth:0,duration:.3,ease:'power2.in'}), () => g.remove());
}
hear('cart:drawer:refreshed', e => {
  const d = one('#cm-cart-drawer'), x = e.detail || {}, was = count, wasT = total, oldL = lines;
  if (!d) return;
  remember(d);
  if (x.cart?.item_count != null) count = x.cart.item_count;
  if (!on || !d.classList.contains('is-open')) return;
  [...(x.added || []), ...(x.changed || [])].forEach(k => lines[k] && flash(lines[k]));
  (x.removed || []).forEach(k => ghost(oldL[k], d));
  const t = one('[data-cart-total]', d);
  if (t && wasT != null && total != null && wasT !== total) price(t, wasT, total, {final:t.textContent});
  if (was != null && [2, 3].some(k => was < k && count >= k)) stamp(one('[data-cart-nudge]', d) || one('[data-cart-discount]', d));
});

hear('cvs:error', e => {
  const b = e.detail?.button;
  if (b?.nodeType === 1 && !b.hasAttribute('data-cvm-btn')) shake(b);
  tw(one('#cvStatus', e.target), {scale:1.06}, {scale:1,transformOrigin:'0 50%',ease:'back.out(2)',clearProps:'transform'});
});
hear('cvs:needmodel', e => Promise.resolve().then(() => {
  const r = e.target, b = e.detail?.button, a = D.activeElement, t = a && r.contains(a) && a !== b ? a : one('select', r);
  if (!t) return;
  t.classList.add('cvm-ring');
  setTimeout(() => t.classList.remove('cvm-ring'), 1600);
  shake(t, [0, -6, 5, -3, 0]);
}));

const claim = s => { claims[s] = (claims[s] || 0) + 1; };
const release = s => { claims[s] > 0 && claims[s]--; };
/* The Shop Counter motion flies its own 'pdp' and 'set' tickets. */
const autoClaim = () => {
  const c = !!one('[data-cv-pdp="counter"]');
  if (c !== !!auto) { auto = c; ['pdp', 'set'].forEach(c ? claim : release); }
};
autoClaim();

if (gsap?.matchMedia) gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  on = 1; H.classList.add('cvcm-on');
  return () => { finishAll(); on = 0; H.classList.remove('cvcm-on'); };
});
hear('visibilitychange', () => D.hidden && finishAll());
hear('shopify:section:load', e => { autoClaim(); scan(e.target); });
hear('shopify:section:unload', e => { all(HOOK, e.target).forEach(x => io?.unobserve(x)); setTimeout(autoClaim); });

H.classList.add('cvcm-ready');
W.CasifyMotion = {fly, button, price, packs, stamp, claim, release};
scan(D.body);
})();
