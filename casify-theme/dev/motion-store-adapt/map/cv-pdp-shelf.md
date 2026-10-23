# cv-pdp-shelf ("Product: more cases")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. `enabled_on: product`
(sections/cv-pdp-shelf.liquid:43), preset "Product: more cases" (:42). When placed it is also fetched through the
product recommendations endpoint (Section Rendering API): the first render is empty and `cv-pdp-story.js`
swaps in the filled render (cv-pdp-story.js:236-245). So once placed it behaves as "live + dynamic".

## Purpose

"More from the counter": real products from Shopify product recommendations (`intent=related`, :11) set on a
wooden shelf. Hidden until filled; stays hidden with no recommendations (:5-6; CSS cv-pdp-story.css:154).

## Files (owned / shared)

Owned:
- `sections/cv-pdp-shelf.liquid`

Shared:
- `assets/cv-pdp-story.css` (18 sections). Shelf rules cv-pdp-story.css:154-178, 213, 225 are shelf-only but the
  file is shared.
- `assets/cv-pdp-story.js` shelf block cv-pdp-story.js:236-245 (fetch + swap + `cvp:shelf` event); same file runs
  fit, set, closer, reel counter, snap, ugc.
- `layout/theme.liquid` (cv-pdp-story.js loads for `template.name == 'product'`, :306).

## Store adaptation findings

1. Default heading duplicates cv-pdp-row's default "More from the counter" (sections/cv-pdp-row.liquid:80 vs
   :39 here). Decide one; suggested: keep "More from the counter" here, change the row's default (see
   cv-pdp-row.md finding 1).
2. Hard-coded English "From " (:25). Use a setting `from_label` or a locale key.
3. Compare-at missing. The shelf shows only `price_min` (:25) while the row (cv-pdp-row.liquid:61) shows the struck
   compare-at. Pick one rule for all product cards. If added: print `compare_at_price_min` only when
   `item.price_varies == false` and `compare_at_price_min > price_min`.
4. No model-fit line and no add path (same as cv-pdp-row findings 5-6). For quick pick on FETCHED markup the
   layout gate `content_for_layout contains 'data-cvqp-open'` (layout/theme.liquid:208, 295) does NOT see the
   recommendations HTML (MOTION-SYSTEM.md 1.2 rule 2). Fix: print a literal attribute containing that substring on
   the always-rendered shelf root, e.g. `data-cvqp-open-host` on `<section ... data-cvp-shelf>` (:10), so the
   dialog snippet and cv-quick-pick.js load. cv-quick-pick.js uses a delegated document click (:227-228), so
   injected buttons work.
5. `limit` passed in the URL (:11) and `product_id` are correct. `intent=related` is right for "more cases"; the
   live `cv-pdp-set` uses complementary first (cv-pdp-story.js:6-9), so the two will rarely duplicate, but
   `showEachProductOnce()` (cv-pdp-story.js:199) does NOT include `.cvp-shelf__item`, so the shelf can repeat
   products already shown by the showcase/rows/set. Fix (shared JS, coordinate): add `[data-cvp-shelf-item]` to the
   de-dup selector and run de-dup again on `cvp:shelf`.
6. Empty-state honesty is correct: nothing renders without recommendations. In the editor the section is invisible
   too; add an editor-only hint when `request.design_mode` and not filled.
7. Copy: no dashes, no candy-as-product. "Counter" is the shop counter (metaphor), fine.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Product names, photos, "From" prices | :18-25 | LIVE (Shopify recommendations) |

No ratings, counts, guarantees or performance claims.

## Motion inventory

- data-cv-* attributes: none. Hooks: `data-cvp-shelf` (:10), class `is-filled`.
- Section motion: NONE. `cvp:shelf` is dispatched after the swap (cv-pdp-story.js:243) but nobody listens
  (grep across assets/sections/snippets finds only the dispatcher).
- CSS only: hover lift `translateY(-6px) rotate(-1deg)` on `.cvp-shelf__media` (cv-pdp-story.css:172), disabled
  under reduced motion (:224-225).
- No-JS: section stays hidden (`.cvp-shelf:not(.is-filled) { display:none }`, cv-pdp-story.css:154), which is an
  honest static state (nothing to show without the fetch). Acceptable.
- Editor events: none; in the editor a re-rendered shelf is empty again until cv-pdp-story.js runs, which it does
  not re-run on `shopify:section:load`. Fix: listen for `shopify:section:load` and re-run the fetch for the new root.

## Motion opportunities

1. HIGH: Use the free `cvp:shelf` event. In an owned `assets/cv-pdp-shelf-motion.js` (printed by the section):
   on `cvp:shelf`, if `gsap && ScrollTrigger && !reduce`, drop the cards onto the plank like the row
   (`y:-110, rotation random +/-10 -> 0`, `back.out(2)`/`cvwDrop`, stagger 0.1) when the shelf enters (`top 80%`,
   once), then `ScrollTrigger.refresh()` because the page grew after load (MOTION-SYSTEM.md 8.2).
   Use the pending-class pattern so a missed trigger never hides cards.
2. HIGH (commerce): quick pick buttons (finding 4) with the same lift + fly-to-bag feedback as described in
   cv-pdp-row.md opportunity 1; drawer refresh comes for free via `cv:cart` (cart.js:171).
3. MEDIUM: Plank shadow grows as the cards land (opacity .4 -> 1 on a real `.cvp-shelf__plank` element).
4. Reduced motion: cards simply appear (no drop). No-JS: hidden (unchanged).

## Risks

- Section Rendering API markup: never use `data-cv-reveal` / `data-cv-split` inside it; cv-motion.js runs once
  and would leave injected content at opacity 0 (MOTION-SYSTEM.md 3.4 rule 2).
- The fetch/swap lives in shared cv-pdp-story.js; keep new motion in an owned file that only listens.
- Two shelves (row + shelf) with the same heading is a content risk if both are placed.
