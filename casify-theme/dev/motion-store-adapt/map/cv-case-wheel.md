# cv-case-wheel ("Case wheel")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. Preset "Case wheel" (:189-191), no
`enabled_on` limit, so it can be added to any template. Best fit: home page (index.json has 21 of 25 sections) after
the showcase, or collection pages.

## Purpose

Real products from one collection (default `collections.all`, limit 20, products without a photo skipped,
sections/cv-case-wheel.liquid:27-37) sit round a dial. Tap or hover a case and the needle swings to it while a ticket
shows its live title, price and real compare-at; "Spin the wheel" spins and lands on a random case; optional
self-spin with a pause button. three.js enamel needle with a peppermint hub, CSS needle fallback. Ticket JSON at
:134-145.

## Files (owned / shared)

Owned:
- `sections/cv-case-wheel.liquid`
- `assets/cv-case-wheel.css` (199 lines; only :25)
- `assets/cv-case-wheel.js` (617 lines; module printed by the section itself at :147, not gated by the layout)

Shared: none. (No snippets rendered; no locale keys; no layout gate.) Runtime dependency on the GSAP bundle
(snippets/gsap.liquid) and three.js from jsdelivr (cv-case-wheel.js:28).

## Store adaptation findings

1. Default copy over-claims: text "Every case in the shop on one dial." (schema :161). False when the collection has
   more products than `limit` (31 handles are referenced on the home page, STORE-FACTS.md section 3) or when a
   collection is chosen. Fix: "Cases from the shop on one dial. Tap a case to point the needle at it, or spin and let
   the wheel pick for you."
2. Wrong product domain on the default collection: `collections.all` includes the camera-lens protective film
   (STORE-FACTS.md section 3), which is not a case, under a "case wheel" with "Shop this case". Fix: when placing,
   set the collection to a cases collection (e.g. `frontpage` or `iphone`); in code, add an optional
   `product_type` text setting to skip non-case products (`if st.product_type != blank and p.type != st.product_type`)
   instead of hard-coding a handle.
3. Sold-out products are shown and offered (no `p.available` check, :32-36, :98-99, :137-138). Fix: skip
   unavailable products (or setting "Hide sold-out cases", default on).
4. Price without "From": the ticket prints `p.price | money` (:73, :141), the lowest variant price. When
   `p.price_varies`, prefix "From " (locale key) so the page price never understates a chosen variant
   (Principle 3). Compare-at logic is correct (:62-64, :140).
5. No phone-model fit on the ticket: shoppers cannot see whether a case fits their phone. Store binding: compute the
   number of model values per product (model option per STORE-FACTS.md section 4 rule) and add `"models": N` to the
   JSON; ticket line "Made for N phone models" (LIVE, same wording as cv-orbit.js:255). Never list or pre-select a
   model.
6. No add path: the only action is "Shop this case" to the product page (:77). See Motion opportunities 1 for a
   quick-pick button (colour and phone chosen by the shopper).
7. Hard-coded English: sr "Was " (:74), editor message (:149), `aria-label` defaults in schema are fine. Move "Was"
   and "From" to locales.
8. Copy has no dashes (the only em dash is in the dev comment :2). No candy-as-product: the peppermint is the needle
   hub (decoration). No Halo copy.
9. Eyebrow "The case wheel" (:159) above the heading: DESIGN.md:198 discourages an eyebrow on every heading; optional
   to blank by default.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Product titles, photos, prices, compare-at (only when higher than price) | :71-74, :110, :141 | LIVE (product data) |
| Count "01 / 20" | :69 | LIVE (count of products with photos) |
| "Every case in the shop on one dial." | schema :161 | UNBACKED when limit < product count or a collection is set (finding 1) |
| "Can't choose? Spin for it." | schema :160 | No claim |

## Motion inventory

- `data-cv-*` shared attributes: none. Section attributes: `data-cvwh` + `data-autoplay`, `data-hold` (:42-44),
  `data-cvwh-title` (:51), `-ticket` (:66), `-count` (:69), `-name` (:71), `-price` (:73), `-was`, `-was-value`
  (:74), `-shop` (:77), `-spin` (:79, `hidden` until JS), `-dial` (:89), `-ring` (:96), `-case` (:104), `-needle`
  (:118), `-three` (:122), `-auto` (:125, `hidden` until JS), `-items` JSON (:134).
- Motion JS `assets/cv-case-wheel.js` (ES module):
  - Needle swing to a tapped/hovered case, `back.out(1.6)` 0.85 s (:371); ticket swap out/in with `back.out(2.2)`
    (:320-330); peg click on each passed case (:291-295).
  - Spin: lift, 3+ turns `power4.out`, bounce drop (timeline :389+).
  - Entrance (ScrollTrigger once): heading SplitText words, copy rises, cards deal round clockwise, needle sweeps a
    full turn (:527-581).
  - Autoplay: delayedCall loop, waits for hover, keyboard focus, recent pick, pause button, offscreen (35%
    IntersectionObserver), hidden tab (:451-524). Pause button with labels from settings.
  - three.js needle built on idle-after-load or when 300 px near (:584-596; `whenIdleOrNear` :63-86), WebGL probe
    releases its context (:37-47).
- GSAP plugins: core, ScrollTrigger, SplitText (guarded).
- Reduced motion: `animate()` false -> needle jumps, no spin/deal/autoplay; three.js not built (:262, :584);
  CSS removes transitions (cv-case-wheel.css:196-199). Read live per call (`reduceQuery.matches`), but the entrance
  and three.js decisions are made once at init.
- No-JS: dial, ring, first case ticket and link render; spin and pause buttons stay `hidden`. Good.
- JS start state hides the ticket (name, price, Shop button) until the copy trigger fires (`gsap.set(copy,
  { opacity: 0 })`, :536) with no timeout fallback.
- Theme editor: `shopify:section:load` (boot) and `:unload` (destroy) (:612-617). Missing `:select` finish and a
  `ScrollTrigger.refresh()` after boot.
- Keyboard: ring is one tab stop with arrows/Home/End/Enter (header :23-24); autoplay picks are not announced
  (`aria-live` off), shopper picks are (:318-319). Good.

## Motion opportunities

High value
1. Quick add from the ticket (commerce): add a second button "Choose colour and phone" with
   `data-cvqp-open data-handle="{{ first.handle }}" data-url="{{ first.url }}"` (pattern: snippets/cv-card.liquid:79),
   add `"handle"` and `"available"` to the JSON (:141), and update the button's `data-handle` / `data-url` in
   `fillTicket` (cv-case-wheel.js:305-314). The literal attribute in the server render makes the layout load the quick
   pick dialog and script (layout/theme.liquid:208-210, :295-297). On the `cv:cart` document event: needle "ding"
   (lift 0.3 then bounce, 420 ms) and a ticket stamp "In your bag" (scale 1.3 -> 1, rotation -8 -> -3,
   `back.out(2)`), then cart.js opens the drawer. No guessed model, ever.
2. "Made for N phone models" line on the ticket (finding 5), swapped with the existing ticket animation.
3. Do not hide price and CTA before the entrance: animate only the eyebrow/title/text and the cards; keep the ticket
   visible (or add the pending-class pattern with a 1400 ms fallback). Add a `gsap.delayedCall(3, ...)` safety that
   reveals everything if the trigger has not fired.

Medium
4. Landing delight on a spin: the chosen card gets a short ring "stamp" (scale 1.15 -> 1, 240 ms) and the ticket
   price rolls (digits slide) once; keep it under 420 ms, skip under reduced motion.
5. Editor: `shopify:section:select` -> stop autoplay and jump the entrance to its end; `ScrollTrigger.refresh()`
   after boot.
6. Build the three.js needle only when near (drop the idle path) so the home page does not open a WebGL context for
   shoppers who never scroll that far.

Low
7. Scroll-linked dial tilt (scrub `rotationX` 6 deg -> 0 as it enters), offscreen idle.

## Risks

- Runtime three.js import from `cdn.jsdelivr.net` (cv-case-wheel.js:28) is a theme-wide pattern; a self-hosted
  `assets/three.module.min.js` exists. Do not add new CDN imports; switching is a cross-cutting decision.
- Autoplay spin is auto-running motion: keep the pause button, offscreen and hidden-tab pauses, and reduced-motion off.
- Placing it requires a template edit (shared JSON); index.json has 4 slots left.
- A product loop of up to 32 items runs three times in Liquid (:32, :55, :98, plus :137); fine at this size.
