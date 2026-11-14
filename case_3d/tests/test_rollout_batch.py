import json
import pytest

import rollout_batch as rb


def rows(n):
    return [{'gid': 'gid://shopify/Product/%d' % i, 'handle': 'h%d' % i, 'alt': 'alt %d' % i,
             'glb': 'm%d.glb' % i, 'still': 'm%d-still.png' % i, 'family': 'tough', 'print': 'p%d.png' % i} for i in range(n)]


def test_batches_split_in_order():
    b = rb.batches(rows(61), size=28)
    assert [len(x) for x in b] == [28, 28, 5]
    assert b[2][0]['handle'] == 'h56'


def test_stage_input_lists_models_then_stills(tmp_path):
    for i in range(2):
        (tmp_path / ('m%d.glb' % i)).write_bytes(b'x' * (10 + i))
        (tmp_path / ('m%d-still.png' % i)).write_bytes(b'y' * (20 + i))
    inp = rb.stage_input(rows(2), tmp_path)
    assert [x['filename'] for x in inp] == ['m0.glb', 'm1.glb', 'm0-still.png', 'm1-still.png']
    assert inp[1] == {'filename': 'm1.glb', 'mimeType': 'model/gltf-binary', 'resource': 'MODEL_3D', 'fileSize': '11', 'httpMethod': 'POST'}
    assert inp[3]['resource'] == 'IMAGE' and inp[3]['mimeType'] == 'image/png' and inp[3]['fileSize'] == '21'


def test_create_and_attach_variables():
    b = rows(2)
    urls = {'m0.glb': 'U0', 'm1.glb': 'U1', 'm0-still.png': 'S0', 'm1-still.png': 'S1'}
    assert rb.create_vars(b, urls) == {'files': [
        {'originalSource': 'U0', 'contentType': 'MODEL_3D', 'alt': 'alt 0'},
        {'originalSource': 'U1', 'contentType': 'MODEL_3D', 'alt': 'alt 1'}]}
    models = {'gid://shopify/Product/0': 'gid://shopify/Model3d/9', 'gid://shopify/Product/1': 'gid://shopify/Model3d/8'}
    assert rb.attach_vars(b, models, urls)['files'][1] == {
        'id': 'gid://shopify/Model3d/8', 'referencesToAdd': ['gid://shopify/Product/1'], 'previewImageSource': 'S1'}


def test_detach_variables_only_for_full_products():
    b = rows(3)
    dmap = {'gid://shopify/Product/2': {'media': 'gid://shopify/MediaImage/5', 'src': 'x.jpg'}}
    assert rb.detach_vars(b, dmap) == {'files': [
        {'id': 'gid://shopify/MediaImage/5', 'referencesToRemove': ['gid://shopify/Product/2']}]}


def test_already_logged_lists_products_done_before():
    log = {'products': [{'product': 'gid://shopify/Product/1'}]}
    assert rb.already_logged(rows(3), log) == ['gid://shopify/Product/1']


def test_pair_models_by_alt_whatever_the_order():
    b = rows(3)
    files = [{'id': 'M2', 'alt': 'alt 2'}, {'id': 'M0', 'alt': 'alt 0'}, {'id': 'M1', 'alt': 'alt 1'}]
    assert rb.pair_models(b, files) == {'gid://shopify/Product/%d' % i: 'M%d' % i for i in range(3)}
    with pytest.raises(ValueError):
        rb.pair_models(b, files[:2])
    with pytest.raises(ValueError):
        rb.pair_models(b, files + [{'id': 'M9', 'alt': 'alt 0'}])


def test_detach_vars_refuses_a_full_product_missing_from_the_map():
    b = rows(2)
    b[1]['detach_src'] = 'https://cdn.shopify.com/s/files/1/0793/files/abc_2048.jpg?v=1'
    with pytest.raises(ValueError):
        rb.detach_vars(b, {})


def test_detach_map_matches_the_spare_photo_by_file_name():
    b = rows(2)
    b[0].update(id=7, detach_src='https://cdn.shopify.com/s/files/1/0793/files/abc_2048.jpg?v=1')
    media = {'data': {'p7': {'media': {'nodes': [
        {'id': 'MI1', 'image': {'url': 'https://cdn.shopify.com/s/files/1/0793/files/zzz_2048.jpg?v=2'}},
        {'id': 'MI2', 'image': {'url': 'https://cdn.shopify.com/s/files/1/0793/files/abc_2048.jpg?v=3'}}]}}}}
    assert rb.detach_map(b, media) == {b[0]['gid']: {'media': 'MI2', 'src': 'https://cdn.shopify.com/s/files/1/0793/files/abc_2048.jpg'}}
    assert 'p7: product(id: "gid://shopify/Product/0")' in rb.detach_query(b)
    b[0]['detach_src'] = 'https://cdn.shopify.com/s/files/1/0793/files/gone.jpg'
    with pytest.raises(ValueError):
        rb.detach_map(b, media)


def test_log_rows_keep_only_confirmed_new_products():
    b = rows(3)
    state = {'models': {'gid://shopify/Product/%d' % i: 'M%d' % i for i in range(3)}}
    log = {'products': [{'product': 'gid://shopify/Product/0'}]}
    out = rb.log_rows(b, state, ['M0', 'M1'], {}, log, 2)
    assert [r['product'] for r in out] == ['gid://shopify/Product/1']
    assert out[0]['model'] == 'M1' and out[0]['batch'] == 2


def test_ready_rows_gather_finished_products_with_a_model_from_every_batch():
    catalog = {r['gid']: r for r in rows(5)}
    g = lambda i: 'gid://shopify/Product/%d' % i
    plan = [[g(0), g(1)], [g(2), g(3), g(4)]]
    states = {1: {'urls': {'m0.glb': 'U0'}, 'models': {g(0): 'M0', g(1): 'M1'}},
              2: {'urls': {'m2.glb': 'U2'}, 'models': {g(2): 'M2'}}}
    log = {'products': [{'product': g(0)}]}
    batch, state = rb.ready_rows(catalog, plan, states, [g(3), g(1), g(2), g(0)], log)
    assert [(r['gid'], r['batch']) for r in batch] == [(g(1), 1), (g(2), 2)]   # 3 has no model yet, 0 is logged
    assert state == {'urls': {'m0.glb': 'U0', 'm2.glb': 'U2'}, 'models': {g(0): 'M0', g(1): 'M1', g(2): 'M2'}}
    assert 'batch' not in catalog[g(1)]
    out = rb.log_rows(batch, state, ['M1', 'M2'], {}, log, None)
    assert [(r['product'], r['batch']) for r in out] == [(g(1), 1), (g(2), 2)]


def test_targets_from_a_persisted_tool_result(tmp_path):
    payload = {'data': {'stagedUploadsCreate': {'stagedTargets': [{'resourceUrl': 'R', 'url': 'U', 'parameters': []}], 'userErrors': []}}}
    wrapped = tmp_path / 'wrapped.txt'
    wrapped.write_text(json.dumps([{'type': 'text', 'text': json.dumps(payload)}]))
    plain = tmp_path / 'plain.json'
    plain.write_text(json.dumps(payload))
    assert rb.read_targets(wrapped) == rb.read_targets(plain) == payload['data']['stagedUploadsCreate']['stagedTargets']
