"""Render stills of a case GLB with model-viewer in headless Chromium, framed like the product page's 3D view.

usage: python render_glb.py <model.glb> <out.png|jpg> [--orbit "-25deg 75deg auto"] [--size 1024] [--bg #ffffff]
       python render_glb.py <model.glb> <sheet.jpg> --sheet "-25deg 75deg auto|0deg 90deg auto|..." [--size 512]

The page loads model-viewer 3.5.0 from jsdelivr and gets the GLB through page.route, so no server is needed.
Same attributes as sections/cv-product-counter.liquid: camera-orbit and shadow-intensity 1.
"""
import sys
from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image
from playwright.sync_api import sync_playwright

OPENING = '-25deg 75deg auto'
MODEL_VIEWER = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'
ORIGIN = 'http://render.local'
PAGE = """<!doctype html><meta charset="utf-8">
<script type="module" src="%s"></script>
<style>html,body{margin:0;background:%s}model-viewer{display:block;width:%dpx;height:%dpx;background:%s}</style>
<model-viewer id="mv" camera-orbit="%s" shadow-intensity="1" interaction-prompt="none">
<div slot="progress-bar"></div></model-viewer>"""


class Renderer:
    """One browser for many stills: open it, call shot() per model and angle, close it."""

    def __init__(self, size=1024, bg='#ffffff'):
        self.size, self.bg, self.glb = size, bg, b''

    def __enter__(self):
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch(args=['--use-angle=d3d11', '--enable-gpu'])
        self.page = self.browser.new_page(viewport={'width': self.size, 'height': self.size})
        self.page.route(ORIGIN + '/**', self._serve)
        self.page.goto(ORIGIN + '/')
        self.page.wait_for_function("customElements.get('model-viewer') !== undefined", timeout=60000)
        return self

    def __exit__(self, *exc):
        self.browser.close()
        self.pw.stop()

    def _serve(self, route):
        if urlsplit(route.request.url).path.endswith('.glb'):
            route.fulfill(body=self.glb, content_type='model/gltf-binary')
        else:
            html = PAGE % (MODEL_VIEWER, self.bg, self.size, self.size, self.bg, OPENING)
            route.fulfill(body=html, content_type='text/html')

    def shot(self, glb, orbit=OPENING):
        glb = Path(glb)
        if self.glb != glb.read_bytes():
            self.glb = glb.read_bytes()
            self.page.evaluate("src => { const mv = document.getElementById('mv'); mv.src = src; }",
                               '%s/%s?%d' % (ORIGIN, glb.name, hash(self.glb) & 0xffffff))
            self.page.wait_for_function("document.getElementById('mv').loaded", timeout=60000)
        self.page.evaluate("""orbit => {
            const mv = document.getElementById('mv');
            mv.cameraOrbit = orbit; mv.jumpCameraToGoal();
        }""", orbit)
        # two animation frames: one to apply the camera, one to draw it
        self.page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
        self.page.wait_for_timeout(250)
        return Image.open(BytesIO(self.page.locator('#mv').screenshot())).convert('RGB')


def save(img, out):
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix.lower() in ('.jpg', '.jpeg'):
        img.save(out, 'JPEG', quality=88, optimize=True)
    else:
        img.save(out)
    return out


def render(glb, out, orbit=OPENING, size=1024, bg='#ffffff'):
    with Renderer(size, bg) as r:
        return save(r.shot(glb, orbit), out)


def sheet(glb, out, orbits, size=512, bg='#ffffff'):
    with Renderer(size, bg) as r:
        shots = [r.shot(glb, o) for o in orbits]
    board = Image.new('RGB', (size * len(shots), size), bg)
    for i, s in enumerate(shots):
        board.paste(s, (i * size, 0))
    return save(board, out)


if __name__ == '__main__':
    args = sys.argv[1:]
    opt = lambda k, d: args[args.index(k) + 1] if k in args else d
    pos = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
    size, bg = int(opt('--size', 0)), opt('--bg', '#ffffff')
    if '--sheet' in args:
        print(sheet(pos[0], pos[1], opt('--sheet', '').split('|'), size or 512, bg))
    else:
        print(render(pos[0], pos[1], opt('--orbit', OPENING), size or 1024, bg))
