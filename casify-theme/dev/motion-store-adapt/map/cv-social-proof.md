# cv-social-proof ("Convert — Social proof", "The proof")

## Status

LIVE on the home page only: `templates/index.json` instance `social` (type at templates/index.json:1299, settings
:1300-1320, position 14 of 21 in `order`). No blocks in that instance (no `@app` review block), so the ledger
shows its waiting state. Not in product/page templates or section groups.
Current render state on the live data: `proof_state = 'store'` (no product has `reviews.rating_count` yet per
PRODUCT.md:104, and the instance has `show_store_rating: true`, `4.9` / `952`, index.json:1304-1306).

## Purpose

A dark "proof board" with two columns: a score card (live weighted average of every product's
`reviews.rating` / `reviews.rating_count` metafields, sections/cv-social-proof.liquid:19-44; else the
merchant-supplied Trustpilot + Google store rating, :46-53; else an honest "no reviews yet" empty state,
:132-145) and a "Customer ledger" that renders only merchant-added `@app` review blocks (:188-200). A thank-you
strip with a "Source checked" wax stamp closes it (:210-222), hidden in the store-rating state (:216).

## Files (owned / shared)

Owned (only this section references them):
- `sections/cv-social-proof.liquid`
- `assets/cv-social-proof.css` (438 lines; only `stylesheet_tag` at sections/cv-social-proof.liquid:1)
- `assets/cv-proof-motion.js` (268 lines; loaded by layout/theme.liquid:222-225 on the gate `data-cv-proof`,
  which only this section prints, :73)
- `assets/proof-stamp.webp` (650,364 bytes; only :218)

Shared (do not edit inside a per-section lane; coordinate):
- `snippets/cv-stars.liquid` (used by 20+ sections/snippets: cv-product-counter, cv-pdp-reviews, review-widget, ...).
- `locales/en.default.json` keys `products.review_badges.*` (line 65+): shared with cv-phone-scan,
  cv-product-counter, snippets/cv-product-summary, snippets/cv-store-ratings.
- `layout/theme.liquid:222-225` (the script gate).
- `assets/theme.css:1595-1607`: legacy "The proof" rules (`.cv-proof-seal`, `[data-cv-proof] .cv-press__track`,
  `.cv-dist__fill`, `.cv-review`) for markup this section no longer prints. Dead CSS in a shared file.
  Also `.cv-score__*`, `.cv-reviews__write` (theme.css:1550-1571) are leftovers of the old markup (not used here).

## Store adaptation findings

1. Schema default intro contradicts the default state (HIGH, editor default ships wrong copy).
   Default `intro` "A live record of published customer feedback. Nothing on this board is pre-filled or manually
   scored." (schema :231, Liquid fallback :82) is false whenever the store rating shows, and the store rating is ON
   by default with 4.9 / 952 (:234-236). The live instance already overrides it with honest text
   (templates/index.json:1302). Fix: make the schema default and the `| default:` fallback equal the index.json
   text: "Our store rating from Trustpilot and Google, and product reviews in customers' own words as they're
   published."
2. Em dash in shopper copy: `empty_text` "The first customer review will set the score — not us." at :141
   (fallback), schema default :241, and templates/index.json:1310. Fix: "The first customer review will set the
   score, not us." (all three places; the template value is the one shoppers would see).
3. `source_note` default "No sample quotes. No imported press logos. Just the live record." (:205, schema :246) is
   inaccurate in the store state (the score is merchant-typed). Index overrides with "No sample quotes and no press
   logos. Product reviews appear here as customers publish them." (index.json:1314). Make that the schema default.
4. "Source checked" / "Live Shopify review data" stamp (:216-221, schema :250-251) also renders in the `open`
   state, where there is no data to check. Fix: render the stamp only when `proof_state == 'rated'`.
5. "Editorial edits: None" (:166-169) is a process claim the theme cannot guarantee (review apps let merchants
   hide/moderate reviews). Fix: replace the row with "Moderation: as set in your review app" or drop it.
6. Empty ledger looks like a stuck loader on the live home page: three `.cvp-proof__waiting-line` skeleton bars
   (:194-199) plus "Written in customers' own words." (:184) with no review app block in the instance. Fix: when
   `app_blocks == 0 and proof_state != 'rated'`, either hide the ledger column (single-column board) or show a plain
   sentence without skeleton bars; never imply reviews are loading.
7. Hard-coded English strings not in locales (i18n, not wrong copy): "Live customer record", "Record open" (:89),
   "published review(s)", "across N products" (:101-102), dl labels (:150-168), "Customer ledger" (:183),
   "Written in customers' own words." (:184), `aria-label="Rating sources"` (:113),
   the rated-state aria-label (:93). Fix: move to `sections.social_proof.*` locale keys (new keys only; adding keys to
   the shared locale file is append-only and low-risk).
8. Possible integer division in the average (PLAUSIBLE): `weighted_sum | divided_by: total_count` (:42). If the
   review app writes whole-number ratings (`rating` 5, 4), `weighted_sum` is an integer and Liquid integer division
   truncates (5+4 over 2 gives 4, not 4.5). Fix: `assign average_rating = weighted_sum | times: 1.0 | divided_by:
   total_count | round: 1`.
9. Mixed scales: `rating_scale` is overwritten per product (:30), so products on different `scale_max` would be
   averaged as if equal. Fix: normalise each `item_rating.rating` to a 5 scale before weighting
   (`rating | times: 5.0 | divided_by: scale_max`).
10. Three copies of the store rating (4.9 / 952): this section's settings (index.json:1305-1306), cv-phone-scan
    (index.json:83-85) and cv-product-counter. They can drift. Recommend a single theme setting later
    (config/settings_schema.json is shared: coordinate, do not do it in this lane).
11. Fixed `id="cv-reviews"` (:72): two instances would duplicate the id; nothing links to `#cv-reviews` (grep found
    no references). Fix: `id="cv-reviews-{{ section.id }}"`.
12. `proof-stamp.webp` is 650 KB for a 640 px decorative stamp (:218). Only shown in rated/open states (not today).
    Re-export to about 60-90 KB webp before it ever ships.
13. Schema name "Convert — Social proof" (:228, :259) has an em dash; editor-facing only. Optional: "Convert: Social proof".
14. No candy-as-product, no Halo copy, no hardcoded prices. Phone-model domain does not apply.

## Claims register

| Claim (shopper-facing) | Where | Status |
|---|---|---|
| Store rating 4.9 / 5 | schema default :235; index.json:1305; rendered :106 | BACKED (PRODUCT.md Evidence on Hand: 4.9 out of 5 from 952 reviews, Trustpilot and Google) |
| 952 reviews | schema default :236; index.json:1306; :112 | BACKED (same) |
| "Store rating", Trustpilot + Google source chips | :89, :113-131, :150-152 | BACKED (labelled as store rating, not product data) |
| Average product rating and review count, "across N products" | :19-44, :92-103 | LIVE (`reviews.rating`, `reviews.rating_count` metafields) |
| "Nothing on this board is pre-filled or manually scored." | schema default :231, fallback :82 | UNBACKED in store state (contradiction). Live instance overrides it |
| "Editorial edits: None" | :166-169 | UNBACKED (cannot be guaranteed by the theme) |
| "Updates: With every new review" | :162-165 | LIVE by mechanism (render-time metafields); acceptable |
| "Source checked" stamp, "Live Shopify review data" | :217-220, schema :250-251 | Acceptable only in `rated` state; UNBACKED in `open` state |
| "Written in customers' own words." | :184 | Conditional: true only when an app block renders real reviews |
| "No sample quotes. No imported press logos. Just the live record." | :205, schema :246 | True about the build; "live record" inaccurate in store state (index override is honest) |
| "The first customer review will set the score, not us." | :141, :241, index.json:1310 | True by mechanism; has an em dash (fix) |

## Motion inventory

- `data-cv-*` attributes: `data-cv-proof` (root gate, :73), `data-cv-proof-three` (:77), `-heading` (:81),
  `-board` (:85), `-summary` (:86), `-score` + `data-score` (:94, :106), `-svg` (:135-137), `-lines` (:147),
  `-ledger` (:174), `-app` (:188), `-thanks` (:210), `-stamp` (:217). None of the shared cv-motion.js attributes
  (`data-cv-reveal` etc.) are used, so the section is readable without JS.
- Section motion JS: `assets/cv-proof-motion.js`.
  - GSAP + ScrollTrigger entrance, one-shot at `top 72%` (:52-83): heading/intro rise, board lifts with a shadow,
    summary/ledger rise, score counts from 0.0 to its value (:68-77), dl rows slide, waiting lines rise, SVG paths
    settle (:25-36). Uses `.from()` on transforms only (no opacity), so a failed script leaves the finished state.
  - Thank-you strip + stamp slam (scale 1.55, rotation -22, then a 1.03 pulse) at `top 88%` (:89-110).
  - Three.js decorative floating paper sheets (:113-238), imported at runtime from
    `cdn.jsdelivr.net/npm/three@0.186.0` (:9), only when `enable_3d`, motion allowed and WebGL exists; pixel ratio
    capped 1.5; pauses offscreen (IntersectionObserver, :207-211) and in hidden tabs (:191, :218).
- GSAP plugins: core + ScrollTrigger only. No SplitText, DrawSVG (the SVG "draw" is a scale/rotate), Flip.
- Reduced motion: JS `reducedMotion()` checked at mount (:12-14, :41, :116); CSS hides the 3D layer and kills
  transitions (cv-social-proof.css:433-438). Not live: a preference change mid-session is not picked up.
- No-JS: complete static board (only the decorative `.cvp-proof__three` starts at opacity 0, cv-social-proof.css:31).
- Theme editor: handles `shopify:section:load` (mount) and `shopify:section:unload` (cleanup) (:257-267).
  Missing: `shopify:section:select` / `block:select` finish, `ScrollTrigger.refresh()` after mount and on
  `window.load`. Cleanup does not kill an in-flight entrance timeline (only the trigger, :85-88).
- Ambient: the three.js float runs continuously while on screen with no visible pause control (DESIGN.md:192 asks
  for an explicit pause path for auto-running motion).

## Motion opportunities

High value
1. Star fill sweep synced to the score count: the score already counts up (:68-77). Tween the `--fill` custom
   property of `.cvp-proof__stars-row` (set inline by snippets/cv-stars.liquid:12) from `0%` to its rendered value
   at the same timeline position (0.75 s, 1.05 s, `power3.out`). Read the target from the inline style; skip under
   reduced motion. No new markup.
2. Ledger entries from the review app: when an `@app` block is present, `ScrollTrigger.batch('[data-cv-proof-app] >
   * > *', { onEnter: y 16 -> 0, stagger .06, clearProps })`, plus a `MutationObserver` on `[data-cv-proof-app]`
   because review apps hydrate after load; call `ScrollTrigger.refresh()` when nodes arrive. Never hide app markup
   with CSS before JS runs.
3. Pause path for the 3D float: settle the group after the entrance (tween the float amplitude to 0 after ~8 s) or
   add a small "Pause motion" toggle (`aria-pressed`) like cv-spotlight-motion.js:160-190.

Medium
4. Source chips stamp in (scale 1.3 -> 1, rotation -6 -> 0, `back.out(2)`, 240 ms, stagger 80 ms) right after the
   score lands; DrawSVG the Trustpilot star outline (DrawSVG is always loaded).
5. Wrap mount in `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` so a preference flip reverts.
6. Editor hygiene: add `shopify:section:select` -> jump timelines to `progress(1)`; `ScrollTrigger.refresh()` after
   `mountAll` and on `window.load`; kill the entrance timeline in cleanup.

Low
7. Optional "Find your case" `.cv-cta` link (to `routes.all_products_collection_url`) at the end of the thanks strip,
   picking up the shared magnetic CTA (cv-motion.js:219-231). No buy box, Add to cart or Buy now here; this
   section has no commerce surface.

## Risks

- Do not animate the store rating into more prominence than today (no "4.9" giant count-up hero, no
  "verified" wording); it is merchant-supplied store data, not product reviews.
- Anything added to the ledger must come from a review app; never seed sample quotes for the motion demo.
- `cv-proof-motion.js` loads three.js from jsdelivr at runtime (:9); this is a theme-wide pattern (16 files) and the
  self-hosted `assets/three.module.min.js` exists. Switching to it is a cross-cutting decision (MOTION-SYSTEM.md 1.6
  says no new runtime CDN imports); do not add new CDN imports here.
- Several review sections sit next to each other on the home page (social, trustpilot_reviews,
  facebook_testimonials, customer_reviews, facebook_comments; index.json order). Motion added here should stay
  calm so the run of review sections does not become a wall of entrances.
- Theme.css dead rules (:1595-1607) are in a shared file; remove only in a coordinated CSS cleanup pass.
