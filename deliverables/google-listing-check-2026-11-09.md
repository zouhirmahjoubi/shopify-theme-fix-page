# Google listing check, 2026-11-09

All 485 active cases (29,027 variants) checked against Google Merchant Center's product rules and the requirements of Shopify's Google & YouTube channel. Read-only: nothing in the store was changed. Rechecked at about 17:00 UTC the same day, including two live product pages.

## Products: ready

- **Titles:** 70 to 118 characters (Google's limit is 150). No promo words, capitals, emoji or prices. No duplicates.
- **Descriptions:** 1,000 to 1,685 characters (limit 5,000). No prices, shipping details or links. The Prop 65 warning and the EU safety block are legal text and stay.
- **Photos:** the first photo is 2048 px on every case that has photos (Google's minimum becomes 500 px in January 2027). 30 first photos checked by eye: clean product shots with no added text, watermarks or borders.
- **Category:** all 485 are in Mobile Phone Cases (Google category 2353).
- **Brand:** Casify on 479 at the 17:00 recheck. Six show Printify while Printify re-sends their photos, and the brand watcher sets them back.
- **Prices:** Tough $37.99, Clear and Magnetic $49.99, all with the $59.99 compare-at (37% and 17% off, inside Google's 5 to 90% range). In the US Google can show the struck-through price. In the UK, France, Germany, Italy, Spain and the Netherlands it only does so when $59.99 was the real price for 30 of the last 200 days, so it won't show there. There is no penalty either way.
- **Stock:** every variant is for sale, and all 485 cases are on the Online Store.
- **Trademarks:** no licensed character names in titles, tags or descriptions. "Frosty" is used as an ordinary word and "stitch" means cross-stitch. "MagSafe compatible" describes compatibility, which Google allows.
- **Barcodes:** none set, so there are no invalid GTINs.

## Not ready while Printify re-sends photos

- The bunny case from the first check (`merry-christmas-patchwork-bunny-...-tough-case`) has its 2048 px photos back.
- At 17:05 UTC three other cases had no photos while Printify re-sent them: `sketch-some-joy-cute-pencil-...-tough-case`, `let-it-snow-patchwork-sticker-...-magnetic-impact-resistant-case` and `pencil-party-cute-pencil-...-clear-impact-resistant-case`.
- The resend is still running, so this list keeps changing. Check photos and brand again after it finishes and before installing the Google & YouTube app.

## Live product pages (rechecked about 17:00 UTC)

Mistletoe Tough and Mistletoe Magnetic, opened in a browser:

- **Prices match.** The page shows $37.99 (Tough) or $49.99 (Magnetic) next to a struck-through $59.99 and "Save $22.00" or "Save $10.00". The product markup and the og:price tag give the same price in USD. A visitor from Morocco also sees USD.
- **Indexable.** Each page has its own title tag, a canonical link to itself and no noindex tag. robots.txt doesn't block product pages and lists the sitemap.
- **Payments still off.** No payment icons appear. The theme shows them only when a payment method is active.
- **Old contact details still show.** The footer shows help@christmascandles.shop and 1207 Delaware Ave 3949, Wilmington, DE 19806.
- **Markup gap: fixed at 17:16 UTC.** The product markup sent one AggregateOffer, a price range across the 51 to 98 phone models. Google's merchant listing rules require an Offer, so the pages couldn't appear as merchant listings in Search from their markup alone. (Free listings from the Google & YouTube app come from the product feed, so approval never depended on this.) `snippets/cv-product-schema.liquid` now sends one Offer for the variant the page opens on: price, currency, stock, condition, URL (with `?variant=` when the link has one) and that variant's SKU. The brand is always Casify, even while Printify's resends set the vendor field to Printify. Before the push, all 485 cases were rendered on the theme dev server and checked against the store's data with no problems. After the push, Tough, Magnetic (with a variant link) and Clear pages were checked live. No crossed-out price is in the markup, because Google expects a sale with start and end dates for that.
- **Search snippet text ran words together,** for example "Christmas Pantry LabelBlush-pink paper". Shopify built it from the product text and dropped the space where a heading ends. Another session ("Fix cut-off product page titles") fixed the meta description at 17:04 UTC with a new snippet, `cv-product-meta-description.liquid`. The product markup now uses the same description, so the two files belong together in any theme.

## Store-level issues that block approval

Payments and the address were unchanged at the 17:00 UTC recheck. The email was fixed at 17:25 UTC.

1. **No payment method.** Shopify's Google channel requires a payment provider. You set this in Settings > Payments.
2. **Email: fixed.** The store email is now help@casify.shop (Settings > General > Store contact details), and the footer and contact page show it. The sender email under Settings > Notifications changed with it, but it stays "Unverified" until you click the confirmation link Shopify sent to help@casify.shop. Until then, customer emails go out from Shopify's backup address. Email domain authentication for casify.shop still shows "Needs setup".
3. **Address.** The footer shows 1207 Delaware Ave #3949, Wilmington, DE. My notes say this is a virtual address and the store is run from Morocco. Google's Misrepresentation policy bans showing a virtual address as your headquarters while running the business from a region you don't disclose, and the penalty is account suspension. Your choice: show your real address, or say where the business is run from. The Contact information policy is also still empty. Shopify has the Privacy, Refund, Shipping and Terms policies.

## Settings to choose when you install the Google & YouTube app

- **Shipping:** choose "Manually set up shipping settings in Google Merchant Center". The cases sit in Printify's shipping profiles. Shopify only syncs the General profile, which now holds no products (the 5 archived candles were deleted the same day) and still charges 190 MAD to the US. Enter US shipping as **free**, because the "Free shipping on every order" discount is active. Delivery time: up to 10 business days to print, then 2 to 5 business days to arrive in the US.
- **Identifiers:** no case has a GTIN. For products without one, Shopify asks for an MPN and a brand. Each variant already has a SKU that can serve as the MPN, and the brand is Casify.
- **Item count:** 29,027 variants become 29,027 Google items. If Merchant Center caps a new account, ask Google for a higher limit.

## Optional

- The footer's Returns and Terms links go to your own pages (`/pages/return-policy`, `/pages/terms-and-conditions`). Shopify's checklist names its own Refund Policy and Terms of Service, which exist, so linking those from the footer menu is the safest choice.
