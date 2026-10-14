// Renders the low-stock pill and snippets/cv-sales-note.liquid states for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
function makeEngine(design) {
  const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid', globals: { request: { design_mode: design } } });
  engine.registerTag('doc', { parse(token, remain) { let t; while ((t = remain.shift())) if (t.name === 'enddoc') return; }, render() { return ''; } });
  engine.registerFilter('t', (key, ...args) => {
    let s = key.split('.').reduce((o, k) => o?.[k], locale) ?? key;
    for (const [k, v] of args.filter(Array.isArray)) s = s.replace(`{{ ${k} }}`, v);
    return s;
  });
  return engine;
}
const engines = { true: makeEngine(true), false: makeEngine(false) };
const product = n => ({ metafields: { custom: { sold_recently: n == null ? null : { value: n } } } });
const block = (tone, extra = {}) => ({ shopify_attributes: '', settings: { metafield: 'custom.sold_recently', text: '[count] sold this week', min_count: 5, tone, ...extra } });
const render = (b, p, design) => engines[design].parseAndRender(`{% render 'cv-sales-note', block: block, product: product %}`, { block: b, product: p });
const rows = [
  ['Low stock, pill style (real inventory, e.g. 3 left)', '<p class="cvc__stock cvc__stock--pill" role="status"><span class="cvc__stock-dot" aria-hidden="true"></span><span>Only 3 left in this style</span></p>'],
  ['Low stock, plain line style', '<p class="cvc__stock cvc__stock--line" role="status"><span class="cvc__stock-dot" aria-hidden="true"></span><span>Only 3 left in this style</span></p>'],
  ['Sales note, yellow (metafield = 18)', await render(block('gold'), product(18), false)],
  ['Sales note, teal (metafield = 18)', await render(block('teal'), product(18), false)],
  ['Rocket line, metafield = 537, round down to 50', await render(block('gold', { style: 'rocket', text: 'Hurry up! [count] items have been sold', metafield: 'custom.total_sold', round_to: '50' }), { metafields: { custom: { total_sold: { value: 537 } } } }, false)],
  ['Rocket line, exact number (metafield = 18)', await render(block('gold', { style: 'rocket' }), product(18), false)],
  ['Sales note, metafield = 3 (below minimum 5) → hidden', (await render(block('gold'), product(3), false)) || '<em>(nothing rendered)</em>'],
  ['Sales note, metafield empty → hidden', (await render(block('gold'), product(null), false)) || '<em>(nothing rendered)</em>'],
  ['Same, in the theme editor', await render(block('gold'), product(null), true)]
];
const body = rows.map(([label, html]) => `<div class="row"><small>${label}</small>${html}</div>`).join('');
await writeFile(resolve(here, 'pills-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stock and sales pills</title><link rel="stylesheet" href="/assets/theme.css"><link rel="stylesheet" href="/assets/cv-pdp-counter.css"><style>body{background:var(--cream-100)}.wrap{max-width:460px;margin:40px auto;padding:0 16px}.row{padding:12px 0;border-bottom:1px dashed var(--cream-400)}.row small{display:block;font:11px var(--font-label);color:var(--cocoa-500)}</style></head><body><div class="wrap cvc">${body}</div></body></html>`);
console.log('dev/pills-preview.html');
