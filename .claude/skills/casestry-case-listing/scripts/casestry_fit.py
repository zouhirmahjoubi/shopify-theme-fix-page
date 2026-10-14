#!/usr/bin/env python3
"""Fit one portrait design onto Casestry phone-case templates.

For every requested model it writes:
  print/<CODE>.png        1748x2480 @300 DPI print file (template fully covered, no alpha)
  mockup/<CODE>.jpg       2048x2048 product image (real Casestry mockup, or a drawn one if none exists)
plus qa_prints.png / qa_mockups.png contact sheets and manifest.json.

Usage:
  python casestry_fit.py --art design.png --design design.json --out <dir> --lines magsafe,magsafe_matte \
      [--brands Apple,Samsung] [--models 17PM,S26U] [--root <project dir>]

design.json (all boxes are fractions of the artwork, [x0, y0, x1, y1]):
  {"keep":    [0.03, 0.13, 0.97, 0.955],      # must sit on the back panel (not the side wrap)
   "protect": [[0.0, 0.165, 0.6, 0.49], ...],  # must stay clear of the camera cut-out
   "camera_margin_px": 24, "inner_margin_px": 16}
Omit "protect" for all-over patterns: the camera may then cover anything.
"""
import argparse, json, math, sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
DPI = 300
SQUARE = 2048


# ---------------------------------------------------------------- templates
def template_path(root, m):
    t = root / "case_templates"
    if m["brand"] == "Apple":
        name = "SET_2020.png" if m["code"] == "SE" else f"{m['code']}T.png"
        return t / "Apple" / "Tough & MagSafe" / name
    return t / m["brand"] / "Tough" / f"{m['code']}T.png"


def mockup_path(root, m, finish):
    t = root / "case_mockups"
    c = m["code"]
    if m["brand"] == "Google":
        cands = [t / "Google" / "Tough" / f"{c}T_Mockup.png"]
    else:
        sub = "Gloss" if finish == "gloss" else "Matte"
        name = f"{c}T_Mockup.png" if finish == "gloss" else f"{c}-MT_Mockup.png"
        cands = [t / m["brand"] / "Tough" / sub / name]
    # matte falls back to gloss and vice versa: same geometry, different sheen
    other = "matte" if finish == "gloss" else "gloss"
    if m["brand"] != "Google":
        sub = "Gloss" if other == "gloss" else "Matte"
        name = f"{c}T_Mockup.png" if other == "gloss" else f"{c}-MT_Mockup.png"
        cands.append(t / m["brand"] / "Tough" / sub / name)
    return next((p for p in cands if p.exists()), None)


def _rect(x, y, w, h):
    return (int(x), int(y), int(x + w), int(y + h))


def analyze_template(path):
    """Return print area, back panel and camera keep-out rects (canvas px)."""
    a = np.array(Image.open(path).convert("RGBA")).astype(np.int16)
    H, W = a.shape[:2]
    lum = a[..., :3].mean(axis=2)
    line = ((a[..., 3] > 64) & (lum < 110)).astype(np.uint8)
    line = cv2.dilate(line, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats((1 - line).astype(np.uint8), connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    inside = ~np.isin(lab, list(border))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inside.astype(np.uint8), connectivity=8)
    k = 1 + int(np.argmax(st2[1:, cv2.CC_STAT_AREA]))
    P = _rect(*st2[k][:4])
    pw, ph = P[2] - P[0], P[3] - P[1]
    regs = [dict(i=i, r=_rect(*st[i][:4]), area=int(st[i][4]))
            for i in range(1, n) if i not in border and st[i][4] > 400]
    body = max((g for g in regs if g["r"][2] - g["r"][0] < 0.9 * pw), key=lambda g: g["area"])
    bx0, by0, bx1, by1 = body["r"]

    def cxcy(r):
        return (r[0] + r[2]) / 2, (r[1] + r[3]) / 2

    cams = [g for g in regs if g is not body and g["area"] >= 0.02 * body["area"]
            and bx0 <= cxcy(g["r"])[0] <= bx1 and (cxcy(g["r"])[1] - P[1]) / ph < 0.45
            and g["r"][3] - g["r"][1] < 0.6 * ph]
    cam = max(cams, key=lambda g: g["area"])
    C0 = cam["r"]
    C = list(C0)
    grow, reach = 30, 140
    for g in regs:  # rings / lips hugging the camera belong to the keep-out zone
        r = g["r"]
        if g is body or g is cam or g["area"] > 1.5 * cam["area"]:
            continue
        touches = r[0] < C0[2] + grow and r[2] > C0[0] - grow and r[1] < C0[3] + grow and r[3] > C0[1] - grow
        near = r[0] >= C0[0] - reach and r[2] <= C0[2] + reach and r[1] >= C0[1] - reach and r[3] <= C0[3] + reach
        if touches and near:
            C = [min(C[0], r[0]), min(C[1], r[1]), max(C[2], r[2]), max(C[3], r[3])]
    B = (bx0, min(by0, C[1]), bx1, by1)
    shell = np.zeros((H, W), np.uint8)  # back-panel silhouette for drawn mockups
    for g in regs:
        r = g["r"]
        if g is body or (r[0] >= bx0 - 40 and r[2] <= bx1 + 40 and r[1] >= B[1] - 40 and r[3] <= by1 + 40):
            shell[lab == g["i"]] = 1
    shell = cv2.morphologyEx(shell, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    camera = np.zeros((H, W), np.uint8)
    camera[lab == cam["i"]] = 1
    return dict(size=(W, H), print_area=P, back=B, camera=tuple(C), shell=shell, camera_mask=camera)


# ---------------------------------------------------------------- placement
def _box_px(b, x, y, s, aw, ah):
    return (x + b[0] * aw * s, y + b[1] * ah * s, x + b[2] * aw * s, y + b[3] * ah * s)


def _overlap(r1, r2):
    w = min(r1[2], r2[2]) - max(r1[0], r2[0])
    h = min(r1[3], r2[3]) - max(r1[1], r2[1])
    return max(0.0, w) * max(0.0, h)


def place(geo, aw, ah, design):
    B, C = geo["back"], geo["camera"]
    mi = design.get("inner_margin_px", 16)
    cm = design.get("camera_margin_px", 24)
    keep = design.get("keep", [0, 0, 1, 1])
    prot = design.get("protect", [])
    Cd = (C[0] - cm, C[1] - cm, C[2] + cm, C[3] + cm)
    kw, kh = (keep[2] - keep[0]) * aw, (keep[3] - keep[1]) * ah
    bw, bh = B[2] - B[0] - 2 * mi, B[3] - B[1] - 2 * mi
    s_max = min(bw / kw, bh / kh)
    # keep box must also cover the back panel when it can (no linen bands on the back)
    best = None
    for step in range(0, 241):
        s = s_max * (1 - 0.0025 * step)
        x = (B[0] + B[2]) / 2 - (keep[0] + keep[2]) / 2 * aw * s
        y_lo = B[1] + mi - keep[1] * ah * s
        y_hi = B[3] - mi - keep[3] * ah * s
        if y_hi < y_lo:
            continue
        ys = np.linspace(y_lo, y_hi, 121)
        ovs = [sum(_overlap(Cd, _box_px(b, x, y, s, aw, ah)) for b in prot) for y in ys]
        if best is None or min(ovs) < best["overlap"]:
            y = float(ys[int(np.argmin(ovs))])
            best = dict(scale=s, x=x, y=y, overlap=min(ovs))
        zero = [float(y) for y, o in zip(ys, ovs) if o == 0]
        if zero:
            mid = (y_lo + y_hi) / 2
            y = min(zero, key=lambda v: abs(v - mid))
            return dict(scale=s, x=x, y=y, overlap=0.0, shrink=s / s_max)
    best["shrink"] = best["scale"] / s_max
    return best


# ---------------------------------------------------------------- background texture
def clean_patch(art):
    """Largest square of plain background in the artwork (used to fill the side wrap)."""
    small = (art // 16).reshape(-1, 3)
    keys, counts = np.unique(small, axis=0, return_counts=True)
    mode = keys[np.argmax(counts)]
    sel = np.all(art // 16 == mode, axis=2)
    bg = np.median(art[sel], axis=0)
    lab = cv2.cvtColor(cv2.GaussianBlur(art, (0, 0), 2), cv2.COLOR_RGB2LAB).astype(np.float32)
    bgl = cv2.cvtColor(bg.reshape(1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)[0, 0]
    dev = np.linalg.norm(lab - bgl, axis=2)  # blurred so the fabric weave itself is not "busy"
    busy = cv2.dilate((dev > 30).astype(np.uint8), np.ones((9, 9), np.uint8))
    ii = cv2.integral(busy)
    H, W = busy.shape
    for size in (160, 128, 96, 72, 56, 40):
        if size >= min(H, W):
            continue
        tot = ii[size:, size:] - ii[:-size, size:] - ii[size:, :-size] + ii[:-size, :-size]
        ys, xs = np.where(tot == 0)
        if len(ys):
            # most central-looking clean square: lowest deviation
            scores = [dev[y:y + size, x:x + size].mean() for y, x in zip(ys[::37], xs[::37])]
            j = int(np.argmin(scores)) * 37
            y, x = ys[j], xs[j]
            return art[y:y + size, x:x + size].copy(), bg
    return np.tile(bg.astype(np.uint8), (32, 32, 1)), bg


def linen(patch, scale, W, H):
    # flatten the patch's light falloff so mirrored tiles don't show a plaid of seams
    f = patch.astype(np.float32)
    low = cv2.GaussianBlur(f, (0, 0), max(4, patch.shape[0] / 5))
    p = np.clip(f - low + f.reshape(-1, 3).mean(axis=0), 0, 255).astype(np.uint8)
    p = cv2.resize(p, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4) if abs(scale - 1) > 0.01 else p
    tile = np.vstack([np.hstack([p, p[:, ::-1]]), np.hstack([p[::-1], p[::-1, ::-1]])])
    reps = (math.ceil(H / tile.shape[0]) + 1, math.ceil(W / tile.shape[1]) + 1, 1)
    return np.tile(tile, reps)[:H, :W]


# ---------------------------------------------------------------- compose
def compose_print(art, geo, pl, patch):
    """Linen-textured canvas with the scaled artwork on top; the art's own edges fade into the linen."""
    W, H = geo["size"]
    s = pl["scale"]
    aw, ah = max(1, round(art.shape[1] * s)), max(1, round(art.shape[0] * s))
    feather_px = max(24, 0.055 * aw)
    a = cv2.resize(art, (aw, ah), interpolation=cv2.INTER_LANCZOS4 if s > 1 else cv2.INTER_AREA).astype(np.float32)
    yy, xx = np.mgrid[0:ah, 0:aw]
    edge = np.minimum(np.minimum(xx, aw - 1 - xx), np.minimum(yy, ah - 1 - yy)).astype(np.float32)
    w = np.clip(edge / feather_px, 0, 1)
    w = (w * w * (3 - 2 * w))[..., None]  # smoothstep
    canvas = linen(patch, s, W, H).astype(np.float32)
    x0, y0 = round(pl["x"]), round(pl["y"])
    cx0, cy0, cx1, cy1 = max(0, x0), max(0, y0), min(W, x0 + aw), min(H, y0 + ah)
    if cx1 > cx0 and cy1 > cy0:
        sub = a[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
        ww = w[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
        canvas[cy0:cy1, cx0:cx1] = canvas[cy0:cy1, cx0:cx1] * (1 - ww) + sub * ww
    return np.clip(canvas, 0, 255).astype(np.uint8)


def square(img_rgb, case_mask, fill=0.82):
    """Square crop centred on the case (soft mockup shadows kept), faded to white at the border."""
    ys, xs = np.where(case_mask)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    side = int(max(ys.max() - ys.min(), xs.max() - xs.min()) / fill)
    H, W = img_rgb.shape[:2]
    big = np.full((H + 2 * side, W + 2 * side, 3), 255, np.uint8)
    big[side:side + H, side:side + W] = img_rgb
    y0, x0 = int(cy - side / 2) + side, int(cx - side / 2) + side
    crop = big[y0:y0 + side, x0:x0 + side].astype(np.float32)
    r = max(8, side // 30)
    yy, xx = np.mgrid[0:side, 0:side]
    d = np.minimum(np.minimum(xx, side - 1 - xx), np.minimum(yy, side - 1 - yy))
    k = np.clip(d / r, 0, 1)[..., None]
    crop = crop * k + 255 * (1 - k)
    return cv2.resize(np.clip(crop, 0, 255).astype(np.uint8), (SQUARE, SQUARE),
                      interpolation=cv2.INTER_AREA if side > SQUARE else cv2.INTER_LANCZOS4)


def real_mockup(print_rgb, mock_path):
    m = np.array(Image.open(mock_path).convert("RGBA")).astype(np.float32)
    if m.shape[:2] != print_rgb.shape[:2]:
        raise ValueError(f"mockup {mock_path.name} is {m.shape[1]}x{m.shape[0]}, not the template size")
    al = m[..., 3:4] / 255
    out = print_rgb.astype(np.float32) * (1 - al) + m[..., :3] * al
    case = ((m[..., 3] < 250) | (m[..., :3].max(axis=2) < 200)).astype(np.uint8)
    case = cv2.morphologyEx(case, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(case, connectivity=8)
    case = lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))  # drop stray shadow specks
    return square(np.clip(out, 0, 255).astype(np.uint8), case)


def drawn_mockup(print_rgb, geo):
    """Fallback when Casestry ships no mockup for a model: clip to the back panel, add rim, camera, gloss."""
    H, W = print_rgb.shape[:2]
    shell = cv2.morphologyEx(geo["shell"], cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    cnts, _ = cv2.findContours(shell, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    mask = np.zeros((H, W), np.uint8)
    cv2.drawContours(mask, [max(cnts, key=cv2.contourArea)], -1, 1, -1)
    rim = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (37, 37)))
    out = np.full((H, W, 3), 255, np.float32)
    sh = cv2.GaussianBlur(rim.astype(np.float32), (0, 0), 28)
    sh = np.roll(np.roll(sh, 22, 0), 10, 1)
    out *= (1 - 0.22 * sh)[..., None]
    rim_only = (rim > 0) & (mask == 0)
    out[rim_only] = out[rim_only] * 0.0 + np.array([34, 34, 38], np.float32)
    art = print_rgb.astype(np.float32)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    edge = np.clip(1 - dist / 28, 0, 1) * 0.28
    art = art * (1 - edge[..., None])
    yy, xx = np.mgrid[0:H, 0:W]
    gl = np.clip(1 - np.abs((xx / W) * 0.9 + (yy / H) - 0.55) / 0.22, 0, 1) * 0.10
    art = art + (255 - art) * gl[..., None]
    out[mask > 0] = art[mask > 0]
    cam = cv2.dilate(geo["camera_mask"], np.ones((5, 5), np.uint8)) > 0
    out[cam] = np.array([28, 28, 32], np.float32)
    cr = cv2.erode(geo["camera_mask"], np.ones((15, 15), np.uint8))
    out[(cam) & (cr == 0)] = np.array([60, 60, 66], np.float32)
    return square(np.clip(out, 0, 255).astype(np.uint8), rim > 0)


# ---------------------------------------------------------------- QA
def qa_overlay(print_rgb, tpl_path, geo, pl, aw, ah, design):
    t = Image.open(tpl_path).convert("RGBA")
    base = Image.fromarray(print_rgb).convert("RGBA")
    lines = np.array(t)
    lines[..., 3] = np.where((lines[..., 3] > 64) & (lines[..., :3].mean(axis=2) < 110), 255, 0)
    lines[..., :3] = (0, 255, 255)
    base.alpha_composite(Image.fromarray(lines))
    d = ImageDraw.Draw(base)
    d.rectangle(geo["back"], outline=(0, 200, 0, 255), width=6)
    d.rectangle(geo["camera"], outline=(255, 0, 0, 255), width=6)
    for b in design.get("protect", []):
        d.rectangle(_box_px(b, pl["x"], pl["y"], pl["scale"], aw, ah), outline=(255, 140, 0, 255), width=5)
    return base.convert("RGB")


def sheet(items, path, tile=(300, 420), cols=8, title=""):
    rows = math.ceil(len(items) / cols)
    tw, th = tile
    sh = Image.new("RGB", (cols * tw, rows * (th + 40) + 50), "white")
    d = ImageDraw.Draw(sh)
    try:
        f = ImageFont.truetype("arial.ttf", 18)
        ft = ImageFont.truetype("arialbd.ttf", 26)
    except OSError:
        f = ft = ImageFont.load_default()
    d.text((12, 10), title, fill="black", font=ft)
    for k, (label, im) in enumerate(items):
        im = im.copy()
        im.thumbnail(tile)
        x, y = (k % cols) * tw, 50 + (k // cols) * (th + 40)
        sh.paste(im, (x + (tw - im.width) // 2, y))
        d.text((x + 8, y + th + 6), label, fill="black", font=f)
    sh.save(path, quality=88)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--art", required=True)
    ap.add_argument("--design", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--lines", default="magsafe,magsafe_matte")
    ap.add_argument("--brands", default="Apple,Samsung,Google")
    ap.add_argument("--models", default="")
    ap.add_argument("--root", default=str(SKILL.parents[2]))
    args = ap.parse_args()

    root = Path(args.root)
    reg = json.loads((SKILL / "models.json").read_text(encoding="utf-8"))
    design = json.loads(Path(args.design).read_text(encoding="utf-8"))
    lines = [l for l in args.lines.split(",") if l]
    brands = set(args.brands.split(","))
    only = {c for c in args.models.split(",") if c}
    out = Path(args.out)
    (out / "print").mkdir(parents=True, exist_ok=True)
    (out / "mockup").mkdir(parents=True, exist_ok=True)

    art = np.array(Image.open(args.art).convert("RGB"))
    ah, aw = art.shape[:2]
    patch, bg = clean_patch(art)
    print(f"art {aw}x{ah}, linen patch {patch.shape[1]}px, background {bg.round().tolist()}")

    manifest = dict(art=str(Path(args.art).resolve()), art_size=[aw, ah], design=design, lines=lines, models=[], skipped=[])
    qa_p, qa_m = [], []
    for m in reg["models"]:
        if m["brand"] not in brands or (only and m["code"] not in only):
            continue
        sel = [l for l in lines if l in m["lines"]]
        if not sel:
            continue
        tp = template_path(root, m)
        if not tp.exists():
            manifest["skipped"].append(dict(name=m["name"], code=m["code"], reason=f"no template ({tp.name})"))
            print(f"SKIP {m['name']}: no template {tp.name}")
            continue
        geo = analyze_template(tp)
        pl = place(geo, aw, ah, design)
        pr = compose_print(art, geo, pl, patch)
        pfile = out / "print" / f"{m['code']}.png"
        Image.fromarray(pr).save(pfile, dpi=(DPI, DPI), optimize=True)
        finish = "matte" if all(reg["case_lines"][l]["finish"] == "matte" for l in sel) else "gloss"
        mp = mockup_path(root, m, finish)
        mock = real_mockup(pr, mp) if mp else drawn_mockup(pr, geo)
        mfile = out / "mockup" / f"{m['code']}.jpg"
        Image.fromarray(mock).save(mfile, quality=90, optimize=True, progressive=True)
        warn = []
        if pl["overlap"] > 0:
            warn.append("camera covers protected art")
        if pl["shrink"] < 0.8:
            warn.append(f"art shrunk to {pl['shrink']:.0%} to clear the camera")
        if pl["scale"] > 1.25:
            warn.append(f"art upscaled x{pl['scale']:.2f} ({DPI / pl['scale']:.0f} ppi)")
        rec = dict(name=m["name"], code=m["code"], brand=m["brand"], template=str(tp.relative_to(root)),
                   mockup=str(mp.relative_to(root)) if mp else "drawn (no Casestry mockup for this model)",
                   print_file=str(pfile.relative_to(out)), mockup_file=str(mfile.relative_to(out)),
                   back=list(map(int, geo["back"])), camera=list(map(int, geo["camera"])),
                   print_area=list(map(int, geo["print_area"])),
                   scale=round(pl["scale"], 4), x=round(pl["x"], 1), y=round(pl["y"], 1),
                   art_ppi=round(DPI / pl["scale"]), warnings=warn,
                   variants=[dict(line=l, label=reg["case_lines"][l]["label"],
                                  item_sku=reg["case_lines"][l]["sku"].format(code=m["code"]),
                                  price=reg["case_lines"][l]["price"]) for l in sel])
        manifest["models"].append(rec)
        print(f"{m['code']:>8} {m['name']:<22} scale {pl['scale']:.3f} shrink {pl['shrink']:.2f} "
              f"ppi {DPI / pl['scale']:.0f} {'mockup' if mp else 'DRAWN'} {'; '.join(warn)}")
        qa_p.append((m["code"], qa_overlay(pr, tp, geo, pl, aw, ah, design)))
        qa_m.append((m["name"], Image.fromarray(mock)))
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    sheet(qa_p, out / "qa_prints.jpg", title="Print files: cyan = template, green = back panel, red = camera, orange = protected art")
    sheet(qa_m, out / "qa_mockups.jpg", tile=(300, 300), title="Mockups")
    print(f"{len(manifest['models'])} models written, {len(manifest['skipped'])} skipped -> {out}")


if __name__ == "__main__":
    sys.exit(main())
