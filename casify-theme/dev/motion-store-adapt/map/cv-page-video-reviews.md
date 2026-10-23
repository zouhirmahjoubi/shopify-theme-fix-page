# cv-page-video-reviews ("Video reviews", content pages)

File: `sections/cv-page-video-reviews.liquid` (69 lines). Family: reviews-2.

## Status

**live** on `templates/page.json:26-29`: key `video-reviews`, `settings: {}` (all schema defaults apply), **no blocks**, order position 3 of 4 (after `main` / `sales-note`, before `offer-delivery`). With no clips the snippet renders nothing on the storefront (`snippets/cv-video-reviews.liquid:168`, `shown > 0`). The editor shows an empty-state card (:562-578). PRODUCT.md:72 records that the section was built 2026-10-03 for the Default page template. PRODUCT.md:82 records that no published page used that template at the time. Schema: `enabled_on: templates [page]` (:25), preset "Video reviews" with no blocks (:67), `max_blocks: 24`.

## Purpose

Customer video clips with star ratings and reviews on a content or landing page. It is a thin wrapper that renders the shared `snippets/cv-video-reviews.liquid` with `commerce: false` (:18). The page has no buy box, so the lightbox shows only the clip and the review, with no phone picker, price or "Add to bag". The header score is the plain average of the clips' typed stars (the page has no product, so no review-app rating applies).

## Files (owned / shared)

Owned:
- `sections/cv-page-video-reviews.liquid` only. Its schema (settings :26-43, block :45-64) is the only thing a per-section agent may change freely.

Shared (all edits need coordination):
- `snippets/cv-video-reviews.liquid` (579 lines): all markup, the score logic and the lightbox. It is rendered by `sections/cv-product-counter.liquid` (the live default PDP buy box, inline mode), `sections/cv-pdp-video-reviews.liquid` (orphan) and this section.
- `assets/cv-pdp-video-reviews.css` (692 lines): loaded by the snippet (:165) and by cv-product-counter.liquid.
- `assets/cv-pdp-video-reviews.js` (787 lines): loaded by the layout gate `layout/theme.liquid:298-301` (`editor or content_for_layout contains 'data-cvvr'`). `data-cvvr` is printed only by the snippet.
- `snippets/cv-stars.liquid`, `snippets/cv-icon.liquid` (icons video, play, pause, sound-on, sound-off, user-check, bag, close): theme-wide.
- GSAP, ScrollTrigger and SplitText from `snippets/gsap.liquid`.

## Store adaptation findings

1. **Default 5-star rating on every new clip (high).** Block `stars` is a range 1-5 with `"default": 5` (:55). The header score then reads "5.0 · Average of N video reviews" (snippet :102, :193) for every new block before the merchant types anything. Fix (owned): make it a `select` with a "No rating" `0` default, as cv-trustpilot.liquid:255-264 does. Snippet follow-up (shared): skip a clip's stars when `stars == 0`, and leave it out of `star_sum` and `shown` for the average (snippet :79-80, :287, :320). Hide the score ticket when no clip has a rating.
2. **Heading and lede defaults assert purchase (medium).** "Filmed by the people who bought it" (:28) and "Short clips from customers with their case on their own phone." (:29) are true only if every clip is from a buyer. Verified is opt-in and unticked by default (:58), so the defaults overclaim. Suggested defaults (no dashes): heading "Customer clips", lede "Clips customers sent us, in their own words. Tap one for sound and the full review." The merchant can restore the stronger line once the clips are verified buyers. The same wording on the product template (cv-product-counter) was accepted by the merchant (PRODUCT.md:76); this page default is a separate setting.
3. **No link from a clip to its case (high conversion value).** A page has no buy box, so a shopper who likes the case in a clip has no path to it. Fix: add an optional block setting `{"type": "product", "id": "product", "label": "Case in this clip"}` (owned schema). The snippet then needs an optional "Shop this case" ticket (product title, escaped, `product.price | money` from the real product, and `product.url`) when `commerce == false` and the block has a product. That is a shared snippet change: add a new param such as `shop_link: true` so the PDP homes are untouched. Model fit first: link to the product page; never add to cart from a page.
   - Note: the snippet already skips blocks whose `b.settings.product` differs from the page's `product` (:73, :231). On a page `product` is nil, so a block with a product set would be **skipped**. The new param must bypass that filter when `commerce == false`. This is the main trap for the implementer.
4. **Phone and colour are free text** (:61-62). That is acceptable as a typed caption. If finding 3 lands, the info can say "Use the phone model exactly as the product lists it". Never generate a model list here.
5. **Hardcoded English in the shared snippet:** "1 on video below" and "[n] on video below" (:185-187), "1 verified buyer" and "[n] verified buyers" (:199-201), "Watch/Open [name]'s review, N out of 5 stars" (:341), "Sound for ..." (:349), "Previous clips" and "More clips" (:396, :400), "Pause", "Sound", "Previous review", "Next review", "Read the whole review" and "Close" (:418-447, :519), plus JSON strings `adding`, `added`, `failed` and `rate` (:539-546). They all need locale keys. This is shared, so route it to the snippet owner.
6. **Fallback lede in the snippet differs from this schema:** "this case" (snippet :149) versus "their case" (:29). The fallback only applies when settings are blank, so there is no shopper impact on this section.
7. **No dashes in shopper copy.** The em dashes at :7-8 are in the Liquid comment only.
8. **`submit_url`** shows the "Filmed yours? Send it in" link only when set (snippet :404). OK. Suggest the contact page `/pages/contact` (a real page, STORE-FACTS 5) as the info example.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Score "N.N" + "Average of [count] video reviews" / "From 1 video review" | :31-32 defaults; snippet :86-103, :190-194 | Computed LIVE from MERCHANT-TYPED stars. **At risk:** a 5-star default makes an untyped rating look real (finding 1) |
| "[n] verified buyers" line and "Verified buyer" badge | snippet :197-203, :329-331; block :58 (default false) | MERCHANT-TYPED, opt-in. OK |
| "Filmed by the people who bought it" | :28 | **Conditional / unbacked by default.** Verified is not required (finding 2) |
| "Short clips from customers with their case on their own phone." | :29 | Same as above |
| Names, quotes, bodies, dates, "Filmed on [phone] · [colour]" | block :54-62 | MERCHANT-TYPED. No blocks on page.json |
| Price and "% off" in the lightbox | snippet :470-474 | Not rendered here (`commerce: false`, :459). If finding 3 lands, the price must come from `product.price` / variant data only |

## Motion inventory

All motion lives in the shared `assets/cv-pdp-video-reviews.js` and applies to this section whenever it has clips. **MOTION-SYSTEM.md:623 lists cv-page-video-reviews as "no motion"; that is incorrect.**
- `data-cv-*`: none. Own attributes: `data-cvvr`, `-split`, `-score`, `-score-num`, `-rail`, `-card`, `-video`, `-progress`, `-open`, `-sound`, `-pause`, `-step`, `-lb*`, `-review`, `-data`.
- Behaviour: muted autoplay when 60% visible (IntersectionObserver, js:120-133), one audible clip at a time, a visible "Pause clips" switch, pause in hidden tabs (:137-140), and no autoplay under reduced motion or Save-Data (:23-24, :73).
- GSAP entrance (js:748-779; ScrollTrigger `top 78%`, once): SplitText masked words on the `<h2 data-cvvr-split>`; the score ticket stamps in (scale 1.22, rotation -5, `back.out(2.2)`); the score counts from 0 and the stars fill by `--fill`; the cards are dealt from y 56 with alternating 2.5 deg tilt and stagger 0.08. Lightbox open: GSAP fade and scale (:377-379).
- Reduced motion: no entrance, no autoplay, instant scrolling. CSS mirror at css:686-692.
- No-JS: rail and posters are readable. Clips cannot play (no `controls`, and the open button needs JS). Acceptable degradation, but see the opportunities.
- Theme editor: `shopify:section:load` re-inits (js:783-786). **There is no `shopify:section:unload` handler**: the IntersectionObserver, the document-level `keydown` (:420) and `visibilitychange` listeners, and the ScrollTrigger are never disposed when the editor re-renders. They leak in the editor only.

## Motion opportunities

1. **(High, conversion) "Shop this case" ticket** (depends on finding 3). It is a cream die-cut ticket under the film card with the product title and real price. When a clip goes live (`.is-live`, set by js:104) or the card is hovered or focused, it slides out from behind the card (y -100% to 0, 0.24 s soft-out) and its arrow nudges. Under reduced motion it is shown statically. It is a link to `product.url`, with no cart logic on a page. Code goes in the shared JS and CSS, scoped to `.cvvr:not(:has([data-cvvr-buy]))` or behind a new `data-cvvr-shoplink` hook so PDP homes are unaffected.
2. **(High, hygiene, shared JS) Add `shopify:section:unload` cleanup:** keep the `io`, the listener removers and the timeline on `section.__cvvrCleanup`, and call it on unload and before re-init. Wrap the entrance in `gsap.context` so `revert()` restores the static state. This mirrors cv-trustpilot.js:292-303.
3. **(Medium) Film-strip scroll depth:** a ScrollTrigger `scrub` on the rail moves each poster's `object-position` or y by about ±10 px against scroll, which reads as film running through a gate. Use only under `(prefers-reduced-motion: no-preference)`. It must run on the shared ticker (ScrollTrigger), never a new `window.scroll` listener (MOTION-SYSTEM 3.3).
4. **(Medium) Score ticket "stamp" timing:** the current `back.out(2.2)` stamp is on-brand. Pair it with a brief ink-spread pseudo element (opacity 0.3 to 0, scale 0.9 to 1.15, 0.32 s) for the "ticket stamped" cue in DESIGN.md:183.
5. **(Low) No-JS fallback:** wrap a `<noscript>` link to `src_lg` in each card, or add `controls` to the `<video>` when `html.no-js`. That needs the layout no-js class (MOTION-SYSTEM 3.4.1), which is shared.

Buy box, packs, Add to cart, Buy now and the cart drawer: not on pages. On PDP homes, the same snippet's "Add to bag" already submits the buy box's own form (snippet :22-27, js:608-686). Do not add commerce to the page variant.

## Risks

- **Nearly everything is shared.** This section's agent may edit only the schema in `sections/cv-page-video-reviews.liquid`. Snippet, CSS and JS changes affect the live default product page (cv-product-counter renders the snippet inline, with the merchant's live clip, PRODUCT.md:76) and must be done once, by the owner of the shared files, and tested on both the product and page templates.
- Changing the block `stars` from range to select changes a setting type. Live product.json clip blocks belong to cv-product-counter's own block schema, not this one, so they are unaffected. This section has no live blocks (page.json has none), so the change is safe here.
- The product-filter trap in finding 3 (snippet :73, :231).
- Never seed page.json with sample clips (the 2026-10-03 incident: QA data reached live via `shopify theme dev`, PRODUCT.md:74).
