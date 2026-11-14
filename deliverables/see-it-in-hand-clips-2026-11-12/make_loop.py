"""Close each clip's loop: append frames that move the picture from the last frame back to the first.

The video model ends a few pixels away from its first frame, so a plain loop jumps. The phone is a
rigid, flat, richly printed surface, so one homography (SIFT matches + RANSAC) describes how it sits
in the last frame against the first. Each in-between frame warps both pictures to the same part-way
pose and blends them: the print stays sharp and single, only the soft background cross-fades.
usage: python make_loop.py <in.mp4> <out_dir> [n_frames]
"""
import sys, os, cv2, numpy as np

def frames(path):
    cap = cv2.VideoCapture(path); out = []
    while True:
        ok, f = cap.read()
        if not ok: break
        out.append(f)
    cap.release(); return out

def homography(a, b):
    sift = cv2.SIFT_create(4000)
    ka, da = sift.detectAndCompute(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), None)
    kb, db = sift.detectAndCompute(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), None)
    m = cv2.BFMatcher(cv2.NORM_L2).knnMatch(da, db, k=2)
    good = [x for x, y in m if x.distance < 0.72 * y.distance]
    pa = np.float32([ka[g.queryIdx].pt for g in good]); pb = np.float32([kb[g.trainIdx].pt for g in good])
    H, mask = cv2.findHomography(pa, pb, cv2.RANSAC, 2.0)
    return H, int(mask.sum()), len(good)

def between(a, b, n):
    H, inl, tot = homography(a, b)                  # a-coords -> b-coords
    h, w = a.shape[:2]
    c = np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2)
    hc = cv2.perspectiveTransform(c, H)
    Hinv = np.linalg.inv(H)
    res = []
    for k in range(1, n + 1):
        u = k / (n + 1.0)
        t = u * u * (3 - 2 * u)                      # ease in and out
        Mt = cv2.getPerspectiveTransform(c, c + t * (hc - c))   # a-coords -> part-way pose
        aw = cv2.warpPerspective(a, Mt, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        bw = cv2.warpPerspective(b, Mt @ Hinv, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        res.append(cv2.addWeighted(aw, 1 - t, bw, t, 0))
    return res, inl, tot, float(np.abs(hc - c).max())

if __name__ == '__main__':
    src, out_dir = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    fr = frames(src)
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if f.endswith('.png'): os.remove(os.path.join(out_dir, f))
    mid, inl, tot, shift = between(fr[-1], fr[0], n)
    seq = fr + mid                                   # ... last, in-betweens, (loops to) first
    for i, f in enumerate(seq):
        cv2.imwrite(os.path.join(out_dir, '%04d.png' % i), f)
    pick = [0, 2, 4, 5, 6, 7, 9, 11]
    strip = np.hstack([fr[-1]] + [mid[i] for i in pick if i < n] + [fr[0]])
    cv2.imwrite(os.path.join(out_dir, '_transition.jpg'), strip, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(os.path.basename(src), len(fr), 'frames +', n, '=', len(seq), '| matches', inl, 'of', tot, '| largest corner move', round(shift, 1), 'px')
