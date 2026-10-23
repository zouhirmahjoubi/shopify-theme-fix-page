# cv-article ("Article")

## Status

LIVE on `templates/article.json` (only section, key `main`; settings `show_reading_time: true`, `show_comments: true`). `templates/article.reviews.json` uses `review-widget` instead, not this section.

## Purpose

Blog post page: breadcrumb (Home / blog / title), meta line (date, author, reading time), title, excerpt as lede, hero image with parallax, `article.content`, tag chips linking to `/blogs/<blog>/tagged/<tag>`, newer/older navigation cards, and Shopify comments with the native `new_comment` form when the blog allows comments.

## Files (owned / shared)

Owned:

- `sections/cv-article.liquid`
- `templates/article.json`
- Rule ranges inside shared `assets/theme.css` used only here: `.cv-article*` and `.cv-comment*` (theme.css:2778-2844, plus 3199 in a media query). `.cv-article__hd` is shared with `.cv-blog__hd` on theme.css:2745.

Shared:

- `assets/theme.css` (`.cv-crumbs` 1130, `.cv-search__chip` 2381-2392 shared with cv-blog and cv-search, `[data-cv-*]` primitives 1073-1096, reduced-motion block 3220-3270).
- `assets/cv-motion.js` (reveal, split, stagger, parallax, global progress bar).
- `snippets/cv-icon.liquid` (chevron-down, cross, check).
- GSAP bundle (ScrollTrigger and SplitText are always loaded; not used by this section today).

No section stylesheet/script and no layout loader keyed to its markup.

## Store adaptation findings

1. MEDIUM, em dash in shopper-facing copy: "Thanks — your comment is in the queue." (sections/cv-article.liquid:94). Fix: "Thanks. Your comment is waiting for the shop to approve it." Only say "waiting for approval" if the blog moderates comments; Shopify exposes `blog.moderated?`, so branch: moderated -> "Thanks. The shop will read your comment before it goes up."; unmoderated -> "Thanks. Your comment is posted."
2. MEDIUM, header comment promises behaviour that does not exist: "A reading-progress bar tracks the body specifically ... hits 100% at the end of the article" (sections/cv-article.liquid:4-6). No code scopes progress to the body: the only bar is cv-motion.js:172-185, which tracks the whole document. Either implement it (see opportunities) or correct the comment.
3. MEDIUM, no-JS / editor invisibility. `data-cv-reveal` sits on the header with the h1 (line 19), the hero figure (38), tags (51), nav (60) and the comments section including the comment form (77). theme.css:1073-1074 hides them until cv-motion.js runs; cv-motion has no `shopify:section:load` handler. Also the tag chips are `opacity: 0` by default (theme.css:2381-2391) even outside reveal. Above-the-fold h1 hidden until JS also delays LCP. Fix in the owned section: remove `data-cv-reveal` from the header (line 19) and the comments section (77) and add a scoped `<noscript><style>.cv-article [data-cv-reveal], .cv-article .cv-search__chip{opacity:1;transform:none;filter:none}</style></noscript>`.
4. LOW, hero image: fixed `width="1800" height="1000"` regardless of the real aspect ratio and no `srcset`/`sizes` (lines 39-42). Use `{{ article.image | image_url: width: 1800 | image_tag: widths: '600, 900, 1200, 1800', sizes: '(min-width: 900px) 860px, 100vw', loading: 'eager', fetchpriority: 'high', alt: ... }}` so the reserved box matches the image.
5. LOW, parallax gap: the img inside `.cv-article__hero` (overflow hidden, theme.css:2786-2787) is translated by `--cv-shift` (up to tens of px with depth 0.05) without being oversized, so a cream band shows at the top or bottom edge while scrolling. Fix: `scale: 1.08` on the img or move to a GSAP `yPercent` scrub on a taller image.
6. LOW, breadcrumb current item lacks `aria-current="page"` (line 16; cv-page and cv-contact have it).
7. LOW, hardcoded English: "min read" (28), "comment/comments" (78), "Newer"/"Older" (63, 69), "Name"/"Email"/"Comment"/"Post comment" (97-108). Move to locales later.
8. Content is the merchant's own articles; no candy-as-product, no other brands, no prices in the section.

## Claims register

| Claim | Where | Status |
|---|---|---|
| "N min read" | computed from word count / 220, sections/cv-article.liquid:26-28 | Store data (derived) |
| "N comments" | `article.comments_count`, line 78 | Store data |
| "your comment is in the queue" | line 94 | Process statement; true only for moderated blogs (see finding 1) |
| Article body, author, date, tags | `article.*` | Store data; whatever a post says is merchant content, outside theme scope |

## Motion inventory

- `data-cv-reveal` (fade-up) on header (19), tags (51), nav (60), comments (77); `data-cv-reveal="scale"` on the hero figure (38).
- `data-cv-split` on the h1 (31): word stagger.
- `data-cv-stagger` on the tags container (51): indexes chips for the `.cv-search__chip` cascade (theme.css:2386-2391).
- `data-cv-parallax="0.05"` on the hero img (42): rAF scroll job in cv-motion.js:189-201, CSS `translate` in theme.css:1096.
- Global `.cv-progress` bar (document-wide, not body-scoped).
- Hover lifts: `.cv-article__navcard:hover` (theme.css:2807), comment submit uses `.cv-cta--ghost` and gets cv-motion's magnetic pointer effect (cv-motion.js:221-233).
- Reduced motion: theme.css:3232 (reveals), 3241-3248 (split words, chips), 3248 (navcard hover), 3266-3267 (progress hidden, parallax off). Good.
- No-JS: header, hero, tags, nav and comment form invisible (finding 3).
- Theme editor: no section load/unload handling; GSAP not used.

## Motion opportunities

1. HIGH (correctness + promised feature): body-scoped reading progress. Owned script: `ScrollTrigger.create({ trigger: '.cv-article__body', start: 'top 20%', end: 'bottom 80%', onUpdate: s => bar.style.transform = 'scaleX(' + s.progress + ')' })` on a candy-stripe bar under the header (reuse the `.cvd__toc-fill` stripe look from cv-pages.css), and suppress the global `.cv-progress` on article pages (e.g. a scoped `.template-article .cv-progress { display: none }` in the section). Reduced motion: the bar may still track (it is an indicator, not decoration) but no easing.
2. MEDIUM: hero reveal as a clip-path wipe (`clipPath: 'inset(0 0 100% 0)'` to `inset(0)`, 600 ms soft-out) with the image doing a slow `scale: 1.08 -> 1` scrubbed by ScrollTrigger, replacing the gap-prone parallax. `from()` only, so no-JS shows the image.
3. MEDIUM (commerce, real data only): "Cases in this post" strip after the body, fed by an article metafield (e.g. `article.metafields.custom.products`, list of product references) and hidden when empty. Render `snippets/cv-card.liquid` (shared, do not edit) so its "Choose colour and phone" button uses `data-cvqp-open`; the layout auto-loads the quick pick dialog (layout/theme.liquid:207-209, 295-296), which adds a real variant and opens the cart drawer. Cards enter with `ScrollTrigger.batch`, 50 ms stagger. Requires a metafield definition in the store, which needs merchant confirmation (PRODUCT.md:33).
4. LOW: newer/older cards: a 240 ms arrow slide on hover/focus-visible; chips stamp on hover (scale 0.96 then 1 with the candy spring).
5. LOW: comment form submit: button press state (y 3px, 160 ms) and, on `form.posted_successfully?`, the check icon draws in with DrawSVG (always loaded). Never animate the article prose.

## Risks

- `.cv-search__chip` styling and its default `opacity: 0` are shared with cv-blog and cv-search; fix visibility with a section-scoped rule, not by editing theme.css, unless coordinated.
- Removing `data-cv-reveal` from the header changes the look on first paint (no fade); acceptable, and the split-word heading can still animate via `data-cv-split`.
- Any product strip must hide completely when the metafield is empty; no placeholder products.
