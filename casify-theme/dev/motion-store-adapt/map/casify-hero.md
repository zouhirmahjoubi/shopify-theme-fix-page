# casify-hero ("Casify storyboard hero")

## Status

LIVE in schema terms, INVISIBLE to shoppers today.
- Placed once: `templates/index.json:96-121`, key `casify_hero_U3GTzw`, 3rd in `order` (after `trust_bar`, `phone_scan`; before `spotlight`).
- Not in any other template or in `sections/header-group.json` / `sections/footer-group.json`.
- Instance `featured_product` is `""` (`templates/index.json:100`). The whole section is wrapped in `{%- if request.design_mode or model_1_variant != false or model_2_variant != false -%}` (`sections/casify-hero.liquid:170`), and both variants stay `false` without a product (`:51`). Result: shoppers get no hero, no stylesheet, no script. The live backup still showed "Cases are currently unavailable" (STORE-FACTS.md:197-200); local hides it.
- Side effect: this is the only `<h1>` source on the home page (`:193`). `cv-phone-scan` uses `<h2>` (`sections/cv-phone-scan.liquid:215`) and the header has no h1. With the hero hidden the home page has no h1.

## Purpose

Product-bound hero: one featured case product, two phone-model buttons (Pro / Pro Max), the product's colour swatches filtered by availability per model, two real variant photos staged front/back, a CTA that deep-links to `product.url?variant=` and a "View details" link, plus three service facts. GSAP storyboard intro (reveal, turn, detail zoom, pair, colour ribbon) with pause / skip / replay controls. Everything is resolved server-side from `featured_product.variants` (`:24-166`) and mirrored into hidden `data-csh-variant` nodes (`:358-382`) for JS swaps.

## Files (owned / shared)

Owned (grep of sections/, snippets/, layout/, templates/, blocks/, assets/ finds only this section):
- `sections/casify-hero.liquid`
- `assets/casify-hero.css` (733 lines; printed at `:171`)
- `assets/casify-hero.js` (520 lines; printed at `:385`, not gated in layout)

Shared:
- `locales/en.default.json` keys `sections.casify_hero.*` (24 strings: heading, labels, motion status). Only this section reads them, but the locale file itself is shared by every section; edit only those keys.
- GSAP bundle (`snippets/gsap.liquid`, `layout/theme.liquid:184`): core only, no plugin used.
- `templates/index.json` instance (shared file; settings edits there affect only this instance).

No snippets rendered. No cv-motion attributes.

## Store adaptation findings

1. **HIGH: hero is blank for shoppers.** `templates/index.json:100` `featured_product: ""` + gate at `sections/casify-hero.liquid:170`. Fix options (merchant choice, do not pick silently):
   a. Set `featured_product` to a real case whose option is named "Applicable model" with values "iPhone 18 Pro 17 Pro" / "iPhone 18 Pro Max 17 Pro Max" (`templates/index.json:107-111` already map these). Candidates from STORE-FACTS.md:196: `mobile-phone-case-apple`, `transparent-magnetic-phone-case-for-iphone`.
   b. Owned code fallback: when `featured_product` is blank, fall back to the first product of `collections.all` (or a new `fallback_collection` setting) that has a model option resolving both values, so the hero never silently disappears. Keep the honest empty state for editor only.
2. **HIGH: home page loses its h1** when the hero is hidden (`:193` is the only h1). Fix in owned code: none possible without the hero rendering; after fix 1 the h1 returns. Also note for the `cv-phone-scan` owner: promote its title to h1 only if this hero is removed from `order` (do not have two h1s).
3. **MEDIUM: model pair is hard-wired, ignores the product's real model list.** Only two values are ever offered (`:12-15`, schema `:403-406`), defaults are Liquid literals `'iPhone 18 Pro 17 Pro'`, `'iPhone 18 Pro Max 17 Pro Max'`. A product with 20 to 40 model values (PRODUCT.md:31) shows two. Option name match is exact (`:17`, `:27`), unlike the house rule (STORE-FACTS.md:145-160: name contains `model|phone|device|compatib|applicable`). Fix: detect the model option with the house rule; keep the two configured values as the "featured pair" for the visual, but add a "More phones" link to `featured_product.url` (no guessed variant). Use the same normalised value comparison (downcase, strip spaces) so "iPhone18PROMAX" style values match.
4. **MEDIUM: a model is pre-selected.** `:120-138` picks model 1 and marks it `is-selected` / `aria-pressed="true"` (`:200`), and the CTA deep-links that variant (`:163-166`). PRODUCT.md:110 (Principle 2) and STORE-FACTS.md banned list: "Pre-selected phone model". Today it is only a link, so the PDP still asks; but any Add to bag added here (see Motion opportunities) MUST require an explicit model press first. Fix: render both model buttons unpressed, keep the photo pair as the visual, and label the CTA "Choose your iPhone" until a model is pressed.
5. **LOW: colour swatch hexes are a hard-coded name map** (`:229-251`, 10 names). Unknown colour names fall back to cocoa `#8a5a3c`, so "Magnetic Case Camera Cutout Transparent" style values (PRODUCT.md:31) all render the same brown dot. Fix: prefer the variant's own image as the swatch (`variant.featured_image | image_url: width: 64`) when present; keep the map only as fallback; or read Shopify swatch data (`value.swatch.color`) when the option is a swatch option.
6. **LOW: Liquid fallbacks bypass locales.** `:12-17` English literals; `:202`/`:206` use locale "Pro fit"/"Pro Max fit" sub-labels that are wrong if the merchant maps non-Pro models. Fix: derive the sub-label from the configured label or drop it.
7. **LOW: spaced hyphen used as a dash** in locale `sections.casify_hero.sold_separately` "Two sizes shown - cases sold separately" (rendered at `:333`). Not an em/en dash, but reads as one. Suggested: "Two sizes shown. Cases sold separately."
8. **Clean:** no candy as product (the coin `C` `:294`, awning and ribbon are set dressing), no other brand, prices not shown at all (none hard-coded), service facts are settings with confirmed defaults.

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "Free shipping / Every order" | `:282`, schema `:409-410`, index.json instance | PRODUCT.md:34 | Backed |
| "30-day returns / Time to decide" | `:283`, `:411-412` | PRODUCT.md:34 | Backed |
| "Fast dispatch / 1-3 business days" | `:284`, `:413-414` (plain hyphen, OK) | PRODUCT.md:34 | Backed ("Fast" is soft wording; keep tied to 1-3) |
| "Cases for iPhone 18 Pro and Pro Max." | `:395`, locale | Catalogue (STORE-FACTS.md:110-115: 18 Pro 24, 18 Pro Max 25 products) | Backed, but narrow (Samsung and other iPhones exist) |
| Model / colour availability, "Sold out" | `:63-111`, `:352` | Live variant data | Live |

No ratings, counts, prices or performance claims.

## Motion inventory

- data-cv-* attributes: none. Section-specific hooks: `data-casify-story-hero`, `data-csh-*` (`:176-189`, `:196-358`).
- JS: `assets/casify-hero.js`, IIFE, mounts on DOMContentLoaded/load (`:503-509`), guards `cshReady` (`:14-15`).
- GSAP: core only. Storyboard timeline `buildTimeline()` (`casify-hero.js:246-275`): labels reveal/finish/detail/pair/colour/settle, `power2.inOut`, ribbon `sine.inOut`. Pointer yaw/pitch via `gsap.quickTo` (`:373-390`), fine pointer only. Mobile: a single 1.05s fade-rise only on explicit replay (`:283-299`).
- Reduced motion: checked live via `matchMedia` with a `change` listener (`:462-465`); intro skipped (`:368`, `:413`); CSS `@media (prefers-reduced-motion: reduce)` at `casify-hero.css:720-733`.
- No-JS: complete. Images, buttons and links are plain markup; nothing starts hidden (`casify-hero.css` has no unconditional opacity 0 on content). Swatch/model buttons do nothing without JS, CTA still links to the selected variant.
- Pause path: pause/skip/replay controls (`:336-344`), status live region (`:354`), `visibilitychange` pause (`casify-hero.js:460`), IntersectionObserver (`:467`).
- Theme editor: `shopify:section:load` / `unload` handled with full cleanup (`casify-hero.js:511-520`, `_cshDestroy`).
- Quality: this is the best-behaved motion file of the six; reuse its control pattern.

## Motion opportunities

1. **HIGH (commerce): real Add to bag + Buy now in the hero, after an explicit model press.** The variant is already resolved from model + colour (`data-csh-variant` with `data-id`, `data-available`). Add a `<form method="post" action="{{ routes.cart_add_url }}" data-cart-add-form>` with hidden `id` (no-JS path: native post to /cart/add), disabled until a model button is pressed. On submit, reuse cart.js card-form handling (`cart.js:87-109`: toast, count, drawer open) by keeping `data-cart-add-form`, OR post `/cart/add.js` in owned JS and then `document.dispatchEvent(new Event('cart:refresh'))` + `window.Casify.openDrawer(btn)` inside the handler (cart.js runs last; never call at boot). Buy now: same POST then `location.href = Shopify.routes.root + 'checkout'` (pattern from cv-product.js:633-654), with `pageshow` reset. Motion: 0.12s squash on press (`scaleX 1.04 / scaleY 0.9`, yoyo), lock width during busy, label yPercent flip "Adding..." to "In your bag", DrawSVG check (always loaded). Fly the front device image to `#bagBtn` with a straight tween (home page has no MotionPathPlugin, MOTION-SYSTEM.md:111). Reduced motion: state text only. Labels via locales (shared file, new `sections.casify_hero.*` keys only).
2. **MEDIUM: model press choreography.** On model click, swap front/back devices with a short `power3.out` cross (0.42s), stamp the swatch row (`back.out(1.7)`, stagger 0.04) as availability changes, and ripple the CTA arrow (`elastic.out(1,0.4)`). Fits the existing `onModelClick`.
3. **MEDIUM: scroll exit.** A ScrollTrigger `scrub: 0.6` on `.csh__stage` (yPercent -6, ribbon drift) as the hero leaves; skip on reduced motion and narrow viewports. Low risk, owned file.
4. **LOW: price ticket.** Show the selected variant's price (`variant.price | money`, compare-at if higher) as a die-cut ticket that flips (yPercent) on variant change. Live data only; no typed price.

## Risks

- Fix 1 needs a merchant decision (which product). Do not set `featured_product` in `templates/index.json` without confirmation; an owned-code fallback is safe.
- Adding an Add to bag makes the pre-selection (finding 4) a policy breach; ship 4 with or before opportunity 1.
- `templates/index.json` and `locales/en.default.json` are shared files: touch only this instance / these keys.
- Exact option-name match today means a renamed option ("Applicable models") silently hides the hero again; the house detection rule removes that failure mode.
