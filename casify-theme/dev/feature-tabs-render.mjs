// Renders sections/cv-feature-tabs.liquid with placeholder tabs for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const source = (await readFile(resolve(theme, 'sections/cv-feature-tabs.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid' });
engine.registerTag('doc', { parse(token, remain) { let t; while ((t = remain.shift())) if (t.name === 'enddoc') return; }, render() { return ''; } });
engine.registerFilter('asset_url', v => `/assets/${v}`);
engine.registerFilter('stylesheet_tag', v => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('t', key => key.split('.').reduce((o, k) => o?.[k], locale) ?? key);
const tab = (id, s) => ({ id, type: 'tab', shopify_attributes: '', settings: { text: '<p>Layout sample — describe this feature of your cases here.</p>', ...s } });
const blocks = [
  tab('a', { label: 'Protection', icon: 'drop-shield', tone: 'red', heading: 'Placeholder feature heading', video: { sources: [{ url: '/assets/hero-retro.mp4', mime_type: 'video/mp4' }] }, link: '#', link_label: 'Shop cases' }),
  tab('b', { label: 'Charging', icon: 'wireless-charge', tone: 'teal' }),
  tab('c', { label: 'Fit', icon: 'precision-fit', tone: 'gold' }),
  tab('d', { label: 'Gifting', icon: 'gift', tone: 'red' })
];
const section = { id: 'preview', blocks, settings: { heading: 'Made for the way you carry', intro: 'Local layout preview — tab text below is placeholder.', surface: 'cream' } };
const html = await engine.parseAndRender(source, { section, request: { design_mode: false } });
await writeFile(resolve(here, 'feature-tabs-preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feature tabs preview</title><link rel="stylesheet" href="/assets/theme.css"></head><body>${html}<script src="/assets/gsap.min.js"></script><script src="/assets/gsap-init.js"></script><script src="/assets/cv-feature-tabs.js"></script></body></html>`);
console.log('dev/feature-tabs-preview.html');
