"""Capture preview stills of case GLBs in Shopify's own 3D viewer, the way the product page draws them.

usage: python live_still.py <out_dir> <model.glb> [<model.glb> ...]

Opens a live product page that already has a 3D model, swaps the viewer's model for each GLB (served
locally through page.route) and saves the viewer's canvas as a transparent PNG. The canvas has the shape
of the stage's 3D box (1 : 0.93 under the awning) and the live theme's lighting and camera, so the still
lines up with the live model when it takes over. Nothing on the store changes.
"""
import base64
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

PAGE = 'https://www.casify.shop/products/snow-day-penguin-christmas-phone-case-for-iphone-samsung-pixel-tough-case'
SEL = '[data-cvc-model] model-viewer'
LOADED = "(() => { const mv = document.querySelector('%s'); return mv && mv.loaded; })()" % SEL


def stills(glbs, out_dir, page=PAGE, width=1280, dpr=4):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    files = {Path(g).name: Path(g) for g in glbs}
    saved = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--use-angle=d3d11', '--enable-gpu'])
        ctx = browser.new_context(viewport={'width': width, 'height': 900}, device_scale_factor=dpr)
        ctx.add_init_script("setInterval(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()), 100)")
        pg = ctx.new_page()
        pg.route('**/__still/**', lambda route: route.fulfill(
            body=files[route.request.url.split('/__still/')[1].split('?')[0]].read_bytes(),
            content_type='model/gltf-binary', headers={'access-control-allow-origin': '*'}))
        pg.goto(page, wait_until='load', timeout=90000)
        pg.wait_for_function(LOADED, timeout=60000)
        origin = pg.evaluate('location.origin')
        for name, glb in files.items():
            pg.evaluate("""([sel, src]) => {
                const mv = document.querySelector(sel);
                mv.setAttribute('interaction-prompt', 'none');
                mv.src = src;
            }""", [SEL, '%s/__still/%s' % (origin, name)])
            pg.wait_for_timeout(500)
            pg.wait_for_function(LOADED, timeout=60000)
            pg.evaluate("""sel => { const mv = document.querySelector(sel); mv.jumpCameraToGoal(); }""", SEL)
            pg.wait_for_timeout(2500)
            data = pg.evaluate("sel => document.querySelector(sel).toDataURL('image/png')", SEL)
            out = out_dir / (glb.stem + '-still.png')
            out.write_bytes(base64.b64decode(data.split(',', 1)[1]))
            saved.append(out)
        browser.close()
    return saved


if __name__ == '__main__':
    for f in stills(sys.argv[2:], sys.argv[1]):
        print(f)
