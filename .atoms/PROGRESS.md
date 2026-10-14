---
last_updated: 2026-09-05T11:56:52Z
---

# Requirements & Progress

## Requirements Overview

1. **Fix and check all** — audit the uploaded Casify Shopify theme and repair the defects found.
2. **High-converting product page** — a new PDP built in the same design-system style.
3. **SVG icons, images, effects, animations** — a new inline SVG icon set, generated product
   imagery, scroll/hover effects and micro-animations.

## User Stories

- As a shopper, I land on the product page and within one screen I know the price, the offer, what
  makes it different, and how to buy — with a sticky add-to-bag that follows me.
- As a shopper, I can pick my model and finish, see stock and per-unit savings change live, choose a
  multi-pack tier, and add the real selected variant to my cart.
- As a sceptical shopper, I see measured proof (drop height, magnet pull force, clarity),
  verified reviews, press mentions and a stated guarantee before I commit.
- As a merchant, I can add or reorder every part of the new page from the theme editor, because each
  section is block-driven with presets.
- As a merchant, my existing Halo and classic product pages keep working untouched.
- As a user who prefers reduced motion, animations are suppressed without breaking the layout.

## Task Breakdown

- [x] Copy theme into workspace and inventory all 98 files
- [x] Read design tokens, theme.css `:root`, layout, existing PDP sections and JS
- [x] Build static auditor and run full-theme pass 1 (JSON, sections, snippets, assets, schemas)
- [x] Build refined auditor pass 2 and separate real defects from false positives
- [x] Populate project context files (overview, architecture, constraints, plan)
- [x] Confirm remaining unstyled-class gaps against inline `<style>` sections
- [x] Fix: restore empty `halo-comparison` blocks in product.json + product.halo.json
- [x] Fix: add missing CSS rules for unstyled Liquid classes
- [x] Generate product images for the new PDP
- [x] Build `snippets/cv-icon.liquid` inline SVG icon library
- [x] Build `sections/cv-product.liquid` buybox with real variant + tier add-to-cart
- [x] Build `sections/cv-value-stack.liquid` animated benefit grid
- [x] Build `sections/cv-social-proof.liquid` reviews + press strip
- [x] Build `sections/cv-guarantee.liquid` guarantee + FAQ + closer
- [x] Append `.cv-*` design-system CSS incl. animations + reduced-motion guards
- [x] Build `assets/cv-product.js` (variant state, sticky ATC, reveals, counters)
- [x] Wire `layout/theme.liquid` body class routing + asset loading
- [x] Create `templates/product.convert.json` with full copy
- [x] Re-run auditor until touched files are clean

## Progress Log

- 2026-09-05 Copied uploaded theme to `/workspace/casify-theme` (2.1M, 98 files) for safe editing.
- 2026-09-05 Audit pass 1: all 21 JSON docs parse; no missing sections, snippets, assets or section groups; found 2 hard errors.
- 2026-09-05 Audit pass 2 confirmed real defects: `halo-comparison` renders empty in both `product.json` and `product.halo.json` (block-driven but `blocks: {}`), plus a set of Liquid classes with no CSS rule.
- 2026-09-05 Dismissed false positives: `row.settings[key]` dynamic lookup, `getElementById('haloOptOut'+idx)`, and duplicate `haloPriceWas`/`haloPriceOff` ids that sit in mutually exclusive if/else branches.
- 2026-09-05 Confirmed 9 sections carry their own inline `<style>` blocks, so their "unstyled" classes were auditor noise.
- 2026-09-05 Restored 12 comparison blocks into `product.json` + `product.halo.json`; both templates now parse with matching `block_order`.
- 2026-09-05 Appended shared CSS for `.cm-skip-link`, `.halo-case-img`, `.tab-panel(s)`, `.build-box__*`, `.cm-reveal`, `.cm-stagger-sm`, `.qty`, `.template-gift-card`.
- 2026-09-05 Generated 6 product images (packshot, corner, magnet, profile, clarity, lifestyle) and wired them into the new PDP gallery by URL.
- 2026-09-05 Built `snippets/cv-icon.liquid` with 28 inline SVG glyphs, 3 of them CSS-animatable (draw, pulse, fall).
- 2026-09-05 Built 4 new sections (`cv-product`, `cv-value-stack`, `cv-social-proof`, `cv-guarantee`), all block-driven with presets.
- 2026-09-05 Built `assets/cv-product.js`: real variant resolution, tier qty+discount applied to live price, `/cart/add.js` POST, sticky ATC, reveals, count-ups, dispatch countdown.
- 2026-09-05 Appended ~700 lines of `.cv-*` CSS using existing tokens only, plus a `prefers-reduced-motion` block that disables every new animation.
- 2026-09-05 Wired `theme.liquid` to emit `cv-tpl` and load `cv-product.js` only on the `convert` suffix, so `halo.js` cannot collide.
- 2026-09-05 Created `templates/product.convert.json`: 5 sections, 76 blocks, full production copy.
- 2026-09-05 Added `/workspace/verify_cv.py`; final run is 0 errors / 0 warnings (schema↔template parity, block_order, icon names, JS ids, CSS coverage, unused settings, tag balance).
- 2026-09-05 Full-theme audit: unstyled-class count fell 90 → 86 with zero `cv-*` entries; the 2 remaining flags are the known false positives (dynamic `cell_*` lookup, indexed `haloOptOut` ids).

