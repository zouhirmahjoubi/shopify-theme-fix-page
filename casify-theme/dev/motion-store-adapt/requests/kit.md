
## From INF-0 experience verifier (2026-10-23)
- shoot.py: the --nojs full-page PNG at 375 came out 391 px wide although `scrollWidth - clientWidth` was 0 (html/body use `overflow-x: clip`, and a `data-cv-reveal="right"` start state sits 32 px off to the right). The screenshot width follows the content size, not the scrollable width, so a reviewer may read a horizontal scroll that a shopper cannot reach. Suggest printing the measured scrollWidth beside each shot. Not blocking.

## From INF-5 regression verify (2026-10-23)

- shoot.py `--query editor=4` on harness/inf-5-verify/journey.html (cv-pdp-journey, 1440): the harness ran
  all 4 cycles (editorResult: cycles 4, grew 0, stuck 0) but `html[data-harness-editor="done"]` never
  appeared, so the run reports a page error "editor cycle did not finish" (21.2 s timeout). Likely the
  pinned section (pin-spacer) or a scroll the harness waits on. Not a task defect on the evidence.
- shoot.py editor mode on cv-pdp-ugc: swapping the section markup aborts in-flight `<video>` loads, which
  are counted as net errors (net::ERR_ABORTED on assets/pdp-ugc-*.mp4). Suggest ignoring ERR_ABORTED
  on media during editor cycles.
- (INF-1 experience verifier, 2026-10-23) shoot.py on `harness/inf-1-pdp-preview.html` crashes Chromium
  ("Page.screenshot: Target crashed") during the full-page shot of a later run (nojs 768/1440 were never
  written). The page is ~200 KB with every GSAP plugin; the slip harness pages pass. Suggest a
  `--viewport-only` flag or capping full-page height. Not a task defect.
- (INF-1 experience verifier) On the slip harness pages a programmatic scroll past `#cvAddBtn` (with
  3000 px of padding appended to body) never fired the sticky IntersectionObserver: `#cvSticky` stayed
  `aria-hidden="true"` and no `cvs:sticky` fired. The observer condition is identical to HEAD, so this is
  probably the harness scroll setup; a kit fixture that proves the sticky reveal would help.

## INF-0 experience verifier r2 (2026-10-23)

- shoot.py: in `--actions`, `.cv-callout` (a CSS `animation ... both` fill, 400 ms delay) reads opacity 0 at 768 and 1440
  in both default and rm runs (verify/INF-0-experience-r2/shots-ok/console.json). A direct Playwright probe of the same
  page at 1440 after 1.5 s reads opacity 1 with the animation `finished`. Cause inside shoot.py not found; the earlier
  INF-0 verifier saw the same "flaky" reading. Not blocking.

## INF-0 fix round 3 (2026-10-23)

- verify/INF-0-experience-r2/actions.py applies the (b) "timeout at DCL with engines loaded" and (e) scroll-to-buy
  expects to every non-nojs variant, including broken.html where the engines are deliberately missing, so that
  page can never pass. Gate those two expects on `cvReady` in the probe.
- shoot.py `--allow-net PATTERN` silences the network entries but not the matching "Failed to load resource ... 404"
  console errors, so a deliberate-404 page (inf-0-r2-noengine.html) always exits 1. An `--allow-console` flag or
  applying the allow-net pattern to resource-load console lines would fix it.

## INF-0 experience verifier r3 (2026-10-23)

- Root cause of the `.cv-callout` "invisible" reading at 768/1440: Playwright's full-page screenshot restarts CSS
  animations in Chromium. Probe (scratchpad INF-0-xp/callout3.py): after 1.5 s the callout animation is `finished` at
  opacity 1; a viewport resize or a viewport-only screenshot leaves it finished; right after `page.screenshot(full_page=True)`
  it reads `running`, currentTime ~280 ms, opacity 0. shoot.py runs `--actions` after the full-page shot, so any
  `animation ... both` with a delay reads mid-run. Fix idea: take the actions state read before the full-page shot, or
  wait for `document.getAnimations()` to settle after it. Not a task defect.
- `--allow-console` already exists in shoot.py (the r3 note above asks for it); `--allow-console "404|Failed to load"`
  silences the deliberate 404 lines.
- harness/inf-0-verify/actions.py "live reduced-motion switch left unrevealed" checks the `.is-revealed` class on
  `halo-below`, not its opacity. The CSS reduce rule makes it opacity 1 (`!important`); the class depends on halo.js,
  which has no live reduced-motion handling. Result flips between runs. Check opacity instead.

## INF-4 regression verifier r2 (2026-10-23)

- harness/inf-4-story-preview.html loads a remote clip (cdn.shopify.com/videos/c/o/v/27e777f06c9d4793a91c31251d1fe1e6.mp4).
  On a machine that aborts it, shoot.py exits 1 with only `net::ERR_ABORTED` lines (0 page, console or expect failures).
  Either build the harness with a local poster/clip or default `--allow-net cdn.shopify.com/videos` for media loads.
  Not a task defect.

## From INF-2 verification (regression lens, 2026-10-23)

- schema-validate.py does not read `config/settings_schema.json`, so "schema-validate green for settings_schema.json" cannot be proven
  with it. Add a theme-settings pass (range step count <= 101, default in range, unique ids, no removed ids vs HEAD).
- stub-fetch.js serves one static `cv-cart-drawer` snapshot, so qty and remove can never change the returned drawer. It also gives cart keys
  by index (`<id>:fixture<i>`) and has no `/products/<handle>.js`. A stateful stub with per-state section HTML and stable keys would
  cover cart and quick pick tests. A working pattern is in the verifier scratch `build.mjs` and `qp.mjs`
  (C:/Users/LENOVO/AppData/Local/Temp/claude/D--etsy-vinreport/b84b29f8-4341-428e-b13f-6902ba20cbc3/scratchpad/INF-2-verify/).

## From INF-2 verify (experience), 2026-10-23
- stub-fetch.js: no `/products/<handle>.js` answer (quick pick needs it); `.cart()` returns a clone, so tests cannot mutate the stub cart directly (document it, or add `__stubFetch.mutate(fn)`).
- render-section.mjs: cart keys are `<id>:fixture<i>` (index based), so a key changes when a line above it is removed; the stub's Section Rendering answer is one static snapshot. Workaround used: `fixture.globals.cart` with stable keys plus a getter on `__STUB_FIXTURE.sections` (harness/inf-2-verify-xp/build.mjs).
- schema-validate.py does not read config/settings_schema.json.
