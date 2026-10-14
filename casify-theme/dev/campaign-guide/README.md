# Campaign guide additions

The existing homepage, product templates, styles and cart logic remain unchanged. New storefront files are `sections/cv-campaign-guide.liquid`, `assets/cv-campaign-guide.css` and `templates/page.campaign-guide.json`; the only addition to an existing file is the `sections.campaign_guide` translation group in `locales/en.default.json`.

The implementation follows [Jeffrey Park's tutorial](https://www.youtube.com/watch?v=M3z6nfRUnYg): offer framing (2:05), pre-sale pages (5:26), ad-to-page messaging (9:05), useful product images (13:55), and proof near decisions (16:01).

## Use in Shopify

1. Upload the updated theme to an unpublished theme for review.
2. Create a Page in Shopify and assign the `campaign-guide` theme template. In an unpublished theme, preview this template with the theme editor before publishing; template assignment may require the template to exist in the published theme.
3. In the theme editor, choose **Pages → campaign-guide** and select the featured product. The starting selection matches the existing homepage product, `mobile-phone-case-apple`.
4. Set the headline and introduction to continue the specific ad's message. Edit the reasons to explain that product's confirmed features and benefits. Choose **Numbered reasons** for a listicle or **Story** for an advertorial. Duplicate this template in the theme editor for a different campaign or product.
5. Pick real supporting product photos and explain the visible details in their captions. The hero defaults to the product's own featured image; reason blocks use photos 2 and 3 if they exist. Missing images are hidden.
6. Add a real customer quote with its author and original review link, or an appropriate review-app block. Product ratings use the review app's standard product rating and review-count data. No sample testimonials or ratings are shipped. A review app block must support rendering on a Page or let you choose the featured product explicitly.
7. Verify that the active Shopify automatic discounts match 18% for two cases and 31% for three cases, the existing theme's offer. Update the section's percentages if needed, or disable the offer. The section displays the offer; it does not create discounts or alter the cart.
8. Use the new Page URL as the ad destination. Shopping buttons lead to the existing product page so shoppers choose their exact phone model, colour and pack through the current buy box.

You can also add **Campaign: case guide** to an existing template through the theme editor. Keep its heading level at **Section title** there; the campaign Page template uses **Page title**. Existing navigation and template order have not been edited.

The starting text uses the already confirmed free shipping, 30-day returns, and dispatch within 1–3 business days. No additional warranties, drop-test figures, gifts or subscriptions are introduced.

## Local preview and checks

From this directory:

```powershell
node preview.mjs --serve
node verify.mjs
```

Preview: http://127.0.0.1:4198/. Story style: http://127.0.0.1:4198/?style=story.

This renders the actual Liquid section, translations and theme styles using the existing preview's LiquidJS dependency. The cached real catalog photo and price are used. The preview has a simplified header/footer and stops at shopping-link confirmation; it does not contact the live cart, create orders or change Shopify. Supporting photo and rating edge cases in `verify.mjs` are labelled test fixtures and are never included in the preview or shipped template.
