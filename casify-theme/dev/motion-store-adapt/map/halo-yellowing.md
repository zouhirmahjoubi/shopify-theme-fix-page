# halo-yellowing ("Halo [em] Yellowing scrubber")

Family: halo-2. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
In quotes, `[em]` / `[en]` mark an em / en dash that exists in the source (never copy them forward).

## Status

**orphan**: placed in no `templates/*.json` and in neither section group. No `enabled_on`, no blocks
(preset :79-86 sets only a subheading).

## Purpose

An interactive "clarity over time" demo: two drawn SVG case samples ("Typical clear TPU case" and
"Halo with ClearGuard™") and a 0 to 36 month range slider that is supposed to tint sample A yellow and
change its verdict text. Every word except the tick/heading/subheading is hardcoded in Liquid
(:21-23, :34-37, :43, :48-50) and in halo.js (:88-92).

## Files (owned / shared)

Owned:
- `sections/halo-yellowing.liquid` (88 lines; no own CSS/JS/asset files)

Shared (do not edit from this lane):
- `assets/halo.js`: the scrubber logic (halo.js:71-96: `#haloAge`, `#haloMonth`, `#haloAgeShell`,
  `#haloVerdictA`) is used only by this section, but the file is shared with main-halo-product,
  halo-drop-test and others, and the whole file exits at halo.js:19-20 (needs `.halo-tpl`; the layout
  prints only `cv-tpl`, layout/theme.liquid:196-201). Loaded by layout/theme.liquid:216-218.
- `assets/theme.css`: `.halo-ywrap`, `.halo-ybox`, `.halo-ygrid`, `.halo-yc*`, `.halo-scrub*`,
  `.halo-slider` (:3721-3759, :4145, :4380-4382, :4399-4400; only this section prints them, file is
  shared); base `.halo-sec*` (:3689-3693); `[data-halo-reveal]` (:3906-3907, :3918-3921).

## Store adaptation findings

1. **H, the interaction is dead.** halo.js returns at :19-20 before wiring the slider (:95), so
   dragging does nothing: "Month 0" never changes, sample A never tints, the verdict never updates.
   Shoppers get a broken control. Fix: either do not place the section (recommended, see 3), or move
   the logic into a new owned script.
2. **H, heading invisible.** `data-halo-reveal` on the header (:2) stays `opacity: 0`
   (theme.css:3906) because halo.js never runs. Fix: remove it; owned script with a pending class.
3. **H, the whole premise is an unbacked lab claim.** Preset subheading "Both samples went into the
   same accelerated UV chamber. Same light, same heat, same skin-oil cycle." (:83), the 36-month scale
   (:46, :49), sample B "No visible change" that never changes (:37), "UV-stable PC, bonded top coat"
   (:36), and the halo.js verdicts "Clearly yellowed", "Most people replace it here"
   (halo.js:88-92). PRODUCT.md:103 lists "36-month clarity" as not verified and never shown
   store-wide. No test exists. Fix: do not ship as a test. Two honest options for the implementer:
   - **A (recommended): repurpose into "See every finish"**, a product-bound scrubber. On a product
     template the range input steps through the product's real style/colour option values (option
     detected by name, never position), cross-fading to each value's first variant image
     (`variant.featured_media`), with the value name as the live label. Optional "Choose this finish"
     button dispatches `cvs:choose` `{ index, value }` on the `[data-cv-pdp]` root
     (cv-product.js:523-533), which the buy box already answers. Every pixel is real product data.
   - **B: product-gated claim.** Render only when the product's own metafield (for example
     `product.metafields.casify.clarity_note`, merchant-entered) exists, and show that text instead of
     a simulated test. With no metafield, render nothing.
4. **H, another brand and a trademark.** "Halo with ClearGuard™" (:34), aria-label "Casify Halo
   ClearGuard sample" (:27), schema name "Halo [em] Yellowing scrubber" (:58, :80). Fix: remove "Halo"
   and "ClearGuard™" entirely.
5. **H, hardcoded competitor price with currency.** "The $12 one you replace every spring." (:23).
   Unbacked, and ignores the shop currency. Fix: delete.
6. **M, em dashes.** Tick default "Section 02 [em] clarity over time" (:3, :64); halo.js:92
   "Deep amber [em] unusable"; schema names (:58, :80). Fix: blank tick default; plain text.
7. **M, hardcoded copy not editable or translatable** (:21-23, :34-37, :43, :48-50, halo.js:85-92).
   Fix: settings (or `locales/en.default.json` keys) for every visible string in a rebuild.
8. **M, duplicate ids.** `id="halo-clarity"` (:1), `haloAgeShell`, `haloVerdictA`, `haloMonth`,
   `haloAge` are fixed; two instances would collide and `getElementById` would wire only the first.
   Fix: suffix with `section.id`, scope queries to the section root.
9. **L, off-palette greys.** SVG fills `#E9ECF1`, `#1C1F28`, `#131417` (:15-17, :28-30) are cool
   tech greys (DESIGN.md Don'ts: no generic tech styling). Fix: use palette tokens (paper, cocoa ink)
   or real product photos (option A).
10. **L, invalid nesting**: richtext `subheading` inside `<p>` (:5-6).

## Claims register

| Claim | Where | Status |
|---|---|---|
| Same accelerated UV chamber, same light, heat, skin-oil cycle | preset :83 | UNBACKED (no test exists) |
| Halo ClearGuard sample shows no visible change over 36 months | :34-37, :46-49 | UNBACKED (PRODUCT.md:103) |
| UV-stable PC, bonded top coat | :36 | UNBACKED |
| "The $12 one you replace every spring" | :23 | UNBACKED (competitor price and behaviour) |
| Typical TPU yellows (Faint tint, Clearly yellowed, Most people replace it here, Deep amber) | halo.js:88-92 | UNBACKED |
| "ClearGuard™" trademark | :34 | UNBACKED (not a Casify mark) |
| Proposed option A: finish names and photos | rebuild | LIVE (product options, variant media) |

## Motion inventory

- cv-motion attributes: none.
- `data-halo-reveal` header (:2): dead.
- Slider tint: JS sets the SVG `fill` (halo.js:84) with a CSS `transition: fill 320ms`
  (theme.css:3733). Dead because halo.js exits.
- No GSAP, no ScrollTrigger, no editor events, no reduced-motion branch in JS (only CSS forcing
  `[data-halo-reveal]` visible, theme.css:3919).
- No-JS state: both samples shown identical, slider inert, heading hidden.

## Motion opportunities

1. **(High, option A) Finish scrubber with GSAP.** Owned `assets/cv-finish-scrub.js` (prefix
   `cvfs`): on `input`, crossfade the current and next real product image (`autoAlpha` .24 s,
   `--ease-out-soft`), flip the finish label with the house yPercent flip
   (cv-pdp-counter-motion.js:208 pattern), and move a brass tick along the track. Optional
   ScrollTrigger `scrub: .6` mode that advances the finish as the section scrolls through a pinned
   stage on desktop only (`matchMedia` `(min-width: 990px)`, `gsap.matchMedia()`), with the range
   input still in control. Reduced motion: instant swaps, no pin. No-JS: a static row of finish
   thumbnails (all visible) plus the range hidden via `hidden` until JS mounts.
2. **(High) Buy-box link.** "Choose this finish" dispatches `cvs:choose` and then scrolls to `#cvPdp`
   (ScrollToPlugin is always loaded); the buy box's own swatch motion (cv-pdp-counter-motion.js
   :156-178) plays the selection, so this section stays motion-only (MOTION-SYSTEM.md 4.9).
3. **(Medium) Entrance**: the two-up frame rises with a slight rotation as tickets (`rotation: -2 -> 0`,
   `y: 24`), heading SplitText lines; pending class only on the decorative frame.
4. **(Low)** `data-cv-tilt` on the photo frame for fine pointers.

## Risks

- Placing the current file publishes a fake lab test and another brand; it is a top-priority
  "do not place" until rebuilt.
- halo.js and theme.css are shared; never edit them from this lane. A rebuild needs its own JS file
  and a `content_for_layout contains 'data-cvfs'` gate in layout/theme.liquid (layout edit belongs to
  the layout owner, coordinate).
- Products with ~50 images (PRODUCT.md:32): load finish images lazily (`loading="lazy"`, small
  `image_url: width: 600`), never all at full size.
- Option A must detect the style option by name; some products may have only a phone-model option,
  in which case the section renders nothing.
