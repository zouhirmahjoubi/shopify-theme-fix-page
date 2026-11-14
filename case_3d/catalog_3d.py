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
               'retro': 'christmas-retro-chic-fifteen', 'wave': 'sakura-wave-scene-two',
               # published through E:/ETSY+PRINTIFY/printify_batch.py on 2026-11-06
               'keepsake': 'christmas-keepsake-ten', 'stitched': 'christmas-stitched-lettering-ten',
               'arabesque': 'christmas-arabesque-ten', 'bunny': 'christmas-patchwork-bunny-ten',
               'pencil': 'christmas-pencil-crew-ten', 'collage': 'christmas-patchwork-collage-ten',
               'emb-pantry': 'embroidered-pantry-three',
               # published 2026-11-06 17:43 UTC on (their 3D views are plain files: file_models.py)
               'pantry10': 'christmas-pantry-ten', 'polka': 'christmas-polka-pals-ten',
               'quotes': 'christmas-quotes-remake-ten', 'quilled': 'blossom-wave-scene-five',
               # "Cabinet Keepsakes", published 2026-11-08 18:13-18:20 UTC (file route, the 250 cap is full)
               'curio': 'curio-collage-four'}
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
    'kissing-mistletoe-': ('pantry', '08-kissing-mistletoe'),
    # 2026-11-06: prefixes matched to each collection's printify-products.json by product title
    'nutcracker-guard-vintage-': ('keepsake', '01-nutcracker-guard'),
    'holly-jolly-bow-vintage-': ('keepsake', '02-holly-jolly-bow'),
    'baking-spirits-bright-vintage-': ('keepsake', '03-baking-spirits-bright'),
    'fresh-cut-trees-vintage-': ('keepsake', '04-fresh-cut-trees'),
    'meowy-christmas-vintage-': ('keepsake', '05-meowy-christmas'),
    'cardinal-pine-vintage-': ('keepsake', '06-cardinal-and-pine'),
    'jingle-all-the-way-vintage-': ('keepsake', '07-jingle-all-the-way'),
    'gnome-for-the-holidays-vintage-': ('keepsake', '08-gnome-for-the-holidays'),
    'o-holy-night-vintage-': ('keepsake', '09-o-holy-night'),
    'vintage-glass-ornaments-': ('keepsake', '10-vintage-glass-ornaments'),
    'ho-ho-ho-embroidered-': ('stitched', '01-ho-ho-ho'),
    'fa-la-la-embroidered-': ('stitched', '02-fa-la-la'),
    'deck-the-halls-embroidered-': ('stitched', '03-deck-the-halls'),
    'dear-santa-embroidered-': ('stitched', '04-dear-santa'),
    'naughty-or-nice-embroidered-': ('stitched', '05-naughty-or-nice'),
    'snow-much-fun-embroidered-': ('stitched', '06-snow-much-fun'),
    'hello-winter-embroidered-': ('stitched', '07-hello-winter'),
    'noel-embroidered-': ('stitched', '08-noel'),
    'christmas-cheer-embroidered-': ('stitched', '09-christmas-cheer'),
    'north-pole-embroidered-': ('stitched', '10-north-pole'),
    'peace-on-earth-moroccan-tile-': ('arabesque', '01-peace-on-earth'),
    'glad-tidings-moroccan-tile-': ('arabesque', '02-glad-tidings'),
    'silent-night-moroccan-tile-': ('arabesque', '03-silent-night'),
    'star-of-wonder-moroccan-tile-': ('arabesque', '04-star-of-wonder'),
    'good-cheer-moroccan-tile-': ('arabesque', '05-good-cheer'),
    'jingle-bells-moroccan-tile-': ('arabesque', '06-jingle-bells'),
    'hallelujah-moroccan-tile-': ('arabesque', '07-hallelujah'),
    'happy-holidays-moroccan-tile-': ('arabesque', '08-happy-holidays'),
    'gift-of-love-moroccan-tile-': ('arabesque', '09-gift-of-love'),
    'frosty-magic-moroccan-tile-': ('arabesque', '10-frosty-magic'),
    'warm-wishes-patchwork-bunny-': ('bunny', '01-warm-wishes'),
    'joy-to-the-world-patchwork-bunny-': ('bunny', '02-joy-to-the-world'),
    'let-it-snow-patchwork-bunny-': ('bunny', '03-let-it-snow'),
    'cookies-for-santa-patchwork-bunny-': ('bunny', '04-cookies-for-santa'),
    'be-merry-patchwork-bunny-': ('bunny', '05-be-merry'),
    'stay-cozy-patchwork-bunny-': ('bunny', '06-stay-cozy'),
    'peace-love-joy-patchwork-bunny-': ('bunny', '07-peace-love-joy'),
    'oh-deer-patchwork-bunny-': ('bunny', '08-oh-deer'),
    'merry-christmas-patchwork-bunny-': ('bunny', '09-merry-christmas'),
    'believe-patchwork-bunny-': ('bunny', '10-believe'),
    'pencil-me-in-cute-pencil-': ('pencil', '01-pencil-me-in'),
    'write-me-merry-cute-pencil-': ('pencil', '02-write-me-merry'),
    'sketch-some-joy-cute-pencil-': ('pencil', '03-sketch-some-joy'),
    'draw-me-merry-cute-pencil-': ('pencil', '04-draw-me-merry'),
    'color-me-jolly-cute-pencil-': ('pencil', '05-color-me-jolly'),
    'sharp-dressed-elf-cute-pencil-': ('pencil', '06-sharp-dressed-elf'),
    'doodle-joy-cute-pencil-': ('pencil', '07-doodle-joy'),
    'stay-sharp-cute-pencil-': ('pencil', '08-stay-sharp'),
    'hand-drawn-holidays-cute-pencil-': ('pencil', '09-hand-drawn-holidays'),
    'pencil-party-cute-pencil-': ('pencil', '10-pencil-party'),
    'o-holy-night-patchwork-sticker-': ('collage', '01-o-holy-night'),
    'joy-to-the-world-patchwork-sticker-': ('collage', '02-joy-to-the-world'),
    'jesus-is-the-reason-patchwork-sticker-': ('collage', '03-jesus-is-the-reason'),
    'silent-night-patchwork-sticker-': ('collage', '04-silent-night'),
    'o-come-let-us-adore-him-patchwork-sticker-': ('collage', '05-adore-him'),
    'merry-christmas-patchwork-sticker-': ('collage', '06-merry-christmas'),
    'ho-ho-ho-patchwork-sticker-': ('collage', '07-ho-ho-ho'),
    'let-it-snow-patchwork-sticker-': ('collage', '08-let-it-snow'),
    'merry-bright-patchwork-sticker-': ('collage', '09-merry-and-bright'),
    'tis-the-season-patchwork-sticker-': ('collage', '10-tis-the-season'),
    'dried-oranges-embroidered-pantry-': ('emb-pantry', '01-dried-oranges'),
    'sugar-plums-embroidered-pantry-': ('emb-pantry', '02-sugar-plums'),
    'mistletoe-embroidered-pantry-': ('emb-pantry', '03-kissing-mistletoe'),
    # 2026-11-06 (evening): matched by title to printify-products.json / printify-batch.json (quotes)
    'sugar-cookies-retro-pantry-': ('pantry10', '01-sugar-cookies'),
    'gingerbread-retro-pantry-': ('pantry10', '02-gingerbread'),
    'candy-canes-retro-pantry-': ('pantry10', '03-candy-canes'),
    'hot-cocoa-retro-pantry-': ('pantry10', '04-hot-cocoa'),
    'fresh-snow-retro-pantry-': ('pantry10', '05-fresh-snow'),
    'magic-reindeer-oats-retro-pantry-': ('pantry10', '06-magic-oats'),
    'roasted-chestnuts-retro-pantry-': ('pantry10', '07-roasted-chestnuts'),
    'santas-milk-retro-pantry-': ('pantry10', '08-santas-milk'),
    'holiday-sprinkles-retro-pantry-': ('pantry10', '09-holiday-sprinkles'),
    'merry-berries-retro-pantry-': ('pantry10', '10-merry-berries'),
    'holly-jolly-cute-character-': ('polka', '01-holly-jolly'),
    'oh-deer-cute-character-': ('polka', '02-oh-deer'),
    'let-it-snow-cute-character-': ('polka', '03-let-it-snow'),
    'merry-bright-cute-character-': ('polka', '04-merry-and-bright'),
    'oh-snap-cute-character-': ('polka', '05-oh-snap'),
    'chill-vibes-cute-character-': ('polka', '06-chill-vibes'),
    'beary-merry-cute-character-': ('polka', '07-beary-merry'),
    'meowy-christmas-cute-character-': ('polka', '08-meowy-christmas'),
    'merry-woofmas-cute-character-': ('polka', '09-merry-woofmas'),
    'stay-cozy-cute-character-': ('polka', '10-stay-cozy'),
    'sweet-little-christmas-quote-': ('quotes', '01-sweet-little-christmas'),
    'merry-bright-days-quote-': ('quotes', '02-merry-and-bright-days'),
    'christmas-is-a-feeling-quote-': ('quotes', '03-christmas-is-a-feeling'),
    'home-for-christmas-quote-': ('quotes', '04-home-for-christmas'),
    'wrapped-in-christmas-joy-quote-': ('quotes', '05-wrapped-in-christmas-joy'),
    'the-magic-of-christmas-quote-': ('quotes', '06-magic-of-christmas'),
    'sweet-christmas-wishes-quote-': ('quotes', '07-sweet-christmas-kisses'),
    'peace-love-christmas-quote-': ('quotes', '08-peace-love-and-christmas'),
    'merry-moments-cozy-memories-quote-': ('quotes', '09-merry-moments-cozy-memories'),
    'a-little-christmas-joy-quote-': ('quotes', '10-a-little-christmas-joy'),
    'winter-wonderland-wave-quilled-paper-': ('quilled', '08-winter-wonderland-wave'),
    'merry-bright-wreath-quilled-paper-': ('quilled', '09-merry-and-bright-wreath'),
    # 2026-11-09: matched by title to curio-collage-four/printify-products.json (design id = print file number)
    'woodland-curio-vintage-collage-': ('curio', '01-woodland-curio'),
    'book-of-hours-medieval-collage-': ('curio', '02-book-of-hours'),
    'fireside-sampler-cross-stitch-': ('curio', '03-fireside-sampler'),
    'night-garden-vintage-collage-': ('curio', '04-night-garden'),
    'golden-hour-fox-vintage-collage-': ('curio', '05-golden-hour-fox'),
    'honey-meadow-vintage-collage-': ('curio', '06-honey-meadow'),
    'tide-cabinet-vintage-collage-': ('curio', '07-tide-cabinet'),
    'hearth-wood-vintage-collage-': ('curio', '08-hearth-wood'),
    'millefleur-unicorn-medieval-collage-': ('curio', '09-millefleur-unicorn'),
    'avalon-medieval-collage-': ('curio', '10-avalon'),
    'stargazer-hours-medieval-collage-': ('curio', '11-stargazer-hours'),
    'verona-roses-medieval-collage-': ('curio', '12-verona-roses'),
    'yuletide-hours-medieval-collage-': ('curio', '13-yuletide-hours'),
    'peppermint-sampler-cross-stitch-': ('curio', '14-peppermint-sampler'),
    'nordic-night-sampler-cross-stitch-': ('curio', '15-nordic-night-sampler'),
    'garden-club-sampler-cross-stitch-': ('curio', '16-garden-club-sampler'),
    'home-sweet-home-sampler-cross-stitch-': ('curio', '17-home-sweet-home-sampler'),
    'sweetheart-sampler-cross-stitch-': ('curio', '18-sweetheart-sampler'),
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
    if design.startswith('The '):   # "The Magic of Christmas": no "the The"
        design = design[4:]
    return '3D view of the %s %s' % (design, case)


def detach_candidate(images):
    """On a product at Shopify's 250-media cap, the last image no variant uses; None below the cap."""
    if len(images) < 250:
        return None
    for img in reversed(sorted(images, key=lambda i: i.get('position', 0))):
        if not img['variant_ids']:
            return img['src']
    raise ValueError('every image is tied to a variant')


def build(products, skipped=None):
    """Catalog rows; a design missing from DESIGNS is a KeyError, unless a `skipped` list is given to collect its
    handle (printify_ready.py, so a collection still being published cannot stop the models that already exist)."""
    rows = []
    for p in products:
        try:
            prefix, collection, stem = design_for(p['handle'])
        except KeyError:
            if skipped is None:
                raise
            skipped.append(p['handle'])
            continue
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


def get_page(page):
    url = 'https://www.casify.shop/products.json?limit=250&page=%d' % page
    for attempt in range(6):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return json.loads(r.read())['products']
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(60)
    raise RuntimeError('storefront kept answering 429')


def fetch(out=HERE / 'out' / 'products.json'):
    """Every storefront product, 250 a page (the store passed 250 products on 2026-11-06)."""
    products, page = [], 1
    while True:
        batch = get_page(page)
        products += batch
        if len(batch) < 250:
            break
        page += 1
    out.write_text(json.dumps({'products': products}, ensure_ascii=False), encoding='utf-8')
    return out


def save(rows, out=HERE / 'catalog-3d.json'):
    out.write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'fetch':
        print(fetch())
    else:
        products = json.loads((HERE / 'out' / 'products.json').read_text(encoding='utf-8'))['products']
        rows = build(products)
        if cmd == 'build':
            save(rows)
        missing = [r['print'] for r in rows if not Path(r['print']).exists()]
        print(len(rows), 'products', dict(Counter(r['kind'] for r in rows)), 'full:', sum(1 for r in rows if r['detach_src']),
              'missing prints:', missing)
