"""Self-test for the verification kit's theme-editor leak detector.

Runs shoot.py ?editor=4 on five probe pages and checks each verdict:
correct cleanup (AbortSignal, {once: true}, gsap.context revert) must PASS,
real leaks (a document listener, a ScrollTrigger) must FAIL.
A wrong verdict means the kit would either chase a leak that does not exist
or wave a real one through. Exit 0 only when all five verdicts are right.

Usage: python -I tools/kit-selftest.py
"""
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
EXPECT = {"signal": 0, "once": 0, "st-clean": 0, "leak": 1, "st-leak": 1}

bad = 0
for name, want in EXPECT.items():
    page = HERE / "negatives" / f"{name}.html"
    out = HERE.parent / "verify" / "kit-selftest" / name
    rc = subprocess.run(
        [sys.executable, "-I", str(HERE / "shoot.py"), str(page), "--out", str(out),
         "--only", "default", "--widths", "375", "--no-scroll", "--query", "editor=4"],
        capture_output=True, text=True,
    ).returncode
    ok = rc == want
    bad += not ok
    verdict = "PASS" if rc == 0 else "FAIL"
    expected = "PASS" if want == 0 else "FAIL"
    print(f"{'ok ' if ok else 'BAD'} {name:9} shoot={verdict} expected={expected}")

print("kit self-test:", "all verdicts right" if not bad else f"{bad} wrong verdict(s)")
sys.exit(1 if bad else 0)
