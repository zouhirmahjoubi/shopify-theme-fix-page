# cv-pdp-showcase ("Product: showcase")

## Status

Live.
- `templates/product.json:851`: key `showcase`, 16th of 22 (after `facebook_testimonials`, before `details`).
- `templates/product.convert.json:384`: key `showcase`, 15th of 17 (after `ratings_reviews`, before `details`).
- Both save `collection: "frontpage"` (`templates/product.json:853`, `templates/product.convert.json:386`) and `link_label: ""`, so the "See every case" link is not rendered.
- Behaviour comes from `assets/cv-pdp-story.js` (dedupe and spares). Motion comes from `assets/cv-pdp-home-motion.js`. Both are loaded on every product template (`layout/theme.liquid:306`, `:322`).

## Purpose

This is the cross-sell, "Three more from the counter": up to three real products from a chosen collection, shown as tall candy-box cards in cream, teal and cocoa. It also renders up to three hidden spares. The page's own product is skipped (`sections/cv-pdp-showcase.liquid:29`).
- Every figure comes from the product: photo, price ("From" when it varies), compare-at, phone-model count, style count, and a star rating only when a review app has written `reviews.rating`.
- `cv-pdp-story.js` hides products already shown higher on the page ("Complete the set", shelf) and brings spares in (`assets/cv-pdp-story.js:199-234`).
- Cards link to the product page. There is no add to cart.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-showcase.liquid` (120 lines)
- In shared CSS files, the selector blocks `.cvw-showcase*` and `.cvw-card*` (`assets/cv-pdp-home.css:407-452`, `:663`, `:673`, `:714`) are used only by this section's markup.

Shared (coordinate before editing):
- `assets/cv-pdp-story.css` (18 sections).
- `assets/cv-pdp-extras.css` (`.cv-stars`, also used by cv-pdp-reviews, cv-pdp-set and cv-product-counter, and referenced by theme.css).
- `assets/cv-pdp-home.css` (12 sections; `.cvw-head`, `.cvw-link` and `.cvw-sr` are shared with other `cvw` sections).
- `assets/cv-pdp-home-motion.js`: showcase block `:362-391`, shared `onEnter` and `canHover` helpers.
- `assets/cv-pdp-story.js`: `showEachProductOnce()` `:191-234`, which also governs `[data-cvp-set-item]` and `[data-cvw-row-item]`.
- `snippets/cv-stars.liquid`: 21 users.
- `snippets/cv-icon.liquid`: `arrow-right`; 53 users.
- If the opportunities below are used: `snippets/cv-quick-pick.liquid`, `assets/cv-quick-pick.js` and `assets/cv-quick-pick.css`. The layout renders the dialog once per page, and loads the JS when the markup contains `data-cvqp-open` (`layout/theme.liquid:208-210`, `:295-297`).

## Store adaptation findings

1. **The card CTA "See the case" is wrong for non-case products (medium-low).**
   - The catalogue includes "Camera lens protective film" (STORE-FACTS.md:96-104), which can sit in `frontpage`.
   - Fix: use `cta_label` only when the product's `type` or title names a case, otherwise a neutral "See it". Or add a second setting `cta_label_other` and test `item.type contains 'ase'` / `item.title contains 'ase'`.
2. **The heading says "Three" even when fewer cards show.**
   - Where: "Three more from the counter" (`:111`, saved in both templates).
   - Problem: the collection may hold fewer than 4 products, and the JS dedupe can hide cards (`assets/cv-pdp-story.js:230`).
   - Fix: change the default to "More from the counter", or support a `[count]` token filled with `dealt | at_most: 3` and updated by `showEachProductOnce()`. The count also needs a JS update (shared file).
3. **The compare-at check is product-level.**
   - Where: `item.compare_at_price > item.price` (`:59`, `:85`) compares the cheapest compare-at against the cheapest price, which can be different variants.
   - Fix: use `item.compare_at_price_min > item.price_min`, and show `<s>` only when `item.selected_or_first_available_variant.compare_at_price > item.selected_or_first_available_variant.price`. Low priority.
4. **The buy box fallback compare-at is not mirrored.**
   - The merchant-set $59.99 fallback was-price appears in the buy box (PRODUCT.md:103), but not on these cards.
   - This is honest, because cards show only real Shopify compare-at. Most cases have a real compare-at of $59.99 anyway (STORE-FACTS.md:100-101). No change. Note it so nobody "fixes" it by inventing a was-price.
5. **The screen-reader rating text is incomplete.**
   - Where: it reads "4.8 out of 5 stars,(12)" (`:72`).
   - Fix: `({{ i_count }} <span class="cvw-sr">reviews</span>)` with a space before the parenthesis.
6. **Hardcoded English strings.** "From" (`:84`), "phone"/"phones" (`:78`), "styles" (`:79`), "out of … stars" (`:72`). Low priority. Move them to settings.
7. **The style count is mislabelled for colour options.** `styles` counts any non-model option with 2 or more values and labels it "styles" (`:48-49`, `:79`), even when the option is "Color". Acceptable (DESIGN.md uses style or colour interchangeably). Optionally use the option name: `{{ styles }} {{ option.name | downcase }}s`.
8. Clean:
   - No hardcoded prices: `money` respects the shop currency.
   - No invented ratings. They render only when `reviews.rating` exists and `rating_count > 0` (`:53-54`, `:68`). Per PRODUCT.md:105 there is no review app yet, so stars do not render today.
   - Image alt falls back to the title (`:64`), which is right because product images have no alt text (PRODUCT.md:32).
   - "Peppermint candy" and "sweet" in some titles are case print designs (STORE-FACTS.md:107-108), not food.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Price, "From" price, struck compare-at | `item.price_min`, `item.compare_at_price` (`:84-85`) | Backed (store data). |
| "On sale" badge | Shown only when compare-at > price (`:59-61`) | Backed (store data). |
| "N phones", "N styles" | `options_with_values` (`:41-51`, `:76-81`) | Backed (store data). |
| Star rating and "(count)" | `reviews.rating` / `reviews.rating_count` metafields (`:53-54`, `:68-74`) | Backed when present. None exist yet (PRODUCT.md:105), so hidden. |
| Lede "Real cases from the shop, each cut for its own list of phones." | `:112` | Backed qualitatively (real catalogue, model option per product). |

## Motion inventory

- `data-cv-*` attributes: none. It uses `data-cvw-showcase`, `data-cvw-card` and `data-cvw-spare`.
- `assets/cv-pdp-home-motion.js:362-391`:
  - All cards are set to `opacity 0` at boot.
  - At `top 72%`, the visible cards are dealt from one stack: on wide screens each card starts at the middle card's x, with rotations -10/3/12, `y: 90`, then `expo.out` over 1.1 s, stagger 0.14, `clearProps: transform`.
  - Hidden spares are set to `opacity 1`, so a later swap-in shows them as they are.
  - On hover-capable wide screens, `quickTo` tilts each card link toward the pointer (rotationX/Y, perspective 900).
- CSS: image `scale 1.06` on hover (`assets/cv-pdp-home.css:433`). Under reduced motion the transition is removed (`:714`), but the scale still applies instantly.
- Reduced motion: the file returns early, so the cards are static.
- No-JS: cards visible, spares hidden (`hidden` attribute), and no dedupe against "Complete the set".
- Theme editor: no `shopify:` handling. After an editor re-render the new cards are visible, with no motion.
- Leak: the tilt `pointermove` listeners (`:383-388`) are not removed when `gsap.matchMedia` reverts, so crossing 990px back and forth stacks listeners. Low impact.

## Motion opportunities

1. **High: "Choose phone & add" on each card through the existing quick pick.**
   - Under the price row, add `<button type="button" class="cvw-card__pick" data-cvqp-open data-handle="{{ item.handle }}" data-url="{{ item.url }}"{% unless item.available %} disabled{% endunless %}>` with a label setting (default "Choose phone & add").
   - Reuse the pattern from `snippets/cv-card.liquid:79` and `snippets/cv-showcase-card.liquid:337`. The layout then renders the dialog and loads `cv-quick-pick.js` automatically (`layout/theme.liquid:208-210`, `:295-297`). The quick pick asks for colour and phone and never adds a guessed model (PRODUCT.md:40; Product Principle 2). It then fires `cv:cart`, which re-renders the drawer (MOTION-SYSTEM.md 5.7).
   - Structural constraint: the whole card is one `<a>` (`:57`), and a button cannot nest inside it. Restructure to an `<article>` holding the link (media, title) and a sibling button, and keep the tilt on the article.
2. **Medium: a fly-to-bag token from the card after a quick-pick add.** Listen for `cv:cart` after a pick that came from a showcase card, and fly a small photo ticket from the card's image to the header bag (`#bagBtn`). This reuses the counter's token idea (`assets/cv-pdp-counter-motion.js:275-331`). Do not double-bump the badge; `cv-header.js` already bounces it (MOTION-SYSTEM.md section 7, item 6).
3. **Medium: Flip when a spare swaps in.** When `showEachProductOnce()` hides a duplicate and unhides a spare (`cvp:set` event, `assets/cv-pdp-story.js:234`), capture `Flip.getState(cards)` before the change and `Flip.from()` after. Flip is loaded on product pages (`layout/theme.liquid:173-177`). This needs a hook in the shared story JS, for example a `cvp:showcase-change` event.
4. **Low: lid lift on hover.** Translate `.cvw-card__lid` up 4px with a slight rotation on card hover (CSS only, removed under reduced motion), like a candy-box lid lifting.
5. **Low: price stamp on deal.** After the deal lands, scale the price `1.15 -> 1` with `cvwDrop`, staggered with the cards.

## Risks

- **Ownership:** all motion and almost all CSS live in shared files (`cv-pdp-home-motion.js`, `cv-pdp-home.css`, `cv-pdp-story.js`). Only the section Liquid is truly owned. Restricting edits to the showcase selector blocks keeps parallel work safe, but changes to the shared helpers (`onEnter`, `magnet`, `canHover`) need coordination.
- **Card structure:** changing the card from `<a>` to an article plus link breaks `productPath(item.querySelector('a[href]'))` only if the first link no longer points at `/products/` (`assets/cv-pdp-story.js:191-196`). Keep the product link first.
- **Quick pick:** the quick pick dialog closes itself after 1500ms and does not open the drawer (MOTION-SYSTEM.md 5.7). A new "open drawer after add" behaviour would change it on every page that uses quick pick, so coordinate.
- **Collection data:** the contents of `frontpage` are store data. Verify they are active phone-case products (STORE-FACTS.md:386, open question 4).
