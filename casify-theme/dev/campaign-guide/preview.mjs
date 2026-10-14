import http from 'node:http';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, relative, isAbsolute } from 'node:path';

const require = createRequire(new URL('../conversion-home/package.json', import.meta.url));
const { Liquid } = require('liquidjs');
export const here = dirname(fileURLToPath(import.meta.url));
export const theme = resolve(here, '../..');
const translations = JSON.parse(await readFile(resolve(theme, 'locales/en.default.json'), 'utf8'));
const catalog = JSON.parse(await readFile(resolve(theme, 'dev/og/products.json'), 'utf8'));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const imageSource = value => typeof value === 'string' ? value : value?.src || '';
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) / 100);
const defaults = settings => Object.fromEntries(settings.filter(s => s.id).map(s => [s.id, s.default ?? (s.type === 'checkbox' ? false : '')]));
const engine = new Liquid({ root: resolve(theme, 'snippets'), partials: resolve(theme, 'snippets'), extname: '.liquid' });
engine.registerTag('doc', { parse(token, remaining) { while (remaining.length) { if (remaining.shift().name === 'enddoc') return; } throw new Error('Unclosed doc tag'); }, render() { return ''; } });
engine.registerFilter('asset_url', name => `/assets/${name}`);
engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${escapeHtml(url)}">`);
engine.registerFilter('image_url', imageSource);
engine.registerFilter('image_tag', (src, ...options) => {
  const attrs = Object.fromEntries(options.filter(option => Array.isArray(option)));
  const properties = Object.entries(attrs).filter(([key]) => !['widths', 'preload'].includes(key)).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ');
  return `<img src="${escapeHtml(src)}" width="800" height="800" ${properties}>`;
});
engine.registerFilter('money', money);
engine.registerFilter('t', (key, ...options) => {
  const value = key.split('.').reduce((object, part) => object?.[part], translations);
  if (typeof value !== 'string') throw new Error(`Missing translation: ${key}`);
  const params = Object.fromEntries(options.filter(option => Array.isArray(option)));
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => escapeHtml(params[name] ?? ''));
});

export function previewProduct() {
  const item = catalog.find(product => product.handle === 'mobile-phone-case-apple');
  const photo = { src: `/photos/${item.img.split('/').at(-1)}`, alt: item.title, width: 800, height: 800 };
  return { handle: item.handle, title: item.title, price_min: Math.round(Number(item.price.replace(/[^\d.]/g, '')) * 100), price_varies: false, url: `/products/${item.handle}`, featured_image: photo, images: [photo], metafields: {} };
}

export async function renderGuide({ style = 'list', product = previewProduct(), settings: overrides = {}, extraBlocks = [], designMode = false } = {}) {
  const source = await readFile(resolve(theme, 'sections/cv-campaign-guide.liquid'), 'utf8');
  const schema = JSON.parse(source.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/)[1]);
  const template = JSON.parse(await readFile(resolve(theme, 'templates/page.campaign-guide.json'), 'utf8')).sections.guide;
  const settings = { ...defaults(schema.settings), ...template.settings, featured_product: product, layout: style, ...overrides };
  const blocks = [...template.block_order.map(id => ({ ...template.blocks[id], id })), ...extraBlocks].map(block => ({ ...block, settings: { ...defaults(schema.blocks.find(type => type.type === block.type)?.settings || []), ...block.settings }, shopify_attributes: '' }));
  const context = { section: { id: 'campaign-preview', index: 1, settings, blocks }, routes: { all_products_collection_url: '/collections/all' }, request: { design_mode: designMode }, shop: { name: 'Casify' } };
  const markup = await engine.parseAndRender(source.replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/g, ''), context);
  return `<div id="shopify-section-campaign-preview" class="shopify-section">${markup}</div>`;
}

export async function previewHtml(options = {}) {
  const guide = await renderGuide(options);
  const fonts = await engine.parseAndRender(await readFile(resolve(theme, 'snippets/cv-fonts.liquid'), 'utf8'), {});
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Casify · Campaign guide preview</title>${fonts}<link rel="stylesheet" href="/assets/theme.css"><style>.guide-preview-note{padding:10px 20px;background:var(--cocoa-700);color:var(--cream-50);font:12px/1.5 var(--font-label);text-align:center}.guide-preview-header,.guide-preview-footer{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:20px max(20px,calc((100vw - 1112px)/2));background:var(--cream-100);font:14px/1.5 var(--font-label)}.guide-preview-header img{width:120px;height:40px;object-fit:contain}.guide-preview-footer{border-top:1px dashed var(--cocoa-400)}@media(max-width:599px){.guide-preview-note{font-size:11px}.guide-preview-header{padding:14px 20px}.guide-preview-header img{width:100px}.guide-preview-header a{font-size:12px}}</style></head><body><div class="guide-preview-note">Local preview · Real catalog photo and price · Store header/footer are simplified</div><header class="guide-preview-header"><a href="/" aria-label="Casify home"><img src="/assets/casify-logo.svg" alt="Casify" width="120" height="40"></a><a href="/collections/all">Browse cases</a></header><main id="MainContent">${guide}</main><footer class="guide-preview-footer"><span>Casify</span><a href="/?style=${options.style === 'story' ? 'list' : 'story'}">Preview ${options.style === 'story' ? 'numbered reasons' : 'story style'}</a></footer></body></html>`;
}

const contentTypes = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
async function serveFile(response, directory, filename) {
  const root = await realpath(directory);
  const file = await realpath(resolve(root, filename));
  const rel = relative(root, file);
  if (rel.startsWith('..') || isAbsolute(rel) || !contentTypes[extname(file).toLowerCase()]) throw new Error('Unsupported asset');
  response.writeHead(200, { 'Content-Type': contentTypes[extname(file).toLowerCase()] });
  response.end(await readFile(file));
}

if (process.argv.includes('--serve')) {
  const port = 4198;
  http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://127.0.0.1:${port}`);
      if (url.pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(await previewHtml({ style: url.searchParams.get('style') === 'story' ? 'story' : 'list' }));
      } else if (url.pathname.startsWith('/assets/')) {
        await serveFile(response, resolve(theme, 'assets'), decodeURIComponent(url.pathname.slice(8)));
      } else if (url.pathname.startsWith('/photos/')) {
        await serveFile(response, resolve(theme, 'dev/og/photos'), decodeURIComponent(url.pathname.slice(8)));
      } else if (url.pathname.startsWith('/products/') || url.pathname === '/collections/all') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<h1>Shopping link verified</h1><p>This preview stops here. The same link on Shopify opens the existing product or collection page.</p><a href="/">Back to the guide</a>');
      } else { response.writeHead(404); response.end('Not found'); }
    } catch (error) { response.writeHead(500); response.end(escapeHtml(error.message)); }
  }).listen(port, '127.0.0.1', () => process.stdout.write(`Campaign guide: http://127.0.0.1:${port}/\n`));
} else if (process.argv.includes('--render')) {
  await mkdir(resolve(here, 'rendered'), { recursive: true });
  await writeFile(resolve(here, 'rendered/guide.html'), await previewHtml());
  process.stdout.write('Rendered the actual Liquid section.\n');
}
