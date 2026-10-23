# Motion + store adaptation: settled decisions (2026-10-22)

- Store: Casify, the phone-case store. NOT christmascandles.shop: that store already has its
  own theme in `../christmas candles/`, whose brief bans phones and cases. Each store keeps its theme.
- Folder: `casify-theme/` only. `christmas candles/` is not touched.
- Scope: all 95 sections (58 placed in templates, cv-cart-drawer and predictive-search via the
  Section Rendering API, 35 placed nowhere).
- Work: adapt every section to the Casify catalogue and brand (DESIGN.md "Candy Shop Matinee"),
  and add GSAP / Motion choreography to the buy box (cv-product-counter, main-best-product),
  packs and bundles, Add to cart, Buy now, the cart drawer and scroll moments.
- Every animation has a reduced-motion path and a static no-JS state (DESIGN.md Motion).
- Honesty: no invented reviews, ratings, counts, guarantees or performance claims (DESIGN.md Don'ts).
- Copy: no em or en dashes.
- Git: branch `feat/motion-store-adapt`, checkpoint `e5ef095` holds the Oct 18 edits.
- Delivery: commits on the branch only. The owner runs `shopify theme push --unpublished`.
  The live theme is never touched.

## Owner answers to PLAN.md 6.3 (2026-10-23)

- Q1 Claims: every unbacked claim becomes a per-claim editor setting, OFF by default. The documented
  store rating (4.9 from 952, PRODUCT.md Evidence on Hand) replaces inflated counts. Nothing is deleted.
- Q3 After Add to bag on a product page: fly to the bag and stay on the page (button morphs to
  "In your bag"). `cv_open_drawer_on_add` exists as a theme setting, default false.
- Model choice: required. Never pre-select a phone model; Add to bag / Buy now with no model chosen
  nudges to the model picker (cvs:needmodel). Products without a model option are unaffected.
- Q4 Orphans: clean and keep. Strip invented content to honest blank defaults, adapt to Casify, add
  motion, keep them placeable.
- Still open (owner-gated in TPL tasks, not blocking infrastructure or wave 1): which product leads the
  home hero; whether checkout really charges $0 shipping on every order; whether automatic pack
  discounts are still 18% for 2 and 31% for 3 (defaults follow PRODUCT.md until confirmed).
