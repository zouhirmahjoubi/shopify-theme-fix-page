# halo-drop-test ("Halo — Drop test bars")

## Status

**Orphan.** Not in any `templates/*.json` or `sections/*-group.json`. Preset present (`sections/halo-drop-test.liquid:112-175`), no `enabled_on`, so it is addable to any template. PRODUCT.md (2026-09-16) records that the home drop-test sequence `cv-story` was removed from `templates/index.json` because "there's no real test ... data to publish"; this section is the same premise in bar-chart form.

## Purpose

A horizontal bar chart of "drop height before damage" for "Casify Halo" vs five rival case types and "No case", a method note (MIL-STD-810G), and an explanatory column about "DropCore" corner cells.

## Files (owned / shared)

Owned:
- `sections/halo-drop-test.liquid` (177 lines; no `stylesheet_tag`, no `render`, no script).

Shared:
- `assets/theme.css`: §31 `.halo-sec`, `.halo-sec__hd` `3689-3693` (8 sections); §34 drop bars `3761-3779` (only this section uses `.halo-drop`, `.halo-bars`, `.halo-brow`, `.halo-btrack`, `.halo-bfill`, `.halo-drop__note`, `.halo-drop__copy`); small-screen overrides `4146`, `4373-4375`, `4383-4385`, `4401-4404`, `4412`, `4415-4416`; `[data-halo-reveal]` `3905-3921`.
- `assets/halo.js:98-108` (drop-bar fill, keyed to the hardcoded `id="haloBars"`) and `:22-33` (reveal); file shared with `main-halo-product` and halo-2 family, and loaded by `layout/theme.liquid:216-218`. Currently a no-op (see Motion inventory).

## Store adaptation findings

1. **The whole section is an unverified performance claim.** Heading default "Dropped until something broke. Then we thickened the corners." (`:4`, `:87`); bars "Casify Halo 12.0 ft", "Rugged bulk case 10.5 ft", "Designer clear case 7.2 ft", "Slim hard shell 5.1 ft", "Marketplace case 2.9 ft", "No case 0.9 ft" (`:117-169`); method "MIL-STD-810G 516.6 Proc. IV · 26 drops · poured concrete · 3 units per model." (`:98`); preset subheading "Every case in this chart was tested on the same rig..." (`:172`). PRODUCT.md Evidence on Hand: "12 ft drop / MIL-STD-810G 516.6 ... not verified and never shown store-wide." Fix: no default or preset may contain a drop figure, a test standard, or a test narrative.
2. **Hardcoded fallback copy that the merchant cannot remove.** When `copy_body` is blank, the section prints three paragraphs of invented engineering (`:28-31`): "DropCore", "honeycomb of sealed air cells", "about 8 milliseconds instead of 2", "corners are 1.9 mm thicker", "Halo is thick exactly where physics needs it". `copy_heading` falls back to "Where the 12 feet actually comes from" (`:25`, default `:104`). Fix: remove the `{% else %}` branch entirely and hide the column when both copy fields are blank.
3. **Another brand's product name.** "Casify Halo" default (`:49`, `:119`), "Halo" in copy (`:31`), schema `name` "Halo — Drop test bars" (`:39`, `:114`), `id="halo-proof"` (`:1`). Casify has no "Halo" line.
4. **Bar width is decoupled from the number.** `pct` (`:59-65`) is typed separately from `feet` (`:53-56`), so the chart can show any proportion regardless of the value. Fix: compute width in Liquid from a numeric value and the max value in the set.
5. **Em dashes.** Tick default `'Section 03 — the bench'` (`:3`, `:81`); fallback copy `:31` "That's the whole trade — Halo...". Fix: remove; and make the "Section 03" tick optional with a blank default (DESIGN.md: no eyebrow above every heading; the number assumes a page order).
6. **`| default:` fallbacks** on tick, heading and copy heading (`:3`, `:4`, `:25`) re-insert the claims when blanked.
7. **Duplicate id.** `id="haloBars"` (`:11`) and `id="halo-proof"` (`:1`) break if placed twice. Use `{{ section.id }}`.
8. **No store data at all.** Nothing reads the product, the catalog or the pack settings.

**Recommended honest rebuild (pick one with the merchant; do not ship the current content):**
- **A. Keep as a gated chart.** Render nothing unless the product carries real test data in a metafield (for example `product.metafields.custom.drop_test`, a JSON or list metafield the merchant fills with a proof link). Section stays orphan until such data exists. This follows the cv-story precedent.
- **B. Repurpose as an honest "Pack savings" bar chart** (fits the user's bundles request): bars for 1, 2 and 3 cases showing the price per case, computed from `product.selected_or_first_available_variant.price` and the live pack percentages. The percentages must come from the buy box on the page (`[data-cv-pack]` `data-cv-qty` / `data-cv-discount`, `sections/cv-product-counter.liquid:584-588`) or from settings that default to 0 and are documented as "must match your automatic discount", since PRODUCT.md requires the page price to equal the checkout price and the live discounts are 18% / 31%. Heading such as "The more cases, the less each one costs". Each bar has a "Choose this pack" button that clicks the real pack radio in the buy box and scrolls there.
- **C. Repurpose as "Phones this case fits"** bars per family (iPhone vs Samsung, or per iPhone generation) counted from the product's model option values (detection pattern `sections/cv-pdp-fit.liquid:12-28`). Overlaps `cv-pdp-fit` (live on product.json:404), so B is the better fit.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Casify/Halo survives 12.0 ft | `:55`, `:120`, `:25`, `:104` | Unbacked (listed as not verified). |
| Rival heights 10.5 / 7.2 / 5.1 / 2.9 ft, no case 0.9 ft | `:128-166` | Unbacked (invented). |
| MIL-STD-810G 516.6 Proc. IV, 26 drops, poured concrete, 3 units per model | `:98` | Unbacked (listed as not verified). |
| "Every case in this chart was tested on the same rig ... with a live phone inside" | `:172` | Unbacked. |
| "Dropped until something broke. Then we thickened the corners." | `:4`, `:87` | Unbacked (implies a test programme). |
| DropCore honeycomb air cells; deceleration 8 ms vs 2 ms | `:30` | Unbacked. |
| Corners 1.9 mm thicker than the back | `:31` | Unbacked. |
| Proposed: pack price per case at 18% / 31% off | option B | Backed when read from the live pack buttons (store's automatic discounts, PRODUCT.md Capabilities and Constraints, checked 2026-09-15). |
| Proposed: number of phone models this case fits | option C | Backed by `product.options_with_values` at render time. |

## Motion inventory

- cv-motion attributes: none.
- `data-halo-reveal` on the header (`:2`) and the copy column (`:24`): hidden by `theme.css:3906` and only revealed by `assets/halo.js:23-33`, which never runs because it exits at `:19-20` (no `.halo-tpl` on any page; layout body class is `template-{{ template.name }}{{ tpl_class }}` with `cv-tpl` only, `layout/theme.liquid:195-201`). **Header and copy are invisible unless the visitor prefers reduced motion** (`theme.css:3918-3921`).
- **Bars never fill, even if halo.js ran.** `.halo-bfill` is `width:100%; transform: scaleX(0)` with a transform transition (`theme.css:3773`), but halo.js writes `style.width = pct%` (`halo.js:102`), never the transform. The tracks stay empty in every state, including reduced motion and no-JS. Only the labels and the "12.0 ft" text show.
- No GSAP, no `shopify:section:load` handling, no section JS of its own.
- No-JS: header and copy hidden, bars empty.

## Motion opportunities

Owned files `assets/cvhdt-bars.css` + `assets/cvhdt-bars-motion.js`, printed by the section (`sections/cv-value-stack.liquid:18,128` idiom; that file's gauge is the closest existing pattern, `assets/cv-value-stack-motion.js:12-17`). Prefix `cvhdt-`, root `data-cvhdt` (unused). Print each bar at its final width inline (`style="--w: 64%"`), so no-JS and reduced motion read correctly; JS sets `scaleX: 0` only right before animating.

1. **(High, for option B) Pack savings bars as a buying moment.** ScrollTrigger `start: "top 75%"`, `once: true`: bars grow left to right in sequence (scaleX, 0.6 s each, stagger 0.15, `power3.out`), each price-per-case label counts down from the single price to its pack price with a snap-to-cent tween formatted by `window.themeMoneyFormat` (`layout/theme.liquid:155`); the 3-case bar lands last and a die-cut "Best value" ticket stamps onto it (only if it really is the lowest per-case price). Clicking a bar or its "Choose this pack" button clicks the real `[data-cv-pack]` in the buy box, then ScrollToPlugin brings `#cvPdp` into view and Flip morphs the clicked bar's ticket toward the pack row (Flip is loaded on product templates, `layout/theme.liquid:173-176`). Listen to `cvs:change` so the active pack's bar stays highlighted (teal edge, DESIGN.md selected state) and prices follow the chosen variant.
2. **(Medium) Header entrance.** SplitText `type: "lines", mask: "lines"` rise for the heading; tick and sub line fade up 8 px; 420 ms soft-out per DESIGN.md timing.
3. **(Low, option A) Gated test chart.** If real data ever exists, scrub the bar growth to scroll (`scrub: 0.6`) with the method note typing in last; still no numbers in defaults.
4. Reduced motion: bars static at final width, numbers final, no Flip; `gsap.matchMedia()` `(prefers-reduced-motion: no-preference)` wraps everything.

## Risks

- Highest claims risk in the family: the section exists to show test results that PRODUCT.md says were never run. Do not "restyle and keep" the content; the merchant already chose removal for cv-story and cv-compare.
- Option B touches pack pricing: it must never compute a price the checkout will not charge. Read the percentages from the live buy box; if the buy box is absent (non-product template), hide the section.
- `.halo-sec*` and `[data-halo-reveal]` rules in theme.css are shared by 8 sections; halo.js is shared with main-halo-product (which owns `#haloBars`-style ids elsewhere). Do not edit them in a parallel pass.
- Section setting ids change under any rebuild; safe now because there are no placed instances.
