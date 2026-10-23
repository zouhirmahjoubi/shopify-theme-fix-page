# cv-collection-row ("Product row")

Family: cart-search-coll. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**live**: `templates/index.json`, two instances:
- `shop` (:160-170): collection `frontpage`, eyebrow "Best sellers", heading "Most protected this month",
  subheading "One mould per model. Pick the phone and the fit is exact.", limit 4; order position 6
  (:1723).
- `iphone` (:1287-1297): collection `iphone`, eyebrow "Cut for your model", heading "Every iPhone we
  make", subheading "If your model is listed, there is a mould for it. If it isn't, we haven't made it
  yet.", link "See all iPhone", limit 4; order position 13 (:1730).
`one_per_design` is not set in either instance, so the schema default `true` applies (:89).

## Purpose

A home-page row of the first N products of one collection as `snippets/cv-card.liquid` cards with quick
pick (colour + phone before adding). Grid on desktop, snap rail below 760 px. Optional one-card-per-design
dedupe. Editor-only hint when the collection is empty.

## Files (owned / shared)

Owned:
- `sections/cv-collection-row.liquid`
- CSS `.cv-row*`, `.cv-grid--row` in `assets/theme.css:2214-2221, :2970-2980` (global file; prefer a new
  owned `assets/cv-collection-row.css`)

Shared (coordinate):
- `snippets/cv-card.liquid` (also cv-search, cv-orbit)
- `snippets/motion.liquid` + `assets/motion.min.js` + `assets/cv-motion-dev.js`: loaded because this
  section prints `data-motion-dev="cards"` (:46; gate layout/theme.liquid:190-192). cv-guarantee also
  prints `data-motion-dev`.
- Quick pick (`snippets/cv-quick-pick.liquid`, `assets/cv-quick-pick.js` / `.css`, layout-gated by
  `data-cvqp-open`), `assets/cart.js`, `assets/cv-motion.js`, `assets/theme.css`, `snippets/cv-icon.liquid`
- `templates/index.json` (21 sections; edit only the `shop` and `iphone` instances, and only with merchant
  confirmation for copy)

## Store adaptation findings

1. **H, sales-rank and "most protected" claims with no data.** Schema defaults eyebrow "Best sellers"
   and heading "Most protected this month" (:84-85, and the `| default:` fallback :32); live in the `shop`
   instance (index.json:164-165). No sales or protection ranking exists (STORE-FACTS.md 7a). Fix: schema
   default heading blank with fallback `coll.title`; eyebrow default blank. Live copy change needs the
   merchant: propose "Cases for your phone" / eyebrow removed, or a sort-backed truthful label only if
   the collection is sorted by best-selling (`coll.default_sort_by == 'best-selling'` may then say
   "Best sellers"; "this month" is never backed).
2. **H, manufacturing claims in live subheadings.** "One mould per model. Pick the phone and the fit is
   exact." (index.json:166); "Cut for your model" and "If your model is listed, there is a mould for it.
   If it isn't, we haven't made it yet." (index.json:1291-1293). Moulds per model are not in Evidence
   (STORE-FACTS.md 7a lists "one mould per model" as unbacked). Proposed honest text: "Pick a case, then
   your exact phone model. Every card says how many models it is made for." (the cards print the LIVE
   count, cv-card.liquid:68-70). Merchant confirmation required.
3. **M, two motion engines on the same cards.** The grid is `data-motion-dev="cards"` (:46): Motion sets
   `opacity 0, y 32, scale .96` and springs the cards in, plus a hover lift `y -6`
   (cv-motion-dev.js:35-47), while each card is also `data-cv-reveal` with a 420 ms CSS opacity/transform
   transition (cv-card.liquid:41, theme.css:1073-1079). The CSS transition smooths Motion's frames and
   the two write `transform` on one node (MOTION-SYSTEM.md 7.4). Fix: pick one (see opportunity 1) and
   drop `data-motion-dev` so motion.min.js no longer loads for this row.
4. **M, no-JS: row invisible, quick pick dead.** Card `data-cv-reveal`, header `data-cv-reveal` (:27);
   cv-card's pick button is `type="button"` with no href (cv-card.liquid:79). Same family fixes as
   cv-search / cv-collection (render the pick CTA as a link that JS upgrades; shared snippet).
5. **M, design dedupe keys on another catalogue's naming.** `split: ' Phone Case' | first | split:
   ' Christmas'` (:58), commented with "Christmas Pickles" titles (:47-53). For Casify titles the key is
   everything before " Phone Case" ("magnetic stand", "metal protective"), so two different products that
   share that prefix collapse and one silently disappears. Fix: default `one_per_design` to false, or key
   on a product metafield / tag (`design:xyz`) when present, else the full title.
6. **L, hard-coded English:** "View all" fallback (:39) is a setting default (fine); editor-only "Pick a
   collection" text (:71-72) is never shown to shoppers (fine).
7. **L, file header "Chrismass design system" with an em dash** (:2): not shopper-facing.

No candy-as-product, no other brand, no hard-coded prices (cards use live `product.price`).

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Best sellers" | :84 default; index.json:164 | UNBACKED |
| "Most protected this month" | :32, :85; index.json:165 | UNBACKED |
| "One mould per model", "the fit is exact" | index.json:166 | UNBACKED |
| "Cut for your model", "there is a mould for it" | index.json:1291, :1293 | UNBACKED |
| "Every iPhone we make" | index.json:1292 | Acceptable if the `iphone` collection is complete (store data; verify) |
| Card "Made for N phone models", "-X%", "From $", "Sold out" | cv-card.liquid:59-89 | LIVE |

## Motion inventory

- cv-motion: `data-cv-reveal` header (:27) and editor empty state (:69), `data-cv-split` h2 (:32, plain
  text), cards `data-cv-reveal` + `--cv-i` (cv-card.liquid:41).
- Motion (motion.dev 14.2): `data-motion-dev="cards"` (:46): spring stagger in view (only if the grid is
  below 90% of the viewport at load), hover lift on fine pointers; returns early under reduced motion
  (cv-motion-dev.js:23); re-boots on `shopify:section:load` (:116).
- CSS: card image hover swap (theme.css `.cv-card__img` transition), `.cv-row__all` underline
  (theme.css:1143-1144), `cv-icon animate` in the editor empty state (:70).
- Quick pick dialog GSAP (cv-quick-pick.js), add fires `cv:cart`.
- No section JS of its own; no GSAP; cv-motion part ignores editor events (row re-rendered in the editor
  stays hidden).

## Motion opportunities

Owned file to add: `assets/cv-collection-row-motion.js`, gated by a new literal attribute `data-cvrow`
printed on the section root (add one `content_for_layout contains 'data-cvrow'` line to the layout: a
coordinated layout edit) or printed by the section itself. Boot on load and `shopify:section:load`. The
home page has NO Flip and NO MotionPath (layout/theme.liquid:173-177): use plain tweens.

1. **HIGH: one engine, shelf-stocking deal.** Remove `data-motion-dev` and the per-card reveal for this
   row; `ScrollTrigger.batch` deals the cards (y 28 to 0, rotation 1.5 to 0, `back.out(1.4)`, stagger
   0.07), then each photo settles from scale 1.05. On the mobile snap rail, deal only the visible cards and
   leave the rest at rest (the cv-showcase-motion.js rail idea, :11-14 of that file). Reduced: none.
2. **HIGH: quick add feedback in the row.** On `cv:cart` after a pick opened from this row (remember the
   opener), stamp an "In your bag" ticket on that card (`back.out(2)`, 0.3 s) and hand off to the global
   fly-to-bag (cv-cart-drawer map, opportunity 3). The ticket text is true because it follows a real
   `/cart/add.js` success.
3. **MED: heading split with SplitText** instead of `data-cv-split` (keeps markup and aria,
   MOTION-SYSTEM.md 7.3): words rise with 0.04 s stagger when the row enters.
4. **MED: rail affordance on mobile.** A thin candy-stripe progress rule under the rail scrubbed by the
   rail's scrollLeft; first-view peek nudge (x -12 then back, once). Reduced: static rule.
5. **LOW: "View all" arrow nudge** on hover/focus (4 px, `power2.out`).

## Risks

- cv-card.liquid is shared by cv-search and cv-orbit; card markup changes need all three lanes.
- Removing `data-motion-dev` here leaves cv-guarantee as the only Motion user on the home page; fine, the
  gate still loads it for that section.
- index.json is shared by 21 sections: edit only the two instances' settings, and only after merchant
  confirmation for copy (PRODUCT.md:33, :41 rule: no store-content change without confirmation).
- Whether collections `frontpage` and `iphone` exist and are populated is store data (STORE-FACTS.md 9.4);
  the row hides itself for shoppers when empty (:25).
