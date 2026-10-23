# cv-collection ("Collection: the aisle")

Family: cart-search-coll. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**live**: `templates/collection.json` (section id `main`, settings :5-18). Collection is a shop page, so
the layout loads `cv-pages.js` (layout/theme.liquid:166, :338-341) and GSAP Flip + MotionPathPlugin
(:173-177).

## Purpose

Collection page dressed as a candy-shop aisle: a KIE aisle-sign plate over the collection title and
description, a pack meter (three boxes that fill with photos of cases in the bag, real 18%/31% pack
discount line), Shopify storefront filters in a `<dialog>` drawer with live counts and removable chips,
sort, a grid of showcase cards (`snippets/cv-showcase-card.liquid`, quick pick for multi-variant
products, direct add for single variant) and pagination. Filters, sort and pages swap in place through
the Section Rendering API (cv-pages.js:146-279).

## Files (owned / shared)

Owned:
- `sections/cv-collection.liquid`, `templates/collection.json`
- `snippets/cv-pack-meter.liquid` (rendered only here, :72)

Shared (coordinate):
- `assets/cv-pages.js` (modules signs, packMeter, aisle; also cv-collections-list, cv-contact, cv-page)
- `assets/cv-pages.css` (`.cvl`, `.cvpm` blocks; file also styles `.cvcl`, `.cvct`, `.cvd`)
- `assets/pages-aisle-sign.webp` (also cv-collections-list)
- `assets/pack-box-wall.webp`, `assets/pack-box-lid.webp` (also snippets/cv-pack-slots.liquid and
  cv-pack-slots.css on product pages)
- `snippets/cv-showcase-card.liquid` + `assets/cv-showcase.css` (also sections/cv-showcase.liquid)
- `snippets/cv-card-copy.liquid` (read by cv-showcase-card for every product: hand-typed per handle)
- `assets/cv-badges.css` (also cv-search, cv-page), `snippets/cv-icon.liquid`, `snippets/cv-stars.liquid`
- Quick pick: `snippets/cv-quick-pick.liquid`, `assets/cv-quick-pick.js` / `.css` (layout-gated by
  `data-cvqp-open`, layout/theme.liquid:208-210, :295-297)
- `assets/cart.js` (single-variant `data-cart-add-form` posts), `assets/cv-motion.js`, `assets/theme.css`
- `assets/cv-showcase-motion.js` gets LOADED here (gate `data-cvsh` substring-matches `data-cvsh-card`,
  layout/theme.liquid:230-233) but no-ops: it only binds `[data-cvsh]` roots (cv-showcase-motion.js:366-367).

## Store adaptation findings

1. **H, no-JS: the grid and the quick pick are unusable.** Cards get `data-cv-reveal` (`reveal: true`,
   :212) so the whole grid is `opacity:0` without JS (theme.css:1073). Multi-variant cards render the CTA
   as `<button type="button" data-cvqp-open>` with no href (cv-showcase-card.liquid, `cta_mode 'pick'`),
   so "Choose your phone" does nothing without JS. Fix: (owned) pass `reveal: false` and animate from an
   owned script; (shared, showcase lane) render the pick CTA as `<a href="{{ item.url }}" data-cvqp-open>`
   (cv-quick-pick.js:223-226 already `preventDefault`s via `closest('[data-cvqp-open]')`).
2. **H, no-JS: filters unreachable.** The Filter button is `type="button"` (:80) and filters live in a
   closed `<dialog>` (:108); only sort has a `<noscript>` Apply (:103). Fix: render the filter groups
   inside `<noscript>` inline (or make the drawer a `<details>` that JS upgrades to the dialog).
3. **M, theme editor: behaviour dies after a re-render.** cv-pages.js has no `shopify:section:load`
   handler (no `shopify:` string in the file); after a setting change the drawer, sort, pack meter and
   swap stop working until reload. Fix: refactor modules to `init(root)` and re-run on section load
   (shared file, coordinate with cv-collections-list / cv-page / cv-contact lanes).
4. **M, phone-model filter not prioritised.** The first filter group opens by default (`forloop.first`,
   :127). Open the group whose label matches `model|phone|device|compatib|applicable` first; the comment
   itself says it is "the one shoppers here need most" (:18-19). LIVE Search & Discovery data.
5. **M, card copy not verified against options.** cv-card-copy.liquid hand-types per-handle lines such as
   "cut for iPhone, Pixel and Galaxy" (:16), "cut for iPhone and Galaxy S" (:38), "for iPhone 17 Pro and
   Pro Max" (lens film), and "MagSafe compatible" pills. Collection cards show them. They must match each
   product's real model option (Principle 1, PRODUCT.md:109). Shared snippet: flag to the showcase lane;
   verify with the connector. Safer: derive the phone family line from option values.
6. **M, hard-coded English and render params:** crumbs "Home" / "Collections" (:53, :55), "Filter" (:82,
   :110), "Close filters" (:111), "Sort" (:93), "Apply" (:103), "From" / "To" (:138, :142), "Clear all"
   (:168, :201), "Show N products" (:169), "Remove filter" (:185, :195), "Filters in use" (:177),
   "Previous" / "Next" (:221, :237; locale keys exist, locales/en.default.json:10), "See every case"
   (:252), `cta_label: 'Shop now'`, `sale_badge: 'Save [percent]%'`, `new_badge: 'New'` (:212). Make the
   three badge/CTA strings settings.
7. **L, pack meter percentages are settings that can go stale.** 18 / 31 (:272-273, collection.json:13-14)
   match the live discounts checked 2026-09-15 (PRODUCT.md:39); Liquid cannot read discounts, keep the
   "Must match" info. Pack line t3 "[n] cases in your bag" (cv-pack-meter.liquid:36) counts every item,
   including the lens film; "items" would be exact, or keep "cases" if the merchant accepts it.
8. **L, count noun** "product/products" (:46-47) is accurate (catalogue includes a lens film); fine.

No candy-as-product: the aisle sign and candy boxes are set dressing around real product photos; the pack
meter says "cases". No other brand, no hard-coded prices (price filter uses `cart.currency.symbol`, live).

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Mix any 2 cases for 18% off, or any 3 for 31% off. Colours and phones can all be different." and the 1/2/3 lines | cv-pack-meter.liquid:33-36, tags :60 | BACKED PRODUCT.md:39 (via settings; must match admin) |
| "N products", filter value counts | :88, :156, :169 | LIVE |
| Card "Save X%" | :212 via cv-showcase-card | LIVE (compare_at) |
| Card "New" | cv-showcase-card (created_at < 30 days) | LIVE |
| Card stars | cv-showcase-card (`reviews.rating`, `rating_count`) | LIVE, only when a review app writes them |
| Card "N models / N colors" | cv-showcase-card | LIVE (options) |
| Card pills "Magnetic", "Built-in stand", "Drop protection" when derived from title/tags | cv-showcase-card | LIVE-derived from the product's own title/tags (acceptable) |
| Card line/pills from cv-card-copy.liquid (e.g. "cut for iPhone, Pixel and Galaxy", "MagSafe compatible", "Anti-yellowing", "Wireless charging") | snippets/cv-card-copy.liquid:16-75 | Hand-typed product attributes: VERIFY per product (PLAUSIBLE, not in Evidence) |

## Motion inventory

- cv-pages.js signs (:45-74): `[data-cv-sign]` (:63) drops in with `elastic.out(1,0.32)` 1.9 s, below
  fold via ScrollTrigger `top 92%` once; continuous scroll-velocity lean through `gsap.quickTo(sign,
  '--lean')`. Off under reduced motion; visible without JS.
- cv-pages.js packMeter (:77-143): lid flips off and the bag photo drops in (`bounce.out`), lid returns on
  removal, line nudges in. Listens to `cv:cart` and to `submit` of `form[data-cart-add-form]` with a
  1200 ms timeout re-fetch (:137-140); ignores `cart:refresh` / `cart:added`.
- cv-pages.js aisle (:146-279): drawer `xPercent` 100 to 0 (0.45 s) and out (0.3 s); results swap with
  `Flip.from` (0.5 s) and `onEnter` stagger; `.is-loading` opacity (cv-pages.css:216).
- cv-motion: `.cv-page-root` progress (:51), cards `data-cv-reveal` via `reveal: true`.
- CSS: cv-pages.css transitions, reduced block :479-481; global collapse theme.css:3306-3312.
- GSAP plugins used: ScrollTrigger, Flip. Available but unused here: MotionPathPlugin, DrawSVG, CustomBounce.
- Editor events: none (finding 3).
- Showcase card gestures (CTA shine sweep, peppermint spin, `data-cvsh-cta-*`) never run on collections
  (cv-showcase-motion.js binds `[data-cvsh]` only).

## Motion opportunities

Owned file to add: `assets/cv-collection-motion.js`, printed by the section (`defer`, after cv-pages.js
is fine since both are deferred and the section script comes earlier in the DOM: listen for events, do
not call cv-pages internals). Boot on load and `shopify:section:load`.

1. **HIGH: shelf-stocking grid entrance.** `ScrollTrigger.batch('.cvl__cell')`: cards drop 24 px with a
   1 to 2 degree settle (`back.out(1.4)`, 0.5 s, stagger 0.06), photo glass sweep after. Replaces
   `reveal: true` (fixes finding 1). Re-run on results swap (observe `[data-cvl-swap="results"]`
   childList; cv-pages.js already marks swapped reveals revealed, :210).
2. **HIGH: quick add flies into the pack meter.** On `cv:cart` (detail has the full cart), fly a copy of
   the added variant photo from the quick pick add button (or the card) along a MotionPath arc into the
   next empty pack box, then let cv-pages.js open the lid. MotionPathPlugin is loaded on shop pages.
   Reduced: no fly, box just fills.
3. **HIGH: single-variant Add to bag.** Cards in `cta_mode 'add'` post through cart.js (label becomes
   "Wrapping…", cart.js:92). Add press squash, a check drawn with DrawSVG on success, and a pack meter
   update immediately instead of the 1200 ms poll: dispatch/listen `cart:refresh` (shared cart.js change:
   have cart.js dispatch `cart:added` with `{ from: btn, img }`).
4. **MED: showcase CTA gestures on collection cards.** Reuse the showcase sign-CTA hover (shine sweep,
   mint spin) by initialising for `[data-cvl]` (showcase lane adds an `initCards(root)` export, or this
   lane writes a small owned equivalent for `[data-cvsh-cta-shine]` / `[data-cvsh-cta-mint]`). Fine
   pointer only.
5. **MED: filter feedback.** Badge count pop (`back.out(2)` 0.24 s) and results count roll when the
   swap lands; chips Flip in/out (Flip is loaded). Keep `aria-live` writes final-only.
6. **LOW: pack line stamp** when the count crosses 2 / 3 (`back.out(2)`, rotation -6 to 0).

## Risks

- cv-pages.js and cv-pages.css are shared by four sections; changes there need one owner.
- Two engines on one card: if GSAP takes over entrance, drop `reveal: true` in the same change
  (MOTION-SYSTEM.md 7.4). cv-showcase.css also has hover transforms on cards: animate inner wrappers.
- The pack meter is a single-instance `$('[data-cv-pack-meter]')` (cv-pages.js:78): one meter per page.
- `cart.currency.symbol` before the price inputs assumes symbol-first formatting; with Markets this can
  read oddly. Low.
- Changing live template copy (templates/collection.json) needs merchant confirmation.
