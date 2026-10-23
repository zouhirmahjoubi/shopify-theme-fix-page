# review-carousel ("Review carousel")

Paths are relative to `D:/Shopify Theme Fix & Page/casify-theme/`. Read-only pass, 2026-10-22.

## Status

LIVE on `templates/product.json` only: instance `review_carousel_LwiNjU` (type at :1169, five `review` blocks
:1170-1231, settings :1233-1250). Position 22 of 22: the very last section of every product page on the default
template, directly after review-widget (position 21). Not in any other template or section group.

What shoppers see today: heading "Loved by thousands" (:1236), subheading "Don't just take our word for it."
(:1237), a badge with five fully filled stars and "Rated 4.9/5 from 2,000+ reviews" (:1238), then five cards
(Sarah M., James K., Lina R., Omar B., Emma T.), each with the subtitle "Verified buyer" (:1178, :1189, :1200,
:1211, :1222). Autoplay is off (:1241). A three.js ring of decorative sweets orbits the row.

## Purpose

A merchant-curated row of featured reviews: CSS scroll-snap track with arrows, dots and optional autoplay
(sections/review-carousel.liquid:1-13). Hidden until a block has both a name and text (:18-26), with an editor-only
hint otherwise (:277-281). Optional "Product reviewed" chip per card (:171-177).

## Files (owned / shared)

Owned:

- `sections/review-carousel.liquid` (337 lines). All CSS (:27-131) and the carousel behaviour JS (:201-276) are
  inline in the section; it has no CSS or JS asset of its own.

Shared (coordinate):

- `assets/review-motion.js` (printed at :133; also printed by sections/review-widget.liquid:28). `initCarousel`
  (:986-1074), `carouselRecipe` / `carouselLayout` (:963-985), shared three.js kit (:73-360) and boot (:1080-1089).
- `snippets/cv-stars.liquid` (badge :142 and cards :164).
- `templates/product.json` (holds the five typed reviews and the badge text).
- GSAP bundle (layout/theme.liquid:184, snippets/gsap.liquid) and three.js from cdn.jsdelivr.net
  (review-motion.js:34).

## Store adaptation findings

1. HIGH, customer-count claim: heading "Loved by thousands" (templates/product.json:1236). No customer count is
   backed (PRODUCT.md:104-105). Fix (template, merchant confirmation): "What customers wrote" or blank. Schema
   default "Loved by our customers" (:291) is softer but still asserts sentiment; change the default to "What
   customers wrote".
2. HIGH, rating badge contradicts the evidence: "Rated 4.9/5 from 2,000+ reviews" (templates/product.json:1238)
   vs. Evidence on Hand "4.9 out of 5 from 952 reviews on Trustpilot and Google" (PRODUCT.md:102). The badge also
   always paints five FULL stars (`render 'cv-stars', fill: 100`, sections/review-carousel.liquid:142) whatever
   the text says. Fix (code, owned): replace the free-text `badge` with structured settings `badge_rating`
   (range 0-5, step 0.1, default 0), `badge_count` (text) and `badge_source` (text, default "Trustpilot and
   Google"); render only when rating > 0; stars `fill: badge_rating | times: 20`; text from a locale string
   "Rated {{ rating }} out of 5 from {{ count }} reviews on {{ source }}". Template value: blank, or the backed
   4.9 / 952 / "Trustpilot and Google" if the merchant wants it (store rating, not product-specific).
3. HIGH, the same customer names say different things on the same page. The five cards reuse names from the
   review widget and scrolling reviews (templates/product.json:1034-1105, :575-628) with different quotes and
   ratings: Lina R. is 4 stars "Very happy" in the widget (:1060-1066) but 5 stars "My new favorite" here
   (:1194-1200); Omar B. is 5 stars in the widget (:1072) but 4 stars here (:1206). Shoppers see this one section
   apart, which reads as invented. All five carry the free-text subtitle "Verified buyer" (bypassing the rule in
   the block info :327 "Write \"Verified buyer\" only after finding their order"). Fix (template, needs merchant
   confirmation): remove the five blocks (the section then hides itself, :26) or replace each with the exact text
   that customer wrote in the widget; clear "Verified buyer" unless an order was found.
4. MEDIUM, duplicate role on the product page: review-widget (21) and review-carousel (22) both render customer
   reviews back to back, plus cv-scrolling-reviews (12), cs-customer-proof (13), trustpilot-reviews (14) and
   facebook-testimonials (15). PRODUCT.md:36 asks that overlapping sections be "merged so each role appears once
   per page". Recommendation for the merchant: drop this section from product.json, or keep it only as the single
   featured-quotes row once real reviews exist.
5. MEDIUM, autoplay has no visible pause control (:253-269 pauses only on hover, focus, touch or hidden tab).
   WCAG 2.2.2 needs a pause/stop control for motion longer than 5 s, and DESIGN.md:192 requires "an explicit pause
   path when it auto-runs". Off on the live instance (:1241) but one tick away in the editor. Fix: add a
   Pause/Play toggle (same pattern as cv-scrolling-reviews :53-57) shown only when autoplay is on.
6. LOW, schema info example contradicts the evidence: `badge` info "e.g. \"Rated 4.8/5 on Google from 1,000+
   reviews\"" (:293). Replace with the structured settings in finding 2, or the example "Rated 4.9 out of 5 from
   952 reviews on Trustpilot and Google".
7. LOW, "Bought:" product label (:175, schema :294) asserts a purchase; acceptable only for confirmed reviews.
   Neutral alternative default: "About:".
8. LOW, hardcoded English: "Previous reviews" / "Next reviews" (:146, :149), "Go to slide N of M" (:234),
   "use the arrow keys to scroll" (:157), "N of M" slide labels (:163), default aria "Reviews" (:134). Move to
   locales (shared file).
9. LOW, inline script has no teardown: the window `resize` listener (:250) and the autoplay `setInterval`
   (:265-268) stay bound if the editor re-renders the section (autoplay is skipped in design mode :255, so only
   the resize listener leaks). Fix: move the behaviour into a new owned asset `assets/review-carousel.js` with
   `shopify:section:load` / `unload` handlers and per-root cleanup.
10. LOW, no-JS: slides are a native scroll-snap row (readable), but the arrow buttons render visible and inert
    (`.rc-nav` is only hidden by `build()` :227) and the dots row is empty. Fix: print `.rc-nav` with `hidden`.
11. LOW, unused `star` colour setting (:315).

No candy-as-product copy, no hardcoded price or currency, no phone model list.

## Claims register

| Claim shown to shoppers | Where | Status |
|---|---|---|
| "Loved by thousands" | templates/product.json:1236 | UNBACKED (customer count) |
| "Rated 4.9/5 from 2,000+ reviews" | templates/product.json:1238 | UNBACKED, contradicts PRODUCT.md:102 (952) |
| Five full stars next to the badge | sections/review-carousel.liquid:142 (`fill: 100`) | UNBACKED (hardcoded 5/5 visual) |
| "Loved by our customers" (schema default) | :291 | UNBACKED sentiment default (only if placed fresh) |
| Five named reviews and ratings | templates/product.json:1172-1230 | MERCHANT-TYPED, inconsistent with the widget's copies, treat as UNBACKED until confirmed |
| "Verified buyer" x5 (free-text `meta`) | :1178, :1189, :1200, :1211, :1222 | UNBACKED |
| Quote content: "it arrived faster than expected" (Sarah M.), "great customer service" (James K.), "feels built to last" (Lina R.), "Packaging was lovely" (Omar B.) | :1175, :1186, :1197, :1208 | MERCHANT-TYPED (delivery speed and durability claims inside quotes) |
| "Don't just take our word for it." | :1237, schema :292 | Neutral framing; fine only with real reviews |

## Motion inventory

- `data-cv-*` attributes: none.
- Section JS (inline :201-276): carousel behaviour only (arrows, dots, keyboard, optional autoplay, editor
  `shopify:block:select` jump :271-274). Scrolls with CSS `scroll-behavior: smooth` (:87), set to `auto` under
  reduced motion (:127).
- `assets/review-motion.js` `initCarousel` (:986-1074):
  - Entrance: `gsap.set` first four slides to `opacity 0, x 48, rotation 1.5` and the header to `opacity 0, y 18`
    (:1039-1041), then a timeline on `ScrollTrigger.create({ trigger: track, start: 'top 88%', once: true })`
    (:1042-1052) deals them in with `expo.out`, `clearProps` at the end.
  - Drum: after the entrance, every track scroll writes `perspective rotateY(+-7deg) scale` inline on each slide
    (:1008-1016, :1022-1025, enabled on complete :1034).
  - Ambient: three.js ring of decorative sweets orbiting the row and turning with the track's scroll progress
    (:976-985, :1060-1073), loaded within 400px, paused offscreen and in hidden tabs (shared `candyStage`).
- GSAP plugins: core, ScrollTrigger. No SplitText/Flip/Draggable.
- Reduced motion: `initCarousel` returns early (:997); inline CSS hides `.rc-three` and transitions (:126-130);
  autoplay disabled (:255). Read once, no live change listener.
- No-JS: all slides visible in a native scroll-snap row (arrows inert, see finding 10).
- Theme editor: review-motion.js load/unload (:1083-1089); inline `shopify:block:select` (:271-274); no
  `section:select` finish.

## Motion opportunities

Content first: if the merchant removes the typed reviews, the section hides itself and none of this applies.
If it stays with confirmed reviews:

1. HIGH (performance / restraint): remove the three.js sweets ring from this section when the review widget's
   candy stage is on the same page (they are positions 21 and 22). Simplest: in `initCarousel`, skip
   `candyStage` when `document.querySelector('[data-rw] [data-rw-three]')` exists, or add a section setting
   "Decorative sweets" default off. Shared file: coordinate with the review-widget lane.
2. MEDIUM (commerce): the "Product reviewed" chip (:171-177). On a product page where `p.handle ==
   product.handle`, render it as `<a href="#cvPdp" data-cv-scroll-to-buy>` "Choose your phone model" back to the
   buy box (cv-motion.js:234-240). Elsewhere, add a `data-cvqp-open data-handle data-url` button so the quick
   pick dialog adds a real variant without guessing a model (snippets/cv-card.liquid:79 contract;
   layout/theme.liquid:205-207 loads the dialog).
3. MEDIUM (badge): once the badge is structured (finding 2), sweep the stars' `--fill` from 0 to the value
   (technique: review-motion.js:489-492). Do not count the number up (merchant-typed).
4. LOW (autoplay): a GSAP progress ring on the active dot that fills over `speed` seconds and pauses with the new
   Pause button (finding 5); reduced motion: no autoplay, no ring.
5. LOW (editor): add `shopify:section:select` -> finish the entrance (`timeline.progress(1)`, enable tilt).

## Risks

- `assets/review-motion.js` is shared with review-widget; carousel changes must not break `initWidget`.
- The inline `<style>` and `<script>` are per instance; moving them to assets changes load order (review-motion.js
  relies only on `[data-rc]`, `[data-rc-track]`, `.rc-slide`, `.rc-head`, `[data-rc-three]` markup: keep those
  hooks).
- Drum tilt writes inline `transform` on slides on every scroll; any new GSAP transform on `.rc-slide` will fight
  it (MOTION-SYSTEM.md 7.1). Animate an inner wrapper instead.
- Content fixes live in `templates/product.json` (shared) and need explicit merchant confirmation.
