import pytest

import file_models as fm


def rows(n):
    return [{'gid': 'gid://shopify/Product/%d' % i, 'handle': 'h%d' % i, 'alt': 'alt %d' % i, 'family': 'tough',
             'glb': 'm%d.glb' % i, 'still': 'm%d-still.png' % i, 'print': 'p%d.png' % i} for i in range(n)]


def test_candidates_skip_logged_products_and_waiting_models():
    r = rows(4)
    log = {'products': [{'product': r[0]['gid']}]}
    assert [x['gid'] for x in fm.candidates(r, log, {r[1]['gid']})] == [r[2]['gid'], r[3]['gid']]


def test_waiting_takes_only_unlogged_products_with_a_model():
    r = rows(4)
    log = {'products': [{'product': r[0]['gid']}]}
    assert [x['gid'] for x in fm.waiting(r, log, {r[0]['gid'], r[2]['gid']})] == [r[2]['gid']]


def test_stage_input_sends_models_as_files_and_stills_as_images(tmp_path):
    for i in range(2):
        (tmp_path / ('m%d.glb' % i)).write_bytes(b'x' * (10 + i))
        (tmp_path / ('m%d-still.png' % i)).write_bytes(b'y' * (20 + i))
    inp = fm.stage_input(rows(2), tmp_path)
    assert [x['filename'] for x in inp] == ['m0.glb', 'm1.glb', 'm0-still.png', 'm1-still.png']
    assert inp[1] == {'filename': 'm1.glb', 'mimeType': 'model/gltf-binary', 'resource': 'FILE', 'fileSize': '11',
                      'httpMethod': 'POST'}
    assert inp[2]['resource'] == 'IMAGE' and inp[2]['mimeType'] == 'image/png'


def test_create_variables_give_both_files_the_alt_text():
    urls = {'m0.glb': 'U0', 'm0-still.png': 'S0'}
    assert fm.create_vars(rows(1), urls) == {'files': [
        {'originalSource': 'U0', 'contentType': 'FILE', 'alt': 'alt 0'},
        {'originalSource': 'S0', 'contentType': 'IMAGE', 'alt': 'alt 0'}]}


def test_pair_files_by_alt_and_kind_whatever_the_order():
    b = rows(2)
    files = [{'id': 'gid://shopify/MediaImage/7', 'alt': 'alt 1'}, {'id': 'gid://shopify/GenericFile/5', 'alt': 'alt 0'},
             {'id': 'gid://shopify/GenericFile/6', 'alt': 'alt 1'}, {'id': 'gid://shopify/MediaImage/8', 'alt': 'alt 0'}]
    assert fm.pair_files(b, files) == {
        b[0]['gid']: {'glb': 'gid://shopify/GenericFile/5', 'still': 'gid://shopify/MediaImage/8'},
        b[1]['gid']: {'glb': 'gid://shopify/GenericFile/6', 'still': 'gid://shopify/MediaImage/7'}}
    with pytest.raises(ValueError):
        fm.pair_files(b, files[:3])
    with pytest.raises(ValueError):
        fm.pair_files(b, files + [{'id': 'gid://shopify/GenericFile/9', 'alt': 'alt 0'}])


def test_link_variables_stay_within_25_metafields_a_call():
    b = rows(28)
    files = {r['gid']: {'glb': 'G%d' % i, 'still': 'S%d' % i} for i, r in enumerate(b)}
    parts = [fm.link_vars(b, files, k) for k in range(fm.link_parts(b))]
    assert fm.link_parts(b) == 3 and all(len(p['metafields']) <= 25 for p in parts)
    assert sum(len(p['metafields']) for p in parts) == 56
    assert parts[0]['metafields'][:2] == [
        {'ownerId': b[0]['gid'], 'namespace': 'casify', 'key': 'model_glb', 'type': 'file_reference', 'value': 'G0'},
        {'ownerId': b[0]['gid'], 'namespace': 'casify', 'key': 'model_still', 'type': 'file_reference', 'value': 'S0'}]


def test_log_rows_keep_only_confirmed_products_not_logged_yet():
    b = rows(3)
    state = {'files': {r['gid']: {'glb': 'G%d' % i, 'still': 'S%d' % i} for i, r in enumerate(b)}}
    log = {'products': [{'product': b[0]['gid']}]}
    out = fm.log_rows(b, state, [b[0]['gid'], b[1]['gid']], log, 4)
    assert [r['product'] for r in out] == [b[1]['gid']]
    assert out[0]['route'] == 'file' and out[0]['glb_file'] == 'G1' and out[0]['still_file'] == 'S1'
    assert out[0]['batch'] == 'file-4'


def test_attachable_sorts_the_file_route_cases_with_a_waiting_model():
    g = ['gid://shopify/Product/%d' % i for i in range(10)]
    rows = [{'product': x, 'route': 'file'} for x in g[:8]] + [{'product': g[8], 'route': 'file', 'model': 'M8'},
                                                               {'product': g[9], 'model': 'M9'}]
    models = {x: 'M%d' % i for i, x in enumerate(g)}
    ok = {'models': [], 'model_status': 'READY'}
    shop = {g[0]: dict(ok, media=159), g[1]: dict(ok, media=250), g[2]: dict(ok, media=40),
            g[3]: dict(ok, media=103), g[4]: dict(ok, media=0), g[5]: dict(ok, media=103, model_status='PROCESSING'),
            g[6]: dict(ok, media=104, models=['gid://shopify/Model3d/1'])}
    printify = {0: {'locked': False, 'photos': 159}, 1: {'locked': False, 'photos': 250},
                2: {'locked': False, 'photos': 159}, 3: {'locked': True, 'photos': 103},
                4: {'locked': False, 'photos': 0}, 5: {'locked': False, 'photos': 103},
                6: {'locked': False, 'photos': 103}}
    assert fm.attachable(rows, models, shop, printify) == {
        'ready': [g[0]], 'full': [g[1]], 'waiting': [g[2], g[3], g[4]], 'other': [g[5], g[6], g[7]]}


def test_ar_vars_put_each_model_on_its_product_with_the_file_routes_still():
    g = ['gid://shopify/Product/1', 'gid://shopify/Product/2']
    assert fm.ar_vars(g, {g[0]: 'M1', g[1]: 'M2'}, {g[0]: 'S1', g[1]: 'S2'}) == {'files': [
        {'id': 'M1', 'referencesToAdd': [g[0]], 'previewImageSource': 'S1'},
        {'id': 'M2', 'referencesToAdd': [g[1]], 'previewImageSource': 'S2'}]}


def test_mark_attached_notes_the_model_only_on_confirmed_file_rows():
    log = {'products': [{'product': 'P1', 'route': 'file'}, {'product': 'P2', 'route': 'file'},
                        {'product': 'P3', 'model': 'M3'},
                        {'product': 'P4', 'route': 'file', 'model': 'M4', 'model_attached': 'old'}]}
    models = {'P1': 'M1', 'P2': 'M2', 'P3': 'M3', 'P4': 'M4'}
    assert fm.mark_attached(log, models, {'M1', 'M3', 'M4'}, '2026-11-09') == 1
    assert log['products'][0] == {'product': 'P1', 'route': 'file', 'model': 'M1', 'model_attached': '2026-11-09'}
    assert 'model' not in log['products'][1] and log['products'][3]['model_attached'] == 'old'
