# cv-value-stack ("Convert — Value stack", home "why it wins")

## Status

Live, home page only.
- `templates/index.json:1048`: key `value`, 10th of 21 sections (after `collage`, before `us_vs_them`).
- Saved blocks (`templates/index.json:1049-1210`): 3 `fix` rows (fix-0..fix-2), 6 `benefit` cards (ben-0..ben-5), 6 `bar` gauge columns (bar-0..bar-5). Settings `:1212-1220`.
- PRODUCT.md:41 and :49 record that on 2026-09-15 the merchant was told this content is fabricated (a named-type drop-test comparison attributed to an "independent lab" and MIL-STD-810G, never run) and chose to keep every word and number, with only visuals/motion redone. PRODUCT.md:104 lists 12 ft / MIL-STD-810G, 1,400 g, 2.8 mm and 36-month clarity as "Not verified and never shown store-wide".

## Purpose

Three block-driven parts (`sections/cv-value-stack.liquid:9-16`):
1. Problem / fix rows (`:40-78`): brass medallion icon, a count-up metric (`metric_value` + `metric_unit`), problem heading, rich-text fix, and a "them vs us" balance beam.
2. Benefit grid (`:80-100`): icon + title + body cards.
3. Proof gauge (`:102-126`): vertical bars per contender with displayed value and fill %, ours flagged with a candy-cane icon, and a footnote.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-value-stack.liquid` (206 lines).
- `assets/cv-value-stack.css` (135 lines; loaded at `:18`).
- `assets/cv-value-stack-motion.js` (122 lines; printed by the section at `:128`, not by the layout).
- `assets/icon-candy-swirl.svg` (6 lines; `inline_asset_content` at `:31`; grep finds no other user).
- The `cvvs-pending` inline head script (`:19-25`) and CSS (`assets/cv-value-stack.css:12-14`).
- `.cv-values` rules in `assets/theme.css` (grep: only this section uses `cv-values`); the FILE is shared.

Shared (coordinate before editing):
- `snippets/cv-icon.liquid`: `honeycomb`, `magnet-ring`, `no-yellow`, `drop-shield`, `slim`, `uv-sun`, `wireless-charge`, `camera-lip`, `button-click`, `precision-fit`, `sparkle-clear`, `returns`, `warranty-seal`, `truck-fast`, `cross`, `check`, `candy-cane`, `lab` (all exist).
- `assets/theme.css`: `.cv-sec`, `.cv-sec__hd`, `.cv-sec__lede`, `.cv-eyebrow`, `[data-cv-reveal]`, `.cv-split .cv-word`, and the older `.cv-fix/.cv-proof/.cv-bar` shell selectors this section still relies on (`assets/cv-value-stack.css:6-8`).
- `assets/cv-motion.js`: `data-cv-reveal`, `data-cv-split`.
- **Attribute collision with cv-vs:** the root carries `data-cvvs` (`sections/cv-value-stack.liquid:28`), the same attribute as `sections/cv-vs.liquid:34`. `assets/cv-vs.js:355-359` filters it out (`cvvsIsVs`), but `assets/cv-value-stack-motion.js:25` uses `document.querySelector('[data-cvvs]')`, i.e. the FIRST match on the page. It works only because `value` sits above `us_vs_them` in `templates/index.json`. The `cvvs-` class prefix also overlaps cv-vs's `cvvs__` BEM prefix (different separators, no actual rule collision today). Rename to `data-cvvst` / `cvvst-` in this section's owned files if it is reworked; do not touch cv-vs files.
- GSAP core, ScrollTrigger, CustomBounce (always loaded by `snippets/gsap.liquid:23`, `:36`).

## Store adaptation findings

1. **The whole section is fabricated performance data shown store-wide (high).** Fix rows: `templates/index.json:1054-1061` (12 ft, "26 drops onto concrete from 12 feet, no phone damage", them "6–8 ft"), `:1068-1075` (1400 g, "Eighteen N52 magnets", "Qi2 25W", them "800–900 g"), `:1082-1089` (36 mo, "No shift at 36 mo", them "Yellow by month 4"). Gauge: `:1141-1190` (Casify 12.0 ft, "Rugged bulk case" 10.5 ft, "Designer clear case" 7.2 ft, "Slim hard shell" 5.1 ft, "Marketplace case" 2.9 ft, "No case" 0.9 ft). Footnote `:1219` "Independent lab, 26 drops per unit onto concrete, MIL-STD-810G 516.6." Sub-heading `:1215` "Three measurements, each one taken in a lab and published in full." Proof eyebrow `:1217` "Measured, not claimed". None is in PRODUCT.md Evidence on Hand; PRODUCT.md:49 says the test was never run. On the home page these numbers also apply to every product, including the chain crossbody case.
   Fix (honest rebuild, merchant confirmation required): keep the three-part layout and motion, re-source the content:
   - Fix rows become real facts with real numbers: "Made for your exact phone" with the live count of phone models (`collections.all.products` loop over `product.options_by_name['Model'].values`, or a merchant `collection` setting), "Pack of 2: 18% off each / Pack of 3: 31% off each" (setting-backed, PRODUCT.md:39), "Ships in 1 to 3 business days" (metric `3`, unit `days`), "30-day returns" (metric `30`, unit `days`).
   - Gauge becomes a pack-savings gauge (1 case 0%, 2 cases 18%, 3 cases 31%) from section settings `pack_2_pct`/`pack_3_pct` (defaults 18/31, `info`: "must match the store's automatic discounts"), or is removed. Never competitor drop heights.
   - Or: on product templates only, read per-product metafields (e.g. `product.metafields.custom.drop_height_ft`, `custom.magnet_hold_g`) and hide a row when its metafield is blank, as PRODUCT.md:104 allows claims "only on a product whose own data states them".
2. **Benefit cards carry unverified specs (high).** `templates/index.json:1096-1097` "Qi2 25W charging", `:1104-1105` "1.4 mm of rim", `:1112-1113` "Harder-durometer covers", `:1120-1121` "Cut from the CAD file / One mould per model", `:1128-1129` "Anti-fingerprint coat", `:1137` "refunded as soon as it's scanned". Only "30 days to decide" is backed. Replace with confirmed facts (free shipping, 30-day returns, 1 to 3 day dispatch, pack savings, "Pick your exact phone model", "Every photo is the real case") or product-data-driven cards.
3. **Schema defaults and preset ship the same fabricated content (high).** `sections/cv-value-stack.liquid:134-140` (eyebrow, heading, footnote default "Independent lab..."), `:152-159` (fix defaults 12 / ft / "6–8 ft" / "12 ft"), `:172-173`, `:176-179`, preset `:187-201`. Also the Liquid fallbacks `:32` ("Section 02 — why it wins"), `:34` ("Three things every other case gets wrong"), `:107-108` ("Measured, not claimed", "Drop height before the phone was damaged"). Adding the section from the editor reproduces the whole fabricated set. Fix: neutral defaults and an honest preset.
4. **Em and en dashes (medium).** Template: `templates/index.json:1057`, `:1059`, `:1071`, `:1073`, `:1085`, `:1097`, `:1121`, `:1213`. Schema: `sections/cv-value-stack.liquid:32`, `:134`, `:157`, `:187-190`, `:193`; schema labels `:132`, `:156-159`, `:185` are editor-only (fix anyway for consistency, not required).
5. **Disparaging comparative headline (medium).** "Three things every other case gets wrong" (`templates/index.json:1214`, default `:135`) and "Typical slim case" / "Category average" / "Standard TPU" columns. cv-vs schema guidance (`sections/cv-vs.liquid:131`) already says to compare only what can be backed. Proposed: "Why shoppers pick Casify" style heading with service facts.
6. **Stale numbering eyebrow (low).** `templates/index.json:1213` "Section 01" on the 10th section; DESIGN.md:198 discourages eyebrows on every heading. Remove.
7. **Metric count-up breaks non-numeric metrics (medium, latent).** `assets/cv-value-stack-motion.js:61` sets the number to "0", then `:70` `parseFloat(data-value) || 0` counts to 0 for any non-numeric value (e.g. "Free", "Any"), leaving "0" on screen permanently. Must be fixed before honest rows use words. Also `:43` drops thousands separators ("1400" vs the beam's "1,400 g").
8. **Single-instance, page-first motion binding (medium).** `assets/cv-value-stack-motion.js:25` binds only the first `[data-cvvs]`; a second value stack, or cv-vs placed above it, gets no motion. No `shopify:section:load/unload` handlers; ScrollTriggers are not in a `gsap.context` and are never killed.
9. No candy-as-product copy (the candy-cane flag `:115` and candy-swirl eyebrow icon `:31` are shop dressing, acceptable), no prices, no phone model lists. "Casify" as `us_title`/bar name is correct brand.

## Claims register

| Claim | Where | Status |
|---|---|---|
| 12 ft drop, 26 drops onto concrete, no phone damage | `templates/index.json:1054-1061`, `:1144`, `:1219`; preset `:187`, `:196` | Unbacked (PRODUCT.md:104, :49) |
| Typical slim case 6–8 ft | `:1059` | Unbacked |
| MIL-STD-810G 516.6, independent lab | `:1219`; default `:140` | Unbacked (PRODUCT.md:104) |
| 1,400 g magnet hold, 18 N52 magnets | `:1068-1075`; preset `:188` | Unbacked (PRODUCT.md:104) |
| Category average 800–900 g | `:1073` | Unbacked |
| Qi2 25W full-speed charging | `:1071`, `:1096-1097`; preset `:188`, `:190` | Unbacked |
| No colour shift at 36 months; standard TPU yellow by month 4 | `:1082-1089`; preset `:189` | Unbacked (PRODUCT.md:104) |
| Competitor drop heights 10.5 / 7.2 / 5.1 / 2.9 / 0.9 ft | `:1150-1190`; preset `:197-201` | Unbacked, fabricated test data |
| "Three measurements, each one taken in a lab" | `:1215` | Unbacked |
| "Measured, not claimed" | `:1217`; default `:138` | Unbacked |
| 1.4 mm camera lip | `:1105`; preset `:191` | Unbacked |
| Harder-durometer button covers | `:1113`; preset `:192` | Unbacked |
| Cut from CAD file, one mould per model | `:1120-1121`; preset `:193` | Unbacked |
| Anti-fingerprint coat | `:1128-1129`; preset `:194` | Unbacked |
| 30 days to decide | `:1136`; preset `:195` | Backed: PRODUCT.md:34 |
| Prepaid label, refunded as soon as scanned | `:1137`; preset `:195` | Unbacked detail |

## Motion inventory

- `data-cv-*`: `data-cv-reveal` on the header (`:29`) and the benefits heading (`:86`); `data-cv-split` on the `h2` (`:34`).
- Section JS `assets/cv-value-stack-motion.js` (GSAP + ScrollTrigger + optional CustomBounce `:32`): fix rows slide in, medallion pops, metric counts up, beam bar tips (`:49-75`); benefit cards stagger up (`:78-84`); gauge columns rise with value count-up and the flag drops (`:87-119`).
- Pre-hide: inline head script adds `cvvs-pending` to `<html>` (`sections/cv-value-stack.liquid:19-25`), hiding rows/benefits/gauge for up to 1.6s (`assets/cv-value-stack.css:12-14`); skipped under reduced motion.
- Reduced motion: JS returns early (`:24-26`); head script skips (`:21`). CSS has no reduced-motion block, but nothing animates in CSS except `cv-icon animate: true` (reset in `assets/theme.css:3226-3230`).
- No-JS: the fix/benefit/gauge content is fully readable (markup prints final values and fills), but the header (`[data-cv-reveal]`) and the benefits heading stay at opacity 0 (`assets/theme.css:1073`).
- Editor: no `shopify:section:load/unload` handling; after an edit the section renders static (readable), and orphaned ScrollTriggers from the first load remain.
- GSAP plugins used: ScrollTrigger, CustomBounce (optional). Not used: SplitText (the heading uses cv-motion's word split instead).

## Motion opportunities

1. **High: make the motion file reusable before any content change.** Wrap in `init(root)` / `destroy(root)` with `gsap.context(..., root)`, iterate `document.querySelectorAll('[data-cvvst]')` (renamed attribute), add `shopify:section:load/unload` and `shopify:block:select` (jump timeline to end), and keep the "print final values, zero only when about to animate" contract (`:5-10`). Fix the non-numeric metric bug (only count when `/^\d[\d,.]*$/` matches; otherwise leave text and pop it).
2. **High (packs/bundles): pack-savings gauge.** Turn the proof gauge into three columns "1 case", "2 cases, 18% off each", "3 cases, 31% off each" whose heights are the real percentages; GSAP rises them with `cvvsDrop` bounce and counts the % up; the candy-cane flag lands on the 3-case column. Each column links to `/collections/all` (or opens quick pick for a merchant-picked product via `data-cvqp-open`). Values from section settings that must match the live automatic discounts (PRODUCT.md:39).
3. **Medium: balance beam on honest pairs.** Reuse the them/us beam for service facts the merchant can stand behind ("Shipping: often added at checkout" vs "Free on every order"), matching the cv-vs rows already live (`templates/index.json:1242-1243`). Beam tips with `CustomBounce`, DrawSVG check on "us" side.
4. **Medium: heading with SplitText masks.** Replace `data-cv-split` with SplitText `mask: 'words'` rise (same idiom as `assets/cv-collage-motion.js:107-109`), reverted on complete; reduced motion leaves plain text.
5. **Low: scroll-scrubbed medallion rotation.** A light `scrub: 0.6` rotation (max 8deg) on `.cvvs-fix__medal` while the row crosses the viewport; disabled on touch devices.
6. Add to cart / Buy now / cart drawer: only via opportunity 2's quick-pick link; this section has no buy box and must not invent one.

## Risks

- **Merchant decision on record.** PRODUCT.md:49 says the merchant chose to keep this content word-for-word on 2026-09-15. The current user request ("adapt all section with my store") and this project's hard rules point the other way. The implementing agent must show the merchant the before/after copy and get explicit confirmation before editing `templates/index.json` `value` or the preset. Motion-only refactors (opportunity 1) are safe without it.
- `data-cvvs` / `cvvs-` prefix is shared with cv-vs. If cv-vs is edited in parallel, neither agent should rename the other's attribute; this section should move to its own prefix.
- `assets/theme.css` `.cv-values/.cv-fix/.cv-proof/.cv-bar` are shared shell selectors (PRODUCT.md:43 describes a past collision on `.cv-proof`); do not edit them from here.
- The inline head script hides content for 1.6s; if motion changes, keep that window or remove it, never lengthen it.
