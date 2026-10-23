# INF-5 verify (fix round): correctness and regression

Verifier: independent, did not write the code. Date 2026-10-23.
This replaces the round-1 regression report. That report found 1 blocker: Play did not restart the ribbon after a mouse click.
Files: `assets/cv-pdp-home-motion.js`, `assets/cv-pdp-home.css`, `assets/cv-pdp-slip-motion.js`. They were diffed against HEAD a5a12fc (e5ef095 plus a checkpoint), ignoring CRLF.
The fix round changed only `cv-pdp-home-motion.js` (mtime 04:22). The CSS (03:28) and slip (03:25) files are unchanged since round 1.

## Verdict: PASS (0 blocking)

The round-1 blocker is fixed. Both changes are in `ribbon()`:
- `focusin` sets `state.focus = !btn.contains(e.target)` (line 269).
- Play clears the hover and focus holds (lines 260-265).

I re-checked this with my own action snippet, not the implementer's: scratchpad `INF-5-reg2/ribbon_reg.py`. Output is in `verify/INF-5-regression2/`.

## Re-run acceptance (my runs)

| Check | Result |
|---|---|
| Ribbon at 375/768/1440, with my own snippet | PASS at all 3 widths, 0 page, console or net errors. The band moves on load with `aria-pressed=false`. A real Tab press reaches the toggle and the band keeps moving. Enter pauses (`true`, `is-paused`, still) and Enter plays (`false`, moving). A user pause holds through pointer enter and leave, and through scrolling offscreen and back. A tap-style focus+click on Play restarts the band with focus on the toggle. Pointer hover on the band still holds it. A hidden tab holds it (`aria-pressed` stays false) and a visible tab resumes it. Block select holds and deselect resumes. |
| Section unload (the part of the acceptance about tearing the section down) | ScrollTrigger count 2 -> 0. Toggle, clones and `is-marquee` are removed. |
| Editor reload, 3 unload/load cycles, then 1 click | 1 toggle, 12 clones (same as first boot), ScrollTrigger back at 2. One click pauses exactly once, so the listeners do not fire twice, and the next click plays. |
| `?rm=1` and no-JS on the ribbon, 375/768/1440 | Static: no marquee, no clones, no visible toggle, 3 items readable |
| `?editor=4` at 375 and 1440: ribbon, journey, reel | PASS, grew 0 |
| `?editor=4` on clips | grew 0. The FAIL is only `net::ERR_ABORTED` on the mp4s during the markup swap. This is a known kit artifact, already in `requests/kit.md`. |
| journey, reel, clips: default, `--rm`, `--nojs` at 375/768/1440 | PASS, 0 errors |
| `motion-lint.py` on the 3 files | PASS: 0 errors, 1 flag (R8 `.cvw-ugc__expand` hover affordance) |
| `dash-scan.py` on the 3 files | PASS, 0 shopper hits |
| `node --check` on both JS files | OK |
| `tc-compare.py --allow-missing-keys ../locale-requests` | PASS: 0 errors and 8 warnings, all in the baseline, no new offenses |
| Screenshot `ribbon/default-375.png` checked by eye | The band and a 44 px pause toggle at the right edge |

## Regression hunt (no defect found)

- **Money path:** neither JS file has `fetch`, `cart/add`, checkout, `submit`, `preventDefault` or `dispatchEvent`. They do not call `CasifyPDP`, `CasifyCart` or `CasifyMotion`. `cv-product.js` is not in this task.
- **Loader:** `layout/theme.liquid` still loads `cv-pdp-home-motion.js` (:357) and `cv-pdp-slip-motion.js` (:342) with `defer`. The layout and `theme.css` changed after round 1, but the INF-5 summary does not claim those edits and their script tags are intact. They are not INF-5 files.
- **Untouched files:** no Liquid, schema, template or locale changed, and no setting or block type was removed.
- **Request files:** `locale-requests/INF-5.json` is valid JSON with 1 key and no dashes. Request 4 in `requests/INF-5.md` (a possible double fly once `cv-commerce-motion.js` exists) is not live yet: that file does not exist.

## Minor (not blocking)

1. **A user pause is lost when the viewport crosses 990 px**, for example on a tablet rotation. The `gsap.matchMedia` conditions include `wide` and `hover`. A change reverts the context and re-runs `ribbon()` with `state.user=false`, and the toggle is removed and made again, so keyboard focus drops to the body.
   - Repro: `INF-5-reg2/ribbon_resize.py`, output in `verify/INF-5-regression2/ribbon-resize`. Pause at 768 and resize to 1100, or pause at 1440 and resize to 820. The result is `aria-pressed=false` and the band moving.
   - The announced state stays truthful and one press pauses again. This behaviour already existed in round 1.
   - Possible fix: keep `user` on `root._cvw` so it survives the matchMedia re-run.
2. **Carried from round 1, still latent:** `.cvw-reel__nav { display: inline-grid }` (`cv-pdp-home.css`) overrides the `hidden` attribute. U5.12 is asked to print the buttons `hidden`. Add `.cvw-reel__nav[hidden] { display: none; }` before then. No section prints the hooks yet.
3. **Untested code paths:** no section prints `data-cvw-reel-prev/next`, `data-cvw-pin` or `data-cvw-ribbon-pause`, so those paths are untested until U5.12, U2.4 and U2.x land. The ribbon fixture has no focusable content, so the "focus on ribbon content holds" path is also untested.
4. **Behaviour to know about:** after Play, the hover hold returns only when the pointer leaves the ribbon and comes back. So the band moves under a pointer resting on it. This is what the fix intends.
5. **Process:** the PLAN acceptance page `harness/inf-5-pdp-home-preview.html` was never built. The per-section pages in `harness/inf-5-verify/` cover the same four fixtures.
