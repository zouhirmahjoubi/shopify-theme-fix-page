# cv-ugc ("Convert — UGC videos")

## Status

LIVE (placed) on the home page only: `templates/index.json` instance `ugc` (type at templates/index.json:1276,
settings :1277-1285, position 12 of 21 in `order`). The instance has NO blocks, and the section renders nothing on
the storefront without a `clip` block (`{%- if clip_count > 0 or request.design_mode -%}`, sections/cv-ugc.liquid:35).
So today shoppers see nothing; the theme editor shows the empty state (:59-66).
Not in product/page templates or section groups.

## Purpose

A horizontal rail of 9:16 customer clips (uploaded video, external MP4, YouTube/Vimeo facade, or poster only,
:77-99) with muted autoplay in view, one-clip-audible sound toggle, a lightbox with prev/next, optional header stat
pills (`stat` blocks, :45-57), and a ghost CTA (:196-201). Header comment says behaviour lives in cv-product.js
(:20); it actually lives in the `ugc` module of `assets/cv-motion.js:343-534`.

## Files (owned / shared)

Owned:
- `sections/cv-ugc.liquid` (no section-only CSS or JS file exists).

Shared:
- `assets/theme.css` UGC block :1817-2006 (`.cv-ugc*`, `.cv-clip*`, `.cv-lightbox*`, `body.cv-lb-open` :1983),
  reduced-motion lines :3242-3243, :3275-3283, mobile :3135. Selectors are used only by this section, but the file
  is shared by the whole theme: edit only in a coordinated theme.css pass, or move the block into a new owned
  `assets/cv-ugc.css` (recommended, see Motion opportunities 1).
- `assets/cv-motion.js` (loaded on every page, layout/theme.liquid:220): `ugc` module :343-534, reveal/split/
  stagger/count/tilt :66-232, `data-cv-scroll-to-buy` :235-241.
- `snippets/cv-icon.liquid` (40+ users), `snippets/cv-stars.liquid` (20+ users).
- Shared section scaffolding classes `.cv-sec`, `.cv-sec__hd`, `.cv-eyebrow`, `.cv-cta` (theme.css).

## Store adaptation findings

1. Block defaults ship invented testimonials the moment a merchant adds a clip (HIGH). `clip` block defaults:
   caption "Dropped it off a ladder. Nothing." (schema :249, an unbacked durability claim), `stars` 5 (:250),
   `verified` true (:251, prints "Verified buyer" :175-177), handle "@customer" (:248), tag
   "iPhone 17 Pro · Clear" (:252). Fix: all blank / 0 / false: `caption` no default, `stars` default 0,
   `verified` default false with info "Tick only when this person bought from Casify", `handle` and `tag` blank.
2. `stat` block defaults invent a count (HIGH): value "1240", label "customer clips submitted" (:267-269), animated by
   `data-cv-count` (:51). Fix: no defaults (blank value, blank label) and render the pill only when both are set;
   info text "Use a real number you can show".
3. Liquid fallback invents a handle: `b.settings.handle | default: '@customer'` (:174) and the open button label
   falls back to "clip" (:157). Fix: print the `<strong>` only when a handle is set.
4. Em dash in the live eyebrow: `"eyebrow": "Section 03 — your clips"` (templates/index.json:1278). "Section 03"
   is also leftover numbering. Fix: "Your clips" (and per DESIGN.md:198 consider no eyebrow at all).
5. Dead CTA on the home page: the button uses `data-cv-scroll-to-buy` (:197), which scrolls to `.cv-buy` or
   `#cvPdp` (cv-motion.js:237); neither exists on index, so "Find my model" (index.json:1282) does nothing.
   Fix: add a `cta_link` url setting (default `shopify://collections/all`); render an `<a class="cv-cta">` when
   `template.name != 'product'`, keep the scroll button on product templates.
6. Clip tag is free text (:252, :179-181) and ignores real product options. Store binding: add a `product` setting
   per clip; print the product title, its live price, and a quick-pick button
   (`<button data-cvqp-open data-handle data-url>`, snippets/cv-card.liquid:79 pattern) so a shopper can choose
   colour and phone and add that exact variant. The quick-pick dialog and script load automatically when the
   literal `data-cvqp-open` is in the server render (layout/theme.liquid:208-210, :295-297).
7. Without JS the populated rail is invisible: `[data-cv-reveal]` is `opacity:0` (theme.css:1073-1079) and
   `.cv-clip` is `opacity:0` until `.cv-ugc__wrap.is-revealed` (theme.css:1863-1869). Breaks the no-JS rule.
   Fix in this section: stop using `data-cv-reveal` here and use the pending-class pattern (MOTION-SYSTEM.md 4.3)
   in an owned motion file.
8. Theme editor: cv-motion.js has no `shopify:section:load` handler, so after any edit the re-rendered section keeps
   `opacity:0` and the rail, sound and lightbox are unbound until a full reload.
9. `0{{ unit }}` (:51) prints "0" as the server text; without JS or before reveal the stat reads 0. Fix: print the
   real value; let JS start from 0 only when it animates.
10. Lightbox is a `div role="dialog" aria-modal="true"` (:205) without a focus trap or `inert` background.
    `snippets/cv-video-reviews.liquid` already has a native `<dialog>` player with a shopping panel; consider
    reusing that snippet (in `commerce: false` mode on the home page) instead of keeping two video systems.
11. Hard-coded English: "Verified buyer" (:176), "Turn sound on/off" labels (:152, cv-motion.js:403, :418),
    "Previous clips" / "More clips" (:70, :189), "Customer clip" (:205), "Hidden on your live store until you add a
    clip." (:64, editor-only). Move to locales.
12. Schema info strings use em dashes (:241, :268) and the schema name "Convert — UGC videos" (:223, :276):
    editor-facing; optional cleanup.
13. No candy-as-product, no Halo copy, no prices. Subheading default "Videos from real customers go up here once
    people send them in." (:228) is honest.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Dropped it off a ladder. Nothing." | clip `caption` default :249 | UNBACKED (durability claim; must not default) |
| 5 stars per clip | clip `stars` default :250, rendered :164-169 | UNBACKED as a default; MERCHANT-TYPED only from a real review |
| "Verified buyer" | clip `verified` default true :251, :175-177 | UNBACKED as a default (never claim verification without an order) |
| "@customer" handle, "iPhone 17 Pro · Clear" tag | :248, :252, :174 | Placeholder demo content (remove) |
| "1240 customer clips submitted" | stat defaults :267-269 | UNBACKED (invented count) |
| "Videos from real customers go up here once people send them in." | :228, index.json | Honest (no claim) |
| Live instance | index.json:1276-1285 | No blocks, no claims rendered today |

## Motion inventory

- `data-cv-*` attributes (shared cv-motion.js engine): `data-cv-ugc` (root :36), `data-cv-reveal` (:37, :46, :60,
  :69, :194), `data-cv-split` (:39), `data-cv-stagger` (:46), `data-cv-count` + `data-cv-suffix` (:51),
  `data-cv-tilt` (:109), `data-cv-clip`, `-clip-kind`, `-embed-type`, `-embed-id` (:102-105), `data-cv-clip-sound`
  (:151), `data-cv-clip-open` (:156), `data-cv-ugc-rail` (:74), `data-cv-ugc-scroll` (:70, :189),
  `data-cv-lightbox`, `data-cv-lb-close`, `-lb-step`, `-lb-stage` (:205-215), `data-cv-scroll-to-buy` (:197).
  `cv-icon animate: true` on stat icons (:50) engages CSS keyframes. `.cv-cta` gets the magnetic pull.
- Section-specific motion JS: none. Everything is the cv-motion.js `ugc` module: arrows (:352-370), autoplay at 55%
  visibility (:375-392, skipped under reduced motion), one audible clip (:395-425), lightbox build/open/close/keys
  (:428-533). Entrances are CSS transitions (theme.css:1824-1833, :1863-1869) toggled by `is-revealed`.
- GSAP: none.
- Reduced motion: JS reveals at once and never autoplays (cv-motion.js:131, :375); CSS resolves `.cv-clip`,
  `.cv-ugc__stat` (theme.css:3242-3243) and lightbox animation (:3275). Read once at load.
- No-JS: invisible (finding 7).
- Theme editor events: none (finding 8).
- Auto-running video has no global pause control (DESIGN.md:192); Save-Data is not respected.

## Motion opportunities

High value
1. Own the motion: create `assets/cv-ugc.css` (move the theme.css :1817-2006 block once coordinated) and
   `assets/cv-ugc-motion.js`, gated in the layout by a NEW unique root attribute `data-cvug` (checked unused) so the
   cv-motion.js `ugc` module, which looks for `[data-cv-ugc]`, stops binding. Port rail/sound/lightbox logic, add
   `shopify:section:load/unload/select`, `gsap.matchMedia()` for reduced motion, and the pending-class pattern
   (`cvug-pending` + 1400 ms timeout) so no-JS and failed-JS show the finished rail. The layout gate line is a shared
   edit (one `{%- if editor or content_for_layout contains 'data-cvug' -%}` line): coordinate.
2. Rail deal-in like film prints: ScrollTrigger once at `top 80%`, clips from `x: 40, rotation: 2, autoAlpha: 0`
   to rest, stagger 0.07, `expo.out` 420 ms, `clearProps`. The header uses SplitText words with mask (house
   style, cv-signup-motion.js:135) instead of `data-cv-split` (which drops inline markup and sets no aria-label).
3. Shop the clip (commerce): per-clip `product` setting -> a "Choose colour and phone" button with
   `data-cvqp-open`; on the `cv:cart` document event (cv-quick-pick.js:58) stamp a small "In your bag" ticket on that
   clip card (scale 1.3 -> 1, rotation -8 -> -3, 240 ms, `back.out(2)`) and let cart.js open the drawer. Never adds
   a guessed model.
4. "Pause clips" toggle (`aria-pressed`) in the rail foot that pauses every video and stops autoplay; honour
   `navigator.connection.saveData`.

Medium
5. Lightbox to native `<dialog>` with a GSAP open (scale .96 -> 1, autoAlpha, 240 ms) and close (160 ms). A Flip from
   the card frame is only possible on the product template (Flip is not loaded on the home page,
   layout/theme.liquid:173-176); use a straight tween on index.
6. Scroll-velocity lean on the rail while dragging (skewX clamp 4deg, `quickTo`), off for reduced motion.

Low
7. Stat pills: count up with GSAP snap only when the value is real (merchant-typed from evidence); the server text
   must already be the final number.

## Risks

- Do not add demo clips, names, ratings or "verified" to show off the motion; the merchant confirmed real clips only
  (PRODUCT.md:268-269). The section stays empty on the storefront until real clips exist.
- Two video systems exist (this rail and `snippets/cv-video-reviews.liquid`). Before investing in motion here, decide
  whether the home page should use the cv-video-reviews snippet instead.
- Editing the UGC block of `assets/theme.css` or `assets/cv-motion.js` affects the whole theme: not owned.
- Index template has 21 of 25 sections; this one renders nothing today, so it costs a slot without showing anything.
