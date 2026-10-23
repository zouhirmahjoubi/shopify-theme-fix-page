# main-best-product ("Best product page")

Family: buybox-alt. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**live**: the only section in `templates/product.best.json:4` (alternate product template, assigned per
product in Shopify admin). Whether any product is assigned to `product.best` is store data and was not
checked (no connector in this phase). Not in any section group.

## Purpose

A self-contained product page for one case: gallery with thumbs, buy box (model grid, style swatches,
qty stepper, Add to cart, Buy now), service row, then a long story column (Why you'll love it, fit
callouts, magnetic power with a three.js ring canvas, mini cards, all colours rail, Casify vs others,
FAQ, end cap). Variant resolution and Buy now live in `assets/best-product.js`; Add to cart uses the
global `form[data-cart-add-form]` handler in `assets/cart.js:87-109`.

## Files (owned / shared)

Owned (only this section references them; safe to edit in a parallel lane):
- `sections/main-best-product.liquid`
- `assets/best-product.css` (loaded at :1)
- `assets/best-product.js` (module, loaded at :234)
- `assets/best-case-in-hand.png`, `assets/best-case-detail.png`, `assets/best-case-magnetic.png` (+ their `.json` sidecars; AI images, see sidecar `"use"`: "replace with verified product photography")
- `templates/product.best.json` (contains only this section)

Shared (do not edit from this lane):
- `snippets/icon.liquid` (also header.liquid, footer.liquid)
- `assets/cart.js` (Add to cart submit, drawer, toasts: cart.js:87-109)
- `layout/theme.liquid` + `snippets/gsap.liquid` (GSAP core + ScrollTrigger always; Flip/MotionPath on product templates, layout/theme.liquid:173-177)
- `assets/theme.css` (tokens only)

External runtime imports (should not exist per MOTION-SYSTEM.md 1.6): `motion@13.4.4/mini` from jsdelivr (best-product.js:6-10, import at :7) and `three@0.186.0` from jsdelivr (best-product.js:201).

## Store adaptation findings

Severity: H = ships wrong/unbacked content to shoppers on the live template, M = wrong domain or broken binding, L = polish.

1. **H, hero is an AI illustration, not the product.** `hero_src` defaults to `best-case-in-hand.png` (:35-36); detail and magnetic images likewise (:40-47). PRODUCT.md "Capabilities": "product photography stays real". The real product photos only appear as thumbs after three illustrations (:69-76). Fix: default the stage to `current_variant.featured_media | default: product.featured_media` (image_url width 1200, with `image_tag` widths/sizes), list `product.media` thumbs first, and show the three illustrative images only when the merchant sets `hero_image`/`detail_image`/`magnetic_image`. Alt text: `hero_alt` says "styled product illustration" (:35); use media alt or product title.
2. **H, "BEST SELLER" seal on every product** (:59). No sales evidence. Fix: remove, or render only from a product tag/metafield (for example `product.tags contains 'best-seller'`) chosen by the merchant.
3. **H, decorative five stars with no rating** (`best-proof` :165, "★★★★★ Made for your everyday"). Implies a rating. Fix: delete the stars, keep the "Casify" pill, or show the real `reviews.rating` block from :85-87 only.
4. **H, product-specific feature claims hard-coded for every product**: gallery note "Soft Touch Tech Fabric" (:58), facts "Magnetic accessory ready / Raised camera edge / Woven texture" (:61-63), fit callouts "Raised camera edge / Responsive buttons / Soft-touch finish" (:191), "Magnetic Power ... Compatible with magnetic accessories" + "MagSafe charger, Magnetic wallet, Car mount, Power bank" (:195-196), "Drop Protection / Built to handle everyday bumps" and "Premium Material / High-quality woven fabric" (:200-201), compare list "Casify Tech Fabric ... Woven texture, Magnetic accessory design, Raised camera edge" (:224), alt texts naming woven fabric and magnetic charger (:70-71, :183-185, :191, :196, :200-201, :224, :229). The catalogue has clear, magnetic, airbag and other case types (STORE-FACTS.md featured handles), so these are false for most products. Fix: drive each story card from product data: `product.metafields.shopify['magsafe-compatibility']`, `['case-type']`, `material`, `['mobile-phone-case-features']` (the same metafields main-halo-product.liquid:357-366 already reads) and hide a card when its metafield is blank; or move the copy into schema settings/blocks with empty defaults.
5. **H, schema defaults ship unbacked claims** and `product.best.json` stores them as live values: `intro` "Premium woven texture. Strong magnetic connection. Everyday protection for your iPhone." (:248, product.best.json:7), `benefit_one_copy` "Works perfectly with MagSafe chargers and accessories." (:250), benefit two/three (:251-254). Fix: empty defaults or neutral copy ("Choose your exact phone, then your style."), and blank the template values in a later phase with merchant confirmation.
6. **M, iPhone-only copy** ignores Samsung: "Made for your iPhone" (:190), "Ready to Upgrade Your iPhone?" (:229), FAQ "Will it protect my iPhone" (:228), intro default (:248). Fix: "Made for your phone" or print the selected model via `data-best-model-label`.
7. **M, en dashes in shopper copy**: "Ships in 1–3 business days" (:162), "Orders dispatch in 1–3 business days" (:228). Fix: "1 to 3 business days".
8. **M, rating stars always five full**: `★★★★★` with `aria-label="{{ rating.rating }} out of ..."` (:86) shows 5 stars for a 3.9. Fix: width-clipped star bar from `rating.rating / rating.scale_max` (same pattern as the counter template's rating, if shared snippet exists, else inline). The binding itself (`product.metafields.reviews.rating`, `rating_count`) is correct and LIVE (:5-6).
9. **M, money format ignores the shop.** `bestMoney()` uses `Intl.NumberFormat` with `shop.currency` (best-product.js:12-21, section :50); Liquid uses `| money` (shop format). Switch to `window.themeMoneyFormat` (layout/theme.liquid:155) or `data-money-format="{{ shop.money_format | escape }}"` like cv-product.liquid:103, so the JS price matches the Liquid price.
10. **M, Buy now goes to `/checkout` hard-coded** (best-product.js:170) and builds the add URL by regex (:163). Use `window.Shopify.routes.root + 'checkout'` like cv-product.js:646. Buy now has no no-JS path (type="button", :156); acceptable only because Add to cart posts natively.
11. **M, no pack tiers.** PRODUCT.md "Capabilities": multi-case packs backed by the live 18% / 31% automatic discounts. This buy box has a free qty stepper only (:149-153), so quantity 2 gets the 18% discount at checkout but the page shows the undiscounted price (the `data-best-buy-price` on Buy now multiplies price by qty, best-product.js:92). Fix: either show the pack meter (reuse `snippets/cv-pack-slots.liquid` is shared, so call it, do not edit it) or compute the displayed total with the same tier percentages as cv-product (merchant setting, default 18/31).
12. **L, model grid shows first 6 then "Show all N models"** (:105, :111): correct (driven by the real option). Model detection is by option name or value (:9-34): correct. Sold-out values are not marked per model (no `data-stock`), so a shopper can pick an unavailable combination and only learn on the button. Fix: mark unavailable values like cv-product.liquid:184-201.
13. **L, "Secure checkout" service item** (:163) is generic Shopify fact, fine. "Free shipping" (:160), "30-day returns" (:161) are backed.
14. **L, section name** "Best product page" fine; schema paragraph (:245) already warns the merchant.

## Claims register

| Claim (shopper-facing) | Where | Status |
|---|---|---|
| Rating `rating.rating` and "(N reviews)" | :85-87 | LIVE (reviews metafields), shown only when count > 0 |
| ★★★★★ beside "Made for your everyday" | :165 | UNBACKED (implied rating) |
| "BEST SELLER" seal | :59 | UNBACKED |
| Free shipping | :160, :229 | BACKED (PRODUCT.md:34 service facts) |
| 30-day returns | :161, :224, :228-229 | BACKED |
| Ships in 1–3 business days (en dash) | :162, :228 | BACKED fact, copy needs dash fix |
| Secure checkout | :163 | Generic platform fact, acceptable |
| Price, compare-at, Save amount | :88-92 | LIVE (variant) |
| Soft Touch Tech Fabric / Woven texture / Premium woven texture / high-quality woven fabric | :58, :63, :201, :224, :248, :252 | UNBACKED store-wide (product-specific only) |
| Magnetic accessory ready / Works perfectly with MagSafe / Strong magnetic connection / accessory list | :61, :195-196, :248, :250 | UNBACKED store-wide |
| Raised camera edge / Raised edges keep your screen and camera safe | :62, :191, :254 | UNBACKED store-wide |
| Drop Protection, built to handle everyday bumps | :200 | UNBACKED store-wide (soft, but a protection claim) |
| Responsive buttons / Soft-touch finish | :191 | UNBACKED store-wide |
| FAQ: "No case can prevent every type of damage" | :228 | Honest disclaimer, fine |

## Motion inventory

- cv-motion attributes: none (`grep -c data-cv-` = 0).
- Section JS: `best-product.js`
  - Gallery swap: Motion (CDN mini) `animate` opacity .72 to 1 + scale 1.018 to 1, 320 ms (:61).
  - GSAP: stage image scale 1.045 to 1 on load (:182); `.best-story, .best-detail-grid, .best-bottom-grid` from y 22 / opacity .75, ScrollTrigger `top 92%`, once (:183-187). Start opacity .75, so content is never hidden.
  - three.js magnet rings on `[data-best-magnet-canvas]` (:191-247, import at :201): lazy IO import, own rAF loop, pauses when offscreen via IO (:229-230), additive cyan glow `0x7be4f5` (:210). No `visibilitychange` pause (rAF throttles anyway). Cyan additive glow is a DESIGN.md Don't ("neon glows").
- GSAP plugins: ScrollTrigger only. No Flip/MotionPath use although both are loaded on product templates.
- Reduced motion: JS checks once (`prefersReducedMotion`, :3) and skips Motion, GSAP and three.js; CSS kills transitions/animations under reduce (best-product.css:142). Does not react to a live preference change.
- No-JS: full content and native Add to cart work (form posts to `/cart/add`). Buy now, model "Show all", gallery arrows, quantity buttons do nothing without JS. Extra models (`best-model--extra`) are `display:none` (best-product.css:52) until "Show all" adds `.is-expanded` (:53); check that no-JS users can still reach every model (they cannot: fix with a `.no-js` or `<details>` fallback, or show all when JS is absent).
- Theme editor: `shopify:section:load` re-inits (:250). No `shopify:section:unload`: ScrollTriggers and the three.js renderer leak on re-render. Init guarded by WeakSet (:2).
- Add to cart feedback: cart.js only (button text "Wrapping…", toast, drawer opens). No `cart:added` dispatch, no fly.

## Motion opportunities

High value first. All new code in `best-product.js` / `best-product.css` (owned). Wrap in `gsap.context(fn, root)`, revert on `shopify:section:unload`, use `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` so a live preference change reverts cleanly. Timing set 160/240/420 ms, `--ease-out-soft` for entrances, candy spring (`back.out(2.6)` / CustomBounce as cv-pdp-slip-motion.js:38-42) only for small delight.

1. **(High) Add to cart fly to bag.** Intercept nothing; listen for the submit on `.best-form` in capture phase only to snapshot the button rect and the current main image, then after cart.js succeeds (listen to a `cart:added` event; cart.js does not dispatch one for card forms today, so either dispatch it here after observing the drawer `is-open` mutation, or move Add to cart into best-product.js with its own `/cart/add.js` call that dispatches `cart:refresh` + `cart:added` like cv-product.js:619-622). Fly a clone of the selected case photo to `#bagBtn` with MotionPathPlugin (guard `window.MotionPathPlugin`, straight tween fallback as cv-pdp-slip-motion.js:131-139), bag icon bounce 1.35. Reduced motion: no fly, the live region / toast carries the state.
2. **(High) Buy now press + progress.** Squash (`scaleX 1.04, scaleY .9`, 120 ms yoyo) on press, then an arrow nudge loop while busy, cleared on error; label swap stays the source of truth. Pattern exists in cv-pdp-counter-motion.js:333-348 (shared, read-only reference).
3. **(High) Pack meter / bundle choreography** once finding 11 adds tiers: pack radio change re-stamps the chosen tier (scale 1.5 to 1, rotation -20 to -8, candy spring), the total rewrites with a clip-path wipe (cv-pdp-slip-motion.js:85-89 idiom), savings count via a GSAP tween on the real computed value only.
4. **(High) Variant change feedback.** On model/style change: crossfade the stage image with GSAP (replace the CDN Motion import entirely; drop best-product.js:4-10), hop the chosen pill (y -4 yoyo, 140 ms), price wipe on `[data-best-price]` and `[data-best-buy-price]`. Use Flip for the "Show all N models" expand (`Flip.getState` on the grid, toggle class, `Flip.from` 0.42 s) since Flip is loaded on product templates.
5. **(Medium) Scroll story.** Keep the existing reveal but make it a choreographed batch: `ScrollTrigger.batch('.best-love-card', { once: true })` stagger 0.06, fit callouts pop in sequence when `.best-feature-photo` enters (scale .9 to 1, 240 ms each), colour rail slides in with `data-cv-stagger` children. Do not use `data-cv-reveal` on the buy column (MOTION-SYSTEM.md 3.4: hides content without JS).
6. **(Medium) Sticky buy bar.** There is none. Add a sticky Add to cart bar shown by ScrollTrigger when `.best-form__actions` leaves the viewport (pattern: cv-product.liquid:301-307 + cv-pdp-slip.css:282-318), slide 240 ms, `transition: none` under reduce.
7. **(Low) Replace the cyan three.js glow** with a brass/gold palette or a CSS-only ring pulse that pauses offscreen; keeps DESIGN.md palette and drops a 600 KB CDN import.

## Risks

- Live template: every edit here is visible on any product assigned to `product.best`. Confirm the assignment list before changing copy.
- Removing claims from `templates/product.best.json` values changes merchant content: needs merchant confirmation (STORE-FACTS.md "do not silently delete merchant content").
- If Add to cart moves into best-product.js, keep `data-cart-add-form` off the form or stop propagation, otherwise cart.js double-posts (main-halo-product.liquid:561-571 documents the same trap).
- CDN imports (jsdelivr) fail behind strict CSP or offline previews; the catch handlers swallow it, so motion silently disappears.
- `cart.js` and `snippets/cv-pack-slots.liquid` are shared: reuse, do not edit, from this lane.
