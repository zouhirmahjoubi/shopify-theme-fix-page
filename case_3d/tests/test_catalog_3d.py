import json
from collections import Counter
from pathlib import Path

import pytest

import catalog_3d as cat

HERE = Path(__file__).resolve().parents[1]
PRODUCTS = HERE / 'out' / 'products.json'


@pytest.mark.parametrize('handle, expected', [
    ('tis-the-season-wreath-christmas-phone-case-for-iphone-samsung-pixel-tough-case', ('hearthside', '07-tis-the-season-wreath')),
    ('tis-the-season-christmas-phone-case-highland-cow-in-santa-hat-on-teal-wavy-stripes-tough-case', ('retro', '14-tis-the-season')),
    ('merry-christmas-tree-phone-case-for-iphone-samsung-pixel-tough-case', ('wave', '04-merry-christmas-tree')),
    ('merry-chic-christmas-phone-case-schnauzer-in-sunglasses-polka-dot-headscarf-tough-case', ('retro', '01-merry-and-chic')),
    ('naughty-coal-christmas-phone-case-for-iphone-samsung-pixel-tough-case', ('pantry', '14-naughty-coal')),
    ('naughty-or-nice-christmas-phone-case-tabby-cat-in-heart-sunglasses-on-red-polka-dots-tough-case', ('retro', '04-naughty-or-nice')),
    ('mistletoe-christmas-phone-case-for-iphone-samsung-pixel-tough-case', ('pantry', '08-kissing-mistletoe')),
    ('marshmallows-christmas-phone-case-for-iphone-samsung-clear-impact-resistant-case', ('pantry', '18-marsh-mallows')),
    ('beary-christmas-polar-bear-phone-case-for-iphone-samsung-pixel-tough-case', ('hearthside', '09-beary-christmas')),
    ('oh-christmas-tree-retro-ceramic-tree-phone-case-for-iphone-samsung-clear-impact-resistant-case', ('hearthside', '10-oh-christmas-tree-ceramic')),
    ('fa-la-la-la-llama-christmas-phone-case-llama-in-pink-sunglasses-on-pink-polka-dots-clear-impact-case', ('retro', '09-fa-la-la-llama')),
])
def test_design_for(handle, expected):
    assert cat.design_for(handle)[1:] == expected


def test_design_for_unknown_handle():
    with pytest.raises(KeyError):
        cat.design_for('pumpkin-spice-phone-case-tough-case')


@pytest.mark.parametrize('handle', [
    'merry-christmas-tree-farm-phone-case-for-iphone-samsung-pixel-tough-case',
    'mistletoe-kiss-christmas-phone-case-for-iphone-samsung-pixel-tough-case',
    'snow-bunny-hop-christmas-phone-case-bunny-in-heart-sunglasses-tough-case',
])
def test_design_for_rejects_a_new_design_that_shares_a_prefix(handle):
    with pytest.raises(KeyError):
        cat.design_for(handle)


@pytest.mark.parametrize('handle, kind', [
    ('x-magsafe-compatible-tough-case', 'magsafe'),
    ('x-for-iphone-samsung-magnetic-impact-resistant-case', 'magnetic'),
    ('x-for-iphone-samsung-clear-impact-resistant-case', 'clear'),
    ('x-on-pink-polka-dots-clear-impact-case', 'clear'),
    ('x-for-iphone-samsung-pixel-tough-case', 'tough'),
])
def test_kind_for(handle, kind):
    assert cat.kind_for(handle) == kind


def test_alt_text():
    assert cat.alt_text('Fleece Navidad Phone Case | Sheep in Pink Puffer, Sunglasses & Blowing Bubblegum | MagSafe Compatible Tough Case') \
        == '3D view of the Fleece Navidad MagSafe compatible tough case'
    assert cat.alt_text('’Tis the Season Wreath Christmas Phone Case for iPhone & Samsung | Clear Impact-Resistant Case') \
        == '3D view of the ’Tis the Season Wreath clear impact-resistant case'
    assert cat.alt_text('Merry Christmas Tree Phone Case for iPhone, Samsung & Pixel | Tough Case') \
        == '3D view of the Merry Christmas Tree tough case'


def test_detach_candidate():
    imgs = [{'src': 'a%d.jpg' % i, 'variant_ids': [i] if i % 3 == 0 else []} for i in range(250)]
    imgs[-1]['variant_ids'] = [7]
    assert cat.detach_candidate(imgs) == 'a248.jpg'
    assert cat.detach_candidate(imgs[:120]) is None
    with pytest.raises(ValueError):
        cat.detach_candidate([{'src': 'b%d.jpg' % i, 'variant_ids': [i]} for i in range(250)])


@pytest.mark.skipif(not PRODUCTS.exists(), reason='run "python catalog_3d.py fetch" first')
def test_real_catalog():
    rows = cat.build(json.loads(PRODUCTS.read_text(encoding='utf-8'))['products'])
    assert len(rows) == 143
    kinds = Counter(r['kind'] for r in rows)
    assert kinds['tough'] == 49 and kinds['magnetic'] + kinds['magsafe'] == 49 and kinds['clear'] == 45
    assert len({r['glb'] for r in rows}) == 143
    assert all(Path(r['print']).exists() for r in rows)
    assert sum(1 for r in rows if r['detach_src']) == 32
