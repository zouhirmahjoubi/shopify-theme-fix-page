# INF-3 requests (changes outside the INF-3 file list)

## assets/cv-pdp-counter-motion.js (owner: U1.1)

While the counter motion claims `'pdp'` (and `'set'`), `cv-commerce-motion.js` does not fly for
those adds, so it also does not call `CasifyBag.receive()`. The badge still bumps (cv-header.js
observer), but the bag icon does not squash when the counter's own token lands.

Request, either one:

1. Preferred (U1.1): delegate the counter fly to `window.CasifyMotion.fly(fromEl, { img, qty })`
   and drop the counter's own token. Then the module calls `receive()` itself and the claim is
   no longer needed (`CasifyMotion.release('pdp')`).
2. Minimal: where the counter token finishes its flight, call
   `window.CasifyBag && window.CasifyBag.receive()` once.

Proof hook: `harness/inf-3-counter-claim.html` with `harness/inf-3/actions-counter.py`.
