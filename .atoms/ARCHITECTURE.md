---
last_updated: 2026-09-05T11:56:52Z
---

# Architecture Design

## System Overview

Casify is an uploaded Shopify Online Store 2.0 theme ("Chrismass" design system) living at
`/workspace/casify-theme`. It renders via Liquid + JSON templates; there is no bundler, no
npm package and no dev server. Validation is therefore static: a Python auditor
(`/workspace/audit_theme2.py`) parses every JSON/Liquid file and cross-checks section types,
schema settings, block types, snippet/asset references, CSS class coverage and JS `id` targets.

Two workstreams:
1. **Repair** — fix the defects the auditor found in the existing theme.
2. **New high-converting PDP** — a second product template (`?view=convert`) built strictly on the
   existing design tokens, adding an SVG icon library, generated imagery, scroll effects and
   micro-animations.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Templating | Shopify Liquid + OS 2.0 JSON templates |
| Styling | Single design-system stylesheet `assets/theme.css` (CSS custom properties) |
| Tokens | `design-tokens/tokens.json` mirrored into `:root` in theme.css + `snippets/palette-vars.liquid` |
| Fonts | Playfair Display (display), Libre Baskerville (body), Parisienne (script), Special Elite (label) |
| JS | Vanilla ES5-safe IIFEs, one file per feature, `defer` loaded from `layout/theme.liquid` |
| Icons | Inline SVG via Liquid snippets (`snippets/icon.liquid`, new `snippets/cv-icon.liquid`) |
| Validation | `/workspace/audit_theme2.py` static auditor |

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Design system | Colour/type/motion tokens, all shared component CSS | `assets/theme.css`, `snippets/palette-vars.liquid` |
| Layout shell | Head, asset loading, body template classes | `layout/theme.liquid` |
| Existing Halo PDP | Current product page (gallery, buybox, tiers, proof sections) | `sections/main-halo-product.liquid`, `sections/halo-*.liquid` |
| **New converting PDP** | Buybox with real variant + offer-ladder add-to-cart | `sections/cv-product.liquid` |
| **New PDP: value stack** | Animated benefit grid driven by the new SVG icon set | `sections/cv-value-stack.liquid` |
| **New PDP: social proof** | Rating summary, review cards, press strip | `sections/cv-social-proof.liquid` |
| **New PDP: risk reversal** | Guarantee panel + FAQ accordion + closing CTA | `sections/cv-guarantee.liquid` |
| **New PDP: icons** | Single inline-SVG icon library for the new page | `snippets/cv-icon.liquid` |
| **New PDP: behaviour** | Variant state, offer ladder, sticky ATC, reveals, counters | `assets/cv-product.js` |
| **New PDP: template** | Section order + copy for the converting page | `templates/product.convert.json` |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where new CSS lives | Appended to `assets/theme.css` | Theme already keeps per-page blocks (Halo PDP starts ~line 824) in this one file; a second stylesheet would fork the token source of truth. |
| New page delivery | Extra template suffix `product.convert.json` | Non-destructive: the live `product.json` and `product.classic.json` keep working, merchant switches per product. |
| Body class routing | `theme.liquid` emits `halo-tpl` / `cv-tpl` per suffix | `halo.js` early-returns on `.halo-tpl`; without this the new page would run the wrong script. |
| Variant source of truth | One inline script owns price/stock/ATC per PDP section | Mirrors existing Halo pattern and avoids two scripts fighting over `#…VariantId`. |
| Icons | Inline SVG snippet, not icon-font/sprite | `currentColor` inheritance, zero extra requests, animatable via CSS. |
| Animation safety | All motion wrapped in `@media (prefers-reduced-motion: reduce)` overrides | Theme already sets this precedent at theme.css ~line 784. |
| Validation approach | Static Python auditor, re-run after every change | No Shopify CLI/store credentials available in this environment. |

## File Tree Plan

```
casify-theme/
  assets/
    theme.css                  (edit: repair gaps + new .cv-* design-system block)
    cv-product.js              (new: converting-PDP behaviour)
  layout/
    theme.liquid               (edit: body class routing + load cv-product.js)
  sections/
    cv-product.liquid          (new: buybox + gallery)
    cv-value-stack.liquid      (new: animated benefits)
    cv-social-proof.liquid     (new: reviews + press)
    cv-guarantee.liquid        (new: guarantee + FAQ + closer)
  snippets/
    cv-icon.liquid             (new: inline SVG icon library)
  templates/
    product.convert.json       (new: converting PDP)
    product.json               (edit: restore empty halo-comparison blocks)
    product.halo.json          (edit: restore empty halo-comparison blocks)
```

## Implementation Guide

1. **Repair pass** — driven by `/workspace/audit_theme2.py`:
   - `templates/product.json` + `templates/product.halo.json`: the `cmp` section
     (`halo-comparison`) has `"blocks": {}`, so the whole comparison table renders as an empty
     shell. Restore the column/row blocks (the working set already exists in
     `templates/product.classic.json`).
   - Append the missing CSS rules for classes that are emitted by Liquid but never styled:
     `.cm-skip-link`, `.halo-case-img`, `.halo-love`, `.tab-panels`, `.tab-panel`,
     `.build-box__summary-label`, `.build-box__nav--prev`, `.cm-reveal`, `.cm-stagger-sm`,
     `.qty`, `.template-gift-card`.
2. **New PDP pass** — build `cv-*` sections against existing tokens only (no new hex values),
   every section fully block-driven with `presets` so it also works when added from the theme
   editor, and every schema setting actually consumed by its Liquid.
3. **Motion** — reveal-on-scroll via one shared `IntersectionObserver`, staggered by CSS custom
   property index, plus animated SVG (drop path, magnet pulse, shield draw) and a count-up for
   proof metrics.
4. **Re-run the auditor** until the error list for the touched files is empty.

