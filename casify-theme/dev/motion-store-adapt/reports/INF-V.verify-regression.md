# INF-V verify (fix round 2): correctness and regression lens

Verifier: independent, did not write the kit. Date 2026-10-23. Round 3 of this report (the kit's fix
round 2: the `?editor` listener baseline and the withdrawn INF-3 finding). This file replaces the
previous round's report at the same path.

Verdict: **PASS**. The fix does what it says, and I reproduced it. The kit no longer reports the
cv-product-counter `visibilitychange` false leak. It still catches a real per-load leak, including
a slow async one and a `window` capture one, with `?editor=1`. I found no new blocking defect.

There is one new coverage gap, and it comes from the baseline design my previous round suggested.
A scene created at page boot that is never cleaned up now passes. In the editor, that leaves one
duplicate listener set after the first reload. See Minor 1. Fix it before INF-0, INF-3 or the motion
units treat a `?editor=1` exit 0 as proof of PLAN 5.7 "leaves one set of listeners".

Evidence: `C:/Users/LENOVO/AppData/Local/Temp/claude/D--etsy-vinreport/b84b29f8-4341-428e-b13f-6902ba20cbc3/scratchpad/INF-V-verify-regression-r3/`
(runs-a.txt, runs-b.txt, runs-c.txt, tc.txt, build.py, one folder with console.json per run).
Verifier pages: `dev/motion-store-adapt/verify/INF-V-regression-r3/` (slowleak, slowclean,
windowleak, wrapguard, bootleak .html, built from the current template by build.py).

## Scope

- Theme files: none changed. `git diff HEAD --stat` on layout, sections, snippets, templates, locales,
  config, blocks and assets prints nothing. No file outside `dev/motion-store-adapt/` is newer than
  the round 2 experience report, either in the theme or in its parent folder. HEAD is `e5ef095` on
  `feat/motion-store-adapt`.
- `dev/motion-store-adapt/` is untracked, so I read the changed tools in full:
  `tools/harness-template.html` (190 lines) and `tools/shoot.py` (263 lines). I also read the
  negative pages and their builder, editor-trace.txt, the "Fix round 2" part of shoot-runs.txt, and
  the Fix round 2 and Findings sections of reports/INF-V.md.
- The kit-proof pages (model.html, no-model.html, drawer.html, negative/leak.html, negative/lazy.html)
  carry all three harness scripts byte for byte from the current template, with no `%%` marker left.
- No en or em dash characters in harness-template.html, shoot.py, editor-trace.txt, shoot-runs.txt,
  the negative pages or INF-V.md. The only hit in INF-V.md, line 14, is the literal tool
  description `&ndash;`/`&mdash;` in code format.

## Re-run results (run by me, 1440 px, `--no-scroll`)

| Page and query | Result | Exit | Expected |
|---|---|---|---|
| model.html `editor=1&trace=1` | runs 2 cycles, grew 0, first registration `visibilitychange 1 -> 2` (info) | 0 | 0 |
| model.html `editor=1` | same | 0 | 0 |
| model.html `editor=4` | grew 0 | 0 | 0 |
| model.html `editor=4` with `--rm --only rm` | grew 0 | 0 | 0 |
| no-model.html `editor=2` | grew 0 | 0 | 0 |
| drawer.html `editor=4` and bare `editor` (runs 2) | grew 0 | 0 | 0 |
| negative/leak.html `editor=1` | leak `2 -> 3 (per cycle: 2, 3)` | 1 | 1 |
| negative/leak.html `editor=4` | leak `2 -> 5 (per cycle: 2, 3, 4, 5)` | 1 | 1 |
| leak.html `editor=4 --allow-leak document:visibilitychange` | allowed 1 | 0 | 0 |
| leak.html `editor=4 --allow-leak window:resize` (wrong regex) | still fails | 1 | 1 |
| leak.html with no editor in the query | no editor line, no leak gate | 0 | 0 |
| negative/lazy.html `editor=1` and `editor=4` | first registration `0 -> 2`, grew 0 | 0 | 0 |
| verify slowleak.html `editor=4` (leak lands 800 ms after each load, longer than the 500 ms gap) | leak `2 -> 5` | 1 | 1 |
| verify slowleak.html `editor=1` | leak `2 -> 3` | 1 | 1 |
| verify slowclean.html `editor=4` and `editor=6` (token-guarded 800 ms async boot on every load) | grew 0 | 0 | 0 |
| verify windowleak.html `editor=1` (`window` resize, capture) | leak `window:resize:c 2 -> 3` | 1 | 1 |
| verify bootleak.html `editor=1` and `editor=4` | grew 0, PASS | 0 | **1** (Minor 1) |
| verify wrapguard.html `editor=4` | grew 0, PASS | 0 | 1 in the real editor (Minor 2, open from round 1) |
| leak.html `editor=2&editorSettle=9000` | "editor cycle did not finish", FAIL | 1 | 1 for the wrong reason (Minor 3) |

model.html `editor=1` console.json `editorResult` has requested 1, cycles 2, baseline "after cycle 1",
listenersAtLoad, listenersBefore, listenersAfter, perCycle (2 entries), firstRegistration, grew [],
stuck [] and trace (60 entries). `leakCount` is 0.

Static tools on the current theme:

| Check | Result |
|---|---|
| `python tc-compare.py` | 0 errors, 8 warnings, all 8 known by (file, check), no new offenses, PASS, exit 0 |
| `python schema-validate.py` | 95 section, 3 block, 26 templates/groups, 0 errors, PASS |
| `python liquid-balance.py` | 137 files, 0 unbalanced, PASS |
| `python dash-scan.py --check-7g --quiet` | 7g counts match, PASS |

## Was the INF-3 finding withdrawn correctly?

Yes. My own trace matches editor-trace.txt. ScrollTrigger adds one listener at boot. `cvprScene`
(`assets/cv-pdp-promises.js:762`) adds one per scene, and `:763` removes it on every unload before the
next add. The count stays at 2 for every cycle. reports/INF-V.md marks the finding WITHDRAWN with these
callers, and the open-issues list says the same. INF-3 has nothing to fix here.

## Blocking

None.

## Minor

1. **A scene made at page boot that is never cleaned up now passes `?editor` (new false pass for
   PLAN 5.7).** Repro: `verify/INF-V-regression-r3/bootleak.html`. The boot-time scene is not tracked,
   so unload never removes it. Scenes made by `shopify:section:load` are tracked and destroyed. In the
   real editor this leaves a duplicate set after the first reload, so a listener fires twice for the
   rest of the session. The trace shows add at 25 ms (boot), add in cycle 1, then remove plus add in
   cycle 2, so the count goes 1 at load and 2, 2 after the cycles. shoot.py prints `grew 0` and exits 0.
   The old kit flagged this as `1 -> 2`.
   - The info line, `first registration: document:visibilitychange:b 1 -> 2`, is word for word the
     same as the benign cv-product-counter line. A reader cannot tell the two apart without `trace=1`.
   - Cause: the baseline is taken after cycle 1 (`harness-template.html:170`), so anything cycle 1
     leaves behind becomes the baseline.
   - Impact is limited to the merchant in the theme editor: storefront pages never fire
     section:load. That is why I did not mark it blocking. It is still the exact bug class PLAN 5.7
     asks the harness to catch.
   - Suggested fix: start cycle 1 only after a settled boot (load + `editorSettle`, not load +
     800 ms), and take a "settled load" snapshot just before it. Keep the current cycle 1 to N rule.
     Also fail, with `--allow-leak` as the escape, on growth from the settled-load snapshot to cycle N.
     With a 1700 to 2500 ms settle, the cvprScene registration (about 1.64 s) and lazy libraries land
     before the snapshot, so the false positive does not come back. Starting cycles late is also
     closer to the real editor, where a merchant edit comes seconds after boot. Add bootleak.html as
     a kit negative.
2. **Still open from round 1: `?editor=N` swaps `innerHTML` inside the same wrapper
   (`harness-template.html:125`).** Shopify replaces the whole `.shopify-section` element. Repro:
   `verify/INF-V-regression-r3/wrapguard.html` guards init with `dataset.inited` on the wrapper and
   never cleans up. In the real editor it would add a listener on every reload. In the harness it
   reads `grew 0` with `editor=4`, a false pass. Fix: replace the wrapper with a fresh element built
   from the pristine outerHTML.
3. **shoot.py does not take `?editorSettle` into account in its wait (`shoot.py:152-154`).** The
   timeout is `15000 + cycles * 700`. The harness needs about `800 + 2 * editorSettle + 500 * (N - 2)` ms
   after load. With `editor=2&editorSettle=9000`, shoot.py reports "editor cycle did not finish" and
   exits 1 on a page whose cycles would have finished. Any settle above about 8.7 s fails this way. It
   fails loudly, not as a false pass. Fix: parse `editorSettle` the same way `editor` is parsed and add
   it to the timeout.
4. Only the cycle 1 count and the last count are settled. The middle `perCycle` entries are read
   500 ms after a reload, so a slow async boot shows misleading middle values. slowleak.html reads
   `2, 2, 3, 5`. The verdict uses only the first and last counts, so this is cosmetic, but the template
   header should say it.
5. Unchanged from earlier rounds:
   - `tools/README.md` is still missing, and `render-section.mjs:13` still points to it. The kit
     reports this as not done.
   - INF-V's own negative proofs for tc-compare.py and schema-validate.py are not done.
   - The shoot.py docstring does not say that an expected 404 needs `--allow-console "Failed to load
     resource"` as well as `--allow-net`.
   - Under `?rm=1`, `matchMedia(q).media` returns the rewritten query.
   - The `stuck` list is reported but never fails a run (documented).
6. Carried findings for other units: I did not re-verify these in this round, and they are unchanged
   in the report. cv-pdp-counter-motion.js R2/R3 goes to INF-3. The cv-product-counter model
   pre-selection through `selected_or_first_available_variant` goes to INF-1/wave 1. The
   cv-guarantee.liquid dashes go to a later unit.
