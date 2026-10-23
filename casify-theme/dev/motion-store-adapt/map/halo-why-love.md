# halo-why-love ("Halo [em] Why you'll love it")

Family: halo-2. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
In quotes, `[em]` / `[en]` mark an em / en dash that exists in the source (never copy them forward).

## Status

**orphan**: placed in no `templates/*.json` and in neither section group. No `enabled_on`; the preset
(:71-83) ships as is when added.

## Purpose

A benefit grid: up to 8 `item` blocks, each an inline SVG icon (8 choices), a title and a body. Meant
as a "recap" under a product. All copy is static block text; no product, metafield or shop binding.

## Files (owned / shared)

Owned:
- `sections/halo-why-love.liquid` (85 lines)
- `assets/icon-drop.svg`, `assets/icon-magsafe.svg`, `assets/icon-anti-yellow.svg`,
  `assets/icon-warranty.svg`, `assets/icon-slim.svg`, `assets/icon-camera.svg`,
  `assets/icon-secure.svg`, `assets/icon-leaf.svg` (inlined with `inline_asset_content`, :16-23; a
  grep of sections/, snippets/, layout/, templates/, blocks/ and assets/ finds no other user). Colours
  are on palette (#C4302B strokes and fills).

Shared (do not edit from this lane):
- `assets/theme.css`: `.halo-love` (:939), `.halo-love__*` (:3656-3667; only this section prints them,
  but the file is shared), base `.halo-sec*` (:3689-3693 and mobile rules), `[data-halo-reveal]`
  (:3906-3907, reduced motion :3918-3921).
- `assets/halo.js` (dead: requires `.halo-tpl`, halo.js:19-20; layout prints only `cv-tpl`,
  layout/theme.liquid:196-201; loaded at :216-218 because the markup contains `halo-`).

## Store adaptation findings

1. **H, the whole section renders blank.** Both the header (:2) and every benefit item (:13) carry
   `data-halo-reveal`, which is `opacity: 0` in CSS (theme.css:3906) and only revealed by halo.js,
   which exits before it runs (halo.js:19-20). Result: an empty band with a dashed top border. Only
   reduced-motion users see content (theme.css:3919). Fix: remove `data-halo-reveal`; animate from an
   owned script with the pending-class pattern (MOTION-SYSTEM.md 4.3).
2. **H, store-wide performance claims in the preset** (:75-80): "Drop-tested protection, Air-cell
   corners absorb the shock", "Full-strength magnet ring", "Never turns yellow ... for years, not
   months", "Slim, not bulky", "Camera protected, Raised lip", "Screen Promise warranty, we help cover
   the repair". PRODUCT.md:19 says product performance is not a store-wide claim; PRODUCT.md:103 lists
   the $200 Screen Promise as not verified; PRODUCT.md:41 records it as an unresolved policy conflict.
   Fix: preset made only of confirmed service and catalogue facts:
   - `precision` "Made for your exact phone" / "Pick only from the phones this case is made for."
   - `shipping` "Free shipping" / "On every order, no minimum." (PRODUCT.md:34)
   - `dispatch` "Leaves the shop in 1 to 3 business days" (PRODUCT.md:34)
   - `returns` "30 days to decide" (PRODUCT.md:34)
   - `pack` "Mix and match a pack" / "Choose a colour and phone for each case in a 2 or 3 pack."
     (PRODUCT.md:39)
   Product-specific benefits (MagSafe, kickstand, camera lip, anti-yellowing) only through a new
   block setting `require_tag` (text): render the block only when `product.tags contains
   block.settings.require_tag`, so "MagSafe ready" appears only on products the merchant tagged
   `magsafe`. Info text: "Shown only on products with this tag. State only what that product's own
   listing states."
3. **H, block defaults ship claims.** New block default title "Drop-tested protection" and body
   "Survives real drops without a scratch." (:65-66). Fix: neutral defaults ("A real shop promise" /
   "Add a confirmed fact about this case.") like cv-customer-experience.liquid:218-219.
4. **H, unbacked icon options.** `warranty` (:59) and `leaf` "Recycled / sustainable" (:61) invite
   claims with no evidence. Fix: replace with icons for confirmed facts (shipping, dispatch, returns,
   exact fit, pack) or reuse `snippets/cv-icon.liquid` names `truck-fast`, `clock`, `returns`,
   `precision-fit`, `gift` (all exist, cv-icon.liquid:128, :193, :201, :253, :272) and keep the owned
   SVGs only for tag-gated product features.
5. **M, another brand in the editor and dashes.** Schema/preset name "Halo [em] Why you'll love it"
   (:38, :73); tick default "Section 01b [em] the recap" (:3, :40); preset bodies with " [em] " (:76, :78).
   Fix: name "Why you'll love it"; blank tick default; commas.
6. **M, `body` is a textarea printed unescaped** (:28). Fix: `| escape` (or `| newline_to_br` after
   escape).
7. **M, heading level skip**: h2 (:4) then h4 (:27). Fix: h3.
8. **M, invalid nesting**: richtext `subheading` inside `<p>` (:5-6). Fix: `<div>`.
9. **L, "still fits your case like it isn't there"** (:78) is nonsense copy for a case. Remove.
10. **L, Liquid `default:` on tick and heading** (:3-4) prints copy even after the merchant clears it.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Drop-tested protection, survives real drops without a scratch | :65-66, :75 | UNBACKED |
| Air-cell corners absorb the shock | :75 | UNBACKED store-wide (airbag-corner products exist; only that product's own data may say it) |
| Full-strength magnet ring, snaps to chargers, mounts, wallets | :76 | UNBACKED store-wide (magnetic families exist, product-specific) |
| Never turns yellow, clear for years | :77 | UNBACKED (PRODUCT.md:103, 36-month clarity not verified) |
| Slim, not bulky | :78 | UNBACKED store-wide |
| Camera protected, raised lip | :79 | UNBACKED store-wide |
| Screen Promise warranty, we help cover the repair | :80 | UNBACKED (PRODUCT.md:41, :103) |
| Recycled / sustainable (icon option) | :61 | UNBACKED |
| Proposed: free shipping, 1 to 3 business day dispatch, 30-day returns | rebuild | BACKED (PRODUCT.md:34) |
| Proposed: mix-and-match 2 and 3 packs | rebuild | BACKED (PRODUCT.md:39) |
| Proposed: exact-model fit | rebuild | LIVE (product's own model option) |

## Motion inventory

- cv-motion attributes: none.
- `data-halo-reveal` on header and items (:2, :13) with a `--love-i` index (:13) feeding
  `transition-delay` (theme.css:3663): dead, everything stays hidden (finding 1).
- No section JS, no GSAP, no editor events. Reduced motion: forced visible (theme.css:3919).
- No-JS state: blank section (bug).

## Motion opportunities

1. **(High) Visible, staggered entrance.** Owned `assets/cv-why-love.js` (prefix `cvwl`):
   ScrollTrigger.batch on items (`start: 'top 85%'`, `once: true`), each item `y: 18, autoAlpha: 0`
   -> visible, `stagger: .07`; the icon draws itself with DrawSVGPlugin (always loaded,
   MOTION-SYSTEM.md 1.4) then pops with a small candy spring (`back.out(1.6)`, scale .8 -> 1).
   Pending class hides only the icons, never the titles. Reduced motion: no tweens.
   Editor: remount on `shopify:section:load`, `ctx.revert()` on unload, reveal the selected block on
   `shopify:block:select`.
2. **(Medium) Tag-gated feature chips that link to the buy box**: a "Choose your phone" link on the
   exact-fit item uses `data-cv-scroll-to-buy` (cv-motion.js:235-241); on landing, GSAP pulses the
   model select (motion only).
3. **(Medium) Pack item**: clicking "Mix and match a pack" dispatches `cvs:pack` `{ qty: 2 }` on the
   `[data-cv-pdp]` root (cv-product.js:536); cv-pack-motion.js already animates the slots (Flip).
4. **(Low)** `data-cv-tilt` is not useful on text items; skip. Keep hover static.

## Risks

- Do not rely on `data-halo-reveal` or halo.js; both are dead and shared.
- Tag gating needs the merchant to tag products; with no tags only the service-fact blocks show,
  which is the safe default.
- The section duplicates roles already on the product templates (Shop Counter service facts and
  promise stamps, cv-pdp-promises); PRODUCT.md:37 says each role appears once per page. Place only
  where those are absent (for example a landing page), or keep orphan.
- `.halo-love*` CSS lives in shared theme.css; style the rebuild under a new prefix.
