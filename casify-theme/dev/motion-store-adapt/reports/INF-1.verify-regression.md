# INF-1 verify (fix round): correctness and regression

Verifier: independent, regression lens. File under test: `assets/cv-product.js` (1058 lines; diff
against HEAD a5a12fc, whose copy of the file equals checkpoint e5ef095 and the harness copy
`harness/inf-1/cv-product.head.js`). No theme file was edited by this verifier. Round 1's blocking
defect (single-model Order Slip could not be bought) is the subject of this round.

## Verdict: PASS (0 blocking)

### What the fix changes (cv-product.js:198-265)

- `modelValues` (distinct model values across variants), `modelPicker` (a
  `[data-cv-option-index=modelIndex]` element or `[data-cvs-models]` in the root), `modelFixed`
  (one value or fewer, or no picker). `modelConfirmed = !hasModel || fromUrl || modelFixed`.
- Liquid-blank model with one value: JS fills it. Blank model, several values, no picker: stays
  guarded (`modelFixed` reset at :212).
- `modelAdopted`: when the JS fills the phone (URL variant or the only value), the select value,
  the slip's checked model button and `[data-cv-opt-out]` show it.

### Acceptance re-run (Playwright, served over http from the theme root, my own runs)

| Item | Result | Evidence |
|---|---|---|
| Round-1 blocker: single-model Order Slip buys | PASS | `verify_regression_test.py` slip_one_model: 0 pickers, hasModel true, modelConfirmed true, 1 POST `{items:[{id:41001,quantity:2}]}`, 0 needmodel, status "2 cases added to your bag." |
| Same product, HEAD vs new POST body | PASS | `r2_test.py` T5: HEAD and new both post `{items:[{id:41001,quantity:2}]}` |
| Liquid leaves model blank, one value | PASS | T1: JS fills "iPhone 17 Pro Max", `data-cv-model-confirmed="true"`, `#cvVariantId` 41001, opt-out shows it, 1 POST 41001 |
| Liquid blank, several values: guard holds | PASS | T2: unconfirmed, 0 POST, 1 `cvs:needmodel`, input `''` |
| Liquid blank + `?variant=41002` (other phone) | PASS | T3: confirmed, modelValue "iPhone 17 Pro", opt-out and checked button "iPhone 17 Pro", input 41002, POST 41002 x2 |
| Multi-model slip and counter stay guarded | PASS | `fix_round_test.py`: both unconfirmed, 0 POST, 1 needmodel each; counter needmodel for add, buy, sticky, focus `cvcModel-main` |
| Event order adding -> added -> cart:added with from/img | PASS | counter_add: `cvs:adding`, `cvs:added`, `cart:refresh`, `cart:added` (source pdp), from cvAddBtn, img set, qty 2 |
| Failure: is-error set and cleared, cvs:error | PASS | `?fail=1`: on for add and buy, cleared later, `cvs:error` kind add/buy, button re-enabled |
| `?variant=` counts as confirmed | PASS | 41001 confirmed; 999 unconfirmed (select and input `''`) |
| Two roots independent | PASS | root A guarded, root B (no model) posts 43001 x2, needmodel only on A |
| Unload + load: one add per click | PASS | counter: 1 POST, 1 cvs:added, 1 cart:added after 3 cycles; slip-one-model: same after 2 cycles, 0 page errors |
| CasifyMoney.format(4999) | PASS | `$49.99`; `49,99 €`; 123456 gives `1.234,56 €` |
| Existing listeners: detail fields kept | PASS | HEAD `cvs:added` keys {items, qty} all present; new keys only added; Buy now lands on `/checkout` on HEAD and new |
| No-model product unaffected | PASS | two-roots root B: hasModel false, modelConfirmed true, canBuy true |
| JS parses | PASS | node vm.Script |

Money path: `postItems()` URL, headers and body, and the Buy now redirect `base + 'checkout'`, are
byte-identical to HEAD. `cartItems()` only gains the `modelUnset` early return. The no-JS form is
not touched by this file.

### Kit runs

- `tc-compare.py --allow-missing-keys ../locale-requests`: PASS, no new offenses.
- `dash-scan.py assets/cv-product.js`: PASS, 0 shopper hits.
- `motion-lint.py`: PASS, 0 errors (22 flags, none in cv-product.js).
- `verify_regression_test.py` step 10 times out on `head.html` (select has 3 options); a defect of
  that test script, not of cv-product.js. `verify_regression_test_part2.py` (its corrected version)
  passes.

## Minor (not blocking)

1. Owner review (implementer flagged it too): a one-model product now counts as chosen on both
   templates. On the counter a one-option select no longer asks for a pick. STORE-FACTS 4 rule 7
   names only `?variant=` or a shopper pick as ways a model is chosen; with a single value there is
   nothing to pick, so I read this as consistent, but it is the owner's call.
2. Latent: `modelFixed` also confirms when the root has no picker but several model values and the
   Liquid printed a model (:210). No current template reaches it (the slip prints a picker when
   values > 1, the counter always prints a select), except if the JS model index differs from the
   Liquid `model_oi`: the slip root has no `data-model-index`, so the JS falls back to the value
   regex while the Liquid matches the option name first. Printing `data-model-index` on the slip
   (U1.1) closes it.
3. Latent dead end: Liquid-blank model, several values, no picker is guarded with nothing to pick
   (:212). Covered by the implementer's U1.1 request.
4. Unchanged from round 1: on the multi-model slip, while unconfirmed, `[data-cv-opt-out]` and the
   checked model button still show the Liquid's phone (T2), while Add says "Choose your phone model
   first". U1.1 removes the Liquid pre-selection.
5. `flagError` uses an untracked `window.setTimeout` (:838), unlike `later()`; it only removes a
   class.
6. Not attributable to INF-1: `git diff HEAD` also shows other theme files modified (cv-motion.js,
   theme.js, theme.css, cv-pdp-home*.js/css, cv-pdp-slip-motion.js, layout/theme.liquid); they
   belong to INF-0 / INF-5 and were not reviewed here. The implementer lists only cv-product.js.
7. `fix_round_test.py:12` raises a Python SyntaxWarning (`"\/"` escape); harmless.

## Artefacts

- `harness/inf-1-verify-r2/r2_test.py`, `harness/inf-1-verify-r2/r2_result.json` (T1 to T6)
- Re-ran: `harness/inf-1-verify/verify_regression_test.py`, `verify_regression_test_part2.py`,
  `fix_round_test.py`
