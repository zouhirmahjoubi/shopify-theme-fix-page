# cv-blog ("Blog")

## Status

LIVE on `templates/blog.json` (only section, key `main`; settings at templates/blog.json:6-10: eyebrow "Field notes", subheading "Teardowns, drop tests, and what we learned building the thing.", feature_first, show_tags, per_page 12). `templates/blog.reviews.json` uses `review-widget`, not this section.

## Purpose

Blog index: breadcrumb, eyebrow + blog title + rich-text subheading, tag filter chips from `blog.all_tags`, a grid of post cards (newest post as a wide lead card on page 1), Shopify pagination, and an empty state when no posts are published.

## Files (owned / shared)

Owned:

- `sections/cv-blog.liquid`
- `templates/blog.json`
- Rule ranges in shared `assets/theme.css` used only here: `.cv-blog*` and `.cv-post*` (theme.css:2745-2777 and the `.cv-post` entries at 2659 and 2749-2754). `.cv-blog__hd` shares a rule with `.cv-article__hd` (2745); `.cv-blog` shares padding with `.cv-coll, .cv-cols, .cv-search` (2211).

Shared:

- `assets/theme.css`: `.cv-search__chip` (2381-2392, shared with cv-article, cv-search), `.cv-pager*` (also cv-collection, cv-search, and `assets/cv-pages.css`), `.cv-empty*` (cv-cart, cv-collection-row, cv-orbit, cv-search, cv-showcase), `.cv-eyebrow` and `.cv-sec__lede` (many home sections), `.cv-crumbs`, motion primitives and reduced-motion block.
- `assets/cv-motion.js`.
- `snippets/cv-icon.liquid` (quote animated, arrow-right, chevron-down).
- GSAP bundle (ScrollTrigger and SplitText always loaded; unused here).

## Store adaptation findings

1. HIGH, unbacked claims in the subheading: "Teardowns, drop tests, and what we learned building the thing." at templates/blog.json:7 and as the schema default at sections/cv-blog.liquid:111. No drop test is evidenced (PRODUCT.md "Evidence on Hand"; cv-story removed for that reason, PRODUCT.md:56) and "building the thing" implies Casify designs or manufactures the cases, which nothing in PRODUCT.md states. Fix both to a claim-free line in the shopkeeper voice, e.g. "<p>Notes from the counter: choosing a case, finding your phone model, and caring for it.</p>", or leave the schema default empty so the merchant writes it.
2. MEDIUM, no-JS / editor invisibility. `data-cv-reveal` on the header (17), the tag row (26), every post card (43), the pager (72) and the empty state (97). theme.css:1073-1074 hides them until cv-motion.js runs and chips are also `opacity: 0` by default (theme.css:2386). Without JS, or after a theme-editor re-render (cv-motion.js has no `shopify:section:load`), the whole index is blank. Fix in the owned section: drop `data-cv-reveal` from the header and add a scoped `<noscript><style>.cv-blog [data-cv-reveal], .cv-blog .cv-search__chip{opacity:1;transform:none;filter:none}</style></noscript>`; better, move card entrances to GSAP `from()` (opportunities).
3. LOW, eyebrow "Field notes" above the h1 (sections/cv-blog.liquid:18, 110; templates/blog.json:6). DESIGN.md Don't: "place an eyebrow label above every heading". Keep only if the merchant wants it; consider defaulting to blank and not rendering the span when blank (today `default: 'Field notes'` forces it, line 18).
4. LOW, hardcoded English UI: "All" (27), "Read it" (65), "Newer"/"Older" (75, 91), empty state "Nothing published yet" / "Posts will show up here as soon as the first one goes live." (99-100). Move to locales later. The empty-state copy is honest and fine.
5. LOW, images: `image_url: width: 1200` with fixed 1200x700 attributes and no srcset (45-48); the lead card renders 21:9 and others 16:9 (theme.css:2756-2757). Use `image_tag` with `widths` and `sizes` (lead: `100vw`-ish, others `(min-width: 900px) 33vw, 100vw`).
6. LOW, the tag row offers every tag in `blog.all_tags` (28-31) (honest, comes from data), and the card meta shows only `article.tags.first` (60). Fine.
7. No prices, currencies, other brands or candy-as-product copy in the section.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "drop tests" (implies Casify publishes drop testing) | templates/blog.json:7, sections/cv-blog.liquid:111 | UNBACKED (PRODUCT.md Evidence: drop test not verified) |
| "what we learned building the thing" (implies Casify builds the cases) | same lines | UNBACKED |
| "Teardowns" | same lines | UNBACKED unless posts exist; describes content that may not exist |
| Post titles, dates, authors, excerpts, tags | `article.*` | Store data |
| "Nothing published yet" empty state | line 99-100 | Honest, rendered only when `blog.articles.size == 0` |

## Motion inventory

- `data-cv-reveal` on header, tags, each `.cv-post` (with inline `--cv-i` = loop index for a 50 to 55 ms cascade; theme.css:1078 and 2753), pager, empty state.
- `data-cv-split` on the h1 (19).
- `data-cv-stagger` on the tag row (26) feeding the chip cascade.
- `cv-icon 'quote' animate: true` in the empty state (98).
- Hover: `.cv-post:hover` shadow and image `scale(1.05)` over 700 ms (theme.css:2754, 2758-2759), `.cv-pager__step:hover`.
- Global `.cv-progress` bar from cv-motion.js.
- Reduced motion: reveals, split words, chips, post image hover and pager hover neutralised (theme.css:3232, 3241-3249). Good.
- No-JS: blank page (finding 2). Theme editor: no load/unload handling. No section JS, no GSAP.

## Motion opportunities

1. HIGH: replace per-card IntersectionObserver reveals with one owned GSAP script using `ScrollTrigger.batch('.cv-post', { onEnter: b => gsap.from(b, { y: 24, autoAlpha: 0, stagger: 0.06, duration: 0.42, ease: 'power3.out', clearProps: 'all' }), once: true })`, so markup is visible by default (no `data-cv-reveal` on cards), and the lead card gets a clip-path wipe on its image (`inset(0 100% 0 0)` to `inset(0)`, 600 ms). Skip entirely under reduced motion. Re-run on `shopify:section:load`.
2. MEDIUM: in-place tag filtering and pagination through the Section Rendering API (`?section_id=<section.id>`), with GSAP Flip for the grid change, following the existing aisle pattern in assets/cv-pages.js:146-280 (Flip is not loaded on blog templates: the layout only sets `gsap_flip` for collection/page/policy/product, layout/theme.liquid:173-176, so either add `blog` there via the shared-layout owner or fall back to a cross-fade). Links must keep working without JS.
3. MEDIUM: "ticket" hover on post cards: card lifts 3px and tilts with `data-cv-tilt` (cv-motion.js:205-218, already respects reduced motion and fine pointer), "Read it" arrow slides 4px (240 ms).
4. LOW: header h1 via SplitText mask reveal instead of `data-cv-split`, eyebrow stamp-in.
5. Commerce: no buy box on an index. If the merchant wants product links, use the article-level strip proposed in cv-article.md rather than products on the index.

## Risks

- `.cv-search__chip`, `.cv-pager`, `.cv-empty`, `.cv-eyebrow`, `.cv-sec__lede` are shared; restyle only via `.cv-blog ...` scoped selectors inside an owned stylesheet or a `{% style %}` block in the section.
- Removing `data-cv-reveal` from cards while cv-motion still indexes them is safe; leaving both GSAP and `data-cv-reveal` on the same element would double-animate.
- Changing the subheading touches templates/blog.json (owned) and the schema default (owned).
