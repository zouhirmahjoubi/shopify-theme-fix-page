"""Crop a Printify print file to the part an iPhone 16 Pro case shows, as a 1024x2048 texture for make_case_glb.py.

usage: python case_art.py <print.png> <tough|clear> <out.png>

tough: print/tough/ files (2340x3600, Tough and Magnetic cases). The crop maps the 16PT template's back onto the
       model's flat back and keeps the strip that wraps the side walls (worked out on Butter Cookies Tin, 2026-10-14).
clear: print/clear/ files (1720x3600, Clear cases). Cover fit of template "Clear Impact Resistant/16P-C" (817x1740):
       the case shows the full height and drops about 15 px each side. The texture covers the flat back only.
"""
import sys
from pathlib import Path

from PIL import Image

TOUGH_CROP = (310, 82, 2025, 3513)
CLEAR_CROP = (15, 0, 1705, 3600)
SIZE = (1024, 2048)

FAMILIES = {'tough': ((2340, 3600), TOUGH_CROP), 'clear': ((1720, 3600), CLEAR_CROP)}


def texture(print_png, family):
    if family not in FAMILIES:
        raise ValueError('family must be tough or clear, got %r' % family)
    size, crop = FAMILIES[family]
    img = Image.open(print_png)
    if img.size != size:
        raise ValueError('%s print files are %dx%d, %s is %dx%d' % ((family,) + size + (Path(print_png).name,) + img.size))
    return img.convert('RGB').crop(crop).resize(SIZE, Image.LANCZOS)


if __name__ == '__main__':
    texture(sys.argv[1], sys.argv[2]).save(sys.argv[3])
