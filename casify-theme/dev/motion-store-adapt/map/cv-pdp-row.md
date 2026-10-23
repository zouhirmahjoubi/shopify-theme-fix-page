# cv-pdp-row ("Product: product shelf")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. `enabled_on: product`
(sections/cv-pdp-row.liquid:87), preset "Product: product shelf" (:86). Renders nothing until a collection is
chosen (`coll != blank`, :15) and at least one other product remains after offset (:28).

## Purpose

Rebuild of the home collection rows for the product page (sections/cv-pdp-row.liquid:1-8): real products from a
chosen collection standing on a honey-oak shop shelf (KIE set piece `pdp-home-shelf.webp`), skipping the page's own
product and an optional offset. Each card links to the product with its photo, title and price. Can be placed
several times (whole shop, then iPhone cases). `cv-pdp-story.js` de-duplicates products across showcase, set and rows.

## Files (owned / shared)

Owned:
- `sections/cv-pdp-row.liquid`
- `assets/pdp-home-shelf.webp` (referenced only at sections/cv-pdp-row.liquid:30)

Shared:
- `assets/cv-pdp-story.css` (18 sections), `assets/cv-pdp-home.css` (12 sections; row rules cv-pdp-home.css:455-503,
  664 are row-only but the file is shared)
- `assets/cv-pdp-home-motion.js` "shelves" block cv-pdp-home-motion.js:393-411 (row-only block in a shared file)
- `assets/cv-pdp-story.js` `showEachProductOnce()` cv-pdp-story.js:199-233 (rows, showcase cards and set items;
  rewrites `grid-column` and `--n`, hides an empty row)
- `snippets/cv-icon.liquid` (53 files render it)
- `layout/theme.liquid` (scripts by `template.name == 'product'`, :304-322)

## Store adaptation findings

1. Default heading duplicates another section. "More from the counter" (:80) is also the default of cv-pdp-shelf
   (sections/cv-pdp-shelf.liquid:39). If both are placed the page shows two identical headings. Fix: default this
   one to "More cases from the shop" and leave cv-pdp-shelf as "More from the counter" (or the reverse; decide once).
2. No default collection, so a freshly added row is invisible on the storefront AND in the editor with no hint.
   Fix: in `request.design_mode` with `coll == blank`, render a short editor-only note ("Choose a collection for this
   shelf"). Do not default to a hard-coded handle; `all`, `iphone`, `frontpage` exist per STORE-FACTS.md:182-187 but
   the choice is the merchant's.
3. Strike price can come from a different variant. :61 prints `item.price_min` and, when
   `item.compare_at_price > item.price`, `item.compare_at_price` (that is `compare_at_price_min`). With per-variant
   compare-at prices, the struck price may not belong to the cheapest variant. Fix: compare
   `item.compare_at_price_min > item.price_min` and print it only when `item.price_varies` is false, or print
   "From {{ price_min }}" without a strike when prices vary.
4. Hard-coded English "From" (:61). Use `'products.product.price.from' | t` if such a key exists in
   locales/en.default.json, else a section setting `from_label` (default "From").
5. Model fit is invisible on cards. Every case is made for specific phones (PRODUCT.md:31), but cards show only
   title and price. Fix (store data): print "Made for N phone models" from the model option's `values.size` using the
   STORE-FACTS.md:148-167 detection rule (name contains model/phone/device/compatib/applicable, else values match
   iphone|galaxy|samsung|pixel). Never truncate model text (DESIGN.md Don'ts).
6. No add path. Cards link only. The theme already has a quick pick dialog that asks for colour and phone before
   adding (assets/cv-quick-pick.js:1-12, delegated click at :227-228; gate layout/theme.liquid:208-210, 295-297).
   Fix (commerce): add a "Choose phone" button with `data-cvqp-open data-handle data-url` like
   snippets/cv-card.liquid:79. The row is server-rendered, so the `content_for_layout contains 'data-cvqp-open'`
   gate works. Disable when `item.available` is false.
7. Copy check: heading, link "See all" (:82), offset info (:84) are fine: no dashes, no candy-as-product. The
   "honey-oak candy-shop shelf" is a set piece, not merchandise (comment :4-5 only).
8. Product titles: some live titles contain a literal "?" (PRODUCT.md:53). Titles are escaped (:60) and clamped to 3
   lines (cv-pdp-home.css:499); fine.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Product prices, "From" price, struck compare-at | :61 | LIVE (product data); see finding 3 for variant mismatch |
| Product names and photos | :55-60 | LIVE |

No ratings, counts, guarantees or performance claims.

## Motion inventory

- data-cv-* attributes: none. Hooks: `data-cvw-row` (:29), `data-cvw-row-item` (:52).
- Section motion (cv-pdp-home-motion.js:393-411): boxes start `y:-130, opacity:0, random rotation +/-12`
  (`gsap.set` at boot), drop onto the plank once at `top 75%` with `cvwDrop` CustomBounce (stagger 0.12); on
  hover-capable devices each box wiggles (`cvwWiggle` CustomWiggle) on `pointerenter`.
- CSS hover lift `translate: 0 -8px` (cv-pdp-home.css:486), disabled under reduced motion (:713-714).
- GSAP plugins: ScrollTrigger, CustomBounce, CustomWiggle (all in the always-loaded bundle).
- Reduced motion: file returns early (:69); static shelf.
- No-JS: fully readable (images, titles, prices, links).
- Editor events: none. The boot-time `gsap.set` hides boxes until the trigger fires; there is no pending-class /
  timeout fallback (MOTION-SYSTEM.md 4.3). If ScrollTrigger never fires (e.g. section re-rendered after boot) the
  re-rendered markup is fresh and visible, so no stuck state, but motion is lost.
- Interaction with cv-pdp-story.js: it can set `row.hidden = true` or hide duplicate items before motion runs
  (cv-pdp-story.js:222-228); motion targets hidden items too (harmless).

## Motion opportunities

1. HIGH (commerce): quick pick from the shelf (finding 6). On click the box lifts off the plank
   (`y:-12, rotation:-2`, 160ms) as the dialog opens; on `cv:cart` (dispatched by cv-quick-pick.js:58) the product
   photo token flies to the header bag. Reuse the fly helper pattern from cv-pdp-counter-motion.js:260-331
   (MotionPath is loaded on product templates, layout/theme.liquid:173-177); badge bounce already exists in
   cv-header.js:234-248.
2. MEDIUM: Price tickets swing on the string after the box lands (`rotation` 6 -> 0 with `elastic.out(1,0.35)`,
   transformOrigin top centre on `.cvw-row__tag`), 420ms, staggered after each box. Matches "tickets swing" in
   DESIGN.md Motion.
3. MEDIUM: Replace the boot `gsap.set` hidden state with the pending-class pattern (`.cvw-row--pending` added by
   JS, removed by a 1400 ms timeout) so a missed trigger never leaves empty plank space.
4. LOW: Shelf plank draws in (`scaleX 0 -> 1` on a real element instead of `::after`) before the products drop.
5. Reduced motion: no drop, no wiggle, no fly; quick pick opens without animation (already supported by
   cv-quick-pick.js:10-11).

## Risks

- The row's motion lives in a shared file (cv-pdp-home-motion.js) and de-dup logic in another (cv-pdp-story.js);
  new motion should go in an owned `assets/cv-pdp-row-motion.js` printed by the section.
- `grid-column` is assigned inline by cv-pdp-story.js:225; animating layout properties (Flip) on these items will
  fight it.
- Quick pick changes the commerce surface: it must never pre-select a model (PRODUCT.md:110) and must add only a
  resolved variant (PRODUCT.md:30); cv-quick-pick.js already enforces this.
