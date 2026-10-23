# cv-howto ("Convert — How it works")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. No `enabled_on`, so a merchant can add it
to any template from the editor; the preset (sections/cv-howto.liquid:74-82) then ships its defaults to shoppers.
Written for the old converting PDP (header comment :1-7: "between 'why it wins' and the drop-test story").

## Purpose

A numbered "how it works" strip: eyebrow, split heading, optional lede, up to 5 step cards (icon, number,
title, body), and a ghost button that scrolls back to the buy box (`data-cv-scroll-to-buy`).

## Files (owned / shared)

Owned:
- `sections/cv-howto.liquid` (85 lines). No owned asset files.

Shared:
- `assets/theme.css`: `.cv-howto` (:1009), `.cv-howto__grid` (:1695, :3112, :3126), `.cv-step*` (:1696-1714),
  plus the generic `.cv-sec`, `.cv-sec__hd`, `.cv-eyebrow`, `.cv-cta`, `.cv-cta--ghost`, reveal rules
  (:1073-1092) and reduced-motion mirror (:3219-3270). The `.cv-howto`/`.cv-step` rules are howto-only by grep
  but live in the global stylesheet.
- `assets/cv-motion.js` (every page): `data-cv-reveal`, `data-cv-split`, `data-cv-stagger`, `.cv-cta` magnet,
  `data-cv-scroll-to-buy` (:235-241, targets `.cv-buy` or `#cvPdp`, which exist only in
  sections/cv-product-counter.liquid and sections/cv-product.liquid).
- `snippets/cv-icon.liquid` (53 files; `animate: true` adds `cv-ico--anim` CSS keyframes, cv-icon.liquid:21-24).
- `layout/theme.liquid`: no loader keys off this section.

## Store adaptation findings

1. HIGH (unbacked claims in defaults and preset): heading default "From checkout to drop-tested in one trip"
   (:12, :47); step bodies "Cut from your phone's own CAD file, not a universal shell ... the fit is exact, down
   to the camera lip" (:69, :78); "Snap it on in seconds ... every button still feels factory-tight" (:79);
   "Ships protected, same day. Order before 2pm CT and it leaves Austin today — backed by the Screen Promise and a
   2-year warranty" (:80). PRODUCT.md:104 lists "Ships in 24h from Austin, TX" and the $200 "Screen Promise" as
   NOT verified; PRODUCT.md:34 says dispatch is 1 to 3 business days with "No dispatch location and no order-by
   countdown"; no warranty, CAD or drop test is in "Evidence on Hand" (PRODUCT.md:99-105). STORE-FACTS.md 7f
   (:85-87) logs the same. Fix: rewrite heading, lede and preset to confirmed facts only, e.g.
   heading "From your model to your door", lede "Three steps, and nothing to guess.", steps:
   (1) `precision-fit` "Pick your exact model": "Choose your phone model on the product page. Each case lists
   the models it is made for." (2) `gift` or `check` "Build a pack if you like": "Choose 2 or 3 cases, each with
   its own colour and model. The pack saving comes off automatically at checkout." (BACKED PRODUCT.md:38-39)
   (3) `truck-fast` "Free shipping, 30 days to decide": "Orders leave us within 1 to 3 business days, ship free,
   and you have 30 days to return your case." (BACKED PRODUCT.md:34).
   Also change the block-level defaults (:68-69) the same way.
2. HIGH (dash rule): em dash in shopper copy at :80 ("leaves Austin today — backed by"). Schema/preset names
   "Convert — How it works" (:43, :76) are editor-facing but use the same em dash; change to "Convert: How it
   works" to keep the codebase clean.
3. MEDIUM (claim-inviting icon options): the icon select offers `drop-shield` "Protection", `warranty-seal`
   "Warranty", `no-yellow` "No yellowing", `magnet-ring` "Magnet" (:60-63). These invite unverified claims
   (PRODUCT.md:104). Fix: keep only process icons (precision-fit, check, truck-fast, returns, gift, lock-secure)
   or add an `info` note: "Use only for a claim this product's own data states."
4. MEDIUM (wrong context off the PDP): the CTA "Pick my model" (:49) uses `data-cv-scroll-to-buy` (:33), which
   does nothing when the page has no `.cv-buy` / `#cvPdp` (cv-motion.js:237-238), i.e. on every non-product
   template. "Choose your model above" in the default body (:69) also assumes a buy box above. Fix: render the
   scroll button only when `template.name == 'product'`; elsewhere render an `<a>` to a `cta_url` setting
   (default `routes.all_products_collection_url`), or `enabled_on: { "templates": ["product"] }`.
5. MEDIUM (design rule): eyebrow above the heading by default ("How it works", :11, :46). DESIGN.md Don'ts: no
   eyebrow above every heading. Fix: default the eyebrow to blank and print the span only when set.
6. LOW: fixed `id="cv-howto"` (:9) duplicates if the section is added twice; use `id="cv-howto-{{ section.id }}"`.
7. LOW: step number via `forloop.index` counts ALL blocks (:22) but only `step` blocks render; harmless today (one
   block type). The inline `style="--cv-i:..."` (:21) duplicates what `data-cv-stagger` (:18) writes.
8. OK: no candy as product, no other brand, no currency.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "drop-tested" | heading default :12, :47 | UNBACKED (PRODUCT.md:104, no drop test in evidence) |
| "Cut from your phone's own CAD file, not a universal shell" / "fit is exact, down to the camera lip" | :69, :78 | UNBACKED |
| "Snap it on in seconds", "every button still feels factory-tight", "No stretching, no adhesive" | :79 | UNBACKED (product-specific feel claims) |
| "Ships protected, same day" / "Order before 2pm CT and it leaves Austin today" | :80 | UNBACKED and CONTRADICTS PRODUCT.md:34 (1 to 3 business days, no location, no countdown) and :104 |
| "backed by the Screen Promise" | :80 | UNBACKED (PRODUCT.md:104) |
| "a 2-year warranty from the day it arrives" | :80 | UNBACKED (no warranty in evidence) |
| "No guesswork on fit, no learning curve on install." | lede default :48 | Soft; the install half is unbacked, drop it |

## Motion inventory

- data-cv-* attributes: `data-cv-reveal` on the header (:10), each step (:21) and the footer (:32);
  `data-cv-split` on the h2 (:12); `data-cv-stagger` on the grid (:18); `.cv-cta` magnetic button (:33);
  `data-cv-scroll-to-buy` (:33).
- Icons: `cv-icon` with `animate: true` (:23): infinite CSS keyframes `cv-ico-pulse` / `cv-ico-fall` / draw
  (theme.css:992-997), neutralised under reduced motion (theme.css:3228-3229 and the global rule :3307-3313).
- Step hover: lift -5px with `--ease-candy`, delay `--cv-i * 70ms` (theme.css:1696-1703).
- Section JS: none. GSAP: none.
- Reduced motion: handled by cv-motion.js (reveals resolve at once) and theme.css mirror.
- No-JS: BROKEN. Header, every step and the CTA are `opacity: 0` until cv-motion.js reveals them
  (theme.css:1073-1074, MOTION-SYSTEM.md 3.4.1). The whole section is invisible without JS.
- Theme editor: cv-motion.js has no `shopify:section:load` handler (MOTION-SYSTEM.md 3.4.2): a howto added in the
  editor stays invisible until the preview reloads. `data-cv-split` also strips markup and sets no aria-label
  (3.4.3); the heading is plain text so only the aria issue applies.

## Motion opportunities

Implement as an owned `assets/cv-howto.js` printed by the section (`<script src=... defer>`), with a pending class
and `shopify:section:load/unload/select` handlers (pattern cv-apps.js:93-117). Replace `data-cv-reveal` on the
steps and CTA with this script so content is visible without JS.

1. MEDIUM (scroll reveal, "tickets stamp"): a timeline on `top 80%`: heading SplitText words (mask, stagger .04),
   then step cards drop like tickets from a rail (y -24 -> 0, rotation -4 -> 0, `back.out(1.6)`, stagger .12),
   the step number stamps (scale 1.5 -> 1, 160ms) and the icon disc pops with CustomBounce; `clearProps` after.
2. MEDIUM: a connecting dashed line drawn between the step cards with DrawSVGPlugin (always loaded,
   snippets/gsap.liquid:22) scrubbed to scroll (`scrub: .5`, start `top 70%`, end `bottom 60%`) on desktop only
   (`gsap.matchMedia` with `(min-width: 900px) and (prefers-reduced-motion: no-preference)`).
3. MEDIUM (buy box): on product templates the CTA scrolls to the buy box. Replace `data-cv-scroll-to-buy` with
   the owned script: scroll with ScrollToPlugin (always loaded, snippets/gsap.liquid:36) to `.cv-buy`, then on
   `onComplete` flash a teal outline on the buy box's model picker (420ms, DESIGN.md focus colour) so the shopper
   sees where to start. Do not dispatch `cvs:*` events or open the picker from the motion file (motion never owns
   state, MOTION-SYSTEM.md 4.9); move focus to the model picker's first control instead for keyboard users.
4. LOW: icon draw-on: the `cv-ico__draw` strokes (cv-icon.liquid:4-5) drawn with DrawSVG as each card lands,
   replacing the infinite CSS keyframes (`animate: false`) so icons settle instead of looping offscreen
   (DESIGN.md Motion: ambient loops pause offscreen).
5. Reduced motion: no hiding at all; the scroll button jumps (`behavior: 'auto'`, as cv-motion.js:239 does).

## Risks

- Do not place this section until finding 1 is fixed: its defaults are among the most explicit fabricated claims
  in the theme (Austin, 2pm CT cut-off, Screen Promise, 2-year warranty).
- `.cv-howto` / `.cv-step` CSS lives in the shared `theme.css`; restyling should go into a new owned
  `cv-howto.css` loaded by the section, overriding by specificity, rather than editing theme.css.
- `cv-motion.js` is shared by every page; do not edit it for this section.
