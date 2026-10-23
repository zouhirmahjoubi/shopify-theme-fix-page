# halo-closer ("Halo — Closer")

## Status

**Orphan.** Not placed in any `templates/*.json` or `sections/*-group.json` (grep for `"halo-closer"` / `"type": "halo-` returns nothing). It has a preset (`sections/halo-closer.liquid:34`) and no `enabled_on`, so a merchant can add it to any template from the theme editor, including the home page, collections and pages, where its CTA has nothing to scroll to.

The header comment (`sections/halo-closer.liquid:1-11`) is stale: it says the section is "shared across every product template (default, Halo, Convert)". It is in none of them, and `templates/product.order-slip.json` / a Halo template no longer exist (`ls templates/`).

## Purpose

Final dark "cocoa" CTA banner: a heading, a sub line, one button that scrolls back to the buy box (`#haloPdp` or `#cvPdp`), and a small "tick" line of service facts. On a Casify product page this is the last nudge to choose a phone model and add the case to the bag.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/halo-closer.liquid` (36 lines, no `stylesheet_tag`, no `render`, no script tag).
- `assets/illustration-bow-teal.png`: referenced only from `assets/theme.css:3853` inside the `.halo-closer h2::before` rule, so in practice owned by this section, but the reference lives in shared CSS.

Shared (do not edit in a parallel pass; move what you need into new owned files):
- `assets/theme.css`
  - §39 closer block `3845-3877` (`.halo-closer`, `::before` stripe drift, `h2::before` bow, `.halo-closer__glow`, `.halo-closer__cta` glow pulse, `@keyframes halo-closer-glow`). Only this section uses these selectors, but the file is shared.
  - `.halo-cta` button `3592-3605` (also used by `bundle-buybox` `771-772`, `4280-4281`, `main-halo-product`, `build-box`, `.halo-sticky` `3898`, `4311-4316`, `4358-4359`).
  - `[data-cv-reveal]` primitives `1073-1084`, `[data-cv-parallax]` `1096`, `.cv-cta__shine` `1380-1384`, reduced-motion block `3220-3296` (incl. `.halo-closer h2::before` at `3237`) and global clamp `3307-3315`.
  - small-phone overrides `4393-4395`, h2 cap `4497`, print hide `4528-4530`.
  - `.halo-closer h2` is cited as the opt-out pattern in comments in `assets/cv-apps.css:63`, `cv-collage.css:282`, `cv-pdp-before-after.css:122`, `cv-scrolling-reviews.css:156`, `cv-trustpilot.css:205` (comments only, no selector dependency).
- `assets/cv-motion.js` (global engine, loaded at `layout/theme.liquid:220`): drives `data-cv-stagger`, `data-cv-reveal`, `data-cv-parallax` here.
- `layout/theme.liquid:216-218`: loads `assets/halo.js` when `content_for_layout contains 'halo-'`. This section's markup triggers that load; halo.js then exits immediately (see Motion inventory).
- Buy-box contract it depends on: `sections/cv-product-counter.liquid:208` (`id="cvPdp" data-cv-pdp="counter"`), `sections/cv-product.liquid:99` (`id="cvPdp"`), `sections/main-halo-product.liquid:27` (`id="haloPdp"`, orphan), `assets/cv-product.js` (`#cvAddForm` `:64`, `#cvAddBtn` `:74`, `[data-cv-buy-now]` `:90`, events `cvs:change` `:415`, `cvs:adding` `:611`, `cvs:added` `:619`, `cvs:buying` `:641`, `cvs:choose` listener `:523`).

## Store adaptation findings

1. **Unverified Screen Promise as the headline.** `sections/halo-closer.liquid:14` and schema default `:30`: "Buy the case. If it fails, we pay for the screen." PRODUCT.md "Evidence on Hand" lists the $200 Screen Promise as not verified and never shown store-wide. Fix: new default heading such as "Your phone, your case. Choose your model and it's on its way." (no dash). On product pages prefer a Liquid-built line: "Ready when you are: {{ product.title }}".
2. **Subheading is a stack of unverified claims.** `:15` and default `:31`: "Twelve feet, 1,400 grams, no yellowing, 90 days to send it back." 12 ft, 1,400 g and 36-month clarity are listed as unverified; 90-day returns contradicts the confirmed 30-day returns. Fix: replace with confirmed facts only, e.g. "Free shipping on every order, 30-day returns, and it leaves us within 1 to 3 business days."
3. **Tick line contradicts confirmed shipping facts.** `:23` and default `:32`: "Free shipping over $45 · ships from Austin, TX". Confirmed fact is free shipping with no threshold; "Austin, TX" is listed as unverified and PRODUCT.md says there is no dispatch location. Fix default: "Free shipping on every order · 30-day returns · Ships in 1-3 business days" (hyphen, not en dash; matches `sections/cv-pdp-guarantee.liquid:138`).
4. **`| default:` fallbacks re-insert the bad copy when a merchant clears a field.** `:14`, `:15`, `:23` all use `section.settings.X | default: '<Halo claim>'`. Blanking the field in the editor cannot remove the claim. Fix: drop the Liquid fallbacks (or fall back to a locale key with honest copy) and hide the element when blank.
5. **Hardcoded, untranslatable CTA label.** `:21` "Pick my model" is literal text, not a setting or `| t` key. Fix: add `cta_label` setting (default "Choose my model") or a locale key.
6. **Dead CTA off product pages.** `:17` inline `onclick` looks for `#haloPdp` or `#cvPdp`; on index, collection and page templates neither exists, so the button does nothing. Fix: on non-product templates render an `<a href="{{ section.settings.link | default: routes.all_products_collection_url }}">` instead of the button; or add `"enabled_on": { "templates": ["product"] }`.
7. **No store-data binding at all.** Nothing reads `product`, the chosen variant or the pack. Fix (product pages): print `product.title`, `product.selected_or_first_available_variant.price | money` and, when a model is chosen, the model name; keep them in sync by listening to `cvs:change` on `[data-cv-pdp]` (detail has `variant`, `qty`, `total`, `pct`).
8. **"Halo" product name in editor labels.** Schema `name` "Halo — Closer" (`:28`, `:34`) and the `id="halo-promise"` anchor (`:12`) name a product line Casify does not sell, and the name uses an em dash. Fix: rename to "Casify: closing call" (editor-facing) and use `id="cvhcl-{{ section.id }}"` (also fixes duplicate ids if added twice).
9. **Decorative glow against the design rules.** `.halo-closer__glow` (`theme.css:3863-3868`, red radial + blur) and the infinite CTA glow pulse `halo-closer-glow` (`3870-3876`) are glow for its own sake. DESIGN.md "Physical Cause Rule" and "Don't use neon glows". Fix: replace with a physical cue (hanging shop-sign swing, die-cut ticket stamp on the CTA, or awning-stripe trim).
10. **Shine leaks outside the button.** `.cv-cta__shine` (`theme.css:1380-1384`) is `position:absolute; left:-40%..130%`, but `.halo-cta` (`3592-3603`) has no `overflow:hidden`, so the sheen sweeps past the pill onto the cocoa background every 4.4 s. Fix in owned CSS: `overflow: hidden` on the CTA (or drop the shine).
11. **Decorative SVG not hidden from AT.** `:20` bag icon has no `aria-hidden="true"` / `focusable="false"`.

## Claims register

| Claim (shopper-facing) | Where | Status |
|---|---|---|
| "If it fails, we pay for the screen" (Screen Promise) | `halo-closer.liquid:14`, `:30` | Unbacked. PRODUCT.md Evidence on Hand: Screen Promise not verified, never store-wide. |
| "Twelve feet" drop | `:15`, `:31` | Unbacked (12 ft / MIL-STD listed as not verified). |
| "1,400 grams" magnet hold | `:15`, `:31` | Unbacked (listed as not verified). |
| "no yellowing" | `:15`, `:31` | Unbacked (36-month clarity listed as not verified). |
| "90 days to send it back" | `:15`, `:31` | Unbacked and contradicts the confirmed 30-day returns. |
| "Free shipping over $45" | `:23`, `:32` | Unbacked; contradicts confirmed free shipping on all orders. |
| "ships from Austin, TX" | `:23`, `:32` | Unbacked (listed as not verified; no dispatch location confirmed). |
| Replacement facts: free shipping on every order, 30-day returns, ships in 1-3 business days | proposed | Backed: PRODUCT.md Capabilities and Constraints (merchant, 2026-09-14). |
| Pack savings 18% / 31% (if added) | proposed | Backed only as live data: read from `cvs:change` `detail.pct` (cv-product.js computes from the counter's tier blocks), never typed. |

## Motion inventory

- cv-motion attributes: `data-cv-stagger` on the section (`:12`), `data-cv-parallax="0.05"` on the glow (`:13`), `data-cv-reveal` on h2, p and tick (`:14`, `:15`, `:23`), `data-cv-reveal="scale"` on the CTA (`:18`). Stagger delay 130 ms per child (`theme.css:3869`).
- **Parallax is dead.** `.halo-closer__glow { translate: -50% -50% }` (`theme.css:3865`) has the same specificity as `[data-cv-parallax] { translate: 0 var(--cv-shift) }` (`1096`) and comes later, so the class wins and the `--cv-shift` that cv-motion.js writes (`cv-motion.js:186-198`) never moves anything.
- CSS ambient loops: stripe drift `halo-stripe-drift 6s infinite` (`3861-3862`), bow sway `cv-bow-sway 3.4s infinite` (`3856`), CTA glow pulse `2.6s infinite` (`3870`), shine `cv-shine 4.4s infinite` (`1383`). None pause off-screen or in a hidden tab, and there is no pause control (DESIGN.md Motion: long-running ambient motion pauses offscreen).
- Section-specific JS: none. halo.js is loaded because the markup contains `halo-` (`layout/theme.liquid:216`) but exits at `assets/halo.js:19-20` because nothing renders `.halo-tpl` (only other reference is `theme.css:3902`).
- GSAP: none used, though GSAP 3.15 + ScrollTrigger, SplitText, DrawSVG, CustomEase/Bounce/Wiggle, ScrollToPlugin are always loaded (`snippets/gsap.liquid:23-36`); Flip and MotionPath on product templates (`layout/theme.liquid:173-176`).
- Reduced motion: cv-motion.js marks reveals done immediately (`cv-motion.js:131`, `:157-158`); CSS `3232`, `3237` (bow), `3267` (parallax), global clamp `3307-3315` collapses the infinite loops to one iteration. The inline `onclick` uses `behavior:'smooth'` unconditionally (`:17`), ignoring reduced motion (cv-motion's `data-cv-scroll-to-buy` handles it correctly at `cv-motion.js:235-241`).
- **No-JS state: broken.** `[data-cv-reveal] { opacity: 0 }` (`theme.css:1073-1079`) with no `.no-js`/`scripting` fallback anywhere in the theme, so the heading, sub line, CTA and tick are invisible without JS.
- Theme editor: cv-motion.js has no `shopify:section:load` handler (grep), so a closer added in the editor stays invisible until a full reload.

## Motion opportunities

Build in owned files: `assets/cvhcl-closer.css` and `assets/cvhcl-closer-motion.js`, printed by the section itself (`{{ 'cvhcl-closer.css' | asset_url | stylesheet_tag }}` and `<script src="..." defer>`), the idiom of `sections/cv-value-stack.liquid:18,128` + `assets/cv-value-stack-motion.js:1-27`. That avoids editing the shared `layout/theme.liquid`. Use the `cvhcl-` class prefix and `data-cvhcl` root attribute (both unused; no layout `contains` check matches them). Markup prints the finished state; JS sets from-states only when GSAP + ScrollTrigger exist and reduced motion is off; wrap in `gsap.matchMedia()`; init on `DOMContentLoaded` and `shopify:section:load`, `ctx.revert()` on `shopify:section:unload`.

1. **(High) Closer buy box: Add to bag and Buy now, proxied to the real buy box.** On product pages show a compact ticket: product title, the live price, the chosen model ("For iPhone 16 Pro") or "Choose your phone first", and two buttons. "Add to bag" calls `document.getElementById('cvAddForm').requestSubmit()` (the carousel pattern, `assets/cv-pdp-carousel.js:1324-1332`); "Buy now" clicks the buy box's own `[data-cv-pdp] [data-cv-buy-now]` (`cv-product-counter.liquid:635`). Never post to `/cart/add.js` directly: the buy box owns pack and mixed-case lines. Mirror `#cvAddBtn.disabled` and the model state from `cvs:change`; when no model is chosen, the button scrolls (ScrollToPlugin, `autoKill`, offset for the sticky header) to `#cvPdp`, focuses the model select and pulses it.
2. **(High) Add to bag feedback.** On `cvs:adding` the closer CTA goes busy; on `cvs:added` a DrawSVG tick draws inside the button, the label flips "In your bag" (SplitText chars rising, 240 ms), and a small case ticket flies along a MotionPath arc to the header cart icon (`[data-cart-drawer-open]`) before the drawer opens (`assets/cart.js:62-68`). Reduced motion: the label swap only.
3. **(High) Buy now feedback.** On `cvs:buying` stamp a "To checkout" ticket over the button (scale 1.15 to 1, rotate -4deg, CustomBounce), so the redirect delay reads as progress.
4. **(Medium) Scroll entrance choreography.** ScrollTrigger at `top 75%`: the awning stripes (replace the drift loop) unroll scaleX 0 to 1 from the left; the bow drops on a string and settles with CustomWiggle; the heading rises line by line with SplitText `mask: "lines"`; the fact tickets stamp in with stagger 0.08; the CTA lands last with a short spring. One timeline, 0.9 s total, `once: true`.
5. **(Medium) Pack nudge.** If `cvs:change` reports `qty` 1, show "Make it 2 and save N%" as a ticket that flips (rotationX) in when the shopper changes model. Packs are radio buttons inside the buy box (`[data-cv-pack]`, `cv-product-counter.liquid:584`), so the ticket clicks the real pack button (do not dispatch `cvs:choose`, which only handles options, `cv-product.js:523`). N is read from the pack button's own `data-cv-discount` / `data-cv-qty` (`cv-product-counter.liquid:587-588`), never typed into the closer.
6. **(Low) Ambient.** If kept, the stripe drift and bow sway must run from GSAP with a ScrollTrigger `onToggle` that pauses them off-screen and on `visibilitychange`.

## Risks

- Every honest rewrite changes schema defaults: once this section is placed, defaults and preset are shopper-facing. Do not leave any claim in a default.
- The CTA must not bypass `cv-product.js`: posting to `/cart/add.js` from the closer would skip pack quantity, mixed slots and the discount math (Product Principle 3: page price equals checkout price).
- Both product sections use the same `id="cvPdp"`; the closer must look up `[data-cv-pdp]`, not assume the counter.
- theme.css §39 and `.halo-cta` are shared; halo-2 family agents (`halo-three-fixes`, `halo-why-love`, `halo-xsell`, `halo-yellowing`) and `main-halo-product` also rely on `halo-*` rules. Do not edit or delete theme.css rules in this pass; leave the old selectors unused.
- Removing the `halo-` prefix from the markup stops `layout/theme.liquid:216` loading halo.js for this section, which is harmless (halo.js is a no-op today).
- Adding a buy UI to a section that can also be placed on non-product templates: guard with `{% if product %}` / `template.name == 'product'`.
