# footer ("Footer")

Family: shell. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
Severity: H / M / L. Proposed copy below contains no em or en dashes.

## Status

**live** on every page that uses `layout/theme.liquid`: placed by `sections/footer-group.json:4-23`
(type `footer`, blocks `shop` link_list main-menu, `legal` link_list "Support" menu `footer`,
`company` contact) and rendered by `{% sections 'footer-group' %}` at `layout/theme.liquid:205`.
Same 24 JSON templates as the header (404, article, article.reviews, blog, blog.reviews, cart,
collection, index, list-collections, page and its 10 alternates, product, product.best,
product.convert, search). Not on password or gift_card layouts.

**`"settings": {}`** (footer-group.json:7; identical on the live copy
`dev/live-check-2026-10-03/sections/footer-group.json`): every section setting renders its schema
default. The 2026-10-07 live baseline shows the blurb with the em dash and "JOIN THE SWEET LIST"
(`../dev/payments-readiness-review/baseline.json`).

## Purpose

Closing scene of the shop: a striped band with scallops, a hanging "THANK YOU / come again soon!"
sign, a cream ledger card with the logo, brand blurb, newsletter signup (customer form tagged
`newsletter`), social links from theme settings, up to 4 link/contact columns, a decorative
shop-items shelf (jar, gumball, gift, phone case, striped bag), and a bottom bar (copyright,
trademark disclaimer, live payment icons, back-to-top). Motion: `assets/cv-footer.js`.

## Files (owned / shared)

Owned:
- `sections/footer.liquid` (198 lines).
- `sections/footer-group.json` (only places this section; editor-managed).
- `assets/cv-footer.css` (175 lines): loaded only by footer.liquid:10.
- `assets/cv-footer.js` (196 lines): targets only `[data-cv-footer]` (cv-footer.js:186). Loaded
  unconditionally by `layout/theme.liquid:213` (layout line is shared; do not touch).
- `assets/footer-thank-you-sign.webp` (footer.liquid:20 only).
- `assets/footer-item-jar.webp`, `-gumball`, `-gift`, `-case`, `-bag` (footer.liquid:88-93 only).

Shared:
- `snippets/casify-logo.liquid` (also header). Its sign layout comes from **cv-header.css**
  `.casify-sign*` (cv-header.css:73-100), which only the header loads; the footer passes `size: 32`
  for inline `--sign-h` / `--mint` (casify-logo.liquid:33-39).
- `snippets/icon.liquid` (instagram, tiktok, pinterest, facebook, mail).
- `assets/header-peppermint-red.png` (back-to-top, footer.liquid:108; also casify-logo, best-product.css).
- `assets/theme.css`: `.stripes` (:804), `footer` base incl. `footer::before` free-shipping badge and
  `footer::after` candy jar (:807-827, suppressed by cv-footer.css:32-33), `.footer__inner` grid
  (:829-831), `footer h4/ul` (:832-835), `.footer__bottom` (:836-843), `.socials` (:844-853, 4292),
  print (:4529-4531), reduced motion (:3307-3313).
- Store data: `linklists[...]`, `shop.address`, `shop.phone`, `shop.email`, `shop.name`,
  `shop.enabled_payment_types`, `settings.social_*`.
- `snippets/gsap.liquid` (ScrollTrigger, ScrollToPlugin, CustomWiggle always shipped, gsap.liquid:23-35).

## Store adaptation findings

1. **H: brand blurb sells tins and ribbons, claims hand wrapping since 1920, em dash; live now.**
   footer.liquid:27 (Liquid fallback) and :123 (schema default): "An old-fashioned candy shop,
   online. Tins, cases, ribbons [em] wrapped by hand since 1920." Fix **both** places to, e.g.:
   "Phone cases for iPhone and Samsung, served from an old-fashioned shop counter. Free shipping and
   30-day returns on every order." (both facts backed, PRODUCT.md:34). Drop the Liquid `| default:`
   so a blank blurb hides the paragraph.
2. **H: newsletter success promises sweets, em dash.** footer.liquid:134 schema default
   "You're on the list [em] sweets are on their way." Fix: "You're on the list. We'll write when new case
   designs arrive." (Locale `general.newsletter.confirmation` "You're in. See you soon." at
   locales/en.default.json:5 is another dash-free option.)
3. **M: newsletter heading reads as a sweets list.** footer.liquid:133 "Join the sweet list" (live).
   Fix default: "New case designs by email" or "Join the shop list for new cases".
4. **M: sign alt text has an em dash.** footer.liquid:20 `alt="Thank you [em] come again soon!"`. Fix:
   `alt="Thank you, come again soon!"`.
5. **M: on phones the shelf hides the only phone case.** cv-footer.css:167-168 hide
   `nth-child(2)` (gumball) and `nth-child(4)` (**case**) under 540px, so mobile shows jar, gift, bag.
   Fix: reorder `shelf_items` (footer.liquid:88) to put `case` in the middle, e.g.
   `'jar:158,gift:143,case:121,bag:147,gumball:133'`, and hide the two candy items on small screens
   (update the nth-child pair to match). Candy set pieces themselves are allowed decoration
   (aria-hidden, no price, no link; PRODUCT.md:35).
6. **M: newsletter error text fails contrast.** cv-footer.css:121 `color: var(--red-300)` (#E58C82) on
   the cream-50 ledger (#FDF9F1) = 2.38:1. Fix: `var(--red-600)` (or cocoa text with a red marker).
7. **L: hardcoded English UI text.** "Join" (:38), placeholder "you@example.com" (:37),
   "Back to top" (:109), disclaimer (:99). Fix: section settings with dash-free defaults, or the
   existing locale keys `general.newsletter.submit` / `.label` (locales/en.default.json:5) in
   coordination with the locales owner.
8. **L: lowercase brand fallback.** footer.liquid:98 `shop.name | default: 'casify'` -> `'Casify'`.
9. **L: back-to-top needs JS.** footer.liquid:107-110 is a `<button>`; without JS nothing happens.
   Fix: `<a href="#MainContent" class="cvf-top" data-cvf-top>`; cv-footer.js keeps the smooth scroll
   and focus landing (cv-footer.js:45-56) and calls `preventDefault`.
10. **L: menus duplicate the header (store data, merchant decision).** Block `shop` uses `main-menu`
    (footer-group.json:12), so the footer repeats the header links, and "Contact" appears in both
    columns in the live baseline. Suggest a "Shop by phone" menu (iPhone and Samsung model
    collections) for the first column. Menus are store data: merchant confirmation, no theme change.
11. **L: store contact data.** The contact column prints `shop.address`, `shop.phone`, `shop.email`
    (footer.liquid:72-80), escaped and live. In the 2026-10-07 baseline the address line is lowercase
    and the email is on a non-Casify domain; merchant may tidy them in Settings > Store details.
12. **L: small labels.** `.footer__bottom` 10px (theme.css:840) and `.cvf-top` 10px
    (cv-footer.css:150), below DESIGN.md:130. Fix in owned CSS: `.cvf-footer .footer__bottom,
    .cvf-top { font-size: 11px }`.

## Claims register

| Claim (as rendered) | Where | Status |
|---|---|---|
| "Tins, cases, ribbons [em] wrapped by hand since 1920" | footer.liquid:27, :123 (live) | UNBACKED (hand wrapping, "since 1920" as history) and wrong product domain |
| "sweets are on their way" (after signup) | footer.liquid:134 | UNBACKED / misleading (no sweets are sent) |
| "Join the sweet list" | footer.liquid:133 (live) | No factual claim; off-domain wording |
| "Thank you, come again soon!" sign | footer-thank-you-sign.webp, alt :20 | No claim |
| "Not affiliated with Apple, Samsung or Google. MagSafe is a trademark of Apple Inc." | footer.liquid:99 | Legal disclaimer, true; keep |
| Payment icons | footer.liquid:100-106 | LIVE: `shop.enabled_payment_types` |
| Address, phone, email, copyright year and shop name | footer.liquid:72-80, :98 | LIVE: store settings |
| "FREE SHIPPING" badge (footer::before) | theme.css:808-816, suppressed cv-footer.css:32-33 | BACKED (PRODUCT.md:34) but not rendered |

## Motion inventory

- **cv-motion attributes**: none. Bespoke hooks: `data-cv-footer` (root, footer.liquid:12; not a
  cv-motion attribute), `data-cvf-ledger` (:24), `data-cvf-top` (:107).
- **Section JS** `assets/cv-footer.js` (only when GSAP + ScrollTrigger and no reduced motion,
  cv-footer.js:31-32):
  - reveal timeline at `top 88%`, once (:104-116, :127): valance elastic drop, sign falls on its cords
    (yPercent -110, rotation -12, `elastic.out(1, 0.3)` 1.6s), ledger lift, columns and list items
    cascade, social icons pop, success message scale.
  - shelf timeline at `top 96%`, once (:119-132): items hop up (back.out), bottom bar rises.
  - ambient (:84-101, :133-136): stripe drift and sign sway, **paused while the footer is off
    screen** (ScrollTrigger onToggle); sway starts only after the sign settles.
  - hover/press (:140-174): sign wiggle (CustomWiggle `cvfWiggle`), item hop, social wiggle,
    back-to-top mint quarter turn, newsletter button squash.
  - back-to-top (:44-57): ScrollToPlugin tween + mint spin, focus lands on `#MainContent`; plain
    `window.scrollTo` otherwise (instant under reduced motion).
  - `focusin` on the footer plays both timelines at once (:138), so keyboard users never wait.
- **Plugins**: ScrollTrigger, ScrollToPlugin, CustomWiggle (+CustomEase).
- **Reduced motion**: no GSAP at all (read once, :31); CSS cv-footer.css:172-175 removes link nudge;
  theme.css:3307-3313 zeroes transitions. No `gsap.matchMedia`, so a mid-session change is ignored.
- **No-JS state**: complete and readable. Reveals use `.from(..., { immediateRender: false })` on
  paused timelines, so nothing is hidden before JS runs. Back-to-top does nothing (finding 9).
- **Theme editor**: `shopify:section:load` / `unload` handled (:190-195), gsap.context reverted
  (:178-182). `cvf-motion` stays on `<html>`.
- **Known glitch**: because the from-states are applied only when the trigger fires, the valance and
  sign are visible first and then snap to their start pose at `top 88%` (a visible pop), most
  noticeable on short pages where the footer is already on screen at load.

## Motion opportunities

1. **MED: remove the reveal pop.** At init, if `!ScrollTrigger.isInViewport(footer)`, apply the start
   states up front (`reveal.progress(0)` with `immediateRender: true`) behind a `cvf-pending` class
   with a 1200 to 1600ms timeout (house pattern, MOTION-SYSTEM.md section 4.3); if the footer is
   already visible, play immediately. Keep columns and links on `opacity` only (never `autoAlpha`) so
   they stay focusable (comment at cv-footer.js:15-16).
2. **MED: newsletter feedback in the shop idiom.** Success: a ticket "stamp" on `.cvf-news__ok`
   (scale 1.5 -> 1, rotation -12 -> -3, 0.42s back.out(2)) replacing the plain scale (:116); error:
   one shake of `.cvf-news__row` (x keyframes `[0,-10,9,-7,5,-2,0]`, 0.45s, the pattern in
   cv-candy-buttons.js:244-246) when `.cvf-news__err` is present; plus the contrast fix. Reduced
   motion: text and colour only. Both states follow a full page post, so run them on init when the
   elements exist.
3. **LOW: make the phone case the hero of the shelf.** After the store fix (finding 5) give the case
   item the last, highest hop and a one-time sheen sweep (a pseudo-element `x` tween), so the shelf
   ends on the product, not on sweets.
4. **LOW: `gsap.matchMedia`.** Wrap the motion block so a reduced-motion change reverts tweens and
   ScrollTriggers.
5. **Not applicable**: buy box, packs, Add to cart, Buy now and the cart drawer do not live in the
   footer. No commerce motion belongs here.

## Risks

1. **Logo sizing depends on the header's CSS.** If the header section is removed or cv-header.css
   changes `.casify-sign`, the footer logo loses its layout. Coordinate with the header lane.
2. **theme.css decorations are only masked.** `footer::before` (free-shipping badge PNG, 937 KB) and
   `footer::after` (candy jar, 501 KB) in theme.css:808-827 are disabled by cv-footer.css:32-33.
   Removing that guard resurrects them (and their downloads).
3. **Schema-default copy goes live on push** because footer-group.json saves no settings; after the
   push, check the editor did not save older values. The Liquid fallback at :27 must change together
   with :123 or the old blurb returns whenever the field is blank.
4. **Shared images**: never rename `header-peppermint-red.png`.
5. **Transforms**: GSAP tweens list items `x` and the ledger; CSS transitions `ul a` transform on hover
   (cv-footer.css:76-85). The reveal tweens the `li`, not the `a`, so they do not fight; keep it so.
6. **Newsletter form** posts to Shopify's customer endpoint; never change field names
   (`contact[email]`, `contact[tags]`).
