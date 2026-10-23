// Renders one theme section with liquidjs and a JSON fixture into a standalone harness page
// (dev only, nothing here ships). Modelled on dev/feature-tabs-render.mjs.
//
//   node render-section.mjs <section name or path> --fixture <fixture.json> --out <page.html>
//        [--title "..."] [--css a.css,b.css] [--js a.js,b.js] [--module-js c.js] [--no-stub]
//
// The page is built from tools/harness-template.html: real assets/theme.css, the section's own
// CSS/JS (what the section prints itself, plus fixture "harness" lists), local GSAP in the
// snippets/gsap.liquid order (all on-demand plugins on), stub-fetch.js, and the ?rm=1 / ?nojs=1 /
// ?editor=1 switches. asset_url maps to a path relative to the output file
// (../../../../assets/ for dev/motion-store-adapt/harness/<unit>/<page>.html).
//
// Fixture keys (all optional): see tools/README.md "render-section.mjs".
//   template  {"file": "templates/product.convert.json", "key": "main"}  real stored settings/blocks
//   section   {"id", "settings": {...}, "blocks": [{"id","type","settings"}]}  overrides on top
//   product   short form: {title, handle, vendor, options:["Color","Model"],
//             variants:[{options:[...], price, compare_at_price, available, image, inventory_*}],
//             media:[{src, alt}], metafields, collections}
//   cart      short form: {items:[{variant_id, quantity}] | [{product_title, variant_title, price, quantity, image}]}
//   stub_cart cart (same short form) used to render the section again as the stub's
//             Section Rendering response (what the section looks like after an add)
//   shop, routes, settings, request, template_name, money_format, globals
//   harness   {css:[], js:[], module_js:[], borrow_css:[{file, contains:[...]}], stub:true}
// Image sources: "asset:name.png" -> the theme asset; anything else is used as is; missing images
// become a labelled "fixture" SVG.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative, basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '../../..');
const { Liquid } = await import(new URL('file:///' + resolve(theme, 'dev/conversion-home/node_modules/liquidjs/dist/liquid.node.mjs').replace(/\\/g, '/')).href);

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const opt = { css: [], js: [], moduleJs: [], stub: true };
let sectionArg = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--fixture') opt.fixture = argv[++i];
  else if (a === '--out') opt.out = argv[++i];
  else if (a === '--title') opt.title = argv[++i];
  else if (a === '--css') opt.css.push(...argv[++i].split(',').filter(Boolean));
  else if (a === '--js') opt.js.push(...argv[++i].split(',').filter(Boolean));
  else if (a === '--module-js') opt.moduleJs.push(...argv[++i].split(',').filter(Boolean));
  else if (a === '--no-stub') opt.stub = false;
  else if (a === '-h' || a === '--help') { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).join('\n')); process.exit(0); }
  else if (!sectionArg) sectionArg = a;
  else { console.error('render-section: unknown argument ' + a); process.exit(2); }
}
if (!sectionArg || !opt.out) { console.error('usage: node render-section.mjs <section> --fixture f.json --out page.html'); process.exit(2); }

const sectionName = basename(sectionArg).replace(/\.liquid$/, '');
const sectionPath = existsSync(sectionArg) ? resolve(sectionArg) : resolve(theme, 'sections', sectionName + '.liquid');
const outPath = isAbsolute(opt.out) ? opt.out : resolve(process.cwd(), opt.out);
const outDir = dirname(outPath);
const rel = p => { const r = relative(outDir, p).replace(/\\/g, '/'); return r || '.'; };
const ASSETS = rel(resolve(theme, 'assets')) + '/';
const TOOLS = rel(here) + '/';

const fixture = opt.fixture ? JSON.parse(await readFile(resolve(opt.fixture), 'utf8')) : {};
const harness = fixture.harness || {};
const stripComment = t => t.replace(/^﻿?\s*\/\*[\s\S]*?\*\//, '');
const readJson = async p => JSON.parse(stripComment(await readFile(resolve(theme, p), 'utf8')));

// ---------------------------------------------------------------- schema + settings
const rawSource = await readFile(sectionPath, 'utf8');
const schemaMatch = rawSource.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
const schema = schemaMatch ? JSON.parse(schemaMatch[1]) : {};
const source0 = rawSource.replace(/{%-?\s*schema\s*-?%}[\s\S]*?{%-?\s*endschema\s*-?%}/, '');

const missingKeys = new Set();
const warnings = [];
const placeholder = (label, w = 800, h = 800) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#efe4cf"/>` +
  `<text x="50%" y="50%" text-anchor="middle" font-family="monospace" font-size="${Math.round(w / 18)}" fill="#7a5a3a">fixture: ${String(label).replace(/[<&>]/g, '')}</text></svg>`);
const src = s => !s ? null : String(s).startsWith('asset:') ? ASSETS + String(s).slice(6) : String(s);
const img = (s, alt = '', w = 1000, h = 1000, id = 0) => {
  const url = src(s) || placeholder(alt || 'photo', w, h);
  return { id, src: url, url, alt, width: w, height: h, aspect_ratio: w / h, media_type: 'image' };
};

function settingDefault(s) {
  if ('default' in s) return s.default;
  if (s.type === 'checkbox') return false;
  return null;
}
function coerce(type, v) {
  if (v == null) return v;
  if (type === 'image_picker' && typeof v === 'string') {
    const name = v.replace(/^shopify:\/\/shop_images\//, '');
    return img(null, name);
  }
  if ((type === 'url') && typeof v === 'string') return v.replace(/^shopify:\/\//, '/');
  if ((type === 'collection' || type === 'product' || type === 'page' || type === 'blog') && typeof v === 'string')
    return { handle: v, title: v + ' (fixture)', url: `/${type === 'product' ? 'products' : type === 'collection' ? 'collections' : type === 'page' ? 'pages' : 'blogs'}/${v}`, products: [], products_count: 0 };
  if (type === 'video' && typeof v === 'string') return null;
  return v;
}
function mergeSettings(defs, stored = {}) {
  const out = {};
  for (const s of defs || []) if (s.id) out[s.id] = coerce(s.type, settingDefault(s));
  for (const [k, v] of Object.entries(stored || {})) {
    const def = (defs || []).find(d => d.id === k);
    if (!def) warnings.push(`stored setting "${k}" has no schema entry`);
    out[k] = coerce(def && def.type, v);
  }
  return out;
}

let stored = { settings: {}, blocks: [] };
if (fixture.template) {
  const t = await readJson(fixture.template.file);
  const entry = t.sections[fixture.template.key];
  if (!entry) throw new Error(`template ${fixture.template.file} has no section "${fixture.template.key}"`);
  if (entry.type !== sectionName) warnings.push(`template section is "${entry.type}", rendering "${sectionName}"`);
  const order = entry.block_order || Object.keys(entry.blocks || {});
  stored.settings = entry.settings || {};
  stored.blocks = order.map(id => ({ id, ...entry.blocks[id] })).filter(b => !b.disabled);
}
const fsec = fixture.section || {};
const blockSrc = fsec.blocks || stored.blocks;
const blocks = blockSrc.filter(b => {
  if (String(b.type).startsWith('@')) { warnings.push(`skipped app/theme block "${b.type}"`); return false; }
  return true;
}).map((b, i) => {
  const bdef = (schema.blocks || []).find(d => d.type === b.type);
  if (!bdef) warnings.push(`block type "${b.type}" not in schema`);
  return { id: b.id || `b${i + 1}`, type: b.type, settings: mergeSettings(bdef && bdef.settings, b.settings), shopify_attributes: `data-fixture-block="${b.id || i + 1}"` };
});
const section = {
  id: fsec.id || (fixture.template && fixture.template.key) || sectionName,
  settings: mergeSettings(schema.settings, { ...stored.settings, ...(fsec.settings || {}) }),
  blocks,
  location: 'template',
  index: 1
};

// ---------------------------------------------------------------- product, cart, theme settings
function expandProduct(p) {
  if (!p) return null;
  const media = (p.media || []).map((m, i) => {
    const pic = img(m.src, m.alt || p.title, m.width || 1000, m.height || 1000, 9100 + i);
    return { ...pic, id: 9100 + i, position: i + 1, media_type: m.media_type || 'image', alt: m.alt || p.title, preview_image: pic };
  });
  const names = p.options || [];
  const variants = (p.variants || []).map((v, i) => {
    const opts = v.options || [];
    const fm = v.media != null ? media[v.media] : (v.image ? { ...img(v.image, opts.join(' / ')), preview_image: img(v.image, opts.join(' / ')) } : null);
    const out = {
      id: v.id || 41000 + i, title: opts.length ? opts.join(' / ') : 'Default Title', options: opts,
      option1: opts[0] ?? null, option2: opts[1] ?? null, option3: opts[2] ?? null,
      price: v.price ?? p.price ?? 0, compare_at_price: v.compare_at_price ?? null,
      available: v.available !== false, sku: v.sku || '', requires_shipping: true,
      inventory_management: v.inventory_management ?? null, inventory_policy: v.inventory_policy || 'deny',
      inventory_quantity: v.inventory_quantity ?? 0, featured_media: fm, featured_image: fm ? fm.preview_image : null,
      name: `${p.title} - ${opts.join(' / ')}`, public_title: opts.join(' / ') || null, weight: 0
    };
    out.url = `/products/${p.handle || 'fixture'}?variant=${out.id}`;
    return out;
  });
  const first = variants.find(v => v.available) || variants[0] || null;
  const prices = variants.map(v => v.price);
  return {
    id: p.id || 7000, title: p.title, handle: p.handle || 'fixture', vendor: p.vendor || '', type: p.type || '',
    url: `/products/${p.handle || 'fixture'}`, description: p.description || '', content: p.description || '',
    tags: p.tags || [], collections: p.collections || [], available: variants.some(v => v.available),
    price: Math.min(...prices, Infinity) === Infinity ? 0 : Math.min(...prices), price_min: Math.min(...prices), price_max: Math.max(...prices),
    price_varies: new Set(prices).size > 1, compare_at_price: first ? first.compare_at_price : null,
    options: names, options_by_name: Object.fromEntries(names.map((n, i) => [n.toLowerCase(), { name: n, values: [...new Set(variants.map(v => v.options[i]))] }])),
    options_with_values: names.map((n, i) => ({ name: n, position: i + 1, values: [...new Set(variants.map(v => v.options[i]))], selected_value: null })),
    variants, has_only_default_variant: names.length === 0, selected_variant: null,
    selected_or_first_available_variant: first, first_available_variant: first,
    media, featured_media: media[0] || null, featured_image: media[0] ? media[0].preview_image : null,
    images: media.map(m => m.preview_image), metafields: p.metafields || { reviews: {}, custom: {} },
    requires_selling_plan: false, selling_plan_groups: [], gift_card: false
  };
}
const product = expandProduct(fixture.product);

function expandCart(c) {
  if (!c) return { item_count: 0, items: [], total_price: 0, items_subtotal_price: 0, original_total_price: 0, total_discount: 0, cart_level_discount_applications: [], discount_applications: [], note: '', attributes: {}, currency: { iso_code: 'USD' }, requires_shipping: false };
  const items = (c.items || []).map((it, i) => {
    let v = null;
    if (it.variant_id && product) v = product.variants.find(x => String(x.id) === String(it.variant_id));
    const qty = it.quantity || 1;
    const price = it.price ?? (v ? v.price : 0);
    const prod = { title: it.product_title || (product && product.title) || 'Fixture product', handle: product ? product.handle : 'fixture', url: product ? product.url : '/products/fixture', has_only_default_variant: v ? product.has_only_default_variant : !it.variant_title, options_with_values: product ? product.options_with_values : [] };
    const variant = v || { id: it.variant_id || 42000 + i, title: it.variant_title || 'Default Title', options: (it.variant_title || '').split(' / '), price };
    const image = it.image ? img(it.image, prod.title) : (v && v.featured_image) || (product && product.featured_image) || null;
    return {
      key: `${variant.id}:fixture${i}`, id: variant.id, variant_id: variant.id, quantity: qty, title: `${prod.title} - ${variant.title}`,
      product: prod, variant, image, url: `${prod.url}?variant=${variant.id}`, price, original_price: price, final_price: price,
      line_price: price * qty, original_line_price: price * qty, final_line_price: price * qty, line_level_discount_allocations: [],
      options_with_values: (variant.options || []).map((val, oi) => ({ name: (product && product.options[oi]) || `Option ${oi + 1}`, value: val })),
      properties: {}, selling_plan_allocation: null
    };
  });
  const total = items.reduce((s, it) => s + it.final_line_price, 0);
  return { item_count: items.reduce((s, it) => s + it.quantity, 0), items, total_price: total, items_subtotal_price: total, original_total_price: total, total_discount: 0, cart_level_discount_applications: [], discount_applications: [], note: '', attributes: {}, currency: { iso_code: 'USD' }, requires_shipping: items.length > 0 };
}
const cart = expandCart(fixture.cart);

async function themeSettings() {
  const out = {};
  try {
    const schemaList = await readJson('config/settings_schema.json');
    for (const group of schemaList) for (const s of group.settings || []) if (s.id) out[s.id] = coerce(s.type, settingDefault(s));
    const data = await readJson('config/settings_data.json');
    const cur = typeof data.current === 'string' ? (data.presets || {})[data.current] || {} : data.current || {};
    for (const [k, v] of Object.entries(cur)) if (k !== 'sections' && k !== 'content_for_index') out[k] = v;
  } catch (e) { warnings.push('theme settings: ' + e.message); }
  return { ...out, ...(fixture.settings || {}) };
}

const moneyFormat = fixture.money_format || (fixture.shop && fixture.shop.money_format) || '${{amount}}';
function money(cents, fmt = moneyFormat) {
  const n = Number(cents || 0) / 100;
  const two = n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const none = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fmt.replace(/{{\s*(\w+)\s*}}/, (m, k) => k === 'amount_no_decimals' ? none : k === 'amount_with_comma_separator' ? n.toFixed(2).replace('.', ',') : two);
}

const locale = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const globals = {
  shop: { name: 'Casify', money_format: moneyFormat, money_with_currency_format: moneyFormat + ' USD', currency: 'USD', url: 'http://127.0.0.1', domain: '127.0.0.1', permanent_domain: 'fixture.myshopify.com', ...(fixture.shop || {}) },
  routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update', all_products_collection_url: '/collections/all', search_url: '/search', predictive_search_url: '/search/suggest', collections_url: '/collections', account_url: '/account', account_login_url: '/account/login', ...(fixture.routes || {}) },
  request: { design_mode: false, visual_preview_mode: false, page_type: fixture.template_name || 'product', locale: { iso_code: 'en', primary: true }, host: '127.0.0.1', path: '/', ...(fixture.request || {}) },
  template: { name: fixture.template_name || 'product', suffix: null, directory: null },
  localization: { language: { iso_code: 'en' }, country: { iso_code: 'US', currency: { iso_code: 'USD', symbol: '$' } }, available_languages: [], available_countries: [] },
  settings: await themeSettings(),
  cart, product, section, collection: fixture.collection || null, customer: null,
  canonical_url: 'http://127.0.0.1/', page_title: 'Fixture', content_for_header: '', powered_by_link: '',
  ...(fixture.globals || {})
};

// ---------------------------------------------------------------- engine
// liquidjs cannot read free text inside `comment ... endcomment` or `# ...` lines of a
// {% liquid %} tag (Shopify can), so those lines are blanked before parsing, for the section
// and for every snippet it renders.
function prep(text) {
  return text.replace(/{%-?\s*liquid\b([\s\S]*?)-?%}/g, (whole, body) => {
    let depth = 0;
    const lines = body.split('\n').map(line => {
      const t = line.trim();
      if (depth > 0) { if (/^endcomment\b/.test(t)) depth--; else if (/^comment\b/.test(t)) depth++; return ''; }
      if (/^comment\b/.test(t)) { depth = 1; return ''; }
      if (t.startsWith('#')) return '';
      return line;
    });
    return whole.replace(body, () => lines.join('\n'));
  });
}
const fsImpl = {
  existsSync: p => existsSync(p), exists: async p => existsSync(p),
  readFileSync: p => prep(readFileSync(p, 'utf8')), readFile: async p => prep(readFileSync(p, 'utf8')),
  resolve: (root, file, ext) => resolve(root, /\.liquid$/.test(file) ? file : file + ext),
  contains: () => true, dirname, sep: '/'
};
const engine = new Liquid({ root: [resolve(theme, 'snippets')], extname: '.liquid', globals, strictFilters: false, strictVariables: false, dynamicPartials: true, fs: fsImpl });
const skipTag = end => ({ parse(t, r) { let x; while ((x = r.shift())) if (x.name === end) return; throw new Error(`${t.name} not closed`); }, render() { return ''; } });
engine.registerTag('doc', skipTag('enddoc'));
function wrapTag(name, before, after) {
  engine.registerTag(name, {
    parse(token, remain) {
      this.args = token.args; this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on('tag:end' + name, () => stream.stop())
        .on('template', t => this.tpls.push(t))
        .on('end', () => { throw new Error(`${name} not closed`); });
      stream.start();
    },
    * render(ctx, emitter) {
      emitter.write(typeof before === 'function' ? before(this.args) : before);
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      emitter.write(after);
    }
  });
}
wrapTag('form', args => `<form method="post" action="${/product/.test(args) ? '/cart/add' : '#'}" data-fixture-form="${String(args).split(',')[0].replace(/['"]/g, '').trim()}" accept-charset="UTF-8">`, '</form>');
wrapTag('paginate', '', '');
wrapTag('style', '<style>', '</style>');
wrapTag('stylesheet', '<style>', '</style>');
wrapTag('javascript', '<script>', '</script>');
engine.registerTag('content_for', { parse() {}, render() { return ''; } });
engine.registerTag('section', { parse() {}, render() { return ''; } });
engine.registerTag('sections', { parse() {}, render() { return ''; } });

const kw = args => Object.fromEntries(args.filter(Array.isArray));
const toSrc = v => v == null ? '' : typeof v === 'string' ? v : (v.preview_image && v.preview_image.src) || v.src || v.url || '';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
engine.registerFilter('t', (key, ...args) => {
  const o = kw(args);
  let v = String(key).split('.').reduce((a, k) => (a == null ? a : a[k]), locale);
  if (v && typeof v === 'object' && 'count' in o) v = o.count === 1 ? (v.one ?? v.other) : (v.other ?? v.one);
  if (typeof v !== 'string') { missingKeys.add(key); return `translation missing: en.${key}`; }
  return v.replace(/{{\s*(\w+)\s*}}/g, (m, n) => (n in o ? o[n] : m));
});
engine.registerFilter('money', c => money(c));
engine.registerFilter('money_with_currency', c => money(c) + ' USD');
engine.registerFilter('money_without_currency', c => money(c, '{{amount}}'));
engine.registerFilter('money_without_trailing_zeros', c => money(c).replace(/\.00(?!\d)/, ''));
engine.registerFilter('asset_url', v => ASSETS + v);
engine.registerFilter('asset_img_url', v => ASSETS + v);
engine.registerFilter('file_url', v => placeholder(v));
engine.registerFilter('shopify_asset_url', v => placeholder(v));
engine.registerFilter('stylesheet_tag', v => `<link rel="stylesheet" href="${v}" media="all">`);
engine.registerFilter('script_tag', v => `<script src="${v}"></script>`);
engine.registerFilter('preload_tag', v => `<link rel="preload" href="${v}">`);
engine.registerFilter('inline_asset_content', v => { try { return readFileSync(resolve(theme, 'assets', v), 'utf8'); } catch { return ''; } });
engine.registerFilter('image_url', (v, ...a) => { const s = toSrc(v); return s || placeholder('image', 800, 800); });
engine.registerFilter('img_url', v => toSrc(v) || placeholder('image'));
engine.registerFilter('image_tag', (s, ...args) => {
  const o = kw(args); const attrs = [`src="${esc(s)}"`, `alt="${esc(o.alt ?? '')}"`];
  for (const k of ['width', 'height', 'class', 'id', 'loading', 'sizes', 'fetchpriority', 'decoding', 'style']) if (o[k] != null && o[k] !== '') attrs.push(`${k}="${esc(o[k])}"`);
  return `<img ${attrs.join(' ')}>`;
});
engine.registerFilter('placeholder_svg_tag', (name, cls) => `<svg class="${esc(cls || 'placeholder-svg')}" viewBox="0 0 400 300" role="img" aria-label="fixture placeholder"><rect width="400" height="300" fill="#efe4cf"/></svg>`);
engine.registerFilter('model_viewer_tag', () => '<model-viewer data-fixture="model"></model-viewer>');
engine.registerFilter('video_tag', () => '<video data-fixture="video" muted playsinline></video>');
engine.registerFilter('external_video_tag', () => '<div data-fixture="external-video"></div>');
engine.registerFilter('metafield_tag', v => (v && v.value != null ? String(v.value) : String(v ?? '')));
engine.registerFilter('metafield_text', v => (v && v.value != null ? String(v.value) : String(v ?? '')));
engine.registerFilter('payment_type_svg_tag', () => '<svg viewBox="0 0 38 24" width="38" height="24" data-fixture="payment"></svg>');
engine.registerFilter('default_errors', () => '');
engine.registerFilter('structured_data', v => JSON.stringify({ '@type': 'Product', name: v && v.title }));
engine.registerFilter('handleize', v => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
engine.registerFilter('handle', v => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
engine.registerFilter('link_to', (text, url) => `<a href="${esc(url)}">${text}</a>`);
engine.registerFilter('within', v => v);
engine.registerFilter('md5', v => createHash('md5').update(String(v)).digest('hex'));
for (const f of ['color_lighten', 'color_darken', 'color_modify', 'color_saturate', 'color_desaturate', 'color_mix']) engine.registerFilter(f, v => v);
engine.registerFilter('color_to_rgb', v => v);
engine.registerFilter('font_face', () => '');
engine.registerFilter('font_url', () => '');
engine.registerFilter('font_modify', v => v);
engine.registerFilter('highlight', v => v);
engine.registerFilter('time_tag', v => `<time>${v}</time>`);
engine.registerFilter('format_address', () => '');

const source = prep(source0);
async function renderWith(extra = {}) {
  const ctx = { ...globals, ...extra };
  return engine.parseAndRender(source, ctx, { globals: ctx });
}
const tag = schema.tag || 'div';
const wrap = (html) => `<${tag} id="shopify-section-${section.id}" class="shopify-section${schema.class ? ' ' + schema.class : ''}">${html}</${tag}>`;
const html = await renderWith();

// ---------------------------------------------------------------- stub fixture
let stubFixture = null;
if (opt.stub && harness.stub !== false) {
  const stubCart = fixture.stub_cart ? expandCart(fixture.stub_cart) : null;
  const sectionHtml = stubCart ? wrap(await renderWith({ cart: stubCart })) : wrap(html);
  const toJsCart = c => ({
    token: 'fixture-cart', item_count: c.item_count, total_price: c.total_price, items_subtotal_price: c.items_subtotal_price,
    original_total_price: c.original_total_price, total_discount: 0, cart_level_discount_applications: [], currency: 'USD', requires_shipping: c.requires_shipping,
    items: c.items.map(it => ({ id: it.id, variant_id: it.variant_id, key: it.key, quantity: it.quantity, title: it.title, product_title: it.product.title, variant_title: it.variant.title, price: it.price, line_price: it.line_price, final_price: it.final_price, final_line_price: it.final_line_price, image: it.image ? it.image.src : null, url: it.url, handle: it.product.handle }))
  });
  stubFixture = {
    currency: 'USD',
    variants: product ? product.variants.map(v => ({ id: v.id, title: v.title, price: v.price, product_title: product.title, product_handle: product.handle, image: v.featured_image ? v.featured_image.src : (product.featured_image && product.featured_image.src) || null, options: v.options, available: v.available })) : [],
    cart: toJsCart(cart),
    sections: { [sectionName]: sectionHtml, ...(harness.sections || {}) }
  };
}

// ---------------------------------------------------------------- page
const printed = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(m => m[1]);
const cssLinks = [...new Set([...(harness.css || []), ...opt.css])].map(f => ASSETS + f).filter(h => !printed.includes(h));
let borrowed = '';
for (const b of harness.borrow_css || []) {
  const text = await readFile(resolve(theme, b.file), 'utf8');
  const lines = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].flatMap(m => m[1].split('\n'));
  const keep = lines.filter(l => (b.contains || []).some(c => l.includes(c)));
  borrowed += `<style data-borrowed-from="${b.file}">\n${keep.join('\n')}\n</style>\n`;
}
const gsapSnippet = await readFile(resolve(theme, 'snippets/gsap.liquid'), 'utf8');
const plugins = ['CustomEase', 'CustomBounce', 'CustomWiggle', 'DrawSVGPlugin', 'InertiaPlugin', 'Draggable', 'Flip', 'MotionPathPlugin', 'ScrambleTextPlugin', 'TextPlugin', 'ScrollTrigger', 'ScrollToPlugin', 'SplitText'];
if (!/gsap-init\.js/.test(gsapSnippet)) warnings.push('snippets/gsap.liquid no longer loads gsap-init.js');
const headScripts = ['gsap.min.js', ...plugins.map(p => `gsap-${p}.min.js`), 'gsap-init.js']
  .filter(f => existsSync(resolve(theme, 'assets', f)))
  .map(f => `<script src="${ASSETS}${f}" defer></script>`).join('\n');
const bodyScripts = [
  ...[...(harness.js || []), ...opt.js].map(f => `<script src="${ASSETS}${f}" defer></script>`),
  ...[...(harness.module_js || []), ...opt.moduleJs].map(f => `<script type="module" src="${ASSETS}${f}"></script>`)
].join('\n');
const head = [
  `<script>window.themeMoneyFormat = ${JSON.stringify(moneyFormat)}; window.Shopify = window.Shopify || { routes: { root: '/' }, currency: { active: 'USD', rate: '1.0' }, locale: 'en', designMode: false };</script>`,
  ...cssLinks.map(h => `<link rel="stylesheet" href="${h}">`),
  borrowed,
  stubFixture ? `<script>window.__STUB_FIXTURE = ${JSON.stringify(stubFixture).replace(/<\//g, '<\\/')};</script>\n<script src="${TOOLS}stub-fetch.js"></script>` : ''
].filter(Boolean).join('\n');

// The template's leading <!-- ... --> documents the markers; drop it so only the real markers are filled.
const template = (await readFile(resolve(here, 'harness-template.html'), 'utf8'))
  .replace(/<!--[\s\S]*?-->\r?\n?/, '<!-- built by tools/render-section.mjs from tools/harness-template.html -->\n');
const page = template
  .replace(/%%TITLE%%/g, esc(opt.title || `${sectionName} (fixture)`))
  .replace('%%HEAD%%', () => head)
  .replace('%%HEAD_SCRIPTS%%', () => headScripts)
  .replace('%%FIXTURE%%', () => wrap(html))
  .replace('%%BODY_SCRIPTS%%', () => bodyScripts)
  .replace(/%%ASSETS%%/g, ASSETS)
  .replace(/%%TOOLS%%/g, TOOLS);
await mkdir(outDir, { recursive: true });
await writeFile(outPath, page);
console.log(`render-section: ${sectionName} -> ${outPath}`);
console.log(`  assets: ${ASSETS}  blocks: ${blocks.length}  product: ${product ? product.title + ' (' + product.options.join(', ') + ')' : 'none'}  cart items: ${cart.item_count}`);
if (missingKeys.size) console.log(`  missing locale keys (${missingKeys.size}): ${[...missingKeys].join(', ')}`);
for (const w of [...new Set(warnings)]) console.log('  warn: ' + w);
