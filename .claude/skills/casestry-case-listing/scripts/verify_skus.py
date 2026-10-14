#!/usr/bin/env python3
"""Check every Casestry item SKU we sell against Casestry's live catalog (GET /v1/items).

Needs a Casestry API key (Casestry portal > Account) in the CASESTRY_API_KEY environment variable.
Usage: python verify_skus.py [--manifest <fit output>/manifest.json] [--all]
  --all       check every SKU models.json can produce, not just one listing
Exit code 1 when any SKU is unknown to Casestry.
"""
import argparse, json, os, sys, urllib.request
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent


def catalog(key):
    req = urllib.request.Request("https://www.casestry.com/v1/items", headers={"x-api-key": key, "accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    items = data.get("msg", [])
    skus = set()
    for it in items:
        if isinstance(it, dict):
            for k in ("item_sku", "sku", "SKU"):
                if k in it:
                    skus.add(str(it[k]).upper())
        else:
            skus.add(str(it).upper())
    return skus, items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest")
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    key = os.environ.get("CASESTRY_API_KEY")
    if not key:
        sys.exit("Set CASESTRY_API_KEY first (never paste the key into chat or commit it).")
    reg = json.loads((SKILL / "models.json").read_text(encoding="utf-8"))
    wanted = {}
    if a.manifest:
        man = json.loads(Path(a.manifest).read_text(encoding="utf-8"))
        for m in man["models"]:
            for v in m["variants"]:
                wanted[v["item_sku"]] = f"{m['name']} / {v['label']}"
    if a.all or not wanted:
        for m in reg["models"]:
            for l in m["lines"]:
                wanted[reg["case_lines"][l]["sku"].format(code=m["code"])] = f"{m['name']} / {reg['case_lines'][l]['label']}"
    live, raw = catalog(key)
    (SKILL / "casestry_items_cache.json").write_text(json.dumps(raw, indent=1), encoding="utf-8")
    missing = {s: d for s, d in wanted.items() if s.upper() not in live}
    print(f"{len(wanted)} SKUs checked, {len(live)} in Casestry catalog, {len(missing)} unknown")
    for s, d in sorted(missing.items()):
        print(f"  UNKNOWN {s:<14} {d}")
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
