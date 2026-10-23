# cv-collage ("Multimedia collage")

## Status

Live, home page only.
- `templates/index.json:1003`: key `collage`, 9th of 21 (after `feature_tabs`, before `value`).
- Blocks (`templates/index.json:1004-1031`): `iphone` = collection `iphone` with product count (`:1008`); `clear` = product `transparent-anti-yellowing-pc-phone-case-for-apple-iphone`, kicker "Clear case" (`:1016`); `crossbody` = product `chain-crossbody-phone-case`, kicker "Crossbody" (`:1024`). Settings `:1036-1046`: heading "Straight from the <em>shop window</em>", layout left, mobile collage, parallax on.

## Purpose

Up to three tiles (image, product, collection, YouTube/Vimeo video) in a one-large / two-small grid. Each tile is a print with a hang-tag ticket (kicker, title, and for products the live price). Video tiles get a wax-seal play button and a native `<dialog>` lightbox (plain link without JS). Unfinished tiles show only in the editor (`sections/cv-collage.liquid:19-52`, `:106-108`).

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-collage.liquid` (437 lines).
- `assets/cv-collage.css` (290 lines; `stylesheet_tag` at `:17`; the finished static state).
- `assets/cv-collage-motion.js` (387 lines), loaded by `layout/theme.liquid:243-246` when the page contains `data-cvcl` (the layout line is shared).

Shared (coordinate before editing):
- **Class prefix collision:** `.cvcl`, `.cvcl__hd`, `.cvcl__title`, `.cvcl__lede` are also used by `sections/cv-collections-list.liquid:17-32` and styled in `assets/cv-pages.css:6`, `:15`, `:25`, `:236-240`. They never load together today (cv-pages.css is loaded by collection/list/contact/page sections only), but if this collage is ever added to a collection or page template both stylesheets apply. Rename this section's root/header classes (e.g. `cvcg`) if reworked.
- Locale key `general.close` (`:310`).
- GSAP core, ScrollTrigger, SplitText (always loaded, `snippets/gsap.liquid:36`).
- Shopify `placeholder_svg_tag` (editor-only placeholders).

## Store adaptation findings

1. **Video block defaults ship demo content (high).** `sections/cv-collage.liquid:415` default `video_url` is `https://www.youtube.com/watch?v=_9VUPq3SxOc` (a third-party demo video, not Casify), and `:419` default description "Describe the video". A video tile is "ready" as soon as a cover image is added (`:41`, `:102`), so a merchant who adds a video block and a cover photo publishes a tile captioned "Describe the video" (tag title `:149`, `aria-label` "Play video: Describe the video" `:190`, dialog caption `:188`) that plays someone else's video. Fix: no default `video_url`, blank `description`, and require `description` for readiness.
2. **Hardcoded English shopper strings (medium).** `:287` "From " before the price, `:138` " styles" in the collection count, `:190` "Play video: ", `:308` `aria-label="Video"`, `:127` "Your product" / `:143` "Your collection" (editor only). Move to `locales/en.default.json` (shared file) under `sections.collage.*`.
3. **"N styles" miscounts (low).** `:138` appends `c.products_count | append: ' styles'`: products_count counts products (cases), not styles (option 1 values). For collection `iphone` it reads "Collection · 12 styles" while each product has several styles. Use "cases" (`{{ c.products_count }} cases`) or count style values.
4. **Product tile ignores the phone-model step (medium, commerce).** The product tile links to the product page only; that is honest. If quick add is added (see Motion opportunities), it must use the theme's quick pick (`data-cvqp-open data-handle data-url`, `snippets/cv-card.liquid:79`), which asks colour and phone first (PRODUCT.md:40), never a direct `/cart/add.js` with `selected_or_first_available_variant`.
5. **Price is live data (good).** `:286-291` prints `p.price | money` (with "From" when `price_varies`) and a real `compare_at_price`. Note the buy box uses a $59.99 fallback compare-at (PRODUCT.md:103); the collage correctly does not invent it.
6. **Image alt (low).** `:123` `p.featured_image.alt | default: p.title` is right given PRODUCT.md:32 (no alt text); the hover second image is `alt: ''` (`:227`), correct as decorative.
7. **Image block defaults lean confectionery (low).** `:383-384` defaults "In the shop" / "Fresh off the counter". "Fresh off the counter" reads like baked goods; prefer "New on the counter". Schema `info` at `:332` contains an em dash (editor-only, not shopper-facing).
8. **Product kicker default (low).** `:394` "Featured case" with info "Only call it a bestseller if your sales data shows it." Good guardrail; keep.
9. No candy-as-product content in the live instance, no other brand on the storefront, no hardcoded prices, no em/en dashes in live copy.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Collection product count ("N styles") | `sections/cv-collage.liquid:138`; live via `templates/index.json:1008-1010` | Backed by store data (`products_count`), but the word "styles" is inaccurate |
| Product title, price, compare-at | `:283`, `:286-291` | Backed: live product data |
| Kickers "Collection", "Clear case", "Crossbody" | `templates/index.json:1009`, `:1017`, `:1025` | Descriptive labels; true for the picked products |
| Heading "Straight from the shop window" | `templates/index.json:1038` | Metaphor, no factual claim |
| Video caption "Describe the video" (default) | `sections/cv-collage.liquid:419` | Placeholder; would ship if a video tile is added |

## Motion inventory

- `data-cv-*`: none. Own hooks: `data-cvcl`, `data-cvcl-parallax`, `data-cvcl-fade`, `data-cvcl-heading`, `data-cvcl-grid`, `data-cvcl-tile`, `data-cvcl-frame`, `data-cvcl-media`, `data-cvcl-drift`, `data-cvcl-seal`, `data-cvcl-seal-ring`, `data-cvcl-tag`, `data-cvcl-go`, `data-cvcl-play`, `data-cvcl-dialog*`.
- GSAP (`assets/cv-collage-motion.js`): one ScrollTrigger timeline (`top 82%`, once) per section: SplitText masked word rise on the heading (`:107-109`, reverted on complete `:100`), awning clip-path roll-up per tile, big tile first (`:117-139`), image settle from scale 1.28 (`:141-145`), hang-tag swing with elastic ease (`:147-153`), arrow pop (`:155-159`), seal spin-in (`:161-166`); scroll drift `yPercent -5..5` scrubbed (`:170-179`, setting `parallax`); seal ring slow spin only while on screen (`:182-202`); pointer depth tilt on fine pointers after the entrance (`:205`, `:210-254`); FLIP-style lightbox open/close (`:257-354`).
- Reduced motion: everything skipped (`:49`, `:90`), lightbox still works without animation (`:297`, `:333`); re-inits on preference change (`:80-85`); CSS `assets/cv-collage.css:287-290`.
- No-JS: complete static state; video tiles are plain links opening YouTube/Vimeo in a new tab (`:183-192`).
- Hidden tab: timeline finished instantly (`:207`).
- Editor: `shopify:section:load` boots, `shopify:section:unload` destroys (kills context, reverts SplitText, closes dialog), `shopify:section:select` and `shopify:block:select` finish the entrance (`:376-386`). Complete.
- Plugins: ScrollTrigger, SplitText. Not used: DrawSVG, CustomBounce, Flip.

## Motion opportunities

1. **High (Add to cart, honest): "Pick colour and phone" on product tiles.** Add a small enamel button inside the hang-tag for `product` tiles: `<button type="button" data-cvqp-open data-handle="{{ p.handle }}" data-url="{{ p.url }}">` (outside the tile's `<a>`, since a button cannot nest inside a link: restructure so the frame link and the button are siblings). The layout auto-loads the quick pick dialog and JS (`layout/theme.liquid:208-210`, `:295-297`). GSAP: the tag swings a little harder on hover of the button, and on `cv:cart` (`assets/cv-quick-pick.js:58`) the tag flips to an "In your bag" side (rotationY 180 over 420ms) for 2.4s. Reduced motion: text swap only. Copy: "Pick colour and phone" / "In your bag".
2. **High (packs/bundles): pack badge on product tags.** A second line on product tags, "2 cases: 18% off each", from section settings `pack_2_pct`/`pack_3_pct` (defaults 18/31, info: "must match the store's automatic discounts", PRODUCT.md:39). Stamp it in with `CustomBounce` 0.3s after the tag swing.
3. **Medium: scroll choreography upgrade.** Stagger the small tiles' drift at different rates (big tile `-4..4`, small `-8..8` yPercent) for depth, and add a one-time glass sheen sweep across `.cvcl-tile__glass` when each tile finishes rolling up. Keep the existing `once` entrance; keep drift off when `data-cvcl-parallax="false"`.
4. **Medium: price tick on hover.** On fine pointers, hovering a product tile reveals the second image (already, CSS) and nudges the price ticket with the candy spring; when `compare_at_price > price`, a strike-through draws across the old price with DrawSVG (or a CSS scaleX line).
5. **Low: video seal.** Already rich; only add `prefers-reduced-motion` CSS to stop the seal's CSS hover transitions if any (none found beyond `:287-290`).
6. Buy now and the cart drawer are reached through the quick pick flow only; no Buy now in a collage tile (Model fit first, PRODUCT.md:110).

## Risks

- Restructuring the tile to hold a button next to the link changes the click target and focus order; keep the whole print clickable and give the button its own focus ring.
- `.cvcl` class collision with cv-collections-list (cv-pages.css). A parallel agent editing cv-collections-list must not rename into this section's selectors and vice versa.
- The collection handle `iphone` and the two product handles in `templates/index.json:1008-1024` must exist; a missing product makes the tile disappear for shoppers (not ready), shrinking the grid silently.
- `templates/index.json` is shared by every home section; edit only the `collage` instance.
