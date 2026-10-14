"""Casify テーマ 第2弾監査 — 実害のある不整合だけを抽出する。

第1弾の誤検知(section.settings を theme settings と誤認 / if-else 分岐の重複 id)を
排除し、次の「実際に表示が壊れる」問題に絞って検出する:

  A. section/block schema に未定義の settings 参照 → 常に空文字で描画される
  B. schema に定義済みだが liquid 本体で一度も使われない settings → 管理画面のデッド項目
  C. liquid の class 名が theme.css に未定義 → 無スタイルで崩れる
  D. JS が getElementById する id が liquid 側に存在しない → 動かない機能
  E. テンプレート JSON が blocks 駆動 section に blocks を渡していない → 空描画
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

# Windows consoles default to cp1252; the report contains non-Latin characters.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent / "casify-theme"
SCHEMA_RE = re.compile(r"\{%-?\s*schema\s*-?%\}(.*?)\{%-?\s*endschema\s*-?%\}", re.S)

css_text = (ROOT / "assets" / "theme.css").read_text(encoding="utf-8")
css_classes = set(re.findall(r"\.(-?[_a-zA-Z][\w-]*)", css_text))

report: dict[str, list[str]] = defaultdict(list)


def strip_schema(body: str) -> str:
    return SCHEMA_RE.sub("", body)


# --------------------------------------------------------------------------- #
# A/B: section・block settings の宣言と使用の照合
# --------------------------------------------------------------------------- #
SEC_SET_RE = re.compile(r"section\.settings\.([a-zA-Z0-9_]+)")
SEC_SET_BRACKET_RE = re.compile(r"section\.settings\[['\"]([a-zA-Z0-9_-]+)['\"]\]")
BLK_SET_RE = re.compile(r"(?:block|b|col|row|item)\.settings\.([a-zA-Z0-9_]+)")
BLK_SET_BRACKET_RE = re.compile(r"(?:block|b|col|row|item)\.settings\[['\"]?([a-zA-Z0-9_-]+)")

for path in sorted((ROOT / "sections").glob("*.liquid")):
    raw = path.read_text(encoding="utf-8")
    m = SCHEMA_RE.search(raw)
    if not m:
        continue
    try:
        schema = json.loads(m.group(1))
    except json.JSONDecodeError:
        continue

    body = strip_schema(raw)
    name = path.name

    sec_declared = {s["id"] for s in schema.get("settings", []) if isinstance(s, dict) and s.get("id")}
    sec_used = set(SEC_SET_RE.findall(body)) | set(SEC_SET_BRACKET_RE.findall(body))

    for key in sorted(sec_used - sec_declared):
        report["A. schema未定義のsection設定(常に空描画)"].append(f"{name}: section.settings.{key}")
    for key in sorted(sec_declared - sec_used):
        report["B. 未使用のsection設定(管理画面のデッド項目)"].append(f"{name}: {key}")

    blk_declared: set[str] = set()
    for b in schema.get("blocks", []) or []:
        if isinstance(b, dict):
            for s in b.get("settings", []) or []:
                if isinstance(s, dict) and s.get("id"):
                    blk_declared.add(s["id"])
    blk_used = set(BLK_SET_RE.findall(body)) | set(BLK_SET_BRACKET_RE.findall(body))
    # cell_1..cell_4 のような動的キーは除外
    blk_used = {k for k in blk_used if not re.fullmatch(r"cell_\d+", k)}
    dynamic_cell = "cell_" in body

    for key in sorted(blk_used - blk_declared):
        report["A. schema未定義のblock設定(常に空描画)"].append(f"{name}: block.settings.{key}")
    for key in sorted(blk_declared - blk_used):
        if dynamic_cell and key.startswith("cell_"):
            continue
        report["B. 未使用のblock設定(管理画面のデッド項目)"].append(f"{name}: {key}")


# --------------------------------------------------------------------------- #
# C: liquid の class が theme.css に無い
# --------------------------------------------------------------------------- #
CLASS_ATTR_RE = re.compile(r'class="([^"{}]*)"')
SAFE_PREFIX = ("shopify", "sr-only", "rte", "js-")

for path in sorted(ROOT.rglob("*.liquid")):
    body = strip_schema(path.read_text(encoding="utf-8"))
    missing: set[str] = set()
    for attr in CLASS_ATTR_RE.findall(body):
        for cls in attr.split():
            if not cls or cls.startswith(SAFE_PREFIX):
                continue
            if cls not in css_classes:
                missing.add(cls)
    for cls in sorted(missing):
        report["C. CSS未定義のclass(無スタイル)"].append(f"{path.relative_to(ROOT)}: .{cls}")


# --------------------------------------------------------------------------- #
# D: JS の getElementById / querySelector が指す id・class の存在確認
# --------------------------------------------------------------------------- #
all_liquid = "\n".join(p.read_text(encoding="utf-8") for p in ROOT.rglob("*.liquid"))
existing_ids = set(re.findall(r'\sid="([a-zA-Z][\w-]*)"', all_liquid))

GET_BY_ID_RE = re.compile(r"getElementById\(\s*['\"]([\w-]+)['\"]")
for path in sorted((ROOT / "assets").glob("*.js")):
    js = path.read_text(encoding="utf-8")
    for jid in sorted(set(GET_BY_ID_RE.findall(js))):
        if jid not in existing_ids:
            report["D. JSが探すidがテンプレートに無い(機能不動)"].append(f"assets/{path.name}: #{jid}")

for path in sorted((ROOT / "sections").glob("*.liquid")):
    body = strip_schema(path.read_text(encoding="utf-8"))
    local_ids = set(re.findall(r'\sid="([a-zA-Z][\w-]*)"', body))
    for jid in sorted(set(GET_BY_ID_RE.findall(body))):
        if jid not in local_ids and jid not in existing_ids:
            report["D. JSが探すidがテンプレートに無い(機能不動)"].append(f"sections/{path.name}: #{jid}")


# --------------------------------------------------------------------------- #
# E: blocks 駆動 section に blocks が無いテンプレート
# --------------------------------------------------------------------------- #
BLOCK_LOOP_RE = re.compile(r"for\s+\w+\s+in\s+section\.blocks")
for tf in sorted((ROOT / "templates").glob("*.json")):
    doc = json.loads(tf.read_text(encoding="utf-8"))
    for sec_id, sec in (doc.get("sections") or {}).items():
        stype = sec.get("type")
        sp = ROOT / "sections" / f"{stype}.liquid"
        if not sp.exists():
            continue
        raw = sp.read_text(encoding="utf-8")
        m = SCHEMA_RE.search(raw)
        has_block_schema = bool(m and json.loads(m.group(1)).get("blocks"))
        if has_block_schema and BLOCK_LOOP_RE.search(strip_schema(raw)) and not (sec.get("blocks") or {}):
            report["E. blocks駆動なのにblocks空(セクションが空表示)"].append(
                f"templates/{tf.name}: '{sec_id}' ({stype})"
            )


# --------------------------------------------------------------------------- #
# 出力
# --------------------------------------------------------------------------- #
for title in sorted(report):
    items = report[title]
    print("=" * 78)
    print(f"{title}  —  {len(items)} 件")
    print("=" * 78)
    for it in items:
        print("  ·", it)
    print()