# cv-trustpilot ("Review rail")

File: `sections/cv-trustpilot.liquid` (283 lines). Family: reviews-2.

## Status

**orphan**. It is placed in no template or group. The schema name is "Review rail" (:211), with `disabled_on: groups [header]` (:213) and preset "Review rail" with 4 empty review blocks (:276-281).

Related live section, a different file: `sections/trustpilot-reviews.liquid` (type `trustpilot-reviews`) is placed at `templates/index.json:1322` and `templates/product.json:732`, with heading "Rated on Trustpilot", `trustscore 0` and 3 empty reviews (STORE-FACTS 7e). It uses the shared `.ccr` CSS and JS. The two sections play the same role. Do not place both on one page.

## Purpose

A Casify-native review rail: heading (inline richtext, italic word in the script face), an optional rating plaque (score, stars, count, platform name, linked to the public profile), a horizontal rail of "review letters" (stars, Verified opt-in, title, text, avatar or initial, name, date), a "Based on N reviews" band, and an `@app` slot for the review platform's widget. The rating comes from three sources: none (the default), "profile" (score and count typed from the merchant's public profile), or "shopify" (a weighted average of `reviews.rating` / `reviews.rating_count` metafields across `collections.all.products`, :47-62).

## Files (owned / shared)

Owned:
- `assets/cv-trustpilot.css` (211 lines). Only cv-trustpilot.liquid:21 references it. It has a reduced-motion block at css:209.
- `assets/cv-trustpilot.js` (304 lines). It is loaded by `layout/theme.liquid:255-258` under `gsap_drag`, which is true when `editor or content_for_layout contains 'data-cvtr'` (theme.liquid:169-172). `data-cvtr` appears only in this section (grep). The JS file is also referenced from a comment in cv-trustpilot.css.

Shared:
- `snippets/cv-stars.liquid` (stars with a `--fill` percentage). It is used by about 20 files (sections cv-pdp-reviews, cv-social-proof, review-widget, trustpilot-reviews, snippets cv-video-reviews, cv-store-ratings and others).
- `layout/theme.liquid:169-172` (`gsap_drag` flag) and `:255-258` (script tag). The flag also tells `snippets/gsap.liquid:25` to load InertiaPlugin and Draggable. Today only this section uses that flag, but layout is shared.
- `snippets/gsap.liquid` (ScrollTrigger, ScrollToPlugin and SplitText on every page, :36).

## Store adaptation findings

1. **Honest by construction.** Rating source defaults to "none" (:223), score defaults to 0 (:233), blocks ship empty, Verified is opt-in (:270), and the summary and band hide without data (:84, :191). Keep this.
2. **Evidence-backed configuration exists but is not wired.** PRODUCT.md:102 gives a merchant-supplied store rating of **4.9 / 5 from 952 reviews on Trustpilot and Google**. If the merchant places this section, the correct settings are `rating_source: profile`, `score: 4.9`, `total_reviews: 952`, `source_name: "Trustpilot and Google"` (not the default "Trustpilot", :231), and `profile_url` set to the public profile. Then the plaque reads "4.9 out of 5 · 952 reviews on Trustpilot and Google" and the band reads "Based on 952 reviews on Trustpilot and Google". **Do not** put these numbers into schema defaults (STORE-FACTS legend, MERCHANT-TYPED rule). Set them only in a template instance after the merchant confirms. The figure is a store rating and must stay labelled as one, never presented as product reviews (PRODUCT.md:61).
3. **Default `source_name` "Trustpilot"** (:231) is only wrong once a merchant enters the combined Trustpilot and Google figure. Change the info to "Name every platform the score comes from, for example 'Trustpilot and Google'". Better, make the default blank, so nothing is named until the merchant types it.
4. **Generic heading default** "Your <em>satisfaction</em> is our success" (:218) is boilerplate. Suggested Casify default: "Letters from our <em>customers</em>". Subheading default "We read every review." (:220) is a process claim; keep it only if the merchant confirms, otherwise default it blank.
5. **Hardcoded English strings** (no locale keys): fallback heading "What customers say" (:79); "out of", "review" and "reviews" (:92-93); "Rated ... out of ... from ... reviews. Opens in a new window." (:97); "Rated N out of 5." (:124); "Verified" (:129); "Customer reviews" rail label (:109); "Previous reviews" and "Next reviews" (:158, :161); "Based on", "reviews" and "published reviews" (:194-195); "(opens in a new window)" (:201). Fix: move them into a new `sections.cv_trustpilot.*` locale group. Pluralise "review/reviews" with locale `one`/`other`. Add `| escape` on the heading fallback.
6. **Editor-only copy with dashes:** the draft hint "Review draft [em] add the review text..." (:175) and the info "...script face [em] use it..." (:217). These are not shopper-facing, but the project rule is no dashes in copy. Replace them with a colon or a comma. The two dashes in the Liquid comment (:2, :8) are not copy.
7. **"shopify" source loops the whole catalogue on every render** (:49-58), up to 50 products from `collections.all.products`. That is fine at about 10-31 products (STORE-FACTS 3), but the result is a store-wide average labelled "published reviews". On a product page it can be mistaken for that case's rating. Fix: when `template.name == 'product'`, prefer `product.metafields.reviews.*` and label it "reviews of this case" (as cv-video-reviews.liquid:183 does). Otherwise label it "across the shop".
8. **Rating fill when the profile scale is not 5:** the profile source assumes scale 5 (:43). That is fine for Trustpilot and Google, which are both 5-point. No change needed.
9. **No product binding on letters.** Optional: a `product` block setting to show which case a letter is about, with an escaped title and link.

## Claims register

| Claim | Where | Status |
|---|---|---|
| Plaque score and count, "on [platform]" | :84-104 | Depends on source. "profile": MERCHANT-TYPED. 4.9 / 952 Trustpilot and Google is **BACKED** (PRODUCT.md:102) when entered exactly so. "shopify": **LIVE** (review metafields). "none": hidden |
| "Based on N reviews on [platform]" / "published reviews" | :191-205 | Same as above |
| "Verified" on a letter | :126-131, opt-in :270 | MERCHANT-TYPED, default off. OK |
| Letter text, name, date, stars | blocks | MERCHANT-TYPED. Preset empty |
| "We read every review." | :220 | **UNBACKED** process promise. Make the default blank, or confirm with the merchant |
| "Your satisfaction is our success" | :218 | Slogan, not factual. Replace for brand voice |

## Motion inventory

- `data-cv-*`: none. Own attributes: `data-cvtr` (root and gate), `-heading`, `-fade`, `-plaque`, `-score`, `-stars`, `-count`, `-rail`, `-card`, `-edge`, `-controls`, `-progress`, `-step`, `-band`, `-link`.
- `assets/cv-trustpilot.js`:
  - Entrance timeline (ScrollTrigger `top 78%`, once; :168-253): SplitText masked words on the heading, which keeps the `<em>` (:187-189); the plaque swings in with `elastic.out(1,.6)` (:196-199); the score counts from 0 to its value (:200-209); stars fill by tweening `--fill` (:205-207); the count counts up with locale formatting (:208-214); up to 6 letters are dealt from the right with alternating tilt (:217-224); red edges draw down (:225-226); card stars pop (:227-231); the band lifts and its number counts (:239-250).
  - Interaction: Draggable proxy with Inertia mirroring `scrollLeft` on fine pointers (:130-156); ScrollToPlugin glide for prev and next (:106-117); progress via `gsap.quickTo` (:120); hover lift (:255+).
  - Reduced motion: buttons and progress keep working with instant scroll, and there is no entrance (:41, :106-107, :166). CSS also has a reduced-motion block (css:209).
  - Hidden tab: `intro.progress(1)` (:253).
  - Editor: load, unload, select and block-select are all handled (:292-303).
  - No-JS: readable. The controls stay `hidden` (:156). Hidden states are set only by GSAP `from()`.
- GSAP plugins: ScrollTrigger, SplitText, ScrollToPlugin, Draggable, InertiaPlugin.
- Issue: the `elastic.out` plaque swing and the counter both run 1.1-1.4 s, which is longer than the 420 ms set in DESIGN.md:183. It is acceptable as a hero moment for a section, but it is the slowest entrance in the family.

## Motion opportunities

The motion here is already the most complete in the family. Work only matters if the merchant places it, for example to replace the live `trustpilot-reviews`.

1. **(High if placed) Use it as the home or product review rail instead of `trustpilot-reviews`.** It has better motion, an honest rating plaque and an `@app` slot. This is a template change (the merchant decides). Product.json is at 22 of 25 sections, so a swap is neutral on count.
2. **(Medium) Plaque "hangs" from a cord**, matching the header sign idiom (DESIGN.md:183, "signs swing from their cords"): replace `elastic.out` with a damped rotation sequence (rotation -6, 3, -1.5, 0 over 0.9 s, `transformOrigin: 50% -20px`). Shorten the counters to 0.9 s.
3. **(Medium) Product-template tie-in:** a ghost "Choose your case" button with `data-cv-scroll-to-buy` under the band (cv-motion.js:235-241, target `#cvPdp`). No add-to-cart in this section.
4. **(Low) Keyboard:** the rail has `tabindex="0"` (:109), but the JS has no arrow-key handler. Add ArrowLeft and ArrowRight calling the existing `glideTo`, as `casify-customer-reviews.js:86-101` does.

Buy box, packs, Add to cart, Buy now and the cart drawer are not applicable.

## Risks

- The `gsap_drag` flag in layout is keyed to `data-cvtr`. Renaming the attribute breaks Draggable and Inertia loading.
- Never set 4.9 / 952 as schema defaults. That would make every new instance assert the store rating, including on stores or pages where it does not apply.
- Two Trustpilot-role sections exist (this one and the live `trustpilot-reviews`). An agent adapting one must not assume the other's CSS and JS. They share nothing except `cv-stars`.
- The `shopify` rating source iterates `collections.all.products` (Liquid limit 50). It will silently undercount if the catalogue grows past 50 products.
