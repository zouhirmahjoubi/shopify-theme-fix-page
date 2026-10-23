# cv-pdp-fit ("Product: fit list")

## Status

Live on both product templates:
- `templates/product.json`, key `fit`, 7th in `order`. Subheading: "These are the phone models this case is made for…". Placeholder: "e.g. iPhone 16 Pro or Galaxy S24".
- `templates/product.convert.json`, key `fit`, 9th in `order`. Subheading: "These are the iPhone and Samsung models this case is made for…". Same placeholder.

The section renders only when a phone-model option is found (`sections/cv-pdp-fit.liquid:169-188`).

## Purpose

"Made for your exact model": an order pad listing the product's real phone-model option values, with a search box.
- Choosing a model sends `cvs:choose` to the buy box and scrolls back to Add to bag (`assets/cv-pdp-story.js:74-81`, `backToSlip()` `:26-31`).
- A no-match state links to all products.

## Files (owned / shared)

Owned:
- `sections/cv-pdp-fit.liquid`. Nothing else is fit-only.

Shared:
- `assets/cv-pdp-story.css`: fit rules at `:43-77`, mobile `:217-218`, reduced motion `:224-225`, `.cvp-pad` and `.cvp` base. Tagged by 18 sections.
- `assets/cv-pdp-story.js`: the fit module `:48-87`.
- `assets/cv-pdp-slip-motion.js:153-166`: the fit entrance and filter nudge. The file exits without `[data-cv-pdp]` or under reduced motion (`:31`).
- `assets/pdp-slip-paper.png`: also used by cv-pdp-closer, cv-pdp-guarantee and cv-product.
- `assets/cv-product.js:523`: the `cvs:choose` handler.

## Store adaptation findings

1. **A model looks chosen before the shopper picks (Product Principle 2).**
   - `aria-pressed` is computed from `product.selected_or_first_available_variant` (`:168`, `:213`). On a plain product URL, the first available model renders pressed, with a red border and bold text (`cv-pdp-story.css:74`).
   - The JS also re-marks it from the buy box's `cvs:change` (`cv-pdp-story.js:84-86`).
   - Fix:
     - Owned Liquid: use `product.selected_variant` (blank on plain URLs) for the initial pressed state.
     - Shared JS: ignore `cvs:change` for marking until a real choice. Use the same signals as the carousel (`cv-pdp-carousel.js:1241-1251`), or a fit-list click.
2. **The placeholder names models the product may not fit.**
   - "e.g. iPhone 16 Pro or Galaxy S24" in both templates (the schema default `:234` is "e.g. iPhone 16 Pro").
   - On an iPhone-only case (e.g. `tech-fabric-magnetic-phone-case-for-iphone`, the `pitch_products` in `templates/product.json:14`), "Galaxy S24" is wrong.
   - Fix (owned Liquid): support an `[example]` token, or use it when the setting is blank, filled from the product's own values: `model_option.values.last`, or the first value containing "Pro".
3. **The Shop Counter subheading hardcodes brands.**
   - "These are the iPhone and Samsung models this case is made for" (`templates/product.convert.json`, fit `subheading`) is wrong for iPhone-only or Samsung-only products.
   - Fix (owned Liquid): add a `[brands]` token built from the option values: contains "iphone" → iPhone; "galaxy" or "samsung" → Samsung; "pixel" → Pixel; joined with " and ". Alternatively, use the neutral product.json wording "phone models". The template value change is in a shared file, so edit only the `fit` key.
4. **Count and pluralisation.** The count and its English pluralisation are hardcoded: "N model(s)" (`:207`, `cv-pdp-story.js:63`). Fine for an English store. Low priority.
5. **No-JS.** The list is fully readable without JS, but the buttons do nothing.
   - Optional improvement: render each model as a link to `{{ product.url }}?variant=<id>`, where the id is the first available variant with that model and the current colour (real data).
   - With JS, intercept the click and dispatch `cvs:choose` instead.
6. **Clean:**
   - The list is the product's real options (`:210-215`).
   - The empty state links to `routes.all_products_collection_url`.
   - No candy-as-product, no other brand, no dashes, no prices.

## Claims register

| Claim | Source | Status |
|---|---|---|
| "Made for your exact model" / "These are the phone models this case is made for" | The product's own model option values | Backed |
| "[n] models" | `model_option.values.size` and the filter count | Backed |
| "This case isn't made for that phone." | The search over real values | Backed |
| "These are the iPhone and Samsung models…" (convert template) | Static text | **Can be wrong per product** (finding 3) |
| Placeholder "e.g. … Galaxy S24" | Static text | **Can name an unsupported model** (finding 2) |

## Motion inventory

- **cv-motion attributes (`data-cv-*`):** none. Hooks: `data-cvp-fit`, `data-cvp-fit-filter`, `data-cvp-fit-count`, `data-cvp-model`, `data-cvp-fit-empty`.
- **Entrance** (`cv-pdp-slip-motion.js:153-166`):
  - The pad rises (`expo.out`).
  - The model buttons cascade (stagger amount .55), at `top 82%`.
  - On filtering (`cvp:filter`, dispatched from `cv-pdp-story.js:66`) the visible buttons nudge.
- **CSS:** a hover lift on the model buttons (`cv-pdp-story.css:73`), turned off under reduced motion (`:224-225`).
- **GSAP plugins used:** ScrollTrigger.
- **Reduced motion:** slip-motion exits (`:31`). CSS removes the transitions.
- **No-JS:** the full static list and search field. The search does nothing without JS.
- **Theme editor:** no `shopify:section:load` handling in `cv-pdp-story.js` or `cv-pdp-slip-motion.js`. After an editor re-render the buttons and filter are inert until reload.
- **Hidden-state risk:** `gsap.set(pad/models,{opacity:0})` waits for a `once` ScrollTrigger. If it never fires, the list stays invisible.

## Motion opportunities

1. **HIGH: Model pick handoff to the buy box.**
   - On click, a small ticket token with the model name arcs from the chosen chip to the buy box model picker (`MotionPathPlugin`, loaded on product templates), while the page scrolls there (`backToSlip`).
   - Then the picker pulses (counter motion already pulses the picker on change), and the chip gets a red "stamp" mark (scale 1.4 → 1, rotate -8 → 0).
   - Reduced motion: instant scroll and focus only (current behaviour).
   - This links the fit list to the buy box visually and enforces "model fit first".
2. **MED: Filter reflow with Flip.** Capture `Flip.getState(buttons)` before toggling `hidden`, then `Flip.from(state, {absolute: true, stagger: .01, onEnter/onLeave fades})`. Flip is loaded on product templates. Replace the current nudge (`cv-pdp-slip-motion.js:162-164`).
3. **MED: Count roll.** Roll the "[n] models" number on filter (a GSAP counter), and draw the "no match" ticket in with a short stamp.
4. **LOW: Selected chip.** A teal check drawn with DrawSVG inside the pressed chip.
5. **Do not use `data-cv-reveal`.** It hides content without JS (`assets/theme.css:1073`).

## Risks

- Behaviour and motion live in shared files (`cv-pdp-story.js` is also used by cv-pdp-closer, guarantee, shelf and showcase; `cv-pdp-slip-motion.js` drives the order slip). Scope edits to `[data-cvp-fit]`.
- `cvs:choose` must carry the real option index (`data-option-index`, `:190`). Keep the model-option detection in sync with `cv-product-counter.liquid` and `cv-pdp-carousel.liquid:35-51`. Three copies of the same heuristic exist.
- Model lists can be 20 to 40 values (PRODUCT.md). Any stagger must use `stagger.amount`, not `each`, to cap the duration (as the current code does).
