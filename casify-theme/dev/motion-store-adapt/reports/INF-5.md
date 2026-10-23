# INF-5: PDP home motion

Files: `assets/cv-pdp-home-motion.js`, `assets/cv-pdp-home.css`, `assets/cv-pdp-slip-motion.js`.
Round 1 (lifecycle per section root, ribbon pause toggle, offscreen pauses, journey pin from `data-cvw-pin`
with a narrow batch path, reel prev/next support, pending-pattern start states, slip lifecycle) ended on the
time box without a report. The verifiers (`reports/INF-5.verify-experience.md`,
`reports/INF-5.verify-regression.md`) each found one blocking defect, the same root cause, fixed below.
Requests outside INF-5's files: `requests/INF-5.md`. Locale key: `locale-requests/INF-5.json`.

## Fix round

### Defects (both verified before the fix)

1. Mouse click on Play left the band still while `aria-pressed="false"`. A click focuses the toggle, and the
   `focusin` listener set `state.focus = true` for any focus inside the ribbon, toggle included.
2. Play did not restart while the pointer or focus was on the toggle: `moving()` needs `!state.hover &&
   !state.focus`, and the toggle sits inside the root, so a click always set focus (and hover for a mouse).

Repro before the fix: `scratchpad/INF-5/ribbon_actions.py` failed "marquee resumes after play click" at 375
and 1440 (`verify/INF-5-regression/ribbon`), and `scratchpad/INF-5-xp/probe.py` showed the band still for
500 ms after Play.

### Root cause fix (`assets/cv-pdp-home-motion.js`, ribbon())

- `focusin` now sets `state.focus = !btn.contains(e.target)`: focus on the toggle itself is never a hold, so
  its `aria-pressed` is the true state for keyboard and tap users. Focus on ribbon content still holds.
- Pressing Play (`state.user` back to false) also clears `state.hover` and `state.focus`. The passive holds
  return only when the pointer re-enters the ribbon or focus moves to ribbon content.

No CSS, slip or markup contract change.

### Proof (all from `dev/motion-store-adapt/tools`, harness `harness/inf-5-verify/ribbon.html`, rendered from the real section)

| Check | Result |
|---|---|
| Original repro `ribbon_actions.py`, 375 + 1440 (`verify/INF-5-fix/ribbon-orig`) | PASS (was FAIL) |
| Verifier probe `INF-5-xp/probe.py`, 375 + 1440 | Play with focus on toggle: moving True, `is-paused` cleared; hover still holds; hidden tab holds and resumes; unload ST 2 to 0, toggle removed, no errors |
| New snippet `scratchpad/INF-5-fix/ribbon_fix_actions.py`, `--rm --nojs`, 375/768/1440 (`verify/INF-5-fix/ribbon`) | PASS, 9 runs, 0 errors. Covers: moves on load; mouse pause then Play with focus kept on toggle; pause then Play with the pointer still on the toggle; hover on band still holds and resumes on leave; keyboard focus on the toggle does not hold, Space pauses (`aria-pressed=true`), Space plays; unload removes clones, made toggle, marquee class, ScrollTrigger 2 to 0. rm and nojs: no marquee, toggle not shown |
| Editor leak `?editor=4` at 375 (`verify/INF-5-fix/ribbon-editor`) | PASS, 4 cycles, grew 0 |
| `motion-lint.py` on the three files | PASS, 0 errors, 1 flag (existing `.cvw-ugc__expand` hover affordance) |
| `dash-scan.py` on the three files | PASS, 0 shopper hits |
| `tc-compare.py --allow-missing-keys ../locale-requests` | PASS, no new offenses vs 0 error / 8 warning baseline |
| `node --check` | OK |

Two failures in the first run of the new snippet were snippet bugs, not theme defects: the band box starts
at x = -24 (hover point now clamped into the viewport), and the original markup has three
`li.cvw-ribbon__sep[aria-hidden]` separators (clone count now uses `li[inert]`).

Screenshot looked at: `verify/INF-5-fix/ribbon/default-375.png` (band and pause toggle at the right edge).

### Not covered this round

- The fixture ribbon has no focusable content, so "focus on ribbon content holds the band" was skipped
  (snippet step F runs when such content exists).
- Journey, clips and reel were not re-run: the fix touches only ribbon(). The verifiers' runs on them
  (editor leak grew 0) stand.
- A merged `harness/inf-5-pdp-home-preview.html` was not built; the per-section pages in
  `harness/inf-5-verify/` were used.
