// One-off: places the new sections and blocks into the theme's JSON templates
// with real (store-stated) content, so they appear on the storefront and in the
// theme editor. Run from the theme root: node dev/place-sections.cjs
const fs = require('fs');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const write = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');

function insertAfter(t, afterId, id, section) {
  if (t.sections[id]) throw new Error(id + ' already exists in template');
  t.sections[id] = section;
  const i = t.order.indexOf(afterId);
  if (i < 0) throw new Error('anchor section missing: ' + afterId);
  t.order.splice(i + 1, 0, id);
}

function withBlocks(section, list) {
  section.blocks = {};
  section.block_order = [];
  list.forEach((blk, i) => {
    const key = blk.id || blk.type + '-' + (i + 1);
    section.blocks[key] = { type: blk.type, settings: blk.settings || {} };
    section.block_order.push(key);
  });
  return section;
}

const empty = (type, n) => Array.from({ length: n }, () => ({ type }));

/* ---------------- Home ---------------- */
const home = read('templates/index.json');

insertAfter(home, 'showcase', 'feature_tabs', withBlocks({
  type: 'cv-feature-tabs',
  settings: { heading: 'Made for the way you carry', intro: 'Four things every Casify case is built around.', surface: 'cream' }
}, [
  { type: 'tab', settings: { label: 'Protection', icon: 'drop-shield', tone: 'red', heading: 'Protection you forget is there', text: '<p>Slim in the hand, tough where it counts — cut for your exact phone, not a size that’s “close enough.”</p>', link: 'shopify://collections/all', link_label: 'Shop cases' } },
  { type: 'tab', settings: { label: 'Charging', icon: 'wireless-charge', tone: 'teal', heading: 'MagSafe ready', text: '<p>Use it with MagSafe chargers and accessories without taking the case off.</p>' } },
  { type: 'tab', settings: { label: 'Fit', icon: 'precision-fit', tone: 'gold', heading: 'Cut for your exact model', text: '<p>Each case is cut from your phone’s own CAD file — one mould per model, so the fit is exact, not “close enough”.</p>' } },
  { type: 'tab', settings: { label: 'Finish', icon: 'sparkle-clear', tone: 'red', heading: 'Candy stripes that stay put', text: '<p>Screen-printed candy stripes under a UV-cured top coat.</p>' } }
]));

insertAfter(home, 'value', 'us_vs_them', withBlocks({
  type: 'cv-vs',
  settings: {
    eyebrow: 'Us vs. them',
    heading: 'Not all cases are made the same',
    surface: 'white',
    us_label: 'Casify',
    us_product: 'mobile-phone-case-apple',
    us_sticker: '30-day returns',
    them_label: 'Ordinary cases',
    note: 'Every Casify case ships with the same shop promises.',
    button_label: 'Find my model',
    button_link: 'shopify://collections/all',
    button_note: 'Free shipping on every order · 30-day returns'
  }
}, [
  { type: 'row', settings: { us_text: 'Cut for your exact model', them_text: 'One size stretched across models' } },
  { type: 'row', settings: { us_text: 'MagSafe ready', them_text: 'Check the listing for magnets' } },
  { type: 'row', settings: { us_text: 'Free shipping on every order', them_text: 'Shipping often added at checkout' } },
  { type: 'row', settings: { us_text: '30-day returns, prepaid label', them_text: 'Returns often at your own cost' } }
]));

// Review sections: placed with empty slots. They stay hidden from shoppers until
// real reviews are typed in, and show fill-in prompts in the theme editor.
insertAfter(home, 'social', 'trustpilot_reviews', withBlocks({
  type: 'trustpilot-reviews',
  settings: { heading: 'Rated on Trustpilot', accent_text: 'Straight from our shoppers', link_label: 'Read all reviews on Trustpilot', surface: 'white', layout: 'carousel', trustscore: 0 }
}, empty('review', 3)));

insertAfter(home, 'trustpilot_reviews', 'facebook_testimonials', withBlocks({
  type: 'facebook-testimonials',
  settings: { heading: 'Seen on Facebook', accent_text: 'From our community', surface: 'cream', layout: 'carousel', float_cards: true }
}, empty('post', 3)));

insertAfter(home, 'facebook_testimonials', 'customer_reviews', withBlocks({
  type: 'customer-reviews-carousel',
  settings: { surface: 'cream' }
}, empty('review', 3)));

insertAfter(home, 'customer_reviews', 'facebook_comments', withBlocks({
  type: 'facebook-comments',
  settings: { surface: 'cream' }
}, empty('comment', 3)));

insertAfter(home, 'risk', 'offer_delivery', {
  type: 'cv-offer-courier',
  settings: {
    eyebrow: 'From the counter',
    heading: 'Two cases? 18% off each. Three? 31% off.',
    text: '<p>Pick a pack on any case and the saving comes off automatically at checkout — no code needed.</p>',
    code: '',
    apply_code: false,
    button_label: 'Shop cases',
    link: 'shopify://collections/all',
    fine_print: 'Free shipping on every order · 30-day returns',
    tone: 'red',
    bubble_before: 'Hold on — I’ve got something for you!',
    bubble_after: 'Here you go!'
  }
});
write('templates/index.json', home);

/* ---------------- Product pages ---------------- */
for (const f of ['templates/product.json', 'templates/product.convert.json']) {
  const t = read(f);
  const main = t.sections.main;
  if (main.type !== 'cv-product-counter') throw new Error(f + ': main is ' + main.type);
  if (!main.blocks['google-rating']) {
    main.blocks['google-rating'] = { type: 'google_rating', settings: {} };
    main.block_order.push('google-rating');
  }
  if (!main.blocks['sales-note']) {
    main.blocks['sales-note'] = { type: 'sales_note', settings: { style: 'pill', metafield: 'custom.sold_recently', text: '[count] sold this week', round_to: '1', min_count: 5, tone: 'gold' } };
    main.block_order.push('sales-note');
  }

  const anchor = t.order.includes('reviews') ? 'reviews' : t.order[t.order.length - 1];
  insertAfter(t, anchor, 'ratings_reviews', withBlocks({
    type: 'cs-customer-proof',
    settings: { eyebrow: 'From our customers', heading: 'Customer reviews', desktop_columns: 'list', heading_align: 'center', surface: 'white' }
  }, [
    { id: 'rating', type: 'cs-rating', settings: { source: 'product', layout: 'inline', alignment: 'center', inline_style: 'pill', empty_style: 'full' } },
    { id: 'review-1', type: 'cs-review' },
    { id: 'review-2', type: 'cs-review' },
    { id: 'review-3', type: 'cs-review' }
  ]));
  write(f, t);
}
console.log('templates updated');
