# facebook-testimonials ("Facebook testimonials")

File: `sections/facebook-testimonials.liquid` (261 lines). Family: reviews-2.

## Status

**live**, but renders nothing to shoppers today.

- `templates/index.json:1371-1437`: key `facebook_testimonials`, enabled, order position 16 of 21. Settings: heading "Seen on Facebook" (:1432), accent "From our community" (:1433), layout carousel (:1436), `float_cards: true` (:1437). Its 3 `post` blocks are all empty.
- `templates/product.json:781-847`: same settings and 3 empty posts, enabled, order position 15 of 22.
- Storefront gate: `facebook-testimonials.liquid:22` renders only when `post_count > 0` (a block with both author and post_text) or in the theme editor. With empty blocks the storefront output is empty. The editor shows the empty hint (:172-177) and draft placeholders (:179-187).
- **Contradiction to flag:** PRODUCT.md:65 says the merchant dropped "Facebook testimonials" from `templates/product.json` on 2026-09-28 (backup `dev/product-json-removed-facebook-testimonials-2026-09-28.json`), but product.json:782 has it again. It probably came back with the 2026-10-03 live re-push (PRODUCT.md:74). Re-pull the live template before any push. Do not add or remove the instance without the merchant.

## Purpose

A hand-curated wall of Facebook posts (author, avatar, text, image or video, optional reaction, comment and share counts typed from the original, up to 2 replies, link to the original). It does not sync with Facebook (schema info :201). It shows as a carousel (shared `.ccr` rail and controls) or a grid. An optional CSS "float" makes the cards drift.

## Files (owned / shared)

Owned (used only by this section):
- `assets/casify-facebook-testimonials.css` (144 lines): post card, grid, float keyframes. Only `sections/facebook-testimonials.liquid:2` references it.
- Locale keys `sections.facebook_testimonials.*` in `locales/en.default.json:143+` (heading, carousel_label, previous_post, next_post, position, view_post, new_window, video_label, editor_hint, editor_draft). They contain no dashes.

Shared (do not edit in a per-section pass):
- `assets/casify-customer-reviews.css` (309 lines): `.ccr` shell, rail and controls. Also used by `sections/customer-reviews-carousel.liquid` and `sections/trustpilot-reviews.liquid`, and `assets/casify-trustpilot-reviews.css` builds on it.
- `assets/casify-customer-reviews.js` (169 lines): the carousel controller (`data-casify-customer-reviews`, `data-ccr-*`). Also printed by customer-reviews-carousel and trustpilot-reviews. It is guarded against double execution (:4-7).
- `snippets/cv-icon.liquid` (icons `heart`, `arrow-right`), used theme-wide.
- No layout gate. The section prints its own CSS and JS tags (:1-3). `layout/theme.liquid` has no loader keyed to `cvfbt` or `ccr`.

## Store adaptation findings

1. **Honest by construction, no demo content.** Posts ship empty, the preset has 3 empty blocks (:254-258), and counts are blank with placeholder hints only (:242-244). Keep it that way. No change needed.
2. **The Facebook brand mark is the only icon** (:66-68, :149-155). This is fine as attribution of real posts. When a post has no `source_url`, the Facebook "f" still implies the post came from Facebook. Fix: render `.cvfbt__source` only when `block.settings.source_url != blank`, or add a "Posted on" select (Facebook / Instagram / Email) so the icon matches the real source.
3. **Copy is generic, not Casify.** Defaults are "Seen on Facebook" / "From our community" (:199-200). These are acceptable, but they do not mention cases. Suggested on-voice defaults (no dashes): heading "Seen on Facebook", accent "Letters about our cases". Optional intro: "Posts from people who bought a Casify case, copied word for word." The intro is a factual description of how the section is filled; ship it only if the merchant agrees.
4. **Reaction, comment and share counts are free text** (:96-116, :242-244). That is allowed as merchant-typed copy of a real post, but it is a number shown to shoppers. Fix: add schema `info` "Copy the exact number from the original post on the day you add it". Rendering the counts only when `source_url` is present lets shoppers verify them. No count is ever defaulted.
5. **"Date or time" is free text** (:233). Relative values like "2 weeks ago" go stale. That is the same problem logged for review-widget in STORE-FACTS 7a. Fix: change the info to "Use the original date, for example 12 Sep 2026; relative times go out of date".
6. **No product or catalogue binding.** A post cannot say which case or phone it shows. Recommended adaptation: add an optional `product` block setting ("Case in this post"). When set, render a small ticket under the post: product title, escaped, linking to `product.url` (and `?variant=` if a colour is typed). On the product template, show the block only when the setting is blank or equals `product.id`, the same pattern as `snippets/cv-video-reviews.liquid:73`. Never invent a model.
7. **Escaping:** `post_text` is richtext and printed raw (:71), which is expected for richtext. Every other field is escaped. `source_url` is escaped (:150). OK.
8. **Float animation is always on in the template** (`float_cards: true` at index.json:1437 and product.json:847). It runs infinitely with no visible pause control and no offscreen pause (casify-facebook-testimonials.css:131-138). See Motion inventory.

## Claims register

| Claim (shopper-facing) | Where | Status |
|---|---|---|
| "Seen on Facebook" (implies the posts exist on Facebook) | schema :199; index.json:1432; product.json:842 | Conditional. True only when the blocks are real posts; the section is hidden while empty. OK |
| "From our community" | :200; index.json:1433; product.json:843 | Neutral. OK |
| Reaction, comment and share counts | block settings :242-244 | MERCHANT-TYPED. Blank in every template; never defaulted. Unbacked unless copied from a real post |
| Author names, replies, dates | block settings | MERCHANT-TYPED. Blank everywhere |

No ratings, review counts, customer counts, guarantees or performance claims exist in this section.

## Motion inventory

- cv-motion attributes (`data-cv-*`): **none**.
- Section JS: `casify-customer-reviews.js` is behaviour, not motion: smooth scroll on prev/next, which becomes `auto` under reduced motion (:76-79). It handles `shopify:section:load`, `shopify:section:unload` and `shopify:block:select` (:158-168).
- CSS motion: optional float keyframes `cvfbt-float-up` / `cvfbt-float-down`, 4.5 s infinite, inside `@media (prefers-reduced-motion: no-preference)` (casify-facebook-testimonials.css:131-138). It pauses on hover and focus-within only.
- GSAP: none. No entrance choreography. The cards are simply there.
- Reduced motion: the float is off and the scroll is instant. OK.
- No-JS: fully readable. The rail is a native horizontal scroller with CSS snap (`casify-customer-reviews.css:86,107`), and the controls stay `hidden` (:162) until the JS unhides them.
- Gaps: (a) the infinite float has no explicit pause path and keeps running offscreen and in hidden tabs, against DESIGN.md:183 and :192 ("Long-running ambient motion pauses offscreen"; "give animation an explicit pause path when it auto-runs"); (b) no scroll entrance.

## Motion opportunities

Ordered by value. The section is placed on both index and product, but it only matters once real posts exist.

1. **(High, needed for compliance) Make the float stoppable and pause it offscreen.** Add an owned script `assets/cv-facebook-testimonials-motion.js`, gated in layout by a new unique attribute `data-cvfbt` printed on the `<section>`. Gate: `{%- if editor or content_for_layout contains 'data-cvfbt' -%}`. The script adds an IntersectionObserver that toggles `.is-offscreen { animation-play-state: paused }` and a `visibilitychange` pause. Also add a small "Pause motion" toggle (label-font pill, 44 px target) that renders only when `float_cards` is on. Alternative with no layout edit: move the float into GSAP (see 2) and drop the CSS keyframes.
2. **(High) "Pinned to the noticeboard" entrance** (GSAP + ScrollTrigger, owned file above). Posts are dealt onto the rail from the right with a slight alternating tilt (rotation +2 / -2, y 24, autoAlpha 0, then settle, 0.42 s soft-out, 0.08 stagger), the same idiom as cv-trustpilot.js:217-224. The avatar stamps (scale 0.6 to 1, `back.out(2)`), then the reaction row ticks in. Use the pending-class pattern (MOTION-SYSTEM 4.3): add `.cvfbt--pending` from JS only, with a 1400 ms timeout fallback, never unconditional CSS `opacity: 0`. Use `gsap.context` and `ScrollTrigger` with `once: true`. Revert on `shopify:section:unload`, and jump to the final state on `shopify:section:select` and `shopify:block:select`. Under reduced motion, do nothing.
3. **(Medium) Heading split.** SplitText the `<h2>` words with a mask. The heading contains a nested accent `<span>` (:33-35), so use SplitText, which keeps nested markup, not `data-cv-split`, which flattens markup (MOTION-SYSTEM 3.4.3).
4. **(Medium, product template only) "Back to the counter" link.** After the rail on `template.name == 'product'`, add a ghost button with `data-cv-scroll-to-buy` (cv-motion.js:235-241 scrolls to `#cvPdp`, which `sections/cv-product-counter.liquid:208` provides). Label "Choose your case" from a new setting. This is the only commerce tie-in that fits a social-proof section. Add-to-bag logic stays in the buy box.
5. **(Low) Video post:** add `data-cv-video-reduced-motion="pause"` only if autoplay is ever added. Today the video is `controls` with `preload="none"`, which is correct.

Buy box, packs, Add to cart, Buy now and the cart drawer are not in this section. Do not add commerce logic here.

## Risks

- Shared CSS and JS: `casify-customer-reviews.css` and `.js` also drive trustpilot-reviews and customer-reviews-carousel, which are live on index and product. Any rail or controls change belongs to a shared-file owner, not to this section's agent. Put new styles in `casify-facebook-testimonials.css` scoped under `.cvfbt`.
- Layout edit: a new gate in `layout/theme.liquid` is a shared file. Coordinate it, or have the section print its own `<script defer>` the way it already does at :3, which avoids touching layout.
- Product template is at 22 of 25 sections (PRODUCT.md:65). Never add sections to make room for this one.
- The live and local instance mismatch on product.json (see Status) must be resolved before pushing templates.
- Never fill the empty blocks with sample posts, even for previews. Use `dev/fb-testimonials-*.html` harnesses with clearly local data.
