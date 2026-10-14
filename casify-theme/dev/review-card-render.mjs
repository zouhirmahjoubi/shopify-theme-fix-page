// Renders blocks/cs-review.liquid in several states for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const source = (await readFile(resolve(theme, 'blocks/cs-review.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid', globals: { request: { design_mode: false } } });
engine.registerTag('doc', { parse(token, remain) { let t; while ((t = remain.shift())) if (t.name === 'enddoc') return; }, render() { return ''; } });
engine.registerFilter('t', (key, ...args) => {
  let s = key.split('.').reduce((o, k) => o?.[k], locale) ?? key;
  for (const [k, v] of args.filter(Array.isArray)) s = s.replace(`{{ ${k} }}`, v);
  return s;
});
// Local stand-ins for Shopify image filters, pointing at theme assets.
engine.registerFilter('image_url', img => img);
engine.registerFilter('image_tag', (src, ...args) => {
  const o = Object.fromEntries(args.filter(Array.isArray));
  return `<img src="${src}" alt="${o.alt ?? ''}" loading="lazy">`;
});
const base = { reviewer_name: 'Customer name', review_text: '<p>Layout sample — paste the customer’s own words here.</p>', rating: '5', image_ratio: 'natural' };
const cards = [
  { ...base, review_country: 'Country', review_date: 'Date', review_title: 'Placeholder review title', verified: true },
  { ...base, rating: '4', review_date: 'Date', review_image: '/assets/footer-item-case.webp', image_alt: 'Sample photo' },
  { ...base, review_title: 'Several photos', review_image: '/assets/footer-item-case.webp', review_image_2: '/assets/footer-item-gift.webp', review_image_3: '/assets/footer-item-jar.webp', review_image_4: '/assets/footer-item-gumball.webp', image_ratio: 'square', verified: true }
];
let body = '';
for (const s of cards) body += await engine.parseAndRender(source, { block: { settings: s, shopify_attributes: '' } });
const listHead = '<header class="csp__heading csp__heading--center"><span class="csp__eyebrow">From our customers</span><h2>Customer reviews</h2><p>Stacked list layout — placeholder reviews.</p></header>';
await writeFile(resolve(here, 'review-list-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reviews stacked list</title><link rel="stylesheet" href="/assets/theme.css"><link rel="stylesheet" href="/assets/casify-cs-blocks.css"></head><body><div class="csp csp--white csp--layout-list"><div class="csp__inner">${listHead}<div class="csp__grid csp__grid--list">${body}</div></div></div></body></html>`);
await writeFile(resolve(here, 'review-card-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Customer review block</title><link rel="stylesheet" href="/assets/theme.css"><link rel="stylesheet" href="/assets/casify-cs-blocks.css"></head><body><div class="csp csp--cream"><div class="csp__inner"><div class="csp__grid csp__grid--3">${body}</div></div></div></body></html>`);
console.log('dev/review-card-preview.html');
