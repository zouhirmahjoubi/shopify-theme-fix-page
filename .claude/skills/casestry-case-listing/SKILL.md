---
name: casestry-case-listing
description: Turn a portrait phone-case design (PNG) into a Casestry print-on-demand listing on the Casify Shopify store - per-model 300 DPI print files fitted to Casestry templates (camera-safe), mockups from Casestry mockups, product images, and a Shopify product whose variants carry the Casestry SKU and print-file metafields. Use when the user wants to add a design/artwork to Shopify as phone cases (Tough, MagSafe Tough / MagCase, iPhone, Samsung, Pixel) or mentions Casestry templates/mockups.
---

# Casestry case listing

Pipeline: **design PNG -> print file per phone model -> mockups -> Shopify Files -> one product (productSet)**.
Everything runs from the project root (`C:\Users\LENOVO\Downloads\Shopify Theme Fix & Page`).

## Facts this skill relies on (verified 2026-10-07)

- Casestry prints the file you link **centred on the template, without scaling** (FAQ 11). A print file must be
  the template canvas: **1748 x 2480 px @ 300 DPI**, RGB, every template line covered ("leave no part of the template visible").
- Templates: `case_templates/<Brand>/...` (`Apple/Tough & MagSafe/<code>T.png`, `Samsung/Tough/<code>T.png`, `Google/Tough/<code>T.png`).
  One template serves Tough and MagSafe Tough. Outer outline = full-wrap print area (sides + lip), inner outline = back panel, plus the camera cut-out.
- Mockups: `case_mockups/<Brand>/Tough/{Gloss,Matte}/<code>T_Mockup.png` / `<code>-MT_Mockup.png`, same 1748x2480 canvas as the template;
  the case body is semi-transparent, so print-under-mockup gives the product photo. No mockups exist for Galaxy S26 -> a drawn mockup is used.
- Casestry API: `https://www.casestry.com/v1`, header `x-api-key`. `GET /items` = catalog, `POST /orders` items take
  `item_sku`, `qty`, `front_artwork` (direct-download URL), `front_mockup`, `autoscale` (fit|fill|none). Spec: casestry.com/swagger.json.
- MagCase (MagSafe Tough) exists for iPhone 12 Mini-18 Pro Max, Galaxy S26/S26 Plus/S26 Ultra, Pixel 11 series only.
  Samsung S21-S25 are Tough (non-magnetic) only.
- SKU scheme (from Casestry mockup names + the store's first Casestry product): Tough `{code}T`, Tough Matte `{code}-MT`,
  MagSafe `{code}-MS`, MagSafe Matte `{code}-M-MS`. Shopify SKU = `CS-` + that. **Unverified against GET /items until
  `scripts/verify_skus.py` has been run with the merchant's key.**
- Store conventions: vendor Casify, type "Phone Case", options `Phone model` then `Case type`, prices Tough 49.99 / MagSafe 54.99,
  compare-at 59.99 on every variant, inventory untracked, cost = Casestry base ($12 Tough, $14 MagCase). New listings start **DRAFT**.
- Metafields: variant `casestry.item_sku`, variant `casestry.front_artwork` (this model's print file), variant `casestry.front_mockup`.
  Product-level `casestry.front_artwork` is for single-file all-over patterns only; leave it empty for scene designs so the
  connector can never print one model's file on another model.
- Titles containing "iPhone" / "Samsung" auto-join the store's smart collections of the same name.

## Steps

1. **Look at the design** (Read the PNG; overlay a % grid if needed). Write `casestry_listings/<slug>/design.json`:
   ```json
   {"title": "...", "art": "D:/.../design.png",
    "keep":    [x0, y0, x1, y1],          // must land on the back panel, not the side wrap
    "protect": [[x0, y0, x1, y1], ...],   // must stay clear of the camera (faces, text, focal objects)
    "camera_margin_px": 24, "inner_margin_px": 16}
   ```
   Fractions of the artwork. Decorative bands (stars, corner sprigs) may sit under the camera, so leave them out of `protect`.
   All-over patterns: `"keep": [0,0,1,1]`, no `protect`.
2. **Fit**: `python .claude/skills/casestry-case-listing/scripts/casestry_fit.py --art <png> --design <design.json> --out casestry_listings/<slug> --lines magsafe,magsafe_matte --brands Apple,Samsung`
   (`--lines` from models.json `case_lines`; `--models 17PM,S26U` to test a few first).
   The art is scaled until protected boxes clear the camera, centred on the back panel, and the rest of the canvas is filled with a
   texture sampled from the art's own background (the art edge feathers into it). Models without a template are reported as SKIP.
3. **QA, always by eye**: Read `qa_prints.jpg` (cyan template, green back panel, red camera, orange protected boxes) and `qa_mockups.jpg`.
   Check: no protected box touches red, lettering not on the wrap, no seams/ghosts, mockup crops consistent. Warnings with shrink < 0.8
   mean the design is small on that phone; that's acceptable for a camera-heavy model, but say so in the report.
4. **Heroes**: `cd .claude/skills/casestry-case-listing/scripts && python casestry_heroes.py --out "../../../../casestry_listings/<slug>" --main 17PM`
   -> main mockup, MagSafe ring view (Casestry MagSafe mockup), flat artwork.
5. **Alt text** -> `casestry_listings/<slug>/shopify/alts.json` (keys `hero:main|magsafe|artwork`, `mockup:<CODE>`, `print:<CODE>`).
6. **Upload** (Shopify MCP; each mutation needs the merchant's approval in the app):
   - `python .../shopify_stage.py plan <out> --slug <slug>` -> pass `shopify/staged_input.json` to
     `mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}} userErrors{field message}}}`
     (result is saved to a tool-results file because it's large).
   - `python .../shopify_stage.py upload <out> --targets <that file>` (curl POST, expects 201s).
   - `python .../shopify_stage.py filecreate <out>` -> `fileCreate(files:$files){files{id fileStatus ... on MediaImage{image{url}}} userErrors{...}}`.
   - Query `nodes(ids:)` until all READY; save `{"data":{"nodes":[...]}}` in input order to `shopify/files_ready.json`.
   - `curl` every print URL: must be `200 image/png`. CDN copies are pixel-identical, 300 DPI kept.
7. **Product**: write `shopify/product.json` (title, handle, descriptionHtml, tags, seo, category `gid://shopify/TaxonomyCategory/el-4-8-4-2`,
   `cost` per line), then `shopify_stage.py productset <out> --files shopify/files_ready.json --product shopify/product.json` and run
   `productSet(input:$input, synchronous:true)`. Keep product.json text ASCII where you can (en dashes come out garbled in the Windows console you copy from).
8. **Verify** by querying the product back: every variant's sku, price, compareAtPrice, image, `item_sku`, `front_artwork` matches its model code.
9. **Before going live** (tell the merchant; don't do these unasked): run `verify_skus.py` with `CASESTRY_API_KEY`; make sure the
   Cloudflare worker `casify-casestry-connector` reads the variant-level `casestry.front_artwork` (it is in `MODE=dry_run`, source not in this repo);
   then set the product ACTIVE.

## Files

- `models.json` - every Casestry model (name, code, case lines). Add new phones here; drop their template/mockup PNGs into `case_templates`/`case_mockups` with Casestry's filenames.
- `scripts/casestry_fit.py` - template analysis, placement, print/mockup rendering, QA sheets, manifest.
- `scripts/casestry_heroes.py` - product-level images.
- `scripts/shopify_stage.py` - staged-upload / fileCreate / productSet payload builder + uploader.
- `scripts/verify_skus.py` - SKU check against Casestry's live catalog.

## Gotchas

- Template styles differ (older ones have a translucent white overlay and a printed title), so geometry comes from line connectivity, not alpha.
  If a new template mis-detects, check `back`/`camera` in manifest.json and the QA overlay before uploading anything.
- Some mockups carry stray semi-transparent shadow pixels far from the case; the crop uses the largest connected component.
- iPhone 12 and 12 Pro share a template, so their print files are identical. That's expected.
- Missing templates on 2026-10-07: iPhone 18 Pro / 18 Pro Max / 17e, Pixel 9a / 11 series. Casestry hosts templates in its partner portal (login).
