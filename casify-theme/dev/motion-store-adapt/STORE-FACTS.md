# STORE-FACTS: Casify (single source of truth for the motion + store adaptation)

Written 2026-10-22, read-only pass over local files. Paths are relative to
`D:/Shopify Theme Fix & Page/casify-theme/` unless they start with `../` (the parent
folder `D:/Shopify Theme Fix & Page/`). Line numbers are 1-based.
In quotes below, `[en]` and `[em]` mark an en dash or em dash that exists in the source
(both are banned in shopper-facing copy; never copy them forward).

Status words used in the claims register:

- **BACKED**: listed in PRODUCT.md "Evidence on Hand" (PRODUCT.md:99-105) or the confirmed
  service facts (PRODUCT.md:34).
- **LIVE**: the value is read from store data at render time (product, variant,
  metafield, `shop.*`, collection count, review-app metafields).
- **MERCHANT-TYPED**: a number or quote the merchant typed into a section setting; allowed
  by the hard rule as a setting value, but NOT in Evidence on Hand. Never copy it into
  hard-coded copy or a schema default; render it only from the setting.
- **UNBACKED**: no evidence, or contradicts Evidence on Hand. Must not be added, copied,
  or animated into more prominence. Flag to the merchant; do not silently delete
  merchant content (removal needs merchant confirmation, per PRODUCT.md:33 and :41).

---

## 1. Store identity

| Fact | Value | Evidence |
|---|---|---|
| Brand | Casify, a phone case brand selling iPhone and Samsung cases | PRODUCT.md:15 ("confirmed by the merchant, 2026-09-15") |
| Products are | Phone cases (plus one camera-lens film). Candy is only the visual metaphor | PRODUCT.md:15, :19; DESIGN.md:78 |
| Theme name in schema | "Casify (Chrismass design)" v1.0.0, author Casify, docs URL `https://casify.shop` | config/settings_schema.json:4-7 |
| Live theme id | #188689940725 | PRODUCT.md:66, :68, :74, :92; ../dev/payments-readiness-review/baseline.json:6 |
| Live theme name (2026-10-07) | "Casify [em] Reviews, stars, Us vs them 2026-09-27", role `main` | ../dev/payments-readiness-review/baseline.json:4-9 |
| Public storefront seen in that baseline | `https://casiffy.myshopify.com/`, title "Casify \| Phone cases for iPhone and Samsung" | ../dev/payments-readiness-review/baseline.json:2-3 |
| Brand colours (settings) | candy_red #C4302B, candy_teal #6C9E9C, candy_cream #FDF9F1, candy_cocoa #4A3324 | config/settings_data.json:12-15 |
| Live store contact | Comes from `shop.address` / store settings (address in Essaouira, Morocco seen in the live render). Never hard-code it | sections/footer.liquid (local, escaped `shop.address.*`); baseline.json:37 |

### Which myshopify handle the live backup belongs to (UNCERTAIN)

- The backup folder is `../backup-live-spycpc-g0/`, i.e. handle **`spycpc-g0`**.
- `../.claude/launch.json:5-13` runs `casify-theme-dev` with `--path casify-theme --store spycpc-g0.myshopify.com`.
- But `.claude/launch.json:19,25,31` (inside casify-theme) runs theme dev against
  `casiffy.myshopify.com` (theme 161454162165), and the 2026-10-07 baseline shows the same
  live theme id #188689940725 as `main` on `https://casiffy.myshopify.com/`.
- The user's memory note (casify-store-and-brand) says `spycpc-g0` is the handle the
  owner's profile gives for Casify, and that `casiffy.myshopify.com` (also
  `bys-user-store-351004-ajruqzvk`) ran a Horizon theme as MAIN on 2026-10-22.
- Reading: the backup most likely belongs to **spycpc-g0**, and the evidence that theme
  #188689940725 was main on casiffy on 2026-10-07 suggests the two names *may* be one store
  (a store keeps its original myshopify handle when its domain changes). That is **not
  proven**, and the 2026-10-22 Horizon observation conflicts with it.
  Verify with the connector (`get-shop-info` → `myshopifyDomain`, `primaryDomain`, main
  theme id) before any push. Never touch `christmascandles.shop` / `qbq4bz-3d`
  (DECISIONS.md:3-4).

---

## 2. Local theme vs live backup (`../backup-live-spycpc-g0/`)

- **Section count is the same, 97 files on both sides**: 95 `.liquid` sections plus
  `header-group.json` and `footer-group.json`. The file *names* are identical; there is
  **no 2-section name difference**. The "95 vs 97" in earlier notes is liquid files vs all
  files (DECISIONS.md:6 says "all 95 sections").
- **Templates and settings: no content difference.** A semantic JSON diff (leading
  Shopify comment stripped) of all 24 `templates/*.json`, `config/settings_data.json`,
  `sections/header-group.json`, `sections/footer-group.json` finds **0 differences**.
  `templates/index.json`, `templates/page.json`, `config/settings_data.json` and
  `layout/theme.liquid` are byte-identical; the rest differ only in line endings (live
  files are CRLF/LF mixed). The live store has no template content that local lacks.
- **Locale difference that matters**:
  - live `../backup-live-spycpc-g0/locales/en.default.json:12` search placeholder
    "Search sweets, gifts, and flavours" (presents candy as the product: banned);
    local `locales/en.default.json:3` "Search cases or phone models" (fixed).
  - local has an extra `gift_cards` block that live lacks.
- **Code differences (same file names, local is newer)**: sections `cv-404` (35 changed
  lines), `cv-collection-row` (13), `cv-contact` (38), `cv-orbit` (18), `cv-reel-showcase`
  (2), `cv-showcase` (16), `cv-spotlight` (5), `footer` (9), `header` (8);
  `snippets/cart-drawer.liquid`; `assets/cart.js` (16), `assets/theme.js` (10),
  `assets/cv-reel-showcase.js` (2). Sampled diffs show local adds escaping, i18n and
  honesty guards, e.g. live `sections/header.liquid` hard-codes the placeholder
  "Search sweets, gifts, and flavours…" where local uses `general.search.placeholder`;
  live `cv-spotlight` prints "0 case designs" on an empty catalogue, local hides it.
  These are unpushed local fixes (checkpoint `e5ef095`, DECISIONS.md:16).
- Local-only assets: many `*.webp.json` / `*.png.json` sidecars and `assets/plates/`
  (all in `.shopifyignore`, not shipped).

---

## 3. Product lines

Known catalogue (offline sources only; live counts change):

- PRODUCT.md:15 (2026-09-15): "about 10 active products at $23.99 to $49.99, vendor
  Casify, each with 44 to 81 variants built from a style or colour option and a
  phone-model option".
- `dev/og/products.json` (2026-09-15, 10 products): two-in-one-space-case-with-magnetic-mount-for-iphone-18-pro-max ($23.99), magnetic-stand-phone-case-for-iphone, metal-lens-case-high-end-anti-drop-pc-case, iphone-18-magnetic-shockproof-protective-case-rigid-defender-for-iphone-18-pro ($39.99; title contains a literal "?" per PRODUCT.md:53), 2-in-1-space-case-with-magnetic-mount-for-iphone-18-pro-max, four-corner-airbag-phone-case-with-magnetic-stand-and-glitter-design, transparent-magnetic-phone-case-for-iphone, metal-protective-phone-case-for-iphone-and-samsung, chain-crossbody-phone-case, mobile-phone-case-apple (the rest $49.99).
- Live render 2026-10-07 (../dev/payments-readiness-review/baseline.json:37): "17 case
  designs", "COLLECTION · 17 STYLES"; products seen with "Made for N phone models"
  (N = 5, 10, 23, 23, 27); "Camera lens protective film $23.99" (compare-at $59.99);
  most cases $49.99 with compare-at $59.99.
- `templates/index.json` cv-showcase (lines ~170-950) now lists **31 product handles**
  (block_order), incl. peppermint-candy-christmas-*-case (3 variants of a Christmas
  design), cherry-plaid-phone-case-sweet-little-life-*, phone-case-a-little-softer-pink-bow-*,
  magnetic-bitcoin-design-phone-case, canvas-magnetic-phone-case-full-cover,
  camera-lens-protective-film, and the 10 above. Some may be draft or archived.
- Product families (by title/handle): magnetic (MagSafe-style) cases, stand/kickstand
  cases, clear/transparent and anti-yellowing PC cases, metal lens-ring cases, airbag
  corner cases, silicone cases, fabric/canvas cases, chain crossbody case, printed-design
  cases (Christmas peppermint, cherry plaid, pink bow, bitcoin), one camera-lens film.
  "Peppermint candy" and "sweet" in a title are **case print designs**, not food.
- Phones: mostly iPhone (17 and 18 families seen), some Samsung (PRODUCT.md:11, :15;
  `metal-protective-phone-case-for-iphone-and-samsung`). Live 2026-10-01/02 counts:
  18 Pro Max 20 products from $23.99; 18 Pro 19; base 18: 1 (Chain Crossbody,
  value "iPhone 17  18") (PRODUCT.md:66, :70). The live baseline (10-07) showed 18: 1,
  18 Pro: 24, 18 Pro Max: 25.

### How variants and options are named

- Option 1 is usually a style or colour ("Magnetic Case Camera Cutout Transparent"),
  option 2 the phone model, often 20 to 40 values (PRODUCT.md:31). Order is not
  guaranteed: always detect by name, never by position.
- Option names seen: "Color" / "color", "Model", "Applicable model", "Applicable models"
  (task hint from a live read; local evidence: `templates/index.json:107`
  `"model_option_name": "Applicable model"`, `:108` `"color_option_name": "Color"`;
  default in `sections/casify-hero.liquid:401`).
- Model values are inconsistent: "iPhone 17 Pro Max", "iPhone17Promax",
  "IPHONE 17 PRO MAX", "iPhone18PROMAX", "iPhone 17 Pro Max / 18 Pro Max",
  combined values like "iPhone 18 Pro 17 Pro" (`templates/index.json:109`,
  `:111` "iPhone 18 Pro Max 17 Pro Max"), and double spaces ("iPhone 17  18")
  (PRODUCT.md:66).
- Note: `assets/cv-pdp-model.js` is about the **3D model viewer** (Shopify Model3d media
  in the gallery, cv-pdp-model.js:1-11), not the phone-model option.

---

## 4. Detecting the phone-model option robustly

Current implementations (all slightly different; unify on the rule below):

| Where | Name match | Value fallback |
|---|---|---|
| sections/cv-product-counter.liquid:57-72 | downcased name contains `model`, `phone`, `device`, `compatib` | first value contains `iphone`, `galaxy`, `pixel`, `samsung` |
| assets/cv-quick-pick.js:82-89 | `/model\|phone\|device\|compatib/i` | first variant's value matches `/iphone\|galaxy\|samsung\|pixel/i` |
| snippets/cv-card.liquid:34 | `model`, `phone`, `device`, `compatib` | (see file) |
| snippets/cv-showcase-card.liquid:194 | `model`, `phone`, `device` (no `compatib`) | first value `iphone/galaxy/samsung/pixel` |
| snippets/cvps-fit-match.liquid:24-35 | adds `size`; normalises values: downcase, remove spaces, `-`, `_`, and `2018` | `18promax` checked before `18pro` before `18` |
| sections/casify-hero.liquid:17-27 | exact merchant setting `model_option_name` (default "Applicable model"), downcased | none |

Rule for agents (Liquid and JS alike):

1. Model option = first option whose downcased name contains `model`, `phone`, `device`,
   `compatib` or `applicable` (covers "Model", "Applicable model(s)", "Phone model",
   "Compatible model"). Do not match `size` unless no other option qualifies.
2. Else the first option whose values (check several, not only the first) match
   `iphone|galaxy|samsung|pixel|\bs2[0-9]\b`.
3. Else `-1`: the product has no model choice (e.g. camera-lens film); never invent one.
4. Colour/style option = first remaining option whose name contains `colo` or `style`
   ("Color", "color", "Colour", "Style"); else the first non-model option.
5. Comparing model values: key = downcase, strip spaces, `-`, `_`, `/`; strip a leading
   `apple`. Check longest first: `promax` before `pro` before `plus`/`air`/`e`/base, and
   never let "18 Pro" count as "18 Pro Max" (PRODUCT.md:66). Guard "2018" being read as
   "18" (cvps-fit-match.liquid strips `2018`). A combined value ("iPhone 18 Pro 17 Pro")
   fits every model it names.
6. **Display the merchant's raw value** (escaped) in pickers and in cart lines; the
   normalised key is only for matching. Never rewrite variant titles.
7. Never pre-select a model (Principle 2, PRODUCT.md:110). `?variant=` links or an
   explicit shopper pick are the only ways a model is chosen (PRODUCT.md:65).
8. Resolve a real variant id from all options before add to cart (PRODUCT.md:30).

Commerce events to hook motion onto (do not reimplement commerce): `assets/cv-product.js`
owns the money (header :1-21). It posts every pack case to `/cart/add.js`; Buy now posts
the same items then goes to `/checkout` (:633-659). Events on the `[data-cv-pdp]` root:
`cvs:choose` (in, :523), `cvs:change` (out, :415, detail: variant, qty, each, total, pct,
lines, compareAt...), `cvs:adding`, `cvs:added` (detail qty, items), `cvs:buying`;
document events `cart:refresh`, `cart:added`; `window.CasifyCart.refresh()`. Listeners
today: cv-pdp-carousel.js, cv-pdp-counter-motion.js, cv-pdp-slip-motion.js,
cv-pdp-story.js, cv-pdp-video-reviews.js, cv-price-tag.js, cv-pdp-model.js.

---

## 5. Collections, pages, menus the templates reference

- Collections: `all` (`/collections/all`, `shopify://collections/all`: index.json spotlight
  cta, feature_tabs, us_vs_them, risk closer, offer_delivery; product.json feature_tabs,
  us_vs_them; 404.json; page.about-us.json), `iphone` (index.json phone_scan
  phone_1_url/phone_2_url, collage block, `iphone` collection row), `frontpage` (index.json
  spotlight `count_collection`, orbit, shop row; product.json and product.convert.json
  showcase; hidden from the list page via `templates/list-collections.json` `hide_handles`).
  No Samsung collection is referenced by any template (header menu may have one; menus
  are store data).
- Pages (by handle): `contact`, `return-policy`, `shipping-policy`, `track-order`, `faqs`
  (templates/page.contact.json blocks a-track, a-returns, a-shipping, a-faqs; 404.json).
  Page templates exist for about-us, campaign-guide, contact, faq, privacy-policy,
  reel-showcase, return-policy, shipping-policy, terms-and-conditions, track-order.
  `/pages/campaign-guide` was a 404 on 2026-10-03 (PRODUCT.md:74).
- Menus: footer uses `main-menu` and `footer` (sections/footer-group.json).
- Featured products by handle: page.reel-showcase.json (two-in-one-space-case..., transparent-magnetic..., four-corner-airbag..., mobile-phone-case-apple); page.campaign-guide.json `featured_product` mobile-phone-case-apple; index.json us_vs_them `us_product` mobile-phone-case-apple; collage clear and crossbody; product.json summary `pitch_products` tech-fabric-magnetic-phone-case-for-iphone.
- `casify_hero_U3GTzw.settings.featured_product` is **empty** (templates/index.json:100), so
  the hero showed "Cases are currently unavailable" on the live home page
  (baseline.json:37). Fix by setting a real product (merchant choice) or making the empty
  state honest.
- Template usage: 58 sections placed in templates, `cv-cart-drawer` and `predictive-search`
  via the Section Rendering API, 35 placed nowhere (amazon-styled-reviews, bundle-buybox,
  custom-section, cv-apps, cv-case-wheel, cv-compare, cv-cost-compare,
  cv-customer-experience, cv-finder, cv-hero, cv-home-conversion, cv-howto, cv-pdp-closer,
  cv-pdp-promises, cv-pdp-reel, cv-pdp-row, cv-pdp-shelf, cv-pdp-value,
  cv-pdp-video-reviews, cv-product, cv-story, cv-trustpilot, facebook-reviews, all ten
  `halo-*`, main-halo-product, product-3d-viewer). Shopify caps a JSON template at 25
  sections; product.json has 22, index.json 21 (PRODUCT.md:65).

---

## 6. Shipping, returns, dispatch, payment: ONLY as documented

Confirmed by the merchant (2026-09-14), PRODUCT.md:34:

> "free shipping (answer given as "free shipping"; recorded as free shipping on all orders, no threshold); 30-day returns; orders dispatch within 1 to 3 business days. No dispatch location and no order-by countdown."

- Ship-by date may be computed from the 1 to 3 business day dispatch window, "no delivery
  promise" (PRODUCT.md:37).
- Cart free-shipping meter: `templates/cart.json` `free_ship_threshold` = 0 (no threshold).
- Pack discounts (live automatic discounts, checked 2026-09-15): "18% / 31% off entire
  order, minimum quantity 2 / 3, all items", mixing variants and products qualifies
  (PRODUCT.md:39). Page price must equal checkout price (PRODUCT.md:33, :112).
- Compare-at: fallback $59.99 on the Shop Counter (Evidence, PRODUCT.md:103); a variant's
  own higher compare-at wins. Note product.json has `compare_price_fallback: ""`
  (templates/product.json:157) while product.convert.json has "59.99" (:9).
- Payment: accepted methods are read live from `shop.enabled_payment_types`
  (sections/cv-pdp-trust.liquid; PRODUCT.md:46). At build time no wallets were enabled
  (Shop Pay, Apple Pay, Google Pay off). Never hard-code payment logos.
- Admin policy pages (store content, not theme): Return Policy was edited to 30 days and
  the Screen Promise removed; Shipping Policy now says free shipping, no minimum
  (PRODUCT.md:59). "Prepaid label" remains on the Return Policy page per PRODUCT.md:41 and
  :59 ("everything else ... left untouched") but is **not** among the confirmed facts.
- Store-wide unverified (never show): 90-day returns, free shipping over $40 or $45,
  "Ships in 24h from Austin, TX", the $200 Screen Promise (PRODUCT.md:104).

---

## 7. Claims register

Scope: `templates/*.json`, section groups, `locales/en.default.json`, and Liquid
defaults/markup in `sections/`, `snippets/`, `blocks/`. Ordered by risk.

### 7a. Live and rendering now: UNBACKED

| Claim | Where | Why |
|---|---|---|
| "+1000 Happy Customer" (empty-rating line) | templates/product.json:167; templates/product.convert.json:12 | Customer count with no evidence |
| Google rating block `rating 4.9`, `review_count "+1000"` | templates/product.json:74-78 | Evidence says 952 reviews (PRODUCT.md:102); "+1000" contradicts it |
| "Loved by thousands", badge "Rated 4.9/5 from 2,000+ reviews" (review-carousel) | templates/product.json:1236-1238 | Contradicts 4.9 / 952 |
| review-carousel quotes "Sarah M.", "James K.", ... all "Verified buyer", "arrived faster than expected" | templates/product.json:1172-1230 (blocks), :1236-1238 (settings) | No reviews confirmed (PRODUCT.md:105); text differs from the widget's |
| review-widget: 6 reviews (Sarah M. 5, James K. 5, Lina R. 4, Omar B. 5, Emma T. 5, Noah P. 4), each `verified: true`, `date: "2 weeks ago"`; "Real reviews from real people" | templates/product.json:1035-1105 (blocks), :1117-1118 (heading) | Merchant-typed per PRODUCT.md:80, but Evidence on Hand :105 says none confirmed; static "2 weeks ago" goes stale; "verified" unproven |
| cv-scrolling-reviews: same 6 people, `verified: true`, heading "Our customers love their cases" | templates/product.json:575-641 | Same as above |
| Video review "Daniel K.", 5 stars, "Fits perfectly" (merchant asked for random placeholder) | templates/product.json:125-135 | PRODUCT.md:76: placeholder details; not a real customer |
| cv-value-stack: "12 ft", "6[en]8 ft", "1,400 g", "800[en]900 g", "No shift at 36 mo", "Yellow by month 4", "Eighteen N52 magnets", "Qi2 25W charging", "1.4 mm of rim", drop chart 12.0 / 10.5 / 7.2 / 5.1 / 2.9 / 0.9 ft, "Independent lab, 26 drops per unit onto concrete, MIL-STD-810G 516.6.", "Three measurements, each one taken in a lab" | templates/index.json:1057-1219 | PRODUCT.md:104 lists these as not verified; merchant kept them by choice (PRODUCT.md:49) |
| cv-guarantee "risk" FAQ: "passes Qi2 25W, MagSafe, and standard Qi" ; "2.8 mm across the back and 3.4 mm at the rail, adding about 24 g"; "A screen repair costs more than five of these"; "No restocking fee, and you don't pay shipping twice" | templates/index.json:1567, :1583, :1649, :1591 | Unverified performance and policy claims; left as-is by merchant (PRODUCT.md:58) |
| "Cut from your phone's own CAD file", "one mould per model" | templates/index.json:127, :971, :1120-1121, :1559, :66, :166; templates/product.json:386 | Manufacturing claim, not in Evidence |
| "Most protected this month" / eyebrow "Best sellers" | templates/index.json:164-165 | No sales-rank data behind it |
| "100% safe & encrypted" (trust bar) | templates/index.json:36; default in sections/cv-trust-bar.liquid:55 | Absolute claim; "Secure checkout" alone is fine |
| "Prepaid label, no hassle" / "30-day returns, prepaid" / "prepaid return label, full refund" | templates/index.json:28, :1249, :1544; :1137 "refunded as soon as it's scanned" | Prepaid label is on the admin page but not a confirmed fact; "as soon as it's scanned" unbacked |
| "Support answers in under a business day, and can override anything on this page in your favour." | templates/page.faq.json:8; page.track-order.json; page.about-us.json | Response-time promise not documented |
| Footer blurb default "An old-fashioned candy shop, online. Tins, cases, ribbons [em] wrapped by hand since 1920." | sections/footer.liquid:27, :123 | Presents candy/tins/ribbons as goods; "since 1920" is theatre, not history; em dash |
| "Letters from the sweet shop" signup heading; "Join the sweet list" | templates/index.json:1679; templates/product.json:975; sections/footer.liquid:133 | On-voice but reads as a sweet shop newsletter; keep cases explicit nearby |

### 7b. Placed but MERCHANT-TYPED (render only from the setting)

| Value | Where |
|---|---|
| "100+ sold this week" (fallback `count: 100`, metafield `custom.sold_recently`) | templates/product.json:83-92 (PRODUCT.md:76) |
| "1480+ cases sold so far" (`count: 1485`, round to tens, metafield `custom.total_sold`) | templates/product.json:95-101 (PRODUCT.md:76) |
| product.convert.json sales note: metafield only, no typed count | templates/product.convert.json:94-98 |

The metafield value is LIVE data and wins when present; the typed fallback is a merchant
assertion. Neither is in Evidence on Hand.

### 7c. BACKED

| Claim | Where | Evidence |
|---|---|---|
| Free shipping, on every order | trust bar index.json:19; header-group ticker; cart.json t-1; casify-hero facts; orbit perks; locales en.default.json:15-17, :209 | PRODUCT.md:34 |
| 30-day returns | index.json:27; header topbar_right; cart.json t-2; product svc-returns | PRODUCT.md:34 |
| Ships in 1-3 business days / Fast dispatch | index.json:43-44; header topbar_left; cart.json t-3; product svc-dispatch | PRODUCT.md:34 |
| Packs: 2 cases 18% off, 3 cases 31% off | product.json tier-2/tier-3; product.convert.json compare p-2/p-3; index.json:1658 offer | PRODUCT.md:37, :39 |
| Store rating 4.9 / 5 from 952 reviews, labelled Trustpilot and Google store rating | index.json:83-85 (phone scan), :1304-1306 (cv-social-proof) | PRODUCT.md:102 |
| Compare-at fallback $59.99 | product.convert.json:9 | PRODUCT.md:103 |
| "Secure checkout", "Encrypted by Shopify" | index.json:35, :154; cart.json | Shopify checkout (platform fact); keep without "100%" |
| "Est. 1920" | header ticker; product ribbon r-est | Brand voice (PRODUCT.md:96), theatre not a historical claim; keep framed as the shop sign |

### 7d. LIVE (computed at render, keep this pattern)

Case-design count (`collections.all.products_count` / count collection) in cv-spotlight;
phone-model and style counts in cv-pdp-spotlight; per-model product counts and "from"
prices in cv-phone-scan / cvps-fit-match; product ratings from `reviews.rating` /
`reviews.rating_count` (cv-social-proof, cv-pdp-reviews, cs-customer-proof with
`source: product`); low-stock line only for tracked, deny-oversell variants
(cv-product-counter, PRODUCT.md:47); payment icons from `shop.enabled_payment_types`;
discount percentages from variant compare-at; "Made for N phone models".
Note: "MagSafe compatible/ready" pills and descriptions on showcase cards
(index.json:227, :616, :685, :957-958) are product attributes typed per card; acceptable
only if the product's own title/data says magnetic/MagSafe (most handles say
"magnetic"). Verify per product.

### 7e. Empty review shells (render nothing or an empty state; keep honest)

index.json `trustpilot_reviews` (trustscore 0, 3 empty reviews), `facebook_testimonials`
(3 empty posts), `customer_reviews` (empty state "There are no reviews to display yet."),
`facebook_comments` (empty text), `ugc` (empty-state copy), `social` (live aggregate +
empty state); product.json `trustpilot_reviews`, `facebook_testimonials`,
`ratings_reviews` (`source: product`, empty reviews). Do not fill them with sample
content. "Rated on Trustpilot" heading with trustscore 0 must stay hidden until real.

### 7f. UNBACKED claims in unplaced sections (defaults; dangerous if someone adds them)

halo-reviews "12,480 verified reviews" (sections/halo-reviews.liquid:7, :46) and a Screen
Promise testimonial (:56); halo-press WIRED / The Verge / GQ (halo-press.liquid:25-62);
halo-closer "Twelve feet, 1,400 grams, ... 90 days" and "Free shipping over $45 · ships
from Austin, TX" (halo-closer.liquid:15, :23, :31-32); halo-drop-test MIL-STD 26 drops
(:55, :98); halo-comparison and cv-compare 12 / 7.2 / 10.5 ft (halo-comparison.liquid:76-140,
cv-compare.liquid:228, :267); halo-three-fixes 12 ft / 1400 g / N52 (:56, :92-101);
halo-faq 1,400 g, Qi2 25W, two-year yellowing warranty, 2.8 mm "12-foot rating"
(:72-85); halo-xsell "1,100 g", "1,400 g ring" (:81, :87); halo-yellowing 36 mo scale (:49);
halo-why-love "Drop-tested protection" (:65, :75); main-halo-product 12 ft rail (:33);
cv-hero "A clear case that survives a 12 ft drop" (cv-hero.liquid:27); cv-howto "From
checkout to drop-tested in one trip" and "Order before 2pm CT and it leaves Austin today
[em] backed by the Screen Promise" (cv-howto.liquid:12, :47, :80); cv-cost-compare
"Covered up to $200" (:100); cv-finder "Built for 200+ phones, not just yours" (:12, :47);
cv-story drop test, MIL-STD, 4.7 / 2.8 mm (:144, :165). Adapting any of these sections
means replacing defaults with live data or deleting the claim.

### 7g. Dash violations in shopper copy (en/em dash)

`locales/en.default.json`: 4 ("1[en]3 business days" at :15, :16, :17, :209).
Templates: 35 strings: index.json 26 (spotlight subheading `&mdash;`, orbit eyebrow and
perk_dispatch, feature_tabs tab-1/tab-3, value fix-0/1/2 and ben-0/3 and eyebrow, ugc
eyebrow "Section 03 [em] your clips", social empty_text, risk g-0/g-3/faq-0/faq-3/note-2/
guard_eyebrow/closer_body, offer_delivery text and bubble_before), page.campaign-guide.json
2, page.json 2, product.json 4 (feature_tabs tab-1/tab-3, offer_delivery text and
bubble_before), search.json 1. Many schema defaults in sections also carry dashes.
Use "1-3", "to", a comma or a colon instead.

---

## 8. Brand voice and banned content

- Voice: warm, old-fashioned candy-shop shopkeeper, "Est. 1920" (PRODUCT.md:96). Short,
  plain sentences. Model fit, price, shipping, returns and dispatch are stated plainly
  before any flourish (DESIGN.md:191).
- Creative north star "Candy Shop Matinee": cream paper, painted wood, enamel red,
  oxidized teal, aged brass, striped awnings, glass sheen (DESIGN.md:76-78). "Decoration
  frames decisions; it never replaces them." (DESIGN.md:80).
- Type: editorial display (Playfair Display), Parisienne script only for short flourishes,
  typewriter labels for tags (DESIGN.md:115-128; PRODUCT.md:90).
- Motion: physical shop dressing (signs swing, tickets stamp, sweets drift); 160 / 240 /
  420 ms state timings, soft-out for entrances, "candy spring" only for small delight;
  ambient motion pauses offscreen and in hidden tabs; reduced motion removes nonessential
  animation and WebGL; every auto-run animation gets a pause path and a complete static
  no-JS state (DESIGN.md:183, :192). Pattern used in the theme: a `*-pending` class plus a
  1200 to 1600 ms timeout fallback, never unconditional `opacity:0` (PRODUCT.md:42).
- Banned:
  - Candy, sweets, tins, ribbons, gifts or flavours presented as products (live header
    placeholder and footer blurb are current offenders, see sections 2 and 7a).
  - Invented reviews, ratings, review counts, customer counts, sales counts, press logos,
    guarantees, drop-test or magnet numbers, lab or MIL-STD references, delivery promises,
    order-by countdowns, "ships from Austin", Screen Promise, 90-day returns, free-shipping
    thresholds (PRODUCT.md:104-105; DESIGN.md:197).
  - Pre-selected phone model; guessed model in quick add (PRODUCT.md:40, :110).
  - AI-generated product photos; KIE imagery is only for candy-shop set pieces
    (PRODUCT.md:35).
  - Hard-coded payment logos, contact details or policy wording (PRODUCT.md:40, :46).
  - Em and en dashes in shopper copy.
  - Generic tech gradients, neon glows, dark campaign worlds (DESIGN.md:196); an eyebrow
    above every heading (DESIGN.md:198); truncated model-fit text (DESIGN.md:199).
  - Running `shopify theme dev` against the live theme (PRODUCT.md:74).

---

## 9. What agents CANNOT know offline (fill in once the Shopify connector is back)

1. Which store the connector is on and its `myshopifyDomain` vs `spycpc-g0` / `casiffy`;
   the current MAIN theme id and whether #188689940725 is still main (section 1).
2. Active product list, status (active/draft/archived) for the 31 showcase handles, and
   whether each handle still resolves.
3. Per product: exact option names (Color/color/Colour, Model, Applicable model(s)),
   option order, every model value string, variant count, prices, compare-at prices,
   inventory tracking and policy (deny vs continue), availability per model.
4. Collections that exist (`iphone`, `frontpage`, `all`, any `samsung`), their product
   counts and sort; contents of menus `main-menu` and `footer`.
5. Automatic discounts currently live (still 18% / 31%, min qty 2 / 3, all items?).
6. Metafields: `custom.sold_recently`, `custom.total_sold`, `custom.og_image`,
   `reviews.rating`, `reviews.rating_count` per product; whether a review app is
   installed and writing ratings.
7. Enabled payment types and wallets; markets/currencies.
8. Admin page bodies for return-policy, shipping-policy, track-order, faqs, about-us
   (whether "prepaid label" still appears; any remaining conflicts); legal policies set.
9. Shipping profiles and rates (does checkout actually charge $0 everywhere?).
10. Shop contact settings (email, phone, address) as currently set.
11. Whether the live theme editor has changed templates since the backup (2026-10-18
    folder date): re-pull before any push and diff against section 2.
12. Real customer reviews, clips or testimonials, if any now exist.
