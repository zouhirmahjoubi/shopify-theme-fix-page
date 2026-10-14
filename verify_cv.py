"""Focused validation for the new converting PDP files."""
import json, re, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "casify-theme")
tpl_path = os.path.join(ROOT, "templates", "product.convert.json")

# Every section that makes up the converting PDP. Keep in sync with
# templates/product.convert.json.
CV_SECTIONS = [
    "cv-product",
    "cv-value-stack",
    "cv-story",
    "cv-ugc",
    "cv-social-proof",
    "cv-compare",
    "cv-guarantee",
]

# The rest of the design system: one section per non-product template.
# Checked for schema/liquid sanity, but not against product.convert.json.
CV_PAGE_SECTIONS = [
    "cv-hero",
    "cv-collection-row",
    "cv-collection",
    "cv-collections-list",
    "cv-search",
    "cv-cart",
    "cv-page",
    "cv-blog",
    "cv-article",
    "cv-contact",
    "cv-404",
]
# Note: /policies/* has no theme template — Shopify renders those pages itself
# inside layout/theme.liquid, so they are styled via .shopify-policy__* in
# assets/theme.css rather than by a section here.

ALL_CV = CV_SECTIONS + CV_PAGE_SECTIONS

# Sections that intentionally ship without a preset because they only work in
# one template context.
NO_PRESET_OK = set()

errors, warns = [], []

# ---------- 1. template JSON parses ----------
raw = open(tpl_path, encoding="utf-8").read()
try:
    tpl = json.loads(raw)
except Exception as e:
    print("FATAL template JSON:", e); sys.exit(1)

def read(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()

def schema_of(section_type):
    p = os.path.join(ROOT, "sections", section_type + ".liquid")
    if not os.path.exists(p):
        errors.append(f"missing section file: {section_type}.liquid")
        return None
    src = open(p, encoding="utf-8").read()
    m = re.search(r"\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}", src, re.S)
    if not m:
        errors.append(f"{section_type}: no schema block")
        return None
    try:
        return json.loads(m.group(1))
    except Exception as e:
        errors.append(f"{section_type}: schema JSON invalid -> {e}")
        return None

# ---------- 2. sections / blocks / settings cross-check ----------
for sid, sec in tpl["sections"].items():
    stype = sec["type"]
    sch = schema_of(stype)
    if not sch:
        continue
    top_ids = {s["id"] for s in sch.get("settings", []) if "id" in s}
    for k in sec.get("settings", {}):
        if k not in top_ids:
            errors.append(f"{sid} ({stype}): section setting '{k}' not in schema")

    blk_defs = {b["type"]: {s["id"] for s in b.get("settings", []) if "id" in s}
                for b in sch.get("blocks", [])}
    blocks = sec.get("blocks", {})
    for bid, blk in blocks.items():
        bt = blk["type"]
        if bt not in blk_defs:
            errors.append(f"{sid} ({stype}): block type '{bt}' not in schema")
            continue
        for k in blk.get("settings", {}):
            if k not in blk_defs[bt]:
                errors.append(f"{sid} ({stype}) block {bid}: setting '{k}' not in schema")

    order = sec.get("block_order", [])
    if sorted(order) != sorted(blocks.keys()):
        errors.append(f"{sid}: block_order mismatch "
                      f"({len(order)} ordered vs {len(blocks)} defined)")

    mx = sch.get("max_blocks")
    if mx and len(blocks) > mx:
        errors.append(f"{sid} ({stype}): {len(blocks)} blocks exceeds max_blocks {mx}")

# ---------- 3. every section in order exists ----------
for sid in tpl.get("order", []):
    if sid not in tpl["sections"]:
        errors.append(f"order references unknown section id '{sid}'")

# ---------- 4. icon names used must exist in cv-icon.liquid ----------
icon_src = read("snippets/cv-icon.liquid")
known = set(re.findall(r"when '([a-z0-9\-]+)'", icon_src))
used = set()
for f in ALL_CV + ["cv-card"]:
    p = "snippets/cv-card.liquid" if f == "cv-card" else "sections/" + f + ".liquid"
    src = read(p)
    used |= set(re.findall(r"render 'cv-icon',\s*name:\s*'([a-z0-9\-]+)'", src))
missing_icons = sorted(used - known)
if missing_icons:
    errors.append("cv-icon: unknown icon names -> " + ", ".join(missing_icons))

# icon names chosen in template settings
for sid, sec in tpl["sections"].items():
    for bid, blk in sec.get("blocks", {}).items():
        ic = blk.get("settings", {}).get("icon")
        if ic and ic not in known:
            errors.append(f"{sid}/{bid}: icon '{ic}' not defined in cv-icon.liquid")

# ---------- 5. JS ids must exist in the liquid ----------
js = read("assets/cv-product.js")
liquid_all = "".join(read("sections/" + f + ".liquid") for f in ALL_CV)
liquid_all += read("snippets/cv-card.liquid")
for jsid in sorted(set(re.findall(r"\$\('#(\w+)'\)", js)) |
                   set(re.findall(r"getElementById\('(\w+)'\)", js))):
    if f'id="{jsid}"' not in liquid_all:
        errors.append(f"cv-product.js targets #{jsid} which no liquid emits")

# ---------- 6. CSS coverage for .cv-* classes ----------
css = read("assets/theme.css")
css_classes = set(re.findall(r"\.(cv-[a-zA-Z0-9_\-]+)", css))
liquid_classes = set()
for m in re.findall(r'class="([^"{}]+)"', liquid_all):
    for c in m.split():
        if c.startswith("cv-"):
            liquid_classes.add(c)
unstyled = sorted(liquid_classes - css_classes)
if unstyled:
    warns.append("cv classes with no CSS rule -> " + ", ".join(unstyled))

# ---------- 7. schema settings must be consumed by their liquid ----------
for f in ALL_CV:
    src = read("sections/" + f + ".liquid")
    body = src.split("{% schema %}")[0]
    sch = schema_of(f)
    if not sch:
        continue
    for s in sch.get("settings", []):
        i = s.get("id")
        if i and f"section.settings.{i}" not in body:
            warns.append(f"{f}: section setting '{i}' never used")
    for b in sch.get("blocks", []):
        for s in b.get("settings", []):
            i = s.get("id")
            if i and f".settings.{i}" not in body:
                warns.append(f"{f}: block[{b['type']}] setting '{i}' never used")
    # A section with no preset cannot be added from the theme editor. Sections
    # bound to a single template context can be listed in NO_PRESET_OK.
    if "presets" not in sch and f not in NO_PRESET_OK:
        errors.append(f"{f}: no presets — will render empty from theme editor")

# ---------- 8. unbalanced liquid tags (rough) ----------
for f in ALL_CV + ["cv-icon", "cv-card"]:
    p = "snippets/" + f + ".liquid" if f in ("cv-icon", "cv-card") else "sections/" + f + ".liquid"
    src = read(p)
    body = src.split("{% schema %}")[0]
    for tag in ["if", "for", "case", "unless"]:
        o = len(re.findall(r"\{%-?\s*" + tag + r"\s", body))
        c = len(re.findall(r"\{%-?\s*end" + tag + r"\s*-?%\}", body))
        if o != c:
            errors.append(f"{p}: {tag}/end{tag} mismatch {o} vs {c}")

# ---------- report ----------
print("=" * 74)
print(f"ERRORS: {len(errors)}")
for e in errors:
    print("  ✗", e)
print(f"\nWARNINGS: {len(warns)}")
for w in warns:
    print("  ·", w)
print("=" * 74)
print(f"sections in template: {len(tpl['sections'])}, "
      f"blocks total: {sum(len(s.get('blocks', {})) for s in tpl['sections'].values())}")
print(f"icons defined: {len(known)}, icons used: {len(used)}")