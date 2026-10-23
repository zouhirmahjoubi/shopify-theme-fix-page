# cv-pdp-snap ("Product: snapshots")

## Status

Live on one template only.
- `templates/product.convert.json:160`: key `snap`, 4th of 17 (after `clips`, before `trust`), right under the buy box area.
- Not placed in `templates/product.json`.
- Saved settings: `templates/product.convert.json:160-173`, with `limit 5`, `pack_qty 3`, `pack_pct 31` and the default pull-quote.
- The section renders only when the product has 3 or more image or preview media (`sections/cv-pdp-snap.liquid:15-21`, `:33`).
- Behaviour (prev/next) comes from `assets/cv-pdp-story.js:285-298`. Motion comes from `assets/cv-pdp-home-motion.js:328-360`. Both are loaded on product templates (`layout/theme.liquid:306`, `:322`).

## Purpose

A gallery band for under the main images: up to 8 of this product's own photos, clipped with a KIE clothespin (`assets/pdp-home-clothespin.webp`) on a drawn twine line. The strip scrolls horizontally with scroll-snap and has prev/next buttons. Beside it sit a shop-copy pull-quote and three facts: phone-model count (from options), pack size and pack discount (from this section's settings).

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-snap.liquid` (132 lines)
- `assets/pdp-home-clothespin.webp` (249 KB). Referenced only here.
- In shared files, these selector blocks are used only by this section: `.cvw-snap*` in `assets/cv-pdp-home.css:330-382`, `:645-646` and `:701-703`.

Shared (coordinate before editing):
- `assets/cv-pdp-story.css` (18 sections).
- `assets/cv-pdp-home.css` (12 sections).
- `assets/cv-pdp-home-motion.js`: snap block `:328-360`, heading split `:132-140`.
- `assets/cv-pdp-story.js`: snap nav `:285-298`.
- `snippets/cv-icon.liquid`: `arrow-right`, `quote`, `device` (with an infinite `cv-ico__pulse`), `gift`, `price-tag`; 53 users.
- `assets/theme.css`: `.cv-ico--anim` keyframes `:992-998`, reduced-motion override `:3228-3231`.
- `templates/product.convert.json` (`snap` key only).

## Store adaptation findings

1. **The pull-quote makes an unbacked performance claim and looks like a testimonial (high).**
   - Where: "Cut for your exact phone, not a size that's "close enough." Slim in the hand, tough where it counts." (schema default `sections/cv-pdp-snap.liquid:121`; saved in `templates/product.convert.json:167`).
   - "Slim in the hand, tough where it counts" is a protection and thinness claim applied to every product on the template, including clear PC, fabric, chain crossbody and lens film. PRODUCT.md:19 says "Product performance is not a store-wide claim", and PRODUCT.md:104 lists profile and drop claims as unverified.
   - It also renders as a `<blockquote>` with a big quote-mark icon (`:76-79`), so shoppers can read it as a customer review. DESIGN.md:197 forbids inventing review-like content.
   - Fix:
     - Change the default to product-true copy built from data, for example "Cut for your exact phone, from a list of [models] models.", with a `[models]` token (same replace as `sections/cv-pdp-journey.liquid:49-50`).
     - Restyle as a shop sign (no quote mark; use a ticket or label treatment), and use `<p class="cvw-snap__note">` instead of `blockquote`.
     - Optionally prefer a product metafield `custom.tagline` when present.
     - The saved template value must change too (`templates/product.convert.json:167`).
2. **The pack facts are typed into this section and the wording is wrong.**
   - The section comment claims the facts are "read from this product and the store's live pack settings" (`:6-8`). In fact `pack_qty` and `pack_pct` are this section's own settings (`:124-127`), duplicating the buy box tiers (`templates/product.convert.json:49-61` = 18 / 31).
   - "3 cases in this pack" (`pack_label` default `:125`) implies the product on the page is a 3-pack. It is a single case with pack tiers.
   - Fix:
     - Labels: "cases in the biggest pack" or "cases, mix and match". For the discount: "off each case in a 3-pack, no code".
     - Bind to the buy box: render the typed values as the no-JS fallback, mark them `data-cvw-pack-pct="3"`, and replace them from the buy box `[data-cv-pack][data-cv-qty="3"]` `data-cv-discount` in JS. This is the same token mechanism as the journey and guarantee maps, so build it once.
     - Correct the comment.
3. **The editor info text contains em dashes.** `:120` ("…not a customer review — no name…") and `:122` ("…below — nothing is invented."). They are merchant-facing; replace them with full stops. The dev comment `:5-6` has one too (not shipped).
4. **Every photo gets the same alt text.**
   - Where: `alt: pic.alt | default: product.title` (`:59`) gives up to 8 identical alts, and product images have no alt text (PRODUCT.md:32).
   - Fix: `alt: pic.alt | default: product.title | append: ', photo ' | append: n | append: ' of ' | append: shown`.
5. **The nav buttons are below the touch target.**
   - Where: 38px at 540px and below (`assets/cv-pdp-home.css:701`, `.cvw-snap__nav { width: 38px; height: 38px; }`). DESIGN.md:136 requires at least 44px.
   - Fix: keep 44px, and shrink the frame width instead.
   - The nav buttons are inert without JS and never disabled at the ends. Add `hidden` in Liquid and unhide them in JS, and toggle `disabled` from the viewport `scrollLeft`.
6. **Smooth scroll ignores reduced motion.** `viewport.scrollBy({ behavior: 'smooth' })` (`assets/cv-pdp-story.js:295`). Use `reduce ? 'auto' : 'smooth'`; `reduce` is already in scope at `:23`.
7. **The clothespin image is heavy.** A 992x264, 249 KB image is shown at 46px wide, repeated up to 8 times (same URL, so one download). Use `{{ 'pdp-home-clothespin.webp' | asset_img_url: '120x' }}` with `width="120" height="32"`, or ship a small dedicated asset.
8. **Hardcoded English strings.** The region aria-label "…: N photos" (`:47`). Low priority.
9. Clean:
   - Photos are the product's own media.
   - The model count comes from options and is hidden when 0 (`:83`).
   - No prices or currency.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "[N] phone models made for" | `options_with_values` (`:23-30`, `:83-89`) | Backed (store data). |
| "Cut for your exact phone, not a size that's close enough" | pull-quote | Backed qualitatively (per-model variants). |
| "Slim in the hand, tough where it counts." | pull-quote | **Unbacked**: a store-wide performance claim (PRODUCT.md:19, :104). |
| "3 cases in this pack" | `pack_qty` setting | Typed. The tier exists (PRODUCT.md:39), but "in this pack" is misleading (finding 2). |
| "31% off the pack, no code" | `pack_pct` setting | Backed today by PRODUCT.md:33, :39 (automatic 31% at qty 3). Typed, so it can drift. |

## Motion inventory

- `data-cv-*` attributes: none. It uses `cvw` hooks `data-cvw-snap`, `data-cvw-split` (heading), `data-cvw-snap-nav`, `data-cvw-snap-viewport`, `data-cvw-snap-line`, `data-cvw-snap-strip`, `data-cvw-snap-frame`, `data-cvw-quote` and `data-cvw-snap-stats`. Icons use `cv-icon … animate: true` (`:85`, `:92`, `:99`).
- Heading: SplitText chars candy drop (`assets/cv-pdp-home-motion.js:132-140`).
- Snap block `:328-360`:
  - Pins are set to `scale 0`, photos to `opacity 0, y -22`, and the quote and stats are hidden.
  - At `top 78%` a timeline runs: DrawSVG draws the twine (0.7 s), then the pins pop with `cvwDrop` (stagger 0.12), then the photos drop in, then the quote and stats rise.
  - Then every photo **sways forever** (rotation ±1.6, 2.8 s yoyo, `repeat: -1`, `:352-357`).
- CSS: the `device` icon pulses forever (`assets/theme.css:996`), and the reduced-motion override covers it (`:3228-3231`).
- Behaviour: prev/next `scrollBy` with a smooth scroll (`assets/cv-pdp-story.js:291-296`). Native scroll-snap and keyboard focus are on the viewport (`tabindex=0`, `role=region`).
- Reduced motion: the motion file returns early, so everything is static. The device pulse is removed by CSS. The nav smooth scroll is not (finding 6).
- No-JS: the strip is fully visible and scrollable by touch or trackpad. The nav buttons are visible but inert.
- Theme editor: no `shopify:` handling.
- Policy gaps: the infinite sway has no offscreen pause and no pause control (DESIGN.md:183, :192), and the gsap.set start states stay hidden if the ScrollTrigger never fires (an edge case).

## Motion opportunities

1. **High: pack fact becomes a pack picker.** Make the discount stat a button: `<button type="button" class="cvw-snap__stat is-action" data-cvw-pack="3">`. The existing handler (`assets/cv-pdp-story.js:399-404`) selects the 3-pack in the buy box via `cvs:pack` and scrolls there. Motion: the price-tag stamp wiggles once (`cvwWiggle`) when the stat enters, and presses on hover. No new JS. The section sits 4th on the Shop Counter template, close to the buy box.
2. **High: tap a snapshot to open it in the main gallery.** On click, scroll to the buy box gallery and select that photo. The buy box emits `cvs:photo` (`assets/cv-product.js:567`). Check whether it accepts a select event; otherwise click the matching gallery thumb by index. This is a shared contract, so coordinate.
3. **Medium: bound the sway.** Pause it offscreen with a ScrollTrigger `onToggle` on the section, or run 2 cycles and settle. Optionally sway on the strip's own horizontal scroll velocity instead of forever.
4. **Medium: count-up stats.** Count the model count and pack percentage up when the stats enter: GSAP `snap: { textContent: 1 }` on the `<b>`, or `data-cv-count`. The final value stays in the markup for no-JS. Under reduced motion it is static (cv-motion already handles this, `assets/cv-motion.js:103-106`). Do not combine with the stats' GSAP rise on the same node (MOTION-SYSTEM.md section 7, item 4).
5. **Low: strip drag inertia.** Draggable and Inertia are not loaded on product pages (`layout/theme.liquid:169-172` only for `data-cvtr`), and native scroll-snap already works. Skip.

## Risks

- **Ownership:** only the Liquid and the clothespin asset are owned. Motion, nav and styles are in files shared with 11 to 18 sections, so edits must stay in the snap blocks or be coordinated.
- **Placement:** the section is on `product.convert.json` only. Any copy fix must update both the schema default and the saved value at `templates/product.convert.json:167`, `:169-172`.
- **Copy approval:** changing the pull-quote removes a merchant-visible line. It was not explicitly approved as kept-as-is (unlike cv-showcase and cv-value-stack, PRODUCT.md log 2026-09-15), but confirm the new wording with the merchant.
- **Pack picker:** turning the stat into a pack picker depends on `cvs:pack` being handled by the buy box (`assets/cv-product.js:536` per the carousel map). Both templates use `cv-product-counter`, so this is safe today.
