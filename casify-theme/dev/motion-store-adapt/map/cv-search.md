# cv-search ("Search")

Family: cart-search-coll. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**live**: `templates/search.json` (section id `main`, settings :5-13).

## Purpose

The search results page. A hero search field (autofocus when no search yet), suggestion chips, a result
count, a grid where products render as `snippets/cv-card.liquid` cards with quick pick and pages/articles
as compact "hit" cards, pagination, and an empty state. `options[prefix]=last` gives prefix matching
(:37).

## Files (owned / shared)

Owned:
- `sections/cv-search.liquid`
- `templates/search.json` (single instance)
- `assets/badge-ai-search.png` (only referenced here, :16; a red rosette with a magnifier over a phone
  case, no text: decorative set piece)
- `snippets/cv-candy-divider.liquid` (rendered only here, :18; lollipop/bow/lollipop divider)
- CSS `.cv-search*`, `.cv-hit*` in `assets/theme.css:2355-2420` (global file: prefer a new owned
  `assets/cv-search.css` for changes)

Shared (coordinate):
- `snippets/cv-card.liquid` (also sections/cv-collection-row.liquid:63 and sections/cv-orbit.liquid)
- `assets/cv-badges.css` (also cv-collection, cv-page; `.cv-doc__badge` :18-23)
- `snippets/cv-quick-pick.liquid` + `assets/cv-quick-pick.js` + `cv-quick-pick.css`, loaded by
  layout/theme.liquid:208-210, :295-297 because cv-card prints `data-cvqp-open`
- `assets/cv-motion.js`, `assets/theme.css` (reveal, chips hidden state :2381-2391, `.cv-pager`,
  `.cv-empty`, `.cv-card`), `snippets/cv-icon.liquid`, `assets/cart.js`, `locales/en.default.json`

## Store adaptation findings

1. **H, suggestion chips point at things the shop may not sell.** Default and live value
   "iPhone 17 Pro, Clear case, MagSafe, Galaxy S25, Screen protector" (:136; templates/search.json:10).
   The catalogue has a camera-lens film, not a screen protector (STORE-FACTS.md 3), Samsung coverage is
   thin and "Galaxy S25" is unverified, and products are titled "magnetic" rather than "MagSafe". A chip
   that returns nothing is a broken promise. Fix: add a `collection` setting `chip_source` and build
   chips from live data: the distinct phone-model option values across that collection's products
   (raw merchant values, deduped by normalised key, newest models first, max 6), plus style words found
   in titles ("Magnetic", "Clear", "Stand"). Keep the text setting as an override; change its default
   to terms that exist in current titles (verify with the connector before committing).
2. **H, en/em dash and an unbacked "cut for" claim in the empty state.** `empty_body` default "Check the
   spelling, or search by phone model [em] every case is listed under the model it was cut for." (:116,
   :138; live in templates/search.json:12). Fix: "Check the spelling, or search by phone model, like
   iPhone 17 Pro. Every case lists the phones it fits." ("Cut for" implies per-model manufacturing, which
   STORE-FACTS.md 7a lists as unbacked.)
3. **H, result count reads 0 until JS counts.** `<b data-cv-count="{{ search.results_count }}">0</b>`
   (:59): screen readers, crawlers and no-JS users get "0 results for X" above a full grid. Fix: print
   the real number as text; cv-motion's counter still animates from 0 when revealed
   (cv-motion.js:94-119 overwrites the text).
4. **H, no-JS: results and chips invisible.** Every card is `data-cv-reveal` (cv-card.liquid:41), hits
   (:68), header (:15), form (:28), chips (:45; chips also hidden by `.cv-search__chip { opacity: 0 }`
   until `.is-revealed`, theme.css:2381-2391). Fix with the family-wide no-JS strategy (MOTION-SYSTEM.md
   10.1) or drop `data-cv-reveal` from the form and grid wrappers here. The search form must never be
   hidden.
5. **M, hard-coded English:** "Search" (:38-39), "result(s) for" (:60), "Article" / "Page" (:71, :73),
   "Read" (:80), "Previous" / "Next" (:90, :106; use `general.pagination.previous/next`,
   locales/en.default.json:10), "No match for" (:115), "Browse everything" (:120), "Pagination" aria
   label (:87).
6. **M, product hits do not say whether they fit the searched phone.** When `search.terms` normalises to
   a model value present in a product's model option, show a "Fits {{ raw value }}" ticket on that card.
   cv-card is shared, so do it in the section: wrap each product card in a `<div class="cv-search__cell">`
   carrying the ticket, or pass a new optional param to cv-card only with the other cv-card users'
   agreement. LIVE data, no `?variant=` pre-selection.
7. **L, eyebrow + candy divider + h1** (:17-19): DESIGN.md:198 discourages an eyebrow over every heading.
   Optional: keep the divider (shop dressing), drop the eyebrow on results.
8. **L, `autofocus` on an empty search page** (:36) pops the mobile keyboard on arrival; consider
   `autofocus` only on fine pointers (set from JS) or keep (it is the page's job).
9. **L, comment header "Chrismass design system" with an em dash** (:2): not shopper-facing.

No candy-as-product (divider is set dressing beside the heading, not merchandise), no other brand, no
hard-coded prices.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "N results for X" | :59-60 | LIVE (but prints 0 statically, finding 3) |
| "every case is listed under the model it was cut for" | :116, :138, search.json:12 | UNBACKED manufacturing implication; reword |
| Suggestion chips (MagSafe, Galaxy S25, Screen protector) | :136, search.json:10 | Not claims, but imply stock; unverified, finding 1 |
| Card "Made for N phone models", "-X%", "From $", "Sold out" | cv-card.liquid:59-73 | LIVE |

## Motion inventory

- cv-motion attributes: `.cv-page-root` (:13), `data-cv-reveal` (:15, :28, :45, :58, :68, :87, :113),
  `data-cv-reveal="scale"` badge (:16) nested inside a reveal (double fade on the badge),
  `data-cv-split` h1 (:19, plain text), `data-cv-stagger` chips (:45), `data-cv-count` (:59), `.cv-cta`
  magnet (:117); cv-card `data-cv-reveal` + `--cv-i` (cv-card.liquid:41).
- CSS ambient: three `cv-icon animate: true` in the divider (cv-candy-divider.liquid:10-12) and the
  empty icon (:114): infinite keyframes (theme.css:992-997) with no offscreen pause.
- Quick pick dialog: GSAP open/close in cv-quick-pick.js (optional, reduced-motion aware, :21-22).
- Section JS: none. GSAP: none. Editor events: none (cv-motion.js runs once; editor re-render leaves the
  section invisible).
- Reduced motion: handled globally (cv-motion.js:158-169; theme.css:3220-3270, :3306-3312).

## Motion opportunities

New owned file `assets/cv-search-motion.js`, printed by the section (`defer`), booting on load and
`shopify:section:load`. `gsap.matchMedia()` for reduced motion. ScrollTrigger and SplitText are loaded on
every page; Flip and MotionPath are NOT on /search (not a shop page, layout/theme.liquid:166-177).

1. **HIGH: results deal-in with ScrollTrigger.batch.** Replace the per-card reveal on this page with a
   batched deal: cards rise 24 px and settle (`power3.out` 0.45 s, stagger 0.06), the photo inside
   scales from 1.04 (glass settle). Hidden state set by JS only (fixes no-JS). Needs cv-card's
   `data-cv-reveal` neutralised for this grid: CSS `.cv-search .cv-card[data-cv-reveal]{opacity:1;
   transform:none}` in the owned stylesheet, then GSAP owns entrance.
2. **HIGH: "Fits your phone" ticket stamp** (finding 6): stamps onto matching cards as they enter
   (scale 1.3 to 1, rotation -6 to 0, `back.out(2)`, 0.3 s).
3. **MED: field placeholder cycling real model names.** Cycle 3 to 5 model values read from the
   `chip_source` collection (finding 1) in the placeholder every 2.4 s while the field is empty and
   unfocused; stop on focus, offscreen or hidden tab. Plain JS (TextPlugin loads only with `data-cvsu`).
   Reduced motion: static placeholder.
4. **MED: chips.** Deal in with stagger (GSAP, replaces the CSS hidden state), hover lift 2 px, press
   squash; on click show a 160 ms stamp before navigation (do not delay navigation).
5. **MED: quick add feedback.** The quick pick add fires `cv:cart` (cv-quick-pick.js:52-56); hook the
   global cart motion (cv-cart-drawer map, opportunity 3) so the card photo flies to the bag. Nothing
   section-specific to own.
6. **LOW: empty state.** The rosette badge swings in on a ribbon (`elastic.out(1,0.4)`), one shot; the
   infinite icon pulse becomes a one-shot draw (DrawSVG).

## Risks

- cv-card.liquid is shared by three sections; do not change its markup from this lane.
- The quick pick dialog and script load only when `data-cvqp-open` is in `content_for_layout`
  (layout/theme.liquid:208, :295): cards in search results qualify, fine.
- Building chips from a collection loops products and options: cap at the first 50 products and 6 chips.
- `templates/search.json` copy is merchant-visible; changing the live chip or empty text needs the
  merchant's OK.
