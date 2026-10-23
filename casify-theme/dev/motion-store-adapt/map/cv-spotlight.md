# cv-spotlight ("Convert — Spotlight")

## Status

LIVE on one template: `templates/index.json:122-136`, key `spotlight`, 4th in `order` (after `casify_hero_U3GTzw`, before `orbit`). Not in other templates or header/footer groups.
Instance: eyebrow "Now in the shop", heading "Protection you forget is even there", subheading with `&mdash;` (`:127`), CTA "Find my model" to `/collections/all`, no secondary CTA, `count_collection: "frontpage"` (`:132`), no image and no `image_url` (`:133`), so the bundled `cv-spotlight-case.jpg` shows.

## Purpose

Honest-facts spotlight (rewritten 2026-09-15, PRODUCT.md:45): a striped awning and shop sign with peppermint icons, a split heading and lede, one or two CTAs, a "display window" photo with shutters, reflection and sparkle, four pinned tickets (live case-design count, 18-31% pack range, free shipping, 30-day returns) and a scroll-velocity service marquee with a pause toggle. Ticket and marquee copy is hard-coded on purpose so it cannot drift into unconfirmed claims (PRODUCT.md:45).

## Files (owned / shared)

Owned:
- `sections/cv-spotlight.liquid`
- `assets/cv-spotlight.css` (833 lines, `:1`)
- `assets/cv-spotlight-motion.js` (231 lines; `layout/theme.liquid:226-229`, gate `data-cvsp`)
- `snippets/cvsp-icon.liquid` (67 lines; peppermint, sparkle, designs, bundle, shipping, returns)

Shared:
- `assets/cv-spotlight-case.jpg` (`:90`): also used by `sections/cv-compare.liquid:93` (orphan section). Replacing the file changes cv-compare too.
- `snippets/cv-icon.liquid` (`bag`, `arrow-right`, `pause`, `play`).
- theme.css `.cv-sec`, `.cv-cta`, `.cv-cta--ghost` (magnetic `.cv-cta` from `assets/cv-motion.js:219-231`).
- `data-cv-count` attribute (`:107`) is read by `cv-spotlight-motion.js:100`; `cv-motion.js` ignores it here because there is no `data-cv-reveal` / `data-cv-bars` ancestor.
- GSAP core + ScrollTrigger.

## Store adaptation findings

1. **MEDIUM: three dashes in shopper copy.**
   - Em dash: subheading `&mdash;` in the instance (`templates/index.json:127`) and schema default (`sections/cv-spotlight.liquid:159`).
   - En dash: ticket `18&ndash;31%` (`:113`), marquee `Ships in 1&ndash;3 business days` (`:137`).
   Fix: "18 to 31%" (or "18% or 31%"), "Ships in 1-3 business days", and rewrite the lede (finding 2).
2. **MEDIUM: manufacturing and fit claims without evidence.** "Cut from your phone's own CAD file" and "disappears in your pocket" (instance `:127`, default `:159`); marquee "Molded for your exact phone" (`:139`); window label "Made for your phone" (`:98`, aria-hidden). PRODUCT.md:45 flagged the old fabricated callouts; these softer manufacturing claims survived. Fix: lede "Pick your phone and see the cases listed for it. Free shipping and 30-day returns on every order."; marquee item "Listed by exact phone model"; keep "Made for your phone" only as decoration (it is aria-hidden) or change to "Pick your phone".
3. **MEDIUM: pack range hard-coded.** `18&ndash;31%` (`:113`) duplicates the automatic discounts (PRODUCT.md:39) and `cv-orbit` settings `pack_2_pct`/`pack_3_pct` (`templates/index.json:156-157`). If admin discounts change, this ticket lies. Fix (owned): add `pack_low_pct` / `pack_high_pct` range settings (defaults 18 / 31, info "Must match the automatic discounts in Shopify admin"), print "{{ low }}% or {{ high }}% off in packs of 2 or 3".
4. **MEDIUM: the spotlight photo is not a catalogue product.** `assets/cv-spotlight-case.jpg` is a studio render of a clear MagSafe-style case with a single square camera cutout (viewed); it is not one of the store's product photos, and its alt "A clear Casify phone case in a warm cream studio setting" (`:22`) presents it as a Casify product. PRODUCT.md:35: product photography stays real. Fix (owned): add a `product` setting; when set, show `product.featured_media` (real photo), title, price (`money`) and a quick pick button; fall back to the image settings; leave the bundled jpg only as a last resort with neutral alt. Merchant picks the product.
5. **LOW: design count includes non-cases.** `count_collection` = frontpage (`:11-15`); "case designs" counts every product in it, including the camera lens film if present (STORE-FACTS.md:96). Fix: count products whose model option exists (loop with the house detection rule), or label "designs in the shop".
6. **LOW: heading "Protection you forget is even there"** (`:55`, `:158`) is subjective marketing, not a measurable claim; acceptable, but pairs with the CAD claim. Optional softer: "A case for your exact phone".
7. **LOW: hard-coded id** `id="cv-spotlight"` (`:32`): a second instance would duplicate the id. Fix: `id="cv-spotlight-{{ section.id }}"` (grep of sections/, snippets/, templates/, layout/ and assets/ JS found no `#cv-spotlight` link on 2026-10-22; re-check before changing, and update any `#cv-spotlight` selector in `cv-spotlight.css`).
8. **LOW: hard-coded English** in tickets, marquee and aria (`:98`, `:101`, `:107`, `:113`, `:118`, `:123`, `:133-139`, `:144`, JS `:165`). Intentional (no free text, PRODUCT.md:45); if localising, use locale keys rather than settings to keep the no-drift guarantee.
9. **LOW: schema name** "Convert — Spotlight" (`:154`, `:170`) has an em dash; merchant-facing only.
10. **Clean:** no candy as product (peppermints are icons on the shop sign), no other brand, no ratings or counts beyond the live design count.

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "N case designs" | `:103-109` | `count_collection.all_products_count` (live) | Live (finding 5 caveat) |
| "18–31% off in packs" | `:113` | PRODUCT.md:39 | Backed, hard-coded (finding 3), dash (finding 1) |
| "Free shipping, always" | `:118`, marquee `:133` | PRODUCT.md:34 | Backed |
| "30 days to change your mind" / "30-day returns" | `:123`, `:135` | PRODUCT.md:34 | Backed |
| "Ships in 1–3 business days" | `:137` | PRODUCT.md:34 | Backed (dash) |
| "Molded for your exact phone" | `:139` | none | UNBACKED (manufacturing) |
| "Cut from your phone's own CAD file" | index.json:127, `:159` | none | UNBACKED |
| "disappears in your pocket", "Protection you forget is even there" | same, `:55` | subjective | Soft marketing; tone down with finding 2 |
| "sized to your exact model, not a generic fit" | index.json:127 | model option exists per product | Acceptable if reworded to "listed for your exact model" |

## Motion inventory

- data-cv-* attributes: `data-cv-count` (`:107`), used as data by the section script only. Section hooks: `data-cvsp`, `-awning`, `-sign`, `-mint`, `-copy`, `-ornament`, `-heading`, `-lede`, `-ctas`, `-cta`, `-display`, `-window`, `-reflection`, `-shutter`, `-spark`, `-ticket`, `-count`, `-marquee`, `-track`, `-marquee-toggle`, `-pause-icon`, `-play-icon`.
- Pending pattern: inline script adds `cvsp-pending` on `<html>` unless reduced motion, removed after 1600 ms (`:2-8`); CSS hides sign/copy/display only under that class (`cv-spotlight.css:1-3`), with a reduced-motion override (`:818-821`). No-JS: script does not run, so everything is visible; marquee shows two static sets (the second aria-hidden).
- JS `cv-spotlight-motion.js`: own SplitText-like `splitWords` with `aria-label` (`:15-31`), heading words rise, teal shutters pull back with a sheen, frame tilt toward pointer, tickets pop staggered with the design count rolling up from 0 (`:75-110`), ambient loops paused by default and started in view: marquee `xPercent -50` 30 s, mint spin 18 s, sparkle yoyo (`:147-149`), scroll-velocity marquee speed.
- Reduced motion: `showStatic()` strips inline styles and releases pending (`:34-41`, `:45-48`); also when GSAP or ScrollTrigger is missing (`:52-55`). Read once; no live `change` listener.
- Pause path: marquee toggle with `aria-pressed` and label swap (`:144-147`, JS `:160-187`); `visibilitychange` (`:192`).
- Theme editor: `shopify:section:load` / `unload` (`:222-231`).

## Motion opportunities

1. **HIGH (commerce): product-bound window with quick pick** (finding 4). When a `product` is set: shutters open on the real photo, a die-cut price ticket (live `money`, compare-at if higher) swings in with `elastic.out(1,0.35)`, and the primary CTA becomes `data-cvqp-open data-handle` "Choose your phone" (layout loads quick pick on the `data-cvqp-open` substring). On `cv:cart`, the ticket stamps "In your bag" (`back.out(2)`), the shutters do a short close-open wink (0.24s), then `window.Casify.openDrawer(btn)` from inside the handler. Reduced motion: text change only. No-JS: the CTA must be an `<a href="{{ product.url }}">` fallback with the quick pick button added by JS, or a button inside a `<noscript>`-safe link.
2. **MEDIUM: pack ticket as a live meter** (with finding 3): two notches (2 cases, 3 cases) fill with `power3.out` when the ticket pops; values from the new settings only.
3. **MEDIUM: scroll choreography.** Tie the awning valance to a gentle scrub (`rotationX` 0 to 6deg, `scrub: 0.6`) and lift the display window `y: 40 -> 0` as the section enters; both skipped under reduced motion. Keep the existing entrance as is.
4. **LOW: live preference change.** Add a `matchMedia('change')` listener that calls `showStatic()` and kills ambient tweens, matching `cv-showcase-motion.js`.

## Risks

- PRODUCT.md:45 records a merchant decision to keep tickets and marquee hard-coded (no free text). Findings 1-3 change hard-coded copy: keep it hard-coded (or numeric range settings only), never reintroduce free-text callouts.
- `assets/cv-spotlight-case.jpg` is shared with orphan `cv-compare`: do not overwrite it; add a new asset or bind a product.
- The `cvsp-pending` class sits on `<html>`; any new hidden-start element must be listed in the same `.cvsp-pending` selectors and in the reduced-motion override.
- Copy changes to the instance (`templates/index.json:127`) are merchant-visible: confirm wording with the merchant.
