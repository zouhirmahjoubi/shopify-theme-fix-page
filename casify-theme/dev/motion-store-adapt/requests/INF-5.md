# INF-5 requests (changes outside INF-5's files)

1. U2.x ribbon (sections/cv-pdp-ribbon.liquid): optionally print
   `<button type="button" class="cvw-ribbon__pause" data-cvw-ribbon-pause hidden aria-label="{{ 'sections.pdp_ribbon.pause' | t }}">`
   with the two icons (`svg.is-pause`, `svg.is-play`). If absent, JS makes one with the English label
   "Pause the moving ribbon" (or the root's `data-i18n-pause`). JS un-hides it only while the marquee runs.
   Locale key filed in `locale-requests/INF-5.json`.
2. U2.4 journey: print `data-cvw-pin="{{ section.settings.<pin setting> }}"` on `[data-cvw-journey]`
   (% of viewport scroll per stop, 0 = no pin; JS clamps 0..150, falls back to 62). Optional
   `<span data-cvw-journey-hint hidden>` ("Scroll to ride along"), shown only on the wide pinned ride.
3. U5.12 reel: print `<button type="button" class="cvw-reel__nav is-prev" data-cvw-reel-prev hidden>` and
   `... is-next" data-cvw-reel-next hidden>` inside `[data-cvw-reel]` with localized aria-labels. JS un-hides
   them, steps one frame, sets aria-disabled at the ends. Styles exist in cv-pdp-home.css (`.cvw-reel__nav`).
4. INF-3 / PDP-SHARED: the slip's torn-stub fly (cvs:added on a non-counter `[data-cv-pdp]`) does not call
   `CasifyMotion.claim('pdp')`. Once cv-commerce-motion.js flies on cart:added the Order Slip template could
   fly two tokens. Decide whether the slip claims 'pdp' or hands its fly to `CasifyMotion.fly`.
