#!/usr/bin/env python3
"""Validate section/block schemas and the JSON templates and section groups that use them.

  python schema-validate.py            whole theme
  python schema-validate.py --quiet    errors only

Checks:
  - every {% schema %} in sections/ and blocks/ parses as JSON; duplicate setting ids or block types
  - range: default present, inside min..max, on the step grid, at most 101 steps
  - select/radio: default is one of the option values
  - enabled_on / disabled_on: objects with only "templates"/"groups" string lists, never both keys
  - templates/*.json and sections/*.json groups (leading /* */ comment stripped): every section type
    exists; every stored setting id exists in that schema; every block type is declared (or @app /
    @theme allowed); stored block setting ids exist; block_order / order entries exist
Exit 1 on any error.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
THEME = HERE.parent.parent.parent
SCHEMA = re.compile(r"{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}")
errors, notes = [], []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def load_schema(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    m = SCHEMA.search(text)
    if not m:
        return None
    line = text.count("\n", 0, m.start(1)) + 1
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        err(f"{path.relative_to(THEME).as_posix()}:{line + e.lineno - 1}", f"schema JSON: {e.msg}")
        return None


def check_settings(where, settings):
    seen = set()
    for s in settings or []:
        sid = s.get("id")
        t = s.get("type")
        if sid:
            if sid in seen:
                err(where, f"duplicate setting id '{sid}'")
            seen.add(sid)
        if t == "range":
            mn, mx, st = s.get("min"), s.get("max"), s.get("step", 1)
            d = s.get("default")
            if d is None:
                err(where, f"range '{sid}' has no default")
            elif mn is not None and mx is not None:
                if not (mn <= d <= mx):
                    err(where, f"range '{sid}' default {d} outside {mn}..{mx}")
                elif st and abs(((d - mn) / st) - round((d - mn) / st)) > 1e-6:
                    err(where, f"range '{sid}' default {d} not on step {st} from {mn}")
                if st and (mx - mn) / st > 101:
                    err(where, f"range '{sid}' has {(mx - mn) / st:.0f} steps (max 101)")
        if t in ("select", "radio") and "default" in s:
            vals = [o.get("value") for o in s.get("options", [])]
            if s["default"] not in vals:
                err(where, f"{t} '{sid}' default '{s['default']}' not in options {vals}")


def check_enabled(where, sch):
    if "enabled_on" in sch and "disabled_on" in sch:
        err(where, "both enabled_on and disabled_on")
    for k in ("enabled_on", "disabled_on"):
        if k in sch:
            v = sch[k]
            if not isinstance(v, dict) or set(v) - {"templates", "groups"}:
                err(where, f"{k} must be an object with only templates/groups")
                continue
            for kk, lst in v.items():
                if not isinstance(lst, list) or not all(isinstance(x, str) for x in lst):
                    err(where, f"{k}.{kk} must be a list of strings")


def schema_index():
    out = {"sections": {}, "blocks": {}}
    for kind in ("sections", "blocks"):
        for p in sorted((THEME / kind).glob("*.liquid")):
            sch = load_schema(p)
            where = p.relative_to(THEME).as_posix()
            if sch is None:
                continue
            out[kind][p.stem] = sch
            check_settings(where, sch.get("settings"))
            check_enabled(where, sch)
            types = [b.get("type") for b in sch.get("blocks", [])]
            for t in {t for t in types if types.count(t) > 1}:
                err(where, f"duplicate block type '{t}'")
            for b in sch.get("blocks", []):
                check_settings(f"{where} block '{b.get('type')}'", b.get("settings"))
    return out


def check_blocks(where, blocks, order, sch, idx):
    declared = {b.get("type"): b for b in sch.get("blocks", [])}
    theme_ok = "@theme" in declared
    for bid in order or []:
        if bid not in (blocks or {}):
            err(where, f"block_order lists '{bid}' which is not in blocks")
    for bid, b in (blocks or {}).items():
        t = b.get("type", "")
        bw = f"{where} block '{bid}' ({t})"
        if t.startswith("shopify://apps/"):
            if "@app" not in declared:
                err(bw, "app block but the schema has no @app")
            continue
        if t in declared and "settings" in declared[t]:
            ids = {s.get("id") for s in declared[t].get("settings", []) if s.get("id")}
            for k in (b.get("settings") or {}):
                if k not in ids:
                    err(bw, f"setting '{k}' not in block schema")
        elif t in idx["blocks"] and (theme_ok or t in declared):
            bs = idx["blocks"][t]
            ids = {s.get("id") for s in bs.get("settings", []) if s.get("id")}
            for k in (b.get("settings") or {}):
                if k not in ids:
                    err(bw, f"setting '{k}' not in blocks/{t}.liquid")
            check_blocks(bw, b.get("blocks"), b.get("block_order"), bs, idx)
        elif t not in declared:
            err(bw, "block type not declared in the section schema")


def check_json(path, idx):
    rel = path.relative_to(THEME).as_posix()
    text = re.sub(r"^﻿?\s*/\*[\s\S]*?\*/", "", path.read_text(encoding="utf-8", errors="replace"))
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        err(rel, f"JSON: {e.msg} line {e.lineno}")
        return
    secs = data.get("sections", {})
    for sid in data.get("order", []):
        if sid not in secs:
            err(rel, f"order lists '{sid}' which is not in sections")
    for sid, s in secs.items():
        t = s.get("type", "")
        where = f"{rel} section '{sid}' ({t})"
        if t.startswith("_") or t == "apps" and "apps" not in idx["sections"]:
            continue
        sch = idx["sections"].get(t)
        if sch is None:
            err(where, "section file missing or schema unreadable")
            continue
        ids = {x.get("id") for x in sch.get("settings", []) if x.get("id")}
        for k in (s.get("settings") or {}):
            if k not in ids:
                err(where, f"setting '{k}' not in schema")
        check_blocks(where, s.get("blocks"), s.get("block_order"), sch, idx)


def main():
    quiet = "--quiet" in sys.argv
    idx = schema_index()
    files = sorted((THEME / "templates").glob("*.json")) + sorted((THEME / "sections").glob("*.json"))
    for p in files:
        check_json(p, idx)
    print(f"schema-validate: {len(idx['sections'])} section schemas, {len(idx['blocks'])} block schemas, "
          f"{len(files)} templates/groups")
    for e in errors:
        print(f"  ! {e}")
    if not quiet:
        for n in notes:
            print(f"  - {n}")
    print(f"schema-validate: {len(errors)} errors: {'FAIL' if errors else 'PASS'}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
