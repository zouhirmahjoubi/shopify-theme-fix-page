# INF-4 requests (changes outside assets/cv-pdp-story.js / .css)

1. assets/cv-pdp-video-reviews.js (owner: the video-reviews unit or PDP-SHARED): every
   shopify:section:load of the buy box section adds one more document keydown, document
   visibilitychange and window resize listener (trace: `at on (/assets/cv-pdp-video-reviews.js:32:53)`,
   verify/INF-4/story-editor-trace/console.json). Its unload does not remove them. Not caused by INF-4;
   the INF-4 editor run allows exactly these three keys.
2. Liquid follow-ups for wave units (the JS already handles the live page; these fix the no-JS / first paint):
   - sections/cv-pdp-fit.liquid: initial aria-pressed from `product.selected_variant` (blank on plain URLs)
     instead of `selected_or_first_available_variant`; optional `data-i18n-count-one="[n] model"`,
     `data-i18n-count-other="[n] models"` on [data-cvp-fit].
   - sections/cv-pdp-closer.liquid and cv-pdp-guarantee.liquid: server summary from `product.selected_variant`;
     optional `data-product-title`, `data-i18n-summary` ("[product] · [variant] · [qty] · [total]"),
     `data-i18n-summary-pending` ("[product] · Choose your phone"), `data-i18n-case-one` ("[n] case"),
     `data-i18n-case-other` ("[n] cases") on the [data-cvp-closer] element.
   - sections/cv-pdp-set.liquid: "From " (:55) is Liquid, not JS; `data-adding-label="Adding…"` and
     `data-retry-label="Try again"` are hard-coded. JS reads `data-i18n-add|adding|added|retry|fit` first,
     then these legacy attributes, then English.
   - New generic hooks any unit may print: `[data-cvw-pct="2|3"]` (server text from settings.cv_pack_*_pct),
     `[data-cvw-buy="add|buy"]`, `[data-cvw-model="<value>"]`, `[data-cvw-pack="N"]`, `[data-cvp-back]`
     (an `<a href="#cvAddForm">` now works: the JS cancels the jump and scrolls smoothly).
