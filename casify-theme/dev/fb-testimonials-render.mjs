// Renders sections/facebook-testimonials.liquid with layout-sample blocks for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const source = (await readFile(resolve(theme, 'sections/facebook-testimonials.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid' });
engine.registerFilter('asset_url', v => `/assets/${v}`);
engine.registerFilter('stylesheet_tag', v => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('t', (key, ...args) => {
  let s = key.split('.').reduce((o, k) => o?.[k], locale) ?? key;
  for (const [k, v] of args.filter(Array.isArray)) s = s.replace(`{{ ${k} }}`, v);
  return s;
});
const sample = (id, s) => ({ id, type: 'post', shopify_attributes: '', settings: s });
const blocks = [
  sample('a', { author: 'Customer name', post_time: 'Date', post_text: '<p>Layout sample: the customer’s original Facebook post text appears here.</p>', reactions_text: '00', comments_text: '0 comments', shares_text: '0 shares', reply_1_author: 'Casify', reply_1_text: 'Layout sample reply from the shop.', source_url: '#' }),
  sample('b', { author: 'Customer name', post_text: '<p>Layout sample without counts or replies. Only fields you fill in are shown.</p>' }),
  sample('c', { author: 'Customer name', post_time: 'Date', post_text: '<p>Layout sample with a longer post, to check how cards of different lengths sit together in the carousel and the grid on small screens.</p>', reply_1_author: 'Reply author', reply_1_text: 'Layout sample reply.', reply_2_author: 'Reply author', reply_2_text: 'Second layout sample reply.' }),
  sample('d', { author: 'Customer name', post_text: '<p>Fourth layout sample card.</p>', comments_text: '0 comments' })
];
const layout = process.argv[2] || 'carousel';
const section = { id: 'preview', blocks, settings: { heading: 'Seen on Facebook', accent_text: 'From our community', intro: 'Local layout preview — all names and text below are placeholders.', surface: 'cream', layout, float_cards: true } };
const html = await engine.parseAndRender(source, { section, request: { design_mode: false } });
await writeFile(resolve(here, `fb-testimonials-${layout}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Facebook testimonials preview</title><link rel="stylesheet" href="/assets/theme.css"></head><body>${html}</body></html>`);
console.log(`dev/fb-testimonials-${layout}.html`);
