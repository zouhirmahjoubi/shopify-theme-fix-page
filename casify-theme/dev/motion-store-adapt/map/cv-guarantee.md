# cv-guarantee ("Convert — Guarantee & FAQ", home "risk" section)

## Status

Live, home page only.
- `templates/index.json:1537`: key `risk`, 19th of 21 sections (after `facebook_comments`, before `offer_delivery` and `signup`).
- Saved blocks (`templates/index.json:1538-1640`): 2 `guarantee` (g-0, g-3), 6 `faq` (faq-0..faq-5), 4 `closer_note` (note-0..note-3). Settings at `:1642-1651`, with `closer_url: "/collections/all"` so the closer renders a link, not the scroll-to-buy button.
- Not on any product template: the product pages use the honest rebuild `sections/cv-pdp-guarantee.liquid` (`templates/product.json:867`), see `dev/motion-store-adapt/map/cv-pdp-guarantee.md`.
- PRODUCT.md:41 and :58 record that the merchant chose to leave this section "as-is for now" on 2026-09-16. Since then g-0/g-3 were already changed to 30-day returns and 1 to 3 day dispatch, but the FAQ still carries unverified product claims.

## Purpose

Closing "risk reversal" block for the home page, in three parts, all block-driven:
1. Guarantee cards (`.cv-guards`, icon medallion + title + body), `sections/cv-guarantee.liquid:11-31`.
2. FAQ accordion of native `<details>` with FAQPage JSON-LD, `:33-77`.
3. Dark "closer" card with heading, body, CTA (link or `data-cv-scroll-to-buy` button) and check-mark notes, `:79-123`.

## Files (owned / shared)

Owned (only this section uses them):
- `sections/cv-guarantee.liquid` (182 lines).
- Selector blocks in `assets/theme.css` used only by this section (grep finds `cv-risk`, `cv-guards`, `cv-guard`, `cv-faq`, `cv-closer` only in `sections/cv-guarantee.liquid` and `assets/theme.css`): `.cv-risk` `:1007`, `.cv-guards` `:1010`, `.cv-guards__grid`/`.cv-guard*` `:1681-1692`, `.cv-faq*` `:1737-1752`, `.cv-closer*` `:1754-1795`, `:3124`, and the reduced-motion lines `:3234-3236`, `:3286`, `:3295`. The FILE `theme.css` is shared: edit only those rules, or move them to a new owned `assets/cv-guarantee.css`.
- The `id="cv-faq"` anchor (`:8`) is referenced nowhere else.

Shared (coordinate before editing):
- `snippets/cv-icon.liquid`: `returns`, `warranty-seal`, `drop-shield`, `truck-fast`, `lock-secure`, `lab`, `chevron-down`, `bag`, `check`.
- `assets/theme.css`: `.cv-sec`, `.cv-sec__hd`, `.cv-eyebrow`, `.cv-eyebrow--light`, `.cv-cta`, `.cv-cta__shine` (`:1380-1384`, infinite shine), `.cv-cta--closer` (`:1390`, used only here but `.cv-cta` is shared), `[data-cv-reveal]` (`:1073-1084`).
- `assets/cv-motion.js`: `data-cv-reveal` (`:130-143`) and `data-cv-scroll-to-buy` (`:235-241`, targets `.cv-buy` or `#cvPdp`). `data-cv-scroll-to-buy` is also used by cv-compare, cv-cost-compare, cv-finder, cv-howto, cv-ugc.
- `data-motion-dev="faq"` (`:42`) makes `layout/theme.liquid:190-192` render `snippets/motion.liquid`, which loads `assets/motion.min.js` (Motion 14.2.0) and `assets/cv-motion-dev.js` (faq module `:52`, editor `shopify:section:load` `:116`). This is the only section using the `faq` module; the home page also loads Motion for `sections/cv-collection-row.liquid:46` (`data-motion-dev="cards"`), so the library stays on the home page either way.
- GSAP bundle (`snippets/gsap.liquid`) is on every page; this section does not use it.

## Store adaptation findings

1. **FAQ answers publish unverified product specs store-wide, and also as FAQPage structured data (high).** `templates/index.json:1567` (Qi2 25W / MagSafe spec "passes"), `:1575` ("UV-stable polycarbonate... accelerated testing equivalent to three years outdoors... no perceptible colour shift": the 36-month clarity claim PRODUCT.md:104 lists as not verified), `:1583` ("2.8 mm across the back and 3.4 mm at the rail, adding about 24 g": PRODUCT.md:104 not verified), `:1559` ("cut from that phone's own CAD file, one mould per model"). These ship to every visitor regardless of product (the catalog includes a chain crossbody case, `templates/index.json:1024`, which is not a clear MagSafe shell). The JSON-LD at `sections/cv-guarantee.liquid:57-76` sends the same text to search engines. Fix: replace with the honest FAQ already approved on the product template (`templates/product.json` `guarantee` blocks q-ship, q-returns, q-packs, q-model, q-fit: "Orders leave us within 1 to 3 business days, and shipping is free.", "Yes. You have 30 days to return it.", the 18%/31% pack answer, the iPhone/Samsung model lookup, "Pick your phone in the Model list. It only shows the models this case is made for."). Needs merchant confirmation (PRODUCT.md:58).
2. **Schema defaults and preset ship the same fabricated claims (high).** `sections/cv-guarantee.liquid:169-174` (CAD file, Qi2 25W, 3-year UV test, 2.8 mm/3.4 mm/24 g, "Pick your model above") and `:136` ("A screen repair costs more than five of these"). Adding a fresh "Convert — Guarantee & FAQ" from the editor reintroduces them. Fix: rewrite the preset to the honest set above and make the `faq` block's `answer` default blank (it already has no default, `:155`).
3. **Em and en dashes in shopper copy (medium).** Template: `templates/index.json:1544` ("delivery — prepaid"), `:1551` ("1–3"), `:1552` ("1–3", "Friday — and"), `:1559`, `:1583`, `:1618` ("1–3"), `:1643` ("Section 06 — zero risk"), `:1649` ("1–3"). Schema fallbacks/defaults: `sections/cv-guarantee.liquid:16` (`default: 'Section 04 — zero risk'`), `:130`, `:136`, `:151`, `:167`, `:168`, `:169`, `:172`, `:177`. Replace with "1 to 3" (house style used in PRODUCT.md and cv-pdp-guarantee) and commas/periods.
4. **Stale "Section 06" / "Section 04" numbering and an eyebrow on every heading (medium).** `templates/index.json:1643` says "Section 06" but this is the 19th section; the Liquid fallback `:16` says "Section 04". DESIGN.md:198 says do not place an eyebrow above every heading; here there are three (guard, FAQ, closer). Fix: drop the numbered eyebrow (blank default, render only when set) and keep at most the closer's.
5. **Absolute/hyperbolic claims (medium).** "zero risk" (`templates/index.json:1643`), "Every reason not to buy, removed" (`:1644`), "The questions we actually get asked" (`:1646`, implies real customer questions; no support data on hand), "A screen repair costs more than five of these" (`:1649`, a price comparison with no source; at $49.99 it asserts a repair costs more than $250). Proposed: "Questions at the counter" (already used on product pages), closer body "Pick your phone and it ships in 1 to 3 business days, free."
6. **Return details beyond the confirmed fact (medium).** `templates/index.json:1544` "within 30 days of delivery, prepaid return label, full refund", `:1591` "we'll send the right one with a prepaid label for the first. No restocking fee, and you don't pay shipping twice", `:1612` "30-day returns, prepaid". Only "30-day returns" is in PRODUCT.md:34. Fix: "30-day returns" plus a link to the Return Policy page (`shop.refund_policy.url` or the `return-policy` page handle) for the rest.
7. **"Most people keep one on the phone and one in a bag or car" (low).** `templates/index.json:1599`: a customer-behaviour claim with no data. Drop the sentence; the 18%/31% fact stays.
8. **Pack percentages are not stated where they could be (low).** The multi-pack FAQ (`:1598-1599`) explains why but never says 18% / 31%. Add the real percentages, ideally from a section setting `pack_2_pct`/`pack_3_pct` (defaults 18/31, `info`: "must match the store's automatic discount"), the same pattern as `snippets/cv-pack-meter.liquid:12-13`.
9. **Closer fallback assumes a buy box (low).** With `closer_url` blank, the button uses `data-cv-scroll-to-buy` (`sections/cv-guarantee.liquid:103`), which scrolls to `.cv-buy`/`#cvPdp` (`assets/cv-motion.js:237`). On the home page neither exists, so the button silently does nothing. Fix: fall back to `routes.all_products_collection_url` when `template.name != 'product'`.
10. **Duplicate ids if placed twice (low).** `id="cv-faq"` (`:8`) is hardcoded; use `id="cv-faq-{{ section.id }}"`.
11. **Hardcoded English fallbacks in Liquid (low).** `:16`, `:17`, `:39`, `:40`, `:100`, `:106` use `| default: '...'` English strings; move to `locales/en.default.json` (shared file) or keep as schema defaults only.
12. No candy-as-product copy, no other brand, no hardcoded prices or currencies, no phone model lists.

## Claims register

| Claim | Where | Status |
|---|---|---|
| 30 days to change your mind / 30-day returns | `templates/index.json:1543`, `:1612`; preset `:167`, `:176` | Backed: PRODUCT.md:34 |
| Return "within 30 days of delivery" | `:1544` | Partly: 30 days backed; "of delivery" start point unconfirmed |
| Prepaid return label, full refund | `:1544`, `:1612` ("prepaid") | Unbacked in Evidence on Hand (Return Policy page only) |
| Ships in 1–3 business days, Monday to Friday | `:1551-1552`, `:1618`, `:1649` | Backed: PRODUCT.md:34 (dash must change) |
| Shipping is free / Free shipping on every order | `:1552`, `:1606` | Backed: PRODUCT.md:34 |
| Cut from the phone's own CAD file, one mould per model, no gaps, no rattle | `:1559`; preset `:169` | Unbacked |
| Wireless charging at full speed; passes Qi2 25W, MagSafe, Qi | `:1567`; preset `:170` | Unbacked (not product-specific, no certification on hand) |
| UV-stable PC, 3-year accelerated test, no colour shift | `:1575`; preset `:171` | Unbacked: PRODUCT.md:104 lists 36-month clarity as not verified |
| 2.8 mm back, 3.4 mm rail, about 24 g | `:1583`; preset `:172` | Unbacked: PRODUCT.md:104 lists 2.8 mm as not verified |
| Wrong model: replacement + prepaid label, no restocking fee, no double shipping | `:1591`; preset `:173` | Unbacked policy detail |
| Multi-pack cheaper per case | `:1598-1599`; preset `:174` | Backed: live 18%/31% automatic discounts, PRODUCT.md:39 |
| Most people keep one on the phone and one in a bag | `:1599`; preset `:174` | Unbacked |
| A screen repair costs more than five of these | `:1649`; default `:136` | Unbacked |
| Zero risk / every reason not to buy removed | `:1643-1644`; default `:130-131` | Unbacked superlative |
| Secure checkout | `:1624`; preset `:178` | Backed as a platform fact |

## Motion inventory

- `data-cv-*`: `data-cv-reveal` on `.cv-guards` (`:14`), each `.cv-guard` (`:22`, with `--cv-i` stagger), `.cv-faq` (`:37`), `.cv-closer` (`:81`); `data-cv-scroll-to-buy` on the fallback button (`:103`).
- Motion (motion.dev) module `data-motion-dev="faq"` (`:42`): spring open/close of `<details>` answers (`assets/cv-motion-dev.js:52-100`), skipped under reduced motion (`:23`), re-booted on `shopify:section:load` (`:116`).
- CSS ambient: `.cv-closer::before/::after` charm bob and bow sway (`assets/theme.css:1759-1779`, `animation: ... infinite`), `.cv-cta__shine` infinite sweep (`:1380-1384`), `.cv-faq__a` cm-rise (`:1751`), `.cv-guard:hover` lift (`:1689`). All reset under reduced motion (`:3234-3236`, `:3223`, `:3286`, `:3295`). None pause offscreen and there is no pause control (DESIGN.md:183, :192).
- Icons: guarantee icons render with `animate: true` (`:23`), reset under reduced motion (`assets/theme.css:3226-3230`).
- GSAP: none. ScrollTrigger: none.
- No-JS state: broken. Every `[data-cv-reveal]` block (guarantee cards, FAQ, closer) stays at `opacity: 0` (`assets/theme.css:1073-1074`); there is no scripting fallback. The `<details>` FAQ itself works without JS.
- Theme editor: `cv-motion.js` scans `[data-cv-reveal]` once at load (`assets/cv-motion.js:130`) and has no `shopify:section:load` listener, so after an edit the re-rendered guarantee cards/FAQ/closer stay invisible until reload.

## Motion opportunities

1. **High: GSAP "rubber-stamp" guarantee cards with a static resting state.** New owned `assets/cv-guarantee-motion.js` (deferred, printed by the section like cv-value-stack does, or loaded from layout keyed off a new `data-cvgu` attribute; the layout line is shared). ScrollTrigger `once`, cards drop from `y:-18, rotation:-4, scale:1.06` to rest with `CustomBounce` (always loaded), icon medallion pops 120ms later, DrawSVG check on the title. Drop `data-cv-reveal` from these nodes so no-JS shows them. `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`; `shopify:section:load/unload` re-init/revert via `gsap.context`.
2. **High: closer CTA as a real conversion moment.** The closer currently links to `/collections/all`. Options in idiom: (a) render the theme's quick pick button (`data-cvqp-open data-handle="..." data-url="..."`) for a merchant-picked `product` setting, so the shopper picks colour and phone and adds to bag without leaving the page; `layout/theme.liquid:208-210` already renders `snippets/cv-quick-pick.liquid` and `:295-297` loads `assets/cv-quick-pick.js` when `data-cvqp-open` appears in the page markup. Nothing is added with a guessed model. (b) Keep the link but add a magnetic hover (`gsap.quickTo` x/y within 6px on fine pointers) and a one-shot shine instead of the infinite `cv-shine`. Add-to-cart success feedback: listen for `cv:cart` (`assets/cv-quick-pick.js:58`) and stamp a "In your bag" ticket on the closer; the cart drawer opens through the existing flow.
3. **Medium: pack row in the closer.** Three small striped boxes "1 case / 2 cases, 18% off each / 3 cases, 31% off each" from section settings (defaults 18/31 with an info warning), each a link to `/collections/all`. GSAP stagger lid-pop on enter. Copy must say "off each at checkout", matching PRODUCT.md:39.
4. **Low: keep the FAQ on the existing Motion `faq` module.** It already springs open/closed, respects reduced motion and re-boots in the editor. Only add a chevron rotate on the candy spring and a 1px red underline wipe on the open question (CSS on owned selectors). Do not swap it to GSAP: Motion stays loaded on the home page for cv-collection-row anyway, so there is no byte saving.
5. **Medium: pause ambient closer animation offscreen.** Toggle a `.is-offscreen` class with IntersectionObserver and set `animation-play-state: paused` on `.cv-closer::before/::after` and `.cv-cta__shine` (owned selectors in theme.css, or the new owned stylesheet).
6. **Low: FAQ question split.** `data-cv-split` on the FAQ `h2` only (headline-length text, word stagger exists in cv-motion).

## Risks

- **Copy changes need the merchant's confirmation.** PRODUCT.md:58 records "merchant chose to leave this one as-is for now". The hard rule for this project forbids unbacked performance claims, so the implementing agent should present the honest replacement (from `templates/product.json` `guarantee`) and get a yes before editing `templates/index.json` or the preset.
- `templates/index.json` is shared by every home section; edit only the `risk` instance and never run a dev server against the live theme (PRODUCT.md:74 incident).
- Removing the FAQPage JSON-LD or changing it changes structured data; the honest FAQ is fine to keep in JSON-LD.
- `assets/theme.css` is shared; prefer moving owned rules to `assets/cv-guarantee.css` before restyling.
- Motion (motion.dev) and GSAP both run on the home page; keep each element animated by one library only (the FAQ by Motion, the new card/closer choreography by GSAP) so they never tween the same property.
- `data-cv-scroll-to-buy` is shared with five other sections; do not change `assets/cv-motion.js:235-241` behaviour, change only this section's fallback.
