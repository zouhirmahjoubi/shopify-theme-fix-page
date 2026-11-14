// Renders sections/cv-belt-hero.liquid with real catalog data for local visual review.
// The nine cases, their prices, options and 3D stills were read from the store on 2026-11-14
// (Admin API, read only). Four are Case blocks (their still is the 3D model's preview picture,
// found by walking the media list); five come from the collection (still in a metafield).
// Run: node dev/belt-hero-render.mjs   then open /dev/belt-hero-preview.html on the static server.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const raw = await readFile(resolve(theme, 'sections/cv-belt-hero.liquid'), 'utf8');
const schema = JSON.parse(raw.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
const source = raw.replace(/{% schema %}[\s\S]*?{% endschema %}/, '');

const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid' });
engine.registerFilter('asset_url', (v) => `/assets/${v}`);
engine.registerFilter('stylesheet_tag', (v) => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('money', (cents) => `$${(Number(cents) / 100).toFixed(2)}`);
const named = (args) => Object.fromEntries(args.filter(Array.isArray));
const sized = (src, w) => `${src}${src.includes('?') ? '&' : '?'}width=${w}`;
engine.registerFilter('image_url', (img, ...args) => {
  if (!img) return '';
  const width = named(args).width || img.width;
  return { src: sized(img.src, width), base: img.src, width, height: Math.round((width * img.height) / img.width) };
});
engine.registerFilter('image_tag', (img, ...args) => {
  if (!img) return '';
  const a = named(args);
  const srcset = String(a.widths || '').split(',').map((w) => w.trim()).filter(Boolean).map((w) => `${sized(img.base, w)} ${w}w`).join(', ');
  const attrs = [`src="${img.src}"`, srcset && `srcset="${srcset}"`, a.sizes && `sizes="${a.sizes}"`, `width="${img.width}"`, `height="${img.height}"`, `alt="${a.alt ?? ''}"`,
    a.loading && `loading="${a.loading}"`, a.fetchpriority && `fetchpriority="${a.fetchpriority}"`, a.decoding && `decoding="${a.decoding}"`, a.class && `class="${a.class}"`, a.draggable && `draggable="${a.draggable}"`];
  return `<img ${attrs.filter(Boolean).join(' ')}>`;
});

// ---- the cases, as the store holds them ----
const CDN = 'https://cdn.shopify.com/s/files/1/0793/5515/0413/files/';
const still = (file) => ({ src: CDN + file, width: 1854, height: 1724, alt: '' });
const phones = [
  ...['18 Pro Max', '18 Pro', '17e', '17 Air', '17 Pro Max', '17 Pro', '17', '16e', '16 Pro Max', '16 Pro', '16 Plus', '16', '15 Pro Max', '15 Pro', '15 Plus', '15', '14 Pro Max', '14 Pro', '14 Plus', '14', '13 Pro Max', '13 Pro', '13', '13 Mini', '12 Pro Max', '12 Pro', '12', '12 Mini', '11'].map((m) => `iPhone ${m}`),
  ...['9 Pro XL', '9 Pro', '9', '8 Pro', '8'].map((m) => `Google Pixel ${m}`),
  ...['S26 Ultra', 'S26 Plus', 'S26', 'S25 Ultra', 'S25 Plus', 'S25', 'S24 Ultra', 'S24 Plus', 'S24', 'S23 Ultra', 'S23 Plus', 'S23', 'S22 Ultra', 'S22 Plus', 'S22'].map((m) => `Samsung Galaxy ${m}`)
];
let nextId = 9000;
const product = (name, handleStem, file, route) => {
  const handle = `${handleStem}-phone-case-for-iphone-samsung-pixel-tough-case`;
  const picture = still(file);
  return {
    id: nextId++,
    title: `${name} Phone Case for iPhone, Samsung & Pixel | Tough Case`,
    handle,
    url: `/products/${handle}`,
    price: 3799,
    compare_at_price: 5999,
    price_varies: false,
    available: true,
    featured_image: { src: CDN + 'placeholder.jpg', width: 2048, height: 2048 },
    options_with_values: [{ name: 'Size', values: phones }, { name: 'Surface', values: ['Glossy', 'Matte'] }],
    // "model": the still is the 3D model's preview picture, last in the media list. "file": a metafield.
    media: route === 'model' ? [{ media_type: 'image' }, { media_type: 'image' }, { media_type: 'model', preview_image: picture }] : [{ media_type: 'image' }],
    metafields: { casify: { model_still: { value: route === 'file' ? picture : null } } }
  };
};
const picks = [
  [product('Snow Day Penguin Christmas', 'snow-day-penguin-christmas', 'preview_images/snow-day-penguin-tough-case-3d-still.png?v=1793759392', 'model'), ''],
  [product('Hot Cocoa Season Christmas', 'hot-cocoa-season-christmas', 'preview_images/hot-cocoa-season-tough-3d-still.png?v=1793761601', 'model'), ''],
  [product('Beary Christmas Polar Bear', 'beary-christmas-polar-bear', 'preview_images/beary-christmas-polar-bear-tough-3d-still.png?v=1793761601', 'model'), 'Beary Christmas'],
  [product('Merry & Bright Fox Christmas', 'merry-bright-fox-christmas', 'preview_images/merry-bright-fox-tough-3d-still.png?v=1793761489', 'model'), '']
];
const shelf = [
  product('Candy Canes Retro Pantry Christmas', 'candy-canes-retro-pantry-christmas', 'candy-canes-retro-pantry-tough-3d-still.png?v=1793992172', 'file'),
  product('Vintage Glass Ornaments Christmas', 'vintage-glass-ornaments-christmas', 'vintage-glass-ornaments-tough-3d-still.png?v=1793991885', 'file'),
  product('Dear Santa Embroidered Christmas', 'dear-santa-embroidered-christmas', 'dear-santa-embroidered-tough-3d-still.png?v=1793991885', 'file'),
  product('Oh Deer Patchwork Bunny Christmas', 'oh-deer-patchwork-bunny-christmas', 'oh-deer-patchwork-bunny-tough-3d-still.png?v=1794160682', 'file'),
  product('Jingle Bells Moroccan Tile Christmas', 'jingle-bells-moroccan-tile-christmas', 'jingle-bells-moroccan-tile-tough-3d-still.png?v=1793991417', 'file')
];
const collection = { title: 'Tough cases', url: '/collections/tough-cases', products_count: 163, products: [picks[0][0], ...shelf] };

const defaults = Object.fromEntries(schema.settings.filter((s) => s.id).map((s) => [s.id, s.default ?? '']));
const section = {
  id: 'preview',
  settings: { ...defaults, collection },
  blocks: picks.map(([p, name], i) => ({ id: `case-${i}`, type: 'case', shopify_attributes: `data-shopify-editor-block="case-${i}"`, settings: { product: p, name } }))
};
const hero = await engine.parseAndRender(source, {
  section,
  settings: { cv_free_shipping_all: true },
  shop: { name: 'Casify' },
  collections: { all: collection },
  request: { design_mode: false }
});
const fonts = await engine.parseAndRender(await readFile(resolve(theme, 'snippets/cv-fonts.liquid'), 'utf8'), {});
const gsap = await engine.parseAndRender(await readFile(resolve(theme, 'snippets/gsap.liquid'), 'utf8'), {});

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Belt hero preview</title>
${fonts}
<link rel="stylesheet" href="/assets/theme.css">
<link rel="stylesheet" href="/assets/cv-eyes.css">
<style>
  /* Stand-ins for the store header (142px on phones, 154px on wide screens, sticky) and the next section. */
  .dev-header { position: sticky; top: 0; z-index: 50; display: grid; place-items: center; height: 142px; background: var(--cream-50); border-bottom: 2px solid var(--red-500); font: 12px/1 var(--font-label); letter-spacing: .14em; text-transform: uppercase; color: var(--cocoa-400); }
  @media (min-width: 990px) { .dev-header { height: 154px; } }
  .dev-next { display: grid; place-items: center; height: 70vh; font: 12px/1 var(--font-label); letter-spacing: .14em; text-transform: uppercase; color: var(--cocoa-400); }
</style>
<script>
  // ?reduce=1 answers the reduced-motion question with yes, so that path can be checked in a
  // browser that cannot switch the preference (the stylesheet's own @media rule is mirrored below).
  if (/[?&]reduce=1/.test(location.search)) {
    var mm = window.matchMedia.bind(window);
    window.matchMedia = function (q) {
      return /prefers-reduced-motion/.test(q) ? { matches: true, media: q, addEventListener: function () {}, removeEventListener: function () {} } : mm(q);
    };
    document.documentElement.classList.add('dev-reduce');
  }
</script>
<style>.dev-reduce .cvbh *, .dev-reduce .cvbh *::before, .dev-reduce .cvbh *::after { transition-duration: 1ms !important; animation: none !important; }</style>
${gsap}
</head>
<body>
<div class="dev-header">Store header (stand-in)</div>
<main id="MainContent">
<div class="shopify-section section-cv-belt-hero">${hero}</div>
<div class="dev-next">Next section (stand-in)</div>
</main>
<script src="/assets/cv-eyes.js" defer></script>
<script>
  // The store's quick pick dialog is not part of this page: note the tap instead of leaving it.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-cvqp-open], .cvbh__t-link, .cvbh__all, .cvbh__title a');
    if (!a) return;
    e.preventDefault();
    window.__devTaps = (window.__devTaps || []).concat([a.getAttribute('data-handle') || a.getAttribute('href')]);
  });
</script>
</body>
</html>
`;
await writeFile(resolve(here, 'belt-hero-preview.html'), page);
// The same page without the section's script: what a shopper sees before it runs, or without JS.
await writeFile(resolve(here, 'belt-hero-preview-nojs.html'), page.replace(/<script type="module"[^>]*cv-belt-hero\.js[^>]*><\/script>/, ''));
console.log('dev/belt-hero-preview.html', `${(page.length / 1024).toFixed(1)} KB`, '+ dev/belt-hero-preview-nojs.html');
