"""Build the GLB of every catalog row that has no 3D model on the store yet.

usage: python build_3d.py    # catalog-3d.json, minus products in rollout-log.json -> out/<glb>

A GLB that already exists in out/ is left alone, so a stopped run picks up where it left off.
"""
import json
from pathlib import Path

import case_art
import make_case_glb

HERE = Path(__file__).resolve().parent


def pending(rows, log):
    done = {p['product'] for p in log['products']}
    return [r for r in rows if r['gid'] not in done]


def build_models(rows, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    built = []
    for r in rows:
        out = out_dir / r['glb']
        if out.exists():
            continue
        clear = r['family'] == 'clear'
        mesh = make_case_glb.build_clear() if clear else make_case_glb.build()
        make_case_glb.write_glb(mesh, case_art.texture(r['print'], r['family']), out, clear=clear)
        built.append(out)
    return built


if __name__ == '__main__':
    rows = json.loads((HERE / 'catalog-3d.json').read_text(encoding='utf-8'))
    log = json.loads((HERE / 'rollout-log.json').read_text(encoding='utf-8'))
    todo = pending(rows, log)
    print('%d to build' % len(todo))
    print('%d built' % len(build_models(todo, HERE / 'out')))
