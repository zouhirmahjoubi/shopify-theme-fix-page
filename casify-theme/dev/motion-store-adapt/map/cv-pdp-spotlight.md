# cv-pdp-spotlight ("Product: spotlight")

## Status

Live on ONE template only:
- `templates/product.convert.json`, key `spotlight`, 8th in `order` (after `ribbon`, before `fit`).
- NOT in `templates/product.json` (default).
- Instance settings equal the schema defaults: heading "The case, under glass", lede "A closer look before you choose. Every number here is read from this case.", cta "Choose my phone", media_index 1, pack_qty 3, pack_pct 31, pack_label "off in a [qty]-pack", each_label "each".

## Purpose

The home "Convert: Spotlight" rebuilt honestly for the product page (`sections/cv-pdp-spotlight.liquid:1-16`). The product's own photo stands as a printed card under a glass cloche, lit by a KIE brass lamp. Up to three corner callouts are computed, never free text: phone-model count and style count from `product.options_with_values` (`:25-35`), and the pack saving from the section's pack settings (`:37-40`, `:52-54`). A shop card under the glass shows the product title and the per-case price in the chosen pack (`:114-123`). The CTA scrolls back to the buy box (`data-cvp-back`, `:66`).

## Files (owned / shared)

Owned (only this section references them):
- `sections/cv-pdp-spotlight.liquid`
- `assets/spot-lamp.webp` (`:71`)
- `assets/pdp-home-cloche-stand.webp` (`:74`)
- `assets/pdp-home-cloche-dome.webp` (`:80`)

Shared:
- `assets/cv-pdp-story.css` (18 sections).
- `assets/cv-pdp-home.css`: spotlight rules `:87-148`, responsive `:629`, `:649-655`, the `≤420px` title size `:709`. Tagged by 12 sections.
- `assets/cv-pdp-home-motion.js`: spotlight `:143-187`, `magnet()` `:59-73`, `[data-cvw-split]` SplitText headings `:132-141`, guard `:42`.
- `assets/cv-pdp-story.js`: `backToSlip()` `:25-30` and the `[data-cvp-back]` binding `:398` (also used by cv-pdp-guarantee, cv-pdp-ugc, cv-pdp-closer).
- `assets/theme.css`: `.cv-callout` `:1636-1655`, `.cv-pulse--red` `:1284`, reduced-motion kill list `:3222-3236`.
- `snippets/cv-icon.liquid` (`device`, `precision-fit`, `price-tag`).
- `layout/theme.liquid:322` (loads cv-pdp-home-motion.js on every product template).

## Store adaptation findings

1. **HIGH: the three real facts are invisible without GSAP (desktop and tablet).**
   - The callout wrapper has both classes `cv-callout cvw-spot__callout` (`:102`).
   - `assets/theme.css:1636`: `.cv-callout { opacity: 0; animation: cv-callout-in ... both; }`.
   - `assets/cv-pdp-home.css:128`: `.cvw-spot__callout { ... animation: none; }` cancels the keyframe that would bring opacity to 1. Only `theme.css:1652-1654` (`max-width: 560px`) resets `opacity: 1`.
   - Result above 560 px: the model count, style count and pack saving stay at opacity 0 when reduced motion is on (cv-pdp-home-motion.js returns at `:42`), when JS or GSAP fails, and in the theme editor after any setting change (no `shopify:section:load` re-init).
   - Fix (owned, no shared edit): drop `cv-callout` from the wrapper at `:102` and keep `cvw-spot__callout`. `.cvw-spot__callout` already sets position and max-width (`cv-pdp-home.css:128-132`, `:651-655`); the pill styling comes from `.cv-callout__pill` (`theme.css:1641-1644`), which is independent of the wrapper class. The GSAP code sets its own hidden start state (`cv-pdp-home-motion.js:164`), so the entrance is unchanged.
2. **MEDIUM: the shop-card price reads as the single-case price (Principle 3).**
   - `:117` prints `{{ pack_each | money }} each`: the per-case price inside a 3-pack at 31% off, directly under the product title.
   - The buy box shows the single-case price. A shopper sees two different "each" prices for the same case.
   - Fix (owned): change the `each_label` default (`:143`) to `each in a [qty]-pack` and render it with `| replace: '[qty]', pack_qty` at `:117`. The live instance in `templates/product.convert.json` stores "each", so either update that value (template, shared) or, owned-only, append ` in a {{ pack_qty }}-pack` in Liquid when the label has no `[qty]` token.
3. **MEDIUM: pack figures are typed settings and never follow the shopper's choice.**
   - `pack_qty` 3 and `pack_pct` 31 (`:140-142`) duplicate the buy box tiers (`templates/product.convert.json` main `tier-3` `discount_pct` 31) and the live automatic discount (PRODUCT.md:39). Three sources of one number.
   - The price is computed once from `product.selected_or_first_available_variant.price` (`:21`, `:38-40`); it does not update on `cvs:change`. If styles or models are priced differently, the card goes stale.
   - Fix (owned JS, see Motion opportunities 2): read the buy box tier `[data-cv-pdp] [data-cv-pack][data-cv-qty="<pack_qty>"]` and its `data-cv-discount` (exposed at `sections/cv-product-counter.liquid:584-588`), and recompute from `cvs:change` `detail.variant.price`. Keep the Liquid value as the no-JS state.
4. **LOW: the lede overstates the source.** "Every number here is read from this case." (`:134`, live) is not quite true: the pack percentage is a store setting. Suggested: "A closer look before you choose. Phone models and styles are read from this case; pack prices match checkout."
5. **LOW: style detection can pick the wrong option.** `:27-35` overwrites `styles` with every non-model option that has more than one value; with three options the last one wins. Fix: set `styles` only once, preferring an option whose name contains `style`, `colour`, `color` or `design`.
6. **LOW: "Choose my phone" goes to Add to bag, not the phone picker.** `backToSlip()` focuses `#cvAddBtn` (`cv-pdp-story.js:25-30`). Principle 2 (PRODUCT.md:110) says the visitor confirms the phone first. Fix (owned JS): handle the click in the section's own script, scroll to `[data-cvc-model]` (`sections/cv-product-counter.liquid:345`) and focus its select; leave `data-cvp-back` off this button so the shared handler does not also run.
7. **LOW: media range.** `media_index` max is 10 (`:136`), while some products carry about 50 images (PRODUCT.md:32). Fine as is; the alt fallback to `product.title` (`:77`) is correct because product images have no alt text.
8. **Clean:** set pieces (lamp, cloche) frame the real product photo; no candy presented as the product, no other brand, no placeholder, no hardcoded currency (`money` filter). Em dashes appear only in Liquid comments and the editor `info` at `:137` (merchant-facing; replace with a period).

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "[N] phone models" | callout `:88-91` | `product.options_with_values` (live product data) | Backed |
| "[N] styles" | callout `:92-95` | `product.options_with_values` | Backed |
| "31% off in a 3-pack" | callout `:96-99` | Setting `pack_pct` 31; matches the live automatic discount "31% off, min qty 3" (PRODUCT.md:39, checked 2026-09-15) and the buy box tier | Backed today; drift risk (typed in 3 places) |
| "$X each" (pack price) | `:117` | Computed from the variant price and `pack_pct` | Value true; label misleading (finding 2) |
| "Every number here is read from this case." | lede `:134` | The pack % is a store setting | Partly unbacked (finding 4) |
| Product title | `:116`, `:121` | `product.title` | Backed |

## Motion inventory

- `data-cv-*` attributes: none.
- pdp-home hooks: `data-cvw-spot` (`:61`), `data-cvw-split` (`:64`), `data-cvw-magnet` (`:66`), `data-cvw-spot-stage` (`:69`), `-lamp` (`:71`), `-beam` (`:72`), `-glow` (`:73`), `-photo` (`:76`), `data-cvw-cloche` (`:80`), `-callouts` / `-callout` (`:83`, `:102`), `-label` (`:115`, `:120`).
- `assets/cv-pdp-home-motion.js`:
  - Heading: SplitText chars drop from `yPercent: -130` with random rotation, `cvwDrop` CustomBounce ease (`:132-141`).
  - Scrubbed (`scrub: 0.7`): dome lifts and tilts, photo scales 0.9 to 1.04, glow brightens (`:154-159`).
  - Once at `top 78%`: lamp swings on (`back.out(1.6)`), beam opens, callouts pop (`back.out(2.4)`, stagger 0.16) (`:162-178`).
  - Once at `top 70%`: the shop card is stood up (`:180-186`).
  - CTA magnet on hover-capable devices (`:187`, `:59-73`).
- GSAP plugins used: ScrollTrigger, SplitText, CustomBounce (optional), all in the product-page bundle (`snippets/gsap.liquid:22-36`).
- CSS ambient: each callout has a `cv-pulse cv-pulse--red` dot with an infinite pulse (`theme.css:1284`); killed under reduced motion (`theme.css:3226`), but never paused offscreen (DESIGN.md:183).
- Beam is `opacity: 0` in CSS (`cv-pdp-home.css:107`): no beam without JS. Decorative, acceptable.
- Reduced motion: script returns; callouts then invisible above 560 px (finding 1).
- No-JS: same callout problem; everything else readable.
- Theme editor: no `shopify:section:load/unload` handling.

## Motion opportunities

1. **High: fix callout visibility first** (finding 1). Without it, every other motion change keeps hiding the section's facts for reduced-motion users.
2. **High: live link to the buy box (owned `assets/cv-pdp-spotlight.js`, tagged from the section with `defer`).**
   - Listen on `[data-cv-pdp]` for `cvs:change`:
     - If `detail.variant.featured_image.src` differs, swap the card photo under the dome: the lamp dips (rotation -8 to -14 and back, 240 ms) while the photo cross-fades (160 ms out, 240 ms in). The dome stays put.
     - Recompute the pack price from `detail.variant.price` and the buy box tier discount; tween the number on the shop card (420 ms, `power2.out`). Format with `window.themeMoneyFormat` (`layout/theme.liquid:155`); cv-product.js keeps its `formatMoney` private (`assets/cv-product.js:41`), so copy a small formatter into the owned file.
   - Listen for tier clicks (`[data-cv-pack]` in the buy box): when the 3-pack is chosen, the pack callout gives one stamp pulse (scale 1.12 to 1, 240 ms).
   - Reduced motion: update text and image instantly, no tweens.
3. **Medium: "Choose my phone" glide.** Use ScrollToPlugin (in the product bundle) to `[data-cvc-model]` with an offset for the sticky header, then a muted-teal ring pulse on the model select (240 ms). Reduced motion: `scrollIntoView({ behavior: 'auto' })` and focus.
4. **Medium: pause the ambient pulse offscreen.** In a section `{% style %}` block (owned): `.cvw-spot.is-offscreen .cv-pulse { animation-play-state: paused; }`; toggle `is-offscreen` with an IntersectionObserver in the owned script.
5. **Low: editor support.** In the owned script, re-run its bindings on `shopify:section:load` for this section and jump the entrance to its end on `shopify:section:select`. The shared cv-pdp-home-motion.js entrance cannot be re-run from here; with finding 1 fixed, the re-rendered section is at least fully visible.

## Risks

- The entrance choreography lives in the shared `assets/cv-pdp-home-motion.js:143-187`; selectors (`data-cvw-spot-*`, `data-cvw-cloche`) must not be renamed by an owned edit.
- Do not add `data-cv-split` to the title: it already has `data-cvw-split` (MOTION-SYSTEM.md section 7, "three word splitters").
- Pack percentage is typed in three places (this section, cv-pdp-compare, the buy box tiers). Reading from the buy box at runtime is the only owned way to keep them aligned.
- Only on `product.convert.json`.
