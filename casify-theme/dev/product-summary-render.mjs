// Renders snippets/cv-product-summary.liquid under a product title for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid', globals: { request: { design_mode: false } } });
engine.registerTag('doc', { parse(t, r) { let x; while ((x = r.shift())) if (x.name === 'enddoc') return; }, render() { return ''; } });
engine.registerFilter('t', (k, ...a) => { let s = k.split('.').reduce((o, p) => o?.[p], locale) ?? k; for (const [n, v] of a.filter(Array.isArray)) s = s.replace('{{ ' + n + ' }}', v); return s; });
engine.registerFilter('money', c => '$' + (Number(c) / 100).toFixed(2));
const settings = { external_review_rating: '4.9', external_review_count: '952', reviews_anchor: 'cvc-reviews' };
const block = s => ({ settings: { rating_source: 'auto', show_price: true, save_style: 'amount', tagline: 'Premium woven texture. Strong magnetic connection. Everyday protection for your iPhone', tagline_metafield: '', ...s }, shopify_attributes: '' });
const product = { id: 1, title: 'Tech Fabric Magnetic Phone Case', metafields: { reviews: {} } };
const other = { id: 2, title: 'Transparent Magnetic Phone Case', metafields: { reviews: {} } };
const render = (b, variant, compare, prod = product) => engine.parseAndRender(`{% render 'cv-product-summary', block: block, product: product, variant: variant, settings: settings %}`, { block: b, product: prod, variant, compare, settings });
const rows = [
  ['Tech Fabric case, real compare-at $59.99 → was-price + Save; pitch shown', await render(block({ pitch_products: [product] }), { price: 4999, compare_at_price: 5999 }, 5999)],
  ['Tech Fabric case, no compare-at (fallback ignored) → no was-price, no Save', await render(block({ pitch_products: [product] }), { price: 4999, compare_at_price: null }, 5999)],
  ['Transparent case (not in pitch list) → no pitch line', await render(block({ pitch_products: [product] }), { price: 4999, compare_at_price: null }, 0, other)]
];
const body = rows.map(([l, h]) => `<p class="lbl">${l}</p><h1 class="cvc__title">Woven MagSafe Case</h1>${h}`).join('<hr>');
await writeFile(resolve(here, 'product-summary-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product summary block</title><link rel="stylesheet" href="/assets/theme.css"><link rel="stylesheet" href="/assets/cv-pdp-counter.css"><style>body{background:var(--cream-100)}.wrap{max-width:560px;margin:30px auto;padding:0 20px}.lbl{margin:18px 0 6px;font:11px var(--font-label);color:var(--cocoa-500)}hr{border:0;border-top:1px dashed var(--cream-400);margin:22px 0}</style></head><body><div class="cvc"><div class="wrap">${body}</div></div></body></html>`);
console.log('dev/product-summary-preview.html');
