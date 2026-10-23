# cv-hero ("Hero")

## Status

ORPHAN. Placed in no `templates/*.json` and in neither `sections/header-group.json` nor `sections/footer-group.json` (measured list, confirmed by grep: no `"type": "cv-hero"`). Shoppers see it only if a merchant adds it from the editor, and then the preset ships every unbacked claim below.

## Purpose

Older home hero: copy column (eyebrow, masked word-by-word h1 with a red italic accent and hand-drawn squiggle, rich-text lede, one CTA, up to three "spec" counters) beside a shop-window photo with a roll-up striped blind, glass sheen, a hanging tag and KIE sweet cut-outs that drop onto the sill and float. No product binding at all: the photo is a bundled KIE image (`sections/cv-hero.liquid:4-8`, `:111`).

## Files (owned / shared)

Owned:
- `sections/cv-hero.liquid`
- `assets/cv-hero.css` (242 lines, `:15`)
- `assets/cv-hero.js` (266 lines, `:143`; not gated in layout)
- `snippets/cv-hero-words.liquid` (only `cv-hero` renders it)
- `assets/hero-window.webp` (only `cv-hero.liquid:111`)

Shared:
- `assets/hero-sweet-cane.webp`, `-wrapped-teal`, `-wrapped-red`, `-lollipop`, `-coin` (`:129-134`): also used by `cv-orbit`, `cv-home-conversion`, `cv-pdp-closer`, `cv-pdp-guarantee`, `cv-product-counter`, `snippets/cv-spec-meter.liquid`.
- `snippets/cv-icon.liquid` (`bag`), theme.css `.cv-cta`, `.cv-cta__shine`, `.cv-eyebrow` (magnetic `.cv-cta` handled by `assets/cv-motion.js:219-231`).
- GSAP core + ScrollTrigger (always loaded).

## Store adaptation findings

1. **HIGH: every default is an unbacked performance claim** (PRODUCT.md:104 lists all of them as "Not verified and never shown store-wide"):
   - heading fallback and default "A clear case that survives a 12 ft drop" (`:27`, schema `:151`), accent "12 ft drop" (`:152`);
   - lede "Holds 1,400 g on a magnet and stays clear for three years" (`:153`);
   - preset spec blocks 12 ft "drop tested", 1,400 g "magnet hold", 2.8 mm "back profile" (`:186-188`; block defaults `:167-169`);
   - hanging tag "36 mo / stays clear" (`:177-178`, `:189`).
   Fix: replace defaults with confirmed facts and live data. Heading default "Cases cut for your exact phone" is still a fit claim; safer: "Phone cases for iPhone and Samsung" (PRODUCT.md:15). Spec blocks: replace the free-text `value` with a `source` select: `designs` (`collections.all.products_count`, live), `pack_3` (setting that must match the 31% automatic discount), `returns` (30, from PRODUCT.md:34). Tag: "Free shipping / on every order". Remove the 12 ft fallback literal at `:27`.
2. **HIGH: the window photo is an AI-generated product image.** `:4-8` says `hero-window.webp` was made with GPT Image 2.5 "so the case design matches the product". PRODUCT.md:35: "KIE ... imagery is limited to shared candy-shop set pieces; product photography stays real." Fix: add a `product` setting and show `product.featured_media` (real photo) inside the window; keep `hero-window.webp` only if it is re-cut as an empty window set piece without a case.
3. **MEDIUM: eyebrow "Est. 1920 · Engineered protection"** (`:150`): "Est. 1920" is accepted brand theatre (STORE-FACTS.md BACKED table), "Engineered protection" is an unbacked quality claim. Fix: "Est. 1920 · Casify phone cases".
4. **MEDIUM: alt text describes an invented product** "A candy-striped Casify clear case on a marble counter in a vintage candy shop" (`:38`). Fix: product title when a product is bound; else empty alt for a pure set piece.
5. **LOW: CTA "Find my model"** (`:154`) links to `cta_url` or all products (`:81`); it does not find a model. Fix: link to `#cvps-fit-<id>` of a phone-scan section if present, else label "Shop cases".
6. **LOW: sweets.** The five KIE sweets (`:127-138`) are set dressing around the window, not presented as products; acceptable under DESIGN.md:183 "sweets drift gently". Keep `show_sweets` but default it to false when the window shows a real product so the product stays the sharpest object (DESIGN.md:189).
7. **LOW: no em/en dashes in shopper copy**; the Liquid comments carry em dashes (`:2`, `:128`), not shopper-facing.
8. **LOW: the pending class lives on `<html>`** (`:16-24`). Two cv-hero instances share one class; harmless (timeout 1600 ms) but it also blocks nothing else.

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "survives a 12 ft drop" | `:27`, `:151-152` | none; PRODUCT.md:104 not verified | UNBACKED |
| "12 ft drop tested" | preset `:186`, block default `:167-169` | none | UNBACKED |
| "Holds 1,400 g on a magnet" / "1,400 g magnet hold" | `:153`, `:187` | none | UNBACKED |
| "stays clear for three years" / "36 mo stays clear" | `:153`, `:177-178`, `:189` | none | UNBACKED |
| "2.8 mm back profile" | `:188` | none | UNBACKED |
| "Cut from your phone's own CAD file" | `:153` | none (manufacturing claim) | UNBACKED |
| "Engineered protection" | `:150` | none | UNBACKED (soft) |
| "Est. 1920" | `:150` | brand voice (PRODUCT.md:96) | Accepted theatre |

## Motion inventory

- data-cv-* attributes: none from cv-motion (only the section hook `data-cv-hero`, `:52`). Section hooks: `data-cvhero-in`, `data-cvhero-count`, `data-kind`, `data-depth`.
- JS `assets/cv-hero.js`: waits for DOMContentLoaded (`:264`). Entry timeline: words rise out of masks, squiggle draws, specs count up, window lifts, blind rolls, sheen, resting sweets drop with squash, floaters pop `back.out(2.2)`, tag swings `elastic.out(1,0.28)` (`:150-181`). Ambient loops: sweets bob, tag sways, sunburst turns `repeat: -1` (`:126-132`), paused off screen via a ScrollTrigger `onToggle` (`:187-191`). Scroll drift `scrub: 0.6` (`:192-195`). Pointer tilt via `quickTo` (`:198-215`), fine pointer only. Hover wiggles (`:232`).
- Reduced motion: JS bails and releases the pending class (`:59`); the inline script never adds `cvhero-pending` under reduce (`sections/cv-hero.liquid:20`). CSS is the finished state (`:12-13`).
- No-JS: complete; the inline pending script cannot run, so nothing hides. The h1 has a screen-reader copy (`:60`) plus `aria-hidden` word spans.
- Pause path for ambient loops: only off-screen pause; there is NO user pause control for the infinite bob/sway/sunburst (DESIGN.md:192 requires one). No `visibilitychange` handler (GSAP's ticker sleeps in hidden tabs, acceptable).
- Hidden-tab guard: `tl.progress(1)` when the document is hidden (`:184`).
- Theme editor: `shopify:section:load` / `unload` (`:256-262`).
- Counter: `data-cvhero-count` counts up any plain number, so it would animate the unbacked "12" and "1,400".

## Motion opportunities

Only worth doing if the merchant wants this hero placed; otherwise leave it orphaned and fix the defaults (finding 1) so an accidental add is honest.
1. **HIGH if placed: product-bound window with quick add.** Bind a product (finding 2); render a `data-cvqp-open data-handle="{{ product.handle }}"` "Choose your phone" button (quick pick asks colour and phone, never guesses; layout loads the dialog because the attribute is in `content_for_layout`, `layout/theme.liquid:208`, `:295`). Motion: the blind roll-up reveals the real photo, the tag becomes a die-cut price ticket (`product.price | money`, live) that swings in with the existing elastic tween.
2. **MEDIUM: add a pause control** for the ambient loops (button toggling a `paused` flag in `syncAmbient`), matching `cv-orbit` / `cv-spotlight`.
3. **LOW: counters only for live values** (design count, pack percent) via the existing `data-cvhero-count`.

## Risks

- Preset is unsafe: adding "Hero" in the editor publishes five unbacked claims at once. Fix the schema defaults and preset blocks before anything else.
- `hero-sweet-*.webp` are shared by 6 sections and a snippet: do not edit or rename them from this section.
- If both `cv-hero` and `casify-hero` were placed, the page would have two h1s.
