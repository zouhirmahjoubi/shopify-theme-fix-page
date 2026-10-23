# cv-apps ("Apps")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. No `enabled_on` / `disabled_on`; addable
anywhere. Preset "Apps" with no blocks (sections/cv-apps.liquid:87).

## Purpose

The theme's container for third-party `@app` blocks (reviews, UGC, loyalty widgets), with optional heading
(inline richtext, `<em>` set in the script face), sub-heading, page margins, background tone, an optional
paper-card frame per app, and a GSAP reveal that moves only the theme's wrappers, never app markup
(:1-13, cv-apps.js:1-12). It also refreshes ScrollTrigger when an app changes height after load
(cv-apps.js:46-57). This is the natural home for the review app the merchant chose to connect
(PRODUCT.md:105) on non-product templates.

## Files (owned / shared)

Owned:
- `sections/cv-apps.liquid` (89 lines)
- `assets/cv-apps.css` (66 lines; static finished state, cv-apps.css:1-5)
- `assets/cv-apps.js` (118 lines)
  (only consumers by grep; `assets/AGENTS.md:17` merely lists the file)

Shared:
- `layout/theme.liquid:263-266`: loads cv-apps.js when `content_for_layout contains 'data-cvap'` or in the editor.
  The substring `data-cvap` is printed only by this section (grep).
- GSAP core, ScrollTrigger, SplitText (always loaded, snippets/gsap.liquid:36).

## Store adaptation findings

1. LOW (wrong brand in source): header comment "Casify — Apps (Chrismass design system)" (:2). Developer-only,
   but DECISIONS.md:3-5 separates Casify from the christmascandles.shop theme; rename to "Casify Candy Shop design
   system" to avoid agents confusing the two stores. Same for the em dash in that comment.
2. LOW (dash rule, editor-facing): heading `info` "use it for one short flourish" is preceded by an em dash
   (:57). Merchant-facing help text, not shopper copy; change to a colon for consistency.
3. LOW: editor-only empty state is hardcoded English (:42; only printed when there are no blocks, which can only
   happen in design mode because of the guard at :18). Move to locales for consistency.
4. LOW (design rule): the script-face `<em>` in the heading (cv-apps.css:29-32) follows DESIGN.md "One Flourish
   Rule" only if merchants keep it short; the info text says so (:57). OK.
5. OK: no default copy is shown to shoppers (heading/sub-heading blank by default), no claims, no candy as
   product, no other brand, no prices, no phone models. App content is the app's responsibility, but any rating
   it shows must be real review-app data (PRODUCT.md:105), never a typed widget.

## Claims register

None in the theme code. Anything shown comes from the installed app at render time (store data). If a review app
block is placed here, its stars and counts are LIVE app data; the section must not add any typed rating or count
around it.

## Motion inventory

- data-cv-* attributes: none. Own hooks: `data-cvap` (root, :21), `data-cvap-animate` (:22), `data-cvap-heading`
  (:29), `data-cvap-fade` (:32), `data-cvap-apps` (:37), `data-cvap-app` (:39).
- Reveal (cv-apps.js:59-88): `gsap.context` + timeline with ScrollTrigger `top 85%`, `once: true`; heading
  SplitText words with `mask: 'words'`, yPercent 115 -> 0, stagger .05, reverted on complete (:67, :72-74); lede
  fade; each app wrapper rises 28px with stagger .12 and `clearProps` (:80-85). Falls back to a plain heading
  fade without SplitText (:75-77). Hidden tab: jumps to the end (:87).
- Layout sync: ResizeObserver on the apps list, debounced 200ms `ScrollTrigger.refresh()` (:47-57). Runs even
  under reduced motion (correct).
- Merchant switch: "Reveal on scroll" checkbox (:79-80) disables the reveal per section.
- Reduced motion: read once at init (:32); no reveal. Not live (`gsap.matchMedia` would revert mid-session,
  MOTION-SYSTEM.md 4.4 shape 3).
- No-JS: readable; CSS is the finished state.
- Boot flash: `timeline.from(...)` renders the hidden start state at boot (immediateRender), with no pending
  class or safety timeout; if ScrollTrigger never fires (e.g. a refresh race with a late app), wrappers could stay
  hidden. Low risk because ScrollTrigger is always loaded.
- Theme editor: full handling, the reference implementation in this family: `shopify:section:load` re-boots,
  `unload` destroys, `section:select` and `block:select` finish the intro (:106-117); per-root
  `_cvapDestroy` / `_cvapFinish`.

## Motion opportunities

Low commerce value: this is a wrapper for third-party widgets, and moving app internals is out of bounds.

1. LOW (scroll reveal polish): give the paper-card frame (`--frame-card`) a "ticket lift" entrance in the
   house idiom: wrapper from `y: 28, rotation: -1.2, transformOrigin: '50% 0'` to rest with `back.out(1.4)`, then
   the dashed inner border (`::before`) fades in; still only wrappers, still `clearProps`.
2. LOW: switch reduced-motion handling to `gsap.matchMedia()` so a preference change mid-session reverts the
   reveal (MOTION-SYSTEM.md 4.4 shape 3), and add a safety `gsap.delayedCall(3, finish)` when the root is already
   in view at boot (pattern cv-candy-buttons.js:83-94).
3. LOW: when the review app finishes injecting (ResizeObserver first non-trivial height change), fade the app
   wrapper's new height in with a short `height: auto` tween from the previous height (wrapper only), so late
   content does not jump the page. Skip under reduced motion.
4. Not applicable: buy box, packs, Add to cart, Buy now, cart drawer.

## Risks

- Never animate or restyle the app's own DOM; some widgets measure their container or use fixed popups
  (cv-apps.js:4-7). Keep transforms on `.cvap__app` only and always clear them.
- `ScrollTrigger.refresh()` on every app height change refreshes every trigger on the page; with a pinned or
  scrubbed section below (e.g. a future cv-story rebuild) this is required, but keep the 200ms debounce.
- The layout gate (theme.liquid:263-266) is a shared file; the section needs no change there.
