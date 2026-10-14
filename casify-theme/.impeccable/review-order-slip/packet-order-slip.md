# Finish review packet: Casify product page, "The Order Slip"

## Original request
"use gsap and kie ai and now recreate the product page, high converting product page" (Shopify theme at the project root; world already established by the rebuilt header, footer and home hero in the same vintage candy-shop design).

## Confirmed answers (user, 2026-09-14)
- Claims: per-product and verified only. No store-wide drop test, magnet force, ratings or "Screen Promise". Recorded in PRODUCT.md.
- Pack pricing must be real: two Shopify automatic discounts were created with the user's confirmation. "Pack of 2 cases: 18% off" (gid://shopify/DiscountAutomaticNode/1591052108021, min qty 2) and "Pack of 3 cases: 31% off" (gid://shopify/DiscountAutomaticNode/1591052173557, min qty 3); all products, non-stacking with product discounts.
- Scope: rebuild the buy box plus a tighter story (the 13 old sections were cut to 5 truthful ones).
- KIE art: shared set pieces only; "product imagery itself stays real".
- Store facts: free shipping (answered "free shipping", recorded as no threshold), 30-day returns, ships in 1 to 3 business days, no dispatch location, no countdown.
- Build path: comp-first. Structure round: user asked to build both dealt structures 1 and 2 as two templates. This packet covers the Order Slip (default template). The Shop Counter (second template) is not built yet.
- Thumbnails: "Real product photos" (the comp's thumbnails were invented views).

## Artifact
- sections/cv-product.liquid (the slip, variants, packs, sticky bar, JSON-LD without ratings)
- sections/cv-pdp-fit.liquid, cv-pdp-details.liquid (renders only with a description or custom.highlights metafield), cv-pdp-promises.liquid (tickets + FAQ + FAQPage JSON-LD), cv-pdp-shelf.liquid (product recommendations), cv-pdp-closer.liquid
- assets/cv-pdp-slip.css, assets/cv-pdp-story.css
- assets/cv-product.js (commerce), assets/cv-pdp-story.js (fit list, shelf fetch, closer), assets/cv-pdp-slip-motion.js (GSAP)
- templates/product.json and templates/product.convert.json (main + fit, details, promises, shelf, closer)
- layout/theme.liquid (product scripts), sections/header.liquid + sections/header-group.json (topbar and ticker copy corrected to confirmed facts)
- Static mirror used for every capture: dev/product/preview.html (real header, real option values, real price, real catalog products on the shelf; variants expanded in-page; /cart/add.js answered locally). The storefront is password-protected and nothing has been pushed, so no live render exists.

## Screenshots (all required)
- .impeccable/review/desktop.png (1440 wide, full page, reduced motion)
- .impeccable/review/mobile.png (390 wide, full page, via iframe)
- .impeccable/review/tablet.png (768 wide, full page, via iframe)
- .impeccable/review/desktop-1280.png and .impeccable/review/desktop-1600.png (first viewport at those widths)
- .impeccable/review/motion-end.png (1440x960 with motion on, lag smoothing off, entry settled)
- .impeccable/review/hero-repro.png (hero gate capture, 2016x1344)

## Direction contract
Read .impeccable/surfaces/sections-cv-product-liquid.md (six blocks, seed c4fdeaa6).

## Approved comp
.impeccable/mocks/decision/order-slip.png (locked on the decision page; comp-led). Build state: .impeccable/build/state.json. Spec: .impeccable/build/spec.json. Fidelity evidence: .impeccable/review/diff/hero/ and .impeccable/review/diff/final/ (side-by-side, heatmap, region pairs, report.json).

## Forced gates and known deviations (all recorded in state.json)
- plates, hero, responsive gates were forced only for regions that show the product's real Shopify photos instead of the comp's re-rendered or invented views (thumb-2, thumb-3, thumb-4; at responsive also window-frame, whose box encloses the main product photo). The hero passed its 72% bar at 82%, desktop at 80%.
- font-match had no browser (installing one is forbidden) and its catalog fallback returned novelty scripts for the rotated slip lettering; the build uses the site's existing faces (Playfair Display 900 display, Special Elite labels, Libre Baskerville body, Caveat for the handwritten total). Noted in state.json.
- comp-spec --crop returned blank paper for the tape region; the tape plate was generated from a manual crop of the same box.
- The comp's header topbar read "Ships from Austin, TX" (unconfirmed); the build shows the confirmed "Ships in 1-3 business days".

## Detector
node detect.mjs ran once over the changed sections, CSS and the harness: DEGRADED (htmlparser2, css-select, css-tree, domutils unavailable), regex fallback, 0 findings. Treat as an undercount; the floor check is yours.

## Behaviour verified in the harness (browser pane, GSAP ticked manually)
Entry end states (stamps, tape, total, slip rotation) settled; choosing the 3-case pack set total, sticky total and closer summary to $103.47 and quantity 3; add to bag showed "Adding…", flew the stub to the bag, cleaned it up and announced "3 cases added to your bag."; choosing iPhone 15 Pro in the fit list updated the slip answer and variant id; filtering "pro max" showed 8 models; Change opened the model picker. No horizontal overflow at 390, 768 or 1100 px.

## Craft floor
C:\Users\LENOVO\.claude\skills\impeccable\reference\craft-floor.md
