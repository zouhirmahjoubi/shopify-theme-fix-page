# halo-xsell ("Halo — Cross sell")

Family: buybox-alt. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**orphan**: placed in no template and no section group. No `enabled_on`.

## Purpose

Three-up "finish the setup" add-on grid: each block shows a product image (or an inline SVG icon),
title, description, price + compare, and an "Add" button that posts the product's first available
variant natively.

## Files (owned / shared)

Owned:
- `sections/halo-xsell.liquid` (no own CSS/JS/assets)

Shared (do not edit from this lane):
- `assets/theme.css` (`.halo-sec*` :3689-3693, `.halo-xs` / `.halo-xc*` :3824-3843, `[data-halo-reveal]` and `.halo-stagger` :3905-3921, small-screen padding :4143-4148)
- `assets/halo.js` (dead: requires `.halo-tpl`, halo.js:19-20; layout never sets it, layout/theme.liquid:196-201)

## Store adaptation findings

1. **H, heading invisible when placed**: the header wrapper has `data-halo-reveal` (:2), which is `opacity: 0` in CSS (theme.css:3906) and only revealed by halo.js, which never runs. Shoppers would see a blank heading area (visible only under reduced motion, theme.css:3919). Fix: drop `data-halo-reveal`; use a GSAP reveal from an owned script or `data-cv-reveal` after the no-JS fix (MOTION-SYSTEM.md 3.4). halo-closer.liquid:4-10 records the same fix.
2. **H, adds a guessed phone model**: `prod.selected_or_first_available_variant.id` (:35). For phone cases (20 to 40 model values) this adds the wrong model. Fix: `data-cvqp-open data-handle data-url` quick pick (snippets/cv-card.liquid:79), direct add only when `prod.has_only_default_variant`.
3. **H, invented products, brand and claims in presets** (:69-92): "ArmorGlass Screen Protector, 9H tempered glass ... Two in a pack" $19 / $29; "Halo Wallet ... 1,100 g of magnet, and a fold-out stand"; "VentLock Car Mount ... Built for the 1,400 g ring". None exist in the catalogue (STORE-FACTS.md), "Halo" is another brand, 1,400 g is listed NOT verified. Fix: presets with three empty `item` blocks (product picker only).
4. **H, unbacked social claim in heading** "Three things people add in the same order" (:4, :67): implies order data. Fix: "Finish the setup" or "Pairs well with".
5. **M, dead "Add" button** when no product is set (:38-40): a button with no action. Fix: render the card only when `prod != blank`.
6. **M, typed prices** with currency inside the text setting ("$19", :30, preset :76/:82/:88). Fix: delete `price`/`compare_at_price` settings; product price only.
7. **M, native form, not AJAX**: `<form method="post" action="{{ routes.cart_add_url }}">` without `data-cart-add-form` (:34) sends the shopper to /cart, leaving the page. Fix: add `data-cart-add-form` (cart.js handles it, opens the drawer) when the product has a single variant; quick pick otherwise.
8. **M, em dashes**: tick default "Section 07 — finish the setup" (:3, :66); also a meaningless "Section 07" numbering. Editor names (:49, :71). Fix: blank tick default, name "Cross sell".
9. **M, unescaped body and title fallback**: `{{ block.settings.body }}` (:24), image alt `prod.title` unescaped inside image_tag is fine; body needs `| escape` (textarea).
10. **L, compare price** uses `prod.compare_at_price` vs `prod.price` (:28): product-level min prices; acceptable, or use the selected variant.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Three things people add in the same order" | :4, :67 | UNBACKED (implies purchase data) |
| 9H tempered glass, two in a pack | preset :75 | UNBACKED (product not in catalogue) |
| 1,100 g of magnet, fold-out stand | preset :81 | UNBACKED |
| Built for the 1,400 g ring | preset :87 | UNBACKED (listed not verified) |
| $19/$29, $29/$45, $25/$39 | presets | MERCHANT-TYPED placeholders, not store prices |
| Product price / compare-at | :27-28 | LIVE when a product is chosen |

## Motion inventory

- cv-motion attributes: none.
- `data-halo-reveal` (:2): dead (see finding 1), content hidden.
- `.halo-stagger` grid (:7): CSS `cm-rise` stagger on load (theme.css:3908-3916), runs while offscreen; ends visible; reduced motion handled by the universal block (theme.css:3307-3314).
- `.halo-xc:hover` lift (theme.css:3835), `.halo-xc__add:hover` (:3843).
- No JS, no GSAP, no editor events. No-JS: grid visible, heading hidden, Add posts natively.

## Motion opportunities

1. **(High) Make it visible and scroll-led**: new owned `assets/cv-xsell.js` (or extend the owner's preferred file) with `gsap.context`: heading `SplitText` lines rise (plain-text heading only), cards `ScrollTrigger.batch` rise + 0.06 s stagger once at `top 88%`, start opacity .75. Remove `.halo-stagger` and `data-halo-reveal`. Revert on `shopify:section:unload`.
2. **(High) Add feedback**: after quick pick / AJAX add success, the card's product image flies to `#bagBtn` (straight tween off product templates, MotionPath on product templates), "Added" stamp on the card; reduced motion: text state only.
3. **(Medium) Product art**: `data-cv-tilt` on `.halo-xc__art` (fine pointer only, cv-motion.js; no hidden state, safe without JS).
4. **(Low) Price chip pop** when the card enters (scale .9 to 1, candy spring) only if a real compare-at exists.

## Risks

- Uses shared `.halo-*` classes in theme.css; scope new styles to a new class (`.cv-xsell`) instead of editing `.halo-xs`.
- Typically placed on product pages under the buy box; a cross-sell of other phone cases must never add a guessed model (finding 2) or it creates wrong-model orders.
- Presets ship the moment the merchant adds the section: fix presets first.
