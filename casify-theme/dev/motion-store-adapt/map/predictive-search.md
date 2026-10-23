# predictive-search ("Predictive search")

Family: cart-search-coll. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**dynamic**: placed in no template. `assets/cv-header.js:131-149` fetches
`{{ routes.predictive_search_url }}?q=TERM&resources[type]=product,collection,page,query&resources[limit]=4&section_id=predictive-search`
(220 ms debounce, :152-157, min 2 chars) and writes the HTML into `#cm-predictive-search-results`
(sections/header.liquid:115) inside the header search panel (:106-116).

## Purpose

Instant results under the header search field: query suggestions (pills), up to 4 products (thumb,
title, price or price range), collection/page/article links, a "View all results" link to
`/search?q=...&type=product`, and an empty line.

## Files (owned / shared)

Owned:
- `sections/predictive-search.liquid` (only file; no schema settings, no assets).

Shared (header lane; do not edit from here):
- `assets/cv-header.js` (fetch, injection, `aria-expanded`, GSAP stagger of results :143-147, panel
  open tween :120-123, Escape :159-163, editor re-init :575-576).
- `sections/header.liquid` (panel markup :106-116, all `.cm-predictive-results*` CSS :166-185, the
  combobox input :110).
- `locales/en.default.json` (`general.search.*`, :3).

## Store adaptation findings

1. **M, en dash in shopper copy.** Price range prints `{{ price_min }} &ndash; {{ price_max }}` (:37).
   Fix: `From {{ product.price_min | money }}` (matches the cards, snippets/cv-card.liquid:73 and
   snippets/cv-showcase-card.liquid "From").
2. **M, no phone-model context on product hits.** Shoppers search by model (placeholder "Search cases or
   phone models", locales/en.default.json:3). Fix (owned, LIVE data): for each product, detect the model
   option (`model|phone|device|compatib|applicable`, STORE-FACTS.md 4 rule 1) and print "Made for N
   phone models"; when a model value matches the typed term (normalised key: downcase, strip spaces,
   `-`, `_`, `/`; longest match first so "18 Pro" never counts as "18 Pro Max", STORE-FACTS.md 4 rule 5)
   print "Fits {{ raw value | escape }}". Never add `?variant=` to the link (no pre-selection,
   PRODUCT.md:110).
3. **M, query suggestions alone show "No results".** `has_results` ignores `ps.queries` (:11-13), so a
   term with only suggestions renders the empty line and hides the suggestions (they live inside the
   `has_results` branch, :16-22). Fix: include `ps.queries.size > 0` in `has_results`.
4. **M, dead-end empty state.** "No results for X." (:66) offers nothing. Add a link to
   `routes.all_products_collection_url` ("Browse every case") and to `/search?q=...` so the full search
   (with prefix matching, sections/cv-search.liquid:37) can try.
5. **L, hard-coded English:** "Collection" (:51), "Page" (:54), "Article" (:57), "View all results for"
   (:63), "No results for" (:66). Add `general.search.*` keys (shared locale file; coordinate).
6. **L, articles are checked but never requested** (`resources[type]` in cv-header.js:134 omits
   `article`); harmless dead branch (:56-58).
7. **L, a11y:** the input is `role="combobox"` (header.liquid:110) but results have no `role="listbox"`
   / options and no arrow-key navigation; `aria-live="polite"` on the container (header.liquid:115) reads
   the whole result block. Add a short visually hidden status line ("4 products, 1 collection") inside
   the section output and move `aria-live` to it (needs header.liquid change: shared).

No candy-as-product, no other brand, no claims. Thumbnails use `product.featured_media.alt | default:
product.title` (:30): correct, since product images carry no alt (PRODUCT.md:32).

## Claims register

| Claim | Where | Status |
|---|---|---|
| Product prices / ranges | :36-40 | LIVE |
| (proposed) "Made for N phone models", "Fits iPhone ..." | finding 2 | LIVE (computed from options) |

No reviews, counts, shipping or performance claims.

## Motion inventory

- cv-header.js:143-147: when header motion is on (`gsap` present and not reduced, cv-header.js:34),
  results `.cm-predictive-results__query, __item, __link` animate `autoAlpha 0, y 8` to visible, 0.35 s
  `power3.out`, stagger 0.03. Panel form drops in (:121-123). No exit animation: `clearPredictive()`
  empties instantly (:107-112).
- CSS: item hover background 160 ms (header.liquid:174); `.cm-predictive-results__query` hover colour.
- No data-cv-* attributes (correct for injected markup).
- Reduced motion: no GSAP; global CSS collapse (theme.css:3306-3312).
- No-JS: the panel opens only through JS (`data-search-toggle` button, header.liquid:86), so there is no
  predictive search without JS; `/search` still works. Fine for an enhancement.
- Editor: section never placed; cv-header.js re-inits on `shopify:section:load` (:575).

## Motion opportunities

All runtime motion for this section lives in cv-header.js (shared). Two routes:
(a) ask the header lane to extend `runPredictive`, or (b) keep it CSS-only inside this section's markup.
Do not add a second GSAP entrance on the same nodes (double fade, MOTION-SYSTEM.md 7.4).

1. **MED: "Fits your phone" stamp.** With finding 2, the "Fits iPhone 17 Pro" ticket stamps in after the
   row (scale 1.25 to 1, rotation -4 to 0, `back.out(2)`, 0.24 s, delay after the existing stagger).
   Header lane, inside the same `gsap.fromTo` block. Reduced: static ticket.
2. **MED: loading state.** While the fetch is pending (> 150 ms), show a typewriter "Looking..." line or a
   thin candy-stripe rule under the field (CSS `background-position` animation, stopped by the global
   reduced-motion rule). Header lane.
3. **LOW: exit.** Fade results out 0.16 s before `innerHTML = ''` when the term changes. Header lane.
4. **LOW: thumb settle.** CSS only, ownable here: images fade in on load via a `<style>` scoped to
   `.cm-predictive-results__thumb img` placed inside the section output (it is re-sent with each
   response). Keep under 160 ms.

Value: modest. Search is a utility; correctness (findings 1-4) matters more than motion.

## Risks

- Section output is the whole payload; Shopify wraps it in `#shopify-section-predictive-search`. Any
  `<style>`/`<script>` added here is re-injected on every keystroke (scripts in innerHTML do not run).
- Computing model matches loops `product.variants` for up to 4 products: cheap; keep it inside
  `predictive_search.performed`.
- cv-header.js selects `.cm-predictive-results__query, __item, __link` by class: keep those class names
  if the markup changes, or the stagger silently stops.
