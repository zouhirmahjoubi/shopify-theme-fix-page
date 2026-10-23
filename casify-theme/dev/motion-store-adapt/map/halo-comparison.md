# halo-comparison ("Halo — Comparison")

## Status

**Orphan.** Not referenced by any `templates/*.json` or `sections/*-group.json`. No `enabled_on`, preset present (`sections/halo-comparison.liquid:114-219`), so it can be added to any template from the editor, and the preset's invented spec table would then ship as-is.

The live product template already carries an honest comparison: `cv-vs` ("Us vs. them", `templates/product.json:432`, `sections/cv-vs.liquid`), and the home `cv-compare` was removed from `templates/index.json` for exactly this reason (PRODUCT.md, 2026-09-16: "comparison table vs. unnamed rivals with invented numbers ... removed").

## Purpose

A spec table: first column "Casify Halo" (highlighted), then rival columns ("Designer clear case", "Rugged bulk case"), rows of measured specs (drop height, MagSafe pull force, thickness, weight, yellowing, camera lip, lab data, screen cover, price). Each cell is a text setting encoded as `value||kind` where kind is `val|yes|no`.

## Files (owned / shared)

Owned:
- `sections/halo-comparison.liquid` (221 lines; no `stylesheet_tag`, no `render`, no script).

Shared:
- `assets/theme.css`: §31 section helpers `.halo-sec`, `.halo-sec__hd` `3689-3693` (shared with halo-drop-test, halo-faq, halo-reviews, halo-three-fixes, halo-why-love, halo-xsell, halo-yellowing); §36 comparison table `3805-3818` (only this section uses `.halo-cmp*`); small-screen overrides `4146-4147`, `4373-4375`, `4389`, `4405-4408`, `4412`, h2 cap `4496`; `[data-halo-reveal]` primitives `3905-3921`.
- `assets/halo.js` (shared with main-halo-product and the halo-2 family; currently a no-op, see Motion inventory) loaded by `layout/theme.liquid:216-218`.

## Store adaptation findings

1. **Every preset number is invented, and names a product Casify does not sell.** Preset rows `sections/halo-comparison.liquid:137-216`: 12 ft vs 7.2 ft vs 10.5 ft; 1,400 g vs 850 g vs 1,100 g; 2.8 mm vs 3.1 vs 6.4; 24 g vs 31 vs 78; "Yellowing at 36 months: None vs Visible by month 4"; camera lip 1.4 / 0.6 / 1.5 mm; "Published lab data: Yes"; "Pays for your screen: Up to $200"; price "$39 / $65+ / $55". PRODUCT.md Evidence on Hand lists 12 ft, 1,400 g, 2.8 mm, 36-month clarity and the $200 Screen Promise as not verified; no rival data exists. Fix: delete the preset rows and columns entirely (preset with zero blocks), and change block defaults to blank.
2. **Block defaults would ship claims on every new block.** Column default "Casify Halo" (`:58`); row defaults "Drop height" + "12 ft||val", "7.2 ft||val", "10.5 ft||val", "—||val" (`:70-94`). Fix: blank defaults; render a row only when its label and at least the first cell are filled.
3. **Hardcoded "Halo" heading and "Measured spec".** Heading fallback `:4` and default `:111` "Halo vs. the case you're using right now"; header cell `:12` "Measured spec" is literal and asserts measurement. Fix: heading default "How this case compares" (or blank and hide); header cell from a setting (`label_col`, default "Feature").
4. **Hardcoded prices and currency.** Price row "$39", "$65+", "$55" (`:211-215`) as free text. Casify prices are $23.99 to $49.99 and the currency comes from the shop. Fix: if a price row is wanted, the "us" price must be `product.price | money` (or the chosen variant's price via `cvs:change`), never typed; rival prices should not be shown at all without a source.
5. **Em dashes in shopper copy.** Tick default `'Section 05 — side by side'` (`:3`, `:105`), cell default `"—||val"` (`:94`), preset `"N/A — opaque||no"` (`:178`). Fix: no dashes; use "Not stated" or leave the cell empty and render a visually hidden "Not stated" for AT.
6. **`| default:` fallbacks re-insert Halo copy when blanked.** `:3`, `:4`. Fix: hide the tick/heading when blank. Also DESIGN.md "Don't place an eyebrow label above every heading": make the tick optional with blank default; "Section 05" assumes a page order that no template has.
7. **"Us" highlight depends on block order (bug).** `col-us` is applied with `forloop.first` inside loops over all `section.blocks` (`:15`, `:34`). If the merchant drags a row block above the first column block, `forloop.first` lands on a skipped row block and no column is highlighted. Fix: use the column counter (`ci == 1`) in both loops.
8. **Column count silently capped at 4.** Cells exist only as `cell_1`..`cell_4` (`:73-94`); a fifth column renders blank cells. `max_blocks: 16` is shared by columns and rows. Fix: document the cap in the column block `info`, or restructure as "us/them" pairs like `cv-vs`.
9. **Encoded cell syntax is merchant-hostile.** `value||kind` strings (`:30-33`) are easy to break. Fix: separate `text` + `select` (Value / Yes / No) settings per cell.
10. **Accessibility.** No `<caption>` or accessible name on the table (`:9`); yes/no state carried by colour only on `.yes` / `.no` (`theme.css:3816-3817`) when values are not literally "Yes"/"No"; add a visually hidden "Included" / "Not included" when kind is yes/no.
11. **No store binding.** Nothing reads the product. Honest bindings available: "us" column title = `product.title` or `shop.name` (pattern in `sections/cv-vs.liquid:19`), phone-model count from the model option (detection pattern `sections/cv-pdp-fit.liquid:12-28`), price from the variant, confirmed service facts (free shipping, 30-day returns, 1-3 business days). Rival columns have no honest data source; recommended shape is "This case" vs "A generic case" rows that only state Casify facts and leave the rival side as merchant text the merchant must type (blank default).
12. **Editor name.** Schema `name` "Halo — Comparison" (`:48`, `:116`). Rename "Casify: comparison table".

Recommendation: unless the merchant supplies real comparison data, either keep this orphan with an empty preset, or rebuild it as a facts table bound to store data (see Motion opportunities). Do not reintroduce the cv-compare content PRODUCT.md records as removed.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Drop height 12 ft / 7.2 ft / 10.5 ft | `:139-142`, defaults `:70-94` | Unbacked (12 ft listed as not verified; rival figures invented). |
| MagSafe pull 1,400 g / 850 g / 1,100 g | `:148-151` | Unbacked. |
| Back thickness 2.8 / 3.1 / 6.4 mm | `:157-160` | Unbacked. |
| Added weight 24 / 31 / 78 g | `:166-169` | Unbacked. |
| No yellowing at 36 months; rivals yellow by month 4 | `:175-178` | Unbacked. |
| Camera lip 1.4 / 0.6 / 1.5 mm | `:184-187` | Unbacked. |
| "Published lab data: Yes" | `:193-196` | Unbacked (no lab data exists). |
| "Pays for your screen: Up to $200" | `:202-205` | Unbacked (Screen Promise not verified). |
| Price $39 vs $65+ vs $55 | `:211-214` | Unbacked; hardcoded currency; real prices $23.99 to $49.99. |
| "Measured spec" header | `:12` | Unbacked framing. |
| Possible honest rows: free shipping on every order, 30-day returns, ships in 1-3 business days | proposed | Backed (PRODUCT.md Capabilities and Constraints). |
| Possible honest rows: models this case fits (count), price | proposed | Backed by store data at render time (`product.options_with_values`, `variant.price`). |
| 2 and 3 case pack savings 18% / 31% | proposed | Backed only if read from the live buy box (`data-cv-discount`, `cv-product-counter.liquid:588`), not typed. |

## Motion inventory

- cv-motion attributes: none.
- `data-halo-reveal` on the header (`:2`). Its CSS starts hidden (`theme.css:3906`, opacity 0) and only `assets/halo.js:23-33` reveals it, but halo.js exits at `:19-20` because no page renders `.halo-tpl` (only other reference is `theme.css:3902`). **Result: the tick and heading are invisible for every visitor with motion allowed, with or without JS.** Only `prefers-reduced-motion: reduce` shows them (`theme.css:3918-3921`).
- The table itself has no motion.
- No GSAP, no section-specific JS, no `shopify:section:load` handling.
- No-JS: header invisible (above); table visible.

## Motion opportunities

New owned files `assets/cvhcm-compare.css` + `assets/cvhcm-compare-motion.js` printed from the section (idiom: `sections/cv-value-stack.liquid:18,128`). Prefix `cvhcm-`, root `data-cvhcm` (unused). Finished state in CSS; JS only adds from-states when GSAP + ScrollTrigger exist and motion is allowed; `gsap.matchMedia()`; `shopify:section:load` / `unload` with `ctx.revert()` (pattern: `assets/cv-vs.js:338-374`).

1. **(High, cheap) Fix visibility first.** Replace `data-halo-reveal` with `data-cv-reveal` or the owned GSAP reveal so the header shows.
2. **(Medium) Row-by-row "ticket stamp" reveal.** ScrollTrigger batch on rows (`ScrollTrigger.batch`, `start: "top 85%"`): the row slides from y 12 with the "us" cell stamping last (scale 1.12 to 1, CustomBounce "candy" spring, 240 ms); yes-cells draw a DrawSVG check, no-cells a light cross. Reduced motion: none.
3. **(Medium) Highlighted column as a moving brass slider.** One gold column band (absolutely positioned) slides into place behind the "us" column once the table enters; on mobile (table in a horizontal scroller, `theme.css:4407-4408`) use a sticky first column and animate only the band.
4. **(High, if rebuilt on store data) Live "this case" column on product pages.** Listen to `cvs:change` on `[data-cv-pdp]`: when the shopper picks a model, the "Fits" row flips (rotationX) to "Made for iPhone 16 Pro"; the price cell rolls to the new total with a number tween, matching the buy box. Add a small "Choose this case" button under the column that scrolls (ScrollToPlugin) to `#cvPdp` and focuses the model select; never add to cart from here.
5. **(Low) Count-ups.** Only for numbers that come from store data (model count), using `data-cv-count` (`cv-motion.js:97-118`) or a GSAP snap tween.

## Risks

- Schema change: removing the `value||kind` cells or renaming setting ids would drop data from any existing instance; none exist today (orphan), so it is safe now.
- `.halo-sec`/`.halo-sec__hd`/`[data-halo-reveal]` in theme.css are shared by 8 sections; do not alter them in a parallel pass.
- Comparison tables are a claims magnet: any merchant-typed rival column must default to blank and be documented in `info` as "state only what you can show proof for".
- The mobile table relies on an inner horizontal scroller (`theme.css:4407-4408`); keep that so the page never scrolls sideways.
