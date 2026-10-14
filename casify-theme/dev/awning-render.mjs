// Renders snippets/cv-awning.liquid on a mock product-photo stage for local visual review.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid' });
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
engine.registerFilter('t', k => k.split('.').reduce((o, p) => o?.[p], locale) ?? k);
engine.registerTag('doc', { parse(t, r) { let x; while ((x = r.shift())) if (x.name === 'enddoc') return; }, render() { return ''; } });
const awning = (tone, stripes) => engine.parseAndRender(`{% render 'cv-awning', show: true, stripes: stripes, tone: tone, swipe: true %}`, { tone, stripes });
const stage = async (tone, stripes, img) => `<div style="width:min(520px,100%)"><div class="cvc__stage cvc__stage--awning-true">${await awning(tone, stripes)}<img class="cvc__photo" id="cvMainImage" src="${img}" alt="Sample product photo"><button type="button" class="cvc__zoom"><span>Tap to zoom</span></button></div></div>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Main image awning</title>
<script>(function(r){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;r.classList.add('cvc-pending');setTimeout(function(){r.classList.remove('cvc-pending')},1400)})(document.documentElement)</script>
<link rel="stylesheet" href="/assets/theme.css"><link rel="stylesheet" href="/assets/cv-pdp-counter.css">
<style>body{background:var(--cream-100)}.wrap{display:grid;gap:28px;justify-items:center;padding:30px 16px}.cvc__stage{width:min(520px,100%)}.lbl{font:11px var(--font-label);color:var(--cocoa-500)}</style></head>
<body><div class="cvc"><div class="wrap">
<p class="lbl">Default product page — red, 16 stripes (scroll or swipe sideways over the awning to switch red / teal; hover for a gust)</p>
${await stage('red', 16, '/assets/footer-item-case.webp')}
<button type="button" id="swap" style="font:12px var(--font-label)">Swap photo</button>
<p class="lbl">Teal, 12 stripes</p>
${await stage('teal', 12, '/assets/footer-item-gift.webp')}
</div></div>
<script src="/assets/gsap.min.js"></script><script src="/assets/gsap-init.js"></script><script type="module" src="/assets/cv-awning.js"></script>
<script>document.getElementById('swap').onclick=function(){var i=document.querySelector('#cvMainImage');i.src=i.src.indexOf('case')>-1?'/assets/footer-item-jar.webp':'/assets/footer-item-case.webp'}</script>
</body></html>`;
await writeFile(resolve(here, 'awning-preview.html'), html);
console.log('dev/awning-preview.html');
