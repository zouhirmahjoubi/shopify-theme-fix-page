// Renders sections/cv-offer-courier.liquid with placeholder settings for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const source = (await readFile(resolve(theme, 'sections/cv-offer-courier.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid' });
engine.registerFilter('asset_url', v => `/assets/${v}`);
engine.registerFilter('stylesheet_tag', v => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('url_encode', v => encodeURIComponent(v));
engine.registerFilter('t', key => key.split('.').reduce((o, k) => o?.[k], locale) ?? key);
const section = { id: 'preview', settings: {
  eyebrow: 'From the counter', heading: 'Placeholder offer heading', text: '<p>Layout sample — your real offer details go here.</p>',
  code: 'SAMPLECODE', apply_code: true, button_label: 'Shop the offer', link: '/collections/all', fine_print: 'Layout sample fine print.',
  tone: 'red', bubble_before: "Hold on — I've got something for you!", bubble_after: 'Here you go!'
} };
const html = await engine.parseAndRender(source, { section, routes: { root_url: '/', all_products_collection_url: '/collections/all' }, request: { design_mode: false } });
const spacer = '<div style="height:70vh;display:grid;place-items:center;font:14px monospace;color:#8a5a3c">Scroll down ↓ (local preview, placeholder text)</div>';
await writeFile(resolve(here, 'offer-courier-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offer delivery preview</title><link rel="stylesheet" href="/assets/theme.css"></head><body>${spacer}${html}<div style="height:40vh"></div><script src="/assets/gsap.min.js"></script><script src="/assets/gsap-ScrollTrigger.min.js"></script><script src="/assets/gsap-init.js"></script><script src="/assets/cv-offer-courier.js"></script></body></html>`);
console.log('dev/offer-courier-preview.html');
