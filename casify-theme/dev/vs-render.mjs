// Renders sections/cv-vs.liquid with placeholder rows for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const source = (await readFile(resolve(theme, 'sections/cv-vs.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid', globals: { request: { design_mode: false } } });
engine.registerTag('doc', { parse(token, remain) { let t; while ((t = remain.shift())) if (t.name === 'enddoc') return; }, render() { return ''; } });
engine.registerFilter('asset_url', v => `/assets/${v}`);
engine.registerFilter('stylesheet_tag', v => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('t', key => key.split('.').reduce((o, k) => o?.[k], locale) ?? key);
engine.registerFilter('image_url', img => img);
engine.registerFilter('image_tag', (src, ...args) => `<img src="${src}" alt="${(Object.fromEntries(args.filter(Array.isArray)).alt) ?? ''}">`);
const row = (id, us_text, them_text) => ({ id, type: 'row', shopify_attributes: '', settings: { us_text, them_text } });
const blocks = [
  row('a', 'Placeholder: our point one', 'Placeholder: their point one'),
  row('b', 'Our second point', 'Their second point'),
  row('c', 'A longer point that wraps onto two lines', 'Their longer counterpart that also wraps'),
  row('d', 'Fourth point', 'Fourth counterpart')
];
const section = { id: 'preview', blocks, settings: {
  eyebrow: 'Us vs. them', heading: 'Not all cases are made the same', subheading: 'Local layout preview — every row below is placeholder text.',
  surface: 'cream', us_label: 'Casify', us_image: '/assets/footer-item-case.webp', us_sticker: 'Sticker sample',
  them_label: 'Ordinary cases', them_image: '', note: 'Layout sample note under the table.', button_label: 'Shop cases', button_link: '#', button_note: 'Layout sample small print.'
} };
const html = await engine.parseAndRender(source, { section, shop: { name: 'Casify' }, routes: { all_products_collection_url: '/collections/all' } });
const spacer = '<div style="height:60vh;display:grid;place-items:center;font:14px monospace;color:#8a5a3c">Scroll down ↓ (local preview)</div>';
await writeFile(resolve(here, 'vs-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Us vs. them preview</title><link rel="stylesheet" href="/assets/theme.css"></head><body>${spacer}${html}<div style="height:30vh"></div><script src="/assets/gsap.min.js"></script><script src="/assets/gsap-ScrollTrigger.min.js"></script><script src="/assets/gsap-init.js"></script><script type="module" src="/assets/cv-vs.js"></script></body></html>`);
console.log('dev/vs-preview.html');
