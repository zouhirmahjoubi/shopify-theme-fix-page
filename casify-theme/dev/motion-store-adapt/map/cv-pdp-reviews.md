# cv-pdp-reviews ("Product: reviews")

## Status

Live on ONE template only:
- `templates/product.convert.json`, key `reviews`, 13th in `order`, directly followed by `ratings_reviews` (`cs-customer-proof`).
- NOT in `templates/product.json` (default).
- Live instance: defaults (heading "What shoppers say", anchor `cvc-reviews`, empty heading "No reviews yet", empty text "Bought this case? Your review goes up on this board.", write label "Write the first review", no `write_url`). No `@app` blocks, so the ledger shows "Waiting for the first customer note".

## Purpose

A hanging chalkboard (KIE set piece) with the product's own rating and count from Shopify's standard `reviews.rating` / `reviews.rating_count` metafields (`sections/cv-pdp-reviews.liquid:6-18`), an honest empty state when there is none (`:62-66`), a pinned ledger note that says where the data comes from (`:72-89`), and an optional review-app block shell (`:92-104`). It is the anchor target of the buy box rating row (`id` from `anchor`, `:29`; schema `:114`). Recorded in PRODUCT.md:37 and :60.

## Files (owned / shared)

Owned (only this section's markup uses them):
- `sections/cv-pdp-reviews.liquid`
- `assets/cv-pdp-reviews.css` (tagged only here, `:4`)
- `assets/cv-pdp-reviews.js` (only consumer of `[data-cvw-reviews]`; loaded for every product template by the shared `layout/theme.liquid:323`)
- `assets/pdp-home-chalkboard.webp` and `assets/pdp-home-chalkboard.webp.json` (`:43`)
- Locale keys `products.review_board.*` in `locales/en.default.json:54-64` (keys owned; the file is shared)

Shared:
- `assets/cv-pdp-story.css` (18 sections), `assets/cv-pdp-extras.css` (set, showcase, counter, theme.css), `assets/cv-pdp-home.css` (chalkboard base rules `:384-406`, small-phone title `:710`).
- `snippets/cv-stars.liquid` (~20 consumers).
- `layout/theme.liquid:323` (loader).
- External: three.js from `cdn.jsdelivr.net/npm/three@0.186.0` (`assets/cv-pdp-reviews.js:1`).

## Store adaptation findings

1. **Binding is correct.** Rating and count come only from product metafields (`:7-18`); stars use `cv-stars` with the computed fill; the review app renders only through `@app` blocks (`:99-101`). This is the pattern PRODUCT.md:57 cites for honest empty states. Keep it.
2. **MEDIUM: heading implies testimony that does not exist yet.** "What shoppers say" (`:45`, default `:113`, live) sits over "No reviews yet". PRODUCT.md:105: no review app or customer reviews are confirmed.
   - Fix (owned): when `has_rating` is false and `app_blocks == 0`, use a neutral heading. Add a setting `empty_title` (default "Shopper reviews") and print it instead of `heading` in the empty branch.
3. **LOW: "Live product rating" chip in the empty state.** `:78` always prints `products.review_board.live_label` ("Live product rating", `locales/en.default.json:60`) with a pulsing dot, even with no rating and no app. Reads as activity.
   - Fix (owned): render the chip only when `has_rating or app_blocks > 0`.
4. **LOW: empty state has no action.** `write_url` is blank live, so nothing is clickable (`:86-88`). Optional: render a `data-cvp-back` button "Choose my phone" so the section still leads back to the buy box, and keep the review link for when the merchant adds one.
5. **LOW: palette drift.** `assets/cv-pdp-reviews.css:2-9` hardcodes `#b92f2a`, `#4f7f7b`, `#c99b3f`, `#f6f0df`, `#fff9ed`, `#4a3324` instead of the design tokens (DESIGN.md: candy-red `#C4302B`, muted-teal-deep `#4E7C7B`, aged-gold `#D2B57C`, cocoa-body `#4A3324`). Map to `var(--red-500)`, `var(--teal-600)` or equivalent theme variables.
6. **Coexistence with the store rating.** The buy box shows the merchant-supplied store rating 4.9 / 952 (PRODUCT.md:61, :102) while this board can say "No reviews yet". That is intended and correctly labelled as product vs store rating; do not merge them.
7. **Clean:** no other brand, no placeholder names, no invented numbers, no em or en dashes in markup, schema or the `review_board` locale strings.

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| Rating "x.x / 5" and stars | `:47-53` | `product.metafields.reviews.rating` | Backed (store data); renders only when present |
| "N reviews" | `:54-61` | `product.metafields.reviews.rating_count` | Backed (store data) |
| "No reviews yet" | `:64`, `:116` | PRODUCT.md:105 | Backed |
| "Every mark on this board comes from real shopper review data for this product." | `:77`, locale `:59` | The Liquid binding above | Backed |
| "Live product rating" | `:78`, locale `:60` | Shown regardless of data | Misleading in the empty state (finding 3) |
| "Customer notes are connected" / "Waiting for the first customer note" | `:80-84` | Presence of an `@app` block | Backed |
| "What shoppers say" | `:45` | No shopper reviews yet | Misleading in the empty state (finding 2) |

## Motion inventory

- `data-cv-*` attributes: none.
- Own hooks: `data-cvw-reviews` (`:30`), `data-review-rating/max/count/has-rating` (`:31-34`), `data-cvw-review-stage` (`:38`), `-review-three` (`:39`), `data-cvw-board` (`:41`), `-review-tilt` (`:42`), `data-cvw-chalk` (`:45`, `:47`, `:54`, `:64-65`), `data-cvw-score-number` (`:48`), `data-cvw-count-number` (`:55`), `data-cvw-chalk-line` (`:67`), `-review-note` (`:72`), `-review-app` (`:93`).
- `assets/cv-pdp-reviews.js` (ES module):
  - `gsap.context` + one `ScrollTrigger` at `top 78%`, once (`:29-72`): board swings in, note slides, chalk lines write in with `clipPath` and `steps(14)`, stars pop, DrawSVG underline (`:43`, only if DrawSVGPlugin), app shell reveal, score and count roll up from 0 to the real values (`:46-69`).
  - Pointer tilt on hover-capable fine pointers (`:74-100`).
  - three.js chalk motes, imported only when WebGL works (`:1-10`, `:109-117`); paused offscreen via IntersectionObserver and on `visibilitychange` (`:246-255`); full disposal (`:262-286`).
- GSAP plugins: ScrollTrigger, DrawSVGPlugin (optional).
- Reduced motion: `cvwInitReview` skips both motion and three.js (`:292-296`); CSS hides the canvas and removes transforms (`cv-pdp-reviews.css:207-213`).
- No-JS: all text visible; only the decorative canvas is `opacity: 0` until ready (`cv-pdp-reviews.css:29`, `:33`). Correct.
- Theme editor: `shopify:section:load` and `:unload` handled (`:320-324`), with an idempotent mount flag (`:289-291`). This is the best-behaved of the six.

## Motion opportunities

1. **High: arrive-from-buy-box moment.** The buy box rating row links to `#cvc-reviews`. In the owned JS, on `hashchange` or a click on any `a[href="#<anchor>"]`, glide with ScrollToPlugin (header offset) and give the board a short "knock" (rotation 0 to -1.5 to 0, 240 ms, candy spring) so the shopper sees where they landed. Reduced motion: plain jump and focus the heading (`tabindex="-1"`).
2. **Medium: route back to buying.** Add a "Choose my phone" `data-cvp-back` button under the ledger note (shared handler `cv-pdp-story.js:398`), with a chalk-dust underline drawn by DrawSVG on enter. Converts readers without inventing proof.
3. **Medium: empty-state chalk invite.** In the empty branch, write the hint line with the existing chalk clip (`data-cvw-chalk` already present) and draw a chalk arrow toward the review link when `write_url` is set.
4. **Low: script gating.** The module downloads on every product template (`layout/theme.liquid:323`) even without the section. Gate it with `editor or content_for_layout contains 'data-cvw-reviews'` (layout is shared; coordinate).

## Risks

- `cs-customer-proof` (`ratings_reviews`) follows immediately; once a review app is live, the page may show two review areas back to back. Template-level decision.
- three.js comes from a third-party CDN at runtime; keep the existing WebGL, reduced-motion and visibility guards when editing.
- Score and count tweens must keep reading the server-rendered `data-review-*` values; never seed them from settings.
- Only on `product.convert.json`.
