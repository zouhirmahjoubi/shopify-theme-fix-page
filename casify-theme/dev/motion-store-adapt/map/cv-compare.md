# cv-compare ("Comparison lab")

Family: halo-2. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
In quotes, `[em]` / `[en]` mark an em / en dash that exists in the source (never copy them forward).

## Status

**orphan**: placed in no `templates/*.json` and in neither section group. The merchant removed it from
the home page on 2026-09-16 because there is "no real data to publish" (PRODUCT.md:41). No
`enabled_on`; the preset (:259-276) would republish the removed figures.

## Purpose

A lab-style comparison table: up to 4 `col` blocks (name, price note, specimen image, highlight flag)
and up to 20 `row` blocks (measurement label, icon, per-column value and tick/cross style), with an
intro (heading, lede, hand-drawn rule), a three.js "three specimens on a shelf" stage with an SVG
fallback, a footnote and a CTA (link, or scroll back to the buy box). The structure is sound and on
brand (awning, ledger clips, cream/cocoa palette); the data is the problem.

## Files (owned / shared)

Owned:
- `sections/cv-compare.liquid` (279 lines)
- `assets/cv-compare-lab.css` (only `sections/cv-compare.liquid:1` loads it)
- `assets/cv-compare-lab.js` (module; loaded only by layout/theme.liquid:279-282 when the page
  contains `data-cvcx` or in the editor; no other user)

Shared (do not edit from this lane):
- `snippets/cv-icon.liquid` (53 sections/snippets render it; icons used here all exist: `lab` :259,
  `warranty-seal` :216, `check` :223, `cross` :228, `arrow-right` :248, row icons :38-272)
- `assets/cv-spotlight-case.jpg` (2,036,301 bytes; also used by sections/cv-spotlight.liquid)
- `layout/theme.liquid:279-282` (the loader gate)
- `assets/cv-motion.js:235-241` (`data-cv-scroll-to-buy` handler for the CTA fallback, :174)
- three.js 0.186.0 from `cdn.jsdelivr.net` (cv-compare-lab.js:1), same CDN pattern as cv-vs.js and
  other three.js modules
- `assets/theme.css` base `.cv-sec` (:1004) via the `cv-sec` class (:11)

## Store adaptation findings

1. **H, the preset republishes removed, unverified figures.** Rows (:267-274): drop height 12 ft vs
   7.2 ft vs 10.5 ft; magnet pull 1,400 g vs 850 g vs 1,100 g; thickness 2.8 mm vs 3.1 mm vs 6.4 mm;
   weight 24 g vs 31 g vs 78 g; "Still clear at 36 months: No shift / Yellow by month 4 / Opaque";
   "Qi2 25W through the case: Full speed / Full speed / Slowed"; "Publishes its lab data: Yes / No /
   No". PRODUCT.md:103 lists 12 ft, 1,400 g, 2.8 mm and 36-month clarity as not verified; the rival
   figures have no source at all. Fix: replace the preset with an honest "Before you buy" ledger:
   one highlighted `Casify` column plus at most one generic column only if the merchant supplies its
   own data. Preset rows from confirmed facts only:
   - "Made for your exact phone model" (icon `device`, already in the select) value "Yes" `yes`
   - "Shipping" value "Free on every order" `yes` (PRODUCT.md:34)
   - "Leaves the shop" value "1 to 3 business days" `val` (PRODUCT.md:34)
   - "Returns window" value "30 days" `yes` (PRODUCT.md:34)
   - "2-case pack" value "18% off" and "3-case pack" value "31% off" (PRODUCT.md:39)
   Leave rival cells empty in the preset (and render empty cells as visually blank with
   a screen-reader-only "Not listed", see finding 5).
2. **H, block defaults ship claims.** New row default label "Drop height before damage" and
   `cell_1` default "12 ft" (:215, :228); new column default name "This case" (:205). Fix: row label
   default "Free shipping", `cell_1` blank; icon default `truck-fast` (add it to the icon select:
   exists at cv-icon.liquid:193).
3. **H, unbacked lab framing in settings defaults.** Subheading "Same test, same lab, same day. Only
   the case changed." (:191), stage label "Three specimens · one test bench" (:192), corner label
   "Measured" (:193), footnote "Rival figures measured in-house on retail units bought at full
   price." (:195), schema name "Comparison lab" (:187, :261). No lab and no tests exist. Fix:
   subheading "The facts that matter before you choose.", stage label "Choose with the facts in
   front of you", corner label "What you get", footnote blank, name "Comparison table".
4. **H, hardcoded rival prices with currency** "$65+" and "$55" (:265-266). Unbacked and ignore the
   shop currency. Fix: remove; for the Casify column, when `product` exists print the live price
   `product.selected_or_first_available_variant.price | money` as the note (or `product.price_min`
   with "From"); otherwise the merchant note.
5. **M, em dash shown for every empty cell.** `{{ val | default: '[em]' }}` (:153). Fix: print nothing
   visible plus a screen-reader-only "Not listed" (theme.css has no `visually-hidden` helper; add an
   owned `.cvcx__sr` rule in cv-compare-lab.css copying `.cvcx__caption`, :208-215), or the
   merchant's text from a new `empty_label` setting, default "Not listed".
6. **M, 2 MB image for a 120 px thumbnail.** The highlighted column without an image falls back to
   `'cv-spotlight-case.jpg' | asset_url` at width 240 (:93): the full 2,036,301 byte JPEG is
   downloaded. Fix: on product pages use `product.featured_image | image_url: width: 240` (real
   product, DESIGN.md Do: real photography); otherwise the SVG silhouette (:95-99). Never ship the
   asset fallback.
7. **M, CTA can be a dead button.** With `cta_url` blank (:167-178) it renders
   `data-cv-scroll-to-buy`, which only works when `.cv-buy` or `#cvPdp` exists
   (cv-motion.js:235-241; `#cvPdp` is in cv-product-counter.liquid:208 and cv-product.liquid:99).
   On any other template the button does nothing. Fix: render the scroll button only when
   `template.name == 'product'`, else fall back to `routes.all_products_collection_url`.
8. **M, phone-model reality ignored.** Nothing reads the product. Add an optional live row "Phone
   models" whose Casify value is the count of the product's phone-model option values (detect by
   option name), so the table carries at least one number that is true for the product it sits on
   (PRODUCT.md Product Principles 1).
9. **L, caption duplicates the visible heading** (:69): already screen-reader-only
   (cv-compare-lab.css:208); fine, keep.
10. **L, preset `cta_url: "/collections/all"`** (:262): hardcoded path; prefer leaving blank and
    using `routes.all_products_collection_url` as the Liquid fallback.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Drop height 12 ft / 7.2 ft / 10.5 ft | :228, :267 | UNBACKED (PRODUCT.md:103; rival figures unsourced) |
| Magnet pull 1,400 g / 850 g / 1,100 g | :268 | UNBACKED |
| Back thickness 2.8 mm / 3.1 mm / 6.4 mm | :269 | UNBACKED |
| Added weight 24 g / 31 g / 78 g | :270 | UNBACKED |
| Still clear at 36 months: No shift / Yellow by month 4 / Opaque | :271 | UNBACKED |
| Qi2 25W through the case: Full / Full / Slowed | :272 | UNBACKED |
| Publishes its lab data: Yes / No / No | :273 | UNBACKED (no lab data exists) |
| Returns window 30 days (Casify) | :274 | BACKED (PRODUCT.md:34) |
| Returns window 30 days (rivals) | :274 | UNBACKED |
| Rival prices $65+, $55 | :265-266 | UNBACKED |
| "Same test, same lab, same day" | :191 | UNBACKED |
| "Rival figures measured in-house on retail units bought at full price" | :195 | UNBACKED |
| "Three specimens · one test bench" | :192 | UNBACKED framing |
| "Our pick" winner badge | :194, :103 | Opinion label; acceptable only with honest rows |

## Motion inventory

- cv-motion attributes: none in the section; the CTA fallback uses `data-cv-scroll-to-buy` (:174),
  a click handler, not a reveal.
- Section JS `assets/cv-compare-lab.js` (module, 391 lines):
  - `cvcxMotion` (:23-97): column highlight on pointerenter/focus/click (`aria-pressed` kept in sync,
    :12-21); one-shot ScrollTrigger at `top 76%` (:72-89) running a GSAP timeline: awning scaleX,
    title clip-path wipe, lede fade, DrawSVG-style rule via `strokeDashoffset`, stage rise with blur,
    ledger clip reveal, rows stagger .045, foot fade. All `clearProps` at the end.
  - `cvcxThree` (:181-355): three.js stage, three extruded case specimens on a brass shelf, pointer
    parallax, active column lifts its specimen; IntersectionObserver + `visibilitychange` stop the
    render loop offscreen or in hidden tabs (:284-316); full dispose on cleanup (:331-354).
  - Editor: `shopify:section:load` remount, `shopify:section:unload` destroy (:387-391).
- GSAP plugins: core + ScrollTrigger only (both always loaded).
- Reduced motion: JS skips the timeline and the three.js import (:70, :92-94, :360-369); CSS forces
  the SVG fallback visible and kills transitions (cv-compare-lab.css:475-482).
- No-JS: nothing is hidden in CSS; the SVG fallback stage and the full table render. Good.
- Flash risk: the timeline is created inside `onEnter`, so content that is already visible jumps to
  the `from` state (clipped title, transparent rows) at 76% and then animates in.

## Motion opportunities

1. **(High) Remove the visible-then-hidden flash.** Print a pending class (MOTION-SYSTEM.md 4.3)
   that hides only decorative pieces (awning stripe, rule, stage) until the script sets GSAP start
   states; build the timeline paused at mount with `immediateRender` start states and `play()` it in
   `onEnter`. Never hide table values.
2. **(High) Row-by-row "ledger" reveal tied to scroll.** Replace the single row stagger with a
   `ScrollTrigger.batch` over `[data-cvcx-row]` (`start: 'top 88%'`): each row slides in, then its
   tick mark draws (DrawSVGPlugin on `.cvcx__mark svg path`, always loaded) and the Casify cell
   flashes ticket gold for 240 ms. On mobile (stacked cards, cv-compare-lab.css:423-465) batch per
   card.
3. **(High) CTA into the buy box.** On product templates, when the CTA scrolls to `#cvPdp`, use
   ScrollToPlugin (`gsap.to(window, { scrollTo: '#cvPdp', duration: .8, ease: 'power3.inOut' })`)
   then pulse the model select; reduced motion: instant `scrollIntoView`. If a "3-case pack" row is
   present, a small "Choose the 3-pack" link can dispatch `cvs:pack` `{ qty: 3 }` on the
   `[data-cv-pdp]` root (cv-product.js:536) before scrolling.
4. **(Medium) Replace abstract specimens with the real product.** Feed `product.featured_image` into
   the three.js stage as a texture on the highlighted specimen (or drop three.js and use a CSS 3D
   card with `data-cv-tilt`), so the hero object is the real case (DESIGN.md Do).
5. **(Low) Column focus**: animate the active column highlight with GSAP (`backgroundColor` tween,
   160 ms) instead of an instant class swap; keep the class as the state owner.

## Risks

- The merchant explicitly removed this section for lack of real data (PRODUCT.md:41). Re-placing it,
  even rebuilt, needs merchant confirmation; the implementer should only fix presets/defaults and
  motion, not place it.
- Any rival column is a claim about a competitor; ship none by default.
- three.js from jsdelivr is an external runtime dependency (CSP, availability); the module already
  fails soft (:186-191) and keeps the SVG fallback.
- Owned files can be edited freely; cv-icon.liquid, cv-motion.js, theme.css, layout are shared.
- The `cvcx:column` / `cvcx:enter` custom events are internal; keep their names if extending.
