# cv-trust-bar ("Trust bar")

## Status

Live, home page only.
- `templates/index.json:13`: key `trust_bar`, 1st of 21 sections (directly under the header group, above `phone_scan` and the hero).
- Not placed in any product template, page template or header/footer group (`grep '"type": "cv-trust-bar"' templates/*.json sections/*-group.json`).
- Saved instance (`templates/index.json:13-50`): 4 `item` blocks, `t-0`..`t-3`, all written by the merchant's 2026-09-16 "4 honest facts" pass (PRODUCT.md:54).

## Purpose

A slim strip of four service promises (icon + bold title + small sub-text) that every visitor sees before scrolling. Pure Liquid, no section JS. 61 lines. Settings: none at section level; each block has `icon` (select), `title`, `body`.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-trust-bar.liquid` (61 lines).
- The `.cv-trustbar*` selector block in `assets/theme.css:1659-1678` is used only by this section (grep `cv-trustbar` across sections/snippets/layout/templates/blocks/assets finds only `sections/cv-trust-bar.liquid` and `assets/theme.css`). The FILE `theme.css` is shared, so an agent may edit only those lines and must not touch the rest. Safer: move the rules into a new owned `assets/cv-trust-bar.css` loaded with `stylesheet_tag` from the section.

Shared (coordinate before editing):
- `snippets/cv-icon.liquid`: icons `truck-fast`, `returns`, `warranty-seal`, `lock-secure`, `drop-shield`, `check`, `clock` (all exist). Used by dozens of sections.
- `assets/theme.css`: `[data-cv-reveal]` primitive (`:1073-1084`), reduced-motion reset (`:3232`).
- `assets/cv-motion.js`: reveal observer for `data-cv-reveal` (`:130-143`), loaded on every page from `layout/theme.liquid:220`.
- No conditional loader in `layout/theme.liquid` keys off this section's markup.

## Store adaptation findings

1. **Above-the-fold facts are invisible without JavaScript, and flash in with it (high).** `sections/cv-trust-bar.liquid:9` puts `data-cv-reveal` on the whole section. `assets/theme.css:1073-1074` sets `[data-cv-reveal] { opacity: 0; transform: translateY(16px) }`, and only `assets/cv-motion.js:132-143` (deferred) adds `.is-revealed`. There is no `noscript` / `@media (scripting: none)` fallback anywhere in the theme. Result: with JS off or slow, the four service facts (the most important honest content on the page) never show; with JS on, the very first strip under the header fades in late. Fix: remove `data-cv-reveal` from `<section>` (line 9) and give the strip its own CSS-only entrance on owned selectors (see Motion opportunities), whose resting state is fully visible.
2. **"100% safe & encrypted" is an absolute claim (medium).** `templates/index.json:36` and preset `sections/cv-trust-bar.liquid:55`. Shopify checkout is TLS-encrypted, but "100% safe" is an unverifiable superlative and not in PRODUCT.md "Evidence on Hand". The merchant left "Secure checkout" as-is on 2026-09-16 (PRODUCT.md:54), so changing the sub-text needs the merchant's OK. Proposed: "Encrypted Shopify checkout" (or "Card details never touch our site").
3. **"Prepaid label, no hassle" is not a confirmed fact (medium).** `templates/index.json:28`, preset `sections/cv-trust-bar.liquid:54`. The confirmed facts are free shipping, 30-day returns, 1 to 3 business-day dispatch (PRODUCT.md:34). "Prepaid label" exists only on the store's Return Policy page (PRODUCT.md:41, :59) and the merchant kept this sub-text on 2026-09-16. Flag it; proposed honest default: "Change your mind within 30 days".
4. **Block default ships a claim when a merchant adds a blank block (low).** `sections/cv-trust-bar.liquid:43-44` default `Free shipping / On every order`. Backed today, but any new block silently duplicates "Free shipping". Prefer blank defaults with `info` text, and skip rendering a block whose `title` is blank (the loop at `:12-20` renders empty `<b></b><i></i>` today).
5. **Facts are hardcoded per section, not bound to one source (medium, cross-section).** The same three facts are typed separately in this section, cv-vs (`templates/index.json:1272`), cv-guarantee (`:1606-1624`), cv-pdp-guarantee and others. No theme setting holds them (`config/settings_schema.json` has no shipping/returns/dispatch settings). A future change (e.g. 45-day returns) will drift. Option (shared file, needs coordination): add `settings.service_free_shipping`, `settings.service_return_days`, `settings.service_dispatch_min/max` to `config/settings_schema.json` and read them here. Within owned scope: keep blocks, but add `info` text on `title`/`body` pointing to PRODUCT.md facts.
6. **Mobile legibility (low).** `assets/theme.css:1672-1673`: title 12.5px, sub-text 11px. DESIGN.md:199 says do not shrink core mobile labels below practical reading size. Raise sub-text to at least 12.5-13px.
7. **Ticker overflow is not discoverable (low).** On phones the list scrolls sideways (`assets/theme.css:1675`) with the scrollbar hidden and no cue. Either wrap to 2x2 or add an edge fade on owned selectors.
8. No candy-as-product copy, no other brand, no prices, no em/en dashes (the "1-3" in `templates/index.json:44` already uses a hyphen).

## Claims register

| Claim | Where | Status |
|---|---|---|
| Free shipping, on every order | `templates/index.json:20-21`; preset `sections/cv-trust-bar.liquid:53` | Backed: PRODUCT.md:34 (free shipping on all orders, no threshold) |
| 30-day returns | `templates/index.json:27`; preset `:54` | Backed: PRODUCT.md:34 |
| Prepaid label, no hassle | `templates/index.json:28`; preset `:54` | Unbacked in Evidence on Hand (only the Return Policy page says it); merchant kept it 2026-09-16 |
| Secure checkout | `templates/index.json:35`; preset `:55` | Backed as a platform fact (Shopify checkout) |
| 100% safe & encrypted | `templates/index.json:36`; preset `:55` | "encrypted" backed by the platform; "100% safe" unbacked superlative |
| Fast dispatch, ships in 1-3 business days | `templates/index.json:43-44`; preset `:56` | Backed: PRODUCT.md:34 |

## Motion inventory

- `data-cv-*`: only `data-cv-reveal` (no value, fade + 16px rise) on the section root (`sections/cv-trust-bar.liquid:9`).
- Section-specific JS: none. GSAP: none. Plugins: none.
- Reduced motion: handled globally (`assets/theme.css:3232` resets `[data-cv-reveal]`; `assets/cv-motion.js:158` marks everything revealed when reduced).
- No-JS state: broken (the whole strip stays at opacity 0, see finding 1).
- Theme editor events: none needed for the reveal, but a section re-rendered in the editor is a new node that `cv-motion.js` never observes (it only scans once at load, `:130`), so after any edit in the editor the strip stays invisible until reload. Another reason to drop `data-cv-reveal` here.
- Icons are not animated (`render 'cv-icon'` without `animate: true`, line 14).

## Motion opportunities

1. **High: CSS-only "tickets dealt onto the counter" entrance with a visible resting state.** Replace the section-level reveal with a per-item keyframe on owned selectors: `.cv-trustbar__item { animation: cvtb-deal 420ms var(--ease-out-soft) both; animation-delay: calc(var(--i) * 70ms) }` where `--i` is printed from `forloop.index0`. The keyframe must start visible enough to read (for example `from { transform: translateY(-6px) rotate(-1.5deg); }` with no opacity 0), so no-JS and editor re-renders are fine. `@media (prefers-reduced-motion: reduce) { .cv-trustbar__item { animation: none } }`.
2. **Medium: icon stamp on first view.** Pass `animate: true` to `cv-icon` for `truck-fast` and `clock` only (the `.cv-ico--anim` keyframes already exist and are reset under reduced motion at `assets/theme.css:3226-3230`). Keep it to one play, not infinite.
3. **Medium (cart-aware, honest): "free shipping applied" tick.** Listen for the theme's existing cart events (`cart:added` and `cart:refresh` from `assets/cv-product.js:620-621`, `cv:cart` from `assets/cv-quick-pick.js:58`) and give the Free shipping item a 240ms check-mark DrawSVG pulse (DrawSVGPlugin is always loaded, `snippets/gsap.liquid:23`). The fact is unconditional (no threshold), so no progress bar or "X away from free shipping" copy: that would invent a threshold. Needs a small owned JS file (for example `assets/cv-trust-bar.js`) loaded from the section with `defer`, guarded by `window.gsap` and reduced motion, with `shopify:section:load/unload` handlers.
4. **Low: mobile marquee.** Not recommended: an auto-scrolling strip of service facts would need a pause control (DESIGN.md:192) and hurts readability; prefer the 2x2 wrap.
5. Buy box, packs, Add to cart, Buy now, cart drawer: not applicable to this strip beyond opportunity 3.

## Risks

- PRODUCT.md:54 records the merchant explicitly approved the current four items. Any copy change (findings 2 and 3) must be confirmed with the merchant first; motion and markup changes do not change copy.
- `assets/theme.css` is shared. If the `.cv-trustbar` rules are edited in place, touch only lines 1659-1678; better to move them to an owned stylesheet.
- Removing `data-cv-reveal` here does not fix the theme-wide no-JS problem for every other `[data-cv-reveal]` element; that needs a shared `@media (scripting: none) { [data-cv-reveal] { opacity: 1; transform: none; filter: none } }` rule in `assets/theme.css` (shared, coordinate with the layout owner).
- The strip is the first thing under the header: any entrance motion must not cause layout shift (animate transform only, never height).
