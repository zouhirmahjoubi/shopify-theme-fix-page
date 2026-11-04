from pathlib import Path

import numpy as np
from PIL import Image

import render_glb

HERE = Path(__file__).resolve().parents[1]


def background_share(box):
    return (np.abs(box.astype(int) - 255).max(axis=2) <= 6).mean()


def test_render_shows_case(tmp_path):
    out = render_glb.render(HERE / 'butter-cookies-tin-christmas-tough-case.glb', tmp_path / 'still.png', size=512)
    img = np.asarray(Image.open(out).convert('RGB'))
    assert img.shape == (512, 512, 3)
    assert background_share(img[205:307, 205:307]) < 0.5
    for ys in (slice(0, 26), slice(486, 512)):
        for xs in (slice(0, 26), slice(486, 512)):
            assert background_share(img[ys, xs]) == 1.0
