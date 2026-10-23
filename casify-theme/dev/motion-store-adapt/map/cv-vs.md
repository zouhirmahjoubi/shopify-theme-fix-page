# cv-vs ("Us vs. them")

## Status

Live on the home page and the default product template.
- `templates/index.json:1223`: key `us_vs_them`, 11th of 21 (after `value`, before `ugc`). 4 rows (`:1225-1252`), settings `:1260-1273` with `us_product: "mobile-phone-case-apple"` (`:1266`), `us_sticker: "30-day returns"`, `button_link: shopify://collections/all`.
- `templates/product.json:432`: key `us_vs_them`, 9th of 22 (after `carousel`, before `before_after`). Same 4 rows (`:437`, `:444`, ...), `us_product: ""` (`:475`) so the image is the product being viewed (`sections/cv-vs.liquid:27-29`).
- Not in `templates/product.convert.json` or any group.

## Purpose

Two pictures (us / them) with a VS token between them, then paired rows (our point with a check, theirs with a cross), a note and a CTA link (`sections/cv-vs.liquid:33-121`). The section only renders when at least one row has both sides filled, or in the editor (`:33`). The finished comparison is plain HTML/CSS; JS adds GSAP entrances and swaps the flat "VS" badge for a three.js peppermint coin.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-vs.liquid` (178 lines).
- `assets/cv-vs.css` (188 lines; `stylesheet_tag` at `:9`). `sections/cv-value-stack.liquid:27` mentions it only in a Liquid comment.
- `assets/cv-vs.js` (374 lines, ES module), loaded by `layout/theme.liquid:283-286` when the page contains `data-cvvs-row` (or in the editor). The layout line itself is shared.
- Locale keys `sections.vs.vs` and `sections.vs.editor_row` (`locales/en.default.json:177`); the FILE is shared.

Shared (coordinate before editing):
- `snippets/cv-icon.liquid`: `drop-shield`, `device`, `arrow-right`.
- **`data-cvvs` attribute collision:** `sections/cv-value-stack.liquid:28` also puts `data-cvvs` on its root. `assets/cv-vs.js:355-359` (`cvvsIsVs`) filters candidates to roots with `[data-cvvs-row], [data-cvvs-head]`; the unload handler (`:371-374`) does not filter, but only calls `_cvvsDestroy` which a value-stack root never has. Keep the filter if refactoring. Class prefixes: cv-vs uses `.cvvs`, `.cvvs__*`, `.cvvs--*`; cv-value-stack uses `.cvvs-*` (single dash). No rule collides today; do not add `.cvvs-` rules here.
- three.js: fetched at runtime from `https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js` (`assets/cv-vs.js:12`), the same pattern as other theme modules (cv-awning, cv-orbit, cv-pdp-carousel...). Self-hosted `assets/three.module.min.js` also exists.
- GSAP + ScrollTrigger (global bundle, `snippets/gsap.liquid`).
- `routes.all_products_collection_url` fallback for the CTA (`:111`).

## Store adaptation findings

1. **"MagSafe ready" is a store-wide claim shown on every product (high).** `templates/index.json:1235` and `templates/product.json:444`. On the product template the row appears on every case, including any non-magnetic style (the catalog's option 1 is a style such as "Magnetic Case Camera Cutout Transparent", PRODUCT.md:31, and the home collage features a chain crossbody case, `templates/index.json:1024`). No evidence that every product is MagSafe compatible. Fix: add a per-row text setting `require_option_value` (e.g. "Magnetic"); on product templates render the row only when `product.options_with_values` contains a value with that word (case-insensitive `contains`); on non-product templates render it only when the setting is blank. Or drop the row from both templates.
2. **"Cut for your exact model" is partly backed (medium).** `templates/index.json:1228`, `templates/product.json:437`. Every product sells per phone model (option 2, PRODUCT.md:31), so "Made for your exact model" is true from store data; "cut" implies a manufacturing claim (the unverified CAD/mould story in cv-guarantee and cv-value-stack). Proposed: "Made for your exact phone model" / "One size stretched across models". On product pages this could read live: "Made for {{ n }} phone models" from `product.options_by_name['Model'].values.size` (option name must be confirmed; fall back to option 2).
3. **"30-day returns, prepaid label" (medium).** `templates/index.json:1249`, product.json same row. 30-day returns is backed (PRODUCT.md:34); "prepaid label" is only on the Return Policy page and not a confirmed fact. Proposed: "30-day returns".
4. **Them-side generalisations (low).** "Shipping often added at checkout", "Returns often at your own cost", "Check the listing for magnets", "One size stretched across models" (`templates/index.json:1229`, `:1236`, `:1243`, `:1250`). They follow the schema guidance (`sections/cv-vs.liquid:131`: describe the other side generally) and are hedged with "often". Acceptable; keep.
5. **Home `us_product` handle must exist (low).** `templates/index.json:1266` `mobile-phone-case-apple`. If the product is deleted or renamed, the "us" frame falls back to a `drop-shield` icon (`sections/cv-vs.liquid:52`). The handle also appears in `dev/campaign-guide/README.md`; confirm in admin (not with a connector in this phase).
6. **"Them" picture is always an icon (low).** `them_image` is blank on both templates, so the right frame shows the `device` icon art (`:70`). Acceptable (schema says use your own photo, `:153`); a merchant-shot photo of a generic bare phone would read better. Do not use another brand's product image.
7. **Image alt text is the label, not the image (low).** `:50` `alt: us_label` gives "Casify"; on product pages prefer `product.featured_image.alt | default: product.title` (PRODUCT.md:32: product images carry no alt text today, so the title fallback matters).
8. **Eyebrow "Us vs. them" above the heading (low).** `templates/index.json:1261`; DESIGN.md:198. Optional removal.
9. Copy is clean of em/en dashes (`templates/index.json:1272` uses a middle dot), no candy-as-product, no other brand, no prices. Schema defaults are safe: rows default blank and the preset rows are empty (`:174`), so a new section is hidden until filled.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Cut for your exact model | `templates/index.json:1228`; `templates/product.json:437` | Partly backed: per-model variants are store data (PRODUCT.md:31); "cut" manufacturing implication unbacked |
| MagSafe ready | `templates/index.json:1235`; `templates/product.json:444` | Unbacked store-wide; must be conditional on product data |
| Free shipping on every order | `:1242`; note `:1272` | Backed: PRODUCT.md:34 |
| 30-day returns | `:1249`, sticker `:1267`, note `:1272` | Backed: PRODUCT.md:34 |
| Prepaid label | `:1249` | Unbacked in Evidence on Hand |
| "Every Casify case ships with the same shop promises" | `:1269`; `templates/product.json:478` | Backed (the three service facts are store-wide) |
| Them: one size stretched, check listing for magnets, shipping often added, returns often at own cost | `:1229`, `:1236`, `:1243`, `:1250` | Generic hedged comparisons; no named brand; acceptable |

## Motion inventory

- `data-cv-*`: none. Uses its own `data-cvvs-*` hooks: `data-cvvs`, `data-cvvs-head`, `data-cvvs-stage`, `data-cvvs-pic`, `data-cvvs-token`, `data-cvvs-rows`, `data-cvvs-row`, `data-cvvs-us`, `data-cvvs-them`, `data-cvvs-check`, `data-cvvs-cross`, `data-cvvs-foot`.
- GSAP (`assets/cv-vs.js:31-86`, inside `gsap.context`): header children rise; pictures swing in from their sides with `back.out`; each row's halves slide together, the check draws via stroke-dashoffset (manual, not DrawSVG), the cross pops; footer fades up with explicit end values. All ScrollTrigger `once`.
- three.js (`:165-333`): peppermint coin with canvas textures; spins in on a GSAP timeline when the stage reaches 85%; afterwards bobs and tilts toward the pointer. Loop runs only while on screen and the tab is visible (`:291-300`); ResizeObserver; full dispose on destroy.
- Reduced motion: GSAP skipped (`:33`); the coin renders once, no spin, no loop (`:241`, `:258`). CSS `assets/cv-vs.css:185-187` removes the CTA transition.
- No-JS / no-WebGL: complete (flat `VS` badge `sections/cv-vs.liquid:62`, rows in place).
- Editor: `shopify:section:load` re-inits, `shopify:section:unload` destroys (`:370-374`). No `shopify:block:select` handling (selecting a row before it animated leaves it hidden until scroll; minor).
- Ambient: the coin's bob/tilt runs indefinitely while visible with no pause control (DESIGN.md:192). Small and decorative; consider stopping the bob after ~6s or on `prefers-reduced-motion` only (already) and documenting it.

## Motion opportunities

1. **High: rows as tickets stamped onto the counter.** Keep the slide-together, but make the "us" half land with a stamp (`scale: 1.08 -> 1`, `CustomBounce`) and draw the check with DrawSVGPlugin (always loaded) instead of the manual dasharray, and have the "them" half desaturate (`filter: grayscale(.6)`, opacity .72) as the cross pops. Scroll-linked variant: a `scrub` timeline pinned for 1 viewport on desktop only (`gsap.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)')`), unpinned on phones.
2. **High (buy box, product template): the "us" picture becomes a live link to the buy box.** On `templates/product.json` the "us" frame is the product photo. Add a small "Pick your phone" button under it (product template only) that scrolls to the buy box with ScrollToPlugin (always loaded) and dispatches `cvs:choose` the way cv-pdp-carousel does, or simply focuses the Model select. Repaint the frame on `cvs:change` (`assets/cv-product.js:415`) with the chosen variant's image (crossfade 240ms). Nothing is added to the cart from here.
3. **Medium (home): CTA to quick pick.** Replace "Find my model" (`/collections/all`) with a `data-cvqp-open` button for the `us_product` (layout already loads the quick pick when that attribute appears, `layout/theme.liquid:208-210`, `:295-297`). Shopper picks colour and phone in the dialog; then a GSAP "added" stamp on the coin (spin once, 0.6s) listening for `cv:cart` (`assets/cv-quick-pick.js:58`).
4. **Medium: VS coin reacts to scroll.** Tie a half-turn of the coin to scroll progress through the stage (`ScrollTrigger` `onUpdate` sets a target rotation the render loop eases toward), so it feels physical; keep the intro spin. Skip on reduced motion and when WebGL is unavailable.
5. **Low: pause control for the ambient bob.** Stop the bob after the intro plus 8s, resume on pointer enter; satisfies DESIGN.md:192 without a visible switch.
6. **Low: `shopify:block:select`** should finish the rows timeline so the selected row is visible in the editor.

## Risks

- The same row copy lives in two templates (`templates/index.json` and `templates/product.json`); change both together, editing only the `us_vs_them` instances (both files are shared with many sections).
- The `data-cvvs` collision with cv-value-stack: do not remove `cvvsIsVs` (`assets/cv-vs.js:356-359`). If cv-value-stack renames its attribute in parallel, this file needs no change.
- Runtime three.js from jsdelivr: a CDN outage just leaves the flat badge (handled by the try/catch at `:170-176`). Switching to the self-hosted copy needs a check of what `assets/three.module.min.js` exports (`three.core.min.js` is split out) and is out of scope for a content pass.
- Adding a conditional "MagSafe" row requires knowing the real option names per product; confirm from product data before relying on a word match.
