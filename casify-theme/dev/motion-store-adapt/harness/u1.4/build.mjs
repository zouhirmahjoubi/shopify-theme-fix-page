// U1.4 harness (dev only): renders sections/cv-cart.liquid with liquidjs for every bag state
// (line A qty 0..3, line B qty 0..3) with stable keys and a fixture pack discount, and serves the
// matching state as the stub's Section Rendering answer, so qty and remove really change the page.
// Pages: cart-model.html (phone model option), cart-no-model.html (no model option, one default
// variant), cart-empty.html, cart-free-ship.html (cv_free_shipping_all on).
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const tools = resolve(here, '../../tools');
const tmp = resolve(here, 'tmp'); mkdirSync(tmp, { recursive: true });
const IMG = 'asset:best-case-detail.png';
const REQ = JSON.parse(readFileSync(resolve(here, '../../locale-requests/U1.4.json'), 'utf8'));

const SETS = {
  model: {
    title: 'Tech Fabric Magnetic Phone Case for iPhone', options: ['Color', 'Model'],
    A: { id: 41001, opts: ['Russet Brown', 'iPhone 17 Pro Max'], price: 4999, dflt: false },
    B: { id: 41002, opts: ['Sage Green', 'iPhone 16'], price: 4999, dflt: false },
  },
  nomodel: {
    title: 'Tech Fabric Phone Case (fixture, no model option)', options: ['Color'],
    A: { id: 43001, opts: ['Russet Brown'], price: 3999, dflt: false },
    B: { id: 43002, opts: ['Default Title'], price: 1499, dflt: true, title: 'Case care cloth (fixture, single variant)' },
  },
};

function cartFor(set, qa, qb) {
  const S = SETS[set], items = [];
  for (const [n, q] of [['A', qa], ['B', qb]]) if (q > 0) {
    const v = S[n], ptitle = v.title || S.title, line = items.length + 1;
    items.push({ key: v.id + ':fixture', id: v.id, variant_id: v.id, quantity: q, title: ptitle + ' - ' + v.opts.join(' / '),
      product: { title: ptitle, handle: 'tech-fabric', url: '/products/tech-fabric', has_only_default_variant: v.dflt },
      variant: { id: v.id, title: v.opts.join(' / ') }, image: { src: '../../../../assets/best-case-detail.png', alt: '' },
      url: '/products/tech-fabric?variant=' + v.id, url_to_remove: `/cart/change?line=${line}&quantity=0`,
      price: v.price, final_price: v.price, final_line_price: v.price * q, line_price: v.price * q, original_line_price: v.price * q,
      options_with_values: v.dflt ? [{ name: 'Title', value: 'Default Title' }] : S.options.map((name, i) => ({ name, value: v.opts[i] })) });
  }
  const n = qa + qb, sub = items.reduce((s, i) => s + i.final_line_price, 0);
  const pct = n >= 3 ? 31 : n === 2 ? 18 : 0, off = Math.round(sub * pct / 100);
  const disc = pct ? [{ title: `fixture: ${n >= 3 ? 3 : 2} case pack ${pct}% off`, total_allocated_amount: off }] : [];
  return { item_count: n, items, items_subtotal_price: sub, total_price: sub - off, original_total_price: sub, total_discount: off,
    cart_level_discount_applications: disc, discount_applications: disc, note: '', attributes: {}, currency: { iso_code: 'USD' }, requires_shipping: n > 0 };
}
function loc(html) {
  return html.replace(/translation missing: en\.([a-z_.]+)/g, (m, k) => {
    const v = REQ[k]; if (v == null) return m;
    return v.replace(/\{\{ *amount *\}\}/g, '$10.00').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  });
}
function render(set, cart, out, settings, js = true) {
  const fx = { template_name: 'cart', template: { file: 'templates/cart.json', key: 'main' }, section: { id: 'main' },
    globals: { cart }, settings, request: { page_type: 'cart', path: '/cart' },
    harness: { js: js ? ['theme.js', 'cart.js', 'cv-commerce-motion.js'] : [], css: [] } };
  const f = resolve(tmp, 'fx.json'); writeFileSync(f, JSON.stringify(fx));
  execFileSync('node', [resolve(tools, 'render-section.mjs'), 'cv-cart', '--fixture', f, '--out', out, '--title', 'U1.4 bag page (fixture)'], { stdio: 'pipe' });
  return loc(readFileSync(out, 'utf8'));
}
function sectionOf(html) {
  const m = html.match(/<div id="shopify-section-main" class="shopify-section">[\s\S]*?<\/div>\s*(?=<script|<\/main|<\/body|<!-- \/section)/);
  if (m) return m[0];
  const i = html.indexOf('<div id="shopify-section-main"'); const j = html.lastIndexOf('</div>', html.indexOf('</body>'));
  return html.slice(i, j + 6);
}
function jsCart(c) {
  return { token: 'fixture-cart', item_count: c.item_count, total_price: c.total_price, items_subtotal_price: c.items_subtotal_price, cart_level_discount_applications: [], currency: 'USD',
    items: c.items.map(i => ({ id: i.id, variant_id: i.variant_id, key: i.key, quantity: i.quantity, title: i.title, product_title: i.product.title, variant_title: i.variant.title, price: i.price, line_price: i.line_price, final_price: i.price, final_line_price: i.final_line_price, image: null, url: i.url, handle: 'tech-fabric' })) };
}

const PAGES = [
  ['cart-model', 'model', 1, 1, {}],
  ['cart-no-model', 'nomodel', 1, 1, {}],
  ['cart-empty', 'model', 0, 0, {}],
  ['cart-free-ship', 'model', 2, 1, { cv_free_shipping_all: true }],
];
for (const [name, set, qa0, qb0, settings] of PAGES) {
  const states = {};
  for (let qa = 0; qa <= 3; qa++) for (let qb = 0; qb <= 3; qb++) {
    const html = render(set, cartFor(set, qa, qb), resolve(tmp, `${name}-${qa}-${qb}.html`), settings);
    states[`${qa}-${qb}`] = sectionOf(html);
  }
  const A = SETS[set].A.id, B = SETS[set].B.id;
  const inject = `<script>(function(){var F=window.__STUB_FIXTURE; var S=${JSON.stringify(states).replace(/<\//g, '<\\/')};
F.cart=${JSON.stringify(jsCart(cartFor(set, qa0, qb0)))};
F.variants=${JSON.stringify(['A', 'B'].map(n => ({ id: SETS[set][n].id, title: SETS[set][n].opts.join(' / '), price: SETS[set][n].price, product_title: SETS[set][n].title || SETS[set].title, product_handle: 'tech-fabric', options: SETS[set][n].opts, available: true })))};
F.sections=F.sections||{}; Object.defineProperty(F.sections,'main',{enumerable:true,get:function(){var c=window.__stubFetch?window.__stubFetch.cart():F.cart;var qa=0,qb=0;c.items.forEach(function(i){if(i.id==${A})qa=i.quantity;if(i.id==${B})qb=i.quantity;});return S[qa+'-'+qb]||S['0-0'];}});
})();</script>`;
  const post = `<script>window.__ev=[];['cart:refresh','cart:drawer:refreshed'].forEach(function(n){document.addEventListener(n,function(){window.__ev.push(n);});});</script>`;
  const out = resolve(here, name + '.html');
  let html = render(set, cartFor(set, qa0, qb0), out, settings);
  html = html.replace(/(<script src="[^"]*stub-fetch\.js"><\/script>)/, m => inject + '\n' + m + '\n' + post);
  writeFileSync(out, html);
  const missing = [...new Set([...html.matchAll(/translation missing: en\.([a-z_.]+)/g)].map(m => m[1]))];
  console.log('built', name, missing.length ? 'MISSING ' + missing.join(',') : 'no missing keys');
}
