# shoot.py --actions snippet for cv-product-counter (kit proof).
# Picks a phone model and a colour, presses Add to bag, and checks stub-fetch recorded the add.
if variant != "nojs" and width in (375, 1440):
    sel = page.locator("select[data-cv-option-index]").first
    if sel.count():
        sel.select_option("iPhone 17 Pro")
        log("model picked: iPhone 17 Pro")
    sw = page.locator(".cvc__swatch[data-cv-value='Blue']").first
    if sw.count():
        sw.click()
        log("colour picked: Blue")
    page.locator("#cvAddBtn").scroll_into_view_if_needed()
    page.locator("#cvAddBtn").click()
    wait(900)
    got = calls()
    adds = [c for c in got if c["path"].endswith("/cart/add.js")]
    log("add calls:", json.dumps([c["body"] for c in adds]))
    if "fail=1" in page.url:
        expect(any(c["status"] == 422 for c in adds), "fail mode: add answered 422")
        status = page.locator("#cvStatus").inner_text()
        log("status line:", status)
        expect(status.strip() != "", "fail mode: the status line explains the failure")
    else:
        expect(any(c["status"] == 200 for c in adds), "add answered 200")
        expect(any(it.get("id") == 41008 for c in adds for it in c["body"].get("items", [])),
               "the add posted the resolved variant 41008 (Blue / iPhone 17 Pro)")
    shot("after-add")
