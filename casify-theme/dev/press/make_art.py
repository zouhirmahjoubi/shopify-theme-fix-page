"""Dev only: draws the press section's art, so no image service is needed.

    python -I make_art.py <theme_dir>

Writes assets/cv-press-speckle.webp (a tile whose clear flecks wear the big type down, like a
worn letterpress block) and snippets/cv-press-splat.liquid (three seeded ink splats as inline SVG:
one blob plus droplets, separate so cv-press.js can throw the droplets outward).
"""
import math
import random
import sys

from PIL import Image, ImageDraw


def speckle(path, size=640, seed=7):
    random.seed(seed)
    scale = 3
    big = size * scale
    img = Image.new('L', (big, big), 255)
    draw = ImageDraw.Draw(img)
    for _ in range(int(size * 3.4)):
        x, y = random.uniform(0, big), random.uniform(0, big)
        r = random.choice([1, 1, 1.4, 1.4, 2, 2, 2.6, 3.4, 4.6]) * scale * random.uniform(.6, 1.1)
        points = []
        for k in range(9):
            a = k / 9 * math.tau
            d = r * random.uniform(.45, 1.25)
            points.append((x + math.cos(a) * d, y + math.sin(a) * d * random.uniform(.6, 1)))
        for dx in (-big, 0, big):  # wraps, so the tile has no seams
            for dy in (-big, 0, big):
                draw.polygon([(px + dx, py + dy) for px, py in points], fill=0)
    alpha = img.resize((size, size), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    out.putalpha(alpha)
    out.save(path, 'WEBP', lossless=False, quality=60, alpha_quality=40, method=6)


def blob_path(cx, cy, radius, spikes, rng):
    """A rough disc with thin ink arms, drawn as a smooth closed curve."""
    n = 96
    arms = sorted(rng.sample(range(n), spikes))
    radii = []
    for i in range(n):
        wobble = 1 + .09 * math.sin(i * .37 + rng.random()) + .05 * math.sin(i * 1.3)
        r = radius * wobble * rng.uniform(.95, 1.04)
        for arm in arms:
            d = min(abs(i - arm), n - abs(i - arm))
            if d <= 2:
                r += radius * rng.uniform(.22, .62) * (1 - d / 3) ** 2
        radii.append(r)
    pts = [(cx + math.cos(i / n * math.tau) * radii[i], cy + math.sin(i / n * math.tau) * radii[i]) for i in range(n)]
    mids = [((pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2) for i in range(n)]
    d = 'M%.1f %.1f' % mids[-1]
    for i in range(n):
        d += 'Q%.1f %.1f %.1f %.1f' % (pts[i][0], pts[i][1], mids[i][0], mids[i][1])
    return d + 'Z'


def splat(seed):
    rng = random.Random(seed)
    cx, cy = 200, 200
    body = blob_path(cx, cy, 134, rng.randint(13, 17), rng)
    drops = []
    for _ in range(rng.randint(16, 22)):
        a = rng.uniform(0, math.tau)
        d = rng.uniform(165, 205)
        drops.append((cx + math.cos(a) * d, cy + math.sin(a) * d, rng.choice([1.6, 2.2, 2.2, 3, 3, 4, 5.4, 7])))
    circles = ''.join('<circle cx="%.1f" cy="%.1f" r="%.1f"/>' % c for c in drops)
    return ('<svg class="cvpr__ink" viewBox="0 0 400 400" aria-hidden="true" focusable="false">'
            '<path data-cvpr-blob d="%s"/><g data-cvpr-drops>%s</g></svg>') % (body, circles)


def main(theme):
    speckle(theme + '/assets/cv-press-speckle.webp')
    head = ('{%- comment -%} Ink splats for sections/cv-press.liquid, drawn by dev/press/make_art.py. '
            'Param: n (1 to 3). {%- endcomment -%}\n')
    body = '{%- case n -%}\n'
    for n, seed in ((1, 21), (2, 34), (3, 58)):
        body += '  {%%- when %d -%%}%s\n' % (n, splat(seed))
    body += '{%- endcase -%}\n'
    open(theme + '/snippets/cv-press-splat.liquid', 'w', encoding='utf-8', newline='\n').write(head + body)
    print('ok')


if __name__ == '__main__':
    main(sys.argv[1])
