const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'payments-readiness-2026-10-07');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
const writeJson = (name, data) => fs.writeFileSync(path.join(root, name), JSON.stringify(data, null, 2) + '\n');
const home = readJson('templates/index.json');
const s = home.sections;
s.trust_bar.blocks['t-1'].settings.body = 'See our return policy';
s.trust_bar.blocks['t-2'].settings.body = 'Checkout through Shopify';
Object.assign(s.phone_scan.settings, {
  heading_1: 'Choose your', heading_2: 'phone case',
  statement: 'Choose a case and check its model list before ordering. Select the model that matches your phone.',
  scan_text: 'Browse the collection and check the available models on each case.',
  closing: 'Pick your phone model and explore the available cases.',
  show_store_rating: false, store_rating: '', store_rating_count: ''
});
Object.assign(s.casify_hero_U3GTzw.settings, {
  supporting_text: 'Explore available iPhone cases and choose your model.'
});
Object.assign(s.spotlight.settings, {
  heading: 'Find a case for your everyday',
  subheading: '<p>Browse the styles, then select your phone model from the options on the product page.</p>'
});
Object.assign(s.orbit.settings, {
  eyebrow: 'On the turntable',
  subheading: '<p>Watch the collection turn, or drag to spin. Open a case to check its model options and details.</p>',
  perk_returns_note: 'See our return policy',
  perk_dispatch: 'Dispatch in 1–3 days',
  perk_dispatch_note: 'Business days, from order',
  perk_checkout_note: 'Checkout through Shopify'
});
Object.assign(s.shop.settings, {
  eyebrow: 'From the collection', heading: 'Cases on the counter',
  subheading: '<p>Explore available designs and choose the model that matches your phone.</p>'
});
s.showcase.disabled = true;
s.showcase.blocks = {};
s.showcase.block_order = [];
s.showcase.settings = {eyebrow: 'Shop the range', heading: 'Explore the collection', subheading: ''};
const tabs = [
  ['Choose', 'Choose your phone model', '<p>Check your model name in your phone settings, then select the matching model on the product page.</p>'],
  ['Charging', 'Check charging compatibility', '<p>Charging compatibility varies by case. Read the individual product details for magnetic and wireless charging information.</p>'],
  ['Fit', 'Check the model list', '<p>Each product page lists its available phone models. Choose the one that matches your phone before adding it to your bag.</p>'],
  ['Style', 'Pick your preferred finish', '<p>Browse the product photos and available colours to choose the style you want.</p>']
];
tabs.forEach(([label, heading, text], i) => Object.assign(s.feature_tabs.blocks['tab-' + (i + 1)].settings, {label, heading, text}));
s.feature_tabs.settings.heading = 'Choose a case that suits you';
s.feature_tabs.settings.intro = 'Four things to check before you order.';
const choiceBlocks = {
  'fix-0': {type:'fix', settings:{icon:'slim', metric_value:'1', metric_unit:'', problem:'Find your phone model', body:'<p>Look up the model name in your phone settings. On each product page, choose the matching option before ordering.</p>', them_title:'', them_label:'', us_title:'', us_label:''}},
  'fix-1': {type:'fix', settings:{icon:'magnet-ring', metric_value:'2', metric_unit:'', problem:'Read the product details', body:'<p>Materials, charging compatibility and features vary by case. Check the details for the particular design you choose.</p>', them_title:'', them_label:'', us_title:'', us_label:''}},
  'fix-2': {type:'fix', settings:{icon:'uv-sun', metric_value:'3', metric_unit:'', problem:'Choose your style', body:'<p>Use the photos and colour options to find the case you want. Your chosen model and colour appear in your bag before checkout.</p>', them_title:'', them_label:'', us_title:'', us_label:''}},
  'ben-0': {type:'benefit', settings:{icon:'wireless-charge', title:'Compatibility details', body:'Check the product page for charging and accessory information.'}},
  'ben-1': {type:'benefit', settings:{icon:'precision-fit', title:'Model options', body:'Select the phone model listed on the product page.'}},
  'ben-2': {type:'benefit', settings:{icon:'sparkle-clear', title:'Photos and colours', body:'See the available finishes before choosing your case.'}},
  'ben-3': {type:'benefit', settings:{icon:'truck-fast', title:'Free shipping', body:'On every order. Dispatch in 1–3 business days.'}},
  'ben-4': {type:'benefit', settings:{icon:'returns', title:'30-day returns', body:'Read our return policy for conditions and instructions.'}},
  'ben-5': {type:'benefit', settings:{icon:'button-click', title:'Help choosing', body:'Use our contact page if you have a question before ordering.'}}
};
s.value.blocks = choiceBlocks;
s.value.block_order = Object.keys(choiceBlocks);
s.value.settings = {eyebrow:'Before you order', heading:'Three steps to choose your case', subheading:'<p>Start with your phone model, then check the details and pick your style.</p>', benefits_heading:'Shopping with Casify', proof_eyebrow:'', proof_heading:'', proof_footnote:''};
s.us_vs_them.disabled = true;
s.us_vs_them.blocks = {};
s.us_vs_them.block_order = [];
s.us_vs_them.settings = {eyebrow:'Shop information', heading:'Choose your case', subheading:'', surface:'white', us_label:'Casify', us_product:'', us_sticker:'', them_label:'', note:'', button_label:'Find my model', button_link:'shopify://collections/all', button_note:'Free shipping on every order · 30-day returns'};
Object.assign(s.iphone.settings, {
  eyebrow: 'Explore iPhone cases', heading: 'Find your iPhone case',
  subheading: '<p>Open a product to see the phone models available for that case.</p>'
});
Object.assign(s.social.settings, {
  heading: 'Customer feedback', intro: 'Published product ratings and customer feedback.',
  show_store_rating: false, store_rating: '', store_rating_count: '',
  empty_heading: 'No published ratings yet', empty_text: 'Published customer ratings will appear here when available.',
  ledger_empty_text: 'Customer feedback will appear here when published.',
  source_note: 'Ratings shown here come from published product review data.',
  thank_you_text: 'For sharing your experience with Casify.',
  badge_heading: 'Product feedback', badge_text: 'Published product ratings'
});
['ugc','trustpilot_reviews','facebook_testimonials','customer_reviews','facebook_comments'].forEach(id => { s[id].disabled = true; });
Object.assign(s.risk.blocks['g-0'].settings, {title:'30-day returns', body:'You have 30 days after delivery to request a return. Read our return policy for conditions and instructions.'});
const faqs = [
  ['How do I choose the right model?', '<p>Check your model name in your phone settings, then choose the matching model from the list on the product page.</p>'],
  ['Does this case support wireless charging?', '<p>Compatibility varies by design. Read the product details for the case you choose and check your charger requirements.</p>'],
  ['Which materials and finishes are available?', '<p>See each product page for its materials, photos and available colours. The details vary by case.</p>'],
  ['Where can I check the case details?', '<p>Open the product page to review its description, photos and available options before ordering.</p>'],
  ['What if I ordered the wrong model?', '<p>Contact us with your order number. Read our return policy for the conditions and instructions that apply to your order.</p>'],
  ['Can I buy more than one case?', '<p>You can choose a pack on the product page. Review your selected cases and the final order total at checkout.</p>']
];
faqs.forEach(([question, answer], i) => Object.assign(s.risk.blocks['faq-' + i].settings, {question, answer}));
s.risk.blocks['note-1'].settings.text = '30-day returns';
Object.assign(s.risk.settings, {
  guard_eyebrow: 'Shopping with Casify', guard_heading: 'Shipping and returns',
  faq_heading: 'Questions before you order',
  closer_heading: 'Find your next case', closer_body: '<p>Choose your phone model and preferred style. Orders dispatch in 1–3 business days.</p>'
});
writeJson('templates/index.json', home);
const header = readJson('sections/header-group.json');
header.sections.header.settings.ticker_text = 'Casify phone cases · Free shipping · 30-day returns';
header.sections.header.settings.topbar_pill = '';
writeJson('sections/header-group.json', header);
const footer = readJson('sections/footer-group.json');
Object.assign(footer.sections.footer.settings, {blurb:'Phone cases for iPhone and Samsung. Browse the styles and choose the model that matches your phone.', show_policy_links:true});
writeJson('sections/footer-group.json', footer);
const replace = (name, before, after) => {
  const full = path.join(root, name);
  const source = fs.readFileSync(full, 'utf8');
  if (!source.includes(before)) throw new Error('Missing target in ' + name);
  fs.writeFileSync(full, source.replaceAll(before, after));
};
replace('sections/header.liquid', 'Est. 1920 · Free shipping · 30-day returns', 'Casify phone cases · Free shipping · 30-day returns');
replace('sections/header.liquid', ', "default": "★ EST. 1920 · Still on awning duty"', '');
replace('sections/footer.liquid', 'An old-fashioned candy shop, online. Tins, cases, ribbons — wrapped by hand since 1920.', 'Phone cases for iPhone and Samsung. Browse the styles and choose the model that matches your phone.');
['sections/cv-phone-scan.liquid','sections/cv-social-proof.liquid'].forEach(name => {
  replace(name, '"id": "show_store_rating", "label": "Show store rating", "default": true', '"id": "show_store_rating", "label": "Show store rating", "default": false');
  replace(name, '"id": "store_rating", "label": "Store rating (out of 5)", "default": "4.9"', '"id": "store_rating", "label": "Store rating (out of 5)"');
  replace(name, '"id": "store_rating_count", "label": "Store review count", "default": "952"', '"id": "store_rating_count", "label": "Store review count"');
});
const locale=readJson('locales/en.default.json');
Object.assign(locale.sections.footer,{policies:'Store policies',shipping:'Shipping',returns:'Returns & refunds',privacy:'Privacy',terms:'Terms of service',contact:'Contact'});
writeJson('locales/en.default.json',locale);
console.log('Updated homepage, header/footer groups, safe rating defaults and footer translations.');
