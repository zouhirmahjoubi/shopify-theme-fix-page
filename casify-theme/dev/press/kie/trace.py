"""Split the press section's two KIE images into flat tiles for tracing.

    python -I trace.py <kie_dir> <tiles_dir>
    node trace.mjs <tiles_dir> <assets_dir>

sheet.png is eight pieces in a 4 x 2 grid, found by the white rows and columns between them.
garland.png is one swag, cropped to its ink. Every pixel snaps to the piece's own theme colours so
each fill is one flat token colour. White joined to the edge of the tile is background and goes
clear; white shut inside a piece (a highlight, a vein) stays as cream. trace.mjs then traces each
tile into <assets_dir>/cv-press-<name>.svg. Same method as dev/swap-hero/kie.
"""
import sys

from PIL import Image, ImageFilter

PALETTE = {
    'C4302B': (196, 48, 43),    # --red-500
    'FDF9F1': (253, 249, 241),  # --cream-50
    '4E7C7B': (78, 124, 123),   # --teal-600
    '33605F': (51, 96, 95),     # --teal-700
    'D2B57C': (210, 181, 124),  # --gold-400
    '33231A': (51, 35, 26),     # --cocoa-700
}
CREAM = 'FDF9F1'
WHITE = (255, 255, 255)
INK_CUTOFF = 238   # min(r, g, b) below this counts as art when looking for the pieces
RIM = 4            # px: light pixels this close to the background are a soft edge, not cream
TILE = 720
GRID = [
    [('bauble-red', ('C4302B', 'D2B57C', CREAM)), ('bauble-teal', ('4E7C7B', 'D2B57C', CREAM)),
     ('holly', ('4E7C7B', 'C4302B', CREAM)), ('pine', ('4E7C7B',))],
    [('bow', ('C4302B', CREAM)), ('star', ('D2B57C',)),
     ('bell', ('D2B57C', '33231A', CREAM)), ('cane', ('C4302B', CREAM))],
]
GARLAND = ('4E7C7B', '33605F', 'C4302B', 'D2B57C', CREAM)
GARLAND_WIDTH = 1600


def dist(p, rgb):
    return (p[0] - rgb[0]) ** 2 * 0.3 + (p[1] - rgb[1]) ** 2 * 0.59 + (p[2] - rgb[2]) ** 2 * 0.11


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


def ink_rows(img):
    w, h = img.size
    px = img.load()
    return [any(min(px[x, y]) < INK_CUTOFF for x in range(0, w, 2)) for y in range(h)]


def ink_cols(img):
    w, h = img.size
    px = img.load()
    return [any(min(px[x, y]) < INK_CUTOFF for y in range(0, h, 2)) for x in range(w)]


def flatten(tile, colours):
    w, h = tile.size
    src = tile.load()
    bg = bytearray(w * h)
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        i = y * w + x
        c = src[x, y]
        if bg[i] or min(c) < 244 or max(c) - min(c) > 8:
            continue
        bg[i] = 1
        if x > 0: stack.append((x - 1, y))
        if x < w - 1: stack.append((x + 1, y))
        if y > 0: stack.append((x, y - 1))
        if y < h - 1: stack.append((x, y + 1))
    mask = Image.frombytes('L', (w, h), bytes(255 if b else 0 for b in bg))
    near = mask.filter(ImageFilter.MaxFilter(RIM * 2 + 1)).tobytes()

    out = Image.new('RGBA', tile.size, (0, 0, 0, 0))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if bg[i]:
                continue
            c = src[x, y]
            best = min(colours, key=lambda k: dist(PALETTE[k], c))
            light = best == CREAM or dist(WHITE, c) < dist(PALETTE[best], c)
            if not light:
                dst[x, y] = PALETTE[best] + (255,)
            elif CREAM in colours and not near[i]:
                dst[x, y] = PALETTE[CREAM] + (255,)
    return out


def piece(img, box, colours, name, out_dir):
    """A square tile around the piece, with a little room, so every piece keeps its proportions."""
    x0, y0, x1, y1 = box
    side = max(x1 - x0, y1 - y0)
    half = side // 2 + int(side * 0.05)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    tile = img.crop((cx - half, cy - half, cx + half, cy + half)).resize((TILE, TILE), Image.LANCZOS)
    flatten(tile, colours).save('%s/%s.png' % (out_dir, name))
    print(name, box)


def main(kie, out_dir):
    img = Image.open(kie + '/sheet.png').convert('RGB')
    rows = spans(ink_rows(img))
    if len(rows) != len(GRID):
        sys.exit('expected %d rows, found %r' % (len(GRID), rows))
    for (y0, y1), line in zip(rows, GRID):
        band = img.crop((0, y0, img.size[0], y1 + 1))
        cols = spans(ink_cols(band))
        if len(cols) != len(line):
            sys.exit('expected %d pieces in the row at %d, found %r' % (len(line), y0, cols))
        for (x0, x1), (name, colours) in zip(cols, line):
            sub = spans(ink_rows(img.crop((x0, y0, x1 + 1, y1 + 1))), min_gap=40)
            piece(img, (x0, y0 + sub[0][0], x1, y0 + sub[-1][1]), colours, name, out_dir)

    swag = Image.open(kie + '/garland.png').convert('RGB')
    px = swag.load()
    w, h = swag.size
    xs = [x for x in range(w) if any(min(px[x, y]) < 170 for y in range(0, h, 2))]
    ys = [y for y in range(h) if any(min(px[x, y]) < 170 for x in range(0, w, 2))]
    swag = swag.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    scale = GARLAND_WIDTH / swag.size[0]
    swag = swag.resize((GARLAND_WIDTH, round(swag.size[1] * scale)), Image.LANCZOS)
    flatten(swag, GARLAND).save(out_dir + '/garland.png')
    print('garland', swag.size, 'height over width %.4f' % (swag.size[1] / swag.size[0]))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
