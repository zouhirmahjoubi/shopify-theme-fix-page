import json

import stage_upload

TARGET = {'url': 'https://shopify-staged-uploads.storage.googleapis.com/',
          'resourceUrl': 'https://shopify-staged-uploads.storage.googleapis.com/tmp/1/model.glb',
          'parameters': [{'name': 'Content-Type', 'value': 'model/gltf-binary'},
                         {'name': 'key', 'value': 'tmp/1/model.glb'},
                         {'name': 'policy', 'value': 'abc=='}]}


def test_form_args_put_the_file_last():
    args = stage_upload.form_args(TARGET, 'out/model.glb')
    assert args == ['-F', 'Content-Type=model/gltf-binary', '-F', 'key=tmp/1/model.glb', '-F', 'policy=abc==',
                    '-F', 'file=@out/model.glb']


def test_curl_discards_the_body_where_the_os_can():
    import os
    cmd = stage_upload.curl_cmd(TARGET, 'out/model.glb')
    assert cmd[cmd.index('-o') + 1] == os.devnull
    assert cmd[-1] == TARGET['url']


def test_curl_skips_the_100_continue_handshake():
    cmd = stage_upload.curl_cmd(TARGET, 'out/model.glb')
    assert cmd[cmd.index('-H') + 1] == 'Expect:'


def test_targets_reads_the_mutation_response(tmp_path):
    resp = tmp_path / 'resp.json'
    resp.write_text(json.dumps({'data': {'stagedUploadsCreate': {'stagedTargets': [TARGET], 'userErrors': []}}}))
    assert stage_upload.targets(resp) == [TARGET]
