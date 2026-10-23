# shoot.py --actions snippet for cv-cart-drawer (kit proof).
# Opens the drawer, asks cart.js to refresh it (stub answers ?sections=cv-cart-drawer with the
# two-line bag rendered from stub_cart), and checks the swap.
if variant != "nojs":
    before = page.locator("#cm-cart-drawer .cart-drawer-item").count()
    page.evaluate("() => window.Casify && window.Casify.openDrawer && window.Casify.openDrawer()")
    wait(500)
    shot("open")
    page.evaluate("() => document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }))")
    wait(900)
    after = page.locator("#cm-cart-drawer .cart-drawer-item").count()
    log("drawer lines before/after refresh:", before, after)
    got = calls()
    log("calls:", json.dumps([[c["method"], c["path"], c["url"].split("?")[-1], c["status"]] for c in got]))
    if "fail=all" in page.url:
        expect(after == before, "fail=all: the drawer keeps its lines when the refresh fails")
    else:
        expect(any("sections=cv-cart-drawer" in c["url"] for c in got), "cart.js asked for ?sections=cv-cart-drawer")
        expect(after == 2, "the drawer shows the two-line bag from the stub")
    shot("refreshed")
else:
    log("nojs: drawer is closed off-canvas; the static markup is still in the page")
