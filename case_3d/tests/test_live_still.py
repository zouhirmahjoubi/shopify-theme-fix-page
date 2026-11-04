from pathlib import Path

import numpy as np
from PIL import Image

import live_still

HERE = Path(__file__).resolve().parents[1]


def test_still_matches_the_stage_box(tmp_path):
    out = live_still.stills([HERE / 'butter-cookies-tin-christmas-tough-case.glb'], tmp_path)[0]
    im = Image.open(out)
    assert im.mode == 'RGBA'
    w, h = im.size
    assert w >= 1400
    assert abs(h / w - 0.93) < 0.01
    alpha = np.asarray(im)[:, :, 3]
    assert alpha[:20, :20].max() == 0
    assert alpha[h // 2 - 20:h // 2 + 20, w // 2 - 20:w // 2 + 20].min() == 255
