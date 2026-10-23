# cv-offer-courier ("Offer delivery")

## Status

LIVE on three templates:
- `templates/index.json` instance `offer_delivery` (:1654-1672, type :1655), position 20 of 21, `display: inline`,
  button "Shop cases" to `shopify://collections/all`.
- `templates/product.json` instance `offer_delivery` (:1012-1030, type :1013), last-but-two of 22, `display: popup`,
  `popup_delay: 5`, `popup_days: 0` (shows on every page load, merchant's explicit choice, PRODUCT.md:283), empty
  link so the CTA scrolls to the pack picker.
- `templates/page.json` instance `offer-delivery` (:30-46, type :31), popup, same settings as product.
Schema `disabled_on` header and footer groups (:150).

## Purpose

The pack offer delivered by an SVG shopkeeper: he walks in, waves with a speech bubble, walks off, then hauls the
offer card on stage (inline) or plays the haul inside a `<dialog>` popup after a delay (:36-49). Optional discount
code with copy button and `/discount/CODE?redirect=` CTA (:5-16, :114-123). On a product page popup with no link,
the CTA closes the popup and scrolls to `.cvc__packs` (:24-32, :126).

## Files (owned / shared)

Owned:
- `sections/cv-offer-courier.liquid`
- `assets/cv-offer-courier.css` (252 lines; only :1)
- `assets/cv-offer-courier.js` (375 lines; layout/theme.liquid:237-239 on gate `data-cvoc`, printed only here)

Shared:
- `snippets/cv-icon.liquid` (close, arrow-right).
- `locales/en.default.json` `sections.offer_courier.*` (:155+) and `general.close` (keys only used here except
  `general.close`).
- `layout/theme.liquid:237-239` (gate).
- Coupling (read-only dependency): `.cvc__packs` and `#cvPdp` from sections/cv-product-counter.liquid:575 and :208;
  pack tiles carry `data-cv-pack data-cv-qty data-cv-discount` (cv-product-counter.liquid:584-588).

## Store adaptation findings

1. Em dashes in live shopper copy (HIGH, all three templates):
   - `text` "Pick a pack on any case and the saving comes off automatically at checkout — no code needed."
     (templates/index.json:1659, product.json:1017, page.json:35). Fix: "...automatically at checkout. No code needed."
   - `bubble_before` "Hold on — I've got something for you!" (schema default :186, index.json:1669,
     product.json:1027, page.json:45). Fix: "Hold on, I've got something for you!"
2. Popup CTA label mismatch on the Default page template: page.json:38 "Choose your pack" with an empty link goes to
   `routes.all_products_collection_url` (:6) because there is no pack picker on a page. Fix: page.json
   `button_label` "Shop cases" (or make the label conditional: when `cta_scroll` is false and the label is the
   pack wording, fall back to a `shop_label` setting).
3. Hard-typed discount numbers: "Two cases? 18% off each. Three? 31% off." (index.json:1658, product.json:1016,
   page.json:34) duplicate the live automatic discounts and the buy box tiers (product.json tier blocks). If the
   discount changes they drift. Fix (product template): read the tier percentages from the rendered pack tiles
   (`[data-cv-pack][data-cv-discount]`) at runtime is fragile; better a shared theme setting later. For now keep the
   text and re-verify the live discount before each push (STORE-FACTS.md section 9 item 5).
4. "18% off each": the live discount is "18% off entire order, minimum quantity 2" (PRODUCT.md:39). "each" is true
   for a 2-case cart but reads as per-item; acceptable, optional rewording "Two cases: 18% off. Three: 31% off."
5. Popup frequency: product and page popups reopen 5 s after every page load (`popup_days: 0`). This is the
   merchant's explicit request (PRODUCT.md:283); do not change it in this pass, but note it can interrupt model
   selection on the product page. Motion work must not make it more intrusive (no shake, no sound, no re-open on
   scroll).
6. Hard-coded `--cvoc-skin: #F2C9A5` (cv-offer-courier.css:6) is the only colour outside the tokens; fine for an
   illustration.
7. No candy-as-product: the shopkeeper wears a candy-stripe apron; the offer is about cases. No Halo copy, no
   prices or currencies printed. Discount code path uses `routes.root_url` correctly (:9-15).

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Two cases? 18% off each. Three? 31% off." | index.json:1658, product.json:1016, page.json:34 | BACKED (PRODUCT.md:37-39 live automatic discounts 18% / 31%, min qty 2 / 3, all items; re-verify live) |
| "saving comes off automatically at checkout, no code needed" | :1659 / :1017 / :35 | BACKED (automatic discounts) |
| "Pick a pack on any case" | same | BACKED ("all items") |
| "Free shipping on every order" | fine print index.json:1664, product.json:1022, page.json:40 | BACKED (PRODUCT.md:34) |
| "30-day returns" | same | BACKED (PRODUCT.md:34) |
| Discount code | setting `code` (empty in all instances) | Setting; must exist in Discounts |

## Motion inventory

- `data-cv-*` shared attributes: none. Section attributes: `data-cvoc` (:52), `data-cvoc-pop` + `data-delay`,
  `data-days`, `data-key`, `data-editor` (:39-43), `data-cvoc-close` (:46), `-figure` (:56), `-bubble-before` /
  `-after` (:57-58), `-inner` (:59), `-leg-back` / `-leg-front` (:68, :72), `-arm-back` / `-arm-front` (:76, :84),
  `-head` (:88), `-card` (:104), `-copy` (:118), `-status` (:122), `-scroll` (:126).
- Motion JS `assets/cv-offer-courier.js`:
  - Character timeline (:153-201): walk in 1.3 s with leg steps (:127-140), head tilt + wave + first bubble,
    walk off 1.0 s, come back hauling the card 1.9 s with an `elastic.out` settle, turn round, second bubble, wave.
    Inline: the card is parked off stage at init (`timeline.progress(0.0001).pause()`, :217) and only lands about
    6 s after the section reaches `top 72%` (haul label at ~4.2 s + 1.9 s). Popup: starts at `haul` (:229),
    card lands ~1.9 s after opening.
  - Hover wave on the shopkeeper after the intro (:239-252).
  - Popup controller (:254-356): delay timer, localStorage suppression (days > 0 only), never opens on top of another
    open dialog (:300-303), close on backdrop/close button, CTA scroll to `.cvc__packs` then focus the checked pack
    (:322-332).
  - Copy-code with clipboard fallback and a live status (:31-76).
- GSAP plugins: core (+ ScrollTrigger optional). No SplitText, DrawSVG.
- Reduced motion: init returns before any tween (:118); popup still opens without animation; CSS removes the dialog
  keyframes and transitions (cv-offer-courier.css:248-252).
- No-JS: CSS is the finished scene (comment cv-offer-courier.css:1-3); only the first bubble is hidden
  (`.cvoc__bubble--before { visibility:hidden; opacity:0 }`, :62). A popup without JS never opens (expected; the
  `<dialog>` stays closed and invisible).
- Theme editor: `shopify:section:load`, `:unload`, `:select` (finish inline / open popup), `:deselect` (close popup)
  (:360-375). Good.
- Ambient: none looping (only one-shot timelines). Good.

## Motion opportunities

High value
1. Card first, character second (inline). The offer heading and CTA are commerce content and sit off stage for about
   4 s, then land at about 6 s: far beyond the 160 / 240 / 420 ms set and the "short staged reveal" rule
   (DESIGN.md:183). Rebuild the timeline so the card lands within ~0.8 s (`x` from offRight, 0.7 s `expo.out`,
   ticket `rotation` 4 -> 0 `elastic.out(1,.45)`), with the shopkeeper walking in beside it and waving after.
   Never park the card off stage before the trigger; use the pending-class pattern (MOTION-SYSTEM.md 4.3) for the
   figure only.
2. Popup to pack picker hand-off (product template): after the CTA scrolls to `.cvc__packs` (:329), pulse the 2- and
   3-case tiles without selecting them: `gsap.fromTo('[data-cv-pack][data-cv-qty="2"], [data-cv-pack][data-cv-qty="3"]',
   { boxShadow: '0 0 0 0 rgba(196,48,43,.0)' }, { boxShadow: '0 0 0 6px rgba(196,48,43,.25)', yoyo: true, repeat: 1,
   duration: .24 })` and a small `y: -4` lift with `back.out(2)`. Do not dispatch `cvs:pack` (choosing a pack for
   the shopper changes the price). Skip under reduced motion.
3. Shorten the popup haul to ~0.9 s so the offer is readable within a second of the dialog opening.

Medium
4. Close animation for the popup (160 ms fade/scale .98) before `dialog.close()`; must still close instantly under
   reduced motion and on Escape.
5. Copy-code feedback: stamp the "Copied!" label (scale 1.25 -> 1, rotation -6 -> 0, 240 ms) and DrawSVG a tick;
   only when a code exists.
6. Wrap in `gsap.matchMedia()` so a reduced-motion switch mid-session reverts.

Low
7. Inline variant on the home page: tie the card's stripe trim to scroll (scrubbed `backgroundPosition`), offscreen-
   paused by ScrollTrigger. Optional delight.

## Risks

- Popup cadence is a merchant decision (every load after 5 s); keep it, but do not add motion that delays closing or
  blocks the buy box.
- `data-cvoc-scroll=".cvc__packs"` assumes The Shop Counter; on `product.order-slip.json` (cv-product) it falls back
  to `#cvPdp` (:328). Any pulse code must no-op when `[data-cv-pack]` is missing.
- Template copy fixes touch shared JSON templates (index, product, page): coordinate.
- The suppression key is `md5(section.id + heading + code)` (:42): changing the heading resets suppression for
  shoppers (harmless with days 0).
