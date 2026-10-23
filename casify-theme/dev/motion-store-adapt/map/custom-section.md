# custom-section ("Custom Section")

Family: shell. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
Severity: H / M / L. Proposed copy below contains no em or en dashes.

## Status

**orphan**: placed in no `templates/*.json` and in neither section group (grep of templates/,
sections/*-group.json, layout/, snippets/, blocks/ finds no reference). The identical file exists in
the live backup copies (`dev/live-check-2026-10-03/sections/custom-section.liquid`, byte-identical),
so the live theme also offers it in "Add section" under the preset name "Custom Section". Git: added
in the import commit `cbbc4fa`, untouched since.

## Purpose

There is no section logic. Line 1 (251,858 characters) is a single
`<div style="margin-right: 69px; margin-bottom: 200px; height: 2px; width: 2px; box-shadow: ...">`
with **13,800 one-pixel box-shadows**: a 200 x 69 bitmap drawn in CSS. Rendered offline (Python, from
the shadow list), it is a teal enamel sign with a cream border, a red peppermint and the words
"BUY NOW", on a **grey and white transparency checkerboard** that was baked into the source image,
with a cropped dark red fragment at the bottom edge. Lines 3-14 are a schema with no settings and one
preset (`"tag": "section"`, `"class": "custom-section"`). It looks like an image-to-CSS conversion of a
"Buy now" sign that was meant to become a button.

## Files (owned / shared)

Owned:
- `sections/custom-section.liquid` (14 lines, 252,049 bytes). Nothing else.

Shared: none today (no stylesheet, script, snippet, asset or locale key).
If rebuilt as proposed below, it would only *read* shared pieces: `snippets/cv-quick-pick.liquid` +
`assets/cv-quick-pick.js` (auto-loaded by layout/theme.liquid:208-209 and :295-296 when
`data-cvqp-open` is in the page), `assets/header-peppermint-red.png`, `assets/theme.css` tokens, and
the GSAP bundle. New files it creates (its own CSS/JS) would be owned.

## Store adaptation findings

1. **H (if placed): a "BUY NOW" that does nothing.** custom-section.liquid:1 is a `<div>` with no link,
   button, product binding or accessible name. A shopper sees a Buy now sign that cannot be clicked;
   screen readers get nothing. Fix: delete the file (preferred while it is unplaced; confirm with the
   merchant since it also exists in the live theme) or rebuild it as a real CTA (opportunities).
2. **H (if placed): baked-in checkerboard.** The bitmap's background is a grey and white transparency
   grid, so on the cream page the sign sits in a grey checkered rectangle. Not fixable in place; the
   rebuild must draw the sign in HTML/CSS (or a transparent asset), never reuse this bitmap.
3. **M: broken box model.** A 2 x 2 px box with `margin-right: 69px; margin-bottom: 200px`
   (custom-section.liquid:1): the 200px-wide drawing overflows sideways into neighbouring content while
   200px of vertical space is reserved for a 69px sign (about 130px of empty gap).
4. **M: page weight and paint cost.** 252 KB of HTML per render (heavier than most whole sections) and
   13,800 shadows to paint on every scroll frame under it.
5. **L: generic editor name.** Schema name "Custom Section", no settings, no info text; nothing tells a
   merchant what it does or which product it sells.
6. No copy, prices, phone models, reviews or other brands beyond the "BUY NOW" pixels.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "BUY NOW" (pixel text) | custom-section.liquid:1 | Not a factual claim; a call to action with no action behind it (finding 1) |

No ratings, counts, guarantees, delivery times or percentages.

## Motion inventory

- cv-motion attributes: none. Section JS: none. GSAP: none. Layout gate: none.
- Reduced motion: not applicable (static). No-JS: the static bitmap shows.
- Theme editor events: none needed today.

## Motion opportunities

Value: **MEDIUM** (it only matters once placed; the high-value Buy now work is in the product buy
boxes, families buybox-counter / buybox-alt). Two clean options:

**Option A (recommended while orphaned): delete** `sections/custom-section.liquid` after the merchant
confirms. Use a whole-file delete; do not run sed or Edit against the 251,858-character line.

**Option B: rebuild in place as a "Buy now sign" CTA** (keep the file name so any placement keeps
working; rename the schema to "Shop sign button"):
- Settings: `product` (product picker), `label` (default "Choose your case", honest because it opens
  the picker; use "Buy now" only if the flow ends at checkout), `style` (teal | red), `align`,
  `show_price` (renders `product.price` with `money`, live).
- Markup, no-JS first: `<a class="cvbs" href="{{ product.url }}" data-cvqp-open
  data-handle="{{ product.handle }}" data-url="{{ product.url }}" data-cvbs>` with the sign drawn in
  CSS (teal plate `--teal-500/600`, cream inset border, aged-gold rivets) and the peppermint from
  `header-peppermint-red.png` (`alt=""`). cv-quick-pick.js delegates clicks on
  `[data-cvqp-open]` and calls `preventDefault` (cv-quick-pick.js:228-229), so with JS the shopper
  chooses colour and phone model first (PRODUCT.md Principle 2, never a pre-selected model) and
  without JS the link opens the product page. Empty state when no product is chosen: render nothing
  for shoppers, a hint in the editor (`request.design_mode`).
- Motion (own `assets/cv-buy-sign.js` + `.css`, printed by the section with
  `<script src=... defer>` so the shared layout needs no edit):
  - entrance, ScrollTrigger once at `top 85%`: sign drops on its cords (yPercent -110, rotation -12
    -> 0, `elastic.out(1, 0.3)`, 1.4s, the footer idiom cv-footer.js:107), peppermint rolls in
    (x 18 -> 0, rotation -180 -> 0, back.out(2)), label settles; start states applied only when the
    sign is below the fold, behind a `cvbs-pending` class with a 1200ms timeout.
  - ambient: gentle sway (rotation +-1.4deg, sine.inOut, yoyo) **only while in view**
    (ScrollTrigger onToggle, cv-footer.js:84-101 pattern); peppermint rests.
  - hover / focus-visible: CustomWiggle swing (`CustomWiggle.create('cvbsWiggle', { wiggles: 5,
    type: 'easeOut' })`) and a quarter-turn mint spin; press: squash 0.12s, elastic release.
  - after add: listen for `cv:cart` (cv-quick-pick.js:58) and stamp a small "In your bag" ticket on
    the sign (scale 1.5 -> 1, rotation -10 -> -3); the header's bag API does the badge (see
    map/header.md opportunity 2).
  - reduced motion: no tweens, sign at rest; theme editor: `shopify:section:load` / `unload` with a
    `gsap.context` revert; `gsap.matchMedia` for preference changes.

## Risks

1. **The file is one 251,858-character line.** Edit tools and `sed` are fragile on it and diffs are
   unreadable; replace the whole file with Write or delete it.
2. **Live theme parity.** The live theme carries the same file. The team ships unpublished themes
   (DECISIONS.md), so deleting it locally does not touch live, but if the merchant placed it in the
   live editor after the backup, the new theme would drop that placement. Re-check live templates
   before removal.
3. **Quick pick is shared.** If rebuilt, never fork cv-quick-pick behaviour; only add the trigger
   attributes. Do not load the orphan `assets/cv-candy-buttons.js` on this sign (MOTION-SYSTEM.md
   section 7 item 8: double handlers).
4. **Honest label.** Quick pick adds to the bag; it does not check out. A sign that says "Buy now" must
   either go to the product page's real Buy now or be labelled for what it does.
