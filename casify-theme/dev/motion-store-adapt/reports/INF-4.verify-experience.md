# INF-4 verification (fix round): motion quality, accessibility, honesty

Verifier: independent, lens = experience. Files under test: `assets/cv-pdp-story.js`, `assets/cv-pdp-story.css`
(diff against HEAD). No theme file was edited. This round re-checks blocking defect 1 from the first round
(back-to-slip focus off screen) and re-runs the lens.

## Verdict: PASS (0 blocking)

### Defect 1 (focus off screen): fixed

`backToSlip()` (`cv-pdp-story.js:118-140`) now centres `#cvAddBtn` when `#cvAddForm` is taller than the viewport.
It waits for the scroll to settle (two equal reads 80 ms apart, 2 s cap) and uses `preventScroll` only when the
button is already fully in view.

My own probe is `scratchpad/INF-4-xp2/focusprobe.py`. It covers 4 triggers: the fit chip, the guarantee's "Back to the
counter", the closer's "Back to your slip" (`[data-cvp-back]`) and the `[data-cvw-model]` proxy. Each runs at 5 viewports
(375x812, 768x1024, 1440x900, 667x375 landscape, 320x568), with default motion and with reduced motion: 40 cases in all.
Each case focuses the trigger with the keyboard and presses Enter. Results are in `verify/INF-4-xp2/focus/focusprobe.json`:
- In all 40 cases `document.activeElement` ends on `#cvAddBtn`. The button is fully inside the viewport,
  `:focus-visible` matches (3 px solid outline), `elementFromPoint` at its centre hits the button itself, and focus()
  runs exactly once. There is no horizontal scroll at any width.
- The first run flagged one case: 1440 guarantee-back, with no focus after 2.4 s. A trace (`series.py`, 4 runs) showed
  that the probe raced the 2 s cap. The headless click landed about 400 ms late and the headless smooth scroll stalled.
  In that run focus arrived at 2025 ms with the button at 425-475/900. The other 3 runs focused at 1.1 to 1.2 s.
  The fault was the probe's timing, not the theme.
- I looked at the screenshots. `default-375x812-closer-back.png`, `default-1440x900-fit.png` and
  `rm-667x375-fit.png` all show Add to bag on screen with its gold focus ring fully visible. Under reduced
  motion, focus lands within 22 to 242 ms and the scroll jumps (`auto`) with no glide.

### Acceptance and lens re-run

- **Kit run, my own** (`shoot.py ... --rm --nojs --widths 375,768,1440 --actions story_actions.py`, output in
  `verify/INF-4-xp2/shots/`):
  - 0 page errors, 0 console errors and 0 failed expectations in all 9 runs.
  - The only failures were `net::ERR_ABORTED` on the remote video-review clip (cdn.shopify.com). That clip belongs to
    the buy box fixture, not INF-4, and the issue is already in `requests/kit.md`.
  - Checked: no model name before a choice, one summary write per change, pct tokens follow `data-cv-discount`, the
    empty set hides, and the proxies nudge to the picker without posting.
- **Looked at the full pages** (375 crops in `scratchpad/INF-4-xp2/crops/`):
  - Set, fit, hooks, FAQ, guarantee and closer are readable, with no overlap or clipped text.
  - Before a choice both summaries read "Tech Fabric Magnetic Phone Case for iPhone · Choose your phone" and no chip is
    pressed.
- **No JS** (`nojs-375.png`): every section renders and is readable. The server Liquid presses "iPhone 17 Pro Max" and
  the summaries name "Russet Brown / iPhone 17 Pro Max". That text comes from the section Liquid
  (`selected_or_first_available_variant`), not from INF-4's files. It is already filed for the wave units in
  `requests/INF-4.md` item 2, so it does not block this task.
- **Editor lifecycle** (`--query editor=4&trace=1`, `verify/INF-4-xp2/editor/`): 3 keys grow, `document:keydown`,
  `document:visibilitychange` and `window:resize`. Trace attributes all 3 to `cv-pdp-video-reviews.js:32`. No key from
  `cv-pdp-story.js` grows.
- **Reduced motion:**
  - The new CSS turns off the hover transforms on the fit chip, the shelf media and the closer CTA, and
    `transition: none` covers the FAQ mark.
  - backToSlip and snap paging use `auto`, and clips do not start by themselves.
  - Every state change still shows as text or colour (pressed chip, summaries, "For your [model]").
- **Double animation / ScrollTrigger:** story.js runs no GSAP tweens and creates no triggers. Its only ScrollTrigger use
  is a debounced, feature-detected `refresh()` (160 ms), so there is nothing to kill on unload.
- **Timing:** the CSS transitions use `--duration-fast/base` with `--ease-candy/standard`, following the DESIGN.md idiom.
- **Lint:** `motion-lint` PASS (0 errors; the flags are in `theme.css`, not INF-4). `dash-scan` on both files PASS
  (0 shopper hits). `node --check` OK.
- **Claims:** the JS strings make no claim. The ratings line ("Rated 4.9/5 on Google · +1000 reviews") and
  "Ships in 1-3 business days" are buy box and guarantee Liquid, outside INF-4.

### Minor (not blocking)

1. **Settle can resolve while a smooth scroll is still on its way.** At 667x375 with the `[data-cvw-model]` proxy, the
   first probe focused at 498 ms. The button was then at -349 px (`preventScroll: false`), so the browser jumped it into
   view. The end state was correct. The cause was a headless frame stall, which a real browser rarely hits.
   On the live PDP, though, `refreshSoon()` (`ScrollTrigger.refresh()` 160 ms after `cvs:layout`) runs while
   INF-5 pins exist. That can cancel the smooth scroll mid-way and turn the glide into a jump. Worth a look when
   INF-5 pins are on the same page (for example, skip the refresh while a backToSlip is pending).
2. **The pending focus is not cancelled by shopper input.** For up to 2 s after the click, a shopper who scrolls away by
   hand gets pulled back to the button: focus without `preventScroll` scrolls it into view. Consider cancelling
   `backTimer` on `wheel`, `touchstart` or `keydown`.
3. **Before a model is chosen,** back-to-slip focuses Add to bag, and Enter then nudges to the picker. That follows
   the owner's decision, but focusing the empty model select directly would save the shopper one step.
4. Carried over from round 1, unchanged and outside the fix:
   - The set's one-tap Add sets `disabled` while busy, which drops focus to `<body>`.
   - "Adding…", "In your bag" and "Try again" have no live region.
   - The summary of a mixed pack names only case 1's variant.
   - Clips do not pause on `visibilitychange`.
   - At 768 the decorative sweets overflow to 791 px (no page scroll).
   - story.js is 33.8 KB uncompressed. PLAN.md sets no budget for INF-4.

## Evidence

- Shots: `verify/INF-4-xp2/shots/` (21 PNG plus console.json), `verify/INF-4-xp2/focus/` (12 viewport PNG plus
  focusprobe.json), `verify/INF-4-xp2/editor/console.json`.
- Probes: `C:/Users/LENOVO/AppData/Local/Temp/claude/D--etsy-vinreport/b84b29f8-4341-428e-b13f-6902ba20cbc3/scratchpad/INF-4-xp2/`
  (`focusprobe.py`, `series.py`, `crop.py`, `crops/`).
