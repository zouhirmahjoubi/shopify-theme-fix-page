# INF-3 verify, fix round 2 (correctness and regression), 2026-10-26 03:20

Verdict: **PASS**. I found no blocking defect in the task's own files. Fix round 2 changed only the harness (`harness/inf-3/actions.py`). The theme files are byte-identical to the round I checked at 02:48: `cv-commerce-motion.js` 12219 B (02:17), `cv-commerce-motion.css` 2572 B (02:14), and the `cv-header.js` and `layout/theme.liquid` diffs vs HEAD are unchanged.

Files under review (`git diff HEAD`): `assets/cv-commerce-motion.js` (new), `assets/cv-commerce-motion.css` (new), `assets/cv-header.js` (+38/-2), `layout/theme.liquid` (2 literal slot tags and their comment). No other file in assets, sections, snippets, blocks, layout, locales, config or templates changed. `assets/AGENTS.md` is an untracked code-map file and is not part of this task.

## Runs this round (outputs in `harness/inf-3-verify-regression/r4/`)

| Check | Result | Evidence |
|---|---|---|
| tc-compare.py `--allow-missing-keys ../locale-requests` | PASS | `no new offenses`, `tc-compare: PASS`. The 8 baseline warnings are unchanged. All 41 listed errors are TranslationKeyExists for keys in the locale-request files. No offense in `layout/theme.liquid` (the old UndefinedObject is gone). `r4/tc-compare.txt` |
| motion-lint.py | PASS | 4 files, 0 errors, 0 flags |
| dash-scan (3 JS/CSS files), liquid-balance (theme.liquid) | PASS | 0 shopper hits, 0 unbalanced |
| Editor reload `?editor=4` | PASS | 4 cycles, grew 0, stuck 0. The fixture includes the fake header, so the cv-header re-init and the `CasifyBag` re-point are exercised. `r4/shoot-editor.txt` |
| Fly, MotionPath, 375 (new actions file) | Frames OK, run stalled | `r4/shots-default/fly-mp-default-375-{1,2,3}.png` show the card token with the `×2` badge. Then shoot.py stalled twice right after frame 3, once with tracing and once with tracing off (`actions-notrace.py`), until `timeout` killed it. Other verifiers' shoot runs were going at the same time. Logged in `requests/kit.md`. This is not blocking: the same theme code passed the full suite below. |
| Full suite on the identical theme code (my 02:43 to 02:45 runs, after the last theme edit at 02:17) | PASS | `r2/shoot-default.txt`: default and rm at 375/768/1440, 0 page, console or net errors, 0 failed expects. `r2b`: nomp, nogsap and editor all PASS. Real Shop Counter add with stubbed fetch: `cvc:1, cvm:0, cvs:0`, a single `cart:added` (`pdp`), and a no-model press gives 0 tokens plus `cvs:needmodel`. |

## Regression hunt (code read this round)

- **Event contracts unchanged.** The module only listens: `cart:added`, `cv:cart`, `cart:drawer:open`, `cart:drawer:refreshed`, `cvs:error` and `cvs:needmodel` (both `bubbles: true`, cv-product.js:839/845), plus the editor events. It dispatches nothing and never touches `/cart/*`, checkout or the drawer's open-on-add logic (cart.js:402-408 is untouched). The detail fields it reads match the emitters: cv-product.js:883, cart.js:109/169/355, cv-quick-pick.js:359 and cv-pdp-story.js:275. Emitters with no detail (cv-pdp-carousel.js:1299, cv-pdp-video-reviews.js:685) fall through to `receive()` without error.
- **Money path.** In cart.js `applyDrawer`, the `[data-cart-total]` node is kept and its `data-cents` is rewritten. The module's attribute observer ignores it (no `data-cvm-price`), so only the `cart:drawer:refreshed` handler rolls the total: one roll, and it ends on cart.js's own text (`final: t.textContent`). Ghost lines have their `data-*` attributes, ids and names stripped and are `inert`, so `lineMap` and `focusMemo` do not count them.
- **Listeners after an editor reload.** The module is guarded by `if (window.CasifyMotion) return` and puts every listener on `document` once. cv-header.js registers `cvs:adding` (capture), `cart:added` and `cv:cart` through `listen()`, which removes each with the same capture flag. `currentBag` is cleared on destroy and re-pointed on init. cv-header.js is loaded once (layout:243).
- **Parse-time globals.** Only `W.gsap` is read at parse. That is safe because `snippets/gsap.liquid` prints GSAP core in `<head>` with defer, unconditionally. `CasifyBag`, `CasifyMoney`, `MotionPathPlugin`, `Flip` and `DrawSVGPlugin` are read at call time. In cv-header.js, `holdUntil` is a hoisted `var` that is `undefined` before its line, and both comparisons are false in that window, so the earlier behaviour holds.
- **Double animation with cv-pdp-counter-motion.js.** None on live templates. `templates/product.json` and `product.convert.json` both use `cv-product-counter`. The module claims `pdp` and `set` while `[data-cv-pdp="counter"]` exists. The counter flies on `cvs:added` (counter-motion:328) and `cvp:setadded` (:376), and its own bag-icon scale is the one bag moment. The header wiggle is held off for 2.5 s, so it does not stack. No markup carries `data-cvm-btn` yet, so the counter's press squash is not doubled. No CSS or JS shakes on `is-error` besides the module.

## Minor (not blocking)

1. **Latent double fly on the Order Slip.** `cv-pdp-slip-motion.js:133` flies a `.cvs__stub` on `cvs:added` for any non-counter `[data-cv-pdp]`, and the module also flies a `.cvm-token` (`pdp` is claimed only when the counter is present). That section is not placed in any template, so shoppers do not see it. Fix in U5.1/PDP-SHARED: the slip motion claims `pdp`, or it delegates to `CasifyMotion.fly`.
2. **Editor only:** after a reload of the Shop Counter section, PDP adds fly nothing. The counter motion binds its root once at parse, while the module keeps the claim. This goes away when U1.1 delegates the fly.
3. **Latent width lock at 0.** When a `data-cvm-btn` button turns `is-busy` while it is `display:none` (a hidden sticky bar), `button()` locks `width:0px` until idle. No markup opts in yet. Units adding `data-cvm-btn` to `#cvStickyBtn` should keep this in mind, or the module could skip the lock when `width` is 0.
4. **Quick press overlap on the counter.** The counter's `cvs:adding` squash (`clearProps: transform`, 0.24 s) and the module's error shake on `#cvAddBtn` can overlap when the add fails within 0.24 s, and each clears the other's transform. Cosmetic.
5. These carry over from the previous round, still true and cosmetic: the roll copy is pinned to the left edge for right-aligned totals; `amount_with_period_and_space_separator` frames in the fallback formatter; a first-time `data-cents` rolls from 0; the page-wide `class` observer runs with `attributeOldValue`; the hidden-tab MotionPath edge.
6. On a claimed `pdp` add nothing calls `CasifyBag.receive()`. The counter's own tween scales `.cm-icon`, so the bag still gets one moment (implementer's request to U1.1 stands).

## Not covered this round

- I could not re-run the nomp and nogsap variants with the new actions file to completion (the stall above). I rely on my own 02:43 to 02:45 runs on identical theme code. The `nomp exit 1` in `kit-proof/inf-3/shoot-nomp.txt` (03:06) has no stdout behind it and matches the same stall.
