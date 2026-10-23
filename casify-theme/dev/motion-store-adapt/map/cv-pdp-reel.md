# cv-pdp-reel ("Product: photo reel")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json` (grep for `"type": "cv-pdp-reel"` returns nothing).
`enabled_on: product` (sections/cv-pdp-reel.liquid:66), preset "Product: photo reel" (:65), so the merchant can add it
to `product.json` / `product.convert.json` from the editor. Note `product.json` already has 22 sections (cap 25,
PRODUCT.md:65), so placing it may need another section removed.

## Purpose

Rebuild of the home "customer clips" section for the product page, using the product's OWN photos on a film strip
(sections/cv-pdp-reel.liquid:1-8). Hidden when the product has fewer than 3 images (:22). On wide screens
`cv-pdp-home-motion.js` pins the section and scrubs the strip sideways; elsewhere the strip is a native scroll-snap
row with a live "n / N" counter.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-reel.liquid`

Shared (do NOT edit from a parallel per-section agent without coordination):
- `assets/cv-pdp-story.css` (printed by 18 cv-pdp-* sections; :9)
- `assets/cv-pdp-home.css` (12 sections; reel rules at cv-pdp-home.css:295-325, 661-662 are reel-only but the file is shared)
- `assets/cv-pdp-home-motion.js` (loaded for every product template, layout/theme.liquid:322). The reel block
  cv-pdp-home-motion.js:280-325 is reel-only; the file also drives ribbon, trust, spotlight, value, compare,
  journey, snap, showcase, row, promises, ugc.
- `assets/cv-pdp-story.js` (layout/theme.liquid:306). Reel counter for hand scrolling at cv-pdp-story.js:260-283.
- `layout/theme.liquid` (no reel-specific gate; scripts load by `template.name == 'product'`).

Recommendation for parallel work: put any NEW reel motion in a new owned file `assets/cv-pdp-reel-motion.js`
printed by the section itself (`<script src="{{ 'cv-pdp-reel-motion.js' | asset_url }}" defer></script>`), the same way
other sections print their own scripts (MOTION-SYSTEM.md 1.3). Removing the reel block from cv-pdp-home-motion.js
is a shared-file edit and must be done by whoever owns that file.

## Store adaptation findings

1. Alt text is the same on every frame. sections/cv-pdp-reel.liquid:43 uses `alt: pic.alt | default: product.title`,
   and PRODUCT.md:30 says product images carry no alt text, so 10 frames all read "<product title>". Fix: when
   `pic.alt` is blank, use `product.title | append: ', photo ' | append: n | append: ' of ' | append: shown`
   (escaped). Keep the merchant alt when present.
2. Media choice is loose. :15 and :37 accept `media.media_type == 'image' or media.preview_image`, so a product
   video or 3D model contributes its poster frame as a "photo". Lede default (:62) says "Every frame on this strip
   is one of this product's own photos": still true (posters are the product's own), but if strictness matters,
   restrict to `media.media_type == 'image'`.
3. Variant photos are not linked to the buy box. Frames are plain figures. Products have 44 to 81 variants with a
   style/colour option (PRODUCT.md:15, :31). Fix (optional, commerce): when a frame's `media.id` equals some
   `variant.featured_media.id`, print `data-cvw-reel-colour="{{ variant.options[style_oi] | escape }}"` and a small
   "Choose this colour" button that dispatches `cvs:choose` `{ index: style_oi, value }` on `[data-cv-pdp]` (the
   contract cv-pdp-video-reviews.js:491 already uses). Never choose the model option this way (PRODUCT.md:110).
4. Lede copy assumes the pinned desktop behaviour: "Scroll to run the reel." (:62). On phones, tablets and under
   reduced motion the page scroll does not move the strip; the shopper must swipe sideways. Fix default to
   "Every frame on this strip is one of this product's own photos. Scroll or swipe to run the reel."
5. No visible scroll affordance when not pinned. `scrollbar-width: none` and `::-webkit-scrollbar { display:none }`
   (cv-pdp-home.css:302, 305) hide the scrollbar, and there are no prev/next buttons. A mouse user without a
   trackpad (reduced motion, or widths under 990px with a mouse) has only keyboard focus (:32 `tabindex="0"`).
   Fix: add prev/next buttons like cv-pdp-snap's (`data-cvw-snap` prev/next, cv-pdp-story.js:285-300), scoped to
   `[data-cvw-reel]`, hidden while `.is-pinned`.
6. Hard-coded English: figcaption "n / N" (:45) and the aria-label suffix "photos, scroll sideways" (:32) are not
   settings or locale keys. Low priority; move the aria suffix to a setting if i18n is needed.
7. Copy check: heading "The case in its own photos" (:61) and lede (:62) are on-brand (product = case), no dashes,
   no candy-as-product. Range `limit` 3 to 16 (:63) caps the strip (some products have ~50 images, PRODUCT.md:30).

## Claims register

| Claim (shopper-facing) | Where | Status |
|---|---|---|
| "Every frame on this strip is one of this product's own photos" | schema default :62 | BACKED by construction: frames come only from `product.media` (:35-49) |
| Photo count "N" / "n / N" | :28, :45 | LIVE (count of product media, capped by setting) |

No ratings, counts, guarantees or performance claims.

## Motion inventory

- data-cv-* attributes: none. Section hooks are its own: `data-cvw-reel`, `data-cvw-reel-viewport`,
  `data-cvw-reel-strip`, `data-cvw-reel-frame`, `data-cvw-reel-now` (:23, :28, :32, :33, :40).
- Section motion (cv-pdp-home-motion.js:280-325), inside a `gsap.matchMedia()` context (:75-77):
  - wide (>= 990px): adds `.is-pinned`, ScrollTrigger `pin: true, scrub: 0.7`, strip `x` to `-distance()`,
    `invalidateOnRefresh`, counter updated in `onUpdate`, strip skews with scroll velocity via `gsap.quickTo`
    (clamped +/-6deg), settles on `scrollEnd`; each image pans `xPercent 5 -> -5` with `containerAnimation`.
  - narrow: frames fade/rise/rotate in once (`back.out(1.6)`, stagger 0.07) at `top 75%`.
- Hand-scroll counter: cv-pdp-story.js:260-283 (rAF-throttled, passive).
- GSAP plugins: core + ScrollTrigger only (containerAnimation is core ScrollTrigger).
- Reduced motion: whole file returns early (cv-pdp-home-motion.js:69); strip stays a native scroll-snap row.
- No-JS: fully readable (static strip, scroll-snap, all images present, lazy loaded). Counter shows "1" (static).
- Theme editor: no `shopify:section:load/unload` handling in cv-pdp-home-motion.js (only `load` refresh at :499).
  A reel added in the editor stays static (safe, visible). A re-rendered reel loses its pin while the old pin spacer
  can remain until refresh. matchMedia revert cleans up on breakpoint change (:321-324).

## Motion opportunities

1. HIGH: Film-strip entrance on wide screens before the pin starts: sprocket rows (`.cvw-reel__strip::before/::after`)
   cannot be tweened as pseudo-elements; add two real `<span class="cvw-reel__holes" aria-hidden="true">` and draw
   them in (`scaleX 0 -> 1`, 420ms soft-out), then the first frame "develops" (filter `sepia(.6) brightness(1.3)` to
   none, 420ms). Use ScrollTrigger `once` at `top 80%`, CSS final state is the default.
2. HIGH: Progress cue while pinned: a thin brass progress line under the strip scrubbed with the same
   ScrollTrigger (`scaleX: self.progress`), and the counter digit flips (yPercent flip, house pattern
   cv-pdp-counter-motion.js:208) instead of a plain text swap.
3. MEDIUM: Cap the pin length: with 16 frames the pinned scroll is about 16 x 400px. Use
   `end: '+=' + Math.min(distance(), innerHeight * 3)` and speed the strip accordingly, or lower the default limit.
4. MEDIUM (commerce): "Choose this colour" on variant photos (finding 3) with a stamp animation on the button and
   the buy box answering through `cvs:change` (no new commerce code; listen, never own: MOTION-SYSTEM.md 4.9).
5. LOW: Scroll-to-buy chip at the end of the reel: `data-cv-scroll-to-buy` (cv-motion.js attribute, :235-241) on a
   "Choose your phone" button so the reel hands the shopper back to the buy box.
6. Reduced motion: keep current behaviour (no pin, no skew). No-JS: unchanged.

## Risks

- Pinning plus `anticipatePin` interacts with every ScrollTrigger below it; any reel change must call
  `ScrollTrigger.refresh()` after images load (already done on `load`, :499). Late-loading lazy images change
  `strip.scrollWidth`; `invalidateOnRefresh` covers it only on refresh.
- The reel block lives in a shared file. Two agents editing cv-pdp-home-motion.js in parallel will conflict.
- Skew on a strip of product photos must stay subtle (+/-6deg max today); product photography must stay the
  sharpest object (DESIGN.md Do's).
- Placement needs a free slot in product.json (22 of 25 used).
