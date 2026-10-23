# cv-cart ("Cart", the bag page)

Family: cart-search-coll. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
Severity: H = ships wrong/blocked to shoppers, M = should fix in this pass, L = polish.

## Status

**live**: `templates/cart.json` (section id `main`, the only section, settings :5-15, four `trust`
blocks :17-22). Not in any section group.

## Purpose

The full bag page: heading, line items as cards (photo, title, variant, qty stepper, remove, money),
an optional free-shipping meter, and a summary rail (subtotal, cart-level discounts, shipping line,
total, order note, Secure checkout, Continue shopping, trust list from blocks). Empty state links to
`routes.all_products_collection_url`. No JS of its own: steppers and remove use the global hooks in
`assets/cart.js` (`[data-qty-decrease]`/`[data-qty-increase]` :46-57, `[data-cart-line-qty]` :115-117,
`[data-cart-remove]` :111-114), and every change does `window.location.reload()` (cart.js:123).

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-cart.liquid`
- `templates/cart.json` (its single instance; only cv-cart lives there)
- CSS rules `.cv-cart`, `.cv-ship*`, `.cv-lines`, `.cv-line*`, `.cv-qty`, `.cv-sum*` in `assets/theme.css`
  (:2212, :2425-2513). They sit in the GLOBAL stylesheet, so editing them means editing a shared file.
  Recommended: new owned file `assets/cv-cart.css` loaded by the section (`stylesheet_tag`), and move or
  override there instead of touching theme.css.

Shared (do not edit from this lane; coordinate):
- `assets/cart.js` (global; drawer, AJAX add, qty/remove with reload, badge). Loaded always, layout/theme.liquid:342.
- `assets/cv-motion.js` (reveal/split/stagger/pct engine, every page, layout/theme.liquid:220).
- `assets/theme.css` (`[data-cv-reveal]` :1073-1084, `.cv-cta` magnet :1363-1390, `.cv-empty`, `.cv-trust`, `.cv-acc`, `.cv-eyebrow`, reduced-motion :3220-3270 and :3306-3314).
- `snippets/cv-icon.liquid` (global icon library; `animate: true` adds infinite CSS keyframes theme.css:992-997).
- `layout/theme.liquid` (note: `cart` is NOT a `shop_page`, :166, so Flip and MotionPathPlugin are NOT loaded on /cart, :173-177; only gsap core, CustomEase/Bounce/Wiggle, DrawSVG, ScrollTrigger, ScrollToPlugin, SplitText).

## Store adaptation findings

1. **H, checkout invisible without JS.** The summary rail including the checkout button is
   `data-cv-reveal` (:123), every line is `data-cv-reveal` (:70), the header (:24) and empty state (:36)
   too. `[data-cv-reveal]` is `opacity:0` in plain CSS (theme.css:1073-1074). With JS off or cv-motion.js
   failing, the bag shows nothing actionable. Fix (owned): remove `data-cv-reveal` from `.cv-sum` and
   `.cv-line` and animate them from a section script that sets the hidden state itself (house
   `*-pending` pattern, MOTION-SYSTEM.md 4.3), or wait for the layout-level `.js` scoping fix
   (MOTION-SYSTEM.md 10.1). Commerce content must render visible by default.
2. **H, theme editor blank.** cv-motion.js never handles `shopify:section:load` (MOTION-SYSTEM.md 3.4.2),
   so after any setting change in the editor the re-rendered cart stays `opacity:0`. Same fix as 1.
3. **M, shipping line contradicts the trust list.** Summary prints "Calculated at checkout" whenever
   `free_ship_threshold` is 0 (:140), while the live trust block says "Free shipping"
   (templates/cart.json:19) and PRODUCT.md:34 confirms free shipping on all orders with no threshold.
   Fix: add a checkbox setting `free_shipping_all` (label "Shipping is free on every order", default
   false in schema, true in templates/cart.json only after the merchant confirms checkout really charges
   $0, STORE-FACTS.md 9.9) and print "Free" when on; keep "Calculated at checkout" otherwise.
4. **M, phone model not called out on the line.** `item.variant.title` prints the raw "Style / Model"
   string (:84). Principle 2 (PRODUCT.md:110) puts model fit first. Fix: loop `item.options_with_values`,
   detect the model option by name (`model|phone|device|compatib|applicable`, STORE-FACTS.md 4 rule 1),
   print "Phone: {{ value | escape }}" first and the style/colour second; display the merchant's raw
   value. Also replace `unless item.variant.title contains 'Default'` (:83) with
   `unless item.product.has_only_default_variant` (the drawer already does, snippets/cart-drawer.liquid:24).
5. **M, no pack nudge on the bag page.** PRODUCT.md:39 says packs of 2/3 earn 18%/31% from automatic
   discounts; the collection page shows a pack meter (snippets/cv-pack-meter.liquid) but the bag page,
   where the decision is made, does not. Fix: add settings `pack_2_pct` (18) / `pack_3_pct` (31) with the
   same "Must match the automatic discount" info as sections/cv-collection.liquid:272-273 and print a
   line driven by `cart.item_count` ("Add 1 more case and 18% comes off both"). Applied savings already
   show truthfully from `cart.cart_level_discount_applications` (:130-137). Do not render
   cv-pack-meter.liquid from here without the cv-collection lane (it is owned there).
6. **M, hard-coded English, not settings or locales:** "Subtotal" (:127), "Shipping" (:139), "Free" /
   "Calculated at checkout" (:140), "Total" (:144), "Taxes and any duties are calculated at checkout."
   (:147), "Continue shopping" (:168), "Remove" (:104), "ea" (:115), "You're ... from free shipping" (:53),
   "Free shipping unlocked. Nice." (:56), placeholder "Gift message, delivery instructions…" (:156),
   aria-labels (:95, :100, :101). `general.cart.title` exists (locales/en.default.json:4) for "Your bag".
   Add `cart.*` locale keys (locales are shared: coordinate one locale edit for the family).
7. **L, remove button names no product.** `<span>Remove</span>` (:104): add
   `aria-label="Remove {{ item.product.title | escape }}"`.
8. **L, no live region.** Totals change by full reload today; when in-place updates land, wrap
   `.cv-sum__total b` in `aria-live="polite"` and only write the final value.
9. **L, file header says "Chrismass design system" with an em dash** (:2): comment only, not
   shopper-facing; fix when editing.

No candy-as-product, no other brand, no placeholder names, no hard-coded prices (all `| money` on live
cart data). Minus sign at :134 is U+2212, not a dash.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Encrypted, secure checkout" | templates/cart.json:18 (preset :226) | BACKED (Shopify checkout platform fact, STORE-FACTS.md 7c); keep without "100%" |
| "Free shipping" | templates/cart.json:19 | BACKED PRODUCT.md:34 |
| "30-day returns" | templates/cart.json:20 (preset :227) | BACKED PRODUCT.md:34 |
| "Ships in 1-3 business days" | templates/cart.json:21 (preset :228) | BACKED PRODUCT.md:34 (hyphen, no en dash) |
| "Secure checkout" button label | :164, :196, cart.json:9 | BACKED (platform) |
| "Free shipping unlocked" / "$X from free shipping" | :53, :56 | Renders only with threshold > 0; a threshold contradicts PRODUCT.md:34 and :104 ("free shipping over $40 or $45" unverified). Keep threshold 0 |
| Discount rows, prices, totals | :110-116, :128-145 | LIVE |
| Trust block "Warranty" icon option | :214 | Option only; any warranty text typed into it would be UNBACKED (no warranty in Evidence) |

## Motion inventory

- Attributes (cv-motion.js): `.cv-page-root` progress bar (:23; hidden when the header owns progress,
  cv-header.js:256); `data-cv-reveal` (:24, :36, :49, :70, :123); `data-cv-split` on h1 (:26, plain
  text, safe); `data-cv-stagger` on `.cv-lines` (:68, but each line already sets `--cv-i` inline :70);
  `data-cv-pct` meter fill (:60, CSS `transition: width 1s` theme.css:2434-2437); `.cv-cta` magnet
  (:39, :161); `cv-icon animate: true` bag (:37, infinite CSS keyframes, stopped only by reduced motion).
- Section JS: none. GSAP: none. Plugins: none.
- Reduced motion: cv-motion.js reveals at once (cv-motion.js:158-169); theme.css:3306-3312 collapses all
  transitions/animations.
- No-JS: broken (finding 1).
- Editor events: none (finding 2).
- Commerce motion: qty/remove reload the page (cart.js:123), so there is no line-change animation; the
  header badge bounce (cv-header.js:234-248) never fires because the page reloads.

## Motion opportunities

House idiom: cv-motion attributes for simple reveals of NON-commerce content; GSAP for choreography in
a new owned file `assets/cv-cart-motion-page.js` (name it apart from a future global
`cv-cart-motion.js`), printed by the section itself (`<script src=... defer>`), since /cart is not a shop
page and the layout gate list should not grow for one template. Boot on DOMContentLoaded and on
`shopify:section:load` / clean up on `shopify:section:unload`. Use `gsap.matchMedia()` with
`(prefers-reduced-motion: no-preference)`.

1. **HIGH: in-place quantity and remove (needs one shared change).** Today cart.js reloads. Proposal:
   section script intercepts `[data-cart-line-qty]` change / `[data-cart-remove]` click inside `.cv-cart`
   in the capture phase (stopImmediatePropagation so cart.js does not reload), POSTs `/cart/change.js`,
   then fetches `?section_id={{ section.id }}` (print `data-section-id` on the root) and swaps
   `.cv-lines` and `.cv-sum`. Motion: removed line collapses (height to 0 + opacity, 0.32 s
   `power2.in`), siblings slide up (manual FLIP with getBoundingClientRect since Flip is not loaded on
   /cart), changed line flashes a ticket-gold background 0.42 s. Then dispatch `cart:refresh` so the badge
   and drawer update. Reduced motion: swap instantly. No-JS: the form still posts (inputs need
   `name="updates[]"` for a real no-JS path: today the inputs have no `name`, so without JS the
   quantity field cannot update; add `name="updates[]"` and an `update` submit button inside `<noscript>`).
2. **HIGH: total roll.** On swap, tween a numeric proxy from the old `cart.total_price` to the new one
   over 0.42 s and write `window.themeMoneyFormat` (layout/theme.liquid:155) formatted text; aria-live
   gets only the final value. Values come from `/cart.js` (LIVE).
3. **HIGH: pack line stamp.** When `item_count` crosses 2 or 3 (finding 5), the pack line stamps in
   (scale 1.3 to 1, rotation -6 to 0, `back.out(2)`, 0.42 s) and a discount row appearing from Shopify's
   own `cart_level_discount_applications` slides in teal. Only real discount rows animate.
4. **MED: checkout press.** 0.12 s squash (scaleX 1.04 / scaleY 0.9 yoyo, MOTION-SYSTEM.md 2) and the
   lock icon shackle closing with DrawSVG. Never delay the form submit; animation runs during navigation.
5. **MED: line entrance.** Replace `data-cv-reveal` on lines/summary with a GSAP deal: lines rise
   12 px and fade with 0.05 s stagger, summary settles from x 16 with `power3.out`; hidden state set by JS
   only (fixes finding 1).
6. **LOW: empty state.** The bag icon swings on its handle once (CustomWiggle, house pattern) instead of
   the infinite CSS pulse; pause path not needed for a one-shot.

## Risks

- `cart.js` is global and owned by no section lane; intercepting its delegated listeners from the section
  must not break the drawer (drawer steppers live outside `.cv-cart`, scope the capture listener to
  `.cv-cart`).
- `.cv-line` already has `transition-delay` (theme.css:2447) and reveal transitions; if GSAP animates
  transforms on the same node, turn the CSS transition off under a root class (MOTION-SYSTEM.md 7.1).
- `templates/cart.json` trust blocks are merchant content; changing their text needs merchant confirmation.
- Flip/MotionPath are not on /cart; do not call `window.Flip` without a guard.
