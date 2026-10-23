#!/usr/bin/env python3
"""Theme check against the clean baseline.

Copies the theme folders Shopify uploads (layout, sections, snippets, templates,
locales, config, blocks, assets) to a fresh temp dir, runs
`shopify theme check --output json` there (never on the theme root: dev/ holds
old theme copies that produce false errors), and compares the result with
dev/motion-store-adapt/theme-check-baseline-clean.json.

Offenses are matched by (file, check, severity) with counts, never by row,
because rows move when files are edited. Any error, or any (file, check) pair
whose count grew, is an unexpected new offense: exit 1.

  python tc-compare.py
  python tc-compare.py --allow-missing-keys ../locale-requests
  python tc-compare.py --keep --json-out report.json

--allow-missing-keys DIR  reads every DIR/*.json ({"dotted.key": "English", ...})
                          and treats TranslationKeyExists for those keys as
                          "pending" (expected until LOC-n runs), not as new.
"""
import argparse
import collections
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ADAPT = HERE.parent
THEME = ADAPT.parent.parent
BASELINE = ADAPT / "theme-check-baseline-clean.json"
FOLDERS = ["layout", "sections", "snippets", "templates", "locales", "config", "blocks", "assets"]
EXTRA_FILES = [".theme-check.yml"]


def rel_theme_path(p):
    """Turn an absolute path from any copy of the theme into 'sections/x.liquid'."""
    parts = re.split(r"[\\/]+", p)
    for i in range(len(parts) - 1, -1, -1):
        if parts[i] in FOLDERS and i < len(parts) - 1:
            # take the LAST theme folder that is followed by a file name
            return "/".join(parts[i:])
    return p.replace("\\", "/")


def flatten(report):
    rows = []
    for f in report:
        rel = rel_theme_path(f.get("path", ""))
        for o in f.get("offenses", []):
            rows.append({
                "file": rel,
                "check": o.get("check"),
                "severity": o.get("severity"),
                "line": (o.get("start_row") or 0) + 1,
                "message": o.get("message", ""),
            })
    return rows


def run_check(clean_dir):
    shopify = shutil.which("shopify") or shutil.which("shopify.cmd")
    if not shopify:
        sys.exit("tc-compare: the shopify CLI is not on PATH")
    cmd = [shopify, "theme", "check", "--path", str(clean_dir), "--output", "json"]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                          shell=(os.name == "nt" and shopify.lower().endswith((".cmd", ".bat"))))
    out = proc.stdout.strip()
    start = out.find("[")
    if start < 0:
        sys.stderr.write(proc.stdout + "\n" + proc.stderr + "\n")
        sys.exit("tc-compare: theme check printed no JSON")
    return json.loads(out[start:])


def requested_keys(folder):
    keys = set()
    for p in sorted(Path(folder).glob("*.json")):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"  ! cannot read {p}: {e}")
            continue
        if isinstance(data, dict):
            keys.update(data.keys())
    return keys


KEY_RE = re.compile(r"'([A-Za-z0-9_.\-]+)'")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--allow-missing-keys", metavar="DIR")
    ap.add_argument("--baseline", default=str(BASELINE))
    ap.add_argument("--theme", default=str(THEME))
    ap.add_argument("--keep", action="store_true", help="keep the temp copy and print its path")
    ap.add_argument("--json-out", help="write the full comparison as JSON here")
    a = ap.parse_args()

    theme = Path(a.theme)
    tmp = Path(tempfile.mkdtemp(prefix="tc-compare-"))
    clean = tmp / "theme"
    clean.mkdir()
    for d in FOLDERS:
        if (theme / d).is_dir():
            shutil.copytree(theme / d, clean / d)
    for f in EXTRA_FILES:
        if (theme / f).is_file():
            shutil.copy2(theme / f, clean / f)

    print(f"tc-compare: theme check on a clean copy of {', '.join(FOLDERS)}")
    current = flatten(run_check(clean))
    base = flatten(json.loads(Path(a.baseline).read_text(encoding="utf-8")))

    allowed = requested_keys(a.allow_missing_keys) if a.allow_missing_keys else set()

    base_count = collections.Counter((r["file"], r["check"], r["severity"]) for r in base)
    cur_by_pair = collections.defaultdict(list)
    for r in current:
        cur_by_pair[(r["file"], r["check"], r["severity"])].append(r)

    new, pending, known = [], [], []
    for pair, rows in sorted(cur_by_pair.items()):
        if pair[1] == "TranslationKeyExists" and allowed:
            keep = []
            for r in rows:
                keys = KEY_RE.findall(r["message"])
                if keys and keys[0] in allowed:
                    pending.append(r)
                else:
                    keep.append(r)
            rows = keep
        extra = len(rows) - base_count.get(pair, 0)
        if pair[2] == "error" or extra > 0:
            new.extend(rows)
        else:
            known.extend(rows)

    fixed = []
    for pair, n in base_count.items():
        got = len(cur_by_pair.get(pair, []))
        if got < n:
            fixed.append({"file": pair[0], "check": pair[1], "severity": pair[2], "baseline": n, "now": got})

    errors = sum(1 for r in current if r["severity"] == "error")
    warnings = sum(1 for r in current if r["severity"] == "warning")
    print(f"  current: {errors} errors, {warnings} warnings, {len(current)} offenses")
    print(f"  baseline: {sum(1 for r in base if r['severity']=='error')} errors, "
          f"{sum(1 for r in base if r['severity']=='warning')} warnings")
    if known:
        print(f"  known (in baseline): {len(known)}")
        for r in known:
            print(f"    = {r['file']}:{r['line']} {r['check']} ({r['severity']})")
    if pending:
        print(f"  pending locale keys (requested, expected until LOC runs): {len(pending)}")
        for r in pending:
            print(f"    ~ {r['file']}:{r['line']} {r['check']}: {r['message']}")
    if fixed:
        print(f"  gone since baseline: {len(fixed)}")
        for f in fixed:
            print(f"    - {f['file']} {f['check']} {f['baseline']} -> {f['now']}")
    if new:
        print(f"  NEW / UNEXPECTED: {len(new)}")
        for r in new:
            print(f"    ! {r['file']}:{r['line']} {r['check']} ({r['severity']}): {r['message']}")
    else:
        print("  no new offenses")

    if a.json_out:
        Path(a.json_out).write_text(json.dumps({"new": new, "pending": pending, "known": known, "fixed": fixed,
                                                "errors": errors, "warnings": warnings}, indent=2), encoding="utf-8")
    if a.keep:
        print(f"  clean copy kept at {clean}")
    else:
        shutil.rmtree(tmp, ignore_errors=True)
    result = "FAIL" if new else "PASS"
    print(f"tc-compare: {result}")
    return 1 if new else 0


if __name__ == "__main__":
    sys.exit(main())
