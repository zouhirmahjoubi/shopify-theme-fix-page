# Product 3D Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every active Casify case a 3D model of its own design and case type, so the product page opens on it.

**Architecture:** Python builds each GLB from the design's real print file (`case_3d/`), headless Chromium with
model-viewer renders a still at the viewer's opening angle, and the Shopify Admin API (store connector) stores the
model as a Model3d file and references it from the product. The live theme already opens on the 3D view; no theme change.

**Tech Stack:** Python 3 (numpy, Pillow, pytest, playwright), @google/model-viewer 3.5.0 from jsdelivr for renders,
Shopify Admin GraphQL (`stagedUploadsCreate`, `fileCreate`, `fileUpdate`), curl for the staged POSTs.

**Spec:** `docs/superpowers/specs/2026-11-04-product-3d-views-design.md`

## Global Constraints

- Store qbq4bz-3d (www.casify.shop). Pilot = the 3 Snow Day Penguin products; the other 140 wait for Zouhir's OK.
- Body iPhone 16 Pro, Glossy. Camera orbit `-25deg 75deg auto`, shadow intensity 1 (as `sections/cv-product-counter.liquid`).
- Tough and Magnetic: tough model, print `print/tough/NN-*.png` (2340x3600) cropped to [310, 82, 2025, 3513].
- Clear: clear model, print `print/clear/NN-*.png` (1720x3600) cropped to [15, 0, 1705, 3600] (cover fit of template 16P-C).
- Textures 1024x2048 JPEG. Target about 1 MB per GLB.
- Model goes at the end of the product's media. Never reorder media.
- Full products (250 media) detach one image that no variant uses, with `fileUpdate referencesToRemove`; the file stays in Files.
- Alt text: `3D view of the <design> <case type>`, case type in lower case as in the title, for example "tough case".
- Generated GLBs and stills go to `case_3d/out/` (gitignored). No commits unless Zouhir asks.
- Every store change is logged in `case_3d/rollout-log.json`: product id, model file id, preview url, detached media id.
- Copy rules: no em or en dashes in any text a person reads.

## Review Focus

- A print file whose name differs from the product title (Marshmallows is `18-marsh-mallows`, Mistletoe is `08-kissing-mistletoe`): the wrong design on a product. Task 6 matches by an explicit table and checks each render against the product's own mockup.
- A full product where every image is tied to a variant: nothing to detach. The pilot query lists unlinked images first and stops if there are none.
- A model that fails processing (`status FAILED`, `mediaErrors`): it must be reported, never left half attached. Task 5 polls to READY before referencing.
- Picking a phone, then the 3D ticket again: the stage must switch back to the viewer. Task 5's live check clicks through it.
- Clear walls drawn in the wrong order (transparent sorting): the phone must show through the sides from every angle. Task 4's sheet includes a side and a top view.

---

### Task 1: Print file to texture

**Files:**
- Create: `case_3d/case_art.py`
- Test: `case_3d/tests/test_case_art.py`

**Interfaces:**
- Produces: `TOUGH_CROP = (310, 82, 2025, 3513)`, `CLEAR_CROP = (15, 0, 1705, 3600)`,
  `texture(print_png: str | Path, family: Literal['tough', 'clear']) -> PIL.Image.Image` (RGB, 1024x2048).

- [ ] **Step 1: Write the failing tests**: `test_crops` (both constants exact), `test_texture_size` (both families give
  (1024, 2048)), `test_corner_mapping` (a 2340x3600 gradient image whose pixel colour encodes x and y: texture pixel
  (0, 0) matches source (310, 82) and (1023, 2047) matches (2024, 3512) within 2 levels), `test_family_size_guard`
  (a 1720x3600 image as 'tough' raises ValueError, a 2340x3600 image as 'clear' raises ValueError).
- [ ] **Step 2: Run** `python -m pytest case_3d/tests/test_case_art.py -q`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement** `texture()` with Pillow crop then LANCZOS resize; check the source size per family first.
- [ ] **Step 4: Run** the same command. Expected: 4 passed.

### Task 2: Clear case model

**Files:**
- Modify: `case_3d/make_case_glb.py` (add the clear build; the tough build stays byte-for-byte the same in geometry)
- Test: `case_3d/tests/test_make_case_glb.py`

**Interfaces:**
- Consumes: `case_art.texture()`.
- Produces: `build() -> dict[str, Prim]` (tough, unchanged), `build_clear() -> dict[str, Prim]`,
  `write_glb(m, art: str | Path | PIL.Image.Image, out, matte=False, clear=False)`, CLI
  `python case_3d/make_case_glb.py <art> <out.glb> [--matte] [--clear]`.

- [ ] **Step 1: Write the failing tests**: `test_tough_geometry_unchanged` (build the tough GLB from
  `case_3d/butter-cookies-tin-art-16pro.png`; its JSON accessors, meshes and materials and its binary chunk up to the
  image buffer view equal `case_3d/butter-cookies-tin-christmas-tough-case.glb`), `test_clear_materials` (clear GLB has
  a material named "Clear shell" with `alphaMode` BLEND and alpha 0.15 to 0.35, a textured "Printed back" material,
  and a metallic "Phone frame"), `test_clear_bounds` (POSITION min/max span 75.1 x 153.2 mm within 0.5 mm, depth under
  15 mm), `test_clear_print_on_back_only` (every vertex of the print primitive has z within 0.01 mm of the back plane).
- [ ] **Step 2: Run** `python -m pytest case_3d/tests/test_make_case_glb.py -q`. Expected: the clear tests FAIL.
- [ ] **Step 3: Implement `build_clear()`**: the print is the flat back annulus only, UV `u = (x + HW - RB) / (2 (HW - RB))`,
  `v = (HH - RB - y) / (2 (HH - RB))`. Back fillet, side walls, lip, camera bezel and button covers use the clear
  material. Add a phone body (frame band from ZPB to ZS on the phone outline, Black Titanium `3c3c3d`, metallic 1,
  roughness 0.35) and metal side buttons under the covers. Reuse the camera plateau, lenses and screen.
- [ ] **Step 4: Run** the same command. Expected: all pass.

### Task 3: Renders and stills

**Files:**
- Create: `case_3d/render_glb.py`
- Test: `case_3d/tests/test_render_glb.py`

**Interfaces:**
- Produces: `render(glb: Path, out: Path, orbit='-25deg 75deg auto', size=1024, bg='#ffffff') -> Path` and
  `sheet(glb: Path, out: Path, orbits: list[str]) -> Path`, plus a CLI with the same arguments.
  Pages load model-viewer 3.5.0 from jsdelivr; the GLB is served with `page.route`; capture waits for the `load` event.

- [ ] **Step 1: Write the failing test** `test_render_shows_case`: rendering the Butter Cookies GLB at 512 px gives a
  512x512 PNG whose centre 20% box has under 50% background pixels and whose corner 5% boxes are all background.
- [ ] **Step 2: Run** `python -m pytest case_3d/tests/test_render_glb.py -q`. Expected: FAIL.
- [ ] **Step 3: Implement** with playwright sync API, a square `<model-viewer>` with the theme's attributes and `shadow-intensity="1"`.
- [ ] **Step 4: Run** the same command. Expected: PASS.

### Task 4: Pilot models

**Files:**
- Create: `case_3d/out/snow-day-penguin-{tough,magnetic,clear}.glb`, `...-preview.jpg`, `case_3d/out/pilot-sheet.jpg`
- Modify: `.gitignore` (add `/case_3d/out/`)

- [ ] **Step 1:** Build the three GLBs from Hearthside `03-snow-day-penguin.png` (tough file for Tough and Magnetic, clear file for Clear).
- [ ] **Step 2:** Render a sheet per model at `-25deg 75deg auto`, `0deg 90deg auto`, `90deg 90deg auto`, `180deg 90deg auto`, `0deg 10deg auto`.
- [ ] **Step 3:** Put each beside the product's iPhone 16 Pro / Glossy variant mockup. Pass when the penguin sits at the
  same height and the camera corner matches, and the clear sheet shows the phone through the sides at every angle.
- [ ] **Step 4:** Render the 2048 px stills at the opening angle as JPEG quality 88.

### Task 5: Pilot upload and live check

**Files:**
- Create: `case_3d/stage_upload.py` (POSTs files to `stagedUploadsCreate` targets, prints each `resourceUrl`), `case_3d/rollout-log.json`

- [ ] **Step 1:** `stagedUploadsCreate` for 3 GLBs (`MODEL_3D`, `model/gltf-binary`, POST) and 3 stills (`IMAGE`, `image/jpeg`, POST); save the response; run `python case_3d/stage_upload.py <response.json> <files>`. Expected: 6 lines with HTTP 201 or 204.
- [ ] **Step 2:** `fileCreate` the 3 models (`contentType MODEL_3D`, alt per Global Constraints). Poll `fileStatus` and `status` until READY. Stop and report on FAILED.
- [ ] **Step 3:** On the Tough product (250 media) detach the last image no variant uses; log its id.
- [ ] **Step 4:** `fileUpdate` each model with `referencesToAdd: [product]` and `previewImageSource: <still resourceUrl>`. Expected: no userErrors; each product lists exactly one Model3d.
- [ ] **Step 5:** Open the 3 product pages at 390 px, then 1280 px: the stage opens on the viewer, `model-viewer` fires `load`, no console errors, the still and the live model line up, a phone pick shows its photo and the 3D ticket brings the viewer back. Screenshots go to Zouhir.

### Task 6: Rollout to the other 140 (after Zouhir's OK)

**Files:**
- Create: `case_3d/catalog_3d.py`, `case_3d/tests/test_catalog_3d.py`, `case_3d/catalog-3d.json`

**Interfaces:**
- Produces: `catalog_3d.py build` (writes `catalog-3d.json` rows `{id, handle, title, design, case_type, family, print}`) and `catalog_3d.py check`.

- [ ] **Step 1: Write the failing tests**: every active product maps to exactly one existing print file; the 4 collections give 49 tough, 49 magnetic and 45 clear rows; the explicit name table covers Marshmallows, Mistletoe, Beary Christmas, Oh Christmas Tree, Merry Chic and Fa La La La Llama.
- [ ] **Step 2: Implement** the table and the builder from the Admin product list (ids, handles, titles).
- [ ] **Step 3:** Build all GLBs and stills; contact sheet of every opening still beside its first mockup; check by eye.
- [ ] **Step 4:** Upload in batches of about 20 (Task 5 steps 1 to 4), logging each batch.
- [ ] **Step 5:** Verify: every active product has one READY Model3d; spot-check 6 product pages at 390 px.
