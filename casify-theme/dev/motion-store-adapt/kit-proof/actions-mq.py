# shoot.py --actions snippet: proves the ?rm=1 matchMedia stub answers like a real reduce setting.
# Expected reduce state = Playwright emulation (variant "rm") or the harness switch (?rm=1).
r = page.evaluate("""() => {
  const q = s => matchMedia(s).matches;
  const out = {
    stubbed: !/native code/.test(String(window.matchMedia)),
    harnessRm: !!(window.__harness && window.__harness.rm),
    reduce: q('(prefers-reduced-motion: reduce)'),
    nopref: q('(prefers-reduced-motion: no-preference)'),
    bool: q('(prefers-reduced-motion)'),
    compoundNopref: q('(min-width: 1px) and (prefers-reduced-motion: no-preference)'),
    compoundReduce: q('(min-width: 1px) and (prefers-reduced-motion: reduce)'),
    notReduce: q('not all and (prefers-reduced-motion: reduce)'),
    gsap: null };
  if (window.gsap && gsap.matchMedia) {
    const ran = { nopref: false, reduce: false, ctx: null };
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => { ran.nopref = true; });
    mm.add('(prefers-reduced-motion: reduce)', () => { ran.reduce = true; });
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', rm: '(prefers-reduced-motion: reduce)' },
           c => { ran.ctx = { ok: c.conditions.ok, rm: c.conditions.rm }; });
    mm.revert();
    out.gsap = ran;
  }
  return out; }""")
log("mq", variant, json.dumps(r))
want_rm = variant == "rm" or r["harnessRm"]
expect(r["reduce"] is want_rm, f"(prefers-reduced-motion: reduce) should be {want_rm}: {r}")
expect(r["nopref"] is (not want_rm), f"(prefers-reduced-motion: no-preference) should be {not want_rm}: {r}")
expect(r["bool"] is want_rm, f"(prefers-reduced-motion) should be {want_rm}: {r}")
expect(r["compoundNopref"] is (not want_rm), f"compound no-preference should be {not want_rm}: {r}")
expect(r["compoundReduce"] is want_rm, f"compound reduce should be {want_rm}: {r}")
expect(r["notReduce"] is (not want_rm), f"not all and reduce should be {not want_rm}: {r}")
expect(r["gsap"] is not None, "gsap.matchMedia missing")
if r["gsap"]:
    expect(r["gsap"]["nopref"] is (not want_rm), f"gsap no-preference branch ran={r['gsap']['nopref']}, want {not want_rm}")
    expect(r["gsap"]["reduce"] is want_rm, f"gsap reduce branch ran={r['gsap']['reduce']}, want {want_rm}")
    expect(r["gsap"]["ctx"] == {"ok": not want_rm, "rm": want_rm}, f"gsap conditions {r['gsap']['ctx']}")
