# INF-4: PDP story behaviour

Files: `assets/cv-pdp-story.js`, `assets/cv-pdp-story.css` (diff against HEAD; no commit made).
Requests outside these files: `requests/INF-4.md`. No locale keys requested (all strings come from
`data-i18n-*` attributes with English fallbacks, so nothing references a missing key).

## What changed and why

### assets/cv-pdp-story.js (rewritten around per-module lifecycle)

- **Lifecycle.** Seven modules (fit, set, shelf, closer, reel, snap, ugc), each `init(root, bag)`. Every
  listener, observer, timer, rAF and fetch goes through a per-root bag; `destroy` clears it. Boot on
  `DOMContentLoaded` or at once; `shopify:section:load` re-inits the roots in the section (destroying the old
  instance first), `unload` tears them down, `select` schedules a refresh. Late fetches (set, shelf) are aborted
  and ignored after unload.
- **Model gating (INF-1 contract).** State comes from `cvs:change` `detail.modelConfirmed` / `detail.modelValue`
  and, at boot, `CasifyPDP.state(root)`, because the buy box's first `cvs:change` fires before this file runs
  (the fix for map/cv-pdp-closer.md finding 3). `cvs:change` does not bubble, so modules listen in the capture
  phase on `document`. A re-rendered buy box is then heard without re-binding.
  - fit: chips are pressed only for a confirmed model. The server's first-variant `aria-pressed` is cleared at
    boot (map/cv-pdp-fit.md finding 1). A click dispatches `cvs:choose`, and the buy box's answer marks the chip.
  - set: "For your [model]" and one-tap Add for a model case appear only with a confirmed model. Otherwise the
    card links to the product. A single variant that fits any phone keeps one-tap (map/cv-pdp-set.md finding 1).
    The cards update only when the confirmed model actually changes.
  - closer and guarantee summaries (`[data-cvp-closer] [data-cvp-summary]`): "[product] · Choose your phone"
    until a model is confirmed, then "[product] · [variant] · [n] case(s) · [total]". The total comes from
    `CasifyMoney.format(detail.total)`. The text is written only when it differs, so one change makes one write.
- **Generic hooks (delegated once on document).** `[data-cvw-buy="add|buy"]` calls `CasifyPDP.add/buyNow(root, {from})`,
  so the model nudge stays in cv-product.js. `[data-cvw-model]` dispatches `cvs:choose` with the buy box model index.
  `[data-cvw-pack]` and `[data-cvp-back]` keep their old behaviour. Anchors get `preventDefault`, so
  `<a href="#cvAddForm">` works without JS and does not double-scroll with it.
- **Pack tokens.** `[data-cvw-pct="N"]` gets the buy box `[data-cv-pack][data-cv-qty=N]` `data-cv-discount`. A
  MutationObserver on the buy box and every `cvs:change` re-fill them. The server text stays when no pack or no
  buy box exists.
- **showEachProductOnce.** Now covers shelf items. It hides a filled set with no visible card (heading included)
  and a filled shelf whose cards were all hidden. It runs after each set and shelf fill, before `cvp:set` /
  `cvp:shelf` fire. Both events stay bubbling and keep their old targets: cv-pdp-counter-motion.js listens for
  `cvp:set` and `cvp:setadded`.
- **Reduced motion is read live.** `backToSlip` and snap paging use `auto` scrolling under reduce (snap was always
  smooth, story.js:295). Clips never autoplay under reduce.
- **Strings.** Fit count, set add/adding/added/retry/fit and the summary formats read `data-i18n-*`, then the older
  `data-*-label`, then English. `cart:added` from a set add now carries `{source: 'set', from, qty, items}`
  (fields added only).
- **Refresh.** A debounced `ScrollTrigger.refresh()` (160 ms, feature-detected) runs on `cvs:layout`, after
  fills and on section load and select.
- Not in JS: "From " in cv-pdp-set.liquid:55 is Liquid (it is in the request file).

### assets/cv-pdp-story.css

- `.cvp-shelf[hidden], .cvp-set[hidden], .cvp-shelf__item[hidden] { display: none !important; }` makes the JS
  hiding win over section display rules.
- Under reduced motion, the hover transforms on fit chips, shelf media and the closer CTA are off (their
  transitions already were).

All markup contracts are kept: `data-cvp-fit/-model/-fit-filter/-fit-count/-fit-empty`, `data-option-index`,
`data-cvp-set*`, `data-url-*`, `data-*-label`, `data-cvp-shelf`, `data-cvp-closer`/`-summary`, `data-cvp-back`,
`data-cvw-pack`, `data-cvw-reel*`, `data-cvw-snap*`, `data-cvw-ugc*`, `data-cvw-showcase/-card/-row/-row-item`,
`cvw-card--<tone>`, the events `cvp:filter`, `cvp:set`, `cvp:shelf` and `cvp:setadded`, and `#cvAddForm`/`#cvAddBtn`.

## Harness

The page is `harness/inf-4-story-preview.html`, built from real section renders. Commands, from `tools/`:

```
node render-section.mjs cv-product-counter --fixture ../harness/inf-1/fixture-pdp.json --out ../harness/inf-4-story-preview.html --title "INF-4 story preview"
node render-section.mjs cv-pdp-fit       --fixture ../harness/inf-4/fixture-fit.json       --out ../harness/inf-4/part-fit.html
node render-section.mjs cv-pdp-guarantee --fixture ../harness/inf-4/fixture-guarantee.json --out ../harness/inf-4/part-guarantee.html
node render-section.mjs cv-pdp-closer    --fixture ../harness/inf-4/fixture-closer.json    --out ../harness/inf-4/part-closer.html
node render-section.mjs cv-pdp-set       --fixture ../harness/inf-4/fixture-set.json       --out ../harness/inf-4/part-set.html
node render-section.mjs cv-pdp-set       --fixture ../harness/inf-4/fixture-set-empty.json --out ../harness/inf-4/part-set-empty.html
cd ../harness/inf-4 && python -I build.py --fresh
```

The page has the Shop Counter (product.json main: 3 tiers, packs, Buy now), the set (product.json `set`, with a
strap that has one variant and a clear case per model), a second set whose recommendations hold only a sold-out
product (filled, zero cards), the fit list and guarantee (stored settings), the closer (defaults), and one fixture
section, "hooks", holding `[data-cvw-pct=2|3|4]` and the three proxies.

The acceptance snippet is `scratchpad/INF-4/story_actions.py`
(`C:/Users/LENOVO/AppData/Local/Temp/claude/D--etsy-vinreport/b84b29f8-4341-428e-b13f-6902ba20cbc3/scratchpad/INF-4/story_actions.py`).

## Acceptance proof

| Item | Command | Result |
|---|---|---|
| No model name before a choice | `python -I shoot.py ../harness/inf-4-story-preview.html --out ../verify/INF-4/story --rm --nojs --widths 375,1440 --actions <snippet> --allow-net "cdn\.shopify\.com/videos"` | PASS, default and rm at 375 and 1440, 0 failed expects. Before a choice: no fit chip pressed, both summaries "[product] · Choose your phone", no "For your" note, the clear case shows its link (no Add), the strap keeps Add. Proxy Add and Buy now send `cvs:needmodel` twice and post no cart/add. |
| After a choice every summary updates once | same run | PASS: a MutationObserver per summary counted `[1, 1]` after a fit click. Each summary names iPhone 17 Pro, the case count and a $ total. Only that chip is pressed, and the clear case shows Add and "For your iPhone 17 Pro". A proxy Add then posts once (`cvs:added` once). |
| pct tokens follow a changed `data-cv-discount` | same run | PASS: tokens 2 and 3 equal the buy box discounts. Setting pack 2 to 25 makes token 2 read "25". Token 4 (no such pack) keeps "40". |
| Set heading hides with zero cards | same run | PASS: the empty set is `hidden` with computed `display: none`, and the set with cards stays visible. |
| load/unload leaves one listener per module | same snippet, step F (3 manual unload/load cycles of every story section) | PASS: after reloads one fit click gives `cvs:choose` = 1 and summary writes `[1, 1]`. Chips re-mark the confirmed model at boot and the pct token keeps the live value. |
| | `python -I shoot.py ../harness/inf-4-story-preview.html --out ../verify/INF-4/story-editor --only default --widths 375 --no-scroll --query editor=4 --allow-net "cdn\.shopify\.com/videos" --allow-leak document:keydown --allow-leak document:visibilitychange --allow-leak window:resize` | PASS with three allowed keys. Without the allowance it FAILS on those three keys. Trace (`verify/INF-4/story-editor-trace/console.json`, `editor=4&trace=1`) puts them in `cv-pdp-video-reviews.js:32` on the buy box section reload, not story.js. Logged in `requests/INF-4.md`. No story.js key grows. |
| No-JS | same run, nojs | PASS: page renders, 0 errors. Summaries keep the server text, which still names the first variant until the wave units change the Liquid (request file). |
| motion-lint | `python -I motion-lint.py ../../../assets/cv-pdp-story.js ../../../assets/cv-pdp-story.css` | PASS, 0 errors, 0 flags |
| dash-scan | `python -I dash-scan.py ../../../assets/cv-pdp-story.js ../../../assets/cv-pdp-story.css` | PASS, 0 shopper hits |
| theme check | `python -I tc-compare.py --allow-missing-keys ../locale-requests` | PASS, no new offenses versus the 0 error / 8 warning baseline |
| syntax | `node --check assets/cv-pdp-story.js` | OK |

The first run without `--allow-net` failed only on `net::ERR_ABORTED` for the buy box's video-review mp4 on
cdn.shopify.com (fixture content from product.json, not from INF-4 files).

Screenshots, in `verify/INF-4/story/`: `default-375.png`, `default-1440.png`, `*-needmodel.png`,
`*-after-choice.png`, `rm-*.png`, `nojs-*.png`. Only `default-375-after-choice.png` was opened: the buy box shows
iPhone 17 Pro chosen, with the pack and slots. The full-page story sections were not inspected by eye.
Editor shots are in `verify/INF-4/story-editor/`.

## Open issues

- The cv-pdp-video-reviews.js editor leak is outside INF-4 (request 1).
- The first paint and no-JS server text of fit, closer and guarantee still come from
  `selected_or_first_available_variant`. JS corrects them at boot. The Liquid fix belongs to the wave units
  (request 2).
- Shelf dedupe, reel, snap and ugc have no fixture on this page. They kept their logic and gained lifecycle only.
  The INF-5 harnesses (`harness/inf-5-verify/clips.html`, `reel.html`) were not re-run against this file.
- Full-page screenshots of the story sections were not reviewed by eye. The time box ended.
- File size went from about 18 KB to 32.8 KB uncompressed (comments included).

## Fix round

### Defect 1: back-to-Add-to-bag focus landed off screen (fixed)

Confirmed first. `#cvAddForm` is 1500 px tall at 375 and 1332 px tall at 1440. `backToSlip()` centred the form,
which pushed `#cvAddBtn` below the fold, and then `focus({preventScroll:true})` focused it there.

Root cause fix in `assets/cv-pdp-story.js` `backToSlip()`:
- The scroll target is chosen by height. The whole form is centred only when it fits the viewport. A taller form
  centres `#cvAddBtn` itself (`block:'center'`). A hidden button (no client rects) falls back to the form.
- Focus waits for the scroll to settle. A first read comes at 250 ms (0 under reduced motion), then the position is
  read every 80 ms until two reads match (2 s cap). The old fixed 650 ms timer could fire while a long smooth scroll
  was still moving. A first probe of a safety net showed that focusing mid-scroll can strand the page (768,
  `[data-cvw-model]`: final scrollY 0).
- Safety net: the focus uses `preventScroll` only when the button is fully on screen. Otherwise the focus itself
  scrolls the button into view.
- Every path still calls the same function: the fit chips, `[data-cvp-back]`, `[data-cvw-model]`, `[data-cvw-pack]`
  and the anchor fallback of `[data-cvw-buy]`. No markup contract changed. `cv-pdp-story.css` is unchanged.

Proof (`scratchpad/INF-4/focusfix.py`, results in `verify/INF-4/fix-focus/focus.json`, viewport shots
`verify/INF-4/fix-focus/*-focus.png`). The script focuses the trigger, presses Enter and waits 1.8 s. It then
requires `document.activeElement` to be `#cvAddBtn` with its rect fully inside the viewport. It also records the
rect at the moment `focus()` is called.

| motion | width | fit chip | closer `[data-cvp-back]` | `[data-cvw-model]` proxy |
|---|---|---|---|---|
| default | 375x812 | 380 to 432 of 812 | 380 to 432 | 380 to 432 |
| default | 768x1024 | 487 to 537 of 1024 | 487 to 537 | 487 to 537 |
| default | 1440x900 | 425 to 475 of 900 | 425 to 475 | 425 to 475 |
| reduced | all three | same values | same | same |

- 18 of 18 cases pass in two consecutive runs, with 0 page errors.
- Each case makes one `focus()` call with `preventScroll:true`. The button was already fully visible when focused,
  so the safety net never fired.
- `[data-cvw-pack]` has no element on this harness, so it was skipped.
- `default-375-back-focus.png` was checked by eye. Add to bag sits mid screen with its focus ring showing.
- The repro numbers before the fix were 830 to 882 of 812 at 375 and 889 to 939 of 900 at 1440.

Regression (toolkit):

| check | command | result |
|---|---|---|
| story behaviour | `shoot.py ../harness/inf-4-story-preview.html --out ../verify/INF-4/fix-story --rm --nojs --widths 375,1440 --actions story_actions.py --allow-net "cdn\.shopify\.com/videos"` | PASS: 14 shots, 0 page, console or net errors, 0 failed expects |
| editor reload | same page `--out ../verify/INF-4/fix-story-editor --only default --widths 375 --no-scroll --query editor=4` with the same three `--allow-leak` keys as before | PASS: the three keys that grew are the known `cv-pdp-video-reviews.js` leak (request 1). No story.js key grew. |
| motion-lint | `motion-lint.py` on both files | PASS: 0 errors, 0 flags |
| dash-scan | `dash-scan.py` on both files | PASS: 0 shopper hits |
| syntax | `node --check assets/cv-pdp-story.js` | OK |
| theme check | `tc-compare.py --allow-missing-keys ../locale-requests` | PASS: no new offenses against the 0 error / 8 warning baseline |

Still open from the first round: the Liquid follow-ups in `requests/INF-4.md`, no fixtures for shelf, reel, snap and
ugc, the INF-5 harnesses not re-run, and only some full-page shots reviewed by eye.
