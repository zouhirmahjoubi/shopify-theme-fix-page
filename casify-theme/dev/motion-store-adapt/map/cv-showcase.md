# cv-showcase ("Showcase cards")

## Status

LIVE on one template: `templates/index.json:171-933`, key `showcase`, 7th in `order` (after `shop`, before `feature_tabs`). Not in other templates or header/footer groups.
Instance: `source: "products"`, `collection` blank (= `collections.all`), `limit` 50, 31 card blocks bound to real product handles (`block_order` at `templates/index.json:888-920`), heading "Every case on the counter", lede "[count] pieces, each cut for its own list of phones. Swipe through the lot.", CTA "Shop now", badges "Save [percent]%" / "New", link "See every case" (`:920-931`). Every block has `price`, `compare_price`, `rating_count`, `badge_text` blank (checked across `:171-933`).

## Purpose

Home "every case on the counter" rail: one card per product (blocks first, then the rest of the collection), each filled from the product (photo, title, price, compare-at, phone and colour counts, Sold out / New / Save badge, stars only from review-app metafields). More than three cards become a swipe rail with prev/next, progress thumb and "1-3 of N" counter (`sections/cv-showcase.liquid:96-111`). GSAP deals the visible cards onto the counter, opens the photo, stamps the badge and assembles the enamel CTA sign.

## Files (owned / shared)

Owned:
- `sections/cv-showcase.liquid`
- `assets/cv-showcase-motion.js` (393 lines; `layout/theme.liquid:230-233`, gate `data-cvsh`)

Shared:
- `snippets/cv-showcase-card.liquid` (395 lines): also rendered by `sections/cv-collection.liquid` (collection grid, with `pick: true`).
- `assets/cv-showcase.css` (326 lines): also printed by `sections/cv-collection.liquid`.
- `snippets/cv-card-copy.liquid` (77 lines): rendered only by `cv-showcase-card`, therefore reached from both sections.
- `snippets/cv-stars.liquid` (many review widgets), `snippets/cv-icon.liquid`.
- `assets/cv-motion.js` (`data-cv-reveal` `:75`, `data-cv-split` `:81`) and theme.css `.cv-sec`, `.cv-row__hd`, `.cv-row__all`, `.cv-eyebrow`, `.cv-sec__lede`, `.cv-empty`.
- Gate note: `cv-collection` prints `data-cvsh-card`, which contains `data-cvsh`, so `cv-showcase-motion.js` also loads on collection pages (`layout/theme.liquid:230`). Changes to the motion file must stay inert when `[data-cvsh]` (the section root) is absent.

## Store adaptation findings

1. **MEDIUM: en dash in the rail counter**, shopper-facing: Liquid `1&ndash;3 of {{ total }}` (`sections/cv-showcase.liquid:101`) and JS `first + '–' + last + ' of ' + total` (`assets/cv-showcase-motion.js:80`). Fix (both owned): "1-3 of 31" with a plain hyphen, or "Showing 1 to 3 of 31".
2. **MEDIUM: the home rail never adds to cart.** `cta_mode` stays `link` because the section does not pass `pick` (`:53`, `:64`); the snippet already supports `pick: true` (quick pick for multi-variant, direct add for single-variant, disabled when sold out; `snippets/cv-showcase-card.liquid:213-236`, `:335-347`). Fix (owned, one argument): pass `pick: section.settings.quick_add` from both render calls, with a new checkbox setting (default true) and keep "Shop now" as the label when off. Quick pick asks colour and phone (never guesses, PRODUCT.md:40); the dialog loads because `data-cvqp-open` lands in `content_for_layout`. Single-variant products (camera lens film) get a `data-cart-add-form` handled by cart.js (toast, count, drawer).
3. **MEDIUM: card-without-product fields allow typed prices and a typed review count.** Block settings `price`, `compare_price`, `rating_count` (`:548-563`) render as free text (`cv-showcase-card.liquid:294-302`, `:324-328`), and `rating_count` draws five full stars regardless of any rating. That is a fabricated rating path. Unused today (all blocks have products), but available to the merchant. Fix (owned schema; snippet is shared): remove `rating_count` from the block schema (the snippet then never reaches the branch), and add `info` "Use a product; typed prices are not checked against checkout" to `price` / `compare_price`, or remove them and drop the "Only the cards below" mode.
4. **MEDIUM: typed per-card copy can drift from the product.** 31 blocks carry merchant-typed one-liners and pills (`templates/index.json:171-933`), e.g. "cut for iPhone, Pixel and Galaxy" (peppermint dual-layer card, `:179`), "MagSafe compatible" pills (5 cards), "AR coating", "Tempered glass", "4-corner protection". STORE-FACTS.md 7d: acceptable only if the product's own data says so. The card also prints live "N models / N styles" facts (`cv-showcase-card.liquid:311-316`), so phone lists in the one-liner are redundant. Fix (instance, merchant-visible): drop phone brand lists from one-liners; verify MagSafe/magnetic pills against each product title (most titles say "magnetic", which is fine; "MagSafe compatible" is an Apple compatibility claim).
5. **LOW: lede "each cut for its own list of phones"** is accurate (each product has its own model option). Keep; `[count]` is the live card count (`:84`). Note the count includes the camera lens film, so "pieces" (not "cases") is correct; keep that word.
6. **LOW: hard-coded English**: `aria-label="Cases"` (`:97`), "Previous cases"/"Next cases" (`:103`, `:106`), editor empty state (`:120-121`); in the shared snippet "Sold out", "Add to bag", "Choose your phone", "From", "Regular price", "out of N stars" (`cv-showcase-card.liquid:136`, `:218-230`, `:291`, `:320-322`). Fix the section ones as settings; leave the snippet to its owner.
7. **LOW: "Candy cane" and "Gift" pill icons** (`:302-307`, `:387-393`) are used for the Christmas print cards ("Christmas print" pill). The pill names the print, not candy as a product; acceptable.
8. **Clean:** prices from the product (`item.price_min | money`, `cv-showcase-card.liquid:320`), save % computed (`:147-150`), stars only from `reviews.rating` metafields (`:205-206`, `:287-292`), New badge from `created_at` (`:140-146`), empty catalogue hidden from shoppers (`:116-124`).

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| Price, "From", compare-at | `cv-showcase-card.liquid:318-323` | Live product | Live |
| "Save N%" badge | `:147-150` | Live compare-at vs price | Live (product-level min prices; same caveat as cv-orbit finding 4) |
| "New" badge | `:140-146` | `created_at` within 30 days | Live |
| Stars + count | `:287-292` | `reviews.rating`, `reviews.rating_count` metafields | Live (empty until a review app writes) |
| "(N)" with five stars, card without product | `:294-302`, schema `:559-563` | merchant-typed, no rating | UNBACKED path (unused; remove) |
| Typed card price / compare-at | `:324-328`, schema `:548-557` | merchant-typed | MERCHANT-TYPED (unused; checkout mismatch risk) |
| "N models", "N styles/colors" | `:311-316` | `options_with_values` | Live |
| Per-card pills and one-liners (MagSafe compatible, Shockproof, AR coating, Tempered glass, "cut for iPhone, Pixel and Galaxy") | index.json blocks | merchant-typed product attributes | MERCHANT-TYPED; verify each against product data |
| "[count] pieces" | `:84` | live card count | Live |

## Motion inventory

- data-cv-* attributes: `data-cv-reveal` on the header (`:75`), `data-cv-split` on the h2 (`:81`). Snippet prints `data-cv-reveal` only when `reveal` is passed (not on home). Section hooks: `data-cvsh`, `-row`, `-bar`, `-thumb`, `-count`, `-prev`, `-next`, `-card`, `-media`, `-badge`, `-price`, `-cta`, `-cta-shine`, `-cta-mint`, `-cta-arrow`, `-stars`, `-fallback-icon`.
- **No-JS gap:** the header (eyebrow, heading, lede, "See every case") uses `data-cv-reveal`, which is `opacity: 0` without JS (MOTION-SYSTEM.md 3.4 item 1). Cards are visible without JS.
- JS `cv-showcase-motion.js`: rail controller without GSAP and under reduced motion (`:32-120`); deal timeline (`fromTo` y 26, fanned x/rotation, `power4.out` 0.72s, stagger 0.09) once at `top 84%` (`:174-200`); only cards in view are dealt (`:130-134`); then media open, badge stamp, CTA sign assembly; pointer depth on fine pointers.
- Reduced motion: live `change` listener re-inits (`:136`, `:166-171`) and returns before any tween (`:173`); CSS blocks at `cv-showcase.css:173-176`, `:274`.
- Theme editor: `shopify:section:load` / `unload` / `section:select` / `block:select` (`:379-393`); `_cvshFinish` jumps to the end state on select.
- GSAP plugins: core + ScrollTrigger (optional, guarded).

## Motion opportunities

1. **HIGH (commerce): quick add on the home rail** (finding 2) plus feedback motion in the owned JS: listen for `cv:cart` (quick pick, `cv-quick-pick.js:58`) and for `submit` on `[data-cart-add-form]` inside `[data-cvsh]`; press squash on the CTA sign (scaleX 1.04 / scaleY 0.9, 0.12s yoyo), the peppermint `data-cvsh-cta-mint` spins one turn (`power2.out` 0.42s), the badge re-stamps teal "In your bag" for 1.6s, and a straight-line photo token flies to `#bagBtn` (no MotionPath on the home page). cart.js already opens the drawer for card forms; quick pick does not, so call `window.Casify.openDrawer(btn)` inside the `cv:cart` handler only for adds that started in this rail. Reduced motion: text state only.
2. **MEDIUM: header readable without JS.** Replace `data-cv-reveal`/`data-cv-split` with a section-owned SplitText reveal (aria-label pattern from `cv-spotlight-motion.js:15-31`) behind a `cvsh-pending` class + 1400 ms timeout, so no-JS shows the heading.
3. **MEDIUM: rail scroll choreography.** Scrub-linked parallax on card media (`yPercent` ±4 tied to the rail's horizontal scroll via a `scroll` listener on the row throttled to rAF, or a ScrollTrigger with `horizontal: true, scroller: row`), and deal newly revealed cards when the rail advances (they "wait at rest" today, `:11-12` header comment).
4. **LOW: pack hint on cards.** A small live line "2 for 18% off, 3 for 31% off" under the price (setting, must equal the automatic discounts, PRODUCT.md:39), animating in after the CTA. Only if the merchant wants packs pushed on home.

## Risks

- `snippets/cv-showcase-card.liquid` and `assets/cv-showcase.css` are shared with `cv-collection`; any change there changes every collection page. Do everything possible through render arguments and the owned motion file.
- `cv-showcase-motion.js` also runs on collection pages (substring gate); new handlers must be scoped to `[data-cvsh]` roots.
- 31 blocks + `limit` 50 means up to 50 cards with images (lazy) and per-card SVG defs; avoid per-card ScrollTriggers (one trigger per row).
- Quick add on home changes the shopping flow: confirm with the merchant (it matches the existing collection-page behaviour).
