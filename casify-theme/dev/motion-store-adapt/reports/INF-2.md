# INF-2: cart core, drawer, quick pick, theme settings

Status: done (after the fix round). Nothing committed (no git writes); the owner commits with
`git add -- <files>` and the message `INF-2: ...`.

## Files

Changed: `assets/cart.js`, `snippets/cart-drawer.liquid`, `sections/cv-cart-drawer.liquid`,
`sections/header.liquid` (only the inline drawer CSS block, moved out), `assets/cv-quick-pick.js`,
`snippets/cv-quick-pick.liquid`, `config/settings_schema.json`.
New: `assets/cv-cart-drawer.css`.
Dev only: `locale-requests/INF-2.json`, `requests/INF-2.md`, `harness/inf-2/` (build.mjs, page.liquid,
actions.py, actions-fail.py, actions-ooa.py), `harness/inf-2-cart-preview.html`, `verify/INF-2-fix/`.

## What was built (first round)

- cart.js: qty and remove go through `POST /cart/change.js` with `sections=cv-cart-drawer` bundled; the
  drawer's children are swapped in place, no reload; focus is restored by line key and control. Handlers
  skip `defaultPrevented` events and lines inside `[data-cart-self]` (cart page, U1.4).
  `CasifyCart.refresh()` returns the refresh promise; `cart:drawer:refreshed {added, removed, changed, cart}`,
  `cart:drawer:open`, `cart:drawer:close`. Closed drawer is `inert` + `aria-hidden`. Card forms dispatch
  `cart:added {source:'card', from, img, qty}`. `cart:updated` and `casify:cart:updated` act as `cart:refresh`.
  The drawer opens after an add only when `data-open-on-add` is printed (`cv_open_drawer_on_add`, default
  off: owner decision Q3). `showToast(title, body, tone)` passes tone to `CASIFY_FNS.toastQuick`; errors use
  `danger`.
- Drawer snippet: Subtotal (`items_subtotal_price`), one row per `cart_level_discount_applications`, Total
  (`total_price`, `aria-live="polite"`), pack nudge from `cv_pack_2_pct` / `cv_pack_3_pct` (0 hides it),
  "Phone:" first, empty state to `routes.all_products_collection_url`, `data-cart-remove` with the product
  name in `aria-label`, all strings through locale keys, `data-key` + `data-cvm-line` per line,
  `data-cvm-drawer-foot`.
- Quick pick: nothing pre-selected (an option is filled only when it has one value; owner decision);
  `cart:added {source:'quick-pick', from, img, qty}` after a successful add; optional Buy now
  (`data-cvqp-buy-now` on the opener), enabled only once a full available variant is resolved, posts the
  same variant then goes to `routes.root + 'checkout'`.
- Settings ("Packs and shipping"): `cv_pack_2_pct` 18, `cv_pack_3_pct` 31 (PRODUCT.md:39),
  `cv_free_shipping_all` false (nothing reads it yet), `cv_open_drawer_on_add` false.

## Fix round (2026-10-23)

Blocking defect: the first round ended "partial". The plan's harness was never built, no acceptance item
was proven in a browser, and this report did not exist. Both independent verifiers (regression and
experience) passed the code with their own harnesses and listed minor items. This round finishes the task.

### Harness built

- `harness/inf-2/build.mjs` writes `harness/inf-2-cart-preview.html`. It renders the real
  `snippets/cart-drawer.liquid` through `tools/render-section.mjs` for 25 cart states (two lines, qty 0 to 4),
  with stable keys (`41001:fixture`, `41002:fixture`). The automatic pack discount is modelled as a
  cart-level row marked fixture (2 items 18%, 3 items 31%). A getter on
  `__STUB_FIXTURE.sections['cv-cart-drawer']` returns the state matching `__stubFetch.cart()`, so the
  Section Rendering answer follows qty and remove. `fetch` is wrapped for `/products/<handle>.js`.
  `?openonadd=1` prints `data-open-on-add` on the drawer. The INF-2 locale request values stand in for keys
  LOC-1 has not added yet. `/checkout` is fulfilled with `page.route` inside the actions.
- Known limit: the 25 states cover lines 41001 and 41002 only. An add of a third variant (card form 41003,
  quick pick Sage Green / iPhone 16) updates the stub cart and the badge, but the drawer HTML keeps showing
  the two-line state.

### Defects found and fixed this round

1. **Danger toast hidden behind the open drawer.** `.toast-host` is z-index 80 (theme.css:889), the drawer
   is 95, so the new in-place change failure showed its `role="alert"` toast under the drawer (announced, but
   not visible). Fix: `html.cm-scroll-lock .toast-host{z-index:96}` in `assets/cv-cart-drawer.css`.
   Request 7 in requests/INF-2.md asks INF-0 or FIN-1 to move that into theme.css.
2. **Stale focus trap swallowed Tab** (regression verifier minor 1). `CasifyA11y.trapFocus` listens on
   `document`. A trap whose container left the page (editor reload of the header with the menu open) or was
   hidden (menu past its breakpoint) called `preventDefault()` on every Tab. Fix in `assets/cart.js`: the
   trap removes its own listener once the container is disconnected, and leaves Tab alone while the
   container has no visible focusables.
3. **Open-on-add + quick pick focus** (experience verifier minor 1, regression minor 4). With
   `cv_open_drawer_on_add` on, the drawer opened under the quick pick's modal dialog: its first focus failed,
   and 1.5 s later the quick pick refocused the opener behind the open `aria-modal` drawer. Fix in
   `assets/cv-quick-pick.js`: on `cart:drawer:open` while the sheet is open, the sheet closes at once
   without refocusing the opener, and focus goes to the drawer's close button. The drawer returns focus to
   the same opener on close.
4. **Uncancelled 1.5 s close timer** (experience minor 2). A second quick pick opened inside that window
   closed itself. The timer is now stored and cleared on `open()`, `close()` and drawer open.
5. **Buy now left busy after a back navigation** (regression minor 5). A `pageshow` with `persisted`
   clears `busy` and repaints the buttons.

### Acceptance, proven on harness/inf-2-cart-preview.html

Runs (from `tools/`):
- `shoot.py ../harness/inf-2-cart-preview.html --out ../verify/INF-2-fix/shots --rm --nojs --widths 375,1440 --actions ../harness/inf-2/actions.py`: PASS, 6 runs, 38 shots, 0 page/console/network errors, 0 failed expects.
- `... --out ../verify/INF-2-fix/shots-fail --rm --widths 375,1440 --query fail=1 --actions ../harness/inf-2/actions-fail.py`: PASS, 4 runs.
- `... --out ../verify/INF-2-fix/shots-ooa --rm --widths 375,1440 --query openonadd=1 --actions ../harness/inf-2/actions-ooa.py`: PASS, 4 runs.
- Scratch `scratchpad/INF-2/trap.py` (stale and hidden trap): PASS.

| Item | Result | Evidence (default 375; same in rm and 1440) |
|---|---|---|
| Qty change keeps the drawer open and focus on the same stepper | PASS | Keyboard Enter on line 41002 `+`: open, focus on the same `[data-qty-increase]`, qty 1 to 2, `window.__marker` survived (no reload). Total $103.48 at 3 items (`default-375-qty.png`) |
| Remove deletes the line without reload | PASS | Remove on 41001: line gone, drawer open, focus on the next line's Remove, marker survived (`default-1440-removed.png`) |
| `cart:drawer:refreshed` lists the right keys | PASS | qty: `changed:['41002:fixture']`, added and removed empty; remove: `removed:['41001:fixture']` |
| Closed drawer is not focusable | PASS | 14 Tabs from body never enter `#cm-cart-drawer`, which is `inert` while closed. Open: 12 Tabs stay inside. Escape: closed, inert again, focus on `#bagBtn` |
| Discount rows and Total for a 2-item fixture | PASS | `SUBTOTAL $99.98`, `fixture: 2 case pack 18% off -$18.00`, `TOTAL $81.98` (`default-375-open.png`) |
| Legacy `cart:updated` refreshes the count | PASS | Stub cart changed behind cart.js, then `cart:updated`: badge 2 to 4 |
| Quick pick Buy now disabled until both options are chosen | PASS | Open: both selects empty, Add says "Choose your phone", Add and Buy now disabled. Colour only: both disabled. Both chosen: both enabled. Buy now then navigates to `/checkout` (fulfilled) |
| `schema-validate.py` green for settings_schema.json | PASS by other means | schema-validate.py PASS but does not read this file (kit gap, in requests/kit.md). Theme check on the clean copy reports nothing for it; defaults 18 and 31 in range 0 to 90; checkbox defaults false; no setting removed |
| Card add stays on the page (owner Q3) | PASS | `cv_open_drawer_on_add` off: `cart:added {source:'card', qty:1, img}` fires, drawer stays closed |
| Open-on-add | PASS | `?openonadd=1`: card add opens the drawer with focus on its close button, Escape returns focus to `#cardAdd`. Quick pick add: sheet closed, drawer open, focus inside, still inside 1.8 s later, Escape returns focus to `#qpPlain` |
| Failed change shows a danger toast | PASS | `?fail=1`: `.toast--danger` with `role="alert"`, visible above the drawer (hit test), qty back to 1, focus on the same stepper, no `aria-busy` left (`default-375-fail-toast.png`) |
| No-JS | PASS | `nojs-375.png`, `nojs-1440.png`: page readable, drawer off canvas and inert, bag link to `/cart`, openers keep their product `href` |

### Static checks (this round)

- `liquid-balance.py` on the 4 Liquid files: PASS.
- `dash-scan.py` on the 7 INF-2 theme files plus `locale-requests/INF-2.json`: PASS, 0 shopper hits.
- `motion-lint.py` on the 6 INF-2 asset and snippet files: PASS, 0 errors, 1 flag (scrim `opacity:0`
  closed state of a JS-only overlay, correct).
- `node --check` on cart.js and cv-quick-pick.js: OK.
- `tc-compare.py --allow-missing-keys ../locale-requests --json-out ../verify/INF-2-fix/tc-compare.json`:
  PASS, no new offenses against the 0 error / 8 warning baseline. The only extra rows are
  TranslationKeyExists for `general.cart.*` and `general.quick_pick.*`, all in `locale-requests/INF-2.json`.

### Still open (not blocking)

- Pre-existing motion-lint R7 at `sections/header.liquid:188` (`.cm-mobile-nav.is-open` animation, at
  HEAD, outside INF-2's block, U3.1 owns it). `motion-lint.py` with no arguments fails on it.
- Pack discounts set up in admin as line-level "amount off products" do not appear in
  `cart_level_discount_applications`; the drawer then shows no discount row (totals stay right).
  Worth an owner or TPL check (STORE-FACTS:221).
- `cv_free_shipping_all` exists (default off); nothing reads it yet, as the plan says.
- A refresh that fails right after a failed change (offline) can leave a line at reduced opacity
  until the next successful refresh.
- Quick pick tween durations (0.22 s close, 0.40 s image) are pre-existing and slightly off the
  DESIGN.md 160/240/420 ms scale.
- First round: one follow-up edit to `snippets/cart-drawer.liquid` was written with Python instead of
  Edit/Write (not `sed -i`; content verified by both verifiers). This round used Edit/Write only.

## Fix round 2 (2026-10-23): double tap on Remove and on '-' at 1

### Defect (verifier, confirmed)

Two taps at one point on Remove, or on '-' at qty 1, removed a line the shopper never touched. The
line had `aria-busy="true"` while its change was pending, but nothing read it, so the second tap queued
another `sendLine(key, 0)`. A remove has no 150 ms grace, and `applyDrawer` swaps the lines in place,
so once the first remove landed the next line sat under the finger. Fast answers (60 to 120 ms): both
lines gone, count 0. Slow answers (250 to 400 ms): the removed key was sent again, got a 400, and a
`role="alert"` danger toast said "Could not update your bag" after a remove that worked.

### Fix (assets/cart.js only)

- `removing[key]`: set when a remove (qty 0) is accepted for a line. While it is set, `lineChange`
  ignores every further input for that key (Remove, '-', '+', typed value) and returns `false`.
  Cleared when that `sendLine` settles, after the drawer repaint, so there is no gap between this
  guard and the next one. The same flag also covers the old full-reload path for unowned lines.
- Line lock: when `applyDrawer` adds or removes lines in the open drawer, line controls ignore input
  for `LINE_LOCK_MS` (400 ms). A stray second tap lands on nothing. Qty-only repaints do not lock,
  so rapid '+' taps still all count, and a closed drawer refresh (after an add) does not lock.
- The qty `change` handler puts an ignored input back: `0` while the line is being removed, else the
  line's server `data-qty`. So the field never shows a value the bag does not have.
- `sendLine` now ends in a handler that never rejects, so one failed change cannot stall `lineQueue`
  for every later change.

### Proof (from `tools/`, harness `harness/inf-2-cart-preview.html`)

New snippet `harness/inf-2/actions-dbltap.py`: real mouse clicks at one fixed point, 200 ms apart,
on a fresh two-line bag (41002 top, 41001 below, qty 1 each). Cases: Remove top line, Remove second
line, '-' at 1 on the top line. Controls: two deliberate removes 1.2 s apart (both must go), '+'
double tap (both taps must count, qty 1 to 3), keyboard Enter twice 200 ms apart on Remove (focus
moves to the next line's Remove; that line must stay).

- `shoot.py ../harness/inf-2-cart-preview.html --out ../verify/INF-2-fix-r2/dbltap-<L> --only default --widths 375 --no-scroll --query latency=<L> --actions ../harness/inf-2/actions-dbltap.py`
  for L = 60, 80, 120, 250, 300, 400: PASS all six, 0 failed expects, 0 page/console/network errors.
  Every case: exactly one `/cart/change.js` call (`200`, the tapped key, quantity 0), the other line
  kept at qty 1, count 1, no danger toast, no `aria-busy` left. Shot:
  `verify/INF-2-fix-r2/dbltap-120/default-375-dbl-remove-top.png` (one line left, Total $49.99).
- Negative control: the same snippet on a copy with the two guard lines taken out
  (`harness/inf-2/tmp/neg/`, dev only) FAILS with 7 expects at latency 120 (both lines removed,
  count 0) and 7 at latency 300 (second call 400, toast "Could not update your bag fixture: no such
  line"). The snippet catches the defect as reported.
- Regression, same commands as round 1 with `--out ../verify/INF-2-fix-r2/...`: `actions.py` (6 runs
  incl. rm and nojs), `actions-fail.py` (4 runs, `?fail=1`), `actions-ooa.py` (4 runs,
  `?openonadd=1`): PASS, 0 failed expects.
- Static: `node --check assets/cart.js` OK; `dash-scan.py` on cart.js PASS (0 shopper hits);
  `motion-lint.py` on cart.js PASS (0 errors, 0 flags); `tc-compare.py --allow-missing-keys
  ../locale-requests --json-out ../verify/INF-2-fix-r2/tc-compare.json` PASS, no new offenses (the
  only extra rows are the `general.cart.*` and `general.quick_pick.*` keys listed in
  `locale-requests/INF-2.json`, waiting for LOC-1).

### Notes

- No new locale keys, no Liquid or CSS change this round. The other INF-2 files are unchanged.
- The 400 ms lock also applies to keyboard input: two Enter presses within 400 ms of a line leaving
  act once. A deliberate second action after 400 ms works (control case above).
