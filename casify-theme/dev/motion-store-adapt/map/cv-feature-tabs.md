# cv-feature-tabs ("Feature tabs")

## Status

Live on the home page and the default product template.
- `templates/index.json:935`: key `feature_tabs`, 8th of 21 (after `showcase`, before `collage`). 4 tabs (`tab-1`..`tab-4`, `:936-993`), settings `:995-999` (intro "Four things every Casify case is built around.").
- `templates/product.json:350`: key `feature_tabs`, 6th of 22 (after `ribbon`, before `fit`). 3 tabs (`tab-1`..`tab-3`, `:351-393`), intro "What every Casify case is built around." (`:399`).
- No tab on either template has an image, thumbnail or video: every panel shows the large icon art fallback (`sections/cv-feature-tabs.liquid:90-92`).

## Purpose

Accessible vertical tablist (WAI-ARIA tabs: click, arrow keys, Home/End) that swaps a tall media frame (video, image or icon art) and copy (heading, rich text, optional link). Max 5 tabs. Renders only when at least one tab has a label (`:12`), with an editor hint otherwise (`:114-116`).

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-feature-tabs.liquid` (201 lines).
- `assets/cv-feature-tabs.css` (210 lines; `stylesheet_tag` at `:1`).
- `assets/cv-feature-tabs.js` (143 lines), loaded by `layout/theme.liquid:240-242` when the page contains `data-cvft` (the layout line is shared).
- Locale keys `sections.feature_tabs.play/pause/editor_hint` (`locales/en.default.json:176`); the FILE is shared.
- Dev previews already exist: `dev/feature-tabs-preview.html`, `dev/feature-tabs-render.mjs`.

Shared (coordinate before editing):
- `snippets/cv-icon.liquid`: `drop-shield`, `magnet-ring`, `wireless-charge`, `sparkle-clear`, `camera-lip`, `button-click`, `precision-fit`, `slim`, `gift`, `truck-fast`, `play`, `pause`, `arrow-right`.
- GSAP core (global bundle) for the tab-change crossfade (`assets/cv-feature-tabs.js:76-79`).
- `.rte` typography class (`sections/cv-feature-tabs.liquid:98`), shared theme typography.

## Store adaptation findings

1. **"Candy stripes that stay put" presents candy-stripe artwork as a product finish (high).** `templates/index.json:983-984`: tab-4 "Finish", heading "Candy stripes that stay put", text "Screen-printed candy stripes under a UV-cured top coat." The candy shop is only the visual metaphor; no product in Evidence on Hand is a candy-striped case (the real catalog is clear, magnetic and crossbody cases, PRODUCT.md:31, `templates/index.json:1016`, `:1024`). It is also an unbacked manufacturing claim (screen-printed, UV-cured). Fix: remove tab-4, or replace with a real-data tab such as "Pick your phone" (copy: "Choose your exact phone model on any case. Only the models it is made for are listed.") linking to `/collections/all`.
2. **"MagSafe ready" claimed for every case (high).** `templates/index.json:957-958`, `templates/product.json:372-373`. Not every product is evidenced as magnetic. On the product template it shows on every product. Fix: on product templates, add a tab-level setting `require_option_value` (e.g. "Magnetic") and render the tab only when one of `product.options_with_values` values contains it; on the home page reword to the store's own fact ("Magnetic styles work with MagSafe chargers") only if the merchant confirms, otherwise remove.
3. **Unverified manufacturing claims (high).** `templates/index.json:971` / `templates/product.json:386`: "cut from your phone's own CAD file, one mould per model, so the fit is exact". `templates/index.json:945` / `templates/product.json:360`: "Slim in the hand, tough where it counts" (vague, acceptable) "cut for your exact phone, not a size that's close enough". The CAD/mould story is the same unverified claim used in cv-guarantee and cv-value-stack. Fix: "Made for your exact phone model. Pick it on the product page; only the models the case is made for are listed." (true from option 2 data, PRODUCT.md:31; mirrors the honest copy in `templates/product.json` `guarantee` q-fit).
4. **Em dashes in shopper copy (medium).** `templates/index.json:945`, `:971`; `templates/product.json:360`, `:386` ("tough where it counts — cut", "CAD file — one mould"). Replace with periods or commas.
5. **No real product media (medium).** Every tab falls back to a 96px icon (`sections/cv-feature-tabs.liquid:91`), so a "feature" section about cases never shows a case. DESIGN.md:189 wants real product photography to stay the most authoritative object. Fix (owned file): add a tab-level `product` setting and, on product templates, default the media to `product.images[n]` (with `alt: product.title` since images have no alt text, PRODUCT.md:32) when no image/video is picked; on the home page use the tab's `product.featured_image`. Real photos exist for every product.
6. **Store-wide "every Casify case" intro (low).** `templates/index.json:998`, `templates/product.json:399`: "Four things every Casify case is built around." becomes untrue once tabs are conditional. Proposed: "Made the way you carry" without the "every" claim, or bind to the number of tabs rendered.
7. **No-JS: tabs 2..n are unreachable (medium).** Non-first panels carry the `hidden` attribute in Liquid (`:64`) and only JS can switch tabs. Without JS the shopper sees one tab's content and dead buttons. Fix: render all panels without `hidden` and let `assets/cv-feature-tabs.js` hide non-selected ones on init (add a `cvft--js` class to the root and scope `[hidden]` handling to it), so no-JS shows a stacked list.
8. **Preset ships content-less tabs (low).** `sections/cv-feature-tabs.liquid:193-196`: labels "Protection", "Charging", "Fit", "Gifting" with no text; the "Gifting" tab would render an empty panel with a gift icon. Fine for the editor, but make the preset match the honest tab set above.
9. No other brand, no prices or currencies, no phone model lists, no fake names. `media_alt` defaults to the label for video `aria-label` (`:77`) and to `''` for images (`:88`): images then have empty alt; set `alt` to `media_alt | default: block.settings.heading | default: block.settings.label`.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Slim in the hand, tough where it counts | `templates/index.json:945`; `templates/product.json:360` | Vague qualitative; no number; acceptable but soft |
| Cut for your exact phone, not a size that's close enough | same lines | Partly backed: per-model variants (PRODUCT.md:31); "cut" implies manufacturing |
| MagSafe ready, use with MagSafe chargers and accessories | `templates/index.json:957-958`; `templates/product.json:372-373` | Unbacked store-wide; must be conditional on product data |
| Cut from your phone's own CAD file, one mould per model | `templates/index.json:970-971`; `templates/product.json:385-386` | Unbacked |
| Screen-printed candy stripes under a UV-cured top coat | `templates/index.json:983-984` | Unbacked, and wrong product domain (candy as product finish) |
| Four things every Casify case is built around | `templates/index.json:998`; `templates/product.json:399` | Unbacked "every" generalisation |

## Motion inventory

- `data-cv-*`: none. No scroll entrance at all; the section appears statically.
- Section JS `assets/cv-feature-tabs.js`: tab switching with roving tabindex; on change, GSAP `fromTo` crossfade of `.cvft__media` (autoAlpha, y 16, scale .97) and `.cvft__copy` (x 18) (`:76-79`), skipped without GSAP or under reduced motion. Video plays only for the open tab and only while the section is 25% in view (`:107-114`); each video has a play/pause toggle (`:83-86` markup, `:101-103`).
- Reduced motion: no crossfade, no autoplay (`:75`, `:111`); CSS removes tab/badge transitions (`assets/cv-feature-tabs.css:208-210`).
- No-JS: first panel only (see finding 7).
- Editor: `shopify:section:load` re-inits, `shopify:section:unload` destroys, `shopify:block:select` opens the selected tab (`:134-142`). Good.
- GSAP plugins: none beyond core. No ScrollTrigger.

## Motion opportunities

1. **High: scroll entrance in the house idiom.** Add an owned GSAP block in `assets/cv-feature-tabs.js` (inside `init`, with a `gsap.context` reverted by `_cvftDestroy`): on ScrollTrigger `top 80%` once, the tab "tickets" deal in from the left with a 40ms stagger and a slight rotation that settles (candy spring only on the badge), the media frame rolls up with a clip-path awning reveal (the same `inset(100% 0 0 0 round 14px)` move as `assets/cv-collage-motion.js:131-139`) and the copy fades up. Resting CSS state stays fully visible; use `gsap.from` only after confirming the section is below the fold (as cv-motion-dev does) to avoid a flash.
2. **High: active-tab indicator that travels.** A red enamel bar/ticket notch that slides between tabs with `gsap.to(indicator, { y: tab.offsetTop, height: tab.offsetHeight, duration: .42, ease: 'power3.out' })` (Flip is loaded only on product/shop pages, so do not depend on it on the home page). Keyboard and click both drive it. Reduced motion: jump.
3. **Medium: scroll-driven auto-advance on desktop (optional).** Pin the section for `n x 60vh` and advance the selected tab with scroll progress (`ScrollTrigger` `onUpdate` -> `select(i)`), unpinned on phones and under reduced motion, with clicking still possible. Only if the merchant wants a longer scroll story; it competes with the home page's existing pinned 3D phone scan.
4. **Medium (buy box, product template): tab link to the buy box.** On product templates, the tab link can scroll to the buy box (ScrollToPlugin) and focus the Model select instead of linking to `/collections/all`; a tab "Pick your phone" then becomes a real step towards Add to bag. No add-to-cart from this section.
5. **Low: media micro-motion.** On tab change, a 3deg tilt-in of the photo with the candy spring and a glass sheen sweep (`.cvft__media::after` translateX keyframe, one play). Reduced motion: none.
6. Packs/bundles, Buy now, cart drawer: not applicable unless a tab is dedicated to "Packs" with the real 18%/31% from a setting; then animate the two percentages counting up when that tab opens.

## Risks

- Content edits touch two templates (`templates/index.json` and `templates/product.json`); edit only the `feature_tabs` instances. The product template has 3 tabs, the home 4.
- Removing the "MagSafe" tab or making it conditional is a copy decision; flag to the merchant with the reason (unverified store-wide claim).
- Pinning (opportunity 3) interacts with the home page's pinned `phone_scan` section; test ScrollTrigger refresh order (`ScrollTrigger.refresh()` after init, as cv-collage and cv-vs do).
- Showing all panels for no-JS changes the initial layout; make sure the JS hides them before first paint (the script is `defer`ed; add the hidden state in the same tick as init, or accept a stacked flash only when JS is very slow).
