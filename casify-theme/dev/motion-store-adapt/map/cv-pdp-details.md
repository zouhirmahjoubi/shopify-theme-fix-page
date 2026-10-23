# cv-pdp-details ("Product: details")

## Status

Live, but it renders nothing today.
- Placement: `templates/product.json:862` (key `details`, 17th of 22, after `showcase`, before `guarantee`) and `templates/product.convert.json:395` (key `details`, 16th of 17). Both save only `heading: "On the label"`.
- The section renders only when the product has a description or the `custom.highlights` metafield (`sections/cv-pdp-details.liquid:18`). PRODUCT.md:32 says product descriptions are currently empty, and no highlights metafield is known (STORE-FACTS.md:389 lists the metafields to confirm; `custom.highlights` is not among the ones seen). So in practice it is hidden on every product until the merchant fills one.
- There is no script, no motion and no layout gate. The stylesheet is printed only when the section renders (`:19`).

## Purpose

It shows the product's own facts and nothing else: a highlights list from `product.metafields.custom.highlights` (list of single-line text, each with a red check icon) and the product description (rich text).
- Imported supplier descriptions get `alt="undefined"` emptied, and their images are made lazy (`:32`).
- The section is honest by construction: with no product data, it renders nothing.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-details.liquid` (50 lines)
- In a shared file, the selector block `.cvp-details*` in `assets/cv-pdp-story.css:79-88` (and `:212`, responsive) is used only by this section.

Shared (coordinate before editing):
- `assets/cv-pdp-story.css`: 18 sections. Base `.cvp`, `.cvp__inner`, `.cvp__h2`, `.rte` styles.
- `snippets/cv-icon.liquid`: the `check` glyph has a `.cv-ico__draw` path (`snippets/cv-icon.liquid:223-226`); 53 users.
- `assets/theme.css`: `.cv-ico--anim` keyframes (`:992-998`) and their reduced-motion override (`:3228-3231`), if the opportunities use `animate: true`.
- `templates/product.json` / `templates/product.convert.json` (`details` key only).

## Store adaptation findings

1. **The section is invisible on every product today.**
   - Not a bug, but the merchant may think the section is broken.
   - Fix, low and editor only: in `request.design_mode`, when there is neither a description nor highlights, render a dashed draft note. Example: "This product has no description or highlights yet. Add a description in Shopify admin, or a list in the metafield custom.highlights." Follow the pattern of `sections/cv-pdp-before-after.liquid:180`. It is never shown to shoppers.
2. **The metafield definition may not exist.**
   - `custom.highlights` must be a "List of single line text" definition. If the merchant creates it with another type, `.value` loops break.
   - Fix: guard with `{%- if highlights.size > 0 -%}`. Note in the schema paragraph that the definition must exist. Creating it is a store change that needs merchant confirmation (PRODUCT.md:33).
3. **Supplier descriptions may carry unverified performance claims.**
   - Imported descriptions (when filled) commonly say "military-grade drop protection", "anti-yellowing" and similar.
   - PRODUCT.md:104 allows such claims "only on a product whose own data states them". The description is the product's own data, so the theme may show it.
   - Flag for the merchant: when descriptions are filled, review them for the unverified list in PRODUCT.md:104 (12 ft drop, MIL-STD-810G, and so on). The theme must not filter or rewrite them.
4. **Em and en dashes in descriptions are outside theme control.** The no-dash rule applies to theme copy. Descriptions are merchant data. No change.
5. **The `replace` chain is brittle.**
   - `replace: '<img ', '<img loading="lazy" decoding="async" '` (`:32`) can duplicate a `loading` attribute if the supplier HTML already has one. Browsers take the first attribute, which is ours, so it is harmless.
   - The `alt="undefined"` replacement only matches with a leading space and double quotes. Also handle `alt='undefined'`. Low priority.
6. **The heading default "On the label" is a fine Casify voice.** "label" refers to the product label, not candy. No dashes, prices or claims in theme copy.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Highlights lines | `product.metafields.custom.highlights` (`:11`, `:24-29`) | Backed by definition (the product's own data). Content unverified; see finding 3. |
| Product description | `product.description` (`:31-33`) | Same as above. |

The theme itself adds no ratings, counts, guarantees, delivery times or percentages.

## Motion inventory

- `data-cv-*` attributes: none. `cvw` hooks: none. The root is `.cvp`, not `.cvw`, so `cv-pdp-home-motion.js` does not touch it (`assets/cv-pdp-home-motion.js:42` checks for `.cvw`).
- MOTION-SYSTEM.md 6.1 lists it as "no entrance (cv-pdp-story.js handles behaviour only)". In fact `cv-pdp-story.js` has no details code either.
- The check icons are rendered without `animate` (`:27`), so they are static.
- Reduced motion, no-JS and the theme editor are not applicable: the section is fully static and readable.

## Motion opportunities

Keep these restrained. This is reading content, and DESIGN.md says decoration never replaces decisions. Value is low to medium, and only once data exists.
1. **Medium: ticks draw in as the list enters.**
   - Add `data-cvpd` on the section, and `data-cvpd-item` on each `<li>`.
   - New owned script `assets/cv-pdp-details.js`, loaded via a layout gate `content_for_layout contains 'data-cvpd'` (layout is shared, so coordinate).
   - Behaviour: on ScrollTrigger `top 85%` with `once: true`, stagger the items `y: 10 -> 0`, `autoAlpha 0 -> 1` (0.4 s, 0.06 stagger, `power3.out`), and DrawSVG each check's `.cv-ico__draw` path 0% to 100%. Set the start states in JS only, so no-JS stays readable (MOTION-SYSTEM.md 3.4: do not use `data-cv-reveal`).
   - Use `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` so reduced motion gets the static list.
   - Handle `shopify:section:load` / `unload` following MOTION-SYSTEM.md 4.6.
   - Cheaper alternative, with no new script: pass `animate: true` to `cv-icon` (`:27`). The CSS draw then runs at page load, not on view, and is already disabled under reduced motion (`assets/theme.css:3228-3231`). The draw would be over before the shopper scrolls there, so this alternative is low value.
2. **Low: heading underline.** Draw a short red dashed rule under "On the label" with DrawSVG when it enters. This is the label metaphor.
3. **Low: description images.** Fade description images in as they lazy-load (`img.decode()` then a 240ms opacity), only when motion is allowed.

## Risks

- Nothing renders today, so motion work here has no visible effect until the merchant adds descriptions or highlights. Rank it last in this family.
- A new script needs a new layout gate line in `layout/theme.liquid` (shared). Alternatively, add the details block to `cv-pdp-home-motion.js` (shared by 11 sections) by giving the root the `cvw` class. That changes its padding and border (`assets/cv-pdp-home.css:14-25`), so avoid it.
- Description HTML is uncontrolled. Any motion that targets `.rte` children must tolerate tables, iframes and inline styles.
