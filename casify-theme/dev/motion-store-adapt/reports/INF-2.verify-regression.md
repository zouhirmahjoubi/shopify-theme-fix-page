# INF-2 independent verification: correctness and regression (fix round 2, double tap guard)

Verifier: independent (did not write INF-2). Lens: correctness and regression.
Diffed against HEAD `a6d0582` on `feat/motion-store-adapt`. No theme file was edited.
My artifacts: `verify/INF-2-verify-regression-r2/`, probe `harness/inf-2-verify-regression-r2/probe.py`.
(This file replaces the round 1 regression report, which passed; its minor items 1 to 7 still stand.)

## Verdict: PASS

The double tap defect is fixed. A second tap on Remove, or on '-' at qty 1, no longer removes the
line beneath it or sends a second remove that ends in a false danger toast. Nothing regressed. The
money path is unchanged: the `/cart/add.js` payload, the `/cart/change.js` body `{id, quantity, sections}`
and the drawer checkout form all match round 1. The new guard only decides whether a change is sent.

## Scope checked

- Theme files changed this round: only `assets/cart.js`. Its mtime is the only theme file newer
  than the round 1 regression report. The other INF-2 files have not changed since round 1 was verified.
- `diff --strip-trailing-cr assets/cart.js harness/inf-2/tmp/neg/cart-noguard.js`: the negative
  control differs by exactly the two guard lines (`if (removing[key]) return false;` and
  `if (Date.now() < lineLockUntil) return false;`), so it is a fair negative.
- `assets/cart.js` read in full. The guard (lines 197 to 256):
  - `removing[key]` is set when qty is 0. It is cleared in the last `.then` of `sendLine`, after
    `applyDrawer` runs, so a tap is never accepted between the repaint and the lock.
  - The 400 ms `lineLockUntil` is set in `applyDrawer` only when lines are added or removed in the open drawer.
  - `sendLine` ends with a two-handler `.then`, so it never rejects and `lineQueue` cannot stall.
  - Lines outside the drawer take the reload branch before the lock check, so `/cart` lines are unaffected.
- Events and public API: none removed or renamed. `cart:drawer:refreshed` detail fields are unchanged.
  `lineChange` returns `false` only for ignored input, and the change handler reverts the input
  (to `0` when the line is being removed, otherwise to the server `data-qty`).

## Acceptance re-run (my runs, harness rebuilt with `node harness/inf-2/build.mjs`)

| Run | Result |
|---|---|
| `actions-dbltap.py`, `--query latency=L` for L = 0, 60, 120, 190, 210, 300, 450 | PASS, 0 failed expects each |
| `actions-dbltap.py`, latency 900 | 3 double tap cases PASS. The "two deliberate removes" control FAILS (see minor 1, test timing, not a code defect) |
| Negative control `tmp/neg/preview-noguard.html`, latency 120 / 300 | FAIL, 7 expects each (both lines gone, count 0 / a second 400 call and the "no such line" danger toast). The test catches the defect |
| `actions.py --rm --nojs --widths 375,1440` | PASS, 6 runs, 38 shots, 0 errors |
| `actions-fail.py ?fail=1` | PASS, 4 runs |
| `actions-ooa.py ?openonadd=1` | PASS, 4 runs |
| `?editor=4` theme editor reload check | PASS, 4 cycles, 0 listener growth |
| `dbltap ?fail=1&latency=300` (my extra) | Each double tap sends ONE 422 call (the second tap is blocked). The lines stay and busy is 0. The danger toast is the real failure. Right behaviour, and the dbltap expects do not apply in fail mode |

I opened `dbl-120/default-375-dbl-remove-top.png`. One line is left, iPhone 17 Pro Max (41001),
and Subtotal and Total both read $49.99. The tapped top line (41002) is the one that went.

My probe (`probe.py`, latency 120 and 900): none of these cases gave a danger toast or left a line
stuck busy.
- A. Remove the top line, then 300 ms later deliberately Remove the other line.
- B. At qty 2, tap '-' twice at one point. This sends qty 1, then qty 0, and the line goes. That
  matches two deliberate decrements.
- C. Remove, then '+' on the other line at 250 ms.
- D. Type 0 and Enter, then type 3 and Enter on the other line 150 ms later.
- E. Remove, wait for the repaint, then Remove again 900 ms later. Both lines go.

At latency 900, cases A, C and D apply both actions in order through `lineQueue`.

## Static checks (my runs)

- `node --check assets/cart.js`: OK.
- `dash-scan.py assets/cart.js`: PASS, 0 shopper hits. `motion-lint.py assets/cart.js`: PASS, 0 errors, 0 flags.
- `tc-compare.py --allow-missing-keys ../locale-requests`: PASS, no new offenses. The only extra
  rows are TranslationKeyExists for `general.cart.*` / `general.quick_pick.*`, which are listed in
  `locale-requests/INF-2.json` (LOC-1).

## Minor (not blocking)

1. `harness/inf-2/actions-dbltap.py` control 1 ("two deliberate removes", 1200 ms apart) passes only
   while stub latency + 400 ms < 1200 ms. At latency 900 the second click lands 300 ms after the
   repaint and the lock drops it. So the report's claim that "deliberate input keeps working" was
   proven for latency up to about 800 ms, not in general. Measure the gap from the repaint
   (`wait_for_function` on the line count, as probe case E does).
2. Input dropped by the lock gets no feedback (`assets/cart.js:216`). With a fast server (latency 120),
   probe cases A, C and D show this: a deliberate Remove, a '+', or a typed 3 + Enter on a DIFFERENT line
   inside 400 ms of a repaint is dropped. The typed value reverts to the server quantity. The shopper
   has to act again. That is the stated design (open issue 2 in the report) and costs one extra tap.
   If it matters, limit the lock to the controls at the old tap position, or keep
   `aria-disabled` on the controls during the lock.
3. A line removed in the drawer while a newer drawer refresh (from `cart:refresh`, `cv:cart` or
   `cart:added`) is in flight: `sendLine` falls back to `refreshNow(false)`. If that refresh is
   superseded too, `removing[key]` is cleared before the drawer that still shows the line is repainted,
   so a tap in that gap could post a change for a key that no longer exists. That would show the real
   400 toast once. I could not reach this from shopper taps, because `lineQueue` serializes line
   changes. Code read only.
4. Leftover from round 1: when the refresh after a failed change also fails (offline), the line
   stays dimmed (`aria-busy`). This is open issue 4 in the report and is unchanged.
5. `harness/inf-2/tmp/neg/cart-noguard.js` is a dev-only copy of cart.js under `dev/`, which is never uploaded.
   Delete it once the fix is committed, if a stale copy is unwanted.
