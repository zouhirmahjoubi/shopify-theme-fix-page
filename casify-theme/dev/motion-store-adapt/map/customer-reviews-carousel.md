# customer-reviews-carousel ("Customer reviews")

Paths are relative to `D:/Shopify Theme Fix & Page/casify-theme/`. Read-only pass, 2026-10-22.

## Status

LIVE (placed) on `templates/index.json` only: instance `customer_reviews` (type at :1441, three `review` blocks
:1442-1475 all with empty `review_text`, `rating "0"`, no products; `"settings": {}` at :1484). Position 17 of 21
in the home `order` (after `facebook_testimonials`, before `facebook_comments`).

Renders NOTHING on the storefront today: the guard `review_count > 0 or app_block_count > 0 or
request.design_mode` (sections/customer-reviews-carousel.liquid:30) fails because no block has text and there is
no `@app` block. The empty state "There are no reviews to display yet." (:144-151) is therefore only reachable in
the theme editor. Because `settings` is `{}`, the schema defaults would ship as soon as one review is filled:
heading "Customer reviews" (:184), accent "In their own words" (:185), cream surface, app heading "More customer
feedback" (:199).

## Purpose

A home-page rail of merchant-entered customer reviews (text, optional photo, star rating, name, detail, optional
featured product chip with price) plus a slot for review-app blocks (`@app`, :164-173). Shows a computed summary
"{avg} / 5 from N rated reviews shown here" (:39-51). Carousel controls appear only when the rail overflows
(assets/casify-customer-reviews.js:44-56).

## Files (owned / shared)

Owned:

- `sections/customer-reviews-carousel.liquid` (233 lines)
- Locale keys `sections.customer_reviews.*` in `locales/en.default.json` (used only by this section; the file
  itself is shared).

Shared (coordinate):

- `assets/casify-customer-reviews.css` (309 lines): also loaded by sections/trustpilot-reviews.liquid:1 and
  sections/facebook-testimonials.liquid:1; `.ccr` base styles are extended by assets/casify-trustpilot-reviews.css
  and assets/casify-facebook-testimonials.css.
- `assets/casify-customer-reviews.js` (169 lines): also loaded by trustpilot-reviews.liquid:3 and
  facebook-testimonials.liquid:3; hooks `[data-casify-customer-reviews]`, `[data-ccr-rail]`, `[data-ccr-card]`,
  `[data-ccr-controls]`, `[data-ccr-prev|next|position]`.
- `snippets/cv-stars.liquid` (:95).
- `templates/index.json`, `locales/en.default.json`.
- No layout gate (section prints its own CSS/JS).

## Store adaptation findings

1. MEDIUM, featured product price without "From": `{{ featured_product.price | money }}` (:122) prints the lowest
   variant price as if it were the price. Casify products have 44 to 81 variants built from style and phone model
   (PRODUCT.md:15, :31); when variants are priced differently this understates. Fix (owned):
   `{% if featured_product.price_varies %}{{ 'products.product.price_from' | t: price: ... }}{% else %}...` (add a
   locale key if none exists), and show `compare_at_price` only when it is higher than the price (live data).
2. MEDIUM, `reviewer_detail` (:108-110, schema :208) is free text with no guard, so a merchant can type "Verified
   buyer" without an order. Fix: schema info "Optional, e.g. a city or the case they bought. Write \"Verified
   buyer\" only after finding their order." (same rule as sections/review-carousel.liquid:327 and
   blocks/cs-review.liquid:106).
3. LOW, app heading reads oddly when the app is the only content: "More customer feedback" (:166-168, schema :199)
   renders above the app block even when there are no typed reviews before it. Fix: when `review_count == 0`,
   skip `app_heading` (the section heading already says "Customer reviews").
4. LOW, role overlap on the home page: `social` (cv-social-proof, 14), `trustpilot_reviews` (15),
   `facebook_testimonials` (16), `customer_reviews` (17), `facebook_comments` (18) and `ugc` (12) are six proof
   sections; all but `social` render empty or nothing today (STORE-FACTS.md 7e). When real reviews arrive, pick one
   home for them (PRODUCT.md:36 merge rule) instead of filling all six.
5. LOW, `photo_alt` falls back to the reviewer name (:77): acceptable, but a better default is
   "Photo from {{ name }}" via a locale key.
6. INFO, editor-only empty state: STORE-FACTS.md 7e lists "There are no reviews to display yet." as the index
   empty state; it is never shown to shoppers because of the guard at :30. Keep it that way (no empty box on the
   home page).

No candy-as-product copy, no dashes (locale strings checked: `sections.customer_reviews` has none), no hardcoded
currency (uses `money`), no phone model list.

## Claims register

| Claim shown to shoppers | Where | Status |
|---|---|---|
| "{avg} / 5" + "from N rated reviews shown here" | :39-51; locale `sections.customer_reviews.summary_one/other` | MERCHANT-TYPED (computed from typed block ratings); wording is honest about scope. Nothing renders today |
| Review text, name, detail, rating | blocks (all empty on index.json:1442-1475) | MERCHANT-TYPED (none set) |
| Featured product title and price | :114-126 | LIVE (product data) |
| Heading "Customer reviews", accent "In their own words" | schema :184-185 | Neutral, no claim |

## Motion inventory

- `data-cv-*` attributes: none. No GSAP, no section motion file.
- `assets/casify-customer-reviews.js`: carousel controls only: scroll-snap rail, prev/next (`scrollTo` smooth,
  `auto` under reduced motion :76-80), position text, Arrow/Home/End keys (:85-101), ResizeObserver (:109-114).
  Editor: `shopify:section:load` mount, `shopify:section:unload` unmount, `shopify:block:select` jumps to the card
  (:160-168).
- Reduced motion: casify-customer-reviews.css:303-306 removes transitions; JS uses instant scroll.
- No-JS: complete. The rail is a native horizontal scroller; controls start `hidden` (:134) and only appear when
  the JS finds overflow.

## Motion opportunities

Value is LOW until the merchant has real reviews (the section is invisible today). When it has content:

1. MEDIUM, one shared "ticket" entrance for all three `.ccr` sections (this one, trustpilot-reviews,
   facebook-testimonials) so they move alike: GSAP + ScrollTrigger `once`: header words rise (SplitText with
   `mask: 'words'`, as cv-scrolling-reviews.js:255-257), summary ticket lifts with the star `--fill` sweep (no
   number count-up: the values are merchant-typed), cards deal in from the right with alternating +-1.2deg and
   `clearProps` (idiom: review-motion.js:522-525). Implement as an opt-in module inside the shared
   `casify-customer-reviews.js` keyed on a new `data-ccr-motion` attribute (coordinate with the
   trustpilot-reviews and facebook-testimonials lanes), using the pending-class pattern (MOTION-SYSTEM.md 4.3) so
   no-JS stays fully visible. Do NOT use `data-cv-reveal` here: it hides content without JS
   (MOTION-SYSTEM.md 3.4 item 1).
2. MEDIUM (commerce, home page): turn the featured product chip into a two-action row: the existing link plus a
   "Choose colour and phone" button with `data-cvqp-open data-handle="{{ featured_product.handle }}"
   data-url="{{ featured_product.url }}"` (contract snippets/cv-card.liquid:79). The layout already loads the
   quick pick dialog whenever that attribute is on the page (layout/theme.liquid:205-207); it adds a real variant
   and never guesses a model. Hook a small chip "added" tick to `cart:added`.
3. LOW, rail scroll feedback: a thin GSAP progress line under the rail driven by `scrollLeft / maxScroll`
   (reuse `scheduleUpdate`), hidden under reduced motion.

## Risks

- The CSS and JS are shared by three sections in two families (reviews-1: this and trustpilot-reviews; reviews-2:
  facebook-testimonials). Any markup hook rename (`data-ccr-*`, `.ccr__*`) breaks the other two.
- `window.CasifyCustomerReviewsCarousel` guard (:4-7) means a second copy of the script remounts instead of
  re-initialising: keep that contract if motion is added.
- Template change (e.g. setting copy) touches `templates/index.json` (shared file).
