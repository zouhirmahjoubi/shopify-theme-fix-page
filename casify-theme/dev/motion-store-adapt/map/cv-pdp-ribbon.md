# cv-pdp-ribbon ("Product: service ribbon")

## Status

Live on both product templates:
- `templates/product.json`, key `ribbon`, 5th in `order`.
- `templates/product.convert.json`, key `ribbon`, 7th in `order`.

Both carry three blocks:
- `r-brand`: "iPhone & Samsung cases", "each made for its own list of phones".
- `r-packs`: "Packs of 2 and 3", "save 18% or 31% on each case".
- `r-est`: "Est. 1920", "the candy-shop counter, online".

## Purpose

A candy-stripe band of short brand facts (the home trust bar, rebuilt). The service promises are stated once elsewhere (cv-pdp-guarantee), so the band carries brand and packs (`sections/cv-pdp-ribbon.liquid:1-6`). Motion turns it into a scroll-reactive marquee; without motion it is a still, wrapped row.

## Files (owned / shared)

Owned:
- `sections/cv-pdp-ribbon.liquid`. Nothing else is ribbon-only.

Shared:
- `assets/cv-pdp-home.css`:
  - `.cvw:not(.cvw-ribbon)` at `:26`.
  - Ribbon rules at `:61-85`.
  - Mobile at `:677-680`.
  - `.cvw` base rules. Tagged by 12 sections.
- `assets/cv-pdp-home-motion.js`: the marquee `:80-116`, the global guard `:42`, `mm` matchMedia `:75-76`.
- `snippets/cv-icon.liquid`: block icons plus the `twist-wrapper` separator.
- `assets/cv-pdp-story.js:399-402`: an existing `[data-cvw-pack]` → `cvs:pack` bridge, usable by the ribbon (see opportunities).

## Store adaptation findings

1. **The pack percentages are hardcoded copy.**
   - "save 18% or 31% on each case" appears in both templates and the schema preset (`:150`).
   - True today: the live automatic discounts (PRODUCT.md:39) and the buy box tiers (`templates/product.json` tier-2 `discount_pct` 18, tier-3 31).
   - But the figure is typed in three places, so it goes stale when tiers change.
   - Fix (owned): support tokens `[pct2]` and `[pct3]` in `body`, with the typed text as the static state. Add an owned script `assets/cv-pdp-ribbon.js` (tagged from the section with `defer`) that replaces the tokens from `document.querySelectorAll('[data-cv-pack][data-cv-discount]')`. If no buy box is found, keep the static text.
2. **"Est. 1920" is presented as a fact.**
   - The section comment says the band carries "a few true things about the shop" (`:2`), and the schema `info` says "Only what is true." (`:140`).
   - "Est. 1920" is the brand voice (PRODUCT.md Brand Commitments: "Est. 1920"), not a verified founding date.
   - Fix: flag it to the merchant. Suggested replacement on real data: `Made for {{ model_count }} phone models` from the product's model option, or "case designs" from `collections.all.products_count` (the precedent in PRODUCT.md:42). If the merchant keeps the voice line, phrase it as style: "A 1920s shop counter, online".
3. **The "Est. 1920" body plus the lollipop icon read close to selling sweets.**
   - "the candy-shop counter, online" with the `lollipop` icon (`:138`, preset `:151`).
   - Low risk, since it is the metaphor and not a product, but tighten it: "phone cases from the old shop counter" with the `bow` or `device` icon.
4. **Editor defaults duplicate copy and allow empty items.**
   - A newly added block defaults to "iPhone & Samsung cases" / "each made for its own list of phones" (`:140-141`), duplicating `r-brand`.
   - An item with an empty title still renders an `<li>` plus a separator (`:104-110`).
   - Fix: guard with `{%- if b.settings.title != blank -%}`, and change the new-block defaults to a confirmed fact that is not on this band ("Packs of 2 and 3").
5. **"iPhone & Samsung cases" is store-level static text.**
   - True for the catalog, but it is not bound to the product. On an iPhone-only product it still reads as a store fact. Acceptable.
   - Optional: add a product-bound item, e.g. "Made for [n] phone models", from `product.options_with_values` using the same model-option detection as `cv-pdp-fit.liquid:169-185`.
6. **Accessibility: an auto-running marquee with no pause** (see Motion inventory). DESIGN.md requires "an explicit pause path when it auto-runs", and WCAG 2.2.2 applies.
7. **Clean:** no em or en dashes, no other brand, no prices.

## Claims register

| Claim | Source | Status |
|---|---|---|
| "iPhone & Samsung cases, each made for its own list of phones" | Catalog (store data), static text | Backed (static; not product-bound) |
| "Packs of 2 and 3, save 18% or 31% on each case" | Live automatic discounts "18% / 31% off entire order, min qty 2 / 3, all items" (PRODUCT.md:39). Buy box tiers. | Backed today; **stale-risk** (hardcoded, finding 1) |
| "Est. 1920" | Brand voice (PRODUCT.md Brand Commitments) | **Unbacked as a fact** (finding 2); brand fiction |
| "the candy-shop counter, online" | Metaphor | No factual claim |

## Motion inventory

- **cv-motion attributes (`data-cv-*`):** none. Hooks: `data-cvw-ribbon`, `data-cvw-ribbon-track`.
- **Marquee** (`cv-pdp-home-motion.js:80-116`):
  - Clones the items twice (clones get `aria-hidden` and lose `data-shopify-editor-block`).
  - Adds `.is-marquee` and runs an infinite `xPercent -33.3` loop (34 s wide, 24 s narrow).
  - A ScrollTrigger pauses the loop off screen (`onToggle`) and maps scroll velocity to `timeScale` (±6) and band `skewX` (±8°).
  - On `scrollEnd` it settles back to speed ±1.
  - The whole thing sits in `gsap.matchMedia` with a cleanup.
- **GSAP plugins used:** ScrollTrigger.
- **Reduced motion:** the whole file exits (`:42`). The ribbon stays the static wrapped row (`cv-pdp-home.css:83-85`; mobile hides the body text `:678`).
- **No-JS:** the static wrapped row. Separators are hidden when not in marquee mode (`:84`).
- **Pause:** off screen only. **No user pause, and no hover or focus pause.** The marquee runs indefinitely while visible, which violates WCAG 2.2.2 and the DESIGN.md "explicit pause path" rule.
- **Theme editor:** no `shopify:section:load` handling. After a re-render the marquee does not restart until reload, and the old clones are gone with the old DOM.

## Motion opportunities

1. **HIGH (a11y and polish): Pause path.** Pick one:
   - (a) Add an owned pause toggle in the markup: a `button[data-cvw-ribbon-pause]` with `aria-pressed`, visible only when `.is-marquee`. The shared marquee code would honour it with `loop.pause()`.
   - (b) Make the motion scroll-linked only: no idle auto-run, the track moves only with scroll velocity and rests when scrolling stops.
   - Either way, add pause on `pointerenter` and `focusin`.
   - This touches the shared `cv-pdp-home-motion.js:96-116`. Coordinate, and scope to `[data-cvw-ribbon]`.
2. **MED: Packs item as a bundle entry point.**
   - Render the packs item's title as `<button type="button" data-cvw-pack="2">`. The existing bridge (`cv-pdp-story.js:399-402`) dispatches `cvs:pack` `{qty:2}` to the buy box (`cv-product.js:536`). Then scroll to the buy box packs.
   - Only enable it in static (non-marquee) mode, or while the marquee is paused: moving click targets are poor UX.
   - Motion: the bow icon wiggles (`CustomWiggle` "cvwWiggle", already created at `cv-pdp-home-motion.js:52-53`).
3. **MED: Icon draw-in.** On first entry, draw the `cv-icon` strokes with `DrawSVGPlugin` (loaded on product pages), staggered across the original items only, not the clones.
4. **LOW: Buy box reaction.** On `cvs:change` with `qty >= 2`, flash the packs item gold once (a background tween, 420 ms).
5. **Do not use `data-cv-reveal`.** It hides content without JS (`assets/theme.css:1073`).

## Risks

- The marquee code is in a shared file, and `.cvw` base styles affect 12 sections.
- Clones duplicate any interactive element. If the packs item becomes a button, strip interactivity from the clones (`inert` or `tabindex="-1"` plus `aria-hidden`).
- Token replacement must leave the static text untouched when the buy box is absent (other templates) or JS fails.
