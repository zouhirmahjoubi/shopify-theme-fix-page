#!/usr/bin/env python3
"""Shopify side of a Casestry listing. Builds GraphQL variables and does the raw file uploads;
the GraphQL calls themselves go through the Shopify MCP (graphql_mutation / graphql_query).

  plan       <out> --slug S                 -> <out>/shopify/staged_input.json  (stagedUploadsCreate variables)
  upload     <out> --targets <mcp result>   -> POST every file to its staged target, writes uploaded.json
  filecreate <out>                          -> <out>/shopify/filecreate_input.json (fileCreate variables)
  productset <out> --files <mcp result> --product <product.json>  -> productset_input.json
"""
import argparse, json, mimetypes, re, subprocess, sys
from pathlib import Path


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def load_json_loose(path):
    """MCP results are saved as JSON, sometimes wrapped in text; take the first JSON object."""
    raw = Path(path).read_text(encoding="utf-8")
    i = raw.find("{")
    return json.JSONDecoder().raw_decode(raw[i:])[0]


def items(out, slug):
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    rows = []
    for h in man.get("heroes", []):
        rows.append(dict(key=f"hero:{h['kind']}", path=out / h["file"],
                         filename=f"{slug}-{h['kind']}.jpg", alt=None))
    for m in man["models"]:
        rows.append(dict(key=f"mockup:{m['code']}", path=out / m["mockup_file"],
                         filename=f"{slug}-{slugify(m['name'])}.jpg", alt=None))
        rows.append(dict(key=f"print:{m['code']}", path=out / m["print_file"],
                         filename=f"{slug}-print-{m['code'].lower()}.png", alt=None))
    for r in rows:
        r["mimeType"] = mimetypes.guess_type(r["filename"])[0]
        r["size"] = r["path"].stat().st_size
    return man, rows


def cmd_plan(a):
    out = Path(a.out)
    _, rows = items(out, a.slug)
    (out / "shopify").mkdir(exist_ok=True)
    (out / "shopify" / "uploads.json").write_text(json.dumps(
        [dict(r, path=str(r["path"])) for r in rows], indent=1), encoding="utf-8")
    var = {"input": [dict(filename=r["filename"], mimeType=r["mimeType"], resource="IMAGE",
                          httpMethod="POST", fileSize=str(r["size"])) for r in rows]}
    (out / "shopify" / "staged_input.json").write_text(json.dumps(var), encoding="utf-8")
    print(f"{len(rows)} files, {sum(r['size'] for r in rows) / 1e6:.1f} MB -> shopify/staged_input.json")


def cmd_upload(a):
    out = Path(a.out)
    rows = json.loads((out / "shopify" / "uploads.json").read_text(encoding="utf-8"))
    res = load_json_loose(a.targets)
    targets = res["data"]["stagedUploadsCreate"]["stagedTargets"]
    assert len(targets) == len(rows), (len(targets), len(rows))
    done = []
    for r, t in zip(rows, targets):
        args = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST", t["url"]]
        for p in t["parameters"]:
            args += ["-F", f"{p['name']}={p['value']}"]
        args += ["-F", f"file=@{r['path']};type={r['mimeType']}"]
        code = subprocess.run(args, capture_output=True, text=True).stdout.strip()
        ok = code in ("200", "201", "204")
        print(f"{code} {r['filename']}")
        if not ok:
            sys.exit(f"upload failed for {r['filename']}")
        done.append(dict(key=r["key"], filename=r["filename"], resourceUrl=t["resourceUrl"]))
    (out / "shopify" / "uploaded.json").write_text(json.dumps(done, indent=1), encoding="utf-8")
    print(f"{len(done)} uploaded")


def cmd_filecreate(a):
    out = Path(a.out)
    done = json.loads((out / "shopify" / "uploaded.json").read_text(encoding="utf-8"))
    alts = json.loads((out / "shopify" / "alts.json").read_text(encoding="utf-8")) if (out / "shopify" / "alts.json").exists() else {}
    var = {"files": [dict(originalSource=d["resourceUrl"], contentType="IMAGE", filename=d["filename"],
                          alt=alts.get(d["key"], "")) for d in done]}
    (out / "shopify" / "filecreate_input.json").write_text(json.dumps(var), encoding="utf-8")
    print(f"{len(var['files'])} files -> shopify/filecreate_input.json")


def cmd_productset(a):
    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    done = json.loads((out / "shopify" / "uploaded.json").read_text(encoding="utf-8"))
    res = load_json_loose(a.files)
    nodes = res["data"]["nodes"] if "nodes" in res["data"] else res["data"]["fileCreate"]["files"]
    by_name = {}
    for n in nodes:
        url = (n.get("image") or {}).get("url") or ""
        fname = url.split("/files/")[-1].split("?")[0] if url else None
        by_name[n["id"]] = dict(id=n["id"], url=url, status=n.get("fileStatus"), fname=fname)
    ids = {}
    for d, n in zip(done, nodes):  # fileCreate returns files in input order
        ids[d["key"]] = by_name[n["id"]]
    missing = [k for k, v in ids.items() if not v["url"]]
    if missing:
        sys.exit(f"files not READY yet (no url): {missing[:5]}... re-query nodes and retry")
    prod = json.loads(Path(a.product).read_text(encoding="utf-8"))
    reg = json.loads((Path(__file__).resolve().parent.parent / "models.json").read_text(encoding="utf-8"))
    prefix = reg["shopify_sku_prefix"]
    files = [dict(id=ids[f"hero:{h['kind']}"]["id"]) for h in man.get("heroes", [])]
    files += [dict(id=ids[f"mockup:{m['code']}"]["id"]) for m in man["models"]]
    variants, labels = [], []
    for m in man["models"]:
        for v in m["variants"]:
            if v["label"] not in labels:
                labels.append(v["label"])
            variants.append(dict(
                optionValues=[dict(optionName="Phone model", name=m["name"]), dict(optionName="Case type", name=v["label"])],
                price=v["price"], compareAtPrice=reg["compare_at_price"], sku=prefix + v["item_sku"],
                taxable=True, inventoryPolicy="DENY",
                inventoryItem=dict(tracked=False, requiresShipping=True, sku=None, cost=prod.get("cost", {}).get(v["line"])),
                file=dict(id=ids[f"mockup:{m['code']}"]["id"]),
                metafields=[
                    dict(namespace="casestry", key="item_sku", type="single_line_text_field", value=v["item_sku"]),
                    dict(namespace="casestry", key="front_artwork", type="url", value=ids[f"print:{m['code']}"]["url"]),
                    dict(namespace="casestry", key="front_mockup", type="url", value=ids[f"mockup:{m['code']}"]["url"]),
                ]))
    for v in variants:
        ii = v["inventoryItem"]
        ii.pop("sku")
        if ii["cost"] is None:
            ii.pop("cost")
    inp = dict(
        title=prod["title"], handle=prod["handle"], status=prod.get("status", "DRAFT"),
        descriptionHtml=prod["descriptionHtml"], vendor=prod.get("vendor", "Casify"),
        productType=prod.get("productType", "Phone Case"), tags=prod["tags"], category=prod.get("category"),
        seo=prod.get("seo"),
        productOptions=[dict(name="Phone model", position=1, values=[dict(name=m["name"]) for m in man["models"]]),
                        dict(name="Case type", position=2, values=[dict(name=l) for l in labels])],
        files=files, variants=variants)  # seo{} already writes global.title_tag / description_tag
    inp = {k: v for k, v in inp.items() if v is not None}
    for v in variants:  # defaults; keeps the payload small enough to paste into one MCP call
        v.pop("taxable", None)
        v.pop("inventoryPolicy", None)
        v["inventoryItem"].pop("requiresShipping", None)
    (out / "shopify" / "productset_input.json").write_text(json.dumps({"input": inp, "synchronous": True}, indent=1), encoding="utf-8")
    (out / "shopify" / "file_ids.json").write_text(json.dumps(ids, indent=1), encoding="utf-8")
    print(f"{len(variants)} variants, {len(files)} media -> shopify/productset_input.json")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("plan"); p.add_argument("out"); p.add_argument("--slug", required=True); p.set_defaults(f=cmd_plan)
    p = sub.add_parser("upload"); p.add_argument("out"); p.add_argument("--targets", required=True); p.set_defaults(f=cmd_upload)
    p = sub.add_parser("filecreate"); p.add_argument("out"); p.set_defaults(f=cmd_filecreate)
    p = sub.add_parser("productset"); p.add_argument("out"); p.add_argument("--files", required=True)
    p.add_argument("--product", required=True); p.set_defaults(f=cmd_productset)
    a = ap.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
