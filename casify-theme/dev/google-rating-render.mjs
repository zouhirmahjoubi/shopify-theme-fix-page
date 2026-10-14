// Renders snippets/cv-google-rating.liquid with placeholder values for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid' });
engine.registerTag('doc', { parse(token, remain) { let t; while ((t = remain.shift())) if (t.name === 'enddoc') return; }, render() { return ''; } });
engine.registerFilter('asset_url', v => `/assets/${v}`);
engine.registerFilter('stylesheet_tag', v => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('t', (key, ...args) => {
  let s = key.split('.').reduce((o, k) => o?.[k], locale) ?? key;
  for (const [k, v] of args.filter(Array.isArray)) s = s.replace(`{{ ${k} }}`, v);
  return s;
});
const variants = [
  { rating: '4.4', review_count: '000', headline: 'Placeholder', reviews_url: '#' },
  { rating: '4.4' }
];
let body = '';
for (const settings of variants) body += await engine.parseAndRender(`{% render 'cv-google-rating', block: block %}`, { block: { settings, shopify_attributes: '' }, request: { design_mode: false } });
await writeFile(resolve(here, 'google-rating-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google rating preview</title><link rel="stylesheet" href="/assets/theme.css"></head><body style="background:var(--cream-100)"><div style="max-width:440px;margin:60px auto;padding:0 16px">${body}</div></body></html>`);
console.log('dev/google-rating-preview.html');
