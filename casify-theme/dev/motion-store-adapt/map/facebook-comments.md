# facebook-comments ("Facebook comments")

File: `sections/facebook-comments.liquid` (121 lines). Family: reviews-2.

## Status

**live**, but renders nothing to shoppers today.

- `templates/index.json:1491-1535`: key `facebook_comments`, enabled, order position 18 of 21. Settings: heading "In their words" (:1528), intro "", `empty_text` "Customer comments will appear here when added." (:1530), surface cream, `desktop_columns` three (:1532), `card_spacing` 24. It has 3 `comment` blocks with name, comment, date and source_url all empty.
- Storefront gate (:17): the section renders when `comment_count > 0` or in the editor. Off the editor, `comment_count` counts only blocks with both a name and a comment (:7-8). With empty blocks the storefront gets nothing, so `empty_text` is effectively editor-only. In the editor every comment block counts (:9-10) and shows the hint (:70-72).
- Not on any other template or group.

## Purpose

Casify's own wall of short customer comments copied from Facebook (name, optional profile image, comment, date, link to the original), shown as speech bubbles in a 2 or 3 column grid with a "Customer notes" stamp. It does not sync with Facebook (schema info :92).

## Files (owned / shared)

Owned:
- `assets/casify-facebook-comments.css` (48 lines). Only `sections/facebook-comments.liquid:1` references it.
- Locale keys `sections.facebook_comments.*` (`locales/en.default.json:97+`): heading, customer_notes, view_original, editor_hint. No dashes.

Shared:
- None. The section renders no snippets. The Facebook "f" SVG is inline (:63).
- No layout loader references `cvfb` (`layout/theme.liquid` has no match).

## Store adaptation findings

1. **Clean honesty model.** Blocks ship empty, the preset has no blocks (:119), and a comment renders only with a name and text. No change needed.
2. **The Facebook icon shows only with `source_url`** (:61-66). That is correct attribution. Keep it.
3. **The `empty_text` default is shopper-facing in principle** (:94, index.json:1530): "Customer comments will appear here when added." The current gate never shows it on the storefront (:17 needs `comment_count > 0`). Still, the `else` branch (:78-83) is reachable only in the editor, so the copy is effectively an editor hint wearing a shopper setting. Fix: either relabel the setting "Editor note" or delete the branch. Do not show an empty "coming soon" wall to shoppers.
4. **No Casify or case context.** "In their words" plus the stamp "Customer notes" is neutral and on-voice. Optional adaptation: an optional `product` block setting so a comment can link its ticket to the case it mentions (escaped title plus `product.url`). On index, show the ticket; never invent which case.
5. **Date is free text** (:114). Same stale-relative-time risk as the other walls. Tighten the info to "Use the original date, for example 12 Sep 2026".
6. **Grid columns:** `cvfb__grid--three` becomes 2 columns at 900 px and 1 column at 620 px (css:34-44). Fine. The `.cvfb__title` font size `clamp(2.25rem,5vw,4.5rem)` follows DESIGN display. OK.
7. **No dashes, prices, currencies or model lists.** Nothing to fix there.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "In their words" heading (implies real customer words) | schema :92; index.json:1528 | Conditional. True only with real comments; the section is hidden while empty. OK |
| "Customer notes" stamp | locale `facebook_comments.customer_notes`; :32 | Neutral label. OK |
| Names, comments, dates | blocks | MERCHANT-TYPED. All blank in index.json |

No ratings, counts, guarantees or performance claims.

## Motion inventory

- `data-cv-*`: none. Section JS: none. GSAP: none. CSS motion: none, apart from `.cvfb__stamp` having a static `transform` (it is reset at 620 px, css:41).
- Reduced motion: nothing to reduce. No-JS: fully readable.
- Theme editor events: not needed today (no JS).
- MOTION-SYSTEM.md:626 lists it under "placed sections with no entrance at all".

## Motion opportunities

1. **(High for this family) "Notes pinned to the counter" entrance**, in a new owned file `assets/cv-facebook-comments-motion.js`. Gate with a unique attribute `data-cvfbc` on the `<section>`. The section can print its own `<script defer>` after the CSS tag at :1, or a layout gate can be added: `{%- if editor or content_for_layout contains 'data-cvfbc' -%}`. Choreography (GSAP + ScrollTrigger, `once: true`):
   - The stamp lands like a rubber stamp (scale 1.25 to 1, rotation -6 to the resting -2 deg, `back.out(2.2)`, 0.42 s) as the header enters.
   - Each `.cvfb__item` rises per column row: avatar pops (scale 0.6 to 1, 0.24 s), the bubble grows from its tail corner (`transformOrigin: '0% 20%'`, scale 0.92 to 1, autoAlpha), then the meta rule draws (`scaleX` 0 to 1 on a pseudo element via a CSS var). Stagger 0.07, batched with `ScrollTrigger.batch` so long walls do not wait.
   - Pending-class pattern: JS adds `.cvfb--pending` and removes it on complete or after a 1400 ms fallback. CSS hides only under `.cvfb--pending`, never by default, so no-JS stays readable.
   - Reduced motion: return early with no classes added. Theme editor: `shopify:section:load` re-inits, `shopify:section:unload` reverts the `gsap.context`, `shopify:block:select` jumps to the final state.
   - Hover on fine pointers: the bubble lifts 2 px with a cocoa die-cut shadow (DESIGN.md "Die-cut" shadow). Do not use the Facebook-style grey shadows.
2. **(Medium) Cheaper alternative with no JS:** progressive CSS `animation-timeline: view()` inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. Content stays visible where it is unsupported. The theme idiom is GSAP, so use this only if the owner wants zero new JS.
3. **(Low) Do not use `data-cv-reveal` here.** It is `opacity: 0` without JS (MOTION-SYSTEM 3.4.1) and is never rescanned after a `shopify:section:load` (3.4.2).

Commerce (buy box, packs, Add to cart, Buy now, cart drawer): not applicable. The section is on index only. At most, add a "Browse every case" ghost link to `/collections/all` (a real collection, STORE-FACTS 5) after the grid, with a magnetic `.cv-cta` class (cv-motion.js:219-231).

## Risks

- Empty-state copy must never reach shoppers as a "comments coming soon" placeholder (finding 3).
- Adding a layout gate edits `layout/theme.liquid`, which is shared. Prefer the section printing its own `<script defer>` tag.
- Never seed comments for previews in templates. Use local harness files only.
- This section and the orphan `facebook-reviews` overlap (both are walls of copied Facebook comments). Do not place both on one page. If the merchant wants the Elixir look, adapt one, not both.
