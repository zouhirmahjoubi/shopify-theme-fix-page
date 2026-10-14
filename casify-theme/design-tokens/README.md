# Casify design tokens

Hand-extracted from this theme's own CSS custom properties (`assets/theme.css` `:root`) plus
the merchant-editable brand colors in `config/settings_schema.json` / `config/settings_data.json`.
Structured file: [`tokens.json`](tokens.json).

**Note:** this is a manual extraction, not a `/design-sync` run. `/design-sync` uploads a compiled
React component library (`package.json` + a build producing `dist/`) to claude.ai/design; this repo
is a Shopify Liquid theme with no React source or build, so that skill doesn't apply here.

## Layers

- **primitive** — raw color ramps (cream/red/teal/cocoa/gold + white/black), font stacks, motion
  (durations/easings), and the `1160px` content max-width.
- **semantic** — brand/surface/text/border/state roles that reference the primitives (e.g.
  `text.heading` → `red.600`), plus the shadow scale.
- **sectionAliases.halo** — the Halo product-page section re-declares a second `:root` block
  (theme.css ~line 778) that renames the same brand palette (`--halo-red`, `--halo-ink`, etc.)
  rather than reusing the primitives directly — values are identical, just aliased.
- **themeSettings** — the four colors merchants can actually repoint in the Shopify theme editor
  (`candy_red/teal/cream/cocoa`), with their schema defaults and the values currently saved in
  `settings_data.json` (both currently equal — no merchant overrides applied).

## Not present in this theme

No spacing, border-radius, or font-size scale is defined as CSS custom properties — those values
are hardcoded inline throughout `theme.css` rather than tokenized.
