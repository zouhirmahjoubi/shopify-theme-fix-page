"""Add (or update) the shop-written caption on the four shop_clip blocks.

Text edit on a copy of templates/product.json, so everything else stays byte for
byte. The captions are the shop's own words about the print. They are not
customer quotes and must never be replaced by one.

usage: python add_captions.py <in product.json> <out product.json> [--label on|off|keep]
  --label on    tick "Made with AI" on the four clips
  --label off   untick it
  --label keep  leave it as the input has it (default)
"""
import io
import json
import re
import sys

CAPTIONS = {
    "shop-clip-snow-day-penguin": "Skating penguin on ice blue.",
    "shop-clip-beary-christmas": "Polar bear with a gift on red.",
    "shop-clip-kissing-mistletoe": "Mistletoe label on pink hearts.",
    "shop-clip-bah-humbug": "Grumpy cat on green polka dots.",
}


def strip_header(text):
    return re.sub(r"^\s*/\*.*?\*/", "", text, count=1, flags=re.S)


def main(src, dst, label="keep"):
    text = io.open(src, encoding="utf-8", newline="").read()
    before = json.loads(strip_header(text))
    blocks = before["sections"]["main"]["blocks"]
    for bid, caption in CAPTIONS.items():
        if bid not in blocks or blocks[bid]["type"] != "shop_clip":
            raise SystemExit(f"STOP: block {bid} is not in the template (run build_template_all.py first)")
        start = text.index(f'        "{bid}": {{\n')
        end = text.index("\n        }", start)
        body = text[start:end]
        line = f'            "caption": {json.dumps(caption, ensure_ascii=False)},\n'
        if '"caption"' in body:
            body = re.sub(r'            "caption": "(?:[^"\\]|\\.)*",\n', lambda m: line, body, count=1)
        else:
            anchor = '          "settings": {\n'
            if body.count(anchor) != 1:
                raise SystemExit(f"STOP: unexpected shape of block {bid}")
            body = body.replace(anchor, anchor + line)
        if label in ("on", "off"):
            want = "true" if label == "on" else "false"
            body, n = re.subn(r'("ai_made": )(true|false)', lambda m: m.group(1) + want, body)
            if n != 1:
                raise SystemExit(f"STOP: no ai_made setting in block {bid}")
        text = text[:start] + body + text[end:]

    after = json.loads(strip_header(text))
    # Only the four clip blocks may differ, and only in caption / ai_made.
    for bid, caption in CAPTIONS.items():
        a = before["sections"]["main"]["blocks"][bid]["settings"]
        b = after["sections"]["main"]["blocks"][bid]["settings"]
        assert b["caption"] == caption
        changed = {k for k in set(a) | set(b) if a.get(k) != b.get(k)}
        assert changed <= {"caption", "ai_made"}, changed
        b_copy = dict(b)
        b_copy.pop("caption")
        a_copy = dict(a)
        a_copy.pop("caption", None)
        if label == "keep":
            assert a_copy == b_copy
        before["sections"]["main"]["blocks"][bid]["settings"] = b
    assert before == after, "something else changed"
    io.open(dst, "w", encoding="utf-8", newline="").write(text)
    labels = [after["sections"]["main"]["blocks"][b]["settings"]["ai_made"] for b in CAPTIONS]
    print(f"wrote {dst}: {len(text.encode('utf-8'))} bytes; Made with AI ticked: {labels}")


if __name__ == "__main__":
    args = sys.argv[1:]
    label = "keep"
    if "--label" in args:
        i = args.index("--label")
        label = args[i + 1]
        del args[i:i + 2]
    main(args[0], args[1], label)
