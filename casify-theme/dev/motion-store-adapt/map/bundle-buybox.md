# bundle-buybox ("Bundle upsell — buy box")

Family: buybox-alt. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**orphan**: placed in no template and no section group. No `enabled_on`, so it can be added to any template.

## Purpose

A "Complete the set" upsell grid: up to 6 cards, each a mini buy box (badge stamp, star rating,
title, body, price + compare + Save %, qty stepper, "Add bundle" CTA, stock line) that posts one
variant to the cart through the global cart.js handler.

## Files (owned / shared)

Owned:
- `sections/bundle-buybox.liquid`
- `assets/icon-sparkle.svg`, `assets/icon-ribbon.svg` (inlined at :11-12, used nowhere else)
- `assets/badge-add-to-cart.png` (:15, used nowhere else)

Shared (do not edit from this lane):
- `assets/theme.css` (`.bundle-buybox*` rules :685-776 are used only by this section, but the file is shared; `.halo-buy`, `.halo-rating`, `.halo-price-row`, `.halo-cta`, `.halo-cta-sub`, `.halo-dot` are shared with main-halo-product and others; `[data-cm-reveal]` :895-896; `.cm-stagger-cm` :897-903; stepper shell :966+)
- `snippets/cv-icon.liquid` (used by ~53 files)
- `assets/cart.js` (`form[data-cart-add-form]` submit :87-109, qty stepper :43-57)
- `assets/theme.js` (`[data-cm-reveal]` observer :183-195)

Suggested: move the `.bundle-buybox*` block out of theme.css into a new owned `assets/cv-bundle-buybox.css` in the implementation phase (needs the theme.css owner to delete the old block, or leave it and override).

## Store adaptation findings

1. **H, candy presented as a product**: preset card "Case + tin of 12 sweets" / "Peppermint creams, hand-tied ribbon." (:149). Banned. Fix: remove the card from presets.
2. **H, adds a guessed phone model**: `card_var = card_pid.selected_or_first_available_variant` (:22) is posted as `id` (:75). For a phone case with 20 to 40 model values this adds the first model, not the shopper's. PRODUCT.md: "Quick add ... never adds a guessed phone model". Fix: for products with more than one variant, replace the form with the quick pick opener `<button type="button" data-cvqp-open data-handle="{{ card_pid.handle }}" data-url="{{ card_pid.url }}">` (snippets/cv-card.liquid:79 pattern; layout loads the dialog when markup contains `data-cvqp-open`, layout/theme.liquid:208-210, :295); keep the direct form only when `card_pid.has_only_default_variant`.
3. **H, fake ratings and review counts**: stars default 5 (:135) and review count default "128" (:136), presets 128 / 212 / 94 (:147-149), rendered whenever rating is set (:40-51); link `href="#"` (:48). Fix: read `card_pid.metafields.reviews.rating` / `rating_count` and render only when count > 0; delete the `rating` and `review_count` settings.
4. **H, unbacked shipping and stock line**: "In stock · ships next business day" hard-coded on every card (:95-98), regardless of `card_var.available`. Confirmed fact is 1 to 3 business days. Fix: "Ships in 1 to 3 business days", and show "Sold out" + disabled button when `card_var.available` is false.
5. **H, invented products and claims in presets**: "The Peppermint Cream. MagSafe ready." (:120, :147), "Case + charging puck / Matching cocoa MagSafe charger, 15W." with badge "Most popular" (:148). Not in the catalogue (STORE-FACTS.md), "MagSafe ready", "15W", "Most popular" unbacked. Fix: presets with no product text; title/body default to `card_pid.title` and blank.
6. **H, "Add bundle" adds one item**: the CTA says bundle (:92) but posts a single variant x qty. Misleading unless the chosen product is itself a bundle. Fix: label "Add to bag", or build a real multi-item add (items[] of the case + chosen add-on) and say what is in it.
7. **M, hard-coded currency on fallbacks**: `${{ price_now }}`, `${{ price_was }}` (:66-69, :92) and typed fallback prices "34" / "58" / "62" (:121, :147-149). Fix: drop the text price fallback entirely; render a card only when a product is chosen (`card_real`).
8. **M, unit mix bug**: `price_was` falls back to the typed `compare` string when the product has no compare-at (:28), then is compared to cents (:30-31, :61). Fix: only use the product's `compare_at_price`.
9. **M, unescaped settings**: `{{ block.settings.badge }}`, `title`, `body` (:37, :53, :55). Add `| escape`.
10. **L, dashes**: em dashes are only in the Liquid comment (:2, :6-7) and editor-facing names (:107, :145); rename to "Bundle upsell, buy box" for consistency (editor only).
11. **L, section heading defaults** "Pair it with" / "Complete the set" (:13, :111-112) are fine.

## Claims register

| Claim | Where | Status |
|---|---|---|
| ★★★★★ + "128 / 212 / 94 reviews" | :40-51, presets | UNBACKED |
| "In stock" | :97 | UNBACKED (not bound to availability) |
| "ships next business day" | :97 | UNBACKED (contradicts 1 to 3 business days) |
| "MagSafe ready", "MagSafe charger, 15W" | presets :147-148 | UNBACKED |
| "Most popular" badge | preset :148 | UNBACKED |
| Price, compare-at, Save N% | :58-72 | LIVE when a product is set; MERCHANT-TYPED fallback otherwise |
| "Case + tin of 12 sweets" | preset :149 | BANNED (candy as product) |

## Motion inventory

- cv-motion attributes: none.
- `data-cm-reveal` on the section root (:10): opacity 0 + 6px rise until theme.js's IntersectionObserver adds `is-revealed` (theme.css:895-896, theme.js:183-195). **No-JS: the whole section stays invisible** (no `.no-js` scoping). Reduced motion: forced visible (theme.css:3313).
- `.cm-stagger-cm` grid (:17): CSS `cm-rise` stagger 0-300 ms on load (theme.css:897-903), not scroll-linked (runs while offscreen, so it is usually finished before the shopper arrives).
- `.cm-press:active` translateY(1px) (theme.css:453); card hover lift (theme.css:735).
- Section JS: none. GSAP: none.
- Theme editor: theme.js does not rescan on `shopify:section:load` (no `shopify:` listener in theme.js), so a section added in the editor stays at opacity 0 until reload.
- Add to cart: cart.js toasts "Added to bag", refreshes and opens the drawer (cart.js:87-109); no event, no fly.

## Motion opportunities

1. **(High) Fix visibility first**: replace `data-cm-reveal` on the root with a GSAP reveal in a new owned `assets/cv-bundle-buybox.js` that starts from `opacity .75` (never 0), or with `data-cv-reveal` only after the no-JS fix (MOTION-SYSTEM.md 3.4). Add `shopify:section:load/unload` handling.
2. **(High) Scroll choreography for the cards**: `ScrollTrigger.batch('.bundle-buybox__card', { once: true, start: 'top 88%' })`, rise 16px + 0.06 s stagger, 420 ms soft-out; badge stamps thump in after their card (scale 1.6 to 1, rotation -18 to -6, candy spring), Save % chip pops last. Remove `.cm-stagger-cm` so the two systems do not double-animate.
3. **(High) Add to bag feedback**: on submit success (listen for the drawer opening, or own the add in the new JS and dispatch `cart:refresh` + `cart:added`), fly the card's product image to `#bagBtn` (MotionPathPlugin only exists on product/shop templates, layout/theme.liquid:173-177; straight tween fallback elsewhere), then a "Added" stamp on the card for 1.2 s. With the quick pick (finding 2), the fly belongs to the quick pick dialog instead.
4. **(Medium) Qty stepper**: number roll on `[data-qty-value]` (y -100% to 0 with clip, 160 ms) and CTA price recompute (price x qty) on change; cart.js already updates the value (cart.js:43-57).
5. **(Medium) Bundle meter**: if the merchant wants real bundles, show the live 18% / 31% pack meter (shared idea from cv-pages.js pack meter driven by cart count) instead of typed compare prices.
6. **(Low) Flourishes** (:11-12, :15): gentle float (y ±3px, 3 s sine, yoyo) paused offscreen via ScrollTrigger `toggleActions`, none under reduce.

## Risks

- Shares `.halo-*` buy-box classes with main-halo-product; restyling them affects both.
- Switching to quick pick changes the commerce path: the quick pick snippet and JS are shared and loaded only when `data-cvqp-open` is in the first render (layout/theme.liquid:208-210).
- Presets are shopper-facing the moment the merchant adds the section; fix presets before any placement.
- Removing the rating/review settings changes the schema; existing placements (none today) would lose values. Safe now because the section is orphaned.
