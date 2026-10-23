# cv-pdp-delivery ("Product: delivery dates")

## Status

Live on both product templates:
- `templates/product.json`, key `delivery`, 2nd in `order`, directly under `main`.
- `templates/product.convert.json`, key `delivery`, 2nd in `order`. Its `settings` is `{}`, so every schema default ships.

Both have three step blocks: "Ordered" (0-0 days), "Leaves our shop" (1-3 days) and "At your door" (no days).
Script loader: `layout/theme.liquid:330-333` loads `assets/cv-pdp-delivery.js` (defer) when the markup contains `data-cvdl` (or in the editor).

## Purpose

A ship-by ticket directly under the buy box. A road with stops (Ordered, Leaves our shop, At your door) shows calendar dates worked out in the browser, in the shop's time zone (data-tz from Liquid, `sections/cv-pdp-delivery.liquid:74`):
- Business days skip weekends and the holidays the merchant lists.
- An optional cut-off adds an "order within" countdown.
- Per-country extra days come from `localization.country` (zone blocks).

It implements PRODUCT.md "a ship-by date computed from the 1 to 3 business day dispatch window (no delivery promise)". The door step shows "Shown at checkout" because no carrier times are set.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-pdp-delivery.liquid`
- `assets/cv-pdp-delivery.css` (126 lines)
- `assets/cv-pdp-delivery.js` (278 lines)

Shared:
- `layout/theme.liquid:330-333`: the loader.
- `snippets/gsap.liquid` and `assets/gsap-*.js`: uses `gsap`, `ScrollTrigger` and `SplitText`.
- `templates/product.json` and `templates/product.convert.json`: edit only the `delivery` key.

No snippets are rendered. All icons are inline SVG (`:124-136`).

## Store adaptation findings

1. **En dashes in shopper-facing date ranges** (the project rule bans them):
   - `sections/cv-pdp-delivery.liquid:64`: the head range `append: '–'`.
   - `:147`: the stop range `{{ min_d }}–{{ max_d }} {{ unit }}` (the no-JS state, e.g. "1–3 business days").
   - `:93`: the countdown placeholder `<b data-cvdl-count>–</b>`.
   - `assets/cv-pdp-delivery.js:116-118`: `Intl.DateTimeFormat#formatRange` returns an en dash in English ("Thu, Oct 23 – Mon, Oct 27"), and the fallback also concatenates `' – '`.
   - Fix:
     - Liquid: `{{ min_d }} to {{ max_d }} {{ unit }}` and `append: ' to '`.
     - Countdown placeholder: leave it empty (the box is `hidden` until JS fills it).
     - JS: drop `formatRange` and return `fmt.format(a) + ' to ' + fmt.format(b)`. Alternatively, use `formatRangeToParts` and replace the `literal` part between the two dates with `' to '`.
2. **The cut-off countdown contradicts the confirmed facts if enabled.**
   - The setting `use_cutoff` (`:178-181`) defaults to off and is off in both templates.
   - PRODUCT.md "Capabilities and Constraints" says "No dispatch location and no order-by countdown". Turning it on would show an unbacked "Order within HH:MM:SS and it counts as today's order."
   - Fix: add an `info` warning that a cut-off must be a real, kept dispatch time. Or remove the cut-off settings from the schema until the merchant confirms one.
3. **The holidays list is empty in both templates.**
   - Effect: around 25 Dec and 1 Jan the "Leaves our shop" dates will count days the shop may not dispatch.
   - This is a merchant action, not code: list holidays as `YYYY-MM-DD`. Optionally show an editor-only note when `holidays == blank` in Nov and Dec, next to the existing editor note (`:158-160`).
4. **The time zone offset is baked into cached HTML.**
   - `data-tz="{{ 'now' | date: '%z' }}"` (`:74`) can be one hour off for a cached page across a DST change, which matters only near midnight or the cut-off.
   - Low priority. Liquid does not expose an IANA zone, so accept it or re-render daily.
5. **The 1-second timer always runs** (`assets/cv-pdp-delivery.js:176-187`), even with no cut-off, only to catch the day rollover. This is a performance nit: run it every 60 s when `cutoff === null`.
6. **Comments only, not shopper-facing:** the "(Chrismass design system)" and "abcdef library" references (`:2-5`). Optional tidy.
7. **Clean:**
   - Copy is Casify and phone-case neutral ("Ordered", "Leaves our shop", "At your door", "Shown at checkout", "Estimated").
   - The small print says "Estimates. Delivery dates depend on the carrier and your address."
   - No hardcoded prices, no other brand, no candy-as-product.

## Claims register

| Claim | Source | Status |
|---|---|---|
| "Leaves our shop: 1 to 3 business days" (rendered as dates) | Template step `dispatch` min 1 / max 3. Confirmed by the merchant 2026-09-14: "orders dispatch within 1 to 3 business days" (PRODUCT.md Capabilities and Constraints). | Backed |
| "Ordered: Today" | The order day | Backed (trivial) |
| "At your door: Shown at checkout" | No carrier days set | No claim (honest) |
| "Estimated" / "Estimates. Delivery dates depend on the carrier and your address." | Disclaimer | Fine |
| "Order within [time] and it counts as today's order." | `use_cutoff` = false (hidden) | Not shown. **Unbacked if enabled** (PRODUCT.md: no order-by countdown). |
| Country extra days | No zone blocks configured | Not shown |

## Motion inventory

- **cv-motion attributes (`data-cv-*`):** none. Own hooks: `data-cvdl`, `data-cvdl-ticket`, `-track`, `-road`, `-parcel`, `-route`, `-stop`, `-icon`, `-date`, `-arrive-label`, `-arrive-date`, `-cutoff`, `-count`.
- **Section JS:** `assets/cv-pdp-delivery.js:192-247`, one gsap.context and one timeline.
  - ScrollTrigger `top 85%`, once.
  - The ticket lifts in.
  - The arrival date is split by `SplitText` into masked words that rise.
  - The cut-off box pops (`back.out`).
  - The road fills (`scaleX`) while a parcel rides along it, bobbing 5 times, and drops into the last stop.
  - Each stop's icon pops as the parcel reaches it.
  - The countdown digits roll (`:168-171`, only while on screen, via a ScrollTrigger `onToggle`, `:241-246`).
  - Dates re-reveal when the day rolls over (`:179-183`).
- **GSAP plugins used:** ScrollTrigger and SplitText (`SplitText.create(..., {mask:'words'})`).
- **Reduced motion:** `animate = !!gsap && !reduce` (`:49-50`). Dates and the countdown still compute, with no motion. `cv-pdp-delivery.css` has no `prefers-reduced-motion` block, but it has no transitions that would need one. Verify before adding hover transitions.
- **No-JS:** Liquid ranges per stop (`:139-149`) and the head range (`:59-65`) are readable. The parcel is decorative (`aria-hidden`).
- **Hidden tab:** `intro.progress(1)` when the document is hidden (`:247`).
- **Theme editor:** `shopify:section:load` boots and `unload` destroys (`:268-269`). `section:select` and `block:select` finish the intro (`:270-277`). Complete.

## Motion opportunities

1. **MED: Link to the buy box.**
   - On `cvs:added` on `[data-cv-pdp]`, re-stamp the "Ordered" stop: icon scale 1 → 1.25 → 1 with a small rotate, and the "Today" text flashes candy red then settles.
   - It tells the shopper the clock started. No new claim.
   - Reduced motion: none.
   - Add the listener inside the existing context and remove it in `_cvdlDestroy`.
2. **MED: Curved road.**
   - Replace the straight `scaleX` fill with an inline SVG path drawn with `DrawSVGPlugin`, and ride the parcel along it with `MotionPathPlugin`. Both are loaded on product templates (`layout/theme.liquid:173-177`, path = flip = product).
   - Keep the straight road as the static state: the SVG path is decorative and `aria-hidden`.
   - This fits DESIGN.md (striped trims, physical objects).
3. **LOW: A quieter ambient state.** After the intro, the parcel could rest beside "Leaves our shop" (the next real milestone) instead of disappearing into the last stop, which visually suggests delivery is done.
4. **LOW: Performance.** Run the timer every 60 s when no cut-off is set (finding 5).
5. **Do not add `data-cv-reveal`.** `assets/theme.css:1073` hides it without JS, and this section already has its own entrance.

Value: low to medium. The section already has a complete, honest GSAP sequence. Spend effort on the en-dash fix (finding 1) before any new motion.

## Risks

- The section sits right under the buy box, so the intro often starts at page load. Heavier motion here competes with the buy box entrance (`cv-pdp-counter-motion.js`). Keep any addition under about 1 s.
- `formatRange` locale behaviour: replacing it changes the range format in every language. Test `en` and the storefront locale.
- If the merchant later sets carrier days on "At your door", the head switches to that step's range (`:49-67`). That would become a delivery-date claim and needs a real carrier time.
- Edits to `templates/product.convert.json` are risky because `settings` is `{}`. Adding keys there overrides schema defaults for that template only.
