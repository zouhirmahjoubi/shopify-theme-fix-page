# halo-press ("Halo — Press marquee")

## Status

**Orphan.** Not in any `templates/*.json` or `sections/*-group.json`. Preset present (`sections/halo-press.liquid:31-78`), no `enabled_on`: addable to any template, where the preset's press outlets would ship.

## Purpose

A dark cocoa strip with an infinite horizontal marquee of press outlet names ("as seen in"). Pure social proof; no link, no logo, no source.

## Files (owned / shared)

Owned:
- `sections/halo-press.liquid` (81 lines; no `stylesheet_tag`, no `render`, no script).

Shared:
- `assets/theme.css`: §30 `.halo-press`, `.halo-press__track` `3669-3687` (only this section uses them); keyframes `cm-halo-slide` `3351` (shared with the `.halo-bar` marquee `3346`); `[data-halo-reveal]` `3905-3921` incl. reduced-motion `.halo-press__track { animation: none }` `3920`; print hide `4528`.
- `assets/halo.js` (no-op today) via `layout/theme.liquid:216-218`.

## Store adaptation findings

1. **Fabricated press coverage.** Preset outlets WIRED, The Verge, Tom's Guide, Engadget, GQ, Fast Company, MKBHD (`:38-75`); block default "WIRED" (`:25`). PRODUCT.md Evidence on Hand: "No review app, customer reviews, testimonials or press are confirmed yet ... None may be invented." The same WIRED/Verge/GQ marquee was already removed from cv-spotlight and cv-social-proof (PRODUCT.md 2026-09-15 and 2026-09-16). MKBHD is a real person: naming him implies an endorsement (impersonation risk). Fix: empty preset, blank block default.
2. **No proof requirement.** An outlet is a free-text name only (`:22-26`). Fix if the section is kept: each block needs `name` + required `url` (link to the article) and optional `logo` image; render a block only when both name and URL are set; render nothing (and an editor-only hint under `request.design_mode`) when no valid block exists.
3. **Recommended repurpose (honest, fits the brand):** turn it into a service-facts ticker in the candy-shop idiom, like the fact band of cv-spotlight (PRODUCT.md 2026-09-15 entry) and the PDP ribbon (`templates/product.json:313`, `cv-pdp-ribbon`): items computed or fixed to confirmed facts only, for example "Free shipping on every order", "30-day returns", "Ships in 1-3 business days", "{{ collections.all.products_count }} case designs", "Made for iPhone and Samsung". No free-text claim blocks, or blocks with blank defaults and an `info` warning.
4. **Duplicated list for the loop is read twice by screen readers and confuses the editor.** The second loop (`:6-8`) repeats every outlet with the same `{{ block.shopify_attributes }}`, so assistive tech announces each name twice and the editor gets two elements per block id. Fix: wrap the clone in `aria-hidden="true"` and omit `shopify_attributes` on the clone (or build the clone in JS).
5. **No pause control on a perpetual marquee.** `animation: cm-halo-slide 42s linear infinite` (`theme.css:3679`); it only stops under reduced motion (`3920`). WCAG 2.2.2 requires a pause for auto-moving content longer than 5 s, and DESIGN.md requires ambient motion to pause off-screen and in hidden tabs. Fix: visible pause button + off-screen pause.
6. **Editor name** "Halo — Press marquee" (`:14`, `:33`) has an em dash and another brand: rename "Casify: fact ticker".
7. Root is a bare `<div>` (`:1`) with no landmark or label; give it `aria-label` ("As featured in" only if real, otherwise "Shop facts").

## Claims register

| Claim | Where | Status |
|---|---|---|
| Featured in WIRED | `:25`, `:38` | Unbacked (no press confirmed). |
| Featured in The Verge | `:44` | Unbacked. |
| Featured in Tom's Guide | `:50` | Unbacked. |
| Featured in Engadget | `:56` | Unbacked. |
| Featured in GQ | `:62` | Unbacked. |
| Featured in Fast Company | `:68` | Unbacked. |
| Featured by MKBHD (a named individual) | `:74` | Unbacked; implied personal endorsement. |
| Proposed: free shipping on every order; 30-day returns; ships in 1-3 business days | repurpose | Backed (PRODUCT.md Capabilities and Constraints). |
| Proposed: N case designs | repurpose | Backed by `collections.all.products_count` at render time (precedent: cv-spotlight). |

## Motion inventory

- `data-halo-reveal` on the whole strip (`:1`): starts at opacity 0 (`theme.css:3906`) and is never revealed because `assets/halo.js` exits at `:19-20` (no `.halo-tpl` anywhere). **The entire section is invisible for visitors with motion allowed, with or without JS**; only reduced motion shows it (`3919`), and then the track is static (`3920`).
- CSS marquee `cm-halo-slide` 42 s linear infinite translating `-50%` (`theme.css:3677-3681`, keyframes `3351`). No velocity link, no pause, runs off-screen.
- cv-motion attributes: none. No GSAP, no section JS, no `shopify:section:load` handling.
- No-JS: invisible (bug above).

## Motion opportunities

Owned `assets/cvhpr-ticker.css` + `assets/cvhpr-ticker-motion.js`, printed by the section. Prefix `cvhpr-`, root `data-cvhpr` (unused).

1. **(Medium) Scroll-velocity ticker.** GSAP `horizontalLoop`-style seamless loop (clone built in JS, `aria-hidden`), base speed slow, `ScrollTrigger.create({ onUpdate: self => tl.timeScale(1 + Math.min(Math.abs(self.getVelocity())/600, 3)) })` easing back with `gsap.to(tl, { timeScale: 1 })`, direction follows scroll direction. Same technique already used on the PDP ribbon and home proof per PRODUCT.md. Pause off-screen (`ScrollTrigger onToggle`) and on `visibilitychange`; visible pause button (44 px target, label font, `aria-pressed`).
2. **(Medium) Candy-shop dressing.** Each fact is a die-cut ticket with a small inline SVG icon (reuse `snippets/cvsp-icon.liquid` or `snippets/cv-icon.liquid` icon names such as `clock`, which exists per PRODUCT.md) that wobbles once (CustomWiggle, 3 cycles) as it crosses the centre line, driven by the loop's progress, not a timer.
3. **(Low) Entrance.** Strip slides down like an awning valance (scaleY 0 to 1 from top, 420 ms soft-out) when it enters.
4. Reduced motion: static, wrapped row of tickets (no clone), all readable; no-JS: the same static row (CSS must not hide anything).

## Risks

- Keeping any outlet name without a link to the real coverage would reintroduce a claim the merchant already had removed twice.
- `cm-halo-slide` keyframes are shared with `.halo-bar` (`theme.css:3346`); do not edit them.
- If repurposed to service facts, wording must stay identical to the confirmed facts (free shipping on every order, 30-day returns, 1 to 3 business days) and use a hyphen in "1-3", not an en dash.
- A second marquee on a product page that already has `cv-pdp-ribbon` duplicates a role; PRODUCT.md asks for each role once per page.
