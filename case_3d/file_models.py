"""Give cases past the store's 3D cap a 3D view from plain files (the free route, chosen 2026-11-06).

The Basic plan allows 250 videos and 3D models per store. Past that, a case's GLB goes into Files as a
GenericFile and its still as an image, and two product metafields point at them: casify.model_glb and
casify.model_still (file_reference). sections/cv-product-counter.liquid opens them in the same viewer, without
"View in your space". Neither file is product media, so photos, cards and the per-product media cap stay as they
are, and a product can get its files before Printify has sent its photos.

usage: python file_models.py stage  <n>                 # variables for stagedUploadsCreate (models FILE, stills IMAGE)
       python file_models.py upload <n> <result file>   # POST every file to its target, keep the resourceUrls
       python file_models.py create <n>                 # variables for fileCreate (ask for files { id alt })
       python file_models.py files  <n> <result file>   # fileCreate's reply: file ids paired to products by alt and kind
       python file_models.py link   <n> <k>             # variables for metafieldsSet, part k (0, 1, ...)
       python file_models.py log    <n> <product gid>...# log the products whose metafieldsSet confirmed
       python file_models.py plan-waiting               # add batches for the products whose Model3d waits
       python file_models.py ar-check                   # which file-route cases can take their Model3d now
       python file_models.py ar-attach [k]              # variables for fileUpdate on the first k of them (all)
       python file_models.py ar-log <Model3d gid>...    # mark the rows whose fileUpdate confirmed

Batches of 28 are planned once in out/file-batches.json from the catalog rows that have no 3D view and no Model3d
waiting for them in rollout_batch.py's batch states; plan-waiting appends the waiting ones (batches 8-10 on
2026-11-08). Batch state is out/file-batch-<n>.json.

77 file-route cases also have a Model3d that was created for them but never attached. Once Printify has sent
all their photos, ar-check lists them in out/ar-ready.json and ar-attach puts the model on as their last
media, which adds "View in your space". Their files stay linked, so the page falls back to them if the model
is ever removed. A case at the 250-media cap keeps the file route (see attachable).
"""
import json
import sys
from datetime import date
from pathlib import Path

import rollout_batch as rb
import stage_upload

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
PER_LINK = 12   # products per metafieldsSet call: two metafields each, Shopify takes 25 a call
MEDIA_CAP = 250  # media per product


def candidates(rows, log, modelled):
    """Catalog rows with no 3D view yet and no Model3d created for them."""
    done = {p['product'] for p in log['products']}
    return [r for r in rows if r['gid'] not in done and r['gid'] not in modelled]


def waiting(rows, log, modelled):
    """Catalog rows whose Model3d was created but never attached: it waits for Printify's photos.
    They take the free route too (Zouhir, 2026-11-06); attaching the Model3d later adds "View in your
    space", and the section prefers Model3d media over the metafields."""
    done = {p['product'] for p in log['products']}
    return [r for r in rows if r['gid'] not in done and r['gid'] in modelled]


def plan_waiting():
    """Append batches for the waiting products to out/file-batches.json; returns their numbers and sizes."""
    rows = json.loads((HERE / 'catalog-3d.json').read_text(encoding='utf-8'))
    log = json.loads((HERE / 'rollout-log.json').read_text(encoding='utf-8'))
    plan = rb.load('file-batches.json') or []
    planned = {g for b in plan for g in b}
    new = [[r['gid'] for r in b] for b in rb.batches([r for r in waiting(rows, log, modelled()) if r['gid'] not in planned])]
    rb.save('file-batches.json', plan + new)
    return list(range(len(plan) + 1, len(plan) + len(new) + 1)), [len(b) for b in new]


def stage_input(batch, out_dir):
    def item(name, mime, resource):
        return {'filename': name, 'mimeType': mime, 'resource': resource,
                'fileSize': str((Path(out_dir) / name).stat().st_size), 'httpMethod': 'POST'}
    return ([item(r['glb'], 'model/gltf-binary', 'FILE') for r in batch] +
            [item(r['still'], 'image/png', 'IMAGE') for r in batch])


def create_vars(batch, urls):
    files = []
    for r in batch:
        files.append({'originalSource': urls[r['glb']], 'contentType': 'FILE', 'alt': r['alt']})
        files.append({'originalSource': urls[r['still']], 'contentType': 'IMAGE', 'alt': r['alt']})
    return {'files': files}


def pair_files(batch, files):
    """fileCreate's {id, alt} list -> {product gid: {'glb': GenericFile gid, 'still': MediaImage gid}}."""
    kinds = {'GenericFile': 'glb', 'MediaImage': 'still'}
    by = {}
    for f in files:
        key = (f['alt'], kinds.get(f['id'].split('/')[-2]))
        if key in by:
            raise ValueError('two %s files share the alt %r' % (key[1], key[0]))
        by[key] = f['id']
    out, missing = {}, []
    for r in batch:
        glb, still = by.get((r['alt'], 'glb')), by.get((r['alt'], 'still'))
        if not glb or not still:
            missing.append(r['alt'])
        out[r['gid']] = {'glb': glb, 'still': still}
    if missing or len(files) != 2 * len(batch):
        raise ValueError('%d files for %d products; incomplete for %s' % (len(files), len(batch), missing))
    return out


def link_parts(batch):
    return (len(batch) + PER_LINK - 1) // PER_LINK


def link_vars(batch, files, k):
    mf = []
    for r in batch[k * PER_LINK:(k + 1) * PER_LINK]:
        for key, kind in (('model_glb', 'glb'), ('model_still', 'still')):
            mf.append({'ownerId': r['gid'], 'namespace': 'casify', 'key': key, 'type': 'file_reference',
                       'value': files[r['gid']][kind]})
    return {'metafields': mf}


def log_rows(batch, state, confirmed, log, n):
    done = {p['product'] for p in log['products']}
    return [{'date': date.today().isoformat(), 'route': 'file', 'batch': 'file-%d' % n, 'product': r['gid'],
             'handle': r['handle'], 'family': r['family'], 'print': r['print'],
             'glb_file': state['files'][r['gid']]['glb'], 'still_file': state['files'][r['gid']]['still'],
             'preview': r['still']}
            for r in batch if r['gid'] in set(confirmed) and r['gid'] not in done and r['gid'] in state['files']]


def batch_models():
    """{product gid: Model3d gid} for every Model3d created in a rollout_batch.py batch."""
    plan = rb.load('batches.json') or []
    out = {}
    for k in range(1, len(plan) + 1):
        out.update(rb.load('batch-%d.json' % k, {'models': {}})['models'])
    return out


def modelled():
    """Products with a Model3d created for them in any rollout_batch.py batch."""
    return set(batch_models())


def attachable(rows, models, shop, printify):
    """Sort the file-route cases that have a Model3d waiting for them.

    rows: rollout-log rows; models: batch_models(); shop: {product gid: {'media': count, 'models': [attached
    Model3d ids], 'model_status': status of its waiting Model3d}}; printify: printify_ready.state().
    ready: Printify has unlocked the product and Shopify shows every photo it selected, the model is READY and
    the product is below the 250-media cap. full: at the cap. A full product would have to give up a photo for
    the model, and Printify's next publish of it then fails (18 Oct-12 Tough cases at 249 photos + model did on
    2026-11-08), so it keeps the file route. waiting: Printify is still sending photos. other: no state, a model
    already attached, or a model that is not READY.
    """
    out = {'ready': [], 'full': [], 'waiting': [], 'other': []}
    for r in rows:
        g = r['product']
        if r.get('route') != 'file' or r.get('model') or g not in models:
            continue
        s, st = shop.get(g), printify.get(int(g.rsplit('/', 1)[1]))
        if not s or s['models'] or s['model_status'] != 'READY':
            out['other'].append(g)
        elif not st or st['locked'] or not s['media'] or s['media'] < min(st['photos'], MEDIA_CAP):
            out['waiting'].append(g)
        elif s['media'] >= MEDIA_CAP:
            out['full'].append(g)
        else:
            out['ready'].append(g)
    return out


def ar_vars(ready, models, stills):
    """fileUpdate variables: each product's Model3d goes on as its last media (the photos stay first), with the
    still the file route already keeps in Files as its preview."""
    return {'files': [{'id': models[g], 'referencesToAdd': [g], 'previewImageSource': stills[g]} for g in ready]}


def mark_attached(log, models, confirmed, day):
    """Note the model on the file-route rows whose fileUpdate confirmed it; returns how many rows changed."""
    n = 0
    for r in log['products']:
        m = models.get(r['product'])
        if r.get('route') == 'file' and not r.get('model') and m in confirmed:
            r['model'], r['model_attached'] = m, day
            n += 1
    return n


def shop_state(gids, models):
    """Read only, through the Casify scripts app: media count and attached models per product, the status of
    its waiting Model3d, and the URL of the still the file route keeps in Files."""
    sys.path.insert(0, r'E:\ETSY+PRINTIFY')
    import shopify_compare_at as sca
    sca.TOKEN = sca.get_token()[0]
    pq = '''query($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { id mediaCount { count }
      models: media(first: 5, query: "media_type:MODEL_3D") { nodes { id } }
      still: metafield(namespace: "casify", key: "model_still") { reference { ... on MediaImage { image { url } } } } } } }'''
    mq = 'query($ids: [ID!]!) { nodes(ids: $ids) { ... on Model3d { id status } } }'
    out = {}
    for i in range(0, len(gids), 25):
        part = gids[i:i + 25]
        status = {n['id']: n['status'] for n in sca.gql(mq, {'ids': [models[g] for g in part]})['nodes'] if n}
        for n in sca.gql(pq, {'ids': part})['nodes']:
            if n:
                ref = (n.get('still') or {}).get('reference') or {}
                out[n['id']] = {'media': n['mediaCount']['count'], 'models': [m['id'] for m in n['models']['nodes']],
                                'model_status': status.get(models[n['id']]), 'still': (ref.get('image') or {}).get('url')}
    return out


def ar_check():
    import printify_ready as pr
    from datetime import datetime, timezone
    log = json.loads((HERE / 'rollout-log.json').read_text(encoding='utf-8'))
    models = batch_models()
    gids = [r['product'] for r in log['products'] if r.get('route') == 'file' and not r.get('model') and r['product'] in models]
    shop = shop_state(gids, models)
    split = attachable(log['products'], models, shop, pr.state(pr.fetch_pages()))
    split['stills'] = {g: shop[g]['still'] for g in split['ready']}
    split['checked'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    rb.save('ar-ready.json', split)
    return split


def batch_rows(n):
    rows = {r['gid']: r for r in json.loads((HERE / 'catalog-3d.json').read_text(encoding='utf-8'))}
    plan = rb.load('file-batches.json')
    if plan is None:
        log = json.loads((HERE / 'rollout-log.json').read_text(encoding='utf-8'))
        plan = [[r['gid'] for r in b] for b in rb.batches(candidates(list(rows.values()), log, modelled()))]
        rb.save('file-batches.json', plan)
    return [rows[g] for g in plan[n - 1]]


if __name__ == '__main__':
    if sys.argv[1] == 'plan-waiting':
        print('file batches %s planned with %s products' % plan_waiting())
        sys.exit()
    if sys.argv[1] == 'ar-check':
        split = ar_check()
        print(split['checked'], ', '.join('%d %s' % (len(split[k]), k) for k in ('ready', 'full', 'waiting', 'other')))
        missing = [g for g in split['ready'] if not split['stills'][g]]
        sys.exit('no still URL for %s' % missing if missing else 0)
    if sys.argv[1] == 'ar-attach':
        split = rb.load('ar-ready.json')
        ready = split['ready'][:int(sys.argv[2])] if len(sys.argv) > 2 else split['ready']
        print(json.dumps(ar_vars(ready, batch_models(), split['stills'])))
        sys.exit()
    if sys.argv[1] == 'ar-log':
        log_path = HERE / 'rollout-log.json'
        log = json.loads(log_path.read_text(encoding='utf-8'))
        n = mark_attached(log, batch_models(), set(sys.argv[2:]), date.today().isoformat())
        log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
        print('%d rows now carry their model' % n)
        sys.exit()
    cmd, n = sys.argv[1], int(sys.argv[2])
    batch, state_name = batch_rows(n), 'file-batch-%d.json' % n
    state = rb.load(state_name, {'urls': {}, 'files': {}})
    log_path = HERE / 'rollout-log.json'
    log = json.loads(log_path.read_text(encoding='utf-8'))
    if cmd != 'log' and rb.already_logged(batch, log):
        sys.exit('file batch %d holds %d products already in rollout-log.json' % (n, len(rb.already_logged(batch, log))))
    if cmd == 'stage':
        print(json.dumps({'input': stage_input(batch, OUT)}))
    elif cmd == 'upload':
        names = [r['glb'] for r in batch] + [r['still'] for r in batch]
        targets = rb.read_targets(sys.argv[3])
        if len(targets) != len(names):
            sys.exit('%d targets for %d files' % (len(targets), len(names)))
        for t, f in zip(targets, names):
            code = stage_upload.upload(t, OUT / f)
            if code not in ('201', '204'):
                sys.exit('%s answered %s' % (f, code))
            state['urls'][f] = t['resourceUrl']
        rb.save(state_name, state)
        print('%d files uploaded' % len(names))
    elif cmd == 'create':
        print(json.dumps(create_vars(batch, state['urls'])))
    elif cmd == 'files':
        state['files'] = pair_files(batch, rb.read_result(sys.argv[3])['data']['fileCreate']['files'])
        rb.save(state_name, state)
        print('%d products paired to their two files' % len(state['files']))
    elif cmd == 'link':
        print(json.dumps(link_vars(batch, state['files'], int(sys.argv[3]))))
    elif cmd == 'log':
        rows = log_rows(batch, state, sys.argv[3:], log, n)
        log['products'] += rows
        log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
        print('%d products logged, %d of the batch still to link' % (len(rows), len(batch) - len(rb.already_logged(batch, log))))
