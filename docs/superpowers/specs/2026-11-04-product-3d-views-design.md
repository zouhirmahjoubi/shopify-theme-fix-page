# 3D view as the main image on every product page

Date: 2026-11-04. Store: www.casify.shop (qbq4bz-3d), live theme #186064961613.

## Intent

Zouhir asked for "3d views for all my product, make it in the first", then pointed at the big stage image on a
product page (Snow Day Penguin, Tough): "that what i mean main image each product". Every case should open on an
interactive 3D view of that exact design and case type, in that spot, before any photo.

## Goals

- All 143 active cases get a 3D model of their own design and case type (49 Tough, 49 Magnetic, 45 Clear).
- The product page opens on the 3D view in the main image spot. Shoppers can turn it, and phones get
  "View in your space".
- The print in 3D sits where Printify prints it: same crop, right way up, camera in the right corner.

## Non-goals

- Product cards, collections, search, cart and Google Shopping keep the mockup photos. No media reordering.
- One phone for every product (iPhone 16 Pro, sold on all 143), not a 3D per phone model. Once a shopper picks
  their phone, the page already switches to that phone's mockup.
- No theme change. The live theme already opens on the 3D view when a product has a model (section setting
  `model_first`, default on; assets/cv-pdp-model.js and .css match live).

## Anti-goals

- A Clear case shown as a solid case.
- Stretched, mirrored or shifted prints.
- A slower product page. The stage paints the model's still first and the viewer loads after the page.
- Lost photos. Mockups detached for room stay in Content > Files.

## Constraints

- Shopify allows 250 media per product. 33 Tough products are full, so each gives up one mockup that no variant uses.
- The store connector refuses bulk mutations and documents over 16,384 characters, and the storefront rate-limits.
- The Printify app is installed. A Printify republish can replace a product's media, so recheck after any republish.
- Live changes go pilot first, rollout after Zouhir's OK.

## Approaches

1. **Build from the print files with Casify's generator (chosen).** `case_3d/make_case_glb.py` wraps the real print
   file around a modelled case on an iPhone 16 Pro. Free, local, and the print matches what Printify prints.
2. Match the shopper's phone brand (iPhone, Galaxy, Pixel). About 330 models, two new phone bodies, 3 free slots on
   full products and a theme push, for a small gain. Dropped.
3. AI 3D from a prompt or photo (KIE, CellCog plugin). Costs credits and distorts prints. Dropped.
4. Photo turntable. Printify mockups lack the angles, and no AR. Dropped.

Zouhir asked which tool I would use and did not pick another, so approach 1 is my call.

## Decided with Zouhir

- The 3D comes first on the product page only ("Product page only").
- "First" means the big main image on the product page (screenshot of the stage).

## My calls (Zouhir can change any)

- Body: iPhone 16 Pro. Finish: Glossy.
- Tough and Magnetic: the existing tough model (print wraps the side walls, black bumper and camera ring), from each
  design's `print/tough/` file cropped to the 16 Pro case (crop [310, 82, 2025, 3513] of 2340x3600, from
  `.case-geometry` template 16PT; re-checked on the pilot).
- Clear: a new clear model. Clear rim and side walls, the phone body visible through them, print on the back only,
  from `print/clear/` cropped to template `Clear Impact Resistant/16P-C`.
- The model is added at the end of each product's media. The theme shows it first on the product page.
- Alt text: "3D view of the <design> <case type> case".
- The still that paints before the model loads: rendered by us at the viewer's opening angle (-25deg 75deg) so
  nothing jumps, if Shopify accepts a custom preview; otherwise Shopify's own.
- Pilot: Snow Day Penguin in Tough, Magnetic and Clear. Zouhir checks them on a phone, then the other 140 go out.
- A log of every change (product, model media id, detached mockup id) so any product can be put back.

## Left to the builder

- Clear model details: phone colour, rim tint, camera ring.
- Texture size against file weight (about 1 MB per model).
- Which mockup to detach on full products: the last one no variant uses.
