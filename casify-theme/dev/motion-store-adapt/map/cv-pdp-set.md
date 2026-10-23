# cv-pdp-set ("Product: complete the set")

## Status

Live on both product templates:
- `templates/product.json`, key `set`, 4th in `order`.
- `templates/product.convert.json`, key `set`, 6th in `order`.

Content is dynamic: the first render is empty. `assets/cv-pdp-story.js:165-177` fetches this section from `routes.product_recommendations_url?section_id=…&intent=complementary`, falls back to `intent=related`, and swaps the filled markup in (`sections/cv-pdp-set.liquid:16-31`).

## Purpose

A row of real catalog products from Shopify recommendations. Complementary products (set in Search & Discovery) get the heading "Complete the set"; related products get "Add another case".
- One-tap "Add" posts `/cart/add.js` with quantity 1, but only when the exact variant is known: a single-variant product, or the variant matching the phone model from the buy box.
- Otherwise the card shows a "Choose your model" link to the product.

## Files (owned / shared)

Owned:
- `sections/cv-pdp-set.liquid`. Nothing else is set-only.

Shared:
- `assets/cv-pdp-story.css`: base `.cvp`, `.cvp__inner`, `.cvp__h2`, `.cvp__lede`. Used by 18 sections.
- `assets/cv-pdp-extras.css`: set rules at `:4`, `:23-77`, `:109-110` and `:113`. It also styles stars and reviews, and is tagged by cv-pdp-reviews, cv-pdp-showcase and cv-product-counter.
- `assets/cv-pdp-story.js`:
  - The set module `:89-188` (fetch, wire, add, `cvs:change` updates).
  - `showEachProductOnce()` `:190-235`, which hides products already shown higher on the page.
- `assets/cv-pdp-counter-motion.js`:
  - The fly-to-bag token on `cvp:setadded` `:375-380`.
  - The entrance `setIn()` `:389-403`.
- `assets/theme.css:1143-1144`: the `.cvp-set__choose` touch hit area.
- `assets/cart.js:164-176`: `cart:refresh` and `CasifyCart.refresh`.
- `sections/cv-product-counter.liquid:210-212`: `data-current-options` and `data-model-index`, which the set reads.

## Store adaptation findings

1. **MAJOR (Product Principle 2): one-tap add uses a phone model the shopper never chose.**
   - `cv-pdp-story.js:90-95` seeds `currentModel` from the buy box's `data-current-options`, which is `selected_or_first_available_variant` (`cv-product-counter.liquid:210`).
   - So on a plain `/products/x` URL the cards say "For your iPhone 11" (the first available model), and "Add" puts a case for that model in the bag (`:111-126`, `:131-157`).
   - Fix:
     - Owned Liquid: output `data-model-confirmed="{{ product.selected_variant != blank }}"` on `<section data-cvp-set>`.
     - Shared `cv-pdp-story.js`: start with `currentModel = null` unless confirmed. Set it only on a real choice, using the same signals the carousel uses: `change` on `select[data-cv-option-index=<mi>]` or a click on `button[data-cv-option-index=<mi>]` inside `[data-cv-pdp]` (`cv-pdp-carousel.js:1241-1251`), or `cvs:choose` from the fit list or carousel.
2. **The heading can render with no cards.**
   - Liquid sets `filled` when `recommendations.products_count > 0` (`:18-20`), then skips the current product and unavailable items (`:46`).
   - `showEachProductOnce()` (`cv-pdp-story.js:199-235`) can hide the rest. It hides empty showcase sections but not the set.
   - Fix: count eligible items in Liquid before adding `is-filled`. In the shared JS, hide `[data-cvp-set]` when every `[data-cvp-set-item]` is hidden.
3. **The card price ignores the live pack discount.**
   - The card shows the single price (`:55-57`). The live automatic discount is "18% / 31% off entire order, minimum quantity 2 / 3, all items" (PRODUCT.md:39), so adding a second case lowers the checkout price.
   - The page price is not wrong (checkout is lower, not higher), but the bundle value goes unsaid.
   - Fix (backed): when the bag or buy-box pack would reach 2, show "With your case: [pct]% off each at checkout". Read pct from the buy box `[data-cv-pack][data-cv-discount]` (`cv-product-counter.liquid:588`). Never hardcode 18 or 31.
4. **Hardcoded English strings:** "From " (`:55`), "Adding…" (`:27`), "Try again" (`:29`). Add schema settings with these as defaults. Low priority.
5. **No-JS:** the section stays hidden (`.cvp-set:not(.is-filled){display:none}`, `cv-pdp-extras.css:23`). Acceptable progressive enhancement. Note it in the comment.
6. **Clean:**
   - Real products, prices via `money`, and the compare-at uses the locale key `products.price_offer.compare_at` (present in `locales/en.default.json`).
   - No candy-as-product, no other brand, no dashes in shopper copy.

## Claims register

| Claim | Source | Status |
|---|---|---|
| Product titles, prices, "From" prices, compare-at prices | `recommendations.products` (store data) | Backed |
| "For your [model]" | The buy box current variant | **Unbacked until the shopper picks a model** (finding 1); backed after a real choice |
| Proposed "With your case: [pct]% off each at checkout" | Buy box tiers = live automatic discounts (PRODUCT.md:39) | Backed if read live (finding 3) |

## Motion inventory

- **cv-motion attributes (`data-cv-*`):** none.
- **Entrance** (`cv-pdp-counter-motion.js:389-403`):
  - Cards rise with a stagger (`back.out(1.7)`).
  - Thumbnails rotate in (`elastic.out`).
  - This runs once, after `cvp:set` (the fetch-and-fill event, `cv-pdp-story.js:175`) or immediately if the section is already filled. It is guarded by `data-cvc-motion`.
- **Add:** `cvp:setadded` makes the photo token arc to the header bag (`fly()`, `cv-pdp-counter-motion.js:275-321`, MotionPathPlugin with a fallback), and the bag icon bounces.
- **Button states:** CSS only (`cv-pdp-extras.css:56-69`): busy opacity, a teal done state, a hover lift.
- **GSAP plugins used:** ScrollTrigger and MotionPathPlugin (optional).
- **Reduced motion:** counter-motion exits (`:41`). CSS `cv-pdp-extras.css:113`.
- **Gate:** the motion runs only when the buy box is the Shop Counter (`[data-cv-pdp="counter"]`, `cv-pdp-counter-motion.js:37-41`). Both templates use `cv-product-counter`.
- **No-JS:** hidden (see finding 5).
- **Theme editor:** no `shopify:section:load` handling in `cv-pdp-story.js`. An editor re-render returns the empty shell and nothing refetches, so the section looks empty in the editor until a reload.

## Motion opportunities

1. **HIGH: Bundle moment ("make it a pair").**
   - After a real model choice, an "Add" on a case product morphs into a ticket "Added · [pct]% off each at checkout" (`Flip` between the button and the ticket states).
   - The buy box savings meter (counter motion) nudges.
   - Read pct from the buy box tiers, and only claim it when the bag will hold 2 or more items. Fetch `/cart.js` after the add to confirm `item_count`.
   - Reduced motion: text swap only.
2. **HIGH: Model gate micro-interaction.**
   - Replace the dead-end "Choose your model" link (for products in the same model family) with a button that scrolls to the buy box model picker. Use `ScrollToPlugin`, loaded on product pages; under reduced motion, `scrollIntoView({behavior:'auto'})`.
   - Then focus the picker and pulse it (counter-motion already pulses the model picker on change).
   - Keep the link as the no-JS state.
3. **MED: Button states.**
   - Busy: a DrawSVG ring.
   - Done: a DrawSVG tick plus the teal fill.
   - Error: a short shake (`keyframes x`) with "Try again".
   - Wrap these in the counter-motion pattern (events `cvp:setadded` plus a new `cvp:setfailed`).
4. **MED: Cart drawer handoff.** `cart.js` only refreshes. If the team opts in, open the drawer after the fly token lands. That is a `cart.js` change (shared).
5. **LOW: Card hover.** Thumbnail wobble with `CustomWiggle` "cvwWiggle" on hover-capable screens (the pattern from `cv-pdp-home-motion.js:394-412`, shelf).
6. **Do not use `data-cv-reveal`.** It hides content without JS (`assets/theme.css:1073`).

## Risks

- All behaviour lives in shared `cv-pdp-story.js` and all motion in shared `cv-pdp-counter-motion.js`. The set's only owned file is the Liquid. Most fixes need coordinated shared edits.
- The set fetch replaces `innerHTML`. Re-run `wire()` and `setIn()` after any swap, and never bind listeners to nodes from the first render.
- Adding to the cart outside the buy box means the pack tier is computed by Shopify's automatic discount at checkout, not by the buy box. Any pct text must say "at checkout".
- `showEachProductOnce()` reads several sections. Changes to its selectors affect cv-pdp-showcase and cv-pdp-row.
