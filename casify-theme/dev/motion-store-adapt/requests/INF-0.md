# Requests from INF-0 (changes outside layout/theme.liquid, assets/theme.css, assets/theme.js, assets/cv-motion.js)

- INF-2, assets/cart.js:178-182: `showToast(title, body, tone)` drops `tone`. Pass it on
  (`window.CASIFY_FNS.toastQuick(title, body, tone)`) so cart errors show the red danger toast (role alert).
- halo.js owner (wave 5 halo units): halo.js observes `[data-halo-reveal]` once at boot, has no
  `shopify:section:load` rescan, no select finish, no live reduced-motion handling, and no-ops without
  `.halo-tpl`. theme.js now finishes `[data-halo-reveal]` on section:load as a stopgap; halo.js should own it and
  could expose a ready flag for the layout reveal check.
- INF-3: when assets/cv-commerce-motion.js/.css exist, switch the two layout slots from the assembled name
  (`assign commerce_motion`) to literal asset names so theme check verifies them. Until then every page requests
  two 404 files; INF-3 must land before any push.
- Section units, sections/cv-search.liquid:59 and sections/cv-ugc.liquid:51: print the final count value server
  side, not 0 (no-JS visitors see "0").
- Section unit, sections/cv-cart.liquid:70: `data-cv-reveal` sits on cart lines (commerce content). Replace it with
  a GSAP from() on JS-set start states.
- Optional (pre-existing): cv-motion.js rootMargin '-8%' means a reveal in the last 8% of a very short page never
  fires; a shared-ticker job at max scroll could reveal pending on-screen targets. Toasts could use a persistent
  aria-live announcer and pause dismissal on hover.
