# halo-reviews ("Halo — Reviews")

## Status

**Orphan.** Not in any `templates/*.json` or `sections/*-group.json`. Preset with six written reviews (`sections/halo-reviews.liquid:48-60`), no `enabled_on`: addable anywhere. `sections/main-halo-product.liquid:140` (orphan) links to `#halo-reviews` (this section's hardcoded id, `:1`) with its own fake "4.8 · 12,480 reviews" default.

Live honest equivalents: `cv-pdp-reviews` (product metafields `reviews.rating` / `reviews.rating_count` + `@app` block, `sections/cv-pdp-reviews.liquid:7-8`, `:21`, `:100`, `:122`) and `cv-social-proof` (weighted average across products, `sections/cv-social-proof.liquid:6-7`, `:26`).

## Purpose

A score header (big average number, five stars, "N verified reviews") and a 3-column grid of review cards (stars, "Verified" badge, body, author, phone model, finish).

## Files (owned / shared)

Owned:
- `sections/halo-reviews.liquid` (62 lines; no `stylesheet_tag`, no `render`, no script).

Shared:
- `assets/theme.css`: §35 `.halo-rev-top`, `.halo-rev-score`, `.halo-rev-num`, `.halo-revs`, `.halo-rev*` `3781-3803` (only this section); `.halo-stars` `3482` (shared with main-halo-product); §31 `.halo-sec` `3689`; `.halo-stagger` `3908-3916` (shared with halo-three-fixes, halo-xsell, main-halo-product); `[data-halo-reveal]` `3905-3921`; mobile `4146`, `4386-4388`, `4417-4418`.
- `assets/halo.js` (no-op today) via `layout/theme.liquid:216-218`.
- Locale strings available for an honest rebuild: `products.review_board.*`, `products.review_badges.*` (store rating labelled as Trustpilot and Google), `products.product_summary.rating_label` in `locales/en.default.json`.

## Store adaptation findings

1. **Fabricated aggregate.** Score `{{ section.settings.score | default: '4.8' }}` (`:4`, default `:45`) and `{{ section.settings.count | default: '12,480' }} verified reviews` (`:7`, default `:46`). PRODUCT.md Evidence on Hand: "4.8 stars from 12,480 reviews ... not verified and never shown store-wide." Because of the Liquid `| default:`, blanking the settings still prints 4.8 and 12,480. Fix: delete both settings; read `product.metafields.reviews.rating.value` and `reviews.rating_count.value` on product pages (cv-pdp-reviews pattern), or the weighted average across products elsewhere (cv-social-proof pattern); show an honest "No reviews yet" state when there is none.
2. **Fabricated reviews in the preset.** Six named reviews (`:52-57`): Marcus T., Priya N., Dee R., Alison K., Tomás V., Wen L. None exist (PRODUCT.md: no customer reviews or testimonials confirmed). They also repeat unverified product claims: "off a ladder ... nine feet", "still exactly the colour" since February, magnet never moves, "rated for twelve feet", Screen Promise payout "$187 back in nine days", "Buttons actually click". Fix: empty preset; written reviews only through an `@app` block (review app) like `cv-pdp-reviews.liquid:100,122`.
3. **"Verified" stamped on every card regardless of data.** `:17` literal "Verified", and "verified reviews" on the count (`:7`). Fix: show a verified mark only from the review app's data (or a per-block checkbox that defaults to off, as done for the live video review block per PRODUCT.md 2026-10-03: "never claim verification without an order").
4. **Stars ignore the score.** Header stars are a literal `★★★★★` (`:6`) whatever the average is. Fix: render filled/partial stars from the real rating (percentage-width overlay), with `aria-label` from `products.product_summary.rating_label`.
5. **Wrong product domain in models and finishes.** Defaults "iPhone 17 Pro Max" / "Clear" (`:37-38`); preset includes "Pixel 10 Pro" (`:57`), "Galaxy S25 Ultra", and Halo finishes "Midnight", "Cobalt", "Butter", "Frost", "Sage" (`:52-57`). Casify sells iPhone and Samsung cases and its colour/model options come from each product. Fix: if merchant-typed review blocks are kept at all, the model field must be validated against the product's model option values (detection `sections/cv-pdp-fit.liquid:12-28`) or left blank; no default model or finish.
6. **Block defaults would ship a fake reviewer.** Author default "Customer" (`:36`), stars default 5 (`:34`), body blank (`:35`), so a newly added block shows a 5-star "Customer" card with no text. Fix: blank defaults; render a block only when body and author are filled.
7. **Em dash and page-order eyebrow.** Tick `'Section 04 — what buyers say'` (`:10`, `:44`). Fix: blank default, hide when blank, no dash.
8. **Store rating option (evidence on hand).** The merchant-supplied store rating "4.9 out of 5 from 952 reviews on Trustpilot and Google" may be shown only labelled as a store rating with its sources, separate from product reviews (PRODUCT.md Evidence on Hand; precedent `sections/cv-phone-scan.liquid:521`, `sections/cv-social-proof.liquid:236`, and locale `products.review_badges.aria_label`). If added, make the numbers settings with an `info` that they must match the live profiles, and never call them product reviews.
9. **Inline styles** (`:6-7`) and hardcoded id (`:1`). Move to owned CSS; id from `section.id` (keep a stable `reviews` anchor setting if needed).
10. **No structured data**, which is correct while no real reviews exist; do not add AggregateRating JSON-LD from typed numbers.
11. **Editor name** "Halo — Reviews" (`:28`, `:50`): rename "Casify: reviews board".

## Claims register

| Claim | Where | Status |
|---|---|---|
| Average 4.8 | `:4`, `:45` | Unbacked (listed as not verified). |
| 12,480 verified reviews | `:7`, `:46` | Unbacked (listed as not verified). |
| Five-star header | `:6` | Unbacked; ignores any real rating. |
| "Verified" on each review | `:17` | Unbacked (no review data or order check). |
| Review: survived a ~9 ft ladder drop (Marcus T.) | `:52` | Unbacked; fake reviewer. |
| Review: no yellowing since February (Priya N.) | `:53` | Unbacked; fake reviewer. |
| Review: magnet never moved on a vent mount (Dee R.) | `:54` | Unbacked; fake reviewer. |
| Review: "rated for twelve feet", 4 stars (Alison K.) | `:55` | Unbacked; fake reviewer; repeats 12 ft. |
| Review: Screen Promise paid $187 in nine days (Tomás V.) | `:56` | Unbacked; fake reviewer; Screen Promise not verified. |
| Review: buttons keep their click, Pixel 10 Pro (Wen L.) | `:57` | Unbacked; fake reviewer; Pixel not a Casify product line. |
| Proposed: product rating and count | rebuild | Backed when read from `product.metafields.reviews.rating` / `rating_count` at render time. |
| Proposed: store rating 4.9 / 5 from 952 reviews (Trustpilot and Google) | optional | Backed by PRODUCT.md Evidence on Hand (merchant-supplied 2026-09-18), only if labelled as a store rating with sources. |

## Motion inventory

- `data-halo-reveal` on the score header (`:2`): hidden by `theme.css:3906`, never revealed because `assets/halo.js` exits at `:19-20` (no `.halo-tpl` on any page). **Score header invisible unless reduced motion** (`3918-3921`).
- `.halo-stagger` on the grid (`:12`): CSS-only `cm-rise` keyframe on page load with nth-child delays up to 8 (`theme.css:3908-3916`, keyframes `3297`). It plays at load time, not when scrolled into view, so the cascade is never seen below the fold; children 9 to 12 (`max_blocks: 12`, `:42`) get no delay. Ends visible, so it works without JS; global reduced-motion clamp `3307-3315` resolves it instantly.
- Card hover lift `translateY(-3px)` (`theme.css:3797`).
- cv-motion attributes: none. No GSAP, no section JS, no `shopify:section:load` handling.

## Motion opportunities

Owned `assets/cvhrv-board.css` + `assets/cvhrv-board-motion.js`, printed by the section (idiom `sections/cv-value-stack.liquid:18,128`). Prefix `cvhrv-`, root `data-cvhrv` (unused). Before building, check overlap: `cv-pdp-reviews` already has a hanging shop-board with GSAP + three.js chalk (PRODUCT.md 2026-09-17; loaded on product templates `layout/theme.liquid` product block). On product pages, prefer making this section a non-product-page reviews board (home, pages) and keep cv-pdp-reviews as the PDP role.

1. **(High) Honest score ticket entrance.** ScrollTrigger `start: "top 75%"`, `once: true`: the score ticket swings in on a cord (rotation -8 to 0, CustomWiggle settle), the average counts from 0.0 to the real value (`snap: 0.1`), the star overlay width grows to `rating / 5`, the count ticks up; the empty state instead stamps "No reviews yet" with a DrawSVG pencil underline. Reduced motion and no-JS: final values printed in markup.
2. **(Medium) Cards dealt like pinned notes.** `ScrollTrigger.batch` on review cards (app block output or real blocks): y 24 to 0, rotate random ±2deg settling to a slight tilt, stagger 0.06; replaces the load-time `.halo-stagger`.
3. **(Medium) Buy from proof.** Under the board on product pages: "Choose your phone" button that scrolls (ScrollToPlugin) to `#cvPdp` and focuses the model select; when a model was already chosen (`cvs:change`), the button becomes "Add to bag" and calls `#cvAddForm.requestSubmit()` (carousel pattern, `assets/cv-pdp-carousel.js:1324-1332`), with a DrawSVG tick on `cvs:added`. Never post to the cart directly.
4. **(Low) Pointer tilt** on cards via `data-cv-tilt` (`cv-motion.js:204-217`) for fine pointers only.

## Risks

- This section must never show a number that is not read from store data or the merchant-supplied store rating; removing the `score`/`count` settings is the only way to make blanking safe.
- Review apps render their own markup inside `@app` blocks; motion must target only wrappers the theme owns.
- `.halo-stars` and `.halo-stagger` are shared with main-halo-product and halo-2 sections: do not edit in theme.css.
- `main-halo-product.liquid:140` links to `#halo-reviews`; changing the id breaks that link, but that section is orphan with its own fake rating and is mapped separately (`main-halo-product.md`).
