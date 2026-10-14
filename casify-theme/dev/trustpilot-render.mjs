// Renders sections/trustpilot-reviews.liquid with placeholder blocks for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const source = (await readFile(resolve(theme, 'sections/trustpilot-reviews.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
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
const review = (id, s) => ({ id, type: 'review', shopify_attributes: '', settings: s });
const blocks = [
  review('a', { rating: '5', title: 'Placeholder review title', text: '<p>Layout sample: paste the reviewer’s words from Trustpilot here.</p>', author: 'Reviewer name', date: 'Date' }),
  review('b', { rating: '4', text: '<p>Layout sample without a title, to check spacing.</p>', author: 'Reviewer name' }),
  review('c', { rating: '5', title: 'Longer placeholder title that wraps', text: '<p>Layout sample with a longer review to see how cards of different lengths line up in the carousel and grid.</p>', author: 'Reviewer name', date: 'Date' }),
  review('d', { rating: '0', text: '<p>Fourth layout sample, no star rating.</p>', author: 'Reviewer name' })
];
const layout = process.argv[2] || 'carousel';
const section = { id: 'preview', blocks, settings: { heading: 'Rated on Trustpilot', accent_text: 'Straight from our shoppers', intro: 'Local layout preview — rating, names and text below are placeholders.', profile_url: '#', trustscore: 4.5, total_reviews: 0, link_label: 'Read all reviews on Trustpilot', surface: 'white', layout } };
const html = await engine.parseAndRender(source, { section, request: { design_mode: false } });
await writeFile(resolve(here, `trustpilot-${layout}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trustpilot reviews preview</title><link rel="stylesheet" href="/assets/theme.css"></head><body>${html}</body></html>`);
console.log(`dev/trustpilot-${layout}.html`);
