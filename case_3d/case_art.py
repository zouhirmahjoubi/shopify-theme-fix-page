"""Crop a Printify print file to the part an iPhone 16 Pro case shows, as a 1024x2048 texture for make_case_glb.py.

usage: python case_art.py <print.png> <tough|clear> <out.png>

tough: print/tough/ files (2340x3600, Tough and Magnetic cases). The crop maps the 16PT template's back onto the
       model's flat back and keeps the strip that wraps the side walls (worked out on Butter Cookies Tin, 2026-10-14).
clear: print/clear/ files (1720x3600, Clear cases). Cover fit of template "Clear Impact Resistant/16P-C" (817x1740):
       the case shows the full height and drops about 15 px each side. The texture covers the flat back only.
See-through prints (Patchwork Sticker, 2026-11-06) are laid on what the gaps show on the real case: white for
Tough and Magnetic (Printify prints them on a white shell, checked on its mockups), the phone for Clear (the
model's Black Titanium back glass).
"""
import sys
from pathlib import Path

from PIL import Image

from make_case_glb import PHONE_BACK

TOUGH_CROP = (310, 82, 2025, 3513)
CLEAR_CROP = (15, 0, 1705, 3600)
SIZE = (1024, 2048)

FAMILIES = {'tough': ((2340, 3600), TOUGH_CROP), 'clear': ((1720, 3600), CLEAR_CROP)}
BACKDROP = {'tough': (255, 255, 255), 'clear': tuple(int(PHONE_BACK[i:i + 2], 16) for i in (0, 2, 4))}


def texture(print_png, family):
    if family not in FAMILIES:
        raise ValueError('family must be tough or clear, got %r' % family)
    size, crop = FAMILIES[family]
    img = Image.open(print_png)
    if img.size != size:
        raise ValueError('%s print files are %dx%d, %s is %dx%d' % ((family,) + size + (Path(print_png).name,) + img.size))
    if 'A' in img.getbands() or 'transparency' in img.info:
        img = Image.alpha_composite(Image.new('RGBA', img.size, BACKDROP[family] + (255,)), img.convert('RGBA'))
    return img.convert('RGB').crop(crop).resize(SIZE, Image.LANCZOS)


if __name__ == '__main__':
    texture(sys.argv[1], sys.argv[2]).save(sys.argv[3])
