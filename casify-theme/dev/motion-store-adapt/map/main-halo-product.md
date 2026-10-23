# main-halo-product ("Halo — Main product")

Family: buybox-alt. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**orphan**: placed in no template and no section group. Its JS partner `assets/halo.js` is gated on
`content_for_layout contains 'halo-'` (layout/theme.liquid:216-218) but returns immediately because it
requires a `.halo-tpl` element (halo.js:19-20) and the layout only ever sets `cv-tpl`
(layout/theme.liquid:196-201). halo-closer.liquid:1-11 documents the same dead path.

## Purpose

A template-pack product page ("Halo", a fictional clear-case brand): announcement marquee, gallery
with a 12 ft drop-height rail, buy box (social proof, rating, subtitle, price, low-stock line, option
pickers, offer ladder with per-case slots, Add to bag, dispatch countdown, payment icons), "Screen
Promise", USP list, accordions (description, metafield specs, block accordions), sticky mobile ATC,
inline variant/cart script (:401-616) and JSON-LD.

## Files (owned / shared)

Owned:
- `sections/main-halo-product.liquid` (markup + inline commerce script)

Shared (do not edit from this lane):
- `assets/theme.css` (all `.halo-*` styles: :3335-3350 bar, :3353+ grid, :3592-3607 CTA, :3877-3903 sticky, :3905-3921 motion primitives, :3479 `#haloAddBtn` settle animation)
- `assets/halo.js` (also halo-closer; dead today)
- `assets/cart.js` (single-case submit path via `data-cart-add-form`, `window.Casify.*`)
- `layout/theme.liquid` (halo.js gate)

No owned CSS/JS file exists. A lane implementing this section should create `assets/cv-halo-pdp.css` / `.js` (new, owned) rather than editing theme.css or halo.js.

## Store adaptation findings

This section is the worst fit in the family: most defaults are another brand's fabricated claims.
Recommendation: do not place it. If the merchant wants it, rebuild the buy box on cv-product.js
semantics; otherwise leave orphaned and scrub defaults so an accidental placement is honest.

1. **H, rating always rendered** with defaults "4.8 · 12,480 reviews" (:138-141, schema :645-646); no toggle. "4.8 stars from 12,480 reviews" is listed as NOT verified (PRODUCT.md "Evidence on Hand"). Fix: render only from `product.metafields.reviews.rating` / `rating_count` when count > 0 (as main-best-product.liquid:5-6, :85-87), remove the text settings.
2. **H, subtitle default** "12-foot drop protection in a case 2.8 mm thin — with a MagSafe hold twice the industry norm, and a coating that never turns yellow." (:146). Unbacked + em dash. Fix: default blank; fall back to nothing.
3. **H, price note default** "Free shipping over $45 · 90-day trial" (:161). Contradicts confirmed facts (free shipping on all orders, 30-day returns). Fix: default "Free shipping · 30-day returns · Ships in 1 to 3 business days".
4. **H, hard-coded drop rail** "12 ft ... 0 — concrete", "Verified drop height · MIL-STD 810G · 26 drops" (:33-38). Unbacked. Fix: delete the rail markup.
5. **H, fake dispatch countdown** "In stock · ships today if you order in 4h 12m" (:301); halo.js would count to 19:00 UTC (halo.js:117-126) but is dead, so the static "4h 12m" ships. PRODUCT.md: no order-by countdown, dispatch 1 to 3 business days. Also "In stock" is printed regardless of availability. Fix: "Ships in 1 to 3 business days" + live availability.
6. **H, Screen Promise always rendered** (:313-322), default "...we pay the repair — up to $200, once per case." Listed NOT verified. Links to `#halo-promise-faq` which does not exist. Fix: remove the block or gate behind an off-by-default checkbox with blank defaults.
7. **H, USP fallback when no blocks** (:336-342): 12ft / DropCore™ / 26 drops / 4× Apple's test height, 1400g MagLock™, 0Δb ClearGuard™ 36 months, 2.8mm / 24g, 1.4mm lip. All unbacked, invented trademarks. Fix: delete the fallback; render nothing without blocks.
8. **H, offer ladder prices are typed dollars, not store prices** (:250-263): `data-each` default 39, `data-was` default 69, printed as `${{ b.settings.each }}` with a hard-coded `$`. The CTA total uses `v.price * qty` (:469-475) without the discount, so the ladder, the button and checkout (18% / 31% automatic discounts) all disagree. Violates "price on the page is the price at checkout". Fix: compute per-case from `current_variant.price` and a `discount_pct` setting exactly as cv-product.liquid:256-261; JS total = price x qty x (1 - pct) rounded to cents.
9. **H, `show_trademark` default true** adds "™" to every product title (:144, :643). Unbacked trademark claim. Fix: default false or remove.
10. **H, preset blocks** (:715-751): bar items "Free shipping over $45", "90-day case trial", "Screen Promise — up to $200", "Ships in 24h from Austin, TX"; checks "12 ft drop rated, lab-verified", "Full-speed MagSafe & Qi2 charging", "Stays crystal clear for 3 years"; USPs as in 7; tiers "free shipping over $45", "+ free ArmorGlass protector", "3 cases + free screen protector"; accordions "One Halo case ... CAD file", full specs (MIL-STD-810G 516.6, 1,400 g, Qi2 25W, 2.8 mm, 24 g), Screen Promise terms. Every one is unbacked or contradicts confirmed facts. Fix: replace presets with honest blocks (service facts only) or no presets.
11. **M, wrong-domain default** `benefit_check` "26 essential vitamins & minerals" (:681). Supplement template leftover. Fix: blank default.
12. **M, other brand "Halo"**: stage badge default "Clear · Halo" (:42, :667), section/preset name "Halo — Main product" (:640, :716), accordion copy "Halo case". Fix: badge from `current_variant.title` (JS already writes it, :466), name "Casify product page (alt)".
13. **M, fake social proof defaults** "Alex, Jordan" and "2,457 others are loving this" (:131-133, :651-653). Off by default (:648) but the defaults are fabricated. Fix: remove the strip or blank defaults.
14. **M, broken links/data**: breadcrumb hard-codes `/collections/cases` (:6) (may 404); use the cv-product.liquid:85-95 collection logic. "Not sure? Find my model" (:202) shows on option index 0 even when it is the style option and links to `#halo-faq` (absent). Rating link `#halo-reviews` (:140) absent.
15. **M, money in JS hard-coded USD**: `'$' + (cents/100).toFixed(2).replace(/\.00$/, '')` (:424). Use `shop.money_format` via a data attribute (cv-product.liquid:103 pattern).
16. **M, unescaped option output**: `{{ lbl_prefix }}`, `{{ current_variant.options[opt_index] }}`, `{{ value }}` (:201, :236, :284). Add `| escape`.
17. **M, dashes**: em/en dashes in shopper copy at :37, :146, :182 ("Low stock — only N left"), :299 / :449 / :670 ("Add to bag — "), :320, :337-338, :693, :720, :725-726, :731-732, :741. Fix: "Add to bag ·" or "Add to bag, $X"; "Only N left"; "2 cases, save 18%".
18. **L, low-stock line** (:179-184) is LIVE and honest (tracked inventory, threshold setting); keep, fix the dash.
19. **L, metafield specs accordion** (:356-375) is the right pattern (LIVE Shopify category metafields); keep it and reuse elsewhere.
20. **L, per-case slots** (:276-291, :499-536) use `<select>` per option including model; they do not mark sold-out combinations. cv-pack-slots.liquid is the house version; prefer rendering that snippet (shared, read-only).

## Claims register

| Claim | Where | Status |
|---|---|---|
| 4.8 · 12,480 reviews, ★★★★★ | :138-141 | UNBACKED (explicitly listed as not verified) |
| "Alex, Jordan and 2,457 others are loving this" | :131-133 | UNBACKED (off by default) |
| 12 ft drop, MIL-STD 810G, 26 drops, 4× Apple test height | :33-38, :146, :337, presets | UNBACKED |
| 2.8 mm thin, 24 g, 1.4 mm lip | :146, :340-341 | UNBACKED |
| MagSafe hold twice the industry norm, 1,400 g, 18-magnet array, 800–900 g comparison | :146, :338 | UNBACKED |
| Never turns yellow, 0Δb, 36 months | :146, :339 | UNBACKED |
| Free shipping over $45 / 90-day trial | :161, presets | CONTRADICTS confirmed facts |
| Ships today if you order in 4h 12m; In stock | :301 | UNBACKED / contradicts dispatch window |
| Screen Promise up to $200 | :319-320, presets | UNBACKED |
| Ships in 24h from Austin, TX | preset :721 | UNBACKED |
| Free ArmorGlass protector with 3 cases | preset :732 | UNBACKED |
| Tier prices $39/$32/$27, was $69/$39, "save $14/$36" | :253-263, presets | MERCHANT-TYPED, and wrong vs live prices |
| "SAVE N%" on price row | :155, :455 | LIVE (variant compare-at) |
| Low stock, only N left | :182 | LIVE |
| In stock / Sold out per model | :236 | LIVE |
| ™ on product title | :144 | UNBACKED |
| Payment icons | :303-309 | LIVE (`shop.enabled_payment_types`) |

## Motion inventory

- cv-motion attributes: none.
- CSS only (theme.css, shared): `.halo-pdp.halo-stagger` children rise on load via `cm-rise` (theme.css:3908-3916), ends visible, no JS needed; `#haloAddBtn` one-shot `cv-cta-settle` at 1.1 s (theme.css:3479, keyframes :1409); `.halo-bar__track` infinite marquee 36 s (theme.css:3343-3349), paused only under reduced motion (:3918-3921), **no pause control** (DESIGN.md Do: auto-running motion needs a pause path); sticky slide `transform` transition (:3878-3893).
- `halo.js` (dead): reveal observer, arrow-key radiogroups, sticky visibility, countdown. Consequence: no keyboard arrow support, sticky ATC never becomes visible (`.is-visible` never added), countdown frozen.
- Inline script (:401-616): state only, no animation. Multi-case add stops propagation so cart.js does not double-post (:566-571); single-case add goes through cart.js (drawer opens).
- GSAP: none. Reduced motion: universal kill switch theme.css:3307-3314 plus :3918-3921. No-JS: buy box renders and the form posts natively (qty from hidden input, default 1, the ladder's choice is lost). Theme editor: no section:load handling (inline IIFE runs once per render, acceptable because the script is re-inserted with the section).

## Motion opportunities

Only worth doing if the merchant places this section after the honesty rebuild. In this theme's idiom:

1. **(High) Offer ladder = pack choreography**: on tier change, Flip the selected ring between tiers (`Flip.getState('.halo-tier')`, toggle `aria-checked`, `Flip.from` 0.42 s soft-out), reveal per-case slots with a height tween + staggered rise (0.06 s), and wipe the CTA total. Flip is loaded on product templates (layout/theme.liquid:173-177).
2. **(High) Add to bag**: dispatch `cart:refresh` + `cart:added` after the multi-case add (:598-601) and fly the case photo to `#bagBtn` (MotionPath with straight fallback). Replace the dead countdown with nothing.
3. **(High) Sticky ATC**: re-home the sticky logic from dead halo.js into a new owned file with ScrollTrigger (`trigger: '#haloAddBtn', onToggle`), and add a Buy now (`[data-cv-buy-now]`-style) beside it.
4. **(Medium) Scroll reveals** for accordions and USPs: `data-cv-stagger` + `data-cv-reveal` on the USP list is acceptable (non-commerce), but only after the no-JS fix in MOTION-SYSTEM.md 3.4; otherwise GSAP `from` with `opacity .75` start like best-product.js:185.
5. **(Low) Marquee**: replace with a ScrollTrigger velocity marquee (cv-spotlight idiom) plus a pause button, or drop it.

## Risks

- Placing this section as-is publishes a dozen fabricated claims at once. Treat any placement as blocked until findings 1-10 are fixed.
- Every visual rule lives in shared `theme.css` and is also used by `bundle-buybox` (it reuses `.halo-buy`, `.halo-rating`, `.halo-price-row`, `.halo-cta`) and the other `halo-*` sections. Do not restyle `.halo-*` globally from this lane.
- Fixing `halo.js` (restoring `.halo-tpl`) revives the countdown and the yellowing scrubber verdicts for every halo section; do not do it. Move needed behaviour into a new owned file.
- `money()` and the typed ladder prices can show a total different from checkout: a conversion and trust risk, not only cosmetic.
