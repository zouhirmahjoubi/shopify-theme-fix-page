# review-widget ("Review widget")

Paths are relative to `D:/Shopify Theme Fix & Page/casify-theme/`. Read-only pass, 2026-10-22.

## Status

LIVE on three templates:

- `templates/product.json` instance `review_widget_PcUppD` (type at :1032, six typed `review` blocks :1034-1105,
  settings :1115-1158). Position 21 of 22 in `order`, so it sits almost at the bottom of every product page that
  uses the default template (Shop Counter). It is the target of the buy-box star link: `reviews_anchor`
  `cvc-reviews` (templates/product.json:160, sections/cv-product-counter.liquid:436) matches the widget's
  `anchor` default `cvc-reviews` (sections/review-widget.liquid:497).
- `templates/article.reviews.json` instance `main` (only section, 0 blocks): honest subheading
  "Every review here was written by a Casify customer and read by us before it went up.", per_page 12.
- `templates/blog.reviews.json` instance `main` (only section, 0 blocks): same settings as the article template.

Not placed in any section group.

What a shopper sees on a product page today (from the template data; the blog post is store data and cannot be
checked offline, STORE-FACTS.md section 9 item 12): heading "What our customers say", subheading "Real reviews
from real people", a summary ticket "4.7" (avg of 5,5,4,5,5,4 rounded, :135-138), "Based on 6 reviews", star bars
(4 five-star, 2 four-star), then six cards each with "Verified buyer" and the date "2 weeks ago". Because every
block has `product: ""`, the same six reviews and the same 4.7 / 6 show on EVERY product (:113-116, :425-428).
If the blog post `customer-reviews/reviews` exists with moderated comments, the "Write a review" form also shows.

## Purpose

A first-party review system without a review app: shoppers submit a review through a Shopify blog comment form
(moderated in admin, :1-21), approved comments render as cards with a computed rating summary and per-star bars;
merchants can also type reviews as blocks (`review`, `photo_review`). "Photo review" blocks render one large
polaroid review (snippets/rw-photo-review.liquid). On a product page it lists that product's reviews first, then
other cases' reviews labelled "Review of [case]" (`scope`, :51-54, :433-465).

Data contract shared with the buy box: comments are stored as `rating § product-handle § Title § Text`
(:16-18); `snippets/cv-product-summary.liquid:5-8, :37` reads the same blog post to compute the stars under the
product title, and its "Be the first to review" link (`a[data-rw-write]`, cv-product-summary.liquid:133) is
handled by `assets/review-widget.js:227-235` to open this widget's form.

## Files (owned / shared)

Owned (only this section uses them):

- `sections/review-widget.liquid` (596 lines)
- `assets/review-widget.css` (330 lines; only `stylesheet_tag` at :26)
- `assets/review-widget.js` (387 lines; printed at :27): load more, form open/close, comment + contact-form
  posting, `rw:sent` event, `data-rw-write` hook, `shopify:section:load` (:386)
- `snippets/rw-review-card.liquid` (67 lines; rendered only at :415, :430, :463)
- `snippets/rw-photo-review.liquid` (56 lines; rendered only at :373)
- `templates/article.reviews.json`, `templates/blog.reviews.json` (each contains only this section)

Shared (coordinate; do not edit inside a per-section lane):

- `assets/review-motion.js` (1090 lines): printed by this section (:28) AND by sections/review-carousel.liquid:133.
  Holds both `initWidget` (:565-612) and `initCarousel` (:986-1074).
- `snippets/cv-stars.liquid` (used by 20+ files, incl. cv-product-counter, cv-social-proof, blocks/cs-*).
- `snippets/cv-product-summary.liquid` and `sections/cv-product-counter.liquid` (`reviews_anchor` :750,
  `reviews_article` :890): consumers of this widget's blog post, `§` format, anchor id and `data-rw-write`.
- `templates/product.json` (holds the six typed reviews; also holds every other product section).
- GSAP bundle (`snippets/gsap.liquid`, loaded in `<head>` by layout/theme.liquid:184) and three.js 0.186.0 from
  `https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js` (review-motion.js:34; same CDN URL used by
  10+ other theme scripts).
- No layout gate: the section prints its own CSS/JS; layout/theme.liquid has no `data-rw` condition.

## Store adaptation findings

1. HIGH, Product Principle 1 broken (PRODUCT.md:110 "Every number on a product page is true for the product it
   sits on"). Typed blocks with an empty `product` count toward the product-page summary on every product
   (pass 1 loop :109-133 adds every block; filter :114 only drops blocks tied to ANOTHER product). Result: every
   product shows "4.7, Based on 6 reviews" from six store-wide typed reviews.
   Fix (code, owned): in pass 1 and in the grid, treat blocks with blank `product` as store reviews: render them,
   but keep them out of `n_rated` / `rating_sum` / bars on product pages (or add a checkbox "Count typed reviews
   without a product in the rating summary", default false). When only store reviews remain, print
   `count_others_text` style wording ("from N reviews of our cases") instead of a product score.
2. HIGH, live typed content not backed (templates/product.json:1034-1105). Six reviews (Sarah M. 5, James K. 5,
   Lina R. 4, Omar B. 5, Emma T. 5, Noah P. 4), each `"verified": true` (:1042, :1054, :1066, :1078, :1090, :1102)
   and `"date": "2 weeks ago"` (:1041, :1053, :1065, :1077, :1089, :1101). PRODUCT.md:80 records the merchant typed
   them; PRODUCT.md:105 says no customer reviews are confirmed. "Verified buyer" requires a found order (block info
   :570, PRODUCT.md:76 "never claim verification without an order"); "2 weeks ago" is static and goes stale.
   Fix (template, shared file, needs merchant confirmation, do not silently delete): ask the merchant to confirm
   each review is a real customer's; untick `verified` unless an order was found; replace "2 weeks ago" with a
   month ("October 2026") or blank. If not confirmed, remove the blocks; the section then shows the honest empty
   state (:211-219) plus the form.
3. HIGH, schema default and live value "Real reviews from real people" (schema :485; templates/product.json:1118)
   asserts authenticity the theme cannot check (typed blocks bypass moderation). Fix: schema default and product
   value to "In customers' own words, published after we read them." (true for comment reviews; or blank). The
   article/blog templates already carry an honest line; keep it.
4. MEDIUM, the summary counts up and fills stars for numbers that are merchant-typed. review-motion.js:493-499
   counts the average from 0 and :490-492 sweeps the stars, regardless of whether the number came from approved
   comments, typed blocks or `override_avg` / `override_count` (:139-146). STORE-FACTS.md header: unbacked or
   merchant-typed values must not be "animated into more prominence". Fix: print
   `data-rw-source="comments|typed|override"` on `.rw-summary` (owned Liquid) and only count up for `comments`.
5. MEDIUM, `override_avg` with zero reviews renders a full summary with stars and `override_count` (:139-146,
   :211 condition `n_shown == 0 and override_avg == blank`), i.e. a rating with nothing to back it on the page.
   Fix: honour the override only when `n_rated > 0`, or label it with a required source text.
6. MEDIUM, photo reviews counted as grid reviews. Pass 1 counts every block type (:109-133) but `photo_review`
   blocks render in `.rw-spots` (:362-378), not the grid. With only photo reviews an empty `.rw-grid` prints
   (:380-381) and the "Load more" threshold (:468) is off. Fix: count `photo_review` separately; gate the grid on
   the grid count.
7. LOW, no-JS state: "Write a review" (:200-205) and "Load more reviews" (:468-471) render as live buttons but do
   nothing without JavaScript (behaviour in review-widget.js:33-45, :206-225). Cards are all visible without JS
   (good). Fix: print both buttons with `hidden` and unhide in review-widget.js, or make "Write a review" an
   `<a href="#rw-compose-...">` with a `:target` rule.
8. LOW, hardcoded English outside locales: `aria-label="Reviews"` (:187), "out of 5 stars" (:224;
   rw-review-card.liquid:30), "stars: " (:244), fallback author "Customer" (rw-review-card.liquid:23), editor
   hints (:352-357). Move to `locales/en.default.json` (shared file, coordinate).
9. LOW, em dash in the merchant alert email: `product_line ... append: ' [em] '` (:156, `[em]` marks the em dash in the source). Not shopper-facing (sent to
   the merchant via the contact form) but replace with `': '` for the project-wide no-dash rule.
10. LOW, editor info example echoes a banned claim locale: photo review `location` info "For example \"Austin,
    TX\"" (:585), cf. "Ships in 24h from Austin, TX" in PRODUCT.md:104. Change to "For example a city or country."
11. LOW, unused `star` colour setting (:554, info says "Not used"). Remove or leave; it ships nothing.
12. INFO, live dependency that cannot be verified offline: the form and the comment reviews need the blog post
    `customer-reviews/reviews` with comments "allowed, pending moderation" (:35-42, :150). If it is missing on the
    live store, the product page shows no form and no CTA (`cta_link` blank, product.json:1124). Check with the
    connector before the build.

No candy-as-product copy, no wrong product domain, no hardcoded prices or currencies, no phone model lists in this
section. Copy speaks of "case" correctly (form intro :515 "how your case fits, feels and holds up", back label
:533 "Back to the case").

## Claims register

| Claim shown to shoppers | Where | Status |
|---|---|---|
| "Real reviews from real people" | schema :485; templates/product.json:1118 | UNBACKED (PRODUCT.md:105: none confirmed; typed blocks bypass moderation) |
| Average "4.7" and "Based on 6 reviews" + per-star bars | computed :109-147 from typed blocks templates/product.json:1034-1105 | MERCHANT-TYPED, and not product-specific (breaks PRODUCT.md:110) |
| Six named reviews and their ratings | templates/product.json:1034-1105 | MERCHANT-TYPED (PRODUCT.md:80), not in Evidence on Hand (:105) |
| "Verified buyer" on all six | product.json `verified: true` x6; label `verified_label` :510 | UNBACKED (no order check recorded) |
| "2 weeks ago" on all six | product.json `date` x6 | UNBACKED and stale (static text) |
| Quote content: "fast shipping" (Sarah M.), "Shipping took a couple of extra days" (Lina R.), "Customer support was quick and friendly" (Omar B.), "packaging was lovely" (Noah P.), "Already ordered a second one as a gift" (James K.) | product.json:1040, :1064, :1076, :1100, :1052 | MERCHANT-TYPED |
| Comment-based average, count, bars | :69-107 from approved blog comments | LIVE (keep this path) |
| "We read every review before it's published." / "We read every one and publish it here once it's approved." | :525, :530 (and product.json) | BACKED by mechanism (moderated comments) only if the blog is set to moderation; true for comment reviews |
| "Every review here was written by a Casify customer and read by us before it went up." | templates/article.reviews.json, blog.reviews.json | BACKED by mechanism (those templates have 0 typed blocks) |
| `override_avg` / `override_count` | :139-146 (empty on all three templates) | MERCHANT-TYPED if ever set |

## Motion inventory

- `data-cv-*` attributes: none in the section or its snippets.
- Section motion JS: `assets/review-motion.js` (shared with review-carousel). Widget part:
  - `widgetEntrance` (:473-563): `gsap.context`, one paused timeline started by `ScrollTrigger.create({ start:
    'top 86%', once: true })` (:505-510): header rise (:487), summary ticket lift with -1.4deg (:488), star
    `--fill` sweep (:489-492), average count-up 0.9 s (:493-500), bars `scaleX` stagger (:501), CTA `back.out`
    pop (:502). Cards: `gsap.set(cards, {opacity:0, y:26})` (:516) then `ScrollTrigger.batch(start 'top 92%',
    once)` deal-in with alternating 1.3deg tilt (:517-531), avatar spin-in (:526-530); "Load more" cards dealt
    in on click (:534-541); star picker pop on `change` (:544-551); star burst (three.js) on `rw:sent` (:365,
    :576-581).
  - `candyStage` (:217-340): three.js scene of glossy decorative sweets (stars, peppermint discs, wrapped candies,
    :141-200) behind the heading and summary, loaded when within 400px (:596-611), paused offscreen (IO :288) and
    in hidden tabs (`visibilitychange` :314). Decorative only, `aria-hidden` host (:192). Sweets are set dressing
    here, not products (allowed by DESIGN.md:183 "sweets drift gently").
  - Photo reviews `initSpot` (:890-960) and `polaroidStage` (:673-889): polaroid drop with bounce, letter-by-letter
    name, then a three.js polaroid that tilts with pointer and scroll; only the first two get WebGL (:589-592).
- GSAP plugins used: core, ScrollTrigger (batch, create). No SplitText, Flip, Draggable.
- Reduced motion: `initWidget` returns before any entrance (:583); `starBurst` bails (:366); CSS
  review-widget.css:323-330 hides both three.js layers and removes transitions. Read once per init (no live
  `change` listener; MOTION-SYSTEM.md 4.4 prefers `gsap.matchMedia`).
- No-JS state: complete. No CSS-hidden start state; GSAP sets start states at runtime only. Cards, summary and
  bars render fully without JS (only the two buttons in finding 7 are inert).
- Theme editor: review-motion.js handles `shopify:section:load` (boot) and `shopify:section:unload` (destroy)
  (:1083-1089). No `shopify:section:select` / `shopify:block:select` "finish" handler (house shape
  cv-showcase-motion.js:363-393). review-widget.js handles `section:load` only (:386), no unload cleanup.

## Motion opportunities

1. HIGH (commerce bridge, buy box): this section is position 21 of 22 on the product page, far below the Shop
   Counter. Add a "Choose your phone model" control under the summary (setting, default label "Choose your phone
   model", product pages only) that returns to the buy box. Use the theme's existing hook `data-cv-scroll-to-buy`
   (cv-motion.js:234-240 scrolls to `.cv-buy` or `#cvPdp`; `#cvPdp` exists at sections/cv-product-counter.liquid:208),
   rendered as `<a href="#cvPdp" data-cv-scroll-to-buy>` so it also works without JS. Reduced motion: cv-motion
   already uses `behavior: 'auto'`. Do not add a second magnet (one magnet per element, MOTION-SYSTEM.md 7.2).
2. MEDIUM (add to cart without guessing a model): on "Review of [case]" cards (other cases on a product page,
   :433-465) and photo reviews tied to a product, add a small "Choose colour and phone" button with
   `data-cvqp-open data-handle="{{ handle }}" data-url="{{ url }}"` (contract: snippets/cv-card.liquid:79). The
   layout loads the quick pick dialog when markup contains `data-cvqp-open` (layout/theme.liquid:205-207); it
   resolves a real variant and never guesses a model (assets/cv-quick-pick.js:1-11). Pass the product through
   `rw-review-card` (owned snippet). Bag feedback: listen to `cart:added` (no listener today, MOTION-SYSTEM.md 5.2).
3. MEDIUM (honesty-gated motion): count up the average only for `data-rw-source="comments"` (finding 4); for
   typed/override sources show the final value with the star sweep only.
4. MEDIUM (editor): add `shopify:section:select` -> jump the entrance to its end (timeline `progress(1)`, deal
   all cards) and `shopify:block:select` -> scroll the selected card into view, following
   cv-showcase-motion.js:363-393. Lives in shared review-motion.js: coordinate with the review-carousel lane.
5. LOW (reduced motion live): wrap `widgetEntrance` in `gsap.matchMedia()` so a mid-session preference change
   reverts cleanly (MOTION-SYSTEM.md 4.4 shape 3).
6. LOW (performance): the product page runs this candy stage and review-carousel's ring back to back (positions
   21 and 22) plus cv-pdp-* WebGL above. Keep one candy stage per page (this one) and drop or gate the carousel's
   ring (see review-carousel.md).
7. Not here: packs, Buy now and cart drawer motion belong to the buy box lanes (cv-product-counter,
   cv-cart-drawer); this section only bridges to them (items 1 and 2).

## Risks

- `assets/review-motion.js` is shared with review-carousel: any edit must keep `initCarousel` intact and both
  boot selectors `[data-rw]` / `[data-rc]` (:1080-1081).
- The `§` comment format, the blog post handle `customer-reviews/reviews`, the anchor `cvc-reviews` and
  `data-rw-write` are a contract with snippets/cv-product-summary.liquid and sections/cv-product-counter.liquid.
  Do not rename.
- Fixing the live content means editing `templates/product.json` (shared) and needs explicit merchant confirmation
  before removing or changing customer quotes (PRODUCT.md:33, :41).
- three.js is fetched from a third-party CDN at runtime (review-motion.js:34). If jsDelivr is blocked the stage
  silently does not appear (static page still complete).
- `gsap.set(cards, {opacity:0})` (:516) hides every card at boot; if ScrollTrigger fails to fire (e.g. a layout
  shift after boot without refresh) cards stay hidden. Add a safety `gsap.delayedCall` or `ScrollTrigger.refresh()`
  on `window.load` per house rule 4.8.
