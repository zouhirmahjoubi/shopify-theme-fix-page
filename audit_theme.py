"""Casify Shopify テーマの静的整合性監査スクリプト。

チェック内容:
  1. すべての JSON ファイル(config / templates / sections グループ)のパース
  2. テンプレートが参照する section type に対応する sections/*.liquid の存在
  3. {% render 'x' %} が参照する snippets/x.liquid の存在
  4. {% sections 'x' %} / {% section 'x' %} の参照先存在
  5. asset_url / inline_asset_content / stylesheet_tag が参照する assets/ の存在
  6. 各 section の {% schema %} JSON のパース
  7. テンプレート JSON の block type が section schema に定義されているか
  8. テンプレート JSON の settings id が section schema に定義されているか
  9. blocks が空のまま描画されて空表示になる section の検出
 10. settings.<key> 参照が settings_schema.json に存在するか
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Windows consoles default to cp1252; the report contains non-Latin characters.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent / "casify-theme"

errors: list[str] = []
warnings: list[str] = []


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


# --------------------------------------------------------------------------- #
# 1. JSON パース
# --------------------------------------------------------------------------- #
json_docs: dict[str, dict] = {}
for jf in sorted(ROOT.rglob("*.json")):
    if "design-tokens" in jf.parts:
        continue
    raw = jf.read_text(encoding="utf-8")
    try:
        json_docs[rel(jf)] = json.loads(raw)
    except json.JSONDecodeError as exc:
        errors.append(f"[JSON] {rel(jf)} がパースできません: {exc}")


# --------------------------------------------------------------------------- #
# 2. section schema の抽出
# --------------------------------------------------------------------------- #
SCHEMA_RE = re.compile(r"\{%-?\s*schema\s*-?%\}(.*?)\{%-?\s*endschema\s*-?%\}", re.S)

section_files = {p.stem: p for p in (ROOT / "sections").glob("*.liquid")}
snippet_files = {p.stem: p for p in (ROOT / "snippets").glob("*.liquid")}
asset_files = {p.name for p in (ROOT / "assets").glob("*")}

schemas: dict[str, dict] = {}
for name, path in sorted(section_files.items()):
    match = SCHEMA_RE.search(path.read_text(encoding="utf-8"))
    if not match:
        warnings.append(f"[schema] sections/{name}.liquid に {{% schema %}} がありません")
        continue
    try:
        schemas[name] = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        errors.append(f"[schema] sections/{name}.liquid の schema がパースできません: {exc}")


def schema_block_types(section_name: str) -> set[str]:
    schema = schemas.get(section_name, {})
    types = {b.get("type") for b in schema.get("blocks", []) if isinstance(b, dict)}
    # Shopify の汎用ブロック
    types.update({"@app", "@theme"})
    return types


def schema_setting_ids(section_name: str) -> set[str]:
    schema = schemas.get(section_name, {})
    return {s.get("id") for s in schema.get("settings", []) if isinstance(s, dict) and s.get("id")}


def schema_block_setting_ids(section_name: str, block_type: str) -> set[str]:
    schema = schemas.get(section_name, {})
    for b in schema.get("blocks", []):
        if isinstance(b, dict) and b.get("type") == block_type:
            return {s.get("id") for s in b.get("settings", []) if isinstance(s, dict) and s.get("id")}
    return set()


# --------------------------------------------------------------------------- #
# 3. テンプレート JSON の検証
# --------------------------------------------------------------------------- #
BLOCK_DRIVEN_HINT = re.compile(r"for\s+\w+\s+in\s+section\.blocks")

for doc_name, doc in json_docs.items():
    if not (doc_name.startswith("templates/") or doc_name.startswith("sections/")):
        continue
    sections = doc.get("sections")
    if not isinstance(sections, dict):
        continue
    for sec_id, sec in sections.items():
        if not isinstance(sec, dict):
            continue
        stype = sec.get("type")
        if stype not in section_files:
            errors.append(f"[section欠落] {doc_name} の '{sec_id}' が参照する section '{stype}' が存在しません")
            continue

        # settings id の照合
        declared = schema_setting_ids(stype)
        for key in (sec.get("settings") or {}):
            if declared and key not in declared:
                warnings.append(
                    f"[未定義setting] {doc_name} / {sec_id} ({stype}) の '{key}' は schema に未定義です"
                )

        # block type の照合
        allowed = schema_block_types(stype)
        blocks = sec.get("blocks") or {}
        for bid, blk in blocks.items():
            if not isinstance(blk, dict):
                continue
            btype = blk.get("type")
            if btype not in allowed:
                errors.append(
                    f"[未定義block] {doc_name} / {sec_id} ({stype}) の block '{bid}' type='{btype}' が schema に未定義です"
                )
                continue
            bdeclared = schema_block_setting_ids(stype, btype)
            for key in (blk.get("settings") or {}):
                if bdeclared and key not in bdeclared:
                    warnings.append(
                        f"[未定義block setting] {doc_name} / {sec_id} ({stype}/{btype}) の '{key}' が schema に未定義です"
                    )

        # block_order の整合性
        order = sec.get("block_order") or []
        for bid in order:
            if bid not in blocks:
                errors.append(f"[block_order] {doc_name} / {sec_id} の block_order に存在しない '{bid}' があります")
        for bid in blocks:
            if order and bid not in order:
                warnings.append(f"[block_order] {doc_name} / {sec_id} の block '{bid}' が block_order に未掲載です")

        # blocks を必須とする section が空のケース
        body = section_files[stype].read_text(encoding="utf-8")
        schema_has_blocks = bool(schemas.get(stype, {}).get("blocks"))
        if schema_has_blocks and BLOCK_DRIVEN_HINT.search(body) and not blocks:
            errors.append(
                f"[空セクション] {doc_name} / {sec_id} ({stype}) は blocks 駆動ですが blocks が空 → 中身が描画されません"
            )

    # order の整合性
    for sec_id in doc.get("order") or []:
        if sec_id not in sections:
            errors.append(f"[order] {doc_name} の order に存在しない section '{sec_id}' があります")
    for sec_id in sections:
        if doc.get("order") and sec_id not in doc["order"]:
            warnings.append(f"[order] {doc_name} の section '{sec_id}' が order に未掲載です")


# --------------------------------------------------------------------------- #
# 4. Liquid 内の参照検証
# --------------------------------------------------------------------------- #
RENDER_RE = re.compile(r"\{%-?\s*(?:render|include)\s+'([^']+)'")
SECTIONS_RE = re.compile(r"\{%-?\s*sections?\s+'([^']+)'\s*-?%\}")
ASSET_RE = re.compile(r"'([^']+?\.(?:css|js|svg|jpg|jpeg|png|webp|woff2?))'\s*\|\s*(?:asset_url|inline_asset_content|asset_img_url)")

liquid_files = sorted(ROOT.rglob("*.liquid"))
for lf in liquid_files:
    body = lf.read_text(encoding="utf-8")

    for snip in set(RENDER_RE.findall(body)):
        if snip not in snippet_files:
            errors.append(f"[snippet欠落] {rel(lf)} が render する snippets/{snip}.liquid が存在しません")

    for grp in set(SECTIONS_RE.findall(body)):
        if (ROOT / "sections" / f"{grp}.json").exists():
            continue
        if grp in section_files:
            continue
        errors.append(f"[section group欠落] {rel(lf)} が参照する '{grp}' が存在しません")

    for asset in set(ASSET_RE.findall(body)):
        if asset not in asset_files:
            errors.append(f"[asset欠落] {rel(lf)} が参照する assets/{asset} が存在しません")


# --------------------------------------------------------------------------- #
# 5. settings.<key> と settings_schema.json の照合
# --------------------------------------------------------------------------- #
schema_settings: set[str] = set()
for group in json_docs.get("config/settings_schema.json", []) or []:
    if isinstance(group, dict):
        for s in group.get("settings", []) or []:
            if isinstance(s, dict) and s.get("id"):
                schema_settings.add(s["id"])

SETTINGS_REF_RE = re.compile(r"settings\.([a-zA-Z0-9_]+)")
IGNORE_SETTINGS = {"settings"}
for lf in liquid_files:
    body = lf.read_text(encoding="utf-8")
    body = SCHEMA_RE.sub("", body)  # section schema 内は除外
    for key in set(SETTINGS_REF_RE.findall(body)):
        if key in IGNORE_SETTINGS:
            continue
        if key not in schema_settings:
            warnings.append(f"[未定義theme setting] {rel(lf)} の settings.{key} が settings_schema.json に未定義です")

settings_data = json_docs.get("config/settings_data.json", {}) or {}
current = settings_data.get("current", {}) if isinstance(settings_data, dict) else {}
if isinstance(current, dict):
    for key in current:
        if key in ("sections", "blocks", "content_for_index"):
            continue
        if key not in schema_settings:
            warnings.append(f"[未定義theme setting] settings_data.json の '{key}' が settings_schema.json に未定義です")


# --------------------------------------------------------------------------- #
# 6. 重複 HTML id の検出(同一 section 内)
# --------------------------------------------------------------------------- #
ID_RE = re.compile(r'\sid="([a-zA-Z][a-zA-Z0-9_-]*)"')
for lf in liquid_files:
    body = SCHEMA_RE.sub("", lf.read_text(encoding="utf-8"))
    found: dict[str, int] = {}
    for i in ID_RE.findall(body):
        found[i] = found.get(i, 0) + 1
    for i, n in found.items():
        if n > 1:
            warnings.append(f"[重複id] {rel(lf)} に id=\"{i}\" が {n} 回出現します")


# --------------------------------------------------------------------------- #
# 出力
# --------------------------------------------------------------------------- #
print("=" * 78)
print(f"ERRORS ({len(errors)})")
print("=" * 78)
for e in errors:
    print(" *", e)

print()
print("=" * 78)
print(f"WARNINGS ({len(warnings)})")
print("=" * 78)
for w in warnings:
    print(" -", w)

print()
print(f"sections: {len(section_files)} / snippets: {len(snippet_files)} / assets: {len(asset_files)}")
print(f"json docs parsed: {len(json_docs)}")