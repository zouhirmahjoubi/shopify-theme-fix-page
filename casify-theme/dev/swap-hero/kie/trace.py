"""Split the KIE ornament sheet into three flat ornament tiles for tracing.

    python -I trace.py <sheet.png> <out_dir>
    node trace.mjs <out_dir> <assets_dir>

Finds the three ornaments by the white columns between them, snaps every pixel to
the Casify palette (theme tokens) so each fill is one flat colour, keys the white
background out, and writes <out_dir>/tile-1..3.png (left to right). trace.mjs then
traces each tile with imagetracerjs into <assets_dir>/cv-swap-ornament-1..3.svg.
(vtracer's Python 3.14 build crashed on every call, so the tracing is in Node.)
"""
import sys

from PIL import Image

PALETTE = {
    'C4302B': (196, 48, 43),    # --red-500
    'A8231F': (168, 35, 31),    # --red-600
    'FDF9F1': (253, 249, 241),  # --cream-50
    '4E7C7B': (78, 124, 123),   # --teal-600
    '6C9E9C': (108, 158, 156),  # --teal-500
    'D2B57C': (210, 181, 124),  # --gold-400
    'B08F52': (176, 143, 82),   # --gold-500
    '33231A': (51, 35, 26),     # --cocoa-700
}
WHITE_CUTOFF = 238  # min(r, g, b) at or above this is background
WHITE = (255, 255, 255)
# Each ornament keeps only its own colours (left to right), so soft edges cannot turn
# into specks of another ornament's colour.
OWN = [('C4302B', 'FDF9F1', '33231A'), ('4E7C7B',), ('D2B57C', 'B08F52')]


def dist(p, rgb):
    return (p[0] - rgb[0]) ** 2 * 0.3 + (p[1] - rgb[1]) ** 2 * 0.59 + (p[2] - rgb[2]) ** 2 * 0.11


def nearest(rgb, colours):
    """The closest of the ornament's colours, or None when white is closer (a soft edge)."""
    best = min(colours, key=lambda c: dist(PALETTE[c], rgb))
    return None if dist(WHITE, rgb) < dist(PALETTE[best], rgb) else PALETTE[best]


def columns_with_ink(img):
    w, h = img.size
    px = img.load()
    ink = []
    for x in range(w):
        ink.append(any(min(px[x, y]) < WHITE_CUTOFF for y in range(0, h, 2)))
    return ink


def spans(flags, min_gap=12, min_len=20):
    out, start, gap = [], None, 0
    for i, f in enumerate(flags):
        if f:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                end = i - gap
                if end - start >= min_len:
                    out.append((start, end))
                start, gap = None, 0
    if start is not None:
        out.append((start, len(flags) - 1))
    return out


def crop_box(img, x0, x1):
    px = img.load()
    h = img.size[1]
    ys = [y for y in range(h) if any(min(px[x, y]) < WHITE_CUTOFF for x in range(x0, x1 + 1, 2))]
    y0, y1 = min(ys), max(ys)
    side = max(x1 - x0, y1 - y0)
    pad = int(side * 0.06)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    half = side // 2 + pad
    return (cx - half, cy - half, cx + half, cy + half)


def flatten(tile, colours):
    """Background = near-white pixels connected to the tile's edge (flood fill), so cream
    inside an ornament (the peppermint's swirl) stays cream instead of being keyed out."""
    tile = tile.convert('RGB')
    w, h = tile.size
    src = tile.load()
    bg = bytearray(w * h)
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        i = y * w + x
        c = src[x, y]
        if bg[i] or min(c) < 244 or max(c) - min(c) > 6:  # neutral white only: cream (253,249,241) has a warm cast
            continue
        bg[i] = 1
        if x > 0: stack.append((x - 1, y))
        if x < w - 1: stack.append((x + 1, y))
        if y > 0: stack.append((x, y - 1))
        if y < h - 1: stack.append((x, y + 1))
    out = Image.new('RGBA', tile.size, (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if not bg[y * w + x]:
                c = nearest(src[x, y], colours)
                if c:
                    dst[x, y] = c + (255,)
    return out


def main(sheet, out_dir):
    img = Image.open(sheet).convert('RGB')
    found = spans(columns_with_ink(img))
    if len(found) != 3:
        sys.exit('expected 3 ornaments, found %d column spans: %r' % (len(found), found))
    for i, (x0, x1) in enumerate(found, 1):
        tile = flatten(img.crop(crop_box(img, x0, x1)), OWN[i - 1])
        tile = tile.resize((480, 480), Image.NEAREST)
        path = '%s/tile-%d.png' % (out_dir, i)
        tile.save(path)
        print(path, tile.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
