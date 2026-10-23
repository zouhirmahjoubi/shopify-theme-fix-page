#!/usr/bin/env python3
"""Screenshot a harness page with Playwright (dev only).

  python shoot.py <page.html> --out <dir> [--rm] [--nojs] [--actions snippet.py]
                  [--query "fail=1&editor=1"] [--widths 375,768,1440] [--settle 1800] [--no-scroll]

Serves the theme root over HTTP on 127.0.0.1 (module scripts and fetch need http, not file://),
opens <page.html> and saves full-page screenshots at each width:
  <dir>/default-<w>.png   motion allowed, JavaScript on
  <dir>/rm-<w>.png        --rm: emulated prefers-reduced-motion: reduce, plus ?rm=1
  <dir>/nojs-<w>.png      --nojs: JavaScript disabled in the browser, plus ?nojs=1
Before each full-page shot the page is scrolled top to bottom once so scroll-triggered entrances
finish, then back to the top (skip with --no-scroll).

--actions FILE runs a Python snippet once per (variant, width) after the full-page shot, with:
  page, context, variant ("default" | "rm" | "nojs"), width, out (Path),
  shot(name, full=False) -> saves <variant>-<width>-<name>.png,
  log(*parts) -> appended to the run's "actions_log", wait(ms), calls() -> window.__calls,
  expect(cond, message) -> records a failed expectation (exit 1).
--query adds a query string (stub-fetch.js reads ?fail=1, the harness reads ?editor=1).
With editor in the query the shot waits for html[data-harness-editor="done"]. The harness takes
the listener baseline after editor cycle 1 settles and runs at least 2 cycles; each window/document
listener that grows from cycle 1 to the last cycle is a leak and fails the run (--allow-leak REGEX
accepts a known one). Growth from load to cycle 1 (a lazy library, an async first boot) is printed
as "first registration" and never fails. Add trace=1 to the query for caller file:line per add/remove.

Writes <dir>/console.json: per run the console errors and warnings, page errors, failed or 4xx/5xx
requests, window.__calls, window.__harness results and the actions log.
Exit 1 on any page error, any console error, any failed request or 4xx/5xx response (a missing
assets/*.js is a 404), any exception in the actions snippet, any failed expect(), or any editor
listener leak (growth from cycle 1 to cycle N).
An expected one can be allowed with --allow-console REGEX / --allow-net REGEX (repeatable,
matched with re.search on the console text / the request URL); allowed ones are kept in
console.json under "allowed" and do not fail the run. Stubbed fetch answers (stub-fetch.js fail
mode) never reach the network, so they are not counted.
"""
import argparse
import functools
import http.server
import json
import re
import socketserver
import sys
import threading
import time
import traceback
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
THEME = HERE.parent.parent.parent
HEIGHTS = {375: 812, 768: 1024, 1440: 900}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


QuietHandler.extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                               ".js": "text/javascript", ".mjs": "text/javascript", ".webp": "image/webp",
                               ".json": "application/json", ".svg": "image/svg+xml"}


def serve(root):
    handler = functools.partial(QuietHandler, directory=str(root))
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("html")
    ap.add_argument("--out", required=True)
    ap.add_argument("--rm", action="store_true", help="add the reduced-motion variant")
    ap.add_argument("--nojs", action="store_true", help="add the JavaScript-disabled variant")
    ap.add_argument("--actions", help="python snippet run per variant and width")
    ap.add_argument("--query", default="", help="extra query string, e.g. fail=1 or editor=1")
    ap.add_argument("--widths", default="375,768,1440")
    ap.add_argument("--settle", type=int, default=1800, help="ms to wait after load")
    ap.add_argument("--no-scroll", action="store_true")
    ap.add_argument("--only", help="comma list of variants to run (default,rm,nojs)")
    ap.add_argument("--allow-console", action="append", default=[], metavar="REGEX",
                    help="console error text that is expected (does not fail the run)")
    ap.add_argument("--allow-net", action="append", default=[], metavar="REGEX",
                    help="request URL whose failure or 4xx/5xx is expected (does not fail the run)")
    ap.add_argument("--allow-leak", action="append", default=[], metavar="REGEX",
                    help="editor listener growth line that is expected (does not fail the run)")
    a = ap.parse_args()
    allow_console = [re.compile(x) for x in a.allow_console]
    allow_net = [re.compile(x) for x in a.allow_net]
    allow_leak = [re.compile(x) for x in a.allow_leak]

    page_path = Path(a.html).resolve()
    try:
        rel = page_path.relative_to(THEME)
    except ValueError:
        sys.exit(f"shoot: {page_path} is not inside the theme root {THEME}")
    out = Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    widths = [int(w) for w in a.widths.split(",") if w.strip()]
    snippet = Path(a.actions).read_text(encoding="utf-8") if a.actions else None

    variants = [("default", {"reduced_motion": "no-preference", "java_script_enabled": True}, "")]
    if a.rm:
        variants.append(("rm", {"reduced_motion": "reduce", "java_script_enabled": True}, "rm=1"))
    if a.nojs:
        variants.append(("nojs", {"reduced_motion": "no-preference", "java_script_enabled": False}, "nojs=1"))
    if a.only:
        keep = set(a.only.split(","))
        variants = [v for v in variants if v[0] in keep]

    httpd = serve(THEME)
    base = f"http://127.0.0.1:{httpd.server_address[1]}/" + quote(rel.as_posix())
    report = {"page": str(page_path), "query": a.query, "runs": [], "shots": []}
    failed = False

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for name, ctx_opts, q in variants:
            for w in widths:
                query = "&".join(x for x in (a.query, q) if x)
                url = base + ("?" + query if query else "")
                ctx = browser.new_context(viewport={"width": w, "height": HEIGHTS.get(w, 900)}, **ctx_opts)
                page = ctx.new_page()
                run = {"variant": name, "width": w, "url": url, "console": [], "pageErrors": [], "network": [],
                       "actions_log": [], "expect_failed": [], "calls": None, "harness": None}
                page.on("console", lambda m, run=run: run["console"].append(
                    {"type": m.type, "text": m.text, "location": m.location}) if m.type in ("error", "warning") else None)
                page.on("pageerror", lambda e, run=run: run["pageErrors"].append(str(e)))
                page.on("requestfailed", lambda r, run=run: run["network"].append(
                    {"url": r.url, "failure": r.failure}))
                page.on("response", lambda r, run=run: run["network"].append(
                    {"url": r.url, "status": r.status}) if r.status >= 400 else None)
                try:
                    page.goto(url, wait_until="load", timeout=45000)
                except Exception as e:  # noqa: BLE001
                    run["pageErrors"].append(f"navigation: {e}")
                page.wait_for_timeout(a.settle)
                js = ctx_opts["java_script_enabled"]
                if js and "editor" in query:
                    try:
                        m = re.search(r"(?:^|&)editor=(\d+)", query)
                        cycles = max(int(m.group(1)) if m else 2, 2)
                        # The harness waits editorSettle after cycle 1 and after the last cycle.
                        s = re.search(r"(?:^|&)editorSettle=(\d+)", query)
                        settle = int(s.group(1)) if s else 1700
                        page.wait_for_selector('html[data-harness-editor="done"]', state="attached",
                                               timeout=15000 + cycles * 700 + 2 * settle)
                    except Exception as e:  # noqa: BLE001
                        run["pageErrors"].append(f"editor cycle did not finish: {e}")
                if js and not a.no_scroll:
                    page.evaluate("""async () => {
                        const step = Math.max(200, innerHeight * 0.7);
                        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
                            scrollTo(0, y); await new Promise(r => setTimeout(r, 120));
                        }
                        scrollTo(0, 0);
                    }""")
                    page.wait_for_timeout(700)
                shot_path = out / f"{name}-{w}.png"
                # Parallel runs can make a tall full-page capture slow; fall back to the
                # viewport and record why, rather than crash before console.json is written.
                try:
                    page.screenshot(path=str(shot_path), full_page=True, timeout=90000)
                except Exception as e:  # noqa: BLE001
                    run["pageErrors"].append(f"full-page screenshot failed, viewport only: {e}")
                    page.screenshot(path=str(shot_path), full_page=False, timeout=60000)
                report["shots"].append(str(shot_path))

                if snippet:
                    def shot(label, full=False, _n=name, _w=w, _p=page):
                        p = out / f"{_n}-{_w}-{label}.png"
                        _p.screenshot(path=str(p), full_page=full)
                        report["shots"].append(str(p))
                        return p

                    def log(*parts, _run=run):
                        _run["actions_log"].append(" ".join(str(x) for x in parts))

                    def expect(cond, message, _run=run):
                        if not cond:
                            _run["expect_failed"].append(message)

                    env = {"page": page, "context": ctx, "variant": name, "width": w, "out": out, "shot": shot,
                           "log": log, "wait": page.wait_for_timeout, "expect": expect, "json": json,
                           "calls": (lambda _p=page: _p.evaluate("() => window.__calls || []") if js else [])}
                    try:
                        exec(compile(snippet, a.actions, "exec"), env)
                    except Exception:  # noqa: BLE001
                        run["pageErrors"].append("actions: " + traceback.format_exc(limit=3))
                if js:
                    try:
                        run["calls"] = page.evaluate("() => window.__calls || null")
                        run["harness"] = page.evaluate("""() => window.__harness ? {
                            rm: window.__harness.rm, nojs: window.__harness.nojs, editor: window.__harness.editor,
                            errors: window.__harness.errors, editorResult: window.__harness.editorResult || null,
                            htmlClass: document.documentElement.className } : null""")
                    except Exception as e:  # noqa: BLE001
                        run["harness"] = {"error": str(e)}
                else:
                    # page.evaluate still works with page JavaScript disabled (it runs in the driver).
                    try:
                        run["harness"] = {"htmlClass": page.evaluate("() => document.documentElement.className")}
                    except Exception as e:  # noqa: BLE001
                        run["harness"] = {"htmlClass": None, "error": str(e)}
                run["consoleErrors"], run["netErrors"], run["allowed"] = [], [], []
                for c in run["console"]:
                    if c["type"] != "error":
                        continue
                    (run["allowed"] if any(rx.search(c["text"]) for rx in allow_console)
                     else run["consoleErrors"]).append(c["text"])
                for n in run["network"]:
                    desc = f"{n.get('status') or n.get('failure')} {n['url']}"
                    (run["allowed"] if any(rx.search(n["url"]) for rx in allow_net)
                     else run["netErrors"]).append(desc)
                # Editor cycle: the harness baselines listeners after cycle 1 and lists only growth from
                # cycle 1 to the last cycle (a per-load leak). Each such line fails the run.
                run["leaks"] = []
                er = (run.get("harness") or {}).get("editorResult") if isinstance(run.get("harness"), dict) else None
                if er:
                    for g in er.get("grew") or []:
                        (run["allowed"] if any(rx.search(g) for rx in allow_leak) else run["leaks"]).append(g)
                if (run["pageErrors"] or run["expect_failed"] or run["consoleErrors"] or run["netErrors"]
                        or run["leaks"]):
                    failed = True
                report["runs"].append(run)
                ctx.close()
        browser.close()
    httpd.shutdown()

    report["pageErrorCount"] = sum(len(r["pageErrors"]) for r in report["runs"])
    report["consoleErrorCount"] = sum(len(r["consoleErrors"]) for r in report["runs"])
    report["netErrorCount"] = sum(len(r["netErrors"]) for r in report["runs"])
    report["allowedCount"] = sum(len(r["allowed"]) for r in report["runs"])
    report["expectFailedCount"] = sum(len(r["expect_failed"]) for r in report["runs"])
    report["leakCount"] = sum(len(r.get("leaks") or []) for r in report["runs"])
    (out / "console.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    for r in report["runs"]:
        print(f"  {r['variant']:7} {r['width']:>4}px  page errors {len(r['pageErrors'])}  "
              f"console errors {len(r['consoleErrors'])}  net errors {len(r['netErrors'])}  "
              f"failed expects {len(r['expect_failed'])}  allowed {len(r['allowed'])}  calls {len(r['calls'] or [])}")
        for e in r["pageErrors"]:
            print(f"      ! {e.splitlines()[0][:200]}")
        for e in r["consoleErrors"]:
            print(f"      ! console: {e.splitlines()[0][:200] if e else e}")
        for e in r["netErrors"]:
            print(f"      ! net: {e[:200]}")
        for e in r["expect_failed"]:
            print(f"      ! expect: {e}")
        er = (r.get("harness") or {}).get("editorResult") if isinstance(r.get("harness"), dict) else None
        if er:
            print(f"      editor: requested {er.get('requested')}, ran {er.get('cycles')} cycles, baseline "
                  f"{er.get('baseline')}; grew {len(er.get('grew') or [])}; stuck {len(er.get('stuck') or [])}; "
                  f"first registration (load -> cycle 1, not a leak): {', '.join(er.get('firstRegistration') or []) or 'none'}")
        for e in r.get("leaks") or []:
            print(f"      ! leak: {e}")
    print(f"shoot: {len(report['shots'])} screenshots in {out}; console.json written; "
          f"{'FAIL' if failed else 'PASS'}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
