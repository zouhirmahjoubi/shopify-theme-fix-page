# cv-cost-compare ("Convert [em] Cost compare")

Family: halo-2. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
In quotes, `[em]` / `[en]` mark an em / en dash that exists in the source (never copy them forward).

## Status

**orphan**: placed in no `templates/*.json` and in neither section group. No `enabled_on`; the preset
(:95-104) ships as is when added.

## Purpose

A "Do the math" ticket that argues a cheap case costs more: two side-by-side lists (rows from `row`
blocks; left "Skipping this case" with struck-through costs, right "This case"), a big verdict number
("$180+ saved over three years") and a ghost CTA that scrolls back to the buy box. The comment
(:1-10) admits every number is merchant-typed copy, not a calculation.

## Files (owned / shared)

Owned:
- `sections/cv-cost-compare.liquid` (106 lines; no own CSS/JS/asset files)

Shared (do not edit from this lane):
- `assets/theme.css`: `.cv-cost__*` (:1609-1633; only this section prints them, but the file is
  shared); `.cv-cost` root box (:2715, dashed red ticket; only this section prints `cv-cost`);
  base `.cv-sec` (:1004), `.cv-sec__hd` (:1011-1030), `.cv-sec__lede` (:1031), `.cv-eyebrow`
  (:1033), `.cv-cta--ghost` (:1808), `[data-cv-reveal]` (:1073-1084), `.cv-split` (:1086-1092),
  reduced-motion mirror (:3219-3270 per MOTION-SYSTEM.md 3.2).
- `assets/cv-motion.js`: `data-cv-reveal`, `data-cv-split`, `data-cv-scroll-to-buy` (:235-241), and
  the `.cv-cta` magnetic pull.
- `snippets/cv-icon.liquid` (`arrow-right`, :248).

## Store adaptation findings

1. **H, every number is invented and one repeats a known false promise.** Preset rows (:99-101):
   "Replacement cases (2, after they crack or yellow) $30 / $0", "Average screen repair $200 /
   Covered up to $200", "This case, lasts 3+ years [em] / $39"; verdict default "$180+" "saved over
   three years" (:79-80). "Covered up to $200" is the $200 Screen Promise that PRODUCT.md:41 and :103
   list as unverified and in conflict with the confirmed 30-day returns. "$39" matches no product
   (catalogue is $23.99 to $49.99, PRODUCT.md:15). Fix: rebuild as an honest **pack math** ticket
   computed from live data on product templates (PRODUCT.md:15 "lift order value through multi-case
   packs", :39 the 18% / 31% automatic discounts apply to the whole order):
   - `each = product.selected_or_first_available_variant.price`
   - Left column "One case": `each | money`, shipping "Free" (PRODUCT.md:34).
   - Right column "3-case pack": per case `each | times: (100 - pct3) | divided_by: 100 | money`,
     total for three, and the saved amount `each | times: 3 | times: pct3 | divided_by: 100 | money`.
   - Optional middle "2-case pack" with `pct2`.
   - `pct2` / `pct3` as `range` settings (defaults 18 and 31, info "Must match the automatic
     discount in Shopify admin, or checkout will charge a different price than the page shows",
     copying cv-product-counter.liquid:830).
   - Verdict = the live saved amount, label "saved on a 3-case pack". No time horizon claims.
   Use `money` so the shop currency and format apply. Render nothing when `product` is blank.
2. **H, struck-through "them" values present guesses as prices** (theme.css:1624 line-through). In a
   rebuild only strike through a real compare-at price (variant `compare_at_price`, or the merchant
   fallback $59.99 that PRODUCT.md:102 allows for the buy box) and only when it is higher than the
   selling price.
3. **H, block defaults ship numbers.** Row defaults "Replacement cases" "$30" "$0" (:88-90). Fix: in
   the rebuild, rows become a `source` select (`single`, `pack2`, `pack3`, `shipping`, `returns`)
   with no free-text money fields.
4. **M, dashes.** Subheading default "Not a discount pitch [em] the honest math ..." (:75); preset
   `them: "[em]"` (:101) is a visible em dash; settings info (:79) and editor names (:70, :97). Fix:
   commas; empty values render nothing.
5. **M, framing claims.** Heading "What a cheap case actually costs you" (:15, :74) and "what buyers
   usually spend without this case" (:75) imply buyer data. Fix: heading "Do the pack math", lede
   "Every case in a pack can be a different colour and phone model." (PRODUCT.md:39).
6. **M, CTA is dead off product pages.** `data-cv-scroll-to-buy` (:60) needs `.cv-buy` or `#cvPdp`
   (cv-motion.js:235-241), present only on product templates (cv-product-counter.liquid:208). No
   `enabled_on`. Fix: `"enabled_on": { "templates": ["product"] }`, or render the button only when
   `template.name == 'product'`.
7. **M, content invisible without JS and after an editor add.** Header (:13), both columns (:22,
   :36) and the foot (:59) use `data-cv-reveal`; the heading uses `data-cv-split` (:15). Both are
   `opacity: 0` in plain CSS until cv-motion.js runs (MOTION-SYSTEM.md 3.4 #1), and cv-motion.js never
   re-scans after `shopify:section:load` (#2), so a merchant adding the section in the editor sees a
   blank ticket. Prices must never sit behind this (MOTION-SYSTEM.md 3.4: no `data-cv-reveal` on
   commerce-critical content). Fix: drop the attributes from the columns and verdict; animate from an
   owned script with a pending class on decoration only.
8. **L, Liquid `default:` on copy** (:14-15, :23, :37, :52) prints text after the merchant clears a
   setting; fixed `id="cv-cost"` (:12) duplicates if placed twice (use `cv-cost-{{ section.id }}`).

## Claims register

| Claim | Where | Status |
|---|---|---|
| "What a cheap case actually costs you" | :15, :74 | UNBACKED framing |
| "what buyers usually spend without this case" | :75 | UNBACKED (implies buyer data) |
| Replacement cases (2, after they crack or yellow) $30 | :99 | UNBACKED |
| Average screen repair $200 | :100 | UNBACKED |
| Covered up to $200 (Screen Promise) | :100 | UNBACKED (PRODUCT.md:41, :103) |
| This case lasts 3+ years | :101 | UNBACKED |
| This case $39 | :101 | UNBACKED (no such price; hardcoded currency) |
| $180+ saved over three years | :79-80 | UNBACKED |
| Proposed: unit price, pack totals, saved amount | rebuild | LIVE (variant price) + BACKED percent (PRODUCT.md:39) |
| Proposed: free shipping | rebuild | BACKED (PRODUCT.md:34) |

## Motion inventory

- cv-motion attributes: `data-cv-reveal` (:13, :59), `data-cv-reveal="left"` (:22),
  `data-cv-reveal="right"` (:36), `data-cv-split` (:15); the CTA has `.cv-cta` (magnetic pull, fine
  pointer) and `data-cv-scroll-to-buy` (smooth unless reduced).
- No section JS, no GSAP, no ScrollTrigger, no editor events.
- Reduced motion: cv-motion.js reveals everything at once; CSS mirror forces visible
  (MOTION-SYSTEM.md 3.2).
- No-JS: whole section invisible (bug, finding 7).

## Motion opportunities

1. **(High) Pack math that reacts to the buy box.** Owned `assets/cv-pack-math.js` (prefix `cvpm`):
   listen to `cvs:change` on `[data-cv-pdp]` (cv-product.js:415, detail `{ variant, each, pct, ... }`)
   and re-compute the per-case and saved amounts when the shopper changes model or style; flip the
   changed numbers with the house yPercent flip (cv-pdp-counter-motion.js:208 pattern) and count the
   saved amount up with a GSAP tween on a proxy object (format with the shop's money format passed in
   a `data-money-format` attribute). Numbers are always printed by Liquid first; JS only updates.
2. **(High) "Choose the 3-pack" CTA.** Replace the plain scroll button with a button that dispatches
   `cvs:pack` `{ qty: 3 }` on the `[data-cv-pdp]` root (cv-product.js:536-540), then GSAP ScrollTo
   `#cvPdp` (ScrollToPlugin always loaded). cv-pack-motion.js then plays the existing slot Flip
   (MOTION-SYSTEM.md 5.5). Reduced motion: instant scroll. Keeps state in cv-product.js.
3. **(High) Entrance**: one ScrollTrigger (`top 78%`, once): the ticket drops in with a slight swing
   (`rotation: -3 -> 0`, `y: -30`, `ease: 'back.out(1.3)'`), the two columns deal in from the sides,
   the struck-through compare-at line draws across (scaleX 0 -> 1 on a pseudo-element via a class),
   the verdict stamps (scale 1.25 -> 1, `CustomBounce` is always loaded). Pending class on decoration
   only; prices always visible.
4. **(Medium) Savings meter**: a thin bar `[data-cvpm-fill]` that grows to `pct3` percent on enter,
   matching the Shop Counter savings meter vocabulary (cv-product.js:276-292).

## Risks

- Any pack figure must equal checkout: percentages come from settings that must match Shopify
  automatic discounts (PRODUCT.md:33, :39); never hardcode 18/31 in Liquid or JS.
- `cvs:change` and `cvs:pack` are owned by cv-product.js (shared); only listen and dispatch, never
  write buy-box DOM.
- theme.css rules `.cv-cost` (:2715) and `.cv-cost__*` (:1609-1633) are in the shared file; a rebuild
  with new markup should use a new owned stylesheet and prefix.
- Overlaps the Shop Counter pack meter and savings line on the same page (PRODUCT.md:37, one role
  per page): place only where it adds the math, not a second pack picker.
