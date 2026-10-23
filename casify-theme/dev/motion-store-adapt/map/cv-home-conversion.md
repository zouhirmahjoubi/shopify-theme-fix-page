# cv-home-conversion ("Casify conversion home")

Family: buybox-alt. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.

## Status

**orphan**: placed in no template and no section group. `enabled_on: index` only (:164). Not on
`templates/index.json` (which already has 21 sections and its own hero, STORE-FACTS.md:207-208).

## Purpose

A whole conversion home page in one section: hero (h1, intro, featured case on a shop-counter stage
with four feature thumbs), service strip, catalogue grid with a phone-model filter, "how to choose your
fit" guide, pack offer (2 / 3 cases), FAQ blocks, closing banner, and a `<dialog>` quick picker that
resolves an exact variant and adds it with `/cart/add.js`. Catalogue JSON is printed inline (:151-156).

## Files (owned / shared)

Owned:
- `sections/cv-home-conversion.liquid`
- `assets/cv-home-conversion.css` (:1)
- `assets/cv-home-conversion.js` (:158)
- `assets/conversion-counter-stage-v2.png` (:29, :52)

Shared (do not edit from this lane):
- `assets/hero-sweet-wrapped-teal.webp` (also cv-orbit, cv-product-counter)
- `assets/hero-sweet-wrapped-red.webp` (also cv-orbit, cv-pdp-closer, cv-pdp-guarantee, cv-product-counter)
- `assets/pdp-home-parcel.webp` (also cv-pdp-journey)
- `assets/pdp-counter-box-teal.webp` (also cv-product-counter, cv-pdp-counter.css)
- `snippets/cv-icon.liquid`
- `assets/cart.js` (`window.Casify.updateCartCount`), `layout/theme.liquid`, `snippets/gsap.liquid`

## Store adaptation findings

The section is already built on real data (collection products, variants, options, prices, availability)
and confirmed service facts. Findings are mostly polish plus two content risks.

1. **M, candy inside the pack visual**: `cvhc__pack-candy` (`hero-sweet-wrapped-red.webp`) sits in the pack box art next to the two case photos (:117-123, CSS cv-home-conversion.css:117), directly beside "Pick any 2 cases / Save 18%" (:113). Reads as "a sweet comes in the pack". Fix: move the sweet outside the box (set dressing on the counter edge) or remove it from the pack art. The hero sweet (:35) is set dressing on the stage and is acceptable.
2. **M, "sweet" wording near product**: heading accent default "Your kind of sweet." (:167) and closer "Your phone's next sweet little upgrade." (:138). Metaphor, not candy-as-product, but with the sweet props it leans on confusion. Optional: "Your kind of case." / "next favourite case".
3. **M, en dashes in shopper copy**: "In 1–3 business days" (:60), "ready in 1–3 business days" (:101), FAQ preset "dispatch in 1–3 business days" (:185). Fix: "1 to 3".
4. **M, duplicate h1**: the hero prints an `h1` (:17). On index the theme's own hero also has one; if both are placed, two h1s. Fix: setting "Use as page heading" or `h2` when not first.
5. **M, add does not refresh the drawer**: after a successful add the JS calls `window.Casify.updateCartCount()` and dispatches `cart:updated` (cv-home-conversion.js:306-316), which nobody listens to (MOTION-SYSTEM.md 5.2). The drawer content stays stale. Fix: dispatch `cart:refresh` and `cart:added` (cart.js listens to `cart:refresh`, cart.js:169) and optionally `window.Casify.openDrawer(button)`.
6. **M, pack percentages are typed settings** (18 / 31 defaults, :176-177). Correct today (match live automatic discounts, PRODUCT.md "Capabilities"), with an info line. Keep; note the merchant must update both places if the discount changes.
7. **L, contact link default** `/pages/contact` (:128): use `routes.root_url` prefix for locales (`{{ routes.root_url | append: 'pages/contact' }}` stripped of double slash) or `section.settings.contact_url` required.
8. **L, "A little window shopping."** and "Picked by you. Made for your phone." (:36, :48) are fine voice. "How to choose your fit" link (:21) fine.
9. **L, featured product limited to the first four** (:4-9, info :171): acceptable; documented in the setting.
10. **OK**: product titles, images, prices ("From" when price varies), sold-out state, options and variants all LIVE (:31-47, :71-84, :151-156). Quick pick requires an explicit model choice before Add (dialog hint :144; JS resolves from all options). No hard-coded currency (money filter and `shop.money_format`, :14).

## Claims register

| Claim | Where | Status |
|---|---|---|
| Free shipping. Every order. / On every order / no minimum spend | :23, :58, :138, :146, FAQ :184 | BACKED (PRODUCT.md:34) |
| 30-day returns | :59, :138, :146, FAQ :186 | BACKED |
| Ready for dispatch in 1–3 business days (en dash) | :60, :101, FAQ :185 | BACKED fact, dash to fix |
| Pick any 2 cases Save 18% / any 3 Save 31% | :113 | MERCHANT setting matching live discounts, BACKED by PRODUCT.md "Capabilities" |
| "Your automatic discount appears at checkout." | :114 | BACKED (automatic discounts) |
| "N case designs to make your own" | :69 | LIVE (`catalog.products.size`, capped by limit) |
| Prices, From, Sold out | :39, :77, :81 | LIVE |
| FAQ: wireless charging varies by case | :187 | Honest, fine |

No ratings, reviews, counts, guarantees or performance claims.

## Motion inventory

- cv-motion attributes: none. Own attributes: `data-home-intro`, `data-home-hero-media`, `data-home-reveal`, `data-home-decor`, `data-home-card`.
- `cv-home-conversion.js` (GSAP, ScrollTrigger; per-root `gsap.context` (:418), reverted on unload):
  - intro timeline: `[data-home-intro]` y 14 / opacity 0 to 1, stagger amount .16; hero media y 18 / scale .98 (:421-430).
  - scroll reveals: each `[data-home-reveal]` y 16 / opacity 0, ScrollTrigger `top 92%` once, skipped if already above the viewport (:431-441).
  - catalogue cards: `ScrollTrigger.batch` (top 94%, once, batchMax 3), y 10 / opacity .4 (:442-452).
  - decor parallax: `gsap.quickTo` x/y on `[data-home-decor]` from pointer, fine pointer only (:454-477).
  - feature swap / filter: hero image + copy crossfade (:158-170), cards `clearProps` on filter (:184-186).
  - dialog open: y 12 / scale .99 (:294-297); add success panel rise (:370-374).
- Reduced motion: `reduced` media query, `setupMotion` re-runs on change (:68, :481) and skips all GSAP; CSS kills transitions/animations (cv-home-conversion.css:226). Good.
- No-JS: everything is server-rendered and visible (GSAP sets start states only at runtime). "Choose your fit" links go to the product page (`href="{{ item.url }}"`), the dialog never opens: correct fallback. The model filter stays `hidden` (:67). Good.
- Theme editor: `shopify:section:load` re-inits, `shopify:section:unload` destroys (aborts listeners, reverts context, closes dialog) (cv-home-conversion.js:514-522). Best-in-family lifecycle.
- GSAP plugins: ScrollTrigger only. MotionPath and Flip are NOT loaded on the home page (layout/theme.liquid:173-177).

## Motion opportunities

Section is orphaned and enabled only on index; motion work is low priority unless the merchant places it.
If placed:

1. **(High) Add to bag from the dialog**: on success, fly the dialog's case photo (`[data-home-dialog-image]`) to `#bagBtn` with a straight tween + arc via two tweens (no MotionPath on index), bag bounce; dispatch `cart:refresh` / `cart:added` (finding 5). Under reduce, only the status text.
2. **(High) Pack offer choreography**: when `.cvhc__pack` enters, the box lid lifts and the two real case photos drop into the box with a candy spring (stagger .12), the "Save 18% / 31%" tickets stamp in (scale 1.6 to 1, rotation -14 to -4). Values from the settings only.
3. **(Medium) Buy now in the dialog**: add a secondary "Buy now" that posts the same variant and goes to `routes.root_url + 'checkout'`, with the house press squash; keep Add to bag primary.
4. **(Medium) Model filter feedback**: on filter change, use GSAP `Flip`-like FLIP by hand (record rects, set, invert) or simple batch fade, since Flip is not loaded on index (or extend the layout flag, shared file).
5. **(Low) Guide steps**: `data-cv-stagger` on `.cvhc__steps` with a GSAP number stamp per step; keep start opacity above 0.

## Risks

- Enabled only on index; index.json is near the 25-section cap (21 used).
- The decor sweets are shared assets; replacing them for this section only means new owned files, not edits.
- Changing `cart:updated` to `cart:refresh` triggers cart.js's debounced drawer re-render; verify no double count update with the explicit `updateCartCount()` call.
