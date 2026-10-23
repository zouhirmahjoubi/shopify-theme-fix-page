# cv-orbit ("3D collection turntable")

## Status

LIVE on one template: `templates/index.json:137-159`, key `orbit`, 5th in `order` (after `spotlight`, before `shop`). Not in other templates or the header/footer groups.
Instance: `collection: "frontpage"` (`:140`), limit 6, hold 3.5 s, perks = confirmed facts, `pack_2_pct` 18 / `pack_3_pct` 31 (`:156-157`).

## Purpose

Real products from one collection stand on a three.js candy-shop turntable. GSAP steps it one case at a time (hold, then an eased turn) with a countdown bar per dot; a shop ticket beside it shows the front product's title, price (and compare-at), a save or sold-out flag and chips computed from the product's own options and title keywords. Drag to spin, click a side case to bring it round, click the front case to open it. Below: a perks row (service facts + pack savings). No WebGL, no JS or reduced motion: a plain `cv-card` grid with quick pick is the whole experience (`sections/cv-orbit.liquid:25-26`, `:83-89`).

## Files (owned / shared)

Owned:
- `sections/cv-orbit.liquid`
- `assets/cv-orbit.css` (187 lines, `:40`)
- `assets/cv-orbit.js` (586 lines, ES module; loaded by `layout/theme.liquid:275-278` behind `content_for_layout contains 'data-cvorbit'`)
- `assets/cv-orbit-turntable.webp` (`:58`)
- `assets/cv-orbit-backdrop.webp` (referenced from `cv-orbit.css` only)

Shared:
- `snippets/cv-card.liquid` (fallback grid, `:86`, with `quick_pick: true`): also `cv-collection-row`, `cv-search`.
- `snippets/cv-icon.liquid` (`arrow-right`, `pause`, `play`, `bag`, `precision-fit`, `truck-fast`, `returns`, `clock`, `gift`, `lock-secure`).
- `assets/hero-sweet-*.webp` (5 files, `:45`): shared with cv-hero, cv-home-conversion, cv-pdp-closer, cv-pdp-guarantee, cv-product-counter, cv-spec-meter.
- `assets/cv-motion.js` (`data-cv-reveal` `:60`, `:169`; `data-cv-split` `:65`) and theme.css `.cv-sec`, `.cv-row__hd`, `.cv-row__all`, `.cv-grid`, `.cv-empty`, `.cv-eyebrow`, `.cv-cta`.
- Quick pick: `snippets/cv-quick-pick.liquid` + `assets/cv-quick-pick.js` (loaded because the fallback grid prints `data-cvqp-open`, `layout/theme.liquid:208`, `:295`).
- three.js 0.186.0 from `cdn.jsdelivr.net` at runtime (`assets/cv-orbit.js:24`), same URL as cv-phone-scan.

## Store adaptation findings

1. **MEDIUM: em dash and internal label in the eyebrow.** Instance `templates/index.json:141` and schema default `sections/cv-orbit.liquid:217`: "Section 3D — the turntable". Banned em dash, and "Section 3D" is an internal name. Fix: "On the turntable" (or blank: DESIGN.md:198 discourages an eyebrow on every heading).
2. **MEDIUM: en dash in the dispatch perk.** Instance `templates/index.json:151` and default `:229`: "Ships in 1–3 days". Fix: "Ships in 1-3 business days" with note "From order" (default `:230` already says business days).
3. **MEDIUM: "Fits N phone models" counts every model value, including old phones and Samsung, and the turntable never helps choose one.** `chipsFor()` (`assets/cv-orbit.js:252-258`) is honest but the only action is "View this case" (`:117`). Add a quick pick button on the ticket (see Motion opportunities 1).
4. **MEDIUM: save % from product-level prices.** `:139-141` uses `product.compare_at_price` vs `product.price` (min values across variants). If the cheapest variant has no compare-at and another does, the % can be wrong. Fix: compute from `product.selected_or_first_available_variant` (price and compare_at_price), or from `product.compare_at_price_min` vs `product.price_min` only when `compare_at_price_varies` is false.
5. **LOW: hard-coded English in Liquid and JS** (not via locales): "Drag to spin" `:92`, "Pause automatic rotation" `:101`, "Pause" `:104`, "View this case" `:117`, "Cases on the turntable" `:119`, "Save X% on 2 · Y% on 3" / "Mix colours and phone models" `:198`; JS "From ", "Sold out", "Save N%", "Fits N phone models", "colours & styles", "View ", "Resume automatic rotation" (`cv-orbit.js:254-275`, `:320`). Fix: section settings with defaults, or `data-*` label attributes printed from Liquid (owned), so locales do not need editing.
6. **LOW: pack percentages typed in two places** (this section and the PDP tiers) and must equal the live automatic discounts (PRODUCT.md:39). Schema `info` already says so (`:234-235`). Keep; do not animate them as a count.
7. **LOW: features from title keywords** (`:44`, `:143-150`): "MagSafe", "Shockproof", "Rugged" chips are read off the product title; acceptable (live product data), but "MagSafe" is an Apple trademark claim; only shown when the title says so.
8. **Clean:** real product photos only; KIE sweets and turntable are set pieces (`:21-23`), not products; prices via `money`; empty collection renders only in the editor (`:39`, `:168-174`).

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "Free shipping / On every order" | `:177-181`, index.json | PRODUCT.md:34 | Backed |
| "30-day returns / Changed your mind? Send it back" | `:183-187` | PRODUCT.md:34 | Backed |
| "Ships in 1–3 days / Business days, from order" | `:189-193`, index.json:151 | PRODUCT.md:34 | Backed (fix the en dash) |
| "Secure checkout / Encrypted by Shopify" | `:201-205`, index.json:154 | Shopify checkout (platform fact, STORE-FACTS.md BACKED table) | Backed |
| "Save 18% on 2 · 31% on 3" | `:195-200`, index.json:156-157 | PRODUCT.md:39 automatic discounts | Backed (typed; drift risk) |
| "Every case comes with the same shop promises" | lede `:219` | the perks above | Backed |
| Price, "From", compare-at, "Save N%", "Sold out" | JSON `:152-164`, JS `:262-275` | Live product data | Live (finding 4 caveat) |
| "Fits N phone models", "N colours & styles" | JS `:254-255` | `options_with_values` | Live |

## Motion inventory

- data-cv-* attributes: `data-cv-reveal` on the header (`:60`) and on the editor empty state (`:169`), `data-cv-split` on the h2 (`:65`). Section hooks: `data-cvorbit*`.
- **No-JS gap:** `[data-cv-reveal]` is `opacity: 0` in plain CSS (MOTION-SYSTEM.md 3.4 item 1, theme.css:1073-1074). Without JS the eyebrow, heading, lede and "View all" link are invisible. The product grid and perks are visible.
- JS `assets/cv-orbit.js`: module, needs `gsap` + `ScrollTrigger` (`:96`), imports three.js (`:103`). Turn: `power3.inOut` step + hold with countdown fill; ticket swap out `power2.in` 0.16s, in with stagger (`:288-300`); front case lifts and brightens; ambient bob and KIE sweets float; camera dolly with scroll (ScrollTrigger at `:524-536`). Perks row: `back.out(1.7)` rise + icon spin `back.out(3)`, once at `top 92%` (`:80-89`), runs with or without the 3D stage.
- Reduced motion: `boot` returns before both `animatePerks` and `mount` (`cv-orbit.js:573-575`), so the Liquid grid and static perks stay. Read once at boot; no live `change` listener. `animatePerks` uses `gsap.from` with `clearProps`, so perks are visible without JS.
- Pause path: persistent pause button (`:101-105`, JS `:316-322`), auto-pause on hover/drag/focus, off screen and hidden tab (`visibilitychange` `:504`). Good.
- Theme editor: `shopify:section:load` / `unload` (`:580-586`) with cleanup that restores the grid (`ticket.hidden = true`, `:562`).
- GSAP plugins: core + ScrollTrigger only (no Draggable; drag is hand-written).

## Motion opportunities

1. **HIGH (commerce): "Choose your phone" on the ticket.** Add a second button next to "View this case": `<button type="button" data-cvqp-open data-handle="" data-url="">` and set `dataset.handle` / `dataset.url` in `fillTicket()` (`cv-orbit.js:262-283`). Quick pick uses a delegated click (`cv-quick-pick.js:227-228`), so a re-pointed button works, and the dialog is already on the page because the fallback grid prints `data-cvqp-open`. It asks colour and phone, never guesses (PRODUCT.md:40). Motion: the button rides in with the ticket stagger; on `cv:cart` (fired by quick pick, `cv-quick-pick.js:58`) the front case does a short hop (`y: -14`, `back.out(2)`) and the dot flashes teal. Reduced motion / no WebGL: the grid's own quick pick buttons already cover it.
2. **MEDIUM: header no-JS fix inside owned markup.** Replace `data-cv-reveal` / `data-cv-split` on the header with a section-owned reveal in `cv-orbit.js` (SplitText on the h2 with `aria-label`, house pattern `cv-spotlight-motion.js:15-31`) and a `cvorbit-pending` class + timeout fallback, so the heading is readable without JS.
3. **MEDIUM: pack perk as a mini meter.** The deal perk (`:195-200`) could fill two notches (2 = 18%, 3 = 31%) with a `power3.out` width tween once in view; values from the settings, no count-up of invented numbers.
4. **LOW: scroll entrance for the turntable** (scale 0.92 to 1, `expo.out`, once at `top 80%`) before autoplay starts, so the turn does not begin off screen.

## Risks

- Runtime CDN dependency: three.js from jsdelivr (`cv-orbit.js:24`). If the CDN fails the grid remains (`try/catch` at `:103`), which is the right failure mode; do not add more CDN imports (MOTION-SYSTEM.md 1.6).
- `snippets/cv-card.liquid`, quick pick files and `hero-sweet-*` are shared: do not edit from this section.
- Pinning/refresh: cv-phone-scan sorts and refreshes ScrollTrigger after its pin mounts (`cv-phone-scan.js:2326-2329`); new orbit ScrollTriggers must tolerate a late refresh (use `invalidateOnRefresh` for any measured values).
- Pack percentages must change together with Shopify admin discounts; never hard-code them in JS.
