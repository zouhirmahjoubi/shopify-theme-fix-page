# cv-pdp-promises ("Product: promises & FAQ")

## Status

Orphan: placed in no template and no section group.
PRODUCT.md:48 records it as an early-draft section superseded by `cv-pdp-guarantee` (promises + FAQ + closing), which is live on both product templates (`templates/product.json` and `templates/product.convert.json`, key `guarantee`).

## Purpose

Up to four paper "promise tickets" for the confirmed store-wide facts, then a short FAQ on the order pad with FAQPage structured data (`sections/cv-pdp-promises.liquid:1-7`, tickets `:19-31`, FAQ `:33-49`, JSON-LD `:51-66`).

## Files (owned / shared)

Owned:
- `sections/cv-pdp-promises.liquid` only.
- NOT owned, despite the name: `assets/cv-pdp-promises.js` is the Shop Counter's promise-stamps module, loaded when markup contains `data-cvc-promises` (`layout/theme.liquid:314-317`). It never touches this section. Do not edit it for this section.

Shared:
- `assets/cv-pdp-story.css`: tickets `:91-116`, FAQ `:118-151` (the `.cvp-faq*` classes are also used by `sections/cv-pdp-guarantee.liquid:32-42`), responsive `:211-216`, reduced motion `:224-225`.
- `snippets/cv-icon.liquid` with `animate: true` (`:24`), which engages infinite CSS animations in `assets/theme.css:992-997` (reduced-motion kill `:3228-3231`).

## Store adaptation findings

1. **HIGH (if placed): duplicate FAQPage schema and duplicate id.**
   - This section emits FAQPage JSON-LD (`:51-66`) and `id="cvp-faq"` (`:34`).
   - cv-pdp-guarantee, live on both product templates, emits the same (`sections/cv-pdp-guarantee.liquid:32`, `:52`). Two FAQPage blocks on one URL and a repeated id.
   - Fix (owned): id `cvp-faq-{{ section.id }}`; add a checkbox `emit_schema` (default false, info "Turn on only if no other FAQ section is on this template").
2. **MEDIUM: ambient icon motion that never stops.** `animate: true` (`:24`) gives each ticket icon an infinite pulse or fall (`theme.css:996-997`). DESIGN.md:183 asks for long-running ambient motion to pause offscreen. Fix (owned): drop `animate: true` and give the icons a one-shot entrance instead (opportunity 1).
3. **LOW: new-block defaults duplicate the preset.** A new ticket defaults to "Free shipping / On every order" (`:93-94`) and a new question to the preset's first question (`:102-103`). Fix: guard rendering with `{%- if b.settings.title != blank -%}` and `{%- if b.settings.question != blank -%}`, and make new-block defaults blank so nothing repeats by accident.
4. **LOW: tickets do not link to the policy.** The "30-day returns" ticket could link to the store's Return Policy page (handle `return-policy`, updated to 30 days per PRODUCT.md:59). Add an optional `url` setting per ticket; no default link.
5. **Clean:** every default is a confirmed fact; no other brand, no placeholder, no prices, no em or en dashes. "Ships in 1-3 business days" uses a hyphen.

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "Free shipping / On every order" | `:93-94`, preset `:111` | PRODUCT.md:34 | Backed |
| "30-day returns / Change your mind within 30 days" | preset `:112` | PRODUCT.md:34, :59 | Backed |
| "Ships in 1-3 business days / From the day you order" | preset `:113` | PRODUCT.md:34 (dispatch within 1 to 3 business days) | Backed |
| "Pack savings / Applied automatically at checkout" | preset `:114` | PRODUCT.md:33, :39 | Backed |
| FAQ "Orders leave us within 1 to 3 business days, and shipping is free." | `:103`, preset `:115` | PRODUCT.md:34 | Backed |
| FAQ "Yes. You have 30 days to return it." | preset `:116` | PRODUCT.md:34 | Backed |

## Motion inventory

- `data-cv-*` attributes: none. No `data-cvw-*` hooks and no `.cvw` class, so cv-pdp-home-motion.js does nothing here (its FAQ marks run only inside `[data-cvw-guarantee]`, `cv-pdp-home-motion.js:413-420`).
- CSS only: icon draw / pulse / fall (`theme.css:992-997`, infinite), static ticket tilts (`cv-pdp-story.css:104-107`), FAQ mark rotation on open (`:148`) with a reduced-motion transition kill (`:224-225`).
- No-JS: native `<details>` FAQ; fully readable.
- Theme editor: nothing to re-init.

## Motion opportunities

Low value while orphaned; record for a future placement:
1. **Medium: tickets dealt and stamped.** On enter (`top 82%`, once): tickets drop from y -24 with alternating rotation (stagger 0.12, `back.out(1.6)`, 420 ms), then each icon is "stamped" (scale 2.2 to 1, 240 ms), the same language as the guarantee vows (`cv-pdp-home-motion.js:427-436`). Owned script tagged from the section.
2. **Low: FAQ height animation.** On `toggle`, tween `.cvp-faq__a` height 0 to auto (240 ms) and rotate the mark; reduced motion keeps the native instant toggle.
3. All inside `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`, `clearProps` at the end, no content hidden by CSS.

## Risks

- Name collision with `assets/cv-pdp-promises.js` (owned by the Shop Counter flow). A later agent must not treat that file as this section's.
- `.cvp-faq*` styles are shared with cv-pdp-guarantee; restyle via a section-scoped class, not by editing the shared rules.
- Placing it next to cv-pdp-guarantee duplicates promises, FAQ and schema. Recommend keeping it orphan.
