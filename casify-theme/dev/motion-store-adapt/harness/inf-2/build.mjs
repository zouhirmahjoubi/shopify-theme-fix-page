// INF-2 acceptance harness (dev only): builds harness/inf-2-cart-preview.html. Renders snippets/cart-drawer.liquid for every
// cart state (A,B qty 0..4) with stable keys and a fixture pack discount, and serves the
// matching state from the stub's Section Rendering answer.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const tools = resolve(here, '../../tools');
const tmp = resolve(here, 'tmp'); mkdirSync(tmp, { recursive: true });
const IMG = 'asset:best-case-detail.png';
const V = {
  A: { id: 41001, opts: ['Russet Brown', 'iPhone 17 Pro Max'], price: 4999 },
  B: { id: 41002, opts: ['Russet Brown', 'iPhone 17 Pro'], price: 4999 },
};
const product = { title: 'Tech Fabric Magnetic Phone Case for iPhone', handle: 'tech-fabric', options: ['Color', 'Model'],
  media: [{ src: IMG, alt: 'Fixture photo' }],
  variants: [ { id: 41001, options: V.A.opts, price: 4999, media: 0 }, { id: 41002, options: V.B.opts, price: 4999, media: 0 }, { id: 41003, options: ['Sage Green', 'iPhone 16'], price: 4999, media: 0 } ] };
function cartFor(qa, qb) {
  const items = [];
  for (const [n, q] of [['B', qb], ['A', qa]]) if (q > 0) {
    const v = V[n];
    items.push({ key: v.id + ':fixture', id: v.id, variant_id: v.id, quantity: q, title: product.title + ' - ' + v.opts.join(' / '),
      product: { title: product.title, handle: 'tech-fabric', url: '/products/tech-fabric', has_only_default_variant: false },
      variant: { id: v.id, title: v.opts.join(' / ') }, image: null, url: '/products/tech-fabric?variant=' + v.id,
      price: v.price, final_line_price: v.price * q, line_price: v.price * q,
      options_with_values: [{ name: 'Color', value: v.opts[0] }, { name: 'Model', value: v.opts[1] }] });
  }
  const n = qa + qb, sub = items.reduce((s, i) => s + i.final_line_price, 0);
  const pct = n >= 3 ? 31 : n === 2 ? 18 : 0;
  const off = Math.round(sub * pct / 100);
  const disc = pct ? [{ title: `fixture: ${n >= 3 ? 3 : 2} case pack ${pct}% off`, total_allocated_amount: off }] : [];
  return { item_count: n, items, items_subtotal_price: sub, total_price: sub - off, original_total_price: sub, total_discount: off,
    cart_level_discount_applications: disc, discount_applications: disc, note: '', attributes: {}, currency: { iso_code: 'USD' }, requires_shipping: n > 0 };
}
function render(cart, out, settings = {}) {
  const fx = { template_name: 'index', product, globals: { cart }, settings,
    harness: { js: ['theme.js', 'cart.js', 'cv-quick-pick.js'], css: [] } };
  const f = resolve(tmp, 'fx.json'); writeFileSync(f, JSON.stringify(fx));
  execFileSync('node', [resolve(tools, 'render-section.mjs'), resolve(here, 'page.liquid'), '--fixture', f, '--out', out, '--title', 'INF-2 cart preview (fixture)'], { stdio: 'pipe' });
  return readFileSync(out, 'utf8');
}
const REQ = JSON.parse(readFileSync(resolve(here, '../../locale-requests/INF-2.json'), 'utf8'));
function loc(html) { return html.replace(/translation missing: en\.([a-z_.]+)/g, (m, k) => { const v = REQ[k]; if (v == null) return m; return v.replace(/\{\{ *title *\}\}/g, product.title).replace(/\{\{ *pct *\}\}/g, k === 'general.cart.nudge_two' ? '18' : '31').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }); }
function asideOf(html) { html = loc(html); const m = html.match(/<aside class="cart-drawer"[\s\S]*?<\/aside>/); return m ? m[0] : ''; }
const states = {};
for (let qa = 0; qa <= 4; qa++) for (let qb = 0; qb <= 4; qb++) {
  const html = render(cartFor(qa, qb), resolve(tmp, `s-${qa}-${qb}.html`));
  states[`${qa}-${qb}`] = `<div id="shopify-section-cv-cart-drawer" class="shopify-section">${asideOf(html)}</div>`;
}
function jsCart(c) { return { token: 'fixture-cart', item_count: c.item_count, total_price: c.total_price, items_subtotal_price: c.items_subtotal_price, cart_level_discount_applications: [], currency: 'USD',
  items: c.items.map(i => ({ id: i.id, variant_id: i.variant_id, key: i.key, quantity: i.quantity, title: i.title, product_title: i.product.title, variant_title: i.variant.title, price: i.price, line_price: i.line_price, final_price: i.price, final_line_price: i.final_line_price, image: null, url: i.url, handle: 'tech-fabric' })) }; }
const pjs = { id: 9001, title: product.title, handle: 'tech-fabric', price: 4999, compare_at_price: null, featured_image: '/assets/best-case-detail.png',
  options: [{ name: 'Color', position: 1, values: ['Russet Brown', 'Sage Green'] }, { name: 'Model', position: 2, values: ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 16'] }],
  variants: [
    { id: 41001, title: 'Russet Brown / iPhone 17 Pro Max', options: ['Russet Brown', 'iPhone 17 Pro Max'], price: 4999, compare_at_price: null, available: true, featured_image: null },
    { id: 41002, title: 'Russet Brown / iPhone 17 Pro', options: ['Russet Brown', 'iPhone 17 Pro'], price: 4999, compare_at_price: null, available: true, featured_image: null },
    { id: 41004, title: 'Russet Brown / iPhone 16', options: ['Russet Brown', 'iPhone 16'], price: 4999, compare_at_price: null, available: false, featured_image: null },
    { id: 41003, title: 'Sage Green / iPhone 16', options: ['Sage Green', 'iPhone 16'], price: 4999, compare_at_price: null, available: true, featured_image: null },
    { id: 41005, title: 'Sage Green / iPhone 17 Pro', options: ['Sage Green', 'iPhone 17 Pro'], price: 4999, compare_at_price: null, available: true, featured_image: null } ] };
const inject = `<script>(function(){var F=window.__STUB_FIXTURE; var S=${JSON.stringify(states).replace(/<\//g, '<\\/')};
F.cart=${JSON.stringify(jsCart(cartFor(1, 1)))};
F.variants=${JSON.stringify(pjs.variants.map(v => ({ id: v.id, title: v.title, price: v.price, product_title: pjs.title, product_handle: 'tech-fabric', options: v.options, available: v.available })))};
F.sections={}; Object.defineProperty(F.sections,'cv-cart-drawer',{enumerable:true,get:function(){var c=window.__stubFetch?window.__stubFetch.cart():F.cart;var qa=0,qb=0;c.items.forEach(function(i){if(i.id==41001)qa=i.quantity;if(i.id==41002)qb=i.quantity;});return S[qa+'-'+qb]||S['0-0'];}});
})();</script>`;
const postStub = `<script>(function(){var P=${JSON.stringify(pjs)};var f=window.fetch;window.fetch=function(u,i){var s=typeof u==='string'?u:u.url;if(/\\/products\\/[^/]+\\.js/.test(s)){return new Promise(function(r){setTimeout(function(){r(new Response(JSON.stringify(P),{status:200,headers:{'Content-Type':'application/json'}}))},80)});}return f.apply(this,arguments);};if(/[?&]openonadd=1/.test(location.search)){document.addEventListener('DOMContentLoaded',function(){var a=document.getElementById('cm-cart-drawer');if(a)a.setAttribute('data-open-on-add','');});}document.addEventListener('click',function(e){if(e.target.id==='legacy')document.dispatchEvent(new CustomEvent('cart:updated'));});window.__ev=[];['cart:drawer:refreshed','cart:drawer:open','cart:drawer:close','cart:added','cv:cart'].forEach(function(n){document.addEventListener(n,function(e){var d=e.detail||{};window.__ev.push({n:n,added:d.added,removed:d.removed,changed:d.changed,source:d.source,qty:d.qty,img:d.img,from:d.from&&d.from.id});});});})();</script>`;
for (const [name, settings] of [['inf-2-cart-preview', {}]]) {
  const out = resolve(here, '..', name + '.html');
  let html = loc(render(cartFor(1, 1), out, settings));
  html = html.replace(/(<script src="[^"]*stub-fetch\.js"><\/script>)/, (m) => inject + '\n' + m + '\n' + postStub);
  writeFileSync(out, html);
  console.log('built', out);
}
