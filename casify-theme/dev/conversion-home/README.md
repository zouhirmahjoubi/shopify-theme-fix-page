# Local conversion homepage preview

Run `npm install`, then `npm start` from this folder. The server binds only to `127.0.0.1:4186`.

- Homepage: http://127.0.0.1:4186/
- Mobile viewport (390 px): http://127.0.0.1:4186/mobile
- Desktop viewport (1440 px): http://127.0.0.1:4186/desktop
- Spotlight section: http://127.0.0.1:4186/spotlight
- Spotlight mobile viewport (390 px): http://127.0.0.1:4186/spotlight/mobile
- Spotlight desktop viewport (1440 px): http://127.0.0.1:4186/spotlight/desktop
- Local preview bag: http://127.0.0.1:4186/cart
- Observed browser checks: http://127.0.0.1:4186/qa

The homepage renders the actual `sections/cv-home-conversion.liquid`; the Spotlight routes render `sections/cv-spotlight.liquid`. Both use LiquidJS, schema defaults, actual theme CSS/JS, and the real theme snippets. The small header/footer belong only to this preview.

Product titles, photos, and prices come from the existing `dev/og/products.json` and `dev/og/photos/` files. The store's public product endpoint returned HTTP 401 during setup. Model/color options and variant IDs are **demo data**, identified by the banner. They are suitable for testing option selection, unavailable options, and quantity validation, but are not verified store inventory.

All cart actions remain inside this local server's memory. Reloading the server resets the preview bag. No checkout, order creation, live cart posts, or store writes are performed. `POST /cart/add.js` validates demo variants and quantities; `GET /cart.js` returns the simulated bag. `POST /cart/clear.js` empties it.

The server exposes only explicit preview routes, supported theme asset types, and local catalog photos. It does not expose the workspace, theme config, local settings, or dependency folder.

The preview injects a small local reporting script. `/qa` shows measurements collected from actual page views: viewport and document widths, potential overflowing elements, JavaScript errors, failed resources, broken images, and duplicate script sources. Reports are empty until a browser visits the page. Potential overflow candidates can include intentional clipped decoration; `pageOverflow` records whether the document itself is wider than its viewport. This instrumentation is confined to the preview and is not part of the theme.
