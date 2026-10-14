// Renders snippets/cv-stars.liquid inside each real context's wrapper + stylesheet,
// to check the site-wide glossy stars against every section's own CSS.
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid' });
engine.registerTag('doc', { parse(token, remain) { let t; while ((t = remain.shift())) if (t.name === 'enddoc') return; }, render() { return ''; } });
const stars = (fill, cls = '') => engine.parseAndRender(`{% render 'cv-stars', fill: fill, class: cls %}`, { fill, cls });

const css = ['theme.css', 'cv-pdp-counter.css', 'cv-pdp-extras.css', 'cv-pdp-home.css', 'cv-social-proof.css', 'cv-scrolling-reviews.css', 'cv-trustpilot.css', 'casify-trustpilot-reviews.css', 'cv-google-rating.css', 'casify-customer-reviews.css', 'casify-cs-blocks.css'];
const rows = [
  ['Product page rating (cv-product-counter)', `<div class="cvc">${await stars(92, 'cvc__stars')} <span style="font:13px var(--font-label)">4.6 · 128 reviews</span></div>`],
  ['Product showcase card (cv-pdp-showcase)', `<div class="cvw">${await stars(80, 'cvw-card__stars')}</div>`],
  ['Reviews chalkboard (cv-pdp-reviews)', `<div class="cvw" style="background:#2f3b36;padding:14px;border-radius:8px"><p class="cvw-board__stars">${await stars(90, 'cvw-board__stars-row')}</p></div>`],
  ['Home social proof (cv-social-proof, no product CSS on that page)', `<div class="cvp-proof__stars">${await stars(96, 'cvp-proof__stars-row')}</div>`],
  ['Home UGC video clip (cv-ugc, on dark video)', `<div style="background:#33231a;padding:12px;border-radius:8px"><span class="cv-clip__stars" role="img" aria-label="4 out of 5">${await stars(80)}</span></div>`],
  ['Scrolling reviews (cv-scrolling-reviews)', `<div class="cvsr">${await stars(100, 'cvsr-card__stars')}</div>`],
  ['Trustpilot plaque (cv-trustpilot)', `<div class="cvtr"><span class="cvtr-plaque__stars">${await stars(94)}</span></div>`],
  ['Trustpilot reviews summary (trustpilot-reviews)', `<div class="cvtp"><span class="cvtp__stars" style="font-size:1.05rem">${await stars(90)}</span></div>`],
  ['Google rating badge', `<div class="cvgr" style="margin:0"><span class="cvgr__inner"><span class="cvgr__stars">${await stars(88)}</span><span class="cvgr__text">Rated <strong>4.4/5</strong> on Google</span></span></div>`],
  ['Customer reviews carousel — summary + card', `<div class="ccr" style="padding:0;background:none"><div class="ccr__summary" style="margin:0 0 10px"><span class="ccr__summary-star cv-star-solo" aria-hidden="true"></span><strong>4.8 / 5</strong><span class="ccr__summary-context">from 12 rated reviews</span></div><div class="ccr__stars">${await stars(80)}</div></div>`],
  ['Star rating block (Ratings & reviews)', `<div class="csp" style="padding:0;background:none"><span class="csp-rating__stars">${await stars(92)}</span></div>`],
  ['Star rating block, outlined empty stars', `<div class="csp" style="padding:0;background:none"><div class="csp-stars--outlined"><span class="csp-rating__stars">${await stars(60)}</span></div></div>`]
];
const body = rows.map(([label, html]) => `<div class="row"><small>${label}</small>${html}</div>`).join('');
await writeFile(resolve(here, 'stars-everywhere.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stars everywhere</title>${css.map(f => `<link rel="stylesheet" href="/assets/${f}">`).join('')}<style>body{background:var(--cream-100)}.wrap{max-width:560px;margin:30px auto;padding:0 16px}.row{padding:12px 0;border-bottom:1px dashed var(--cream-400)}.row>small{display:block;margin-bottom:6px;font:11px var(--font-label);color:var(--cocoa-500)}</style></head><body><div class="wrap">${body}</div></body></html>`);
console.log('dev/stars-everywhere.html');
