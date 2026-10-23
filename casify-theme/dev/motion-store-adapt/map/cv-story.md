# cv-story ("Convert — Drop sequence")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. No `enabled_on`; addable to any template
from the editor, where the preset (sections/cv-story.liquid:160-171) ships a full drop-test narrative.

## Purpose

A scroll-scrubbed "drop test": a sticky stage with a falling phone SVG, a 12 ft ruler, a live "ft to impact"
readout, phase label, impact flash and shockwave rings, crushing corner "air cells", a progress rail and a
"Phone intact" verdict, beside chapters (metric + title + body) that light up at set scroll percentages
(:1-13, :24-130). The entire section exists to dramatise a drop-test claim.

## Files (owned / shared)

Owned:
- `sections/cv-story.liquid` (173 lines). No owned asset files.

Shared:
- `assets/cv-motion.js` story module (:243-337, every page): reads the FIRST `[data-cv-story]` only (:247),
  hardcodes `START_FT = 12` (:257) and English phase labels "Held / Released / Free fall / Contact / Cells
  crushing / Recovered" (:258-265), drives `--cv-p`, `--cv-fall`, `--cv-drop`, `.is-impact`, `.is-recovered` and
  chapter `.is-active/.is-past` from the shared rAF scroll ticker (:282-336). Only this section uses
  `data-cv-story` (grep), but the file is shared by every page.
- `assets/theme.css`: drop sequence block (:2008-2141, 64 `cv-story` rules incl. :3099-3102, :3133-3134) and
  reduced-motion overrides (:3271-3278). Story-only by grep, but in the global stylesheet.
- `snippets/cv-icon.liquid` (`check` :85, `lab` :126; 53 files).
- The header comment says progress comes from cv-product.js (:10); it actually comes from cv-motion.js (stale
  comment; cv-product.js has no story code).

## Store adaptation findings

1. HIGH (the section is an unbacked claim): every default and preset value describes a lab drop test the store
   cannot back. PRODUCT.md:104 lists "12 ft drop / MIL-STD-810G 516.6" and "2.8 mm profile" as not verified and
   "never shown store-wide"; nothing in "Evidence on Hand" (PRODUCT.md:99-105) covers drop tests, impact physics
   or lab testing. STORE-FACTS.md 7f (:89) logs it. Decision needed (merchant/orchestrator):
   a) RETIRE: leave unplaced and add a schema `info`/comment "Do not place: drop-test claims unverified"; or
   b) REPURPOSE honestly (recommended if a scroll-scrubbed moment is wanted): keep the sticky stage + chapters
      engine but change the story to the order journey, using only confirmed facts: chapters "Choose your exact
      model" (live model count from a chosen product, the cv-pdp-value pattern), "Pick 1, 2 or 3 cases" (pack
      saving from merchant setting = admin discount, PRODUCT.md:39), "Packed and on its way in 1 to 3 business
      days", "Free shipping", "30 days to decide" (PRODUCT.md:34). The ruler becomes a day track, the faller
      becomes a parcel or the product's real photo, the verdict becomes "Delivered free". No ft, mph, force or
      drop counts anywhere;
   c) ALLOW PER PRODUCT ONLY: render only on a product whose own metafields state a drop test (PRODUCT.md:104
      "may appear only on a product whose own data states them"), with every number read from metafields and
      the section hidden when they are blank. This needs the shared cv-motion.js `START_FT` to come from a data
      attribute (shared-file change).
2. HIGH (dash rule): em dashes in shopper copy: eyebrow default "Section 03 — the drop, frame by frame" (:26,
   :137); chapter 2 body "the thickest part of the shell — 4.7 mm against 2.8 mm" (:165); chapter 4 body "the whole
   trick — spreading" (:167). Editor names "Convert — Drop sequence" (:134, :162).
3. HIGH (hardcoded copy in shared JS): phase labels and 12 ft are in cv-motion.js (:257-265), not in the section
   or locales, so any honest rewrite of the Liquid still shows "Free fall", "Contact", "Cells crushing" and counts
   down from 12.0. Under reduced motion the JS writes "Recovered" (:274). Fix for option 1b: drop
   `data-cv-story` and drive the stage from a new owned `cv-story.js` (GSAP ScrollTrigger scrub) that reads
   phases and the start value from `data-*` attributes printed by the section from settings.
4. MEDIUM: the ruler prints 12, 9, 6, 3, 0 ft computed in Liquid (:42-45) regardless of settings; the readout
   unit is a setting (:140) but the numbers are not.
5. MEDIUM (design rule): eyebrow "Section 03 ..." above the heading (:26) assumes a numbered PDP sequence that no
   longer exists and breaks the DESIGN.md "no eyebrow above every heading" rule. Default to blank.
6. LOW: fixed `id="cv-story"` (:24); the module only handles one instance (cv-motion.js:247).
7. LOW: the SVG phone (:51-65) is a generic device, not Casify product photography (DESIGN.md Do: real product
   imagery is the sharpest object). For option 1b use the featured product's real photo.
8. OK: no candy as product, no other brand, no prices.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "What actually happens in 0.8 seconds" | :27, :138 | UNBACKED |
| "Every number below was measured on the way down" | :139 | UNBACKED |
| "Phone intact" verdict | :86, :143 | UNBACKED |
| "Independent lab · 26 drops per unit onto concrete · MIL-STD-810G 516.6" | footnote :144 | UNBACKED (PRODUCT.md:104 names MIL-STD-810G 516.6 as not verified) |
| "12 ft", "Twelve feet ... Four times the height Apple drop-tests to" | :164; ruler :43; cv-motion.js:257 | UNBACKED; the Apple comparison is an unverified third-party claim |
| "0.86 s" free fall, "corners ... 4.7 mm against 2.8 mm across the back" | :165 | UNBACKED (2.8 mm listed not verified, PRODUCT.md:104) |
| "19 mph" contact, "aluminium frame and the glass bonded to it" | :166 | UNBACKED |
| "-64 % force", "honeycomb crushes for about three milliseconds", "cuts the peak force ... by roughly two thirds" | :167 | UNBACKED |
| "26 drops", "no phone damage, no permanent deformation" | :168 | UNBACKED |
| Ground "Concrete" | :74, :142 | Part of the unbacked test narrative |

## Motion inventory

- data-cv-* attributes: `data-cv-story` (:24), `data-cv-story-stage` (:37), `data-cv-story-height` (:79),
  `data-cv-story-phase` (:81), `data-cv-story-verdict` (:84; not read by the JS), `data-cv-story-rail` (:91),
  `data-cv-story-chapter` + `data-cv-at` (:102-103); `data-cv-reveal` on the header (:25) and footnote (:125);
  `data-cv-split` on the h2 (:27).
- Engine: cv-motion.js story module, scroll position -> progress p (sticky travel, or an in-view ramp when the
  section is shorter than the viewport), quadratic free fall to 0.68, impact and recovery classes, chapter
  activation by `data-cv-at` (cv-motion.js:282-336). CSS reads the vars (theme.css:2008-2141); phase label swap
  uses `cm-rise` (theme.css:2098).
- GSAP: none. Uses the private shared rAF ticker, not ScrollTrigger (MOTION-SYSTEM.md 3.3).
- Reduced motion: JS parks at the impact frame and activates every chapter (cv-motion.js:268-279); CSS kills the
  impact keyframes and chapter transforms (theme.css:3271-3278).
- No-JS: BROKEN. Header and footnote are `opacity: 0` (data-cv-reveal), chapters sit at `opacity: .3` and
  `translateX(10px)` (theme.css:2119-2123), the readout shows "0.0" with phase "Held" (contradicting the comment
  at :11-12 that says no-JS parks at impact).
- Theme editor: no `shopify:section:load` handling in cv-motion.js; the story module binds once at load to the
  first `[data-cv-story]`, so a section added or re-rendered in the editor neither reveals nor scrubs until reload.

## Motion opportunities

Only after the claims decision (finding 1). If option b (honest order journey) is chosen:

1. MEDIUM (scroll choreography): rebuild the scrub on GSAP ScrollTrigger in an owned `assets/cv-story.js`
   (printed by the section): `pin` not needed (the CSS sticky column already pins); one ScrollTrigger with
   `scrub: .6`, `start: 'top top'`, `end: 'bottom bottom'`, `onUpdate` writing the same `--cv-p` var so the
   existing CSS keeps working, plus a timeline for the stage: the product photo travels along a MotionPath
   (loaded on product and shop-page templates only, layout/theme.liquid:173-177; guard and fall back to a straight
   y tween elsewhere) from "shelf" to "parcel" to "door", the day track fills with DrawSVG, chapters toggle
   `.is-active` via ScrollTrigger `onToggle` per chapter instead of percent thresholds.
2. MEDIUM (packs/bundles): in the "Pick 1, 2 or 3 cases" chapter, stack 1 -> 2 -> 3 case cards on the stage with
   Flip as the chapter activates, and show the pack saving from the section's pack setting (same honesty rules as
   cv-campaign-guide finding 2).
3. LOW: a final chapter CTA "Choose my model" that uses the quick-pick opener (`data-cvqp-open
   data-handle=...`, cv-quick-pick.js:228-229) or scrolls to `.cv-buy` on product templates.
4. Reduced motion: no pin/scrub, stage at final frame, all chapters fully opaque; no-JS: same final frame via
   CSS defaults (make the resting CSS state the "arrived" frame, and have the script set the start frame only
   after it initialises, pending-class pattern MOTION-SYSTEM.md 4.3).
5. Editor: `shopify:section:load/unload` re-init and kill (pattern cv-apps.js:106-117); `section:select` jumps to
   the final frame.

## Risks

- Highest-risk section in this family: placing it as-is publishes a fabricated lab test (MIL-STD, 26 drops,
  -64% force) on the store. Keep it orphaned until the merchant chooses option a, b or c.
- The story engine lives in shared `cv-motion.js` and its CSS in shared `theme.css`; an honest rebuild should
  move to owned files (`cv-story.js`, `cv-story.css`) and stop using `data-cv-story`, leaving the shared module
  untouched (it then becomes dead code; removal is a separate shared-file change).
- MotionPathPlugin is only loaded on product and shop-page templates (gsap flags, theme.liquid:173-177); guard
  with `window.MotionPathPlugin`.
