"""Build a textured GLB of a printed tough phone case (iPhone 16 Pro body) for Shopify 3D media.

usage: python make_case_glb.py <artwork.png (1:2 portrait)> <out.glb> [--matte]

The artwork wraps the back and the outer side walls like the Printify tough case print;
the front bumper, camera bezel and button covers are black TPU. Units are metres, Y up,
the printed back faces +Z so viewers open on the artwork.
"""
import io, json, math, struct, sys
import numpy as np
from PIL import Image

pi = math.pi

# ---- dimensions in mm: iPhone 16 Pro in a dual-layer tough case ----
PW, PH, PR, PT = 71.5, 149.6, 10.5, 8.25     # phone width, height, corner radius, thickness
WALL, BACK, LIP_UP = 1.8, 1.6, 1.0            # case side wall, back, lip height above screen
HW, HH, R = PW / 2 + WALL, PH / 2 + WALL, PR + WALL
D = BACK + PT + LIP_UP
ZB, ZF = D / 2, -D / 2                        # printed back plane / front lip plane
ZS = ZF + LIP_UP                              # screen
ZPB = ZB - BACK                               # phone back (seen through the camera cut-out)
RB, RF = 3.0, 1.2                             # back and front edge fillets
LIPW = WALL + 1.2                             # lip overhangs the screen edge
ZSPLIT = ZF + 3.2                             # print stops here, black bumper below
NC = 20                                       # segments per rounded corner

# camera plateau (phone coordinates; seen from the back it sits top-left, i.e. -X)
PLAT = 19.0
PCX, PCY = -PW / 2 + 4.5 + PLAT, PH / 2 - 4.5 - PLAT
ZPT = ZPB + 1.3                               # plateau top
ZLT = ZPT + 1.5                               # lens housing top
HOLE, HOLE_R = PLAT + 1.0, 9.0                # case cut-out
BEZ_W, BEZ_H = 1.8, 1.5                       # raised bezel width / height above the back

CORNERS = [(-90, 0, (1, -1)), (0, 90, (1, 1)), (90, 180, (-1, 1)), (180, 270, (-1, -1))]


def rrect(cx, cy, hw, hh, r, nc=NC):
    """Rounded rectangle as base points + outward normals; offset d gives p + d*n."""
    pts, nrm = [], []
    for a0, a1, (sx, sy) in CORNERS:
        ccx, ccy = cx + sx * (hw - r), cy + sy * (hh - r)
        for a in np.linspace(math.radians(a0), math.radians(a1), nc + 1):
            n = (math.cos(a), math.sin(a))
            pts.append((ccx + r * n[0], ccy + r * n[1]))
            nrm.append(n)
    return np.array(pts), np.array(nrm)


def circle(cx, cy, n=56):
    a = np.linspace(0, 2 * pi, n, endpoint=False)
    nrm = np.column_stack([np.cos(a), np.sin(a)])
    return np.tile([cx, cy], (n, 1)).astype(float), nrm


# ---- art mapping: unfold back + side walls onto the artwork plane ----
WRAP = RB * pi / 2 + (ZB - RB - ZSPLIT)       # surface length from back edge to print stop
HA = 2 * ((HH - RB) + WRAP)                   # fit artwork height to the unfolded print
WA = HA / 2                                   # 1:2 artwork
KX = (WA / 2 - (HW - RB)) / WRAP              # squeeze the art across the long side walls so it ends at the bumper


def art_uv(xy):
    return np.column_stack([xy[:, 0] / WA + 0.5, 0.5 - xy[:, 1] / HA])


class Prim:
    def __init__(self):
        self.P, self.N, self.UV, self.I, self.n = [], [], [], [], 0

    def add(self, P, N, UV, tris):
        P, N = np.asarray(P, float), np.asarray(N, float)
        N = N / np.linalg.norm(N, axis=1, keepdims=True)
        UV = np.zeros((len(P), 2)) if UV is None else np.asarray(UV, float)
        t = np.asarray(tris, np.int64)
        a, b, c = P[t[:, 0]], P[t[:, 1]], P[t[:, 2]]
        g = np.cross(b - a, c - a)
        keep = np.linalg.norm(g, axis=1) > 1e-7
        flip = (g * (N[t[:, 0]] + N[t[:, 1]] + N[t[:, 2]])).sum(1) < 0
        t[flip] = t[flip][:, [0, 2, 1]]          # wind every triangle to face its normals
        t = t[keep]
        self.P.append(P); self.N.append(N); self.UV.append(UV); self.I.append(t + self.n)
        self.n += len(P)

    def arrays(self):
        return (np.concatenate(self.P), np.concatenate(self.N),
                np.concatenate(self.UV), np.concatenate(self.I))


def loft(prim, rings):
    """Join closed rings [(P, N, UV)] with quads."""
    M = len(rings[0][0])
    tris = []
    for k in range(len(rings) - 1):
        for i in range(M):
            j = (i + 1) % M
            a, b, c, d = k * M + i, k * M + j, (k + 1) * M + j, (k + 1) * M + i
            tris += [(a, b, c), (a, c, d)]
    prim.add(np.concatenate([r[0] for r in rings]), np.concatenate([r[1] for r in rings]),
             np.concatenate([r[2] for r in rings]), tris)


def profile(base, samples, uv=False):
    """samples: (offset d, z, normal_d, normal_z[, unfold]) -> rings around base."""
    p0, n2 = base
    rings = []
    for s in samples:
        d, z, nd, nz = s[:4]
        P = np.column_stack([p0 + n2 * d, np.full(len(p0), z)])
        N = np.column_stack([n2 * nd, np.full(len(p0), nz)])
        UV = art_uv(p0 - n2 * RB + n2 * (s[4] + RB) * [KX, 1.0]) if uv else np.zeros((len(p0), 2))
        rings.append((P, N, UV))
    return rings


def flat_ring(base, d, z, nz, uv=False):
    p0, n2 = base
    xy = p0 + n2 * d
    P = np.column_stack([xy, np.full(len(xy), z)])
    N = np.tile([0, 0, nz], (len(xy), 1)).astype(float)
    return P, N, (art_uv(xy) if uv else np.zeros((len(xy), 2)))


def fan(prim, ring, center):
    P, N, UV = ring
    M = len(P)
    prim.add(np.vstack([center, P]), np.vstack([N[:1], N]), np.vstack([UV[:1], UV]),
             [(0, 1 + i, 1 + (i + 1) % M) for i in range(M)])


def fillet(cd, cz, r, a0, a1, n=8):
    """Arc in the (d, z) profile plane; normal = (sin a, cos a)."""
    return [(cd + r * math.sin(a), cz + r * math.cos(a), math.sin(a), math.cos(a))
            for a in np.linspace(a0, a1, n + 1)]


def superellipsoid(prim, c, ax, e=0.4, nu=20, nv=40):
    f = lambda w, p: np.sign(w) * np.abs(w) ** p
    E, O = np.meshgrid(np.linspace(-pi / 2, pi / 2, nu + 1),
                       np.linspace(-pi, pi, nv, endpoint=False), indexing='ij')
    P = np.stack([ax[0] * f(np.cos(E), e) * f(np.cos(O), e),
                  ax[1] * f(np.cos(E), e) * f(np.sin(O), e),
                  ax[2] * f(np.sin(E), e)], -1).reshape(-1, 3) + c
    N = np.stack([f(np.cos(E), 2 - e) * f(np.cos(O), 2 - e) / ax[0],
                  f(np.cos(E), 2 - e) * f(np.sin(O), 2 - e) / ax[1],
                  f(np.sin(E), 2 - e) / ax[2]], -1).reshape(-1, 3)
    N[np.linalg.norm(N, axis=1) < 1e-9] = [1, 0, 0]
    tris = []
    for i in range(nu):
        for j in range(nv):
            a, b = i * nv + j, i * nv + (j + 1) % nv
            tris += [(a, b, b + nv), (a, b + nv, a + nv)]
    prim.add(P, N, None, tris)


def build():
    m = {k: Prim() for k in
         ['print', 'tpu', 'opening', 'phone_back', 'plateau', 'lens_metal', 'lens_glass', 'flash', 'screen']}
    case = rrect(0, 0, HW, HH, R)
    hole = rrect(PCX, PCY, HOLE, HOLE, HOLE_R)

    # printed back face (annulus around the camera bezel) + back fillet + upper side walls
    loft(m['print'], [flat_ring(case, -RB, ZB, 1, uv=True), flat_ring(hole, BEZ_W, ZB, 1, uv=True)])
    side = [(-RB + RB * math.sin(a), ZB - RB + RB * math.cos(a), math.sin(a), math.cos(a), -RB + RB * a)
            for a in np.linspace(0, pi / 2, 10)]
    side.append((0, ZSPLIT, 1, 0, -RB + WRAP))
    loft(m['print'], profile(case, side, uv=True))

    # black bumper: lower side wall, front fillet, lip, inner lip edge
    bump = [(0, ZSPLIT, 1, 0)] + fillet(-RF, ZF + RF, RF, pi / 2, pi)
    bump += fillet(-(LIPW - 0.5), ZF + 0.5, 0.5, pi, 1.5 * pi)
    bump.append((-LIPW, ZS, -1, 0))
    loft(m['tpu'], profile(case, bump))
    fan(m['screen'], flat_ring(case, -LIPW, ZS, -1), [0, 0, ZS])

    # raised camera bezel, then the cut-out wall down to the phone back
    bez = [(BEZ_W, ZB, 1, 0), (BEZ_W, ZB + BEZ_H - 0.6, 1, 0)]
    bez += [(BEZ_W - 0.6 + 0.6 * math.cos(a), ZB + BEZ_H - 0.6 + 0.6 * math.sin(a), math.cos(a), math.sin(a))
            for a in np.linspace(0, pi / 2, 7)]
    bez += [(0.3 + 0.3 * math.cos(a), ZB + BEZ_H - 0.3 + 0.3 * math.sin(a), math.cos(a), math.sin(a))
            for a in np.linspace(pi / 2, pi, 5)]
    bez.append((0, ZPB, -1, 0))
    loft(m['tpu'], profile(hole, bez))

    # phone back visible inside the cut-out, camera plateau
    plat = rrect(PCX, PCY, PLAT, PLAT, HOLE_R - 1.0)
    loft(m['phone_back'], [flat_ring(hole, 0, ZPB, 1), flat_ring(plat, 0, ZPB, 1)])
    pl = [(0, ZPB, 1, 0), (0, ZPT - 0.5, 1, 0)]
    pl += [(-0.5 + 0.5 * math.cos(a), ZPT - 0.5 + 0.5 * math.sin(a), math.cos(a), math.sin(a))
           for a in np.linspace(0, pi / 2, 6)]
    loft(m['plateau'], profile(plat, pl))
    fan(m['plateau'], flat_ring(plat, -0.5, ZPT, 1), [PCX, PCY, ZPT])

    # three lenses: metal housing with rounded rim, recessed domed glass
    for lx, ly in [(-8.7, 8.7), (-8.7, -8.7), (8.6, 0.0)]:
        c = circle(PCX + lx, PCY + ly)
        h = [(7.4, ZPT, 1, 0), (7.4, ZLT - 0.4, 1, 0)]
        h += [(7.0 + 0.4 * math.cos(a), ZLT - 0.4 + 0.4 * math.sin(a), math.cos(a), math.sin(a))
              for a in np.linspace(0, pi / 2, 6)]
        h.append((5.7, ZLT, 0, 1))
        loft(m['lens_metal'], profile(c, h))
        loft(m['lens_metal'], profile(c, [(5.7, ZLT, -1, 0), (5.7, ZLT - 0.35, -1, 0)]))
        cap, zb0 = 0.3, ZLT - 0.35
        rs = (5.7 ** 2 + cap ** 2) / (2 * cap)
        z0 = zb0 + cap - rs
        dome = [(r, z0 + math.sqrt(rs * rs - r * r), r / rs, math.sqrt(rs * rs - r * r) / rs)
                for r in np.linspace(5.7, 0.4, 9)]
        rings = profile(c, dome)
        loft(m['lens_glass'], rings)
        fan(m['lens_glass'], rings[-1], [PCX + lx, PCY + ly, zb0 + cap])

    # flash and LiDAR
    for (lx, ly), mat in [((8.7, 11.2), 'flash'), ((8.7, -11.2), 'lens_glass')]:
        c = circle(PCX + lx, PCY + ly, 40)
        loft(m['plateau'], profile(c, [(2.6, ZPT, 1, 0), (2.6, ZPT + 0.2, 1, 0)]))
        fan(m[mat], flat_ring(c, 2.6, ZPT + 0.2, 1), [PCX + lx, PCY + ly, ZPT + 0.2])

    # button covers: action + volume on +X (phone's left), side button on -X
    zc = -0.6
    for y, length in [(37.5, 7.5), (23.0, 13.0), (7.0, 13.0)]:
        superellipsoid(m['tpu'], [HW, y, zc], [0.9, length / 2, 1.6])
    superellipsoid(m['tpu'], [-HW, 26.0, zc], [0.9, 10.0, 1.6])
    # openings: Camera Control cut-out on -X, charging/speaker slot on the bottom
    superellipsoid(m['opening'], [-HW, -22.5, -0.3], [0.08, 9.5, 1.7])
    superellipsoid(m['opening'], [0, -HH, -0.3], [13.0, 0.08, 2.0])
    return m


def srgb(hexs):
    return [((int(hexs[i:i + 2], 16) / 255 + 0.055) / 1.055) ** 2.4 for i in (0, 2, 4)] + [1.0]


def write_glb(m, art_path, out, matte):
    img = Image.open(art_path).convert('RGB').resize((1024, 2048), Image.LANCZOS)
    jpg = io.BytesIO(); img.save(jpg, 'JPEG', quality=90, optimize=True)

    print_mat = {'name': 'Printed shell (%s)' % ('matte' if matte else 'glossy'),
                 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0,
                                          'roughnessFactor': 0.6 if matte else 0.42}}
    if not matte:
        print_mat['extensions'] = {'KHR_materials_clearcoat': {'clearcoatFactor': 1.0,
                                                               'clearcoatRoughnessFactor': 0.1}}

    def pbr(name, color, rough, metal=0.0):
        return {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': srgb(color),
                                                       'metallicFactor': metal, 'roughnessFactor': rough}}
    mats = {'print': print_mat,
            'tpu': pbr('Black TPU bumper', '141414', 0.55),
            'opening': pbr('Opening', '030303', 0.9),
            'phone_back': pbr('Phone back glass', '3d3c3a', 0.45),
            'plateau': pbr('Camera plateau', '3d3c3a', 0.12),
            'lens_metal': pbr('Lens ring', '4a4a4c', 0.3, 1.0),
            'lens_glass': pbr('Lens glass', '07080c', 0.04),
            'flash': pbr('Flash', 'ebe5d2', 0.35),
            'screen': pbr('Screen', '050506', 0.06)}

    blob, views, accs, prims, materials = bytearray(), [], [], [], []

    def push(arr, typ, comp=5126, target=None, minmax=False):
        while len(blob) % 4:
            blob.append(0)
        data = arr.tobytes()
        v = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}
        if target:
            v['target'] = target
        blob.extend(data); views.append(v)
        a = {'bufferView': len(views) - 1, 'componentType': comp,
             'count': len(arr) if typ != 'SCALAR' else arr.size, 'type': typ}
        if minmax:
            a['min'], a['max'] = arr.min(0).tolist(), arr.max(0).tolist()
        accs.append(a)
        return len(accs) - 1

    for key, prim in m.items():
        if not prim.P:
            continue
        P, N, UV, I = prim.arrays()
        attrs = {'POSITION': push((P * 0.001).astype(np.float32), 'VEC3', target=34962, minmax=True),
                 'NORMAL': push(N.astype(np.float32), 'VEC3', target=34962)}
        if key == 'print':
            attrs['TEXCOORD_0'] = push(UV.astype(np.float32), 'VEC2', target=34962)
        idx = push(I.astype(np.uint32).ravel(), 'SCALAR', comp=5125, target=34963)
        materials.append(mats[key])
        prims.append({'attributes': attrs, 'indices': idx, 'material': len(materials) - 1})

    while len(blob) % 4:
        blob.append(0)
    views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(jpg.getvalue())})
    blob.extend(jpg.getvalue())

    gltf = {'asset': {'version': '2.0', 'generator': 'casify make_case_glb.py'},
            'scene': 0, 'scenes': [{'nodes': [0]}],
            'nodes': [{'mesh': 0, 'name': 'Tough case'}],
            'meshes': [{'name': 'Tough case', 'primitives': prims}],
            'materials': materials,
            'textures': [{'sampler': 0, 'source': 0}],
            'images': [{'bufferView': len(views) - 1, 'mimeType': 'image/jpeg'}],
            'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
            'accessors': accs, 'bufferViews': views,
            'buffers': [{'byteLength': 0}]}
    if not matte:
        gltf['extensionsUsed'] = ['KHR_materials_clearcoat']
    while len(blob) % 4:
        blob.append(0)
    gltf['buffers'][0]['byteLength'] = len(blob)
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(out, 'wb') as fh:
        fh.write(struct.pack('<III', 0x46546C67, 2, total))
        fh.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        fh.write(struct.pack('<II', len(blob), 0x004E4942) + bytes(blob))
    tri = sum(accs[p['indices']]['count'] for p in prims) // 3
    print('%s: %.2f MB, %d triangles, %d materials' % (out, total / 1e6, tri, len(materials)))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    write_glb(build(), args[0], args[1], '--matte' in sys.argv)
