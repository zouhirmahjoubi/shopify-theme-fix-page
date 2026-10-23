# cs-customer-proof ("Ratings & reviews")

Paths are relative to `D:/Shopify Theme Fix & Page/casify-theme/`. Read-only pass, 2026-10-22.

## Status

LIVE (placed) on two product templates:

- `templates/product.json` instance `ratings_reviews` (type at :651, blocks :652-718, settings :725-731).
  Position 13 of 22 (between `scrolling_reviews` and `trustpilot_reviews`).
- `templates/product.convert.json` instance `ratings_reviews` (type at :552, settings :553-559, blocks :560-582).
  Position 14 of 17. (Since 2026-09-15 product.json is the Shop Counter default; product.convert.json remains an
  assignable template.)

Both instances: one `cs-rating` block (`source: product`, inline pill, centred) and three EMPTY `cs-review`
blocks; eyebrow "From our customers", heading "Customer reviews", stacked list, white surface.
Renders NOTHING on the storefront today: theme blocks emit `data-csp-item` only when they have content
(blocks/cs-rating.liquid:42, :52; blocks/cs-review.liquid:20), the rating needs the product's
`reviews.rating` metafield (cs-rating.liquid:11-20), and no review app writes ratings yet (PRODUCT.md:105). The
section guard is `csp_blocks contains 'data-csp-item' or request.design_mode` (sections/cs-customer-proof.liquid:13).

## Purpose

The honest product-review section: a star rating read live from the product's review metafields (or a manual
"confirmed rating"), customer review cards typed by the merchant (name, country, date, rating, "Verified buyer"
only when ticked, up to four photos) and Shopify-hosted customer videos. Built on theme blocks (`blocks/`), so it
cannot read block settings from Liquid and keys off rendered markup instead (:3-11).

## Files (owned / shared)

Owned (only this section references them):

- `sections/cs-customer-proof.liquid` (93 lines)
- `blocks/cs-rating.liquid` (161 lines), `blocks/cs-review.liquid` (129 lines), `blocks/cs-video.liquid`
  (149 lines): theme blocks listed only by this section's schema (:73-77)
- `assets/casify-cs-blocks.css` (173 lines; `stylesheet_tag` at :1, styles all three blocks)
- `assets/casify-cs-video.js` (271 lines; loaded by the layout gate below, used only by cs-video)
- Locale keys `blocks.customer_review.*` (`reviewed_in`, `verified`) in locales/en.default.json:228 (file shared)

Shared (coordinate):

- `layout/theme.liquid:259-262`: gate `content_for_layout contains 'data-csv'` that loads casify-cs-video.js.
- `snippets/cv-stars.liquid` (cs-rating :29, :55; cs-review :45), `snippets/cv-icon.liquid` (cs-review :50).
- `templates/product.json`, `templates/product.convert.json`, `locales/en.default.json`.
- GSAP bundle (cs-video entrance only).

## Store adaptation findings

1. MEDIUM, rating shown with a zero count. With `source: product`, `has_rating` becomes true whenever
   `reviews.rating` exists, even if `reviews.rating_count` is 0 (cs-rating.liquid:13-19), printing a bare score
   like "4.0" with no count. The buy box requires a count (`p_count > 0`, snippets/cv-product-summary.liquid:26-27).
   Fix (owned): require `rating_count > 0` for the product source.
2. MEDIUM, role overlap on the product page: cv-scrolling-reviews (12), this (13), trustpilot-reviews (14),
   facebook-testimonials (15), review-widget (21) and review-carousel (22) all present customer reviews.
   PRODUCT.md:36 asks that overlapping roles appear once per page. Recommendation for the merchant: once a review
   app writes `reviews.rating`, make this section (live metafields) the single product-reviews section and remove
   the typed-review sections (merchant confirmation required).
3. LOW, manual rating source has no scope guidance (cs-rating.liquid:5-9, schema :88-89). The only backed number is
   the store rating "4.9 out of 5 from 952 reviews on Trustpilot and Google" (PRODUCT.md:102), which is NOT
   product-specific. Fix: info text on `manual_rating` and `label`: "Use only a rating you can show. A store-wide
   rating must say so in the label, e.g. \"952 reviews on Trustpilot and Google\"."
4. LOW, empty eyebrow span and an eyebrow above the heading: `<span class="csp__eyebrow">` prints even when blank
   (:17); DESIGN.md:198 "Don't place an eyebrow label above every heading". Fix: wrap in `{% if %}`; consider
   dropping the default "From our customers" (schema :37; both templates set it).
5. LOW, hardcoded English in Liquid: "review"/"reviews" (cs-rating.liquid:34, :60), "Rating: N out of 5 stars"
   aria (cs-rating :28, :54; cs-review :44), editor placeholders (section :24, cs-rating :70, cs-review :81). Move
   to locales.
6. INFO, cs-review copy rules are already right: "Verified buyer" only with the checkbox, whose info says to match
   a real order (cs-review.liquid:48-53, schema :106); name and text both required to render (:1).

No candy-as-product copy, no dashes in shopper copy (blocks/cs-video.liquid:3 has an em dash in a Liquid comment
only), no prices, no phone model lists.

## Claims register

| Claim shown to shoppers | Where | Status |
|---|---|---|
| Product rating and review count | cs-rating.liquid:11-20 (`reviews.rating`, `reviews.rating_count`) | LIVE (not rendering today: no review app data) |
| Manual "confirmed rating" + label | cs-rating.liquid:5-9 (`manual_rating` 0 on both templates) | MERCHANT-TYPED (none set) |
| Customer review cards | cs-review blocks (all empty) | MERCHANT-TYPED (none set) |
| "Verified buyer" | locale `blocks.customer_review.verified`, only when ticked | MERCHANT-TYPED (none ticked) |
| "Reviewed in [country]" | locale `blocks.customer_review.reviewed_in` | MERCHANT-TYPED |
| Eyebrow "From our customers", heading "Customer reviews" | templates/product.json:726-727; product.convert.json:554-555 | Neutral |

## Motion inventory

- `data-cv-*` attributes: none. The section and the rating/review blocks have no motion (MOTION-SYSTEM.md 6.1
  lists cs-customer-proof as "no motion of any kind").
- `blocks/cs-video.liquid` + `assets/casify-cs-video.js` (only if a video block is added; none on live):
  GSAP context, entrance on `ScrollTrigger` `top 85%`, `once` (:210-213): mat lifts in, "shop TV" clip-path line
  opens to full frame with a brightness flash (:216-220), wax seal spins in (:222-225), seal ring rotates slowly,
  faster on hover (:231-241); on play the seal flicks away and a glass glint sweeps (:116-121). Autoplay muted only
  while a third is on screen, with a pause button.
- Reduced motion: casify-cs-video.js `animate = gsap && !reduce`, autoplay off, click-to-play (:48-53);
  casify-cs-blocks.css:64 removes the inline pill hover transition.
- No-JS: everything renders statically; the video keeps native controls (cs-video.liquid:40-44).
- Theme editor: casify-cs-video.js handles `section:load`, `section:unload`, `block:select` (:263-270). Section
  itself has no script.

## Motion opportunities

Value is LOW until a review app writes ratings (the section is invisible today); MEDIUM once it does, because
this is the honest, live-data review section.

1. MEDIUM (after data exists), rating pill entrance: sweep the cv-stars `--fill` custom property from 0 to the
   real value (cv-stars uses `--fill`, snippets/cv-stars.liquid:12; same technique as review-motion.js:489-492),
   fade the score in. The number is live data, so a short count-up is allowed here.
2. MEDIUM, review cards: stacked-list "tickets" lift in one after another (y 18, rotation +-0.8deg, `expo.out`,
   stagger 0.07, `clearProps`), photos scale in from 0.92. Put it in a new owned asset
   `assets/cs-proof-motion.js` printed by the section itself (as review-widget does, so no shared layout edit),
   keyed on a new `data-csp` attribute on the `<section>`. Pending-class pattern, no CSS-hidden start state,
   `gsap.matchMedia` for reduced motion, editor load/unload/select handlers (MOTION-SYSTEM.md 4.3-4.6).
3. MEDIUM (commerce bridge, pick ONE place per page): if review-widget's "Choose your phone model"
   (`data-cv-scroll-to-buy`, cv-motion.js:234-240) is not built, add it here under the list instead, as
   `<a href="#cvPdp" data-cv-scroll-to-buy>`. Do not add it in both.
4. LOW, the inline pill already links to `scroll_id` (cs-rating.liquid:45-46); with a GSAP ScrollToPlugin
   (always loaded, snippets/gsap.liquid:33) the jump could ease, but native anchor + `scroll-behavior` is enough.

## Risks

- Theme block settings are private to the section (:3-10): motion must key off rendered classes
  (`.csp-review`, `.csp-inline`, `[data-csp-item]`), not settings.
- `content_for 'blocks'` may only appear once per file, hence the capture (:11): do not add a second one.
- The layout gate for casify-cs-video.js (layout/theme.liquid:259-262) is a shared file.
- Two templates carry this section; product.convert.json still exists and should get the same treatment.
