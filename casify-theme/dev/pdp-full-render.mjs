// Renders the real product section (sections/cv-product-counter.liquid) with a mock
// product and the live layout's script order, to test the awning, the price tag and
// the page's own motion scripts together. Mock data only — nothing here ships.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Liquid } from './conversion-home/node_modules/liquidjs/dist/liquid.node.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '..');
const source = (await readFile(resolve(theme, 'sections/cv-product-counter.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const template = JSON.parse(await readFile(resolve(theme, 'templates/product.json'), 'utf8'));
const main = template.sections.main;

const engine = new Liquid({ root: resolve(theme, 'snippets'), extname: '.liquid', globals: { template: { name: 'product' }, request: { design_mode: false }, shop: { money_format: '${{amount}}', name: 'Casify', url: 'http://127.0.0.1:4189' }, routes: { root_url: '/', all_products_collection_url: '/collections/all', cart_add_url: '/cart/add' } } });
engine.registerTag('doc', { parse(t, r) { let x; while ((x = r.shift())) if (x.name === 'enddoc') return; }, render() { return ''; } });
engine.registerFilter('asset_url', v => `/assets/${v}`);
engine.registerFilter('stylesheet_tag', v => `<link rel="stylesheet" href="${v}">`);
engine.registerFilter('money', c => '$' + (Number(c || 0) / 100).toFixed(2));
engine.registerFilter('json', v => JSON.stringify(v));
// Stand-in for Shopify's {% form %}: a plain form around the body (never submitted here).
engine.registerTag('form', {
  parse(token, remain) {
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remain)
      .on('tag:endform', () => stream.stop())
      .on('template', tpl => this.tpls.push(tpl))
      .on('end', () => { throw new Error('form not closed'); });
    stream.start();
  },
  * render(ctx, emitter) {
    emitter.write('<form method="post" action="#" class="cvsu-form" onsubmit="return false">');
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    emitter.write('</form>');
  }
});
engine.registerFilter('md5',v => createHash('md5').update(String(v)).digest('hex'));
engine.registerFilter('image_url', img => (img && (img.src || img)) || '');
engine.registerFilter('image_tag', (src, ...args) => {
  const o = Object.fromEntries(args.filter(Array.isArray));
  return `<img src="${src}" alt="${o.alt ?? ''}"${o.class ? ` class="${o.class}"` : ''}${o.id ? ` id="${o.id}"` : ''}>`;
});
engine.registerFilter('t', (k, ...a) => { let s = k.split('.').reduce((o, p) => o?.[p], locale) ?? k; for (const [n, v] of a.filter(Array.isArray)) s = s.replace('{{ ' + n + ' }}', v); return s; });

const img = (src) => ({ src, alt: 'Sample case photo', width: 1000, height: 1000 });
const media = [
  { id: 11, alt: 'Sample case photo', preview_image: img('/assets/footer-item-case.webp'), media_type: 'image' },
  { id: 12, alt: 'Sample jar photo', preview_image: img('/assets/footer-item-jar.webp'), media_type: 'image' }
];
const v1 = { id: 101, title: 'Russet Brown / iPhone 16', price: 4999, compare_at_price: 5999, available: true, inventory_management: null, inventory_policy: 'deny', inventory_quantity: 20, options: ['Russet Brown', 'iPhone 16'], option1: 'Russet Brown', option2: 'iPhone 16', featured_media: media[0], featured_image: media[0].preview_image };
const v2 = { id: 102, title: 'Olive / iPhone 16', price: 4499, compare_at_price: null, available: true, inventory_management: null, inventory_policy: 'deny', inventory_quantity: 20, options: ['Olive', 'iPhone 16'], option1: 'Olive', option2: 'iPhone 16', featured_media: media[1], featured_image: media[1].preview_image };
const product = {
  id: 1, title: 'Tech Fabric Magnetic Phone Case for iPhone', handle: 'tech-fabric-magnetic-phone-case-for-iphone', vendor: 'Casify', type: 'Case', url: '/products/sample',
  description: '<p>Layout sample description.</p>', price: 4999, available: true, tags: [], collections: [],
  variants: [v1, v2], selected_or_first_available_variant: v1, first_available_variant: v1,
  options: ['Style', 'Model'],
  options_with_values: [
    { name: 'Style', position: 1, values: ['Russet Brown', 'Olive'], selected_value: 'Russet Brown' },
    { name: 'Model', position: 2, values: ['iPhone 16'], selected_value: 'iPhone 16' }
  ],
  media, featured_media: media[0], featured_image: media[0].preview_image, images: media.map(m => m.preview_image),
  metafields: { reviews: {}, custom: {} }
};
// `node dev/pdp-full-render.mjs real` swaps in the live Tech Fabric case's catalogue shape
// (8 colours x 10 models, 13 photos, no compare-at prices), read from Shopify admin.
if (process.argv[2] === 'real') {
  const cdn = 'https://cdn.shopify.com/s/files/1/0816/4953/3173/files/';
  const colours = [['Russet Brown', '635c38c6-4d72-4f21-a609-1c1e6741c6e5'], ['Purple', 'cb5c086c-5307-47fb-93ac-3a45141c04a7'], ['Green', 'aaee739e-83c7-493c-beba-e1b1a7d57975'], ['Black', '3ef7f477-f0d2-4002-96b1-c575a48bcac7'], ['Blue', '03f776ff-5eab-46ac-a617-5f429c439d60'], ['Orange', 'ed1f5fcc-6365-4885-84b6-f26ac0a246e0'], ['Cherry Red', '8671ffb0-1bf0-4b73-9816-78b3d5fa9e02'], ['Distant Peak Blue', '18595e4f-6fc2-4fd6-96b5-dcdf1260f224']];
  const models = ['iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 15 Plus / 14 Plus', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max', 'iPhone 12 / 12 Pro', 'iPhone 12 Pro Max', 'iPhone 11', 'iPhone 11 Pro Max'];
  const heroes = ['1-hero', '2-detail', '3-profile', '4-lifestyle', '5-gift'].map((n, i) => ({ id: 46018824339701 + i, alt: 'Tech Fabric Magnetic Phone Case for iPhone', media_type: 'image', preview_image: { src: `${cdn}casify-p19-${n}.png`, alt: '', width: 2048, height: 2048 } }));
  const swatchMedia = colours.map(([, f], i) => ({ id: 40373579317493 + i, alt: '', media_type: 'image', preview_image: { src: `${cdn}${f}.jpg`, alt: '', width: 800, height: 800 } }));
  let id = 48884942176501;
  const variants = colours.flatMap(([c], ci) => models.map(m => {
    const fm = swatchMedia[ci];
    const v = { id, title: `${c} / ${m}`, price: 4999, compare_at_price: null, available: true, inventory_management: 'shopify', inventory_policy: 'continue', inventory_quantity: 1000, options: [c, m], option1: c, option2: m, featured_media: fm, featured_image: fm.preview_image };
    id += 32768;
    return v;
  }));
  Object.assign(product, {
    handle: 'tech-fabric-magnetic-phone-case-for-iphone', url: '/products/tech-fabric-magnetic-phone-case-for-iphone',
    variants, selected_or_first_available_variant: variants[0], first_available_variant: variants[0],
    options: ['Color', 'Applicable models'],
    options_with_values: [
      { name: 'Color', position: 1, values: colours.map(c => c[0]), selected_value: colours[0][0] },
      { name: 'Applicable models', position: 2, values: models, selected_value: models[0] }
    ],
    collections: [{ handle: 'frontpage', title: 'Home page', url: '/collections/frontpage' }, { handle: 'iphone', title: 'iPhone', url: '/collections/iphone' }],
    media: [...heroes, ...swatchMedia], featured_media: heroes[0], featured_image: heroes[0].preview_image
  });
  product.images = product.media.map(m => m.preview_image);
}

const blocks = main.block_order.map(id => ({ id, type: main.blocks[id].type, settings: main.blocks[id].settings, shopify_attributes: '' }));
const section = { id: 'main', settings: main.settings, blocks };
let html = await engine.parseAndRender(source, { section, product, collection: null });

// `extras`: also render the product template's other sections added from the homepage.
const extras = process.argv.includes('extras') ? ['feature_tabs', 'us_vs_them', 'trustpilot_reviews', 'facebook_testimonials', 'signup', 'offer_delivery'] : [];
for (const id of extras) {
  const data = template.sections[id];
  const src = (await readFile(resolve(theme, 'sections', data.type + '.liquid'), 'utf8')).replace(/{% schema %}[\s\S]*?{% endschema %}/, '');
  const sectionBlocks = (data.block_order || []).map(b => ({ id: b, type: data.blocks[b].type, settings: data.blocks[b].settings, shopify_attributes: '' }));
  html += `<div id="shopify-section-${id}" class="shopify-section">` + await engine.parseAndRender(src, { section: { id, settings: data.settings, blocks: sectionBlocks }, product, collection: null }) + '</div>';
}

const gsapFiles = ['gsap.min.js', 'gsap-CustomEase.min.js', 'gsap-CustomBounce.min.js', 'gsap-CustomWiggle.min.js', 'gsap-DrawSVGPlugin.min.js', 'gsap-Flip.min.js', 'gsap-MotionPathPlugin.min.js', 'gsap-ScrollTrigger.min.js', 'gsap-ScrollToPlugin.min.js', 'gsap-SplitText.min.js', 'gsap-init.js'];
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product page test</title>
<link rel="stylesheet" href="/assets/theme.css">
<script>window.themeMoneyFormat = "\${{amount}}";</script>
${gsapFiles.map(f => `<script src="/assets/${f}" defer></script>`).join('')}
</head><body class="template-product cv-tpl"><main id="MainContent">${html}</main>
<script type="module" src="/assets/cv-awning.js"></script>
<script type="module" src="/assets/cv-price-tag.js"></script>
<script src="/assets/cv-product.js" defer></script>
<script src="/assets/cv-pdp-counter.js" defer></script>
<script src="/assets/cv-pdp-counter-motion.js" defer></script>
${extras.length ? '<script src="/assets/cv-feature-tabs.js" defer></script><script type="module" src="/assets/cv-vs.js"></script><script src="/assets/cv-signup-motion.js" defer></script><script src="/assets/cv-offer-courier.js" defer></script>' : ''}
</body></html>`;
const out = process.argv[2] === 'real' ? 'pdp-real-preview.html' : 'pdp-full-preview.html';
await writeFile(resolve(here, out), page);
console.log('dev/' + out, html.length, 'chars of section markup');
