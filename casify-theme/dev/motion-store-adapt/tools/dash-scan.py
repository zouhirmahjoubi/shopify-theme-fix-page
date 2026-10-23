#!/usr/bin/env python3
"""Find en dashes (U+2013) and em dashes (U+2014) in shopper copy.

  python dash-scan.py                 whole theme, report only (exit 0)
  python dash-scan.py <files...>      unit mode: exit 1 on any SHOPPER hit in these files
  python dash-scan.py --check-7g      assert the STORE-FACTS 7g counts (exit 1 if they differ)
  python dash-scan.py --strict        whole theme, exit 1 on any shopper hit

Matches the characters, the entities &ndash; &mdash; &#8211; &#8212; and JSON escapes \\u2013 \\u2014.
Counts are occurrences (one string can hold two).

Shopper copy (blocking):
  Liquid text outside {% comment %}, {% doc %}, {% schema %}, HTML comments, and CSS/JS comments
  schema "default" values and every preset value except preset "name"/"category"
  templates/*.json and sections/*.json group values; locales/*.json (not *.schema.json)
  string literals in assets/*.js (vendor gsap*/three*/*.min.js skipped; comments skipped)
Editor copy (listed, not blocking): schema names, labels, info, content, placeholder, option labels,
  preset names; HTML comments in Liquid; locales/*.schema.json.
"""
import argparse
import collections
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
THEME = HERE.parent.parent.parent
DASH = re.compile(r"[\u2013\u2014]|&[nm]dash;|&#821[12];|\\u201[34]", re.I)
SKIP_JS = re.compile(r"^(gsap.*|three.*|.*\.min)\.js$", re.I)
EXPECT_7G = {"locales/en.default.json": 4, "templates/index.json": 26, "templates/product.json": 4,
             "templates/page.campaign-guide.json": 2, "templates/page.json": 2, "templates/search.json": 1}


def blank(m):
    return re.sub(r"[^\n]", " ", m.group(0))


def liquid_scan(path, text):
    shopper, editor = [], []
    # schema handled separately
    schema = re.search(r"{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}", text)
    work = text
    if schema:
        start_line = text.count("\n", 0, schema.start(1))
        shopper_s, editor_s = schema_scan(schema.group(1), start_line)
        shopper += shopper_s
        editor += editor_s
        work = text[:schema.start()] + blank(schema) + text[schema.end():]
    work = re.sub(r"{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}", blank, work)
    work = re.sub(r"{%-?\s*doc\s*-?%}[\s\S]*?{%-?\s*enddoc\s*-?%}", blank, work)
    work = re.sub(r"{%-?\s*liquid\b[\s\S]*?-?%}", lambda m: re.sub(
        r"(?m)^\s*comment\b[\s\S]*?^\s*endcomment\b|^\s*#.*$", blank, m.group(0)), work)
    # HTML comments are editor-only
    for m in re.finditer(r"<!--[\s\S]*?-->", work):
        for d in DASH.finditer(m.group(0)):
            editor.append((work.count("\n", 0, m.start() + d.start()) + 1, "html comment", line_of(work, m.start() + d.start())))
    work = re.sub(r"<!--[\s\S]*?-->", blank, work)
    # CSS / JS comments inside <style>/<script>/{% style %}/{% stylesheet %}/{% javascript %}
    def strip_code_comments(m):
        body = re.sub(r"/\*[\s\S]*?\*/", blank, m.group(0))
        return re.sub(r"(?m)(^|[^:\"'\\])//.*$", lambda x: x.group(1) + " " * (len(x.group(0)) - len(x.group(1))), body)
    work = re.sub(r"<(style|script)\b[\s\S]*?</\1>", strip_code_comments, work, flags=re.I)
    work = re.sub(r"{%-?\s*(style|stylesheet|javascript)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}", strip_code_comments, work)
    for d in DASH.finditer(work):
        shopper.append((work.count("\n", 0, d.start()) + 1, "liquid text", line_of(work, d.start())))
    return shopper, editor


def line_of(text, pos):
    s = text.rfind("\n", 0, pos) + 1
    e = text.find("\n", pos)
    return text[s:e if e >= 0 else None].strip()[:140]


def schema_scan(body, base_line):
    shopper, editor = [], []
    lines = body.split("\n")
    presets_from = None
    for i, l in enumerate(lines):
        if re.search(r'"presets"\s*:', l):
            presets_from = i
    for i, l in enumerate(lines):
        for d in DASH.finditer(l):
            key = re.findall(r'"([A-Za-z_]+)"\s*:\s*"', l[:d.start()])
            key = key[-1] if key else ""
            in_presets = presets_from is not None and i >= presets_from
            ln = base_line + i + 1
            if key == "default" or (in_presets and key not in ("name", "category")):
                shopper.append((ln, f"schema {'preset' if in_presets else 'default'}", l.strip()[:140]))
            else:
                editor.append((ln, f"schema {key or 'text'}", l.strip()[:140]))
    return shopper, editor


def json_scan(path, text, editor_only=False):
    out = []
    for i, l in enumerate(text.split("\n")):
        for d in DASH.finditer(l):
            out.append((i + 1, "json value", l.strip()[:140]))
    return ([], out) if editor_only else (out, [])


def js_scan(text):
    """String literals only; comments skipped. Template literals counted as strings."""
    hits = []
    i, n, line = 0, len(text), 1
    while i < n:
        c = text[i]
        if c == "\n":
            line += 1
            i += 1
        elif text.startswith("//", i):
            j = text.find("\n", i)
            i = n if j < 0 else j
        elif text.startswith("/*", i):
            j = text.find("*/", i + 2)
            j = n if j < 0 else j + 2
            line += text.count("\n", i, j)
            i = j
        elif c in "'\"`":
            j = i + 1
            while j < n and text[j] != c:
                if text[j] == "\\":
                    j += 1
                elif text[j] == "\n" and c != "`":
                    break
                j += 1
            lit = text[i:j + 1]
            for d in DASH.finditer(lit):
                hits.append((line + lit.count("\n", 0, d.start()), "js string", lit[:120]))
            line += lit.count("\n")
            i = j + 1
        else:
            i += 1
    return hits


def scan(path):
    rel = path.relative_to(THEME).as_posix() if path.is_absolute() and THEME in path.parents else path.as_posix()
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix == ".liquid":
        return rel, *liquid_scan(path, text)
    if path.suffix == ".json":
        body = re.sub(r"^\ufeff?\s*/\*[\s\S]*?\*/", blank, text)
        if rel.startswith("config/"):
            return rel, [], []
        return rel, *json_scan(path, body, editor_only=path.name.endswith(".schema.json"))
    if path.suffix == ".js":
        if SKIP_JS.match(path.name):
            return rel, [], []
        return rel, js_scan(text), []
    return rel, [], []


def theme_files():
    for d, pat in (("layout", "*.liquid"), ("sections", "*.liquid"), ("snippets", "*.liquid"), ("blocks", "*.liquid"),
                   ("templates", "*.liquid"), ("templates", "*.json"), ("sections", "*.json"), ("locales", "*.json"),
                   ("assets", "*.js")):
        yield from sorted((THEME / d).glob(pat))


def resolve_arg(f):
    """A file argument: absolute, relative to the cwd, or relative to the theme root (in that order).
    Resolve only after choosing, so "sections/x.liquid" run from tools/ is not pinned to tools/."""
    p = Path(f)
    if p.is_absolute():
        return p
    if p.exists():
        return p.resolve()
    t = THEME / p
    if t.exists():
        return t.resolve()
    sys.exit(f"dash-scan: {f} not found (tried {Path.cwd() / p} and {t})")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*")
    ap.add_argument("--check-7g", action="store_true")
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--quiet", action="store_true", help="counts only")
    a = ap.parse_args()

    unit = bool(a.files)
    files = [resolve_arg(f) for f in a.files] if unit else list(theme_files())
    counts = collections.Counter()
    ecounts = collections.Counter()
    shopper_total = 0
    for f in files:
        rel, shopper, editor = scan(f)
        counts[rel] += len(shopper)
        ecounts[rel] += len(editor)
        shopper_total += len(shopper)
        if not a.quiet:
            for ln, kind, ctx in shopper:
                print(f"SHOPPER {rel}:{ln} [{kind}] {ctx}")
            if unit:
                for ln, kind, ctx in editor:
                    print(f"editor  {rel}:{ln} [{kind}] {ctx}")
    print("\nshopper hits by file:")
    for rel, n in sorted(counts.items()):
        if n:
            print(f"  {n:4}  {rel}")
    print(f"shopper total: {shopper_total} in {sum(1 for n in counts.values() if n)} files; "
          f"editor-only: {sum(ecounts.values())} in {sum(1 for n in ecounts.values() if n)} files")
    rc = 0
    if a.check_7g:
        print("\nSTORE-FACTS 7g check:")
        for rel, want in EXPECT_7G.items():
            got = counts.get(rel, 0)
            ok = got == want
            rc |= 0 if ok else 1
            print(f"  {'ok  ' if ok else 'DIFF'} {rel}: expected {want}, found {got}")
        others = {r: n for r, n in counts.items() if n and (r.startswith("templates/") or r.startswith("locales/")) and r not in EXPECT_7G}
        for r, n in others.items():
            print(f"  DIFF {r}: not in 7g, found {n}")
            rc = 1
        print(f"dash-scan 7g: {'PASS' if rc == 0 else 'FAIL'}")
    elif unit or a.strict:
        rc = 1 if shopper_total else 0
        print(f"dash-scan: {'FAIL' if rc else 'PASS'}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
