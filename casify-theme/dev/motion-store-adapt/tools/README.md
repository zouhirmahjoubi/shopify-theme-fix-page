# Verification kit (dev only, never uploaded)

Every tool documents its own flags in its header. Run them from this folder with `python -I`.

| Tool | What it proves | Fails when |
|---|---|---|
| `tc-compare.py` | `shopify theme check` on a clean copy of the uploaded folders, against the 0 error / 8 warning baseline | any error, or a (file, check) count above baseline |
| `schema-validate.py` | section and block schemas, and every template and section group that stores their settings | invalid JSON, bad defaults, a stored setting or block type the schema no longer declares |
| `liquid-balance.py` | Liquid block tags open and close, including inside `{%- liquid -%}` | any imbalance |
| `dash-scan.py` | no en or em dashes in shopper copy (Liquid text, schema defaults, templates, locales, JS strings) | unit mode: any shopper hit in the named files |
| `motion-lint.py` | reduced-motion path, theme-editor reload handling, no `setInterval`, no new scroll listeners, no CDN imports, plugins feature-detected | any rule hit in changed files |
| `render-section.mjs` | renders a real section with liquidjs and a JSON fixture into a harness page | render error |
| `shoot.py` | Playwright screenshots at 375, 768, 1440; `--rm` reduced motion, `--nojs` JavaScript off; console and page errors; `?editor=N` theme-editor reload leak check | page error, failed expectation, or leak |
| `stub-fetch.js` | stubs `/cart/add.js`, `/cart/change.js`, `/cart.js` and the Section Rendering API; `?fail=1` makes them fail | (helper) |
| `kit-selftest.py` | the editor leak detector itself: correct cleanup passes, real leaks fail | any wrong verdict |

## Typical unit check

```bash
python -I tc-compare.py --allow-missing-keys ../locale-requests
python -I schema-validate.py --quiet
python -I liquid-balance.py <changed .liquid files>
python -I dash-scan.py <changed files>
python -I motion-lint.py
node render-section.mjs <section> --fixture fixtures/<f>.json --out ../harness/<unit>/<page>.html
python -I shoot.py ../harness/<unit>/<page>.html --out ../harness/<unit>/shots --rm --nojs
python -I shoot.py ../harness/<unit>/<page>.html --out ../harness/<unit>/shots-editor --only default --widths 375 --no-scroll --query editor=4
```

Then open the PNGs and look at them. A green run is not the same as a page that looks right.

## Editor leak check (`?editor=N`)

The harness replays `shopify:section:unload`, a fresh copy of the section markup, `load` and `select` N times.
It counts `window` and `document` listeners, plus live `ScrollTrigger` and `Observer` instances, after
cycle 1 and after cycle N. Growth between the two is a per-reload leak and fails the run (`--allow-leak REGEX`
for a known, accepted one). Listeners removed through an `AbortSignal` or registered `{once: true}` count as
removed. Known limit: the harness swaps the section's inner HTML, while Shopify replaces the whole
`.shopify-section` element, so state stored on that wrapper element is not exercised.

If you change `harness-template.html` or `shoot.py`, run `python -I kit-selftest.py` (exit 0 = all five
verdicts right).
