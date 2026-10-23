# cv-phone-scan ("3D phone scan")

## Status

LIVE on one template: `templates/index.json:56-95`, key `phone_scan`, 2nd in `order` (right after `trust_bar`, before `casify_hero_U3GTzw`). Because the casify-hero renders nothing today (no featured product), this is effectively the first screen of the home page. Not in other templates or header/footer groups.
Instance highlights: Phone 1 "iPhone 18" (`:86-89`), Phone 2 "iPhone 18 Pro Max" (`:90-93`), both linking to `shopify://collections/iphone`; `fit_collection` blank (`:74`); store rating 4.9 / 952 shown (`:83-85`).

## Purpose

Scroll story: two primitive-built 3D iPhones float over "Made to / measure", tumble with scroll, are pinned and "scanned" (beam, fit check ticks for Cameras / Buttons / Port, readout, stamp "Fit found"), then a fitting room shows iPhone 18, 18 Pro and 18 Pro Max at true relative size. The shopper picks a model (radio), a case slides on, and up to three real products cut for that phone are dealt as cards linking to `product.url?variant=<that phone's cheapest available variant>`. Counts and "from" prices per phone are computed from the catalogue (`sections/cv-phone-scan.liquid:67-104`) through `snippets/cvps-fit-match.liquid`. No JS / no WebGL / reduced motion: compact static layout with a still image and a CSS `:has()` model picker (`:44-47`, `cv-phone-scan.css:306-312`).

## Files (owned / shared)

Owned:
- `sections/cv-phone-scan.liquid`
- `snippets/cvps-fit-match.liquid` (80 lines; only this section)
- `assets/cv-phone-scan.css` (714 lines, `:49`)
- `assets/cv-phone-scan.js` (2424 lines, module; `layout/theme.liquid:271-274`, gate `data-cvps`)
- `assets/cv-phone-scan-type.js` (121 KB glyph outlines; URL passed in JSON `:463`, imported by the module)
- `assets/cv-phone-scan-duo.webp` (still, `:224`)

Shared:
- `locales/en.default.json` keys `products.review_badges.*` (`:413-419`): used by other rating widgets too.
- `snippets/cv-icon.liquid` (`chevron-down`, `pause`, `play`, `check`, `arrow-right`, `star`).
- GSAP core, ScrollTrigger (pin), SplitText, DrawSVGPlugin (guarded `cv-phone-scan.js:1841`, `:1941`).
- three.js 0.186.0 from `cdn.jsdelivr.net` (`cv-phone-scan.js:54`, `:74`), same URL as cv-orbit.
- `templates/index.json` instance.

## Store adaptation findings

1. **HIGH: the featured pair ignores where the catalogue is.** Phone 1 is base "iPhone 18" (`templates/index.json:86-87`), which the live data shows with 1 product, while 18 Pro has 24 and 18 Pro Max 25 (STORE-FACTS.md:110-115). The kicker "Cases for iPhone 18 & iPhone 18 Pro Max" (`:61`) and the scan headline lead with the phone the store barely stocks. Fix (instance + defaults, merchant-visible copy): Phone 1 = `iphone-18-pro`, label "iPhone 18 Pro"; kicker "Cases for iPhone 18 Pro & iPhone 18 Pro Max"; schema defaults `:478`, `:523-531` to match. Better (owned code): pick the two phones with the highest live counts `n0..n2` when a new setting `auto_pair` is on.
2. **HIGH: "Shop cases for iPhone 18 Pro" does not filter by phone.** All three fit CTAs fall back to `phone_2_url` / `phone_1_url` = `shopify://collections/iphone` (`:369-379`, instance `:89`, `:93`; `fit_*_url` blank). The label promises a phone-specific list and lands on every iPhone case. Fix (owned): when `fit_*_url` is blank, build `{{ routes.search_url }}?q={{ m_label | url_encode }}&type=product&options[prefix]=last`, or a collection filter URL if the store has a model filter in Search & Discovery (cannot be checked offline; leave it as a setting). Keep the explicit `fit_*_url` override first.
3. **HIGH: Samsung and older iPhones are invisible.** The fitting room is three hard-coded iPhone 18 bodies (`:63-65`); `cvps-fit-match` only recognises `18`, `18pro`, `18promax` (`cvps-fit-match.liquid:36-55`). Samsung and iPhone 17 shoppers only get the small "Different phone? Browse every case" link (`:409-411`) pointing to all products (`other_url` blank, `:80`). Fix: keep the 3D trio, add a compact "Other phones" chip row computed from the catalogue's model option values (house detection rule, STORE-FACTS.md:145-160), each chip a search link; or point `other_url` at a phone-finder/collection list.
4. **MEDIUM: manufacturing claim in the statement.** "One mould per model. Pick your iPhone and the fit is exact" (`templates/index.json:66`, default `:485`). "One mould per model" is a production claim with no evidence; "the fit is exact" is a fit promise. Fix: "Every case is listed for the phones it fits. Pick your iPhone and see only those." The scan theatre (fit check, "Fit found") is then a visual metaphor tied to real option data, which is acceptable.
5. **MEDIUM: store rating shown with schema defaults hard-coded.** `store_rating` "4.9" and `store_rating_count` "952" are schema defaults (`:520-521`) and instance values (`:84-85`). They are in Evidence on Hand (PRODUCT.md:102) and labelled as a store rating on Trustpilot and Google (`:413-419`), so the display is backed. But a schema default means any new instance ships the number without the merchant typing it. Fix: make the defaults blank (`show_rating` already requires both, `:200`); keep the instance values.
6. **MEDIUM: cards hide the choice of style.** Each card links to the cheapest available variant for that phone (`cvps-fit-match.liquid` header, `:168`), so the colour/style is picked for the shopper (only the phone was chosen). It is a link, so the PDP still lets them change it; do not turn it into a direct add (see Motion opportunities 1).
7. **MEDIUM: 50-product cap.** `collections.all.products` loops (`:75`, `:110`) see at most 50 products (comment `:67-68`). The catalogue has 31 showcase handles today (STORE-FACTS.md:100), fine now; counts silently undercount past 50. Fix: paginate (`{% paginate collections.all.products by 250 %}`) around both loops.
8. **LOW: hard-coded English** not in settings/locales: "Pause motion"/"Play motion" (`:245`, JS `:2320`), "Model" (`:264`), "Fit check", "Cameras", "Buttons", "Port" (`:270-273`), "Scan" (`:281`), "Drag to turn" (`:314`), "Your iPhone" (`:319`), "case/cases", "None yet" (`:343`), "Pick yours to see the cases cut for it." (`:350`), "cut for", "from" (`:384-387`), "No cases listed for ... yet." / "Browse every case" (`:397-399`), alt "X and Y" (`:226`). Fix: section settings (owned) for the visible ones.
9. **LOW: "Nº 18" scan id** (`:487`, instance) is decorative; fine. The readout "000%" (`:283`) is scan progress, not a claim.
10. **LOW: product depiction.** The 3D "iPhone 18" body follows a "reported design" for a spring 2027 launch (`:22-24`). Shown as a generic phone silhouette; acceptable, but do not label it with specs.
11. **Clean:** no em/en dashes in this section's shopper copy; prices via `money`; no candy as product (sprinkles and tape measures are backdrop, `:41-43`).

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "Free shipping" tag | `:254`, index.json tag_1 | PRODUCT.md:34 | Backed |
| "30-day returns" tag | `:255`, tag_2 | PRODUCT.md:34 | Backed |
| "4.9 / 5, 952 reviews, store rating, Trustpilot & Google" | `:412-421`, index.json:83-85, defaults `:520-521` | PRODUCT.md:102 (merchant-supplied store rating) | Backed (merchant-typed; defaults should be blank) |
| "N cases cut for iPhone 18 Pro, from $X" | `:383-388` | Live catalogue via cvps-fit-match | Live |
| Card price / compare-at | `:166-177` | Live variant | Live |
| "One mould per model ... the fit is exact" | index.json:66, `:485` | none | UNBACKED |
| Fit check ticks (Cameras, Buttons, Port), "Fit found" | `:270-290` | metaphor tied to option data | Acceptable theatre; do not add measurements |

## Motion inventory

- data-cv-* attributes: none. Section hooks: `data-cvps`, `-backdrop`, `-stage`, `-beam`, `-hero`, `-rise`, `-fade`, `-jump`, `-pause`, `-info`, `-statement`, `-scanner`, `-id`, `-checks`, `-check`, `-frame`, `-readout`, `-stamp`, `-fit`, `-fit-in`, `-fit-title`, `-slot`, `-snap`, `-models`, `-model`, `-model-chip`, `-panel`, `-count`, `-status-text`, `-card`, `-fit-cta`, `-status`, `-data`.
- JS (`cv-phone-scan.js` header `:1-53`): extruded 3D type over transparent HTML; backdrop canvas; tumble tied to scroll; pinned scanner (`ScrollTrigger.create({ pin: true })` `:2037-2041`) with beam shader, readout count and checks; fitting-room pick timeline (`expo.out`, `power3.inOut`, `:2170-2186`); SplitText reveals for HTML copy (`:1839-1845`), DrawSVG when available (`:1941`).
- Reduced motion / no WebGL: `boot` never mounts (`:2412`); CSS without `.is-3d` is the finished compact layout (`cv-phone-scan.css:4-5`). Checked once; no live `change` listener.
- No-JS: complete. Radios + `:has()` show the picked panel (`cv-phone-scan.css:306-311`); `@supports not selector(:has(*))` stacks all panels (`:312`). Cards and CTAs are links.
- Pause path: `data-cvps-pause` button (`:242-246`, JS `:2316-2322`) pauses the ambient bob/sway; render only while in view (`:2292-2298`) and on `visibilitychange` (`:2300`).
- Theme editor: `shopify:section:load` / `unload` with `_cvpsDestroy` (`:2418-2424`); teardown removes `.is-3d` and refreshes ScrollTrigger (`:2399-2403`).
- ScrollTrigger ordering: mounts late (after three.js loads), so it calls `ScrollTrigger.sort()` + `refresh()` (`:2326-2329`). Any section below that measures positions must survive this late refresh.

## Motion opportunities

1. **HIGH (commerce): "Choose colour" quick pick on fit cards.** Keep the card link, add a small "Choose colour" button per card with `data-cvqp-open data-handle data-url` (printed in Liquid, so the layout gate loads the dialog, `layout/theme.liquid:208`, `:295`). The phone is already chosen in the fitting room; quick pick currently cannot pre-select a model (no such hook in `cv-quick-pick.js`), so the shopper re-picks the phone in the dialog. A model pre-fill (`data-model`) would need a shared edit to `cv-quick-pick.js`: propose it to the owner of that file, do not edit it here. Motion: cards already deal in; on `cv:cart` the matching card stamps a teal "In your bag" ticket (`back.out(2)`, 0.35s) and the stamp element pulses. Reduced motion: text change only.
2. **HIGH: deal-in for the static layout.** Without WebGL (many phones, reduced GPU), the fitting room has no motion at all. Add a light GSAP path for `!is-3d` and motion allowed: chips rise with stagger, picked panel cards deal from the chip (`x` from chip centre, `rotation` ±2deg, `power3.out` 0.42s), count `data-cvps-count` rolls up (live value). Skip entirely under reduced motion.
3. **MEDIUM: fit CTA morph.** When a phone is picked, the CTA label flips (yPercent) to "Shop cases for iPhone 18 Pro" and the arrow nudges (`elastic.out(1,0.4)`); after finding 2 the link is real.
4. **LOW: shorter pin on small screens.** The scanner pin plus 100vh panels (`cv-phone-scan.css:424`) make a very long first screen on phones; consider `ScrollTrigger.matchMedia` to shorten the pin distance under 700px so the fitting room (the commerce part) arrives sooner.

## Risks

- Runtime CDN import of three.js (`:54`); failure falls back to static, keep it that way.
- File is 2424 lines with hand-tuned scroll math; prefer additive changes (new functions) over refactors. Test scroll positions of every section below after any change, because of the late `refresh()`.
- `products.review_badges.*` locale keys are shared with other rating widgets: do not reword them for this section.
- Changing the instance phones (finding 1) is a merchant-visible copy change in `templates/index.json` (shared file): confirm with the merchant.
