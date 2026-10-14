---
last_updated: 2026-09-05T11:56:52Z
status: active
---

# Project Context

## Project Overview

Repair and extend an uploaded Shopify theme, **Casify** ("Chrismass" design system), located at
`/workspace/casify-theme` (37 sections, 5 snippets, 30 assets, 21 JSON documents).

User request: (1) fix and check everything, (2) create a high-converting product page in the same
design-system style, (3) create SVG icons, images, effects and animations.

Deliverables: a repaired theme validated by a static auditor, plus a new opt-in product template
(`product.convert.json`) composed of four new sections, an inline SVG icon library, generated
product imagery, and scroll/hover/SVG micro-animations — all built on the existing tokens.

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-09-05 | Keep it a native Shopify Liquid theme; do not port to React | Alex | Uploaded asset is an OS 2.0 theme; a rewrite would discard 37 working sections and the merchant's editor setup. |
| 2026-09-05 | Validate with a custom Python static auditor | Alex | No Shopify CLI, store credentials or dev server available; the auditor still catches missing sections/snippets/assets, undefined schema settings, empty block-driven sections, unstyled classes and dead JS ids. |
| 2026-09-05 | Ship the new PDP as template suffix `convert`, not by overwriting `product.json` | Alex | Non-destructive — existing Halo and classic product pages keep working, merchant opts in per product. |
| 2026-09-05 | Append new CSS to `assets/theme.css` instead of a new stylesheet | Alex | Theme already scopes per-page CSS blocks inside this single file; a second file would fork the token source of truth. |
| 2026-09-05 | Reuse only existing design tokens — no new hex values or fonts | Alex | Requirement is explicitly "same design system style". |

## Constraints

**Design system (source of truth: `design-tokens/tokens.json` + `:root` in `assets/theme.css`) —
reuse these variables, never hardcode new colours.**

- Colour palette: cream `--cream-50…400` (`#FDF9F1 → #DCC9A6`), red `--red-300…700`
  (`#E58C82 → #7E1A17`, brand primary `--red-500 #C4302B`), teal `--teal-100…600`
  (`#E4F0EE → #4E7C7B`, secondary), cocoa `--cocoa-300…700` (`#A87B58 → #33231A`, ink/body),
  gold `--gold-200…500` (`#F0E2C2 → #B08F52`, accent/ticket).
- Semantic aliases: `--surface-page/card/inset/ticket/ink`, `--text-body/heading/muted/on-dark`,
  `--border-hairline/strong/dashed`, `--focus-ring`, `--state-success/warning/danger/info`.
- Typography: `--font-display` Playfair Display (headings, 700–900), `--font-body` Libre
  Baskerville, `--font-script` Parisienne, `--font-label` Special Elite (uppercase eyebrows/labels
  with `--tracking-label: .18em`).
- Motion: `--duration-fast/base/slow` (160/240/420ms) with `--ease-standard`, `--ease-candy`
  (springy), `--ease-out-soft`.
- Shadows: `--shadow-diecut/xs/sm/md/lg/lifted`. Layout max width `--max: 1160px`.
- Signature visual devices to stay consistent with: red/cream awning stripe, die-cut/ticket edges,
  dashed hairlines, uppercase typewriter eyebrow labels ("Section 04 — the proof"), gold ticket
  panels, cocoa dark panels for guarantees.

**Engineering constraints**

- Liquid only; no build step, no npm dependency, no framework.
- Vanilla ES5-safe JS in `assets/*.js`, `defer`-loaded from `layout/theme.liquid`.
- Every `{% schema %}` setting must be consumed by its Liquid, and every block-driven section must
  ship `presets` so it renders when added fresh from the theme editor.
- Respect `prefers-reduced-motion: reduce` for all new animation.
- Buttons must keep strong text/background contrast; outline buttons stay transparent.
- Add-to-cart must post real variant ids to `/cart/add.js` — no fake success states.


