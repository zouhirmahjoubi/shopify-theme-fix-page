# cv-scrolling-reviews ("Scrolling reviews")

Paths are relative to `D:/Shopify Theme Fix & Page/casify-theme/`. Read-only pass, 2026-10-22.

## Status

LIVE on `templates/product.json` only: instance `scrolling_reviews` (type at :575, six `review` blocks :576-629,
settings :640-648). Position 12 of 22, just after `journey` and before `ratings_reviews` (cs-customer-proof).

What shoppers see today: heading "Our customers <em>love</em> their cases" (:641), two rows of ticket cards running
in opposite directions at 50 px/s (:642-643), six quotes copied verbatim from the review widget (PRODUCT.md:80),
each with stars (5,5,4,5,5,4) and the tag "Verified buyer" (`verified: true` at :583, :592, :601, :610, :619, :628).

## Purpose

A marquee of short customer quotes as die-cut paper tickets (monogram or photo in a brass ring, stars, name).
Content is merchant-entered only; the preset ships empty blocks and empty blocks render nothing live
(sections/cv-scrolling-reviews.liquid:9-11, :24-36, :72-74).

## Files (owned / shared)

Owned:

- `sections/cv-scrolling-reviews.liquid` (178 lines)
- `assets/cv-scrolling-reviews.css` (163 lines; `stylesheet_tag` at :19)
- `assets/cv-scrolling-reviews.js` (338 lines; loaded by the layout gate below). Other CSS files only mention
  `.cvsr__title` in comments (cv-feature-tabs.css:203, cv-offer-courier.css:243, cv-vs.css:180,
  cv-pdp-counter.css:360).

Shared (coordinate):

- `layout/theme.liquid:251-254`: gate `editor or content_for_layout contains 'data-cvsr'`.
- `snippets/cv-stars.liquid` (:99, with `class: 'cvsr-card__stars'`).
- `templates/product.json`.
- GSAP bundle: core, ScrollTrigger, SplitText (always loaded, snippets/gsap.liquid:33).

## Store adaptation findings

1. HIGH, "Verified buyer" on six reviews nobody has verified (templates/product.json:583, :592, :601, :610, :619,
   :628). The merchant copied them from the widget "verified ticked as in the widget" (PRODUCT.md:80); Evidence on
   Hand says no customer reviews are confirmed (PRODUCT.md:105); the block info itself says "Only tick this for a
   confirmed order" (schema :164). Fix (template, merchant confirmation): untick `verified` unless orders were
   found; if the reviews cannot be confirmed, empty the blocks (the section then hides itself, :31-36).
2. MEDIUM, heading asserts sentiment: "Our customers <em>love</em> their cases" (templates/product.json:641; schema
   default :131). With unconfirmed reviews this is an unbacked claim. Fix: product value and schema default
   "In customers' <em>own</em> words" (keeps the one script flourish).
3. MEDIUM, editor default ships a 5-star rating: block `rating` default 5 (schema :162). A merchant who adds a
   quote and does not touch the slider publishes five stars they never chose. Fix: default 0 ("0 hides the
   stars").
4. MEDIUM, same quotes twice on one page: the six quotes are duplicated in review-widget
   (templates/product.json:1034-1105, position 21), and five of the names appear again in review-carousel with
   different quotes (:1172-1230). The two copies are independent (PRODUCT.md:80). Recommend one review source per
   page (PRODUCT.md:36).
5. LOW, hardcoded English outside locales: "Pause reviews" / "Play reviews" (:56; cv-scrolling-reviews.js:199),
   sr heading "Customer reviews" (:48), "Rated N out of 5." (:100), "Verified buyer" (:106; reuse the existing
   key `blocks.customer_review.verified`), editor hint (:85).
6. LOW, dashes in editor text: schema info "set in the script face [em] use it for one short flourish" (`[em]` marks the em dash in the source) (:130) and
   the header comment (:2). Editor-only; replace with a colon for the no-dash rule.
7. LOW, quotes clamp to 2 lines (cv-scrolling-reviews.css:112, `-webkit-line-clamp: 2`), so longer customer words
   are cut with no way to read them, including in the static no-JS rows. Fix: clamp only while `.is-looping`
   (CSS default shows the full quote), or give each card a `title` / expandable full text.

No candy-as-product copy (the "ribbon candy on a conveyor" image is in a Liquid comment only, :5), no prices, no
phone model lists.

## Claims register

| Claim shown to shoppers | Where | Status |
|---|---|---|
| "Our customers love their cases" | templates/product.json:641; schema :131 | UNBACKED sentiment (no confirmed reviews, PRODUCT.md:105) |
| Six quotes, names, star ratings | templates/product.json:576-629 | MERCHANT-TYPED (PRODUCT.md:80) |
| "Verified buyer" x6 | :583, :592, :601, :610, :619, :628; label :106 | UNBACKED |
| Quote content: "fast shipping", "Shipping took a couple of extra days", "Customer support was quick and friendly", "Already ordered a second one as a gift", "packaging was lovely" | :580, :598, :607, :589, :625 | MERCHANT-TYPED |

## Motion inventory

The most complete motion file in this family; it is the house reference for marquees.

- `data-cv-*` attributes: none. Section hooks: `data-cvsr`, `data-cvsr-speed`, `-heading`, `-fade`, `-toggle`,
  `-row`, `-dir`, `-track`, `-card` (:39-83).
- `assets/cv-scrolling-reviews.js`:
  - Conveyor: cards cloned (`aria-hidden`, editor attribute removed, :99-106) until the row loops; a linear GSAP
    `fromTo` on the track repeats forever (:120); speed driven from `gsap.ticker` (:148).
  - Scroll coupling: page scroll speeds rows up, scrolling up flips direction, then they coast back
    (ScrollTrigger :151-168).
  - Hover/focus eases a row to 12% speed (:170-171); hovered ticket lifts with `back.out` (:183, :188).
  - Visible Pause/Play toggle with `aria-pressed` (:53-57; JS :195-205), WCAG 2.2.2.
  - Offscreen stop via ScrollTrigger; rebuild on `document.fonts.ready` (:240-241) and resize.
  - Entrance timeline on `ScrollTrigger` `top 80%`, `once` (:245-285): SplitText words with mask (:255-257),
    fades, rows slide in from opposite sides, tickets pop with alternating 3deg, stars light up in sequence;
    `intro.progress(1)` in a hidden tab (:283); SplitText reverted on complete.
- Reduced motion: live. Re-inits on `change` of the media query (:47-52) and returns before any GSAP (:59);
  CSS :161-163. Rows then stay plain horizontally scrollable lists.
- No-JS: complete. Rows are scrollable lists (cv-scrolling-reviews.css:70, `overflow-x: auto`), toggle hidden
  (:53, CSS :59).
- Theme editor: `section:load` boot, `section:unload` destroy, `section:select`, `block:select` parks the row with
  that ticket in view, `block:deselect` resumes (:322-337).

## Motion opportunities

LOW value: the motion is complete, accessible and house-compliant. Work here is content (findings 1 to 4).

1. LOW, if findings 1 and 2 are fixed and reviews stay: nothing to add. Do not add a commerce CTA here; the one
   "Choose your phone model" bridge (`data-cv-scroll-to-buy`) belongs in review-widget or cs-customer-proof
   (one per page).
2. LOW, if the clamp fix (finding 7) lands, let a focused/hovered ticket expand to its full quote while the row is
   slowed (GSAP height tween on the inner `.cvsr-card__quote`, not the card, to avoid fighting the lift transform).
3. Reuse this file's patterns (pause toggle, fonts.ready rebuild, live reduced-motion re-init, clone hygiene) as
   the template for review-carousel autoplay and any new marquee.

## Risks

- The layout gate (layout/theme.liquid:251-254) is shared; renaming `data-cvsr` breaks loading.
- SplitText runs on an `inline_richtext` heading with `<em>`; keep `mask: 'words'` and the revert on complete so
  the script-face `<em>` survives.
- Content edits are in `templates/product.json` (shared) and need merchant confirmation.
