# cv-pdp-before-after ("Product: before & after")

## Status

Live.
- `templates/product.json:485`: section key `before_after`, 10th of 22 in `order` (after `us_vs_them`, before `journey`). It has one filled `comparison` block that uses theme-asset links (`templates/product.json:493-497`).
- `templates/product.convert.json:539`: section key `before_after`, 10th of 17 (after `fit`, before `compare`). The block and section settings are empty `{}` (`:543`, `:549`). The section then renders nothing to shoppers (`sections/cv-pdp-before-after.liquid:34`: `ready > 0 or request.design_mode`). In the editor it shows only the dashed draft note (`:180`).
- The schema has no `enabled_on`, so a merchant can add the section to any template (`sections/cv-pdp-before-after.liquid:188-234`).
- Script loader: `layout/theme.liquid:334-337` loads `assets/cv-pdp-before-after.js` whenever the markup contains `data-cvba` (or in the editor). It does not depend on the template.

## Purpose

A drag-to-compare photo slider: a "before" photo is clipped to `--pos` over an "after" photo, and a red enamel knob rides the divider. 1 to 4 `comparison` blocks become tabs when more than one is complete. The real control is a full-size invisible `<input type="range">`, so keyboard and screen readers work natively. On the default template it shows two unedited frames of the shop's own clip `pdp-ugc-snap-on.mp4`: the bare phone ("Case off", `assets/cvba-before.jpg`) and the case snapped on ("Case on", `assets/cvba-after.jpg`) (PRODUCT.md, 2026-10-03 entry).

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-before-after.liquid` (235 lines)
- `assets/cv-pdp-before-after.css` (126 lines). Its header says it is the finished static state (`.cvba--static`).
- `assets/cv-pdp-before-after.js` (241 lines). Interaction plus a GSAP entrance. It handles editor events.
- `assets/cvba-before.jpg`, `assets/cvba-after.jpg`. Referenced only from this section's settings in `templates/product.json:497-498`.

Shared (coordinate before editing):
- `layout/theme.liquid:334-337`: the conditional script loader (the `data-cvba` gate).
- `snippets/gsap.liquid` and `assets/gsap-*.js`: the GSAP core plus ScrollTrigger and SplitText. These are loaded on every page via `layout/theme.liquid:184`.
- `templates/product.json` (`before_after` key only) and `templates/product.convert.json` (`before_after` key only). Both files hold all of the template's sections.
- `assets/theme.css` tokens (`--red-*`, `--cream-*`, `--cocoa-*`, `--gold-*`, `--font-*`, `--shadow-diecut`, `--focus-ring`). The section does not render any snippet.

## Store adaptation findings

1. **The same demo pair ships on every product (medium-high).**
   - Where: `templates/product.json:493-498` pins `cvba-before.jpg` / `cvba-after.jpg` and the alt text "The same iPhone with the magnetic case snapped on, MagSafe ring in place."
   - Problem: the default template serves every product (about 10 to 17 live, see STORE-FACTS.md:95-110). Every product page therefore shows one specific magnetic case, with a MagSafe alt text, even on non-magnetic, kickstand or printed-design cases. The section reads no product data. This breaks Product Principles 1 and 4 (PRODUCT.md:109, :112).
   - Fix: in the Liquid `{%- liquid -%}` block (`:18-32` and per block `:73-108`), read per-product photos first: `product.metafields.custom.before_image` / `custom.after_image` (file_reference, image). Fall back to the block only when a new block setting `only_products` (type `product_list`) is blank or contains `product`. When it does not match, count the block as not `complete`. Also add an "Only show on products tagged" text fallback (`product.tags contains`) so the merchant can target all magnetic cases at once.
2. **The section is empty on the Shop Counter template.**
   - Where: `templates/product.convert.json:539-549`.
   - Effect: shoppers see nothing, and the editor shows the draft note.
   - Fix: either remove `before_after` from that template's `order`, or fill it the same way as finding 1 (per-product metafield). Low priority, nothing ships wrong.
3. **The lede promises a handle that does not exist without JS.**
   - Where: the default lede "Drag the handle to compare." (`:198`; also saved in `templates/product.json`).
   - Problem: without JS the knob is hidden (`assets/cv-pdp-before-after.css:103`) and the range is `hidden` (`:172`).
   - Fix: render the hint inside an element with `data-cvba-hint hidden`, and let JS unhide it in `init()` next to `root.classList.remove('cvba--static')` (`assets/cv-pdp-before-after.js:60`). Alternatively make the lede neutral and move the hint to the label line.
4. **The caption uses a spaced hyphen as a dash.**
   - Where: `templates/product.json:496`, "The same phone from our counter clip - before and after the case goes on."
   - It is not an em or en dash, but it reads as one, and the caption renders in uppercase typewriter (`.cvba-cmp__caption`, css `:105-108`).
   - Fix: "The same phone from our counter clip, before and after the case goes on."
5. **There is an em dash in the editor info.**
   - Where: `:196` ("Italic words are set in the script face — use it…").
   - It is merchant-facing, not shopper-facing. Replace it with a full stop.
6. **Hardcoded English strings are not in the schema.**
   - Strings: tablist `aria-label="Comparisons"` (`:50`), tab fallback 'Comparison' (`:64`), desc fallback 'this product' (`:107`), the range aria-label template "Compare … and …" (`:169`), and the draft note (`:180`).
   - Low priority. Add schema text settings, or move them to `locales/en.default.json` (a shared file, so coordinate).
7. **Mobile labels are below the type floor.**
   - Where: `.cvba-cmp__label` is 10.5px at 749px and below (`assets/cv-pdp-before-after.css:118`). DESIGN.md:130 says to keep mobile labels at about 11 to 12px.
   - Fix: set 11.5px and padding `5px 10px`.
8. **The dev comment names another system.**
   - Where: "Chrismass design system" (`:2`). It is not shipped, but rename it to "Candy Shop Matinee" so a later agent is not misled (MOTION-SYSTEM.md section 7, item 10).
9. Clean:
   - No candy-as-product copy, prices, currencies, ratings or phone-model lists.
   - Image pickers win over links (`:120`, `:140`). Linked images get explicit `width`/`height` (`:132-133`, `:152-153`), and the 9:16 ratio fallback is set at `:86-87`.

## Claims register

| Claim (shopper-facing) | Where | Status |
|---|---|---|
| "Case off" / "Case on" labels | `templates/product.json` block | Backed: real consecutive frames of the shop's own clip (PRODUCT.md 2026-10-03 entry). |
| Alt: "magnetic case snapped on, MagSafe ring in place" | `templates/product.json:493` | Backed only on magnetic/MagSafe products. Unbacked on every other product using the default template (see finding 1). |
| Caption "The same phone from our counter clip" | `templates/product.json:496` | Backed (same source). |

No ratings, review counts, guarantees, delivery times, percentages or performance claims.

## Motion inventory

- `data-cv-*` attributes: none. The section uses its own `data-cvba`, `data-cvba-heading`, `data-cvba-fade`, `data-cvba-tabs`, `data-cvba-tab`, `data-cvba-cmp`, `data-cvba-frame`, `data-cvba-before`, `data-cvba-label-before/after`, `data-cvba-line`, `data-cvba-knob` and `data-cvba-range`.
- Section JS: `assets/cv-pdp-before-after.js`.
  - Entrance timeline (`:171-207`): masked word rise (SplitText `mask: 'words'`, `:185-187`), lede fade (`:191`), tabs stagger (`:192`), clip-path "shutters" opening from the centre (`:195-197`), knob spin-in with `back.out(2)` (`:198-200`) and labels sliding in (`:201-204`).
  - After the entrance, a 2.7 s "teaching sweep" moves the divider right, left and back (`:158-166`). Any input stops it (`:91`, `:94-95`, `:104`).
  - Drag uses `gsap.quickTo` (`:80-82`). The knob squashes while held and releases with `elastic.out` (`:108`, `:114`).
- GSAP plugins: ScrollTrigger (`once: true`, start `top 78%`, `:182`) and SplitText. No custom eases.
- Reduced motion: `animate = gsap && !reduce` (`:37-38`). With reduced motion the slider is fully interactive with no entrance and no sweep, and CSS removes the tab transitions (css `:126`). The preference is read once, not live.
- No-JS: `.cvba--static` shows the divider at the block's `start`, with no knob (css `:103`), the range `hidden`, tabs `hidden`, and every comparison listed in turn. Readable.
- Theme editor:
  - `shopify:section:load` boots (`:231`), and `unload` destroys (`:232`): context revert, split revert and listener removal (`:48-57`).
  - `section:select` and `block:select` jump to the finished state (`:233-240`). This is the reference shape in MOTION-SYSTEM.md 4.6.
- Hidden tab: the entrance jumps to its end (`:206`).

## Motion opportunities

1. **High: a bridge back to the buy box after the reveal.**
   - Add a candy pill button under the caption, "Choose your phone", shown only on product templates (`{% if template.name == 'product' %}`), with `data-cvp-back`. `assets/cv-pdp-story.js:398` already binds `[data-cvp-back]` to `backToSlip()` (`:26-31`), which scrolls to `#cvAddForm` and focuses `#cvAddBtn`, honouring reduced motion. No new JS is needed. The section sits mid-page, right after "us vs them", the moment a shopper is convinced.
   - The guard is needed because the schema has no `enabled_on`. The `.cvs__cta` pill styles live in `cv-pdp-home.css` / `cv-pdp-story.css` (shared), so give the button its own `.cvba__cta` styles in `cv-pdp-before-after.css` (owned).
   - No-JS: make it `<a href="#cvAddForm">`. The shared handler does not `preventDefault`, so either accept the anchor jump plus the smooth scroll, or coordinate a `preventDefault` for anchors in `cv-pdp-story.js:398`.
2. **Medium: a "Case on" stamp moment.**
   - Where: in `sweep()` (`:158-166`), or when a user drag first crosses 50%.
   - What: stamp the after label with a short `scale: 1.25 -> 1`, `rotation: -6 -> 0` on `back.out(3)` (DESIGN.md "tickets stamp"). Run it once per comparison, and never under `reduce`.
3. **Medium: an optional scroll-scrub mode.**
   - Add a section setting `scrub` (checkbox, default off). When on and `animate` is true, a ScrollTrigger with `scrub: 0.6` maps progress 0 to 1 onto `state.v` from 85 to 15 while the frame crosses the viewport.
   - The first pointer or key input kills the scrub trigger, so the user owns the control. Keep it inside the existing `gsap.context` so `_cvbaDestroy` reverts it.
4. **Low: live reduced-motion changes.** Replace the single `matchMedia` read (`:37`) with `gsap.matchMedia()` conditions (MOTION-SYSTEM.md 4.4, shape 3), so a mid-session change reverts the entrance and the sweep.
5. **Low: tab change.** Use the Flip plugin (already loaded on product pages, `layout/theme.liquid:173-177`) to morph the selected tab pill underline instead of a hard background swap.

## Risks

- **Ownership:** the JS, CSS and section are fully owned. Only `templates/*.json` keys and the layout loader are shared.
- **Data:** the per-product metafields `custom.before_image` / `custom.after_image` do not exist yet. Creating metafield definitions changes the store and needs merchant confirmation (PRODUCT.md:33, "Nothing is created or changed in the store without the merchant's explicit confirmation"). Ship the Liquid with blank-safe fallbacks.
- **Hiding:** if finding 1 hides the pair on non-matching products, the section disappears there. That is the intended honest state, but tell the merchant.
- **Templates:** the section can be placed on any template, so any buy-box bridge must be guarded by `template.name == 'product'` and by the presence of `#cvAddForm`.
- **Scrub:** a scrub mode must not fight the teaching sweep. Kill `demo` before creating the scrub trigger.
