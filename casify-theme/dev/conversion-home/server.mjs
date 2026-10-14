import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { dirname, resolve, extname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from 'liquidjs';

const here = dirname(fileURLToPath(import.meta.url));
const theme = resolve(here, '../..');
const host = '127.0.0.1';
const port = Number(process.env.CASIFY_PREVIEW_PORT || 4186);
const previewOrigin = `http://${host}:${port}`;
const sectionFile = resolve(theme, 'sections/cv-home-conversion.liquid');
const spotlightSectionFile = resolve(theme, 'sections/cv-spotlight.liquid');
const showcaseSectionFile = resolve(theme, 'sections/cv-showcase.liquid');
const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0) / 100);
const imageSrc = image => typeof image === 'string' ? image : image?.src || image?.url || image?.preview_image?.src || '';
const json = value => JSON.stringify(value ?? null).replace(/</g, '\\u003c');
const cachedProducts = JSON.parse(await readFile(resolve(theme, 'dev/og/products.json'), 'utf8'));
const phoneModels = ['iPhone 18 Pro Max', 'iPhone 18 Pro', 'iPhone 17 Pro Max', 'iPhone 17 Pro'];
const colors = ['Black', 'Silver', 'Desert'];
const products = cachedProducts.map((item, productIndex) => {
  const price = Math.round(Number(item.price.replace(/[^\d.]/g, '')) * 100);
  const image = { src: `/photos/${item.img.split('/').at(-1)}`, alt: item.title, width: 1200, height: 1200, aspect_ratio: 1 };
  const variants = phoneModels.flatMap((model, modelIndex) => colors.map((color, colorIndex) => ({
    id: 990000000 + productIndex * 100 + modelIndex * 10 + colorIndex,
    title: `${model} / ${color}`, options: [model, color], option1: model, option2: color, option3: null,
    available: !(modelIndex === 3 && colorIndex === 2), price, compare_at_price: null,
    featured_image: image, inventory_quantity: 99, requires_shipping: true, sku: `LOCAL-DEMO-${productIndex}-${modelIndex}-${colorIndex}`
  })));
  return {
    id: Number(item.gid), handle: item.handle, title: item.title, price, price_min: price, price_max: price,
    compare_at_price: null, available: true, price_varies: false, url: `/products/${item.handle}`,
    vendor: 'Casify', type: 'Phone case', tags: [], description: '', featured_image: image,
    featured_media: { media_type: 'image', preview_image: image }, images: [image],
    media: [{ media_type: 'image', preview_image: image }], variants,
    options: ['Phone model', 'Color'],
    options_with_values: [{ name: 'Phone model', position: 1, values: phoneModels, selected_value: phoneModels[0] }, { name: 'Color', position: 2, values: colors, selected_value: colors[0] }],
    selected_or_first_available_variant: variants[0], first_available_variant: variants[0], selected_variant: null,
    has_only_default_variant: false
  };
});
const collection = { id: 1, title: 'Cases for every day', handle: 'all', url: '/collections/all', products, products_count: products.length, all_products_count: products.length };
const variantIndex = new Map(products.flatMap(product => product.variants.map(variant => [String(variant.id), { product, variant }])));
const cartItems = new Map();
const qaReports = new Map();
const recentRequests = [];

const liquid = new Liquid({ root: resolve(theme, 'snippets'), partials: resolve(theme, 'snippets'), extname: '.liquid', strictFilters: false });
liquid.registerTag('doc', {
  parse(_tagToken, remainTokens) {
    while (remainTokens.length) {
      const token = remainTokens.shift();
      if (token?.name === 'enddoc') return;
    }
    throw new Error('doc tag not closed');
  },
  render() { return ''; }
});
liquid.registerFilter('asset_url', value => `/assets/${String(value).replace(/^\/+/, '')}`);
liquid.registerFilter('stylesheet_tag', value => `<link rel="stylesheet" href="${htmlEscape(value)}">`);
liquid.registerFilter('script_tag', value => `<script src="${htmlEscape(value)}" defer></script>`);
liquid.registerFilter('image_url', value => imageSrc(value));
liquid.registerFilter('img_url', value => imageSrc(value));
liquid.registerFilter('image_tag', (value, ...args) => {
  const opts = Object.fromEntries(args.filter(arg => Array.isArray(arg)));
  const attrs = Object.entries(opts).filter(([key]) => !['widths', 'preload'].includes(key)).map(([key, val]) => `${key}="${htmlEscape(val)}"`).join(' ');
  return `<img src="${htmlEscape(imageSrc(value))}" ${attrs} alt="${htmlEscape(opts.alt || value?.alt || '')}">`;
});
liquid.registerFilter('money', money);
liquid.registerFilter('money_with_currency', value => `${money(value)} USD`);
liquid.registerFilter('money_without_currency', value => (Number(value || 0) / 100).toFixed(2));
liquid.registerFilter('json', json);
liquid.registerFilter('within', value => value);
liquid.registerFilter('t', value => value);

const previewNote = 'Local preview · Real catalog photos/prices · Demo options · Bag stays on this computer';
const header = `<div class="preview-note" role="note">${previewNote}</div><header class="preview-header"><a href="/" aria-label="Casify home"><img src="/assets/casify-logo.svg" width="125" height="42" alt="Casify"></a><nav aria-label="Main navigation"><a href="/#HomeCases-conversion-preview">Shop cases</a><a href="/#HomeGuide-conversion-preview">The details</a></nav><a class="preview-bag" href="/cart">Bag <span data-cart-count>0</span></a></header>`;
const footer = `<footer class="preview-footer"><a href="/" aria-label="Casify home"><img src="/assets/casify-logo.svg" width="120" height="40" alt="Casify"></a><p>Made for your everyday.</p><a href="/collections/all">Explore the collection</a><small>Local design preview. Checkout is disabled.</small></footer>`;
const shellCss = `
  .preview-note{padding:7px 12px;background:#233c34;color:#f8f7f1;font:10px/1.4 Arial,sans-serif;text-align:center;letter-spacing:.04em}
  .preview-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px max(24px,calc((100vw - 1320px)/2));background:#fffdf8;border-bottom:1px solid #18372b1a;position:relative;z-index:20;font:12px/1.3 Arial,sans-serif}
  .preview-header img,.preview-footer img{display:block;object-fit:contain}.preview-header nav{display:flex;gap:28px}.preview-header a{color:#223a30;text-decoration:none}.preview-bag{white-space:nowrap}.preview-bag span{display:inline-flex;align-items:center;justify-content:center;background:#e8eadc;border-radius:50%;width:22px;height:22px;margin-left:6px}
  .preview-footer{padding:48px max(24px,calc((100vw - 1320px)/2));background:#f1eee3;color:#263c32;font:14px/1.6 Arial,sans-serif;display:flex;align-items:center;gap:24px;flex-wrap:wrap}.preview-footer a{color:inherit}.preview-footer small{flex-basis:100%;font-size:11px;color:#666}
  .preview-simple{max-width:900px;margin:0 auto;padding:64px 24px;font:16px/1.6 Arial,sans-serif;min-height:55vh}.preview-simple h1{font:400 46px/1.1 Georgia,serif;margin:0 0 24px;color:#263c32}.preview-simple a{color:#263c32}.preview-simple article{display:flex;gap:24px;align-items:center;padding:24px 0;border-bottom:1px solid #223a3033}.preview-simple article img{width:110px;height:110px;object-fit:contain}.preview-simple h2{font:400 20px/1.4 Georgia,serif}.preview-simple button{padding:14px 22px;background:#233c34;color:white;border:0;border-radius:8px;cursor:pointer}
  @media(max-width:600px){.preview-header{padding:12px 20px;gap:12px}.preview-header nav{gap:16px}.preview-header nav a:last-child{display:none}.preview-header img{width:102px}.preview-note{font-size:8px}.preview-footer{padding:32px 20px}.preview-simple h1{font-size:36px}}
`;
const bagScript = `<script>async function updatePreviewBag(){try{const cart=await fetch('/cart.js').then(r=>r.json());document.querySelectorAll('[data-cart-count]').forEach(n=>n.textContent=cart.item_count)}catch{}}document.addEventListener('cart:updated',updatePreviewBag);document.addEventListener('cart:refresh',updatePreviewBag);document.addEventListener('cart:change',updatePreviewBag);document.addEventListener('cv:cart-updated',updatePreviewBag);window.addEventListener('pageshow',updatePreviewBag);const originalPreviewFetch=window.fetch;window.fetch=async function(...args){const response=await originalPreviewFetch.apply(this,args);if(String(args[0]?.url||args[0]).includes('/cart/add')&&response.ok)setTimeout(updatePreviewBag,0);return response};</script>`;
function documentHtml(body, { title = 'Casify — Everyday, upgraded.', sectionCss = '', scripts = '' } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${htmlEscape(title)}</title><script src="/preview/qa.js"></script><link rel="stylesheet" href="/assets/theme.css">${sectionCss}<style>${shellCss}</style><script>window.Shopify={routes:{root:'/'},currency:{active:'USD'},designMode:false};</script></head><body>${header}<main id="MainContent">${body}</main>${footer}${bagScript}${scripts}</body></html>`;
}

function settingsDefaults(definitions = []) {
  return Object.fromEntries(definitions.filter(setting => setting.id).map(setting => [setting.id, setting.default ?? (setting.type === 'checkbox' ? false : '')]));
}

async function renderSection() {
  let source;
  try { source = await readFile(sectionFile, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return documentHtml('<div class="preview-simple"><h1>Homepage is being prepared.</h1><p>The local preview is ready. Refresh when the section file is saved.</p></div>'); throw error; }
  const schemaMatch = source.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  const schema = schemaMatch ? JSON.parse(schemaMatch[1]) : {};
  const settings = settingsDefaults(schema.settings);
  for (const setting of schema.settings || []) {
    if (setting.type === 'collection') settings[setting.id] = collection;
    if (setting.type === 'product') settings[setting.id] = products[0];
  }
  settings.collection = collection;
  settings.featured_product = products[0];
  const blocks = (schema.presets?.[0]?.blocks || []).map((preset, index) => {
    const definition = schema.blocks?.find(block => block.type === preset.type);
    return { type: preset.type, id: `preview-block-${index + 1}`, settings: { ...settingsDefaults(definition?.settings), ...preset.settings }, shopify_attributes: '' };
  });
  const context = {
    section: { id: 'conversion-preview', settings, blocks, index: 1 },
    collections: { all: collection }, all_products: Object.fromEntries(products.map(product => [product.handle, product])),
    routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', all_products_collection_url: '/collections/all', search_url: '/search' },
    shop: { name: 'Casify', currency: 'USD', money_format: '${{amount}}', url: previewOrigin },
    request: { page_type: 'index', design_mode: false, host: `${host}:${port}`, path: '/', locale: { iso_code: 'en' } },
    localization: { country: { iso_code: 'US', currency: { iso_code: 'USD', symbol: '$' } }, language: { iso_code: 'en' } },
    settings: { currency_code_enabled: false }, template: { name: 'index' }, cart: cartJson(), content_for_header: ''
  };
  source = source.replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/g, '').replace(/{%\s*style\s*%}/g, '<style>').replace(/{%\s*endstyle\s*%}/g, '</style>');
  let rendered = await liquid.parseAndRender(source, context);
  // Match the section wrapper Shopify normally supplies.
  rendered = `<div id="shopify-section-conversion-preview" class="shopify-section">${rendered}</div>`;
  const assetsInSection = [...rendered.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
  const missingCss = assetsInSection.some(asset => asset.includes('cv-home-conversion.css')) ? '' : '<link rel="stylesheet" href="/assets/cv-home-conversion.css">';
  const neededScripts = ['gsap.min.js', 'gsap-ScrollTrigger.min.js', 'cv-home-conversion.js'];
  // Move section scripts after GSAP, preserving one instance of every source.
  const sectionScripts = [];
  rendered = rendered.replace(/<script\b([^>]*\bsrc=["']([^"']+)["'][^>]*)>\s*<\/script>/gi, (match, attrs, src) => { sectionScripts.push(src); return ''; });
  const scriptSources = [...new Set([...neededScripts.map(name => `/assets/${name}`), ...sectionScripts])];
  return documentHtml(rendered, { sectionCss: missingCss, scripts: scriptSources.map(src => `<script src="${htmlEscape(src)}" defer></script>`).join('') });
}

async function renderSpotlightSection() {
  let source = await readFile(spotlightSectionFile, 'utf8');
  const schemaMatch = source.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  const schema = schemaMatch ? JSON.parse(schemaMatch[1]) : {};
  const settings = settingsDefaults(schema.settings);
  settings.count_collection = collection;
  const context = {
    section: { id: 'spotlight-preview', settings, blocks: [], index: 2 },
    collections: { all: collection, frontpage: collection },
    routes: { root_url: '/', cart_url: '/cart', all_products_collection_url: '/collections/all' },
    shop: { name: 'Casify', currency: 'USD', money_format: '${{amount}}', url: previewOrigin },
    request: { page_type: 'index', design_mode: false, host: `${host}:${port}`, path: '/spotlight', locale: { iso_code: 'en' } },
    localization: { country: { iso_code: 'US', currency: { iso_code: 'USD', symbol: '$' } }, language: { iso_code: 'en' } },
    settings: { currency_code_enabled: false }, template: { name: 'index' }, cart: cartJson(), content_for_header: ''
  };
  source = source.replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/g, '');
  const rendered = `<div id="shopify-section-spotlight-preview" class="shopify-section">${await liquid.parseAndRender(source, context)}</div>`;
  const scripts = ['gsap.min.js', 'gsap-ScrollTrigger.min.js', 'cv-spotlight-motion.js'].map(name => `<script src="/assets/${name}" defer></script>`).join('');
  return documentHtml(`<div style="height:22vh;min-height:160px;display:grid;place-items:center;background:#f5e9d3;color:#8a5a3c;font:11px var(--font-label);letter-spacing:.12em;text-transform:uppercase">Scroll to open the shop window</div>${rendered}<div style="height:35vh;min-height:260px;background:#fdf9f1"></div>`, { title: 'Convert — Spotlight · Casify', scripts });
}

async function renderShowcaseSection() {
  let source = await readFile(showcaseSectionFile, 'utf8');
  const schemaMatch = source.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  const schema = schemaMatch ? JSON.parse(schemaMatch[1]) : {};
  const settings = { ...settingsDefaults(schema.settings), heading: 'Fan favorites, built to last', subheading: '<p>Three counter picks, now with real product photography.</p>' };
  const blocks = (schema.presets?.[0]?.blocks || []).map((preset, index) => {
    const definition = schema.blocks?.find(block => block.type === preset.type);
    const product = products[index % products.length];
    return {
      type: preset.type,
      id: `showcase-preview-${index + 1}`,
      settings: {
        ...settingsDefaults(definition?.settings),
        ...preset.settings,
        image: index < 2 ? product.featured_image : '',
        image_fit: index === 1 ? 'contain' : 'cover',
        title: product.title,
        price: money(product.price),
        compare_price: index === 2 ? '' : '$59.99'
      },
      shopify_attributes: ''
    };
  });
  const context = {
    section: { id: 'showcase-preview', settings, blocks, index: 2 },
    routes: { root_url: '/', cart_url: '/cart', all_products_collection_url: '/collections/all' },
    shop: { name: 'Casify', currency: 'USD', money_format: '${{amount}}', url: previewOrigin },
    request: { page_type: 'index', design_mode: false, host: `${host}:${port}`, path: '/showcase', locale: { iso_code: 'en' } },
    localization: { country: { iso_code: 'US', currency: { iso_code: 'USD', symbol: '$' } }, language: { iso_code: 'en' } },
    settings: { currency_code_enabled: false }, template: { name: 'index' }, cart: cartJson(), content_for_header: ''
  };
  source = source.replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/g, '');
  const rendered = `<div id="shopify-section-showcase-preview" class="shopify-section">${await liquid.parseAndRender(source, context)}</div>`;
  const scripts = ['gsap.min.js', 'gsap-ScrollTrigger.min.js', 'gsap-init.js', 'cv-showcase-motion.js'].map(name => `<script src="/assets/${name}" defer></script>`).join('');
  const spacer = '<div style="height:12vh;min-height:90px;display:grid;place-items:center;background:#f5e9d3;color:#8a5a3c;font:11px var(--font-label);letter-spacing:.12em;text-transform:uppercase">Scroll to deal the counter cards</div>';
  return documentHtml(`${spacer}${rendered}<div style="height:24vh;min-height:180px;background:#fdf9f1"></div>`, { title: 'Showcase cards · Casify', scripts });
}

function cartJson() {
  const items = [...cartItems.values()].map(({ product, variant, quantity }) => ({
    id: variant.id, key: `${variant.id}:local`, variant_id: variant.id, product_id: product.id,
    title: product.title, product_title: product.title, variant_title: variant.title,
    quantity, price: variant.price, final_price: variant.price, line_price: variant.price * quantity,
    final_line_price: variant.price * quantity, image: product.featured_image.src,
    featured_image: product.featured_image, url: `${product.url}?variant=${variant.id}`,
    options_with_values: [{ name: 'Phone model', value: variant.option1 }, { name: 'Color', value: variant.option2 }], properties: {}
  }));
  const total = items.reduce((sum, item) => sum + item.line_price, 0);
  return { token: 'local-preview-only', item_count: items.reduce((sum, item) => sum + item.quantity, 0), items, currency: 'USD', total_price: total, original_total_price: total, total_discount: 0, total_weight: 0, requires_shipping: !!items.length };
}

async function requestBody(request) {
  let body = '';
  for await (const chunk of request) { body += chunk; if (body.length > 16384) throw new Error('Request too large'); }
  if (String(request.headers['content-type']).includes('application/json')) return JSON.parse(body);
  if (String(request.headers['content-type']).includes('multipart/form-data')) {
    const entries = [...body.matchAll(/name="([^"]+)"\r\n\r\n([^\r\n]*)/g)].map(match => [match[1], match[2]]);
    return Object.fromEntries(entries);
  }
  return Object.fromEntries(new URLSearchParams(body));
}

function respondJson(response, status, payload) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(payload)); }
function respondHtml(response, html, status = 200) { response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(html); }
const mime = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
async function serveFile(response, root, name) {
  const target = resolve(root, name);
  const rel = relative(root, target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || !mime[extname(target).toLowerCase()]) return false;
  try {
    const realRoot = await realpath(root);
    const realTarget = await realpath(target);
    const realRelative = relative(realRoot, realTarget);
    if (!realRelative || realRelative.startsWith('..') || isAbsolute(realRelative)) return false;
    if (!(await stat(target)).isFile()) return false;
    const data = await readFile(target);
    response.writeHead(200, { 'Content-Type': mime[extname(target).toLowerCase()], 'Cache-Control': 'no-store' });
    response.end(data); return true;
  } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    response.on('finish', () => {
      if (pathname.startsWith('/qa')) return;
      recentRequests.push({ time: new Date().toISOString(), method: request.method, path: pathname, status: response.statusCode });
      if (recentRequests.length > 150) recentRequests.shift();
    });
    if (![`${host}:${port}`, `localhost:${port}`].includes(request.headers.host)) { respondJson(response, 403, { error: 'Local preview host required' }); return; }
    if (request.method === 'POST' && request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) { respondJson(response, 403, { error: 'Local preview origin required' }); return; }
    if (request.method === 'POST' && pathname === '/qa/report') {
      const report = await requestBody(request);
      if (typeof report.page !== 'string' || !Number.isFinite(report.viewport?.width)) { respondJson(response, 400, { error: 'Invalid browser report' }); return; }
      const key = `${report.page} @ ${report.viewport.width}px`;
      qaReports.set(key, { receivedAt: new Date().toISOString(), ...report });
      if (qaReports.size > 20) qaReports.delete(qaReports.keys().next().value);
      respondJson(response, 200, { ok: true }); return;
    }
    if (request.method === 'POST' && ['/cart/add.js', '/cart/add'].includes(pathname)) {
      const body = await requestBody(request);
      const requested = body.items || [{ id: body.id, quantity: body.quantity ?? 1 }];
      if (!Array.isArray(requested) || requested.length < 1 || requested.length > 20) { respondJson(response, 422, { description: 'Choose a valid item.' }); return; }
      const additions = new Map();
      for (const item of requested) {
        const entry = variantIndex.get(String(item.id));
        const quantity = Number(item.quantity ?? 1);
        const combinedQuantity = (additions.get(String(item.id))?.quantity || 0) + quantity;
        if (!entry || !entry.variant.available || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || (cartItems.get(String(item.id))?.quantity || 0) + combinedQuantity > 99) {
          respondJson(response, 422, { status: 422, message: 'Cart Error', description: 'Choose an available demo variant and a quantity from 1 to 10.' }); return;
        }
        additions.set(String(item.id), { ...entry, quantity: combinedQuantity, id: String(item.id) });
      }
      for (const addition of additions.values()) cartItems.set(addition.id, { ...addition, quantity: (cartItems.get(addition.id)?.quantity || 0) + addition.quantity });
      const items = cartJson().items.filter(item => additions.has(String(item.id)));
      if (pathname === '/cart/add') { response.writeHead(303, { Location: '/cart' }); response.end(); return; }
      respondJson(response, 200, body.items ? { items } : items[0]); return;
    }
    if (request.method === 'POST' && pathname === '/cart/clear.js') { cartItems.clear(); respondJson(response, 200, cartJson()); return; }
    if (!['GET', 'HEAD'].includes(request.method)) { respondJson(response, 405, { error: 'Method not allowed' }); return; }
    if (pathname === '/qa') { respondJson(response, 200, { note: 'Observed reports only. Open the page in a browser to collect JavaScript errors, failed resources and viewport measurements. Overflow candidates may be intentional clipped decoration; pageOverflow records document width.', reports: Object.fromEntries(qaReports), recentRequests }); return; }
    if (pathname === '/preview/qa.js') { await serveFile(response, here, 'qa.js'); return; }
    if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    if (pathname === '/cart.js') { respondJson(response, 200, cartJson()); return; }
    if (pathname === '/health') { respondJson(response, 200, { ok: true, section: 'cv-home-conversion', catalog: 'cached real photos/prices; demo options', cart: 'in-memory local simulation' }); return; }
    if (pathname === '/spotlight') { respondHtml(response, await renderSpotlightSection()); return; }
    if (pathname === '/showcase') { respondHtml(response, await renderShowcaseSection()); return; }
    if (pathname === '/showcase/mobile' || pathname === '/showcase/desktop') {
      const width = pathname.endsWith('/mobile') ? 390 : 1440;
      respondHtml(response, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Showcase ${width}px preview</title><style>body{margin:0;padding:16px;background:#dddcd5;font:12px Arial;color:#343a32}p{margin:0 0 12px}iframe{display:block;width:${width}px;height:calc(100vh - 60px);min-height:760px;border:0;background:#fff;margin:0 auto;box-shadow:0 6px 32px #0002}</style></head><body><p>${width}px viewport · <a href="/showcase">Full page</a> · <a href="/showcase/${pathname.endsWith('/mobile') ? 'desktop' : 'mobile'}">Switch viewport</a></p><iframe src="/showcase?frame=1" title="Showcase cards at ${width} pixels" width="${width}"></iframe></body></html>`); return;
    }
    if (pathname === '/spotlight/mobile' || pathname === '/spotlight/desktop') {
      const width = pathname.endsWith('/mobile') ? 390 : 1440;
      respondHtml(response, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spotlight ${width}px preview</title><style>body{margin:0;padding:16px;background:#dddcd5;font:12px Arial;color:#343a32}p{margin:0 0 12px}iframe{display:block;width:${width}px;height:calc(100vh - 60px);min-height:760px;border:0;background:#fff;margin:0 auto;box-shadow:0 6px 32px #0002}</style></head><body><p>${width}px viewport · <a href="/spotlight">Full page</a> · <a href="/spotlight/${pathname.endsWith('/mobile') ? 'desktop' : 'mobile'}">Switch viewport</a></p><iframe src="/spotlight?frame=1" title="Convert Spotlight at ${width} pixels" width="${width}"></iframe></body></html>`); return;
    }
    if (pathname === '/') { respondHtml(response, await renderSection()); return; }
    if (pathname === '/mobile' || pathname === '/desktop') {
      const width = pathname === '/mobile' ? 390 : 1440;
      respondHtml(response, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Casify ${width}px preview</title><style>body{margin:0;padding:16px;background:#dddcd5;font:12px Arial;color:#343a32}p{margin:0 0 12px}iframe{display:block;width:${width}px;height:calc(100vh - 60px);min-height:700px;border:0;background:#fff;margin:0 auto;box-shadow:0 6px 32px #0002}</style></head><body><p>${width}px viewport · <a href="/">Full page</a> · <a href="/${pathname === '/mobile' ? 'desktop' : 'mobile'}">Switch viewport</a></p><iframe src="/?frame=1" title="Casify homepage at ${width} pixels" width="${width}"></iframe></body></html>`); return;
    }
    if (pathname === '/cart') {
      const cart = cartJson();
      const content = cart.items.length ? `${cart.items.map(item => `<article><img src="${htmlEscape(item.image)}" alt="${htmlEscape(item.product_title)}"><div><h2>${htmlEscape(item.product_title)}</h2><p>${htmlEscape(item.variant_title)} · Qty ${item.quantity}</p><strong>${money(item.line_price)}</strong></div></article>`).join('')}<p>Total: <strong>${money(cart.total_price)}</strong></p><button onclick="fetch('/cart/clear.js',{method:'POST'}).then(()=>location.reload())">Empty preview bag</button>` : '<p>Your preview bag is empty.</p>';
      respondHtml(response, documentHtml(`<div class="preview-simple"><h1>Your preview bag</h1><p>This bag is a local simulation using demo options. No payment or order can be created.</p>${content}<p><a href="/">Continue exploring</a></p></div>`, { title: 'Local preview bag — Casify' })); return;
    }
    if (pathname === '/collections/all') {
      respondHtml(response, documentHtml(`<div class="preview-simple"><h1>The collection</h1><p>Cached store products with demo model and color options.</p>${products.map(product => `<article><a href="${product.url}"><img src="${product.featured_image.src}" alt="${htmlEscape(product.title)}"></a><div><h2><a href="${product.url}">${htmlEscape(product.title)}</a></h2><p>${money(product.price)}</p></div></article>`).join('')}</div>`)); return;
    }
    if (pathname.startsWith('/products/')) {
      const handle = pathname.slice('/products/'.length).replace(/\.js$/, '');
      const product = products.find(item => item.handle === handle);
      if (product && pathname.endsWith('.js')) { respondJson(response, 200, product); return; }
      if (product) { respondHtml(response, documentHtml(`<div class="preview-simple"><h1>${htmlEscape(product.title)}</h1><img src="${product.featured_image.src}" style="width:100%;max-width:440px;display:block" alt="${htmlEscape(product.title)}"><p>${money(product.price)}</p><p>This local route checks product navigation. Use the homepage purchase panel to test demo options and the preview bag.</p><a href="/">Back to the homepage</a></div>`)); return; }
    }
    if (pathname.startsWith('/assets/') && await serveFile(response, resolve(theme, 'assets'), pathname.slice(8))) return;
    if (pathname.startsWith('/photos/') && await serveFile(response, resolve(theme, 'dev/og/photos'), pathname.slice(8))) return;
    respondHtml(response, documentHtml('<div class="preview-simple"><h1>Preview page unavailable</h1><p>This route is outside the local homepage preview.</p><a href="/">Return home</a></div>'), 404);
  } catch (error) {
    console.error(error);
    respondHtml(response, documentHtml(`<div class="preview-simple"><h1>Preview needs attention</h1><pre style="white-space:pre-wrap">${htmlEscape(error.message)}</pre></div>`), 500);
  }
});
server.listen(port, host, () => console.log(`Casify conversion preview: http://${host}:${port}/\nMobile: http://${host}:${port}/mobile\nDesktop: http://${host}:${port}/desktop\nCatalog: cached real photos/prices; demo options (public endpoint returned 401).\nBag: local memory only; no store writes.`));
