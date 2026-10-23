# cv-campaign-guide ("Campaign: case guide")

## Status

LIVE in `templates/page.campaign-guide.json` (section key `guide`, :3-62), the only template that places it.
Not in any `sections/*-group.json`. `disabled_on: header, footer` (sections/cv-campaign-guide.liquid:232).
Reachability caveat: the template only renders for a Shopify page assigned the `campaign-guide` suffix;
`/pages/campaign-guide` returned 404 on 2026-10-03 (PRODUCT.md:74, STORE-FACTS.md:188-189). Whether a page now
uses it is store data (check with the merchant before claiming it is seen by shoppers).

## Purpose

Ad landing page ("match the specific promise in the ad", :186): hero with headline, intro, the featured product's
real photo and live price, an optional live review rating (product `reviews.rating` metafields), a numbered list
of "reasons" (merchant blocks, optionally illustrated with the product's own photo N), optional real customer
quotes or an `@app` review block, a pack offer panel (1 / 2 / 3 cases with typed percentages), and an FAQ
(`<details>`). Every CTA links to the featured product page (:4-9) where the model and pack are chosen.

## Files (owned / shared)

Owned:
- `sections/cv-campaign-guide.liquid`
- `assets/cv-campaign-guide.css` (88 lines, fully static: no transitions, keyframes or reduced-motion block;
  only consumer, loaded at sections/cv-campaign-guide.liquid:1)
- `templates/page.campaign-guide.json` (only section on the template)
- Locale keys `sections.campaign_guide.*` (locales/en.default.json:204-225). The locale FILE is shared; only these
  keys are owned.

Shared:
- `snippets/cv-stars.liquid` (rendered at :61; also used by ~20 sections/snippets: cv-pdp-reviews,
  cv-product-counter, cv-trustpilot, cv-ugc, review-widget, snippets/cv-product-summary, cv-store-ratings, ...)
- `layout/theme.liquid`: no loader keys off this section's markup. On the `page` template `shop_page` is true
  (layout/theme.liquid:166-167), so GSAP core + ScrollTrigger + SplitText + CustomEase/Bounce/Wiggle + DrawSVG +
  Flip + MotionPath are already loaded (theme.liquid:173-184, snippets/gsap.liquid:22-36), and `cv-pages.js`
  loads (theme.liquid:338-341). `cv-motion.js` loads on every page (:220).
- `snippets/cv-quick-pick.liquid` + `assets/cv-quick-pick.js` (NOT used today; available opener API, see
  Motion opportunities 1). Gate: theme.liquid:208-209, :295-296.

## Store adaptation findings

1. HIGH (dash rule): en dash "1–3" in shopper copy, three places:
   - locales/en.default.json:209 `assurance`: "Free shipping · 30-day returns · Dispatch in 1–3 business days"
     (printed at :71 and :156).
   - templates/page.campaign-guide.json:36 ("Orders dispatch in 1–3 business days") and :57 ("within 1–3
     business days").
   - Schema preset sections/cv-campaign-guide.liquid:230 (same sentence; ships when the section is added).
   Fix: "1 to 3 business days" (the confirmed wording, PRODUCT.md:34) in all four.
2. HIGH (price honesty): pack percentages are typed in this section (`pack_2_percent` 18, `pack_3_percent` 31;
   schema :196-197, template :10-11) and printed as "Save 18% on each" (:149-150). They must equal the live
   automatic discounts ("18% / 31% off entire order, minimum quantity 2 / 3", PRODUCT.md:39, checked
   2026-09-15). Keep the `info` warning (:196) and add the same warning to `pack_3_percent` (:197 has none).
   Re-verify the admin discounts before shipping. Hide a tier whose percent is 0 (today 0 prints "Save 0% on each").
3. MEDIUM (store data binding): the offer panel shows no money at all ("Regular price", "Save N% on each",
   :148-150) although the featured product is known. Fix: compute from
   `guide_product.selected_or_first_available_variant.price` (or `price_min` with the "From" prefix when
   `price_varies`): 1 case = price, 2 cases = price x 2 x (1 - p2/100), 3 cases = price x 3 x (1 - p3/100), each
   `| money`, plus the saved amount. This is the same derivation cv-pdp-value uses (live x merchant percent).
   Keep the percent line; show money only when `guide_product != blank`.
4. MEDIUM: rating string is not pluralised: `sections.campaign_guide.rating` "{{ rating }} / {{ maximum }} from
   {{ count }} reviews" (locales :210) prints "from 1 reviews". Fix: `{ "one": "... from 1 review", "other": "...
   from {{ count }} reviews" }` and pass `count:` (Shopify pluralises on `count`). Also round `rating_value`
   to one decimal (`| round: 1`) before printing (:44, :62); raw metafield values can be "4.8333".
5. LOW (copy vs photo): reason blocks point at product photo 2 and 3 (template :19, :28; preset :228-229) with
   captions that assert what is in the photo ("Check the camera opening and the fit for your model.", "A closer
   look at the finish and details."). Products carry up to ~50 unordered images with no alt text
   (PRODUCT.md:32), so the caption can describe the wrong photo. Fix: merchant picks the photo explicitly
   (image_picker) or the caption becomes neutral ("Photo {{ n }} of {{ product.title }}"). Flag to merchant.
6. LOW: `hero_alt` falls back to product title (:19) because product images have no alt text (PRODUCT.md:32).
   Acceptable; reason images reuse the same title for every image (:106), so alt text repeats. Prefer
   `block.settings.caption | default: guide_product.title`.
7. LOW: testimonial blocks (:210-216) accept typed quotes. Schema info already says "real customer review you
   have permission to display" (:213). No review app is connected yet (PRODUCT.md:105); the template has no
   testimonial blocks, keep it that way. Prefer the `@app` block once the review app exists.
8. MEDIUM: count baked into copy. `reasons_heading` default "Three things to check before you choose"
   (locales :213, used at :16-17, :94) is printed whatever `reason_count` is (1 to 6, block limit :201). Fix:
   count-neutral default ("What to check before you choose") or interpolate `reason_count` with pluralised keys.
9. OK: candy is not presented as product; no other brand; no hardcoded currency (uses `| money`); no phone
   model list (model choice is deferred to the product page). Heading/intro defaults come from locales and read
   as Casify phone-case copy (locales :205-206).

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Free shipping" / "Shipping is free on every order" / "Free shipping comes with every order" | locales :209; template :36, :57; preset :230 | BACKED: PRODUCT.md:34 |
| "30-day returns" / "30 days to return your case" | same | BACKED: PRODUCT.md:34 |
| "Dispatch in 1–3 business days" | same | BACKED (PRODUCT.md:34) but en dash violates the dash rule (finding 1) |
| "Save 18% on each" (2 cases), "Save 31% on each" (3 cases) | :149-150 via settings, template :10-11 | MERCHANT-TYPED, matches PRODUCT.md:39 live automatic discounts as of 2026-09-15; must be re-verified (finding 2) |
| "Pack savings apply automatically at checkout. No code needed." | locales :223 (offer_note), printed :155 | BACKED: PRODUCT.md:39 (automatic discounts) |
| "Choose each case's colour and phone model on the product page." / FAQ "Yes ... choose the colour and phone model for each case" | locales :217; template :50 | BACKED: PRODUCT.md:38 (mix-and-match packs, snippets/cv-pack-slots.liquid) |
| Star rating "{{ rating }} / 5 from {{ count }} reviews" | :59-64 | LIVE: product `reviews.rating` / `reviews.rating_count` metafields, hidden when absent (:41-46). Correct pattern. |
| Price "From $X" in photo caption | :83 | LIVE: `guide_product.price_min` |
| Customer quotes | :129-134 | MERCHANT-TYPED; none placed. Must be real (finding 7) |

No drop heights, guarantees, counts or performance figures.

## Motion inventory

- data-cv-* attributes: none. No section JS. CSS has no transitions (even button hover and FAQ "+" rotation at
  cv-campaign-guide.css:16, :65 are instant).
- GSAP: none used by this section, though the page template already ships ScrollTrigger, SplitText, Flip,
  MotionPath, DrawSVG, CustomEase/CustomBounce (see Files).
- Reduced motion: nothing to reduce today.
- No-JS: fully readable (static page). FAQ uses native `<details>`.
- Theme editor events: not needed today (no JS).

## Motion opportunities

Implement in a NEW owned file `assets/cv-campaign-guide.js`, printed by the section itself
(`<script src="{{ 'cv-campaign-guide.js' | asset_url }}" defer></script>`, the way cv-reel-showcase.liquid:142
does) so no shared layout edit is needed: deferred section scripts run after the deferred GSAP bundle in
`<head>` (snippets/gsap.liquid header). House shape: MOTION-SYSTEM.md 4.1-4.6 (pending class with timeout,
`gsap.matchMedia` for reduced motion, `shopify:section:load/unload/select` like cv-apps.js:106-117). Prefix
`cvcg`. Do NOT use `data-cv-reveal` on the CTA, price or tiers (it hides content without JS, MOTION-SYSTEM.md
3.4.1).

1. HIGH (Add to cart / buy box): turn the hero and offer CTAs into quick-pick openers so a shopper can choose
   colour and phone model and add the real variant without leaving the landing page. Markup: keep the `<a href>`
   (no-JS path) and add `data-cvqp-open data-handle="{{ guide_product.handle }}" data-url="{{ guide_product.url }}"`
   when `guide_product != blank` (cv-quick-pick.js:228-229 delegates clicks on any `[data-cvqp-open]` and calls
   `preventDefault`; the layout gate at theme.liquid:208, :295 picks it up automatically). The dialog already
   animates with GSAP and never guesses a model (cv-quick-pick.js:1-11). Then listen for `cv:cart` on document
   (cv-quick-pick.js:58) to play a "ticket stamped" confirmation on the offer panel (scale 1.4 -> 1, rotation
   -8 -> -3, 160ms, `back.out(3)`), and optionally call `window.Casify.openDrawer()` (cart.js:184-187) since
   quick pick does not open the drawer (MOTION-SYSTEM.md 5.7).
2. HIGH (packs/bundles): after finding 3 adds live tier totals, choreograph the offer panel on scroll: the three
   tier rows stamp in as tickets (stagger 0.12, `back.out(2)`), the totals roll up with a GSAP proxy tween
   formatted by the shop money format (`window.themeMoneyFormat`, theme.liquid:155; format helper pattern
   cv-pdp-video-reviews.js:43-59). Final text is the Liquid value (no-JS state). ScrollTrigger `once: true`,
   start `top 80%`.
3. MEDIUM (scroll reveal): hero entrance. SplitText words on the h1 (`mask: 'words'`, yPercent 110 -> 0,
   stagger .05; revert on complete), the product photo hangs in like a shop sign (rotation -6 -> 0 with
   `elastic.out(1, .4)`, transformOrigin top center), the price ticket in the figcaption stamps. Text and price
   stay visible under the pending class; only the photo and decoration are hidden.
4. MEDIUM: reasons list. `ScrollTrigger.batch('.campaign-guide__reason')`: number badge pops (scale .4 -> 1,
   rotation -40 -> 0), copy rises 16px, illustrated photo wipes in with `clipPath: inset(0 0 100% 0)` -> 0.
5. LOW: FAQ: animate `<details>` height open/close with GSAP (intercept summary click, tween height, then set
   `open`); rotate the "+" 160ms. Skip entirely under reduced motion (native toggle). Add CSS transitions for
   button hover (`translateY(-1px)`, 160ms) per DESIGN.md Buttons.
6. Reduced motion: `gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', ...)`; under reduce nothing
   is hidden and the quick-pick behaviour still works (it is commerce, not motion).

## Risks

- Pack percent is a price claim typed in two places (this section and the product templates' tiers). Any
  animation that emphasises the saving must use the section values only, and the merchant must keep them equal
  to the admin automatic discounts (PRODUCT.md:33, :39).
- Quick pick adds to cart from a non-product page: verify it on the `page` template (the gate is
  markup-based, so it loads) and that `cv:cart` re-renders the drawer (cart.js:171).
- The template may currently be unreachable (no page assigned); confirm before prioritising this section.
- `locales/en.default.json` and `layout/theme.liquid` are shared files; only the `campaign_guide` keys are this
  section's. Do not touch other keys (locales :15-17, the shared `general.meta` descriptions, carry the same
  "1–3" and belong to the layout, STORE-FACTS.md 7g).
