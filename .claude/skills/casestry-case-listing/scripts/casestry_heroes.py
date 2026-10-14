#!/usr/bin/env python3
"""Product-level images for a fitted design (run after casestry_fit.py).

  hero/01-main.jpg     the --main model's mockup
  hero/02-magsafe.jpg  print dropped into Casestry's MagSafe mockup (shows the magnet ring inside)
  hero/03-artwork.jpg  the flat artwork on its own background

Usage: python casestry_heroes.py --out <fit output dir> [--main 17PM] [--magsafe 15PM] [--root <project dir>]
"""
import argparse, json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import casestry_fit as cf


def case_bbox(rgba):
    m = rgba.astype(np.int16)
    case = ((m[..., 3] < 250) | (m[..., :3].max(axis=2) < 200)).astype(np.uint8)
    case = cv2.morphologyEx(case, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(case, connectivity=8)
    order = np.argsort(-st[1:, cv2.CC_STAT_AREA]) + 1
    return [tuple(int(v) for v in st[i][:4]) for i in order]


def magsafe_hero(root, out, code, finish="Gloss"):
    ms = root / "case_mockups" / "Apple" / "MagSafe" / finish / f"{code}-MS_Mockup.png"
    tough = root / "case_mockups" / "Apple" / "Tough" / "Gloss" / f"{code}T_Mockup.png"
    pr = out / "print" / f"{code}.png"
    if not (ms.exists() and tough.exists() and pr.exists()):
        return None
    m = np.array(Image.open(ms).convert("RGBA"))
    t = np.array(Image.open(tough).convert("RGBA"))
    p = np.array(Image.open(pr).convert("RGB")).astype(np.float32)
    tx, ty, tw, th = case_bbox(t)[0]
    boxes = [b for b in case_bbox(m) if b[2] * b[3] > 0.05 * m.shape[0] * m.shape[1]]
    mx, my, mw, mh = min(boxes, key=lambda b: b[0])  # the printed case is the left one
    sx, sy = mw / tw, mh / th
    A = np.float32([[sx, 0, mx - tx * sx], [0, sy, my - ty * sy]])
    warped = cv2.warpAffine(p, A, (m.shape[1], m.shape[0]), flags=cv2.INTER_AREA, borderValue=(255, 255, 255))
    al = m[..., 3:4].astype(np.float32) / 255
    img = np.clip(warped * (1 - al) + m[..., :3] * al, 0, 255).astype(np.uint8)
    img = cv2.resize(img, (cf.SQUARE, cf.SQUARE), interpolation=cv2.INTER_LANCZOS4)
    return img


def artwork_hero(art_path, bg_patch):
    art = np.array(Image.open(art_path).convert("RGB"))
    S = cf.SQUARE
    k = 0.9 * S / art.shape[0]
    a = cv2.resize(art, None, fx=k, fy=k, interpolation=cv2.INTER_LANCZOS4 if k > 1 else cv2.INTER_AREA)
    canvas = np.full((S, S, 3), 255, np.uint8)
    # soft shadow card
    y0, x0 = (S - a.shape[0]) // 2, (S - a.shape[1]) // 2
    sh = np.zeros((S, S), np.float32)
    sh[y0 + 18:y0 + a.shape[0] + 18, x0 + 10:x0 + a.shape[1] + 10] = 1
    sh = cv2.GaussianBlur(sh, (0, 0), 22) * 0.22
    canvas = (canvas * (1 - sh[..., None])).astype(np.uint8)
    canvas[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--main", default="17PM")
    ap.add_argument("--magsafe", default="15PM,14PM,13PM,15P,14P")
    ap.add_argument("--root", default=str(cf.SKILL.parents[2]))
    args = ap.parse_args()
    root, out = Path(args.root), Path(args.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    (out / "hero").mkdir(exist_ok=True)
    codes = [m["code"] for m in man["models"]]
    main_code = args.main if args.main in codes else codes[0]
    Image.open(out / "mockup" / f"{main_code}.jpg").save(out / "hero" / "01-main.jpg", quality=92)
    heroes = [dict(file="hero/01-main.jpg", model=main_code, kind="main")]
    for c in args.magsafe.split(","):
        if c in codes:
            img = magsafe_hero(root, out, c)
            if img is not None:
                Image.fromarray(img).save(out / "hero" / "02-magsafe.jpg", quality=92)
                heroes.append(dict(file="hero/02-magsafe.jpg", model=c, kind="magsafe"))
                break
    Image.fromarray(artwork_hero(man["art"], None)).save(out / "hero" / "03-artwork.jpg", quality=92)
    heroes.append(dict(file="hero/03-artwork.jpg", kind="artwork"))
    man["heroes"] = heroes
    (out / "manifest.json").write_text(json.dumps(man, indent=1), encoding="utf-8")
    print("heroes:", ", ".join(h["file"] for h in heroes))


if __name__ == "__main__":
    main()
