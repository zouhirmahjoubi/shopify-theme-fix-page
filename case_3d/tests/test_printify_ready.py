import printify_ready as pr


def page(*products):
    return {'data': list(products)}


def pf(ext, locked, selected, extra=0):
    images = [{'is_selected_for_publishing': True}] * selected + [{'is_selected_for_publishing': False}] * extra
    return {'external': {'id': str(ext)} if ext else None, 'is_locked': locked, 'images': images}


def test_state_counts_only_photos_selected_for_publishing():
    st = pr.state([page(pf(1, True, 159, extra=88)), page(pf(2, False, 270), pf(None, False, 5))])
    assert st == {1: {'locked': True, 'photos': 159}, 2: {'locked': False, 'photos': 270}}


def test_classify():
    def row(i):
        return {'id': i, 'gid': 'gid://shopify/Product/%d' % i}

    def shop(i, photos, vendor='Printify'):
        return {'id': i, 'vendor': vendor, 'images': [{}] * photos}

    rows = [row(i) for i in range(1, 8)]
    products = [shop(1, 159), shop(2, 0), shop(3, 250), shop(4, 55), shop(5, 103, 'Casify'), shop(6, 9), shop(7, 159)]
    printify = {1: {'locked': False, 'photos': 159}, 2: {'locked': True, 'photos': 159},
                3: {'locked': False, 'photos': 270}, 4: {'locked': False, 'photos': 159},
                7: {'locked': False, 'photos': 159}}
    log = {'products': [{'product': 'gid://shopify/Product/7'}]}
    out = pr.classify(rows, products, log, printify)
    g = lambda *ids: ['gid://shopify/Product/%d' % i for i in ids]
    assert out == {'ready': g(1, 3, 5), 'syncing': g(2), 'short': g(4), 'unknown': g(6)}
