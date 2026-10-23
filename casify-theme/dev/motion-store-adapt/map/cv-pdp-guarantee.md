# cv-pdp-guarantee ("Product: FAQ & close")

## Status

Live.
- `templates/product.json:868`: key `guarantee`, 18th of 22 (after `details`, before `signup`).
- `templates/product.convert.json:401`: key `guarantee`, 17th of 17 (the last section).
- Both templates save 6 FAQ blocks (q-ship, q-returns, q-packs, q-buy, q-model, q-fit), 4 promise blocks (g-ship, g-returns, g-dispatch, g-packs), `close_heading: "Ready at the counter"` and `close_cta: "Back to the counter"` (`templates/product.json:868-966`, `templates/product.convert.json:401-490`).
- Behaviour comes from `assets/cv-pdp-story.js` (closer summary, back button). Motion comes from `assets/cv-pdp-home-motion.js`. Both load on every product template (`layout/theme.liquid:306`, `:322`).

## Purpose

This is the page's closing argument: the honest rebuild of the home page's "zero risk" section, merged with the old promise tickets, FAQ and closer.
- A two-column FAQ: native `<details>` with red stamp marks, plus FAQPage JSON-LD.
- A paper "close" card (`.cvp-pad` with `pdp-slip-paper.png`) flanked by a lollipop and a wrapped sweet (decorative set pieces).
- The close card holds the closing heading, a live summary of the shopper's choice, rubber-stamped promises, and a "Back to the counter" button that scrolls to the buy box and focuses Add to bag.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-guarantee.liquid` (144 lines)
- In shared CSS files, these selector blocks are used only by this section: `.cvw-guarantee`, `.cvw-close*` and `.cvw-vow*` (`assets/cv-pdp-home.css:505-531`, `:697-699`).

Shared (coordinate before editing):
- `assets/cv-pdp-story.css`: `.cvp-faq*` (`:118-151`, `:212`, `:225`), also used by orphan `cv-pdp-promises`; `.cvp-pad` (`:35-40`), also used by cv-pdp-closer and cv-pdp-fit; `.cvp-closer__summary` (`:190`), also used by cv-pdp-closer.
- `assets/cv-pdp-home.css`: `.cvw .cvs__cta` (`:46-58`, `:700`), also used by cv-pdp-spotlight and cv-pdp-ugc.
- `assets/cv-pdp-home-motion.js`: guarantee block `:414-445`, `magnet()` `:60-73`.
- `assets/cv-pdp-story.js`: closer summary `:248-258`, `[data-cvp-back]` `:398`, `backToSlip()` `:26-31`. `data-cvp-back` is also used by cv-pdp-closer, cv-pdp-spotlight and cv-pdp-ugc.
- `assets/pdp-slip-paper.png`: also cv-pdp-closer, cv-pdp-fit and cv-product.
- `assets/hero-sweet-lollipop.webp`: also cv-orbit and cv-pdp-closer.
- `assets/hero-sweet-wrapped-red.webp`: also cv-home-conversion, cv-orbit, cv-pdp-closer and cv-product-counter.
- `snippets/cv-icon.liquid`: promise stamps truck-fast, returns, clock, price-tag, lock-secure and gift; 53 users.
- Buy box API (if the opportunities are used): `sections/cv-product-counter.liquid` `#cvAddForm` `:362`, `#cvAddBtn` `:627`, `[data-cv-buy-now]` `:635`, setting `show_buy_now` (`true` in `templates/product.json:190` and `templates/product.convert.json:23`). In `assets/cv-product.js`: `cvs:change` `:415`, `cvs:added` `:619`, `cvs:buying` `:641`.

## Store adaptation findings

1. **The closing summary names a phone model the shopper has not chosen (medium-high).**
   - Liquid prints `{{ product.title }} · {{ cvar.title }}` with `cvar = product.selected_or_first_available_variant` (`sections/cv-pdp-guarantee.liquid:16`, `:71`).
   - JS then rewrites it on every `cvs:change` with `d.variant.title + ' · ' + qty + ' cases · ' + total` (`assets/cv-pdp-story.js:248-258`).
   - The buy box starts with no phone chosen. It has a "Select your phone model" placeholder and a reminder "Pick your phone model first, so the case fits." (`sections/cv-product-counter.liquid:1028-1029`). The close card still shows the first variant's model (for example "Clear / iPhone 16"), which breaks Product Principle 2 (PRODUCT.md:110).
   - Fix (Liquid, owned): use `product.selected_variant`. When it is blank, print `{{ product.title }}` and a new setting `summary_no_model` (default "Choose your phone model at the counter").
   - Fix (JS, shared `cv-pdp-story.js`): only write the variant title once a model is chosen. Track `change` on the buy box `select[data-cv-option-index=<model index>]` and model buttons, the same approach the carousel uses (`assets/cv-pdp-carousel.js:1242-1251`). Otherwise write the colour only, plus qty and total.
2. **Pack percentages are typed in three places in this section.**
   - FAQ q-packs "18% off … 31% off" (`templates/product.json:890`, `templates/product.convert.json:460`).
   - Promise g-packs "Pack savings at checkout" / "18% off each with 2 cases, 31% with 3" (`templates/product.json:946-947`, `templates/product.convert.json:436-437`).
   - These are backed today (PRODUCT.md:39), but they drift if the buy box tiers (`templates/product.json:34`, `:45`) or the automatic discounts change.
   - Fix: support `[pack2_pct]` / `[pack3_pct]` tokens in promise `body` and FAQ `answer`, with the typed fallback, and fill them from the buy box `data-cv-discount` in JS. This is the same mechanism as the journey map finding 1, so build it once.
3. **The "Buy now" FAQ depends on a buy box setting.**
   - Where: q-buy "What does Buy now do?" (`templates/product.json:897`, `templates/product.convert.json:483`). It describes the custom Buy now, which exists only while `show_buy_now` is true on the counter.
   - True today. Add an editor info line on the FAQ block noting the dependency. JS cannot hide an answer without a flash, so keep it a merchant responsibility.
4. **The close button is inert without JS.**
   - Where: `<button type="button" … data-cvp-back>` (`:86`). Without JS it does nothing.
   - Fix: render `<a class="cvs__cta cvw-close__cta" href="#cvAddForm" data-cvp-back data-cvw-magnet>`, which works without JS because `#cvAddForm` exists on both templates.
   - The shared handler `assets/cv-pdp-story.js:398` should call `e.preventDefault()` when the target is an anchor, otherwise the jump and the smooth scroll double up. That is a coordinated change.
5. **Sweets on the close card are decoration, not products. That is fine, but they bob forever.**
   - Where: `hero-sweet-lollipop.webp` and `hero-sweet-wrapped-red.webp` (`:68-69`, `alt=""`). They are brand set pieces (PRODUCT.md:96-97). They are not presented as merchandise, so this is acceptable.
   - Their infinite bob is a motion finding; see Motion inventory.
6. **There is one FAQPage JSON-LD per product page.** It is valid. Note: Google limits FAQ rich results to authoritative sites, so expect no SERP feature. Keep it, since it is harmless. Do not add a second FAQPage section to the same template (`sections/cv-pdp-promises.liquid`, orphan, also emits one).
7. **The hardcoded `id="cvp-faq"`** (`:32`) collides only if the orphan `cv-pdp-promises` is ever placed on the same page. Low priority. Suffix it with `section.id`, and keep `cvp-faq` only if some link targets it (grep shows none).
8. Clean:
   - Promises and FAQ answers match the confirmed facts. Hyphenated "1-3" and "30-day" are not en dashes.
   - The schema info at `:115` ("Only promises that are true for every order.") guards edits.
   - No Halo, no Austin, no $200 Screen Promise and no 90-day returns. The section comment `:4-7` documents their removal.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Free shipping" / "on every order, with no minimum"; FAQ "shipping is free" | g-ship, q-ship | Backed: PRODUCT.md:34. Open item: confirm shipping rates are $0 everywhere (STORE-FACTS.md:394). |
| "30-day returns" / "change your mind within 30 days"; FAQ "You have 30 days to return it." | g-returns, q-returns | Backed: PRODUCT.md:34. The admin policy page was aligned 2026-09-16. |
| "Ships in 1-3 business days" / "counted from the day you order"; FAQ "Orders leave us within 1 to 3 business days" | g-dispatch, q-ship | Backed: PRODUCT.md:34. |
| "Pack savings at checkout", "18% off each with 2 cases, 31% with 3"; FAQ "each one is 18% off … 31% off … comes off automatically at checkout, so the total on your button is what the cases cost, before any tax" | g-packs, q-packs | Backed: PRODUCT.md:33, :39; Product Principle 3 (:111). Typed text, so it can drift (finding 2). |
| "It puts the case and pack you chose in your bag and takes you straight to checkout" | q-buy | Backed by `cv-product.js` `buyNow()` (MOTION-SYSTEM.md 5.4) while `show_buy_now` is true. |
| "It only shows the models this case is made for" | q-fit | Backed (model list comes from product options). |
| iPhone/Samsung steps to find the model name | q-model | General device fact. Not a store claim. |
| Closing summary "product · variant" | `:71`, JS | Store data, but it names an unchosen model (finding 1). |

## Motion inventory

- `data-cv-*` attributes: none. It uses `cvw` hooks `data-cvw-guarantee`, `data-cvw-close`, `data-cvw-vow` and `data-cvw-magnet`, plus `cvp` behaviour hooks `data-cvp-closer`, `data-cvp-summary` and `data-cvp-back`.
- `assets/cv-pdp-home-motion.js:414-445`:
  - FAQ marks start at `scale 0` and pop with `back.out(3)` (stagger 0.08) at `top 85%`.
  - The close card is set to `opacity 0, y 60` and rises over 1 s with `expo.out` at `top 88%`.
  - Vows slide in from `x -18`. Stamps land from `scale 2.6, rotation -40` to their ±9/10 degree tilt with `cvwDrop` (CustomBounce), staggered 0.18.
  - The sweets pop in (`back.out(2.4)`), then **bob forever** (`repeat: -1, yoyo`, `:438`).
  - `magnet()` leans the CTA toward the pointer on hover-capable devices (`:442`, `:60-73`).
- CSS: the FAQ mark rotates 37 degrees when open (`assets/cv-pdp-story.css:150`, transition removed under reduced motion `:225`). The `<details>` open and close is instant, with no height animation.
- Reduced motion: the motion file returns early. `backToSlip()` uses `behavior: 'auto'` and focuses without delay (`assets/cv-pdp-story.js:29-30`).
- No-JS: the FAQ works natively, the close card is visible, the summary shows Liquid text (finding 1), and the button is inert (finding 4).
- Theme editor: no `shopify:` handling in either JS file. After a re-render the close card is static and visible, and the old ScrollTriggers stay alive until reload.
- Policy gaps:
  - The infinite sweets bob has no offscreen pause and no pause control, which breaks DESIGN.md:183 ("Long-running ambient motion pauses offscreen") and DESIGN.md:192 ("explicit pause path when it auto-runs").
  - Magnet listeners are not removed on `matchMedia` revert.

## Motion opportunities

1. **High: a real closing buy box on the close card (Add to bag and Buy now).**
   - Beside or instead of "Back to the counter", add two buttons that drive the buy box's own form: Add to bag calls `document.getElementById('cvAddForm').requestSubmit()`, and Buy now calls `.click()` on the first `[data-cv-buy-now]` in `[data-cv-pdp]`. This is the carousel's contract (see `map/cv-pdp-carousel.md`): no direct `/cart/add.js` or `/checkout` posts, and pack and mixed cases go in as from the top.
   - Model fit first: when no model is chosen (same detection as finding 1), the primary button reads "Choose your phone" and does `backToSlip()` instead.
   - Show the live total from `cvs:change` (`d.total`) on the button.
   - Motion:
     - The button label flips (y-roll, 240ms) when the total changes.
     - On `cvs:adding`, the pill presses down (`y: 3`, the shadow shrinks).
     - On `cvs:added`, a tick draws (DrawSVG) and the label becomes "In your bag" for 1.6 s.
     - On `cvs:buying`, the arrow slides right and the label becomes "To checkout…".
   - Respect `gsap.matchMedia` for reduced motion.
   - No-JS: keep `<a href="#cvAddForm">` as the only control and hide the new buttons until JS runs (`hidden` attribute removed in init).
   - Do not add a second fly-to-bag token. `cv-pdp-counter-motion.js:275-331` already flies one from the buy box button on `cvs:added` (MOTION-SYSTEM.md section 7, item 7).
2. **High: pause the ambient sweets.** Wrap the bob in a ScrollTrigger `onToggle` (play while the close card is in view, pause otherwise), or limit it to 3 yoyo cycles and stop, following MOTION-SYSTEM.md 4.7. Reduced motion already skips it.
3. **Medium: FAQ open and close height.** Animate `<details>` with GSAP: on `toggle`, measure `.cvp-faq__a` and tween `height` 0 to auto (0.24 s, `power2.out`) with an opacity fade. On close, intercept the summary click, tween to 0, then remove `open`. Skip under reduced motion. Keep native `<details>` so no-JS works.
4. **Medium: a stamp sound-alike for the promises.** Promise stamps already land. Add a 1px ink-spread `box-shadow` pulse on landing, and a short `rotation` overshoot with CustomWiggle (`cvwWiggle`, already created at `assets/cv-pdp-home-motion.js:53`).
5. **Low: summary ticker.** When the summary text changes (`cvs:change`), roll the old text up and the new text in (SplitText lines, 0.3 s), like a ticket printer.

## Risks

- **Ownership:** the summary logic and the back handler live in `assets/cv-pdp-story.js` (shared with cv-pdp-closer, fit, set, shelf, ugc and showcase). Motion lives in `assets/cv-pdp-home-motion.js` (11 sections). Only the Liquid and the `.cvw-close*` / `.cvw-vow*` CSS blocks are owned.
- **Buy box coupling:** the closing buy box must use the shared buy box API, never its own cart calls, and must check `[data-cv-pdp="counter"]` (MOTION-SYSTEM.md section 7, item 7). Both live templates use `cv-product-counter`, so `#cvAddForm` exists. If a future template uses another buy box, guard on `document.getElementById('cvAddForm')`.
- **Template order:** `templates/product.json` places `signup`, `offer_delivery` and the review widgets after this section, so the "close" is not literally last on the default template. Consider moving it last in `order`; that is a template edit, so coordinate with the merchant.
- **Tokens:** pack-percentage tokens must keep the typed fallback, so the FAQ JSON-LD (`:58`) receives real text, not a placeholder. JSON-LD is rendered in Liquid, so substitute tokens in Liquid with the same fallback values.
