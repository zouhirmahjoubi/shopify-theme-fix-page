# Best product template

`templates/product.best.json` selects `sections/main-best-product.liquid`. The section uses `assets/best-product.css`, `assets/best-product.js`, three illustrative GPT Image scenes, live Shopify variants, product media, price, compare-at price, and review metafields. The global header and footer remain in `layout/theme.liquid`.

Assign the **best** template to the matching product in Shopify's product editor after the theme is uploaded. In the theme editor, replace the bundled hero, detail, and magnetic illustrations with verified product imagery and confirm the product-specific magnetic, material, and protection copy. The template itself does not set a fixed price, invent reviews, or create model/color variants.

`render-preview.mjs` creates a static local fixture at `preview.html`; `serve.mjs` serves it at `http://127.0.0.1:4173/dev/product-best/preview.html`. The fixture uses reference values for visual QA and is excluded from theme upload by `.shopifyignore`.
