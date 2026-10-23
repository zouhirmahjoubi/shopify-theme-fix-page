# cv-contact ("Contact: the letterbox")

## Status

LIVE on `templates/page.contact.json` (only section, key `main`). Template settings match schema defaults; 4 answer blocks: `a-track` -> page `track-order`, `a-returns` -> `return-policy`, `a-shipping` -> `shipping-policy`, `a-faqs` -> `faqs` (templates/page.contact.json:20-25). Behaviour JS (`assets/cv-pages.js`) loads because `template.name == 'page'` (layout/theme.liquid:166-168, 338-341).

## Purpose

Contact page: title (setting or page title) and the Contact page's own content as lede; "It may already be answered" links to real store pages (block `page` picker; missing pages are skipped); Shopify `contact` form with topic chips, name, email, optional order number and phone model, message; success/error states; a candy-red letterbox plate (KIE set piece) above the form; a rail with email, phone and address read live from Settings > Store details and a service bell plate that rings after sending.

## Files (owned / shared)

Owned:

- `sections/cv-contact.liquid`
- `templates/page.contact.json`
- `assets/contact-letterbox.webp` and `assets/contact-letterbox.webp.json` (only cv-contact references the plate)
- Inside shared files: the `.cvct*` rules in assets/cv-pages.css:279-362 plus `.cvct` lines in the media queries (~441-472), and the `contact` IIFE in assets/cv-pages.js:361-409.

Shared:

- `assets/cv-pages.css` (also cv-collection, cv-collections-list, cv-page, snippets/cv-pack-meter.liquid). Note `.cvct__submit` shares its base/hover/active/focus rules with `.cvl__apply` (cv-pages.css:29-41).
- `assets/cv-pages.js` (signs, packMeter, aisle, ruleBook, contact modules).
- `assets/contact-bell.webp` (also the cv-page help panel).
- `snippets/cv-icon.liquid` (arrow-right, check, cross, mail, device, gift, plus block icons).
- `assets/theme.css` (`.cv-crumbs`, `.cv-page-root`, `.rte`, global `button[type="submit"]:hover`).
- GSAP bundle: core, MotionPathPlugin (loaded because `shop_page` is true, layout/theme.liquid:173-177).

## Store adaptation findings

1. MEDIUM, phone model placeholder is hardcoded and out of date: `placeholder="iPhone 16 Pro"` (sections/cv-contact.liquid:113). The catalog sells iPhone 18 family cases (PRODUCT.md:53, 66) and option 2 of each product is the phone model with 20 to 40 values (PRODUCT.md:31). Fix: add a `<datalist>` built from real option values, e.g. loop `collections.all.products` (limit ~50) and collect `product.options_with_values` where the option name matches "Model"/"Phone" into a `uniq` list, and set the placeholder to the first value or to a setting (`model_placeholder`, default blank). Keep the field free text so an unlisted model still submits.
2. LOW, order number placeholder `#1001` (line 109) is a plausible example, fine; consider using the store's real order name prefix only if exposed (it is not in Liquid), so leave it.
3. LOW, verify answer block `a-faqs` handle `faqs` (templates/page.contact.json:23). The theme ships `templates/page.faq.json`, which suggests the FAQ page handle may be `faq`. If `pages['faqs']` does not exist the block silently disappears (sections/cv-contact.liquid:39), so the shopper loses the FAQ link. Fix in the theme editor by re-picking the page (writes the right handle).
4. LOW, address icon is `gift` (line 158), which reads as a promotion; the icon set has no envelope-post icon besides `mail` (used for email). Acceptable; consider `ticket-scallop` or a new `pin` icon in cv-icon (shared snippet, coordinate).
5. LOW, `show_address` defaults to true (line 186) and prints `shop.address.summary`. Correct data binding, but confirm with the merchant that the Store details address is meant to be public (it may be a home address).
6. LOW, hardcoded English labels: "Name", "Email", "Order number", "optional", "Your phone model", "Message", "Email", "Phone" (lines 98-117, 142, 151), breadcrumb "Home". Move to locales later.
7. GOOD: email/phone/address come from `shop.*` (lines 138-164); topics, form copy and fine print are settings; success message promises nothing beyond replying by email. No prices, no other brands, no candy-as-product, no dashes in copy.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Email, phone, address | `shop.email`, `shop.phone`, `shop.address.summary` (sections/cv-contact.liquid:138-164) | Store data |
| "the reply will come to the email address you gave" | success_message, line 70 / 181; templates/page.contact.json | Process statement, no time promise; acceptable |
| "Your details are used to answer this message." | fine_print, line 182 | Merchant setting; acceptable (schema info asks to keep it true) |
| Answer link lines ("Where a parcel is on its way", "How to send a case back", "How orders are packed and sent") | templates/page.contact.json:20-22 | Descriptions only, no figures; fine |

No ratings, counts, guarantees or delivery times.

## Motion inventory

- No `data-cv-*` attributes; no reveals (whole page readable without JS).
- Section JS, assets/cv-pages.js `contact` (361-409):
  - On submit (valid form, GSAP present, not reduced): the envelope icon clones into a fixed flyer and arcs into the letterbox with MotionPathPlugin (`curviness 1.25`, 750 ms `power2.inOut`; linear x/y fallback without the plugin), then squashes out and the letterbox wobbles (`rotation [0,-4,3,-1,0]`).
  - On success render (`[data-cvct-sent]`): scrolls the card into view and rings the bell after 350 ms (keyframed rotation, 950 ms).
  - Bell click rings it (img with click handler, not keyboard reachable, decorative).
- The submit is not prevented, so the browser starts navigating immediately; the 750 ms flight is usually cut off by the page unload (works only on slow responses).
- Reduced motion: `motion` false skips flight and ring; the success scroll uses `behavior: 'auto'`. cv-pages.css:~479 removes `.cvct__link` arrow transition.
- No-JS: fully readable and functional (native form POST).
- Theme editor: no `shopify:section:load` handling; the bell and submit listeners are lost after a re-render until reload.

## Motion opportunities

1. HIGH (polish of an existing moment): make the letter flight visible. On submit, `preventDefault`, play the flight (cap at 600 ms), then call `form.requestSubmit()` guarded by a flag so the handler does not loop, with a 900 ms safety timeout that submits regardless. Under reduced motion or without GSAP, do nothing (native submit). Check Shopify's contact-form hCaptcha still runs (it hooks the submit event; `requestSubmit` re-fires it, plain `form.submit()` would bypass it, so never use `submit()`).
2. MEDIUM: entrance choreography with ScrollTrigger `once`, all `from()` so the static page is complete: letterbox drops onto the card on its post (y -60, rotation -8, `elastic.out(1, 0.45)`), bell swings in on its bracket, answer links stagger (y 10, 40 ms), "ways" rows slide 12px. Same treatment as the cv-page badge drop for consistency.
3. MEDIUM: invalid-field feedback: listen to the form's `invalid` event (capture) and give the field a 3-step x shake (6px, 240 ms total) plus focus; topic chips get a stamp (scale 0.94 then 1, candy spring) on select. Reduced motion: no shake, keep the native message.
4. MEDIUM: refactor `contact` into `init(root)` / `destroy(root)` and wire `shopify:section:load/unload` (pattern in assets/cv-hanging-cards.js:217-236).
5. LOW: make the bell a real `<button type="button" aria-label="Ring the bell">` wrapper so keyboard users can ring it, or leave it purely decorative and remove the click handler.
6. Commerce: none on a contact page.

## Risks

- `assets/cv-pages.js` / `assets/cv-pages.css` are shared with collection pages (aisle filters, pack meter) and cv-page; edit only the `contact` IIFE and `.cvct*` selectors. `.cvct__submit` shares a rule block with `.cvl__apply`: do not change that combined rule, add a `.cvct__submit` override instead.
- Intercepting submit can break Shopify's spam challenge if done with `form.submit()`; use `requestSubmit()` and test the success state.
- A datalist built from `collections.all` costs a product loop on the contact page; cap the loop and dedupe.
