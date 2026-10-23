# product-3d-viewer ("3D product viewer")

## Status

ORPHAN. Not placed in any `templates/*.json` or `sections/*-group.json`. No `enabled_on` (schema
sections/product-3d-viewer.liquid:180-202), preset "3D product viewer" (:200), so the editor offers it on EVERY
template (home, pages, collections), not just products.

## Purpose

A generic three.js viewer: loads a `.glb` from a pasted URL (setting `model`, :185), orbit controls, optional
auto-rotate, and playback of animation clips baked into the file with a clip picker and Pause/Play (:41-177).
It is not tied to the product, its media, its variants or the buy box. The theme already has a product-bound 3D
path: the Shop Counter turns the product's own Shopify Model3d media into a `<model-viewer>` ticket
(sections/cv-product-counter.liquid:34, :346; assets/cv-pdp-model.js:1-11).

## Files (owned / shared)

Owned:
- `sections/product-3d-viewer.liquid` (markup, inline `<style>` :17-30, inline importmap + module script :32-178)

Shared:
- `assets/theme.css`: `.p3d*` rules at theme.css:2716-2719 (only this section uses `.p3d`, but the file is global);
  `[data-cm-reveal]` hidden start state theme.css:895-896 and reduced-motion override :3314
  (`data-cm-reveal` also used by sections/bundle-buybox.liquid)
- `assets/theme.js` reveal observer theme.js:184-195 (runs once at init, :207)
- External (not theme files): `https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js` and
  `.../examples/jsm/` addons (OrbitControls, GLTFLoader) via an inline importmap (:34-39)

## Store adaptation findings

1. HIGH: Shopper-facing editor instruction. When `model` is blank the storefront shows "Upload a .glb model in the
   Theme Editor to preview it here." (:7-9) inside an empty 480px box. Fix: render the section only when a model
   exists; show that hint only under `request.design_mode`.
2. HIGH: Not bound to store data. The viewer ignores the product. Fix: on product templates, default the source to
   the product's first 3D media: loop `product.media` for `media.media_type == 'model'`, pick the `glb` entry of
   `media.sources` (`source.format == 'glb'`, `source.url`), and use `media.preview_image` as the poster/alt. Keep the
   URL setting only as an override. Add `"enabled_on": { "templates": ["product"] }` unless a home/page use is wanted.
   Alternative with less code: Shopify's `model_viewer_tag` (as cv-product-counter does), which brings AR and
   Shopify's own loader and avoids three.js entirely.
3. HIGH: Wrong copy for the product domain. Default heading "Look inside" (:184) suggests an interior; a phone case
   has none. Fix default: "Turn the case around" or "See the case from every side". Heading is printed UNESCAPED
   (:3); use `| escape`.
4. Runtime CDN dependency. three@0.186.0 is pulled from cdn.jsdelivr.net (:36-37). MOTION-SYSTEM.md 1.6 says new
   code must not add runtime CDN imports. `assets/three.module.min.js` and `assets/three.core.min.js` are
   self-hosted, but OrbitControls and GLTFLoader are not in assets/. Fix: map `"three"` to
   `{{ 'three.module.min.js' | asset_url }}` and self-host the two addons (check the self-hosted three version
   matches the addons'), or switch to `model_viewer_tag` (finding 2).
5. Clip names from the file are shown to shoppers as button labels (`clip.name`, :136), e.g. raw rig names like
   "Armature|Action". Fix: hide the picker by default (`clip_picker` default false, :198) or map names through a
   textarea setting "Clip labels" (one per line).
6. Hard-coded English "Pause" / "Play" (:12, :83) and aria-label "Animations" (:13). Move to settings.
7. Two conflicting style sets: inline `.p3d { padding:48px 24px; max-width:1120px }` (:18) vs theme.css:2716
   `.p3d { display:grid; padding:20px; border:2px solid var(--teal-500); background: var(--teal-100) }`, and
   `.p3d__empty` differs (inline :29 vs theme.css:2719). Fix: keep one; the inline block is the owned one, so move
   the final look there and leave theme.css alone (or remove theme.css:2716-2719 in a coordinated shared edit).
8. No commerce link. A 3D viewer on a product page should end with the decision: add a `data-cv-scroll-to-buy`
   button ("Choose your phone") under the stage (cv-motion.js attribute, :235-241).
9. Accessibility: the canvas has no accessible name; add `role="img"` and `aria-label="3D view of {{ product.title }}"`
   on the stage, and a visible hint "Drag to turn".

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Look inside" (implies an interior view) | :184 | Misleading for a phone case (no interior); replace (finding 3) |

No ratings, counts, guarantees or performance claims.

## Motion inventory

- data-cv-* attributes: none. Uses `data-cm-reveal` on the heading (:3) (theme.js IntersectionObserver reveal,
  theme.js:184-195; CSS theme.css:895-896). Own hooks: `data-p3d`, `data-p3d-clips`, `data-p3d-list`,
  `data-p3d-toggle`.
- WebGL: three.js renderer, OrbitControls with damping, `autoRotate` (default on, :187), AnimationMixer clip
  playback with loop modes, speed and crossfade (:64-152).
- GSAP: none.
- Reduced motion: auto-rotate off (:166) and clips do not autoplay (:151). WebGL still initialises and the rAF loop
  still renders every frame. DESIGN.md Motion says reduced motion removes nonessential animation AND WebGL.
- Offscreen: IntersectionObserver skips rendering offscreen (:165, :172) but `requestAnimationFrame(tick)` keeps
  scheduling every frame forever (:168-176). No `visibilitychange` handling (rAF pauses in hidden tabs anyway).
- Pause path: clips have Pause/Play (:12, :143-147); auto-rotate has NO pause control (stops only while dragging).
  DESIGN.md Do's require a pause path for auto-running motion.
- No-JS: heading is invisible (`[data-cm-reveal]` opacity 0 in plain CSS, theme.css:895; MOTION-SYSTEM.md 3.4 rule 1)
  and the stage is an empty cream box. No poster image.
- Theme editor: no `shopify:section:load/unload` handling. theme.js reveal runs once, so a heading added in the
  editor can stay at opacity 0. Each re-render runs the module again and creates a new WebGL context without
  disposing the old renderer or cancelling its rAF loop (context leak in long editor sessions).

## Motion opportunities

1. HIGH: Poster-first, load-on-intent. Render the product's 3D `preview_image` (or first product photo) as the
   static state, with a "Turn the case around" button; import three.js / model-viewer only on click or when the stage
   is near the viewport AND motion is allowed. Under reduced motion keep the poster unless the shopper clicks
   (user-initiated 3D is acceptable; autoplay is not).
2. HIGH: Turntable entrance with GSAP: when the model is ready, tween `pivot.rotation.y` from -0.6 to 0 with
   `power3.out` over 0.9 s and the camera dolly `z: 5 -> 4`, driven by a ScrollTrigger `once` at `top 75%`, then hand
   over to OrbitControls. Add a visible "Pause turning" toggle bound to `controls.autoRotate`.
3. MEDIUM: Scroll-scrubbed rotation on wide screens (`ScrollTrigger` `scrub: 0.6`, rotation.y over 1 turn while the
   stage crosses the viewport), paused when the shopper drags. Use ScrollTrigger, not a window scroll listener
   (MOTION-SYSTEM.md 3.3).
4. MEDIUM (commerce): a "Choose your phone" `data-cv-scroll-to-buy` button that appears after the first full turn
   (fade/rise 240ms), handing the shopper back to the buy box.
5. LOW: Variant link. If variants carry their own 3D media, swap the model on `cvs:change` with a quick crossfade of
   the canvas opacity (160ms).
6. Replace `data-cm-reveal` on the heading with a no-JS-safe pattern (`.js`-scoped hidden state, or the section's
   own pending class with a timeout).

## Risks

- three.js is heavy; loading it from a third-party CDN at runtime is a performance and supply-chain risk and breaks
  the theme rule against runtime CDN imports.
- Two viewers on one page emit duplicate importmaps (comment :33); only the first is honoured.
- The section is offered on every template; adding it to the home page would show an empty box plus an editor
  instruction to shoppers until fixed (finding 1).
- Overlaps with the counter's Model3d ticket (cv-pdp-model.js). Showing the same model twice on one product page is
  noise; decide one 3D home per page.
- theme.css `.p3d` rules are in a shared global file; only touch them in a coordinated shared edit.
