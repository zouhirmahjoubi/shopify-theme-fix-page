# cv-pdp-compare ("Product: pack comparison")

## Status

Live on ONE template only:
- `templates/product.convert.json`, key `compare`, 11th in `order` (after `before_after`, before `journey`).
- NOT in `templates/product.json` (default).
- Live instance: settings equal the schema defaults; blocks `p-1` (qty 1, 0%, "1 case", jar small), `p-2` (qty 2, 18%, "2 cases", flag "Save 18%", jar medium, highlighted), `p-3` (qty 3, 31%, "3 cases", flag "Best value", jar large). No `fact` blocks.

## Purpose

Compares the choices on this page, 1, 2 or 3 cases, each shown as the product's photo dropped into a KIE glass candy jar (`sections/cv-pdp-compare.liquid:1-10`). Rows: price per case, total, saving, then optional "included in every pack" rows. Desktop shows a table (`:28-127`); phones get stacked cards (`:128-173`, CSS `cv-pdp-home.css:244`, `:688-689`). "Choose [name]" picks that pack in the buy box via `cvs:pack` and scrolls back (`cv-pdp-story.js:399-404`, `cv-product.js:536-540`).

## Files (owned / shared)

Owned:
- `sections/cv-pdp-compare.liquid`
- `assets/pdp-home-jar-small.webp`, `assets/pdp-home-jar-medium.webp`, `assets/pdp-home-jar-large.webp` (built as `'pdp-home-jar-' | append: b.settings.jar` at `:59`, `:157`) and their sidecars `assets/pdp-home-jar-*.webp.json`.

Shared:
- `assets/cv-pdp-story.css` (18 sections).
- `assets/cv-pdp-home.css`: compare rules `:191-265`, phone cards `:688-690`, reduced motion `:714`.
- `assets/cv-pdp-home-motion.js`: compare `:216-231`, `[data-cvw-split]` headings `:132-141`, guard `:42`.
- `assets/cv-pdp-story.js:399-404`: `[data-cvw-pack]` to `cvs:pack` bridge, then `backToSlip()` `:25-30`. The same bridge is noted as reusable by cv-pdp-ribbon.
- `assets/cv-product.js:536-540`: the buy box's `cvs:pack` handler (shared commerce owner).
- `snippets/cv-icon.liquid` (`check`).

## Store adaptation findings

1. **HIGH: the table never follows the shopper's choice (Principle 3: the price on the page is the price at checkout).**
   - Every figure is computed once from `product.selected_or_first_available_variant.price` (`:15`, `:70-75`, `:81-87`, `:92-97`, `:131-135`).
   - The footnote (`:193`, live) says "Prices for the phone and style chosen above." After the shopper changes style or model to a variant with another price, the table is wrong and the footnote is false.
   - The percentages are typed per column (`:202`; live 0 / 18 / 31), duplicating the buy box tiers (`templates/product.convert.json` main `tier-1..3`) and the live automatic discounts (PRODUCT.md:39).
   - Fix (owned): add hooks to each figure cell and card line, for example `data-cvw-each="<qty>"`, `data-cvw-total="<qty>"`, `data-cvw-save="<qty>"`, plus `data-cvw-pct="{{ b.settings.pct }}"` on each column. New owned script `assets/cv-pdp-compare.js` (tagged from the section, `defer`):
     - On `cvs:change` (`assets/cv-product.js:415`), recompute with `detail.variant.price` and, per column, the discount from the matching buy box tier `[data-cv-pack][data-cv-qty="<qty>"]` `data-cv-discount` (`sections/cv-product-counter.liquid:584-588`); fall back to the column's own `pct` when no tier matches.
     - Use the same rounding as the buy box: `subtotal - Math.round(subtotal * pct / 100)` (`assets/cv-product.js:117`), then divide by qty.
     - Format with `window.themeMoneyFormat` (`layout/theme.liquid:155`); cv-product.js's formatter is private (`:41`), so carry a small copy.
2. **MEDIUM: wrong colour in the jars.** The case photos use `product.featured_image` (`:17`, `:55`, `:153`), not the chosen variant's photo. A shopper who picked "Transparent" sees the featured colour in every jar.
   - Fix (owned): `assign thumb = cvar.featured_image | default: product.featured_image`; in the owned script, swap `src` on `cvs:change` from `detail.variant.featured_image.src`.
3. **MEDIUM: lede describes the wrong thing.** "Same case, same phone. Only the number of jars on the counter changes." (`:186`, live). Each column has one jar; the number of cases inside it changes. As written it also points at jars as the thing being bought.
   - Fix: "Same case, same phone. Only the number of cases in the jar changes." Update the schema default; the live template value is a template edit (shared, merchant-visible).
4. **LOW: "Choose" does nothing without JS.** The buttons are `type="button"` (`:119`, `:168`).
   - Fix (owned): render them as `<a class="cvw-compare__choose" href="#cvPdp" data-cvw-pack="...">` (`#cvPdp` is the buy box root, `sections/cv-product-counter.liquid:208`); the JS path keeps working, and the shared bridge should `preventDefault` (shared change, optional; without it the anchor jump and the smooth scroll overlap but both land on the buy box).
5. **LOW: a column the buy box does not offer.** A pack column with qty 4 dispatches `cvs:pack` that matches no tier (`cv-product.js:537-539`); the button scrolls but picks nothing. Fix (owned script): hide or disable "Choose" for a column with no matching `[data-cv-pack][data-cv-qty]`.
6. **LOW: "Best value" is a hand-typed comparative.** True only while column 3 has the highest percentage. Optional: if `flag` is blank, auto-flag the highest-`pct` column with a merchant label setting.
7. **LOW: dead hook.** `data-cvw-jar-fill` (`:52`) is not read by any script (grep of `assets/` finds no match). Reuse it in the new script or drop it.
8. **Clean:** no other brand, no placeholder, currency through the `money` filter, no em or en dashes in markup or schema. Candy jars are the shop display; the photos inside them are the real case.

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "Save 18%" ribbon (2 cases) | live `p-2.flag`, preset `:223` | Live automatic discount 18%, min qty 2 (PRODUCT.md:39) | Backed |
| "Best value" ribbon (3 cases) | live `p-3.flag`, preset `:224` | Highest percentage in the table (31%) | Backed by the settings; drift risk |
| Price per case / You pay / You save | `:76`, `:87`, `:99`, `:163-165` | Variant price × column `pct` | Backed for the first variant only; stale after a variant change (finding 1) |
| "Pack discounts are applied automatically at checkout." | footnote `:193` | PRODUCT.md:33, :39 | Backed |
| "Prices for the phone and style chosen above." | footnote `:193` | Static render | Unbacked once the shopper changes variant (finding 1) |
| "Included" rows (fact blocks) | `:103-114` | Merchant text; schema info "Only facts true for every order." (`:214`) | None placed live |

## Motion inventory

- `data-cv-*` attributes: none.
- pdp-home hooks: `data-cvw-compare` (`:21`), `data-cvw-split` (`:24`), `data-cvw-pack-col` (`:49`, `:148`), `data-cvw-jar-fill` (`:52`, unused), `data-cvw-pack` (`:119`, `:168`, behaviour, not motion). Class hooks: `.cvw-pack__case`, `.cvw-pack__flag`, `.cvw-pack__glass`.
- `assets/cv-pdp-home-motion.js:216-231`: cases start `y: -240`, hidden, random rotation; at `top 70%` they drop into each jar with `cvwDrop` (CustomBounce) or `back.out(2)`, stagger 0.2 per case and 0.3 per column; flags pop (`back.out(3)`); glass squashes (`elastic.out`).
- Heading SplitText candy drop (`:132-141`).
- GSAP plugins: ScrollTrigger, SplitText, CustomBounce (optional).
- Reduced motion: the script returns; CSS `cv-pdp-home.css:714` removes the Choose button transition. Static state complete.
- No-JS: complete static table and cards.
- Theme editor: no `shopify:section:load` handling; re-rendered markup is static (visible).
- The table and the phone cards are both in the DOM; the drop runs on both (one is `display: none`), harmless.

## Motion opportunities

1. **High: live repricing (owned `assets/cv-pdp-compare.js`).** On `cvs:change`, tween each figure from old to new (420 ms, `power2.out`, money-formatted on update), and re-stamp the "You save" chips (scale 1.15 to 1, 240 ms). Reduced motion: set the text directly.
2. **High: one selected pack across the page.** On `cvs:change` read `detail.qty` and move `is-highlight` to the matching column. Use Flip (loaded on product pages, `snippets/gsap.liquid:27-28`) so the red highlight frame slides between columns rather than jumping; on phones, the matching card lifts (y -6, shadow up, 240 ms). This keeps the comparison and the buy box saying the same thing.
3. **High: Choose → buy box hand-off.** On click: the column's jar does a short lift and settle (y -10 then 0, 240 ms, candy spring), then ScrollToPlugin glides to `#cvPdp` with a header offset. The buy box tier then animates through existing cv-pack-motion.js (lid pops, case drops: `assets/cv-pack-motion.js:1-12`). Reduced motion: instant jump and focus on the tier. The shared bridge (`cv-pdp-story.js:399-404`) already dispatches `cvs:pack`; the owned script only adds the lift before it (listen in capture phase, do not stop propagation).
4. **Medium: row reveal.** At `top 75%`, draw a pen rule under each figure row with DrawSVGPlugin (in the bundle), 420 ms, stagger 80 ms. Rows stay readable without it.
5. **Low: editor.** In the owned script handle `shopify:section:load/unload` for its listeners.

## Risks

- The entrance lives in the shared `cv-pdp-home-motion.js:216-231`; keep `.cvw-pack__case`, `.cvw-pack__flag`, `.cvw-pack__glass` and `data-cvw-pack-col` names stable.
- The `cvs:pack` bridge and `backToSlip()` are in shared `cv-pdp-story.js`; changing them affects cv-pdp-spotlight, cv-pdp-guarantee, cv-pdp-ugc and cv-pdp-ribbon.
- Three sources of pack percentages (this section, cv-pdp-spotlight, the buy box). The buy box tier attributes are the runtime source of truth.
- Only on `product.convert.json`.
