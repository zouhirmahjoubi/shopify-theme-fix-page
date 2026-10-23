# CASIFY motion system: reference for new motion

Read-only audit of the theme as it stands on 2026-10-22 (branch `feat/motion-store-adapt`).
Every later agent that adds animation follows this file so new motion fits what is already there.
Paths are relative to `casify-theme/`. Evidence is cited as `file:line`.

Ground rules that frame everything below (DESIGN.md:87, DESIGN.md:181-199, PRODUCT.md "Evidence on Hand"):

- Motion behaves like physical shop dressing: signs swing, tickets stamp or lift, short staged reveals.
  The candy shop is the set; the product is always a PHONE CASE (never sweets).
- Timing set 160 / 240 / 420 ms, soft-out curve for entrances, candy spring only for small delight (DESIGN.md:183).
- Long-running ambient motion pauses offscreen and when the tab is hidden; reduced motion removes
  nonessential animation and WebGL (DESIGN.md:183). Auto-running motion needs a pause path (DESIGN.md:192).
- Every animation has a reduced-motion path and a complete static state without JavaScript.
- Numbers that animate (counts, prices, savings) must be real: live variant data, merchant settings or
  review-app data at render time. Nothing invented. No em or en dashes in shopper-facing copy.

---

## 1. How scripts and styles load (layout/theme.liquid)

### 1.1 Order of the document

| Where | What | Evidence |
|---|---|---|
| `<head>` | `cv-fonts` snippet, then `theme.css`, then `palette-vars` snippet | layout/theme.liquid:152-154 |
| `<head>` | `window.themeMoneyFormat` inline | layout/theme.liquid:155 |
| `<head>` | GSAP bundle (`snippets/gsap.liquid`), all `defer` | layout/theme.liquid:184 |
| `<head>` | Anime.js only if markup has `data-anime` | layout/theme.liquid:186-188 |
| `<head>` | Motion (motion.dev) only if markup has `data-motion-dev` | layout/theme.liquid:190-192 |
| `<head>` | `content_for_header` | layout/theme.liquid:193 |
| `<body>` | header group, `<main>{{ content_for_layout }}</main>`, footer group | layout/theme.liquid:203-205 |
| `<body>` | `{% render 'cart-drawer' %}` (always) | layout/theme.liquid:206 |
| `<body>` | quick pick dialog only if markup has `data-cvqp-open` | layout/theme.liquid:208-210 |
| `<body>` end | every theme script, `defer` (or `type="module"`), in the order of the table in 1.3 | layout/theme.liquid:212-345 |

Section stylesheets are not loaded by the layout. Each section prints its own
`{{ 'x.css' | asset_url | stylesheet_tag }}` (for example sections/cv-product-counter.liquid:38).

### 1.2 The `content_for_layout contains` pattern

`content_for_layout` is fully rendered before the layout runs, so the layout greps the page's own
markup to decide which section scripts to ship (comment at layout/theme.liquid:156-162):

```liquid
{%- if editor or content_for_layout contains 'data-cvsh' -%}
  <script src="{{ 'cv-showcase-motion.js' | asset_url }}" defer></script>
{%- endif -%}
```

- `editor` is `request.design_mode` (layout/theme.liquid:164). In the theme editor EVERY gated script
  loads, because a section added there is injected without re-rendering the layout.
- Rules that follow from it (pitfalls to respect):
  1. Only markup inside `<main>` counts. Header group, footer group and the cart drawer are rendered by
     the layout itself, so their scripts are loaded unconditionally (layout/theme.liquid:212-215, 342).
  2. Markup fetched later (Section Rendering API: `cv-pdp-set`, `cv-pdp-shelf`, the cart drawer,
     the quick pick product JSON) is NOT in `content_for_layout`. A gate attribute must appear in the
     first server render, or the script must be loaded by template name.
  3. `contains` is a substring test. A gate string must be unique: `data-cvsh` also matches
     `data-cvsh-row`, which is fine, but a short prefix like `data-cvs` would match half the theme.
     Use the section's own short prefix (`data-cvXX`) as the gate.
  4. The gate attribute has to be printed literally (not built from a variable at runtime in JS).
- Product templates load their stack by `template.name == 'product'` instead (layout/theme.liquid:302-325).
- Shop pages (`collection`, `list-collections`, `page`, `policy`) get `cv-pages.js` by template
  (layout/theme.liquid:165-168, 338-341).

### 1.3 Script order at the end of `<body>`

All `defer` scripts run in document order after parsing; `type="module"` scripts are deferred too and
keep their relative order with the deferred classic scripts.

| # | Script | Condition | Line |
|---|---|---|---|
| 1 | cv-header.js, cv-footer.js, casify-data.js, theme.js | always | 212-215 |
| 2 | halo.js | `halo-` | 216-218 |
| 3 | **cv-motion.js** (shared engine) | always | 220 |
| 4 | cv-proof-motion.js | `data-cv-proof` | 222-225 |
| 5 | cv-spotlight-motion.js | `data-cvsp` | 226-229 |
| 6 | cv-showcase-motion.js | `data-cvsh` | 230-233 |
| 7 | cv-hanging-cards.js, cv-offer-courier.js, cv-feature-tabs.js, cv-collage-motion.js | `data-cvhang`, `data-cvoc`, `data-cvft`, `data-cvcl` | 234-246 |
| 8 | cv-signup-motion.js | `gsap_text` (`data-cvsu`) | 247-250 |
| 9 | cv-scrolling-reviews.js, cv-trustpilot.js, casify-cs-video.js, cv-apps.js, cv-facebook-reviews.js | `data-cvsr`, `gsap_drag` (`data-cvtr`), `data-csv`, `data-cvap`, `data-cvfr` | 251-270 |
| 10 | modules: cv-phone-scan, cv-orbit, cv-compare-lab, cv-vs, cv-awning, cv-price-tag (three.js inside, imported only when WebGL works and motion is allowed) | `data-cvps`, `data-cvorbit`, `data-cvcx`, `data-cvvs-row`, `data-cv-awning`, `data-cv-ptag` | 271-294 |
| 11 | cv-quick-pick.js | `data-cvqp-open` | 295-297 |
| 12 | cv-pdp-video-reviews.js (must precede cv-product.js to hear the first `cvs:change`) | `data-cvvr` | 298-301 |
| 13 | **product template**: cv-product.js, cv-pack-motion.js, cv-pdp-story.js, cv-pdp-slip-motion.js, cv-pdp-counter.js, cv-pdp-counter-motion.js, then modules cv-pdp-sales (`data-cvc-sales`), cv-pdp-promises (`data-cvc-promises`), cv-case-features (`data-cvcf`), then cv-pdp-home-motion.js, cv-pdp-reviews (module), cv-customer-experience.js | `template.name == 'product'` | 302-325 |
| 14 | cv-pdp-carousel (module), cv-pdp-delivery.js, cv-pdp-before-after.js | `data-cvcr`, `data-cvdl`, `data-cvba` | 326-337 |
| 15 | cv-pages.js | shop pages | 338-341 |
| 16 | **cart.js** (drawer, AJAX add for `data-cart-add-form`, badge) | always | 342 |
| 17 | build-box.js | `data-build-box` (no section prints it today) | 343-345 |

Also printed by sections themselves (not the layout): `casify-hero.js`, `casify-customer-reviews.js`,
`cv-value-stack-motion.js`, `cv-reel-showcase.js`, `cv-phone-scan-type.js`, `review-motion.js`,
`review-widget.js`, `cv-pdp-model.js` (sections/cv-product-counter.liquid:34-38), and
`best-product.js` (module, sections/main-best-product.liquid:234).

Rule for new code: a motion script that depends on another script's events must come AFTER the
dispatcher in this order if it needs the first event, or listen and also read current DOM state on boot.
`cart.js` runs last, so anything that calls `window.Casify.*` or `window.CasifyCart.*` must do it
inside an event handler, never at boot.

### 1.4 GSAP flags and how a section opts into a plugin

Computed at layout/theme.liquid:163-182 and passed to `snippets/gsap.liquid` at :184.

| Flag | Plugins added | True when | How a new section opts in |
|---|---|---|---|
| (always) | gsap core, CustomEase, CustomBounce, CustomWiggle, DrawSVGPlugin, ScrollTrigger, ScrollToPlugin, SplitText | every page | nothing to do |
| `drag` | InertiaPlugin, Draggable | editor, or markup contains `data-cvtr` (theme.liquid:169-172) | print `data-cvtr` (today owned by cv-trustpilot) or add a new `or content_for_layout contains 'data-xxx'` to line 170 |
| `flip` | Flip | editor, shop pages, or product template (theme.liquid:173-176) | home page does NOT get Flip. To use Flip on the home page, extend line 174 with `or content_for_layout contains 'data-xxx'` |
| `path` | MotionPathPlugin | same as `flip` (theme.liquid:177) | same as `flip`; home page fly-to-bag must fall back to a straight tween (counter motion already does: cv-pdp-counter-motion.js:307-314) |
| `text` | ScrambleTextPlugin, TextPlugin | editor, or markup contains `data-cvsu` (theme.liquid:178-181) | print `data-cvsu` or extend line 179 |

Not shipped at all (files kept in assets/): CSSRulePlugin, EasePack, EaselPlugin, Observer,
MorphSVGPlugin, Physics2DPlugin, PhysicsPropsPlugin, PixiPlugin, ScrollSmoother, GSDevTools,
MotionPathHelper (snippets/gsap.liquid:17-20). Do not reach for ScrollSmoother: no theme code assumes a
smoothed scroller and every ScrollTrigger here uses the window.

### 1.5 GSAP bundle and registration

- GSAP 3.15.0, self-hosted UMD, all `defer` in `<head>` (snippets/gsap.liquid:1-9, 38-42).
  Because they are deferred in `<head>`, they run before every deferred script in `<body>`,
  including scripts printed inside sections.
- `assets/gsap-init.js` registers every plugin global that exists (gsap-init.js:15-37). New code can call
  `gsap.to`, `ScrollTrigger.create`, `SplitText.create`, `Flip.from` directly. Calling
  `gsap.registerPlugin(ScrollTrigger)` again (cv-spotlight-motion.js:57) is harmless but unnecessary.
- Always guard optional plugins: `if (window.Flip)`, `if (window.MotionPathPlugin)`, `if (window.SplitText)`.

### 1.6 Motion (motion.dev) gate

- `snippets/motion.liquid` loads `motion.min.js` (Motion 14.2.0 UMD, global `window.Motion`) and
  `cv-motion-dev.js` (`data-motion-dev="cards"` product grids, `data-motion-dev="faq"` accordions)
  only when markup contains `data-motion-dev` or in the editor (layout/theme.liquid:190-192,
  snippets/motion.liquid:1-26). Today `cv-collection-row` and `cv-guarantee` print it.
- `motion.min.js` is 153,875 bytes on disk: the heaviest optional library. Prefer GSAP for new work;
  only use Motion where a section already opts in.
- Inconsistency to know about: `assets/best-product.js:6-10` imports a DIFFERENT Motion build
  (`motion@13.4.4/mini`) at runtime from cdn.jsdelivr.net instead of the self-hosted 14.2.0.
  New code must not add runtime CDN imports.

### 1.7 Anime.js gate

`snippets/animejs.liquid` loads only for `data-anime` (layout/theme.liquid:186-188). No placed
section relies on it for commerce. Do not introduce it for new motion; GSAP is the house engine.

---

## 2. Design tokens and the GSAP easing map

CSS tokens (assets/theme.css:81-84):

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 160ms | state changes, presses |
| `--duration-base` | 240ms | drawer, scrim, hovers |
| `--duration-slow` | 420ms | reveals, entrances |
| `--ease-standard` | cubic-bezier(.4,0,.2,1) | state changes |
| `--ease-candy` | cubic-bezier(.34,1.56,.64,1) | small delight (overshoot) |
| `--ease-out-soft` | cubic-bezier(0,0,.2,1) | entrances |

GSAP equivalents used across section scripts (keep to these families):

| Intent | House GSAP choice | Example |
|---|---|---|
| entrance, settle | `power3.out`, `expo.out`, `power4.out` | cv-pdp-counter-motion.js:92; cv-showcase-motion.js:178 |
| candy delight, stamps, pops | `back.out(1.5..2.6)` | cv-pdp-counter-motion.js:95, 101, 255 |
| hanging signs, tags, released buttons | `elastic.out(1, 0.26..0.5)` | cv-pdp-counter-motion.js:99, 113 |
| drops into a box | `bounce.out`, or a named `CustomBounce` | cv-pack-motion.js:46; cv-pdp-counter-motion.js:46-50 |
| ribbons and flags | named `CustomWiggle` with a yoyo fallback | cv-pdp-counter-motion.js:51-60 |
| press | 0.10 to 0.12 s `power2.out` squash (scaleX 1.04 / scaleY 0.9, yoyo) | cv-pdp-counter-motion.js:326 |
| exits | `power2.in`, 0.2 to 0.3 s | cv-pdp-counter-motion.js:371-372 |

Recommendation for new code: since CustomEase is always loaded, create the token curves once per file
when an exact match to CSS matters: `CustomEase.create('cvSoft', '0,0,.2,1')`,
`CustomEase.create('cvCandy', '.34,1.56,.64,1')`. Name custom eases with the section prefix
(`cvcDrop`, `cvwDrop`, `cvsStamp`) so two files never overwrite each other's ease.

Durations in GSAP files are usually 0.35 to 0.9 s for entrances and 0.12 to 0.5 s for state. Keep
commerce feedback (press, busy, done, error) at or under 0.5 s; the button must read as clickable
within a fraction of a second (cv-candy-buttons.js:69-72).

---

## 3. cv-motion.js: the shared attribute engine (loaded on every page)

`assets/cv-motion.js` (535 lines, 21,065 bytes). One IIFE with three modules that each no-op without
markup: motion (cv-motion.js:66-242), story (:247-338), ugc (:343-534).

### 3.1 Complete attribute API

| Attribute / class | Effect | Timing | JS | CSS |
|---|---|---|---|---|
| `data-cv-reveal` | fade + rise 16px once when 12% visible | 420ms `--ease-out-soft`, delay `--cv-i * 55ms` | :130-143 | theme.css:1073-1079, 1084 |
| `data-cv-reveal="left"` / `"right"` | slide in from -32px / +32px x | same | same | theme.css:1080-1081 |
| `data-cv-reveal="scale"` | from scale .94 | same | same | theme.css:1082 |
| `data-cv-reveal="blur"` | from translateY(10px) + blur(8px) | same | same | theme.css:1083 |
| `data-cv-stagger` | writes `--cv-i` = child index on each direct child (unless already set) | used by any `--cv-i` delay | :87-91 | per component (e.g. theme.css:1274, 2229, 3006) |
| `data-cv-split` | splits a heading (max 40 words) into `.cv-word` spans with `--cv-i`; adds `.cv-split`; also a reveal target | words 500ms opacity / 560ms `--ease-candy` transform, `--cv-i * 40ms` | :68-84, 130 | theme.css:1086-1092 |
| `data-cv-count="12"` + `data-cv-suffix="ft"` | counts up from 0 when its reveal ancestor (or `data-cv-bars` group) is revealed; keeps decimals of the target | 1100ms, easeOutCubic, own rAF | :94-119, 138 | none |
| `data-cv-pct="80"` | sets `width: 80%` on reveal (bar fill; the CSS transition lives on the component) | component CSS | :121-127 | per component |
| `data-cv-bars` | a group that fills bars and runs counts at 20% visibility without being a reveal target | | :146-157 | |
| `data-cv-parallax="0.12"` | writes `--cv-shift` px against scroll (depth default 0.12), skipped when 200px+ offscreen | shared rAF ticker | :189-201 | theme.css:1096 (uses independent `translate`, composes with transforms) |
| `data-cv-tilt` | pointer tilt, writes `--cv-rx` (±3.5deg) and `--cv-ry` (±4.5deg); fine pointer only | 240ms CSS | :205-217 | theme.css:1098-1101 |
| `.cv-cta` (class) | magnetic pull, writes `--cv-mx` (±3.5px) `--cv-my` (±2px); fine pointer only | CSS | :219-231 | theme.css:1363-1390, 1799 |
| `.cv-page-root` (class on any element) | injects a fixed 3px page scroll progress bar `.cv-progress` | shared rAF ticker | :172-186 | theme.css:1104-1108; hidden when the header provides its own (`html.cvh-has-progress`, cv-header.css:110, cv-header.js:256) |
| `data-cv-scroll-to-buy` | click scrolls to `.cv-buy` or `#cvPdp` (smooth unless reduced) | | :235-241 | |
| `data-cv-video-reduced-motion="pause"` | under reduced motion removes `autoplay` and pauses the video | | :35-40 | |
| story: `data-cv-story`, `-stage`, `-height`, `-phase`, `-rail`, `-chapter` + `data-cv-at` | scroll-scrubbed drop-test sequence writing `--cv-p`, `--cv-fall`, `--cv-drop` | shared rAF ticker | :247-338 | |
| ugc: `data-cv-ugc`, `-rail`, `data-cv-clip`, `data-cv-clip-sound`, `data-cv-clip-open`, `data-cv-lightbox`, `data-cv-lb-*`, `data-cv-ugc-scroll` | video rail: autoplay in view (55%), single audible clip, lightbox | | :343-534 | |

Warning on the story module: its phase labels and the 12 ft start height (cv-motion.js:258-266) are a
drop-test narrative. PRODUCT.md lists "12 ft drop" as NOT verified. Do not attach `data-cv-story` to any
new section unless the product's own data states such a test.

Warning on `data-cv-count`: the value printed in Liquid must come from live data or a merchant
setting. The counter only animates; it does not validate.

### 3.2 Reduced motion

- JS reads `prefers-reduced-motion` ONCE at load (cv-motion.js:29-30). Under reduce: every reveal target
  gets `is-revealed` immediately, counts print their final value, bars fill at once (:158-169); no
  progress bar, no parallax, no tilt, no magnet; the story parks on its final frame (:268-279).
- CSS mirror in theme.css:3219-3270: `[data-cv-reveal]` and `.cv-split .cv-word` resolve to opacity 1,
  no transform, no transition; `.cv-progress` hidden; parallax translate none; tilt none; `.cv-cta`
  translate none. A second block at theme.css:3306-3314 forces `[data-cm-reveal]` visible.
- It does not react if the preference changes while the page is open (only cv-candy-buttons.js and
  cv-showcase-motion.js do, see 4.4).

### 3.3 The shared rAF scroll ticker

`addScrollJob(fn)` (cv-motion.js:43-61): one passive `scroll` + `resize` listener, one
`requestAnimationFrame` per frame, every registered job runs in that frame, and each job runs once
immediately on registration. Used by the progress bar, parallax and the story.
It is private to the IIFE: section scripts cannot register jobs. New scroll-linked work should use
ScrollTrigger (`scrub`, `onUpdate`) which has its own single ticker, NOT a new `window.scroll` listener.

### 3.4 Limitations every new section must design around

1. **No JavaScript means invisible content.** `[data-cv-reveal]` is `opacity: 0` in plain CSS
   (theme.css:1073-1074) with no `html.js` / `no-js` scoping, and the layout prints no `<noscript>`
   fallback. The same holds for `[data-cm-reveal]` (theme.css:895). If cv-motion.js fails or JS is off,
   every revealed block stays hidden. This breaks the project rule "readable static state without
   JavaScript". Do not add `data-cv-reveal` to commerce-critical content (price, model picker,
   Add to bag, Buy now, cart lines) until this is fixed. Fix proposal (later phase, layout + theme.css):
   add `class="no-js"` on `<html>`, swap it to `js` with a one-line inline script in `<head>`, and scope
   the hidden start states to `.js [data-cv-reveal]:not(.is-revealed)`.
2. **Runs once.** cv-motion.js has no `shopify:section:load` handler (zero `shopify:` listeners in the
   file) and never rescans. A section added or re-rendered in the theme editor, or markup injected later
   (Section Rendering API, cart drawer re-render, quick pick), keeps `opacity: 0`. Never put
   `data-cv-reveal` / `data-cv-split` inside content that is fetched or re-rendered after load.
3. **Split loses markup.** `data-cv-split` replaces the heading with plain text words
   (cv-motion.js:70-82): inline `<em>`, `<br>`, links are lost, and no `aria-label` is set (compare
   cv-spotlight-motion.js:15-31 which sets `aria-label` and hides the word spans). Use it only on plain
   text headings.
4. **Stagger index from DOM order only.** `data-cv-stagger` indexes direct children; it will not reach
   grandchildren.

---

## 4. House conventions for per-section motion files

Extracted from cv-pdp-counter-motion.js, cv-pack-motion.js, cv-candy-buttons.js,
cv-showcase-motion.js, cv-spotlight-motion.js, cv-pdp-home-motion.js.

### 4.1 File shape

- Header comment: which section(s), what moves, which events it hears, and that the page is complete
  without it (cv-pdp-counter-motion.js:1-30, cv-showcase-motion.js:1-15).
- `(function () { 'use strict'; ... })();` classic script, ES5 style (`var`, no arrow functions).
  Modules (`type="module"`) are used only when three.js is imported.
- Local helpers `$`/`$$` or `one`/`all` scoped to the root (cv-pdp-counter-motion.js:43-44,
  cv-showcase-motion.js:19-25).
- Prefix every class, data attribute, custom ease and stored property with the section prefix
  (`cvc`, `cvsh`, `cvsp`, `cvw`, `cvs`).

### 4.2 No-op guards (first lines)

```js
var root = document.querySelector('[data-cv-pdp="counter"]');
var gsap = window.gsap;
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!root || !gsap || reduce) { release(); return; }
```
(cv-pdp-counter-motion.js:37-41; same shape cv-pack-motion.js:17-20, cv-pdp-home-motion.js:41-42).
Always release the pending class (4.3) BEFORE returning.

### 4.3 The pending-class pattern (no flash, no stuck state)

Sections that hide decorative pieces before their entrance print a tiny inline guard at the top:

```liquid
<script>
  (function (root) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('cvc-pending');
    setTimeout(function () { root.classList.remove('cvc-pending'); }, 1400);
  })(document.documentElement);
</script>
```
(sections/cv-product-counter.liquid:44-48; same in cv-hero.liquid:21-22, cv-product.liquid:20-21,
cv-spotlight.liquid:5-6, cv-value-stack.liquid:22-23, header.liquid:17-18,
snippets/cv-case-features.liquid:74-75, snippets/cv-spec-meter.liquid:45-46).

- CSS hides ONLY decorative pieces under `.cvc-pending` (cv-pdp-counter.css:783-786): never prices,
  titles, controls or buttons ("words and prices stay put", cv-pdp-counter-motion.js:81).
- The motion script sets GSAP start states, then removes the class (cv-pdp-counter-motion.js:82-90).
- The timeout (1.2 to 1.6 s) guarantees the page is readable if the script never runs.
- Without JS the inline script does not run, so nothing is hidden: this is the correct no-JS path.

### 4.4 Reduced motion

Three accepted shapes:
1. Read once and return (most files; cv-pdp-counter-motion.js:40-41).
2. Static fallback that cleans inline styles: `showStatic(root)` (cv-spotlight-motion.js:34-41, 44-47).
3. Live: `gsap.matchMedia()` with conditions, everything created inside the callback is reverted when the
   preference flips (cv-candy-buttons.js:307-318, cv-pdp-home-motion.js:75), or a `change` listener that
   re-inits (cv-showcase-motion.js:166-171).
New commerce motion should use shape 3 (`gsap.matchMedia`) so a mid-session preference change
reverts cleanly.

### 4.5 ScrollTrigger creation and cleanup

- One-shot entrances: `ScrollTrigger.create({ trigger, start: 'top 80%..92%', once: true, onEnter })`
  wrapped in a local `onEnter(el, fn, start)` helper (cv-pdp-counter-motion.js:385-387,
  cv-pdp-home-motion.js:55-57), or a timeline with `scrollTrigger: { trigger, start, once: true }`
  (cv-showcase-motion.js:186-188, cv-spotlight-motion.js:106-111).
- Elements already in view at load play immediately instead of waiting for the first refresh
  (cv-candy-buttons.js:83-94). Primary CTAs also get a safety `gsap.delayedCall(3, ...)` so they are
  never left hidden (cv-candy-buttons.js:92-93).
- Scrubbed work: `scrub: 0.7` or `true` (cv-pdp-home-motion.js:155, 476); pinned sequences use
  `containerAnimation` for horizontal children (cv-pdp-home-motion.js:319).
- Cleanup: keep handles in a `cleanups` array, `st.kill()`, `split.revert()`, `context.revert()`
  (cv-pdp-home-motion.js:109-115, 139; cv-spotlight-motion.js:196-201; cv-showcase-motion.js:157-165).
- `clearProps` at the end of every entrance so CSS owns the resting state
  (`clearProps: 'transform,opacity'` everywhere) and `willChange` is cleared on complete
  (cv-showcase-motion.js:179-184).

### 4.6 Theme editor (Shopify section events)

Reference implementation: cv-showcase-motion.js:363-393.

```js
function boot(scope) { /* find roots in scope, init each, then ScrollTrigger.refresh() */ }
boot(document);
document.addEventListener('shopify:section:load',   function (e) { boot(e.target); });
document.addEventListener('shopify:section:unload', function (e) { destroy(rootIn(e.target)); });
document.addEventListener('shopify:section:select', function (e) { finish(rootIn(e.target)); ScrollTrigger.refresh(); });
document.addEventListener('shopify:block:select',   function (e) { finish(e.target.closest('[data-x]')); });
```
- Per-root teardown stored on the element: `root._cvshDestroy`, `root._cvshFinish`, `root._cvspCleanup`.
- `init` first calls the existing destroy, so re-init is idempotent (cv-showcase-motion.js:116-118).
- Selecting a section or block in the editor jumps the entrance to its end (`finish()`), so merchants
  never edit a half-animated section.
- Product-page motion files (counter, pack, pdp-home, slip) do NOT handle these events: they boot once.
  New buy box motion should follow the showcase shape, because the product section is re-rendered when
  a merchant edits it.
- Clones made for marquees drop `data-shopify-editor-block` (cv-pdp-home-motion.js:89-90).

### 4.7 Visibility and offscreen pausing

- Idle loops paused while offscreen with a ScrollTrigger `onToggle` (cv-candy-buttons.js:150-159;
  ribbon cv-pdp-home-motion.js:99-104; ambient cv-spotlight-motion.js:170-178).
- Hidden tab: `visibilitychange` listener re-syncs ambient loops (cv-spotlight-motion.js:191-193); an
  entrance that would start in a hidden tab jumps to its end (`entry.progress(1)`,
  cv-pdp-counter-motion.js:127; `finish()`, cv-showcase-motion.js:292).
- Auto-running marquees offer a visible pause toggle with `aria-pressed` (cv-spotlight-motion.js:160-190).
- GSAP's own ticker already sleeps in a hidden tab, but `setInterval` and CSS animations do not: the
  Buy now arrow watcher polls with `setInterval` every 300ms (cv-pdp-counter-motion.js:341-346).

### 4.8 Refresh discipline

- `ScrollTrigger.refresh()` after boot and on `window.load` (cv-pdp-counter-motion.js:407,
  cv-pdp-home-motion.js:495-499, cv-showcase-motion.js:370-377, cv-spotlight-motion.js:214-217).
- After content is injected (complete-the-set filled via Section Rendering API) the script refreshes
  (cv-pdp-counter-motion.js:400).
- `document.fonts.ready` is only used by cv-header.js:232, 565 and cv-scrolling-reviews.js:240. Pinned
  sections whose height depends on the display font (Playfair) should also refresh on
  `document.fonts.ready`.

### 4.9 Motion never owns state

Motion files only listen and decorate. The owner (cv-product.js, cart.js, cv-pdp-counter.js) changes
classes, text and attributes and dispatches events; motion reacts (cv-candy-buttons.js:3-7,
cv-pack-motion.js:10-12). Never call `fetch`, change prices, or toggle `disabled` from a motion file.

---

## 5. Commerce flow end to end

### 5.1 Which buy boxes are live

| Buy box | Section | Templates | State owner | Motion |
|---|---|---|---|---|
| The Shop Counter | sections/cv-product-counter.liquid (`data-cv-pdp="counter"`) | product.json, product.convert.json | cv-product.js | cv-pdp-counter-motion.js, cv-pack-motion.js, cv-pdp-sales.js, cv-pdp-promises.js, cv-case-features.js, cv-awning.js, cv-price-tag.js |
| The Order Slip | sections/cv-product.liquid (`data-cv-pdp`) | none (not placed) | cv-product.js | cv-pdp-slip-motion.js |
| Best product | sections/main-best-product.liquid | product.best.json | best-product.js (module) + cart.js for Add | best-product.js (GSAP + CDN Motion) |
| Product cards | snippets/cv-card.liquid, snippets/cv-showcase-card.liquid (`data-cart-add-form`) | collection, home rows | cart.js | CSS only |
| Quick pick dialog | snippets/cv-quick-pick.liquid (`data-cvqp`) | pages with `data-cvqp-open` | cv-quick-pick.js | GSAP sheet in/out |
| Complete the set | sections/cv-pdp-set.liquid | product templates | cv-pdp-story.js | cv-pdp-counter-motion.js:375-403 |
| Colour carousel, video reviews | cv-pdp-carousel, cv-pdp-video-reviews | product.json | own module | own |

Not placed in any template: `bundle-buybox.liquid` (uses `data-cart-add-form` + `data-cm-reveal`),
the build-your-box section that would print `data-build-box`, `product-3d-viewer.liquid`.

### 5.2 Event catalogue

| Event | Target | Dispatched by | detail | Heard by |
|---|---|---|---|---|
| `cvs:change` | `[data-cv-pdp]` root | cv-product.js:415 (every render) | `{ variant, qty, each, total, pct, lines, compareAt, compareSaving, comparePct }` | cv-pdp-counter-motion.js:205, cv-pdp-slip-motion.js:85, cv-pdp-story.js:84,180,251, cv-pdp-model.js:89, cv-price-tag.js:399, cv-pdp-video-reviews.js |
| `cvs:slots-before` | root | cv-product.js:211 (before pack size changes) | `{ from, qty }` | cv-pack-motion.js:83 (Flip.getState) |
| `cvs:slots` | root | cv-product.js:272 | `{ from, qty, changed[], lines[] }` | cv-pack-motion.js:87 |
| `cvs:models` | root | cv-product.js:444 | `{ open }` | cv-pdp-slip-motion.js:91 |
| `cvs:photo` | root | cv-product.js:567 | `{ index }` | cv-pdp-model.js:72 |
| `cvs:choose` | slip/root | cv-pdp-story.js:77, cv-pdp-carousel.js:1032, cv-pdp-video-reviews.js:491 | `{ index, value }` | cv-product.js:523 (sets an option) |
| `cvs:pack` | slip/root | cv-pdp-story.js:401 | `{ qty }` | cv-product.js:536 (selects a pack) |
| `cvs:adding` | root | cv-product.js:611 | none | cv-pdp-counter-motion.js:325, cv-pdp-slip-motion.js:97 |
| `cvs:added` | root | cv-product.js:619 | `{ qty, items }` | cv-pdp-counter-motion.js:328 (fly), cv-pdp-slip-motion.js:110 (Order Slip only) |
| `cvs:buying` | root | cv-product.js:641 | `{ qty, button }` | cv-pdp-counter-motion.js:334 |
| `cart:refresh` | document | cv-product.js:620, cv-pdp-story.js:146, cv-pdp-carousel.js:1298, cv-pdp-video-reviews.js:684 | none | cart.js:169 (count + drawer re-render, debounced with CasifyCart.refresh) |
| `cart:added` | document | same four files (:621, :147, :1299, :685) | none | **nobody** (free hook for global add feedback) |
| `cv:cart` | document | cv-quick-pick.js:58 | `{ cart }` (full /cart.js) | cart.js:171 (label + drawer), cv-pages.js:135 (pack meter) |
| `cvp:set`, `cvp:setadded`, `cvp:shelf`, `cvp:filter` | set/shelf/fit sections (bubbles) | cv-pdp-story.js:175, 149, 243, 66 | setadded: `{ item, button }` | cv-pdp-counter-motion.js:376, 403; cv-pdp-slip-motion.js:162 |
| `cvc:zoom`, `cvc:zoomstep`, `cvc:zoomclose` (cancelable) | root | cv-pdp-counter.js:110/135, 117, 71 | `{ open, dialog }`, `{ dir, img }`, `{ dialog }` | cv-pdp-counter-motion.js:351-373 |
| `cart:updated` | document | cv-home-conversion.js:313 | | nobody |
| `casify:cart:updated` | document | build-box.js:130 | | nobody |

Globals: `window.CasifyCart.refresh()` (cart.js:175-176), `window.Casify.openDrawer(opener)`,
`window.Casify.updateCartCount()`, `window.Casify.showToast(title, body, tone)` (cart.js:184-187),
`window.CASIFY_FNS.toastQuick(title, body)` (theme.js:180-181), `window.CasifyA11y.trapFocus`
(cart.js:19-37).

### 5.3 Add to bag (Shop Counter)

1. Markup: `<form class="cvc__box" id="cvAddForm" method="post" action="{{ routes.cart_add_url }}">`
   with hidden `#cvVariantId` / `#cvQuantity` (sections/cv-product-counter.liquid:362), submit button
   `#cvAddBtn` with `#cvCtaLabel` and `#cvTotal` (:627-633).
2. JS intercepts submit (cv-product.js:656-658). `cartItems()` builds every case of the chosen pack,
   merging identical variants into one line (cv-product.js:577-591).
3. Button state: `is-busy` + `disabled`, label `Adding…`, dispatch `cvs:adding` (cv-product.js:608-611).
4. `POST {root}cart/add.js` with JSON `{ items: [...] }` (cv-product.js:593-599).
5. Success: `is-busy` off, `is-done` on, label `In your bag`, live region `#cvStatus` says
   "N cases added to your bag.", dispatch `cvs:added`, `cart:refresh`, `cart:added`, call
   `CasifyCart.refresh()`; after 2000 ms `is-done` off and `render()` restores the label
   (cv-product.js:613-623).
6. Failure: `is-busy` off, label `Try again`, Shopify's `description` in `#cvStatus`, `render()` after
   2400 ms (cv-product.js:624-630). **No `is-error` class is set**, so nothing can animate an error.
7. cart.js debounces the pair into one `updateCartCount()` (GET /cart.js, writes `[data-cart-count]`,
   toggles `hidden`, adds `.is-bump`, updates `#bagBtn` aria-label) and one `refreshDrawer()`
   (cart.js:132-168).
8. **The drawer is not opened** after a product page add. The shopper sees the button state, the fly
   token, the badge bounce and the status line.
9. Without JS the form posts natively to `/cart/add` and Shopify redirects to the cart: correct no-JS path.

The sticky bar's `#cvStickyBtn` calls the same `addToBag()` (cv-product.js:659); the fly starts from
it when the main button is offscreen (cv-pdp-counter-motion.js:330).

### 5.4 Buy now

- Custom, NOT Shopify's dynamic checkout. No `payment_button` / `shopify-payment-button` exists in any
  section or snippet.
- Buttons: `[data-cv-buy-now]` in the buy box (sections/cv-product-counter.liquid:635-639, behind
  `section.settings.show_buy_now`) and in the sticky bar (:728). Label in `[data-cv-buy-label]`.
- `buyNow(btn)`: all buy buttons `is-busy` + disabled, label `To checkout…`, dispatch `cvs:buying`
  with the pressed button, POST the same items to `cart/add.js`, then
  `window.location.href = root + 'checkout'` (cv-product.js:633-654). The pack discount applies at
  checkout through the store's automatic discounts.
- `pageshow` with `persisted` resets the buttons when the shopper comes back (cv-product.js:661-670).
- Failure: `is-busy` off, label back to default, error text in `#cvStatus`; again no `is-error`.
- Without JS the Buy now button (`type="button"`) does nothing. Add to bag still works.
- main-best-product has its own Buy now: POST add.js then `location.assign('/checkout')`
  (best-product.js:163-172).

### 5.5 Packs and bundles

- Pack tiers are radio buttons `.cvc__pack[data-cv-pack][role=radio]` with `data-cv-qty` and
  `data-cv-discount` (sections/cv-product-counter.liquid:574-593). Prices per tier are computed in
  Liquid from the variant price, and re-computed in JS (cv-product.js header :7-9) so the page price
  equals the checkout price.
- The savings line `[data-cv-savings]` (aria-live) and the meter `[data-cv-savings-fill]`
  (`style="width:%"`) are written by `renderSavings()` (cv-product.js:276-292); the text templates come
  from section settings (`data-template-save`, `data-template-next`).
- Mix-and-match packs (`section.settings.mix_packs`, snippets/cv-pack-slots.liquid): each extra case has
  its own colour and phone selects; slots `[data-cv-slot]` and case boxes `[data-cv-slot-case]` with
  `[data-cv-slot-lid]` and `[data-cv-slot-photo]` (cv-product.js:206-273).
- Multiple lines: one `/cart/add.js` call with `items[]`, identical variants merged (5.3 step 2).
- Not live: build-box.js posts a box with `items[]` (build-box.js:117-121) but then calls functions
  that do not exist (`window.updateCartCount`, `CASIFY_FNS.openCartDrawer`, build-box.js:130-132) and
  fires `casify:cart:updated` that nobody hears. If the build-your-box section is ever placed it must
  dispatch `cart:refresh` and call `window.Casify.openDrawer` instead.

### 5.6 Sticky buy bar

`#cvSticky` (`.cvc-sticky`, sections/cv-product-counter.liquid:717-730) shows when `#cvAddBtn` has
scrolled above the viewport: IntersectionObserver toggles `is-visible`, `aria-hidden` and the buttons'
`tabIndex` (cv-product.js:672-682). Entrance is a CSS transform transition 320ms `--ease-standard`
from below (cv-pdp-counter.css:745-756), disabled under reduced motion (cv-pdp-counter.css:805).

### 5.7 Cart drawer

- Markup always rendered by the layout: `snippets/cart-drawer.liquid` (scrim `#cm-cart-drawer-scrim`,
  `<aside id="cm-cart-drawer" role="dialog" aria-modal="true" aria-hidden="true">`, body
  `#cm-cart-drawer-content`, footer with subtotal, Checkout form and View bag link).
- Styles inline in sections/header.liquid:196-201: slide in by `transform: translateX(100%) -> 0`,
  240ms `--ease-out-soft`; scrim opacity 240ms.
- Open: any `[data-cart-drawer-open]` click (the header bag `#bagBtn` is one,
  sections/header.liquid:87) or `window.Casify.openDrawer(opener)`; adds `is-open`, scroll lock
  (`html.cm-scroll-lock`), focus trap (cart.js:62-70). Close: `[data-cart-drawer-close]`, scrim, Escape
  (cart.js:71-84).
- Re-render: `GET {root}?sections=cv-cart-drawer`, parse, replace `#cm-cart-drawer` innerHTML
  (cart.js:149-161). `sections/cv-cart-drawer.liquid` is the Section Rendering wrapper and is placed in
  no template.
- Line quantity steppers and remove: `POST /cart/change.js` then **`window.location.reload()`**
  (cart.js:111-124). No in-place update, no animation.
- Card forms (`form[data-cart-add-form]`): cart.js posts, toasts "Added to bag", updates the count,
  re-renders and then opens the drawer (cart.js:87-109). Button text becomes `Wrapping…` while busy.
- Quick pick: posts, re-reads /cart.js, writes the badge and fires `cv:cart`, which re-renders the
  drawer; it does not open the drawer, and closes its own dialog after 1500 ms
  (cv-quick-pick.js:238-260, 50-59).

### 5.8 Toasts

`theme.js` `toast(title, body)` (theme.js:162-179), exposed as `CASIFY_FNS.toastQuick`. Text-only
insertion (escaped), `role="status"`, CSS `cm-toast-in` 420ms and `toast--leaving` 240ms
(theme.css:886-892), removed after 2.4 s. The `tone` argument from cart.js ('danger'/'success') is
ignored: an error toast looks like a success toast (teal check). theme.js also carries a legacy demo
`addToBag()` bound to `#addBtn` / `#addBtnMobile` with a fake local count (theme.js:112-160); no live
section prints those ids, so it is dead code. Note: theme.js runs on every page because
casify-data.js defines `window.CASIFY_ART` and `window.CASIFY` everywhere (casify-data.js:3, 86).

### 5.9 Animation that already exists per step (Shop Counter)

| Step | Existing motion | Where |
|---|---|---|
| Page entry | photo settle, ticket reel, brass tag swing, sale tag stamp, price proof wipe, star pop, packs rise, flags drop, savings meter fill, zoom chip, stock line, buttons elastic, sales pills | cv-pdp-counter-motion.js:92-127 |
| Choose photo / swatch / model | ticket squash, swatch spin-pop, select nudge, tag swing | :156-178 |
| Choose pack | pack squash + flag wiggle | :180-186 |
| Price / total / savings change | total and style value flip up (yPercent), savings slide, tag swing on price change, offer re-stamp, stock pop | :205-258 |
| Pack size change | lids pop, photos drop into boxes; Flip re-flow on size change; hop on slot change | cv-pack-motion.js:30-123 |
| Add pressed | button squash (0.12 s yoyo) | cv-pdp-counter-motion.js:325-327 |
| Added | photo ticket token arcs (MotionPath) to the bag, icon scales 1.35 | :260-331 |
| Badge | GSAP elastic bounce on count change (cv-header.js:234-248); CSS `.is-bump` 280ms when the header motion is off (theme.css:270-271, disabled under `.cvh-motion` cv-header.css:182-183) | |
| Buy now | squash + arrow nudges until `is-busy` clears | :333-348 |
| Sticky bar | CSS slide | cv-pdp-counter.css:745-756 |
| Drawer | CSS slide + scrim fade | header.liquid:196-201 |
| Zoom dialog | fade + scale in, slide on step, animated close | :350-373 |
| Complete the set | cards rise, media spin, added item flies to bag | :375-403 |

---

## 6. Gaps for a premium GSAP commerce experience

Each gap names what is missing, the evidence, and the house-style fix for the build phase.

1. **Add to bag state morph.** Only a squash on `cvs:adding` and a CSS background swap on `is-done`
   (cv-pdp-counter.css:614). No label/icon morph (bag icon to spinner to check), no width hold while the
   label changes (the button can jump width when "Add to bag · $x" becomes "Adding…"). Fix: lock width
   with `gsap.set(btn, { width: btn.offsetWidth })` during busy, cross-fade label with a yPercent flip
   (the house pattern at cv-pdp-counter-motion.js:208), draw a check with DrawSVGPlugin (always loaded)
   on `is-done`, release on `render()`.
2. **Error feedback.** cv-product.js never sets `is-error` on failure (cv-product.js:624-630, 648-653).
   No shake, no colour. The orphaned cv-candy-buttons.js has a shake (`keyframes x: [0,-10,9,-7,5,-2,0]`,
   cv-candy-buttons.js:244-246) but is never loaded and its snippet `cv-candy-button.liquid` does not
   exist. Fix (owner + motion): cv-product.js adds `is-error` for ~1.2 s and dispatches `cvs:error`
   with `{ message }`; motion shakes the button (x keyframes, 0.45 s) and pulses `#cvStatus`; the
   reduced-motion path is the colour + text only.
3. **Fly to bag is product-page only.** Cards, quick pick, carousel and video-review adds have no fly
   (cart.js:87-109, cv-quick-pick.js:238-260). `cart:added` is dispatched by four files and heard by
   none. Fix: a small global `cv-cart-motion.js` (loaded always, after cart.js) that listens to
   `cart:added` / `cv:cart` with an optional `detail.from` element and image, reusing the counter's
   `fly()` (cv-pdp-counter-motion.js:275-320) with the straight-tween fallback when MotionPathPlugin is
   absent (home page). Add `detail: { from, img, qty }` to the dispatchers.
4. **Bag badge bump on the icon.** Badge bounce exists (cv-header.js:234-248) but the bag icon itself
   only scales when the counter's token lands. A unified "bag receives" moment (icon squash + badge
   elastic + optional number roll) should live in one place to avoid two simultaneous bumps (section 7, item 6).
5. **Cart drawer item stagger.** The drawer slides as one block; lines are replaced by `innerHTML` with
   no entrance, and quantity changes reload the page (cart.js:118-124). Fix: after `refreshDrawer()`
   resolves, stagger `.cart-drawer-item` (y 12, opacity 0, 0.05 s stagger) and highlight the line whose
   `data-key` is new; later replace the reload with `/cart/change.js` + `refreshDrawer()` and a height
   tween on removed lines. Also: product page adds do not open the drawer. Decide (merchant) whether
   Add to bag should open it; if yes call `window.Casify.openDrawer(btn)` after `refreshDrawer` resolves
   (needs refreshDrawer to return its promise through `CasifyCart.refresh`).
6. **Pack / bundle selection with Flip.** Pack slots already use Flip (cv-pack-motion.js:99-117), but the
   tier radios themselves only squash. The selected-state "ticket" outline does not travel between
   tiers. Fix: a single highlight element moved with `Flip.fit` or `Flip.from(getState)` between
   `.cvc__pack[aria-checked=true]` positions (Flip is loaded on product templates). Reduced motion:
   instant move.
7. **Price and savings count tween.** Totals flip in, but amounts never roll. Fix: tween a numeric
   proxy from old cents to new cents over 0.4 s and write `formatMoney()` output each update. The
   formatter is private to cv-product.js (cv-product.js:39-56); either expose
   `window.CasifyMoney.format` from cv-product.js or read `detail.total` from `cvs:change` and format
   with the same placeholders. Keep the live region quiet during the tween (update the aria-live node
   only with the final value).
8. **Savings meter.** `[data-cv-savings-fill]` gets an inline width from JS (cv-product.js:278) and
   only the entrance animates (`scaleX`, cv-pdp-counter-motion.js:109). Width changes on pack switch
   use the CSS `transition: width 420ms var(--ease-standard)` (cv-pdp-counter.css:567-574). A GSAP width
   tween with a candy overshoot would match the meter's entrance; if added, switch the CSS transition
   off under a motion root class (section 7, item 1).
9. **Buy now press feedback.** Squash + arrow nudge exist; the nudge watcher uses `setInterval`
   (cv-pdp-counter-motion.js:341-346). Fix: drive the stop from a MutationObserver on `class` (the
   pattern at cv-candy-buttons.js:248-256) and kill on `pagehide`.
10. **Sticky buy bar entrance.** CSS transition only (cv-pdp-counter.css:745-756), no stagger of its
    picture/name/total/buttons, no exit choreography. Fix: keep the CSS as the no-GSAP path; when GSAP
    runs, add a root class (house pattern `.cvh-motion`, cv-header.css:179-183) that sets
    `transition: none`, and animate `yPercent` + children stagger in GSAP on the `is-visible` toggle
    (observe the class with a MutationObserver or add a `cvs:sticky` event to cv-product.js).
11. **Toast tone.** Error toasts look like success (5.8). Fix in theme.js: accept a `tone` and add
    `toast--danger`; motion: shake-in for danger, rise for success.
12. **Best product buy box.** Uses a runtime CDN Motion import (best-product.js:6-10) and its own
    commerce path. Bring it onto the same events (`cart:refresh`, `cart:added`) and GSAP so the fly and
    badge moment are shared.

### 6.1 Scroll choreography gaps (placed sections with no entrance at all)

Audit method: every section type placed in templates/*.json and the section groups, its own markup
plus rendered snippets, checked for `data-cv-*` motion attributes, `data-cm-reveal`, a layout gate
attribute, a section-printed script, `cvw` hooks (pdp-home motion) or inline GSAP.

| Section | Templates | Status |
|---|---|---|
| cs-customer-proof | product, product.convert | no motion of any kind |
| cv-campaign-guide | page.campaign-guide | no motion |
| cv-collections-list | list-collections | only the page progress bar (`.cv-page-root`); cards have no entrance |
| cv-page-video-reviews | page | no motion |
| cv-pdp-details | product, product.convert | no entrance (cv-pdp-story.js handles behaviour only) |
| cv-sales-note | page | no motion |
| facebook-comments | index | no motion |
| cv-trust-bar | index | `data-cv-reveal` only (fade); no stagger of its items |
| cv-collection | collection | `data-cv-reveal` + cv-pages.js filters; product grid entrance depends on `.cv-card` CSS delay (theme.css:2229) |
| cart page (cv-cart) | cart | cv-motion reveal/split/stagger only; line changes reload |

Sections WITH motion today: everything else placed (header, footer, hero, spotlight, showcase, value
stack, social proof, orbit, phone scan, vs, collage, ugc, signup, hanging cards, offer courier, feature
tabs, scrolling reviews, review rails, every `cv-pdp-*` home rebuild via `cvw` hooks, counter, fit,
set, delivery, before-after, carousel).

35 section files are placed nowhere (DECISIONS.md:6-7); do not spend motion work there until they are
placed.

---

## 7. Conflicts and double-animation risks

1. **CSS transitions on transform vs GSAP.** `.cvc__add` / `.cvc__buy` have
   `transition: transform 150ms` and hover `translateY(-2px)` (cv-pdp-counter.css:590, 609-610).
   GSAP squash on the same element (cv-pdp-counter-motion.js:326, 337) fights the CSS transition (each
   inline transform is eased again by CSS). Same for `.cvc-sticky` (320ms transform transition),
   `.cart-drawer` (240ms), `[data-cv-tilt]` (240ms), `[data-cv-reveal]` (420ms). Rule: when GSAP
   animates an element's transform, either animate an inner wrapper, or turn the CSS transition off
   under a "GSAP owns this" root class, exactly like cv-header.css:179-183 (`.cvh-motion ... { transition: none; }`).
2. **Two magnets.** cv-motion.js pulls every `.cv-cta` with CSS `translate` (cv-motion.js:219-231),
   cv-pdp-home-motion.js `magnet()` uses GSAP x/y (cv-pdp-home-motion.js:60-73), cv-candy-buttons.js
   has a third. `translate` and `transform` compose, so applying two doubles the pull. One magnet per
   element.
3. **Three word splitters.** `data-cv-split` (cv-motion.js), `data-cvw-split` SplitText
   (cv-pdp-home-motion.js:134-140), and `splitWords()` (cv-spotlight-motion.js:15-31). Never put two on
   one heading; prefer SplitText (it reverts, keeps markup, handles aria) for new work.
4. **Reveal attribute + GSAP entrance on the same node.** `[data-cv-reveal]` starts at opacity 0 and
   transitions on `.is-revealed`; a GSAP `from({ opacity: 0 })` on the same node produces a double
   fade and the CSS transition smooths GSAP's frames. Pick one engine per node.
5. **Two IO reveal systems.** cv-motion.js (`data-cv-reveal`) and theme.js (`data-cm-reveal`,
   theme.js:184-195) with different offsets (16px vs 6px). Only unplaced sections use `data-cm-reveal`;
   new work uses `data-cv-reveal` or GSAP.
6. **Bag bump stacking.** Counter fly scales the bag icon 1.35 (cv-pdp-counter-motion.js:316-319) while
   cv-header.js bounces the badge from a MutationObserver (cv-header.js:239-247) and cart.js adds
   `.is-bump` (cart.js:138-140; CSS muted under `.cvh-motion`). Fine today; a new global cart motion
   must reuse the header observer for the badge and own only the icon.
7. **Order Slip vs Counter.** cv-pdp-slip-motion.js listens to `cvs:added` on any `[data-cv-pdp]` but
   nulls its CTA on the counter (`isCounter`, cv-pdp-slip-motion.js:33, 49) so only one token flies. Any
   new listener on `cvs:*` must check `data-cv-pdp` value the same way.
8. **Orphan code.** cv-candy-buttons.js (319 lines) targets `[data-cv-candy]` which no Liquid prints;
   its CSS remains in cv-badges.css:37+. Either wire it to a real snippet or leave it unloaded; do not
   load it next to cv-pdp-counter-motion.js on the same buttons (double press/hover handlers).
9. **Pending timeout vs slow GSAP.** The 1.4 s pending timeout (cv-product-counter.liquid:47) can
   expire before deferred GSAP runs on slow devices, revealing pieces that then jump to their GSAP start
   state. Keep hidden-by-pending pieces decorative only (as today).
10. **Header comment drift.** cv-motion.js:1 says "Chrismass design system" and theme.css:1103 says the
    progress bar is "injected by cv-product.js"; it is injected by cv-motion.js:172-186.

---

## 8. Performance and safety

### 8.1 Script weight (bytes on disk, before gzip/brotli from the Shopify CDN)

| Bundle | Bytes |
|---|---|
| GSAP always (core 72,927 + CustomEase, CustomBounce, CustomWiggle, DrawSVG, ScrollTrigger 44,575, ScrollTo, SplitText, init) | 146,381 |
| Optional GSAP: Draggable 35,762 + Inertia 7,335; Flip 25,534; MotionPath 22,002; ScrambleText 11,687 + Text 10,570 | per flag |
| Every page theme JS (cv-header, cv-footer, casify-data, theme, cv-motion, cart) | 83,355 |
| Product template always-on stack (cv-product, pack, story, slip, counter, counter motion, pdp-home, reviews, customer-experience) plus gated counter modules (sales, promises, case features, model, awning, price tag, carousel, delivery, before-after) | 368,411 |
| Product template GSAP (always + Flip + MotionPath) | ~194,000 |
| three.js (three.core.min.js 415,816 + three.module.min.js 392,839), imported only when WebGL works and motion is allowed | up to ~809,000 |
| Motion (motion.min.js) when `data-motion-dev` | 153,875 |
| Anime.js (anime.umd.min.js) when `data-anime` | 118,043 |

Product pages already ship roughly 650 KB of uncompressed JS before three.js. New commerce motion
must reuse loaded plugins (DrawSVG, CustomEase, Flip and MotionPath on product templates) and add one
small file at most, not a library. Gate any new section script with `content_for_layout contains`.

### 8.2 ScrollTrigger refresh needs

- Refresh after: images without fixed dimensions load (`window.load`), fonts load
  (`document.fonts.ready`), content injected by Section Rendering API (complete-the-set, shelf), pack
  slots shown/hidden (they change the buy box height: cv-product.js:213 toggles `slots.hidden`), the
  model list opening (`cvs:models`), and accordion/tab changes.
- Today no file refreshes on `cvs:slots` or `cvs:models`; triggers below the buy box can be offset after
  a pack change. New code: debounce one `ScrollTrigger.refresh()` on those events.
- `ScrollTrigger.config({ ignoreMobileResize: true })` is not set anywhere; mobile URL-bar resizes
  trigger refreshes. Consider setting it once in gsap-init.js (layout-level change, later phase).

### 8.3 Theme editor

Editor loads every gated script (layout/theme.liquid:164). Product-page motion files and cv-motion.js
boot once and ignore `shopify:section:load`, so after a merchant edits the Shop Counter in the editor
the counter re-renders without its listeners' targets (they hold stale element references). New files
follow cv-showcase-motion.js:363-393.

### 8.4 Reduced motion

Covered per file (4.4). New commerce feedback must keep the information without the motion: colour,
label text and `#cvStatus` live-region text carry the state; the fly, shake, stagger and count roll are
skipped. Use `gsap.matchMedia()` with `'(prefers-reduced-motion: no-preference)'`.

### 8.5 Hidden tab and offscreen

- Loops: pause via ScrollTrigger `onToggle` and `visibilitychange` (4.7).
- Entrances that start in a hidden tab jump to their end (`progress(1)`).
- Avoid `setInterval` and infinite CSS animations for new motion; use GSAP tweens with `repeat: -1`
  that ScrollTrigger can pause.

### 8.6 Accessibility checks for every new animation

- Decorative tokens and particles get `aria-hidden="true"` and `pointer-events: none`
  (cv-pdp-counter-motion.js:282-283, cv-pdp-counter.css:788-795).
- Never move focus or change reading order with motion. Focus stays on the pressed button.
- State changes are announced by the owner's live region, not by the animation.
- Touch targets stay at least 44px tall during squash (scale no lower than 0.9).

---

## 9. Recipe: how to add motion to a section in this theme

### Step 1: pick the engine

- Simple fade or rise of plain content with no GSAP needed: `data-cv-reveal` (+ `data-cv-stagger`).
  Only for content that is server-rendered once and is NOT commerce-critical (3.4).
- Anything choreographed, commerce, scroll-scrubbed or theme-editor aware: a GSAP file named
  `assets/cv-<name>-motion.js`.

### Step 2: markup (Liquid)

```liquid
{%- comment -%} Section prefix: cvxx. Gate attribute: data-cvxx (unique substring). {%- endcomment -%}
<script>
  (function (root) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('cvxx-pending');
    setTimeout(function () { root.classList.remove('cvxx-pending'); }, 1400);
  })(document.documentElement);
</script>
{{ 'cv-xx.css' | asset_url | stylesheet_tag }}
<section class="cvxx" data-cvxx>
  <h2 class="cvxx__title" data-cvxx-title>{{ section.settings.heading | escape }}</h2>
  <ul class="cvxx__list">
    {%- for block in section.blocks -%}
      <li class="cvxx__item" data-cvxx-item {{ block.shopify_attributes }}>...</li>
    {%- endfor -%}
  </ul>
  <span class="cvxx__ornament" data-cvxx-ornament aria-hidden="true"></span>
</section>
```

### Step 3: CSS (finished state is the default)

```css
/* Resting, readable state with no JS. Only decorative pieces hide while pending. */
.cvxx-pending .cvxx__ornament { opacity: 0; }

/* GSAP owns transforms on these while motion runs: no competing CSS transition. */
.cvxx.is-motion .cvxx__item { transition: none; }

@media (prefers-reduced-motion: reduce) {
  .cvxx__ornament { animation: none !important; }
}
```

### Step 4: load it (layout/theme.liquid, next to the other gates)

```liquid
{%- if editor or content_for_layout contains 'data-cvxx' -%}
  {%- comment -%} "Section name" (sections/cv-xx.liquid). {%- endcomment -%}
  <script src="{{ 'cv-xx-motion.js' | asset_url }}" defer></script>
{%- endif -%}
```
If it needs Flip or MotionPath on a page that is not a product or shop page, also extend the flag at
layout/theme.liquid:174 with `or content_for_layout contains 'data-cvxx'`.

### Step 5: the motion file (house skeleton)

```js
/* Casify: <section name> motion (sections/cv-xx.liquid).
 *
 * What moves, in shop-dressing terms. The section is complete without this
 * file: every word, price and control is visible from the first paint.
 * Nothing runs without GSAP or under reduced motion. Re-initialises in the
 * theme editor.
 */
(function () {
  'use strict';

  var SELECTOR = '[data-cvxx]';
  var html = document.documentElement;
  function release() { html.classList.remove('cvxx-pending'); }
  function one(q, ctx) { return (ctx || document).querySelector(q); }
  function all(q, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(q)); }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !document.querySelector(SELECTOR)) { release(); return; }

  function init(root) {
    if (!root) return;
    if (root._cvxxDestroy) root._cvxxDestroy();

    var mm = gsap.matchMedia();
    var timeline = null;

    mm.add({ motion: '(prefers-reduced-motion: no-preference)', hover: '(hover: hover) and (pointer: fine)' }, function (context) {
      if (!context.conditions.motion) { release(); return; }
      var items = all('[data-cvxx-item]', root);
      var ornament = one('[data-cvxx-ornament]', root);

      root.classList.add('is-motion');
      gsap.set(items, { y: 22, autoAlpha: 0 });
      if (ornament) gsap.set(ornament, { scale: 0.6, rotation: -12, autoAlpha: 0 });
      release();

      timeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: ScrollTrigger ? { trigger: root, start: 'top 82%', once: true } : null
      });
      timeline
        .to(items, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, clearProps: 'transform,opacity,visibility' }, 0)
        .to(ornament, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' }, 0.2);

      if (document.visibilityState === 'hidden') timeline.progress(1);

      return function () { root.classList.remove('is-motion'); };
    });

    root._cvxxFinish = function () { if (timeline) timeline.progress(1); };
    root._cvxxDestroy = function () {
      mm.revert();
      delete root._cvxxDestroy;
      delete root._cvxxFinish;
    };
  }

  function rootIn(node) {
    if (!node) return null;
    return node.matches && node.matches(SELECTOR) ? node : one(SELECTOR, node);
  }

  function boot(scope) {
    var roots = [];
    if (scope && scope.matches && scope.matches(SELECTOR)) roots.push(scope);
    if (scope && scope.querySelectorAll) roots = roots.concat(all(SELECTOR, scope));
    roots.forEach(init);
    if (ScrollTrigger) ScrollTrigger.refresh();
  }

  boot(document);
  window.addEventListener('load', function () { if (ScrollTrigger) ScrollTrigger.refresh(); }, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (ScrollTrigger) ScrollTrigger.refresh(); });

  document.addEventListener('shopify:section:load', function (e) { boot(e.target); });
  document.addEventListener('shopify:section:unload', function (e) {
    var root = rootIn(e.target);
    if (root && root._cvxxDestroy) root._cvxxDestroy();
  });
  document.addEventListener('shopify:section:select', function (e) {
    var root = rootIn(e.target);
    if (root && root._cvxxFinish) root._cvxxFinish();
    if (ScrollTrigger) ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:block:select', function (e) {
    var root = e.target.closest && e.target.closest(SELECTOR);
    if (root && root._cvxxFinish) root._cvxxFinish();
  });
})();
```

### Step 6: commerce hook skeleton (listen, never own)

```js
/* React to the buy box. cv-product.js owns state; this only decorates. */
(function () {
  'use strict';
  var root = document.querySelector('[data-cv-pdp="counter"]');
  var gsap = window.gsap;
  if (!root || !gsap) return;

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
    var btn = root.querySelector('#cvAddBtn');
    function onAdding() { /* lock width, start busy morph */ }
    function onAdded(e) { var qty = (e.detail && e.detail.qty) || 1; /* check draw, hand off to fly */ }
    root.addEventListener('cvs:adding', onAdding);
    root.addEventListener('cvs:added', onAdded);
    return function () {
      root.removeEventListener('cvs:adding', onAdding);
      root.removeEventListener('cvs:added', onAdded);
    };
  });
})();
```

### Step 7: checklist before committing

- [ ] With JS off, the section is complete and readable; Add to bag still posts natively.
- [ ] With reduced motion, nothing moves that is not essential; state is still visible (colour, text).
- [ ] Hidden pending pieces are decorative only, and the pending class has a timeout.
- [ ] Gate attribute is unique and printed in the first server render.
- [ ] Theme editor: add, remove, reorder, select the section; no duplicate listeners, no stuck opacity.
- [ ] Loops pause offscreen and in a hidden tab; auto-running loops have a pause control.
- [ ] `clearProps` at the end of entrances; `willChange` removed after.
- [ ] No CSS transition on a property GSAP animates on the same node.
- [ ] Any number that animates comes from live data or a merchant setting.
- [ ] No em or en dashes in shopper-facing strings; the product is a phone case, not candy.
- [ ] `ScrollTrigger.refresh()` after anything that changes layout height.

---

## 10. Open items for the build phase (need a decision, not research)

1. Fix the no-JS invisibility of `[data-cv-reveal]` / `[data-cm-reveal]` (layout + theme.css change).
2. Add `is-error` + `cvs:error` to cv-product.js (owner change) so error motion has a hook.
3. Decide whether Add to bag on the product page opens the drawer (merchant choice).
4. Add `detail: { from, img, qty }` to `cart:added` dispatchers and ship one global cart motion file.
5. Replace the drawer's reload-on-quantity-change with in-place re-render (cart.js), then stagger lines.
6. Expose the money formatter (or reuse `cvs:change` detail) for price count tweens.
7. Decide the fate of cv-candy-buttons.js (wire to a real snippet or delete) and best-product.js's CDN
   Motion import.
8. Teach cv-motion.js `shopify:section:load` (rescan the loaded section) so editor previews do not stay
   blank.
