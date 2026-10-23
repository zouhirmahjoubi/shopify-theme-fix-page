# INF-0 report

Files: layout/theme.liquid, assets/theme.css, assets/theme.js, assets/cv-motion.js.
Rounds 1 and 2 are summarised in the verifier reports (INF-0.verify-regression.md, INF-0.verify-experience.md).
Round 2 left theme.js and part of theme.css unedited (time-box refusal); this round finishes them.

## Fix round (round 3, 2026-10-23)

### Changes

- assets/theme.js `init()`: now `reveal(document)`, then `window.CASIFY_FNS.revealReady = true`, then `bindLegacy()`.
  The layout check (theme.liquid:18-21) needs this flag together with `CVMotion.ready`. Before, every page got
  `html.cv-reveal-timeout` at DOMContentLoaded and no reveal ever played (defects 1 and 4).
- assets/theme.js `shopify:section:load`: also adds `.is-revealed` to `[data-halo-reveal]` inside the loaded
  section, because halo.js observes once at boot and has no editor rescan (fixes the r2 regression expect
  "cloned [data-halo-reveal] not revealed after section:load").
- assets/theme.css `[data-halo-reveal]` start state is now `:where(.js:not(.cv-reveal-timeout):has(.halo-tpl))`.
  halo.js returns early without `.halo-tpl`, so a page without it (or without JS, or with halo.js failing) shows
  the copy. Without `:has()` support the rule drops and the copy shows. The existing reduced-motion block
  (`!important`) still wins (defect 2, part of 5).
- assets/theme.css `.cv-search__chip`: opacity, transform, the full transition and the delay moved under
  `:where(.js:not(.cv-reveal-timeout))`; the colour transition stays unscoped (defects 3, 5, 6).
- assets/theme.css, same pattern for the rest of PLAN item 2's list that was still unscoped: `.cv-cmp__row`,
  `.cv-method`, `.cv-hero__metrics li` (`display:grid; gap:2px` stays unscoped). The later reduced-motion
  block (section ~3262) still overrides all of them.
- assets/theme.css: `.no-js [data-cv-scroll-to-buy] { display:none !important }`. The button only works through
  cv-motion.js (verifier minor).
- layout/theme.liquid and assets/cv-motion.js: no change this round.

### Proof (outputs in dev/motion-store-adapt/verify/INF-0-fix-r3/)

| Check | Result |
|---|---|
| (a) `shoot.py verify/INF-0-experience-r2/ok.html --nojs` at 375/768/1440 | PASS, 0 failed expects. chip-search, chip-search2, chip-blog, chip-blog2 and halo all visible (xp-ok/nojs-375.png), scroll-to-buy hidden |
| (a) `shoot.py verify/INF-0-regression-r2/inf-0-r2-layout.html --rm --nojs --widths 375,1440 --actions ...` | PASS (all 6 runs, 0 failed expects; halo1 now visible with nojs, cloned halo revealed after section:load) |
| (b) early probe on ok.html, JS on, 375/768/1440 | `dclClass: "js"`, `cvReady: true`, `revealReady: true`, below-fold reveal at opacity 0 with 0.42s transitions at DCL, `class2600: "js"` (no timeout). Direct Playwright probe (scratchpad/INF-0/probe.py) agrees at 768 and 1440 |
| (c) cloned sections + `shopify:section:load` | PASS in rg-layout default runs (rv1, cm1, halo1 = 1, split words, count) |
| (d) `--rm` | PASS: below-fold reveal opacity 1 at DCL, no timeout class |
| (e) scroll-to-buy on a page without `.cv-buy` | JS on: display none. JS off: display none (new rule) |
| (f) toasts | success `toast`, role status, teal border; danger `toast toast--danger`, role alert, red border rgb(196,48,43) |
| Safety net, engines 404 (`broken.html`, `inf-0-r2-noengine.html`) | 0 "invisible" failures: chips and halo1 visible via cv-reveal-timeout. Remaining failures there are the actions file's (b)/(e) expects, which assume engines loaded, plus the deliberate 404 console lines (kit note in requests/kit.md) |
| Editor leak check `harness/inf-0-verify/inf-0-verify.html --query editor=4` | PASS, no listener growth |
| `harness/inf-0-verify/inf-0-verify.html --rm --nojs --widths 375,1440` | PASS |
| `node --check` theme.js, cv-motion.js | OK |
| `liquid-balance.py layout/theme.liquid` | PASS |
| `dash-scan.py` on the 4 files | PASS, 0 shopper hits |
| `motion-lint.py` | PASS, 0 errors. `.cv-search__chip` no longer flagged; 17 advisory R8 flags remain, all outside PLAN INF-0 item 2 (hover/drawer states, `.halo-stagger > *` which is a CSS `both` animation, `.cv-story__*`, logo) |
| `tc-compare.py --allow-missing-keys ../locale-requests` | PASS: 0 errors, 8 warnings, no new offenses |

Known kit false positive: ok.html `--actions` reports `.cv-callout` invisible at 768/1440 (already in requests/kit.md);
a direct probe reads opacity 1 with the animation `finished` at both widths.

### Open

See requests/INF-0.md for changes outside these four files.
