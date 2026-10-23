# INF-0 verify, fix round 3 (experience lens: motion quality, accessibility, honesty)

Verifier: independent, did not write the code. Date 2026-10-23. Baseline: HEAD (a5a12fc on e5ef095).
Verdict: **FAIL, one small item.** The round-2 blockers are fixed and verified on screen: (a), (b), (c), (e), (f) and
the safety net all pass. What is left is acceptance (d) for `.cv-callout`: with reduced motion it is still hidden for
0.4 to 0.8 s at widths above 560 px. The fix is one CSS line.

## What I ran (outputs in verify/INF-0-experience-r3/)

- `shoot.py verify/INF-0-experience-r2/ok.html --rm --nojs --actions` at 375, 768 and 1440 (`ok/`). The page copies
  the real inline layout script.
- `shoot.py .../broken.html --widths 375,1440 --rm --nojs --allow-net __missing --allow-console "404|Failed to load"`
  (`broken/`). theme.js and cv-motion.js return 404 on this page.
- `shoot.py harness/inf-0-verify/inf-0-verify.html --rm --nojs --actions` at 375, 768 and 1440 (`harness/`).
- `shoot.py verify/INF-0-regression-r2/inf-0-r2-layout.html --rm --nojs --actions` at 375, 768 and 1440
  (`rg-layout/`). Result: PASS on all 9 runs, which covers (c), the cloned section plus `shopify:section:load`.
- Editor leak check `inf-0-verify.html --query editor=4 --only default --widths 375 --no-scroll`: PASS, 0 growth,
  0 stuck nodes.
- Direct Playwright probes of the callout (scratchpad `INF-0-xp/callout.py`, `callout2.py`, `callout3.py`).
- `dash-scan.py` on the 4 files: 0 shopper hits. `liquid-balance.py layout/theme.liquid`: PASS.
  `node --check` on theme.js and cv-motion.js: OK.
- Screenshots I opened: `ok/nojs-375.png`, `ok/default-375-toasts.png`, `ok/default-1440.png`,
  `broken/default-375.png`, `rg-layout/rm-375.png`.

## Blocking

1. **(d) fails for `.cv-callout`: reduced motion does not show it instantly at widths above 560 px.**
   `assets/theme.css:1656` gives `:where(.js) .cv-callout` an animation with
   `animation-delay: calc(var(--cv-i,0)*140ms + 400ms)` and fill `both`. The reduce block at `:3341-3347` shortens
   `animation-duration` to .001ms but keeps the delay. No reduce rule covers `.cv-callout`: the list at `:3275-3281`
   does not include it.
   - Repro with the direct probe, emulated reduce at 768 and 1440: opacity is 0 at 50 ms and at 300 ms, and the
     transform holds the keyframe start `matrix(0.96,0,0,0.96,0,8)`. At 700 ms it snaps to opacity 1.
   - The implementer's own harness agrees: `harness/inf-0-verify` gives "(d) rm 768: not instantly visible:
     ['callout']" and "(d) rm 1440: ...". The fix-round run passed only because it skipped 768 and the 1440 read
     landed after 400 ms.
   - PLAN acceptance (d) names `.cv-callout` in the harness and requires "everything visible instantly".
   - Shopper impact is small: the callout appears late and nothing moves. Still, it fails a stated acceptance test.
   - Fix: add `.cv-callout { animation: none; opacity: 1; }` inside a reduce block that comes after `:1656`, for
     example next to `.cv-search__chip` in the list at `:3275-3281`. Its specificity matches the `:where(.js)` rule and
     it comes later, so it wins.

## Passing (verified)

- **(b) Reveals play.** Every JS-on ok.html run probes at DOMContentLoaded (DCL) as `dclClass "js"`,
  `cvReady true`, `revealReady true`. The below-fold reveal sits at opacity 0 with 0.42 s transitions before
  scrolling, and `class2600` is "js", so the timeout never fires. theme.js:184-189 sets the flag after `reveal(document)`.
- **(a) No JS.** All content is visible at 375, 768 and 1440: split heading, the 5 reveal variants, cm, the 4 chips,
  callout, halo and the below-fold reveal. In `ok/nojs-375.png` the chips are readable and the red "All" chip is
  intact. `.no-js [data-cv-scroll-to-buy]` hides the `<button>`s. They are buttons in all 6 live sections, so hiding
  them is correct.
- **Safety net.** With the engines 404ing, `broken/default-375.png` shows every reveal, the chips and the halo copy.
  The only failed expects there are the actions file's (b) and (e) checks, which assume the engines loaded.
- **(e)** With JS on, scroll-to-buy computes `display: none`.
- **(f)** Danger toast: border rgb(196,48,43), title rgb(168,35,31), `role="alert"`. Success toast: teal
  rgb(108,158,156), `role="status"`. Results match at every width and with reduced motion. On screen at 375, red and
  teal are clearly distinct and the icons differ (circle-bang against check), so colour is not the only cue.
- **(d)** All other nodes (cv, cm, halo, split words, chips, count) read opacity 1 with `transform: none` at 250 ms.
- **Layout.** No horizontal scroll at 375 in any run. 0 page errors and 0 console errors on ok.html and the harness.
- **Focus.** The global `:focus-visible` 3px ring (theme.css:113) applies to the chips. DOM order matches visual order.
- **Honesty.** The `$40` awning claim is gone. The legacy "only N left" scarcity code in `bindLegacy()` has no live
  markup (`#stockRow` appears in no section), so it never renders.
- **Halo.** `:where(.js:not(.cv-reveal-timeout):has(.halo-tpl))` is safe. Browsers without `:has()` drop the selector
  from the forgiving list, so the copy shows. `.halo-tpl` only exists in halo-closer, and halo.js returns early without it.
- **No double animation.** INF-0 adds no GSAP, and the reveals are CSS transitions toggled by a class.

## Minor

1. The callout delay above also applies to `.cm-stagger-cm > *` and `.halo-stagger > *`: under reduced motion they
   are hidden for up to 420 ms. These are not on the INF-0 item 2 list.
2. When cv-motion.js fails but the page JS runs, scroll-to-buy buttons stay visible and do nothing
   (`broken/default-375.png`). The implementer already logged this as an edge case.
3. Toasts: `#cm-toast-host` has no persistent `aria-live`. Each toast is inserted already filled, so some screen
   readers skip the `role="status"` toast. The danger toast auto-dismisses after 4 s with no way to keep it
   (WCAG 2.2.1). This was reported before and is not new.
4. `animateCount` writes intermediate numbers into live text during the count-up, so screen readers can catch a
   partial value. Consider `aria-hidden` on the animating text with an `aria-label` holding the final value.
5. Some timings are off the DESIGN.md 160/240/420 scale: chips 400 ms, `.cv-method` 460 ms, split words 500/560 ms,
   `.cv-clip` 540 ms. These are pre-existing values that were only moved under scope.
6. The live reduced-motion switch leaves `[data-halo-reveal]` below the fold without `.is-revealed`. It is visible
   through the CSS `!important` rule. halo.js is not an INF-0 file, and the gap is already in requests/INF-0.md.

## Kit notes (not blocking, appended to requests/kit.md)

- Root cause of the `.cv-callout` "invisible" reading in default runs at 768/1440: Playwright's full-page screenshot
  restarts CSS animations, and shoot.py runs `--actions` after it. Direct probes show the callout finished at opacity 1.
- `--allow-console` already exists in shoot.py.
- The harness live reduced-motion expect checks the class instead of opacity, so its result changes between runs.
