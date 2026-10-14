"""Embed the exact KIE prompts into the product-page decision comps and write sidecars.

Run from the theme root. Prompts are the strings sent to gpt-image-2-5-flare-image-to-image
(3:2, 2K) with two reference images: the home page screenshot and the real product photo.
"""
import json
import subprocess

EMBED = "C:/Users/LENOVO/.claude/skills/impeccable/scripts/embed-prompt.mjs"
REFS = [
    "https://tempfile.redpandaai.co/kieai/11683805/casify/pdp-refs/1789424139249-ivho6n20ttk.png",
    "https://tempfile.redpandaai.co/kieai/11683805/casify/pdp-refs/1789424142773-wfxnzvy6ms.jpg",
]

HEAD = (
    "A desktop e-commerce PRODUCT PAGE screenshot, 1440px wide browser viewport, landscape, crisp production web UI, "
    "not a poster or illustration. Reference image 1 is the existing Casify home page: reuse its exact header "
    "(red-and-cream striped awning with scalloped edge and a small ticker, cocoa-brown topbar, cream nav bar with the "
    "CASIFY hanging shop sign between a red and a teal peppermint, nav links IPHONE SAMSUNG COLLECTIONS CONTACT, account "
    "and bag icons), its palette (warm cream paper ground, cocoa-brown ink, candy red, muted teal, brass gold), its type "
    "character (heavy high-contrast serif display, typewriter small caps labels, bookish serif body) and its component "
    "character (red pill buttons with a darker bottom edge, dashed ticket borders, candy-stripe trims). Do NOT copy the "
    "home page content: no arched window, no home headline, no {tag}, no sweets. Reference image 2 is the real product "
    "photo: a clear transparent magnetic iPhone case with a white MagSafe ring; that photo is the product shown in the "
    "gallery.\n\nPAGE STRUCTURE, top to bottom: the header; a thin breadcrumb 'Home / Cases / Transparent Magnetic Phone "
    "Case for iPhone'; "
)
TAIL = (
    "\n\nNo star ratings, no review counts, no drop-test or lab claims, no countdown timers, no discount codes, no "
    "people, no hands. Spell every text exactly as given."
)

BODIES = {
    "order-slip": (
        "hanging tag",
        "c3d4c5537e1a3bbd99b4792ce0420f46",
        "then a two-column product area filling the first viewport.\n"
        "LEFT column, about 55% width: a large product photo stage framed like a scalloped candy-shop window with a cream "
        "bead border, the clear case photo inside on a soft light ground, and a row of 5 small square thumbnails beneath it.\n"
        "RIGHT column, about 45% width: a tall paper ORDER SLIP like a ruled order pad from an old candy shop, rotated about "
        "1 degree, perforated top edge, a strip of candy-stripe tape at its top corner. On the slip: the product title in "
        "large heavy serif 'Transparent Magnetic Phone Case for iPhone' and the price '$49.99'. Then three numbered lines "
        "with red rubber-stamped circled numbers: line '1 YOUR PHONE' with the filled answer 'iPhone 17 Pro / 18 Pro' and "
        "a small underlined 'Change' link; line '2 STYLE' with two pill choices 'Magnetic Case Camera Cutout Transparent' "
        "(selected, red outline) and 'Camera Cutout Transparent'; line '3 HOW MANY' with three small boxes '1 case $49.99', "
        "'2 cases $40.99 each' (selected, with a small red ribbon flag 'Most popular'), '3 cases $34.49 each'. At the "
        "slip's foot a handwritten-feeling totals row 'Total $81.98' and a wide red pill button 'Add to bag'. Under the "
        "slip one typewriter line: 'Free shipping \u00b7 30-day returns \u00b7 Ships in 1-3 business days'.\n"
        "At the very bottom edge, the start of the next section: a serif heading 'Made for your exact model'.",
    ),
    "shop-counter": (
        "hanging '36 mo' tag",
        "a2149fd0e83466ba2d16023a00003a79",
        "then a two-column product area filling the first viewport, like a candy-shop COUNTER where every control is a "
        "counter object.\n"
        "LEFT column, about 55% width: a product photo stage resting on a white marble counter top with a soft shadow, the "
        "clear case photo large; a vertical rail of 5 round thumbnails shaped like glass candy-jar lids along the far left "
        "edge of the stage.\n"
        "RIGHT column, about 45% width: a small typewriter eyebrow 'CASIFY CASES'; the product title in large heavy serif "
        "'Transparent Magnetic Phone Case for iPhone'; a brass price tag hanging on a thin string showing '$49.99'; a row "
        "labelled 'STYLE: Magnetic Case Camera Cutout Transparent' with two small swatches; a field labelled 'MODEL' shown "
        "as a cream dropdown reading 'iPhone 17 Pro / 18 Pro' with a chevron; three side-by-side pack boxes drawn like "
        "little candy boxes with lids: '1 case $49.99', '2 cases $40.99 each' (selected, red flag 'Most popular'), "
        "'3 cases $34.49 each' (teal flag 'Best value'); a wide red pill button 'Add to bag \u00b7 $81.98'; below it a thin "
        "candy-stripe ribbon listing 'Free shipping', '30-day returns', 'Ships in 1-3 business days' with small line "
        "icons; then two collapsed accordion rows 'Details' and 'Shipping & returns'.",
    ),
    "weigh-scale": (
        "hanging tag",
        "a04e0f4bc2a051081105d0747c0aaa6b",
        "then the first viewport in two bands.\n"
        "UPPER BAND: LEFT half, a product photo stage in a cream frame with a thin candy-stripe border, the clear case "
        "photo, 4 small thumbnails beneath. RIGHT half: the product title in large heavy serif 'Transparent Magnetic Phone "
        "Case for iPhone', the price '$49.99', a field labelled 'MODEL' as a cream dropdown reading 'iPhone 17 Pro / 18 "
        "Pro', and a row labelled 'STYLE' with two pills 'Magnetic Case Camera Cutout Transparent' (selected) and 'Camera "
        "Cutout Transparent'.\n"
        "LOWER BAND spanning the full content width: a WEIGH & PAY strip. On the left a wide vintage brass candy scale, "
        "cleanly rendered, with three striped paper candy bags standing on a long pan labelled '1 CASE $49.99', '2 CASES "
        "$40.99 each', '3 CASES $34.49 each'; the selected 2-case bag sits visibly lower, weighed down, with a small red "
        "ribbon 'Most popular'. On the right of the strip a small black chalkboard card reading 'Total $81.98' above a wide "
        "red pill button 'Add to bag', and under it one typewriter line 'Free shipping \u00b7 30-day returns \u00b7 Ships "
        "in 1-3 business days'.",
    ),
}

for name, (tag, task_id, body) in BODIES.items():
    prompt = HEAD.replace("{tag}", tag) + body + TAIL
    for ext in ("png", "webp"):
        path = f".impeccable/mocks/decision/{name}.{ext}"
        out = subprocess.run(["node", EMBED, path, "--prompt", prompt], capture_output=True, text=True)
        print(name, ext, out.returncode, (out.stdout or out.stderr).strip()[:160])
    sidecar = {
        "prompt": prompt,
        "tool": "KIE gpt-image-2-5-flare-image-to-image",
        "aspect_ratio": "3:2",
        "resolution": "2K",
        "taskId": task_id,
        "input_urls": REFS,
        "round": "product page structure (seed c4fdeaa6, decision key ef6a9bc1)",
    }
    with open(f".impeccable/mocks/decision/{name}.json", "w", encoding="utf-8") as fh:
        json.dump(sidecar, fh, indent=2, ensure_ascii=False)
