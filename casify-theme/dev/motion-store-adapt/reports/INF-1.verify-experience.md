# INF-1 verify: experience (motion, accessibility, honesty)

Verifier: independent, experience lens. File under test: `assets/cv-product.js` (fix round). No theme
file was edited.

## Verdict: PASS (no blocking defect in INF-1's file)

`cv-product.js` has no motion of its own. It sets state classes (`is-busy`, `is-done`, `is-error`,
`is-swapping`) and fires events that motion files listen to. What a shopper sees from it is labels,
the `#cvStatus` live region, focus moves and the sticky bar's hidden state. I checked those.

## What I ran

- `tools/shoot.py` with `--rm --nojs` and my actions snippet `harness/inf-1-verify/xp_actions.py` at
  375, 768 and 1440 on `harness/inf-1-verify/slip-one-model.html` (the fix-round case),
  `harness/inf-1-verify/slip.html` (multi-model) and `harness/inf-1-pdp-preview.html` (counter).
  Shots: `harness/inf-1-verify/xp-r2/`. Both slip pages: PASS, 0 page or console errors at all 9
  runs. The counter run crashed Chromium on a later full-page shot. This is a kit limit, logged in
  `requests/kit.md`. Its default and reduced-motion shots were written and checked.
- Sticky and keyboard probe (scratch `INF-1-xp/sticky.py`): keyboard Enter on the sticky button, at
  375, with normal and reduced motion.
- `dash-scan.py assets/cv-product.js`: PASS, 0 shopper hits.

## Findings by check

| Check | Result | Evidence |
|---|---|---|
| Content without JS | PASS | nojs 375/768/1440: title, price, "Your phone: iPhone 17 Pro Max", style, packs, total and Add to bag all show. The form posts natively. |
| Single-model slip can be bought (fix round) | PASS | Keyboard Enter on Add: 1 POST, `cvs:adding`, `cvs:added`, `cart:added`. Label "In your bag", status "2 cases added to your bag.", same in reduced motion. Nothing is pre-selected: one phone value, so there is no choice. |
| Model-first nudge | PASS | Multi-model slip: Enter on Add gives 0 POST and 1 `cvs:needmodel`. The model list opens, focus goes to the checked model button with a visible 2 to 3 px outline (`:focus-visible` true), and the status says "Choose your phone model first". Counter: focus goes to the model select, which shows the "Choose your phone model" placeholder with a red ring (shot `inf-1-pdp-preview/rm-375-press1.png`). Sticky Enter on the multi-model slip: 0 POST, focus moves to the picker. |
| Reduced motion keeps every state as text | PASS | rm runs: the same labels ("In your bag", "Add to bag") and the same status text as default. Sticky transition is `none` under rm and `transform .24s` otherwise (CSS, not INF-1). |
| `aria-live` / role | PASS | `#cvStatus` is `role="status" aria-live="polite"`. The JS only writes `textContent`. |
| Inert sticky not focusable | PASS | While hidden: `aria-hidden="true"` and `#cvStickyBtn` `tabIndex -1`. The JS keeps both in step with `is-visible`. |
| Horizontal scroll at 375 | PASS | `scrollWidth == clientWidth` in every run. |
| Double animation | n/a in INF-1 | `is-error` has no CSS on `.cvs__cta` / `.cvc__add`. `cv-candy-buttons.js` reacts to it, but that is INF-3 territory. |
| Theme editor | PASS | Implementer's and regression verifier's runs: 1 POST per click after unload/load. The JS creates no ScrollTrigger. |
| Loops / timers | PASS | No loops. Timers go through `later()` and are cleared on destroy, except `flagError`'s 1200 ms timeout, which only removes a class. |
| Em/en dashes, invented claims | PASS | 0 shopper hits. JS strings are neutral fallbacks ("Adding…", "In your bag", "Choose your phone model first"), with no claims. |

## Minor (not blocking)

1. Focus is lost after a keyboard add. `addToBag()` sets `els.addBtn.disabled = true` while posting
   (cv-product.js:870), so focus drops to `<body>`. After a single-model add, `activeElement` was the
   body, and focus did not come back when the button re-enabled. HEAD did the same (HEAD :609), so this
   is not a regression. Suggestion: `aria-disabled="true"` plus the `busy()` guard, or put focus back
   on the button after `later(... render, 2000)`.
2. The status goes stale after a pick. Once the shopper picks a model, `#cvStatus` still reads "Choose
   your phone model first" until the next press (slip log `afterpick`). Suggestion: clear `say('')` in
   `setModelConfirmed(true)` when the status holds the choose-model text.
3. The same message is not repeated aloud. A second press without a model writes identical text to
   `#cvStatus`, so many screen readers stay silent. The focus move still signals it.
4. The `flagError` timeout is untracked (`window.setTimeout`, :838), while every other timer uses
   `later()`. It is harmless.

## Outside INF-1's file (seen in shots, for the owning units)

- Counter preview: "Google 4.8 / 5, 1,000+ reviews", "100+ sold this week" and "1480+ cases sold so
  far" render with no setting gate. Q1 says unbacked claims are per-claim settings, OFF by default.
  This is the counter Liquid (wave 1), not cv-product.js.
- Slip and counter trust lines say "Ships in 1-3 business days" with a hyphen range. The house rule
  prefers "1 to 3". This is Liquid.
- "Free shipping" shows unconditionally. It is owner-gated (Q6, `cv_free_shipping_all`).
