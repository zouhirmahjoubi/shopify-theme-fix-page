# trustpilot-reviews ("Trustpilot reviews")

Paths are relative to `D:/Shopify Theme Fix & Page/casify-theme/`. Read-only pass, 2026-10-22.
Not to be confused with the orphan `cv-trustpilot` ("Review rail", cv-trustpilot.js, Draggable, `data-cvtr`).

## Status

LIVE (placed) on two templates:

- `templates/index.json` instance `trustpilot_reviews` (type at :1322, settings :1360-1369). Position 15 of 21.
- `templates/product.json` instance `trustpilot_reviews` (type at :732, settings :770-779). Position 14 of 22.

Both: three EMPTY review blocks (rating "0", no text/author), `trustscore: 0`, `profile_url: ""`, heading "Rated on
Trustpilot", accent "Straight from our shoppers", link label "Read all reviews on Trustpilot", carousel layout.
Renders NOTHING on the storefront today: the guard `review_count > 0 or app_block_count > 0 or
request.design_mode` (sections/trustpilot-reviews.liquid:31) fails. This matches STORE-FACTS.md 7e ("must stay
hidden until real").

## Purpose

Shows reviews the merchant copies from their Trustpilot profile (or Trustpilot's own app block via `@app`), with
an optional TrustScore summary and total linking to the public profile (:39-60, :153-161). Uses the shared `.ccr`
card/rail system with Trustpilot-specific styling.

## Files (owned / shared)

Owned:

- `sections/trustpilot-reviews.liquid` (241 lines)
- `assets/casify-trustpilot-reviews.css` (90 lines; `stylesheet_tag` at :2, referenced nowhere else)
- Locale keys `sections.trustpilot_reviews.*` in `locales/en.default.json` (file shared)

Shared (coordinate):

- `assets/casify-customer-reviews.css` (:1) and `assets/casify-customer-reviews.js` (:3): shared with
  customer-reviews-carousel and facebook-testimonials. The JS only mounts when `is_carousel` adds
  `data-casify-customer-reviews` (:36).
- `snippets/cv-stars.liquid` (:43, :88), `snippets/cv-icon.liquid` (:157).
- `templates/index.json`, `templates/product.json`, `locales/en.default.json`.

## Store adaptation findings

1. HIGH (claim guard), the only rating evidence is a COMBINED store rating: "4.9 out of 5 from 952 reviews on
   Trustpilot and Google" (PRODUCT.md:102). If someone types 4.9 and 952 into this section it renders "4.9 / 5"
   and "952 reviews on Trustpilot" (locale `sections.trustpilot_reviews.total`), attributing Google reviews to
   Trustpilot. Fix (owned schema): info on `trustscore` and `total_reviews` "Enter only the numbers shown on your
   Trustpilot profile, not a combined rating."; render the score only when `profile_url` is set so shoppers can
   check it. Never pre-fill either value.
2. MEDIUM, the TrustScore alone cannot show: the guard at :31 ignores `score`, so the honest minimal setup (profile
   URL + TrustScore, no copied reviews) renders nothing. Fix: guard `review_count > 0 or app_block_count > 0 or
   score > 0 or request.design_mode`; with only a score, render the summary and the profile link and skip the
   empty box (:126-131 is editor-only today; keep it so).
3. MEDIUM, `profile_url` is not checked (:27, :53-56, :153-160): any URL is labelled "Read all reviews on
   Trustpilot" and wraps the score. Fix: only treat it as a Trustpilot link when it contains `trustpilot.com`;
   otherwise ignore it (or show the editor hint in design mode).
4. LOW, heading default "Rated on Trustpilot" (schema :174; both templates) implies a Trustpilot rating even when
   only reviews are shown and `score` is 0. Fix: use "Rated on Trustpilot" only when `score > 0`, else
   "From Trustpilot" (locale key).
5. LOW, role overlap: home has six proof sections (ugc 12, social 14, this 15, facebook_testimonials 16,
   customer_reviews 17, facebook_comments 18); product has six review sections (12, 13, 14, 15, 21, 22). When the
   merchant has Trustpilot reviews, consider one placement (PRODUCT.md:36 merge rule).

No candy-as-product copy, no dashes (locale strings checked), no prices, no phone model lists. Review `text` is
richtext rendered raw (:94), which is correct for richtext settings.

## Claims register

| Claim shown to shoppers | Where | Status |
|---|---|---|
| TrustScore "N / 5" + stars | :39-44 (`trustscore` 0 on both templates) | MERCHANT-TYPED if set; none set. Must be Trustpilot-only (not the combined 4.9 / 952) |
| "N reviews on Trustpilot" | :46-47 (`total_reviews` unset) | MERCHANT-TYPED if set; none set |
| "Rated on Trustpilot" heading | schema :174; index.json:1361; product.json:771 | Implies a Trustpilot rating; hidden today, UNBACKED until a profile URL and score exist |
| "Straight from our shoppers" | schema :175; both templates | Neutral |
| Copied review cards | blocks (all empty) | MERCHANT-TYPED (none set) |

## Motion inventory

- `data-cv-*` attributes: none. No GSAP, no section motion file.
- Carousel behaviour from shared `assets/casify-customer-reviews.js` only when layout is carousel and there are 2+
  reviews (:20-23, :36): smooth `scrollTo` (instant under reduced motion), keys, ResizeObserver, editor
  load/unload/block:select.
- Reduced motion: casify-trustpilot-reviews.css:87-89 and casify-customer-reviews.css:303-306 remove transitions.
- No-JS: complete (native scroll rail or grid; controls start `hidden`, :116).

## Motion opportunities

Value is LOW until the merchant adds real Trustpilot content (section invisible today).

1. MEDIUM, join the shared `.ccr` ticket entrance proposed in customer-reviews-carousel.md (opt-in
   `data-ccr-motion` inside shared casify-customer-reviews.js): header rise, card deal-in with alternating tilt,
   pending-class pattern, `gsap.matchMedia` for reduced motion.
2. MEDIUM, TrustScore summary: sweep the stars' `--fill` from 0 to the score on enter (review-motion.js:489-492
   technique). Do not count the number up (merchant-typed). Under reduced motion show the final state.
3. LOW, "Read all reviews on Trustpilot" link: arrow nudge on hover/focus via CSS transform (160 ms, DESIGN.md
   timing), none under reduced motion. No commerce motion belongs here.

## Risks

- Shared CSS/JS with customer-reviews-carousel and facebook-testimonials (two families): never rename `.ccr__*` or
  `data-ccr-*` hooks inside one lane.
- `cv-trustpilot` (orphan) loads a different script through the `gsap_drag` flag (layout/theme.liquid:255-258,
  `data-cvtr`); do not add `data-cvtr` here or Draggable/Inertia will load for nothing.
- Content changes touch `templates/index.json` and `templates/product.json` (shared).
