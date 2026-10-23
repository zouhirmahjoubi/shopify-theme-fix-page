# cv-page ("Page: the rule book")

## Status

LIVE on 8 templates, always as the `main` section:

- `templates/page.json` (Default page; order `main, sales-note, video-reviews, offer-delivery`)
- `templates/page.about-us.json` (order `main, hanging_cards`; shares the page with cv-hanging-cards)
- `templates/page.faq.json`
- `templates/page.track-order.json`
- `templates/page.privacy-policy.json`, `templates/page.return-policy.json`, `templates/page.shipping-policy.json`, `templates/page.terms-and-conditions.json` (the four policy templates set `header_badge`, `show_rules: true`)

Behaviour script `assets/cv-pages.js` loads only when `template.name` is `page`, `collection`, `list-collections` or `policy` (layout/theme.liquid:166-168, 338-341), so this section's TOC/bell/badge motion would silently not run if it were ever placed on another template type.

## Purpose

Generic page and policy renderer. Prints `page.content` verbatim in a measured column, lifts a first paragraph containing "Last updated" into the header (sections/cv-page.liquid:24-33), builds an "On this page" contents list from the body's `h2`s with a candy-stripe rail that fills while reading (JS), optionally links the four policy pages to each other (rule handles setting), and ends with a dark "help" panel with a CTA. The section adds no policy wording of its own.

## Files (owned / shared)

Owned (only cv-page references them):

- `sections/cv-page.liquid`
- `assets/badge-ai-returns.png`, `assets/badge-ai-privacy.png`, `assets/badge-ai-terms.png`, `assets/badge-ai-shipping-policy.png` (select options at sections/cv-page.liquid:110-116; referenced only by this section and its policy templates)
- Single-section templates whose only instance is cv-page: `templates/page.faq.json`, `templates/page.track-order.json`, `templates/page.privacy-policy.json`, `templates/page.return-policy.json`, `templates/page.shipping-policy.json`, `templates/page.terms-and-conditions.json`

Shared (do not edit without coordinating):

- `assets/cv-pages.css`: also used by cv-collection, cv-collections-list, cv-contact, snippets/cv-pack-meter.liquid. The `.cvd*` rules (cv-pages.css:367-~430 and the `.cvd` lines inside the `@media` blocks at ~432-475) are effectively cv-page-only; edit only those selectors.
- `assets/cv-pages.js`: shared module file (signs, packMeter, aisle, ruleBook, contact). Only the `ruleBook` IIFE (cv-pages.js:282-359) belongs to this section.
- `assets/cv-badges.css`: also loaded by cv-collection and cv-search (sections/cv-page.liquid:16). cv-page uses none of its selectors that I could find (`.cvd__badge` is styled in cv-pages.css:369); the stylesheet_tag looks vestigial.
- `assets/contact-bell.webp`: also used by cv-contact (help panel bell, sections/cv-page.liquid:91).
- `snippets/cv-icon.liquid` (clock, arrow-right), used by ~50 sections.
- `assets/theme.css` (`.cv-crumbs` theme.css:1130, `.cv-page-root`, `.rte`), `assets/cv-motion.js` (injects the global `.cv-progress` bar whenever `.cv-page-root` exists, cv-motion.js:172-185).
- GSAP bundle via `snippets/gsap.liquid` (core + ScrollTrigger + SplitText always; Flip + MotionPathPlugin because `shop_page` is true on page templates).
- `templates/page.json` (shared with sales-note, video-reviews, offer-delivery instances) and `templates/page.about-us.json` (shared with cv-hanging-cards).

## Store adaptation findings

1. HIGH, unbacked service promise shipped in template settings. `help_body` = "Support answers in under a business day, and can override anything on this page in your favour." at templates/page.json:17, templates/page.about-us.json:8, templates/page.faq.json:8, templates/page.track-order.json:8. No reply-time or policy-override fact exists in PRODUCT.md "Evidence on Hand"; the schema's own info text says "Keep it true: don't promise reply times or exceptions here" (sections/cv-page.liquid:125). Fix: set `help_body` in those four templates to the schema default "Write to the shop and ask." (as the policy templates already do, e.g. templates/page.return-policy.json:13), or blank. Also consider `help_title` "Still need a human?" and `help_cta` "Contact support" on the same templates: harmless, but align with the shopkeeper voice ("Ask the shop").
2. MEDIUM, policy content is store data but has a history of conflicts. The section renders `page.content` verbatim (sections/cv-page.liquid:85). PRODUCT.md:41 logged the Return Policy page claiming 90-day returns, prepaid label and a $200 Screen Promise, and the Shipping Policy saying shipping is calculated at checkout; PRODUCT.md:59 records both pages being fixed on 2026-09-16 with merchant approval. No theme change needed, but the implementer must not paste policy text into settings and must not add any summary chips ("30-day returns", "Free shipping") here unless they come from a merchant setting.
3. LOW, hardcoded English UI strings not in locales: "Home" (sections/cv-page.liquid:40), fallback labels "Shop policies", "On this page", "Something here unclear?", "Ask the shop" (lines 67, 76, 93, 98). Fix: move to `locales/en.default.json` keys (later phase; locales/ is read-only now) or leave as schema defaults.
4. LOW, "Last updated" detection is English-only and only matches when it is the first `<p>` (sections/cv-page.liquid:25-33). Fine for this store; document it.
5. LOW, `cv-badges.css` is loaded but unused by this section (sections/cv-page.liquid:16). Removing the tag saves a request on 8 templates; confirm no `.cv-*` badge class appears inside page bodies first.
6. LOW, breadcrumb has `aria-current="page"` (good); the help bell `<img>` is decorative (alt="") and correctly not focusable.
7. No candy-as-product copy, no other brand, no prices, no dashes in shopper-facing copy in the section or its templates.

## Claims register

| Claim (shopper-facing) | Where | Status |
|---|---|---|
| "Support answers in under a business day" | templates/page.json:17, page.about-us.json:8, page.faq.json:8, page.track-order.json:8 | UNBACKED (no response-time fact in PRODUCT.md) |
| "can override anything on this page in your favour" | same four lines | UNBACKED (policy-exception promise; contradicts schema guidance at cv-page.liquid:125) |
| Policy wording (returns window, shipping cost, etc.) | `page.content`, cv-page.liquid:85 | Store data (Shopify page). PRODUCT.md:59 says return/shipping pages were corrected 2026-09-16; re-verify they read 30-day returns and free shipping (PRODUCT.md:34) |
| "Last updated ..." date | lifted from page body, cv-page.liquid:24-33 | Store data |
| "Write to the shop and ask." | schema default cv-page.liquid:125; policy templates line 13 | No claim |

## Motion inventory

- data-cv-* attributes: none in the markup. The section deliberately does not reveal body text (header comment, sections/cv-page.liquid:6-7). cv-motion.js still adds the global top `.cv-progress` bar because of `.cv-page-root` (cv-motion.js:172-185; hidden under reduced motion, theme.css:3266).
- Section JS: `ruleBook` in assets/cv-pages.js:282-359.
  - Badge drop: GSAP `fromTo` rotation -18, y -24, autoAlpha 0 to rest with `elastic.out(1, 0.35)` (cv-pages.js:293-295). Only when `motion` (GSAP present and not reduced, cv-pages.js:27-29). Static badge visible without JS.
  - Help bell ring: GSAP keyframed rotation on `pointerenter` of `.cvd__help` (cv-pages.js:296-299). Pointer-only: touch and keyboard users never trigger it.
  - TOC: built from `h2`s (needs at least 2), un-hides `[data-cvd-toc]`, adds `.has-toc`, smooth-scrolls (auto under reduced motion), marks `aria-current`, fills the stripe rail with a rAF scroll handler (`scaleY`), not ScrollTrigger (cv-pages.js:301-358).
- GSAP plugins used: core only (no ScrollTrigger in this module).
- Reduced motion: `motion` false skips badge and bell; scrollIntoView uses `auto`. The rail fill still tracks scroll under reduced motion (a progress indicator, acceptable). cv-pages.css:~477 reduced-motion block does not need `.cvd` entries since the CSS has no transitions on them besides link colour.
- No-JS state: complete and readable. TOC stays `hidden` (cv-page.liquid:74), body, rules row and help panel are static. Good.
- Theme editor: cv-pages.js has NO `shopify:section:load/unload` handling. After a setting change the section re-renders and the TOC stays hidden, rail and badge drop do not re-init, and the old scroll listener keeps pointing at detached nodes until reload.

## Motion opportunities

Body text must stay still (header comment, DESIGN.md Motion). All new motion should use GSAP `from()`/`fromTo` with `clearProps` so the no-JS state remains the finished state, and skip under reduced motion via the existing `motion` flag.

1. HIGH (correctness): refactor `ruleBook` into `initRuleBook(root)` with a destroy that removes the scroll/resize/click listeners, and wire `shopify:section:load` / `shopify:section:unload` (pattern: assets/cv-hanging-cards.js:217-236). Shared file, so change only the ruleBook IIFE.
2. MEDIUM: help panel enters on scroll with ScrollTrigger `once` (start `top 85%`): panel lifts 16px, bell drops on its cord and rings once (reuse the existing keyframes), CTA arrow nudges 4px. Gives touch users the bell moment currently gated on `pointerenter`.
3. MEDIUM: TOC entrance once built: `gsap.from(links, { x: -8, autoAlpha: 0, stagger: 0.04, duration: 0.24, ease: 'power2.out' })` (240 ms per DESIGN.md timing set), and a small brass marker that slides to the active link with `gsap.quickTo(marker, 'y', { duration: 0.24 })` instead of only a colour change.
4. LOW: replace the hand-rolled rail rAF with one `ScrollTrigger.create({ trigger: body, start: 'top 30%', end: 'bottom 70%', onUpdate: self => fill.style.transform = 'scaleY(' + self.progress + ')' })`; also lets you `ScrollTrigger.refresh()` on section load.
5. LOW: rules row chips: 160 ms press state on the current chip (stamp), GSAP stagger `from` on load. Keep visible without JS.
6. Commerce: none appropriate here. Policy pages should not carry a buy box. Generic `page.json` already has sales-note, video reviews and offer-delivery sections after this one; do not duplicate.

## Risks

- `assets/cv-pages.js` and `assets/cv-pages.css` are shared by 4 sections plus a snippet; parallel agents must restrict edits to the `ruleBook` IIFE and `.cvd*` selectors.
- Editing the 4 templates with the bad `help_body` is a template edit; `templates/page.json` and `templates/page.about-us.json` also hold other sections' settings. Edit only the `main` section's `help_body` key.
- Do not add reveal animation to `.cvd__body`; long legal text must not fade.
- If cv-badges.css is removed from this section, verify cv-collection and cv-search still load it themselves (they do: they have their own stylesheet_tag).
