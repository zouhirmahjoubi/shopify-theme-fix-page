# cv-pdp-video-reviews ("Product: video reviews")

## Status

ORPHAN as a section. Not placed in any `templates/*.json` or `sections/*-group.json`. `enabled_on: product`
(sections/cv-pdp-video-reviews.liquid:16), preset with zero blocks (:71). With no clips it renders nothing on the
storefront and an editor-only explainer in the theme editor (snippets/cv-video-reviews.liquid:562-579).

Its markup, CSS and JS are LIVE through other sections: `snippets/cv-video-reviews.liquid` is rendered by
`sections/cv-product-counter.liquid:683` (placed in templates/product.json and templates/product.convert.json)
and by `sections/cv-page-video-reviews.liquid` (placed in templates/page.json).

## Purpose

A thin wrapper (sections/cv-pdp-video-reviews.liquid:1-9) that renders the shared video-review rail anywhere on a
product template: a score ticket, a rail of 9:16 customer clips (muted autoplay in view, single audible clip,
"Pause clips" switch), and a `<dialog>` player with the full review plus a shopping panel that drives the buy box
(`cvs:choose` / `cvs:change`) and submits the buy box's own form for Add to bag (snippet header :1-40,
JS header cv-pdp-video-reviews.js:1-19).

## Files (owned / shared)

Owned:
- `sections/cv-pdp-video-reviews.liquid` (schema, defaults, block definition)

Shared (any edit affects the LIVE Shop Counter on product.json/product.convert.json and the page.json section):
- `snippets/cv-video-reviews.liquid` (cv-product-counter, cv-page-video-reviews, this section)
- `assets/cv-pdp-video-reviews.js` and `assets/cv-pdp-video-reviews.css` (same three users; printed/gated by
  `data-cvvr`, snippets/cv-video-reviews.liquid:164-166, layout/theme.liquid:298-301)
- `snippets/cv-stars.liquid` (22 files), `snippets/cv-icon.liquid` (53 files)
- `layout/theme.liquid` gate `data-cvvr` (:298-301), placed before cv-product.js (:304) on purpose

Practical consequence: a per-section agent for cv-pdp-video-reviews may only edit the section file (schema
defaults, labels). Everything visual or behavioural is shared with the live buy box.

## Store adaptation findings

1. Defaults are already honest (no names, no quotes, `verified` default false, :57-61). Keep it that way. Do NOT seed
   clips: PRODUCT.md:105 says no reviews or testimonials are confirmed.
2. Score ticket shows a big number even from merchant-typed clips. Without review-app data the header shows the
   plain average of clip stars, e.g. "5.0" with stars from a single clip (snippet :84-88, :102-104, :182-189).
   The label says "From 1 video review" / "Average of N video reviews" (:23-24), which is honest, but visually it
   reads like a product rating. Fix (section-owned): add a checkbox setting `show_clip_score` (default false) that
   hides the score when `use_product` is false; requires passing the flag to the snippet (shared edit), so record
   it as a coordinated change.
3. The live counter already carries a placeholder clip ("Daniel K.", 5 stars, "Fits perfectly", templates/product.json:125-135;
   STORE-FACTS.md:254). It is not in this section, but if this section is placed on product.json with "Only show on"
   blank clips, shoppers could see the same placeholder pattern twice. Do not place this section on product.json
   until real clips exist.
4. Hard-coded English strings in the shared snippet (not settings or locales): "Adding…", "In your bag",
   "Sold out", "Choose another phone", "That didn’t go through. Please try again.", "Pack of [qty] · [total] ·
   [pct]% off", "Read the whole review", "Previous clips", "More clips", "Watch …’s review", "1 on video below",
   "N verified buyers" (snippet :185-201, :341, :396-400, :447, :539-550). No dashes. Shared edit; low priority.
5. Model detection in the snippet (:110-126) matches name contains model/phone/device/compatib, then first value
   iphone/galaxy/pixel/samsung. Misses `applicable` (only matters if the name lacks "model") and checks only the
   first value. Align with STORE-FACTS.md:148-167 (shared edit).
6. No model is pre-selected: `confirmed` is true only with `product.selected_variant` (a `?variant=` link) or no model
   option (:133-136), and the select starts on the placeholder (:488). Correct per PRODUCT.md:110.
7. Discount line `[pct]% off` and struck price come from the variant's compare-at (:157-161) and later from
   `cvs:change` detail `compareAt` (cv-pdp-video-reviews.js:538), so they match the buy box (incl. the $59.99
   fallback when the buy box applies it). LIVE.
8. `submit_url` link only shows when set (:404). Fine.
9. Copy check (section defaults :18-45): no dashes, no candy-as-product. Heading "Filmed by the people who bought
   it" asserts the clips are from buyers; it is only rendered when clips exist and the merchant attests per block.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Product score and "[count] reviews of this case" | snippet :92-99, :182-183 | LIVE (`reviews.rating` / `reviews.rating_count` metafields) |
| Clip average score ("Average of N video reviews", "From 1 video review") | snippet :84-88, :188-191 | MERCHANT-TYPED (block star ratings); see finding 2 |
| Per-clip stars, name, quote, full review, date | block settings :57-62 | MERCHANT-TYPED; none confirmed today (PRODUCT.md:105) |
| "Verified buyer" badge, "N verified buyers" | block :61, snippet :193-199, :327-331 | MERCHANT-TYPED (merchant ticks after finding the order, :61 info) |
| "Filmed on <phone> · <colour>" | block :64-65 | MERCHANT-TYPED |
| Price, struck compare-at, "[pct]% off", pack line | snippet :470-474, JS :538, :566 | LIVE (variant data / buy box `cvs:change`) |
| Heading "Filmed by the people who bought it", lede "Short clips from customers…" | :19-20 | Conditional: true only when real clips exist; rendering is gated on clips |

## Motion inventory

- data-cv-* attributes: none. Own hooks `data-cvvr*` (gate `data-cvvr`, layout/theme.liquid:298).
- Section motion (cv-pdp-video-reviews.js:747-780), one ScrollTrigger timeline `once` at `top 78%`:
  heading words rise with SplitText `mask: 'words'`; score ticket stamps (`scale 1.22, rotation -5`,
  `back.out(2.2)`); score number counts up from 0 to the rendered value; stars fill via `--fill`; clip cards are
  dealt in (`y:56`, alternating rotation, stagger .08). Uses `clearProps`.
- Clip playback: IntersectionObserver plays muted clips at 60% visibility, pauses offscreen (JS :120-135);
  `visibilitychange` pauses (:137); "Pause clips" switch persists (WCAG 2.2.2). Reduced motion or Save-Data:
  nothing autoplays (`userPaused = reduced || saveData`, :73).
- Player: dialog opens with a GSAP rise (:377-379); Add to bag "added" pop `back.out(3)` (:662); model select
  shake keyframes when no phone is chosen (:706).
- Commerce hooks heard: `cvs:change` (:608), `cvs:adding` (:634), `cvs:added` (:645); dispatched: `cvs:choose`
  (:491), and on direct add `cart:refresh`, `cart:added`, `CasifyCart.refresh()` (:684-686).
- GSAP plugins: ScrollTrigger, SplitText (core bundle).
- Reduced motion: motion block returns early (:748); CSS hover transforms off (cv-pdp-video-reviews.css:686-692).
- No-JS: rail and posters render (static), but the "open" button and the dialog need JS; clips do not play.
  Readable static state exists (posters, stars, quotes, stubs).
- Editor: `shopify:section:load` re-inits (:782-786). No `shopify:section:unload` (ScrollTrigger and observers are
  not killed; the timeline is `once`, so low impact). `from()` tweens hide cards and score until the trigger fires,
  with no pending-class timeout (MOTION-SYSTEM.md 4.3).

## Motion opportunities

1. HIGH (Add to cart): after `cvs:added` in the player, fly the clip poster (or product thumb `.cvvr-lb__thumb`) to
   the header bag, then close the dialog only if the shopper chooses "View bag" (current flow, :722-728). Reuse the
   counter's fly pattern (cv-pdp-counter-motion.js:260-331). Because the JS is shared with the live counter,
   implement it as a listener inside cv-pdp-video-reviews.js guarded by `section.closest('.section-cv-pdp-video-reviews')`
   only if it must differ per home; otherwise treat it as a shared improvement owned by the counter work.
2. HIGH (Add to cart button state): width lock + label flip ("Add to bag" -> "Adding…" -> "In your bag") and a
   DrawSVG check on `.cvvr-lb__tick` (DrawSVGPlugin always loaded) instead of the CSS-only tick swap
   (MOTION-SYSTEM.md 6.1).
3. MEDIUM (packs): when `cvs:change` reports a pack (qty > 1), stamp the pack line `[data-cvvr-pack]`
   (`scale 1.15 -> 1`, 160ms) so the shopper sees the dialog will add N cases.
4. MEDIUM: pending-class fallback for the entrance (`.cvvr--pending` removed after 1400 ms) so a missed trigger
   never hides clips.
5. LOW: rail scroll progress as a brass bar scrubbed by the rail's own `scroll` (not the window).
6. Reduced motion: keep current (no autoplay, no deal-in, instant dialog).

## Risks

- Shared everything: snippet, JS and CSS also run the LIVE Shop Counter inline row (product.json,
  product.convert.json) and the content-page video section (page.json). Regression-test both when any of them change.
- Script order matters: cv-pdp-video-reviews.js must stay before cv-product.js (layout/theme.liquid:298-304) to hear
  the first `cvs:change`.
- Two rails on one page (counter inline + this section) would autoplay two sets of clips; the single-audible-clip
  rule is per section. Avoid placing both.
- Any animated score must be the review-app value or the clearly labelled clip average; never animate toward a
  number that is not on the page.
