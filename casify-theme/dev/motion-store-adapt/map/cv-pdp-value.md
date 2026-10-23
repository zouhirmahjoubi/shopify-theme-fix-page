# cv-pdp-value ("Product: three worries")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. `enabled_on: product`
(sections/cv-pdp-value.liquid:129), preset with three worry blocks (:119-127).

## Purpose

Honest rebuild of the home "why it wins" value stack (sections/cv-pdp-value.liquid:1-12). The home version used
unverified lab figures (12 ft, 1,400 g, 36 months; STORE-FACTS.md:255); this one answers three shopper worries
with what the shop can stand behind: the phone models the case is made for (live option count), checkout price
and automatic pack discount, and the confirmed shipping/returns/dispatch facts. A brass scale (KIE set piece
`pdp-home-scale.webp`) weighs N cases bought singly against an N-case pack, computed from this case's price and the
pack percentage.

## Files (owned / shared)

Owned:
- `sections/cv-pdp-value.liquid`
- `assets/pdp-home-scale.webp` (referenced only at sections/cv-pdp-value.liquid:65)

Shared:
- `assets/cv-pdp-story.css` (18 sections), `assets/cv-pdp-home.css` (12 sections; value rules
  cv-pdp-home.css:150-189, 645, 656, 682-687 are value-only but the file is shared)
- `assets/cv-pdp-home-motion.js`: "worries + scale" block cv-pdp-home-motion.js:190-214 (value-only block) and the
  shared "headings" SplitText block :131-141 (also used by compare, journey, snap, spotlight, ugc via `data-cvw-split`)
- `snippets/cv-icon.liquid` (53 files; `animate: true` adds `cv-ico--anim` CSS keyframes, cv-icon.liquid:13, 23)
- `layout/theme.liquid` (cv-pdp-home-motion.js at :322 for product templates)

## Store adaptation findings

1. HIGH: Products without a phone-model option print "0". `models` starts at 0 (:18) and is substituted into the
   answer and proof tag (:46-47). For the camera-lens film (STORE-FACTS.md:108) or any product with no model option,
   the preset reads "Choose your exact model from the 0 phones this case is made for" and the proof "0 models".
   Fix: when `models == 0`, skip any worry block whose `answer` or `proof` contains `[models]`
   (`if b.settings.answer contains '[models]' and models == 0` -> `continue`).
2. Model detection is weaker than the house rule (STORE-FACTS.md:148-167). :19-25 checks name contains
   model/phone/device or the FIRST value contains iphone/galaxy/samsung, misses `compatib`/`applicable`/`pixel`,
   and has no `break`, so the LAST matching option wins. Fix: name test first with `break`
   (model|phone|device|compatib|applicable), then a value test over several values incl. `pixel`, also with `break`.
3. "phones" overstates when values are combined or duplicated. Model values include combined strings like
   "iPhone 18 Pro 17 Pro" and spelling variants (STORE-FACTS.md:125-129); `option.values.size` counts values, not
   phones. Fix the preset copy to "Choose your exact model from the [models] phone models listed for this case"
   and proof "[models] models listed". Keep the number live.
4. HIGH (price honesty): the scale's pack percentage is typed twice. `scale_pct` default 31 (:92) must equal the
   admin automatic discount AND the buy box's pack tier (`templates/product.json` tier-3 `qty: 3`,
   `discount_pct: 31`; cv-product-counter prints `data-cv-qty` / `data-cv-discount` on `[data-cv-pack]`,
   sections/cv-product-counter.liquid:584-588). Fix: at runtime, if the page has
   `[data-cv-pack][data-cv-qty="<scale_qty>"]`, read its `data-cv-discount` and re-compute the pans from it, so the
   buy box is the single source on the page. Keep the Liquid value as the no-JS state. Also hide the scale when
   `scale_qty` has no matching tier.
5. Scale ignores the shopper's variant. `cvar = product.selected_or_first_available_variant` (:17) is fixed at render;
   if variants differ in price the pans are stale. Fix: listen to `cvs:change` on `[data-cv-pdp]`
   (detail `{ variant, each, ... }`, cv-product.js:415) and re-write the three money values with the shop money
   format (`window.themeMoneyFormat`, layout/theme.liquid:155).
6. `scale_qty` is an unbounded `number` (:91) with `at_least: 2` (:27). Make it a `range` 2 to 3 (the only real
   tiers, PRODUCT.md:39) or a select.
7. Rounding: `off = singles * pct / 100.0 | round` (:29) rounds to the cent in cents units; Shopify's automatic
   discount may round per line. Note "Worked out from this case's price" (:97) already sets expectations; keep it.
8. Copy check: heading (:88), lede (:89), labels (:93-97) and preset worries (:123-125) have no dashes and no
   candy-as-product. "settled at the counter" is the shop metaphor, fine.
9. `answer` is richtext printed raw (:53): fine for richtext; `proof` is escaped (:55).

## Claims register

| Claim | Where | Status |
|---|---|---|
| "[models] phones this case is made for" / "[models] models" | preset :123, defaults :114-115 | LIVE (option value count); wording overstates (finding 3); prints 0 without a model option (finding 1) |
| "The pack prices on this page are what checkout charges for the cases, before any tax" | preset :124 | BACKED if the automatic discounts are live: PRODUCT.md:33, :39 (18% at 2, 31% at 3, checked 2026-09-15); re-verify with the connector before shipping |
| "Pack discounts come off automatically, with no code to enter" / proof "No code to enter" | preset :124 | BACKED: PRODUCT.md:39 (automatic discounts) |
| "Shipping is free" | preset :125 | BACKED: PRODUCT.md:34 |
| "your order leaves us within 1 to 3 business days" | preset :125 | BACKED: PRODUCT.md:34 |
| "you have 30 days to send it back" / "30 days to decide" | preset :125 | BACKED: PRODUCT.md:34 |
| Scale: 31% pack discount | setting default :92 | MERCHANT-TYPED, matches PRODUCT.md:39; must equal admin discount (finding 4) |
| Scale: singles total, pack total, saving | :68, :72, :75 | LIVE (computed from variant price x pct) |
| "The discount is applied automatically at checkout" | :97 | BACKED: PRODUCT.md:39 |

No ratings, review counts, customer counts, drop or magnet figures.

## Motion inventory

- data-cv-* attributes: none. Hooks: `data-cvw-value` (:34), `data-cvw-split` (:37), `data-cvw-worry` (:49),
  `data-cvw-scale` (:62), `data-cvw-scale-img` (:65), `data-cvw-pan` (:66, :70). CSS var `--tilt` (:62).
- Heading: SplitText chars drop in with random rotation, `cvwDrop` bounce, from random order
  (cv-pdp-home-motion.js:131-141). GSAP 3.15 SplitText adds aria handling by default.
- Worries: flip down like shop cards (`rotationX -78 -> 0`, `back.out(1.5)`, stagger 0.16), icons pop
  (scale .4, rotation -40 -> -7) (:191-199).
- Scale: image settles with `elastic.out(1, 0.28)`, pans drop in, saving amount wipes in via `clipPath`
  (:200-213). Pans already sit at a static tilt from CSS `--pan-y` (cv-pdp-home.css:182-183).
- Icons: `cv-ico--anim` CSS keyframes (cv-icon.liquid:13), neutralised by the global reduced-motion rule
  (theme.css:3306-3312).
- GSAP plugins: ScrollTrigger, SplitText, CustomBounce.
- Reduced motion: file returns early (cv-pdp-home-motion.js:69); final static state.
- No-JS: fully readable; CSS is the finished state (cv-pdp-home.css:10).
- Editor events: none. Boot-time `gsap.set` hides worries, pans and saving until the trigger fires, with no
  pending-class fallback (MOTION-SYSTEM.md 4.3).

## Motion opportunities

1. HIGH (packs/bundles): live scale. On `cvs:change` (finding 5) and on pack radio changes in the buy box, re-tilt
   the beam: tween `--tilt` (CSS var) or the image rotation with `elastic.out(1,0.4)`, flip the pan totals with a
   yPercent number flip (house pattern cv-pdp-counter-motion.js:208), and re-wipe the saving. Values come only from
   `cvs:change` detail or the pack radios (MOTION-SYSTEM.md 4.9: motion never owns state).
2. HIGH (packs): "Choose the N-case pack" button under the scale that dispatches `cvs:pack` `{ qty }` on the buy
   box root (cv-product.js:536 listener; cv-pdp-story.js:401 already uses it) then scrolls to the packs with
   `data-cv-scroll-to-buy` behaviour. On click, a coin/case token drops from the right pan toward the buy box
   (MotionPath is loaded on product templates; fall back to a straight tween).
3. MEDIUM: Saving count-up instead of a clip wipe: `data-cv-count` cannot format money; use a GSAP tween on a
   proxy object and format with the shop money format (as cv-pdp-video-reviews.js formatMoney does,
   cv-pdp-video-reviews.js:43-59). Final text is the Liquid value (no-JS state).
4. MEDIUM: Proof tags stamp on (`scale 1.4 -> 1`, `rotation -8 -> -3`, 160ms, `back.out(3)`) after each worry
   flips, in the "tickets stamp" idiom (DESIGN.md Motion).
5. LOW: Pending-class fallback (`.cvw-value--pending`, 1400 ms timeout) to replace the bare boot `gsap.set`.
6. Reduced motion: values still update on `cvs:change` (instant text swap), no tilt tween.

## Risks

- The pack percentage is a price claim. Any animation that emphasises the saving must use the same source as the
  buy box and the admin discount (PRODUCT.md:33, :112). Never animate a number that is not live or merchant-set.
- Motion lives in a shared file; put new code in an owned `assets/cv-pdp-value-motion.js` printed by the section,
  and remove/disable the shared block only in coordination.
- If cv-pdp-value is placed on a product with a mixed-price pack (mix-and-match slots, cv-pack-slots), the "N x this
  case's price" model is only an estimate; the note (:97) must stay visible.
