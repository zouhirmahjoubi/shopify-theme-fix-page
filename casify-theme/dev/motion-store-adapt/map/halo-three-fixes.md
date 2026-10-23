# halo-three-fixes ("Halo [em] Three fixes")

Family: halo-2. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
In quotes, `[em]` / `[en]` mark an em / en dash that exists in the source (never copy them forward).

## Status

**orphan**: placed in no `templates/*.json` and in neither `sections/header-group.json` nor
`sections/footer-group.json` (grep for `"type": "halo-three-fixes"` returns nothing). No `enabled_on`,
so the merchant can add it to any template, and the preset (:81-116) ships as is.

## Purpose

A three-card "the problem" band: each `fix` block prints a big metric with a unit, a title, a richtext
body and a "compare" line. Written for a fictional "Halo" case (DropCore corners, N52 magnet ring,
ClearGuard coating). Today it carries no product, collection or shop data at all.

## Files (owned / shared)

Owned:
- `sections/halo-three-fixes.liquid` (119 lines; no own CSS, JS, snippet or image)

Shared (do not edit from this lane):
- `assets/theme.css`: base `.halo-sec*` (:3689-3693, mobile :4373-4375, :4412, :4496, used by every
  halo section); `.halo-fixes` / `.halo-fix*` (:3696-3720, :4145, :4376-4379, :4413-4414; only this
  section prints these classes, but the file is shared); `[data-halo-reveal]` and `.halo-stagger`
  primitives (:3906-3916, reduced motion :3918-3921; `.halo-stagger` is also used by halo-reviews,
  halo-xsell, main-halo-product); universal reduced-motion block (:3307-3314).
- `assets/halo.js`: loaded by `layout/theme.liquid:216-218` whenever the page contains `halo-`, but it
  returns immediately because it needs a `.halo-tpl` element (halo.js:19-20) and the layout only ever
  prints `cv-tpl` on `<body>` (layout/theme.liquid:196-201). Shared with main-halo-product,
  halo-drop-test, halo-yellowing, halo-comparison and others.

Implementation note: put new styles and motion in NEW owned files (for example
`assets/cv-fit-facts.css` + `assets/cv-fit-facts.js`, prefix `cvff`) instead of editing theme.css or
halo.js.

## Store adaptation findings

1. **H, heading invisible once placed.** The header wrapper has `data-halo-reveal` (:2), which is
   `opacity: 0; transform: translateY(8px)` in plain CSS (theme.css:3906) and is only revealed by
   halo.js, which never runs (halo.js:19-20 vs layout/theme.liquid:196-201). Shoppers see an empty
   gap where the tick, heading and subheading should be; only reduced-motion users see it
   (theme.css:3919). Fix: drop `data-halo-reveal`; reveal from the new owned script with the
   pending-class pattern (MOTION-SYSTEM.md 4.3) so the no-JS state is fully visible.
2. **H, another brand and invented product tech.** "Halo" in the heading default (:4, :73), compare
   lines (:56, :92, :102, :112), preset bodies naming "DropCore" (:91) and "ClearGuard" (:111). Casify
   sells many case families (magnetic, stand, clear, metal lens-ring, airbag corner, crossbody); none
   is called Halo. Fix: remove every "Halo" string; schema name "Fit facts" (or "Three things to
   check"); no invented sub-brand names.
3. **H, every metric is an unbacked performance claim.** 12 ft (:33, :88), 1,400 g (:98), "0 Δb after
   36mo" (:108-109), "26 drops onto concrete, no phone damage" (:91), "Eighteen N52 magnets",
   "charges at the full Qi2 25W" (:101), "no measurable colour shift after the equivalent of three
   years outdoors" (:111), category averages "6[en]8 ft", "800[en]900 g", "visible by month 4"
   (:56, :92, :102, :112). PRODUCT.md:103 lists 12 ft, 1,400 g and 36-month clarity as "Not verified
   and never shown store-wide". Fix: rebuild the block so the metric is chosen from live data, not
   typed. Replace the free-text `metric`/`unit` settings with a `source` select:
   - `models`: count of values of the phone-model option, detected by option name (match
     /model|phone|device/i, never by position; STORE-FACTS.md "How variants and options are named"),
     unit "phone models", title "Made for your exact phone".
   - `styles`: count of values of the style/colour option, unit "styles".
   - `returns`: 30, unit "day returns" (PRODUCT.md:34).
   - `dispatch`: "1 to 3", unit "business days to dispatch" (PRODUCT.md:34).
   - `pack`: a `range` setting `pack_pct` (default 31, info "must match the automatic discount",
     PRODUCT.md:39), unit "% off a 3-case pack".
   - `custom`: merchant-typed metric with info "Only facts printed on this product's own data".
   Render a block only when its value resolves (for example `models` needs a product with a model
   option); when `product` is blank (non-product template) hide `models`/`styles` blocks.
4. **H, preset ships the fabricated copy.** The whole preset (:81-116) is the three claims above.
   Fix: preset with three blocks `source: models`, `source: returns`, `source: pack`, titles
   "Made for your exact phone", "Thirty days to decide", "Better in a pack", bodies from confirmed
   facts only (for example "Pick only from the phones this case is made for.").
5. **M, em and en dashes in shopper copy.** Tick default "Section 01 [em] the problem" (:3, :67); compare
   defaults "6[en]8 ft", "800[en]900 g" (:56, :92, :102); preset bodies with " [em] " (:91, :101, :111).
   Also the meaningless "Section 01" numbering (no other section uses it on a Casify page). Fix: blank
   tick default (DESIGN.md Don'ts: no eyebrow above every heading), plain commas or "to".
6. **M, editor name with em dash** "Halo [em] Three fixes" (:23, :83). Fix: "Fit facts".
7. **M, invalid nesting.** `subheading` is richtext (outputs `<p>…</p>`) printed inside `<p>` (:5-6),
   giving `<p><p>…</p></p>`. Fix: wrap in `<div class="...__lede">`.
8. **L, `block.settings.body`** richtext is printed raw (:14), fine for richtext; keep. Title and
   metric are escaped (:12-13), keep.
9. **L, no heading fallback logic.** `default:` in Liquid (:3-4) means clearing the setting in the
   editor still prints the old Halo copy. Fix: no Liquid `default:` on copy; render the element only
   when the setting is not blank.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Every case fails at one of three things. Halo was built around all three." | :4, :73 | UNBACKED (another brand, generalisation) |
| 12 ft drop | :33, :56, :88, :92 | UNBACKED (PRODUCT.md:103 not verified) |
| "26 drops onto concrete, no phone damage" | :91 | UNBACKED |
| Typical slim case 6 to 8 ft | :56, :92 | UNBACKED (competitor figure) |
| 1,400 g magnet hold, "Eighteen N52 magnets" | :98, :101, :102 | UNBACKED (PRODUCT.md:103) |
| "charges at the full Qi2 25W" | :101 | UNBACKED |
| Category average 800 to 900 g | :102 | UNBACKED |
| 0 colour shift after 36 months, "three years outdoors" | :108-112 | UNBACKED (PRODUCT.md:103) |
| "Clear turns yellow by month four", "Standard TPU: visible by month 4" | :110, :112 | UNBACKED |
| Proposed: phone-model count, style count | rebuild | LIVE (product options) |
| Proposed: 30-day returns, 1 to 3 business day dispatch | rebuild | BACKED (PRODUCT.md:34) |
| Proposed: 31% off a 3-case pack | rebuild | BACKED (PRODUCT.md:39), render from a setting |

## Motion inventory

- cv-motion attributes: none.
- `data-halo-reveal` on the header (:2): dead, content stays hidden (finding 1).
- `.halo-stagger` grid (:9): pure CSS `cm-rise` animation with nth-child delays (theme.css:3908-3916),
  runs on page load even when the section is far below the fold, so the shopper never sees it.
  Ends visible; no JS dependency.
- `.halo-fix:hover` lift (theme.css:3708) with `--ease-candy`.
- Reduced motion: universal block (theme.css:3307-3314) shortens the stagger; `[data-halo-reveal]`
  forced visible (theme.css:3919).
- No section JS, no GSAP, no ScrollTrigger, no `shopify:section:load/unload` handling.
- No-JS state: cards visible, header hidden (bug).

## Motion opportunities

1. **(High) Scroll-led entrance that is readable without JS.** Owned `assets/cv-fit-facts.js`
   (classic IIFE, house shape MOTION-SYSTEM.md 4.1-4.6): `gsap.context` per root; `ScrollTrigger`
   `start: 'top 80%'`, `once: true`; heading `SplitText` lines rise (plain-text heading only, set
   `aria-label`), cards `y: 24, rotation: -1.5 -> 0` with `stagger: .08` and `ease: 'back.out(1.4)'`
   like tickets being dealt; the metric number counts up (use `data-cv-count` only if the section
   also adopts `data-cv-reveal`, otherwise a GSAP `innerText` snap tween) from 0 to the LIVE value.
   Pending class only on decoration, never on the numbers. Reduced motion: no tween, final values.
   `shopify:section:load` remount, `unload` -> `ctx.revert()`.
2. **(High) Tie a card to the buy box.** On product templates the `models` card can carry a
   "Find my model" button that scrolls to `#cvPdp` (existing `data-cv-scroll-to-buy`,
   cv-motion.js:235-241) and, with GSAP ScrollTo, pulses the model select once it lands (dispatch
   nothing; motion never owns state, MOTION-SYSTEM.md 4.9). The `pack` card can dispatch
   `cvs:pack` `{ qty: 3 }` on the `[data-cv-pdp]` root (cv-product.js:536) to pre-select the 3-pack,
   then scroll to the buy box; animate the pack ribbon wiggle (CustomWiggle is always loaded).
3. **(Medium) Ticket stamp on the unit label**: DrawSVG an underline or a dashed ticket edge per card
   (DrawSVGPlugin always loaded) after the count completes.
4. **(Low) Hover**: keep the CSS lift; add `data-cv-tilt` on each card for fine pointers (no hidden
   state, safe without JS).

## Risks

- Placing it as is publishes three fabricated performance claims and another brand name; fix the
  preset and Liquid defaults before any placement.
- theme.css and halo.js are shared; the `.halo-fix*` rules are only used here but live in the shared
  file. Scope new styles under a new prefix rather than editing them.
- Option detection must use option names; option order differs between products (PRODUCT.md:31).
- A `custom` metric source keeps a free-text door open; its info text must restate the honesty rule.
- `data-cv-reveal` / `data-cv-split` (cv-motion.js) are invisible without JS (MOTION-SYSTEM.md 3.4)
  and never re-scan after a theme-editor load; prefer the owned GSAP script with a pending class.
