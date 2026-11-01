/* Dev only: paste into the preview page's console. Lists text and box overlaps in the swap hero
   and how far the case covers the headline, measured on rendered boxes. */
(() => {
  const root = document.querySelector('[data-cvsw]');
  const R = (el) => el.getBoundingClientRect();
  const shown = (el) => { const r = R(el); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const hit = (a, b) => {
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return x > 0 && y > 0 ? Math.round(x) + 'x' + Math.round(y) : null;
  };
  const textBox = (el) => { const g = document.createRange(); g.selectNodeContents(el); return g.getBoundingClientRect(); };
  const items = {};
  [['card', '[data-cvsw-card]'], ['bag', '[data-cvsw-bag]'], ['more', '[data-cvsw-more]'], ['hint', '[data-cvsw-keep]']].forEach(([k, q]) => {
    const el = root.querySelector(q);
    if (el && shown(el)) items[k] = R(el);
  });
  root.querySelectorAll('[data-cvsw-callout]').forEach((el) => { if (shown(el)) items['callout-' + el.getAttribute('data-cvsw-callout')] = R(el); });
  const hits = [];
  const keys = Object.keys(items);
  keys.forEach((a, i) => keys.slice(i + 1).forEach((b) => {
    if (a.startsWith('callout') && b.startsWith('callout') && getComputedStyle(root.querySelector('.cvsw__callouts')).position === 'static') return;
    const h = hit(items[a], items[b]);
    if (h) hits.push(a + '/' + b + ' ' + h);
  }));
  const title = root.querySelector('.cvsw__title');
  const tb = textBox(title);
  root.querySelectorAll('[data-cvsw-ornament]').forEach((o, i) => {
    if (!shown(o)) return;
    const h = hit(R(o), tb);
    if (h) hits.push('ornament-' + (i + 1) + '/title ' + h);
    const boxes = Object.assign({ panel: R(root.querySelector('.cvsw__panel')), case: R(root.querySelector('[data-cvsw-case]')) }, items);
    Object.keys(boxes).forEach((k) => {
      const b = hit(R(o), boxes[k]);
      if (b) hits.push('ornament-' + (i + 1) + '/' + k + ' ' + b);
    });
  });
  const c = R(root.querySelector('[data-cvsw-case]'));
  const callouts = [...root.querySelectorAll('[data-cvsw-callout]')].filter(shown).map((el) => Math.round(R(el.querySelector('b')).height));
  return {
    w: innerWidth,
    sx: document.documentElement.scrollWidth,
    titleLines: Math.round(R(title).height / parseFloat(getComputedStyle(title).lineHeight)),
    caseOverTitle: Math.round(tb.bottom - c.top),
    caseW: Math.round(c.width),
    panelH: Math.round(R(root.querySelector('.cvsw__panel')).height),
    cardH: Math.round(R(root.querySelector('[data-cvsw-card]')).height),
    calloutTextH: callouts,
    hits,
  };
})();
