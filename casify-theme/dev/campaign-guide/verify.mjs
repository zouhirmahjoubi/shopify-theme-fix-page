import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderGuide, previewProduct, theme } from './preview.mjs';

const normal = await renderGuide();
assert.match(normal, /Find the right case for your phone\./);
assert.match(normal, /href="\/products\/mobile-phone-case-apple"/);
assert.match(normal, /\$49\.99/);
assert.match(normal, /Save 18% on each/);
assert.match(normal, /Save 31% on each/);
assert.doesNotMatch(normal, /campaign-guide__rating|campaign-guide__proof|campaign-guide__detail/);
assert.equal((normal.match(/<h1\b/g) || []).length, 1);

const ratedProduct = previewProduct();
ratedProduct.metafields = { reviews: { rating: { value: { rating: 4.6, scale_max: 5 } }, rating_count: { value: 12 } } };
const rated = await renderGuide({ product: ratedProduct });
assert.match(rated, /4\.6 \/ 5 from 12 reviews/);
assert.match(rated, /--fill: 92/);
ratedProduct.metafields.reviews.rating_count.value = 0;
assert.doesNotMatch(await renderGuide({ product: ratedProduct }), /campaign-guide__rating/);

const empty = await renderGuide({ product: null, settings: { heading_level: 'h2', show_offer: false }, designMode: true });
assert.match(empty, /href="\/collections\/all"/);
assert.doesNotMatch(empty, /<img\b|<h1\b|campaign-guide__offer/);
assert.match(empty, /Choose a featured product/);

const custom = await renderGuide({ settings: { heading: '<script>alert(1)</script>', reasons_heading: 'For your daily commute', cta_url: '/collections/all' } });
assert.match(custom, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.match(custom, /<h2>For your daily commute<\/h2>/);
assert.doesNotMatch(custom, /href="\/products\//);

const productWithDetails = previewProduct();
productWithDetails.images.push(productWithDetails.featured_image, productWithDetails.featured_image);
assert.equal((await renderGuide({ product: productWithDetails })).match(/class="campaign-guide__detail"/g).length, 2);
const variedProduct = previewProduct();
variedProduct.price_varies = true;
assert.match(await renderGuide({ product: variedProduct }), /From \$49\.99/);

const draftQuote = { type: 'testimonial', id: 'draft', settings: { quote: 'Incomplete fixture', author: '' } };
assert.doesNotMatch(await renderGuide({ extraBlocks: [draftQuote] }), /Incomplete fixture|campaign-guide__proof/);
const quoteFixture = { type: 'testimonial', id: 'test-only', settings: { quote: 'Test-only review fixture', author: 'Test fixture', source_url: 'https://example.com/review' } };
const withQuote = await renderGuide({ extraBlocks: [quoteFixture] });
assert.match(withQuote, /Test-only review fixture/);
assert.match(withQuote, /href="https:\/\/example.com\/review"/);
assert.match(await renderGuide({ style: 'story' }), /campaign-guide--story/);

const template = JSON.parse(await readFile(resolve(theme, 'templates/page.campaign-guide.json'), 'utf8'));
assert.deepEqual(template.order, ['guide']);
for (const id of template.sections.guide.block_order) assert.ok(template.sections.guide.blocks[id]);
console.log('Passed: real product links and price, offers, missing product/photos/reviews, rating scale, custom copy, escaped headline, testimonials, story layout and template structure.');
