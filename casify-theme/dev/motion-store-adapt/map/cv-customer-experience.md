# cv-customer-experience ("Product: experience")

Family: halo-2. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
In quotes, `[em]` / `[en]` mark an em / en dash that exists in the source (never copy them forward).

## Status

**orphan**: placed in no `templates/*.json` and in neither section group.
`"enabled_on": { "templates": ["product"] }` (:273), so it can only be added to product templates.
Its script is loaded on every product page regardless (layout/theme.liquid:302, :324).

## Purpose

A product-page "customer experience" block: a KIE plaque image with pinned paper tickets (store rating
ticket, product review-state ticket, up to 6 merchant `ticket` blocks), a header, `experience` rows
(either a store-rating percentage ring or an icon seal), a closing note, and an optional review-app
area (`@app` blocks) or a "Write the first review" link. It is the most store-aware section in this
family: product title and image, the review metafields `reviews.rating` / `reviews.rating_count`
(:4-13) with an honest empty state, and confirmed service facts in the preset.

## Files (owned / shared)

Owned:
- `sections/cv-customer-experience.liquid` (275 lines)
- `assets/cv-customer-experience.css` (loaded only at :1)
- `assets/cv-customer-experience.js` (loaded only by layout/theme.liquid:324; no other user)
- `assets/cv-customer-experience-plaque.webp` (146,722 bytes, 1448x1086; only :47) and its local
  sidecar `assets/cv-customer-experience-plaque.webp.json` (not shipped)

Shared (do not edit from this lane):
- `snippets/cv-icon.liquid` (`star` :233, `device` :135, `sparkle-clear` :84 and the block icon
  choices, all present)
- `layout/theme.liquid:302-325` (product-template script block)
- GSAP core, ScrollTrigger, DrawSVGPlugin (always loaded, MOTION-SYSTEM.md 1.4)
- The anchor id `cvc-reviews` is a cross-section contract with cv-product-counter.liquid:436, :750,
  cv-pdp-reviews.liquid:29, :114, review-widget.liquid:497 and snippets/cv-product-summary.liquid:112

## Store adaptation findings

1. **H, "98%" is a derived claim that is not in the evidence.** The rating seal converts the 4.9/5
   store rating into `external_percent = rating × 20` (:17) and prints "98%" with a ring (:119-123).
   Evidence is "4.9 out of 5 from 952 reviews on Trustpilot and Google" (PRODUCT.md:101); a bare
   percentage reads as "98% of customers satisfied", which nobody measured. Fix: show "4.9" inside
   the seal with "/5" small, keep the ring fill at rating/5, and set `aria-label="Rated 4.9 out of 5"`.
2. **H, duplicate id with the live reviews section.** Default anchor `cvc-reviews` (:37, :175) is
   also the default id of cv-pdp-reviews (cv-pdp-reviews.liquid:29) and review-widget
   (review-widget.liquid:497), and product.json / product.convert.json already place one of them.
   Adding this section to a product template creates two elements with the same id; the buy-box
   rating link (cv-product-counter.liquid:436) jumps to whichever comes first. Fix: default anchor
   `cvx-experience` and an info text "Change only if this section replaces the reviews section".
3. **H, rating fallback cannot be switched off.** `| default: '4.9'` and `| default: '952'` in Liquid
   (:15-16) mean clearing the settings still prints 4.9 and 952, and the rating ticket (:58-67) has
   no visibility condition. Values are backed today (PRODUCT.md:101), but the merchant must be able to
   remove them (for example if the external profile changes). Fix: no Liquid defaults; render the
   rating ticket and the `rating` experience row only when both settings are present.
4. **M, static ring hardcoded to 98.** CSS sets `stroke-dasharray: 98 100` (cv-customer-experience.css
   :223). Without JS, under reduced motion (the JS returns at :20) or with any other rating, the ring
   still shows 98% while the label shows the real value. Fix: inline
   `style="stroke-dasharray: {{ external_percent }} 100"` on the ring (:121), or a CSS custom property.
5. **M, en and em dashes in shopper copy.** Preset ticket title "1[en]3 business days" (:263), experience
   body "within 1[en]3 business days" (:268), closing note default "... the rest [em] real feedback ..."
   (:193). Fix: "1 to 3 business days"; comma.
6. **M, pack percentages typed as text.** Preset tickets "Save 18%" / "Save 31%" (:265-266) are
   backed today (PRODUCT.md:39) but drift silently if the automatic discount changes. Fix: a `pack`
   ticket type with a `range` setting `pct` (info copying cv-product-counter.liquid:830), title built
   as "Save {{ pct }}%".
7. **M, ticket overflow.** The collage positions only 8 tickets (cv-customer-experience.css:89-96: 2
   fixed + 6 blocks) but `max_blocks` is 18 (:256) with no per-type limit. A 7th ticket block stacks
   unpositioned. Fix: `"limit": 6` on the `ticket` block type.
8. **M, intro overclaims.** "Real store feedback, backed by the service promises..." (:174): the
   section shows a rating number, not feedback. Fix: "Our store rating, and the promises behind every
   order."
9. **L, a11y.** `aria-label` on a plain `div` (:43) is not announced; add `role="group"`. The
   heading text "Review record open" (:188) is jargon; "No reviews for this case yet" is clearer.
10. **L, count-up flicker.** The JS counter starts from 0 only when its tween begins (js:123-129), so
    the label shows the final value, then jumps to 0%, then counts up. Fix: set the label to the
    start value at timeline creation (or use `fromTo` on the proxy).

## Claims register

| Claim | Where | Status |
|---|---|---|
| 4.9/5 store rating, 952 published ratings, Trustpilot + Google | :15-16, :63-65, :178-180 | BACKED as MERCHANT-TYPED setting (PRODUCT.md:101); Liquid fallback must go (finding 3) |
| "98%" rating seal | :17, :121-123 | UNBACKED as a percentage (derived, finding 1) |
| "Rated [rating] out of 5 across [count] reviews on [source]" | :133, :183 | BACKED (same setting) |
| "Loved across the shop" | :267 | Opinion framing of the rating; acceptable only next to the real rating |
| Product rating and review count | :4-13, :78-85 | LIVE (reviews metafields), empty state otherwise |
| Exact-model fit, "Pick only from the phones this case is made for" | :261 | LIVE (product's own model option) |
| Free shipping, no minimum, no code | :262, :268 | BACKED (PRODUCT.md:34) |
| Dispatch 1 to 3 business days | :263, :268 | BACKED (PRODUCT.md:34) |
| 30-day returns | :264, :269 | BACKED (PRODUCT.md:34) |
| Save 18% (2 cases), Save 31% (3 cases), mix models and styles | :265-266 | BACKED (PRODUCT.md:39), typed text (finding 6) |
| "Real store feedback" | :174 | UNBACKED wording (finding 8) |

## Motion inventory

- cv-motion attributes: none.
- Section JS `assets/cv-customer-experience.js` (192 lines, classic IIFE, WeakMap instances):
  - Guard: returns without GSAP, ScrollTrigger or under reduced motion (:20).
  - One-shot ScrollTrigger `top 74%` (:62-142): plaque rises and un-blurs, tickets deal in with
    stagger .045, pins pop (`back.out`), heading/intro slide, rule scaleX, experience rows clip
    reveal, seals spin-pop, rating ring draws via `strokeDashoffset` with a % count-up (:113-131),
    icon strokes draw with DrawSVGPlugin when present (:133-135), closing and app area fade.
  - Ambient plaque breathing (`yoyo`, 4.8 s) paused offscreen and in hidden tabs (:35-60, :144-153,
    :161) (DESIGN.md: long-running motion pauses offscreen).
  - Editor: `shopify:section:load` mount, `shopify:section:unload` unmount with `context.revert()`
    (:187-191).
- Reduced motion: JS no-op; CSS removes transforms/animation (cv-customer-experience.css:353-360).
- No-JS: nothing hidden in CSS; full static state (except the 98 ring, finding 4).
- Flash risk: the timeline is built in `onEnter`, so already-visible tickets snap to `autoAlpha: 0`
  and then animate.

## Motion opportunities

1. **(High) Pending class instead of visible-then-hidden.** Print the MOTION-SYSTEM.md 4.3 inline
   guard with a `cvx-pending` class that hides only the plaque pins and ticket decoration; build the
   timeline paused at mount with start states set by GSAP, `play()` in `onEnter`. Text and the rating
   stay readable.
2. **(High) Rating seal tied to real data.** Ring draws to `rating / scale_max` and the number counts
   from 0.0 to 4.9 with one decimal (snap 0.1), not a percentage; when product review metafields
   exist, the product ticket's stars fill left to right with DrawSVG. Reduced motion: final values.
3. **(High) Pack tickets that act.** Make the two pack tickets buttons that dispatch `cvs:pack`
   `{ qty: 2 | 3 }` on the `[data-cv-pdp]` root (cv-product.js:536-540) and GSAP ScrollTo `#cvPdp`;
   the ticket gets a quick stamp (scale 1.08 -> 1, `CustomBounce`) on press. The exact-fit ticket
   scrolls to the buy box and pulses the model select. State stays in cv-product.js.
4. **(Medium) Hook into add-to-bag.** Listen to `cvs:added` on `[data-cv-pdp]` (cv-product.js:619)
   and, if the section is in view, wiggle the free-shipping and dispatch tickets once (CustomWiggle,
   always loaded) as a reassurance beat. Never fires under reduced motion.
5. **(Low) Plaque parallax**: replace the yoyo with a ScrollTrigger `scrub` drift (`y: -16`) on
   desktop only via `gsap.matchMedia()`; keep the offscreen pause.

## Risks

- Role overlap: product.json already has a reviews section and the Shop Counter carries service
  facts and promise stamps (cv-pdp-promises). PRODUCT.md:37 asks for each role once per page; place
  this only as a replacement, and fix the anchor (finding 2) first.
- The external rating is store-level, not product-level (PRODUCT.md:101); copy must keep saying
  "store rating", never "this case".
- The script loads on every product page even when the section is absent (no-op cost only); gating
  it on `data-cvx` would need a shared layout edit (coordinate with the layout owner).
- `@app` review blocks render third-party markup; motion must not tween app internals (only the
  `[data-cvx-app]` wrapper, as today).
