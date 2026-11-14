import numpy as np
import pytest
from PIL import Image

import case_art
import make_case_glb


def gradient(w, h):
    """Red encodes x and green encodes y, so a pixel's colour says where it came from."""
    x = np.round(np.arange(w) / (w - 1) * 255).astype(np.uint8)
    y = np.round(np.arange(h) / (h - 1) * 255).astype(np.uint8)
    rgb = np.zeros((h, w, 3), np.uint8)
    rgb[:, :, 0] = x[None, :]
    rgb[:, :, 1] = y[:, None]
    return Image.fromarray(rgb)


@pytest.fixture(scope='module')
def prints(tmp_path_factory):
    d = tmp_path_factory.mktemp('prints')
    tough, clear = d / 'tough.png', d / 'clear.png'
    gradient(2340, 3600).save(tough)
    gradient(1720, 3600).save(clear)
    return {'tough': tough, 'clear': clear}


def test_crops():
    assert case_art.TOUGH_CROP == (310, 82, 2025, 3513)
    assert case_art.CLEAR_CROP == (15, 0, 1705, 3600)


def test_texture_size(prints):
    for family in ('tough', 'clear'):
        tex = case_art.texture(prints[family], family)
        assert tex.size == (1024, 2048)
        assert tex.mode == 'RGB'


def test_corner_mapping(prints):
    src = np.asarray(Image.open(prints['tough'])).astype(int)
    tex = np.asarray(case_art.texture(prints['tough'], 'tough')).astype(int)
    assert np.abs(tex[0, 0, :2] - src[82, 310, :2]).max() <= 2
    assert np.abs(tex[2047, 1023, :2] - src[3512, 2024, :2]).max() <= 2


def test_see_through_print_shows_the_white_shell_or_the_phone(tmp_path):
    """Printify prints Tough and Magnetic cases on a white shell; a clear case shows the phone through the gaps."""
    for family, size in (('tough', (2340, 3600)), ('clear', (1720, 3600))):
        img = Image.new('RGBA', size, (200, 30, 40, 255))
        img.paste((0, 0, 0, 0), (0, 0, size[0], size[1] // 2))   # top half see-through, black under the alpha
        path = tmp_path / ('%s.png' % family)
        img.save(path)
        tex = np.asarray(case_art.texture(path, family)).astype(int)
        assert tex.shape == (2048, 1024, 3)
        assert np.abs(tex[200, 512] - case_art.BACKDROP[family]).max() <= 1
        assert np.abs(tex[1900, 512] - (200, 30, 40)).max() <= 1
    assert case_art.BACKDROP['tough'] == (255, 255, 255)
    assert case_art.BACKDROP['clear'] == tuple(int(make_case_glb.PHONE_BACK[i:i + 2], 16) for i in (0, 2, 4))


def test_family_size_guard(prints):
    with pytest.raises(ValueError):
        case_art.texture(prints['clear'], 'tough')
    with pytest.raises(ValueError):
        case_art.texture(prints['tough'], 'clear')
