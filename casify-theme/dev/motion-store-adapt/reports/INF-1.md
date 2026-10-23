# INF-1: commerce core contract (assets/cv-product.js)

The first round's own report was never written, because the time box stopped it. That round's
acceptance evidence is the independent verifier's Playwright re-run in
`reports/INF-1.verify-regression.md`: every PLAN item passed except the single-model Order Slip.
This file records the fix round.

## Fix round

### Blocking defect 1: single-model Order Slip could not be bought (fixed)

Root cause: `sections/cv-product.liquid:176-207` prints no model picker when the model option has
one value. Even so, `cv-product.js` set `hasModel = true` and `modelConfirmed = false`, so
`needModel()` blocked every Add to bag and Buy now, and the shopper had nothing to pick.

Fix, in `assets/cv-product.js` only, right after the `?variant=` adoption:
- `modelValues` lists the distinct model values across the variants. `modelPicker` checks whether
  this root has any `[data-cv-option-index=modelIndex]` element or a `[data-cvs-models]` list.
- `modelFixed` is true when there is one value or fewer, or when the root has no picker. The model
  then counts as confirmed (`modelConfirmed = !hasModel || fromUrl || modelFixed`), so the
  placeholder is not injected.
- If the Liquid left the model blank and only one value exists, the JS fills in that value. A blank
  model with several values and no picker stays guarded. A comment in the code says Liquid must
  print a picker in that case.
- I also applied the first round's unapplied open item. When the JS fills in the phone (a real
  `?variant=` while the Liquid left the model blank, or the only phone there is), the select value,
  the slip's checked model button and `[data-cv-opt-out]` show it. With today's Liquid this never
  runs, because the Liquid always prints a model.

No event names, detail fields, POST body or the no-JS form changed.

### Re-proof (Playwright, served over http from the theme root)

| Check | Result | Evidence |
|---|---|---|
| Repro `harness/inf-1-verify/verify_regression_test_part2.py`, slip-one-model | PASS | `model_pickers 0, hasModel true, modelConfirmed true, canBuy true, posts [{items:[{id:41001,quantity:2}]}], needmodel 0`, status "2 cases added to your bag." |
| HEAD vs new detail fields (same script) | PASS | identical POST body `{id:41003,quantity:2}`. HEAD `cvs:added {items,qty}` keys are all kept. Buy now lands on `/checkout` on both pages |
| Full verifier suite `verify_regression_test.py` items 1 to 9 | PASS | multi-model slip is still guarded (0 POST, list opens). Counter needmodel fires for add, buy and sticky with focus on `cvcModel-main`. Event order holds. `?fail=1` sets is-error and cvs:error. `?variant=41001` is confirmed and `999` is not. One POST after editor reloads. Money `$49.99` and `49,99 €`. Two roots stay independent |
| Verifier step 10 | not a code defect | That script calls `select_option(index=3)` on head.html, whose select has 3 options. `verify_regression_test_part2.py` is its corrected version and passes |
| `harness/inf-1-verify/fix_round_test.py` | PASS | slip-one-model: `data-cv-model-confirmed="true"`, modelValue `iPhone 17 Pro Max`. After 2 section unload/load cycles, one click gives 1 POST, 1 `cvs:added`, 1 `cart:added`, 0 page errors. Multi-model slip and counter preview stay unconfirmed: 0 POST, 1 needmodel each. A counter whose product still lists 3 models stays guarded even with one `<option>` left |
| JS parses | PASS | node vm.Script: SYNTAX_OK |
| `tc-compare.py --allow-missing-keys ../locale-requests` | PASS | no new offenses |
| `dash-scan.py assets/cv-product.js` | PASS | 0 shopper hits |
| `motion-lint.py` | PASS | 0 errors. The 1 flag is in `assets/cv-pdp-home.css`, which is not an INF-1 file |

### For review

- A case made for one phone, or a page with no phone picker, now counts its model as chosen.
  Without that it cannot be bought. This applies on the counter template too: a select with one
  real model no longer asks the shopper to pick it. The owner rule "never pre-selected" still
  holds wherever there is a real choice.
- Request for U1.1: when the Liquid leaves the model blank, it must print a picker for every
  product that has more than one model value.
