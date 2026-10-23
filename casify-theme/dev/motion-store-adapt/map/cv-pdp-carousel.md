# cv-pdp-carousel ("Product: colour carousel")

## Status

Live. `templates/product.json` only, section key `carousel`, 8th of 22 in `order` (after `fit`, before `us_vs_them`). Not placed in `templates/product.convert.json`.
Script loader: `layout/theme.liquid:326-329` loads `assets/cv-pdp-carousel.js` as a module when the markup contains `data-cvcr` (or in the editor). It is placed after `cv-product.js` so the buy box is ready first.
The section renders only when the product has a colour/style option with 2+ values (`sections/cv-pdp-carousel.liquid:88`). Otherwise it shows an editor-only note (`:317-321`).

## Purpose

This is the second buying moment, halfway down the page. Each colour's own variant photo rides a three.js 1920s merry-go-round. Beside it sit a ticket (colour name, stock line, price, was/off), colour chips, a phone-model select and "Add to bag". The section has no commerce logic of its own:
- A pick sends `cvs:choose` to the buy box (`[data-cv-pdp]`, `sections/cv-product-counter.liquid:208`).
- The panel repaints from the buy box's `cvs:change` event (`assets/cv-pdp-carousel.js:1224-1240`).
- "Add to bag" calls `requestSubmit()` on the buy box's own `#cvAddForm` (`:1323-1333`), so the pack and mixed cases go in as they would from the top.
- `addDirect()` posts straight to `/cart/add.js` (`:1280-1309`), but only when there is no buy box on the page.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-carousel.liquid`
- `assets/cv-pdp-carousel.css` (401 lines). Its header says it is the finished static state.
- `assets/cv-pdp-carousel.js` (1451 lines). GSAP plus a lazily imported three.js.

Shared (coordinate before editing):
- `layout/theme.liquid:326-329`: the conditional module loader.
- `snippets/cv-icon.liquid`: the `device`, `pause` and `play` icons. 53 files render this snippet.
- `assets/theme.css:1143-1144`: the coarse-pointer hit area for `.cvcr__link`, shared with breadcrumbs and `.cvp-set__choose`.
- `assets/cv-product.js`: buy box API.
  - Events: `cvs:choose` handler `:523`, `cvs:pack` handler `:536`, plus `cvs:change`, `cvs:adding`, `cvs:added` and `cvs:buying`.
  - Elements: `#cvAddForm`, `#cvStatus`.
  - Functions: `addToBag()` `:604-631`, `buyNow()` `:634-656`.
- `sections/cv-product-counter.liquid`:
  - `data-compare-at-fallback` at `:214`.
  - Pack tiers `data-cv-discount` at `:588`.
  - `#cvAddBtn` at `:627`, Buy now `[data-cv-buy-now]` at `:635` and the sticky bar at `:728`.
  - Setting `show_buy_now` at `:806`.
- `assets/cv-pdp-counter-motion.js:275-331`: on `cvs:added`, the fly-to-bag token leaves from the buy box button or the sticky button, not from the carousel.
- `snippets/gsap.liquid`, `assets/gsap-*.js`. Plugins loaded on product pages: CustomEase, CustomBounce, CustomWiggle, DrawSVG, Flip, MotionPath, ScrollTrigger, ScrollTo and SplitText. Draggable and Inertia are NOT loaded on product pages.
- three.js from `https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js` (`assets/cv-pdp-carousel.js:30`). 15 other theme modules use the same URL. The local `assets/three.module.min.js` is not used.
- `templates/product.json:416-430`: this section's saved settings. The file is shared by all 22 sections, so edit only the `carousel` key.

## Store adaptation findings

1. **"In stock" wording overstates when inventory is not tracked.**
   - Where: `sections/cv-pdp-carousel.liquid:220-232` and the JS strings `:299-305` ("In stock for all [n] phone models", "Made for your [model] · in stock").
   - Problem: the line is computed from `variant.available`. That is also true for untracked inventory or "continue selling when out of stock", which is common for print-on-demand cases.
   - Fix: emit a per-variant flag `"t":{{ v.inventory_management | json }}` in the `variants` JSON (`:285-287`). Say "In stock" only when inventory is tracked. Otherwise say "Made for all [n] phone models" or "Available for [ok] of [n] phone models". Mirror the same logic in the JS `fit*` strings.
2. **First paint ignores the buy box compare-at fallback.**
   - Where: Liquid `:81-85` and `:238-239` use only `cvar.compare_at_price`. The JS uses `data-compare-at-fallback` (`assets/cv-pdp-carousel.js:938`, `:1107`).
   - Today `compare_price_fallback` is `""` in `templates/product.json:157`, so the two agree. If the merchant sets the $59.99 fallback (PRODUCT.md Evidence on Hand), the static and no-JS state shows no was-price while the buy box shows one.
   - Fix: mirror `sections/cv-product-counter.liquid:112-116` with `section.settings` read from the buy box. Liquid cannot read another section, so either drop the was-price from the static state, or move the fallback to a theme setting (shared `config/settings_schema.json`, coordinate first).
3. **No "Buy now" in the panel, although the buy box has one.**
   - Where: buy box `sections/cv-product-counter.liquid:635`, setting `show_buy_now` `:806`. The carousel panel `:247-270` has Add to bag only.
   - Fix: see Motion opportunities #1. Reuse the buy box's button. Never post to `/checkout` directly.
4. **Hardcoded English UI strings that are not in the schema or locales.**
   - Where: `:186` "Pause the ride", `:191` and `:196` "Previous colour" / "Next colour", `:222-231` stock lines, and the JSON `t` block `:290-312` ("Adding…", "In your bag", "Sold out", "That didn’t go through…").
   - Effect: none ships wrong copy, but the merchant cannot edit them. Low priority. To fix, add schema text settings with these as defaults.
5. **The section comment overstates the no-JS behaviour.**
   - Where: `:21-23` claims "the chips, phone list and button work the same way" without JavaScript.
   - Reality: the chips are `type="button"` and do nothing without JS. The buy panel is `hidden` (`:247`). The no-JS path is the selected colour's still plus the link "Choose your phone model" to `#cvPdp` (`:272`).
   - Fix: correct the comment, or make each chip a no-JS link to `{{ product.url }}?variant=<first available variant of that colour>`.
6. **Option detection is heuristic.**
   - Model option: `:35-51`. Colour option: the first other option with 2+ values (`:56-62`).
   - Risk: a third option such as "Material" with 2+ values ahead of colour would become the carousel axis.
   - Fix: prefer an option whose name contains `colour|color|style|design`, then fall back to the current rule.
7. Clean: the phone list reads the product's real option values (`:253-255`) and starts unchosen unless `product.selected_variant` exists (`:74-77`), which matches Product Principle 2. No candy-as-product copy, no other brand, no em or en dashes, no hardcoded prices or currency (uses `money` and `shop.money_format`).

## Claims register

| Claim (shopper-facing) | Source | Status |
|---|---|---|
| "In stock for all [n] phone models" / "In stock for [ok] of [n] phone models" / "Sold out in this colour" / "Made for your [model] · in stock" | `variant.available` over real variants (`:210-232`, JS `:299-305`) | Backed by store data. Wording caveat: see finding 1. |
| Price, was price | `variant.price` / `variant.compare_at_price`, plus the buy box fallback (merchant setting; PRODUCT.md Evidence: fallback $59.99) | Backed |
| "[pct]% off" | Derived from the compare-at and the selected variant's price (`:84`, JS `:1114`) | Backed |
| "Pack of [qty] · [total] · [pct]% off" | Pack pct from the buy box tier blocks (`data-cv-discount`, `templates/product.json` tier-2 = 18, tier-3 = 31). These match the live automatic discounts (PRODUCT.md:39, checked 2026-09-15). | Backed |
| "[i] of [n]" colour count | `style_option.values.size` | Backed |

No ratings, reviews, guarantees, delivery times or performance claims.

## Motion inventory

- **cv-motion attributes (`data-cv-*`):** none. The section uses its own `data-cvcr-*` hooks only.
- **Section JS:** `assets/cv-pdp-carousel.js`.
  - **Entrance:** a gsap.context (`:1369-1400`).
    - The heading `[data-cvcr-split]` is split by SplitText into masked words that rise (`:1377`).
    - The lede and stage fade up; the chips and panel rows stagger in (`:1388-1398`).
  - **three.js ride** (`:106-912`):
    - The carousel builds on scroll-in (`ScrollTrigger` at `top 72%`, `:872-876`) and turns to each pick with an overshoot.
    - It leans with scroll velocity (`ScrollTrigger` `:816`) and follows pointer drag (custom code, no Draggable).
    - Bulbs flash on add (`ride.flash()`).
  - **Panel micro-motion:**
    - The name slides and the price rolls (a GSAP counter, `:1062`).
    - The ticket re-stamps (`:1046-1060`).
    - The select shakes when no model is chosen (`:1317`).
    - The add-button tick is drawn with DrawSVGPlugin (`:1269`).
- **GSAP plugins used:** ScrollTrigger, SplitText and DrawSVGPlugin. Optional checks: `window.ScrollTrigger`, `window.DrawSVGPlugin`.
- **Reduced motion:**
  - `reduceQuery` (`:32`). `motion = gsap && !reduced` (`:931-932`).
  - No three.js, no transforms. `scrollIntoView` falls back to `auto` (`:1341-1343`).
  - CSS `assets/cv-pdp-carousel.css:387-390`.
- **Ambient pause:** an IntersectionObserver pauses the ride off screen (`:797`). It also pauses on `visibilitychange` (`:803`) and from the visible pause button `[data-cvcr-pause]` (`:183-187`, labels "Pause the ride" / "Start the ride").
- **No-JS:** the static still of the selected colour (`:149-156`), the ticket, price and chips visible, the buy panel hidden, and a link back to the buy box (`:272`). The CSS hides that link once `.is-ready` is set (`assets/cv-pdp-carousel.css:380`).
- **Theme editor:** `shopify:section:load` re-inits (`:1447`). `shopify:section:unload` calls `_cvcrDestroy` (`:1448-1451`), which reverts the gsap.context, destroys the ride and runs the cleanups (`:1425-1434`). Complete.

## Motion opportunities

1. **HIGH: "Buy now" in the carousel panel.**
   - Add a secondary button next to `[data-cvcr-add]` (`:264-268`) with a setting `buy_label` (default "Buy now").
   - Render it only if `bb.querySelector('[data-cv-buy-now]')` exists at init, which respects the buy box `show_buy_now`.
   - On click:
     - Run the same model gate as Add (`:1311-1322`).
     - Then `choose(si, ...)` and `choose(mi, ...)` to sync the variant (as `:1326-1330` does; `choose()` is at `:1031`).
     - Then call `bb.querySelector('[data-cv-buy-now]').click()`, so `buyNow()` in `cv-product.js:634` adds the chosen pack and goes to checkout. Never post to `/checkout` from this file.
   - Motion: squash (scaleX 1.04 / scaleY 0.9, 0.12 s yoyo) and an arrow nudge loop while `.is-busy`, mirroring `cv-pdp-counter-motion.js:333-345`. Listen to `cvs:buying` on `bb` to set the carousel button busy.
   - Reduced motion: label change only ("To checkout…").
2. **HIGH: Fly-to-bag from where the shopper clicked.**
   - Today an add from the carousel fires `cvs:added`, and `cv-pdp-counter-motion.js:328-331` flies the token from the off-screen buy box button or `#cvStickyBtn`.
   - Two-file contract (needs a shared-file edit in `cv-pdp-counter-motion.js`):
     - The carousel sets `bb.dataset.cvAddFrom = 'cvcr'` before `requestSubmit()`.
     - counter-motion's `cvs:added` flies from `document.querySelector('[data-cvcr-add]')` when that flag is set, then clears it.
   - The token image should be the current colour still (`[data-cvcr-still]:not([hidden]) img`).
   - Until the shared edit lands, do NOT add a second token in the carousel. It would double up with counter-motion's token.
3. **MED: Pack picker inside the panel.**
   - Add 1 / 2 / 3 pack pills that dispatch `cvs:pack` `{qty}` on `bb` (handler `cv-product.js:536`). Read the pills and their pct from `bb.querySelectorAll('[data-cv-pack]')` and `data-cv-discount` at init. Never hardcode 18 or 31.
   - Animate the selected pill indicator with `Flip` (loaded on product templates). Roll the total with the existing roll helper (`:1062`). Re-stamp the pack line `[data-cvcr-pack]`.
   - Static state: the pills are plain buttons. Without JS the panel is hidden anyway.
4. **MED: Add-button states.**
   - Busy: a DrawSVG ring around the button.
   - Done: the existing tick (`:1269`) plus a teal background tween.
   - Error: the existing shake applied to the button, with `#cvStatus` text echoed in `[data-cvcr-status]` (already done).
   - Keep everything inside the existing gsap.context `ctx` so `_cvcrDestroy` reverts it.
5. **LOW: Cart drawer.** `cart.js` only refreshes on `cart:refresh` (`assets/cart.js:164-169`); it does not open the drawer. If the team wants the drawer to open after a carousel add, that is a `cart.js` decision (shared). Sequence it after the fly token lands (about 1.3 s).
6. **Do not use `data-cv-reveal`.** `assets/theme.css:1073-1079` sets `[data-cv-reveal]` to `opacity: 0` with no no-JS guard (`layout/theme.liquid` has no `no-js` class or noscript). The carousel's own GSAP entrance already covers scroll reveal.

## Risks

- The commerce single source of truth must stay the buy box. Keep `addDirect()` for the no-buy-box case only.
- `cv-pdp-counter-motion.js` listens to every `cvs:added`. Any carousel-side fly needs the shared contract above, or tokens double up.
- The file is large (57 KB). Wrap new GSAP in `ctx = gsap.context(...)` and register cleanups so `shopify:section:unload` stays clean.
- three.js comes from a third-party CDN. If jsdelivr fails, the static still remains (good). Do not make new features depend on three.js.
- Draggable is not loaded on product pages (`layout/theme.liquid:169-172` gates it on `data-cvtr`). Keep the custom drag code; do not add a Draggable dependency.
- `templates/product.json` is near its section limit (22 of 25) and shared. Change only the `carousel` key.
