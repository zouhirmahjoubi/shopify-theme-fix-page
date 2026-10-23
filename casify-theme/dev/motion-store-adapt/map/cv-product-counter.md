# cv-product-counter ("Product: shop counter", "The Shop Counter")

Family: buybox-counter. Mapped read-only on 2026-10-22. All paths are relative to the theme root.

## Status

**Live.** It is the `main` section of both product templates:

- `templates/product.json:4`: the default product template, with blocks summary, 3 tiers, 3 services, google-rating, two sales notes, video-reviews and video-review-1.
- `templates/product.convert.json:4`: explicitly assigned as `convert`, with 3 tiers, 3 services, an empty google-rating and one sales note.

It is not in any `sections/*-group.json`. Its schema has `enabled_on: product` (`sections/cv-product-counter.liquid:1069`).

The two templates carry different live settings. That matters for the claims, because the same code ships different shopper copy on each:

| Setting | product.json | product.convert.json |
|---|---|---|
| `show_rating` | false (`:159`) | true (`:10`) |
| `compare_price_fallback` | "" (`:157`) | "59.99" (`:9`) |
| `show_price_tag` | false | default true |
| `show_photo_price` | true | default false |
| `show_awning` | true | default false |
| Google rating | 4.8 / "1,000+" (`:170-171`) | 4.9 / 952 (`:15-16`) |
| Trustpilot rating | 4.9 / 952 (`:173-174`) | not set |

## Purpose

This is the whole product buy box, drawn as a 1920s candy-shop counter. The product is a phone case.

- **Left column:** the real product photos sit on a "marble stage". Photo tickets run along a red and cream candy-cane SVG reel, capped by two decorative wrapped-sweet set pieces. The column also has an optional 3D model ticket, an optional three.js awning and a 3D price tag over the photo, a tap-to-zoom dialog, and inline customer video reviews.
- **Right column (`<form id="cvAddForm">`):**
  - vendor ticket, brass hanging price tag with a "% off" seal, title, and the "Rating, price & pitch" summary block
  - "You save" line, service promise stamps, rating row, Google and Trustpilot store-rating tickets, low-stock line, and sales notes (pill and rocket)
  - style swatches, the Protection meter block, and the phone-model `<select>`
  - candy-box pack tiers (1, 2 or 3 cases at 0%, 18% and 31%), the savings meter, and mix-and-match pack slots
  - Add to bag with a live total, Buy now, the Google rating strip, the ship-by date, the Case features card, and the Details and Shipping accordions
- **Outside the grid:** a mobile and desktop sticky bar (Add to bag and Buy now) and Product JSON-LD.

Commerce runs in `assets/cv-product.js`. The options resolve a real variant id, and a pack sets the quantity and applies the tier percentage the same way the store's automatic discounts do (`PRODUCT.md:39`). The JS posts every case to `/cart/add.js`, then sends `cart:refresh`, which makes `assets/cart.js:169` re-fetch `?sections=cv-cart-drawer`. Buy now posts the same items and redirects to `/checkout`.

## Files (owned / shared)

Ownership was checked by grepping `sections/ snippets/ layout/ templates/ blocks/`. A reference that appears only in a comment was not counted as usage.

### Owned (only this section uses them; safe to edit in a parallel lane)

| File | Role | Evidence |
|---|---|---|
| `sections/cv-product-counter.liquid` | the section (1071 lines) | |
| `snippets/cv-counter-blocks.liquid` | block dispatcher for summary, google_rating, sales_note and spec_meter | rendered only at `cv-product-counter.liquid:394,464,541,643` |
| `snippets/cv-awning.liquid` | main-photo awning markup | `:330` only |
| `snippets/cv-photo-price.liquid` | 3D price tag on the photo | `:331` only |
| `snippets/cv-product-summary.liquid` | "Rating, price & pitch" block | only via cv-counter-blocks |
| `snippets/cv-google-rating.liquid` | Google strip under the buttons | only via cv-counter-blocks |
| `snippets/cv-spec-meter.liquid` | Protection meter block | only via cv-counter-blocks |
| `snippets/cv-case-features.liquid` and `snippets/cv-case-feature-icon.liquid` | Case features card | `:654` only |
| `snippets/cv-product-accordions.liquid` | Details and Shipping accordions | `:656` only |
| `snippets/cv-product-schema.liquid` | Product JSON-LD | `:734` only |
| `assets/cv-pdp-counter.js` | ship-by date and zoom dialog; no-ops without `[data-cv-pdp="counter"]` | layout `:308`; counter markup only |
| `assets/cv-pdp-sales.js` | sales-note number roll-up, three.js flame and rocket | layout `:310-313`, gated on `data-cvc-sales`, which only this section emits |
| `assets/cv-pdp-promises.js` | promise stamps, three.js van, return loop and box | layout `:314-317`, gated on `data-cvc-promises` |
| `assets/cv-case-features.js`, `assets/cv-case-features.css` | features card motion and styles | layout `:318-321` (`data-cvcf`); css at `snippets/cv-case-features.liquid:68` |
| `assets/cv-awning.js` | three.js canopy plus GSAP | layout `:287-290` (`data-cv-awning`) |
| `assets/cv-price-tag.js` | three.js price card plus GSAP | layout `:291-294` (`data-cv-ptag`) |
| `assets/cv-spec-meter.css`, `assets/cv-spec-meter.js` | meter styles and motion | `snippets/cv-spec-meter.liquid:40,108` |
| `assets/cv-google-rating.css` | Google strip styles | `snippets/cv-google-rating.liquid:19` |
| `assets/cv-pdp-model.css`, `assets/cv-pdp-model.js` | 3D model ticket | `cv-product-counter.liquid:38,353` |
| `assets/pdp-counter-box.webp` (red candy-box plate), `assets/pdp-counter-tag.webp` (brass tag plate) | images | `:215,377` |

### Shared (do NOT edit from this lane without coordinating)

| File | Also used by | Note |
|---|---|---|
| `assets/cv-pdp-counter.css` | `sections/cv-sales-note.liquid:15`, which is **live on `templates/page.json`** and uses `.cvc__pill` and `.cvc__sold`. It is also documented as the stylesheet for `.cvrb` in `snippets/cv-store-ratings.liquid:8` | Mostly counter CSS, but pill, sold and rating-badge rules affect the page template. It also holds the `.cvc-pending` start-state rules (`:783-786`) and the reduced-motion blocks (`:396`, `:671`, `:804`). |
| `assets/cv-pdp-counter-motion.js` | Also animates `sections/cv-pdp-set.liquid` (complete-the-set; live on both product templates) through `cvp:set` and `cvp:setadded` (`:376-403`). The token fly-to-bag is reused for set items. | It returns early without the counter root, without GSAP, or under reduced motion (`:41`), so cv-pdp-set motion depends on this file. |
| `assets/cv-product.js` | `sections/cv-product.liquid` (Order Slip, orphan) and `snippets/cv-pack-slots.liquid` | Owns money, variants, packs, cart, sticky bar and the `cvs:*` event contract. Those events are consumed by `cv-pdp-counter-motion.js`, `cv-pack-motion.js`, `cv-pdp-carousel.js` and `cv-pdp-video-reviews.js`. |
| `snippets/cv-pack-slots.liquid`, `assets/cv-pack-slots.css`, `assets/cv-pack-motion.js` | `sections/cv-product.liquid` (orphan) | mix-and-match slots |
| `snippets/cv-sales-note.liquid` | `sections/cv-sales-note.liquid` (live on page.json) | |
| `snippets/cv-store-ratings.liquid` | this section `:453` and `snippets/cv-product-summary.liquid:151` | Counter-only in practice. It is listed as shared only because two renderers call it; both belong to this section. |
| `snippets/cv-video-reviews.liquid`, `assets/cv-pdp-video-reviews.css`, `assets/cv-pdp-video-reviews.js` | `sections/cv-pdp-video-reviews.liquid`, `sections/cv-page-video-reviews.liquid` (page) | |
| `snippets/cv-stars.liquid` | about 20 sections, snippets and blocks | |
| `assets/cv-pdp-extras.css` | `cv-pdp-reviews`, `cv-pdp-set`, `cv-pdp-showcase` | |
| `assets/pdp-counter-box-teal.webp` | `sections/cv-home-conversion.liquid` (orphan) | |
| `assets/hero-sweet-wrapped-red.webp`, `assets/hero-sweet-wrapped-teal.webp` | cv-home-conversion, cv-orbit, cv-pdp-closer, cv-pdp-guarantee, cv-spec-meter | brand set pieces |
| `layout/theme.liquid:163-184` (GSAP flags), `:302-321` (product-template script block) | every template | Script order matters: cv-product.js, then cv-pack-motion, then cv-pdp-counter, then cv-pdp-counter-motion, then sales, promises and features modules. |
| `snippets/gsap.liquid` | global | On product templates it loads core GSAP, CustomEase, CustomBounce, CustomWiggle, DrawSVG, Flip, MotionPath, ScrollTrigger, ScrollTo and SplitText. ScrambleText and Text load only when `data-cvsu` (the signup banner) is on the page: it is on product.json, but **not on product.convert.json**. |
| `assets/cart.js` | global cart drawer | Listens for `cart:refresh` and exposes `window.Casify.openDrawer`. |
| `locales/en.default.json` (`products.*` keys) | global | |

## Store adaptation findings

Severity: **H** = shopper-facing and wrong today on a live template. **M** = would ship wrong copy once placed or enabled, or a live inconsistency. **L** = polish.

1. **H: an invented customer count with five full stars on the convert template.**
   - **Where:** `sections/cv-product-counter.liquid:441`. Schema default "+1000 Happy Customer" at `:768`; live value at `templates/product.convert.json:12` (and `templates/product.json:167`, hidden there because `show_rating` is false).
   - **What happens:** `star_pct` defaults to 100 (`:144`) and is lowered only when the product has review metafields. A product with no reviews therefore renders five filled stars next to "+1000 Happy Customer · Write the first".
   - **Why it is wrong:**
     - It is an unbacked customer count. The Evidence on Hand (`PRODUCT.md:102`) only covers 4.9 from 952 store reviews.
     - The five stars present a rating the product does not have.
     - It contradicts the section's own contract (`:16-19`, "Until they exist the row reads No reviews yet").
     - "Customer" should be plural.
   - **Fix:**
     - Set `star_pct = 0` when `has_rating` is false.
     - Change the schema default of `empty_rating_text` to "No reviews yet" and `empty_rating_link` to "Write the first review".
     - Clear the live `empty_rating_text` in both templates. This is a template edit, so it needs the merchant's confirmation.
     - Optionally hide the stars entirely in the empty state.

2. **H: the store rating is presented as the product's own rating under the title (default template).**
   - **Where:** `snippets/cv-product-summary.liquid:66-73,115-121`, with `rating_source: "auto"` at `templates/product.json:9`.
   - **What happens:** with no product reviews, the visible row reads "★★★★★ 4.8 (1,000+ reviews)" under the product title. Only the screen-reader label says Google.
   - **Why it is wrong:** `PRODUCT.md` (2026-09-18 entry) requires external proof to be "visually and semantically labelled as a store rating". The section header at `:18-19` also says it "never feeds product review data".
   - **Fix:** either change the summary's `rating_source` schema default to `"product"`, or, when `rating_is_store` is true, render a visible "Google" or "Store rating" label and logo in the summary row. Also correct the numbers (finding 3).

3. **H: store-rating numbers conflict with the Evidence on Hand, and the default template shows two different Google ratings.**
   - **What the evidence says:** 4.9 out of 5 from **952 reviews on Trustpilot and Google combined** (`PRODUCT.md:102`).
   - **Default template (`templates/product.json`):**
     - The store-ratings strip (`snippets/cv-store-ratings.liquid`) shows Google **4.8** with "1,000+" (`:170-171`) and Trustpilot 4.9 with 952 (`:173-174`). The 952 is attributed to Trustpilot alone.
     - The google-rating block under the buttons (`snippets/cv-google-rating.liquid`) shows Google **4.9** with "+1000" (`:76-77`).
     - So the same page shows Google at both 4.8 and 4.9.
   - **Convert template:** labels the combined 4.9 from 952 as **Google** only (`templates/product.convert.json:15-16`).
   - **Fix:** ask the merchant for the per-platform numbers, or show one combined "Store rating 4.9 from 952 reviews (Google and Trustpilot)" ticket. Make the google_rating block read the section's `external_review_rating` and `external_review_count` instead of its own copies, so the values cannot drift apart. These are template values, so the merchant must confirm.

4. **H: a placeholder customer review is live on every product (default template).**
   - **Where:** `templates/product.json:128-130`: "Daniel K.", 5 stars, "Fits perfectly", plus an invented body. It is rendered by `snippets/cv-video-reviews.liquid` (shared), and the default heading "Filmed by the people who bought it" (`cv-product-counter.liquid:1018`) frames the clip as a buyer review.
   - **Background:** `PRODUCT.md:76` records that the merchant asked for "random" details. It is still an invented reviewer, rating and quote, which the hard rules forbid.
   - **Fix:** blank `name` (it falls back to "Customer"), `title` and `body`; remove the per-clip stars or confirm a real rating; and change the heading default to neutral copy such as "Case clips". This needs merchant confirmation.

5. **M: sales-count fallbacks show one store-wide number on every product.**
   - **Where:** `templates/product.json:91` (Number 100, "[count]+ sold this week") and `:98` (Number 1485, rounded to "1480+ cases sold so far"). The logic is `snippets/cv-sales-note.liquid:21-23`.
   - **What happens:** the merchant-typed number applies to every product without its own `custom.sold_recently` or `custom.total_sold` metafield. This breaks Product Principle 1 (`PRODUCT.md:109`, "every number on a product page is true for the product it sits on").
   - **Status:** merchant-set (`PRODUCT.md:76`), so technically setting-backed. It is not in the Evidence on Hand, and the "this week" figure is not time-bound to any data.
   - **Fix:** add a block setting "Use the typed number only on the products listed" (product_list), or a "store-wide" wording mode ("1480+ cases sold in our shop"). Never pair the "this week" text with a static number.

6. **M: unbacked performance defaults in the Protection meter (not placed today; would ship on placement).**
   - **Where:** `sections/cv-product-counter.liquid:1000`: `impact_value` defaults to "8.2ft | 2.5m", with `impact_level` 3 and `thickness_level` 2 (`:1001,1007`).
   - **Why it is wrong:** a drop height is a performance claim that is not in the evidence (`PRODUCT.md:104` lists unverified drop claims). The info text says to keep numbers true, but the default ships the number.
   - **Fix:** empty the `impact_value` default, set `impact_level` and `thickness_level` to 0, and make `cv-spec-meter.liquid` render nothing unless the product metafields (`custom.drop_height`, `custom.impact_level`) or a filled product_list exist.

7. **M: unbacked default for the Case feature block.**
   - **Where:** `:867`: the label "Shock-absorbing drop protection" combined with empty `keywords` (`:868`) means "show on every product".
   - **Fix:** default `label` to "" and render nothing when the label is blank, or default `keywords` to "tough, shockproof" so that the tile appears only on products that name the property.

8. **M: the fallback compare-at price is a hardcoded amount in shop currency.**
   - **Where:** `:112,746`: schema default "59.99", `times: 100`, compared with `cvar.price` (`:114`). JS receives it as `data-compare-at-fallback` (`:214`).
   - **Problems:**
     - Under Shopify Markets, `cvar.price` is in the presentment currency while 5999 is treated as the same currency without conversion, so it is wrong outside USD.
     - It is a store-wide reference price on every product priced below $59.99, which is a fake-reference-price risk.
     - It contradicts `snippets/cv-product-summary.liquid:77-80`, which forbids fallbacks for the struck price.
   - **Status:** the value is in the Evidence on Hand (`PRODUCT.md:103`) and live only on the convert template (`product.convert.json:9`).
   - **Fix:** change the schema default to "", and apply the fallback only when `cart.currency.iso_code == shop.currency`. Consider making it a per-product metafield.

9. **M: the pack tier preset hardcodes discount percentages.**
   - **Where:** `:1061-1062` (18% and 31%) and the flags "Save 18%" and "Best value".
   - **Status:** backed today by the live automatic discounts (`PRODUCT.md:39`). The risk is drift: if the discounts change, the page price and the checkout price diverge.
   - **Fix:** keep the values, but derive `flag_label` from `discount_pct` when the flag is left blank ("Save [pct]%"). Optionally read the percentages from a shop metafield written alongside the discounts.

10. **M: the no-JS add ignores the chosen phone model.**
    - **Where:** the form posts the hidden `id` (`:363`), which stays at the initial variant. The model `<select name="options[...]">` (`:549`) and the swatches do not change `id` without JS, so a shopper without JS adds the default model. This conflicts with Product Principle 2 ("model fit comes first").
    - **Fix:** wrap a `<noscript>` variant `<select name="id">` listing `product.variants` (title and availability), hide the custom pickers under `<noscript>` styles, and remove the hidden `id` input when JS is off. Alternatively, render the hidden input only from JS and give the form a native `select[name=id]` that JS hides.

11. **L: hardcoded English shopper strings that are not localized.**
    - **In the section:**
      - "Home" `:218`
      - "3D view" `:266`
      - "View in your space" `:349`
      - "out of … stars," and "review/reviews" `:439`
      - " (sold out)" `:549,565`
      - " each" `:592`
      - "Sold out" `:630`
      - ": photos" `:689`
      - "Close", "Previous photo" and "Next photo" `:701-708`
    - **In `assets/cv-product.js`:**
      - "Unavailable" `:308`
      - " each" `:385`
      - "Sold out" `:407`
      - "Adding…" `:610`
      - "In your bag" `:617`
      - "Try again" `:627`
      - "To checkout…" `:640`
      - "Taking you to checkout." `:645`
      - "That didn’t go through…" `:601`
    - **Fix:** move these to `locales/en.default.json` `products.*` keys (a shared file, so coordinate), and pass the JS strings through `data-*` attributes on `#cvPdp`.

12. **L: "Tap to zoom" default** (`:743`) is touch wording on desktop too. Use "Zoom" or "View larger".

13. **L: the pitch line** (`templates/product.json:12`) has no final period, and "Strong magnetic connection" is a product claim. It is merchant-typed and scoped to one product (`pitch_products`), so it is setting-backed. Confirm with the merchant.

14. **L: the vendor suffix default "Cases"** (`:742`) renders "Casify Cases" for every vendor. That is fine for Casify, but it would read oddly for a non-Casify vendor.

15. **Candy-as-product check: pass.**
    - The wrapped sweets are decorative caps on the photo reel (`:248-256,317-325`, `alt=""`) and sit on the brand-asset list (`PRODUCT.md:97`).
    - The pack "candy boxes" are empty striped frames. I viewed `pdp-counter-box*.webp`; there is no confectionery inside, and the labels read "1 case / 2 cases / 3 cases".
    - Schema labels such as "Candy red and cream", "Candy stripes" and "Wrapped sweet at the end of each bar" are editor-only.
    - **Minor risk:** on the mobile horizontal strip the sweets sit in line with the product thumbnails and could read as a thumbnail. Keep them visually smaller than the tickets, or hide them below 600px.

16. **Em and en dashes: none in shopper copy.** The section, its snippets, the JS strings and the locale `products.*` keys are clean. The only one is in a Liquid comment at `snippets/cv-product-summary.liquid:8`. "1-3" uses a hyphen-minus, which is allowed.

17. **Phone model list: pass.** The model option is detected by option name, then by values (`:57-73`). The `<select>` lists the product's real `model_option.values` with availability (`:550-566`). No hardcoded model list.

## Claims register

| # | Claim (as shopper sees it) | Where rendered | Source | Verdict |
|---|---|---|---|---|
| 1 | "+1000 Happy Customer" with 5 filled stars | `cv-product-counter.liquid:437-442`; `product.convert.json:12` (`show_rating` true) | schema default `:768` | **Unbacked**: an invented count plus a fake 5-star fill. Live on the convert template. |
| 2 | ★ 4.8 "(1,000+ reviews)" under the title, as if it were the product rating | `cv-product-summary.liquid:115-121`; `product.json:9,170-171` | section setting | **Unbacked**: conflicts with `PRODUCT.md:102` (4.9 from 952 combined) and is not labelled as a store rating. |
| 3 | Google 4.8 from 1,000+ reviews (ticket) | `cv-store-ratings.liquid:37-65`; `product.json:170-171` | setting | **Unbacked**, conflicts with evidence |
| 4 | Trustpilot 4.9 from 952 reviews (ticket) | `cv-store-ratings.liquid:67-95`; `product.json:173-174` | setting | **Partly backed**: evidence is a combined Trustpilot and Google figure, here attributed to Trustpilot alone |
| 5 | "Rated 4.9 on Google, +1000" strip | `cv-google-rating.liquid`; `product.json:76-77` | block setting | **Unbacked** count (evidence says 952). It also contradicts claim 3 on the same page. |
| 6 | Google 4.9 from 952 reviews (convert template) | `cv-store-ratings.liquid`, plus the summary fallback if added; `product.convert.json:15-16` | setting | **Partly backed**: the right numbers attributed to Google only |
| 7 | Product rating and count from `reviews.rating` and `reviews.rating_count`, or approved Review-widget comments | `:142-150,439`; `cv-product-summary.liquid:24-60` | live store data | **Backed** (store data) |
| 8 | "Daniel K." ★5 "Fits perfectly" plus a review body | `cv-video-reviews.liquid` via `product.json:128-130` | block setting (merchant asked for random) | **Unbacked**: an invented reviewer and review |
| 9 | "Filmed by the people who bought it" | schema default `:1018`; live `product.json` | default copy | **Unbacked** while the only clip is a placeholder |
| 10 | "100+ sold this week" | `cv-sales-note.liquid`; `product.json:85-92` (count 100) | merchant setting, used as a fallback on every product | **Setting-backed, scope risk**: not per-product and not time-bound (Principle 1) |
| 11 | "1480+ cases sold so far" | `product.json:93-100` (count 1485, rounded to tens) | merchant setting (`PRODUCT.md:76`) | **Setting-backed, scope risk** (reads as per-product) |
| 12 | "[n] sold this week" from the `custom.sold_recently` metafield (convert template) | `product.convert.json` sales-note | product metafield | **Backed** (store data) |
| 13 | "Free shipping" stamp; shipping accordion "Free shipping on every order" | `:416-428`; `:820` | services confirmed 2026-09-14 (`PRODUCT.md:34`) | **Backed** |
| 14 | "30-day returns" stamp; "you have 30 days to return it" | same | `PRODUCT.md:34` | **Backed** |
| 15 | "Ships in 1-3 business days"; "Orders leave us within 1 to 3 business days" | `:649`, `:820`, stamp | `PRODUCT.md:34` | **Backed** |
| 16 | "Order today, ships by [date]" | `:645-651`; `cv-pdp-counter.js:26-46` | computed from `dispatch_max` 3, matching the confirmed window | **Backed** (dispatch date, not a delivery promise) |
| 17 | Packs: "2 cases, Save 18%", "3 cases, Best value" (31%), per-case price and totals | `:574-597` | tier settings matching the live automatic discounts (`PRODUCT.md:39`) | **Backed** (risk: drift if the discounts change) |
| 18 | "[qty] cases saves you [amount] vs buying singly" / "Choose [qty] cases to save [pct]% on each" | `:599-614` | computed from tiers | **Backed** |
| 19 | "% off" seal, "You save $X", struck compare-at price | `:376-400`, `:593` | variant `compare_at_price`, else the $59.99 fallback | **Backed** by `PRODUCT.md:103` for the fallback, but currency-unsafe (finding 8) |
| 20 | "Only [qty] left in this style" | `:456-461` | live `inventory_quantity`, tracked and deny-policy only | **Backed** (store data) |
| 21 | Impact Level with "8.2ft / 2.5m" drop height, thickness bars | schema defaults `:1000-1007` (block not placed) | default | **Unbacked if placed** (`PRODUCT.md:104`) |
| 22 | "Shock-absorbing drop protection" feature tile | schema default `:867` (no feature blocks placed) | default | **Unbacked if placed** without keywords |
| 23 | Pitch "Premium woven texture. Strong magnetic connection. Everyday protection for your iPhone" | `cv-product-summary.liquid:153-155`; `product.json:12`, scoped to tech-fabric-magnetic-phone-case-for-iphone | merchant setting | **Setting-backed** (product-specific; confirm) |
| 24 | JSON-LD `aggregateRating` | `cv-product-schema.liquid:18-26` | only when `has_rating` (review metafields) | **Backed** |

## Motion inventory

**cv-motion.js attributes:** none. The section uses no `data-cv-reveal`, `-stagger`, `-split`, `-count`, `-pct`, `-parallax` or `-tilt`, and no `.cv-cta` (magnetic). Its `data-cv-*` attributes (`data-cv-pdp`, `-pack`, `-qty`, `-discount`, `-thumb`, `-full`, `-zoom`, `-option-index`, `-value`, `-stock`, `-savings`, `-savings-fill`, `-tag-sale`, `-price-proof`, `-buy-now`, and others) are commerce and motion hooks for `cv-product.js` and `cv-pdp-counter-motion.js`, not cv-motion primitives. `data-cvc-*` attributes are hooks for the counter scripts.

**Important for anyone planning cv-motion attributes here:**

- `[data-cv-reveal]` is hidden by CSS with no JS gate (`assets/theme.css:1073-1084`). With JS off it stays at `opacity: 0`.
- The reduced-motion override exists (`theme.css:3232`), but there is no no-JS override.
- Adding `data-cv-reveal` to this buy box would break the no-JS requirement unless a theme-wide `html.no-js` / `.js` gate is added first (theme.css is shared).
- **Prefer this section's existing pattern:** GSAP `set` start states guarded by `html.cvc-pending`, which the inline script at `:40-49` adds only when JS runs and motion is allowed, and removes within 1.4 s.

**Section-specific motion JS:**

- **`assets/cv-pdp-counter-motion.js` (GSAP; returns early without the root, without GSAP, or under reduced motion: `:37-41`).**
  - Entry timeline `:92-122`:
    - photo scale-settle
    - reel `strokeDashoffset` draw
    - photo tickets stagger
    - sweets pop
    - brass tag drop and elastic swing
    - sale seal stamp, price-proof clip reveal
    - star stagger, rating text clip
    - packs rise, flags drop (CustomBounce `cvcDrop`)
    - meter fill
    - zoom chip, stock slide
    - buttons elastic
    - sales pill and rocket slide in
  - Pointer interactions: tag lean (hover devices), ticket stamp and photo pulse, swatch spin-pop, model select elastic nudge, pack squash and flag wiggle (CustomWiggle).
  - `cvs:change`: total and savings roll, sale seal re-stamp, stock pop, style value flip, model pulse, picked swatch pop.
  - `cvs:adding` and `cvs:added`: a photo-ticket token with ×qty arcs to the bag on MotionPathPlugin (falling back to a straight tween), and the bag icon bounces (`:261-332`).
  - `cvs:buying`: squash, plus an arrow nudge loop until the page leaves (`:334-349`).
  - Zoom dialog: in, step and out (`:351-374`).
  - Complete-the-set (cv-pdp-set) ScrollTrigger reveal and fly-to-bag (`:376-403`). This is the only ScrollTrigger use in the file.
- **`assets/cv-pdp-sales.js`:** a module with a number roll-up and a three.js flame and rocket. It pauses off screen and when the tab is hidden, does nothing under reduced motion, and handles `shopify:section` events (2 listeners).
- **`assets/cv-pdp-promises.js`:** a module. GSAP deals the stamps; three.js draws the van, return loop and box. Reduced motion is handled (`:35,814`). It releases `cvc-promises-pending` and handles `shopify:section:load` and `unload` (`:895-896`).
- **`assets/cv-case-features.js`:** a module. GSAP deals the tiles and three.js draws a scene per tile. Reduced motion is handled (`:38,1094`), with 2 `shopify:section` listeners.
- **`assets/cv-awning.js`, `assets/cv-price-tag.js`:** three.js plus GSAP. Under reduced motion or without WebGL they keep the static SVG or HTML. Each has 2 `shopify:section` listeners.
- **`assets/cv-spec-meter.js`:** GSAP and three.js; reduced motion returns early (`:529`); 1 `shopify:section` listener.
- **`assets/cv-pack-motion.js` (shared):** Flip and the slot boxes on `cvs:slots`. Reduced motion returns early (`:20`). No editor events.

**CSS motion:**

- **Pill dot blink and sold-count pulse:** infinite, only under `prefers-reduced-motion: no-preference` (`cv-pdp-counter.css:445-450`).
- **Transitions:** disabled under reduced motion (`:396`, `:671`, `:804-805`).
- **Sticky bar:** a CSS transform transition toggled by an IntersectionObserver in `cv-product.js:672-683`.

**GSAP plugins used:** CustomBounce and CustomWiggle (both optional), MotionPathPlugin (optional, with a fallback), ScrollTrigger (only for cv-pdp-set), and DrawSVG-style stroke-dashoffset done by hand (not the plugin). ScrambleText is used by `cv-pdp-sales.js` only when it is loaded, which is not the case on product.convert.json.

**No-JS state:**

- Everything renders in its finished state; `cvc-pending` is never added without JS.
- The form posts natively, with the model caveat in finding 10.
- Zoom does not open and the sticky bar never shows. Both are acceptable.

**Theme editor (`shopify:section:load` and `unload`):** **not handled** by `cv-product.js`, `cv-pdp-counter.js`, `cv-pdp-counter-motion.js` or `cv-pdp-model.js`.

- All four capture `document.querySelector('[data-cv-pdp...]')` once at load.
- After the editor re-renders the section, the buy box (variant pick, packs, add, buy now, zoom, ship-by date) and all counter motion are dead until a full reload.
- Pointer listeners and the never-ending `entry` timeline references are also not cleaned up.
- The module scripts (sales, promises, features, awning, price tag) do handle the events.

## Motion opportunities

These use the theme's idiom: GSAP-set start states under `html.cvc-pending` with a release, events from `cv-product.js`, durations 160/240/420 ms, `--ease-out-soft` and `--ease-candy` (`assets/theme.css:81-84`), and a full static fallback. They are ranked by value.

1. **HIGH: re-init on `shopify:section:load` and teardown on `unload`.**
   - Wrap `cv-pdp-counter.js` and `cv-pdp-counter-motion.js` in `init(root)` and `destroy()`. Use `gsap.context()` in the motion file so `ctx.revert()` kills the timelines, ScrollTriggers and listeners.
   - Listen to `document` `shopify:section:load` and `shopify:section:unload` filtered by `event.target.querySelector('[data-cv-pdp="counter"]')`.
   - `cv-product.js` (shared) needs the same treatment. Coordinate it with the cv-product lane, or expose `window.CasifyPDP.init(root)`.
   - This is a prerequisite for any new choreography, because merchants tune this section in the editor.

2. **HIGH: Add to bag confirmation (signature).** Extend `cvs:added` in `cv-pdp-counter-motion.js`:
   - **Button state:** `#cvCtaLabel` flips (yPercent 80 to 0, 240 ms, back.out) to "In your bag". The cart icon in the button morphs into a check drawn with DrawSVG (plugin already loaded) or a stroke-dashoffset path appended to `.cvc__add`. A 420 ms candy-spring scale settles it.
   - **Cart drawer:** when the token lands (an `onComplete` on the fly timeline), optionally call `window.Casify.openDrawer()` (`assets/cart.js:62`). Gate it behind a new section setting, "After adding: open the bag / stay on the page", defaulting to stay, so the decision is the merchant's.
   - **Drawer line motion:** this lives in the cv-cart-drawer lane (shared). Only fire `cart:added` with `detail.items` from `cv-product.js` so the drawer can stagger new lines.
   - **Reduced motion:** text swap only (already done by `cv-product.js:617`), and `#cvStatus` announces it (already done).

3. **HIGH: Buy now feedback.** Replace the infinite arrow nudge (`:340-348`) with a determinate "ticket punch" sequence:
   - On `cvs:buying`, run a DrawSVG stroke around the button border (an SVG `rect` with `pathLength=1` appended inside `.cvc__buy`) over the POST.
   - Then slide the arrow out to the right and fade the label to "To checkout…".
   - Keep `is-busy`. On error (no navigation) reverse the timeline; `cv-product.js:651-653` already resets the label.
   - Reduced motion: label text only.
   - Applies to the sticky Buy now too (`[data-cv-buy-now]` in `#cvSticky`).

4. **HIGH: pack and bundle choreography.**
   - On a pack click, use Flip to move a single "selected" ribbon or outline between `.cvc__pack` tiles instead of a per-tile squash. Flip is loaded on product templates: `layout/theme.liquid:173-176`.
   - Animate the per-case price and total as a money tween: `gsap.to` a proxy `{c: oldCents}` to `newCents` with `snap: 1`, formatting each frame through the shop money format from `#cvPdp[data-money-format]`. The values come from `cvs:change` `detail.each`, `detail.total` and `detail.pct`.
   - Animate the savings meter fill with GSAP from its previous `scaleX` rather than the CSS width jump.
   - When the shopper moves from 1 to 2 or 3 cases, have the matching flag ("Save 18%") do a one-shot wiggle (CustomWiggle exists).
   - Mix-and-match slots are already handled by the shared `cv-pack-motion.js`; leave them.
   - Static: the selected state comes from the existing `aria-checked` CSS.

5. **HIGH: a mobile-aware entry.**
   - The whole entry timeline plays at load (`:92`). In one column (989 px and below), the packs, meter, buttons and sales notes start below the fold and finish animating off screen.
   - Use `gsap.matchMedia()`:
     - Above 990 px, keep the current timeline.
     - Below that, split it in two: photo, reel and tickets at load; then `ScrollTrigger.create({ trigger: '.cvc__packs', start: 'top 85%', once: true })` for the packs, flags and meter, and a second one on `.cvc__buttons` for the button spring.
   - The start states stay under `cvc-pending`. **Important:** the 1.4 s guard releases `cvc-pending` early, so the scroll-triggered elements must use GSAP `set` start states applied in JS (as the meter and flags do now), never CSS-only hidden states.

6. **MEDIUM: scroll reveals for the lower buy box.**
   - Ship-by line, Google strip, accordions and video-reviews heading: one `ScrollTrigger.batch` with y 16 to 0, opacity, 420 ms, `--ease-out-soft`, stagger 55 ms, in `cv-pdp-counter-motion.js`.
   - Do not use `data-cv-reveal` because of the no-JS gap explained in the Motion inventory.
   - The Case features card already has its own motion.

7. **MEDIUM: sticky bar.**
   - Drive the show and hide with GSAP: y 100% to 0 with `--ease-candy`, 240 ms, and the thumbnail scale-in.
   - On `cvs:change`, flip `#cvStickyTotal` (the same roll as `#cvTotal`).
   - On `cvs:added` from the sticky button, the token already flies from `#cvStickyBtn` (`:330`).
   - Keep the CSS class toggle as the fallback.

8. **MEDIUM: photo change on variant switch.**
   - When `cvs:change` changes the featured image (or `cvs:photo` fires), crossfade or clip-reveal `#cvMainImage` (clipPath inset 0 100% 0 0 to 0, 420 ms) and stamp the matching ticket.
   - It currently only scales the photo on a ticket click (`:161`).

9. **MEDIUM: accordions.** Animate the `<details>` height on open and close: intercept the summary click, then `gsap.fromTo` the height from 0 to auto with `onComplete` set to open. With JS off or reduced motion, the native toggle stays.

10. **LOW: magnetic Add to bag and Buy now on fine pointers.** Re-implement locally in the motion file (`--cv-mx` style), not via `.cv-cta`, which would pull in theme CTA styling. Disable it under reduced motion and on `hover: none`.

11. **LOW: honest-claims motion.** Once findings 1 to 5 are fixed, keep the existing rating-star stagger only for real ratings. Do not animate or "roll up" store-wide fallback sales numbers or placeholder clips, because motion amplifies the claim.

## Risks

- **Shared commerce core:** `assets/cv-product.js` owns money, variants and the `cvs:*` event contract used by `cv-pdp-counter-motion.js`, `cv-pack-motion.js`, `cv-pdp-carousel.js` (live on product.json) and `cv-pdp-video-reviews.js`. Do not rename events or change `detail` shapes. Add new fields instead.
- **`cv-pdp-counter-motion.js` also drives cv-pdp-set** (complete-the-set, live on both templates). A refactor or early return here changes that section's motion. Keep `cvp:set` and `cvp:setadded` handling intact.
- **`assets/cv-pdp-counter.css` is shared** with `sections/cv-sales-note.liquid` on `templates/page.json` (`.cvc__pill`, `.cvc__sold`). New hidden start states must be added to the `.cvc-pending` list (`:783-786`) and released by JS.
- **The `cvc-pending` guard is time-boxed to 1.4 s** (`cv-product-counter.liquid:47`). Any element hidden by it and animated later (for example, scroll-triggered) will flash visible and then jump. Use JS `gsap.set` for those instead.
- **Plugin availability differs by template:** ScrambleText and Text load only with `data-cvsu` (absent on product.convert.json); Draggable and Inertia load only with `data-cvtr`. Every new effect must feature-detect its plugin.
- **Theme editor:** no re-init today (see Motion inventory). Testing new motion in the editor will look broken until opportunity 1 lands.
- **Claims changes need the merchant.** Findings 1 to 5 change live template values (`templates/product.json`, `templates/product.convert.json`). Per `PRODUCT.md` practice, flag each one to the merchant before editing. Schema-default changes are safe.
- **Multi-currency:** `data-money-format` uses `shop.money_format` (`:211`) for the JS re-render, and the compare fallback is not converted. Verify on a non-USD market before adding money tweens.
- **Performance:** a product page with this section can run up to five three.js scenes (awning, price tag, sales, promises, features) plus the carousel and reviews. New motion should be GSAP-only, reuse the existing contexts, and pause off screen.
- **`templates/product.json` is the default product template.** A broken edit to this section hits every product. Edit in a scratch theme; `PRODUCT.md:74` records a past incident where `shopify theme dev` overwrote live files.
