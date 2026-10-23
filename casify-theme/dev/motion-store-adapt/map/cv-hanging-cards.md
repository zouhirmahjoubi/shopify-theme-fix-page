# cv-hanging-cards ("Hanging cards")

## Status

LIVE on `templates/page.about-us.json` (key `hanging_cards`, after the cv-page `main`; order `["main", "hanging_cards"]`). Instance: heading "Where to next?", intro "Explore the shop or get a hand finding your fit.", 3 cards with links and no product pickers: "Every collection" -> `/collections`, "Find your case" -> `/collections/all`, "Ask the shop" -> `/pages/contact` (templates/page.about-us.json:16-40). Script loaded by layout/theme.liquid:234-235 when the markup contains `data-cvhang` (or in the editor).

## Purpose

Up to 4 cards hanging from a strap and clasp, each with optional product (fills image, title, price "From ..." and URL from real product data when the card's own fields are blank), image, title, text, link and accent tone (red/teal/gold). On scroll the cards swing once and settle; on fine pointers they nudge on hover and can be dragged sideways.

## Files (owned / shared)

Owned:

- `sections/cv-hanging-cards.liquid`
- `assets/cv-hanging-cards.css` (only this section loads it, line 1)
- `assets/cv-hanging-cards.js` (only loaded by the layout for `data-cvhang`, which only this section emits)

Shared:

- `layout/theme.liquid` (loader at 234-235; do not edit in parallel)
- `templates/page.about-us.json` (also holds the cv-page `main` instance)
- `snippets/cv-icon.liquid` (arrow-right)
- `assets/theme.css` (tokens, `.rte`), GSAP bundle (core + ScrollTrigger always loaded)

## Store adaptation findings

1. LOW, accessible name fallback: when the heading is blank the section gets `aria-label="Hanging cards"` (sections/cv-hanging-cards.liquid:5), an editor term, not a shopper one. Fix: `aria-label="{{ 'From the shop' }}"` or a setting.
2. LOW, schema preset cards (lines 112-114) have no link and no product, so on a fresh placement they render as plain text cards ("Choose your case", "Pick your phone", "From our counter"). Copy is honest and on-domain (phone cases, phone models). "we will help you choose" is a soft service promise; acceptable. Consider giving the preset cards default links (`/collections/all`, `/collections/all`, `/pages/contact`) so they are not dead ends.
3. LOW, "From" (line 59) and "Explore" fallback (line 63) are hardcoded English; locales later.
4. GOOD: product data binding is correct: image from `product.featured_image`, title, `price_min | money` with "From" only when `price_varies` (lines 20-33, 59). No hardcoded prices or currencies. No dashes in copy (the about-us text uses a typographic apostrophe, templates/page.about-us.json:25, which is fine).
5. GOOD: no candy or sweets presented as products; the "candy red / muted teal / aged gold" tone labels are editor-only (lines 100-104).
6. Note: product images on this store carry no alt text (PRODUCT.md:32); the section falls back to the card title for alt (line 33), which is correct.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Product price "From $X" | `card_product.price_min | money`, line 59 | Store data |
| "Need help choosing? Send us a question through the contact page." | templates/page.about-us.json (card `contact`) | No claim |
| "we will help you choose" | preset, sections/cv-hanging-cards.liquid:114 | Soft service statement, no time or outcome; acceptable |

No ratings, counts, guarantees or delivery times.

## Motion inventory

- No `data-cv-*` attributes.
- Section JS assets/cv-hanging-cards.js (241 lines), GSAP core + ScrollTrigger:
  - Reveal: one-time swing timeline per card (y 14, rotationZ ±7, rotationY ±24 -> overshoot -> settle), 150 ms stagger, triggered by `ScrollTrigger.create({ start: 'top 84%', once: true })`, IntersectionObserver fallback, or immediate play (lines 86-134).
  - Hover nudge (fine pointer) and keyboard `focusin` nudge (lines 136-145, 211-213).
  - Pointer drag sideways with elastic settle (fine pointer, not on links; lines 159-210).
- Reduced motion: init returns before any tween and re-inits on preference change (lines 34, 77-84); CSS removes link hover transform (cv-hanging-cards.css:255-258).
- No-JS: cards fully visible and links native (header comment lines 1-4; no opacity-0 states in the CSS).
- Theme editor: handles `shopify:section:load` (boot), `unload` (destroy), `section:select` and `block:select` (finish the swing so the merchant sees the resting state) (lines 227-240). Model implementation for the theme.

## Motion opportunities

1. HIGH (commerce, real data only): when a card has a `product`, add a "Choose colour and phone" button with `data-cvqp-open data-handle="{{ card_product.handle }}" data-url="{{ card_product.url }}"` (same contract as snippets/cv-card.liquid:79). The layout then renders and loads the shared quick pick dialog automatically (layout/theme.liquid:207-209, 295-296); it resolves a real variant from colour + phone model, posts to `/cart/add.js` and opens the cart drawer (`window.Casify.openDrawer`, assets/cart.js:185). Disable when `card_product.available` is false. Never add a guessed variant. On successful add (listen for `cv:cart`, assets/cart.js:171), give that card a short celebratory swing (reuse `nudge` with larger amplitude) and a brass "In your bag" tag that stamps in (scale 1.15 -> 1, candy spring); skip under reduced motion.
2. MEDIUM: price ticket flip on reveal: the `.cvhang__price` tag rotates in on its own string after the card settles (rotationX -90 -> 0, 420 ms soft-out), as a `from()` so it is visible without JS. Do not count up prices.
3. LOW: strap tension: during the reveal scale the strap `scaleY` 1.06 -> 1 in sync with the drop, so the hanger reads physically.
4. LOW: ambient sway only while in view (ScrollTrigger `toggleActions` play/pause), max 0.8 deg, paused when `document.hidden`; reduced motion off. Keep subtle; DESIGN.md asks ambient motion to pause offscreen.

## Risks

- The quick-pick button must live outside the drag handler's target list or be a `<button>` (the drag already ignores `a, button, input...`, line 202), so adding a button is safe.
- `layout/theme.liquid` is shared; no layout change is needed for quick pick since the loader keys off `data-cvqp-open`.
- `templates/page.about-us.json` is shared with cv-page; edit only the `hanging_cards` instance.
