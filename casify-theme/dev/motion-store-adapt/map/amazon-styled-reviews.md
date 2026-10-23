# amazon-styled-reviews ("Amazon Style Reviews")

File: `sections/amazon-styled-reviews.liquid` (1361 lines: inline `<style>` :3-249, markup :251-442, inline `<script>` :444-469, schema :471-1361). Family: reviews-2.

## Status

**orphan**. It is placed in no `templates/*.json` and no section group. The schema has no `enabled_on` or `disabled_on` (:473), so a merchant can add it anywhere, including the header and footer groups. The preset "Amazon Style Reviews" (:1314-1358) ships **three fully written fake reviews** the moment it is added.

History: the 2026-10-03 incident uploaded this file to the live theme as a local-only stray (PRODUCT.md:74). It exists on live but is unplaced.

## Purpose

A third-party "Amazon-style" review list: avatar or initial, name with an optional title, 1-5 stars, a "Verified Purchase" badge in Amazon orange, "Reviewed in the [country] on [date]", body text, up to 4 photos, an "N people found this helpful" count, and Helpful / Report buttons. Every visual is per-section settings in inline CSS. It is not derived from Casify's design system.

## Files (owned / shared)

Owned:
- Everything is inline in the section file: CSS (:3-249), JS (:444-469, globals `markHelpful` and `reportReview`), schema.
- No asset files, no snippets, no layout loader (grep for `amazon` in `layout/theme.liquid` finds nothing).

Shared:
- None. The section references `settings.animations_reveal_on_scroll` (:251), a global theme setting that does **not exist** in `config/settings_schema.json` / `settings_data.json`. Its classes `scroll-trigger animate--fade-up` are defined nowhere in `assets/` (Dawn leftovers, dead code).

## Store adaptation findings

Ordered by severity.

1. **Fabricated reviews in the preset (critical).** Adding the section from the editor publishes "John D." 5 stars "Excellent quality and fast shipping", 42 helpful (:1321-1328); "Sarah M." 5 stars "Great value for money", 28 helpful (:1334-1341); "Michael R." 4 stars "Exactly what I needed", 15 helpful (:1347-1354). All are "Verified Purchase", "United States", and dated 2024. Fix: the preset must contain only empty blocks (`{"type": "review"}`), or no blocks.
2. **Fabricated block defaults (critical).** Each new block defaults to reviewer "John Doe" (:1161), title "Great product!" (:1173), 5 stars (:1184-1189), `show_verified: true` (:1193-1195), "Verified Purchase" (:1201, :1208), country "United States" (:1222), date "January 1, 2024" (:1228), a generic body text (:1234), `helpful_count: 15` (:1279-1282), and "people found this helpful" (:1288). Fix: blank defaults for name, title, body, country and date. `show_verified` defaults to false with info "Tick only after finding their order" (the wording from cv-page-video-reviews.liquid:58). `helpful_count` defaults to 0. Make the rating a `select` with "No rating" as default (pattern from cv-trustpilot.liquid:255-264). Render a block only when the name and body are both filled, with an editor-only draft hint (pattern from cv-trustpilot.liquid:170-180).
3. **Hardcoded "Verified Purchase" fallback** (:338). With `show_verified` on and the badge text blank, it still prints "Verified Purchase". Remove the fallback, and use the label "Verified buyer" from settings.
4. **Amazon impersonation.** The "Amazon Style Reviews" name (:473) and heading default (:484), Amazon's palette (`#0F1111`, `#565959`, `#D5D9D9`, star `#FFA41C`, badge `#C45500`: :563ff, :856, :878), "Verified Purchase" in Amazon orange, and "Reviewed in the United States on ..." (:343-353) present store-typed reviews as Amazon-verified ones. That is deceptive, and off-brand against DESIGN.md. Fix: rename to "Customer letters" (or similar), re-skin to Casify tokens (paper card, 14 px radius, dashed cocoa rule, `cv-stars` snippet for stars, teal "Verified buyer" ticket), and replace the date line with an escaped plain date. Drop the "in the [country]" phrasing, or make it "from [country]" only when filled.
5. **Fake controls.** "Helpful" only toggles a class and the text "Helpful ✓" in the browser (:445-462). Nothing is saved, and a refresh resets it. "Report" does nothing (`onclick="return false;"`, :433). Both are fake interactivity. Fix: remove both buttons and the inline script.
6. **Invented social-proof counts.** "N people found this helpful" (:420-425) comes from a typed number with default 15. Remove the field, or keep it only as merchant-typed with a 0 default plus info "Only copy a real count from your review platform".
7. **No real store-data binding.** Ratings do not read `product.metafields.reviews.rating` / `rating_count`, and there is no `@app` block for the merchant's review app (PRODUCT.md:105: "The merchant chose to connect a review app ... pages show an empty state"). Fix: add `{"type": "@app"}` to `blocks`. Optionally show a summary from the review metafields on product templates (the pattern in snippets/cv-video-reviews.liquid:94-104), hidden when the count is 0.
8. **Unescaped output:** heading (:256), subheading (:259), `alt` from reviewer_name (:271), the initial (:282, also `slice: 0` returns 1 char without `upcase`), reviewer name (:288), review title (:290), country (:347), date (:351), helpful text (:423), button texts (:430, :434). Escape all of them. `review_content` is a textarea printed raw (:356), so escape it and apply `newline_to_br`.
9. **Invalid markup:** a `<div class="reviewer-name">` inside `<h3>` (:287-288), and `<div class="review-date">` nested inside `.review-date` and inside a run of text (:343-353). Use spans.
10. **Image alt "Review image 1..4"** (:384-412) is meaningless. Use "Photo from [name]'s review", escaped. Images lack `loading="lazy"`.
11. **Generic copy.** Subheading "See what our customers are saying about our products" (:490). Rewrite for Casify, for example "Letters about our cases". Leave the default empty if the merchant prefers.
12. **No `max_blocks` and no group restrictions.** Add `"max_blocks": 12` and `"disabled_on": {"groups": ["header", "footer"]}`.
13. **Overlap.** It duplicates the live `review-widget`, `review-carousel` and `cv-pdp-reviews` roles. The recommended path is merchant choice: retire the section, or rebuild it as the honest "Customer letters" described above. Do not leave it unplaced with fabricated presets in either case. Fixing the preset and defaults (findings 1-3) is mandatory even if the section stays orphan, because one editor click would publish fake reviews.

## Claims register

| Claim | Where | Status |
|---|---|---|
| 3 reviews (John D., Sarah M., Michael R.), 5/5/4 stars, "Verified Purchase", US, Oct to Nov 2024 dates | preset :1314-1358 | **UNBACKED, fabricated.** PRODUCT.md:105 says no reviews are confirmed |
| "42 / 28 / 15 people found this helpful" | preset :1328, :1341, :1354 | **UNBACKED** |
| Default "John Doe", "Great product!", 5 stars, "Verified Purchase", "United States", "January 1, 2024", body, 15 helpful | block defaults :1161-1288 | **UNBACKED** (ships on every new block) |
| "Verified Purchase" fallback | :338 | **UNBACKED** |
| "Excellent quality and fast shipping" / "arrived quickly" | preset :1322, :1327 | **UNBACKED** delivery-speed claim (PRODUCT.md:34 has dispatch 1-3 business days only; no delivery promise) |
| "The customer service was excellent" | preset :1340 | **UNBACKED** |
| "Amazon Style Reviews" heading (implies an Amazon source) | :484 | Misleading. Remove |

Nothing in this section is backed.

## Motion inventory

- `data-cv-*`: none. GSAP: none. Section JS: only the fake Helpful handler.
- CSS: `.review-image:hover { transform: scale(1.05) }` with a 0.2 s transition (:156, :171-173), not wrapped in a reduced-motion query. Colour transitions on the buttons.
- The reveal hook `scroll-trigger animate--fade-up` (:251) is dead: no setting and no CSS.
- Reduced motion: no handling. No-JS: readable. Editor events: none.

## Motion opportunities

Only after the honesty rebuild, and only if the merchant places it.

1. **(Medium) "Letters dealt onto the counter"** in an owned `assets/cv-customer-letters.js` with a unique gate (for example `data-cvlt`). Cards rise 16 px and fade with stagger 0.06 via `ScrollTrigger.batch` (`once`); stars fill left to right by tweening the `--fill` custom property on `.cv-stars` (the same technique as cv-trustpilot.js:205-207); the "Verified buyer" ticket stamps (scale 1.2 to 1, 0.24 s). Use the pending-class pattern with a 1400 ms fallback, return early under reduced motion, and wire `shopify:section:load/unload/select` like cv-facebook-reviews.js:171-180.
2. **(Low) Photo tap to enlarge:** reuse a native `<dialog>` with a GSAP fade and scale (as cv-pdp-video-reviews.js:377-379). Wrap the hover zoom in `@media (prefers-reduced-motion: no-preference) and (hover: hover)`.
3. **(Medium, product template only) "Choose your case" ghost button** with `data-cv-scroll-to-buy` (cv-motion.js:235-241, target `#cvPdp` at cv-product-counter.liquid:208). No commerce logic in this section.

Buy box, packs, Add to cart, Buy now and the cart drawer are not applicable.

## Risks

- **Highest-risk orphan in this family:** one editor click publishes three fabricated verified reviews with helpful counts. Fix the presets and defaults before any other work.
- The file is large (about 900 lines of per-pixel settings). A rewrite will change the schema. If an instance is ever created on live, removed setting ids are dropped silently. Since it is unplaced, this is safe now.
- Inline global functions (`markHelpful`) are redefined per instance and can clash. Remove them.
- Retiring the section (deleting the file) needs merchant confirmation (STORE-FACTS legend: never silently delete merchant content).
