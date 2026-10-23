# cv-reel-showcase ("Casify design showcase")

## Status

LIVE in `templates/page.reel-showcase.json` (section key `showcase`, :3-67), the only template that places it,
with `autoplay: true` (:6) and four `design` blocks bound to real product handles (:9-64). Not in any section
group. Reachability depends on a Shopify page being assigned the `reel-showcase` suffix (store data, unknown
offline).

## Purpose

A "moving shop window" (cv-reel-showcase.css:1): full-height hero where one case photo at a time sits on a
coloured stage with a giant italic design word behind it, an SVG artwork pattern, caption (title, copy, "Shop this
design" link), prev/next/play controls and a counter; then a "Pick your personality" picker of design cards
(buttons that switch the hero), an editorial block and a three-step "how to choose" list. When no block has a
product with an image, it falls back to the first 4 products of `collections.all` (:26-38).

## Files (owned / shared)

Owned:
- `sections/cv-reel-showcase.liquid`
- `assets/cv-reel-showcase.css` (176 lines; loaded by the section at :141)
- `assets/cv-reel-showcase.js` (195 lines; custom element `casify-reel-showcase`, WAAPI animations, no GSAP;
  printed by the section at :142, no layout gate)
- `templates/page.reel-showcase.json` (only section on the template)
- Locale keys `sections.reel_showcase.*` (locales/en.default.json:178-203; the file is shared)

Shared:
- `layout/theme.liquid`: nothing keys off this section's markup (grep for `crs`/`reel` finds nothing). On the
  `page` template GSAP core + ScrollTrigger + SplitText + DrawSVG + CustomEase/Bounce + Flip + MotionPath are
  already loaded (theme.liquid:166-184, snippets/gsap.liquid:22-36) but unused by this section.
- `snippets/cv-quick-pick.liquid` + `assets/cv-quick-pick.js`: not used today; available (opportunity 1).

## Store adaptation findings

1. HIGH (copy vs data): `collection_copy` "From a clear look to a little sparkle. Four ways to make it yours."
   (locales :189, printed :169) hardcodes both the count ("Four") and the specific designs of the template. The
   section can show 1 to 4 slides (`max_blocks: 4`, :201; `limit: 4`, :41), and in the catalog fallback the
   designs are whatever `collections.all` returns first. Fix: make it a section setting (`collection_copy`
   textarea, default count-neutral, e.g. "Every design, made for your exact phone model."), or interpolate
   `slide_count`.
2. HIGH (catalog fallback looks broken): when blocks have no product (the PRESET, :234-240, adds four empty
   design blocks, so a merchant adding the section from the editor hits this), `reel_name` and the giant
   `.crs__word` become the full product title (:54, :150) such as "Two-in-One Space Case with Magnetic Mount for
   iPhone 18 Pro Max", rendered at `clamp(140px, 23cqw, 390px)` with `white-space: nowrap` inside an
   `overflow: hidden` hero (cv-reel-showcase.css:26, :35-48), so only a fragment shows; every slide also gets the
   same copy (:55). The fallback can also pull the "Camera lens protective film" (not a case, STORE-FACTS.md:98)
   into a "case designs" carousel. Fix: in the fallback use a short name (first word of
   `product.selected_or_first_available_variant.option1` for the colour/style, or `product.type`) for the giant
   word, keep the full title for `caption_title`; prefer a merchant-chosen `collection` setting (already exists,
   :206) over `collections.all` as the fallback source; skip products whose type/title is not a case.
3. MEDIUM (palette): the template's block colours are off the design system: greens `#DFE8D0 / #273C2B /
   #698445` (template :17-19), pinks `#F0D8DE / #642F45 / #A14B63` (:59-61), browns `#F0D8BF / #67351B /
   #AE652F` (:45-47), teal-blues `#DCEBEA / #173F46 / #4D8790` (:31-33); the CSS root default is the same green
   (cv-reel-showcase.css:3-5); the catalog fallback adds `#D8E2DC`, `#F1D6DE`, `#E7CCAF` (:58-64). DESIGN.md
   Colors: use cream, cocoa, candy red, muted teal and aged gold before introducing a hue. Fix: defaults per slide
   on palette (page-cream #FBF3E4 + candy-red #C4302B; inset-cream #F5E9D3 + muted-teal-deep #4E7C7B;
   ticket-gold #F0E2C2 + cocoa-ink #33231A with aged-gold #D2B57C art; paper #FDF9F1 + candy-red-deep #7E1A17),
   and use them in the template and fallback. Keep the merchant colour pickers.
4. MEDIUM (product facts typed by hand): template copy states product features: "a magnetic mount and a
   built-in kickstand" (:15-16, Silver), "rose-toned details" / "Rose-toned ring and camera details" (:57-58).
   "Kickstand" and "rose-toned ring" are not in the product titles (STORE-FACTS.md:95) and cannot be verified
   offline. Fix: confirm against each product's photos/title with the merchant, or reduce to what the title
   states ("Magnetic mount", "Transparent", "Glitter design with magnetic stand").
5. MEDIUM (a11y/SEO): the slide caption is always an `<h1>` (:153) whose text JS replaces on every slide change
   (cv-reel-showcase.js:125), so the page's main heading changes under autoplay and the page has no stable h1;
   placed on another template it would add a second h1. Fix: `heading_level` setting (h1/h2) for a stable
   visually hidden heading (e.g. `page.title` or a "Casify case designs" setting), and make the slide title a
   `<p class="crs__title">` or h2.
6. LOW: readable sizes below DESIGN.md minimums on mobile: `.crs__pick-description` 10px
   (cv-reel-showcase.css:164), `.crs__copy` 12px (:153), `.crs__details p` 12px (:130), `.crs__editorial p` 12px
   (:167). Raise to 12-13px minimum.
7. LOW: font families hardcoded ("Playfair Display", "Libre Baskerville", css :12, :40, :68) instead of
   `var(--font-display)` / `var(--font-body)`; colours `#7e1a17`, `#9a2520`, `#d2b57c`, `#e6d7c5` hardcoded
   (:107, :126, :131, :130) instead of tokens.
8. LOW: no price anywhere. The section is a design picker that sends shoppers to the product page; adding the
   live `price_min` ("From $X" when `price_varies`) on each card and in the caption is a real-data improvement
   (see opportunity 1).
9. OK: no candy presented as product, no other brand, no dashes in section, template or locale strings, no
   hardcoded currency, no phone-model lists (model is chosen on the product page: step_two_copy, locales :198).
   Autoplay is off by default in the schema (:203) and on in the template (:6); a visible Play/Pause control
   exists (:161) and autoplay is disabled under reduced motion (cv-reel-showcase.js:34).

## Claims register

| Claim | Where | Status |
|---|---|---|
| Silver: "A silver finish, a magnetic mount and a built-in kickstand" / "Magnetic mount and kickstand" | template :15-16 | MERCHANT-TYPED product feature; "magnetic mount" matches the title, "kickstand" unverified (finding 4) |
| Clear: "A transparent magnetic case for iPhone" | template :29-30 | Matches product title/handle (STORE-FACTS.md:95) |
| Glitter: "A glitter finish with a magnetic stand" / "Four-corner airbag case with stand" | template :43-44 | Matches product title/handle |
| Rose: "A clear look with rose-toned details" / "Rose-toned ring and camera details" | template :57-58 | MERCHANT-TYPED, unverified offline (finding 4) |
| "Four ways to make it yours" | locales :189 | Count claim tied to template, wrong in other configurations (finding 1) |
| Step copy ("Choose your phone model on the product page...") | locales :195-200 | Process description, BACKED by PRODUCT.md:30 (variant pickers) |

No ratings, review counts, shipping, guarantees or performance figures.

## Motion inventory

- data-cv-* attributes: none. Own hooks: `data-crs-slide`, `-pick`, `-art`, `-word`, `-title`, `-copy`, `-link`,
  `-link-label`, `-current`, `-count`, `-prev`, `-next`, `-play`, `-play-label`, `-play-icon`, `-pause-icon`,
  `-status`, `-pattern` (JS-generated SVG groups, cv-reel-showcase.js:22).
- Slide change: WAAPI. Outgoing case slides left and tilts out (340ms), incoming flies in from the right with
  rotation 8deg -> 0 (780ms, `cubic-bezier(.16,1,.3,1)`), giant word rises (750ms) (js:141-157). Background,
  ink and accent colours transition via CSS (css:29); the artwork pattern cross-fades and scales (css:33-34).
- Pointer lean on the stage: translate up to 12/8px and rotate 2deg from `pointermove`, mouse only, written every
  event without rAF (js:87-93); reset on leave.
- Autoplay: `setTimeout` 6200ms (js:179-182), suspended on hover, focus, hidden tab, offscreen
  (IntersectionObserver 20%, js:99-105).
- Swipe: pointer swipe on touch (js:79-86). Keyboard: arrows/Home/End on the picker (js:52-59).
- GSAP: none. Plugins on the page are unused.
- Reduced motion: JS reads the query live (`change` listener, js:68-76) and cancels animations, stops autoplay;
  CSS kills all transitions/animations (css:174-176). Good.
- No-JS: first slide visible, others `hidden` (:107); picker buttons inert; `<noscript>` list of product links
  (:174). Readable.
- Theme editor: custom element `connectedCallback`/`disconnectedCallback` re-inits and cleans up on section
  re-render (js:26-28, :186-192); `shopify:block:select` jumps to the block's slide and stops autoplay
  (js:95-98). Missing: `shopify:section:select` (pause while selected) is covered only indirectly by focus.

## Motion opportunities

All in owned files (cv-reel-showcase.js/.css/.liquid). Keep WAAPI as the fallback when `window.gsap` is absent.

1. HIGH (Add to cart): a "Choose colour and model" button per slide caption and per picker card using the
   quick-pick opener: `<a href="{{ reel_url }}" data-cvqp-open data-handle="{{ reel_product.handle }}"
   data-url="{{ reel_product.url }}">` (cv-quick-pick.js:228-229 delegates and prevents default; the layout gate
   theme.liquid:208, :295 loads it from markup). The JS must update `data-handle`/`data-url` on the caption
   button in `select()` (next to the link update, js:129-134); store them as `data-handle` on each slide. Show the
   live price next to it (finding 8). After `cv:cart` (document event, cv-quick-pick.js:58), play a short
   "added" stamp on the active slide's case (scale 1 -> 1.06 -> 1, `back.out(3)`, 240ms) and open the drawer with
   `window.Casify.openDrawer()` (cart.js:184-187).
2. MEDIUM (slide choreography in GSAP): one `gsap.timeline` per change: outgoing case swings out like a hanging
   sign (transformOrigin top center, rotation -> -10, x -> -60, 340ms `power2.in`), incoming drops and settles
   with `CustomBounce` or `elastic.out(1, .45)` (both loaded globally), giant word re-split with SplitText chars
   (stagger .02, yPercent 60 -> 0, opacity .08 -> .25), caption title/copy line-swap with `mask: 'lines'`, and
   the artwork pattern drawn on with DrawSVGPlugin (`drawSVG: '0%' -> '100%'`, always loaded, gsap.liquid:22).
   Kill the previous timeline in `select()` exactly as `_animations` are cancelled today (js:116).
3. MEDIUM: autoplay progress ring on the Play button (SVG circle, DrawSVG tied to a GSAP tween of 6.2s that
   replaces `setTimeout`), paused with the same `_suspended` set; gives a visible "what happens next" cue
   (WCAG 2.2.2 already satisfied by the pause control).
4. MEDIUM (scroll reveal): ScrollTrigger entrances for the lower blocks: picker cards `ScrollTrigger.batch` lift
   from y 24 with the case image rotating -14 -> -6deg (its CSS rest state, css:112); editorial h2 SplitText
   words; the three story steps stamp in with their 01/02/03 numerals counting (plain text, not data).
   Use a pending class on the element (MOTION-SYSTEM.md 4.3) with a 1400ms timeout; never hide the caption link.
5. LOW: replace the raw `pointermove` lean with `gsap.quickTo(stage, 'x'|'y'|'rotation', { duration: .4 })`.
6. LOW: hero scroll-out: scrub the giant word and pattern at different rates (`yPercent` 0 -> -12 / -6) as the
   hero leaves, `scrub: .6`, only under `(prefers-reduced-motion: no-preference) and (min-width: 750px)` inside
   `gsap.matchMedia()`.
7. Reduced motion: keep current behaviour (no autoplay, instant swaps); quick-pick still works.

## Risks

- `cv-reel-showcase.js` header says the carousel is "shared by Shopify and the reference preview" (js:1); there is
  no other consumer in the theme (grep), but a reference preview outside `casify-theme/` may load it. Keep the
  custom-element API (`select(index, animate, announce)`) stable.
- Product-feature copy in the template must not grow into performance claims (drop, magnet strength).
- Quick-pick inside a carousel: only the active slide's opener is visible; keep one opener per card so keyboard
  users can add from the picker grid too.
- Git: `sections/cv-reel-showcase.liquid`, `assets/cv-reel-showcase.css`, `assets/cv-reel-showcase.js` and
  `templates/page.reel-showcase.json` are UNTRACKED in the theme repo (git status, 2026-10-22). Commit them on
  `feat/motion-store-adapt` before editing so the implementation diff is reviewable.
