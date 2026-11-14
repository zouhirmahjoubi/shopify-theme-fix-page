"""Build templates/product.json for "all four shop clips on every product page".

Takes the CURRENT live template and adds only this task's change, as text
edits, so everything else in the live file stays byte for byte:

  * the four shop_clip blocks in section "main" (added if missing, patched if
    they are there in their older "own page only" form)
  * their ids at the end of main's block_order
  * two settings in the "video-reviews" block: shop_heading_all, shop_lede

usage: python build_template_all.py <live product.json> <out product.json>
"""
import json
import re
import sys

CLIPS = [
    {
        "id": "shop-clip-snow-day-penguin",
        "file": "cv-clip-snow-day-penguin",
        "alt": "Snow Day Penguin case on an iPhone 18 Pro Max, held in a hand",
        "design": "Snow Day",
        "handle": "snow-day-penguin-christmas-phone-case-for-iphone-samsung-magnetic-impact-resistant-case",
    },
    {
        "id": "shop-clip-beary-christmas",
        "file": "cv-clip-beary-christmas",
        "alt": "Beary Christmas polar bear case on an iPhone 18 Pro Max, held in a hand",
        "design": "Beary Christmas",
        "handle": "beary-christmas-polar-bear-phone-case-for-iphone-samsung-magnetic-impact-resistant-case",
    },
    {
        "id": "shop-clip-kissing-mistletoe",
        "file": "cv-clip-kissing-mistletoe",
        "alt": "Kissing Mistletoe case on an iPhone 18 Pro Max, held in a hand",
        "design": "Mistletoe",
        "handle": "mistletoe-christmas-phone-case-for-iphone-samsung-magnetic-impact-resistant-case",
    },
    {
        "id": "shop-clip-bah-humbug",
        "file": "cv-clip-bah-humbug",
        "alt": "Bah Humbug grumpy cat case on an iPhone 18 Pro Max, held in a hand",
        "design": "Bah Humbug",
        "handle": "bah-humbug-christmas-phone-case-grumpy-persian-cat-in-santa-hat-on-green-polka-dots-magsafe-compatible-tough-case",
    },
]
PHONE = "iPhone 18 Pro Max · Glossy"
HEADING_ALL = "Our cases in hand"
LEDE = "Magnetic cases on iPhone 18 Pro Max, glossy finish."


def block_text(c):
    return (
        f'        "{c["id"]}": {{\n'
        f'          "type": "shop_clip",\n'
        f'          "settings": {{\n'
        f'            "mp4_asset": "{c["file"]}.mp4",\n'
        f'            "poster_asset": "{c["file"]}.jpg",\n'
        f'            "alt": "{c["alt"]}",\n'
        f'            "phone": "{PHONE}",\n'
        f'            "ai_made": true,\n'
        f'            "silent": true,\n'
        f'            "design": "{c["design"]}",\n'
        f'            "design_handle": "{c["handle"]}",\n'
        f'            "product_handle": ""\n'
        f'          }}\n'
        f'        }}'
    )


def strip_header(text):
    return re.sub(r"^\s*/\*.*?\*/", "", text, count=1, flags=re.S)


def once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"STOP: expected exactly one place for {what}, found {n}")
    return text.replace(old, new)


def main(src, dst):
    text = open(src, encoding="utf-8", newline="").read()
    if "\r\n" in text:
        raise SystemExit("STOP: CRLF line endings in the live template, expected LF")
    live = json.loads(strip_header(text))
    main_sec = live["sections"]["main"]
    if main_sec["type"] != "cv-product-counter":
        raise SystemExit("STOP: section main is not cv-product-counter")
    blocks = main_sec["blocks"]
    order = main_sec["block_order"]
    present = [c["id"] in blocks for c in CLIPS]
    if any(present) and not all(present):
        raise SystemExit(f"STOP: only some clip blocks are in the live template: {present}")
    if "video-reviews" not in blocks or blocks["video-reviews"]["type"] != "video_reviews":
        raise SystemExit("STOP: no video-reviews block in main")

    if all(present):
        # Older form on live: each clip tied to its own product page. Patch in place.
        for c in CLIPS:
            old = f'            "product_handle": "{c["handle"]}"\n'
            new = (
                f'            "design": "{c["design"]}",\n'
                f'            "design_handle": "{c["handle"]}",\n'
                f'            "product_handle": ""\n'
            )
            if old in text:
                text = once(text, old, new, f'product_handle of {c["id"]}')
        mode = "patched the four existing blocks"
    else:
        last = order[-1]
        # 1) block definitions: after the last block of main (main is the first section)
        end_blocks = '        }\n      },\n      "block_order": [\n'
        first = text.index(end_blocks)
        if text.index('"block_order": [') != first + len('        }\n      },\n      '):
            raise SystemExit("STOP: the first block_order in the file is not where expected")
        add = ",\n".join(block_text(c) for c in CLIPS)
        text = text[:first] + "        },\n" + add + '\n      },\n      "block_order": [\n' + text[first + len(end_blocks):]
        # 2) block order: after the current last id of main
        old = f'        "{last}"\n      ],\n      "settings": {{\n'
        idx = text.index(old)
        ids = "".join(f',\n        "{c["id"]}"' for c in CLIPS)
        text = text[:idx] + f'        "{last}"' + ids + '\n      ],\n      "settings": {\n' + text[idx + len(old):]
        mode = "added the four blocks"

    # 3) video-reviews text block: heading for the all-products row, and its line
    vr = blocks["video-reviews"]["settings"]
    start = text.index('        "video-reviews": {\n          "type": "video_reviews",\n          "settings": {\n')
    end = text.index("\n          }\n", start)
    body = text[start:end]
    lines = []
    if vr.get("shop_heading_all") != HEADING_ALL:
        if "shop_heading_all" in vr:
            raise SystemExit("STOP: shop_heading_all already set to something else on live")
        lines.append(f'            "shop_heading_all": "{HEADING_ALL}"')
    if vr.get("shop_lede") != LEDE:
        if vr.get("shop_lede"):
            raise SystemExit("STOP: shop_lede already set to something else on live")
        if '"shop_lede"' in body:
            body = re.sub(r'\n            "shop_lede": "",?', "", body)
        lines.append(f'            "shop_lede": "{LEDE}"')
    if lines:
        body = body + ",\n" + ",\n".join(lines)
    text = text[:start] + body + text[end:]

    out = json.loads(strip_header(text))  # must still parse
    om = out["sections"]["main"]
    assert om["block_order"][-4:] == [c["id"] for c in CLIPS], om["block_order"]
    assert all(om["blocks"][c["id"]]["settings"]["design_handle"] == c["handle"] for c in CLIPS)
    assert all(om["blocks"][c["id"]]["settings"]["product_handle"] == "" for c in CLIPS)
    assert om["blocks"]["video-reviews"]["settings"]["shop_heading_all"] == HEADING_ALL
    assert om["blocks"]["video-reviews"]["settings"]["shop_lede"] == LEDE
    assert om["blocks"]["video-reviews"]["settings"]["show_clips"] is False
    assert len(out["sections"]) == len(live["sections"])
    assert len(om["blocks"]) == len(om["block_order"])
    open(dst, "w", encoding="utf-8", newline="").write(text)
    print(f"{mode}; sections {len(out['sections'])}; main blocks {len(om['blocks'])}; bytes {len(text.encode('utf-8'))}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
