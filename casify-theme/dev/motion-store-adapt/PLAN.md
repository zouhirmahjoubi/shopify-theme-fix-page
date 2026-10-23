# PLAN: Casify motion + store adaptation (build phase)

Written 2026-10-23 from `STORE-FACTS.md`, `MOTION-SYSTEM.md`, `DECISIONS.md`, `families.json`
and all 95 files in `map/` (the maps are authoritative; cite them as `map/<section>.md`).
Paths are relative to `D:/Shopify Theme Fix & Page/casify-theme/` (quote it: spaces and `&`).
Branch `feat/motion-store-adapt` (checkpoint `e5ef095`). Delivery is commits on the branch only;
the owner runs `shopify theme push --unpublished`. Never `shopify theme dev` against the live
theme (PRODUCT.md:74), never touch `christmas candles/` (DECISIONS.md:3-4), never use a Shopify
connector or `sed -i`.

House rules every task inherits (do not restate them per unit):

- The products are PHONE CASES. Candy is the set dressing only (STORE-FACTS 8).
- No invented reviews, ratings, counts, guarantees, drop/magnet/lab numbers or performance
  claims. A claim renders only when PRODUCT.md "Evidence on Hand" backs it, or the value comes
  from a merchant setting or live store data at render time (STORE-FACTS 7).
- No em or en dashes in shopper-facing copy (Liquid text, schema `default`/preset values that
  render, template JSON values, locale strings, JS strings). Use "1 to 3", a comma or a colon.
- Every animation: reduced-motion path (`gsap.matchMedia()` with
  `(prefers-reduced-motion: no-preference)`, MOTION-SYSTEM 4.4 shape 3), complete static state
  without JavaScript (finished state is the CSS default; only decorative pieces hide under a
  `*-pending` class with a 1200 to 1600 ms timeout, MOTION-SYSTEM 4.3), theme-editor lifecycle
  (`shopify:section:load/unload/select`, `shopify:block:select`, MOTION-SYSTEM 4.6), offscreen
  and hidden-tab pause for loops, a visible pause control for anything auto-running.
- Motion never owns state (MOTION-SYSTEM 4.9). Commerce stays in `cv-product.js`, `cart.js`,
  `cv-quick-pick.js`; motion listens.
- Never pre-select a phone model; resolve a real variant from all options before add
  (STORE-FACTS 4, rules 1 to 8). Quick add always goes through the quick pick
  (`data-cvqp-open`, contract of `snippets/cv-card.liquid:79`), never
  `selected_or_first_available_variant`.
- New motion files use the house skeleton (MOTION-SYSTEM 9, step 5), the section prefix for
  every class, attribute, ease and stored property, and are printed by the section itself
  (`<script src="{{ 'x.js' | asset_url }}" defer></script>`), so units never edit the layout.
  Section-printed scripts run BEFORE the layout's end-of-body scripts (`cv-product.js`,
  `cart.js`, the commerce motion module): call `window.CasifyPDP`, `window.CasifyCart`,
  `window.CasifyMotion` only inside event handlers or after `DOMContentLoaded`, never at parse.
- Do not add `data-cv-reveal`/`data-cv-split` to commerce content (prices, pickers, Add to bag,
  Buy now, cart lines), even after INF-0 scopes them; use GSAP `from()` with JS-set start states.
- Never remove a setting or block type that any `templates/*.json` or section group stores:
  Shopify refuses or drops it on push. Deprecate by hiding (schema `header` "Not used") instead.
- Commit only owned paths: `git add -- <files>`; never `git add -A`. One commit per unit,
  message `<unit-id>: <summary>`.

---

## 0. Order of execution

```
INF-V  verification kit                     (serial)
INF-0  reveal safety + cv-motion.js + theme.css + theme.js   (serial)
INF-1  commerce core contract: cv-product.js                 (serial)
INF-2  cart core: cart.js, drawer, quick pick, theme settings (serial)
INF-3  commerce motion module (GSAP)                          (serial)
INF-4  PDP story behaviour: cv-pdp-story.js/.css              (serial)
INF-5  PDP home motion: cv-pdp-home-motion.js/.css, slip motion (serial)
LOC-1  locale keys for wave 1 + locale dash fixes            (serial)
WAVE 1 commerce (5 units, parallel)        -> TPL-1 (serial, owner-gated)
LOC-2 -> WAVE 2 live PDP (10 units)        -> PDP-SHARED-2 (if requested) -> TPL-2
LOC-3 -> WAVE 3 live home + shell (14 units) -> TPL-3
LOC-4 -> WAVE 4 live pages + reviews (11 units) -> TPL-4
LOC-5 -> WAVE 5 orphans (12 units)         -> PDP-SHARED-5 (if requested)
FIN-1  layout + theme.css cleanup (serial)
FIN-2  full verification sweep (serial)
```

INF tasks are done by one agent each, in this order, and each must pass its acceptance tests
before the next starts. A wave starts only after its LOC task and the previous wave's TPL task.

---

## 1. Shared infrastructure (build FIRST, serially)

### INF-V: verification kit

- **Files (new only):** `dev/motion-store-adapt/tools/tc-compare.py`,
  `tools/schema-validate.py`, `tools/liquid-balance.py`, `tools/dash-scan.py`,
  `tools/motion-lint.py`, `tools/harness-template.html`, `tools/README.md`.
- **What each does:**
  - `tc-compare.py`: copies the theme (minus `dev/`, `.git/`) to the scratchpad, runs
    `shopify theme check --output json`, compares with `theme-check-baseline-clean.json`
    (0 errors, 8 warnings: `amazon-styled-reviews` ExcessiveSettingsCount;
    `cv-product-counter` ExcessiveSettingsCount + LiquidComplexity; `review-widget`
    ExcessiveSettingsCount; `snippets/cv-fonts.liquid` RemoteAsset x3;
    `snippets/cv-showcase-card.liquid` UnclosedHTMLElement). Match warnings by file + check, not
    by row (rows move). Exit non-zero on any error or any new (file, check) pair.
  - `schema-validate.py`: parses every `{% schema %}` block and every `templates/*.json` and
    section group (strip the leading Shopify comment), checks block types and setting ids used by
    templates still exist in the schema, `range` defaults inside min/max/step, select defaults in
    options, `enabled_on` shape.
  - `liquid-balance.py`: balances `if/unless/case/for/capture/comment/form/paginate/style/
    javascript/schema/raw` including `{%- liquid -%}` blocks.
  - `dash-scan.py`: reports U+2013/U+2014 and `&ndash;`/`&mdash;` in shopper copy: Liquid
    text outside `{% comment %}`, schema `default` and preset values, template JSON values,
    `locales/*.json`, string literals in `assets/*.js`. Editor-only names/labels/info are listed
    separately as "editor" (fix when touched, not blocking).
  - `motion-lint.py`: for each changed `assets/*.js` that calls `gsap`, asserts a
    `prefers-reduced-motion` path, a `shopify:section:load` listener when it inits per root, no
    `setInterval`, no new `window.addEventListener('scroll'`; for each changed CSS file with
    `animation:` or `@keyframes`, asserts a `prefers-reduced-motion: reduce` override; flags
    unconditional `opacity: 0` start states not scoped to `.js` or a `*-pending` class.
  - `harness-template.html`: the static preview shell (section 5).
- **Acceptance:** all five tools run green on the untouched branch except the known 8 warnings;
  `dash-scan.py` reproduces the STORE-FACTS 7g counts (locales 4, index.json 26, product.json 4,
  page.campaign-guide.json 2, page.json 2, search.json 1).

### INF-0: reveal safety, attribute engine, shared CSS

- **Files:** `layout/theme.liquid`, `assets/theme.css`, `assets/cv-motion.js`, `assets/theme.js`.
- **Changes:**
  1. `layout/theme.liquid`: `<html class="no-js" ...>` and, first thing in `<head>`,
     `<script>document.documentElement.className=document.documentElement.className.replace('no-js','js');</script>`.
     Add generic plugin opt-ins so no unit ever edits the layout for a plugin:
     `gsap_flip` and `gsap_path` also true when `content_for_layout contains 'data-cv-gsap-flip'`;
     `gsap_drag` also when `contains 'data-cv-gsap-drag'`. Load the INF-3 module and stylesheet
     slots (empty files are fine until INF-3): `cv-commerce-motion.css` in `<head>` after
     `theme.css`, `cv-commerce-motion.js` `defer` right after `cart.js` (theme.liquid:342).
  2. `assets/theme.css`: scope every hidden start state to `.js`:
     `[data-cv-reveal]` and its variants (theme.css:1073-1084), `.cv-split .cv-word`
     (:1086-1092), `[data-cm-reveal]` (:895), `[data-halo-reveal]` (:3906), `.cv-clip`
     (:1863), `.cv-callout` (:1636), card chips (:2386). Add a 2.5 s safety: `.js.cv-reveal-timeout
     [data-cv-reveal]` resolves visible (class set by cv-motion.js if it never finishes boot).
     Delete the unbacked ticker text in `.awning::after` "FREE SHIPPING OVER $40" (theme.css:169-170,
     `map/header.md` finding 1) and leave the pseudo element empty; comment the reason.
     Add tokens for JS: `--cv-ease-soft`, `--cv-ease-candy` already exist (:81-84); add nothing else.
  3. `assets/cv-motion.js`: public `window.CVMotion = { scan(root), finish(root) }`; rescan the
     section on `shopify:section:load`, `finish` on `shopify:section:select` and
     `shopify:block:select`; live reduced-motion change (resolve everything visible on switch);
     `data-cv-split` sets `aria-label` on the heading and `aria-hidden` on word spans, and skips
     headings that contain child elements (keeps markup); `data-cv-scroll-to-buy` hides itself
     (adds `hidden`) when neither `.cv-buy` nor `#cvPdp` exists, and respects reduced motion;
     `data-cv-count` writes the final value as server text first (never prints 0 without JS).
     Do NOT change the `story` or `ugc` modules' behaviour (they serve orphan/placed sections
     that are being moved off them, see U3.12 and U5.10); only add section:load rescans.
     Fix header comments (MOTION-SYSTEM 7.10).
  4. `assets/theme.js`: `data-cm-reveal` rescan on `shopify:section:load`; `toast(title, body,
     tone)` honours `tone` ('danger' adds `toast--danger`, MOTION-SYSTEM 5.8); delete the dead
     demo `addToBag()` bound to `#addBtn`/`#addBtnMobile` (theme.js:112-160, no live markup).
     Add `.toast--danger` style in theme.css.
- **Public API:** `CVMotion.scan(root)`, `CVMotion.finish(root)`; attribute
  `data-cv-gsap-flip` / `data-cv-gsap-drag` (plugin opt-in, print anywhere in the section's first
  server render); `html.js` / `html.no-js`.
- **No-JS:** `html.no-js` keeps every revealed node visible. **Reduced motion:** unchanged CSS
  mirror (theme.css:3219-3270) plus live switch.
- **Acceptance:** harness `harness/inf-0-reveal-preview.html` with `data-cv-reveal`,
  `data-cm-reveal`, `data-halo-reveal`, `.cv-callout`: (a) `?nojs=1` shows all content;
  (b) JS on: reveals play once; (c) injecting a cloned section and dispatching
  `shopify:section:load` reveals it; (d) `?rm=1` everything visible instantly; (e) a page with
  no `.cv-buy` hides `data-cv-scroll-to-buy` buttons; (f) danger toast is red, success teal;
  `tc-compare.py` green.

### INF-1: commerce core contract (`assets/cv-product.js`)

- **Files:** `assets/cv-product.js` only. Additive changes; never rename events or remove
  `detail` fields (`map/cv-product-counter.md` Risks).
- **Changes and public API:**
  - Multi-root, re-initialisable: `window.CasifyPDP = { init(root), destroy(root), add(root,
    opts), buyNow(root, opts), state(root) }`. All queries scoped to the root (today
    `document.querySelector('[data-cv-pdp]')`, cv-product.js:26). Boot every `[data-cv-pdp]`;
    re-init on `shopify:section:load`, destroy on `unload`, no duplicate listeners.
  - Model confirmation: `root.dataset.cvModelConfirmed` is `'true'` only after an explicit
    model choice (select change, `cvs:choose`, swatch of the model option) or when the URL carries
    `?variant=`. `cvs:change` detail gains `modelConfirmed` and `modelValue`. Add to bag / Buy now
    pressed with an unconfirmed model on a product that has a model option: do not post; dispatch
    `cvs:needmodel` `{ button }`, focus the model select, write "Choose your phone model first"
    (from `data-i18n-choose-model`) to `#cvStatus`. Products without a model option (lens film)
    are unaffected (STORE-FACTS 4 rule 3).
  - Errors: on add or buy failure set `is-error` on the pressed button(s) for 1200 ms and
    dispatch `cvs:error` `{ message, button, kind: 'add'|'buy' }` (MOTION-SYSTEM 6.2, 10.2).
  - `cvs:adding`, `cvs:added`, `cvs:buying` detail gain `from` (the pressed element, or
    `opts.from` when a proxy called `CasifyPDP.add/buyNow`) and `img` (current variant image src).
  - Document `cart:added` detail: `{ source: 'pdp', from, img, qty, items }` (today none,
    MOTION-SYSTEM 6.3, 10.4). `cart:refresh` unchanged.
  - Money: `window.CasifyMoney = { format(cents) }` using the root `data-money-format`, else
    `window.themeMoneyFormat` (MOTION-SYSTEM 6.7, 10.6).
  - Sticky: dispatch `cvs:sticky` `{ visible }` when `#cvSticky` toggles (MOTION-SYSTEM 6.10).
  - Layout: dispatch `cvs:layout` after `cvs:slots` / `cvs:models` change heights (for one
    debounced `ScrollTrigger.refresh()` in listeners, MOTION-SYSTEM 8.2).
  - Strings: read every shopper string from root `data-i18n-*` attributes with the current
    English as fallback ("Adding…", "In your bag", "Try again", "To checkout…",
    "Taking you to checkout.", "Unavailable", " each", "Sold out", error text;
    `map/cv-product-counter.md` finding 11). The counter unit prints the attributes in wave 1.
  - Checkout URL from `window.Shopify.routes.root` (already, cv-product.js:646); keep.
- **No-JS:** untouched (form posts natively). **Reduced motion:** n/a (no motion here).
- **Acceptance (`harness/inf-1-pdp-preview.html`, fixture copied from a rendered counter with a
  2-option product and a stubbed `fetch`):** event order adding -> added -> cart:added with
  `from`/`img`; failure sets and clears `is-error` and fires `cvs:error`; unconfirmed model fires
  `cvs:needmodel` and posts nothing; `?variant=` URL counts as confirmed; two roots on one page
  stay independent; unload + load leaves exactly one add per click; `CasifyMoney.format(4999)`
  equals Liquid `money` for `${{amount}}` and `{{amount_with_comma_separator}} €`; existing
  listeners (`cv-pdp-counter-motion.js`, `cv-pack-motion.js`, `cv-pdp-carousel.js`,
  `cv-pdp-video-reviews.js`, `cv-pdp-story.js`) still receive unchanged detail fields.

### INF-2: cart core, drawer, quick pick, theme settings

Absorbs the live section **cv-cart-drawer** (both its store fixes and its markup).

- **Files:** `assets/cart.js`, `snippets/cart-drawer.liquid`, `sections/cv-cart-drawer.liquid`,
  `assets/cv-cart-drawer.css` (new), `sections/header.liquid` (ONLY the inline drawer CSS block
  :196-207, moved into `cv-cart-drawer.css`), `assets/cv-quick-pick.js`,
  `snippets/cv-quick-pick.liquid`, `config/settings_schema.json`.
- **Theme settings (one source of truth, `config/settings_schema.json`, group "Packs and
  shipping"):** `cv_pack_2_pct` (default 18) and `cv_pack_3_pct` (default 31), info "Must equal
  the automatic discounts in Shopify admin, or page and checkout prices differ"
  (backed: PRODUCT.md:39); `cv_free_shipping_all` (checkbox, default false, info "Turn on only if
  checkout charges $0 shipping on every order"; owner question Q6); `cv_open_drawer_on_add`
  (checkbox, default false; owner question Q3). Sections read these as the fallback for any pack
  percentage text; no unit hard-codes 18 or 31 again.
- **cart.js:**
  - Qty and remove become in place: `POST /cart/change.js`, then re-render the drawer via
    Section Rendering; no `location.reload()` (cart.js:111-124). Handlers skip when
    `event.defaultPrevented` (the /cart page script owns its own lines, U1.4).
  - `refreshDrawer()` returns its promise through `CasifyCart.refresh()`; after a swap dispatch
    `cart:drawer:refreshed` `{ added: [keys], removed: [keys], changed: [keys], cart }`.
    Dispatch `cart:drawer:open` / `cart:drawer:close`.
  - Closed drawer is `inert` (and `aria-hidden`), opened drawer drops `inert` (`map/cv-cart-drawer.md` finding 7).
  - Card forms (`form[data-cart-add-form]`) dispatch `cart:added`
    `{ source: 'card', from: submitter, img: closest [data-cvm-fly-img] src, qty }`.
  - Legacy aliases: listen to `cart:updated` (cv-home-conversion.js:313) and
    `casify:cart:updated` (build-box.js:130) and treat them as `cart:refresh`.
  - Optional open after add: on `cart:added`, when `cv_open_drawer_on_add` is on (printed as
    `data-open-on-add` on the drawer), open after the refresh resolves.
  - Toasts pass tone; error toasts use `toast--danger` (INF-0).
- **Drawer markup (`snippets/cart-drawer.liquid`):** Subtotal from
  `cart.items_subtotal_price`, each `cart.cart_level_discount_applications` row, Total from
  `cart.total_price` with `aria-live="polite"` (finding 1); pack nudge line from
  `settings.cv_pack_2_pct/3_pct` driven by `cart.item_count` (finding 2); "Phone:" model first via
  `item.options_with_values` and the STORE-FACTS 4 name rule, raw merchant value escaped
  (finding 3); empty state link to `routes.all_products_collection_url` (finding 4); remove
  button `data-cart-remove` with product name in `aria-label` (finding 5); every string through
  locale keys (finding 6, LOC-1); inline styles moved to `cv-cart-drawer.css` (finding 9);
  `data-key` and `data-cvm-line` on each line, `data-cvm-drawer-foot` on the footer.
- **cv-quick-pick.js / .liquid:** after a successful add dispatch `cart:added`
  `{ source: 'quick-pick', from: opener, img: chosen variant image, qty }` besides `cv:cart`;
  add an optional secondary "Buy now" (enabled only once colour and phone are chosen; posts the
  same variant then `routes.root + 'checkout'`), shown when the opener carries
  `data-cvqp-buy-now`. Model-first behaviour unchanged.
- **No-JS:** drawer is JS-only (bag link goes to /cart); cards and quick pick openers keep their
  `href` to the product. **Reduced motion:** no motion in these files.
- **Acceptance (`harness/inf-2-cart-preview.html` with a stubbed `fetch` returning fixture
  `/cart.js` and section HTML):** qty change keeps the drawer open and focus on the same stepper;
  remove deletes the line without reload; `cart:drawer:refreshed` lists the right keys; closed
  drawer is not focusable (Tab skips it); discount rows and Total appear for a 2-item fixture;
  legacy `cart:updated` refreshes the count; quick pick Buy now disabled until both options are
  chosen; `schema-validate.py` green for `settings_schema.json`.

### INF-3: commerce motion module (GSAP)

- **Files (new):** `assets/cv-commerce-motion.js`, `assets/cv-commerce-motion.css`; also
  `assets/cv-header.js` (bag "receive" API and nav un-hide only, `map/header.md` motion 1 and 2).
  Loading slots were added by INF-0. Size budget: 12 KB unminified JS, 3 KB CSS
  (MOTION-SYSTEM 8.1).
- **Public API `window.CasifyMotion`:**
  - `fly(fromEl, { img, qty, target })` -> Promise. Photo-ticket token (aria-hidden,
    pointer-events none) arcs to `target` (default `[data-cvm-bag]`, else `#bagBtn`); MotionPath
    when `window.MotionPathPlugin` exists, else the two-tween arc (MOTION-SYSTEM 1.4, home has no
    MotionPath); `×qty` badge on the token when qty > 1. Resolves immediately under reduced
    motion or with no GSAP.
  - `button(btn, state)` with `'busy' | 'done' | 'error' | 'idle'`: width lock while busy, label
    flip (yPercent, 240 ms, the counter idiom cv-pdp-counter-motion.js:208), DrawSVG check on done,
    x-keyframe shake 0.45 s on error (cv-candy-buttons.js:244-246 shape), release on idle.
  - `price(el, fromCents, toCents, { format })`: proxy tween 0.4 s, `snap: 1`, text written with
    `CasifyMoney.format` or `themeMoneyFormat`; the aria-live node gets only the final value.
  - `packs(groupEl)`: binds a Flip-moved highlight `[data-cvm-pack-highlight]` between
    `[role=radio][aria-checked=true]` children; manual FLIP fallback when Flip is absent.
  - `stamp(el)`: scale 1.3 -> 1, rotation -6 -> 0, `back.out(2)`, 0.42 s.
  - `claim(source)` / `release(source)`: single-flyer rule. While a source is claimed (the
    counter motion claims `'pdp'` until U1.1 delegates), the module does not fly for that source.
- **Declarative attributes (most units need no JS of their own):**
  `data-cvm-btn` (observes `is-busy`/`is-done`/`is-error` with a MutationObserver and calls
  `button()`; children `data-cvm-label`, `data-cvm-icon`), `data-cvm-price` + `data-cents`
  (tweens when `data-cents` changes), `data-cvm-packs` (group for `packs()`),
  `data-cvm-fly-img` (image to fly for adds that start inside it), `data-cvm-stamp` (stamp when it
  becomes visible or un-hidden), `data-cvm-bag` (fly target override), `data-cvm-line`,
  `data-cvm-drawer-foot` (drawer hooks printed by INF-2).
- **Events heard:** document `cart:added` (fly from `detail.from`, then `bagReceive`),
  `cv:cart`, `cart:drawer:open` (children stagger: head stripes x -36 to 0, lines y 12 + fade
  0.05 s stagger `power3.out` 0.35 s, footer settles last; the aside keeps its CSS slide,
  MOTION-SYSTEM 7.1), `cart:drawer:refreshed` (new/changed key gets a ticket-gold flash and its
  photo drops with `bounce.out`; removed lines collapse height 0.3 s; total rolls; pack nudge
  stamps when `item_count` crosses 2 or 3); `[data-cv-pdp]` `cvs:error` (shake + `#cvStatus`
  pulse), `cvs:needmodel` (model select nudge + ring).
- **Bag receive (cv-header.js):** `window.CasifyBag = { receive(), show() }`. `show()` un-hides
  the tucked nav on `cvs:adding` (capture), `cart:added`, `cv:cart` so the token has a target
  (`map/header.md` motion 1; cv-header.js:212-214). `receive()` squashes the bag icon; the badge
  elastic stays in the existing observer (cv-header.js:234-248), so there is one badge bump
  (MOTION-SYSTEM 7.6).
- **CSS (`cv-commerce-motion.css`):** `.cvm-token`, highlight, `.is-error` colour for buttons
  that opt in, `html.cvm-on [data-cvm-btn] { transition: none }` so GSAP and CSS never both
  animate the transform (MOTION-SYSTEM 7.1); `@media (prefers-reduced-motion: reduce)` keeps
  colour and text states only.
- **No-JS:** nothing renders from this module; all states are text and colour owned by
  cv-product.js / cart.js. **Reduced motion:** `gsap.matchMedia`; tokens, shake, roll, stagger
  skipped; `is-error` colour and status text remain. **Hidden tab:** timelines jump to
  `progress(1)`. **Editor:** delegated listeners, nothing per section.
- **Acceptance (`harness/inf-3-commerce-motion-preview.html`):** fly from a button, a card and a
  dialog to a fake `#bagBtn`, with and without MotionPath loaded; one token per add even when the
  counter claims `'pdp'`; `?rm=1` shows no token but the label still changes; `price()` ends on the
  exact formatted string; drawer stagger and new-line flash on fixture HTML; no console error
  when GSAP is absent; `motion-lint.py` green; JS under 12 KB.

### INF-4: PDP story behaviour (`assets/cv-pdp-story.js`, `assets/cv-pdp-story.css`)

Shared by ~20 PDP sections (`map/cv-pdp-*.md` "Shared"). After INF-4/5, wave units do not edit
these four files; any further need goes to `requests/pdp-shared.md` for PDP-SHARED-2/5.

- **Changes:** per-module `init(root)`/`destroy(root)` with section load/unload/select;
  model-confirmed gating from `cvs:change` `detail.modelConfirmed` (INF-1): cv-pdp-set "For your
  [model]" only after a choice and one-tap Add only with a confirmed model, else the card links to
  the product (`map/cv-pdp-set.md` finding 1); cv-pdp-fit chips pressed only after a real choice
  (`map/cv-pdp-fit.md` finding 1); guarantee and closer summaries read "Choose your phone" until
  confirmed (`map/cv-pdp-guarantee.md` finding 1, `map/cv-pdp-closer.md`); a generic pack token
  filler: any `[data-cvw-pct="2|3"]` gets the buy box `[data-cv-pack][data-cv-qty=N]`
  `data-cv-discount`, keeping the server text (from `settings.cv_pack_*_pct`) when no buy box;
  generic proxies `[data-cvw-buy="add|buy"]` call `CasifyPDP.add/buyNow(root, { from: button })`
  and `[data-cvw-model]` dispatch `cvs:choose`; `showEachProductOnce` (story.js:199-235) also
  hides an emptied set and includes shelf items; `cvp:shelf` fires after the shelf fill;
  smooth scroll respects reduced motion (story.js:295); hard-coded "From ", "Adding…",
  "Try again", the closer summary format (story.js:254) read `data-i18n-*` with English
  fallbacks; debounced `ScrollTrigger.refresh()` on `cvs:layout`.
- **Acceptance (`harness/inf-4-story-preview.html` with buy box + set + fit + guarantee
  fixtures):** no model name appears before a choice; after a choice every summary updates once;
  pct tokens follow a changed `data-cv-discount`; set heading hides with zero cards;
  load/unload leaves one listener per module.

### INF-5: PDP home motion (`assets/cv-pdp-home-motion.js`, `assets/cv-pdp-home.css`, `assets/cv-pdp-slip-motion.js`)

- **Changes:** `gsap.context` per section root with load/unload/select (`map/cv-pdp-journey.md`
  motion 5, `map/cv-pdp-ugc.md` motion 3); ribbon marquee gets a visible pause toggle with
  `aria-pressed`, hover/focus pause, offscreen pause (`map/cv-pdp-ribbon.md` motion 1, WCAG 2.2.2);
  guarantee sweets bob and snap photo sway: offscreen pause and settle after 3 cycles
  (`map/cv-pdp-guarantee.md` motion 2, `map/cv-pdp-snap.md` motion 3); journey pin length read
  from `data-cvw-pin` (owned setting added by U2.4) with mobile `ScrollTrigger.batch` stops
  instead of a pin; reel gets prev/next buttons support (`data-cvw-reel-prev/next`) and alt
  "photo n of N" is Liquid (U5.12); ugc screens use the pending pattern instead of opacity 0 until
  trigger (home-motion :458); boot-time `gsap.set` hides (row :398) get the pending fallback;
  `cv-pdp-slip-motion.js` gets the same lifecycle and keeps its `isCounter` guard
  (MOTION-SYSTEM 7.7). `cv-pdp-home.css` adds `.is-offscreen` pause rules and reduced-motion
  overrides for every infinite animation it owns.
- **Acceptance:** `harness/inf-5-pdp-home-preview.html` with ribbon, journey, ugc, reel fixtures:
  pause toggle stops the marquee and announces state; `?rm=1` static; load/unload kills every
  ScrollTrigger (`ScrollTrigger.getAll().length` back to baseline); `motion-lint.py` green.

### LOC tasks (serial, one per wave): `locales/en.default.json` only

- **LOC-1 (before wave 1):** fix the four en dashes ("1[en]3 business days", :15, :16, :17, :209) to
  "1 to 3"; placeholder `you@sweetmail.com` (:5) to `you@example.com` (`map/cv-signup-banner.md`);
  seed keys: `products.buy.adding`, `.in_bag`, `.try_again`, `.to_checkout`,
  `.taking_you_to_checkout`, `.unavailable`, `.sold_out`, `.each`, `.choose_model_first`,
  `.error_generic`; `products.gallery.home`, `.view_3d`, `.view_in_space`, `.zoom`, `.close`,
  `.previous_photo`, `.next_photo`, `.photos_label`; `products.rating.out_of`,
  `.reviews_one/other`, `.no_reviews_yet`, `.write_first_review`, `.store_rating_label`;
  `cart.subtotal`, `.discounts`, `.total`, `.shipping`, `.shipping_free`,
  `.shipping_at_checkout`, `.taxes_note`, `.continue_shopping`, `.remove`, `.remove_item`
  (with `{{ title }}`), `.each_abbr`, `.empty`, `.empty_cta`, `.view_bag`, `.checkout`,
  `.close`, `.phone_label`, `.note_placeholder`, `.pack_nudge_2` and `.pack_nudge_3` (with
  `{{ pct }}`), `.free_shipping_applied`; `quick_pick.buy_now`;
  `collections.filters.*` and `collections.count_*` for U1.5.
- **LOC-2..5:** keys listed under each unit below ("Locale keys") plus every
  `dev/motion-store-adapt/locale-requests/<unit>.json` filed during the previous wave. A unit that
  discovers a missing key mid-wave files the request and uses a schema setting or an existing key
  until the next LOC task; it never edits locales.
- **Acceptance:** valid JSON, no dashes (`dash-scan.py`), every key used by the wave's units
  resolves (theme check `TranslationKeyExists` 0 errors).

### TPL tasks (serial, owner-gated): shared templates only

`templates/product.json`, `templates/product.convert.json`, `templates/index.json`,
`templates/page.json`, `templates/page.about-us.json` are edited ONLY by TPL-1..4. Single-owner
templates (`cart.json`, `collection.json`, `search.json`, `404.json`, `article.json`,
`blog.json`, `list-collections.json`, `page.contact.json`, `page.campaign-guide.json`,
`page.reel-showcase.json`, `page.faq.json`, `page.track-order.json`, policy page templates,
`product.best.json`, `article.reviews.json`, `blog.reviews.json`, section groups) are edited by
their unit. Units write the template changes they need to `requests/tpl-<wave>.md` (section key,
setting id, old value, new value, reason, owner-gated yes/no).

- Without owner answers a TPL task applies only: dash replacements, values that only re-point a
  new gate setting, and removals of sections from `order` that render nothing.
- Claim value changes wait for Q1/Q2 (section 6). Never write sample reviews, counts or clips.

### PDP-SHARED-2 / PDP-SHARED-5 (serial, only if requested)

Same files as INF-4/INF-5. Apply the requests filed in `requests/pdp-shared.md` during the wave;
re-run the INF-4/5 acceptance harnesses.

### FIN-1: layout and theme.css cleanup (serial)

- `layout/theme.liquid`: gate ScrambleText/Text on `data-cvsu-postmark` once U3.13 prints it
  (`map/cv-signup-banner.md` motion 1); gate `cv-pdp-reviews` module and
  `cv-customer-experience.js` on their markup (`map/cv-pdp-reviews.md` motion 4; layout :323-324);
  remove gates for files units retired.
- `assets/theme.css`: delete rule blocks that units copied into owned CSS
  (cv-ugc :1817-2006, `.cv-trustbar*` :1659-1678, `.cv-risk/.cv-guard*/.cv-faq*/.cv-closer*`,
  `.halo-*` blocks of retired halo sections, `.p3d` :2716-2719) only after grepping that no
  Liquid still uses them.
- `assets/gsap-init.js`: `ScrollTrigger.config({ ignoreMobileResize: true })` (MOTION-SYSTEM 8.2).

### FIN-2: full verification sweep (serial)

All tools on the whole theme, every harness under `harness/`, dash scan over templates and
locales, a manual editor checklist (add, reorder, select, remove each touched section in a
development theme that is NOT the live theme), and a report of remaining owner-gated items.

---

## 2. Shared file ownership (who may edit what, per wave)

| Shared file | INF | W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|---|---|
| layout/theme.liquid | INF-0, INF-3 (slots only) | none | none | none | none | none (FIN-1) |
| assets/theme.css | INF-0 | none | none | none | none | none (FIN-1) |
| assets/cv-motion.js | INF-0 | none | none | none | none | none |
| assets/theme.js | INF-0 | none | none | none | none | none |
| assets/cv-product.js | INF-1 | none | none | none | none | none |
| assets/cart.js, snippets/cart-drawer.liquid, sections/cv-cart-drawer.liquid | INF-2 | none | none | none | none | none |
| assets/cv-quick-pick.js, snippets/cv-quick-pick.liquid | INF-2 | none | none | none | none | none |
| config/settings_schema.json | INF-2 | none | none | none | none | none |
| assets/cv-commerce-motion.js/.css | INF-3 | none | none | none | none | none |
| assets/cv-header.js | INF-3 | none | none | U3.1 | none | none |
| sections/header.liquid | INF-2 (drawer CSS only) | none | none | U3.1 | none | none |
| assets/cv-pdp-story.js/.css | INF-4 | none | PDP-SHARED-2 | none | none | PDP-SHARED-5 |
| assets/cv-pdp-home-motion.js/.css, assets/cv-pdp-slip-motion.js | INF-5 | none | PDP-SHARED-2 | none | none | PDP-SHARED-5 |
| locales/en.default.json | LOC-n | none | none | none | none | none |
| shared templates (product, product.convert, index, page, page.about-us) | TPL-n | none | none | none | none | none |
| assets/cv-pdp-counter-motion.js, cv-pdp-counter.css, cv-pack-motion.js, snippets/cv-pack-slots.liquid, assets/cv-pack-slots.css | | U1.1 | none | none | none | none (U5.1 reads) |
| snippets/cv-card.liquid, cv-card-copy.liquid, assets/cv-badges.css | | U1.5 | none | none | none | none |
| snippets/cv-showcase-card.liquid, assets/cv-showcase.css | | U1.5 | none | U3.5 | none | none |
| assets/cv-showcase-motion.js | | none | none | U3.5 | none | none |
| assets/cv-pages.js, assets/cv-pages.css | | U1.5 | none | none | U4.1 | none |
| snippets/cv-sales-note.liquid | | none | none | none | U4.6 | none |
| snippets/cv-video-reviews.liquid, assets/cv-pdp-video-reviews.css/.js | | none | none | none | U4.10 | none |
| assets/review-motion.js | | none | none | none | U4.7 | none |
| assets/casify-customer-reviews.css/.js | | none | none | none | U4.8 | none |
| snippets/cv-stars.liquid | | none | none | none | U4.7 | none |
| assets/halo.js | | none | none | none | none | U5.5 |
| read-only everywhere: snippets/cv-icon.liquid, icon.liquid, gsap.liquid, motion.liquid, casify-logo.liquid, assets/cv-motion-dev.js, motion.min.js, gsap files, hero-sweet-*.webp, pdp-slip-paper.png, contact-bell.webp, cv-spotlight-case.jpg, header-peppermint-*.png | | | | | | |

---

## 3. Waves and work units

Each unit: sections; files it may edit (anything not listed is read-only); store-adaptation
fixes; motion additions; locale keys for the next LOC task; template requests. "Gate" means a
claims gate from section 4. Every unit also writes its harness (section 5).

### WAVE 1: commerce (buy box, packs, cart, Add to cart, Buy now)

**U1.1 Shop Counter and Complete the set** (`cv-product-counter`, `cv-pdp-set`)
- Files: `sections/cv-product-counter.liquid`, `sections/cv-pdp-set.liquid`,
  `snippets/cv-counter-blocks.liquid`, `cv-awning.liquid`, `cv-photo-price.liquid`,
  `cv-product-summary.liquid`, `cv-google-rating.liquid`, `cv-spec-meter.liquid`,
  `cv-case-features.liquid`, `cv-case-feature-icon.liquid`, `cv-product-accordions.liquid`,
  `cv-product-schema.liquid`, `cv-store-ratings.liquid`, `cv-pack-slots.liquid`;
  `assets/cv-pdp-counter.js`, `cv-pdp-counter-motion.js`, `cv-pdp-counter.css` (do not change
  `.cvc__pill`/`.cvc__sold`, used by cv-sales-note on page.json), `cv-pack-motion.js`,
  `cv-pack-slots.css`, `cv-pdp-sales.js`, `cv-pdp-promises.js` (the counter's promise stamps,
  not the cv-pdp-promises section), `cv-case-features.js/.css`, `cv-awning.js`,
  `cv-price-tag.js`, `cv-spec-meter.css/.js`, `cv-google-rating.css`, `cv-pdp-model.css/.js`.
- Store fixes (`map/cv-product-counter.md`): `star_pct` 0 with no rating; empty-rating gate (G1);
  summary row labels store rating visibly or uses product source (finding 2); google_rating block
  reads the section's `external_review_rating/count` so values cannot drift (finding 3);
  video-review heading default "Case clips" (finding 4); sales-note scope setting (G4);
  spec meter and case feature defaults blank (G5, G6); compare-at fallback default "" and only
  when `cart.currency.iso_code == shop.currency` (finding 8); pack `flag_label` derived from
  `discount_pct` when blank, default pcts fall back to `settings.cv_pack_*_pct` (finding 9);
  no-JS variant `<select name="id">` in `<noscript>` and hidden `id` input only from JS
  (finding 10); print `data-i18n-*` on `#cvPdp` for INF-1 strings and localise the Liquid strings
  (finding 11); "Tap to zoom" default "View larger" (finding 12); mobile: sweets in the thumb
  strip smaller than tickets or hidden under 600px (finding 15).
  cv-pdp-set (`map/cv-pdp-set.md`): Liquid hides the heading when filtering leaves zero cards
  (finding 2); copy "For your [model]" only via INF-4 confirmed model; bundle line "[pct]% off
  each at checkout" when a second case reaches the bag, pct from `[data-cv-discount]` /
  `settings.cv_pack_2_pct` (never typed 18/31).
- Motion (`map/cv-product-counter.md` motion 1 to 9): re-init on section load/unload with
  `gsap.context` in `cv-pdp-counter.js` and `cv-pdp-counter-motion.js` (keep `cvp:set`/
  `cvp:setadded`); delegate the fly to `CasifyMotion.fly` via `cart:added` and drop the
  `claim('pdp')`; `data-cvm-btn` on `#cvAddBtn`, `[data-cv-buy-now]`, `#cvStickyBtn` (busy
  morph, DrawSVG check, error shake); Buy now "ticket punch": DrawSVG border stroke during the
  POST, arrow slides out, MutationObserver instead of the `setInterval` watcher (:341-346),
  reversed on `cvs:error`; pack Flip highlight (`data-cvm-packs`) + flag CustomWiggle once on
  1 -> 2/3; per-case price and total `data-cvm-price` tweens from `cvs:change`; savings meter
  GSAP width tween with the CSS transition off under `.cvc.is-motion`; mobile-aware entry
  (`gsap.matchMedia`: desktop timeline as today, below 990px packs/meter/buttons on
  ScrollTrigger once, JS-set start states only); lower buy box `ScrollTrigger.batch` (ship-by,
  rating strip, accordions); sticky bar GSAP in/out on `cvs:sticky` with total roll; photo
  clip-reveal on variant image change; accordion height tween; `cvs:needmodel` nudge on the model
  select. cv-pdp-set: "make it a pair" stamp when the bag reaches 2, model-gate micro-interaction
  on the disabled one-tap Add (`map/cv-pdp-set.md` motion 1 to 3).
- Locale keys: see LOC-1 (`products.*`). Template requests (TPL-1, owner-gated): clear
  `empty_rating_text` on product.json:167 and product.convert.json:12; unify store-rating values
  (Q2); blank "Daniel K." clip name/title/body/stars (product.json:125-135) or remove the clip.
- Watch: counter already has ExcessiveSettingsCount (48) and LiquidComplexity 160; new settings
  go into blocks or snippets, and new decisions into snippets, so no new warning appears.

**U1.2 Colour carousel** (`cv-pdp-carousel`)
- Files: `sections/cv-pdp-carousel.liquid`, `assets/cv-pdp-carousel.css`, `assets/cv-pdp-carousel.js`.
- Store fixes (`map/cv-pdp-carousel.md`): stock line says "In stock" only for tracked inventory,
  else "Made for [n] phone models" (finding 1); first-paint was-price uses the same compare rule
  as the buy box; correct the no-JS comment; strings to locale keys.
- Motion: Buy now button that syncs the variant and calls `CasifyPDP.buyNow(root, { from })`
  (motion 1); Add calls `CasifyPDP.add(root, { from: panelButton })` so the token flies from the
  panel (motion 2); optional pack picker chips that dispatch `cvs:pack` (motion 3); `data-cvm-btn`
  states (motion 4). No `data-cv-reveal`.
- Locale keys: `products.carousel.buy_now`, `.add`, `.made_for_models`, `.in_stock_all`.

**U1.3 Best product** (`main-best-product`)
- Files: `sections/main-best-product.liquid`, `assets/best-product.css`, `assets/best-product.js`,
  `assets/best-case-in-hand.png`, `best-case-detail.png`, `best-case-magnetic.png`,
  `templates/product.best.json`.
- Store fixes (`map/main-best-product.md` 1 to 11): images default to the product's own media
  (AI illustrations only behind a setting, default off); gates G20 (seal, stars, feature copy);
  "Made for your phone" or the chosen model; "1 to 3 business days"; width-clipped real rating
  stars; money via `window.themeMoneyFormat`; Buy now via `window.Shopify.routes.root +
  'checkout'`; pack tiers (1/2/3 from `settings.cv_pack_*_pct`) replacing the free qty stepper so
  page price equals checkout; per-model sold-out marking.
- Motion (motion 1 to 6): drop the runtime CDN Motion and three.js imports (best-product.js:7,
  :201); GSAP only; Add posts through cart.js and dispatches `cart:added` with `from`/`img` so
  INF-3 flies; Buy now press squash + busy via `data-cvm-btn`; tier Flip highlight via
  `data-cvm-packs` and total `data-cvm-price`; variant crossfade; `ScrollTrigger.batch` story
  cards; sticky Add bar on ScrollTrigger; section load/unload.
- Locale keys: `products.best.*` (made_for_phone, show_all_models, buy_now). Template: own
  `product.best.json` values may be blanked here only for schema-default copies; merchant-typed
  values go to `requests/tpl-1.md` (owner-gated).

**U1.4 Bag page** (`cv-cart`)
- Files: `sections/cv-cart.liquid`, `templates/cart.json`, `assets/cv-cart-page.js` (new),
  `assets/cv-cart-page.css` (new).
- Store fixes (`map/cv-cart.md`): remove `data-cv-reveal` from summary, lines, header, empty
  state (findings 1, 2); shipping row "Free" when `settings.cv_free_shipping_all` (finding 3);
  "Phone:" model first, `has_only_default_variant` (finding 4); pack nudge from
  `settings.cv_pack_*_pct` (finding 5); locale keys (finding 6); remove `aria-label` with the
  product (finding 7); aria-live total (finding 8); qty inputs `name="updates[]"` plus a
  `<noscript>` update button for a real no-JS path.
- Motion (motion 1 to 6): page script intercepts qty/remove in capture phase
  (`preventDefault`, so cart.js skips), `/cart/change.js` then
  `?section_id={{ section.id }}` swap; removed line collapses, siblings slide (manual FLIP; Flip
  not loaded on /cart unless `data-cv-gsap-flip` is printed, which this unit may do), changed line
  gold flash; total `data-cvm-price` roll; pack line `data-cvm-stamp` and real discount rows slide
  in; checkout press squash + DrawSVG shackle (never delays submit); GSAP line deal with JS-set
  start states; empty-state bag swing once. Dispatch `cart:refresh` after each change.
- Locale keys: LOC-1 `cart.*`.

**U1.5 Collection grid and product cards** (`cv-collection`)
- Files: `sections/cv-collection.liquid`, `templates/collection.json`,
  `snippets/cv-pack-meter.liquid`, `snippets/cv-card.liquid`, `snippets/cv-card-copy.liquid`,
  `snippets/cv-showcase-card.liquid`, `assets/cv-badges.css`, `assets/cv-showcase.css`,
  `assets/cv-pages.js`, `assets/cv-pages.css`, `assets/cv-collection-motion.js` (new).
- Store fixes (`map/cv-collection.md`): grid not hidden without JS; quick-pick CTA gets an `href`
  to the product; `<noscript>` filter form path; model filter opened first; `cv-card-copy.liquid`
  pills ("MagSafe compatible", "cut for iPhone, Pixel and Galaxy") render only when the product's
  own title/tags/option data says so (G13), else nothing; pack meter reads
  `settings.cv_pack_*_pct` and listens to `cv:cart`/`cart:refresh` instead of polling 1200 ms;
  strings to locale keys; `cv-showcase-card.liquid` stops drawing five stars from a typed
  `review_count` (G14, keep the baseline UnclosedHTMLElement warning count unchanged or fix it);
  rename `.cvcl` rules in `cv-pages.css` (:236-239) to `.cvcls` together with
  `sections/cv-collections-list.liquid` class names is NOT done here (W4 U4.1 owns that section);
  instead U1.5 adds the `.cvcls` duplicates and leaves `.cvcl` for U4.1 to delete.
- Motion (motion 1 to 6): `cv-pages.js` collection modules get section load/unload; shelf-stocking
  `ScrollTrigger.batch` card drop; quick add flies into the pack meter (on `cart:added` with
  `source` quick-pick or card, target `[data-cvm-bag]` on the meter); single-variant Add via
  `data-cart-add-form` + `data-cvm-btn`; filter badge pop and result count roll; Flip on filter
  swap (Flip is loaded on shop pages); pack line stamp at 2/3.
- Locale keys: LOC-1 `collections.*`.

`cv-cart-drawer` is delivered by INF-2 (store fixes) and INF-3 (motion). Orphan commerce
sections (cv-product, main-halo-product, bundle-buybox, cv-home-conversion, halo-xsell) are in
wave 5.

**TPL-1** after wave 1: product.json, product.convert.json requests from U1.1 (owner-gated).

### WAVE 2: live PDP sections (product.json / product.convert.json)

No unit edits cv-pdp-story.js/.css, cv-pdp-home-motion.js/.css or cv-pdp-slip-motion.js; new
motion goes into an owned `assets/cv-pdp-<name>.js` printed by the section; needs in shared files
go to `requests/pdp-shared.md`.

**U2.1 Ship-by ticket** (`cv-pdp-delivery`): `sections/cv-pdp-delivery.liquid`,
`assets/cv-pdp-delivery.css`, `assets/cv-pdp-delivery.js`. Fix en dashes in Liquid (:64, :93,
:147) and JS `formatRange` / fallback (:116-118) to "to"; cut-off countdown setting gets an
unbacked-claim warning and stays off (G30); holidays info text asks the merchant to fill it;
timer every 60 s when no cut-off (:176). Motion: re-stamp "Ordered" on `cvs:added`, optional
DrawSVG/MotionPath curved road (motion 1, 2), parcel rests at "Leaves our shop".

**U2.2 Clips and before/after** (`cv-pdp-ugc`, `cv-pdp-before-after`): `sections/cv-pdp-ugc.liquid`,
`assets/pdp-ugc-*.mp4/.webp`, `sections/cv-pdp-before-after.liquid`,
`assets/cv-pdp-before-after.css/.js`, `assets/cvba-before.jpg`, `cvba-after.jpg`,
`assets/cv-pdp-ugc.js` (new). Fixes: clips bind to the product's own video media or a
`custom.clips` metafield, with the theme clips as store-level fallback copy ("Shop footage",
never "this case", G27); heading count from the real number of clips; remove the sound-button
promise; before/after pair and MagSafe alt only when the product is in a `product_list` setting
or tagged `magnetic` (G28); lede "Drag the handle to compare." only with JS (print with JS or
`.js` CSS). Motion: per-clip "Pick this colour" ticket dispatching `cvs:choose` once clips are
per product; clip-to-dialog Flip; before/after "Choose your phone" bridge via `data-cvp-back`
(guard `template.name == 'product'`), "Case on" stamp, `gsap.matchMedia` live reduce, Flip tab
underline. Template request: fill or remove the empty before/after block in product.convert.json:539-549.

**U2.3 Fit order pad** (`cv-pdp-fit`): `sections/cv-pdp-fit.liquid`, `assets/cv-pdp-fit.js` (new).
Fixes: render with `product.selected_variant` (no pre-pressed chip); placeholder example from
`model_option.values`; `[brands]` token or neutral "phone models" (template request for the
convert subheading); no-JS chips become `?variant=` links. Motion: token arcs from the chip to
the buy box model picker (MotionPath, loaded on product), stamp on chip, Flip filter reflow,
count roll, DrawSVG check.

**U2.4 Ribbon and journey** (`cv-pdp-ribbon`, `cv-pdp-journey`): `sections/cv-pdp-ribbon.liquid`,
`sections/cv-pdp-journey.liquid`, `assets/pdp-home-bicycle.webp`. Fixes: "save [pct2]% or
[pct3]% on each case" tokens filled server-side from `settings.cv_pack_*_pct` and live by
`[data-cvw-pct]` (G24); "Est. 1920" framed as the shop sign (STORE-FACTS 7c) with a setting to
hide; empty items do not render; duplicate default removed; journey `[models]` never prints
"0 phone models"; lede "Scroll to ride along." only where the ride runs (desktop, motion);
`pin_per_stop` setting (30 to 70) printed as `data-cvw-pin`. Motion: packs item becomes a
`[data-cvw-pack]` button; journey stop actions (`data-cvw-pack`, `data-cvp-back`); DrawSVG icon
draw-in; parcel landing stamp.

**U2.5 Showcase cross-sell** (`cv-pdp-showcase`): `sections/cv-pdp-showcase.liquid`. Fixes: CTA
"See the case" only for products with a model option, else "See it"; heading count from the
real card count; variant-level compare-at; SR "reviews". Motion: "Choose phone and add" quick
pick button (`data-cvqp-open`, restructure the single `<a>`), fly via INF-3 on `cart:added`
`source: 'quick-pick'`, price stamp after the deal.

**U2.6 Guarantee and closing card** (`cv-pdp-guarantee`): `sections/cv-pdp-guarantee.liquid`,
`assets/cv-pdp-close.js` (new). Fixes: summary shows "Choose your phone" until confirmed (INF-4);
pack percentages in FAQ and promise blocks as tokens (G24; template request to switch the typed
text); close button `<a href="#cvAddForm">`. Motion: closing Add to bag and Buy now via
`[data-cvw-buy]` proxies (model-first guard by INF-1), live total `data-cvm-price`, tick on
`cvs:added`, FAQ height tween, ink-spread on promise stamps.

**U2.7 Snapshot strip and spotlight** (`cv-pdp-snap`, `cv-pdp-spotlight`, convert template):
`sections/cv-pdp-snap.liquid`, `assets/pdp-home-clothespin.webp`,
`sections/cv-pdp-spotlight.liquid`, `assets/spot-lamp.webp`, `pdp-home-cloche-stand.webp`,
`pdp-home-cloche-dome.webp`, `assets/cv-pdp-spotlight.js` (new). Fixes: snap pull-quote gate
(G25) and not styled as a testimonial; pack stats from live tiers with honest wording ("[pct]%
off each case in a [qty]-case pack"); nav buttons 44px; spotlight drops the `cv-callout` class
(theme.css:1636) so callouts are visible in every state; shop card "each in a [qty]-pack";
lede not overstated (G26); CTA "Choose my phone" glides to `[data-cvc-model]`. Motion: snap
discount stat as `data-cvw-pack="3"` picker, snapshot opens in the main gallery via `cvs:photo`,
count-up of real stats; spotlight live repricing on `cvs:change`, offscreen pulse pause.

**U2.8 Pack comparison** (`cv-pdp-compare`): `sections/cv-pdp-compare.liquid`,
`assets/pdp-home-jar-*.webp(.json)`, `assets/cv-pdp-compare.js` (new). Fixes: prices re-computed
on `cvs:change` (footnote true again), columns read `data-cv-discount` with settings fallback,
jar photos from the chosen variant image, lede rewritten (G29: no "jars change"). Motion: money
tweens, Flip highlight synced to buy box qty, Choose: jar lift then ScrollTo `#cvPdp` and
`cvs:pack`, DrawSVG row rules; Choose buttons get a no-JS anchor to `#cvAddForm`.

**U2.9 Trust bar and details** (`cv-pdp-trust`, `cv-pdp-details`): `sections/cv-pdp-trust.liquid`,
`assets/cv-pdp-trust.css`, `assets/cv-pdp-trust.js` (new), `sections/cv-pdp-details.liquid`.
Fixes: scoped fallbacks for `--cvw-*` vars in the owned CSS; schema info warning on the `@app`
slot (G31); details: editor-only draft note, guard `highlights.size`, info that supplier
descriptions need merchant review. Motion: lock re-clicks on `cvs:adding`/`cvs:buying`, die-cut
icon entrance, no-flicker start; details DrawSVG tick stagger (low).

**U2.10 Product reviews board** (`cv-pdp-reviews`): `sections/cv-pdp-reviews.liquid`,
`assets/cv-pdp-reviews.css/.js`, `assets/pdp-home-chalkboard.webp(.json)`. Fixes: neutral empty
heading; "Live product rating" chip only with a rating or an app block; palette to DESIGN tokens.
Motion: arrive-from-buy-box glide, "Choose my phone" `data-cvp-back`, chalk invite in the empty
state.

Locale keys (LOC-2): `products.pdp.from`, `.choose_my_phone`, `.pick_this_colour`,
`.made_for_models` (count), `.photo_n_of_m`, `.each_in_pack`, `.pack_save_each`,
`.shop_footage`, `.drag_to_compare`, `.no_reviews_heading`, `.see_it`, `.see_the_case`,
`.pause`, `.play`.
**TPL-2** after wave 2 (product.json, product.convert.json).

### WAVE 3: live home and shell

**U3.1 Shell** (`header`, `predictive-search`, `footer`): `sections/header.liquid`,
`sections/header-group.json`, `assets/cv-header.css`, `assets/cv-header.js`,
`sections/predictive-search.liquid`, `sections/footer.liquid`, `sections/footer-group.json`,
`assets/cv-footer.css`, `assets/cv-footer.js`, `assets/footer-*.webp`. Fixes: header `| default`
fallbacks removed so merchants can blank ticker/topbar; free shipping visible (not only in the
aria-hidden ticker); 9 to 10px labels raised; footer blurb and newsletter success copy (G21,
case copy, no dash, no "sweets"); sign alt without dash; mobile shelf keeps the case; error text
contrast; back-to-top `<a href="#">`; predictive search: "From [price]" (no `&ndash;`),
query-only results not "No results", empty state links, `role="listbox"`, live "Made for N phone
models". Motion: ambient loop discipline (awning drift, ticker, mint spin, nav icon pulse pause
offscreen and at rest; `gsap.matchMedia`), mobile menu hanging sign, search panel drop, results
exit and loading state, footer reveal pop fixed (`isInViewport`), newsletter stamp. Do not touch
drawer CSS (moved by INF-2).

**U3.2 Home hero** (`casify-hero`): `sections/casify-hero.liquid`, `assets/casify-hero.css/.js`.
Fixes: honest empty state visible to shoppers when no product (or a design-mode-only note) and
an h1 fallback so the home page always has one; model buttons from the real option values with
the STORE-FACTS 4 normaliser; no model pre-selected. Motion: Add to bag and Buy now after an
explicit model press (posts through cart.js / quick pick, `cart:added` with `from`), model press
choreography, scroll exit scrub, price ticket flip. Template request: `featured_product` (Q5).

**U3.3 Turntable** (`cv-orbit`): `sections/cv-orbit.liquid`, `assets/cv-orbit.css/.js`,
`assets/cv-orbit-*.webp`. Fixes: eyebrow and "Ships in 1 to 3 days" dashes (template request
for live values, schema defaults here); header reveal owned (no `data-cv-reveal`); three.js from
the self-hosted assets used by other modules, not jsdelivr. Motion: "Choose your phone"
`data-cvqp-open` re-pointed by `fillTicket`, pack perk mini meter, turntable entrance.

**U3.4 Phone scan** (`cv-phone-scan`): `sections/cv-phone-scan.liquid`, `snippets/cvps-fit-match.liquid`,
`assets/cv-phone-scan.css/.js`, `assets/cv-phone-scan-type.js`, `assets/cv-phone-scan-duo.webp`.
Fixes: lead model follows catalogue counts (Q5), CTAs filter by model (collection URL with the
model filter param or search), Samsung and older iPhones from real option values; "one mould"
copy gated (G9); store rating values only from settings (no schema defaults). Motion: quick pick
on fit cards, GSAP deal-in for the no-WebGL path, CTA label flip, shorter pin on phones.

**U3.5 Home product rails** (`cv-showcase`, `cv-collection-row`): `sections/cv-showcase.liquid`,
`assets/cv-showcase-motion.js`, `snippets/cv-showcase-card.liquid`, `assets/cv-showcase.css`,
`sections/cv-collection-row.liquid`. Fixes: rail counter "1 to 3 of N" (Liquid :101 and JS :80);
pass `pick: true` so cards add via quick pick; block typed price/review_count settings
deprecated (G14); "Best sellers"/"Most protected this month" and mould subheadings gated (G8,
G9); dedupe rule no longer hides Casify products by title splitting (:58). Motion: one engine on
collection-row cards (drop `data-motion-dev`, GSAP deal), quick add feedback, SplitText heading,
mobile rail progress rule; showcase header owned reveal, media parallax, live pack hint.

**U3.6 Spotlight** (`cv-spotlight`): `sections/cv-spotlight.liquid`, `assets/cv-spotlight.css`,
`assets/cv-spotlight-motion.js`, `snippets/cvsp-icon.liquid`. Fixes: dashes; CAD/molded claims
gated (G9); pack range from theme settings; window uses a bound product's own photo (setting),
studio render only as fallback with neutral alt. Motion: shutters open on the real product with
quick pick and price ticket, live pack meter, scroll scrub of awning, live reduce switch.

**U3.7 Collage** (`cv-collage`): `sections/cv-collage.liquid`, `assets/cv-collage.css`,
`assets/cv-collage-motion.js`. Fixes: video block default URL and caption blank; strings to locale
keys; "styles" count from the style option. Motion: "Pick colour and phone" on product tiles
(quick pick), pack badge from theme settings, depth drift, price tick on hover.

**U3.8 Feature tabs** (`cv-feature-tabs`, index and product): `sections/cv-feature-tabs.liquid`,
`assets/cv-feature-tabs.css/.js`. Fixes: product images as media on the product template; all
panels reachable without JS (render all, hide via `.js`); MagSafe tab only for products whose data
says magnetic (G10); candy-stripes finish tab gated (G10). Motion: GSAP entrance, travelling
indicator, buy box link on product.

**U3.9 Us vs them and value stack** (`cv-vs`, `cv-value-stack`): `sections/cv-vs.liquid`,
`assets/cv-vs.css/.js`, `sections/cv-value-stack.liquid`, `assets/cv-value-stack.css`,
`assets/cv-value-stack-motion.js`, `assets/icon-candy-swirl.svg`. Fixes: per-row conditions
(MagSafe only on magnetic products, prepaid label gated, G11); value stack schema defaults and
preset blanked, all live figures behind G7 (Q1); rename value stack's root attribute to
`data-cvvst` so the two scripts never collide (`cv-value-stack-motion.js:61,:70` binds the first
`[data-cvvs]`); non-numeric metric shows its text. Motion: value stack `init/destroy` with
`gsap.context`, honest pack-savings gauge (1 / 2 / 3 cases from theme settings), stamped vs rows,
quick pick CTA on home, VS coin scroll half-turn, bob stops after the intro.

**U3.10 Guarantee and trust bar** (`cv-guarantee`, `cv-trust-bar`): `sections/cv-guarantee.liquid`,
`sections/cv-trust-bar.liquid`, `assets/cv-guarantee.css` (new, copies `.cv-risk/.cv-guard*/
.cv-faq*/.cv-closer*` from theme.css), `assets/cv-guarantee-motion.js` (new),
`assets/cv-trust-bar.css` (new, copies `.cv-trustbar*`). Fixes: FAQ answers and JSON-LD only
from confirmed facts by default; unverified answers behind G12 (Q1); "zero risk" and
screen-repair copy gated; trust bar items without `data-cv-reveal`, "100% safe & encrypted" and
"Prepaid label" behind G15; 11px sub-text raised. Motion: rubber-stamp cards, closer CTA to quick
pick, closer pack row, offscreen pause of closer CSS loops, CSS-only dealt tickets with visible
resting state on the trust bar, free-shipping tick on `cart:added` only when
`settings.cv_free_shipping_all`.

**U3.11 Social proof** (`cv-social-proof`): `sections/cv-social-proof.liquid`,
`assets/cv-social-proof.css`, `assets/cv-proof-motion.js`, `assets/proof-stamp.webp`. Fixes:
intro default wording true to the source; "Editorial edits: None" and "Source checked" gated
(G16); no skeleton bars without an app block; float average (no integer division) and one
scale_max; store rating labelled "Trustpilot and Google". Motion: star `--fill` sweep with the
count, app ledger batch, float settles, source chips stamp, `gsap.matchMedia`, editor select.

**U3.12 Customer clips rail** (`cv-ugc`): `sections/cv-ugc.liquid`, `assets/cv-ugc.css` (new,
copies theme.css :1817-2006), `assets/cv-ugc.js` (new; the section moves off cv-motion.js's
`data-cv-ugc` module to its own `data-cvug-*` attributes). Fixes: clip defaults blank (G17),
stat default blank, CTA uses quick pick on home (no dead scroll-to-buy), eyebrow dash.
Motion: film-print deal-in, "Pause clips" toggle, `<dialog>` lightbox, shop-the-clip quick pick.

**U3.13 Signup banner** (`cv-signup-banner`): `sections/cv-signup-banner.liquid`,
`assets/cv-signup-banner.css`, `assets/cv-signup-motion.js`. Fixes: case-explicit heading
default ("New cases and restocks", G22 for live values via TPL), privacy link beside consent,
print `data-cvsu-postmark` only on the postmark (FIN-1 then narrows the text plugin gate).
Motion: seal press on submit, bob settles after 3 cycles, DrawSVG underline.

**U3.14 Offer courier** (`cv-offer-courier`, index/product/page): `sections/cv-offer-courier.liquid`,
`assets/cv-offer-courier.css/.js`. Fixes: dashes in defaults, page-template CTA to the catalogue
labelled "See the cases"; pct from theme settings. Motion: card lands within 0.8 s, popup haul
0.9 s, close animation, copy-code stamp, pulse 2/3 pack tiles after the popup scroll,
`gsap.matchMedia`.

Locale keys (LOC-3): `general.search.collection/page/article/view_all/no_results/from_price`,
`sections.collage.from/styles/play_video`, `sections.ugc.pause_clips/play_clips`,
`sections.showcase.counter` (with `{{ from }}`, `{{ to }}`, `{{ total }}`),
`sections.signup.privacy`, `sections.hero.choose_model`.
**TPL-3** after wave 3 (index.json and the dash list in STORE-FACTS 7g).

### WAVE 4: live pages and reviews

**U4.1 Shop pages** (`cv-page`, `cv-contact`, `cv-collections-list`, `cv-blog`): `sections/cv-page.liquid`,
`assets/badge-ai-*.png`, `templates/page.faq.json`, `page.track-order.json`,
`page.privacy-policy.json`, `page.return-policy.json`, `page.shipping-policy.json`,
`page.terms-and-conditions.json`, `sections/cv-contact.liquid`, `templates/page.contact.json`,
`assets/contact-letterbox.webp(.json)`, `sections/cv-collections-list.liquid`,
`templates/list-collections.json`, `sections/cv-blog.liquid`, `templates/blog.json`,
`assets/cv-pages.js`, `assets/cv-pages.css`. Fixes: help_body promise gated (G18, owned
templates here; page.json/page.about-us.json via TPL-4); contact model placeholder from real
option values (datalist), `a-faqs` handle checked against `faq`; collections list strings,
`.cvcl` to `.cvcls` (delete old rules); blog subheading gated (G19), no forced eyebrow, no
`data-cv-reveal`. Motion: ruleBook init/destroy with editor events, help panel bell entrance for
touch, TOC entrance; contact envelope flight then `form.requestSubmit()` (never `submit()`),
invalid-field shake, editor lifecycle; aisle deal-in with real counts; blog
`ScrollTrigger.batch` cards and tag filtering via Section Rendering + Flip.

**U4.2 404 and article** (`cv-404`, `cv-article`): `sections/cv-404.liquid`, `templates/404.json`,
`sections/cv-article.liquid`, `templates/article.json`, `assets/cv-404.js` (new),
`assets/cv-article.js` (new). Fixes: drop-test link and durability wordplay gated (G23);
product-scoped search; comment thanks without dash; no `data-cv-reveal` on the h1. Motion: numeral
entrance with `from()`, optional real-product shelf with quick pick, body-scoped reading progress,
hero clip wipe with an oversized image.

**U4.3 Search** (`cv-search`): `sections/cv-search.liquid`, `templates/search.json`,
`assets/badge-ai-search.png`, `snippets/cv-candy-divider.liquid`, `assets/cv-search.js` (new).
Fixes: chips from live model option values, empty body without dash and manufacturing claim
(G13), count server-rendered, Previous/Next via locale keys. Motion: results batch, "Fits your
phone" stamp, placeholder cycling real models, chip deal-in.

**U4.4 Hanging cards** (`cv-hanging-cards`): `sections/cv-hanging-cards.liquid`,
`assets/cv-hanging-cards.css/.js`. Fixes: aria-label fallback, preset cards link somewhere.
Motion: quick pick on product cards, price ticket flip, strap tension, sway only in view.

**U4.5 Campaign guide and reel showcase** (`cv-campaign-guide`, `cv-reel-showcase`):
`sections/cv-campaign-guide.liquid`, `assets/cv-campaign-guide.css`,
`templates/page.campaign-guide.json`, `assets/cv-campaign-guide.js` (new),
`sections/cv-reel-showcase.liquid`, `assets/cv-reel-showcase.css/.js`,
`templates/page.reel-showcase.json`. Fixes: dashes, pcts from theme settings with live tier totals,
counts not baked into copy, palette remap, unverified feature copy gated (G32), caption not an h1.
Motion: quick-pick CTAs, offer tier stamp + money roll, SplitText hero, GSAP slide swaps with
progress ring.

**U4.6 Sales note page wrapper** (`cv-sales-note`): `sections/cv-sales-note.liquid`,
`snippets/cv-sales-note.liquid`, `assets/cv-sales-note.css` (new). Fixes: default text
count-neutral, merchant-typed count only with the scope setting from U1.1 (G4); own CSS so page
templates stop loading the 51 KB counter CSS; offscreen blink pause.

**U4.7 Product review widget and carousel** (`review-widget`, `review-carousel`):
`sections/review-widget.liquid`, `assets/review-widget.css/.js`, `snippets/rw-review-card.liquid`,
`snippets/rw-photo-review.liquid`, `templates/article.reviews.json`, `templates/blog.reviews.json`,
`sections/review-carousel.liquid`, `assets/review-motion.js`, `snippets/cv-stars.liquid`.
Fixes: typed blocks count only for their product; "Verified buyer" only from a real order flag,
static "2 weeks ago" replaced by a date setting; G2/G3 gates; badge from numeric settings with
star fill from the value; count-up only for `data-rw-source="comments"`. Motion: buy box bridge,
quick pick on "Review of [case]", star sweep, carousel autoplay pause control, drop the three.js
sweets ring when the widget's stage is on the page.

**U4.8 Review rails** (`customer-reviews-carousel`, `trustpilot-reviews`, `facebook-testimonials`):
`sections/customer-reviews-carousel.liquid`, `sections/trustpilot-reviews.liquid`,
`assets/casify-trustpilot-reviews.css`, `sections/facebook-testimonials.liquid`,
`assets/casify-facebook-testimonials.css`, `assets/casify-customer-reviews.css/.js`. Fixes:
"From" price; trustscore requires `profile_url` on trustpilot.com and label "Trustpilot and
Google" for the combined figure; Facebook mark only with a source URL; counts never defaulted.
Motion: one opt-in `.ccr` ticket entrance (`data-ccr-motion`), star sweep, float stoppable and
offscreen-paused, noticeboard entrance.

**U4.9 Product proof** (`cs-customer-proof`, `cv-scrolling-reviews`): `sections/cs-customer-proof.liquid`,
`blocks/cs-rating.liquid`, `blocks/cs-review.liquid`, `blocks/cs-video.liquid`,
`assets/casify-cs-blocks.css`, `assets/casify-cs-video.js`, `assets/cs-proof-motion.js` (new),
`sections/cv-scrolling-reviews.liquid`, `assets/cv-scrolling-reviews.css/.js`. Fixes: score only
with count > 0; manual rating scope guidance; scrolling reviews "Verified buyer" and heading gated
(G2), rating default 0. Motion: star sweep, ticket stagger (pending pattern).

**U4.10 Video reviews** (`cv-pdp-video-reviews`, `cv-page-video-reviews`):
`sections/cv-pdp-video-reviews.liquid`, `sections/cv-page-video-reviews.liquid`,
`snippets/cv-video-reviews.liquid`, `assets/cv-pdp-video-reviews.css/.js`. Fixes: averaged score
opt-in (default hidden) and unrated clips skipped; block stars select with "No rating" default;
neutral heading "Customer clips" (G3); strings to locale keys; product setting for page clips
fixing the nil-product skip (snippet :73, :231). Motion: unload cleanup, "Shop this case"
ticket, entrance with pending fallback.

**U4.11 Facebook comments** (`facebook-comments`): `sections/facebook-comments.liquid`,
`assets/casify-facebook-comments.css`, `assets/cv-facebook-comments-motion.js` (new). Fixes:
`empty_text` relabelled editor-only. Motion: notes pinned to the counter (gate `data-cvfbc`,
printed by the section), CSS `animation-timeline` progressive fallback.

Locale keys (LOC-4): `sections.reviews.no_reviews_yet`, `.store_rating_label`, `.customer_clips`,
`.write_first`, `sections.contact.model_placeholder`, `sections.page.help_default`,
`sections.blog.empty`, `general.pagination.previous/next` (if missing).
**TPL-4** after wave 4 (product.json reviews blocks, page.json, page.about-us.json).

### WAVE 5: orphans (placed nowhere)

Default for every orphan: neutralise (blank fabricated defaults, presets and `| default:`
fallbacks into gated settings, fix dead reveals, add `enabled_on` where the section only makes
sense on one template) without rebuilding, unless Q4 says rebuild or delete. No orphan gets
motion work beyond fixing invisibility until the owner places it (MOTION-SYSTEM 6.1).

- **U5.1 Order Slip** (`cv-product`): `sections/cv-product.liquid`, `assets/cv-pdp-slip.css`,
  `assets/pdp-slip-frame.webp`, `pdp-slip-tape.webp`. Buy now `[data-cv-buy-now]`,
  `enabled_on` product, "Never place with cv-product-counter" info, `.is-done` stamp CSS.
- **U5.2 Halo product page** (`main-halo-product`, `halo-xsell`): `sections/main-halo-product.liquid`,
  `sections/halo-xsell.liquid`. Gates G33 and G34; money from `shop.money_format`; quick pick
  instead of guessed variants; dashes; escape output.
- **U5.3 Bundle buy box** (`bundle-buybox`): `sections/bundle-buybox.liquid`, `assets/icon-sparkle.svg`,
  `icon-ribbon.svg`, `badge-add-to-cart.png`, `assets/cv-bundle-buybox.js` (new). Remove candy
  card and invented products from presets (G35), quick pick, real rating metafields, honest stock
  line, "Add to bag" label unless a real multi-item add, no `data-cm-reveal` on the root.
- **U5.4 Conversion home** (`cv-home-conversion`): `sections/cv-home-conversion.liquid`,
  `assets/cv-home-conversion.css/.js`, `assets/conversion-counter-stage-v2.png`. Remove the sweet
  from the pack art, dispatch `cart:refresh` + `cart:added`, dashes, h1 setting, Buy now via quick
  pick.
- **U5.5 Halo family A** (`halo-closer`, `halo-faq`, `halo-reviews`): those three sections,
  `assets/illustration-bow-teal.png`, `assets/halo.js`. Gates G36; replace `data-halo-reveal`
  with visible markup; FAQ answers from confirmed facts.
- **U5.6 Halo family B** (`halo-comparison`, `halo-drop-test`, `halo-press`, `halo-three-fixes`,
  `halo-why-love`, `halo-yellowing`): those six sections, `assets/icon-drop.svg`,
  `icon-magsafe.svg`, `icon-anti-yellow.svg`, `icon-warranty.svg`, `icon-slim.svg`,
  `icon-camera.svg`, `icon-secure.svg`, `icon-leaf.svg`. Gates G36; never reads halo.js; remove
  `data-halo-reveal`.
- **U5.7 Home orphans** (`cv-hero`, `cv-case-wheel`, `cv-finder`): their section, css, js and
  `snippets/cv-hero-words.liquid`, `assets/hero-window.webp`. Gates G37; quick pick buttons;
  finder chips from real option values dispatching `cvs:choose`.
- **U5.8 Comparison orphans** (`cv-compare`, `cv-cost-compare`, `cv-customer-experience`): their
  sections, `assets/cv-compare-lab.css/.js`, `assets/cv-customer-experience.css/.js`,
  `cv-customer-experience-plaque.webp`. Gates G38; rating seal shows 4.9/5 not 98%; anchor id not
  `cvc-reviews`.
- **U5.9 PDP orphans A** (`cv-pdp-closer`, `cv-pdp-promises`, `cv-pdp-value`): their sections,
  `assets/pdp-home-scale.webp`. Product photo as the closer subject, "Add to bag" wording, FAQ id
  and JSON-LD off by default, `[models]` never 0, pcts via `[data-cvw-pct]`.
- **U5.10 Misc orphans** (`cv-howto`, `cv-story`, `cv-apps`, `product-3d-viewer`, `custom-section`):
  their section files, `assets/cv-apps.css/.js`. Gates G39; cv-story moves off the cv-motion.js
  story module or is retired (Q4); 3D viewer uses the product's Model3d media and
  `request.design_mode` notes; custom-section pending Q4.
- **U5.11 Review orphans** (`facebook-reviews`, `amazon-styled-reviews`, `cv-trustpilot`): their
  sections, `assets/cv-facebook-reviews.css/.js`, `assets/user-placeholder.png`,
  `assets/cv-trustpilot.css/.js`. Gates G40; remove typing dots and fake Like/Reply/Helpful/
  Report controls; re-skin to Casify tokens; keep `amazon-styled-reviews` ExcessiveSettingsCount
  at the baseline (do not add settings).
- **U5.12 PDP orphans B** (`cv-pdp-reel`, `cv-pdp-row`, `cv-pdp-shelf`): their sections,
  `assets/pdp-home-shelf.webp`. Alt "photo n of N", prev/next buttons (INF-5 hooks), heading
  defaults distinct, quick pick on row cards, literal `data-cvqp-open` on the shelf root.

---

## 4. Claims handling (every unbacked claim, and what it becomes)

Rule: nothing is deleted silently. Each claim becomes a merchant setting that defaults to blank
or hidden. The reason is written (a) in a `{%- comment -%}` next to where it renders, citing
PRODUCT.md:102-105 or STORE-FACTS 7, and (b) in the setting's `info`
("Shown only when you can back it. Not in the store's evidence on hand."). Schema defaults,
presets and Liquid `| default:` fallbacks that carry the claim are emptied. Live template values
are left in the template and hidden by the gate until the owner answers Q1 (TPL tasks then flip
or clear them). Gate ids are listed so units use the same names.

| Gate | Section(s) | Claims covered (source) | Setting(s), default |
|---|---|---|---|
| G1 | cv-product-counter | "+1000 Happy Customer" with 5 stars (:441, :768; product.convert.json:12) | `empty_rating_text` default "No reviews yet"; stars hidden with no rating |
| G2 | cv-product-summary, cv-store-ratings, cv-google-rating; review-carousel; cv-scrolling-reviews; cs-customer-proof | Google 4.8 / "1,000+", "Rated 4.9 on Google, +1000" (product.json:74-78, :170-171); "Loved by thousands", "Rated 4.9/5 from 2,000+ reviews" (:1236-1238); "Our customers love their cases" (:641) | `store_rating_value`, `store_rating_count`, `store_rating_source` (blank); only the combined 4.9 / 952 "Trustpilot and Google" is backed (Q2); `show_store_rating` default false where not set |
| G3 | review-widget, review-carousel, cv-scrolling-reviews, cv-video-reviews snippet, cv-product-counter clips | Six typed reviews with `verified: true` and "2 weeks ago" (product.json:1035-1105, :575-641, :1172-1230); "Real reviews from real people" (:1118); "Daniel K." clip (:125-135); "Filmed by the people who bought it" | `show_typed_reviews` default false; `verified` default false and labelled "only with a real order"; date setting replaces relative text; headings default neutral |
| G4 | cv-sales-note snippet (counter, cv-sales-note page) | "100+ sold this week", "1480+ cases sold so far" fallbacks on every product (product.json:83-101) | `typed_count_products` (product_list, blank) so typed counts apply only to listed products; metafield values unaffected; "this week" text only with the metafield |
| G5 | cv-spec-meter | Impact "8.2ft / 2.5m", levels (:1000-1007) | `impact_value` "", levels 0; render only with metafields |
| G6 | cv-case-features | "Shock-absorbing drop protection" (:867) | `label` "", `keywords` required |
| G7 | cv-value-stack | 12 ft / 26 drops, 6 to 8 ft, MIL-STD-810G, 1,400 g / N52, 800 to 900 g, Qi2 25W, 36-month clarity, rival heights, "Three measurements...", "Measured, not claimed", 1.4 mm lip, durometer, CAD/mould, anti-fingerprint, prepaid label (index.json:1054-1219; schema :134-201) | `show_unverified_figures` default false (Q1); schema defaults and preset blanked |
| G8 | cv-collection-row | "Best sellers", "Most protected this month" (index.json:164-165; :32, :84-85) | eyebrow/heading defaults blank; `show_rank_claims` default false |
| G9 | cv-collection-row, cv-phone-scan, cv-spotlight | "One mould per model", "the fit is exact", "there is a mould for it", "Cut from your phone's own CAD file", "Molded for your exact phone" (index.json:66, :127, :139, :166, :1291-1293) | `show_manufacturing_claims` default false; defaults blank |
| G10 | cv-feature-tabs | "MagSafe ready" store-wide (index.json:957-958, product.json:372-373); CAD/one mould (index.json:971, product.json:386); "Screen-printed candy stripes under a UV-cured top coat" (index.json:983-984); "Four things every Casify case is built around" | per-tab `require_tag` (blank = hidden on products); home tabs `show_unverified` default false |
| G11 | cv-vs | "MagSafe ready", "Cut for your exact model", "prepaid label" (index.json:1235, :1249; product.json:444) | per-row `require_tag`; `show_prepaid_label` default false |
| G12 | cv-guarantee | CAD/one mould, Qi2 25W/MagSafe/Qi, 3-year UV test, 2.8/3.4 mm/24 g, prepaid label + no restocking fee, "one on the phone and one in a bag", "screen repair costs more than five of these", "zero risk" (index.json:1559-1649; preset :169-174) | `show_unverified_answers` default false (also excluded from FAQPage JSON-LD); defaults blank |
| G13 | cv-card-copy, cv-search | Card pills "MagSafe compatible", "cut for iPhone, Pixel and Galaxy" (index.json:227, :616, :685); search "listed under the model it was cut for", MagSafe / Galaxy S25 / Screen protector chips | pills only when product data matches; chips from live values; empty body default rewritten |
| G14 | cv-showcase-card, cv-showcase blocks | typed `price`, typed `review_count` drawing 5 stars (:548-563; card :294-302) | settings deprecated (header "Not used"); stars only from `reviews.*` |
| G15 | cv-trust-bar | "100% safe & encrypted" (index.json:36; :55), "Prepaid label, no hassle" (:28) | item default "Secure checkout"; `show_prepaid_label` default false |
| G16 | cv-social-proof | "Nothing on this board is pre-filled or manually scored." (:231), "Editorial edits: None", "Source checked" stamp (:166-169, :216-221) | intro default true to source; stamp and edits line only with live review data |
| G17 | cv-ugc | "Dropped it off a ladder. Nothing.", 5 stars, Verified buyer, "@customer", "1240 customer clips submitted" (schema :248-269) | defaults blank, stars "No rating", verified false, stat blank |
| G18 | cv-page | "Support answers in under a business day, and can override anything on this page in your favour." (page.json:17, page.about-us.json:8, page.faq.json:8, page.track-order.json:8) | `help_body` default "Write to the shop and ask."; live values via U4.1 / TPL-4 (owner-gated) |
| G19 | cv-blog | "Teardowns, drop tests, and what we learned building the thing." (blog.json:7; :111) | default blank |
| G20 | main-best-product | "BEST SELLER" seal, decorative 5 stars, woven fabric, MagSafe/magnetic, raised camera edge, drop protection, responsive buttons, soft-touch (:35-63, :165, :190-254; product.best.json) | `best_seller_tag` (blank, seal only with that tag); feature copy via per-block `require_tag`; stars only with ratings |
| G21 | footer | "Tins, cases, ribbons [em] wrapped by hand since 1920", "sweets are on their way", "Join the sweet list" (:27, :123, :133-134) | case copy defaults; live group values via U3.1 (owner-gated text in footer-group.json) |
| G22 | cv-signup-banner | "Letters from the sweet shop" with no mention of cases (index.json:1679, product.json:975) | default heading names cases; live values via TPL |
| G23 | cv-404 | "How the drop test works", "This one took the drop", "The cases, thankfully, are more durable." (404.json:6-12; :18-19, :63-64, :91) | link default to FAQ; wordplay defaults neutral |
| G24 | cv-pdp-ribbon, cv-pdp-journey, cv-pdp-guarantee, cv-pdp-snap, cv-pdp-spotlight, cv-pdp-compare, cv-pdp-value | typed 18% / 31% (backed today, drift risk), "Est. 1920" as a "true thing" | tokens from theme settings / live tiers; `show_est` setting with info "brand voice, not history" |
| G25 | cv-pdp-snap | "Slim in the hand, tough where it counts." as a blockquote (product.convert.json:167; :121) | `quote` default blank, not styled as a testimonial |
| G26 | cv-pdp-spotlight | "Every number here is read from this case." (:134) | default rewritten ("Numbers from this listing and the shop's pack offer") |
| G27 | cv-pdp-ugc | theme clips described as "this case" (:71, :156) | store-level copy unless product clips exist |
| G28 | cv-pdp-before-after | demo pair with "magnetic case, MagSafe ring" alt on every product (product.json:493-498) | `products` product_list / tag filter, blank = hidden |
| G29 | cv-pdp-compare | "Prices for the phone and style chosen above." while static; jar lede | footnote only with live repricing |
| G30 | cv-pdp-delivery | cut-off countdown "Order within [time]..." (:178-181) | stays off; info "No order-by countdown is confirmed" |
| G31 | cv-pdp-trust | `@app` blocks may inject guarantee badges | schema info warning |
| G32 | cv-reel-showcase | "built-in kickstand", "rose-toned ring" (page.reel-showcase.json:15-16, :57-58) | per-slide copy only for the bound product, default blank |
| G33 | main-halo-product | 4.8 / 12,480 reviews, "Alex, Jordan and 2,457 others", 12 ft / MIL-STD / 26 drops / 4x Apple, 2.8 mm / 24 g / 1.4 mm, 1,400 g / 18 magnets, 0 yellowing 36 months, "ships today if you order in 4h 12m", Screen Promise $200, "Ships in 24h from Austin, TX", "Free shipping over $45 · 90-day trial", free ArmorGlass, ™, "26 essential vitamins & minerals", "Clear · Halo" | every one a setting default blank/false; hard-coded rail (:33-38), countdown (:301), promise (:313-322), USP fallback (:336-342) become settings default blank |
| G34 | halo-xsell | "Three things people add in the same order", ArmorGlass 9H, "1,100 g", "1,400 g ring", typed $ prices | defaults blank; prices only from products |
| G35 | bundle-buybox | candy tin card, "The Peppermint Cream", charging puck 15W, "Most popular", 5 stars + 128/212/94 reviews, "In stock · ships next business day", MagSafe ready | preset cards removed from presets (not from any template, none place it); ratings from metafields; stock line "Ships in 1 to 3 business days" only when available |
| G36 | halo-closer, halo-faq, halo-reviews, halo-comparison, halo-drop-test, halo-press, halo-three-fixes, halo-why-love, halo-yellowing | Screen Promise, 12 ft, 1,400 g, no yellowing, 90-day returns, free over $45, Austin TX, CAD, 18 magnets, Qi2 25W, two-year warranty, same-day 2pm CT, 2 to 4 day delivery, 12,480 verified reviews, six named reviews, WIRED / The Verge / Tom's Guide / Engadget / GQ / Fast Company / MKBHD, rival heights and prices, MIL-STD 516.6, DropCore 8 ms / 1.9 mm, ClearGuard™, UV chamber, "$12 one", drop-tested, air-cell corners, recycled icon | all defaults and presets blank; Liquid fallbacks (halo-drop-test :28-31, halo-closer :14-23, halo-reviews :4-7) become settings default blank; press block default blank; icon options for warranty and recycled removed from defaults |
| G37 | cv-hero, cv-case-wheel, cv-finder | 12 ft, 1,400 g, 2.8 mm, 36 months, CAD, "Engineered protection"; "Every case in the shop on one dial."; "Built for 200+ phones", per-brand model counts, Pixel/OnePlus, "we'll confirm your fit" | defaults blank; finder counts live from option values |
| G38 | cv-compare, cv-cost-compare, cv-customer-experience | rival lab table, "$65+/$55", "Same test, same lab", "What a cheap case actually costs you", $200 Screen Promise, $39, "$180+ saved", "98%" seal, "Real store feedback" | defaults blank; cost compare rebuilt only as live pack math if Q4 says so; seal shows "4.9/5" from settings |
| G39 | cv-howto, cv-story | drop-tested, CAD fit, factory-tight, "Order before 2pm CT ... Austin today", Screen Promise, 2-year warranty; 0.8 s / 0.86 s, 19 mph, -64 %, 26 drops, MIL-STD, independent lab, Apple comparison, "Phone intact" | defaults blank; cv-story fate per Q4 |
| G40 | facebook-reviews, amazon-styled-reviews, cv-trustpilot | "Latest Facebook reviews", typing indicator; John D. / Sarah M. / Michael R. "Verified Purchase", helpful counts, "John Doe" defaults, "Verified Purchase" fallback, review quotes; "We read every review." | defaults and presets blank; verified opt-in false; typing dots and fake controls removed (they are behaviour, not merchant content) |
| G41 | cv-cart | trust block "Warranty" icon option; "Free shipping unlocked" / "$X from free shipping" when no threshold | warranty option not default; meter only with a real threshold (cart.json has 0) |
| G42 | header (theme.css) | "EST. 1920 · FREE SHIPPING OVER $40 · 30-DAY RETURNS" in `.awning::after` | removed by INF-0 (CSS text, not merchant content; reason in a CSS comment) |
| G43 | cv-pdp-set, cv-pdp-fit, cv-pdp-guarantee, cv-pdp-closer | "For your [model]" / pressed chip / summary model shown before any choice | INF-4 gating (not a setting: it is wrong data, not a claim) |
| G44 | cv-pdp-details | future supplier description claims | info text only; the theme never rewrites product descriptions |

Backed items stay as they are and are not gated: free shipping (no threshold), 30-day returns,
dispatch in 1 to 3 business days, packs 18% / 31% (as settings), store rating 4.9 / 5 from 952
reviews labelled Trustpilot and Google, compare-at fallback $59.99 (currency-guarded),
"Secure checkout", "Encrypted by Shopify", live counts and prices (STORE-FACTS 7c, 7d).

---

## 5. Verification per unit

Every unit runs, from `dev/motion-store-adapt/tools/`, and pastes the summary into its commit
message body:

1. `python tc-compare.py`: 0 errors and no new (file, check) warning against
   `theme-check-baseline-clean.json` (8 warnings).
2. `python schema-validate.py`: every touched schema and template parses; no template references a
   removed setting or block type; range/select defaults valid.
3. `python liquid-balance.py <touched liquid files>`: balanced.
4. `python dash-scan.py <touched files>`: zero shopper-copy hits (editor hits listed, fixed when
   touched).
5. `python motion-lint.py <touched js/css>`: reduced-motion path present, editor lifecycle present
   for per-root inits, no `setInterval`, no unscoped `opacity: 0` start states, no runtime CDN
   imports.
6. Grep checks: no `selected_or_first_available_variant` posted as an add id in touched files; no
   new `data-cv-reveal` on commerce content; every new gate attribute is unique
   (`grep -r "data-cvxx" sections snippets` hits only the owner).
7. Motion units: a static preview harness `dev/motion-store-adapt/harness/<unit-id>-preview.html`
   in the style of `dev/feature-tabs-preview.html` (rendered section HTML pasted as a fixture,
   `/assets/theme.css` and the section CSS linked, the same GSAP files `snippets/gsap.liquid`
   loads, then the motion file). Built from `tools/harness-template.html`, which adds three switches:
   `?rm=1` (stubs `matchMedia('(prefers-reduced-motion: reduce)')` to true before scripts load),
   `?nojs=1` (loads no scripts and leaves `html.no-js`), `?editor=1` (clones the section and fires
   `shopify:section:unload` / `load` / `select` on a timer). Commerce harnesses stub `fetch` for
   `/cart/add.js`, `/cart/change.js`, `/cart.js` and Section Rendering responses. Serve from the
   theme root (`npx http-server "D:/Shopify Theme Fix & Page/casify-theme" -p 8090`) and check in
   the browser pane: no console errors; `?nojs=1` shows every word, price and control; `?rm=1`
   shows final states without movement; `?editor=1` leaves one set of listeners and no stuck
   opacity. Fixture text must be the store's real wording or clearly marked "fixture"; never
   invent reviews or counts even in a harness.
8. Units that add a pause control check it with keyboard only (Tab, Enter/Space, `aria-pressed`).

INF tasks run the same checks plus their acceptance tests (section 1).

---

## 6. File conflicts found, top risks, open questions

### 6.1 File conflicts found (resolved by the ownership table in section 2)

- `assets/cv-product.js`: money, variants, packs, cart, sticky bar and the `cvs:*` contract for
  the live Shop Counter, the orphan Order Slip and the pack slots; events heard by
  cv-pdp-counter-motion, cv-pack-motion, cv-pdp-carousel, cv-pdp-video-reviews, cv-pdp-story,
  cv-price-tag, cv-pdp-model (MOTION-SYSTEM 5.2). INF-1 only.
- `assets/cv-pdp-counter-motion.js` also animates and flies for cv-pdp-set (:376-403) and is the
  fly source the carousel relies on (:328-331); merged into U1.1, fly moves to INF-3.
- `assets/cv-pdp-counter.css` is loaded by the live cv-sales-note on page.json (`.cvc__pill`,
  `.cvc__sold`); U1.1 must not change those rules, U4.6 moves them to owned CSS.
- `assets/cv-pdp-story.js/.css`, `cv-pdp-home-motion.js/.css` shared by about 20 PDP sections;
  `cv-pdp-slip-motion.js` shared by cv-product and cv-pdp-fit. INF-4/5 and PDP-SHARED only.
- `assets/cv-pages.js/.css` shared by cv-collection, cv-collections-list, cv-page, cv-contact,
  cv-blog; `.cvcl` prefix collides between cv-collections-list (cv-pages.css:236-239) and
  cv-collage (cv-collage.css:9-47).
- `data-cvvs` used by cv-vs and cv-value-stack; cv-value-stack-motion.js binds the first match.
- `sections/header.liquid` carries the cart drawer CSS (:196-207) and global shell CSS;
  `assets/cv-header.css` is also used by the footer.
- `snippets/cv-card.liquid` (cv-search, cv-collection-row, cv-orbit), `cv-showcase-card.liquid`,
  `cv-showcase.css`, `cv-showcase-motion.js` (cv-showcase, cv-collection).
- `assets/review-motion.js` (review-widget, review-carousel); `casify-customer-reviews.css/.js`
  (customer-reviews-carousel, trustpilot-reviews, facebook-testimonials);
  `snippets/cv-video-reviews.liquid` + css/js (counter, cv-pdp-video-reviews, cv-page-video-reviews).
- `assets/halo.js` and theme.css `[data-halo-reveal]` (:3906) for all halo sections and
  main-halo-product; halo.js exits without `.halo-tpl` (halo.js:19-20), so every halo reveal is
  dead today.
- `assets/cv-motion.js` modules `story` and `ugc` serve cv-story and cv-ugc; `snippets/motion.liquid`
  + `cv-motion-dev.js` serve cv-collection-row and cv-guarantee.
- Templates shared by many sections: product.json (22 sections), product.convert.json (17),
  index.json (21), page.json, page.about-us.json. `locales/en.default.json` used by about 15.
- Name trap: `assets/cv-pdp-promises.js` belongs to the counter (promise stamps), not to the
  cv-pdp-promises section (`map/cv-pdp-promises.md`).
- Duplicate ids and markup when sections are combined: `cvc-reviews` (cv-customer-experience vs
  cv-pdp-reviews / review-widget), `cvp-faq` and FAQPage JSON-LD (cv-pdp-promises vs
  cv-pdp-guarantee), Product JSON-LD (cv-product vs cv-product-counter), two h1 (cv-home-conversion
  vs casify-hero).
- theme.css blocks used by one section each (cv-ugc :1817-2006, `.cv-trustbar*` :1659-1678,
  `.cv-risk/.cv-guard*/.cv-faq*/.cv-closer*`, `.p3d` :2716-2719): copied by the unit, deleted in FIN-1.

### 6.2 Top risks

1. INF-1 changes the live money path for every product (`cv-product.js`). A regression stops all
   sales. Additive only, harness with stubbed fetch, test both templates in a development theme,
   never on live.
2. Model-first enforcement (no pre-selected model, `cvs:needmodel`) changes the default buy flow
   on every product: a shopper who taps Add without picking a phone now gets a prompt instead of an
   add. Required by PRODUCT.md:110 and STORE-FACTS 4 rule 7, but it is the biggest behaviour change;
   watch the copy and focus handling.
3. Claim gates default to hidden, so the live home page (value stack, guarantee FAQ, trust bar
   items, rank headings) and product page (typed reviews, store-rating numbers, sales fallbacks)
   lose content the merchant once chose to keep (PRODUCT.md:49, :58). Needs Q1 before the push.
4. Theme check: `cv-product-counter` already exceeds 40 settings and Liquid complexity 120; new
   settings or branches in sections near 40 settings (cv-value-stack, main-halo-product,
   review-widget, amazon-styled-reviews) can add new warnings. Put gates in blocks, reuse settings,
   move logic into snippets.
5. Script order and plugin availability: section-printed scripts run before `cart.js` and the
   commerce module; Flip and MotionPath are absent on the home page unless `data-cv-gsap-flip` is
   printed; ScrambleText only with `data-cvsu`. Feature-detect every plugin.
6. Double animation: CSS transitions on transforms vs GSAP (MOTION-SYSTEM 7.1), two fly tokens
   (counter + global) during the hand-over, two badge bumps (7.6), three word splitters (7.3).
   Single-flyer `claim()` rule and `is-motion` / `cvm-on` classes that switch CSS transitions off.
7. Removing a setting or block that a template stores breaks `theme push`; schema-validate.py
   guards it, and every removal is a deprecation instead.
8. Performance: product pages already ship about 650 KB of JS before three.js (MOTION-SYSTEM 8.1).
   New files must stay small, reuse loaded plugins and gate on markup.
9. Store identity is uncertain (`spycpc-g0` vs `casiffy`, STORE-FACTS 1); the owner must confirm
   the target store and the main theme id before `shopify theme push --unpublished`.
10. Parallel units on one branch: path-limited commits only; a unit that finds it must touch a file
    outside its list stops and files a request instead.

### 6.3 Open questions for the store owner (decisions)

1. **Unverified claims now live** (value stack figures, guarantee FAQ specs, "100% safe",
   "prepaid label", CAD/one-mould lines, store-wide "MagSafe ready", the six typed "Verified buyer"
   reviews, the "Daniel K." clip, "+1000 Happy Customer", store-wide sold counts): hide them by
   default behind one "Show unverified..." checkbox per section (recommended), or keep them visible
   until you confirm each one?
2. **Store rating:** show one combined "Store rating 4.9 from 952 reviews (Trustpilot and Google)"
   everywhere (recommended), or send the separate Google and Trustpilot numbers?
3. **After Add to bag on a product page:** open the bag drawer, or stay on the page with the flying
   case, badge bump and "In your bag" (current behaviour, recommended)?
4. **Orphan sections built on invented content** (10 halo sections, main-halo-product, cv-story,
   cv-compare, cv-cost-compare, amazon-styled-reviews, facebook-reviews, custom-section): neutralise
   in place (recommended), rebuild a few as honest versions (pack-savings bars, service ticker,
   finish scrubber), or delete them?
5. **Home lead product:** which product should the empty home hero show (or hide the hero), and
   should the phone scan lead with iPhone 18 Pro (most cases) instead of base iPhone 18?
6. **Facts to confirm:** does checkout charge $0 shipping on every order (so the bag can say
   "Free"), and are the automatic pack discounts still 18% for 2 and 31% for 3 cases?
