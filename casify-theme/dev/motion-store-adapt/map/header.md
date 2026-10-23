# header ("Header")

Family: shell. Read-only map, 2026-10-22. Paths relative to `casify-theme/`.
Severity: H / M / L as in the other maps. Proposed copy below contains no em or en dashes.

## Status

**live** on every storefront page that uses `layout/theme.liquid`: placed by the section group
`sections/header-group.json:4-12` (type `header`, key `header`) and rendered by
`{% sections 'header-group' %}` at `layout/theme.liquid:203`. That covers all 24 JSON templates:
404, article, article.reviews, blog, blog.reviews, cart, collection, index, list-collections, page,
page.about-us, page.campaign-guide, page.contact, page.faq, page.privacy-policy, page.reel-showcase,
page.return-policy, page.shipping-policy, page.terms-and-conditions, page.track-order, product,
product.best, product.convert, search. Not on `layout/password.liquid` or
`layout/gift_card.liquid` (neither renders the group).

Saved settings (`sections/header-group.json:16-21`, same on the live copy
`dev/live-check-2026-10-03/sections/header-group.json`): `ticker_text`, `topbar_enable`,
`topbar_left`, `topbar_right`, `nav_style: "bubble"`. **`topbar_pill` and `menu` are not saved**, so
the schema defaults render: pill "★ EST. 1920 · Still on awning duty" (header.liquid:219) and menu
`main-menu` (:221). The 2026-10-07 live baseline text confirms the pill renders
(`../dev/payments-readiness-review/baseline.json`, "★ EST. 1920 · STILL ON AWNING DUTY").

## Purpose

The shop front: a striped awning with a scrolling service ticker, a cocoa topbar (dispatch, pill,
returns), and the sticky glass nav carrying the hanging "CASIFY / PHONE CASES" sign
(`snippets/casify-logo.liquid`), the merchant's main menu with icons, search toggle with predictive
search, and the bag button with live count. It also hosts the mobile menu dialog and, by accident of
history, the global CSS for the skip link, search panel, predictive results, mobile nav **and the cart
drawer** (header.liquid:153-209). Behaviour and motion: `assets/cv-header.js`.

## Files (owned / shared)

Owned (only this section uses them; a header lane may edit):
- `sections/header.liquid` (235 lines).
- `sections/header-group.json` (only places this section; merchant-editable, "auto-generated" comment
  on live; prefer changing schema defaults and telling the merchant rather than editing saved values).
- `assets/cv-header.css` (195 lines): loaded only by header.liquid:10. **Caveat**: its `.casify-sign*`
  block (cv-header.css:73-100, 186-195) also sizes the logo the footer renders
  (footer.liquid:26 via casify-logo). Do not rename or drop those rules without the footer lane.
- `assets/cv-header.js` (581 lines): targets only header markup (`[data-section-type="header"]`,
  cv-header.js:571). It is loaded unconditionally by `layout/theme.liquid:212` (the layout line is
  shared; do not touch it). It is also the single owner of the bag-badge bounce (cv-header.js:234-249);
  MOTION-SYSTEM.md section 7 item 6 says any new cart motion must reuse it.

Shared (read, never edit from this lane; coordinate):
- `snippets/casify-logo.liquid`: header (header.liquid:57, `enter: true`) and footer (footer.liquid:26).
  Prints `data-cvh-enter` on the mints and plaque when `enter` (casify-logo.liquid:19-20, 40-45).
- `snippets/icon.liquid` (menu, search, bag, close; used theme-wide) and `snippets/cv-icon.liquid`
  (nav glyphs mail, device, device-notch, grid at cv-icon.liquid:135-162; used theme-wide).
- Images `assets/header-sign-plaque.png`, `assets/header-peppermint-red.png`
  (also footer.liquid:108 and best-product.css), `assets/header-peppermint-teal.png` (also
  best-product.css). Rendered through casify-logo.
- `assets/theme.css`: base `.awning` (theme.css:139-182, incl. a dead unbacked ticker string, see
  findings), `.topbar` (:184-202), `.nav` (:205-247, 2628-2640), `.iconbtn` / `.badge` (:249-271,
  2682), `.cm-skip-link` (:910-919), header/drawer duplicates (:2678-2711), print (:4529),
  touch sizes (:4126-4134, 4507), reduced motion (:3228-3233, 3307-3313), `.cv-ico--anim` keyframes
  (:992-997).
- `layout/theme.liquid`: group render (:203), skip link (:202), script tags (:212), GSAP bundle (:182).
- `snippets/gsap.liquid`: always ships CustomEase, CustomBounce, CustomWiggle, DrawSVGPlugin,
  ScrollTrigger, ScrollToPlugin, SplitText (gsap.liquid:23-35). Flip and MotionPathPlugin only on
  product templates and shop pages, never on the home page.
- `locales/en.default.json:3` (`general.search.*`: "Search cases or phone models").
- `sections/predictive-search.liquid` (dynamic; fetched by cv-header.js:134 with
  `section_id=predictive-search`, styles for its classes live in header.liquid:166-185).
- `snippets/cart-drawer.liquid` + `assets/cart.js`: the drawer panel/scrim/head/body/footer CSS is
  in header.liquid:196-207 (see Risks).
- DOM contract consumed by other files (keep ids, attributes and the bag being the last
  `.nav__icons .iconbtn`): `#bagBtn` (cart.js:129, theme.js:131, cv-pdp-counter-motion.js:262,
  cv-pdp-slip-motion.js:102), `#bagBadge` (theme.js:115), `[data-cart-count]` (cart.js:135,
  cv-quick-pick.js:54), `[data-cart-drawer-open]` (cart.js:80), `.cm-scroll-lock`
  (header.liquid:208; cart.js:68 on `html`, cv-header.js:61 on `body`), `html.cvh-has-progress`
  (hides cv-motion's `.cv-progress`, cv-header.css:110).

## Store adaptation findings

1. **M: unbacked "FREE SHIPPING OVER $40" ticker string survives in theme.css.**
   `assets/theme.css:169-170` `.awning::after { content: "EST. 1920 · FREE SHIPPING OVER $40 · ..." }`.
   PRODUCT.md:104 lists "free shipping over $40 or $45" as not verified; the confirmed fact is free
   shipping with no threshold (PRODUCT.md:34). It is hidden today only by
   `cv-header.css:31-32` (`.cvh-awning::after { content: none }`). Fix: theme.css owner deletes the
   `content` string (and the rule); header lane keeps the `content: none` guard until then.
2. **M: Liquid fallbacks make the ticker and topbar impossible to blank.** header.liquid:23
   (`ticker_text | default: ...`), :42 (`topbar_left | default: 'Ships in 1-3 business days'`), :46
   (`topbar_right | default: '30-day returns'`). Clearing the field in the editor brings the copy
   back. Fix: drop the `| default:` filters (the schema defaults at :216-220 already seed new
   installs) and wrap each piece in `{%- if ... != blank -%}`; hide the whole awning ticker when
   `ticker_text` is blank.
3. **M: "Free shipping" is never exposed to assistive tech in the header.** The only copy carrying it
   is the awning ticker, which sits in `aria-hidden="true"` (header.liquid:29-37); the topbar shows
   dispatch and returns only (:42, :46). Fix: print `ticker_text` once in a visually hidden span
   outside the aria-hidden awning (theme has `.visually-hidden`? if not, add a cvh-scoped utility in
   cv-header.css), or add a "Free shipping" topbar item.
4. **M: label text below the design minimum.** Ticker 10px / 9px (cv-header.css:68, :191), topbar
   10px (theme.css:188). DESIGN.md:130 asks for about 11-12px or larger on mobile labels. Fix in owned
   CSS: `.cvh-ticker__track span { font-size: 11px }`, raise `.cvh-ticker` height to ~17px,
   `.cvh-root .topbar { font-size: 11px }` (override scoped to the section root, so theme.css stays
   untouched).
5. **M: nav icons keyed to English link titles.** header.liquid:62-74 and :131-143 (duplicated
   `case link.title` with 'Contact', 'iPhone', 'Samsung', 'Collections'). Renaming a menu item
   ("Shop iPhone", "Galaxy") silently drops its icon. Fix: decide by store data, e.g.
   `link.type == 'page_link' and link.object.handle == 'contact'` -> mail,
   `link.url contains 'iphone'` -> device, `contains 'samsung'` or `'galaxy'` -> device-notch,
   `link.type == 'collections_link'` or `link.url == routes.collections_url` -> grid; compute once in a
   `{% liquid %}` block or an owned snippet (e.g. `snippets/cvh-nav-icon.liquid`, new, header-only).
6. **L: topbar pill default.** header.liquid:219 "★ EST. 1920 · Still on awning duty" renders live
   (key absent from header-group.json). No false fact, but the ★ next to "EST." can read as a rating
   glyph. Optional: change the schema default to "Est. 1920" without the star, or to a backed fact
   such as "Phone cases for iPhone and Samsung". Leave the merchant's choice if they saved one.
7. **L: hardcoded English UI text, and "1 items".** "Menu" (header.liquid:122), aria-labels "Menu"
   (:53), "Search" (:86), "Cart, {{ cart.item_count }} items" (:87, renders "Cart, 1 items" until
   cart.js:128-131 relabels it), "Close menu" (:123), "Primary" (:60), "Mobile" (:119). Fix: pluralise
   in Liquid now (`{% if cart.item_count == 1 %}item{% else %}items{% endif %}`); move strings to
   locale keys only in coordination with the locales owner (locales/en.default.json is shared).
8. **L: no-JS mobile has no menu or search.** The burger and search toggles are JS-only buttons
   (header.liquid:53, :86) and `.nav__links` is hidden below 981px. Fix: progressive enhancement,
   e.g. a `<noscript>` link row of `header_menu_links` under the nav, and a `<noscript>` link to
   `routes.search_url` beside the search button.
9. **OK, keep:** menu comes from `linklists[section.settings.menu]` (store data, :24); contact link
   moved last (:25-27); search posts `type=product` (:112), right for a case catalogue; placeholder
   from `general.search.placeholder` = "Search cases or phone models" (locale :3; the live backup's
   "Search sweets, gifts, and flavours" is already fixed locally, STORE-FACTS.md section 2); bag count
   from `cart.item_count` (:87-89). No prices, currencies, phone model lists, reviews or other brands
   appear in this section.
10. **L: dev-only query switch ships to shoppers.** `?nav_fx=spotlight|bubble|blob|none`
    (cv-header.js:366-368). Harmless; remove or keep, but do not document it to shoppers.

## Claims register

| Claim (as rendered) | Where | Status |
|---|---|---|
| "Est. 1920 · Free shipping · 30-day returns" (ticker) | header-group.json:17; default header.liquid:23, :216 | BACKED: free shipping, no threshold, and 30-day returns PRODUCT.md:34; "Est. 1920" is brand voice PRODUCT.md:96 (theatre, not history) |
| "Ships in 1-3 business days" (topbar left) | header-group.json:19; header.liquid:42, :218 | BACKED: dispatch within 1 to 3 business days PRODUCT.md:34 (hyphen, not an en dash) |
| "30-day returns" (topbar right) | header-group.json:20; header.liquid:46, :220 | BACKED: PRODUCT.md:34 |
| "★ EST. 1920 · Still on awning duty" (pill) | header.liquid:219 (schema default, live) | Brand theatre, no factual claim |
| Bag count | header.liquid:87-89 | LIVE: `cart.item_count` |
| "EST. 1920 · FREE SHIPPING OVER $40 · 30-DAY RETURNS" | theme.css:169-170 (suppressed by cv-header.css:31-32) | UNBACKED (PRODUCT.md:104); dead today, latent if cv-header.css fails |
| "CASIFY / PHONE CASES" sign artwork | assets/header-sign-plaque.png via casify-logo.liquid:43 | Brand mark, true |

## Motion inventory

- **cv-motion attributes (`data-cv-*`)**: none. The header is fully bespoke.
- **Bespoke hooks**: `data-cvh-enter` (pieces hidden by `html.cvh-pending`, header.liquid:31, 36, 42,
  44, 46, 53, 75, 86-87; casify-logo.liquid:40-45), `data-section-type="header"` (boot,
  cv-header.js:571), `data-nav-fx` (header.liquid:51), `.cvh-fx` layer (:93-102),
  `.cvh-progress` (:103).
- **Pending guard**: inline script header.liquid:11-20 adds `cvh-pending` unless reduced motion,
  removed by cv-header.js:373 or after 1200ms; CSS `.cvh-pending [data-cvh-enter] { opacity: 0 }`
  (cv-header.css:24). Note this briefly hides the burger, search and bag buttons (commerce controls)
  for up to 1.2s on a slow device.
- **Section JS** `assets/cv-header.js`:
  - load timeline (cv-header.js:320-337): valance elastic drop, ticker fade, topbar stagger, plaque
    swing (elastic 1.2s), mints roll in (back.out), links and icon buttons stagger; `tl.progress(1)` in
    hidden tabs (:337).
  - ambient loops (:277-293): awning stripe drift (`--cvh-drift`, 5s, infinite), mint faces spin
    (10s, infinite), ticker track (42s, infinite, mouse-hover pause only).
  - scroll (:301-317): ScrollTrigger velocity "gusts" speed loops up and skew the valance; sticky
    state scales the sign to 0.86 (:200); hide-on-scroll-down / show-on-scroll-up nav
    (`yPercent -115`, :203-218), never while menu or search open or focus inside (:206).
  - progress bar (:252-261): ScrollTrigger scrub on `.cvh-progress__fill`; kept under reduced motion
    (position only).
  - hover/press (:339-364): sign wiggle (CustomWiggle `cvhWiggle`, fallback `elastic.out(1, 0.3)`,
    :45-47), link icon wiggle, icon-button press squash.
  - menu indicator `initNavFx` (:393-568): spotlight / bubble (live: "bubble") / blob, follows hover
    and focus, rests on `aria-current` link, resyncs on resize and fonts.
  - mobile menu (:56-94): GSAP xPercent slide + link stagger, focus trap via `CasifyA11y.trapFocus`.
  - search panel (:114-127) and predictive results stagger (:143-146).
  - cart badge (:234-249): MutationObserver on `[data-cart-count]` -> elastic badge pop + bag icon
    wiggle. cart.js's CSS `.is-bump` is muted under `.cvh-motion` (cv-header.css:182-183).
- **CSS motion**: `.cv-ico--anim` on nav icons (header.liquid:76, :145, `animate: true`) runs
  `cv-ico-pulse` 2.4s **infinite** (theme.css:996) on device, device-notch and grid, and a draw on mail
  (:992); `.cm-underline` scaleX (header.liquid:157-158); mobile nav `cm-fade-in` when GSAP is off
  (:188).
- **GSAP plugins**: core, ScrollTrigger, CustomWiggle (+CustomEase). No SplitText, Flip, MotionPath.
- **Reduced motion**: read once (cv-header.js:22, :34); no pending class; no tweens except the
  progress bar; theme.css:3233 stops `.awning` CSS drift, :3228-3230 stops icon pulses, :3307-3313
  zeroes all transitions. A preference change mid-session is not picked up (no `gsap.matchMedia`).
- **No-JS state**: readable (pending class never set, everything visible, ticker static). Mobile menu
  and search cannot open (finding 8).
- **Theme editor**: `shopify:section:load` re-boots (:575), `shopify:section:unload` destroys
  listeners and reverts the gsap.context (:576-580, :375-380). Mobile-menu tweens sit outside the
  context (harmless). `cvh-motion` stays on `<html>` after unload.
- **Offscreen / hidden**: hidden tabs stop via rAF. **No offscreen pause**: the awning and topbar
  scroll away (cv-header.css:12-16) while drift and ticker loops keep running; mints and icon pulses
  stay on screen forever in the sticky nav.

## Motion opportunities

Ranked. Engine: GSAP in `assets/cv-header.js` (owned). cv-motion attributes are not a fit here.

1. **HIGH, commerce: keep the bag visible when something is added.** The nav tucks away on scroll down
   (cv-header.js:212-214). On product pages the shopper scrolls down to Add to bag, so the nav is
   hidden and `bagTarget()` in cv-pdp-counter-motion.js:261-268 (and slip motion :102) finds no
   on-screen bag: the photo-ticket token has nowhere to land and the badge bounce is off screen.
   Fix in cv-header.js: listen in the **capture phase** on `document` for `cvs:adding` and `cvs:buying`
   (cv-product.js dispatches them on the `[data-cv-pdp]` root without `bubbles`, cv-product.js:611;
   capture still reaches document), plus bubbling `cart:added` / `cart:refresh` (cv-product.js:620-621)
   and `cv:cart` (cv-quick-pick.js:58). On any of them: `showNav()` and hold it shown for ~2.5s (add a
   `holdUntil` timestamp to the `busy` test at :206). Reduced motion: set `yPercent: 0` instantly
   (the nav never hides there anyway).
2. **HIGH, commerce: one "bag receives" moment with a public API.** Extend the badge observer
   (:234-249) into `window.CasifyHeader = { bag: <#bagBtn>, receive({ qty }) }`: icon squash
   (scaleY 0.8 -> 1 elastic), badge pop (existing), and a number roll inside the badge (two stacked
   spans, `yPercent` flip, 0.24s `--ease-out-soft` equivalent `power3.out`). The global fly-to-bag
   (MOTION-SYSTEM.md section 6 gap 3) and the counter fly then call `receive()` instead of each scaling
   the icon (cv-pdp-counter-motion.js:316-319 scales it 1.35 today). Guard with a
   `data-cvh-receiving` flag so two adds in a row do not stack (section 7 item 6). Must not depend on
   Flip or MotionPath (absent on the home page). Reduced motion: no tween; the accessible feedback is
   cart.js's aria-label update (cart.js:128-131) and the existing toast.
3. **HIGH, compliance: ambient loop discipline** (DESIGN.md:183, :192). Add one ScrollTrigger on
   `.cvh-awning` (`start: 'top top'... onToggle`) that pauses the drift and ticker loops while the
   awning is off screen (copy the footer pattern, cv-footer.js:84-101, :133-136); make the mints rest
   (`timeScale` 0) and spin only during gusts and hover; render nav icons with `animate: false`
   (header.liquid:76, :145) and wiggle them on hover only (already done at :347-353); pause loops on
   `visibilitychange`; give the ticker a keyboard-reachable pause or stop it after one pass. Move to
   `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` so a preference change reverts
   everything.
4. **MED: mobile menu as a hanging sign.** On open, drop the striped head (`.cm-mobile-nav__head`
   scaleY 0 -> 1, transformOrigin top, `elastic.out(1, 0.4)`), then the existing link stagger
   (:69-70); close button spins in (rotation -90 -> 0, back.out). Pure decoration, `opacity`/
   transform only, same reduced-motion gate.
5. **MED: search panel drop.** Replace the plain fade (:123) with a short sign drop
   (y -14 -> 0, rotationX -10 -> 0, transformOrigin top, 0.42s power3.out); keep predictive result
   stagger (:143-146). Store copy for empty results belongs to the predictive-search lane.
6. **LOW: progress bar head.** A small peppermint (`header-peppermint-red.png`, shared asset, read-only
   use) riding the end of `.cvh-progress__fill`, rotation tied to the same scrub. Skip under reduced
   motion (bar stays).
7. **Not here: cart drawer.** Its slide/scrim CSS lives in header.liquid:196-207 but its open/close is
   cart.js (shared). Drawer choreography (GSAP slide, line stagger after `refreshDrawer`) belongs to the
   cv-cart-drawer lane once the CSS is moved (Risks 1). The header lane only provides the bag API above.

## Risks

1. **Cart drawer CSS lives in this section.** header.liquid:196-207 (panel `position: fixed`,
   `transform`, glass, scrim, head stripes, body, footer) plus global shell CSS at :153-195 and :208.
   Removing or disabling the header section, or a parallel edit by the drawer lane, breaks the drawer on
   every page. The inline `<style>` comes after theme.css, so it wins over the duplicates at
   theme.css:2694-2711 (scrim z-index 94 vs 80; `.cm-predictive-results` static vs absolute at :2700).
   Plan: the drawer lane moves :196-207 into a drawer-owned file in one coordinated change; the header
   lane may move only header-only rules (search panel, predictive results, mobile nav, underline) into
   cv-header.css and must keep selectors and specificity identical.
2. **DOM contract.** Do not rename `#bagBtn`, `#bagBadge`, `[data-cart-count]`,
   `[data-cart-drawer-open]`, `#cm-search-panel`, `#cm-predictive-search-results`,
   `[data-predictive-search-*]`, `#cm-mobile-nav`, `[data-mobile-menu-*]`, and keep the bag the last
   `.nav__icons .iconbtn` (fallback selector in two motion files).
3. **z-index ladder**: `.cvh-root` 91 (cv-header.css:15) sits above the sticky add-to-cart bar (90) and
   below the drawer/scrim (94/95). New header layers must stay inside the nav's stacking context.
4. **Transform ownership**: GSAP animates `nav` `yPercent`, the sign `scale`, the plaque `rotation`;
   theme.css transitions `.iconbtn` transform on hover (:250-257). Any new GSAP transform on
   `.iconbtn` itself must go on the inner `.cm-icon` (as today) or switch the CSS transition off under
   `.cvh-motion`.
5. **Shared art**: `header-peppermint-red.png` is also used by the footer back-to-top and
   best-product.css; never rename or re-crop it.
6. **Saved settings**: header-group.json is rewritten by the theme editor; schema-default copy changes
   reach the live store only for keys the merchant never saved (today: `topbar_pill`, `menu`).
7. **Pending timeout**: if a new piece gets `data-cvh-enter`, it is hidden up to 1.2s; never add it to
   anything a shopper must read first (prices, model fit).
