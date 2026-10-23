# cv-product ("Product: order slip", "The Order Slip")

Family: buybox-alt. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**orphan**: placed in no template and no section group (grep of `templates/*.json`, `sections/*-group.json`
returns nothing). The former `product.order-slip.json` no longer exists (`ls templates/`). The default
product templates use `cv-product-counter` ("The Shop Counter") instead. The schema has no
`enabled_on`, so the merchant can add it to any template, including ones without a `product` object.

## Purpose

The earlier default product buy box: product photos in a scalloped shop-window frame, and a paper
order slip with numbered lines (your phone, style, how many), a handwritten total, Add to bag, a
status live region and a sticky Add to bag bar. Commerce (variant resolution, pack tiers,
mix-and-match slots, add to bag, Buy now support, sticky bar) is in the shared `assets/cv-product.js`;
motion in `assets/cv-pdp-slip-motion.js` and `assets/cv-pack-motion.js`.

## Files (owned / shared)

Owned (only this section loads or references them):
- `sections/cv-product.liquid`
- `assets/cv-pdp-slip.css` (loaded only here at :14; cv-pdp-home.css:45 and cv-pdp-story.css:4,:192 mention it in comments only)
- `assets/pdp-slip-frame.webp` (+ `.json`), `assets/pdp-slip-tape.webp` (+ `.json`)

Shared (do not edit from this lane):
- `assets/cv-product.js` (also cv-product-counter; loaded by layout/theme.liquid:302-304 on every product template). Owns all money and state.
- `assets/cv-pdp-slip-motion.js` (layout/theme.liquid:307; its `isCounter` branch at :33 and its story part `[data-cvp-fit]` (:147-166) serve cv-product-counter and cv-pdp-fit on the live templates)
- `snippets/cv-pack-slots.liquid` + `assets/cv-pack-slots.css` + `assets/cv-pack-motion.js` (also cv-product-counter; layout/theme.liquid:305)
- `assets/pdp-slip-paper.png` (also cv-pdp-closer, cv-pdp-fit, cv-pdp-guarantee)
- `assets/cart.js` (`cart:refresh` listener, `window.CasifyCart.refresh`), `layout/theme.liquid`, `snippets/gsap.liquid`

Implication: this section's behaviour and motion can only be changed in shared files. A lane that owns
cv-product may edit the Liquid markup and `cv-pdp-slip.css` only; JS changes need the cv-product-counter
lane (buybox-counter family) to agree.

## Store adaptation findings

1. **M, no Buy now button** although PRODUCT.md "Capabilities" makes a styled Buy now beside Add to bag a confirmed requirement and the shared JS already supports it: `buyButtons = $$('[data-cv-buy-now]')` (cv-product.js:90), `buyNow()` (:634-653) posts the same pack and goes to `base + 'checkout'`. Fix: add `<button type="button" class="cvs__buy" data-cv-buy-now><span data-cv-buy-label data-label-default="Buy now">Buy now</span></button>` after `#cvAddBtn` (:287-291), styled in `cv-pdp-slip.css`.
2. **M, missing `enabled_on`**: add `"enabled_on": { "templates": ["product"] }` to the schema (:329-333). Placed elsewhere the section renders with an empty product and cv-product.js (only loaded on product templates) never binds.
3. **M, single-instance ids**: `id="cvPdp"`, `#cvAddForm`, `#cvAddBtn`, `#cvTotal`, `#cvSticky` (:99, :154, :285-287, :301) and cv-product.js uses `document.querySelector('[data-cv-pdp]')` (cv-product.js:26). Two buy boxes on one page (this plus cv-product-counter) would bind only the first. Fix: schema note "one per page", or a guard in the Liquid (`{%- if template.name == 'product' -%}`) plus documentation.
4. **L, breadcrumb fallback label** defaults to "Cases" (:111, :334) and is a setting: fine. "Home" (:106) is hard-coded English; use `'general.breadcrumbs.home' | t` only if the locale key exists (check before adding).
5. **L, option label override** logic (:212-216) uses `forloop.first` on the full option list, so when the model option is index 0 and style is index 1 it works; when there are 3 options the override lands on the first non-model option only. Acceptable; document.
6. **L, sold-out marking**: values get `data-cv-stock="out"` from a first-available match (:184-201, :223-241), correct and LIVE.
7. **OK, pack prices** are computed from the variant price and the tier's `discount_pct` with cent rounding (:68-79, :256-261), matching the store's live automatic discounts (18% / 31%, PRODUCT.md "Capabilities"); preset tiers (:368-370) match. The flag "Save 18%" preset (:369) is backed.
8. **OK, copy defaults** have no dashes; the service line default (:347) uses a hyphen "1-3"; acceptable, but "1 to 3" reads better and matches house style elsewhere.
9. **OK, JSON-LD** (:310-327) uses live product data. Note `cv-product-counter` prints its own; never place both.

No candy-as-product, no other brand, no placeholder people in this section.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Price, compare-at | :161-164 | LIVE (variant) |
| Pack per-case price "N each", total | :256-270, :283-286 | LIVE price x MERCHANT-TYPED `discount_pct` (preset 18/31 = live automatic discounts, BACKED by PRODUCT.md "Capabilities") |
| Ribbon "Save 18%" | preset :369 | BACKED (live discount) |
| "Free shipping · 30-day returns · Ships in 1-3 business days" | default :347, rendered :293-295 | BACKED (PRODUCT.md:34 service facts) |
| Stock state of each model/style | :201, :241 | LIVE |

No ratings, review counts, guarantees or performance claims.

## Motion inventory

- cv-motion attributes: none. The `data-cv-*` attributes here (`data-cv-pdp`, `data-cv-option-index`, `data-cv-value`, `data-cv-stock`, `data-cv-qty`, `data-cv-discount`, `data-cv-tier-each`, `data-cv-full`, `data-cv-opt-out`, `data-cv-opt-out-sticky`) are cv-product.js state hooks, not cv-motion.js API.
- Inline pending guard (:15-23): adds `html.cvs-pending` (hides stamps, tape, total via cv-pdp-slip.css:322-323) for at most 1400 ms, skipped under reduced motion. cv-pdp-slip-motion.js releases it at :31 (no-op path) or :57 (after start states are set).
- `cv-pdp-slip-motion.js` (GSAP, product templates only):
  - entry timeline (:59-66): slip settles (y -22, rotation -4.5, expo.out 0.9 s), photo scale 1.08 to 1, thumbs rise staggered, tape presses, stamps thump in with CustomBounce `cvsStamp` (:39-42), total writes via clip-path wipe, CTA elastic pop. Finishes instantly when the tab is hidden (:67).
  - choose (:73-89): re-stamp the line number and hop the control on click; total clip-wipe on `cvs:change`.
  - models list stagger on `cvs:models` open (:91-94).
  - add (:97-145): CTA squash on `cvs:adding`; on `cvs:added` a torn stub "N cases" flies to `#bagBtn` with MotionPathPlugin (straight-tween fallback), bag icon bounce.
  - story (:147-166): `[data-cvp-fit]` cascade (belongs to cv-pdp-fit).
- `cv-pack-motion.js`: pack boxes, lid pop, Flip re-flow on pack size change (`cvs:slots-before` / `cvs:slots`).
- GSAP plugins: CustomBounce (optional), MotionPathPlugin (optional), ScrollTrigger (story), Flip (pack motion).
- Reduced motion: slip motion and pack motion return early (cv-pdp-slip-motion.js:30-31; cv-pack-motion.js:20); CSS: `.cvs-sticky { transition: none }` (cv-pdp-slip.css:318). Not reactive to a live preference change.
- No-JS: complete. Form posts natively with `id` and `quantity` (pack size) to `/cart/add` (:154-156); stamps/tape hidden only while the inline guard runs (needs JS to add the class in the first place). Mixed slots fall back to N copies of the chosen variant.
- Theme editor: neither cv-product.js nor cv-pdp-slip-motion.js listens to `shopify:section:load/unload`; a re-rendered section loses all bindings until reload (both run once at boot, cv-product.js:26, cv-pdp-slip-motion.js:27).
- After add: `cvs:added`, `cart:refresh`, `cart:added` dispatched (cv-product.js:619-621); the drawer is not opened (MOTION-SYSTEM.md 5.3 step 8).

## Motion opportunities

Because the JS is shared, implement these in a coordinated pass with the buybox-counter lane, or keep
them CSS-only in `cv-pdp-slip.css` (owned).

1. **(High) Buy now** (after finding 1): GSAP press squash + "To checkout…" label already handled by cv-product.js; add the arrow nudge on `cvs:buying` in cv-pdp-slip-motion.js using the counter idiom (cv-pdp-counter-motion.js:333-348), but without its 300 ms `setInterval` poll: clear on `pageshow` / error via an event.
2. **(High) Add to bag success state**: the stub fly exists; add a CSS-only `.is-done` tick stamp on `#cvAddBtn` in `cv-pdp-slip.css` (owned): a rubber-stamp "In your bag" scale 1.4 to 1, 240 ms, `--ease-candy`, static under reduce.
3. **(High) Pack line** (packs/bundles): when `cvs:pack` changes, re-stamp is already there; add a "you save" ticket that tears in (clip-path) with the real saving from `cvs:change` `detail.compareAt/total` (cv-product.js:415). Value is computed, never typed.
4. **(Medium) Sticky bar entrance**: `.cvs-sticky.is-visible` slides with a CSS transition (cv-pdp-slip.css:282-293); add a one-time tape-press wobble on first show (GSAP, 420 ms) and a total wipe synced with the main total.
5. **(Medium) Theme editor safety**: add `shopify:section:load/unload` handling to the shared motion (revert timelines in a `gsap.context`) so the editor never shows a half-stamped slip. Requires the shared-file owner.
6. **(Low) Scroll**: the slip is above the fold; no scroll reveal needed. Thumbnails could get `data-cv-stagger` but they are already animated by the entry timeline; do not double-animate.

## Risks

- Orphan: zero shopper impact today. Fixing it is low priority unless the merchant wants the Order Slip back; placing it requires a product template slot (product.json has 22 of 25 sections, STORE-FACTS.md:207-208).
- Any change to `cv-product.js`, `cv-pdp-slip-motion.js` or the pack snippet changes the live Shop Counter. Test product.json and product.convert.json after any shared edit.
- The `cvs-pending` class lives on `<html>`: if cv-pdp-slip-motion.js fails to load (or GSAP is missing), the 1400 ms timeout (:21) is the only release. Keep that timeout.
- Placing both cv-product and cv-product-counter on one template breaks both (single `[data-cv-pdp]` root, duplicate JSON-LD).
