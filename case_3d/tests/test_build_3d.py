from PIL import Image

import build_3d


def row(tmp_path, name, family, size):
    art = tmp_path / (name + '.png')
    Image.new('RGB', size, (200, 210, 220)).save(art)
    return {'gid': 'gid://shopify/Product/%s' % name, 'print': str(art), 'family': family, 'glb': name + '.glb'}


def test_pending_skips_products_already_logged(tmp_path):
    rows = [row(tmp_path, '1', 'tough', (2340, 3600)), row(tmp_path, '2', 'clear', (1720, 3600))]
    log = {'products': [{'product': 'gid://shopify/Product/1'}]}
    assert [r['gid'] for r in build_3d.pending(rows, log)] == ['gid://shopify/Product/2']


def test_build_models_writes_each_glb_once(tmp_path):
    rows = [row(tmp_path, 't', 'tough', (2340, 3600)), row(tmp_path, 'c', 'clear', (1720, 3600))]
    out = tmp_path / 'out'
    built = build_3d.build_models(rows, out)
    assert [p.name for p in built] == ['t.glb', 'c.glb']
    stamp = (out / 't.glb').stat().st_mtime_ns
    assert build_3d.build_models(rows, out) == []
    assert (out / 't.glb').stat().st_mtime_ns == stamp
