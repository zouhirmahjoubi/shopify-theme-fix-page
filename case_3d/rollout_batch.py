"""Upload the 3D models in batches through the store connector without retyping long upload links.

usage: python rollout_batch.py stage  <n>                  # variables for stagedUploadsCreate (models, then stills)
       python rollout_batch.py upload <n> <result file>    # POST every file to its target, keep the resourceUrls
       python rollout_batch.py create <n>                  # variables for fileCreate (ask for files { id alt })
       python rollout_batch.py models <n> <result file>    # fileCreate's reply: model ids paired to products by alt
       python rollout_batch.py detach-query <n>            # query for the full products' last media
       python rollout_batch.py detach-map <n> <result file># that query's reply -> out/detach-map.json
       python rollout_batch.py detach <n>                  # variables for fileUpdate referencesToRemove (full products)
       python rollout_batch.py attach <n>                  # variables for fileUpdate referencesToAdd + previewImageSource
       python rollout_batch.py log    <n> <Model3d gid>... # log the products whose attach fileUpdate confirmed

Batches (28 products each) are fixed in out/batches.json the first time; batch state is out/batch-<n>.json.
Every store step refuses a batch holding a product already in rollout-log.json, so an old plan is never re-run:
delete out/batches.json to plan the products still pending.

New Printify products get their photos hours after they appear, so their models are uploaded and created per batch
but attached only once printify_ready.py lists them: give `ready` instead of <n> to detach-query, detach-map,
detach, attach and log, and they run on every product in out/ready.json that has a model and is not logged yet.
"""
import json
import sys
from datetime import date
from pathlib import Path

import build_3d
import stage_upload

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'


def batches(rows, size=28):
    return [rows[i:i + size] for i in range(0, len(rows), size)]


def stage_input(batch, out_dir):
    def item(name, mime, resource):
        return {'filename': name, 'mimeType': mime, 'resource': resource,
                'fileSize': str((Path(out_dir) / name).stat().st_size), 'httpMethod': 'POST'}
    return ([item(r['glb'], 'model/gltf-binary', 'MODEL_3D') for r in batch] +
            [item(r['still'], 'image/png', 'IMAGE') for r in batch])


def read_result(path):
    """A connector reply saved to a file, plain or as a tool result [{"type": "text", "text": "<json>"}]."""
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    if isinstance(data, list):
        data = json.loads(next(part['text'] for part in data if part.get('type') == 'text'))
    return data


def read_targets(path):
    return read_result(path)['data']['stagedUploadsCreate']['stagedTargets']


def create_vars(batch, urls):
    return {'files': [{'originalSource': urls[r['glb']], 'contentType': 'MODEL_3D', 'alt': r['alt']} for r in batch]}


def already_logged(batch, log):
    done = {p['product'] for p in log['products']}
    return [r['gid'] for r in batch if r['gid'] in done]


def pair_models(batch, files):
    """fileCreate's {id, alt} list -> {product gid: Model3d gid}, matched by alt, never by position."""
    by_alt = {}
    for f in files:
        if f['alt'] in by_alt:
            raise ValueError('two models share the alt %r' % f['alt'])
        by_alt[f['alt']] = f['id']
    missing = [r['alt'] for r in batch if r['alt'] not in by_alt]
    if missing or len(files) != len(batch):
        raise ValueError('%d models for %d products; no model for %s' % (len(files), len(batch), missing))
    return {r['gid']: by_alt[r['alt']] for r in batch}


def detach_query(batch):
    """The last 3 media of every full product in the batch (the spare photo is the last), for its MediaImage id."""
    return '{ ' + ' '.join('p%d: product(id: "%s") { media(first: 3, reverse: true) { nodes { id ... on MediaImage '
                           '{ image { url } } } } }' % (r['id'], r['gid']) for r in batch if r.get('detach_src')) + ' }'


def detach_map(batch, media):
    file_name = lambda url: url.split('?')[0].rsplit('/', 1)[1]
    out = {}
    for r in batch:
        if not r.get('detach_src'):
            continue
        nodes = media['data']['p%d' % r['id']]['media']['nodes']
        hit = [n['id'] for n in nodes if n.get('image') and file_name(n['image']['url']) == file_name(r['detach_src'])]
        if len(hit) != 1:
            raise ValueError('%s: spare photo %s not among its last %d media' % (r['handle'], file_name(r['detach_src']), len(nodes)))
        out[r['gid']] = {'media': hit[0], 'src': r['detach_src'].split('?')[0]}
    return out


def detach_vars(batch, dmap):
    missing = [r['handle'] for r in batch if r.get('detach_src') and r['gid'] not in dmap]
    if missing:
        raise ValueError('full products without a spare photo in detach-map.json: %s' % missing)
    return {'files': [{'id': dmap[r['gid']]['media'], 'referencesToRemove': [r['gid']]} for r in batch if r['gid'] in dmap]}


def ready_rows(rows, plan, states, ready, log):
    """Products out/ready.json says Printify has finished, that have a model and are not logged yet, from every
    batch, with the batch states merged so detach, attach and log can run on them together."""
    done = {p['product'] for p in log['products']}
    where = {g: n for n, b in enumerate(plan, 1) for g in b}
    state = {'urls': {}, 'models': {}}
    for s in states.values():
        state['urls'].update(s['urls'])
        state['models'].update(s['models'])
    batch = [dict(rows[g], batch=where[g]) for g in ready if g in where and g not in done and g in state['models']]
    return batch, state


def log_rows(batch, state, attached, dmap, log, n):
    """Rows for rollout-log.json: only products whose model fileUpdate confirmed and that are not logged yet."""
    done = {p['product'] for p in log['products']}
    return [{'date': date.today().isoformat(), 'batch': r.get('batch', n), 'product': r['gid'], 'handle': r['handle'],
             'family': r['family'], 'print': r['print'], 'model': state['models'][r['gid']],
             'detached': dmap.get(r['gid'], {}).get('media'), 'preview': r['still']}
            for r in batch if state['models'].get(r['gid']) in attached and r['gid'] not in done]


def attach_vars(batch, models, urls):
    return {'files': [{'id': models[r['gid']], 'referencesToAdd': [r['gid']], 'previewImageSource': urls[r['still']]}
                      for r in batch]}


def load(name, default=None):
    p = OUT / name
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else default


def save(name, data):
    (OUT / name).write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')


def batch_rows(n):
    rows = {r['gid']: r for r in json.loads((HERE / 'catalog-3d.json').read_text(encoding='utf-8'))}
    plan = load('batches.json')
    if plan is None:
        log = json.loads((HERE / 'rollout-log.json').read_text(encoding='utf-8'))
        plan = [[r['gid'] for r in b] for b in batches(build_3d.pending(list(rows.values()), log))]
        save('batches.json', plan)
    return [rows[g] for g in plan[n - 1]]


if __name__ == '__main__':
    cmd, target = sys.argv[1], sys.argv[2]
    log_path = HERE / 'rollout-log.json'
    log = json.loads(log_path.read_text(encoding='utf-8'))
    if target == 'ready':
        if cmd not in ('detach-query', 'detach-map', 'detach', 'attach', 'log'):
            sys.exit('%s runs per batch; the ready set only detaches, attaches and logs' % cmd)
        plan = load('batches.json')
        states = {k: load('batch-%d.json' % k, {'urls': {}, 'models': {}}) for k in range(1, len(plan) + 1)}
        catalog = {r['gid']: r for r in json.loads((HERE / 'catalog-3d.json').read_text(encoding='utf-8'))}
        n = None
        batch, state = ready_rows(catalog, plan, states, load('ready.json')['ready'], log)
    else:
        n = int(target)
        batch, state_name = batch_rows(n), 'batch-%d.json' % n
        state = load(state_name, {'urls': {}, 'models': {}})
    if cmd != 'log' and already_logged(batch, log):
        sys.exit('batch %d holds %d products already in rollout-log.json; delete out/batches.json to plan again'
                 % (n, len(already_logged(batch, log))))
    if cmd == 'stage':
        print(json.dumps({'input': stage_input(batch, OUT)}))
    elif cmd == 'upload':
        files = [r['glb'] for r in batch] + [r['still'] for r in batch]
        targets = read_targets(sys.argv[3])
        if len(targets) != len(files):
            sys.exit('%d targets for %d files' % (len(targets), len(files)))
        for t, f in zip(targets, files):
            code = stage_upload.upload(t, OUT / f)
            if code not in ('201', '204'):
                sys.exit('%s answered %s' % (f, code))
            state['urls'][f] = t['resourceUrl']
        save(state_name, state)
        print('%d files uploaded' % len(files))
    elif cmd == 'create':
        print(json.dumps(create_vars(batch, state['urls'])))
    elif cmd == 'models':
        state['models'] = pair_models(batch, read_result(sys.argv[3])['data']['fileCreate']['files'])
        save(state_name, state)
        print('%d model ids paired by alt' % len(state['models']))
    elif cmd == 'detach-query':
        print(detach_query(batch))
    elif cmd == 'detach-map':
        dmap = load('detach-map.json', {})
        dmap.update(detach_map(batch, read_result(sys.argv[3])))
        save('detach-map.json', dmap)
        print('%d spare photos mapped' % len(dmap))
    elif cmd == 'detach':
        print(json.dumps(detach_vars(batch, load('detach-map.json', {}))))
    elif cmd == 'attach':
        print(json.dumps(attach_vars(batch, state['models'], state['urls'])))
    elif cmd == 'log':
        rows = log_rows(batch, state, set(sys.argv[3:]), load('detach-map.json', {}), log, n)
        log['products'] += rows
        log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
        print('%d products logged, %d of the batch still to attach' % (len(rows), len(batch) - len(already_logged(batch, log))))
