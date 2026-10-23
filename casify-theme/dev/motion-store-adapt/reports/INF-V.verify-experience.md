# INF-V verification, fix round 2: experience lens (motion, accessibility, honesty)

Verifier: independent, did not write INF-V. Date 2026-10-23. No theme files edited.
Evidence: `dev/motion-store-adapt/verify/INF-V-experience-r3/` (model.txt, drawer.txt, model-editor.txt,
probes.txt, model-crash-parallel.txt, shots-*/console.json, pages/*.html, reel/).
Scratch scripts: scratchpad `INF-V-verify-exp3/build.py` (probe pages), `focus.py` (drawer Tab probe).
This replaces the round-1 experience report of the same name.

## Verdict: FAIL (1 blocking defect: the new leak gate fails clean code that cleans up with AbortController)

### Fixed and confirmed by my own runs

- Round-1 blocking item (false `visibilitychange` leak): fixed. `model.html ?editor=1&trace=1` gives
  first registration `1 -> 2`, grew 0, PASS, exit 0. `?editor=4` gives grew 0, PASS, exit 0.
  `negative/leak.html ?editor=1` now runs 2 cycles and fails, `2 -> 3`, exit 1. My async per-load leak
  probe (`pages/async-leak.html`, registers 700 ms after each load) is caught: `2 -> 5 (per cycle: 2, 2, 3, 5)`, exit 1.
- reports/INF-V.md withdraws the INF-3 finding, names the callers, and the trace agrees
  (`cv-pdp-promises.js:762` adds, `:763` removes).
- Counter (13 shots) and drawer (21 shots) with `--rm --nojs` and the kit actions: 0 page, console or net
  errors, 0 failed expects, PASS, exit 0. Reduced motion keeps the add result as text and colour
  ("In your bag" in teal, "2 cases added to your bag.", `rm-375-after-add.png`, `rm-1440-after-add.png`).
  No-JS shows every word, price and control (`nojs-375.png`). No horizontal scroll or clipped text at 375.
- No U+2013 or U+2014 in tools/, kit-proof/ or reports/INF-V.md, apart from two lines that name the
  characters as documentation (`dash-scan.py:9`, `INF-V.md:14`).

### Blocking

1. **`?editor` reports a leak, and shoot.py exits 1, for listeners that were removed by an
   AbortController signal or that fired with `{ once: true }`.** `harness-template.html:85-96` only
   removes a listener from its count when `removeEventListener` is called. `controller.abort()` and a
   fired `once` listener remove it in the browser without that call, so the count grows every cycle.
   Before this round the result was information only. Now shoot.py:216-225 turns it into a failed run.
   - Repro: `python shoot.py ../verify/INF-V-experience-r3/pages/signal.html --out <dir> --only default
     --widths 375 --no-scroll --query editor=4`. The page adds one `document` `visibilitychange`
     listener per load with `{ signal }` and calls `abort()` on unload, so the real count stays flat.
     The kit prints `! leak: document:visibilitychange:b 2 -> 5 (per cycle: 2, 3, 4, 5)`, FAIL, exit 1.
     `pages/once.html` (a `once` listener for `shopify:section:select` that fires in the same cycle):
     `! leak: document:shopify:section:select:b 1 -> 4`, FAIL, exit 1 (`probes.txt`).
   - Real theme code uses this pattern on `document`: `assets/cv-reel-showcase.js:28-39` (`listen` with
     `this._abort.signal`), `:64` (`document` `visibilitychange`), `:95` (`document`
     `shopify:block:select`), cleaned up by `abort()` at `:190`. Once a unit renders that section with slides
     and runs PLAN 5.7 `?editor=1`, the kit sends it after a leak that does not exist. That is the same
     false lead this round withdrew from INF-3.
   - Fix: in the add wrapper, when `opts.signal` is set, skip the add if it is already aborted, and
     otherwise delete `fn` from the set on the signal's `abort` event. When `opts.once` is set, also
     register a companion once listener with the same type and capture that deletes `fn` when it fires.
     Add `signal.html` and `once.html` as negative controls next to `leak.html` and `lazy.html`.

## Minor

- The editor check does not see ScrollTrigger or `gsap.matchMedia` leaks. `pages/st-leak.html` creates
  one ScrollTrigger and one matchMedia context per load and never kills them.
  `ScrollTrigger.getAll().length` goes 1, 2, 3, 4, 5 (`shots-st-leak/console.json` calls), but the kit
  reports grew 0, PASS. My lens asks for ScrollTrigger cleanup on unload, so add
  `ScrollTrigger.getAll().length` (when present) to each `perCycle` entry and flag its growth the same way.
- The kit has no focus or inert check. With `focus.py` on `kit-proof/cv-cart-drawer/drawer.html` at 375,
  the closed drawer has `aria-hidden="true"` but is not `inert`, and Tab reaches Close, the product link,
  quantity, Checkout and View bag while it is closed and offscreen. INF-2 already owns this fix
  (PLAN:215, `map/cv-cart-drawer.md` finding 7). The kit-proof drawer run still shows PASS. A
  "Tab while closed must not land inside" helper for actions snippets would let INF-2 prove the fix.
- `shoot.py:167` (full-page screenshot) is still not wrapped. Run next to another shoot.py, the counter
  run timed out at 30 s and crashed with a traceback and no console.json (`model-crash-parallel.txt`).
  It exits 1, so it fails safe. Run alone, it passed.
- After-add shots still catch the fly token in mid-flight (`default-375-after-add.png`): `actions-counter.py`
  waits 900 ms but the flight takes about 1.26 s.
- Full-page 375 shots draw the fixed sticky buy bar over "+1000 Happy Customer / 4.9 / 5" (`nojs-375.png`).
  This is a capture artifact, but a reviewer has to rule it out by hand.
- `editorResult.stuck` still does not change the exit code. PLAN 5.7 asks for "no stuck opacity".
- The drawer no-JS shots are blank (the drawer is closed offscreen and the harness has no trigger), so
  they prove nothing about the no-JS bag path.
- Still open, as the implementer reports: `tools/README.md` is missing, and `render-section.mjs:15`
  points to it. No tool checks the DESIGN.md durations (160/240/420 ms). `?rm=1` alone does not affect
  CSS `@media`.

## Theme observations (not INF-V defects, still open for their units)

- The model is pre-selected as "iPhone 17 Pro Max" on the counter (no-JS model select, case 1 and case 2).
  This goes against the owner decision.
- Unbacked claims render on the counter: "+1000 Happy Customer", "4.9 / 5, 952 reviews", the "$59.99"
  reference price, "17% OFF" and "YOU SAVE $10.00". Per Q1 each should be a per-claim setting, OFF by default.
- The closed cart drawer can be focused (see above, INF-2).
