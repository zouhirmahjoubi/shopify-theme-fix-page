# cv-finder ("Convert — Device finder")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. Preset "Convert — Device finder" with four
brand chips (sections/cv-finder.liquid:63-72). No `enabled_on`, so it can be added anywhere. The header comment says
it is meant to sit right under the buy box on a product page (:1-7).

## Purpose

A compatibility band ("does this fit my phone?") of brand chips (name + coverage line) with a footnote and a ghost
button that scrolls back to the buy box (`data-cv-scroll-to-buy`, :34). Static content only; no store data.

## Files (owned / shared)

Owned:
- `sections/cv-finder.liquid` (no section CSS or JS file).

Shared:
- `assets/theme.css` `.cv-finder` (:1008) and `.cv-finder__*` (:1716-1735): selectors used only by this section, in
  the shared stylesheet. Move to an owned `assets/cv-finder.css` when rebuilding.
- `assets/cv-motion.js` (reveal, split, stagger, `data-cv-scroll-to-buy` :235-241, magnetic `.cv-cta`).
- `snippets/cv-icon.liquid` (`device`, `arrow-right`).
- Section scaffolding `.cv-sec`, `.cv-sec__hd`, `.cv-eyebrow`, `.cv-cta` (theme.css).

## Store adaptation findings

1. Invented coverage claim in the heading, with a fallback that resurrects it (HIGH): "Built for 200+ phones, not
   just yours" (schema :47 and Liquid fallback `| default:` at :12). Blanking the setting still prints the claim.
   Fix: remove the `default:` fallback, and default the heading to a live line, e.g.
   "Made for {{ model_count }} phone models" computed from the product (see 4), or "Check your phone fits".
2. Invented manufacturing claim: subheading "Every case is cut from that exact model's CAD file. Here's what we
   cover." (schema :48). Not in Evidence on Hand. Fix: blank default, or "Pick your exact model before you add to
   bag."
3. Wrong product domain and invented counts in the preset (HIGH): chips "iPhone 42 models · 12 to 17 series",
   "Galaxy 38 models · S21 to S25, Z Fold/Flip", "Pixel 21 models · 6 to 10 series", "OnePlus 14 models · 9 to 13
   series" (:67-70) and the block default "42 models · 12 to 17 series" (:58). Casify sells iPhone and some Samsung
   cases only (PRODUCT.md:15); Pixel and OnePlus are not sold; every count is made up. Fix: replace manual chips
   with live data (4); if manual blocks stay, blank defaults and a preset with no blocks.
4. Store binding (rebuild): on a product template, find the model option (STORE-FACTS.md section 4 rule: name
   contains model/phone/device/compatib/applicable, else values match iphone/galaxy/samsung/pixel), loop
   `product.options_with_values[model_oi].values`, group by brand (value contains "iphone" -> iPhone; "galaxy" or
   "samsung" -> Samsung), print each raw value (escaped) as a chip button and a per-brand LIVE count. Off product
   templates, aggregate over a chosen collection (unique normalised model keys, limit 50 products) or hide the
   section. Never pre-select a model.
5. Dead button off the product page: `data-cv-scroll-to-buy` (:34) needs `.cv-buy` or `#cvPdp` (cv-motion.js:237);
   on any other template it does nothing. Fix: on non-product templates render a link to a `cta_link` setting
   (default all products).
6. Footnote "Not on the list? Message us before you order and we'll confirm your fit." (:33, schema :49) is a service
   promise that is not in Evidence on Hand. Keep only if the merchant confirms; link "Message us" to
   `routes.root_url` + `pages/contact` via a url setting rather than plain text.
7. No-JS: `data-cv-reveal` on the header, every chip and the foot (:10, :21, :32) means the whole band is invisible
   without JS (theme.css:1073-1079, MOTION-SYSTEM.md 3.4). It is also never re-scanned after a theme-editor
   re-render (cv-motion.js has no `shopify:section:load`).
8. Em dashes: dev comment :2, :5 and schema name "Convert — Device finder" (:43, :65): editor-facing; rename to
   "Convert: Device finder". The chip separator " · " is fine.
9. Fixed `id="cv-finder"` (:9): duplicates with two instances; nothing links to it.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Built for 200+ phones, not just yours" | :12 fallback, schema :47 | UNBACKED (STORE-FACTS.md 7f) |
| "Every case is cut from that exact model's CAD file." | schema :48 | UNBACKED |
| "42 models · 12 to 17 series" (iPhone) | :58, :67 | UNBACKED |
| "38 models · S21 to S25, Z Fold/Flip" (Galaxy) | :68 | UNBACKED |
| "21 models · 6 to 10 series" (Pixel) | :69 | UNBACKED and wrong domain (not sold) |
| "14 models · 9 to 13 series" (OnePlus) | :70 | UNBACKED and wrong domain (not sold) |
| "Message us before you order and we'll confirm your fit." | :33, schema :49 | UNBACKED service promise (needs merchant OK) |

## Motion inventory

- `data-cv-*` shared attributes: `data-cv-reveal` (:10, :32), `data-cv-reveal="scale"` on each chip with inline
  `--cv-i` (:21), `data-cv-split` (:12), `data-cv-stagger` (:18, redundant because chips set `--cv-i` already),
  `data-cv-scroll-to-buy` (:34). `.cv-cta` magnetic pull. Chip hover lift in CSS (theme.css:1726).
- Section-specific motion JS: none. GSAP: none.
- Reduced motion: cv-motion.js reveals at once (cv-motion.js:158-169); theme.css:3232 forces reveals visible.
- No-JS: invisible (finding 7). Theme editor events: none.

## Motion opportunities

High value
1. Model chips that drive the buy box (product template): each chip is a `<button>` carrying the option index and raw
   value; click dispatches `cvs:choose` with `{ index, value }` on `[data-cv-pdp]` (handler cv-product.js:523-533
   clicks the swatch or sets the `select[data-cv-option-index]`), then `gsap.to(window, { scrollTo: { y: '#cvPdp',
   offsetY: 80 }, duration: .6 })` (ScrollToPlugin is always loaded) and pulses the model select
   (`#cvcModel-<id>`, cv-product-counter.liquid:549) with a teal ring (`boxShadow` yoyo, 240 ms). Listen to
   `cvs:change` to mark the chip that matches the chosen model (`aria-pressed`). Reduced motion: instant scroll, no
   pulse. This is the Principle 2 "model fit first" moment and connects straight to Add to bag / Buy now.
2. Own the motion file: `assets/cv-finder.js` gated by a new unique attribute `data-cvfd` (unused today; distinct
   from `data-cvfr`), with the pending-class pattern so no-JS shows every chip, `shopify:section:load/unload/select`,
   and `gsap.matchMedia()`. Drop `data-cv-reveal` / `data-cv-split` from this section. Layout gate line is a shared
   edit: coordinate.
3. Chip entrance as tickets dealt from a stack: `ScrollTrigger.batch` on chips, `y: 18, rotation: gsap.utils.random(-3, 3)`
   to rest, stagger 0.04, `back.out(1.6)` 420 ms, `clearProps`. Per-brand counts roll with GSAP `snap: 1` only
   because they are LIVE values; server text is the final number.

Medium
4. When a shopper picks a model in the buy box, the finder band (if visible) flips the matching chip to a "Fits"
   stamp (scale 1.3 -> 1, 240 ms) and dims the others; when the chosen model is missing, the footnote line gets a
   short highlight.
5. Brand group headers (iPhone / Samsung) draw a hairline underline with DrawSVG on entry.

## Risks

- The whole current content is invented; motion must not be added on top of the existing chips. Rebuild the data
  first (findings 1-4).
- Model values are inconsistent in the store ("iPhone17Promax", "IPHONE 17 PRO MAX", combined values, double
  spaces; STORE-FACTS.md section 3). Display the raw value, match on the normalised key, and never count
  "18 Pro" as "18 Pro Max".
- A product with no model option (camera-lens film) must render nothing (or an honest "No phone choice needed").
- Placing the section requires a template edit (product.json has 22 of 25 sections). The live product template
  already has a fit section (`fit`, cv-pdp-fit); avoid two fit roles on one page (PRODUCT.md:35 "each role appears
  once"). Decide finder vs cv-pdp-fit before placing.
