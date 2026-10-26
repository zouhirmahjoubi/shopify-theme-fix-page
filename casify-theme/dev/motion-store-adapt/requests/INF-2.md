# INF-2 requests (changes outside INF-2's files)

1. U1.4 cart page (sections/cv-cart.liquid + its script): cart.js now changes drawer lines in place
   and leaves any other line alone when the page script owns it. `change` events cannot be cancelled,
   so mark the cart page's line list wrapper with `data-cart-self` (cart.js skips every
   `[data-cart-line-qty]`, `[data-cart-remove]` inside it). Stepper clicks: call `preventDefault()` in
   the page's own click handler and cart.js skips them too. Until U1.4 lands, unowned cart page lines
   keep the old behaviour (post `/cart/change.js`, then reload).
2. assets/cv-quick-pick.css (no owner listed; FIN-1 or the quick-pick unit): move
   `.cvqp__buy[hidden]{display:none}` out of the inline `<style>` in snippets/cv-quick-pick.liquid,
   and give `.cvqp__buy` a spacing rule if the ghost button sits too close to Add to bag.
3. assets/theme.css (FIN-1): `.cart-drawer-item` (grid 64px / 1fr / auto, :2741) and the scrim
   `z-index: 80` (:2724) are now overridden by assets/cv-cart-drawer.css (60px / 1fr, z 94/95).
   Delete the theme.css copies in the cleanup so one definition remains.
4. INF-3: the drawer total `[data-cart-total]` is one persistent `aria-live` node across refreshes
   (cart.js re-uses it and writes the new text and `data-cents`). If the motion module rolls the
   total, tween a visual copy, not this node, so screen readers get only the final value.
   `cart:drawer:refreshed.removed` keys no longer exist in the DOM when the event fires.
5. Card units (U1.5) and any opener: add `data-cvqp-buy-now` to a `[data-cvqp-open]` button to show
   Buy now in the quick pick. Put `data-cvm-fly-img` on the card image (or its wrapper) so
   `cart:added` from card forms carries `img`.
6. sections/main-halo-product.liquid:601 calls `window.Casify.openDrawer(btn)` directly after its own
   add. Owner decision Q3 (stay on the page, drawer opens only with `cv_open_drawer_on_add`): dispatch
   `cart:added` instead and let cart.js decide (wave 5 halo unit).
7. assets/theme.css (INF-0 or FIN-1, fix round): `.toast-host` has `z-index: 80` (:889), below the
   drawer and mobile nav (95). INF-2 lifts it to 96 only while `html.cm-scroll-lock` is set
   (assets/cv-cart-drawer.css, last rule), so a danger toast from a failed line change shows above
   the open drawer. Consider giving `.toast-host` 96 in theme.css itself and then deleting that rule.
8. assets/cv-header.js (U3.1): `nav._cvhDestroy` (:375) never calls `releaseMenuFocus`. Since the fix
   round, `CasifyA11y.trapFocus` releases itself when its container leaves the page and ignores Tab
   while the container is hidden, so a stale trap no longer swallows Tab. Calling the release in
   destroy is still the clean fix.
