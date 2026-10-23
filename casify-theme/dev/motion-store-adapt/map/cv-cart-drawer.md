# cv-cart-drawer ("Cart drawer")

Family: cart-search-coll. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
Severity: H / M / L as in the other maps.

## Status

**dynamic**: placed in no template. `assets/cart.js` fetches `{root}?sections=cv-cart-drawer`
(cart.js:149-161) and swaps `#cm-cart-drawer` innerHTML after AJAX adds, `cart:refresh` (:169) and
`cv:cart` (:171-174). The drawer itself is rendered on every page by `layout/theme.liquid:206`
(`{% render 'cart-drawer' %}`), outside `<main>`.

## Purpose

A 14-line Section Rendering wrapper (`sections/cv-cart-drawer.liquid:7`) around
`snippets/cart-drawer.liquid`: scrim, `<aside id="cm-cart-drawer" role="dialog" aria-modal="true">` with
a striped head "Your bag", line items (photo, title, variant, line price, qty stepper) and a footer
(Subtotal, Checkout, View bag). Open/close, focus trap and scroll lock are in cart.js:59-84.

## Files (owned / shared)

Owned:
- `sections/cv-cart-drawer.liquid`
- `snippets/cart-drawer.liquid`: rendered only by this section and by layout/theme.liquid:206 (both are
  this same drawer). No other section or snippet renders it. A drawer lane may edit it; never edit the
  layout line.

Shared (coordinate):
- `assets/cart.js` (open/close, refresh, qty/remove, AJAX add; global, layout/theme.liquid:342).
- Drawer CSS is split three ways: `sections/header.liquid:196-207` (panel slide `transform` 240 ms
  `--ease-out-soft`, scrim, head stripes, body, footer; header lane), `assets/theme.css:2694-2711`
  (scrim z-index 80, close button, `.cart-drawer-item` grid 64px/1fr/auto; global), and an inline
  `<style>` in the snippet (:53-63, `.cart-drawer-item` grid 60px/1fr, stepper). Two definitions of
  `.cart-drawer-item` and two scrim z-indexes (80 vs 94) compete; the snippet's inline block wins by
  order for the item grid.
- `assets/cv-header.js:234-248` (badge elastic bounce + bag icon wiggle via MutationObserver).
- `assets/theme.css` `.cm-stepper`, `.btn`, reduced motion :3306-3312.

## Store adaptation findings

1. **H, savings hidden before checkout.** Footer labels `cart.total_price` as "Subtotal" (:41-42) and
   shows no discount rows, so a 2- or 3-case pack (18% / 31%, PRODUCT.md:39) looks full price in the
   drawer. Fix: print `cart.items_subtotal_price` as Subtotal, each
   `cart.cart_level_discount_applications` row (`d.title`, `-{{ d.total_allocated_amount | money }}`),
   then "Total" `cart.total_price`. All LIVE.
2. **M, no pack nudge.** Add one line driven by `cart.item_count`: 1 item "Add 1 more case: 18% off
   both", 2 items "Add 1 more for 31% off". The drawer has no section settings (it is rendered by the
   layout too), so the percentages need a home: theme settings (`config/settings_schema.json`, shared) or
   locale strings with the numbers (locales shared). Do not hard-code 18/31 in Liquid without a setting.
3. **M, model fit not explicit.** `item.variant.title` raw (:25). Same fix as cv-cart finding 4: print
   the phone model option first with a "Phone:" label from `item.options_with_values`.
4. **M, empty state is a dead end.** "Your bag is empty." (:13, inline style) with no link. Add a link to
   `routes.all_products_collection_url` ("Find a case for your phone") and keep it in the label font.
5. **M, no remove control.** Only the stepper (:29-33); reaching 0 needs repeated taps. Add
   `<button data-cart-remove="{{ item.key }}" aria-label="Remove {{ item.product.title | escape }}">`.
6. **M, hard-coded English:** "Your bag" (:5; `general.cart.title` exists, locales/en.default.json:4),
   "Close cart" (:6), "Subtotal" (:41), "Checkout" (:46), "View bag" (:48), "Your bag is empty." (:13),
   aria-labels (:30-32).
7. **M, closed drawer stays in the tab order.** Closed state is only `transform: translateX(100%)`
   (header.liquid:196) with `aria-hidden="true"`; its links, steppers and Checkout stay focusable while
   hidden. Fix: toggle `inert` on open/close (cart.js, shared) or add `visibility:hidden` with a delayed
   transition in the drawer CSS. Coordinate with the header/cart.js owner.
8. **L, qty change reloads the page** (cart.js:118-124), which closes the drawer mid-edit. See motion 2.
9. **L, inline styles** (:13, :25, :27, :29-32, :40-42) block theming; move to a drawer stylesheet.

No candy-as-product, no other brand, no invented numbers; all money is live.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Line prices, Subtotal value | :27, :42 | LIVE (but mislabelled, finding 1) |
| (none other) | | No trust, shipping or review claims today. If a trust line is added, use only PRODUCT.md:34 facts (free shipping, 30-day returns, ships in 1-3 business days) |

## Motion inventory

- Panel: CSS `transform` slide 240 ms + shadow (header.liquid:196-198); scrim opacity 240 ms (:199-200).
  Reduced motion: global collapse (theme.css:3306-3312).
- Items: none. `refreshDrawer()` replaces innerHTML with no entrance (cart.js:158).
- Badge: GSAP elastic bounce and bag-icon wiggle on count change (cv-header.js:234-248, only when header
  motion is on); CSS `.is-bump` fallback (cart.js:138-140, theme.css:270).
- No data-cv-* attributes (correct: cv-motion.js runs once and would leave injected markup at opacity 0,
  MOTION-SYSTEM.md 3.4.2).
- No section JS, no GSAP, no editor events (not needed: never placed in the editor).
- No-JS: `#bagBtn` is a real link to `/cart` (header.liquid:87), so the drawer simply never opens. Fine.

## Motion opportunities

Constraint: the drawer is outside `<main>`, so `content_for_layout contains` gates never see it
(MOTION-SYSTEM.md 1.2 rule 1). A drawer motion file must be loaded always: new owned file
`assets/cv-cart-motion.js` added once to the always-loaded block AFTER cart.js (layout/theme.liquid:342;
a layout edit, so one coordinated change). It only listens; cart.js keeps the commerce.

1. **HIGH: drawer open choreography.** Observe `#cm-cart-drawer` `class` (MutationObserver, like
   cv-header.js:239) for `is-open`. Keep the CSS slide on the aside (no transform fight,
   MOTION-SYSTEM.md 7.1) and animate only children: head stripes slide x -36 to 0 (one stripe period),
   items rise y 12 + fade with 0.05 s stagger (`power3.out`, 0.35 s), footer total settles last.
   Reduced motion: nothing; content is visible by default.
2. **HIGH: new line highlight after refresh.** Before `refreshDrawer` swaps, record `data-key`s; after
   (observe `#cm-cart-drawer` childList), the new or changed key gets a ticket-gold flash and its photo
   drops in with `bounce.out` (the pack-meter idiom, cv-pages.js:92-101). Needs cart.js to return the
   promise or dispatch `cart:drawer:refreshed` (small shared change).
3. **HIGH: fly to bag (global).** Listen to `cart:added` (dispatched by four files, heard by none,
   MOTION-SYSTEM.md 5.2) and `cv:cart`; with `detail.from` / `detail.img`, fly a photo ticket to `#bagBtn`
   (straight tween; MotionPathPlugin only exists on product and shop pages), then let cv-header.js bounce
   the badge (do not add a second badge bump, MOTION-SYSTEM.md 7.6).
4. **MED: in-place qty/remove in the drawer.** Replace the reload (cart.js:123, shared) with
   `/cart/change.js` + `refreshDrawer()`; removed line collapses height 0.3 s; total rolls with
   `window.themeMoneyFormat`. Keep the drawer open and focus on the same stepper.
5. **MED: pack line stamp** when the count crosses 2 or 3 (finding 2), `back.out(2)` 0.42 s.
6. **LOW: Checkout press** squash 0.12 s; never delay submit.

## Risks

- Every drawer change needs cart.js or header.liquid (shared). Keep the owned surface to
  `snippets/cart-drawer.liquid` + a new `assets/cv-cart-motion.js` + one layout `<script>` line.
- Section Rendering returns `#shopify-section-cv-cart-drawer` wrapping the scrim and aside; cart.js takes
  only the aside's innerHTML (cart.js:157-158). Any new markup must live INSIDE the aside, and any inline
  `<style>`/`<script>` outside it is not re-applied on refresh.
- Do not put `data-cv-reveal` or `data-cv-split` inside the drawer (injected markup stays invisible).
- Two `.cart-drawer-item` definitions (theme.css:2711 vs snippet :54) and two scrim z-indexes
  (theme.css:2694 z 80 vs header.liquid:199 z 94): consolidate before adding motion that measures rows.
