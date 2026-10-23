# INF-4 verification: correctness and regression lens (round 2, after the focus fix)

Verifier: independent (did not write the code). Date: 2026-10-23.
Files under test: `assets/cv-pdp-story.js`, `assets/cv-pdp-story.css` (`git diff HEAD`, checkpoint e5ef095).
This replaces the round 1 report. The round 1 evidence is still in `verify/INF-4/verify-regression*`; the round 2 evidence is in `verify/INF-4/verify-regression-r2/`.
Verdict: **PASS**. I found no blocking defect in the task's own files.

## What I ran myself

| Check | Result |
|---|---|
| Full read of the new `cv-pdp-story.js` and the HEAD version; `git diff HEAD` of the CSS | done |
| `node --check assets/cv-pdp-story.js` | OK |
| `motion-lint.py` on both files | 2 files, 0 errors, 0 flags, PASS |
| `dash-scan.py` on both files | 0 shopper hits, PASS |
| `tc-compare.py --allow-missing-keys ../locale-requests` | 0 errors, 8 warnings, no new offenses, PASS |
| Own script `vr.py` (scratchpad `INF-4-vr/`), 30 trigger cases plus money and pct checks, results in `verify-regression-r2/vr.json` | 0 page errors. Two expectations failed, and both were wrong expectations on my side (see below). |
| Own script `vr2.py`: a double click in one task, and the shopper scrolling away while focus is pending | 1 focus call; no jump back |
| `shoot.py --actions story_actions.py` (the implementer's expectations), default, rm and nojs at 375 and 1440 | 0 page errors, 0 console errors, 0 failed expects. The run exits 1 only on aborted `cdn.shopify.com/videos/...mp4` loads: the harness pulls a remote clip, and this machine aborts it. This is not story.js. |
| `shoot.py ?editor=4&trace=1` | Three keys grow per cycle (document keydown, document visibilitychange, window resize). All three trace to `cv-pdp-video-reviews.js:32`, already filed as `requests/INF-4.md` item 1. story.js adds 25 listeners at :60 and removes 20 at :61: one set of 5 from boot, then 5 removed and 5 added per cycle, so its net is flat. |

## Acceptance re-run (PLAN.md INF-4 and fix round defect 1)

1. **Focus after back-to-slip (defect 1):** I tested 5 triggers: a fit chip, the closer's `[data-cvp-back]`, `[data-cvw-model]`, an injected `[data-cvw-pack="2"]` button and an injected `<a href="#cvAddForm" data-cvp-back>`. I ran each at 375x812, 768x1024 and 1440x900, with motion allowed and with reduced motion, using a real mouse click after first scrolling to the very bottom of the page. The pack trigger and the anchor were the paths the implementer did not exercise.
   - Result: 30 of 30 cases end with `document.activeElement === #cvAddBtn` and the button fully on screen (top/bottom 378-432 of 812, 485-537 of 1024, 423-475 of 900).
   - Every case made exactly one `focus()` call, and the button was already visible at that moment (`preventScroll: true`).
   - The anchor leaves `location.hash` empty, and no trigger posted to `cart/add`.
   - Screenshot: `verify-regression-r2/def-375-cvw-pack.png`.
   - PASS.
2. **No model name before a choice:** in all 30 cases both summaries read "[product] · Choose your phone" before the click, no fit chip is pressed and no "For your" note is visible. PASS.
3. **Every summary updates once after a choice:** a fit chip or `[data-cvw-model]` click gives exactly one `cvs:choose`, only "iPhone 17 Pro" pressed, and both summaries read "... Russet Brown / iPhone 17 Pro · 2 cases · $81.98". That total is exactly the `#cvTotal` text, so money formatting matches the buy box. PASS.
4. **pct tokens follow `data-cv-discount`:** tokens 2 and 3 read 18 and 31 (the buy box values). Setting pack 2 to `22.5` updates token 2 to "22.5". Token 4 has no pack in this buy box, so it keeps its server text "40", as designed. My expectation did not list token 4; that was my mistake, not a defect. PASS.
5. **Set heading hides with zero cards:** the `set_empty` expectations pass in `story_actions.py`. PASS.
6. **load/unload leaves one listener per module:** see the editor row above. PASS for story.js.

## Money path and contracts

- **Proxy add vs native add:** with no model chosen, `[data-cvw-buy="add"]` posts nothing (cv-product.js nudges instead). With iPhone 17 Pro chosen, the proxy add and the real `#cvAddBtn` each post exactly one `cart/add.js` with the identical body `{"items":[{"id":41002,"quantity":2}]}`. story.js does not build that body; it calls `CasifyPDP.add/buyNow(root, {from})`, which exist with that signature in cv-product.js:1043-1044.
- **Set one-tap add:** the endpoint and body `{ items: [{ id, quantity: 1 }] }` are unchanged from HEAD.
- **No checkout redirect in this file.**
- **Event names kept:** `cvs:choose {index, value}`, `cvs:pack {qty}`, `cvp:filter {shown}`, `cvp:set`, `cvp:shelf`, `cvp:setadded {item, button}`, `cart:refresh`, `cart:added`. `cart:added` gained detail fields, which is additive. `cv-pdp-counter-motion.js:376,403` still hears `cvp:setadded` and `cvp:set`.
- **Parse time:** story.js loads after cv-product.js in `layout/theme.liquid:339-341`, both with `defer`. `CasifyPDP`, `CasifyMoney` and `ScrollTrigger` are read only in handlers or in `boot()`, and `pdpState()` also covers a missing API.
- **CSS:** additive only: `[hidden]` rules for set, shelf and shelf item, plus reduced-motion `transform: none` on hovers.
- **Theme check:** no setting, block or schema is touched, and there are no Liquid changes.

## Minor (not blocking)

- **The no-JS and first-paint summaries still name a model.** The cv-pdp-closer and cv-pdp-guarantee Liquid print `selected_or_first_available_variant`. That Liquid is outside INF-4, is already in `requests/INF-4.md` item 2, and JS corrects it at boot.
- **The closer summary format changed.** HEAD printed "[variant] · [n] case(s) · [total]"; it now prints "[product] · [variant] · [n] case(s) · [total]", which matches the server text's product prefix. This is a visible copy change.
- **`fromChange()` reads `modelIndex` only from the root's `data-model-index`.** Only cv-product-counter prints that attribute, and both product templates use cv-product-counter. On `sections/cv-product.liquid` the set's "For your [model]" and one-tap Add would stay off after a choice. HEAD had the same limit.
- **Focus can wait up to 2 s.** While the page keeps moving, focus waits for it to stop. If something else keeps scrolling (a long user scroll during the settle window), focus lands at the 2 s cap, and `preventScroll` is false when the button is then off screen. In my wheel test, focus had already fired before the shopper scrolled away, so there was no jump back. The case is theoretical.
- **Kit:** the harness pulls a remote `cdn.shopify.com` video, so `shoot.py` exits 1 on aborted media loads on machines where the clip cannot be fetched. Use `--allow-net cdn.shopify.com/videos` for this harness.
