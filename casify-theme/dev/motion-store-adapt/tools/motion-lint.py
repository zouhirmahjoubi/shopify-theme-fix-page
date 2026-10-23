#!/usr/bin/env python3
"""Motion rules for changed JS/CSS (and the <style>/<script> inside changed Liquid).

  python motion-lint.py                  files changed vs HEAD (git diff, read-only) + untracked, in
                                         assets/, sections/, snippets/, blocks/, layout/
  python motion-lint.py <files...>       these files
  python motion-lint.py --all            every assets/*.js and *.css plus Liquid (report; vendor skipped)

JS that calls gsap (errors):
  R1 no prefers-reduced-motion path
  R2 inits per root (document.querySelectorAll / querySelector) but no shopify:section:load listener
  R3 setInterval
  R4 more window scroll listeners than HEAD has (no new window.addEventListener('scroll'))
  R5 runtime CDN import (import ... 'https://', import('https://'), src='https://')
  R6 uses a GSAP plugin without feature-detecting it (typeof X / window.X / gsap.plugins check)
CSS (and Liquid <style>):
  R7 animation / @keyframes without a prefers-reduced-motion: reduce override (error)
  R8 opacity: 0 start state not scoped to .js / *-pending / [hidden] / a state class (flag;
     error only if the selector is new vs HEAD)
Exit 1 on any error.
"""
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
THEME = HERE.parent.parent.parent
VENDOR = re.compile(r"^(gsap.*|three.*|.*\.min)\.(js|css)$", re.I)
PLUGINS = ["ScrollTrigger", "SplitText", "Flip", "MotionPathPlugin", "DrawSVGPlugin", "CustomEase", "CustomBounce",
           "CustomWiggle", "Draggable", "InertiaPlugin", "ScrollToPlugin", "ScrambleTextPlugin", "TextPlugin", "Observer"]
SCOPED = re.compile(r"\.js\b|-pending|\[hidden\]|\.is-|\.has-|:not\(|\[aria-|\[data-state|:hover|:focus|"
                    r"\.no-js|@media|\[open\]|::?before|::?after|placeholder", re.I)


def git(*args):
    try:
        return subprocess.run(["git", *args], cwd=THEME, capture_output=True, text=True, encoding="utf-8",
                              errors="replace").stdout
    except Exception:  # noqa: BLE001
        return ""


def head_text(rel):
    return git("show", f"HEAD:{git('rev-parse', '--show-prefix').strip()}{rel}")


def changed():
    out = set()
    for line in git("diff", "--name-only", "HEAD", "--relative", "--", "assets", "sections", "snippets", "blocks", "layout").splitlines():
        out.add(line.strip())
    for line in git("ls-files", "--others", "--exclude-standard", "--", "assets", "sections", "snippets", "blocks", "layout").splitlines():
        out.add(line.strip())
    return sorted(p for p in out if p.endswith((".js", ".css", ".liquid")) and (THEME / p).exists())


def strip_js_comments(t):
    t = re.sub(r"/\*[\s\S]*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), t)
    return re.sub(r"(?m)(^|[^:\\'\"])//.*$", lambda m: m.group(1), t)


def lint_js(rel, text, issues, head):
    code = strip_js_comments(text)
    if not re.search(r"\bgsap\b", code):
        return
    def e(rule, msg):
        issues.append(("error", rel, rule, msg))
    if "prefers-reduced-motion" not in code:
        e("R1", "no prefers-reduced-motion path")
    if re.search(r"document\.querySelector(All)?\(", code) and "shopify:section:load" not in code:
        e("R2", "inits per root but has no shopify:section:load listener")
    for m in re.finditer(r"\bsetInterval\s*\(", code):
        e("R3", f"setInterval at line {code.count(chr(10), 0, m.start()) + 1}")
    pat = re.compile(r"window\.addEventListener\(\s*['\"]scroll['\"]")
    now = len(pat.findall(code))
    before = len(pat.findall(strip_js_comments(head))) if head else 0
    if now > before:
        e("R4", f"window scroll listeners {before} -> {now}")
    if re.search(r"import\s*(\(|[^;]*?from)\s*['\"]https?://|import\s*\(\s*['\"]https?://|\.src\s*=\s*['\"]https?://", code):
        e("R5", "runtime CDN import")
    for p in PLUGINS:
        if re.search(rf"\b{p}\b", code) and not re.search(
                rf"typeof\s+{p}\b|window\.{p}\b|gsap\.plugins\.\w*{p[0].lower()}|['\"]{p}['\"]\s*in\s+window|has\w*\(\s*['\"]{p}", code):
            e("R6", f"uses {p} without feature detection")


def css_rules(css):
    css = re.sub(r"/\*[\s\S]*?\*/", "", css)
    # flatten: yield (selector, body, inside_media) for simple rules; skip keyframes blocks
    out = []
    depth_stack = []
    i = 0
    sel_start = 0
    while i < len(css):
        c = css[i]
        if c == "{":
            head = css[sel_start:i].strip()
            depth_stack.append(head)
            sel_start = i + 1
        elif c == "}":
            if depth_stack:
                head = depth_stack.pop()
                body = css[sel_start:i]
                if not head.startswith("@") and not any(h.startswith("@keyframes") or h.startswith("@-webkit-keyframes") for h in depth_stack):
                    out.append((head, body, [h for h in depth_stack if h.startswith("@")]))
            sel_start = i + 1
        elif c == ";" and not depth_stack:
            sel_start = i + 1
        i += 1
    return out


def lint_css(rel, css, issues, head_css):
    has_anim = re.search(r"(^|[;{\s])animation(-name)?\s*:|@keyframes", css)
    if has_anim and not re.search(r"prefers-reduced-motion\s*:\s*reduce", css):
        issues.append(("error", rel, "R7", "animation/@keyframes without a prefers-reduced-motion: reduce override"))
    head_sels = {s for s, b, m in css_rules(head_css or "")}
    for sel, body, media in css_rules(css):
        if re.search(r"(^|[;\s{])opacity\s*:\s*0(\s*[;!}]|\s*$)", body) and not SCOPED.search(sel) \
                and not any("prefers-reduced-motion" in m or "print" in m for m in media):
            new = sel not in head_sels
            issues.append(("error" if new and head_css is not None else "flag", rel, "R8",
                           f"unscoped opacity:0 start state: {sel[:100]}{' (new)' if new and head_css is not None else ''}"))


def lint(rel, issues):
    p = THEME / rel
    text = p.read_text(encoding="utf-8", errors="replace")
    head = head_text(rel) or None
    if VENDOR.match(p.name):
        return
    if rel.endswith(".js"):
        lint_js(rel, text, issues, head)
    elif rel.endswith(".css"):
        lint_css(rel, text, issues, head)
    elif rel.endswith(".liquid"):
        styles = "\n".join(re.findall(r"<style[^>]*>([\s\S]*?)</style>|{%-?\s*style(?:sheet)?\s*-?%}([\s\S]*?){%-?\s*endstyle(?:sheet)?\s*-?%}", text) and
                           [a or b for a, b in re.findall(r"<style[^>]*>([\s\S]*?)</style>|{%-?\s*style(?:sheet)?\s*-?%}([\s\S]*?){%-?\s*endstyle(?:sheet)?\s*-?%}", text)])
        hstyles = None
        if head is not None:
            hstyles = "\n".join(a or b for a, b in re.findall(r"<style[^>]*>([\s\S]*?)</style>|{%-?\s*style(?:sheet)?\s*-?%}([\s\S]*?){%-?\s*endstyle(?:sheet)?\s*-?%}", head))
        if styles.strip():
            lint_css(rel, styles, issues, hstyles)
        scripts = "\n".join(re.findall(r"<script(?![^>]*type=\"application/(?:ld\+)?json\")[^>]*>([\s\S]*?)</script>", text))
        if scripts.strip():
            lint_js(rel, scripts, issues, None)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--all" in sys.argv:
        files = [p.relative_to(THEME).as_posix() for d, pat in (("assets", "*.js"), ("assets", "*.css"), ("sections", "*.liquid"),
                                                                ("snippets", "*.liquid"), ("blocks", "*.liquid"), ("layout", "*.liquid"))
                 for p in sorted((THEME / d).glob(pat))]
    elif args:
        files = []
        for a in args:
            p = Path(a)
            p = p if p.is_absolute() else (Path.cwd() / p)
            if not p.exists():
                p = THEME / a
            files.append(p.resolve().relative_to(THEME).as_posix())
    else:
        files = changed()
    issues = []
    for rel in files:
        lint(rel, issues)
    errs = [i for i in issues if i[0] == "error"]
    for level, rel, rule, msg in issues:
        print(f"  {'!' if level == 'error' else '~'} {rel} {rule}: {msg}")
    mode = "--all" if "--all" in sys.argv else ("files" if args else "changed vs HEAD")
    print(f"motion-lint ({mode}): {len(files)} files, {len(errs)} errors, {len(issues) - len(errs)} flags: "
          f"{'FAIL' if errs else 'PASS'}")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
