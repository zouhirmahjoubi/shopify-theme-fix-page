#!/usr/bin/env python3
"""Check that Liquid block tags are balanced.

  python liquid-balance.py                 every .liquid file in layout, sections, snippets, blocks, templates
  python liquid-balance.py <files...>      only these files

Balances if/unless/case/for/tablerow/capture/comment/doc/form/paginate/style/stylesheet/javascript/
schema/raw, including the lines of {%- liquid -%} tags (one tag per line, `#` comments, nested
comment...endcomment). else/elsif/when must sit inside a matching block. comment, doc, raw, schema,
javascript and stylesheet bodies are opaque. Exit 1 on any imbalance, with file:line.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
THEME = HERE.parent.parent.parent
BLOCKS = {"if", "unless", "case", "for", "tablerow", "capture", "comment", "doc", "form", "paginate",
          "style", "stylesheet", "javascript", "schema", "raw"}
OPAQUE = {"comment", "doc", "raw", "schema", "javascript", "stylesheet"}
MIDDLE = {"else": {"if", "unless", "case", "for"}, "elsif": {"if", "unless"}, "when": {"case"}}
TAG = re.compile(r"{%-?\s*(\w+)?([\s\S]*?)-?%}")


def check(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    errs = []
    stack = []  # (name, line)

    def handle(name, line):
        if not name:
            return
        if stack and stack[-1][0] in OPAQUE:
            if name == "end" + stack[-1][0]:
                stack.pop()
            elif name == stack[-1][0] == "comment":
                stack.append((name, line))  # nested comments count
            return
        if name in BLOCKS:
            stack.append((name, line))
        elif name.startswith("end") and name[3:] in BLOCKS:
            want = name[3:]
            if not stack:
                errs.append(f"{line}: {{% {name} %}} with nothing open")
            elif stack[-1][0] != want:
                errs.append(f"{line}: {{% {name} %}} closes {{% {stack[-1][0]} %}} opened at line {stack[-1][1]}")
                # recover: pop to the matching opener if there is one
                for k in range(len(stack) - 1, -1, -1):
                    if stack[k][0] == want:
                        del stack[k:]
                        break
            else:
                stack.pop()
        elif name in MIDDLE:
            if not stack or stack[-1][0] not in MIDDLE[name]:
                errs.append(f"{line}: {{% {name} %}} outside {'/'.join(sorted(MIDDLE[name]))}")

    for m in TAG.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        name = m.group(1) or ""
        if stack and stack[-1][0] in OPAQUE and name != "end" + stack[-1][0] and not (name == "comment" == stack[-1][0]):
            continue
        if name == "liquid":
            body = m.group(2)
            for k, raw in enumerate(body.split("\n")):
                t = raw.strip()
                if not t:
                    continue
                if stack and stack[-1][0] == "comment":
                    w = t.split()[0]
                    if w in ("endcomment", "comment"):
                        handle(w, line + k)
                    continue
                if t.startswith("#"):
                    continue
                handle(re.match(r"\w+", t).group(0) if re.match(r"\w+", t) else "", line + k)
        else:
            handle(name, line)
    for name, line in stack:
        errs.append(f"{line}: {{% {name} %}} never closed")
    return errs


def main():
    files = [Path(f) for f in sys.argv[1:]]
    if not files:
        files = [p for d in ("layout", "sections", "snippets", "blocks", "templates") for p in sorted((THEME / d).glob("*.liquid"))]
    files = [f if f.exists() else THEME / f for f in files]
    bad = 0
    for f in files:
        errs = check(f)
        rel = f.resolve().relative_to(THEME).as_posix() if THEME in f.resolve().parents else str(f)
        for e in errs:
            ln, msg = e.split(": ", 1)
            print(f"  ! {rel}:{ln} {msg}")
        bad += 1 if errs else 0
    print(f"liquid-balance: {len(files)} files, {bad} unbalanced: {'FAIL' if bad else 'PASS'}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
