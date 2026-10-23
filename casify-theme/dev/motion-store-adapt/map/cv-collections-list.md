# cv-collections-list ("Collections: the aisles")

Family: cart-search-coll. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**live**: `templates/list-collections.json` (section id `main`; heading "Every collection", empty
subheading, `hide_handles: "frontpage"`). list-collections is a shop page: cv-pages.js, Flip and
MotionPath load (layout/theme.liquid:166, :173-177, :338-341).

## Purpose

Every collection as an aisle: each non-empty collection hangs the KIE aisle-sign plate with its title,
a shelf of its first three product photos and "N products". Collections in `hide_handles` and empty ones
are left out.

## Files (owned / shared)

Owned:
- `sections/cv-collections-list.liquid`, `templates/list-collections.json`

Shared (coordinate):
- `assets/cv-pages.css` (`.cvcl` block :236-270 area, `.cvl__empty` reused at :59; file shared with
  cv-collection, cv-contact, cv-page, cv-pack-meter)
- `assets/cv-pages.js` (`signs` module :45-74)
- `assets/pages-aisle-sign.webp` (also cv-collection)
- `snippets/cv-icon.liquid`, `assets/theme.css` (`.cv-crumbs`), `assets/cv-motion.js` (`.cv-page-root`)

## Store adaptation findings

1. **M, class prefix collides with the collage section.** `.cvcl`, `.cvcl__hd`, `.cvcl__title`,
   `.cvcl__lede` are defined in both `assets/cv-collage.css:9-47` (sections/cv-collage.liquid, home) and
   `assets/cv-pages.css:236-239` (this section). Today they never load together, but a merchant adding
   the collage to this template, or the editor (which loads every gated script, layout/theme.liquid:164),
   will mix them. Fix: rename this section's prefix to `.cvcls` (owned markup + the `.cvcl` block of
   shared cv-pages.css, one coordinated edit).
2. **M, hard-coded English:** crumbs "Home" (:19), "Collections" (:21), "product"/"products" (:50), empty
   state "No collections yet" / "Once collections have products in them, they appear here." (:60-61).
   Make the empty-state copy and the count nouns settings; use locales for crumbs.
3. **L, only the first 50 collections render.** `{% for col in collections %}` (:33) without paginate;
   fine for this catalogue, note for growth.
4. **L, nothing tells the shopper what each aisle is for.** Optional LIVE enrichment: under the count,
   show "From {{ min price }}" computed from `col.products` (first page only, so label it carefully) or
   the collection's own description excerpt (`col.description | strip_html | truncatewords: 12`). Never
   invent a tagline.
5. **L, shelf photos are decorative** (`alt: ''`, `aria-hidden`, :42-45): correct; the link text is the
   collection title.

No candy-as-product (aisle signs are set dressing; photos are real products), no other brand, no copy
with dashes, no prices.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "N products" per collection | :50 | LIVE |
| Collection titles | :40 | LIVE (store data) |

No reviews, shipping, guarantee or performance claims.

## Motion inventory

- `data-cv-sign` (:38) on every aisle: cv-pages.js:45-74 drops each sign in (`elastic.out(1,0.32)`,
  1.9 s; below the fold via ScrollTrigger `top 92%` once, `autoAlpha 0` set only by JS) and leans all
  signs with scroll velocity (`quickTo('--lean')`).
- CSS: shelf photos fan on hover (`.cvcl__pic` rotate/translate 420 ms `--ease-candy`, cv-pages.css:264);
  reduced: `transition: none` (cv-pages.css:480) plus global collapse (theme.css:3306-3312).
- `.cv-page-root` (:17): progress bar (hidden when the header has its own).
- No data-cv-reveal (no-JS state is fully visible: good).
- No section JS; no editor events in cv-pages.js (a re-rendered section shows signs at rest: acceptable).

## Motion opportunities

Owned file to add if needed: `assets/cv-collections-list-motion.js` printed by the section; or extend
the shared `signs` module with the cv-pages owner.

1. **HIGH: aisle deal-in.** `ScrollTrigger.batch('.cvcl__aisle')`: after the sign drops, the three shelf
   photos drop onto the shelf one by one (`bounce.out`, 0.6 s, stagger 0.08; the pack-meter idiom,
   cv-pages.js:99-100), then the count + arrow slide in. JS sets the hidden state; reduced motion skips.
2. **MED: hover and focus parity.** Photos fan on `:focus-visible` too (CSS, owned once the prefix is
   renamed), sign swings toward the pointer (`--lean` already exists; feed it pointer x on fine pointers),
   arrow nudges 4 px.
3. **MED: count roll.** Use `data-cv-count` with the real count printed as text (do not print 0) on the
   meta line; cv-motion animates it on reveal. Needs a `data-cv-reveal` ancestor or `data-cv-bars` group
   (`data-cv-bars` avoids hiding content).
4. **LOW: tap feedback.** 120 ms sign press on click; never delay navigation.

## Risks

- Prefix rename touches shared cv-pages.css; do it in one coordinated change with the cv-collection lane.
- The `signs` module selects every `[data-cv-sign]` on the page (cv-collection uses it too); per-section
  options must be read from data attributes, not global state.
- Do not add `data-cv-reveal` to the aisle links (no-JS invisibility, MOTION-SYSTEM.md 3.4.1).
