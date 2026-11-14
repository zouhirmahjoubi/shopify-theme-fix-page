"""Structural diff of two Shopify JSON templates (comment header stripped).

usage: python tpl_diff.py <old.json> <new.json>
"""
import json
import re
import sys


def load(path):
    raw = open(path, encoding="utf-8").read()
    raw = re.sub(r"^\s*/\*.*?\*/", "", raw, count=1, flags=re.S)
    return json.loads(raw)


def short(v, n=110):
    s = json.dumps(v, ensure_ascii=False)
    return s if len(s) <= n else s[: n - 3] + "..."


def diff_settings(a, b, where):
    keys = sorted(set(a) | set(b))
    for k in keys:
        if k not in a:
            print(f"    + {where}.{k} = {short(b[k])}")
        elif k not in b:
            print(f"    - {where}.{k} (was {short(a[k])})")
        elif a[k] != b[k]:
            print(f"    ~ {where}.{k}: {short(a[k], 70)} -> {short(b[k], 70)}")


def main(old_path, new_path):
    old, new = load(old_path), load(new_path)
    so, sn = old.get("sections", {}), new.get("sections", {})
    print(f"sections: {len(so)} -> {len(sn)}")
    print(f"order same: {old.get('order') == new.get('order')}")
    if old.get("order") != new.get("order"):
        print("  old order:", old.get("order"))
        print("  new order:", new.get("order"))
    for sid in sorted(set(so) | set(sn)):
        if sid not in so:
            print(f"+ section {sid} type={sn[sid].get('type')}")
            continue
        if sid not in sn:
            print(f"- section {sid} type={so[sid].get('type')}")
            continue
        a, b = so[sid], sn[sid]
        if a == b:
            continue
        print(f"~ section {sid} type={b.get('type')}")
        for key in sorted(set(a) | set(b)):
            if key in ("settings", "blocks", "block_order"):
                continue
            if a.get(key) != b.get(key):
                print(f"    ~ {key}: {short(a.get(key), 60)} -> {short(b.get(key), 60)}")
        diff_settings(a.get("settings", {}), b.get("settings", {}), "settings")
        ba, bb = a.get("blocks", {}), b.get("blocks", {})
        if a.get("block_order") != b.get("block_order"):
            print(f"    block_order: {a.get('block_order')}")
            print(f"             -> {b.get('block_order')}")
        for bid in sorted(set(ba) | set(bb)):
            if bid not in ba:
                print(f"    + block {bid} type={bb[bid].get('type')} {short(bb[bid].get('settings', {}), 160)}")
            elif bid not in bb:
                print(f"    - block {bid} type={ba[bid].get('type')} {short(ba[bid].get('settings', {}), 160)}")
            elif ba[bid] != bb[bid]:
                print(f"    ~ block {bid} type={bb[bid].get('type')}")
                for key in sorted(set(ba[bid]) | set(bb[bid])):
                    if key == "settings":
                        continue
                    if ba[bid].get(key) != bb[bid].get(key):
                        print(f"        ~ {key}: {short(ba[bid].get(key), 60)} -> {short(bb[bid].get(key), 60)}")
                diff_settings(ba[bid].get("settings", {}), bb[bid].get("settings", {}), f"    {bid}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
