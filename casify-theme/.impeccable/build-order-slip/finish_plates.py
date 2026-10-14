"""Key the KIE window-frame plate to alpha and embed provenance into every Order Slip plate.

Run from the theme root. Keying mirrors the cobalt chroma method used for the hero sweets:
alpha ramps on b - max(r, g) from 35 to 95, blue spill pulled down to max(r, g).
"""
import subprocess
import sys

import numpy as np
from PIL import Image

EMBED = "C:/Users/LENOVO/.claude/skills/impeccable/scripts/embed-prompt.mjs"
COMP = ".impeccable/mocks/decision/order-slip.png"

FRAME_PROMPT = (
    "Use the provided crop as the approved visual reference and recreate it as a clean production asset at the target "
    "aspect ratio. This is a designed illustration plate. Output the same drawing, same style, same line weight and "
    "shading. Preserve silhouette, composition, perspective, palette (#f5f3e6, #d4c1b2, #352618), lighting, material, and "
    "texture exactly. Remove every piece of UI text, label, caption, button, and interface chrome that is not part of the "
    "artwork itself. Remove letterboxing, borders, card corners, drop shadows, and any layout background that the page "
    "will draw in code. Do not add objects. Do not change the concept. Do not restyle. The artwork fills the whole frame "
    "edge to edge at the same scale as the reference; no margins, no border, no background band. Region: scalloped "
    "cream-bead window frame with a thin gold edge and an empty centre, placed around the product photo as a 9-slice "
    "border.\n\nChroma key requirement: draw ONLY the scalloped cream-bead frame with its thin gold edge, as a "
    "rectangular ring. Remove the phone case photograph completely: the frame's centre opening is one perfectly flat "
    "solid cobalt blue (#1F4FD1) field, and everything outside the frame's outer scallops is the same flat solid cobalt "
    "blue (#1F4FD1). No gradient, no shadow cast onto the blue, no texture in the blue. Keep the scallops evenly spaced "
    "and identical on all four sides so the frame can be sliced and stretched."
)


def key_cobalt(src, dst):
    im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    blue = b - np.maximum(r, g)
    alpha = np.clip(1 - (blue - 35) / (95 - 35), 0, 1)
    out = im.copy()
    out[..., 2] = np.where(blue > 0, np.maximum(r, g), b)
    rgba = np.dstack([out, alpha * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(dst)
    solid = (alpha > 0.5).mean()
    print(f"keyed {dst}: {solid:.1%} opaque")


def embed(path, prompt):
    res = subprocess.run(["node", EMBED, path, "--prompt", prompt], capture_output=True, text=True)
    print((res.stdout or res.stderr).strip().splitlines()[-1] if (res.stdout or res.stderr) else f"embed exit {res.returncode}")


key_cobalt(".impeccable/build/raw/window-frame-kie.png", "assets/plates/window-frame.png")
embed(
    "assets/plates/window-frame.png",
    FRAME_PROMPT
    + "\n\n[provenance] KIE gpt-image-2-5-flare-image-to-image, 1:1 2K, task 89bb76f764fe88ae858ab074eddffa16, "
    "reference: comp crop of region window-frame; keyed from cobalt chroma to alpha.",
)

for rid in ("page-ground", "slip-paper"):
    embed(
        f"assets/plates/{rid}.png",
        f"[provenance] texture plate: clean patch of the approved comp {COMP} region {rid}, mirror-tiled to size. "
        "No generation.",
    )

MEDIA = {
    "photo": ("tmc-full-1.jpg", "35e99f61-d106-44ed-b6dc-35193675e47d.jpg", 1),
    "thumb-1": ("tmc-full-1.jpg", "35e99f61-d106-44ed-b6dc-35193675e47d.jpg", 1),
    "thumb-2": ("tmc-full-2.jpg", "090c8368-1ad2-4ec7-a951-a93deba42df7.jpg", 2),
    "thumb-3": ("tmc-full-3.jpg", "c3fdb5fd-d920-4726-b941-a4ddddf3520d.jpg", 3),
    "thumb-4": ("tmc-full-4.jpg", "ab5fc576-3c40-4de4-a5ca-2d9be313fd52.jpg", 4),
    "thumb-5": ("tmc-full-5.jpg", "8903527e-bb18-40a2-8fd0-15e6598294c7.jpg", 5),
}
for rid, (local, cdn, n) in MEDIA.items():
    embed(
        f"assets/plates/{rid}.png",
        f"[provenance] real product photography, not generated: Shopify product media image {n} of 'Transparent "
        f"Magnetic Phone Case for iPhone' (gid://shopify/Product/9942185148661), "
        f"https://cdn.shopify.com/s/files/1/0816/4953/3173/files/{cdn}, cover-cropped to the region aspect. "
        "On the live theme these regions render the product's own media.",
    )

sys.exit(0)
