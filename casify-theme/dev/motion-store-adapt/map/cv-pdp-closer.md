# cv-pdp-closer ("Product: closing slip")

## Status

Orphan: placed in no template and no section group (grep of `templates/*.json` and `sections/*-group.json`).
PRODUCT.md:48 records it as an early-draft section left unused on purpose: its job is done by `cv-pdp-guarantee`, which already contains the same closing card with `data-cvp-closer` / `data-cvp-summary` (`sections/cv-pdp-guarantee.liquid:67-71`) and is live on both product templates. Placing this one as well would duplicate that role.

## Purpose

A paper slip at the end of the product page that repeats the shopper's choice (product title and variant, kept in sync by `assets/cv-pdp-story.js:248-258`) and a button back to the buy box (`data-cvp-back`, `sections/cv-pdp-closer.liquid:18`), plus an optional service line (`:19-21`). Two hero sweet cut-outs decorate the corners (`:14-15`).

## Files (owned / shared)

Owned:
- `sections/cv-pdp-closer.liquid` (nothing else is closer-only).

Shared:
- `assets/cv-pdp-story.css`: closer rules `:181-207`, phones `:219-220`, `.cvp .cvs__cta` button `:191-203`. Tagged by 18 sections.
- `assets/cv-pdp-story.js`: summary sync `:248-258`, `backToSlip()` `:25-30`, `[data-cvp-back]` binding `:398`.
- `assets/pdp-slip-paper.png` (also cv-pdp-fit, cv-pdp-guarantee, cv-product).
- `assets/hero-sweet-lollipop.webp` (also cv-orbit, cv-pdp-guarantee).
- `assets/hero-sweet-wrapped-red.webp` (also cv-home-conversion, cv-orbit, cv-pdp-guarantee, cv-product-counter).
- `assets/cv-pdp-slip.css` (`.cvs__service` `:266`, `:398`), which only `sections/cv-product.liquid` tags.

## Store adaptation findings

1. **HIGH: the only pictures are sweets.** The card shows a lollipop and a wrapped sweet (`:14-15`) and no product photo. Next to "Your slip is ready" and the product title, the sweets are the visible "goods". The candy shop is the frame; the product must be the phone case (DESIGN.md Do's, PRODUCT.md:112).
   - Fix (owned): add the chosen variant's photo as the card's subject: `cvar.featured_image | default: product.featured_image`, `image_url: width: 480`, alt `product.title` (product images have no alt, PRODUCT.md:32). Keep at most one sweet as corner trim. Swap the photo on `cvs:change` in an owned script.
2. **HIGH: vocabulary of a retired template.** "Your slip is ready" / "Back to your slip" (`:31-32`) refer to the Order Slip buy box (`sections/cv-product.liquid`). That template is gone from `templates/` (only `product.json`, `product.convert.json`, `product.best.json` exist); both product templates use the Shop Counter (`cv-product-counter`, "Add to bag").
   - Fix (owned): heading default "Ready when you are", button default "Choose my phone" (Principle 2) or "Back to my case".
3. **MEDIUM: summary changes format and misses the first update.**
   - Liquid prints "Product title · Variant title" (`:17`).
   - `cv-pdp-story.js:254` rewrites it to "Variant title · 2 cases · $X", dropping the product title and hardcoding English "case/cases".
   - cv-pdp-story.js loads after cv-product.js (`layout/theme.liquid:304-306`), so the buy box's first `cvs:change` fires before this listener exists; the summary stays in the Liquid format until the shopper changes something.
   - Fix: render qty and total in Liquid from the default tier is not possible here (tiers live in the counter), so either accept the Liquid format and have the owned script read `#cvTotal` and the checked `[data-cv-pack]` once on `DOMContentLoaded`, or change the shared formatter (coordinate).
4. **MEDIUM: service line unstyled on live templates.** `.cvs__service` (`:20`) is styled only in `assets/cv-pdp-slip.css:266`, tagged only by `cv-product.liquid`. Fix (owned): a section `{% style %}` rule for `.cvp-closer .cvs__service` using the label font, 13px, cocoa-600.
5. **Service line default** "Free shipping · 30-day returns · Ships in 1-3 business days" (`:33`) matches the confirmed facts (PRODUCT.md:34). Hyphen, not a dash: fine.
6. **Clean:** no other brand, no placeholder, no prices in copy.

## Claims register

| Claim | Where | Source | Status |
|---|---|---|---|
| "Free shipping" | `:33` | PRODUCT.md:34 | Backed |
| "30-day returns" | `:33` | PRODUCT.md:34 (Return Policy page updated to 30 days, PRODUCT.md:59) | Backed |
| "Ships in 1-3 business days" | `:33` | PRODUCT.md:34 (dispatch within 1 to 3 business days) | Backed |
| Summary: product, variant, qty, total | `:17`, `cv-pdp-story.js:254` | Live product and buy box data | Backed |

## Motion inventory

- `data-cv-*` attributes: none. Hooks are behaviour only: `data-cvp-closer`, `data-cvp-summary`, `data-cvp-back`.
- No motion at all: cv-pdp-home-motion.js animates closing cards only inside `[data-cvw-guarantee]` (`:412-448`), and its guard needs `.cvw` (`:42`); this section uses `.cvp`.
- CSS: sweets are statically rotated (`cv-pdp-story.css:205-207`); the CTA has hover/active transforms (`:202-203`).
- Reduced motion and no-JS: nothing to remove; static card is complete.
- Theme editor: not applicable (no motion); the shared `data-cvp-back` binding is lost after a section re-render until reload.

## Motion opportunities

Low overall value while the section is an orphan. If the merchant ever places it instead of the guarantee close:
1. **Medium: the slip is stamped on enter.** Card rises (y 40 to 0, `expo.out`, 420 ms), the case photo drops onto it (`back.out(2)`, 240 ms), one sweet pops in. Reuse the recipe at `cv-pdp-home-motion.js:425-447` in an owned script, without the infinite bob (or pause it offscreen).
2. **Medium: summary ticket flip on `cvs:change`.** The summary flips like a ticket (rotationX -90 to 0, 240 ms) and the total rolls to its new value.
3. **Medium: "In your bag" stamp on `cvs:added`** (`assets/cv-product.js:619`): a red rubber stamp lands on the slip (scale 2.4 to 1, rotation -12, 240 ms candy spring), then the CTA label changes to "View bag" and opens the cart drawer (listen for `cart:added`, never own the cart).
4. All under `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`; under reduce, swap text only.

## Risks

- Placing it duplicates cv-pdp-guarantee's closing card and its `data-cvp-closer` sync (two summaries updating at once).
- Every asset it uses is shared; owned edits must stay in the section file (plus a new owned script if motion is added).
- Recommend keeping it orphan and adapting copy and imagery only, so it is safe if placed later.
