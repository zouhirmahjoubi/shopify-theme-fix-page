# cv-pdp-ugc ("Product: clips")

## Status

Live on both product templates:
- `templates/product.json`, key `clips`, 3rd in `order`.
- `templates/product.convert.json`, key `clips`, 3rd in `order`.

Both carry the same three blocks (`c-snap`, `c-hand`, `c-table`), all pointing at theme assets. There is no dedicated loader: the behaviour and motion come from `assets/cv-pdp-story.js` and `assets/cv-pdp-home-motion.js`, which load on every product template (`layout/theme.liquid:306`, `:322`).

## Purpose

Three 9:16 shop-footage clips of a case being handled ("Snapping it on", "In the hand", "On the table") on a counter:
- They play muted when on screen and pause when they leave.
- Each clip has a play/pause button, and tapping one opens it large in a `<dialog>`.
- A "Back to the case" button scrolls to Add to bag.

By construction this is not customer content. There are no handles, stars, "verified buyer" badges or claims, and the schema has no field for them (`sections/cv-pdp-ugc.liquid:10-13`, `:169`).

## Files (owned / shared)

Owned (only this section and its own saved template settings reference them):
- `sections/cv-pdp-ugc.liquid`
- `assets/pdp-ugc-snap-on.mp4` (739 KB), `assets/pdp-ugc-snap-on-poster.webp`
- `assets/pdp-ugc-in-hand.mp4` (504 KB), `assets/pdp-ugc-in-hand-poster.webp`
- `assets/pdp-ugc-on-table.mp4` (602 KB), `assets/pdp-ugc-on-table-poster.webp`

Note: `assets/cvba-before.jpg` and `assets/cvba-after.jpg` (`cv-pdp-before-after`) were extracted from `pdp-ugc-snap-on.mp4` but do not reference it. Do not delete or replace the mp4 without telling the before-and-after owner.

Shared:
- `assets/cv-pdp-story.css`: the base `.cvp__inner`, `.cvp__h2` and `.cvp__lede`. It is stylesheet-tagged by 18 `cv-pdp-*` sections.
- `assets/cv-pdp-home.css`: the ugc rules at `:534-644` (rail, screen, controls, tag, counter, dialog), mobile at `:634-644`, reduced motion at `:713-718`, and `.cvw` / `.cvw-head` base rules. It is tagged by 12 sections.
- `assets/cv-pdp-story.js`:
  - The clips module `:300-396` (autoplay in view, play/pause, dialog).
  - `[data-cvp-back]` → `backToSlip()` `:26-31` and `:398`.
- `assets/cv-pdp-home-motion.js`:
  - Heading SplitText `[data-cvw-split]` `:131-141`.
  - Clips entrance, parallax and tilt `:446-493`.
  - Global guard `:42`.
- `snippets/cv-icon.liquid`: the `expand`, `play`, `pause` and `close` icons.
- `layout/theme.liquid:306` and `:322`.

## Store adaptation findings

1. **MAJOR: The same three clips show on every product, but the copy says "this case".**
   - The lede in both templates and the schema default (`:156`) read "Short clips of this case being handled…".
   - The `<video aria-label>` and the still `alt` fall back to `product.title` (`:71`, `:82`, `:94`). The current product's name gets attached to footage of whichever case was filmed.
   - Fix (owned Liquid):
     - Prefer the product's own data: first `product.media | where: 'media_type', 'video'`, then a product metafield list such as `product.metafields.custom.clips` (`list.file_reference`, video). Both are store data.
     - Fall back to the section blocks only when the product has none. In that fallback, use store-level copy, e.g. a second setting `lede_store` defaulting to "Short clips of our cases being handled: the snap, the turn in your hand, the everyday."
     - Label clips by their caption only, never by `product.title`.
   - Do not create the metafield definition in the store (no store tools in this project phase). Document it for the merchant.
2. **The heading hardcodes a count.**
   - The heading "Three clips from the counter" (schema `:155` and both templates) is fixed, while the section shows `shown` clips (`:26-33`, 1 to 6, `max_blocks: 6` `:181`).
   - Fix: default to "Clips from the counter", or support a `[count]` token replaced with a word from `shown` (one, two, three, …).
3. **The section comment promises sound buttons that the markup lacks.**
   - The comment (`:7-8`) says each clip has "play/pause and sound buttons". The markup has only play/pause (`:106-114`). Sound exists only in the dialog with native controls (`assets/cv-pdp-story.js:300-305`).
   - Fix: correct the comment, or add a mute toggle (`data-cvw-ugc-sound`, `aria-pressed`) that the shared clips module would have to support.
4. **No-JS state.**
   - `<video>` has no `controls` and no `autoplay` (`:78-82`), and the play button needs JS. Without JS the shopper sees posters only. This is readable and intentional, but the footage cannot be played.
   - Optional: `<noscript><style>.cvw-ugc__video{pointer-events:auto}</style></noscript>` plus a `controls` attribute added only inside `<noscript>` markup. Low priority.
5. **Em dashes in schema `info` text** (`:169`, `:177`). These are merchant-facing editor help, not shopper copy. Optional cleanup to match the house rule.
6. **Naming:** the file is called "ugc" although the content is shop footage. Keep the honesty rule in the schema. Never add name, rating or "customer" fields.
7. **Clean:** the captions are descriptive ("Snapping it on", "In the hand", "On the table"), and the CTA "Back to the case" scrolls to `#cvAddForm`. No candy-as-product, no other brand, no dashes in shopper copy, no prices.

## Claims register

| Claim | Source | Status |
|---|---|---|
| "Short clips of this case being handled" (lede) | Theme-asset footage, identical on every product | **Unbacked on products other than the one filmed** (finding 1) |
| "Three clips from the counter" | Static count | Correct today (3 blocks), but can drift (finding 2) |
| Captions "Snapping it on" / "In the hand" / "On the table" | Merchant text, descriptive | Fine (no performance claim) |

No ratings, review counts, customer counts, guarantees or performance claims. The schema forbids them in its `info` text (`:169`, `:177`).

## Motion inventory

- **cv-motion attributes (`data-cv-*`):** none. Note that `assets/cv-motion.js` has its own `data-cv-ugc` module ("customer video rails"). This section deliberately uses `data-cvw-ugc` instead. Do not switch to `data-cv-ugc`: that module is built for customer clips, which this footage is not.
- **Heading:** `[data-cvw-split]` (`:40`). `cv-pdp-home-motion.js:131-141` splits it into chars with SplitText, which drop in with random rotation, `CustomBounce` "cvwDrop" and a random stagger, at `top 86%`.
- **Clips entrance** (`cv-pdp-home-motion.js:446-468`):
  - The counter line draws (`scaleX`).
  - The three screens are set down (y 72, scale .94, tilt -6/3/8 → 0, cvwDrop, stagger .11).
  - The caption tickets pop (`back.out(3)`), at `top 76%`.
- **Scroll:** each clip's media drifts ±2.2% with a ScrollTrigger scrub (`:470-479`).
- **Pointer:** 3D tilt toward the pointer on wide, hover-capable screens (`:481-492`).
- **Video behaviour** (`cv-pdp-story.js:300-396`):
  - An IntersectionObserver starts and stops playback.
  - A clip the shopper stops stays stopped (`byHand`), which meets WCAG 2.2.2.
  - A progress bar runs from `timeupdate`.
  - The `<dialog>` lightbox closes on Esc or a backdrop click, and resumes the others on close.
- **GSAP plugins used:** ScrollTrigger, SplitText and CustomBounce (optional).
- **Reduced motion:**
  - `cv-pdp-home-motion.js` exits entirely (`:42`).
  - The clips never autoplay (`cv-pdp-story.js:329`, `reduce`).
  - CSS `cv-pdp-home.css:713-718` removes transitions and the 2nd-clip offset, and shows the expand icon.
- **No-JS:** posters and captions visible, the rail scrolls (scroll-snap on mobile `:634-644`), nothing plays.
- **Theme editor:** NO `shopify:section:load` / `unload` handling in `cv-pdp-story.js` or `cv-pdp-home-motion.js`. After an editor re-render the clips do not autoplay, the play and open buttons are inert, and no entrance runs. Old ScrollTriggers keep references to detached nodes.
- **Hidden-state risk:** `gsap.set(screens, {opacity:0 …})` (`:458`) waits for a `once` ScrollTrigger at `top 76%`. If ScrollTrigger is present but the trigger never fires (for example, page restored scrolled past it), the screens stay invisible. Consider `onEnter` plus `onLeave`, or `ScrollTrigger.isInViewport` checks at init.

## Motion opportunities

1. **HIGH (once clips are per-product): "Pick this colour" ticket per clip.**
   - When a clip comes from product data and names a colour (a variant link on the media, or a block `colour` text matched against the product's colour option values), show the caption ticket with a small "Pick this colour" button.
   - The button dispatches `cvs:choose` `{index, value}` on `[data-cv-pdp]`, the same event the carousel and fit list use (`cv-product.js:523`), then calls `backToSlip()`.
   - Motion: the ticket re-stamps (scale 1.3 → 1, rotate -6 → 0, cvwDrop).
   - Static: a plain button. Without JS, a link to `?variant=`.
   - Only show it when the value exists in the product's real options.
2. **MED: Clip-to-dialog morph.**
   - Use `Flip` (loaded on product templates) to grow the tapped screen into the dialog stage, and shrink it back on close.
   - The dialog itself stays a native `<dialog>`, so Esc and focus keep working.
   - Reduced motion: instant open (current behaviour).
3. **MED: Editor lifecycle.** Add `shopify:section:load` / `unload` handling, scoped to `[data-cvw-ugc]`, in both shared files: re-run the clips module and kill that section's triggers. This needs a shared-file edit, so coordinate it.
4. **LOW: "Back to the case" button.** Apply the existing `magnet()` helper (`cv-pdp-home-motion.js:60-73`) to `.cvw-ugc__cta`. Hover-capable screens only.
5. **LOW: Progress bar.** Drive `[data-cvw-ugc-bar]` with `gsap.quickSetter(bar,'scaleX')` instead of width, which avoids layout.
6. **Do not add `data-cv-reveal`.** It hides content without JS (`assets/theme.css:1073`).

## Risks

- Every behaviour and motion change lives in shared files (`cv-pdp-story.js`, `cv-pdp-home-motion.js`, `cv-pdp-home.css`) used by 12 to 18 sections. Scope all selectors to `[data-cvw-ugc]` and coordinate edits.
- Autoplaying video must stay stoppable per clip and never start under reduced motion (WCAG 2.2.2, DESIGN.md "explicit pause path").
- Binding clips to product media changes what shoppers see per product. Products with no video and no metafield fall back to the shop footage with neutral store-level copy.
- Video weight is about 1.8 MB total with `preload="metadata"`. Do not switch to `preload="auto"`.
