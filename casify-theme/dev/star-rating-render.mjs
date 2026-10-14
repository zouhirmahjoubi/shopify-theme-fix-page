// Renders blocks/cs-rating.liquid in its layouts for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const source = (await readFile(resolve(theme, 'blocks/cs-rating.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid', globals: { request: { design_mode: false } } });
engine.registerTag('doc', { parse(token, remain) { let t; while ((t = remain.shift())) if (t.name === 'enddoc') return; }, render() { return ''; } });
const product = { metafields: { reviews: { rating: { value: { rating: 4.6, scale_max: 5 } }, rating_count: { value: 128 } } } };
const base = { source: 'product', rating_product: null, manual_rating: 0, label: '', layout: 'card', alignment: 'start', empty_style: 'full', scroll_id: '', inline_style: 'pill', inline_size: 18, visibility: 'all' };
const rows = [
  ['Score card (placeholder review data: 4.6 from 128)', { }],
  ['Score card, outlined empty stars', { empty_style: 'outlined' }],
  ['Compact row, left, links to #reviews', { layout: 'inline', scroll_id: 'reviews' }],
  ['Compact row, centred, outlined, with label', { layout: 'inline', alignment: 'center', empty_style: 'outlined', label: 'Verified buyers' }],
  ['Compact row, plain style (no background), 24px', { layout: 'inline', inline_style: 'plain', inline_size: 24 }],
  ['Compact row, plain, small 13px, centred', { layout: 'inline', inline_style: 'plain', inline_size: 13, alignment: 'center' }],
  ['Compact row, desktop only (hidden below 769px)', { layout: 'inline', visibility: 'desktop' }],
  ['Compact row, right, manual confirmed rating 4.2 (no count)', { layout: 'inline', alignment: 'end', source: 'manual', manual_rating: 4.2 }]
];
let body = '';
for (const [label, s] of rows) body += `<p class="lbl">${label}</p><div class="csp__grid">` + await engine.parseAndRender(source, { block: { settings: { ...base, ...s }, shopify_attributes: '' }, product }) + '</div>';
await writeFile(resolve(here, 'star-rating-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Star rating block</title><link rel="stylesheet" href="/assets/theme.css"><link rel="stylesheet" href="/assets/casify-cs-blocks.css"><style>.lbl{margin:22px 0 8px;font:11px var(--font-label);color:var(--cocoa-500)}.csp__grid{max-width:520px}</style></head><body><div class="csp csp--cream"><div class="csp__inner">${body}</div></div></body></html>`);
console.log('dev/star-rating-preview.html');
