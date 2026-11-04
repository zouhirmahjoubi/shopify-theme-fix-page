import json
import struct
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

import make_case_glb as mcg

HERE = Path(__file__).resolve().parents[1]


def read_glb(path):
    data = Path(path).read_bytes()
    jlen = struct.unpack_from('<I', data, 12)[0]
    blen = struct.unpack_from('<I', data, 20 + jlen)[0]
    return json.loads(data[20:20 + jlen]), data[28 + jlen:28 + jlen + blen]


def accessor(js, blob, i):
    a = js['accessors'][i]
    v = js['bufferViews'][a['bufferView']]
    comps = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    dtype = {5126: np.float32, 5125: np.uint32}[a['componentType']]
    n = a['count'] * (comps if a['type'] != 'SCALAR' else 1)
    return np.frombuffer(blob, dtype, count=n, offset=v['byteOffset']).reshape(-1, comps)


def primitive(js, material_name):
    names = [m['name'] for m in js['materials']]
    return next(p for p in js['meshes'][0]['primitives'] if names[p['material']] == material_name)


@pytest.fixture(scope='module')
def clear_glb(tmp_path_factory):
    out = tmp_path_factory.mktemp('glb') / 'clear.glb'
    mcg.write_glb(mcg.build_clear(), Image.new('RGB', (1024, 2048), (40, 90, 160)), out, clear=True)
    return read_glb(out)


def test_tough_geometry_unchanged(tmp_path):
    out = tmp_path / 'tough.glb'
    mcg.write_glb(mcg.build(), HERE / 'butter-cookies-tin-art-16pro.png', out, matte=False)
    new_js, new_bin = read_glb(out)
    old_js, old_bin = read_glb(HERE / 'butter-cookies-tin-christmas-tough-case.glb')
    for key in ('accessors', 'meshes', 'materials'):
        assert new_js[key] == old_js[key], key
    cut = old_js['bufferViews'][old_js['images'][0]['bufferView']]['byteOffset']
    assert new_bin[:cut] == old_bin[:cut]


def test_clear_materials(clear_glb):
    js, _ = clear_glb
    mats = {m['name']: m for m in js['materials']}
    shell = mats['Clear shell']
    assert shell['alphaMode'] == 'BLEND'
    assert 0.15 <= shell['pbrMetallicRoughness']['baseColorFactor'][3] <= 0.35
    assert 'baseColorTexture' in mats['Printed back']['pbrMetallicRoughness']
    assert mats['Phone frame']['pbrMetallicRoughness']['metallicFactor'] == 1


def test_clear_bounds(clear_glb):
    js, _ = clear_glb
    pos = [js['accessors'][p['attributes']['POSITION']] for p in js['meshes'][0]['primitives']]
    lo = np.min([a['min'] for a in pos], axis=0) * 1000
    hi = np.max([a['max'] for a in pos], axis=0) * 1000
    span = hi - lo
    # case outline 75.1 x 153.2 mm; the button covers stand 0.9 mm proud on each long side
    assert span[0] == pytest.approx(2 * mcg.HW + 1.8, abs=0.2)
    assert span[1] == pytest.approx(2 * mcg.HH, abs=0.3)
    assert span[2] < 15


def test_clear_print_on_back_only(clear_glb):
    js, blob = clear_glb
    p = primitive(js, 'Printed back')
    z = accessor(js, blob, p['attributes']['POSITION'])[:, 2] * 1000
    assert np.abs(z - mcg.ZB).max() < 0.01
    uv = accessor(js, blob, p['attributes']['TEXCOORD_0'])
    assert uv.min(0) == pytest.approx([0, 0], abs=1e-3)
    assert uv.max(0) == pytest.approx([1, 1], abs=1e-3)
