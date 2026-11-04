"""Map every active Casify case to its design's print file, its 3D file names and its alt text.

usage: python catalog_3d.py fetch    # storefront products.json -> out/products.json
       python catalog_3d.py build    # -> catalog-3d.json
       python catalog_3d.py check    # counts per case type, every print file exists

Designs are matched by handle prefix through DESIGNS, because several print files are named differently
from their products (Marshmallows is 18-marsh-mallows, Mistletoe is 08-kissing-mistletoe).
"""
import json
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ART = Path('E:/ETSY+PRINTIFY')
COLLECTIONS = {'pantry': 'christmas-pantry-twenty', 'hearthside': 'christmas-hearthside-ten',
               'retro': 'christmas-retro-chic-fifteen', 'wave': 'sakura-wave-scene-two'}
DESIGNS = {
    'merry-bright-fox-': ('hearthside', '01-merry-and-bright-fox'),
    'oh-what-fun-reindeer-': ('hearthside', '02-oh-what-fun-reindeer'),
    'snow-day-penguin-': ('hearthside', '03-snow-day-penguin'),
    'hot-cocoa-season-': ('hearthside', '04-hot-cocoa-season'),
    'santas-nice-list-': ('hearthside', '05-santas-nice-list'),
    'all-is-calm-lantern-': ('hearthside', '06-all-is-calm-lantern'),
    'tis-the-season-wreath-': ('hearthside', '07-tis-the-season-wreath'),
    'home-for-christmas-cottage-': ('hearthside', '08-home-for-christmas-cottage'),
    'beary-christmas-polar-bear-': ('hearthside', '09-beary-christmas'),
    'oh-christmas-tree-retro-ceramic-tree-': ('hearthside', '10-oh-christmas-tree-ceramic'),
    'merry-chic-': ('retro', '01-merry-and-chic'),
    'dashing-': ('retro', '02-dashing'),
    'fleece-navidad-': ('retro', '03-fleece-navidad'),
    'naughty-or-nice-': ('retro', '04-naughty-or-nice'),
    'bah-humbug-': ('retro', '05-bah-humbug'),
    'cool-yule-': ('retro', '06-cool-yule'),
    'stay-frosty-': ('retro', '07-stay-frosty'),
    'ho-ho-ho-': ('retro', '08-ho-ho-ho'),
    'fa-la-la-la-llama-': ('retro', '09-fa-la-la-llama'),
    'jolly-vibes-': ('retro', '10-jolly-vibes'),
    'santas-fave-': ('retro', '11-santas-fave'),
    'joyeux-noel-': ('retro', '12-joyeux-noel'),
    'snow-bunny-': ('retro', '13-snow-bunny'),
    'tis-the-season-christmas-': ('retro', '14-tis-the-season'),
    'merry-foxmas-': ('retro', '15-merry-foxmas'),
    'sakura-blossom-wave-': ('wave', '01-sakura-blossom-wave'),
    'lavender-blossom-wave-': ('wave', '02-lavender-blossom-wave'),
    'let-it-snow-wave-': ('wave', '03-let-it-snow-wave'),
    'merry-christmas-tree-': ('wave', '04-merry-christmas-tree'),
    'nutcracker-walnuts-': ('pantry', '01-nutcracker-walnuts'),
    'sugar-plums-': ('pantry', '02-sugar-plums'),
    'nonnas-panettone-': ('pantry', '03-nonnas-panettone'),
    'anise-pizzelle-': ('pantry', '04-anise-pizzelle'),
    'seven-fishes-': ('pantry', '05-seven-fishes'),
    'dried-oranges-': ('pantry', '06-dried-oranges'),
    'ceylon-cinnamon-': ('pantry', '07-ceylon-cinnamon'),
    'mistletoe-': ('pantry', '08-kissing-mistletoe'),
    'balsam-fir-': ('pantry', '09-balsam-fir'),
    'sugared-gumdrops-': ('pantry', '10-sugared-gumdrops'),
    'crushed-peppermint-': ('pantry', '11-crushed-peppermint'),
    'ribbon-candy-': ('pantry', '12-ribbon-candy'),
    'christmas-pickles-': ('pantry', '13-christmas-pickles'),
    'naughty-coal-': ('pantry', '14-naughty-coal'),
    'elf-fuel-': ('pantry', '15-elf-fuel'),
    'candied-pecans-': ('pantry', '16-candied-pecans'),
    'mulled-cider-': ('pantry', '17-mulled-cider'),
    'marshmallows-': ('pantry', '18-marsh-mallows'),
    'butter-cookies-tin-': ('pantry', '19-butter-cookies-tin'),
    'mini-sprouts-': ('pantry', '20-mini-sprouts'),
}
KINDS = [('-magsafe-compatible-tough-case', 'magsafe'), ('-magnetic-impact-resistant-case', 'magnetic'),
         ('-clear-impact-resistant-case', 'clear'), ('-clear-impact-case', 'clear'), ('-tough-case', 'tough')]


def design_for(handle):
    """(handle prefix, collection, print file stem); the longest matching prefix wins, and the handle must go
    straight on to "phone-case", so a new design that starts like an old one (mistletoe-kiss-...) is a KeyError."""
    for prefix in sorted(DESIGNS, key=len, reverse=True):
        rest = handle[len(prefix):]
        if handle.startswith(prefix) and rest.startswith(('phone-case', 'christmas-phone-case')):
            return (prefix,) + DESIGNS[prefix]
    raise KeyError(handle)


def kind_for(handle):
    return next(kind for suffix, kind in KINDS if handle.endswith(suffix))


def alt_text(title):
    design = title.split(' Christmas Phone Case')[0] if ' Christmas Phone Case' in title else title.split(' Phone Case')[0]
    case = ' '.join(w if w == 'MagSafe' else w.lower() for w in title.rsplit('| ', 1)[1].split())
    return '3D view of the %s %s' % (design, case)


def detach_candidate(images):
    """On a product at Shopify's 250-media cap, the last image no variant uses; None below the cap."""
    if len(images) < 250:
        return None
    for img in reversed(sorted(images, key=lambda i: i.get('position', 0))):
        if not img['variant_ids']:
            return img['src']
    raise ValueError('every image is tied to a variant')


def build(products):
    rows = []
    for p in products:
        prefix, collection, stem = design_for(p['handle'])
        kind = kind_for(p['handle'])
        family = 'clear' if kind == 'clear' else 'tough'
        name = '%s-%s-3d' % (prefix.rstrip('-'), kind)
        rows.append({'id': p['id'], 'gid': 'gid://shopify/Product/%d' % p['id'], 'handle': p['handle'],
                     'title': p['title'], 'alt': alt_text(p['title']), 'kind': kind, 'family': family,
                     'print': str(ART / COLLECTIONS[collection] / 'print' / family / (stem + '.png')),
                     'glb': name + '.glb', 'still': name + '-still.png', 'images': len(p['images']),
                     'first_image': p['images'][0]['src'] if p['images'] else None,
                     'detach_src': detach_candidate(p['images'])})
    return rows


def fetch(out=HERE / 'out' / 'products.json'):
    for attempt in range(6):
        try:
            with urllib.request.urlopen('https://www.casify.shop/products.json?limit=250', timeout=60) as r:
                out.write_bytes(r.read())
                return out
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(60)
    raise RuntimeError('storefront kept answering 429')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'fetch':
        print(fetch())
    else:
        products = json.loads((HERE / 'out' / 'products.json').read_text(encoding='utf-8'))['products']
        rows = build(products)
        if cmd == 'build':
            (HERE / 'catalog-3d.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')
        missing = [r['print'] for r in rows if not Path(r['print']).exists()]
        print(len(rows), 'products', dict(Counter(r['kind'] for r in rows)), 'full:', sum(1 for r in rows if r['detach_src']),
              'missing prints:', missing)
