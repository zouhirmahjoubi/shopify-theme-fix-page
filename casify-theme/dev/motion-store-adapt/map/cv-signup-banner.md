# cv-signup-banner ("Email signup banner")

## Status

LIVE on two templates:
- `templates/index.json` instance `signup` (:1673-1715, type at :1674), last of 21 in `order`.
- `templates/product.json` instance `signup` (:969-1011, type at :970), position 19 of 22 (default product template,
  "The Shop Counter").
Both instances carry the same blocks: heading, paragraph, email form, no background image (so the candy-stripe
backdrop with peppermints renders, sections/cv-signup-banner.liquid:47-53).
Schema `disabled_on` header group (:142).

## Purpose

Newsletter signup as an airmail envelope from the shop: a full-bleed image or candy-stripe backdrop, a card in one of
nine positions with a wax seal, heading / paragraph / email form blocks, Shopify `customer` form tagged `newsletter`
(:76-77), and a postmark stamped after a successful post (:78-88).

## Files (owned / shared)

Owned:
- `sections/cv-signup-banner.liquid`
- `assets/cv-signup-banner.css` (246 lines; only :15)
- `assets/cv-signup-motion.js` (269 lines; loaded by layout/theme.liquid:247-250 under `gsap_text`)

Shared:
- `layout/theme.liquid:178-181` + `:247-250`: the gate `content_for_layout contains 'data-cvsu'` sets `gsap_text`,
  which BOTH loads this section's script AND adds `ScrambleTextPlugin` + `TextPlugin` to the GSAP bundle
  (snippets/gsap.liquid:31-33). No other file uses those plugins (grep: only cv-signup-motion.js:163-164).
- `locales/en.default.json:5` `general.newsletter.*` (keys used only by this section, file shared).
- `snippets/gsap.liquid` (shared GSAP bundle).

## Store adaptation findings

1. Heading presents the store as a sweet shop (MEDIUM, wrong product domain risk): default
   "Letters from the <em>sweet shop</em>" (schema :207) and both live instances (templates/index.json:1679,
   templates/product.json:975). The candy shop is only the set; the paragraph "New designs and restocks" (schema
   :223, index.json:1686, product.json:982) never says cases, so the block reads as a sweets newsletter.
   Fix (template values and schema defaults): heading "Letters from the <em>case counter</em>" (or "Post from the
   <em>shop counter</em>"), paragraph "New case designs and restocks for your iPhone or Samsung, posted straight to
   your inbox."
2. Email placeholder `you@sweetmail.com` (locales/en.default.json:5, `general.newsletter.placeholder`, used at :98):
   a candy pun on a real third-party domain. Fix: `you@example.com`.
3. No privacy note next to the consent: fine print is only "Unsubscribe any time." (block default :239, index.json:1694,
   product.json:990). Recommend appending a link to `shop.privacy_policy.url` when it exists (render-time store data),
   e.g. fine print + " Privacy policy" link. Merchant to confirm wording.
4. Header comment says "Chrismass design system" (:2): legacy name, editor/dev only.
5. Schema info uses an em dash (:207 info text), editor-facing only.
6. Button label falls back to `general.newsletter.submit` "Sign up" (:111-116): fine.
7. Peppermint SVGs (:49-52) are set dressing inside `aria-hidden` media; they are decoration, not products: fine per
   DESIGN.md:183. Keep them clearly decorative (no prices, no labels).
8. No hardcoded prices, currencies, models or brand names other than Casify. No Halo copy.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Unsubscribe any time." | schema :239, index.json:1694, product.json:990 | BACKED by platform (Shopify customer marketing consent; every email carries unsubscribe) |
| "New designs and restocks, posted straight to your inbox." | schema :223, index.json:1686, product.json:982 | Soft promise of content; acceptable, but make it say cases (finding 1) |
| "You're in. See you soon." confirmation | locales en.default.json:5 | No claim |

No ratings, counts, guarantees, delivery or performance claims.

## Motion inventory

- `data-cv-*` shared attributes: none. Section attributes: `data-cvsu` (root gate :34), `data-cvsu-media` (:38),
  `-drift` (:39), `-sweet` (:49-52), `-card` (:59), `-seal` (:60), `-heading` (:68), `-fade` (:72),
  `-form-wrap` (:75), `-done` (:79), `-postmark` (:80), `-btn` (:110), `-arrow` (:118).
- Motion JS `assets/cv-signup-motion.js`:
  - One-shot entrance timeline at `top 72%` (:100-105): image push-in (:108-110) or peppermints pop (:111-115),
    envelope slides up and levels (:118-120), wax seal press with squash and `elastic.out` (:122-130), heading words
    rise through a SplitText mask (:134-136, reverted on complete :102), copy/label/row/fine follow (:141-144),
    button arrow draws (:146-149).
  - After a successful post: postmark slams in, DrawSVG rings, ScrambleText word (:152-167).
  - Scroll drift of the image, scrubbed (:170-175).
  - Ambient peppermint bob, infinite yoyo, played only while the section is in view via ScrollTrigger `onToggle`
    (:178-194).
  - Airmail stripe crawl on card hover/focus (:197-210); magnetic button lean, press and release (:213-233).
- GSAP plugins: ScrollTrigger, SplitText, DrawSVGPlugin, ScrambleTextPlugin (TextPlugin loaded but unused).
- Reduced motion: `motionQuery.matches` returns before any GSAP (:84); listens for preference changes and re-inits
  (:66-71). CSS kills form transitions (cv-signup-banner.css:244-246).
- No-JS: CSS is the finished state (no `opacity:0` start states in the CSS); `.fromTo` start states are applied only
  by JS. Good.
- Theme editor: full set: `shopify:section:load`, `:unload`, `:select` (finish + refresh), `shopify:block:select`
  (finish) (:258-268); `ScrollTrigger.refresh()` on boot and `window.load` (:244, :254-256). Reference-quality.
- Hidden tab: entrance finishes at once (:235).
- Ambient bob has no visible pause control (decorative, offscreen-paused).

## Motion opportunities

Medium
1. Cut ~22 KB from every home and product page view: ScrambleText (11,687 B) and TextPlugin (10,570 B) load whenever
   the banner is present, but are only used after a successful post (`data-cvsu-postmark` exists only then, :80).
   Change `layout/theme.liquid:179` to `content_for_layout contains 'data-cvsu-postmark'` for the plugin flag and
   keep `data-cvsu` for the script gate (:247). Shared file: coordinate. Fallback is already coded (:163).
2. Submit feedback that never blocks: on `submit`, play a 160 ms "seal pressed" (seal scaleY .86 -> 1) and set the
   button to a pressed state; do not `preventDefault`. On `form.errors` render, a short CustomWiggle x-shake of
   `.cvsu-form__row` (CustomWiggle is always loaded), skipped under reduced motion; keep `role="alert"` as the
   source of truth.
3. Pause path for the bob: stop the yoyo after ~3 cycles (settle at rest) so ambient motion does not run
   indefinitely (DESIGN.md:192).

Low
4. Heading flourish: draw an underline under the `<em>` script word with DrawSVG after the words rise (one
   flourish rule, DESIGN.md:132).
5. Product template only: no buy box link here; keep it a quiet close. No Add to cart, Buy now or bundles belong in
   this section.

## Risks

- Copy fixes for the live instances are in shared template files (templates/index.json, templates/product.json);
  coordinate with whoever owns template edits.
- Do not add an incentive ("10% off your first order") unless a real discount exists and the merchant confirms.
- The form must keep posting even if GSAP throws: motion must stay listener-only, never intercept submit.
- `general.newsletter.placeholder` lives in the shared locale file; changing the value is safe (only this section
  reads the key).
