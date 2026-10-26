# INF-3 verify: experience (motion quality, accessibility, honesty), fix round 2

Date: 2026-10-26. Independent verifier. I did not write this code and edited no theme file.
Verdict: **PASS**. I found no blocking defect in INF-3's own theme files.

Files under test (diffed against HEAD): `assets/cv-commerce-motion.js` (new, 12219 B), `assets/cv-commerce-motion.css`
(new, 2572 B), `assets/cv-header.js` (+36/-2: CasifyBag `show()`/`receive()`, 2.5 s nav hold, badge wiggle held during the
add), `layout/theme.liquid` (the two literal slot tags and their comment, nothing else). This round only changed
`harness/inf-3/actions.py`. The theme files were last written at 02:14 and 02:17, so the 02:37 to 02:40 screenshots in
`harness/inf-3-verify-xp/r2/` show the current code.

## What I ran (output in `harness/inf-3-verify-xp/r3/`)

- `shoot.py ... --rm --nojs --actions harness/inf-3/actions.py`: the 375 full page shot and the three trace frames
  were written (03:08). After that the run blocked inside shoot.py and the 420 s timeout killed it. The traceback is at
  `ctx.close()` (shoot.py:236), after the actions snippet. The `?nomp=1` run did the same at 03:15. That matches the
  stall the implementer reported. See "Kit" below for why I count it as a kit problem, not a page problem.
- `shoot.py ... --only default --widths 375 --no-scroll --query editor=4`: 4 cycles, grew 0, stuck 0, 0 page and
  console errors. **PASS**.
- Standalone Playwright probes (`scratchpad/INF-3-xp3/probe2.py`, `probe3.py`) on the same harness page at 375. Each one
  ran 12 MotionPath flies, alternating GSAP at 0.3x and 1x, with a screenshot during every fly in probe3. Every step
  answered within its 6 s watchdog. 0 tokens were left after each fly. RESULT ok both times.
- `dash-scan.py` on the three assets: 0 shopper hits, PASS.

## Screenshots I opened and looked at

- `r3/fly-mp-default-375-2.png`: the token lifts above the card button with the photo, the striped ticket rim and the
  `×2` badge. It does not cover the text.
- `r3/fly-nomp1-default-375-3.png`: no MotionPath. The token is mid-arc, shrunk and rotated, heading for the bag at the
  top right. The two-tween fallback works.
- `r2/shots/nojs-375.png`: the page reads fully without JS. There is no pack highlight (it stays `display:none` until
  `cvcm-ready`), nothing is clipped and nothing scrolls sideways.
- `r2/shots/rm-1440-btn-error-mid.png`: under reduced motion the button reads "TRY AGAIN" in the danger colour, there is
  no shake and no token, and the badge reads 3. The state change survives as text and colour.
- `r2/shots/default-375-drawer-refresh-mid.png`: the changed line gets the gold flash, and the total rolls to $90.74
  without moving the footer. Mid-stamp, the discount row overflows the drawer's left edge (minor 3).

## Lens checks

- **Readable without JS:** yes. The module renders nothing until it boots. Every state is text and colour owned by
  cv-product.js and cart.js.
- **Reduced motion:** `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` sets `on` and `cvcm-on`. Without it:
  `fly()` resolves at once, `run()` calls only the finish callback, the price and the total jump to the exact final
  string, the pack highlight moves without animation, `.cvm-ring` (a 3 px outline) still marks the model picker, and the
  `.is-error` colour stays. The CSS `reduce` block hides the token, the ghost line and the roll copy as a backstop.
- **Layout at 375:** the token is `position:fixed` in the top layer (popover), so it adds no scroll width. The price
  roll copy is absolute and offset by measured Range rects, so the line does not reflow.
- **Focus and ARIA:** the token is `aria-hidden="true"`, `pointer-events:none`, never focused. A manual popover does not
  move focus or close other popovers. The roll copy and the ghost drop `id`, `name`, `data-*` and `aria-live` and are
  aria-hidden; the ghost is also `inert`. A live price node only ever holds the final value, so a screen reader hears
  the price once. The model ring is an outline, so it shows in forced colours.
- **Double animation:** none found. `html.cvcm-on [data-cvm-btn]` limits `transition-property` to colours and box shadow,
  and GSAP alone moves the transform. `shake()` sets `transition:none` inline and clears it after. `.cart-drawer-item`,
  `.cart-drawer__head`, the footer, the nudge, the discount row and `#cvStatus` have no CSS transition
  (`assets/cv-cart-drawer.css`, theme.css). The aside keeps its own CSS slide; GSAP animates only its children.
- **One bag moment:** the quick pick dispatches `cv:cart`, then `cart:added`, in the same tick (cv-quick-pick.js:64 and
  :359). The module's `cv:cart` timer is cleared by `cart:added`, so `receive()` runs once, when the token lands.
  `receive()` is also throttled to one call per 500 ms, and the header's badge wiggle is held while the nav hold runs.
- **Cleanup:** no ScrollTrigger and no loop. Listeners are delegated once on `document`, behind the
  `if (window.CasifyMotion) return` guard. The stamp IntersectionObserver unobserves on section unload. `CasifyBag` follows
  the live header across editor reloads (`currentBag`). `?editor=4` grew 0.
- **Hidden tab:** `visibilitychange` jumps every live timeline to `progress(1)`, and `fly()` refuses to start while
  `document.hidden`. Minor 1 covers the one MotionPath edge.
- **Console:** 0 errors in the editor run and in both probes.
- **Budget:** JS 12219 B (limit 12288), CSS 2572 B (limit 3072).
- **Dashes and honesty:** the only shopper string is `×` + qty. The token carries the real product photo or a plain
  striped ticket. No claims.
- **Timing:** the label flip is 240 ms and the default duration is 420 ms, as DESIGN.md sets. See minor 4.

## Minor (not blocking)

1. **Hidden tab with MotionPath** (cv-commerce-motion.js `fly`). The arc is appended by a `tl.add()` callback. If the tab
   hides before that callback runs, `progress(1)` fires the callback and the arc is appended after the end, so a shopper
   who comes back can see the token finish its arc. It still completes and removes itself. Fix: build the MotionPath
   tween at build time with function-based path values, or call `progress(1)` again after the callback.
2. **The badge bumps before the ticket lands.** `cv:cart` and the badge repaint happen at the moment of the add, so the
   badge elastic plays about 1.16 s before the token reaches the bag, and `receive()` squashes the icon on landing. That
   follows PLAN ("the badge elastic stays in the existing observer"), but the two beats are split.
3. **Stamp on a wide target at 375.** At 1.3x and -6deg the full-width discount row overflows the drawer's left edge for
   about 420 ms (`default-375-drawer-refresh-mid.png`). Scale wide targets less, or stamp only the amount.
4. **Durations and eases** outside the 160/240/420 set: .35, .3, .45, .6, .9 and the 1.16 s fly, all with stock
   `power*`, `back.out` and `bounce.out` eases instead of the DESIGN.md soft-out and candy spring. Most of these come from
   PLAN INF-3 and MOTION-SYSTEM 1.4. Style note only.
5. **Live region test is `closest('[aria-live]')`.** A price inside `role="status"`, `role="alert"` or `<output>` with no
   explicit `aria-live` would be rolled in place and read every frame. Today the drawer total sets `aria-live="polite"`.
   Suggest `closest('[aria-live],[role=status],[role=alert],output')`.
6. **First `data-cents` write rolls from $0.00.** The MutationObserver passes `+oldValue`, which is 0 when the attribute
   did not exist before. A `data-cvm-price` node that gets `data-cents` for the first time would roll up from zero. No
   theme markup does that today. Skip the roll when `oldValue` is null.
7. **Width lock holds through done and error until idle** (as PLAN says). Once units add `data-cvm-btn` to inline
   buttons, a longer done label can overflow the locked width. The harness button is full width.
8. **Forced colours:** `.cvm-rolling{color:transparent !important}` is overridden in Windows High Contrast, so for 0.4 s
   the live price and the roll copy draw on top of each other. Suggest `@media (forced-colors: active){.cvm-roll{display:none}}`.
9. **Budget headroom** is 69 bytes. The next change to the JS needs a trim first.

## Kit (not blocking; written to requests/kit.md)

- shoot.py with `harness/inf-3/actions.py` blocks after the trace step, at 375, in both the MotionPath and the
  `?nomp=1` runs. My two standalone probes of the same page ran 24 flies with screenshots and never stalled, and the
  editor run passed. So the hang is in the run (tracing with snapshots, then an exception in the snippet, then
  `ctx.close()` waits forever), not in the page.
