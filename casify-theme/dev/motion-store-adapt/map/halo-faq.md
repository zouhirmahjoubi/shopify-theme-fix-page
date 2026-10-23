# halo-faq ("Halo — FAQ")

## Status

**Orphan.** Not in any `templates/*.json` or `sections/*-group.json`. Preset present (`sections/halo-faq.liquid:57-119`), no `enabled_on`, so it can be added to any template. `sections/main-halo-product.liquid:202` (also orphan) links to `#halo-faq` ("Not sure? Find my model"), which is this section's hardcoded id (`:1`).

The live product template already answers FAQs honestly in `cv-pdp-guarantee` ("Product: FAQ & close", preset Q&A at `sections/cv-pdp-guarantee.liquid:134-135`, FAQPage JSON-LD at `:49-52`); the FAQ page uses `cv-page` (`templates/page.faq.json:4`).

## Purpose

A heading plus a `<details>` accordion of Q&A blocks (first one open). On a product page it should remove the last doubts: fit, returns, shipping, dispatch.

## Files (owned / shared)

Owned:
- `sections/halo-faq.liquid` (121 lines; no `stylesheet_tag`, no `render`, no script).

Shared:
- `assets/theme.css`: accordion `.acc`, `.acc__sum`, `.chev`, `.acc__panel` `626-648` and mobile `4252-4253` (also used by `sections/main-halo-product.liquid:352-382`; `cv-cart.liquid` uses its own `cv-acc__panel`); `.halo-acc__body` `3648-3650` (shared with main-halo-product); §37 `.halo-faq` `3820-3821` (class also used by `main-halo-product.liquid:346` as `id="halo-accordions"`); §31 `.halo-sec*` `3689-3693`; padding helper `4147`; `[data-halo-reveal]` `3905-3921`.
- `assets/halo.js` (no-op today) via `layout/theme.liquid:216-218`.

## Store adaptation findings

1. **Preset answers are built on unverified product claims and wrong service facts.** Every preset answer except the question texts must go:
   - Fit (`:65`): "cut from the manufacturer's CAD file", "Every Halo", "Pick your model above" (no picker above on non-product templates).
   - MagSafe (`:72`): "full 18-magnet ring", "1,400 g of pull force", "full Qi2 25W".
   - Yellowing (`:79`): "UV-stable polycarbonate with a bonded top coat", "36 months of accelerated exposure", "warranty replacement" inside two years.
   - Thickness (`:85-86`): "2.8 mm ... 12-foot rating", "corners are 4.7 mm".
   - Buttons (`:93`): "separate, harder durometer", "two-year warranty".
   - Screen (`:99-100`): "reimburse up to $200 ... two years ... fitment card".
   - Returns (`:107`): "90 days, any reason", "prepaid label".
   - Shipping (`:114`): "Order before 2pm CT ... leaves Austin the same day", "US delivery is 2–4 business days and free over $45", "International is 6–11 days with duties calculated at checkout".
   PRODUCT.md Evidence on Hand lists 12 ft, 1,400 g, 2.8 mm, 36-month clarity, the $200 Screen Promise, "Ships in 24h from Austin, TX", 90-day returns and "free shipping over $40 or $45" as not verified; the confirmed facts are free shipping on every order, 30-day returns, dispatch in 1 to 3 business days, no dispatch location, no order-by cutoff.
2. **Replacement preset (honest, no dashes):**
   - "Will it fit my exact phone?": "Each case is made for the phone models listed in the model picker on this page. Choose yours there before you add it to your bag. If your phone is not in the list, this case is not made for it yet." On product pages append the live list or count from the model option (detection pattern `sections/cv-pdp-fit.liquid:12-28`), e.g. "Made for 24 phone models, from iPhone 13 to iPhone 17 Pro Max" computed from `product.options_with_values`.
   - "How much is shipping?": "Shipping is free on every order, with no minimum."
   - "When will my order leave?": "Orders leave us within 1 to 3 business days."
   - "Can I send it back?": "Yes. You have 30 days to return it." (wording already used live in `cv-pdp-guarantee.liquid:135`).
   - "Do I save if I buy more than one?" only when backed by the live discounts: "Yes. Two cases take 18% off and three take 31% off, applied automatically at checkout." Percentages must match the store's automatic discounts (PRODUCT.md Capabilities and Constraints); better: compute the sentence from the buy box's pack buttons (`[data-cv-pack] data-cv-discount`, `sections/cv-product-counter.liquid:584-588`) or omit.
3. **Block default ships a question with no answer.** Block default question "Will it fit my exact phone?" (`:32`) with a blank `answer` (`:35-37`) renders an empty accordion. Fix: render a block only when both `question` and `answer` are filled; blank default question.
4. **Heading and tick re-insert Halo copy.** Heading fallback/default "The questions our support inbox actually gets" (`:4`, `:54`) implies a support history; tick "Section 06 — before you buy" (`:3`, `:48`) has an em dash and a page-order number. Fix: heading default "Before you buy"; tick blank by default and hidden when blank (DESIGN.md: no eyebrow above every heading); drop the `| default:` fallbacks.
5. **Em and en dashes in preset answers.** `:65`, `:72`, `:100` (em), `:114` ("2–4", "6–11", en). All go with the rewrite.
6. **Answer markup misses the accordion's inner wrapper (layout bug).** `.acc__panel` is a `grid-template-rows: 0fr/1fr` container that expects a `> div` child carrying padding, `min-height: 0` and `overflow: hidden` (`theme.css:646-648`). Here the richtext `<p>` tags are direct children (`:14`), so answers render with no side or bottom padding (flush against the card edge) and the open/close row animation cannot collapse. Fix: `<div class="acc__panel"><div>{{ block.settings.answer }}</div></div>` or, better, owned markup/CSS.
7. **Mobile question type below the design minimum.** Questions are Special Elite uppercase at 11 px, 10 px under 560 px (`theme.css:638`, `4252`). DESIGN.md: keep mobile labels at about 11 to 12 px or larger. Fix in owned CSS (do not change shared `.acc__sum`, main-halo-product uses it).
8. **No FAQPage structured data.** cv-pdp-guarantee emits JSON-LD (`sections/cv-pdp-guarantee.liquid:49-52`); this section does not. Add it, built from the same blocks, but never from blocks with unverified claims.
9. **Hardcoded id and decorative SVG.** `id="halo-faq"` (`:1`) duplicates if placed twice (keep a stable anchor via a setting if the old link matters); chevron SVG (`:12`) lacks `aria-hidden="true"`.
10. **Editor name** "Halo — FAQ" (`:22`, `:59`): rename "Casify: questions".

## Claims register

| Claim | Where | Status |
|---|---|---|
| Cut from manufacturer's CAD file; no universal mould | `:65` | Unbacked. |
| 18-magnet ring, 1,400 g pull, Qi2 25W charging | `:72` | Unbacked (1,400 g listed as not verified; others not in evidence). |
| UV-stable polycarbonate, no colour shift after 36 months accelerated exposure; two-year yellowing warranty | `:79` | Unbacked (36-month clarity listed as not verified; no warranty confirmed). |
| 2.8 mm back, 4.7 mm corners, 12-foot rating | `:85-86` | Unbacked. |
| Harder-durometer buttons, two-year warranty | `:93` | Unbacked. |
| Screen reimbursement up to $200 for two years | `:100` | Unbacked (Screen Promise not verified, never store-wide). |
| 90-day returns, prepaid label, full refund | `:107` | Unbacked; contradicts confirmed 30-day returns. |
| Same-day dispatch from Austin before 2pm CT | `:114` | Unbacked (no dispatch location, no cutoff). |
| US delivery 2-4 business days, free over $45; international 6-11 days, duties at checkout | `:114` | Unbacked; "free over $45" contradicts confirmed free shipping on every order; no delivery promise is confirmed. |
| "The questions our support inbox actually gets" | `:4`, `:54` | Unbacked framing. |
| Proposed: free shipping on every order; 30-day returns; dispatch in 1 to 3 business days | replacement preset | Backed (PRODUCT.md Capabilities and Constraints, merchant 2026-09-14). |
| Proposed: phone models this case fits | replacement | Backed by `product.options_with_values` at render time. |
| Proposed: 18% / 31% pack savings | optional | Backed only if read from the live pack buttons or confirmed equal to the store's automatic discounts. |

## Motion inventory

- cv-motion attributes: none.
- `data-halo-reveal` on the header (`:2`): hidden by `theme.css:3906`, never revealed because `assets/halo.js` exits at `:19-20` (no `.halo-tpl` anywhere). **Heading invisible unless reduced motion** (`theme.css:3918-3921`).
- Accordion: native `<details>`; chevron rotates via CSS (`theme.css:644-645`); panel grid-rows transition (`:646-648`) does not animate on open because `<details>` content is removed from rendering while closed and the wrapper is missing (finding 6). Reduced motion: global clamp `theme.css:3307-3315`.
- No GSAP, no section JS, no `shopify:section:load` / `shopify:block:select` handling (selecting a block in the editor does not open its `<details>`).
- No-JS: heading invisible (bug); accordion works.

## Motion opportunities

Owned `assets/cvhfq-faq.css` + `assets/cvhfq-faq-motion.js` printed by the section (idiom `sections/cv-value-stack.liquid:18,128`). Prefix `cvhfq-`, root `data-cvhfq` (unused). Keep native `<details>` so it works without JS.

1. **(Medium) Smooth open/close with GSAP.** Intercept `summary` click: when opening, set `open`, measure the panel and tween `height` from 0 with `power3.out` 240 ms while the chevron rotates and the answer text rises 6 px; when closing, tween to 0 then remove `open`. Respect `prefers-reduced-motion` (instant toggle). Optional one-open-at-a-time mode as a setting.
2. **(Medium) Scroll entrance.** ScrollTrigger batch: question tickets deal in from y 14 with a slight rotate (-1.5deg to 0), stagger 0.06, like tickets laid on a counter; header rises with SplitText lines.
3. **(High, product pages) Answer that sells the fit.** In the fit answer, render the real phone-model chips (from the model option) and a "Choose my phone" button. Clicking a chip dispatches `cvs:choose` to `[data-cv-pdp]` with the model option index and value (contract: `assets/cv-product.js:523-531`, used by `assets/cv-pdp-carousel.js:1032`), then ScrollToPlugin scrolls to `#cvPdp`; the buy box answers with `cvs:change`, and the chip shows a DrawSVG tick "On your slip". No add to cart from the FAQ.
4. **(Low) Theme editor.** Handle `shopify:block:select` to open and scroll to the selected Q&A, `shopify:section:load` to re-init.

## Risks

- `.acc*` and `.halo-acc__body` are shared with `main-halo-product.liquid:346-382`; fixing the wrapper or the mobile font size must happen in owned CSS with new class names, not by editing theme.css.
- Any FAQ about delivery time must not promise a delivery date: only dispatch (1 to 3 business days) is confirmed.
- FAQPage JSON-LD must mirror the visible answers exactly.
- Two FAQ sections on one product page (this plus cv-pdp-guarantee) would duplicate the role; PRODUCT.md says overlapping roles should appear once per page.
