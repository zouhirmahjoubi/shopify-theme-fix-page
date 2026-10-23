# INF-0 verify, fix round 3 (lens: correctness and regression)

Verdict: PASS. All three blocking defects from round 2 are fixed. I re-ran the acceptance tests and
none of them fail. The fix adds no regressions, and nothing on the money path changed.

## Scope check

- File mtimes show that round 3 changed only `assets/theme.css` and `assets/theme.js` (05:20).
  `layout/theme.liquid` (04:28) and `assets/cv-motion.js` (03:09) still match the versions that
  round 2 verified. Every other modified file under the theme root predates this round and belongs
  to other units (cv-product.js 04:05, cv-pdp-home-motion.js 04:22, cv-pdp-home.css 03:28,
  cv-pdp-slip-motion.js 03:25).
- I searched the diff of theme.js, cv-motion.js and theme.liquid for `cart/add`, `/cart`,
  checkout, `fetch(`, `form`, `submit`, `CustomEvent`, `dispatchEvent`, `cvs:` and `cart:`. The
  only hits are progress-bar transform lines in cv-motion.js. No event or `detail` field was
  renamed or removed, and the no-JS form post is untouched.

## What I ran (all by me, round 3)

- `git diff HEAD` on the 4 task files, read in full for theme.js, theme.css and theme.liquid.
- A new harness `verify/INF-0-regression-r3/inf-0-r3-layout.html`. It is the round 2 regression
  harness, which carries the REAL inline layout script (checked byte for byte against
  `layout/theme.liquid`). On top of that I added `.cv-search__chips[data-cv-reveal] >
  .cv-search__chip` x2, `.cv-ugc__stat`, `.cv-clip` and `.cv-hero__metrics li` (build script:
  `scratchpad/INF-0-vr3/build_r3.py`). The actions file is mine: `verify/INF-0-regression-r3/actions.py`.
  `shoot.py --rm --nojs --widths 375,768,1440`: **PASS, 9 runs, 0 failed expects**.
- The engines-404 page `inf-0-r3-noengine.html` (theme.js, cv-motion.js and halo.js all 404).
  `--allow-net` / `--allow-console` cover the deliberate 404s. `actions-noengine.py`: **PASS** at 375
  and 1440.
- Editor leak check, `--query editor=4`: **PASS**, grew 0. The 3 "stuck" nodes are the
  `.cv-ugc__stat`, `.cv-clip` and metric li I added. Their engines are section modules that this
  harness does not load (the stat and clip are not inside `[data-cv-ugc]`). This is a harness
  artifact, not a defect.
- `tc-compare.py --allow-missing-keys ../locale-requests`: **PASS** (0 errors, 8 baseline warnings,
  no new offenses).
- `schema-validate.py --quiet`: PASS. `liquid-balance.py layout/theme.liquid`: PASS.
- `dash-scan.py` on the 4 files: PASS (0 shopper hits). `motion-lint.py`: PASS (0 errors, 17
  advisory R8 flags, all of them in HEAD code outside PLAN item 2).
- `node --check` on theme.js and cv-motion.js: OK.
- By eye: `shots/nojs-375.png` shows every node (headings, reveals, chips, halo, stat, clip, metric,
  callout). The scroll-to-buy button is absent.

## Acceptance results

| Item | Result | Evidence (my runs) |
|---|---|---|
| (a) `?nojs=1` shows all content | PASS | nojs at 375/768/1440: every probed id is at opacity 1, including `halo1`, `chip1`, `chip2`, `stat1`, `clip1` and `metric1`. |
| (b) JS on: reveals play once | PASS | Default early probe at DCL+0/60/400 ms: `cls "js"`, `cvReady true`, `revealReady true`, `rvLow "0"` (below the fold, still hidden, so the reveal is armed). halo1 animates 0 -> 1 by 400 ms. After a scroll, everything is at 1 and the timeout class is absent. |
| (c) clone + `shopify:section:load` | PASS | `{"rv1":1,"cm1":1,"halo1":1,"chip1":1,"split":true,"cnt":"42%"}` at all widths, in default and rm. The round 2 halo failure is fixed by the theme.js section:load stopgap. |
| (d) `?rm=1` visible instantly | PASS | rm early probe: rvLow 1 and halo1 1 from 0 ms, no timeout class. |
| (e) no `.cv-buy` hides scroll-to-buy | PASS | JS on: `display:none` (via `[hidden]` + the `!important` rule). No JS: `display:none` from the new `.no-js` rule. All 6 live users are `<button type="button">`, so no JS does nothing anyway and hiding them removes no working link. |
| (f) danger red, success teal | PASS | danger `toast toast--danger`, role alert, border `rgb(196,48,43)`, strong and svg `rgb(168,35,31)`. Success and no-tone: `toast`, role status, border `rgb(108,158,156)`, strong `rgb(78,124,123)`. Markup in the title or body is escaped (0 injected elements). |
| Safety net (engines 404) | PASS | Timeout class at DCL+0. After 3 s with no scroll, all 13 ids are at 1, including the chips, halo, stat, clip and metric. |
| tc-compare | PASS | no new offenses |

## Regression hunt (nothing blocking found)

- **theme.js.** HEAD's IIFE returned early without `CASIFY_ART`/`CASIFY`. Now the toast and the
  `[data-cm-reveal]` code always run, and the legacy bindings keep the same guard. Bindings, order
  and selectors match HEAD (document-wide `.cm-thumb`, `.swatch`, `.chip`, `.tab`, stepper,
  heart, `renderStock()`). `renderStock` is hoisted inside `bindLegacy`, so the swatch handler still
  reaches it. The removed demo `addToBag` was bound only to `#addBtn` and `#addBtnMobile`, and
  neither id exists in any section, snippet, template or block. `#bagBadge` in the header is now
  driven only by cart.js, as before. `toastQuick(title, body)` without a tone still produces a
  success toast, so cart.js:180 is unchanged in behaviour. build-box.js already passes `'danger'`
  and now gets the red toast. Listeners are registered once at parse, at document level, so they
  do not double after a section reload (confirmed by the editor check). `revealReady` is set after
  `reveal(document)` and before `bindLegacy()`, so a throw in the legacy code cannot trigger the
  timeout.
- **theme.css specificity.** Each `:where(...)`-scoped start state keeps its HEAD specificity.
  The finished rules still win: `.cv-split.is-revealed .cv-word`, `[data-cv-reveal].is-revealed`,
  `.is-revealed .cv-search__chip`, `.cv-ugc__stats.is-revealed .cv-ugc__stat`,
  `.cv-ugc__wrap.is-revealed .cv-clip`. The reduced-motion mirror (~3275-3281, plus `!important` for
  halo at 3956) comes later in the source, so it still wins. `.cv-search__chip` keeps its
  background and colour hover transition in every state.
- **Halo gating.** `:has(.halo-tpl)` matches halo.js's own early return. A browser without `:has()`
  drops the whole rule, so halo copy is visible there without animation. That is a safe fallback.
- **Other layouts.** `gift_card.liquid` loads theme.css but has no swap script and no engines, so
  its reveal nodes are now visible where HEAD hid them. `password.liquid` does not load theme.css.
- **Class overwrites.** No script in assets, sections, snippets or blocks assigns
  `documentElement.className`. Only the layout's `replace('no-js','js')` touches it, so nothing can
  wipe `js` or `cv-reveal-timeout`.

## Minor (non-blocking)

- The commerce motion slots (theme.liquid:183-184 and :379) still request
  `cv-commerce-motion.css` and `.js`, and neither file exists. That means a render-blocking 404
  stylesheet in `<head>` plus a 404 script on every page, until INF-3 lands. INF-3 must land before
  any push (this is already in the implementer's requests).
- Theme editor only: adding the first `.halo-tpl` section to a page that had none turns on the
  halo start state page-wide. Any `[data-halo-reveal]` node outside the loaded section was never
  observed by halo.js, so it stays hidden until a reload. Editor-only, and it needs a halo-reveal
  node outside a halo template. A halo.js rescan (already requested) closes it.
- `.cv-cmp__row`, `.cv-method` and `.cv-hero__metrics li` have no markup in any live section,
  snippet or JS file (orphan CSS). Scoping them is harmless and has no effect on shoppers.
- By design, the 2.5 s layout timeout turns reveals off for that page view on slow connections,
  where deferred scripts finish after 2.5 s. Content stays visible, so this is a trade-off and not
  a defect.
- `assets/cart.js:180` still drops `tone`, so cart errors use the teal toast. This is INF-2 scope,
  already requested.
- 17 advisory motion-lint R8 flags remain on HEAD code outside PLAN item 2 (`.halo-stagger > *`,
  the logo parts, `.build-box__step-check`, and others). These are CSS animations or hover states,
  not engine-driven reveals.
