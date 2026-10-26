# INF-2 verify, fix round 2 (experience lens: motion quality, accessibility, honesty)

Verifier: independent, did not write the code. Date 2026-10-23. No theme file was edited.
This replaces the fix-round experience report, which failed INF-2 on B1 (double tap on Remove or
`-` at qty 1 removed a second line, or showed a false danger toast).

## Verdict: PASS

B1 is fixed. Only `assets/cart.js` changed since the last verification (file times: cart.js 08:05,
every other INF-2 file 07:06 to 07:47, last report 08:02), so this round re-checks cart.js closely and
re-runs the full acceptance set for the rest.

## B1 re-check (my runs, `verify/INF-2-fix-r2-xp/`)

The guard in `assets/cart.js:197-227` has two parts. `removing[key]` ignores more input on a line
whose remove is on its way. `lineLockUntil` ignores line controls for 400 ms after `applyDrawer` adds or
removes lines in the open drawer (`:350-353`). `sendLine` clears `removing[key]` only after the repaint,
so the two parts leave no gap between them, and it never rejects (`:252-255`).

| Run | Result |
|---|---|
| `actions-dbltap.py`, `--widths 375,768,1440`, stub latency 60, 150 and 350 ms | PASS, 0 failed expects. Remove top, Remove second and `-` at 1: each sends exactly one `/cart/change.js` (200, tapped key, quantity 0). The other line stays, count 1, no `.toast--danger`, no `aria-busy` left. The controls pass too: two deliberate removes 1.2 s apart take out both lines, a `+` double tap posts 2 then 3, and double Enter removes one line |
| My edge probe (scratch `INF-2-r2-xp/probe-edge.py`), 375, latency 60 and 250 ms | PASS, 0 failed expects. (a) Slow double tap, 400 ms apart: one remove. (b) Triple tap Remove at 150 ms gaps: one remove. (c) A line at qty 2, then `-` three times 200 ms apart: calls go to 1, then 0, and the other line is never touched. (d) Space pressed twice on Remove: one remove, and focus moves to the next line's Remove. (e) A typed qty of 3 during a pending remove: no second post, no toast. (f) A deliberate `+` on the remaining line 1 s later still works (qty 2, Total $81.98). `scrollWidth` is 375 throughout |

The implementer's own runs at 60, 80, 120, 250, 300 and 400 ms and the negative control
(`harness/inf-2/tmp/neg`, which fails with both lines removed, or with a 400 error and a false toast)
agree with this.

Screenshots I looked at: `dbltap-60/default-1440-dbl-remove-top.png` (one line left, Total $49.99,
nudge "Add 1 more case: 18% off both.") and `dbltap-60/default-375-dbl-control-two-removes.png`
(empty state "Your bag is empty." with the link "Find a case for your phone"). I also looked at
`edge-250/default-375-edge-c-minus.png` (the 41001 line is intact at qty 1) and
`dbltap-350/default-768-dbl-minus-top.png` (one line left, Total $49.99, nothing clipped).

## Acceptance re-run (PLAN.md INF-2)

`node harness/inf-2/build.mjs`, then `shoot.py ../harness/inf-2-cart-preview.html --rm --nojs --widths 375,768,1440 --actions ../harness/inf-2/actions.py`:
PASS, 9 runs, 57 shots, 0 page, console or network errors, 0 failed expects. Qty change keeps the
drawer open with focus on the same `+` (teal ring, `rm-375-qty.png`). Remove works without a reload and
focus moves to the Remove of the line that takes its place (red outline, `default-375-removed.png`).
The discount row and Total show for 2 items. The closed drawer is inert. Legacy `cart:updated` works,
and quick pick Buy now stays disabled until both options are chosen.

## Lens checks

- **No JS** (`nojs-375.png`): readable. The drawer is off canvas, the bag link reads "Bag 2" and goes to
  `/cart`, and the quick add openers keep their product `href`.
- **Reduced motion**: cart.js has no motion. The badge bump is gated by `reduced()`, and the drawer
  slide collapses through the global rule in theme.css. The line state changes still show without
  motion: the line dims while busy (`aria-busy`, `cv-cart-drawer.css:43`), the quantities change, and
  so do the Total (`aria-live`), the badge and the toasts.
- **375**: no horizontal scroll (`scrollWidth` is 375), no clipped text, and long titles wrap.
- **Focus and ARIA**: unchanged from the last round. The dialog is `aria-modal`, `inert` plus
  `aria-hidden` when closed, there is one persistent `aria-live` Total, and the failure toast uses
  `role=alert`.
- **Double animation, ScrollTrigger, loops, hidden tab**: none in cart.js. PLAN sets no bundle
  budget for INF-2.
- **Honesty**: the false "Could not update your bag" toast from B1 no longer appears after a remove
  that worked. Error toasts show only on a real failure (`?fail=1` still passes). No invented claim.
- **Static**: `node --check` OK. `dash-scan.py assets/cart.js`: PASS, 0 shopper hits.
  `motion-lint.py assets/cart.js`: PASS, 0 errors, 0 flags.

## Minor (non-blocking)

1. **The 400 ms lock is silent.** A tap or key press inside the lock does nothing. There is no busy
   cue on the newly arrived line and no announcement. For a keyboard user this is fine in practice,
   because focus has just moved and a deliberate press comes later. A shopper who taps `+` on another
   line within 400 ms of a remove sees the tap ignored. Acceptable trade-off, worth knowing.
2. **Carried from the last round, still open** (cv-quick-pick.js is unchanged): `paint()` runs
   without a check for a null `product` in the `cart:drawer:open` handler (cv-quick-pick.js:297-307,
   only with open-on-add on). The cached quick pick open puts focus on the close button when motion
   is on. The danger toast covers part of the first line at 375. Quick pick tween durations of
   0.22 s and 0.40 s are off the 160/240/420 scale. Quick pick uses a per-call `matchMedia` check
   instead of `gsap.matchMedia()`.
3. `harness/inf-2/tmp/neg/cart-noguard.js` is a full cart.js copy under dev/. It is harmless,
   because dev/ is never uploaded, but the owner can delete it after the commit.

## Kit note

None. My edge probe ran with `--only default,rm` but without `--rm`, so only the `default` variant
ran. That was my own usage error, not a kit defect (`--only` filters the variants that the flags
enable). cart.js has no motion, so the reduced-motion runs come from the main acceptance run.
