# cv-pdp-trust ("Product: secure checkout")

## Status

Live on ONE template only:
- `templates/product.convert.json`, key `trust`, 5th in `order` (main, delivery, clips, snap, **trust**, set, ...).
- NOT in `templates/product.json` (the default template; its `order` has no `trust`).
- Instance settings equal the schema defaults: heading "Secure checkout, encrypted payment", pay_label "Accepted payment methods". No `@app` blocks.
- Whether any product is assigned the `convert` suffix cannot be checked from the theme (store tools are out of scope). If none is, this section is not seen by shoppers today.

## Purpose

A slim bar right after the buy box: one payment-trust line with a lock icon, plus the store's real accepted payment icons read from `shop.enabled_payment_types` (`sections/cv-pdp-trust.liquid:1-12`, `:22-28`). It is deliberately about payment trust only; shipping, returns and dispatch live in cv-pdp-guarantee. An `@app` block slot allows a trust-badge app (`:29-31`, schema `:43-45`).

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-trust.liquid`
- `assets/cv-pdp-trust.css` (tagged only at `sections/cv-pdp-trust.liquid:14`; header says "Motion lives in cv-pdp-home-motion.js; this file is the finished state", `:5`)

Shared:
- `assets/cv-pdp-story.css` (tagged by 18 `cv-pdp-*` sections).
- `assets/cv-pdp-home.css`: NOT tagged by this section, but it defines the tokens this section's CSS uses: `.cvw { --cvw-ink; --cvw-red; --cvw-rule }` at `assets/cv-pdp-home.css:14-18`. Tagged by 12 other sections.
- `assets/cv-pdp-home-motion.js`: trust block at `:118-129`; global guard `:42` (needs GSAP, ScrollTrigger, no reduced motion, and any `.cvw` on the page); `gsap.matchMedia` wrapper `:75-76`. Loaded for every product template by `layout/theme.liquid:322`.
- `snippets/cv-icon.liquid` (`lock-secure` glyph; rendered by ~50 files).
- `layout/theme.liquid` (loader, shared).

## Store adaptation findings

1. **Undeclared CSS dependency (owned fix).**
   - `assets/cv-pdp-trust.css:17`, `:19`, `:23` use `var(--cvw-ink)`, `var(--cvw-red)`, `var(--cvw-rule)`.
   - Those tokens exist only in `assets/cv-pdp-home.css:14-18`, which this section does not tag (`sections/cv-pdp-trust.liquid:13-14`).
   - It works on `product.convert.json` only because `cv-pdp-ugc` and `cv-pdp-snap` (earlier in `order`) tag cv-pdp-home.css. Added on its own via the editor, the lock loses its red and the icon outline disappears.
   - Fix (owned): at the top of `cv-pdp-trust.css` add `.cvw-trust { --cvw-ink: var(--cocoa-700); --cvw-red: var(--red-500); --cvw-rule: rgba(74, 51, 36, .26); }` (same values as cv-pdp-home.css:15-18). Also give `.cvw.cvw-trust` its own background/padding so it does not rely on the `.cvw` base rules.
2. **`@app` block can bring unverified claims.**
   - The slot at `:29-31` accepts any app block. Trust-badge apps commonly print "Money-back guarantee", "30-day guarantee" or review stars.
   - Fix (owned): add `"info"` to the schema near the blocks or the heading setting: "Only add a badge app whose wording matches your real policies (free shipping, 30-day returns)." No code change to rendering.
3. **Editor-only dash.** Setting `info` at `:40` contains an em dash ("Settings > Payments) — nothing here"). Merchant-facing, not shopper-facing; replace with a period for consistency.
4. **Clean:** no candy-as-product, no other brand, no placeholder, no prices, no model lists. Payment icons are live store data.

## Claims register

| Claim (shopper-facing) | Where | Source | Status |
|---|---|---|---|
| "Secure checkout, encrypted payment" | `:20`, default `:40`, live instance | Shopify checkout is TLS-encrypted and PCI DSS compliant (platform fact); PRODUCT.md:46 records this bar as merchant-requested; PRODUCT.md:54 records the merchant keeping "Secure checkout" as accurate | Backed |
| Accepted payment method icons | `:22-28` | `shop.enabled_payment_types` (live store data) | Backed |
| Anything an `@app` block prints | `:29-31` | Unknown app content | Unverified; guard via schema info |

## Motion inventory

- `data-cv-*` attributes: none.
- Section-specific hooks (pdp-home idiom): `data-cvw-trust` (`:16`), `data-cvw-trust-lock` (`:19`), `data-cvw-trust-pay` (`:23`).
- Motion code: `assets/cv-pdp-home-motion.js:118-129`.
  - `gsap.set` lock `rotate: -16`, payment `li` `y: 10, opacity: 0`.
  - On enter (`top 80%`, once): lock rotates shut `back.out(3)` 0.5 s; icons stagger up 0.05 s, `clearProps`.
- GSAP plugins: core + ScrollTrigger only.
- Reduced motion: whole file returns at `:42`, so the bar is static and complete.
- No-JS: `cv-pdp-trust.css` is the finished state; nothing hidden by CSS. Correct.
- Theme editor: cv-pdp-home-motion.js has no `shopify:section:load/unload` handling. Re-rendered markup appears static (acceptable), old ScrollTriggers stay bound to detached nodes until reload.
- Flash risk: the bar sits right under the buy box, often in view at load. The icons paint, are hidden by `gsap.set` when the deferred script runs, then animate back. Small flicker on fast connections.

## Motion opportunities

1. **High: tie the lock to the commerce moment (owned).**
   - New owned file `assets/cv-pdp-trust.js`, tagged from the section with `<script src="{{ 'cv-pdp-trust.js' | asset_url }}" defer></script>` (so `layout/theme.liquid` is not touched).
   - Listen (never own) on `[data-cv-pdp]`: `cvs:adding` (`assets/cv-product.js:611`) and `cvs:buying` (`:641`). On each: the lock does a short "click shut" (rotate -10 to 0, 240 ms, `back.out(3)`), and the line gets a muted-teal underline sweep (scaleX 0 to 1, 420 ms, soft-out). Buy now is the moment payment trust matters most.
   - Use `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`; under reduce do nothing.
2. **Medium: ticket-punch entrance for the payment icons.** Replace the plain slide-up with a die-cut feel: `scale: .8, rotation: gsap.utils.random(-4, 4)` to `1 / 0`, 240 ms, stagger 40 ms, `clearProps`. This edit lives in the shared `cv-pdp-home-motion.js:118-129`; coordinate, or move the trust block into the owned `cv-pdp-trust.js` and delete it from the shared file in one change (needs the owner of cv-pdp-home-motion.js to agree).
3. **Medium: no-flicker start.** If the bar is already in view when the script runs (`ScrollTrigger.isInViewport(sec)`), skip the hide and play only the lock turn.
4. **Low: editor support** in the owned file: `shopify:section:load` re-binds listeners, `shopify:section:unload` removes them.

## Risks

- The entrance code is in the shared `assets/cv-pdp-home-motion.js`; parallel agents must not edit `:118-129` without coordination.
- Only on `product.convert.json`. Bringing it to the default `templates/product.json` is a template edit (shared file) and a merchant decision.
- `@app` badge content is outside theme control.
- Do not add `data-cv-reveal` to this bar: MOTION-SYSTEM.md open item 1 (no-JS invisibility of `[data-cv-reveal]`) is unresolved.
