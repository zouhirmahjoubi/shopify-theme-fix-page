# cv-pdp-journey ("Product: order journey")

## Status

Live.
- `templates/product.json:514`: section key `journey`, 11th of 22 in `order` (after `before_after`, before `scrolling_reviews`).
- `templates/product.convert.json:313`: section key `journey`, 12th of 17 (after `compare`, before `reviews`).
- Both templates save the same heading, lede and 5 `stop` blocks (`templates/product.json:520-571`, `templates/product.convert.json:313-345`).
- Scripts: no dedicated loader. Motion comes from `assets/cv-pdp-home-motion.js`, loaded on every product template at `layout/theme.liquid:322`. The schema limits the section to product templates (`sections/cv-pdp-journey.liquid:98`).

## Purpose

This is the order journey, the honest rebuild of the home page's fabricated "12 ft drop" story. It has five numbered stops: pick your exact phone, choose a pack, packed in 1 to 3 business days, free shipping, 30 days to return.
- On screens 990px and wider, GSAP pins the section, and a KIE delivery bicycle (`assets/pdp-home-bicycle.webp`) rides a drawn red road as you scroll. Each stop lights up, and the parcel (`assets/pdp-home-parcel.webp`) drops at the door.
- On narrow screens it is a one-shot entrance.
- Without motion it is a plain numbered list.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-journey.liquid` (100 lines)
- `assets/pdp-home-bicycle.webp` (211 KB). Referenced only here.

Shared (coordinate before editing):
- `assets/cv-pdp-story.css`: base `.cvp__inner`, `.cvp__h2`, `.cvp__lede`. Loaded by 18 sections.
- `assets/cv-pdp-home.css`: journey rules `:267-292`, mobile `:657-660`, reduced motion `:714`. Loaded by 12 sections. The journey's own rule block (`.cvw-journey*`, `.cvw-stop*`) is used only by this section, so editing those selector lines is effectively owned. The file itself is shared.
- `assets/cv-pdp-home-motion.js`: journey block `:234-279`, heading split `:132-140`, shared helpers `:44-73` and the `gsap.matchMedia` wrapper `:75-497`. It drives 11 sections.
- `assets/pdp-home-parcel.webp`: also used by `sections/cv-home-conversion.liquid` (orphan).
- `assets/cv-pdp-story.js`: owns the `[data-cvw-pack]` handler (`:399-404`) and `[data-cvp-back]` (`:398`) if the opportunities below use them.
- GSAP: `snippets/gsap.liquid` (ScrollTrigger, SplitText, MotionPathPlugin, DrawSVGPlugin, CustomBounce on product pages; `layout/theme.liquid:173-184`).
- `templates/product.json` / `templates/product.convert.json` (`journey` key only).

## Store adaptation findings

1. **Pack percentages are typed twice and can drift from the buy box (medium).**
   - Where: stop 2 has "31%" "off each in a 3-pack" and "two or three at 18% or 31% off each" (`templates/product.json:528-531`, `templates/product.convert.json:331-334`, preset `sections/cv-pdp-journey.liquid:91`). The buy box's tier settings hold the same numbers (`templates/product.json:34` = 18, `:45` = 31; markup `sections/cv-product-counter.liquid:588` `data-cv-discount`).
   - They match today. If the merchant changes a tier or the automatic discount, this stop lies.
   - Fix (owned file only): support tokens `[pack2_pct]`, `[pack3_pct]` and `[pack_max_qty]` in `metric`/`body`/`unit`. Render the typed fallback in Liquid (Liquid cannot read another section's settings).
   - Then in motion or story JS, replace each token span from the buy box's `[data-cv-pack][data-cv-qty="2"]` / `[data-cv-qty="3"]` `data-cv-discount`. Mark the token spans `data-cvw-pack-pct="2"` in Liquid.
   - Long-term (shared, coordinate): move pack percentages to a theme setting or shop metafield read by every section.
2. **A "0 phone models" stop can render.**
   - Where: `[models]` becomes `models`, which is 0 when no option matches the heuristic (`:17-24`, `:49-50`).
   - Fix: when `models == 0` and the block's `metric` contains `[models]`, skip the metric span (render title and body only), or skip the stop.
3. **The lede promises a ride that does not exist on most devices.**
   - Where: "Scroll to ride along." (`templates/product.json:571`, `templates/product.convert.json:316`, schema `:71`).
   - Problem: the pinned ride runs only at 990px and above with MotionPathPlugin (`assets/cv-pdp-home-motion.js:248`). Shoppers are largely on mobile (PRODUCT.md:11), and reduced motion and no-JS get a static list.
   - Fix: split the hint into its own `<span class="cvw-journey__hint" data-cvw-journey-hint hidden>`, shown by the motion file only in the `wide` branch. Change the default lede to "What happens after you choose, one stop at a time."
4. **The model detection heuristic is duplicated.** The same loop exists in `sections/cv-pdp-snap.liquid:24-30` and `sections/cv-pdp-showcase.liquid:43-51`. The last matching option wins, and a style value containing "iPhone" can be misread as the model option. Low priority. Prefer an option whose name contains `model|phone|device` before falling back to value sniffing.
5. **The ride has no buy action.** Stop 1 "Pick your exact phone" and stop 2 "Choose your pack" describe actions, but nothing on the card performs them. See Motion opportunities 1 and 2.
6. Clean:
   - "1-3" uses a hyphen-minus, not an en dash. No em or en dashes in the copy.
   - The bicycle and parcel are decorative KIE set pieces (`alt=""`, `:42-43`), not products. No candy shown as product, no prices.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "[models] phone models", "Every phone this case is made for is on the list" | stop 1, from `product.options_with_values` | Backed (store data). |
| "31% off each in a 3-pack", "two or three at 18% or 31% off each", "The saving comes off automatically at checkout" | stop 2 | Backed: PRODUCT.md:33 and :39 (live automatic discounts 18%/31%, min qty 2/3, checked 2026-09-15), matching the buy box tiers `templates/product.json:34,45`. Typed text, so it can drift (finding 1). |
| "1-3 business days", "leaves the shop within 1 to 3 business days" | stop 3 | Backed: PRODUCT.md:34. |
| "Free shipping", "free on every order, with no minimum" | stop 4 | Backed: PRODUCT.md:34. |
| "30 days to decide", "30 days to send it back" | stop 5 | Backed: PRODUCT.md:34. The admin return policy was fixed to 30 days on 2026-09-16 (PRODUCT.md log). |

## Motion inventory

- `data-cv-*` attributes: none. It uses `cvw` hooks: `data-cvw-journey`, `data-cvw-journey-pin`, `data-cvw-split` (heading), `data-cvw-road`, `data-cvw-bike`, `data-cvw-parcel` and `data-cvw-stop`.
- Heading: SplitText chars "candy drop" (random rotation, `cvwDrop` CustomBounce) at `top 86%` (`assets/cv-pdp-home-motion.js:132-140`).
- Wide (990px and up) signature, `:248-266`:
  - The pin is scrubbed (`scrub: 0.8`) over `stops.length * 62%` of the viewport, which is 310% for 5 stops.
  - DrawSVG draws the road, MotionPathPlugin drives the bike along `.cvw-journey__road-bed`, and `pedal` wobbles it only while scroll velocity is above 20.
  - The parcel drops at progress 0.86, and stops get `.is-lit` by progress (`light()`, `:243-246`).
  - `onLeaveBack` clears the lit state.
- Narrow, `:267-276`: stops are set to `opacity 0, x -30`. Then a one-shot timeline at `top 72%`: the bike slides in, the stops stagger in, the road draws, the parcel drops, and everything lights.
- Reduced motion: the whole file returns early (`:41-42`), leaving the static list. CSS kills the `.cvw-stop` transitions (`assets/cv-pdp-home.css:714`).
- No-JS: a readable numbered list, the bike at left, the parcel at right, the road fully stroked.
- Theme editor: **none**. `cv-pdp-home-motion.js` has zero `shopify:` listeners. A re-rendered journey gets no motion, and the old pin's ScrollTrigger and pin-spacer stay alive until reload.
- Breakpoint change: `gsap.matchMedia` reverts the tweens and triggers.

## Motion opportunities

1. **High: "Choose your pack" stop becomes a working pack picker.**
   - Add an optional block setting `action` (select: none / pack / phone).
   - For `pack`, render `<button type="button" class="cvw-stop__act" data-cvw-pack="3">Choose the 3-pack</button>`. `assets/cv-pdp-story.js:399-404` already dispatches `cvs:pack` to the buy box and calls `backToSlip()` (smooth scroll, or `auto` under reduced motion, then it focuses Add to bag). No new JS.
   - Motion: when the bike reaches that stop, pulse the button once (`scale 1 -> 1.06 -> 1`, 240ms, `back.out`) inside the wide timeline.
2. **High: "Pick your exact phone" stop.** For `action: phone`, render a `data-cvp-back` button, "Choose my phone" (handled at `assets/cv-pdp-story.js:398`). For no-JS, use `<a href="#cvAddForm">`.
3. **Medium: shorten the scroll tax.** 310% viewport of pinning on a 22-section page is long. Make the per-stop distance a section setting (`pin_per_stop`, 30 to 70, default 40) passed as `data-cvw-journey-len`, and read it at `:253`. Also refresh on `document.fonts.ready`, because the pin height depends on Playfair (MOTION-SYSTEM.md 4.8).
4. **Medium: mobile scrub without a pin.** On narrow screens, light stops one by one with `ScrollTrigger.batch(stops, { start: 'top 85%', once: true })` instead of all at once at `top 72%`. Move the bike along `xPercent` with `scrub: true` across the section, with no pin.
5. **Medium (shared file, coordinate): editor safety.** Add `shopify:section:load` / `unload` handling to `cv-pdp-home-motion.js`, following MOTION-SYSTEM.md 4.6. Per-root init and destroy would kill the journey pin on unload and re-init on load. This benefits all 11 `cvw` sections, so one agent should own it.
6. **Low: parcel landing stamp.** When the parcel lands, stamp stop 5's metric "30" with a red rubber-stamp scale-in. Use CSS `.is-stamped` toggled by the timeline, with no new asset.

## Risks

- **Ownership:** only the section Liquid and the bicycle asset are owned. Every motion change lives in `assets/cv-pdp-home-motion.js` (shared by 11 sections) and every style change in `assets/cv-pdp-home.css` (12 sections). Edits there must stay inside the journey block (`:234-279` JS, `:267-292` / `:657-660` CSS) or be coordinated.
- **Pinning:** the pin interacts with later ScrollTriggers (reviews, showcase). Changing its length shifts every downstream trigger, so always call `ScrollTrigger.refresh()`.
- **Event order:** `data-cvw-pack` buttons rely on `cv-pdp-story.js` being loaded (product template only, `layout/theme.liquid:306`). The section is `enabled_on` product only, so this is safe.
- **Tokens:** token replacement for pack percentages must keep the typed fallback as the no-JS text, and must never show an empty value.
