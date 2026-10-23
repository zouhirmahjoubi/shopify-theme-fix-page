# INF-5 verify, fix round (experience lens: motion quality, accessibility, honesty)

Verifier: independent, did not write the code. Date 2026-10-23.
Under test: the fix round on `assets/cv-pdp-home-motion.js` `ribbon()` (lines 259 to 270). `cv-pdp-home.css` and
`cv-pdp-slip-motion.js` are unchanged since round 1 (mtimes 03:28 and 03:25; the JS is 04:22). Diff taken against HEAD a5a12fc.
Harness: `harness/inf-5-verify/{ribbon,journey,reel,clips}.html` (rendered from the real sections, used read-only).
My output: `verify/INF-5-fix-xp/` (ribbon with actions, ribbon-editor, journey, reel, clips).
My scripts (scratchpad `INF-5-xp2/`): `ribbon_xp2.py` (shoot.py actions, 9 steps), `touch_probe.py` (touch taps, offscreen).

## Verdict: PASS (0 blocking)

The round 1 blocking defect (Play leaves the band still while `aria-pressed="false"`) is fixed and I could not
break the toggle with mouse, keyboard or touch.

## Evidence (my runs)

| Check | Result |
|---|---|
| shoot.py ribbon, `--rm --nojs`, 375/768/1440 with `ribbon_xp2.py` | PASS, 9 runs, 0 page, console or net errors, 0 failed expects |
| A: mouse Pause, pointer kept on the toggle | `aria-pressed=true`, band still, `is-paused`, play icon shown (all 3 widths) |
| B: mouse Play, pointer AND focus still on the toggle (round 1 defect) | `aria-pressed=false`, band moves, `is-paused` cleared, pause icon shown (all 3 widths) |
| D: pointer leaves and re-enters the band | hover holds, `aria-pressed` stays false; resumes on leave |
| E: keyboard | toggle is the first Tab stop on the page; `:focus-visible` ring 3px solid gold; focus on the toggle does not hold the band; Enter pauses (`true`), Space plays (`false`, moving) |
| F: user pause, then hidden tab, then visible | stays paused and `aria-pressed=true`; Space plays again |
| H: focusable ribbon content (link injected, then section unload + load) | focus on the link holds the band with `aria-pressed=false`; the 2 cloned links are inside `li[inert]` (not focusable); Tab moves to the toggle; a user pause survives Shift+Tab back to content. This was the untested step F in the implementer's report. |
| I: section unload | ScrollTrigger 2 to 0, clones 0, made toggle removed, `is-marquee` removed |
| Touch (`touch_probe.py`, has_touch, 375 and 768) | tap 1: `true`, still; tap 2: `false`, moving; a tap on the band does not stop it; scrolled offscreen: `is-offscreen is-paused`, still, `aria-pressed` stays false; back in view: moves. 0 errors |
| rm and nojs, 375/768/1440 | no marquee, no toggle, all 3 ribbon items fully inside the viewport, no horizontal scroll |
| Editor leak `?editor=4`, ribbon, 375 and 1440 | PASS, 4 cycles, grew 0, stuck 0 |
| journey, reel, clips, `--rm --nojs`, 375/768/1440 (whole file re-checked after the edit) | PASS, 27 runs, 0 page, console or net errors |
| `motion-lint.py` on the 3 files | 0 errors, 1 flag (`.cvw-ugc__expand`, existing hover affordance): PASS |
| `dash-scan.py` on the 3 files | 0 shopper hits: PASS |
| `node --check` | OK |

Screenshots looked at: `ribbon/default-375.png`, `default-375-A-paused.png`, `default-768-A-paused.png`,
`default-1440-E-focus.png`, `rm-375.png`, `nojs-375.png`, `nojs-1440.png`, `journey/default-375.png`.
The paused state swaps the icon to a play triangle, the gold focus ring shows at 1440, rm and nojs show a tidy
wrapped static band, and the journey 375 narrow path shows all 5 stops.

## Lens checklist

- Without JS: readable, static wrapped band; the toggle is never shown (it is made by JS, `:not(.is-marquee)` hides a printed one).
- Reduced motion: no marquee and no toggle (nothing moves, so nothing to pause); icons rest drawn (CSS rm block).
- State as text/colour: `aria-pressed` plus the pause/play icon swap. Holds from hover, focus, offscreen and hidden
  tab set `is-paused` but never touch `aria-pressed`, so the control only announces the shopper's own choice. Correct pattern.
- Double animation: the band's `skewX` and the track's `xPercent` are GSAP only; CSS uses the separate `rotate`
  property on the band and only `will-change` on the track. No transition on either.
- Loops pause offscreen and in a hidden tab (verified). ScrollTrigger cleanup on unload verified.
- No aria-live needed (a toggle with `aria-pressed` announces itself). Inert clones are not focusable (verified).
- Honesty: the fix adds no shopper string. Locale request `sections.pdp_ribbon.pause` = "Pause the moving ribbon": no claim, no dash.

## Minor (non-blocking)

- After Play the hover hold is cleared, and it only returns when the pointer leaves and re-enters the ribbon. A mouse
  user who presses Play and then slides onto the band to read it sees it keep moving (step C, all widths). This is the
  stated design ("Play is an explicit request") and is acceptable, but a `pointermove` that re-arms the hold once the
  pointer leaves the toggle would feel more natural.
- Moving keyboard focus from ribbon content to the toggle releases the focus hold (step H). Consistent with "focus on
  the toggle is not a hold"; noted only.
- Carried from round 1, unchanged: the toggle's label is the static English fallback until U2.x prints the button with
  `| t` (requested); at 375 the 44 px toggle covers about 2 words of the passing text; at 1440 it sticks out below the
  tilted band. The gold focus ring (`--gold-400`) is about 1.8:1 against the cream page where it overhangs the band
  (it is about 3:1 over the red band); WCAG 2.4.7 is met, a darker ring would help 2.4.13.
- Carried from round 1: entrance durations (0.5 to 1.8 s, back/elastic/bounce) are scroll set pieces well past the
  DESIGN.md 160/240/420 ms idiom; style note only.
- Process: the merged `harness/inf-5-pdp-home-preview.html` named in PLAN acceptance was never built; per-section pages
  stand in for it. Reel prev/next and `data-cvw-pin` stay untested until U5.12 and U2.4 print their hooks.
