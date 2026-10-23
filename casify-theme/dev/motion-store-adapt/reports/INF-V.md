# INF-V: verification kit

Status: partial (the kit works; the four blocking defects from the first verification and the
editor-baseline defect from the second are fixed; open items are listed at the end). No theme file was edited. Everything lives under
`dev/motion-store-adapt/` (tools/, kit-proof/), which is never uploaded.

## Tools (dev/motion-store-adapt/tools/)

| File | What it does |
|---|---|
| `tc-compare.py` | Copies layout, sections, snippets, templates, locales, config, blocks, assets to a fresh temp dir, runs `shopify theme check --output json`, compares with `theme-check-baseline-clean.json` by (file, check). Prints new errors and warnings with file:line. `--allow-missing-keys <locale-requests dir>` treats TranslationKeyExists for requested keys as pending. Exit 1 on any unexpected offense. |
| `schema-validate.py` | Parses every `{% schema %}` and every template / section group JSON; checks block types and setting ids used by templates, range defaults, select defaults, `enabled_on` shape. |
| `liquid-balance.py` | Balances if/unless/case/for/capture/comment/form/paginate/style/javascript/schema/raw, including `{%- liquid -%}` blocks. |
| `dash-scan.py` | U+2013/U+2014 and `&ndash;`/`&mdash;` in shopper copy, editor-only hits listed apart. `--check-7g` reproduces the STORE-FACTS 7g counts. |
| `motion-lint.py` | Per changed asset: reduced-motion path, `shopify:section:load` listener, no `setInterval`, no new window scroll listener, CSS reduce override, flags unscoped `opacity: 0`. `--all` for the whole theme. |
| `harness-template.html` | Static preview shell with `?rm=1`, `?nojs=1`, `?editor=N` switches and a window/document listener counter. The editor leak baseline is taken after cycle 1; `?trace=1` records the caller file:line of each add/remove. |
| `render-section.mjs` | liquidjs render of one section with a JSON fixture into a standalone harness page (real theme.css, section CSS/JS, local GSAP, stub-fetch). |
| `shoot.py` | Playwright shots at 375/768/1440 full page, `--rm` and `--nojs` variants, `--actions` snippets with `expect()`, console.json. Exit 1 on page or console errors, failed requests, failed expects and editor listener leaks (`--allow-leak REGEX` for a known one). |
| `stub-fetch.js` | Stubs `/cart/add.js`, `/cart/change.js`, `/cart.js`, `?sections=`; `?fail=1` (422 on add/change), `?fail=all` (500 on everything); records `window.__calls`. |
| `fixtures/` | `product-model.json` (Color + Model: iPhone 17 Pro Max, iPhone 17 Pro, iPhone 17), `product-no-model.json`, `cart-drawer.json`. |

## First round results (kit-proof/)

- `tc-compare.txt` / `.json`: untouched branch 0 errors, 8 warnings, all 8 matched to the baseline by file + check, no new offenses, exit 0.
- `schema-validate.py`: 95 section schemas, 3 block schemas, 26 templates/groups, 0 errors (console only).
- `liquid-balance.py`: 137 files, 0 unbalanced; a broken scratch sample was caught with exit 1 (console only).
- `dash-scan.py --check-7g`: all six 7g counts match.
- `motion-lint-all.txt`: `--all` reports 12 pre-existing errors and 59 R8 flags theme-wide.
- `render-section.txt`: model.html (model select with the 3 iPhone 17 values), no-model.html (no model option), drawer.html (1 line).
- `shoot-runs.txt`: counter model / no-model / fail=1 / editor=2, drawer / fail=all.

## Fix round

Four blocking defects came back from the two verifiers (reports/INF-V.verify-experience.md and
reports/INF-V.verify-regression.md). Defects 1 and 3 are the same bug, reported by both.

### 1 + 3. `?rm=1` matchMedia stub said yes to `no-preference`

- Root cause: `tools/harness-template.html` tested `/reduce/` on the whole query. Every
  prefers-reduced-motion query contains "reduce" (in "reduced-motion"), so under `?rm=1`
  `(prefers-reduced-motion: no-preference)` was true and gsap.matchMedia ran BOTH the
  no-preference and the reduce branch. shoot.py `--rm` appends `rm=1`, so the stub also
  overrode Playwright's real reduce emulation. The returned object was also a dead fake: no
  compound query logic and no listeners.
- Fix: under `?rm=1` the harness rewrites each prefers-reduced-motion feature in the query to a
  fixed-answer width feature (`no-preference` -> `(min-width: 99999px)`, `reduce` and the bare
  `(prefers-reduced-motion)` -> `(min-width: 0px)`) and hands the whole query to the real
  `matchMedia`. So the answers are correct, compound queries such as
  `(min-width: 768px) and (prefers-reduced-motion: no-preference)` keep their logic, and the
  result is a real MediaQueryList. The header comment now says CSS `@media` rules are not
  affected by `?rm=1` (shoot.py `--rm` also emulates reduce in Chromium, which covers CSS).
- The three kit-proof pages were re-rendered from the fixed template (`render-section.txt`).
- Proof (`kit-proof/rm-fix.txt`, new snippet `kit-proof/actions-mq.py` with 9 expects):
  - Verifier repro `rmcheck.py` after the fix: plain `{reduce:false, noPref:true, gsap a:true r:false}`;
    `?rm=1`, `?rm=1` + emulation and emulation alone all `{reduce:true, noPref:false, gsap a:false r:true}`.
    Before: `?rm=1` gave `{reduce:true, noPref:true, gsap a:true r:true}`.
  - `shoot.py model.html --rm --actions actions-mq.py`: default and rm variants pass every expect
    (reduce, no-preference, bare, compound both ways, `not all and`, gsap single-branch and
    conditions object), exit 0. Folder `cv-product-counter/shots-mq/`.
  - `--query rm=1` with NO emulation: stub alone gives the reduce answers, exit 0
    (`cv-product-counter/shots-mq-query/`).
  - Negative: `kit-proof/negative/old-stub.html` is model.html with the old stub put back;
    the same snippet fails 5 expects including "gsap no-preference branch ran=True", exit 1
    (`kit-proof/negative/old-stub.txt`).

### 2. dash-scan.py unit mode broke on theme-relative paths

- Root cause: `Path(f).resolve()` made `sections/x.liquid` absolute against the cwd (tools/)
  before the fallback, so `THEME / f` returned the same wrong path.
- Fix: new `resolve_arg()` tries absolute, then cwd-relative, then theme-relative, and resolves
  only after choosing. A missing file exits 1 with both tried paths. liquid-balance.py and
  motion-lint.py already did this in the right order and were re-checked from tools/.
- Proof (`kit-proof/dash-scan-paths.txt`): from tools/, `python dash-scan.py
  sections/cv-guarantee.liquid` now scans the file (11 shopper hits, FAIL exit 1: these are real
  dashes in cv-guarantee for its own unit to fix, not a tool error); `sections/cv-product-counter.liquid`
  PASS exit 0; liquid-balance.py and motion-lint.py with the same argument PASS; a missing file
  exits 1 naming both tried paths; `--check-7g` still matches all six counts.

### 4. shoot.py passed console errors and 404s

- Root cause: the exit code looked only at page errors, actions exceptions and failed expects.
- Fix: a run now fails on any console error, any failed request and any 4xx/5xx response, as
  PLAN 5.7 requires. Expected ones can be allowed with `--allow-console REGEX` and
  `--allow-net REGEX` (repeatable); allowed entries stay in console.json under `allowed`.
  console.json gains per run `consoleErrors`, `netErrors`, `allowed`, and totals
  `netErrorCount`, `allowedCount`. The summary line prints net errors and each offense.
  stub-fetch.js fail-mode answers never reach the network, so `?fail=1` runs are not affected.
- Proof (`kit-proof/negative/broken.txt`): the verifier's broken.html (missing assets/*.js and a
  console.error) now gives console errors 2, net errors 2, FAIL, exit 1. With
  `--allow-console . --allow-net assets/` it passes with 4 allowed, exit 0.

### Re-run of every first-round proof under the stricter gate

All six first-round shoot runs were repeated on the re-rendered pages with the fixed stub and
the stricter exit rule (`kit-proof/shoot-runs.txt`, every console.json):

| Run | Runs | Page err | Console err | Net err | Failed expects | Exit |
|---|---|---|---|---|---|---|
| counter model `--rm --nojs --actions actions-counter.py` | 9 (13 shots) | 0 | 0 | 0 | 0 | 0 |
| counter no-model `--rm --nojs` | 9 | 0 | 0 | 0 | 0 | 0 |
| counter `?fail=1` + actions | 1 | 0 | 0 | 0 | 0 | 0 |
| counter `?editor=2` | 1 (editorResult: 2 cycles) | 0 | 0 | 0 | 0 | 0 |
| drawer `--rm --nojs --actions actions-drawer.py` | 9 (21 shots) | 0 | 0 | 0 | 0 | 0 |
| drawer `?fail=all` + actions | 1 | 0 | 0 | 0 | 0 | 0 |

The rm variants now run under a correct reduce answer from both Playwright and the stub.
tc-compare was re-run on the untouched theme: 0 errors, 8 warnings, all known, no new
offenses, PASS, exit 0 (`kit-proof/tc-compare.txt`).

New fix-round files: `kit-proof/actions-mq.py`, `kit-proof/rm-fix.txt`,
`kit-proof/dash-scan-paths.txt`, `kit-proof/negative/` (broken.html, old-stub.html, their
.txt logs and shot folders), `cv-product-counter/shots-mq/`, `cv-product-counter/shots-mq-query/`.
Changed: `tools/harness-template.html`, `tools/dash-scan.py`, `tools/shoot.py`, the three
re-rendered kit-proof pages, `kit-proof/render-section.txt`, `kit-proof/shoot-runs.txt`,
`kit-proof/tc-compare.txt` / `.json`.

## Fix round 2

One blocking defect came back from the second experience verifier (verify/INF-V-experience-r2/):
the report sent INF-3 a listener leak that does not exist, and the `?editor` metric behind it was
unchanged from the first round (first-round experience item 3, neither fixed nor answered).

### 5. `?editor` read every lazy or async first registration as a leak

Repro (verifier): `shoot.py kit-proof/cv-product-counter/model.html --query editor=1` and
`--query editor=4` both reported `document:visibilitychange:b 1 -> 2`. A real per-load leak gives
1 -> 5 at editor=4, so the number did not depend on the cycle count.

Root cause (kit, not theme): `harness-template.html` took the "before" snapshot at load + 800 ms,
before cycle 1, and compared it with the count after the last cycle. ScrollTrigger registers its
`visibilitychange` listener once at boot, and the cv-pdp-promises scene registers its own after an
async import, after that snapshot. Any page with a lazy or async first registration read as
"grew", so PLAN 5.7's "`?editor=1` leaves one set of listeners" check failed falsely on every
ScrollTrigger or async page.

Fix (`tools/harness-template.html`, `tools/shoot.py`):

- The baseline is the listener count after cycle 1 has settled (1700 ms, `?editorSettle=MS`).
  `grew` lists only keys that grow from cycle 1 to the last cycle, with the count after each
  cycle (`per cycle: 2, 3, 4, 5`). That is the signature of a per-load leak.
- The comparison needs two cycles, so the harness runs max(N, 2): PLAN's `?editor=1` runs 2.
  `editorResult` now holds `requested`, `cycles`, `baseline`, `listenersAtLoad`, `perCycle`,
  `firstRegistration` (load -> cycle 1, shown as information and never a leak), `grew`, `stuck`.
- `?trace=1` records each window/document add and remove with the caller's file:line, the time
  and the cycle (`editorResult.trace`).
- `shoot.py` prints an `editor:` line per run, fails the run on each `grew` line (`! leak:`),
  accepts a known one with `--allow-leak REGEX`, writes `leakCount` to console.json, and scales
  the editor wait with N.
- The three kit-proof pages were re-rendered from the fixed template (`kit-proof/render-section.txt`,
  all exit 0).

Proof (`kit-proof/shoot-runs.txt` "Fix round 2", `kit-proof/editor-trace.txt`):

| Run | Listeners after each cycle (`document:visibilitychange:b`) | grew | Exit |
|---|---|---|---|
| counter model `?editor=1&trace=1` | load 1; 2, 2 | none | 0 |
| counter model `?editor=4&trace=1` | load 1; 2, 2, 2, 2 | none | 0 |
| counter model `?editor=2` | 2, 2 (scene booted before load + 800 ms this time) | none | 0 |
| drawer `?editor=4` | no change | none | 0 |
| NEGATIVE `negative/leak.html ?editor=4` (adds one per section:load, never removes) | load 1; 2, 3, 4, 5 | `2 -> 5` | 1 |
| same with `--allow-leak document:visibilitychange` | 2, 3, 4, 5 | allowed | 0 |
| NEGATIVE CONTROL `negative/lazy.html ?editor=1` (lib registers once at load + 1000 ms, scene boots after a 1200 ms async step and cleans up) | load 0; 2, 2 | none (old kit: `0 -> 2`) | 0 |

The trace on the real page names the callers: `gsap-ScrollTrigger.min.js:10` adds once at boot;
`cv-pdp-promises.js:762` (`cvprScene`) adds once per scene; `cv-pdp-promises.js:763` removes it on
every unload before the next scene adds. The INF-3 finding is withdrawn (Findings section).

All first-round shoot proofs were re-run on the re-rendered pages: counter model (13 shots),
counter no-model (9), drawer (21), the rm matchMedia expects (actions-mq.py), editor=2. Every run:
0 page errors, 0 console errors, 0 net errors, 0 failed expects, 0 leaks, exit 0. No theme file
changed, so tc-compare was not affected (last run: PASS, `kit-proof/tc-compare.txt`).

Files changed in this round: `tools/harness-template.html`, `tools/shoot.py`, the three kit-proof
pages, `kit-proof/render-section.txt`, `kit-proof/shoot-runs.txt` (appended), the shot folders
`cv-product-counter/shots-model`, `shots-no-model`, `shots-mq`, `shots-editor`,
`cv-cart-drawer/shots`. New: `kit-proof/editor-trace.txt`, `kit-proof/negative/leak.html`,
`kit-proof/negative/lazy.html`, `cv-product-counter/shots-editor1`, `shots-editor4`,
`cv-cart-drawer/shots-editor4`, `negative/shots-leak`, `shots-leak-allowed`, `shots-lazy`.
The negative pages are built by a scratch script that fills the template markers by hand.

## Open issues (not done)

- `tools/README.md` not written; usage is in each tool's docstring or header comment.
- Negative proofs for `tc-compare.py` (exit 1 on a new offense, `--allow-missing-keys`
  pending) and `schema-validate.py` were not run by INF-V. The regression verifier ran its own
  tc-compare negatives (scratchpad INF-V-verify-regression/negA*, negB*).
- `dash-scan.py` prints through the Windows console code page, so a dash shows as a
  replacement character in captured text; counts and lines are right.
- `?rm=1` changes only script `matchMedia`; CSS `@media (prefers-reduced-motion)` needs real
  emulation (shoot.py `--rm` does both).

## Findings for later tasks (from the first round)

- INF-1 / wave 1: `sections/cv-product-counter.liquid` pre-selects the model
  (`<option value="iPhone 17 Pro Max" selected>`) through `selected_or_first_available_variant`,
  against the owner decision that a model is never pre-selected.
- WITHDRAWN (was sent to INF-3): "the editor=2 cycle shows a document `visibilitychange` listener
  growing 1 -> 2; a script re-adds it on `shopify:section:load` without removing it". There is no
  such leak. The 1 -> 2 was a kit false positive (see Fix round 2): ScrollTrigger adds one listener
  once, and `assets/cv-pdp-promises.js:762` adds one per scene that its cleanup removes at :763.
  The count stays at 2 after every editor cycle (`kit-proof/editor-trace.txt`). INF-3 has nothing
  to fix here.
- INF-3: `assets/cv-pdp-counter-motion.js` has no `shopify:section:load` listener (R2) and uses
  `setInterval` at line 341 (R3).
- motion-lint `--all`: 12 pre-existing errors (5 R2, 2 R3, 1 R5 runtime CDN import, 4 R7) and
  59 R8 opacity:0 flags (`kit-proof/motion-lint-all.txt`).
- render-section.mjs: units list their layout scripts in fixture `harness.js` / `module_js`;
  shared CSS in another file needs `harness.borrow_css` (the drawer CSS is in sections/header.liquid).
- Screenshots are gated by console.json, page errors and expects; they were not reviewed by eye.
