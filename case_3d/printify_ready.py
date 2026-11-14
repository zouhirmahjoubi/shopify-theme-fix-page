"""Which products still waiting for a 3D model has Printify finished sending to Shopify.

usage: python printify_ready.py              # fetch + rebuild catalog-3d.json, Printify lock state -> out/ready.json
       python printify_ready.py --wait <n>   # the same every 10 minutes until <n> are ready or none is syncing

Printify creates a product on Shopify first and sends its photos over the next hours. A model attached before
that would sit in front of the photos (cards would show the 3D still) and take one of the 250 media slots
Printify still needs. A product is ready once Printify has unlocked it and the storefront lists every photo
Printify selected for publishing (Shopify keeps at most 250). A product Printify does not know and whose vendor
is not Printify gets no more photos, so it is ready too. Each check rebuilds catalog-3d.json, so the spare photo
of a product that has just reached 250 is known before rollout_batch.py detaches it.
"""
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import catalog_3d

HERE = Path(__file__).resolve().parent
SHOP = 17684357
TOKEN = Path.home() / '.claude' / 'secrets' / 'printify_token.txt'
MEDIA_CAP = 250


def state(pages):
    """Printify product list pages -> {Shopify product id: {'locked', 'photos'}}."""
    out = {}
    for page in pages:
        for p in page['data']:
            ext = (p.get('external') or {}).get('id')
            if ext:
                out[int(ext)] = {'locked': bool(p['is_locked']),
                                 'photos': sum(1 for i in p['images'] if i.get('is_selected_for_publishing'))}
    return out


def classify(rows, products, log, printify):
    """Pending catalog rows split into ready / syncing / short (unlocked with photos missing) / unknown."""
    done = {p['product'] for p in log['products']}
    by_id = {p['id']: p for p in products}
    out = {'ready': [], 'syncing': [], 'short': [], 'unknown': []}
    for r in rows:
        if r['gid'] in done:
            continue
        p, st = by_id.get(r['id']), printify.get(r['id'])
        if p is None:
            out['unknown'].append(r['gid'])
        elif st is None:
            out['unknown' if p.get('vendor') == 'Printify' else 'ready'].append(r['gid'])
        elif st['locked']:
            out['syncing'].append(r['gid'])
        elif len(p['images']) >= min(st['photos'], MEDIA_CAP):
            out['ready'].append(r['gid'])
        else:
            out['short'].append(r['gid'])
    return out


def call(path, token):
    req = urllib.request.Request('https://api.printify.com/v1' + path,
                                 headers={'Authorization': 'Bearer ' + token, 'User-Agent': 'casify-3d'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(60)
    raise RuntimeError('Printify kept answering 429')


def fetch_pages():
    token = TOKEN.read_text(encoding='utf-8-sig').strip()
    pages = [call('/shops/%d/products.json?limit=50&page=1' % SHOP, token)]
    for n in range(2, pages[0]['last_page'] + 1):
        pages.append(call('/shops/%d/products.json?limit=50&page=%d' % (SHOP, n), token))
    return pages


def check():
    products = json.loads(catalog_3d.fetch().read_text(encoding='utf-8'))['products']
    skipped = []
    rows = catalog_3d.build(products, skipped)
    catalog_3d.save(rows)
    log = json.loads((HERE / 'rollout-log.json').read_text(encoding='utf-8'))
    split = classify(rows, products, log, state(fetch_pages()))
    split['checked'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    split['new_designs'] = skipped
    (HERE / 'out' / 'ready.json').write_text(json.dumps(split, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(split['checked'], ', '.join('%d %s' % (len(split[k]), k) for k in ('ready', 'syncing', 'short', 'unknown')),
          '| %d products of designs not in catalog_3d.DESIGNS yet' % len(skipped), flush=True)
    return split


if __name__ == '__main__':
    want = int(sys.argv[2]) if sys.argv[1:2] == ['--wait'] else 0
    split, still = check(), 0
    while want and len(split['ready']) < want and split['syncing'] and still < 6:   # 6 checks, no change: stop
        time.sleep(600)
        syncing = len(split['syncing'])
        split = check()
        still = still + 1 if len(split['syncing']) == syncing else 0
