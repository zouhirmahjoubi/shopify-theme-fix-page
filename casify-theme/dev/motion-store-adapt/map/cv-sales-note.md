# cv-sales-note ("Sales note", page section)

## Status

LIVE in `templates/page.json` (section key `sales-note`, :22-25; order :52), the default page template, placed
between `cv-page` and `cv-page-video-reviews`. Its settings are empty (`"settings": {}`), so `count` is blank and
the snippet renders NOTHING to shoppers today (snippets/cv-sales-note.liquid:21-31); in the theme editor it shows
a dashed hint pill (:49-56). `enabled_on: templates ["page"]` (sections/cv-sales-note.liquid:24).

## Purpose

A page-level wrapper for the Shop Counter's "Sales note" block: a pill with a blinking dot, or a rocket line with
a pulsing number, printing a merchant-typed count (`[count] sold this week`), rounded down with "+" when asked,
hidden below `min_count` (sections/cv-sales-note.liquid:1-13, 25-63). On a page there is no product, so only the
typed number is used (snippets/cv-sales-note.liquid:11, 21-23).

## Files (owned / shared)

Owned:
- `sections/cv-sales-note.liquid` (66 lines)

Shared (do not edit from this section's task without coordination):
- `snippets/cv-sales-note.liquid`: also rendered by `snippets/cv-counter-blocks.liquid:20` for the `sales_note`
  block of `sections/cv-product-counter.liquid` (the live default product buy box).
- `assets/cv-pdp-counter.css` (51.5 KB): the whole Shop Counter stylesheet is loaded just for `.cvc__pill` /
  `.cvc__sold` (sections/cv-sales-note.liquid:14-16; rules cv-pdp-counter.css:415-460). Shared with
  cv-product-counter and others.
- `assets/cv-pdp-sales.js` (three.js canvas over the notes) is NOT loaded on pages: its gate sits inside the
  `template.name == 'product'` branch (layout/theme.liquid:302, :310-312). On a page the note only gets the CSS
  blink/pulse.
- `templates/page.json` is shared with cv-page, cv-page-video-reviews and cv-offer-courier.
- Locale key `products.sales_note.editor_hint` (locales/en.default.json:90) is used by the snippet; shared.

## Store adaptation findings

1. HIGH (claim with no live source): the default text "[count] sold this week" (schema :38) pairs with a number
   typed by hand in the theme editor (:37). On a content page (about, policies, FAQ-like pages using the default
   template) a sales count is unrelated to anything on the page, and a "this week" number typed once goes stale
   and becomes false the following week. PRODUCT.md "Evidence on Hand" (:101-105) has no sales figures; the
   2026-10-03 incident involved exactly an invented "25 sold this week" in local templates (PRODUCT.md:74).
   Fix (pick one, merchant decides):
   a) Remove the section from `templates/page.json` (cleanest; it renders nothing today anyway), or
   b) Bind it to store data: read `shop.metafields.<ns>.<key>` (a shop-level metafield the merchant or an app
      updates) through a new `metafield` text setting, the same `namespace.key` contract the product block uses
      (snippets/cv-sales-note.liquid:14-20), and change the default text to a count-neutral "[count] cases sold"
      so it never implies a time window it cannot back. Keep `min_count` and round-down.
2. MEDIUM (layout): the section prints a bare `<p class="cvc__pill">` with `margin: 10px 0 0` and no container
   (cv-pdp-counter.css:416-422; no `.section-cv-sales-note` rule anywhere in assets/*.css). On a page it sits
   against the viewport edge with no 16-24px gutter (DESIGN.md Layout) and no vertical rhythm. Fix: wrap the
   render in `<div class="cv-sales-note page-width">` (or `max-width: var(--max); margin: 0 auto; padding: 0 24px`)
   with section padding, in the section file (owned), not in the snippet.
3. MEDIUM (weight): loading all of `cv-pdp-counter.css` (51.5 KB) on a page for one pill. Fix: move the ~45 lines
   of pill/sold rules (cv-pdp-counter.css:415-460) into a small owned `cv-sales-note.css` loaded here; leave the
   copy in cv-pdp-counter.css for the product block (a shared-file split needs coordination; the owned-only fix is
   to add the new file and stop loading the counter CSS here).
4. LOW: editor hint for an empty metafield is hardcoded English (snippets/cv-sales-note.liquid:52, shared
   snippet); the other branch is translated (:54). Editor-only.
5. LOW: the schema `info` examples use "Hurry up! [count] items have been sold" (:38), an urgency pattern. Fine as
   help text, but do not ship it as a default.
6. OK: no dashes in shopper strings; no candy as product; no hardcoded currency.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "[count] sold this week" (default text) with a typed number | schema :37-38, rendered by snippets/cv-sales-note.liquid:41, :46 | UNBACKED unless the merchant types a real, current number; nothing in PRODUCT.md evidence; not rendered today (count blank in templates/page.json:24) |
| Rounded "500+" style counts | snippets/cv-sales-note.liquid:24-28 | Derived from the typed number; rounds down, never overstates |

## Motion inventory

- data-cv-* attributes: none.
- CSS only: `.cvc__pill-dot` blinks (`cvc-pill-blink` 1.4s infinite) and the rocket number pulses
  (`cvc-sold-pulse` 1.5s infinite), both inside `@media (prefers-reduced-motion: no-preference)`
  (cv-pdp-counter.css:445-451). Infinite loops never pause offscreen (DESIGN.md Motion: long-running ambient
  motion pauses offscreen).
- On product pages the same markup gets the three.js embers/exhaust (cv-pdp-sales.js) and a GSAP entrance
  (cv-pdp-counter-motion.js:116-121); neither runs on a page.
- Reduced motion: correct (the loops are gated by `no-preference`).
- No-JS: readable (no JS involved).
- Theme editor events: not applicable.

## Motion opportunities

Low value overall: this is a single line of social-proof text, and its claim must be fixed first (finding 1).

1. LOW (scroll reveal): if kept and bound to real data, a one-shot entrance from an owned script printed by the
   section: the number rolls up from 0 to the Liquid value with `data-cv-count` (cv-motion.js:94-119; the value
   comes from the metafield, so the counter only animates real data), with the pill on a `data-cv-reveal`
   wrapper. Caveat: `data-cv-reveal` is invisible without JS (MOTION-SYSTEM.md 3.4.1); acceptable here only
   because the note is non-critical, otherwise use an owned GSAP `from` with a pending class.
2. LOW: pause the infinite CSS blink when offscreen: toggle a `.is-offscreen` class via IntersectionObserver or a
   ScrollTrigger `onToggle` and set `animation-play-state: paused` (owned CSS after finding 3).
3. Not applicable: buy box, packs, Add to cart, Buy now and cart drawer (no commerce on this section).

## Risks

- The snippet and `cv-pdp-counter.css` are shared with the LIVE product buy box (cv-product-counter via
  cv-counter-blocks). Any change to the snippet's markup or the pill CSS changes the product page. Keep this
  section's fixes inside `sections/cv-sales-note.liquid` (and an optional new owned CSS file).
- Removing the section from `templates/page.json` edits a shared template (three other sections); coordinate.
